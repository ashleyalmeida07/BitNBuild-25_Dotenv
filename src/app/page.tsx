'use client'

import { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import Link from 'next/link'

interface Campaign {
  id: string
  title: string
  description: string
  target: string
  deadline: string
  contract_address: string
  creator_id: string
  is_active: boolean
  created_at: string
  blockchain?: {
    address: string
    creator: string
    goal: string
    deadline: number
    totalContributed: string
    withdrawn: boolean
    isActive: boolean
    isSuccessful: boolean
    timeRemaining: number
  }
  status?: string
  progress?: number
  timeRemaining?: number
  totalRaised?: string
  goalAmount?: string
}

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  walletAddress: string
  image?: string
}

export default function Home() {
  const [user, loading, error] = useAuthState(auth)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignLoading, setCampaignLoading] = useState(true)
  const [campaignError, setCampaignError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    loadCampaigns()
  }, [])

  // Load user profile when user signs in
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return
      
      try {
        const idToken = await user.getIdToken()
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setUserProfile(data.user)
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      }
    }

    loadUserProfile()
  }, [user])

  const loadCampaigns = async () => {
    try {
      setCampaignLoading(true)
      setCampaignError(null)
      
      const response = await fetch('/api/campaigns')
      const data = await response.json()
      
      if (data.success) {
        setCampaigns(data.campaigns)
      } else {
        setCampaignError(data.error || 'Failed to load campaigns')
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err)
      setCampaignError('Failed to load campaigns. Please try again.')
    } finally {
      setCampaignLoading(false)
    }
  }

  if (loading || campaignLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading campaigns...</p>
        </div>
      </div>
    )
  }

  if (error || campaignError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-red-300 mb-2">Error Loading Campaigns</h2>
            <p className="text-red-200 mb-4">{campaignError || error?.message}</p>
            <button
              onClick={loadCampaigns}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          {user && userProfile ? (
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {userProfile.name || 'User'}! 👋
              </h1>
              <p className="text-purple-300">
                You&apos;re signed in as a <span className="font-semibold capitalize">{userProfile.role}</span>
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-5xl font-bold text-white mb-4">
                KickStart Crypto
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Fund innovative projects with cryptocurrency. Transparent, trustless, and secure.
              </p>
            </div>
          )}
          
          {/* Navigation */}
          <div className="flex justify-center gap-4 mb-8">
            {user ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-4">
                  {userProfile?.role === 'creator' && (
                    <Link
                      href="/create"
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                    >
                      Create Campaign
                    </Link>
                  )}
                  <Link
                    href={userProfile?.role === 'creator' ? '/creator-dashboard' : '/user-dashboard'}
                    className="px-6 py-3 bg-white/10 backdrop-blur-md text-white font-bold rounded-lg hover:bg-white/20 transition-all duration-200"
                  >
                    My Dashboard
                  </Link>
                </div>
                {/* Wallet Address Display */}
                {userProfile?.walletAddress && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-lg px-4 py-2">
                    <span className="text-gray-300 text-sm">Wallet:</span>
                    <code className="text-purple-300 text-sm">
                      {userProfile.walletAddress.slice(0, 6)}...{userProfile.walletAddress.slice(-4)}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(userProfile.walletAddress)
                        alert('Wallet address copied to clipboard!')
                      }}
                      className="text-white hover:text-purple-300 transition-colors"
                      title="Copy wallet address"
                    >
                      📋
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/signin"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Feature 1: Decentralized */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-xl font-bold text-white mb-4">Decentralized</h3>
            <p className="text-gray-300">
              Built on blockchain technology for complete transparency and trust. No intermediaries, just you and the community.
            </p>
          </div>

          {/* Feature 2: Secure Wallets */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-bold text-white mb-4">Secure Wallets</h3>
            <p className="text-gray-300">
              Server-managed wallets with military-grade encryption. No MetaMask required - we handle the complexity for you.
            </p>
          </div>

          {/* Feature 3: Global Reach */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-xl font-bold text-white mb-4">Global Reach</h3>
            <p className="text-gray-300">
              Fund projects from anywhere in the world using cryptocurrency. Breaking down barriers to innovation.
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-purple-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-300">1</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sign Up</h3>
              <p className="text-gray-300">
                Create your account with Google OAuth. We&apos;ll generate a secure wallet for you automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-pink-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-pink-300">2</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Explore & Fund</h3>
              <p className="text-gray-300">
                Browse innovative campaigns and contribute to projects that inspire you using cryptocurrency.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-blue-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-300">3</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Track Progress</h3>
              <p className="text-gray-300">
                Watch your supported projects grow and succeed with full transparency and regular updates.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-16">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of innovators and supporters building the future together.
            </p>
            {user ? (
              <Link
                href={userProfile?.role === 'creator' ? '/creator-dashboard' : '/user-dashboard'}
                className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/signin"
                className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
              >
                Join Now - It&apos;s Free!
              </Link>
            )}
          </div>
        </div>

        {/* Active Campaigns Preview */}
        {campaigns.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Featured Campaigns</h2>
              <p className="text-gray-300">Discover amazing projects currently raising funds</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {campaigns.slice(0, 3).map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 hover:bg-white/20 transition-all duration-200 cursor-pointer"
                >
                  <Link href={`/campaign/${campaign.contract_address}`}>
                    <h3 className="text-xl font-bold text-white mb-2">{campaign.title}</h3>
                    <p className="text-gray-300 mb-4 line-clamp-2">{campaign.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-300">Progress</span>
                        <span className="text-sm text-white">{(campaign.progress || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(campaign.progress || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-300">Raised</div>
                        <div className="text-lg font-semibold text-white">{campaign.totalRaised || '0'} ETH</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-300">Goal</div>
                        <div className="text-lg font-semibold text-white">{campaign.goalAmount || campaign.target} ETH</div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link
                href={user ? (userProfile?.role === 'creator' ? '/creator-dashboard' : '/user-dashboard') : '/signin'}
                className="inline-block px-6 py-3 bg-white/10 backdrop-blur-md text-white font-semibold rounded-lg hover:bg-white/20 transition-all duration-200"
              >
                {user ? 'View All Campaigns' : 'Sign In to Explore More'}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}