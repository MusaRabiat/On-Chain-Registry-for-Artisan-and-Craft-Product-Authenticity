import { describe, it, expect, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

// Test accounts from simnet
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

describe("Registry Contract Tests", () => {
  describe("Artisan Management", () => {
    it("should allow user to register as artisan", () => {
      const result = simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("John Craftsman"),
          Cl.stringAscii("Master woodworker with 20 years of experience"),
          Cl.stringAscii("Portland, Oregon"),
        ],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should reject duplicate artisan registration", () => {
      // First registration
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("First Name"),
          Cl.stringAscii("First Bio"),
          Cl.stringAscii("First Location"),
        ],
        wallet1
      );

      // Second registration attempt
      const result = simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("Second Name"),
          Cl.stringAscii("Second Bio"),
          Cl.stringAscii("Second Location"),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(202)); // ERR-ALREADY-EXISTS
    });

    it("should reject registration with empty name", () => {
      const result = simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii(""),
          Cl.stringAscii("Some bio"),
          Cl.stringAscii("Some location"),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(204)); // ERR-INVALID-INPUT
    });

    it("should return correct artisan profile", () => {
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("Maria Weaver"),
          Cl.stringAscii("Traditional textile artist"),
          Cl.stringAscii("Santa Fe, NM"),
        ],
        wallet1
      );

      const result = simnet.callReadOnlyFn(
        "registry",
        "get-artisan",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should allow artisan to update profile", () => {
      // Register
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("Old Name"),
          Cl.stringAscii("Old Bio"),
          Cl.stringAscii("Old Location"),
        ],
        wallet1
      );

      // Update
      const result = simnet.callPublicFn(
        "registry",
        "update-artisan-profile",
        [
          Cl.stringAscii("New Name"),
          Cl.stringAscii("Updated bio with more experience"),
          Cl.stringAscii("New Location"),
        ],
        wallet1
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to verify artisan", () => {
      // Register artisan
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("Verified Artisan"),
          Cl.stringAscii("Premium craftsman"),
          Cl.stringAscii("Denver, CO"),
        ],
        wallet1
      );

      // Verify by admin
      const result = simnet.callPublicFn(
        "registry",
        "verify-artisan",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject verify-artisan from non-admin", () => {
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("Test Artisan"),
          Cl.stringAscii("Test Bio"),
          Cl.stringAscii("Test Location"),
        ],
        wallet1
      );

      const result = simnet.callPublicFn(
        "registry",
        "verify-artisan",
        [Cl.uint(1)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(200)); // ERR-NOT-AUTHORIZED
    });
  });

  describe("Certifier Management", () => {
    it("should allow admin to register certifier", () => {
      const result = simnet.callPublicFn(
        "registry",
        "register-certifier",
        [
          Cl.principal(wallet2),
          Cl.stringAscii("Craft Certification Authority"),
          Cl.uint(0), // CERTIFIER-TYPE-GOVERNMENT
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should reject certifier registration from non-admin", () => {
      const result = simnet.callPublicFn(
        "registry",
        "register-certifier",
        [
          Cl.principal(wallet2),
          Cl.stringAscii("Fake Authority"),
          Cl.uint(1),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(200)); // ERR-NOT-AUTHORIZED
    });

    it("should allow admin to deactivate certifier", () => {
      // Register certifier
      simnet.callPublicFn(
        "registry",
        "register-certifier",
        [
          Cl.principal(wallet2),
          Cl.stringAscii("Test Certifier"),
          Cl.uint(2),
        ],
        deployer
      );

      // Deactivate
      const result = simnet.callPublicFn(
        "registry",
        "deactivate-certifier",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to reactivate certifier", () => {
      // Register and deactivate
      simnet.callPublicFn(
        "registry",
        "register-certifier",
        [Cl.principal(wallet2), Cl.stringAscii("Test"), Cl.uint(1)],
        deployer
      );
      simnet.callPublicFn("registry", "deactivate-certifier", [Cl.uint(1)], deployer);

      // Reactivate
      const result = simnet.callPublicFn(
        "registry",
        "reactivate-certifier",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should correctly identify active certifier", () => {
      simnet.callPublicFn(
        "registry",
        "register-certifier",
        [Cl.principal(wallet2), Cl.stringAscii("Active Certifier"), Cl.uint(1)],
        deployer
      );

      const result = simnet.callReadOnlyFn(
        "registry",
        "is-active-certifier",
        [Cl.principal(wallet2)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.bool(true));
    });
  });

  describe("Product Registration", () => {
    beforeEach(() => {
      // Register an artisan first
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("Product Artisan"),
          Cl.stringAscii("Creating products"),
          Cl.stringAscii("Austin, TX"),
        ],
        wallet1
      );
    });

    it("should allow artisan to register product", () => {
      const result = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Handmade Leather Bag"),
          Cl.stringAscii("Leather Goods"),
          Cl.stringAscii("Premium full-grain leather handbag"),
          Cl.stringAscii("ipfs://QmProductMetadata123"),
        ],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should reject product registration from non-artisan", () => {
      const result = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Fake Product"),
          Cl.stringAscii("Category"),
          Cl.stringAscii("Description"),
          Cl.stringAscii("ipfs://fake"),
        ],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(205)); // ERR-NOT-ARTISAN
    });

    it("should increment product count for artisan", () => {
      // Register first product
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Product 1"),
          Cl.stringAscii("Category"),
          Cl.stringAscii("Description"),
          Cl.stringAscii("ipfs://1"),
        ],
        wallet1
      );

      // Register second product
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Product 2"),
          Cl.stringAscii("Category"),
          Cl.stringAscii("Description"),
          Cl.stringAscii("ipfs://2"),
        ],
        wallet1
      );

      const result = simnet.callReadOnlyFn("registry", "get-product-count", [], deployer);
      expect(result.result).toStrictEqual(Cl.uint(2));
    });

    it("should return correct product details", () => {
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Ceramic Bowl"),
          Cl.stringAscii("Ceramics"),
          Cl.stringAscii("Hand-thrown stoneware bowl"),
          Cl.stringAscii("ipfs://QmCeramicBowl"),
        ],
        wallet1
      );

      const result = simnet.callReadOnlyFn(
        "registry",
        "get-product",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should set initial status as pending", () => {
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Pending Product"),
          Cl.stringAscii("Test"),
          Cl.stringAscii("Test product"),
          Cl.stringAscii("ipfs://test"),
        ],
        wallet1
      );

      const result = simnet.callReadOnlyFn(
        "registry",
        "get-product-status",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.some(Cl.uint(0))); // STATUS-PENDING
    });

    it("should allow artisan to update pending product", () => {
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Original Name"),
          Cl.stringAscii("Category"),
          Cl.stringAscii("Original description"),
          Cl.stringAscii("ipfs://original"),
        ],
        wallet1
      );

      const result = simnet.callPublicFn(
        "registry",
        "update-product",
        [
          Cl.uint(1),
          Cl.stringAscii("Updated Name"),
          Cl.stringAscii("Updated description"),
          Cl.stringAscii("ipfs://updated"),
        ],
        wallet1
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });
  });

  describe("Certification Process", () => {
    beforeEach(() => {
      // Register artisan
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("Certified Artisan"),
          Cl.stringAscii("Quality craftsman"),
          Cl.stringAscii("Miami, FL"),
        ],
        wallet1
      );

      // Register certifier
      simnet.callPublicFn(
        "registry",
        "register-certifier",
        [Cl.principal(wallet2), Cl.stringAscii("Quality Authority"), Cl.uint(1)],
        deployer
      );

      // Register product
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Certifiable Product"),
          Cl.stringAscii("Premium"),
          Cl.stringAscii("High quality item"),
          Cl.stringAscii("ipfs://certifiable"),
        ],
        wallet1
      );
    });

    it("should allow active certifier to certify product", () => {
      const result = simnet.callPublicFn(
        "registry",
        "certify-product",
        [Cl.uint(1), Cl.stringAscii("Meets all quality standards")],
        wallet2
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should update product status to verified after certification", () => {
      simnet.callPublicFn(
        "registry",
        "certify-product",
        [Cl.uint(1), Cl.stringAscii("Approved")],
        wallet2
      );

      const result = simnet.callReadOnlyFn(
        "registry",
        "get-product-status",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.some(Cl.uint(1))); // STATUS-VERIFIED
    });

    it("should increment certification count", () => {
      simnet.callPublicFn(
        "registry",
        "certify-product",
        [Cl.uint(1), Cl.stringAscii("First certification")],
        wallet2
      );

      const result = simnet.callReadOnlyFn(
        "registry",
        "get-product-certification-count",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.uint(1));
    });

    it("should reject certification from non-certifier", () => {
      const result = simnet.callPublicFn(
        "registry",
        "certify-product",
        [Cl.uint(1), Cl.stringAscii("Fake certification")],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(206)); // ERR-NOT-CERTIFIER
    });

    it("should reject duplicate certification from same certifier", () => {
      // First certification
      simnet.callPublicFn(
        "registry",
        "certify-product",
        [Cl.uint(1), Cl.stringAscii("First")],
        wallet2
      );

      // Second attempt
      const result = simnet.callPublicFn(
        "registry",
        "certify-product",
        [Cl.uint(1), Cl.stringAscii("Second")],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(202)); // ERR-ALREADY-EXISTS
    });

    it("should allow multiple certifiers to certify same product", () => {
      // Register second certifier
      simnet.callPublicFn(
        "registry",
        "register-certifier",
        [Cl.principal(wallet3), Cl.stringAscii("Another Authority"), Cl.uint(2)],
        deployer
      );

      // First certification
      simnet.callPublicFn(
        "registry",
        "certify-product",
        [Cl.uint(1), Cl.stringAscii("First cert")],
        wallet2
      );

      // Second certification from different certifier
      const result = simnet.callPublicFn(
        "registry",
        "certify-product",
        [Cl.uint(1), Cl.stringAscii("Second cert")],
        wallet3
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Check certification count
      const countResult = simnet.callReadOnlyFn(
        "registry",
        "get-product-certification-count",
        [Cl.uint(1)],
        deployer
      );

      expect(countResult.result).toStrictEqual(Cl.uint(2));
    });

    it("should allow certifier to reject product", () => {
      const result = simnet.callPublicFn(
        "registry",
        "reject-product",
        [Cl.uint(1), Cl.stringAscii("Does not meet quality standards")],
        wallet2
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Check status is rejected
      const statusResult = simnet.callReadOnlyFn(
        "registry",
        "get-product-status",
        [Cl.uint(1)],
        deployer
      );

      expect(statusResult.result).toStrictEqual(Cl.some(Cl.uint(4))); // STATUS-REJECTED
    });
  });

  describe("Dispute Resolution", () => {
    beforeEach(() => {
      // Register artisan
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("Disputed Artisan"),
          Cl.stringAscii("Disputed bio"),
          Cl.stringAscii("Disputed location"),
        ],
        wallet1
      );

      // Register certifier
      simnet.callPublicFn(
        "registry",
        "register-certifier",
        [Cl.principal(wallet2), Cl.stringAscii("Certifier"), Cl.uint(1)],
        deployer
      );

      // Register and certify product
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Disputed Product"),
          Cl.stringAscii("Category"),
          Cl.stringAscii("Description"),
          Cl.stringAscii("ipfs://disputed"),
        ],
        wallet1
      );

      simnet.callPublicFn(
        "registry",
        "certify-product",
        [Cl.uint(1), Cl.stringAscii("Certified")],
        wallet2
      );
    });

    it("should allow anyone to submit dispute against verified product", () => {
      const result = simnet.callPublicFn(
        "registry",
        "submit-dispute",
        [Cl.uint(1), Cl.stringAscii("I believe this product is counterfeit")],
        wallet3
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should update product status to disputed", () => {
      simnet.callPublicFn(
        "registry",
        "submit-dispute",
        [Cl.uint(1), Cl.stringAscii("Dispute reason")],
        wallet3
      );

      const result = simnet.callReadOnlyFn(
        "registry",
        "get-product-status",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.some(Cl.uint(2))); // STATUS-DISPUTED
    });

    it("should reject dispute against non-verified product", () => {
      // Register new product (pending status)
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Pending Product"),
          Cl.stringAscii("Cat"),
          Cl.stringAscii("Desc"),
          Cl.stringAscii("ipfs://pending"),
        ],
        wallet1
      );

      const result = simnet.callPublicFn(
        "registry",
        "submit-dispute",
        [Cl.uint(2), Cl.stringAscii("Cannot dispute pending product")],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(203)); // ERR-INVALID-STATUS
    });

    it("should reject second dispute on same product", () => {
      simnet.callPublicFn(
        "registry",
        "submit-dispute",
        [Cl.uint(1), Cl.stringAscii("First dispute")],
        wallet3
      );

      // After first dispute, product status is "disputed" (not "verified")
      // So the second dispute attempt fails with ERR-INVALID-STATUS
      const result = simnet.callPublicFn(
        "registry",
        "submit-dispute",
        [Cl.uint(1), Cl.stringAscii("Second dispute")],
        wallet4
      );

      expect(result.result).toBeErr(Cl.uint(203)); // ERR-INVALID-STATUS (product is already disputed)
    });

    it("should allow admin to resolve dispute upholding product", () => {
      simnet.callPublicFn(
        "registry",
        "submit-dispute",
        [Cl.uint(1), Cl.stringAscii("Dispute claim")],
        wallet3
      );

      const result = simnet.callPublicFn(
        "registry",
        "resolve-dispute",
        [
          Cl.uint(1),
          Cl.stringAscii("Investigation found product to be authentic"),
          Cl.bool(true), // uphold product
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Check product status is back to verified
      const statusResult = simnet.callReadOnlyFn(
        "registry",
        "get-product-status",
        [Cl.uint(1)],
        deployer
      );

      expect(statusResult.result).toStrictEqual(Cl.some(Cl.uint(1))); // STATUS-VERIFIED
    });

    it("should allow admin to resolve dispute rejecting product", () => {
      simnet.callPublicFn(
        "registry",
        "submit-dispute",
        [Cl.uint(1), Cl.stringAscii("Counterfeit claim")],
        wallet3
      );

      const result = simnet.callPublicFn(
        "registry",
        "resolve-dispute",
        [
          Cl.uint(1),
          Cl.stringAscii("Investigation confirmed counterfeit"),
          Cl.bool(false), // reject product
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Check product status is rejected
      const statusResult = simnet.callReadOnlyFn(
        "registry",
        "get-product-status",
        [Cl.uint(1)],
        deployer
      );

      expect(statusResult.result).toStrictEqual(Cl.some(Cl.uint(4))); // STATUS-REJECTED
    });

    it("should reject dispute resolution from non-admin", () => {
      simnet.callPublicFn(
        "registry",
        "submit-dispute",
        [Cl.uint(1), Cl.stringAscii("Dispute")],
        wallet3
      );

      const result = simnet.callPublicFn(
        "registry",
        "resolve-dispute",
        [Cl.uint(1), Cl.stringAscii("Unauthorized resolution"), Cl.bool(true)],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(200)); // ERR-NOT-AUTHORIZED
    });
  });

  describe("Read-Only Helper Functions", () => {
    it("should return correct status name for pending", () => {
      const result = simnet.callReadOnlyFn(
        "registry",
        "get-status-name",
        [Cl.uint(0)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.stringAscii("pending"));
    });

    it("should return correct status name for verified", () => {
      const result = simnet.callReadOnlyFn(
        "registry",
        "get-status-name",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.stringAscii("verified"));
    });

    it("should return correct status name for disputed", () => {
      const result = simnet.callReadOnlyFn(
        "registry",
        "get-status-name",
        [Cl.uint(2)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.stringAscii("disputed"));
    });

    it("should return unknown for invalid status", () => {
      const result = simnet.callReadOnlyFn(
        "registry",
        "get-status-name",
        [Cl.uint(99)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.stringAscii("unknown"));
    });

    it("should correctly identify registered artisan", () => {
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("Test"),
          Cl.stringAscii("Bio"),
          Cl.stringAscii("Location"),
        ],
        wallet1
      );

      const result = simnet.callReadOnlyFn(
        "registry",
        "is-artisan",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.bool(true));
    });

    it("should return false for non-artisan", () => {
      const result = simnet.callReadOnlyFn(
        "registry",
        "is-artisan",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.bool(false));
    });
  });

  describe("Admin Functions", () => {
    beforeEach(() => {
      // Setup artisan and product
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("Admin Test Artisan"),
          Cl.stringAscii("Bio"),
          Cl.stringAscii("Location"),
        ],
        wallet1
      );

      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Admin Test Product"),
          Cl.stringAscii("Category"),
          Cl.stringAscii("Description"),
          Cl.stringAscii("ipfs://admin-test"),
        ],
        wallet1
      );
    });

    it("should allow admin to manually update product status", () => {
      const result = simnet.callPublicFn(
        "registry",
        "admin-update-product-status",
        [Cl.uint(1), Cl.uint(1)], // Set to verified
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject admin function from non-admin", () => {
      const result = simnet.callPublicFn(
        "registry",
        "admin-update-product-status",
        [Cl.uint(1), Cl.uint(1)],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(200)); // ERR-NOT-AUTHORIZED
    });

    it("should reject invalid status value", () => {
      const result = simnet.callPublicFn(
        "registry",
        "admin-update-product-status",
        [Cl.uint(1), Cl.uint(99)], // Invalid status
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(203)); // ERR-INVALID-STATUS
    });
  });
});
