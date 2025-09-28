'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthState, useSignInWithGoogle } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import Link from 'next/link'

export default function SignUpPage() {
  const router = useRouter()
  const [user, loading, error] = useAuthState(auth)
  const [signInWithGoogle, , googleLoading, googleError] = useSignInWithGoogle(auth)
  const [selectedRole, setSelectedRole] = useState<'user' | 'creator' | null>(null)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [showRoleSelection, setShowRoleSelection] = useState(false)

  const checkUserExists = useCallback(async () => {
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
        if (data.user.role === 'creator') {
          router.push('/creator-dashboard')
        } else {
          router.push('/user-dashboard')
        }
      } else {
        // User doesn't exist, show role selection
        setShowRoleSelection(true)
      }
    } catch (error) {
      console.error('Error checking user profile:', error)
      setShowRoleSelection(true)
    }
  }, [user, router])

  // Redirect if already signed in
  useEffect(() => {
    if (user && !isSigningUp && !showRoleSelection) {
      checkUserExists()
    }
  }, [user, isSigningUp, showRoleSelection, checkUserExists])

  const handleGoogleSignUp = async () => {
    setIsSigningUp(true)
    try {
      const result = await signInWithGoogle()
      if (result) {
        // Check if user already exists
        const idToken = await result.user.getIdToken()
        const checkResponse = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })

        if (checkResponse.ok) {
          // User already exists, redirect to signin
          const data = await checkResponse.json()
          alert('Account already exists. Redirecting to dashboard...')
          if (data.user.role === 'creator') {
            router.push('/creator-dashboard')
          } else {
            router.push('/user-dashboard')
          }
        } else {
          // User doesn't exist, show role selection
          setShowRoleSelection(true)
        }
      }
    } catch (error) {
      console.error('Sign-up error:', error)
      alert('Sign-up failed. Please try again.')
    } finally {
      setIsSigningUp(false)
    }
  }

  const handleRoleSelection = async (role: 'user' | 'creator') => {
    if (!user) return

    setSelectedRole(role)
    setIsSigningUp(true)

    try {
      const idToken = await user.getIdToken()
      const response = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idToken,
          role: role
        })
      })

      if (response.ok) {
        if (role === 'creator') {
          router.push('/creator-dashboard')
        } else {
          router.push('/user-dashboard')
        }
      } else {
        const errorData = await response.json()
        alert(`Registration failed: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Role selection error:', error)
      alert('Registration failed. Please try again.')
    } finally {
      setIsSigningUp(false)
      setSelectedRole(null)
    }
  }

  if (loading || googleLoading || isSigningUp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">
            {isSigningUp ? 'Setting up your account...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (showRoleSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="max-w-2xl w-full mx-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Choose Your Role</h1>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                KickStart Crypto
              </h2>
              <p className="text-gray-300">
                Select how you want to use the platform
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => handleRoleSelection('user')}
                disabled={isSigningUp}
                className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-xl p-6 text-left transition-all duration-200 group"
              >
                <div className="text-4xl mb-4"></div>
                <h3 className="text-xl font-bold text-white mb-2">Backer</h3>
                <p className="text-gray-300 mb-4">
                  Support innovative projects and be part of the revolution
                </p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li> Browse and support campaigns</li>
                  <li> Get exclusive rewards</li>
                  <li> Connect with creators</li>
                  <li> Track your contributions</li>
                </ul>
                <div className="mt-4 text-blue-400 font-semibold group-hover:text-blue-300">
                  Join as Backer 
                </div>
              </button>

              <button
                onClick={() => handleRoleSelection('creator')}
                disabled={isSigningUp}
                className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-xl p-6 text-left transition-all duration-200 group"
              >
                <div className="text-4xl mb-4"></div>
                <h3 className="text-xl font-bold text-white mb-2">Creator</h3>
                <p className="text-gray-300 mb-4">
                  Launch your ideas and bring them to life with community support
                </p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li> Create fundraising campaigns</li>
                  <li> Manage your projects</li>
                  <li> Engage with backers</li>
                  <li> Access creator tools</li>
                </ul>
                <div className="mt-4 text-purple-400 font-semibold group-hover:text-purple-300">
                  Join as Creator 
                </div>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-gray-400 text-sm mb-4">
                You can always change your role later in settings
              </p>
              <Link
                href="/signin"
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
              >
                Already have an account? Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Join the Revolution!</h1>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              KickStart Crypto
            </h2>
            <p className="text-gray-300 mt-4">
              Create your account to start your journey
            </p>
          </div>

          <button
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Sign Up with Google</span>
          </button>

          {(error || googleError) && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">
                {error?.message || googleError?.message || 'An error occurred'}
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-gray-300 mb-4">Already have an account?</p>
            <Link
              href="/signin"
              className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-gray-400 text-sm">
               Secure authentication with Google   Decentralized technology   No fees to start
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
