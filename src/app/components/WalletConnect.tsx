'use client';

import { useWallet } from '../hooks/useWallet';

interface WalletConnectProps {
  className?: string;
}

export default function WalletConnect({ className = '' }: WalletConnectProps) {
  const { account, isConnected, connect, disconnect } = useWallet();

  if (isConnected && account) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <span className="text-sm text-gray-600">
          {account.substring(0, 6)}...{account.substring(account.length - 4)}
        </span>
        <button
          onClick={disconnect}
          className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className={`px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${className}`}
    >
      Connect Wallet
    </button>
  );
}