import { describe, it, expect, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

// Test accounts from simnet
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

describe("Provenance Contract Tests", () => {
  // ---------------------------------------------------------
  // Token Registration
  // ---------------------------------------------------------
  describe("Token Registration", () => {
    it("should allow contract owner to register a token for provenance tracking", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Handwoven Silk Scarf"),
          Cl.stringAscii("Textiles"),
          Cl.uint(500), // 5% royalty
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject registration from non-owner", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Test Product"),
          Cl.stringAscii("Category"),
          Cl.uint(500),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(300)); // ERR-NOT-AUTHORIZED
    });

    it("should reject duplicate token registration", () => {
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("First Registration"),
          Cl.stringAscii("Category"),
          Cl.uint(500),
        ],
        deployer
      );

      const result = simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet2),
          Cl.stringAscii("Duplicate Registration"),
          Cl.stringAscii("Category"),
          Cl.uint(300),
        ],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(303)); // ERR-ALREADY-REGISTERED
    });

    it("should reject royalty rate exceeding 10%", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Overpriced Royalty"),
          Cl.stringAscii("Category"),
          Cl.uint(1500), // 15% - too high
        ],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(306)); // ERR-ROYALTY-TOO-HIGH
    });

    it("should reject registration with empty product name", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii(""),
          Cl.stringAscii("Category"),
          Cl.uint(500),
        ],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(302)); // ERR-INVALID-INPUT
    });

    it("should record initial mint in transfer history on registration", () => {
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Tracked Product"),
          Cl.stringAscii("Crafts"),
          Cl.uint(500),
        ],
        deployer
      );

      // Check the initial transfer record (index 0 = mint)
      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-transfer-record",
        [Cl.uint(1), Cl.uint(0)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalSome);

      // Transfer count should be 1 (the initial mint)
      const countResult = simnet.callReadOnlyFn(
        "provenance",
        "get-transfer-count",
        [Cl.uint(1)],
        deployer
      );
      expect(countResult.result).toStrictEqual(Cl.uint(1));
    });

    it("should increment tracked token count", () => {
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Token 1"),
          Cl.stringAscii("Cat A"),
          Cl.uint(500),
        ],
        deployer
      );

      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(2),
          Cl.principal(wallet2),
          Cl.stringAscii("Token 2"),
          Cl.stringAscii("Cat B"),
          Cl.uint(300),
        ],
        deployer
      );

      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-tracked-token-count",
        [],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.uint(2));
    });

    it("should allow zero royalty rate", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("No Royalty Product"),
          Cl.stringAscii("Category"),
          Cl.uint(0), // 0% royalty
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });
  });

  // ---------------------------------------------------------
  // Royalty Configuration
  // ---------------------------------------------------------
  describe("Royalty Configuration", () => {
    it("should allow artisan to set default royalty rate", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "set-artisan-default-royalty",
        [Cl.uint(750)], // 7.5%
        wallet1
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Verify the rate was saved
      const readResult = simnet.callReadOnlyFn(
        "provenance",
        "get-artisan-default-royalty",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(readResult.result).toStrictEqual(Cl.uint(750));
    });

    it("should reject default royalty rate exceeding max", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "set-artisan-default-royalty",
        [Cl.uint(1500)], // 15% - too high
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(306)); // ERR-ROYALTY-TOO-HIGH
    });

    it("should return default 5% for artisan without custom rate", () => {
      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-artisan-default-royalty",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.uint(500)); // DEFAULT_ROYALTY_BPS
    });

    it("should allow artisan to update token royalty rate", () => {
      // Register token with wallet1 as artisan
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Royalty Test"),
          Cl.stringAscii("Category"),
          Cl.uint(500),
        ],
        deployer
      );

      // Artisan updates royalty
      const result = simnet.callPublicFn(
        "provenance",
        "update-token-royalty",
        [Cl.uint(1), Cl.uint(800)], // Change to 8%
        wallet1
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Verify update
      const royaltyResult = simnet.callReadOnlyFn(
        "provenance",
        "get-token-royalty",
        [Cl.uint(1)],
        deployer
      );
      expect(royaltyResult.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should reject royalty update from non-artisan", () => {
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Royalty Test"),
          Cl.stringAscii("Category"),
          Cl.uint(500),
        ],
        deployer
      );

      // wallet2 (not the artisan) tries to update royalty
      const result = simnet.callPublicFn(
        "provenance",
        "update-token-royalty",
        [Cl.uint(1), Cl.uint(800)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(300)); // ERR-NOT-AUTHORIZED
    });

    it("should reject royalty update for non-existent token", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "update-token-royalty",
        [Cl.uint(999), Cl.uint(800)],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(301)); // ERR-NOT-FOUND
    });

    it("should correctly calculate royalty amount", () => {
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Calc Test"),
          Cl.stringAscii("Category"),
          Cl.uint(500), // 5%
        ],
        deployer
      );

      // Calculate royalty on a 1,000,000 microSTX sale
      const result = simnet.callReadOnlyFn(
        "provenance",
        "calculate-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        deployer
      );

      // 5% of 1,000,000 = 50,000
      expect(result.result).toBeOk(Cl.uint(50000));
    });
  });

  // ---------------------------------------------------------
  // Provenance Recording
  // ---------------------------------------------------------
  describe("Provenance Recording", () => {
    beforeEach(() => {
      // Register a token first
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Provenance Product"),
          Cl.stringAscii("Art"),
          Cl.uint(500),
        ],
        deployer
      );
    });

    it("should allow contract owner to record a transfer", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "record-transfer",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.principal(wallet2),
          Cl.uint(500000),
          Cl.uint(1), // TRANSFER-TYPE-SALE
          Cl.stringAscii("First sale to collector"),
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject transfer recording from non-owner", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "record-transfer",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.principal(wallet2),
          Cl.uint(500000),
          Cl.uint(1),
          Cl.stringAscii("Unauthorized"),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(300)); // ERR-NOT-AUTHORIZED
    });

    it("should reject transfer recording for untracked token", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "record-transfer",
        [
          Cl.uint(999),
          Cl.principal(wallet1),
          Cl.principal(wallet2),
          Cl.uint(500000),
          Cl.uint(1),
          Cl.stringAscii("Untracked token"),
        ],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(301)); // ERR-NOT-FOUND
    });

    it("should reject invalid transfer type", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "record-transfer",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.principal(wallet2),
          Cl.uint(500000),
          Cl.uint(99), // Invalid transfer type
          Cl.stringAscii("Bad type"),
        ],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(302)); // ERR-INVALID-INPUT
    });

    it("should increment transfer count with each recording", () => {
      // Record first transfer
      simnet.callPublicFn(
        "provenance",
        "record-transfer",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.principal(wallet2),
          Cl.uint(500000),
          Cl.uint(1),
          Cl.stringAscii("First transfer"),
        ],
        deployer
      );

      // Record second transfer
      simnet.callPublicFn(
        "provenance",
        "record-transfer",
        [
          Cl.uint(1),
          Cl.principal(wallet2),
          Cl.principal(wallet3),
          Cl.uint(600000),
          Cl.uint(1),
          Cl.stringAscii("Second transfer"),
        ],
        deployer
      );

      // Count should be 3 (1 mint + 2 transfers)
      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-transfer-count",
        [Cl.uint(1)],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.uint(3));
    });

    it("should return correct latest transfer record", () => {
      // Record a transfer
      simnet.callPublicFn(
        "provenance",
        "record-transfer",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.principal(wallet2),
          Cl.uint(750000),
          Cl.uint(2), // TRANSFER-TYPE-TRANSFER
          Cl.stringAscii("Gift to friend"),
        ],
        deployer
      );

      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-latest-transfer",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should store each transfer at the correct index", () => {
      // Record transfer at index 1 (index 0 is the mint)
      simnet.callPublicFn(
        "provenance",
        "record-transfer",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.principal(wallet2),
          Cl.uint(500000),
          Cl.uint(1),
          Cl.stringAscii("Sale to wallet2"),
        ],
        deployer
      );

      // Check index 0 (mint)
      const mintRecord = simnet.callReadOnlyFn(
        "provenance",
        "get-transfer-record",
        [Cl.uint(1), Cl.uint(0)],
        deployer
      );
      expect(mintRecord.result.type).toBe(ClarityType.OptionalSome);

      // Check index 1 (first transfer)
      const transferRecord = simnet.callReadOnlyFn(
        "provenance",
        "get-transfer-record",
        [Cl.uint(1), Cl.uint(1)],
        deployer
      );
      expect(transferRecord.result.type).toBe(ClarityType.OptionalSome);

      // Check index 2 (should not exist)
      const noRecord = simnet.callReadOnlyFn(
        "provenance",
        "get-transfer-record",
        [Cl.uint(1), Cl.uint(2)],
        deployer
      );
      expect(noRecord.result.type).toBe(ClarityType.OptionalNone);
    });
  });

  // ---------------------------------------------------------
  // Secondary Sale with Royalties
  // ---------------------------------------------------------
  describe("Secondary Sale with Royalties", () => {
    beforeEach(() => {
      // Register a token with wallet1 as artisan, 5% royalty
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Sale Product"),
          Cl.stringAscii("Crafts"),
          Cl.uint(500), // 5%
        ],
        deployer
      );
    });

    it("should allow listing a tracked token for sale", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject listing with zero price", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(0)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(308)); // ERR-WRONG-PRICE
    });

    it("should reject listing untracked token", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(999), Cl.uint(1000000)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(301)); // ERR-NOT-FOUND
    });

    it("should allow seller to unlist token", () => {
      // List token
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );

      // Unlist
      const result = simnet.callPublicFn(
        "provenance",
        "unlist-token",
        [Cl.uint(1)],
        wallet2
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject unlisting by non-seller", () => {
      // List token as wallet2
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );

      // wallet3 tries to unlist
      const result = simnet.callPublicFn(
        "provenance",
        "unlist-token",
        [Cl.uint(1)],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(300)); // ERR-NOT-AUTHORIZED
    });

    it("should reject unlisting a non-listed token", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "unlist-token",
        [Cl.uint(1)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(307)); // ERR-LISTING-NOT-FOUND
    });

    it("should execute sale with royalty distribution", () => {
      // wallet2 lists the token for 1,000,000 microSTX
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );

      // wallet3 buys the token
      const result = simnet.callPublicFn(
        "provenance",
        "execute-sale-with-royalty",
        [Cl.uint(1)],
        wallet3
      );

      // Should succeed with sale details
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it("should reject self-purchase", () => {
      // wallet2 lists the token
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );

      // wallet2 tries to buy own listing
      const result = simnet.callPublicFn(
        "provenance",
        "execute-sale-with-royalty",
        [Cl.uint(1)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(305)); // ERR-SAME-OWNER
    });

    it("should reject purchase of non-listed token", () => {
      const result = simnet.callPublicFn(
        "provenance",
        "execute-sale-with-royalty",
        [Cl.uint(1)],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(307)); // ERR-LISTING-NOT-FOUND
    });

    it("should record sale in provenance history", () => {
      // List and sell
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );
      simnet.callPublicFn(
        "provenance",
        "execute-sale-with-royalty",
        [Cl.uint(1)],
        wallet3
      );

      // Transfer count should be 2 (mint + sale)
      const countResult = simnet.callReadOnlyFn(
        "provenance",
        "get-transfer-count",
        [Cl.uint(1)],
        deployer
      );
      expect(countResult.result).toStrictEqual(Cl.uint(2));
    });

    it("should update royalty tracking after sale", () => {
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );
      simnet.callPublicFn(
        "provenance",
        "execute-sale-with-royalty",
        [Cl.uint(1)],
        wallet3
      );

      // Check token royalty stats
      const royaltyResult = simnet.callReadOnlyFn(
        "provenance",
        "get-token-royalty",
        [Cl.uint(1)],
        deployer
      );
      expect(royaltyResult.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should increment total secondary sales count", () => {
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );
      simnet.callPublicFn(
        "provenance",
        "execute-sale-with-royalty",
        [Cl.uint(1)],
        wallet3
      );

      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-total-secondary-sales",
        [],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.uint(1));
    });

    it("should remove listing after successful sale", () => {
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );
      simnet.callPublicFn(
        "provenance",
        "execute-sale-with-royalty",
        [Cl.uint(1)],
        wallet3
      );

      // Token should no longer be listed
      const result = simnet.callReadOnlyFn(
        "provenance",
        "is-listed",
        [Cl.uint(1)],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.bool(false));
    });

    it("should handle sale when artisan is the seller (no royalty split)", () => {
      // wallet1 (the artisan) lists their own token
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(500000)],
        wallet1
      );

      // wallet3 buys
      const result = simnet.callPublicFn(
        "provenance",
        "execute-sale-with-royalty",
        [Cl.uint(1)],
        wallet3
      );

      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });
  });

  // ---------------------------------------------------------
  // Read-Only Functions
  // ---------------------------------------------------------
  describe("Read-Only Functions", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Read-Only Test"),
          Cl.stringAscii("Crafts"),
          Cl.uint(500),
        ],
        deployer
      );
    });

    it("should correctly identify tracked token", () => {
      const result = simnet.callReadOnlyFn(
        "provenance",
        "is-tracked",
        [Cl.uint(1)],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.bool(true));
    });

    it("should correctly identify untracked token", () => {
      const result = simnet.callReadOnlyFn(
        "provenance",
        "is-tracked",
        [Cl.uint(999)],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.bool(false));
    });

    it("should return tracked token info", () => {
      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-tracked-token",
        [Cl.uint(1)],
        deployer
      );
      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should return none for untracked token info", () => {
      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-tracked-token",
        [Cl.uint(999)],
        deployer
      );
      expect(result.result.type).toBe(ClarityType.OptionalNone);
    });

    it("should return zero transfer count for untracked token", () => {
      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-transfer-count",
        [Cl.uint(999)],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.uint(0));
    });

    it("should return none for latest transfer of untracked token", () => {
      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-latest-transfer",
        [Cl.uint(999)],
        deployer
      );
      expect(result.result.type).toBe(ClarityType.OptionalNone);
    });

    it("should return provenance summary", () => {
      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-provenance-summary",
        [Cl.uint(1)],
        deployer
      );
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it("should correctly report listing status", () => {
      // Not listed initially
      let result = simnet.callReadOnlyFn(
        "provenance",
        "is-listed",
        [Cl.uint(1)],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.bool(false));

      // List it
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );

      // Should be listed now
      result = simnet.callReadOnlyFn(
        "provenance",
        "is-listed",
        [Cl.uint(1)],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.bool(true));
    });

    it("should return listing details", () => {
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(750000)],
        wallet2
      );

      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-provenance-listing",
        [Cl.uint(1)],
        deployer
      );
      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should return zero artisan total royalties initially", () => {
      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-artisan-total-royalties",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.uint(0));
    });

    it("should return zero total royalties distributed initially", () => {
      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-total-royalties-distributed",
        [],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.uint(0));
    });

    it("should return zero total secondary sales initially", () => {
      const result = simnet.callReadOnlyFn(
        "provenance",
        "get-total-secondary-sales",
        [],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.uint(0));
    });
  });

  // ---------------------------------------------------------
  // Edge Cases & Integration
  // ---------------------------------------------------------
  describe("Edge Cases & Integration", () => {
    it("should handle multiple tokens with different royalty rates", () => {
      // Register token 1 with 3%
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Low Royalty"),
          Cl.stringAscii("Jewelry"),
          Cl.uint(300),
        ],
        deployer
      );

      // Register token 2 with 10%
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(2),
          Cl.principal(wallet2),
          Cl.stringAscii("High Royalty"),
          Cl.stringAscii("Ceramics"),
          Cl.uint(1000),
        ],
        deployer
      );

      // Check royalties
      const royalty1 = simnet.callReadOnlyFn(
        "provenance",
        "calculate-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        deployer
      );
      expect(royalty1.result).toBeOk(Cl.uint(30000)); // 3% of 1M

      const royalty2 = simnet.callReadOnlyFn(
        "provenance",
        "calculate-royalty",
        [Cl.uint(2), Cl.uint(1000000)],
        deployer
      );
      expect(royalty2.result).toBeOk(Cl.uint(100000)); // 10% of 1M
    });

    it("should build a full provenance chain across multiple owners", () => {
      // Register token
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Chain Product"),
          Cl.stringAscii("Textiles"),
          Cl.uint(500),
        ],
        deployer
      );

      // Record: wallet1 -> wallet2 (sale)
      simnet.callPublicFn(
        "provenance",
        "record-transfer",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.principal(wallet2),
          Cl.uint(100000),
          Cl.uint(1),
          Cl.stringAscii("First sale"),
        ],
        deployer
      );

      // Record: wallet2 -> wallet3 (gift)
      simnet.callPublicFn(
        "provenance",
        "record-transfer",
        [
          Cl.uint(1),
          Cl.principal(wallet2),
          Cl.principal(wallet3),
          Cl.uint(0),
          Cl.uint(3), // TRANSFER-TYPE-GIFT
          Cl.stringAscii("Gift to collector"),
        ],
        deployer
      );

      // Record: wallet3 -> wallet4 (sale)
      simnet.callPublicFn(
        "provenance",
        "record-transfer",
        [
          Cl.uint(1),
          Cl.principal(wallet3),
          Cl.principal(wallet4),
          Cl.uint(250000),
          Cl.uint(1),
          Cl.stringAscii("Resale at premium"),
        ],
        deployer
      );

      // Should have 4 entries total (mint + 3 transfers)
      const count = simnet.callReadOnlyFn(
        "provenance",
        "get-transfer-count",
        [Cl.uint(1)],
        deployer
      );
      expect(count.result).toStrictEqual(Cl.uint(4));

      // Verify each record exists
      for (let i = 0; i < 4; i++) {
        const record = simnet.callReadOnlyFn(
          "provenance",
          "get-transfer-record",
          [Cl.uint(1), Cl.uint(i)],
          deployer
        );
        expect(record.result.type).toBe(ClarityType.OptionalSome);
      }
    });

    it("should reject duplicate listing for already-listed token", () => {
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Double List Test"),
          Cl.stringAscii("Category"),
          Cl.uint(500),
        ],
        deployer
      );

      // First listing
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );

      // Second listing attempt
      const result = simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(2000000)],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(303)); // ERR-ALREADY-REGISTERED
    });

    it("should allow relisting after sale completes", () => {
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Relist Product"),
          Cl.stringAscii("Art"),
          Cl.uint(500),
        ],
        deployer
      );

      // First listing and sale
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(100)],
        wallet2
      );
      simnet.callPublicFn(
        "provenance",
        "execute-sale-with-royalty",
        [Cl.uint(1)],
        wallet3
      );

      // Relist should succeed
      const result = simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(200)],
        wallet3
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow relisting after unlisting", () => {
      simnet.callPublicFn(
        "provenance",
        "register-token",
        [
          Cl.uint(1),
          Cl.principal(wallet1),
          Cl.stringAscii("Unlist Relist"),
          Cl.stringAscii("Art"),
          Cl.uint(500),
        ],
        deployer
      );

      // List
      simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(1000000)],
        wallet2
      );

      // Unlist
      simnet.callPublicFn(
        "provenance",
        "unlist-token",
        [Cl.uint(1)],
        wallet2
      );

      // Relist
      const result = simnet.callPublicFn(
        "provenance",
        "list-with-royalty",
        [Cl.uint(1), Cl.uint(2000000)],
        wallet2
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });
  });
});
