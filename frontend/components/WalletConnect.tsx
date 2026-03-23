'use client';

import { useWalletStore } from '@/lib/store';

export function WalletConnect() {
  const { address, isConnected, connect, disconnect } = useWalletStore();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-3">
        <span className="text-sm text-gray-600">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="btn-secondary text-sm py-1 px-3"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button onClick={handleConnect} className="btn-primary">
      Connect Wallet
    </button>
  );
}
