import {
  callReadOnlyFunction,
  cvToValue,
  principalCV,
  uintCV,
  stringAsciiCV,
  ClarityValue,
} from '@stacks/transactions';
import { StacksMainnet, StacksTestnet } from '@stacks/network';

// Configuration
const NETWORK = process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
  ? new StacksMainnet()
  : new StacksTestnet();

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

// Contract names
const CONTRACTS = {
  REGISTRY: 'registry',
  NFT: 'nft',
  CERTIFICATION: 'certification',
  DISPUTES: 'disputes',
} as const;

// Helper function for read-only calls
async function callReadOnly<T>(
  contractName: string,
  functionName: string,
  args: ClarityValue[] = []
): Promise<T> {
  const result = await callReadOnlyFunction({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName,
    functionName,
    functionArgs: args,
    senderAddress: CONTRACT_ADDRESS,
  });

  return cvToValue(result) as T;
}

// Registry Contract Functions
export const registryContract = {
  async getProduct(productId: number) {
    return callReadOnly(CONTRACTS.REGISTRY, 'get-product', [uintCV(productId)]);
  },

  async getArtisan(artisanId: number) {
    return callReadOnly(CONTRACTS.REGISTRY, 'get-artisan', [uintCV(artisanId)]);
  },

  async getArtisanByPrincipal(address: string) {
    return callReadOnly(CONTRACTS.REGISTRY, 'get-artisan-by-principal', [principalCV(address)]);
  },

  async isArtisan(address: string) {
    return callReadOnly<boolean>(CONTRACTS.REGISTRY, 'is-artisan', [principalCV(address)]);
  },

  async getProductCount() {
    return callReadOnly<number>(CONTRACTS.REGISTRY, 'get-product-count', []);
  },

  async getProductStatus(productId: number) {
    return callReadOnly(CONTRACTS.REGISTRY, 'get-product-status', [uintCV(productId)]);
  },
};

// NFT Contract Functions
export const nftContract = {
  async getLastTokenId() {
    return callReadOnly<number>(CONTRACTS.NFT, 'get-last-token-id', []);
  },

  async getOwner(tokenId: number) {
    return callReadOnly(CONTRACTS.NFT, 'get-owner', [uintCV(tokenId)]);
  },

  async getTokenUri(tokenId: number) {
    return callReadOnly(CONTRACTS.NFT, 'get-token-uri', [uintCV(tokenId)]);
  },

  async getTokenMetadata(tokenId: number) {
    return callReadOnly(CONTRACTS.NFT, 'get-token-metadata', [uintCV(tokenId)]);
  },

  async getBalance(owner: string) {
    return callReadOnly<number>(CONTRACTS.NFT, 'get-balance', [principalCV(owner)]);
  },
};

// Certification Contract Functions
export const certificationContract = {
  async getCertification(certificationId: number) {
    return callReadOnly(CONTRACTS.CERTIFICATION, 'get-certification', [uintCV(certificationId)]);
  },

  async getCertifier(certifierId: number) {
    return callReadOnly(CONTRACTS.CERTIFICATION, 'get-certifier', [uintCV(certifierId)]);
  },

  async isActiveCertifier(address: string) {
    return callReadOnly<boolean>(CONTRACTS.CERTIFICATION, 'is-active-certifier', [principalCV(address)]);
  },

  async isCertificationValid(certificationId: number) {
    return callReadOnly<boolean>(CONTRACTS.CERTIFICATION, 'is-certification-valid', [uintCV(certificationId)]);
  },

  async getProductHighestTier(productId: number) {
    return callReadOnly<number>(CONTRACTS.CERTIFICATION, 'get-product-highest-tier', [uintCV(productId)]);
  },

  async getProductCertificationIds(productId: number) {
    return callReadOnly<number[]>(CONTRACTS.CERTIFICATION, 'get-product-certification-ids', [uintCV(productId)]);
  },
};

// Disputes Contract Functions
export const disputesContract = {
  async getDispute(disputeId: number) {
    return callReadOnly(CONTRACTS.DISPUTES, 'get-dispute', [uintCV(disputeId)]);
  },

  async hasActiveDispute(productId: number) {
    return callReadOnly<boolean>(CONTRACTS.DISPUTES, 'has-active-dispute', [uintCV(productId)]);
  },

  async getProductActiveDispute(productId: number) {
    return callReadOnly(CONTRACTS.DISPUTES, 'get-product-active-dispute', [uintCV(productId)]);
  },

  async isBanned(address: string) {
    return callReadOnly<boolean>(CONTRACTS.DISPUTES, 'is-banned', [principalCV(address)]);
  },

  async isSuspended(address: string) {
    return callReadOnly<boolean>(CONTRACTS.DISPUTES, 'is-suspended', [principalCV(address)]);
  },
};

// Utility functions
export function tierNumberToString(tier: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'none' {
  switch (tier) {
    case 1: return 'bronze';
    case 2: return 'silver';
    case 3: return 'gold';
    case 4: return 'platinum';
    default: return 'none';
  }
}

export function statusNumberToString(status: number): 'pending' | 'verified' | 'disputed' | 'resolved' | 'rejected' {
  switch (status) {
    case 0: return 'pending';
    case 1: return 'verified';
    case 2: return 'disputed';
    case 3: return 'resolved';
    case 4: return 'rejected';
    default: return 'pending';
  }
}
