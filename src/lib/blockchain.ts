import { ethers } from 'ethers'
import { decryptData } from './crypto-utils'

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
]

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
    "inputs": [],
    "name": "contribute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "contributions",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
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
  }
]

// Blockchain Service Class
export class BlockchainService {
  private provider: ethers.JsonRpcProvider
  private factoryContract: ethers.Contract

  constructor() {
    const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL
    const factoryAddress = process.env.CAMPAIGN_FACTORY_ADDRESS || process.env.NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS

    if (!rpcUrl || !factoryAddress) {
      throw new Error('Missing blockchain configuration')
    }

    console.log('Blockchain service initializing with:', {
      rpcUrl: rpcUrl.substring(0, 50) + '...', // Don't log full URL for security
      factoryAddress
    })

    // Use the primary RPC URL first, with fallback handling in methods
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
    this.factoryContract = new ethers.Contract(factoryAddress, CAMPAIGN_FACTORY_ABI, this.provider)
  }

  // Test connection and use fallback RPC if needed
  private async ensureConnection(): Promise<void> {
    try {
      await this.provider.getNetwork()
      return // Connection works
    } catch (error) {
      console.warn('Primary RPC failed, trying fallbacks...', error)
      
      // Try fallback RPC endpoints
      const fallbackUrls = [
        'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Public Infura endpoint
        'https://rpc.sepolia.org', // Public Sepolia RPC
        'https://eth-sepolia.public.blastapi.io', // Public Blast API
      ]

      for (const url of fallbackUrls) {
        try {
          const testProvider = new ethers.JsonRpcProvider(url)
          await testProvider.getNetwork()
          console.log('Successfully connected to fallback RPC:', url.substring(0, 30) + '...')
          
          // Update provider and contract
          this.provider = testProvider
          this.factoryContract = new ethers.Contract(
            await this.factoryContract.getAddress(),
            CAMPAIGN_FACTORY_ABI,
            this.provider
          )
          return
        } catch (fallbackError) {
          console.warn('Fallback RPC failed:', url.substring(0, 30) + '...', fallbackError)
        }
      }
      
      throw new Error('Unable to connect to any Sepolia RPC endpoint. Please check your network connection.')
    }
  }

  // Decrypt private key from database
  private decryptPrivateKey(encryptedKey: string): string {
    const encryptionKey = process.env.ENCRYPTION_KEY!
    
    if (!encryptionKey) {
      throw new Error('Encryption key not configured')
    }
    
    // Validate encryption key format
    if (encryptionKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(encryptionKey)) {
      throw new Error('Invalid encryption key format. Must be 64 hex characters.')
    }
    
    try {
      const decrypted = decryptData(encryptedKey, encryptionKey)
      
      // Validate that it's a proper private key
      if (!decrypted.startsWith('0x') || decrypted.length !== 66) {
        throw new Error('Invalid private key format')
      }
      
      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Unable to decrypt wallet key. Please contact support.')
    }
  }

  // Create a wallet from encrypted private key
  private createWalletFromEncrypted(encryptedPrivateKey: string): ethers.Wallet {
    const privateKey = this.decryptPrivateKey(encryptedPrivateKey)
    return new ethers.Wallet(privateKey, this.provider)
  }

  // Get all campaigns from factory
  async getAllCampaigns() {
    try {
      const campaignAddresses = await this.factoryContract.getCampaigns()
      const campaigns = []

      for (const address of campaignAddresses) {
        const campaignData = await this.getCampaignData(address)
        if (campaignData) {
          campaigns.push(campaignData)
        }
      }

      return campaigns
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      return []
    }
  }

