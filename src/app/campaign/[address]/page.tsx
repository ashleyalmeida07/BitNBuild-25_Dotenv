'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import { ethers } from 'ethers'
import Link from 'next/link'

// Helper function to safely convert value to ETH format
function safeFormatToEth(value: string | undefined): string {
  if (!value || value === '0') return '0.0000';
  
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

interface CampaignDetails {
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

export default function CampaignDetailsPage() {
  const params = useParams()
  const [user, loading, error] = useAuthState(auth)
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null)
  const [campaignLoading, setCampaignLoading] = useState(true)
  const [campaignError, setCampaignError] = useState<string | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')
  const [isContributing, setIsContributing] = useState(false)
  const [balance, setBalance] = useState('0')

  // Load campaign details
  const loadCampaign = async () => {
    if (!params.address) return
    
    try {
      setCampaignLoading(true)
      const response = await fetch('/api/campaigns')
      const data = await response.json()
      
      if (data.success) {
        const foundCampaign = data.campaigns.find(
          (c: CampaignDetails) => c.contract_address === params.address
        )
        if (foundCampaign) {
          setCampaign(foundCampaign)
        } else {
          setCampaignError('Campaign not found')
        }
      } else {
        setCampaignError(data.error || 'Failed to load campaign')
      }
    } catch (error) {
      console.error('Error loading campaign:', error)
      setCampaignError('Failed to load campaign')
    } finally {
      setCampaignLoading(false)
    }
  }

  useEffect(() => {
    const loadCampaignData = async () => {
      if (!params.address) return
      
      try {
        setCampaignLoading(true)
        const response = await fetch('/api/campaigns')
        const data = await response.json()
        
        if (data.success) {
          const foundCampaign = data.campaigns.find(
            (c: CampaignDetails) => c.contract_address === params.address
          )
          if (foundCampaign) {
            setCampaign(foundCampaign)
          } else {
            setCampaignError('Campaign not found')
          }
        } else {
          setCampaignError(data.error || 'Failed to load campaign')
        }
      } catch (error) {
        console.error('Error loading campaign:', error)
        setCampaignError('Failed to load campaign')
      } finally {
        setCampaignLoading(false)
      }
    }

    loadCampaignData()
  }, [params.address])

  // Separate function for refreshing campaign data
  const refreshCampaign = () => {
    loadCampaign()
  }

  // Load wallet balance
  useEffect(() => {
    async function loadBalance() {
      if (!user) return
      
      try {
        const idToken = await user.getIdToken()
        const response = await fetch('/api/wallet/balance', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })
        const data = await response.json()
        
        if (data.success) {
          setBalance(data.balance)
        }
      } catch (error) {
        console.error('Error loading balance:', error)
      }
    }

    loadBalance()
  }, [user])

  const handleContribute = async () => {
    if (!user || !campaign || !contributeAmount) return
    
    const amount = parseFloat(contributeAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (amount > parseFloat(balance)) {
      alert('Insufficient balance')
      return
    }

    try {
      setIsContributing(true)
      const idToken = await user.getIdToken()
      
      const response = await fetch('/api/blockchain/contribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idToken,
          campaignAddress: campaign.contract_address,
          amount: contributeAmount
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Contribution successful!')
        setContributeAmount('')
        // Refresh campaign data and balance after a small delay to allow blockchain to update
        setTimeout(() => {
          refreshCampaign()
          // Also reload balance
          window.location.reload()
        }, 3000) // Wait 3 seconds for blockchain to update
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Contribution error:', error)
      alert('Failed to contribute')
    } finally {
      setIsContributing(false)
    }
  }

  if (loading || campaignLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (error || campaignError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{campaignError || error?.message}</div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Campaign not found</div>
      </div>
    )
  }

  const progress = campaign.progress || 0
  const timeRemaining = campaign.timeRemaining || 0
  const daysLeft = Math.floor(timeRemaining / (24 * 60 * 60))
  const hoursLeft = Math.floor((timeRemaining % (24 * 60 * 60)) / (60 * 60))

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/" 
              className="text-blue-400 hover:text-blue-300 transition-colors mb-4 inline-block"
            >
              ← Back to Campaigns
            </Link>
            <h1 className="text-4xl font-bold text-white mb-4">{campaign.title}</h1>
            <div className="flex items-center gap-4 text-gray-300">
              <span className={`px-3 py-1 rounded-full text-sm ${
                campaign.status === 'active' 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-gray-500/20 text-gray-300'
              }`}>
                {campaign.status === 'active' ? 'Active' : 'Inactive'}
              </span>
              <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Description</h2>
                <p className="text-gray-300 leading-relaxed mb-8">{campaign.description}</p>

                {/* Progress */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-semibold">Progress</span>
                    <span className="text-white">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-300 mt-2">
                    <span>{safeFormatToEth(campaign.totalRaised)} ETH raised</span>
                    <span>{safeFormatToEth(campaign.goalAmount)} ETH goal</span>
                  </div>
                </div>

                {/* Time Remaining */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-2">Time Remaining</h3>
                  {timeRemaining > 0 ? (
                    <div className="text-2xl font-bold text-purple-300">
                      {daysLeft}d {hoursLeft}h
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-red-300">Campaign Ended</div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contribute Card */}
              {user && campaign.status === 'active' && timeRemaining > 0 && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Contribute</h3>
                  
                  <div className="mb-4">
                    <div className="text-sm text-gray-300 mb-2">Your Balance</div>
                    <div className="text-lg font-semibold text-white">{balance} ETH</div>
                  </div>

                  <div className="mb-4">
                    <input
                      type="number"
                      value={contributeAmount}
                      onChange={(e) => setContributeAmount(e.target.value)}
                      placeholder="Amount in ETH"
                      className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                      step="0.001"
                      min="0"
                    />
                  </div>

                  <button
                    onClick={handleContribute}
                    disabled={isContributing || !contributeAmount}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isContributing ? 'Contributing...' : 'Contribute'}
                  </button>
                </div>
              )}

              {!user && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Join to Contribute</h3>
                  <p className="text-gray-300 mb-4">Sign in to support this campaign</p>
                  <Link 
                    href="/auth/signin"
                    className="block text-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
                  >
                    Sign In
                  </Link>
                </div>
              )}

              {/* Campaign Stats */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Campaign Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Contract</span>
                    <span className="text-white text-sm">
                      {campaign.contract_address.slice(0, 6)}...{campaign.contract_address.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Goal</span>
                    <span className="text-white">{safeFormatToEth(campaign.goalAmount)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Raised</span>
                    <span className="text-white">{safeFormatToEth(campaign.totalRaised)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Status</span>
                    <span className={campaign.blockchain?.isSuccessful ? 'text-green-300' : 'text-yellow-300'}>
                      {campaign.blockchain?.isSuccessful ? 'Successful' : 'In Progress'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}