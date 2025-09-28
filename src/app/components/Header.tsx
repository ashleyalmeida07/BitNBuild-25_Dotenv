'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { CAMPAIGN_FACTORY_ADDRESS } from '../utils/web3';

interface UserProfile {
  role: string;
  email: string;
  name?: string;
  walletAddress?: string;
}

export default function Header() {
  const [user] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{
    chainId: string;
    chainName: string;
    isCorrectNetwork: boolean;
  } | null>(null);

  // Fetch user profile when user changes
  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) {
        setUserProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserProfile(data.user);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
      } finally {
        setProfileLoading(false);
      }
    }

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    // For smart wallets, we always assume correct network since we manage it
    setNetworkInfo({
      chainId: '0xaa36a7',
      chainName: 'Sepolia',
      isCorrectNetwork: true
    });
  }, []);

  const isContractConfigured = CAMPAIGN_FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000";

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Kickstart Crypto
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                  isContractConfigured 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-1 ${
                    isContractConfigured ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  {isContractConfigured ? 'Contract Ready' : 'Setup Required'}
                </div>
                {networkInfo && (
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    networkInfo.isCorrectNetwork 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-1 ${
                      networkInfo.isCorrectNetwork ? 'bg-blue-500' : 'bg-orange-500'
                    }`}></div>
                    {networkInfo.chainName}
                  </div>
                )}
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors">
                Campaigns
              </Link>
              {/* Show Create Campaign only for: 1) Guest users OR 2) Confirmed creators (not loading) */}
              {(!user || (!profileLoading && userProfile?.role === 'creator')) && (
                <Link href="/create" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Create Campaign
                </Link>
              )}
              <a
                href="https://sepolia.etherscan.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
              >
                Explorer ↗
              </a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}