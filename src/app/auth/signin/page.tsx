'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthState, useSignInWithGoogle } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import Link from 'next/link'

export default function SignInPage() {
  const router = useRouter()
  const [user, loading, error] = useAuthState(auth)
  const [signInWithGoogle, , googleLoading, googleError] = useSignInWithGoogle(auth)
  const [selectedRole, setSelectedRole] = useState<'user' | 'creator' | null>(null)

  // Redirect if already signed in
  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleRoleSelect = (role: 'user' | 'creator') => {
    setSelectedRole(role)
  }

  const handleGoogleSignIn = async () => {
    if (!selectedRole) {
      alert('Please select a role first')
      return
    }

    try {
      const result = await signInWithGoogle()
      if (result) {
        // Get ID token and register with our backend
        const idToken = await result.user.getIdToken()
        
        const response = await fetch('/api/auth/firebase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            idToken,
            role: selectedRole 
          })
        })

        const data = await response.json()
        
        if (data.success) {
          // Redirect based on role
          if (selectedRole === 'creator') {
            router.push('/creator-dashboard')
          } else {
            router.push('/user-dashboard')
          }
        } else {
          console.error('Backend registration failed:', data.error)
        }
      }
    } catch (error) {
      console.error('Sign-in error:', error)
    }
  }

  if (loading || googleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Redirecting...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to</h1>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              KickStart Crypto
            </h2>
            <p className="text-gray-300 mt-4">
              Sign in to create campaigns and support innovative projects
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-4 text-center">Choose your role:</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRoleSelect('user')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedRole === 'user'
                    ? 'border-purple-400 bg-purple-500/20 text-white'
                    : 'border-white/30 bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">👤</div>
                  <div className="font-semibold">User</div>
                  <div className="text-xs mt-1">Support campaigns</div>
                </div>
              </button>
              <button
                onClick={() => handleRoleSelect('creator')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedRole === 'creator'
                    ? 'border-pink-400 bg-pink-500/20 text-white'
                    : 'border-white/30 bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🚀</div>
                  <div className="font-semibold">Creator</div>
                  <div className="text-xs mt-1">Launch campaigns</div>
                </div>
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || !selectedRole}
            className={`w-full flex items-center justify-center gap-3 font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedRole 
                ? 'bg-white hover:bg-gray-50 text-gray-900' 
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {googleLoading ? 'Signing In...' : 'Continue with Google'}
          </button>

          {/* Error Display */}
          {(error || googleError) && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm text-center">
                {error?.message || googleError?.message || 'An error occurred during sign-in'}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <Link 
              href="/"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Home
            </Link>
          </div>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-gray-300 text-sm text-center mb-4">What you get:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300 text-sm">Secure server-managed wallet</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                <span className="text-gray-300 text-sm">No MetaMask required</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300 text-sm">Create & fund campaigns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}