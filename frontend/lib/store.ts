import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  setAddress: (address: string | null) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      isConnected: false,
      isLoading: false,

      connect: async () => {
        set({ isLoading: true });
        try {
          // Dynamic import to avoid SSR issues
          const { showConnect } = await import('@stacks/connect');
          const { StacksMainnet } = await import('@stacks/network');

          showConnect({
            appDetails: {
              name: 'Artisan Registry',
              icon: '/logo.png',
            },
            onFinish: ({ userSession }) => {
              const userData = userSession.loadUserData();
              const address = userData.profile.stxAddress.mainnet;
              set({ address, isConnected: true, isLoading: false });
            },
            onCancel: () => {
              set({ isLoading: false });
            },
          });
        } catch (error) {
          console.error('Failed to connect wallet:', error);
          set({ isLoading: false });
        }
      },

      disconnect: () => {
        set({ address: null, isConnected: false });
      },

      setAddress: (address) => {
        set({ address, isConnected: !!address });
      },
    }),
    {
      name: 'wallet-storage',
      partialize: (state) => ({ address: state.address, isConnected: state.isConnected }),
    }
  )
);

interface AppState {
  products: Product[];
  isLoadingProducts: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Product) => void;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  metadataUri: string;
  artisanId: number;
  artisanAddress: string;
  status: 'pending' | 'verified' | 'disputed' | 'rejected';
  nftId?: number;
  certificationCount: number;
  highestTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  createdAt: number;
}

export const useAppStore = create<AppState>()((set) => ({
  products: [],
  isLoadingProducts: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoadingProducts: true, error: null });
    try {
      // TODO: Implement actual API call
      // const response = await fetch('/api/products');
      // const data = await response.json();
      // set({ products: data, isLoadingProducts: false });
      set({ isLoadingProducts: false });
    } catch (error) {
      set({ error: 'Failed to load products', isLoadingProducts: false });
    }
  },

  addProduct: (product) => {
    set((state) => ({ products: [...state.products, product] }));
  },
}));
