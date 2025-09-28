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
  const [isSigningIn, setIsSigningIn] = useState(false)

  // Redirect if already signed in
  useEffect(() => {
    if (user && !isSigningIn) {
      redirectToCorrectDashboard()
    }
  }, [user, isSigningIn])

  const redirectToCorrectDashboard = async () => {
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
        router.push('/signup')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      router.push('/signup')
    }
  }

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    try {
      const result = await signInWithGoogle()
      if (result) {
        const idToken = await result.user.getIdToken()
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
          router.push('/signup')
        }
      }
    } catch (error) {
      console.error('Sign-in error:', error)
      alert('Sign-in failed. Please try again.')
    } finally {
      setIsSigningIn(false)
    }
  }

  if (loading || googleLoading || isSigningIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Signing you in...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back!</h1>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              KickStart Crypto
            </h2>
            <p className="text-gray-300 mt-4">
              Sign in to access your account
            </p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {(error || googleError) && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">
                {error?.message || googleError?.message || 'An error occurred'}
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-gray-300 mb-4">Don&#39;t have an account?</p>
            <Link
              href="/signup"
              className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
            >
              Create Account
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
