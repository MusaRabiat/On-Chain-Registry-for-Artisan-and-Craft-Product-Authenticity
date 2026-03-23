import {
  callReadOnlyFunction,
  cvToValue,
  principalCV,
  uintCV,
  ClarityValue,
} from '@stacks/transactions';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { logger } from '../config/logger';

// Network configuration
const network = process.env.STACKS_NETWORK === 'mainnet'
  ? new StacksMainnet()
  : new StacksTestnet();

const contractAddress = process.env.CONTRACT_ADDRESS || '';

// Contract names
const REGISTRY_CONTRACT = 'registry';
const NFT_CONTRACT = 'nft';
const CERTIFICATION_CONTRACT = 'certification';
const DISPUTES_CONTRACT = 'disputes';

// Generic read-only call helper
async function callReadOnly<T>(
  contractName: string,
  functionName: string,
  args: ClarityValue[] = []
): Promise<T | null> {
  try {
    const result = await callReadOnlyFunction({
      network,
      contractAddress,
      contractName,
      functionName,
      functionArgs: args,
      senderAddress: contractAddress,
    });

    return cvToValue(result) as T;
  } catch (error) {
    logger.error('Contract call failed', {
      contractName,
      functionName,
      error,
    });
    return null;
  }
}

class StacksService {
  // Registry Contract
  async getProduct(productId: number) {
    return callReadOnly(REGISTRY_CONTRACT, 'get-product', [uintCV(productId)]);
  }

  async getArtisan(artisanId: number) {
    return callReadOnly(REGISTRY_CONTRACT, 'get-artisan', [uintCV(artisanId)]);
  }

  async getArtisanByPrincipal(address: string) {
    return callReadOnly(REGISTRY_CONTRACT, 'get-artisan-by-principal', [principalCV(address)]);
  }

  async isArtisan(address: string): Promise<boolean> {
    const result = await callReadOnly<boolean>(REGISTRY_CONTRACT, 'is-artisan', [principalCV(address)]);
    return result ?? false;
  }

  async getProductCount(): Promise<number> {
    const result = await callReadOnly<number>(REGISTRY_CONTRACT, 'get-product-count', []);
    return result ?? 0;
  }

  // NFT Contract
  async getTokenOwner(tokenId: number) {
    return callReadOnly(NFT_CONTRACT, 'get-owner', [uintCV(tokenId)]);
  }

  async getTokenMetadata(tokenId: number) {
    return callReadOnly(NFT_CONTRACT, 'get-token-metadata', [uintCV(tokenId)]);
  }

  async getTokenUri(tokenId: number) {
    return callReadOnly(NFT_CONTRACT, 'get-token-uri', [uintCV(tokenId)]);
  }

  // Certification Contract
  async getCertification(certificationId: number) {
    return callReadOnly(CERTIFICATION_CONTRACT, 'get-certification', [uintCV(certificationId)]);
  }

  async getCertifier(certifierId: number) {
    return callReadOnly(CERTIFICATION_CONTRACT, 'get-certifier', [uintCV(certifierId)]);
  }

  async isCertificationValid(certificationId: number): Promise<boolean> {
    const result = await callReadOnly<boolean>(CERTIFICATION_CONTRACT, 'is-certification-valid', [uintCV(certificationId)]);
    return result ?? false;
  }

  async getProductHighestTier(productId: number): Promise<number> {
    const result = await callReadOnly<number>(CERTIFICATION_CONTRACT, 'get-product-highest-tier', [uintCV(productId)]);
    return result ?? 0;
  }

  async getProductCertificationIds(productId: number): Promise<number[]> {
    const result = await callReadOnly<number[]>(CERTIFICATION_CONTRACT, 'get-product-certification-ids', [uintCV(productId)]);
    return result ?? [];
  }

  // Disputes Contract
  async getDispute(disputeId: number) {
    return callReadOnly(DISPUTES_CONTRACT, 'get-dispute', [uintCV(disputeId)]);
  }

  async hasActiveDispute(productId: number): Promise<boolean> {
    const result = await callReadOnly<boolean>(DISPUTES_CONTRACT, 'has-active-dispute', [uintCV(productId)]);
    return result ?? false;
  }

  async isBanned(address: string): Promise<boolean> {
    const result = await callReadOnly<boolean>(DISPUTES_CONTRACT, 'is-banned', [principalCV(address)]);
    return result ?? false;
  }

  async isSuspended(address: string): Promise<boolean> {
    const result = await callReadOnly<boolean>(DISPUTES_CONTRACT, 'is-suspended', [principalCV(address)]);
    return result ?? false;
  }

  // Utility functions
  tierNumberToString(tier: number): string {
    const tiers: Record<number, string> = {
      1: 'bronze',
      2: 'silver',
      3: 'gold',
      4: 'platinum',
    };
    return tiers[tier] || 'unknown';
  }

  statusNumberToString(status: number): string {
    const statuses: Record<number, string> = {
      0: 'pending',
      1: 'verified',
      2: 'disputed',
      3: 'resolved',
      4: 'rejected',
    };
    return statuses[status] || 'unknown';
  }
}

export const stacksService = new StacksService();
