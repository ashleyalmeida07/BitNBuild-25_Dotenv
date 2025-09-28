'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { web3Service, CAMPAIGN_FACTORY_ADDRESS } from '../utils/web3';
import { useWallet } from '../hooks/useWallet';
import { CampaignFormData } from '../types/campaign';

export default function CreateCampaignForm() {
  const router = useRouter();
  const { account, isConnected } = useWallet();
  const [formData, setFormData] = useState<CampaignFormData>({
    goal: '',
    duration: 7
  });
  const [isCreating, setIsCreating] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{
    chainId: string;
    chainName: string;
    isCorrectNetwork: boolean;
  } | null>(null);

  useEffect(() => {
    if (isConnected) {
      checkNetwork();
    }
  }, [isConnected]);

  const checkNetwork = async () => {
    if (!window.ethereum) return;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const isCorrectNetwork = chainId === '0xaa36a7'; // Sepolia chainId
      
      setNetworkInfo({
        chainId: chainId as string,
        chainName: isCorrectNetwork ? 'Sepolia Testnet' : 'Unknown Network',
        isCorrectNetwork
      });
    } catch (error) {
      console.error('Failed to check network:', error);
    }
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
      await checkNetwork();
    } catch (error) {
      console.error('Failed to switch network:', error);
      // If the network doesn't exist, add it
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia test network',
            nativeCurrency: {
              name: 'SepoliaETH',
              symbol: 'SEP',
              decimals: 18,
            },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          }],
        });
        await checkNetwork();
      } catch (addError) {
        console.error('Failed to add network:', addError);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!networkInfo?.isCorrectNetwork) {
      alert('Please switch to Sepolia testnet first');
      return;
    }

    if (!formData.goal || parseFloat(formData.goal) <= 0) {
      alert('Please enter a valid funding goal');
      return;
    }

    // Allow any duration for testing (removed 1-day minimum)
    if (formData.duration <= 0) {
      alert('Campaign duration must be greater than 0');
      return;
    }

    setIsCreating(true);
    try {
      // Convert duration from days to seconds
      const durationInSeconds = formData.duration * 24 * 60 * 60;
      const tx = await web3Service.createCampaign(formData.goal, durationInSeconds);
      
      alert('Campaign created successfully! Transaction: ' + tx.hash);
      router.push('/');
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert('Failed to create campaign: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Create Campaign</h2>
      
      {/* Blockchain Information */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Blockchain Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Network:</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                networkInfo?.isCorrectNetwork 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {networkInfo?.chainName || 'Not Connected'}
              </span>
              {networkInfo && !networkInfo.isCorrectNetwork && (
                <button
                  onClick={switchToSepolia}
                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  Switch to Sepolia
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Factory Contract:</span>
            <p className="font-mono text-xs break-all mt-1">
              {CAMPAIGN_FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000" 
                ? CAMPAIGN_FACTORY_ADDRESS 
                : "⚠️ Not configured"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Wallet Connection Status */}
      {isConnected && account && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Connected Wallet</p>
              <p className="text-xs font-mono text-blue-600">{account}</p>
            </div>
            <div className="flex items-center text-green-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
            Funding Goal (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            id="goal"
            name="goal"
            value={formData.goal}
            onChange={handleInputChange}
            placeholder="Enter funding goal in ETH"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            min="0"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum: 0.001 ETH</p>
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Duration
          </label>
          <select
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value={0.0007}>1 minute (testing)</option>
            <option value={0.0035}>5 minutes (testing)</option>
            <option value={0.007}>10 minutes (testing)</option>
            <option value={0.021}>30 minutes (testing)</option>
            <option value={0.042}>1 hour (testing)</option>
            <option value={0.125}>3 hours (testing)</option>
            <option value={0.25}>6 hours (testing)</option>
            <option value={0.5}>12 hours (testing)</option>
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>1 week</option>
            <option value={14}>2 weeks</option>
            <option value={30}>1 month</option>
            <option value={60}>2 months</option>
            <option value={90}>3 months</option>
          </select>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Campaign Preview:</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Goal:</strong> {formData.goal || '0'} ETH</p>
            <p><strong>Duration:</strong> {
              formData.duration < 1 ? 
                (formData.duration < 0.042 ? 
                  `${Math.round(formData.duration * 24 * 60)} minutes` : 
                  `${Math.round(formData.duration * 24)} hours`
                ) : 
                `${formData.duration} day${formData.duration !== 1 ? 's' : ''}`
            }</p>
            <p><strong>Deadline:</strong> {new Date(Date.now() + formData.duration * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Gas Fee Estimation */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Transaction Fee Required</p>
              <p className="text-yellow-700 mt-1">
                Creating a campaign requires a small gas fee (usually $1-5 worth of ETH). 
                Make sure you have enough Sepolia ETH in your wallet.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isCreating || !isConnected || !networkInfo?.isCorrectNetwork}
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isCreating ? 'Creating Campaign...' : 'Create Campaign'}
        </button>

        {!isConnected && (
          <p className="text-sm text-red-600 text-center">
            Please connect your wallet to create a campaign
          </p>
        )}

        {isConnected && !networkInfo?.isCorrectNetwork && (
          <p className="text-sm text-red-600 text-center">
            Please switch to Sepolia testnet to create a campaign
          </p>
        )}
      </form>
    </div>
  );
}