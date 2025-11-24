import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("NFT Contract - SIP-009 Compliance", () => {
  beforeEach(() => {
    simnet.setEpoch("3.2");
  });

  describe("Initialization", () => {
    it("should initialize with zero tokens minted", () => {
      const { result } = simnet.callReadOnlyFn(
        "nft",
        "get-last-token-id",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.uint(0));
    });

    it("should initialize with empty base URI", () => {
      const { result } = simnet.callReadOnlyFn(
        "nft",
        "get-base-uri",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.stringUtf8(""));
    });

    it("should have correct total supply initially", () => {
      const { result } = simnet.callReadOnlyFn(
        "nft",
        "get-total-supply",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.uint(0));
    });
  });

  describe("Minting NFTs", () => {
    it("should successfully mint a new NFT", () => {
      const tokenUri = "ipfs://QmTest123";
      const { result } = simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringUtf8(tokenUri)],
        deployer
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it("should increment token ID after each mint", () => {
      const tokenUri1 = "ipfs://QmTest123";
      const tokenUri2 = "ipfs://QmTest456";

      simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringUtf8(tokenUri1)],
        deployer
      );

      const { result } = simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringUtf8(tokenUri2)],
        deployer
      );

      expect(result).toBeOk(Cl.uint(2));
    });

    it("should reject empty token URI", () => {
      const { result } = simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringUtf8("")],
        deployer
      );
      expect(result).toBeErr(Cl.uint(105)); // ERR_INVALID_URI
    });

    it("should mint to different recipients", () => {
      const tokenUri1 = "ipfs://QmTest123";
      const tokenUri2 = "ipfs://QmTest456";

      simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringUtf8(tokenUri1)],
        deployer
      );

      const { result } = simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet2), Cl.stringUtf8(tokenUri2)],
        deployer
      );

      expect(result).toBeOk(Cl.uint(2));
    });
  });

  describe("SIP-009 Functions", () => {
    beforeEach(() => {
      // Mint a test NFT
      simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringUtf8("ipfs://QmTest123")],
        deployer
      );
    });

    it("should return correct last token ID", () => {
      const { result } = simnet.callReadOnlyFn(
        "nft",
        "get-last-token-id",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it("should return token URI for existing token", () => {
      const { result } = simnet.callReadOnlyFn(
        "nft",
        "get-token-uri",
        [Cl.uint(1)],
        deployer
      );
      expect(result).toBeOk(Cl.some(Cl.stringUtf8("ipfs://QmTest123")));
    });

    it("should return error for non-existent token URI", () => {
      const { result } = simnet.callReadOnlyFn(
        "nft",
        "get-token-uri",
        [Cl.uint(999)],
        deployer
      );
      expect(result).toBeErr(Cl.uint(102)); // ERR_TOKEN_NOT_FOUND
    });

    it("should return correct owner for token", () => {
      const { result } = simnet.callReadOnlyFn(
        "nft",
        "get-owner",
        [Cl.uint(1)],
        deployer
      );
      expect(result).toBeOk(Cl.some(Cl.principal(wallet1)));
    });

    it("should return none for non-existent token owner", () => {
      const { result } = simnet.callReadOnlyFn(
        "nft",
        "get-owner",
        [Cl.uint(999)],
        deployer
      );
      expect(result).toBeOk(Cl.none());
    });
  });

  describe("Token Transfer", () => {
    beforeEach(() => {
      // Mint a test NFT
      simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringUtf8("ipfs://QmTest123")],
        deployer
      );
    });

    it("should allow owner to transfer token", () => {
      const { result } = simnet.callPublicFn(
        "nft",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet1
      );
      expect(result).toBeOk(Cl.bool(true));

      // Verify new owner
      const ownerResult = simnet.callReadOnlyFn(
        "nft",
        "get-owner",
        [Cl.uint(1)],
        deployer
      );
      expect(ownerResult).toBeOk(Cl.some(Cl.principal(wallet2)));
    });

    it("should reject transfer from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "nft",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet2), Cl.principal(wallet1)],
        wallet2
      );
      expect(result).toBeErr(Cl.uint(101)); // ERR_NOT_TOKEN_OWNER
    });

    it("should reject transfer of non-existent token", () => {
      const { result } = simnet.callPublicFn(
        "nft",
        "transfer",
        [Cl.uint(999), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(102)); // ERR_TOKEN_NOT_FOUND
    });
  });

  describe("Token Metadata", () => {
    it("should store complete metadata on mint", () => {
      const tokenUri = "ipfs://QmTest123";
      simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringUtf8(tokenUri)],
        deployer
      );

      const { result } = simnet.callReadOnlyFn(
        "nft",
        "get-token-metadata",
        [Cl.uint(1)],
        deployer
      );

      expect(result).toBeSome();
    });

    it("should return none for non-existent token metadata", () => {
      const { result } = simnet.callReadOnlyFn(
        "nft",
        "get-token-metadata",
        [Cl.uint(999)],
        deployer
      );
      expect(result).toBeNone();
    });

    it("should check token existence correctly", () => {
      simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringUtf8("ipfs://QmTest123")],
        deployer
      );

      const { result: exists } = simnet.callReadOnlyFn(
        "nft",
        "token-exists",
        [Cl.uint(1)],
        deployer
      );
      expect(exists).toBeBool(true);

      const { result: notExists } = simnet.callReadOnlyFn(
        "nft",
        "token-exists",
        [Cl.uint(999)],
        deployer
      );
      expect(notExists).toBeBool(false);
    });
  });

  describe("Admin Functions", () => {
    it("should allow contract owner to set base URI", () => {
      const newBaseUri = "https://nft.artisan.com/metadata/";
      const { result } = simnet.callPublicFn(
        "nft",
        "set-base-uri",
        [Cl.stringUtf8(newBaseUri)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      // Verify base URI was updated
      const uriResult = simnet.callReadOnlyFn(
        "nft",
        "get-base-uri",
        [],
        deployer
      );
      expect(uriResult).toBeOk(Cl.stringUtf8(newBaseUri));
    });

    it("should reject base URI update from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "nft",
        "set-base-uri",
        [Cl.stringUtf8("https://malicious.com/")],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(100)); // ERR_UNAUTHORIZED
    });
  });

  describe("Total Supply Tracking", () => {
    it("should track total supply correctly", () => {
      // Initially 0
      let supply = simnet.callReadOnlyFn(
        "nft",
        "get-total-supply",
        [],
        deployer
      );
      expect(supply.result).toBeOk(Cl.uint(0));

      // Mint 3 tokens
      simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringUtf8("ipfs://QmTest1")],
        deployer
      );
      simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringUtf8("ipfs://QmTest2")],
        deployer
      );
      simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet2), Cl.stringUtf8("ipfs://QmTest3")],
        deployer
      );

      // Should be 3
      supply = simnet.callReadOnlyFn("nft", "get-total-supply", [], deployer);
      expect(supply.result).toBeOk(Cl.uint(3));
    });
  });
});
