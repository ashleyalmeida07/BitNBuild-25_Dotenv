'use client';

import { useState, useEffect } from 'react';
import { SmartWalletUser, smartWalletService } from '../utils/smartWallet';

export function useSmartWallet() {
  const [user, setUser] = useState<SmartWalletUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const existingUser = await smartWalletService.checkExistingSession();
      if (existingUser) {
        setUser(existingUser);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    }
  };

  const handleLogin = (loggedInUser: SmartWalletUser) => {
    setUser(loggedInUser);
    setIsConnected(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsConnected(false);
  };

  return {
    user,
    isConnected,
    handleLogin,
    handleLogout
  };
}