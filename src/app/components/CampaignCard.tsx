'use client';

import { useState, useEffect, useCallback } from 'react';
import { Campaign } from '../types/campaign';
import { web3Service } from '../utils/web3';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';
import Link from 'next/link';

// Helper function to safely convert value to ETH format
// Handles both wei (string of large numbers) and ETH (decimal string) formats
function safeFormatToEth(value: string | undefined): string {
  if (!value || value === '0') return '0';
  
  try {
    const numValue = parseFloat(value);
    
    // If it contains a decimal point and is a reasonable ETH amount (< 1000), treat as ETH
    if (value.includes('.') && numValue < 1000) {
      return numValue.toFixed(4);
    }
    
    // If it's a whole number >= 1000000000000 (0.000001 ETH in wei), treat as wei
    if (!value.includes('.') && numValue >= 1000000000000) {
      return parseFloat(ethers.formatEther(value)).toFixed(4);
    }
    
    // If it's a large number but has decimals, still might be wei
    if (numValue >= 1000000000000) {
      return parseFloat(ethers.formatEther(value.split('.')[0])).toFixed(4);
    }
    
    // Otherwise treat as ETH
    return numValue.toFixed(4);
  } catch (error) {
    console.warn('Error formatting value to ETH:', value, error);
    return '0.0000';
  }
}

interface CampaignCardProps {
  campaign: Campaign;
  onUpdate?: () => void;
}

export default function CampaignCard({ campaign, onUpdate }: CampaignCardProps) {
  const { account, isConnected } = useWallet();
  
  // Helper function to safely truncate addresses
  const truncateAddress = (address: string | undefined, startLen = 6, endLen = 4): string => {
    if (!address || address.length < startLen + endLen) {
      return address || 'N/A';
    }
    return `${address.substring(0, startLen)}...${address.substring(address.length - endLen)}`;
  };
  const [contributeAmount, setContributeAmount] = useState('');
  const [isContributing, setIsContributing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [userContribution, setUserContribution] = useState('0');

  const loadUserContribution = useCallback(async () => {
    if (!account) return;
    try {
      const contribution = await web3Service.getUserContribution(campaign.address, account);
      setUserContribution(contribution);
    } catch (error) {
      console.error('Failed to load user contribution:', error);
    }
  }, [account, campaign.address]);

  useEffect(() => {
    if (account) {
      loadUserContribution();
    }
  }, [account, loadUserContribution]);

  const handleContribute = async () => {
    if (!contributeAmount || parseFloat(contributeAmount) <= 0) {
      alert('Please enter a valid contribution amount');
      return;
    }

    setIsContributing(true);
    try {
      await web3Service.contribute(campaign.address, contributeAmount);
      setContributeAmount('');
      onUpdate?.();
      await loadUserContribution();
    } catch (error) {
      console.error('Failed to contribute:', error);
      alert('Failed to contribute: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsContributing(false);
    }
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      await web3Service.withdrawFunds(campaign.address);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to withdraw:', error);
      alert('Failed to withdraw: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleRefund = async () => {
    setIsRefunding(true);
    try {
      await web3Service.getRefund(campaign.address);
      onUpdate?.();
      await loadUserContribution();
    } catch (error) {
      console.error('Failed to get refund:', error);
      alert('Failed to get refund: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRefunding(false);
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Ended';
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const progressPercentage = Math.min((parseFloat(safeFormatToEth(campaign.totalContributed)) / parseFloat(safeFormatToEth(campaign.goal))) * 100, 100);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <Link 
            href={`/campaign/${campaign.address}`}
            className="text-lg font-semibold text-blue-600 hover:text-blue-800"
          >
            {campaign.title || 'Untitled Campaign'}
          </Link>
          <p className="text-sm text-gray-500">
            by {truncateAddress(campaign.creator)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400 font-mono">
              {truncateAddress(campaign.address)}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(campaign.address)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy contract address"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <a
              href={`https://sepolia.etherscan.io/address/${campaign.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-600 transition-colors"
              title="View on Etherscan"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
            campaign.isActive 
              ? 'bg-green-100 text-green-800'
              : campaign.isSuccessful 
                ? 'bg-blue-100 text-blue-800'
                : 'bg-red-100 text-red-800'
          }`}>
            {campaign.isActive ? 'Active' : campaign.isSuccessful ? 'Successful' : 'Failed'}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{progressPercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="font-semibold text-lg">
            {safeFormatToEth(campaign.totalContributed)} ETH
          </span>
          <span className="text-gray-600">
            of {safeFormatToEth(campaign.goal)} ETH
          </span>
        </div>
      </div>

      <div className="text-center text-sm text-gray-600 mb-4">
        {formatTimeRemaining(campaign.timeRemaining)}
      </div>

      {parseFloat(userContribution) > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            Your contribution: {safeFormatToEth(userContribution)} ETH
          </p>
        </div>
      )}

      {isConnected && (
        <div className="space-y-3">
          {campaign.isActive && (
            <div className="flex gap-2">
              <input
                type="number"
                step="0.001"
                placeholder="ETH amount"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleContribute}
                disabled={isContributing || !contributeAmount}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {isContributing ? 'Contributing...' : 'Contribute'}
              </button>
            </div>
          )}

          {!campaign.isActive && account === campaign.creator && campaign.isSuccessful && !campaign.withdrawn && (
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw Funds'}
            </button>
          )}

          {!campaign.isActive && !campaign.isSuccessful && parseFloat(userContribution) > 0 && (
            <button
              onClick={handleRefund}
              disabled={isRefunding}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {isRefunding ? 'Refunding...' : 'Get Refund'}
            </button>
          )}
        </div>
      )}

      {!isConnected && (
        <div className="text-center text-gray-500 text-sm">
          Connect your wallet to interact
        </div>
      )}
    </div>
  );
}