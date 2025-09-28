import { ethers } from 'ethers';

// Contract ABIs
export const CAMPAIGN_FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "_goal", "type": "uint256" },
      { "internalType": "uint256", "name": "_duration", "type": "uint256" }
    ],
    "name": "createCampaign",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCampaigns",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "campaigns",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export const CAMPAIGN_ABI = [
  {
    "inputs": [],
    "name": "creator",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "goal",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deadline",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalContributed",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawn",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "contributions",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "contribute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "refund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDetails",
    "outputs": [
      { "internalType": "address", "name": "campaignCreator", "type": "address" },
      { "internalType": "uint256", "name": "targetGoal", "type": "uint256" },
      { "internalType": "uint256", "name": "endTime", "type": "uint256" },
      { "internalType": "uint256", "name": "balance", "type": "uint256" },
      { "internalType": "bool", "name": "goalReached", "type": "bool" },
      { "internalType": "bool", "name": "fundsWithdrawn", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Replace with your actual deployed contract address on Sepolia
export const CAMPAIGN_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000"; // Update this with your deployed address

export class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  private getReadOnlyProvider(): ethers.JsonRpcProvider {
    // Use a public Sepolia RPC for read-only operations
    return new ethers.JsonRpcProvider('https://rpc.sepolia.org');
  }

  async connectWallet(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await this.provider.send('eth_requestAccounts', []);
    this.signer = await this.provider.getSigner();
    return accounts[0];
  }

  async getCampaignFactoryContract() {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    if (!CAMPAIGN_FACTORY_ADDRESS || CAMPAIGN_FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000") {
      throw new Error('Campaign factory address not configured');
    }
    return new ethers.Contract(CAMPAIGN_FACTORY_ADDRESS, CAMPAIGN_FACTORY_ABI, this.signer);
  }

  async getCampaignContract(address: string) {
    const provider = this.provider || this.getReadOnlyProvider();
    return new ethers.Contract(address, CAMPAIGN_ABI, provider);
  }

  async createCampaign(goal: string, duration: number) {
    const contract = await this.getCampaignFactoryContract();
    const goalInWei = ethers.parseEther(goal);
    const tx = await contract.createCampaign(goalInWei, duration);
    return await tx.wait();
  }

  async getAllCampaigns(): Promise<string[]> {
    if (!CAMPAIGN_FACTORY_ADDRESS || CAMPAIGN_FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000") {
      throw new Error('Campaign factory address not configured');
    }
    const provider = this.provider || this.getReadOnlyProvider();
    const contract = new ethers.Contract(CAMPAIGN_FACTORY_ADDRESS, CAMPAIGN_FACTORY_ABI, provider);
    return await contract.getCampaigns();
  }

  async getCampaignDetails(address: string) {
    const contract = await this.getCampaignContract(address);
    const [creator, goal, deadline, totalContributed, withdrawn] = await Promise.all([
      contract.creator(),
      contract.goal(),
      contract.deadline(),
      contract.totalContributed(),
      contract.withdrawn()
    ]);

    const now = Math.floor(Date.now() / 1000);
    const deadlineNumber = Number(deadline);
    const isActive = now < deadlineNumber;
    const isSuccessful = totalContributed >= goal;

    return {
      address,
      creator,
      goal: ethers.formatEther(goal),
      deadline: deadlineNumber,
      totalContributed: ethers.formatEther(totalContributed),
      withdrawn,
      isActive,
      isSuccessful,
      timeRemaining: Math.max(0, deadlineNumber - now)
    };
  }

  async contribute(campaignAddress: string, amount: string) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, this.signer);
    const tx = await contract.contribute({ value: ethers.parseEther(amount) });
    return await tx.wait();
  }

  async withdrawFunds(campaignAddress: string) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, this.signer);
    const tx = await contract.withdraw();
    return await tx.wait();
  }

  async getRefund(campaignAddress: string) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, this.signer);
    const tx = await contract.refund();
    return await tx.wait();
  }

  async getUserContribution(campaignAddress: string, userAddress: string): Promise<string> {
    const contract = await this.getCampaignContract(campaignAddress);
    const contribution = await contract.contributions(userAddress);
    return ethers.formatEther(contribution);
  }
}

export const web3Service = new Web3Service();

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeAllListeners: (event: string) => void;
      send: (method: string, params: unknown[]) => Promise<unknown>;
    };
  }
}