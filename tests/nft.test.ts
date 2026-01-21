import { describe, it, expect, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

// Test accounts from simnet
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("NFT Contract Tests", () => {
  describe("Minting", () => {
    it("should allow contract owner to mint a new NFT", () => {
      const result = simnet.callPublicFn(
        "nft",
        "mint",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Handwoven Basket"),
          Cl.stringAscii("Basketry"),
          Cl.stringAscii("ipfs://QmExample123"),
          Cl.uint(1),
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should increment token ID for each mint", () => {
      // First mint
      simnet.callPublicFn(
        "nft",
        "mint",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Product 1"),
          Cl.stringAscii("Category A"),
          Cl.stringAscii("ipfs://QmTest1"),
          Cl.uint(1),
        ],
        deployer
      );

      // Second mint
      const result = simnet.callPublicFn(
        "nft",
        "mint",
        [
          Cl.principal(wallet2),
          Cl.stringAscii("Product 2"),
          Cl.stringAscii("Category B"),
          Cl.stringAscii("ipfs://QmTest2"),
          Cl.uint(2),
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.uint(2));
    });

    it("should reject mint from non-owner", () => {
      const result = simnet.callPublicFn(
        "nft",
        "mint",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Test Product"),
          Cl.stringAscii("Test Category"),
          Cl.stringAscii("ipfs://QmTest"),
          Cl.uint(1),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(100)); // ERR-NOT-AUTHORIZED
    });
  });

  describe("SIP-009 Read Functions", () => {
    beforeEach(() => {
      // Mint a test token
      simnet.callPublicFn(
        "nft",
        "mint",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Test Craft"),
          Cl.stringAscii("Crafts"),
          Cl.stringAscii("ipfs://QmTestUri"),
          Cl.uint(100),
        ],
        deployer
      );
    });

    it("should return correct last token ID", () => {
      const result = simnet.callReadOnlyFn("nft", "get-last-token-id", [], deployer);
      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should return correct token owner", () => {
      const result = simnet.callReadOnlyFn("nft", "get-owner", [Cl.uint(1)], deployer);
      expect(result.result).toBeOk(Cl.some(Cl.principal(wallet1)));
    });

    it("should return correct token URI", () => {
      const result = simnet.callReadOnlyFn("nft", "get-token-uri", [Cl.uint(1)], deployer);
      expect(result.result).toBeOk(Cl.some(Cl.stringAscii("ipfs://QmTestUri")));
    });

    it("should return none for non-existent token", () => {
      const result = simnet.callReadOnlyFn("nft", "get-owner", [Cl.uint(999)], deployer);
      expect(result.result).toBeOk(Cl.none());
    });
  });

  describe("Token Metadata", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "nft",
        "mint",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Ceramic Vase"),
          Cl.stringAscii("Ceramics"),
          Cl.stringAscii("ipfs://QmCeramic"),
          Cl.uint(42),
        ],
        deployer
      );
    });

    it("should return correct token metadata", () => {
      const result = simnet.callReadOnlyFn(
        "nft",
        "get-token-metadata",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should track token balance correctly", () => {
      const result = simnet.callReadOnlyFn(
        "nft",
        "get-balance",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.uint(1));
    });

    it("should return true for existing token", () => {
      const result = simnet.callReadOnlyFn("nft", "token-exists", [Cl.uint(1)], deployer);
      expect(result.result).toStrictEqual(Cl.bool(true));
    });

    it("should return false for non-existing token", () => {
      const result = simnet.callReadOnlyFn("nft", "token-exists", [Cl.uint(999)], deployer);
      expect(result.result).toStrictEqual(Cl.bool(false));
    });
  });

  describe("Transfer", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "nft",
        "mint",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Transferable Art"),
          Cl.stringAscii("Art"),
          Cl.stringAscii("ipfs://QmArt"),
          Cl.uint(1),
        ],
        deployer
      );
    });

    it("should allow owner to transfer token", () => {
      const result = simnet.callPublicFn(
        "nft",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet1
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Verify new owner
      const ownerResult = simnet.callReadOnlyFn("nft", "get-owner", [Cl.uint(1)], deployer);
      expect(ownerResult.result).toBeOk(Cl.some(Cl.principal(wallet2)));
    });

    it("should update balances after transfer", () => {
      simnet.callPublicFn(
        "nft",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet1
      );

      const wallet1Balance = simnet.callReadOnlyFn(
        "nft",
        "get-balance",
        [Cl.principal(wallet1)],
        deployer
      );
      const wallet2Balance = simnet.callReadOnlyFn(
        "nft",
        "get-balance",
        [Cl.principal(wallet2)],
        deployer
      );

      expect(wallet1Balance.result).toStrictEqual(Cl.uint(0));
      expect(wallet2Balance.result).toStrictEqual(Cl.uint(1));
    });

    it("should reject transfer from non-owner", () => {
      const result = simnet.callPublicFn(
        "nft",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet2), Cl.principal(wallet3)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(103)); // ERR-NOT-TOKEN-OWNER
    });

    it("should reject transfer to same owner", () => {
      const result = simnet.callPublicFn(
        "nft",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet1)],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(107)); // ERR-SAME-OWNER
    });
  });

  describe("Approvals", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "nft",
        "mint",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Approval Test"),
          Cl.stringAscii("Test"),
          Cl.stringAscii("ipfs://QmApproval"),
          Cl.uint(1),
        ],
        deployer
      );
    });

    it("should allow owner to approve operator", () => {
      const result = simnet.callPublicFn(
        "nft",
        "approve",
        [Cl.principal(wallet2), Cl.uint(1)],
        wallet1
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow approved operator to transfer", () => {
      // Approve wallet2
      simnet.callPublicFn("nft", "approve", [Cl.principal(wallet2), Cl.uint(1)], wallet1);

      // Transfer by approved operator
      const result = simnet.callPublicFn(
        "nft",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet3)],
        wallet2
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow setting approval for all", () => {
      const result = simnet.callPublicFn(
        "nft",
        "set-approval-for-all",
        [Cl.principal(wallet2), Cl.bool(true)],
        wallet1
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject approval from non-owner", () => {
      const result = simnet.callPublicFn(
        "nft",
        "approve",
        [Cl.principal(wallet3), Cl.uint(1)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(103)); // ERR-NOT-TOKEN-OWNER
    });
  });

  describe("Marketplace", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "nft",
        "mint",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("For Sale Item"),
          Cl.stringAscii("Sale"),
          Cl.stringAscii("ipfs://QmSale"),
          Cl.uint(1),
        ],
        deployer
      );
    });

    it("should allow owner to list token for sale", () => {
      const result = simnet.callPublicFn(
        "nft",
        "list-for-sale",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet1
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should return listing details", () => {
      simnet.callPublicFn("nft", "list-for-sale", [Cl.uint(1), Cl.uint(500000)], wallet1);

      const result = simnet.callReadOnlyFn("nft", "get-listing", [Cl.uint(1)], deployer);

      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should allow owner to unlist token", () => {
      simnet.callPublicFn("nft", "list-for-sale", [Cl.uint(1), Cl.uint(1000000)], wallet1);

      const result = simnet.callPublicFn("nft", "unlist", [Cl.uint(1)], wallet1);

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject listing from non-owner", () => {
      const result = simnet.callPublicFn(
        "nft",
        "list-for-sale",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(103)); // ERR-NOT-TOKEN-OWNER
    });

    it("should reject listing with zero price", () => {
      const result = simnet.callPublicFn(
        "nft",
        "list-for-sale",
        [Cl.uint(1), Cl.uint(0)],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(106)); // ERR-WRONG-PRICE
    });

    it("should allow buyer to purchase listed token", () => {
      // List the token
      simnet.callPublicFn("nft", "list-for-sale", [Cl.uint(1), Cl.uint(100)], wallet1);

      // Buy the token
      const result = simnet.callPublicFn("nft", "buy", [Cl.uint(1)], wallet2);

      expect(result.result).toBeOk(Cl.bool(true));

      // Verify ownership changed
      const ownerResult = simnet.callReadOnlyFn("nft", "get-owner", [Cl.uint(1)], deployer);
      expect(ownerResult.result).toBeOk(Cl.some(Cl.principal(wallet2)));
    });
  });

  describe("Burn", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "nft",
        "mint",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Burnable Token"),
          Cl.stringAscii("Burn"),
          Cl.stringAscii("ipfs://QmBurn"),
          Cl.uint(1),
        ],
        deployer
      );
    });

    it("should allow owner to burn token", () => {
      const result = simnet.callPublicFn("nft", "burn", [Cl.uint(1)], wallet1);

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should remove token data after burn", () => {
      simnet.callPublicFn("nft", "burn", [Cl.uint(1)], wallet1);

      const result = simnet.callReadOnlyFn("nft", "token-exists", [Cl.uint(1)], deployer);
      expect(result.result).toStrictEqual(Cl.bool(false));
    });

    it("should update balance after burn", () => {
      simnet.callPublicFn("nft", "burn", [Cl.uint(1)], wallet1);

      const result = simnet.callReadOnlyFn(
        "nft",
        "get-balance",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.uint(0));
    });

    it("should reject burn from non-owner", () => {
      const result = simnet.callPublicFn("nft", "burn", [Cl.uint(1)], wallet2);

      expect(result.result).toBeErr(Cl.uint(103)); // ERR-NOT-TOKEN-OWNER
    });
  });
});
