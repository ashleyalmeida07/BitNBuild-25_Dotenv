'use client'

import { useAuthState, useSignOut } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function Header() {
  const [user, loading] = useAuthState(auth)
  const [signOut] = useSignOut(auth)
  const [balance, setBalance] = useState('0')

  // Load wallet balance when user signs in
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

  const handleSignOut = () => {
    signOut()
    setBalance('0')
  }

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            href="/" 
            className="text-2xl font-bold text-white hover:text-purple-300 transition-colors"
          >
            KickStart Crypto
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className="text-white hover:text-purple-300 transition-colors"
            >
              Campaigns
            </Link>
            {user && (
              <Link 
                href="/create" 
                className="text-white hover:text-purple-300 transition-colors"
              >
                Create Campaign
              </Link>
            )}
          </nav>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="text-gray-300">Loading...</div>
            ) : user ? (
              <>
                {/* User Balance */}
                <div className="text-white text-sm">
                  Balance: {balance} ETH
                </div>
                
                {/* User Info */}
                <div className="flex items-center space-x-3">
                  <Image 
                    src={user.photoURL || '/api/placeholder/32/32'} 
                    alt={user.displayName || 'User'}
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-white/30"
                  />
                  <span className="text-white hidden sm:inline">
                    {user.displayName}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="space-x-2">
                <Link
                  href="/signin"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors inline-block"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}