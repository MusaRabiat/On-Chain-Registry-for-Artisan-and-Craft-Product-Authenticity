import { describe, it, expect, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

// Test accounts from simnet
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

describe("Certification Contract Tests", () => {
  // ============================================================================
  // Certifier Management Tests
  // ============================================================================
  describe("Certifier Management", () => {
    it("should allow admin to register a certifier", () => {
      const result = simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Quality Standards Authority"),
          Cl.stringAscii("Official certifier for artisan products"),
          Cl.uint(1), // CERTIFIER-GOVERNMENT
          Cl.list([
            Cl.stringAscii("Leather"),
            Cl.stringAscii("Textiles"),
          ]),
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should reject certifier registration from non-admin", () => {
      const result = simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet2),
          Cl.stringAscii("Fake Authority"),
          Cl.stringAscii("Description"),
          Cl.uint(1),
          Cl.list([]),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(300)); // ERR-NOT-AUTHORIZED
    });

    it("should reject duplicate certifier registration", () => {
      // First registration
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("First Certifier"),
          Cl.stringAscii("Description"),
          Cl.uint(1),
          Cl.list([]),
        ],
        deployer
      );

      // Duplicate attempt
      const result = simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Duplicate Certifier"),
          Cl.stringAscii("Description"),
          Cl.uint(2),
          Cl.list([]),
        ],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(302)); // ERR-ALREADY-EXISTS
    });

    it("should reject registration with empty name", () => {
      const result = simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii(""),
          Cl.stringAscii("Description"),
          Cl.uint(1),
          Cl.list([]),
        ],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(303)); // ERR-INVALID-INPUT
    });

    it("should reject invalid certifier type", () => {
      const result = simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Test Certifier"),
          Cl.stringAscii("Description"),
          Cl.uint(99), // Invalid type
          Cl.list([]),
        ],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(303)); // ERR-INVALID-INPUT
    });

    it("should return correct certifier profile", () => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Test Certifier"),
          Cl.stringAscii("Test Description"),
          Cl.uint(2), // CERTIFIER-TRADE-ASSOCIATION
          Cl.list([Cl.stringAscii("Ceramics")]),
        ],
        deployer
      );

      const result = simnet.callReadOnlyFn(
        "certification",
        "get-certifier",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should correctly identify active certifier", () => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Active Certifier"),
          Cl.stringAscii("Description"),
          Cl.uint(1),
          Cl.list([]),
        ],
        deployer
      );

      const result = simnet.callReadOnlyFn(
        "certification",
        "is-active-certifier",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.bool(true));
    });

    it("should allow admin to deactivate certifier", () => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("To Deactivate"),
          Cl.stringAscii("Description"),
          Cl.uint(1),
          Cl.list([]),
        ],
        deployer
      );

      const result = simnet.callPublicFn(
        "certification",
        "deactivate-certifier",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Verify deactivated
      const activeCheck = simnet.callReadOnlyFn(
        "certification",
        "is-active-certifier",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(activeCheck.result).toStrictEqual(Cl.bool(false));
    });

    it("should allow admin to reactivate certifier", () => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Test"),
          Cl.stringAscii("Desc"),
          Cl.uint(1),
          Cl.list([]),
        ],
        deployer
      );

      simnet.callPublicFn("certification", "deactivate-certifier", [Cl.uint(1)], deployer);

      const result = simnet.callPublicFn(
        "certification",
        "reactivate-certifier",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow certifier to update their profile", () => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Original Name"),
          Cl.stringAscii("Original Desc"),
          Cl.uint(1),
          Cl.list([]),
        ],
        deployer
      );

      const result = simnet.callPublicFn(
        "certification",
        "update-certifier-profile",
        [
          Cl.uint(1),
          Cl.stringAscii("Updated Name"),
          Cl.stringAscii("Updated Description"),
          Cl.list([Cl.stringAscii("New Spec")]),
        ],
        wallet1
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to update trust score", () => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Test"),
          Cl.stringAscii("Desc"),
          Cl.uint(1),
          Cl.list([]),
        ],
        deployer
      );

      const result = simnet.callPublicFn(
        "certification",
        "update-trust-score",
        [Cl.uint(1), Cl.uint(85)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject trust score over 100", () => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Test"),
          Cl.stringAscii("Desc"),
          Cl.uint(1),
          Cl.list([]),
        ],
        deployer
      );

      const result = simnet.callPublicFn(
        "certification",
        "update-trust-score",
        [Cl.uint(1), Cl.uint(150)],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(303)); // ERR-INVALID-INPUT
    });
  });

  // ============================================================================
  // Certification Issuance Tests
  // ============================================================================
  describe("Certification Issuance", () => {
    beforeEach(() => {
      // Register a certifier
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Quality Authority"),
          Cl.stringAscii("Description"),
          Cl.uint(1),
          Cl.list([]),
        ],
        deployer
      );
    });

    it("should allow active certifier to issue certification", () => {
      const result = simnet.callPublicFn(
        "certification",
        "issue-certification",
        [
          Cl.uint(1), // product-id
          Cl.uint(2), // TIER-SILVER
          Cl.stringAscii("Product meets quality standards"),
          Cl.stringAscii("ipfs://QmEvidence123"),
          Cl.uint(0), // Use default validity
        ],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should allow issuing different tier certifications", () => {
      // Bronze
      const bronzeResult = simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(1), Cl.stringAscii("Bronze level"), Cl.stringAscii("ipfs://1"), Cl.uint(0)],
        wallet1
      );
      expect(bronzeResult.result).toBeOk(Cl.uint(1));

      // Gold for different product
      const goldResult = simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(2), Cl.uint(3), Cl.stringAscii("Gold level"), Cl.stringAscii("ipfs://2"), Cl.uint(0)],
        wallet1
      );
      expect(goldResult.result).toBeOk(Cl.uint(2));

      // Platinum
      const platinumResult = simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(3), Cl.uint(4), Cl.stringAscii("Platinum level"), Cl.stringAscii("ipfs://3"), Cl.uint(0)],
        wallet1
      );
      expect(platinumResult.result).toBeOk(Cl.uint(3));
    });

    it("should reject certification from non-certifier", () => {
      const result = simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("Notes"), Cl.stringAscii("ipfs://test"), Cl.uint(0)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(304)); // ERR-NOT-CERTIFIER
    });

    it("should reject certification from inactive certifier", () => {
      // Deactivate the certifier
      simnet.callPublicFn("certification", "deactivate-certifier", [Cl.uint(1)], deployer);

      const result = simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("Notes"), Cl.stringAscii("ipfs://test"), Cl.uint(0)],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(305)); // ERR-CERTIFIER-INACTIVE
    });

    it("should reject invalid tier", () => {
      const result = simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(99), Cl.stringAscii("Notes"), Cl.stringAscii("ipfs://test"), Cl.uint(0)],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(308)); // ERR-INVALID-TIER
    });

    it("should return correct certification details", () => {
      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(3), Cl.stringAscii("Gold certified"), Cl.stringAscii("ipfs://gold"), Cl.uint(1000)],
        wallet1
      );

      const result = simnet.callReadOnlyFn(
        "certification",
        "get-certification",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should track certifications for product", () => {
      // Issue multiple certifications for same product
      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("First"), Cl.stringAscii("ipfs://1"), Cl.uint(0)],
        wallet1
      );

      // Register second certifier
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet2), Cl.stringAscii("Second Authority"), Cl.stringAscii("Desc"), Cl.uint(2), Cl.list([])],
        deployer
      );

      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(3), Cl.stringAscii("Second"), Cl.stringAscii("ipfs://2"), Cl.uint(0)],
        wallet2
      );

      const result = simnet.callReadOnlyFn(
        "certification",
        "get-product-certification-ids",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.List);
    });

    it("should report highest tier for product", () => {
      // Issue bronze
      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(1), Cl.stringAscii("Bronze"), Cl.stringAscii("ipfs://1"), Cl.uint(0)],
        wallet1
      );

      // Register second certifier and issue gold
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet2), Cl.stringAscii("Gold Authority"), Cl.stringAscii("Desc"), Cl.uint(1), Cl.list([])],
        deployer
      );

      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(3), Cl.stringAscii("Gold"), Cl.stringAscii("ipfs://2"), Cl.uint(0)],
        wallet2
      );

      const result = simnet.callReadOnlyFn(
        "certification",
        "get-product-highest-tier",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.uint(3)); // Gold tier
    });
  });

  // ============================================================================
  // Certification Renewal Tests
  // ============================================================================
  describe("Certification Renewal", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet1), Cl.stringAscii("Certifier"), Cl.stringAscii("Desc"), Cl.uint(1), Cl.list([])],
        deployer
      );
    });

    it("should reject renewal from different certifier", () => {
      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("Original"), Cl.stringAscii("ipfs://1"), Cl.uint(100)],
        wallet1
      );

      // Register different certifier
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet2), Cl.stringAscii("Other"), Cl.stringAscii("Desc"), Cl.uint(1), Cl.list([])],
        deployer
      );

      const result = simnet.callPublicFn(
        "certification",
        "renew-certification",
        [Cl.uint(1), Cl.stringAscii("Renewed"), Cl.stringAscii("ipfs://2"), Cl.uint(0)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(300)); // ERR-NOT-AUTHORIZED
    });
  });

  // ============================================================================
  // Certification Revocation Tests
  // ============================================================================
  describe("Certification Revocation", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet1), Cl.stringAscii("Certifier"), Cl.stringAscii("Desc"), Cl.uint(1), Cl.list([])],
        deployer
      );

      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("To revoke"), Cl.stringAscii("ipfs://1"), Cl.uint(0)],
        wallet1
      );
    });

    it("should allow certifier to revoke their certification", () => {
      const result = simnet.callPublicFn(
        "certification",
        "revoke-certification",
        [Cl.uint(1), Cl.stringAscii("Product no longer meets standards")],
        wallet1
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to revoke any certification", () => {
      const result = simnet.callPublicFn(
        "certification",
        "revoke-certification",
        [Cl.uint(1), Cl.stringAscii("Admin revocation")],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject revocation without reason", () => {
      const result = simnet.callPublicFn(
        "certification",
        "revoke-certification",
        [Cl.uint(1), Cl.stringAscii("")],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(303)); // ERR-INVALID-INPUT
    });

    it("should reject double revocation", () => {
      simnet.callPublicFn(
        "certification",
        "revoke-certification",
        [Cl.uint(1), Cl.stringAscii("First revocation")],
        wallet1
      );

      const result = simnet.callPublicFn(
        "certification",
        "revoke-certification",
        [Cl.uint(1), Cl.stringAscii("Second revocation")],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(307)); // ERR-CERTIFICATION-REVOKED
    });

    it("should update certification validity after revocation", () => {
      simnet.callPublicFn(
        "certification",
        "revoke-certification",
        [Cl.uint(1), Cl.stringAscii("Revoked")],
        wallet1
      );

      const result = simnet.callReadOnlyFn(
        "certification",
        "is-certification-valid",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.bool(false));
    });
  });

  // ============================================================================
  // Suspension Tests
  // ============================================================================
  describe("Certification Suspension", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet1), Cl.stringAscii("Certifier"), Cl.stringAscii("Desc"), Cl.uint(1), Cl.list([])],
        deployer
      );

      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("To suspend"), Cl.stringAscii("ipfs://1"), Cl.uint(0)],
        wallet1
      );
    });

    it("should allow admin to suspend certification", () => {
      const result = simnet.callPublicFn(
        "certification",
        "suspend-certification",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to unsuspend certification", () => {
      simnet.callPublicFn("certification", "suspend-certification", [Cl.uint(1)], deployer);

      const result = simnet.callPublicFn(
        "certification",
        "unsuspend-certification",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject suspension from non-admin", () => {
      const result = simnet.callPublicFn(
        "certification",
        "suspend-certification",
        [Cl.uint(1)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(300)); // ERR-NOT-AUTHORIZED
    });
  });

  // ============================================================================
  // Credential Management Tests
  // ============================================================================
  describe("Credential Management", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet1), Cl.stringAscii("Certifier"), Cl.stringAscii("Desc"), Cl.uint(1), Cl.list([])],
        deployer
      );
    });

    it("should allow admin to create credential", () => {
      const result = simnet.callPublicFn(
        "certification",
        "create-credential",
        [
          Cl.stringAscii("ISO 9001 Certification"),
          Cl.stringAscii("Quality management system certification"),
          Cl.stringAscii("ISO Organization"),
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should reject credential creation from non-admin", () => {
      const result = simnet.callPublicFn(
        "certification",
        "create-credential",
        [
          Cl.stringAscii("Fake Credential"),
          Cl.stringAscii("Description"),
          Cl.stringAscii("Fake Issuer"),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(300)); // ERR-NOT-AUTHORIZED
    });

    it("should allow admin to grant credential to certifier", () => {
      simnet.callPublicFn(
        "certification",
        "create-credential",
        [Cl.stringAscii("Credential"), Cl.stringAscii("Desc"), Cl.stringAscii("Issuer")],
        deployer
      );

      const result = simnet.callPublicFn(
        "certification",
        "grant-credential",
        [Cl.uint(1), Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should verify certifier has credential", () => {
      simnet.callPublicFn(
        "certification",
        "create-credential",
        [Cl.stringAscii("Credential"), Cl.stringAscii("Desc"), Cl.stringAscii("Issuer")],
        deployer
      );

      simnet.callPublicFn("certification", "grant-credential", [Cl.uint(1), Cl.uint(1)], deployer);

      const result = simnet.callReadOnlyFn(
        "certification",
        "certifier-has-credential",
        [Cl.uint(1), Cl.uint(1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.bool(true));
    });

    it("should allow admin to revoke credential", () => {
      simnet.callPublicFn(
        "certification",
        "create-credential",
        [Cl.stringAscii("Credential"), Cl.stringAscii("Desc"), Cl.stringAscii("Issuer")],
        deployer
      );

      simnet.callPublicFn("certification", "grant-credential", [Cl.uint(1), Cl.uint(1)], deployer);

      const result = simnet.callPublicFn(
        "certification",
        "revoke-credential",
        [Cl.uint(1), Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });
  });

  // ============================================================================
  // Helper Function Tests
  // ============================================================================
  describe("Helper Functions", () => {
    it("should return correct tier names", () => {
      const bronze = simnet.callReadOnlyFn("certification", "get-tier-name", [Cl.uint(1)], deployer);
      expect(bronze.result).toStrictEqual(Cl.stringAscii("bronze"));

      const silver = simnet.callReadOnlyFn("certification", "get-tier-name", [Cl.uint(2)], deployer);
      expect(silver.result).toStrictEqual(Cl.stringAscii("silver"));

      const gold = simnet.callReadOnlyFn("certification", "get-tier-name", [Cl.uint(3)], deployer);
      expect(gold.result).toStrictEqual(Cl.stringAscii("gold"));

      const platinum = simnet.callReadOnlyFn("certification", "get-tier-name", [Cl.uint(4)], deployer);
      expect(platinum.result).toStrictEqual(Cl.stringAscii("platinum"));

      const unknown = simnet.callReadOnlyFn("certification", "get-tier-name", [Cl.uint(99)], deployer);
      expect(unknown.result).toStrictEqual(Cl.stringAscii("unknown"));
    });

    it("should return correct status names", () => {
      const active = simnet.callReadOnlyFn("certification", "get-status-name", [Cl.uint(1)], deployer);
      expect(active.result).toStrictEqual(Cl.stringAscii("active"));

      const expired = simnet.callReadOnlyFn("certification", "get-status-name", [Cl.uint(2)], deployer);
      expect(expired.result).toStrictEqual(Cl.stringAscii("expired"));

      const revoked = simnet.callReadOnlyFn("certification", "get-status-name", [Cl.uint(3)], deployer);
      expect(revoked.result).toStrictEqual(Cl.stringAscii("revoked"));

      const suspended = simnet.callReadOnlyFn("certification", "get-status-name", [Cl.uint(4)], deployer);
      expect(suspended.result).toStrictEqual(Cl.stringAscii("suspended"));
    });

    it("should return correct certifier count", () => {
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet1), Cl.stringAscii("First"), Cl.stringAscii("Desc"), Cl.uint(1), Cl.list([])],
        deployer
      );

      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet2), Cl.stringAscii("Second"), Cl.stringAscii("Desc"), Cl.uint(2), Cl.list([])],
        deployer
      );

      const result = simnet.callReadOnlyFn("certification", "get-certifier-count", [], deployer);
      expect(result.result).toStrictEqual(Cl.uint(2));
    });
  });
});
