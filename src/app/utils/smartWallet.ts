'use client';

import { ethers } from 'ethers';

export interface SmartWalletUser {
  address: string;
  email?: string;
  socialProvider?: 'google' | 'twitter' | 'github';
  isConnected: boolean;
}

export class SmartWalletService {
  private provider: ethers.JsonRpcProvider;
  private currentUser: SmartWalletUser | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider('https://rpc.sepolia.org');
  }

  // Social login - no wallet needed
  async loginWithSocial(provider: 'google' | 'twitter' | 'github' | 'email', identifier: string): Promise<SmartWalletUser> {
    try {
      // In a real implementation, this would integrate with Web3Auth or similar
      // For demo, we'll create a deterministic wallet from social login
      const seed = `${provider}-${identifier}-kickstart-crypto`;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(seed));
      const wallet = new ethers.Wallet(hash);

      this.currentUser = {
        address: wallet.address,
        email: provider === 'email' ? identifier : undefined,
        socialProvider: provider !== 'email' ? provider : undefined,
        isConnected: true
      };

      // Store user session
      localStorage.setItem('smartWalletUser', JSON.stringify(this.currentUser));

      return this.currentUser;
    } catch {
      throw new Error('Failed to login with social provider');
    }
  }

  // Email/password login
  async loginWithEmail(email: string, password?: string): Promise<SmartWalletUser> {
    // Create deterministic wallet from email
    const seed = `email-${email.toLowerCase()}-kickstart-crypto-${password || 'default'}`;
    const hash = ethers.keccak256(ethers.toUtf8Bytes(seed));
    const wallet = new ethers.Wallet(hash);

    this.currentUser = {
      address: wallet.address,
      email: email,
      isConnected: true
    };

    localStorage.setItem('smartWalletUser', JSON.stringify(this.currentUser));
    return this.currentUser;
  }

  // Check if user is already logged in
  async checkExistingSession(): Promise<SmartWalletUser | null> {
    try {
      const stored = localStorage.getItem('smartWalletUser');
      if (stored) {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
    return null;
  }

  // Logout
  async logout(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem('smartWalletUser');
  }

  // Get current user
  getCurrentUser(): SmartWalletUser | null {
    return this.currentUser;
  }

  // Get user's wallet for transactions (server-side only)
  private getUserWallet(user: SmartWalletUser): ethers.Wallet {
    if (user.email) {
      const seed = `email-${user.email.toLowerCase()}-kickstart-crypto`;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(seed));
      return new ethers.Wallet(hash, this.provider);
    } else if (user.socialProvider) {
      const seed = `${user.socialProvider}-${user.address}-kickstart-crypto`;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(seed));
      return new ethers.Wallet(hash, this.provider);
    }
    throw new Error('Cannot create wallet for user');
  }

  // Fund user wallet (you'll need to implement this server-side)
  async fundUserWallet(user: SmartWalletUser, amount: string): Promise<string> {
    // This would be a server endpoint that sends ETH to user's wallet
    const response = await fetch('/api/fund-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userAddress: user.address,
        amount: amount 
      })
    });
    
    const result = await response.json();
    return result.txHash;
  }

  // Make transaction on user's behalf (smooth UX)
  async makeUserTransaction(
    user: SmartWalletUser,
    contractAddress: string,
    functionName: string,
    args: unknown[],
    value?: string
  ): Promise<string> {
    // This would be a server endpoint that executes transactions
    const response = await fetch('/api/execute-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: user.address,
        contractAddress,
        functionName,
        args,
        value
      })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.txHash;
  }

  // Get user balance
  async getUserBalance(user: SmartWalletUser): Promise<string> {
    try {
      const balance = await this.provider.getBalance(user.address);
      return ethers.formatEther(balance);
    } catch {
      return '0';
    }
  }
}

export const smartWalletService = new SmartWalletService();