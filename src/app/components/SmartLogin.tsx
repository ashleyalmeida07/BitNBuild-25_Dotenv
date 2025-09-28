'use client';

import { useState, useEffect, useCallback } from 'react';
import { SmartWalletUser, smartWalletService } from '../utils/smartWallet';

interface SmartLoginProps {
  onLogin: (user: SmartWalletUser) => void;
  onLogout: () => void;
}

export default function SmartLogin({ onLogin, onLogout }: SmartLoginProps) {
  const [user, setUser] = useState<SmartWalletUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'social' | 'email' | null>(null);
  const [email, setEmail] = useState('');
  const [balance, setBalance] = useState('0');

  const checkExistingSession = useCallback(async () => {
    try {
      const existingUser = await smartWalletService.checkExistingSession();
      if (existingUser) {
        setUser(existingUser);
        onLogin(existingUser);
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onLogin]);

  const loadUserBalance = useCallback(async () => {
    if (user) {
      try {
        const userBalance = await smartWalletService.getUserBalance(user);
        setBalance(userBalance);
      } catch (error) {
        console.error('Failed to load balance:', error);
      }
    }
  }, [user]);

  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  useEffect(() => {
    loadUserBalance();
  }, [loadUserBalance]);

  const handleSocialLogin = async (provider: 'google' | 'twitter' | 'github') => {
    try {
      setIsLoading(true);
      // In a real app, this would redirect to OAuth
      const mockIdentifier = `user@${provider}.com`;
      const loggedInUser = await smartWalletService.loginWithSocial(provider, mockIdentifier);
      setUser(loggedInUser);
      onLogin(loggedInUser);
    } catch (error) {
      console.error('Social login failed:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim()) {
      alert('Please enter your email');
      return;
    }

    try {
      setIsLoading(true);
      const loggedInUser = await smartWalletService.loginWithEmail(email);
      setUser(loggedInUser);
      onLogin(loggedInUser);
      setLoginMethod(null);
      setEmail('');
    } catch (error) {
      console.error('Email login failed:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await smartWalletService.logout();
      setUser(null);
      setBalance('0');
      onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleFundWallet = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      await smartWalletService.fundUserWallet(user, '0.01'); // Fund with 0.01 ETH
      alert('Wallet funded! (This is a demo - in production, users would deposit funds)');
      await loadUserBalance();
    } catch (error) {
      console.error('Failed to fund wallet:', error);
      alert('Funding failed. This is a demo feature.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <div className="text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user.email ? user.email[0].toUpperCase() : '👤'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {user.email || `${user.socialProvider} User`}
              </p>
              <p className="text-xs text-gray-500 font-mono">
                {user.address.substring(0, 6)}...{user.address.substring(user.address.length - 4)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-sm">
          <p className="text-gray-600">Balance:</p>
          <p className="font-mono text-blue-600">{parseFloat(balance).toFixed(4)} ETH</p>
        </div>

        <div className="flex items-center space-x-2">
          {parseFloat(balance) < 0.001 && (
            <button
              onClick={handleFundWallet}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              disabled={isLoading}
            >
              Fund Wallet
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {!loginMethod && (
        <>
          <button
            onClick={() => setLoginMethod('social')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
            </svg>
            <span>Quick Login</span>
          </button>
          <button
            onClick={() => setLoginMethod('email')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Email
          </button>
        </>
      )}

      {loginMethod === 'social' && (
        <div className="flex flex-col space-y-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">Choose login method:</p>
          <button
            onClick={() => handleSocialLogin('google')}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            disabled={isLoading}
          >
            <span>🔍</span>
            <span>Continue with Google</span>
          </button>
          <button
            onClick={() => handleSocialLogin('github')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
            disabled={isLoading}
          >
            <span>📦</span>
            <span>Continue with GitHub</span>
          </button>
          <button
            onClick={() => setLoginMethod(null)}
            className="px-4 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {loginMethod === 'email' && (
        <div className="flex flex-col space-y-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">Enter your email:</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleEmailLogin()}
          />
          <div className="flex space-x-2">
            <button
              onClick={handleEmailLogin}
              className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
              disabled={isLoading}
            >
              Login
            </button>
            <button
              onClick={() => setLoginMethod(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}