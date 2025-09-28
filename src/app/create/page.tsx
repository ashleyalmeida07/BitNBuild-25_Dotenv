'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import Link from 'next/link'

export default function CreateCampaignPage() {
  const router = useRouter()
  const [user, loading, error] = useAuthState(auth)
  const [userProfile, setUserProfile] = useState<{ role: string; email: string; name?: string; walletAddress?: string } | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goalInEth: '',
    durationInDays: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [balance, setBalance] = useState('0')

  // Load user profile to check role
  useEffect(() => {
    async function loadUserProfile() {
      if (!user) {
        return
      }
      
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
          
          // Redirect non-creators to user dashboard
          if (data.user.role !== 'creator') {
            router.push('/user-dashboard')
            return
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      } finally {
        // profileLoading handled by userProfile state
      }
    }

    loadUserProfile()
  }, [user, router])

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      alert('Please sign in to create a campaign')
      return
    }

    const { title, description, goalInEth, durationInDays } = formData
    
    if (!title || !description || !goalInEth || !durationInDays) {
      alert('Please fill in all fields')
      return
    }

    const goal = parseFloat(goalInEth)
    const duration = parseFloat(durationInDays) // Allow decimal days for testing

    if (isNaN(goal) || goal <= 0) {
      alert('Please enter a valid goal amount')
      return
    }

    if (isNaN(duration) || duration <= 0 || duration > 365) {
      alert('Duration must be between 0-365 days (decimals allowed for testing)')
      return
    }

    try {
      setIsSubmitting(true)
      const idToken = await user.getIdToken()
      
      const response = await fetch('/api/blockchain/create-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idToken,
          title,
          description,
          goalInEth,
          durationInDays: duration
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Campaign created successfully!')
        router.push(`/campaign/${data.campaignAddress}`)
      } else {
        // Show specific error messages with helpful information
        let errorMessage = data.error
        if (data.error.includes('Insufficient funds')) {
          errorMessage = `❌ Insufficient Funds\n\nYour wallet needs test ETH to pay for gas fees.\n\n💡 How to get test ETH:\n1. Visit a Sepolia faucet (like faucet.sepolia.dev)\n2. Enter your wallet address: ${userProfile?.walletAddress || 'Loading...'}\n3. Request test ETH\n4. Wait a few minutes and try again`
        } else if (data.error.includes('network')) {
          errorMessage = `❌ Network Error\n\nUnable to connect to Sepolia network.\n\n💡 Try:\n- Checking your internet connection\n- Waiting a moment and trying again`
        }
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Campaign creation error:', error)
      alert('Failed to create campaign')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error.message}</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
            <p className="text-gray-300 mb-6">You need to sign in to create a campaign</p>
            <Link 
              href="/auth/signin"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Check if user has creator role
  if (userProfile && userProfile.role !== 'creator') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md mx-auto">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-white mb-4">Creator Access Required</h2>
            <p className="text-gray-300 mb-6">
              Only users with creator accounts can create campaigns. Contributors can browse and fund existing campaigns.
            </p>
            <div className="space-y-3">
              <Link 
                href="/user-dashboard"
                className="block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                Go to Dashboard
              </Link>
              <p className="text-sm text-gray-400">
                Want to become a creator? Sign out and create a new account with creator role.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link 
              href="/" 
              className="text-blue-400 hover:text-blue-300 transition-colors mb-4 inline-block"
            >
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-white mb-4">Create New Campaign</h1>
            <p className="text-gray-300">
              Launch your decentralized crowdfunding campaign with complete transparency and security.
            </p>
          </div>

          {/* Balance Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Your Wallet Balance:</span>
              <span className="text-2xl font-bold text-white">{balance} ETH</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              You&apos;ll need some ETH to deploy your campaign smart contract
            </p>
          </div>

          {/* Form */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
                  Campaign Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  placeholder="Enter your campaign title"
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  placeholder="Describe your campaign and what you're raising funds for"
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="goalInEth" className="block text-sm font-medium text-white mb-2">
                    Funding Goal (ETH)
                  </label>
                  <input
                    type="number"
                    id="goalInEth"
                    name="goalInEth"
                    value={formData.goalInEth}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                    placeholder="0.1"
                    step="0.001"
                    min="0.001"
                  />
                </div>

                <div>
                  <label htmlFor="durationInDays" className="block text-sm font-medium text-white mb-2">
                    Duration (Days - decimals allowed for testing)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    id="durationInDays"
                    name="durationInDays"
                    value={formData.durationInDays}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                    placeholder="0.0007 (1 minute) or 30 (30 days)"
                    min="0.001"
                    max="365"
                  />
                  <p className="text-xs text-gray-300 mt-1">
                    For testing: 0.0007 = 1 min, 0.007 = 10 min, 0.042 = 1 hour
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Campaign...' : 'Create Campaign'}
              </button>
            </form>
          </div>

          {/* How It Works */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">1. Set Your Goal</h3>
                <p className="text-gray-300 text-sm">
                  Define your funding target in ETH and campaign duration. The smart contract will enforce these rules immutably.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">2. Receive Contributions</h3>
                <p className="text-gray-300 text-sm">
                  Contributors send ETH directly to your campaign smart contract. All funds are held securely in escrow.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">3. Automatic Execution</h3>
                <p className="text-gray-300 text-sm">
                  If funded, withdraw your ETH. If not, contributors get automatic refunds. No intermediaries needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}