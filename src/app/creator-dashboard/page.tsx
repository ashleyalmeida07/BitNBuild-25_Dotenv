'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FaWallet, FaPlus, FaSearch, FaSignOutAlt, FaEthereum, FaChartLine, FaUsers } from 'react-icons/fa'
import CampaignCard from '../components/CampaignCard'
import { Campaign } from '../types/campaign'
import { useAuthState, useSignOut } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import { ethers } from 'ethers'
import Link from 'next/link'

// Helper function to safely convert value to ETH format
function safeFormatToEth(value: string | undefined): number {
  if (!value || value === '0') return 0;
  
  try {
    const numValue = parseFloat(value);
    
    // If it contains a decimal point and is a reasonable ETH amount (< 1000), treat as ETH
    if (value.includes('.') && numValue < 1000) {
      return numValue;
    }
    
    // If it's a whole number >= 1000000000000 (0.000001 ETH in wei), treat as wei
    if (!value.includes('.') && numValue >= 1000000000000) {
      return parseFloat(ethers.formatEther(value));
    }
    
    // If it's a large number but has decimals, still might be wei
    if (numValue >= 1000000000000) {
      return parseFloat(ethers.formatEther(value.split('.')[0]));
    }
    
    // Otherwise treat as ETH
    return numValue;
  } catch (error) {
    console.warn('Error formatting value to ETH:', value, error);
    return 0;
  }
}

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  walletAddress: string
}

export default function CreatorDashboard() {
  const [user, loading] = useAuthState(auth)
  const [signOut] = useSignOut(auth)
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  const fetchUserData = useCallback(async () => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUserProfile(userData.user)

        // Check if user has the right role
        if (userData.user.role !== 'creator') {
          router.push('/user-dashboard')
          return
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }, [user, router])

  const fetchMyCampaigns = useCallback(async () => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()
      // Fetch user's campaigns from API
      const response = await fetch('/api/campaigns/user', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data.campaigns || [])
      } else {
        setCampaigns([])
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      setCampaigns([])
    } finally {
      setCampaignsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/signin')
      return
    }

    fetchUserData()
  }, [user, loading, router, fetchUserData])

  useEffect(() => {
    if (user) {
      fetchMyCampaigns()
    }
  }, [user, fetchMyCampaigns])

  const filteredCampaigns = campaigns.filter(campaign => {
    if (!campaign) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (campaign.title && campaign.title.toLowerCase().includes(searchLower)) ||
      (campaign.address && campaign.address.toLowerCase().includes(searchLower))
    );
  })

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/signin')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Calculate stats - safely convert values to ETH
  const totalRaised = campaigns.reduce((sum, campaign) => 
    sum + safeFormatToEth(campaign.totalContributed), 0
  )
  const activeCampaigns = campaigns.filter(c => c.isActive).length
  const successfulCampaigns = campaigns.filter(c => c.isSuccessful).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Creator Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {userProfile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Creator'}! Manage your campaigns
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-green-50 px-4 py-2 rounded-lg flex items-center space-x-2">
                <FaWallet className="text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {userProfile?.walletAddress 
                    ? `${userProfile.walletAddress.slice(0, 6)}...${userProfile.walletAddress.slice(-4)}`
                    : 'Loading...'
                  }
                </span>
                {userProfile?.walletAddress && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userProfile.walletAddress)
                      alert('Wallet address copied to clipboard!')
                    }}
                    className="text-green-600 hover:text-green-800 transition-colors"
                    title="Copy wallet address"
                  >
                    📋
                  </button>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FaSignOutAlt />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <FaEthereum className="text-3xl text-purple-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Total Raised</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {totalRaised.toFixed(4)} ETH
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <FaChartLine className="text-3xl text-green-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Active Campaigns</h3>
                <p className="text-2xl font-bold text-green-600">{activeCampaigns}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-blue-600 font-bold">✅</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Successful</h3>
                <p className="text-2xl font-bold text-blue-600">{successfulCampaigns}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <FaUsers className="text-3xl text-yellow-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Total Backers</h3>
                <p className="text-2xl font-bold text-yellow-600">N/A</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <Link
              href="/create"
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaPlus />
              <span>Create New Campaign</span>
            </Link>
          </div>
        </div>

        {/* Campaigns Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Campaigns</h2>
          
          {campaignsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns match your search'}
              </h3>
              <p className="text-gray-600 mb-6">
                {campaigns.length === 0 
                  ? 'Ready to launch your first campaign? Get started now!' 
                  : 'Try adjusting your search terms'
                }
              </p>
              {campaigns.length === 0 && (
                <Link
                  href="/create"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FaPlus />
                  <span>Create Your First Campaign</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.map((campaign, index) => (
                <CampaignCard 
                  key={campaign.address || campaign.id || index} 
                  campaign={campaign}
                  onUpdate={fetchMyCampaigns}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tips for Creators */}
        {campaigns.length === 0 && (
          <div className="mt-12 bg-white p-8 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              🎯 Tips for Successful Campaigns
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Set Realistic Goals</h4>
                <p className="text-gray-600 text-sm">
                  Research similar projects and set achievable funding targets
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Compelling Story</h4>
                <p className="text-gray-600 text-sm">
                  Tell your story authentically and explain why your project matters
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Engage Your Community</h4>
                <p className="text-gray-600 text-sm">
                  Build an audience before launching and keep them updated
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Transparent Updates</h4>
                <p className="text-gray-600 text-sm">
                  Regular updates build trust and keep backers engaged
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}