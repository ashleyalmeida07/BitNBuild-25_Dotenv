'use client';

import { useState, useEffect } from 'react';
import { CAMPAIGN_FACTORY_ADDRESS } from '../utils/web3';

interface BlockchainStatusProps {
  totalCampaigns: number;
}

export default function BlockchainStatus({ totalCampaigns }: BlockchainStatusProps) {
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockNumber();
    const interval = setInterval(fetchBlockNumber, 15000); // Update every 15 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchBlockNumber = async () => {
    try {
      const response = await fetch('https://rpc.sepolia.org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });
      
      const data = await response.json();
      if (data.result) {
        setBlockNumber(parseInt(data.result, 16));
      }
    } catch (error) {
      console.error('Failed to fetch block number:', error);
    } finally {
      setLoading(false);
    }
  };

  const isContractConfigured = CAMPAIGN_FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 8.172V5L8 4z" />
          </svg>
          Blockchain Status
        </h2>
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-sm text-green-700 font-medium">Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {loading ? '...' : blockNumber?.toLocaleString() || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Latest Block</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {totalCampaigns}
          </div>
          <div className="text-sm text-gray-600">Total Campaigns</div>
        </div>

        <div className="text-center">
          <div className={`text-2xl font-bold ${isContractConfigured ? 'text-green-600' : 'text-red-600'}`}>
            {isContractConfigured ? '✓' : '⚠'}
          </div>
          <div className="text-sm text-gray-600">Contract Status</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            Sepolia
          </div>
          <div className="text-sm text-gray-600">Test Network</div>
        </div>
      </div>

      {!isContractConfigured && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Setup Required</p>
              <p className="text-yellow-700 mt-1">
                Please update the contract address in <code className="font-mono bg-yellow-100 px-1 rounded">src/app/utils/web3.ts</code> to start using the platform.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-blue-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <span>Contract:</span>
            <code className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded border">
              {isContractConfigured 
                ? `${CAMPAIGN_FACTORY_ADDRESS.substring(0, 8)}...${CAMPAIGN_FACTORY_ADDRESS.substring(CAMPAIGN_FACTORY_ADDRESS.length - 6)}` 
                : 'Not configured'
              }
            </code>
            {isContractConfigured && (
              <a
                href={`https://sepolia.etherscan.io/address/${CAMPAIGN_FACTORY_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 hover:text-blue-800"
                title="View on Etherscan"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://sepolia.etherscan.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Block Explorer ↗
            </a>
            <a
              href="https://sepoliafaucet.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Get Test ETH ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}