  // Get individual campaign data
  async getCampaignData(address: string) {
    try {
      console.log(`🔍 Getting campaign data for: ${address}`)
      
      // Ensure connection first
      await this.ensureConnection()
      console.log(`✅ Connection established`)
      
      // Check if address is valid
      if (!address || address.length !== 42 || !address.startsWith('0x')) {
        throw new Error(`Invalid contract address format: ${address}`)
      }
      
      // Check if contract has code
      const contractCode = await this.provider.getCode(address)
      if (contractCode === '0x') {
        throw new Error(`No contract deployed at address ${address}`)
      }
      console.log(`✅ Contract found at address, code length: ${contractCode.length}`)
      
      const contract = new ethers.Contract(address, CAMPAIGN_ABI, this.provider)
      console.log(`✅ Contract instance created`)
      
      console.log(`📞 Calling contract functions...`)
      const [
        creator,
        goal,
        deadline,
        totalContributed,
        withdrawn
      ] = await Promise.all([
        contract.creator(),
        contract.goal(),
        contract.deadline(),
        contract.totalContributed(),
        contract.withdrawn()
      ])

      console.log(`📊 Raw contract data:`, {
        creator,
        goal: goal.toString(),
        deadline: deadline.toString(),
        totalContributed: totalContributed.toString(),
        withdrawn
      })

      const deadlineNumber = Number(deadline)
      const currentTime = Math.floor(Date.now() / 1000)
      const timeRemaining = Math.max(0, deadlineNumber - currentTime)
      const isActive = currentTime < deadlineNumber
      const isSuccessful = totalContributed >= goal

      const result = {
        address,
        creator,
        goal: goal.toString(),
        deadline: deadlineNumber,
        totalContributed: totalContributed.toString(),
        withdrawn,
        isActive,
        isSuccessful,
        timeRemaining
      }
      
      console.log(`✅ Campaign data processed successfully:`, result)
      return result
    } catch (error) {
      console.error(`❌ Error fetching campaign data for ${address}:`)
      
      if (error instanceof Error) {
        console.error(`   Error Type: ${error.name}`)
        console.error(`   Error Message: ${error.message}`)
        console.error(`   Error Stack:`, error.stack)
        
        // Check for specific error patterns
        if (error.message.includes('CALL_EXCEPTION')) {
          console.error(`   🔍 This usually means:`)
          console.error(`      - Contract doesn't have the expected functions`)
          console.error(`      - Wrong ABI for this contract`)
          console.error(`      - Contract is not properly deployed`)
        } else if (error.message.includes('missing revert data')) {
          console.error(`   🔍 This usually means:`)
          console.error(`      - Contract exists but function calls fail`)
          console.error(`      - ABI mismatch with actual contract`)
        } else if (error.message.includes('network')) {
          console.error(`   🔍 This is a network connectivity issue`)
        }
      }
      
      return null
    }
  }

