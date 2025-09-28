'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FaWallet, FaHistory, FaSearch, FaSignOutAlt, FaEthereum } from 'react-icons/fa'
import CampaignCard from '../components/CampaignCard'
import { Campaign } from '../types/campaign'
import { useAuthState, useSignOut } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  walletAddress: string
}

export default function UserDashboard() {
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
        if (userData.user.role !== 'user') {
          router.push('/creator-dashboard')
          return
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }, [user, router])

  const fetchCampaigns = useCallback(async () => {
    try {
      // Fetch real campaigns from API
      const response = await fetch('/api/campaigns')
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
  }, [])

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/signin')
      return
    }

    fetchUserData()
    fetchCampaigns()
  }, [user, loading, router, fetchUserData, fetchCampaigns])

  const filteredCampaigns = campaigns.filter(campaign => {
    if (!campaign) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (campaign.address && campaign.address.toLowerCase().includes(searchLower)) ||
      (campaign.creator && campaign.creator.toLowerCase().includes(searchLower)) ||
      (campaign.title && campaign.title.toLowerCase().includes(searchLower))
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
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
                Welcome back, {userProfile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Contributor'}!
              </h1>
              <p className="text-gray-600 mt-1">Discover and support amazing campaigns</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-50 px-4 py-2 rounded-lg flex items-center space-x-2">
                <FaWallet className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
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
                    className="text-blue-600 hover:text-blue-800 transition-colors"
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
                <h3 className="text-lg font-semibold text-gray-900">Total Contributed</h3>
                <p className="text-2xl font-bold text-purple-600">0 ETH</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <FaHistory className="text-3xl text-green-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Campaigns Supported</h3>
                <p className="text-2xl font-bold text-green-600">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-blue-600 font-bold">🎯</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Active Campaigns</h3>
                <p className="text-2xl font-bold text-blue-600">{campaigns.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-yellow-600 font-bold">⭐</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Success Rate</h3>
                <p className="text-2xl font-bold text-yellow-600">N/A</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Filter
            </button>
          </div>
        </div>

        {/* Campaigns Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Campaigns</h2>
          
          {campaignsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
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
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search terms' : 'Check back later for new campaigns'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.map((campaign, index) => (
                <CampaignCard key={campaign.address || campaign.id || index} campaign={campaign} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}