  // Create a new campaign (server-side)
  async createCampaign(
    encryptedPrivateKey: string,
    goalInEth: string,
    durationInDays: number
  ) {
    try {
      console.log('Creating campaign with:', { goalInEth, durationInDays })
      
      // Ensure we have a working connection
      await this.ensureConnection()
      
      // Decrypt private key and create wallet
      const privateKey = this.decryptPrivateKey(encryptedPrivateKey)
      const wallet = new ethers.Wallet(privateKey, this.provider)
      const factoryWithSigner = this.factoryContract.connect(wallet) as ethers.Contract
      
      const goalInWei = ethers.parseEther(goalInEth)
      const durationInSeconds = Math.round(durationInDays * 24 * 60 * 60) // Round to whole seconds

      console.log('Parsed values:', { 
        goalInWei: goalInWei.toString(), 
        durationInSeconds,
        walletAddress: wallet.address 
      })

      // Validate parameters
      if (goalInWei <= 0) {
        throw new Error('Goal must be greater than 0')
      }
      
      if (durationInSeconds <= 0) {
        throw new Error('Duration must be greater than 0')
      }
      
      if (durationInSeconds > 365 * 24 * 60 * 60) {
        throw new Error('Duration cannot exceed 1 year')
      }

      // Check wallet balance
      const balance = await this.provider.getBalance(wallet.address)
      console.log('Wallet balance:', ethers.formatEther(balance), 'ETH')

      if (balance === BigInt(0)) {
        throw new Error('Insufficient funds: Wallet has no ETH for gas fees. Please add some test ETH from Sepolia faucet.')
      }

      // Test contract connectivity by calling a read function
      console.log('Testing contract connectivity...')
      console.log('Contract address:', process.env.CAMPAIGN_FACTORY_ADDRESS)
      console.log('Using provider:', this.provider._getConnection().url)
      
      try {
        // First check if contract exists (has code)
        const code = await this.provider.getCode(process.env.CAMPAIGN_FACTORY_ADDRESS!)
        console.log('Contract code length:', code.length)
        
        if (code === '0x') {
          throw new Error('Contract not deployed - no code at address')
        }
        
        const existingCampaigns = await factoryWithSigner.getCampaigns()
        console.log('Contract connectivity test passed. Existing campaigns count:', existingCampaigns.length)
      } catch (connectError) {
        console.error('Contract connectivity test failed:', connectError)
        
        // Provide specific error messages
        if (connectError instanceof Error) {
          if (connectError.message.includes('no code at address')) {
            throw new Error('Smart contract not found at the specified address. Please verify the contract is deployed on Sepolia.')
          } else if (connectError.message.includes('CALL_EXCEPTION') || connectError.message.includes('missing revert data')) {
            throw new Error('Contract exists but function calls are failing. The deployed contract may be different from expected. Please redeploy the CampaignFactory contract.')
          } else if (connectError.message.includes('network')) {
            throw new Error('Network error. Please check your RPC connection.')
          }
        }
        
        throw new Error(`Cannot connect to smart contract: ${connectError instanceof Error ? connectError.message : 'Unknown error'}. Please redeploy the CampaignFactory contract with the correct ABI.`)
      }

      // Estimate gas first
      let gasLimit
      try {
        console.log('Estimating gas for createCampaign with params:', {
          goalInWei: goalInWei.toString(),
          durationInSeconds,
          walletAddress: wallet.address,
          contractAddress: await this.factoryContract.getAddress()
        })
        
        gasLimit = await factoryWithSigner.createCampaign.estimateGas(goalInWei, durationInSeconds)
        console.log('Estimated gas:', gasLimit.toString())
      } catch (gasError) {
        console.error('Gas estimation failed:', gasError)
        
        // Try to get more detailed error information
        if (gasError instanceof Error) {
          console.error('Gas estimation error details:', {
            name: gasError.name,
            message: gasError.message,
            stack: gasError.stack
          })
        }
        
        // Check if the contract address is correct
        try {
          const contractAddress = await this.factoryContract.getAddress()
          const code = await this.provider.getCode(contractAddress)
          console.log('Contract code length:', code.length)
          if (code === '0x') {
            throw new Error('Contract not found at address. Please verify the contract address is correct.')
          }
        } catch (codeError) {
          console.error('Error checking contract code:', codeError)
        }
        
        // If gas estimation fails, it usually means the transaction will fail
        throw new Error('Transaction would fail during gas estimation: ' + (gasError instanceof Error ? gasError.message : 'Unknown gas estimation error'))
      }

      // Get current gas price
      const feeData = await this.provider.getFeeData()
      console.log('Fee data:', {
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString()
      })

      // Add some buffer to gas limit
      const gasLimitWithBuffer = gasLimit * BigInt(120) / BigInt(100) // 20% buffer

      // Send transaction with explicit gas settings
      const txOptions: ethers.Overrides = {
        gasLimit: gasLimitWithBuffer
      }

      // Use appropriate fee structure for Sepolia
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        txOptions.maxFeePerGas = feeData.maxFeePerGas
        txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
      } else if (feeData.gasPrice) {
        txOptions.gasPrice = feeData.gasPrice
      }

      console.log('Sending transaction with options:', txOptions)

      const tx = await factoryWithSigner.createCampaign(goalInWei, durationInSeconds, txOptions)
      console.log('Transaction sent:', tx.hash)
      
      const receipt = await tx.wait()
      console.log('Transaction confirmed:', receipt.hash)

      // Get the new campaign address by checking the campaigns array
      // Since the contract doesn't emit events, we'll get all campaigns and take the last one
      let campaignAddress = null
      try {
        const allCampaigns = await factoryWithSigner.getCampaigns()
        if (allCampaigns.length > 0) {
          campaignAddress = allCampaigns[allCampaigns.length - 1] // Get the last (newest) campaign
          console.log('New campaign address:', campaignAddress)
        }
      } catch (eventError) {
        console.error('Error getting campaign address:', eventError)
        // Try the old event-based approach as fallback
        const campaignCreatedEvent = receipt.logs.find(
          (log: ethers.EventLog | ethers.Log) => {
            if ('topics' in log) {
              return log.topics[0] === ethers.id('CampaignCreated(address,address)')
            }
            return false
          }
        )

        if (campaignCreatedEvent && 'topics' in campaignCreatedEvent) {
          campaignAddress = ethers.getAddress('0x' + campaignCreatedEvent.topics[2].slice(-40))
        }
      }

      console.log('Campaign created successfully:', { campaignAddress, gasUsed: receipt.gasUsed.toString() })

      return {
        success: true,
        transactionHash: tx.hash,
        campaignAddress,
        gasUsed: receipt.gasUsed.toString()
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Check for common error patterns
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds: Please add test ETH to your wallet from Sepolia faucet'
        } else if (error.message.includes('revert')) {
          errorMessage = 'Smart contract rejected transaction: ' + error.message
        } else if (error.message.includes('CALL_EXCEPTION')) {
          errorMessage = 'Transaction failed: Please check contract address and network connectivity'
        }
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Get wallet balance from encrypted private key
  async getWalletBalanceFromKey(encryptedPrivateKey: string): Promise<string> {
    try {
      const wallet = this.createWalletFromEncrypted(encryptedPrivateKey)
      const balance = await this.provider.getBalance(wallet.address)
      return ethers.formatEther(balance)
    } catch (error) {
      console.error('Error getting wallet balance from key:', error)
      throw error
    }
  }

  // Contribute to a campaign (server-side)
  async contribute(
    campaignAddress: string,
    encryptedPrivateKey: string,
    amountInEth: string
  ) {
    try {
      console.log('🎯 Starting contribution:', { campaignAddress, amountInEth })
      
      // Ensure connection first
      await this.ensureConnection()
      
      const wallet = this.createWalletFromEncrypted(encryptedPrivateKey)
      console.log('👛 Wallet created:', wallet.address)
      
      // Check wallet balance first
      const balance = await this.provider.getBalance(wallet.address)
      const balanceInEth = ethers.formatEther(balance)
      console.log('💰 Wallet balance:', balanceInEth, 'ETH')
      
      const amountInWei = ethers.parseEther(amountInEth)
      const amountNum = parseFloat(amountInEth)
      const balanceNum = parseFloat(balanceInEth)
      
      if (balanceNum < amountNum + 0.001) { // Adding small buffer for gas
        throw new Error(`Insufficient balance: ${balanceInEth} ETH available, need ${amountInEth} ETH + gas fees`)
      }
      
      // Check if contract exists
      const contractCode = await this.provider.getCode(campaignAddress)
      if (contractCode === '0x') {
        throw new Error(`Campaign contract not found at address ${campaignAddress}. The contract may not be deployed.`)
      }
      console.log('✅ Contract exists at address')
      
      // Try to get campaign data first to validate it's working
      try {
        const campaignData = await this.getCampaignData(campaignAddress)
        if (!campaignData) {
          throw new Error('Campaign data could not be retrieved - contract may not be a valid campaign')
        }
        console.log('📊 Campaign data:', { 
          goal: campaignData.goal, 
          isActive: campaignData.isActive,
          timeRemaining: campaignData.timeRemaining 
        })
        
        if (!campaignData.isActive) {
          throw new Error('Campaign is not active - contributions may not be allowed')
        }
        
        if (campaignData.timeRemaining <= 0) {
          throw new Error('Campaign has ended - contributions are no longer accepted')
        }
      } catch (dataError) {
        console.warn('⚠️ Campaign data validation failed:', dataError)
        // Continue with contribution attempt anyway
      }
      
      const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, wallet)
      
      // Estimate gas first
      let gasLimit
      try {
        gasLimit = await contract.contribute.estimateGas({ value: amountInWei })
        console.log('⛽ Estimated gas:', gasLimit.toString())
      } catch (gasError) {
        console.error('💥 Gas estimation failed:', gasError)
        throw new Error(`Transaction would fail: ${gasError instanceof Error ? gasError.message : 'Gas estimation error'}`)
      }
      
      console.log('🚀 Sending contribution transaction...')
      const tx = await contract.contribute({ value: amountInWei, gasLimit: gasLimit * BigInt(120) / BigInt(100) })
      console.log('📨 Transaction sent:', tx.hash)
      
      const receipt = await tx.wait()
      console.log('✅ Transaction confirmed:', receipt.hash)

      return {
        success: true,
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        amount: amountInWei.toString()
      }
    } catch (error) {
      console.error('💥 Error contributing to campaign:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Check for common error patterns and provide helpful messages
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction + gas fees. Please add more test ETH from Sepolia faucet.'
        } else if (error.message.includes('revert')) {
          errorMessage = 'Smart contract rejected the contribution: ' + error.message
        } else if (error.message.includes('CALL_EXCEPTION')) {
          errorMessage = 'Contract call failed. The campaign contract may be invalid or the campaign may be ended.'
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was cancelled by user'
        }
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Withdraw funds (for successful campaigns)
  async withdraw(campaignAddress: string, encryptedPrivateKey: string) {
    try {
      const wallet = this.createWalletFromEncrypted(encryptedPrivateKey)
      const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, wallet)
      
      const tx = await contract.withdraw()
      const receipt = await tx.wait()

      return {
        success: true,
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed.toString()
      }
    } catch (error) {
      console.error('Error withdrawing funds:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get refund (for failed campaigns)
  async refund(campaignAddress: string, encryptedPrivateKey: string) {
    try {
      const wallet = this.createWalletFromEncrypted(encryptedPrivateKey)
      const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, wallet)
      
      const tx = await contract.refund()
      const receipt = await tx.wait()

      return {
        success: true,
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed.toString()
      }
    } catch (error) {
      console.error('Error getting refund:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get user's contribution to a specific campaign
  async getUserContribution(campaignAddress: string, userAddress: string) {
    try {
      const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, this.provider)
      const contribution = await contract.contributions(userAddress)
      return contribution.toString()
    } catch (error) {
      console.error('Error fetching user contribution:', error)
      return '0'
    }
  }

  // Get wallet balance
  async getWalletBalance(address: string) {
    try {
      const balance = await this.provider.getBalance(address)
      return ethers.formatEther(balance)
    } catch (error) {
      console.error('Error fetching wallet balance:', error)
      return '0'
    }
  }

  // Withdraw funds from a campaign (automated system call)
  async withdrawCampaignFunds(campaignAddress: string, creatorUserId: string) {
    try {
      console.log(`💰 Initiating withdrawal for campaign ${campaignAddress} by creator ${creatorUserId}`)
      
      // Ensure connection first
      await this.ensureConnection()
      
      // Get creator's encrypted private key from database
      const { sql } = await import('@/lib/database')
      const userResult = await sql`
        SELECT private_key 
        FROM users 
        WHERE firebase_id = ${creatorUserId}
      `
      
      if (userResult.length === 0 || !userResult[0].private_key) {
        throw new Error('Creator wallet not found or not set up')
      }
      
      const encryptedPrivateKey = userResult[0].private_key
      const wallet = this.createWalletFromEncrypted(encryptedPrivateKey)
      
      console.log(`👛 Using creator wallet: ${wallet.address}`)
      
      // Verify this wallet is the campaign creator
      const campaignData = await this.getCampaignData(campaignAddress)
      if (!campaignData) {
        throw new Error('Campaign not found or inaccessible')
      }
      
      if (campaignData.creator.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error('Wallet address does not match campaign creator')
      }
      
      if (!campaignData.isSuccessful) {
        throw new Error('Campaign goal was not reached - withdrawal not allowed')
      }
      
      if (campaignData.isActive) {
        throw new Error('Campaign is still active - withdrawal not allowed')
      }
      
      if (campaignData.withdrawn) {
        return {
          success: true,
          alreadyWithdrawn: true,
          message: 'Funds already withdrawn'
        }
      }
      
      console.log(`✅ Withdrawal validation passed:`, {
        creator: campaignData.creator,
        goalReached: campaignData.isSuccessful,
        campaignEnded: !campaignData.isActive,
        notYetWithdrawn: !campaignData.withdrawn,
        totalContributed: campaignData.totalContributed
      })
      
      // Execute withdrawal
      const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, wallet)
      
      // Estimate gas
      const gasLimit = await contract.withdraw.estimateGas()
      console.log(`⛽ Gas estimate: ${gasLimit.toString()}`)
      
      // Send withdrawal transaction
      const tx = await contract.withdraw({
        gasLimit: gasLimit * BigInt(120) / BigInt(100) // 20% buffer
      })
      
      console.log(`📨 Withdrawal transaction sent: ${tx.hash}`)
      
      const receipt = await tx.wait()
      console.log(`✅ Withdrawal confirmed: ${receipt.hash}`)
      
      return {
        success: true,
        txHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        amount: campaignData.totalContributed,
        creatorAddress: wallet.address
      }
    } catch (error) {
      console.error('❌ Error withdrawing campaign funds:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Estimate gas for campaign creation
  async estimateCreateCampaignGas(
    encryptedPrivateKey: string,
    goalInEth: string,
    durationInDays: number
  ) {
    try {
      const wallet = this.createWalletFromEncrypted(encryptedPrivateKey)
      const factoryWithSigner = this.factoryContract.connect(wallet) as ethers.Contract
      
      const goalInWei = ethers.parseEther(goalInEth)
      const durationInSeconds = durationInDays * 24 * 60 * 60

      const gasEstimate = await factoryWithSigner.createCampaign.estimateGas(goalInWei, durationInSeconds)
      const gasPrice = await this.provider.getFeeData()

      const gasPriceBigInt = gasPrice.gasPrice || BigInt(0)
      const totalCost = gasEstimate * gasPriceBigInt

      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: gasPriceBigInt.toString(),
        estimatedCost: ethers.formatEther(totalCost.toString())
      }
    } catch (error) {
      console.error('Error estimating gas:', error)
      return {
        gasLimit: '0',
        gasPrice: '0',
        estimatedCost: '0'
      }
    }
  }
}

// Export singleton instance with error handling
let blockchainServiceInstance: BlockchainService | null = null

export const blockchainService = (() => {
  if (!blockchainServiceInstance) {
    try {
      blockchainServiceInstance = new BlockchainService()
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error)
      throw new Error('Blockchain service unavailable: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }
  return blockchainServiceInstance
})()