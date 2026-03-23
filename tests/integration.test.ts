import { describe, it, expect, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

// Test accounts from simnet
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

describe("Integration Tests - Cross-Contract Workflows", () => {
  // ============================================================================
  // Full Product Lifecycle Tests
  // ============================================================================
  describe("Product Lifecycle: Registration to Certification", () => {
    it("should complete full product registration and certification flow", () => {
      // Step 1: Register artisan
      const artisanResult = simnet.callPublicFn(
        "registry",
        "register-artisan",
        [
          Cl.stringAscii("Master Craftsman"),
          Cl.stringAscii("Expert leather worker with 20 years experience"),
          Cl.stringAscii("Florence, Italy"),
        ],
        wallet1
      );
      expect(artisanResult.result).toBeOk(Cl.uint(1));

      // Step 2: Register product in registry
      const productResult = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Handcrafted Leather Bag"),
          Cl.stringAscii("Leather Goods"),
          Cl.stringAscii("Premium full-grain leather handbag with brass fittings"),
          Cl.stringAscii("ipfs://QmProductMetadata123"),
        ],
        wallet1
      );
      expect(productResult.result).toBeOk(Cl.uint(1));

      // Step 3: Register certifier in certification contract
      const certifierResult = simnet.callPublicFn(
        "certification",
        "register-certifier",
        [
          Cl.principal(wallet2),
          Cl.stringAscii("Italian Leather Authority"),
          Cl.stringAscii("Official certifier for Italian leather products"),
          Cl.uint(2), // Trade association
          Cl.list([Cl.stringAscii("Leather"), Cl.stringAscii("Accessories")]),
        ],
        deployer
      );
      expect(certifierResult.result).toBeOk(Cl.uint(1));

      // Step 4: Issue certification
      const certResult = simnet.callPublicFn(
        "certification",
        "issue-certification",
        [
          Cl.uint(1), // Product ID
          Cl.uint(3), // Gold tier
          Cl.stringAscii("Product meets premium quality standards for Italian leather craftsmanship"),
          Cl.stringAscii("ipfs://QmCertificationEvidence456"),
          Cl.uint(0), // Default validity
        ],
        wallet2
      );
      expect(certResult.result).toBeOk(Cl.uint(1));

      // Verify certification is valid
      const isValid = simnet.callReadOnlyFn(
        "certification",
        "is-certification-valid",
        [Cl.uint(1)],
        deployer
      );
      expect(isValid.result).toStrictEqual(Cl.bool(true));
    });

    it("should handle multiple certifications for same product", () => {
      // Setup: Register artisan and product
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [Cl.stringAscii("Artisan"), Cl.stringAscii("Bio"), Cl.stringAscii("Location")],
        wallet1
      );

      simnet.callPublicFn(
        "registry",
        "register-product",
        [Cl.stringAscii("Product"), Cl.stringAscii("Category"), Cl.stringAscii("Desc"), Cl.stringAscii("ipfs://meta")],
        wallet1
      );

      // Register two certifiers
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet2), Cl.stringAscii("Certifier 1"), Cl.stringAscii("Desc"), Cl.uint(1), Cl.list([])],
        deployer
      );

      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet3), Cl.stringAscii("Certifier 2"), Cl.stringAscii("Desc"), Cl.uint(2), Cl.list([])],
        deployer
      );

      // Issue bronze certification from first certifier
      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(1), Cl.stringAscii("Bronze level"), Cl.stringAscii("ipfs://1"), Cl.uint(0)],
        wallet2
      );

      // Issue gold certification from second certifier
      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(3), Cl.stringAscii("Gold level"), Cl.stringAscii("ipfs://2"), Cl.uint(0)],
        wallet3
      );

      // Verify highest tier is gold
      const highestTier = simnet.callReadOnlyFn(
        "certification",
        "get-product-highest-tier",
        [Cl.uint(1)],
        deployer
      );
      expect(highestTier.result).toStrictEqual(Cl.uint(3)); // Gold
    });
  });

  // ============================================================================
  // Product Dispute Flow Tests
  // ============================================================================
  describe("Product Lifecycle: Certification to Dispute", () => {
    beforeEach(() => {
      // Setup: Create certified product
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [Cl.stringAscii("Artisan"), Cl.stringAscii("Bio"), Cl.stringAscii("Location")],
        wallet1
      );

      simnet.callPublicFn(
        "registry",
        "register-product",
        [Cl.stringAscii("Product"), Cl.stringAscii("Category"), Cl.stringAscii("Desc"), Cl.stringAscii("ipfs://meta")],
        wallet1
      );

      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet2), Cl.stringAscii("Certifier"), Cl.stringAscii("Desc"), Cl.uint(1), Cl.list([])],
        deployer
      );

      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("Certified"), Cl.stringAscii("ipfs://cert"), Cl.uint(0)],
        wallet2
      );
    });

    it("should handle dispute against certified product", () => {
      // Third party raises dispute
      const disputeResult = simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [
          Cl.uint(1),
          Cl.principal(wallet1), // Against the artisan
          Cl.uint(1), // Counterfeit category
          Cl.stringAscii("Suspected Counterfeit"),
          Cl.stringAscii("Product appears to be counterfeit based on material quality"),
        ],
        wallet3
      );
      expect(disputeResult.result).toBeOk(Cl.uint(1));

      // Verify dispute exists
      const hasDispute = simnet.callReadOnlyFn(
        "disputes",
        "has-active-dispute",
        [Cl.uint(1)],
        deployer
      );
      expect(hasDispute.result).toStrictEqual(Cl.bool(true));

      // Artisan responds
      const responseResult = simnet.callPublicFn(
        "disputes",
        "submit-response",
        [
          Cl.uint(1),
          Cl.stringAscii("Product is genuine. I can provide additional proof of authenticity."),
          Cl.stringAscii("ipfs://QmProofOfAuthenticity"),
        ],
        wallet1
      );
      expect(responseResult.result).toBeOk(Cl.bool(true));

      // Resolve in favor of artisan
      const resolveResult = simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [
          Cl.uint(1),
          Cl.uint(2), // In favor of artisan
          Cl.stringAscii("Investigation confirmed product authenticity"),
          Cl.uint(0), // No penalty
        ],
        deployer
      );
      expect(resolveResult.result).toBeOk(Cl.bool(true));
    });

    it("should revoke certification when dispute upheld", () => {
      // Dispute
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet1), Cl.uint(5), Cl.stringAscii("Certification Fraud"), Cl.stringAscii("Fake certification")],
        wallet3
      );

      simnet.callPublicFn(
        "disputes",
        "submit-response",
        [Cl.uint(1), Cl.stringAscii("Response"), Cl.stringAscii("ipfs://proof")],
        wallet1
      );

      // Resolve in favor of complainant
      simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [Cl.uint(1), Cl.uint(1), Cl.stringAscii("Fraud confirmed"), Cl.uint(2)], // Suspension penalty
        deployer
      );

      // Certifier revokes certification
      const revokeResult = simnet.callPublicFn(
        "certification",
        "revoke-certification",
        [Cl.uint(1), Cl.stringAscii("Revoked due to confirmed fraud in dispute")],
        wallet2
      );
      expect(revokeResult.result).toBeOk(Cl.bool(true));

      // Verify certification is no longer valid
      const isValid = simnet.callReadOnlyFn(
        "certification",
        "is-certification-valid",
        [Cl.uint(1)],
        deployer
      );
      expect(isValid.result).toStrictEqual(Cl.bool(false));
    });
  });

  // ============================================================================
  // NFT Minting After Verification Tests
  // ============================================================================
  describe("Product Lifecycle: Verification to NFT", () => {
    it("should mint NFT for verified product", () => {
      // Setup: Create and verify product
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [Cl.stringAscii("NFT Artisan"), Cl.stringAscii("Creates NFT-worthy products"), Cl.stringAscii("Tokyo, Japan")],
        wallet1
      );

      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringAscii("Premium Ceramic Vase"),
          Cl.stringAscii("Ceramics"),
          Cl.stringAscii("Hand-thrown porcelain vase with traditional Japanese glaze"),
          Cl.stringAscii("ipfs://QmCeramicVase"),
        ],
        wallet1
      );

      // Certify via registry (using existing certification in registry)
      simnet.callPublicFn(
        "registry",
        "register-certifier",
        [Cl.principal(wallet2), Cl.stringAscii("Japanese Craft Authority"), Cl.uint(0)],
        deployer
      );

      simnet.callPublicFn(
        "registry",
        "certify-product",
        [Cl.uint(1), Cl.stringAscii("Meets traditional standards")],
        wallet2
      );

      // Mint NFT for verified product
      const mintResult = simnet.callPublicFn(
        "nft",
        "mint",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("Premium Ceramic Vase"),
          Cl.stringAscii("Ceramics"),
          Cl.stringAscii("ipfs://QmCeramicVase"),
          Cl.uint(1), // Product ID
        ],
        deployer
      );
      expect(mintResult.result).toBeOk(Cl.uint(1));

      // Verify NFT ownership
      const owner = simnet.callReadOnlyFn("nft", "get-owner", [Cl.uint(1)], deployer);
      expect(owner.result).toBeOk(Cl.some(Cl.principal(wallet1)));

      // Link NFT to product in registry
      const linkResult = simnet.callPublicFn(
        "registry",
        "link-nft-to-product",
        [Cl.uint(1), Cl.uint(1)],
        deployer
      );
      expect(linkResult.result).toBeOk(Cl.bool(true));
    });
  });

  // ============================================================================
  // Multi-Party Workflow Tests
  // ============================================================================
  describe("Multi-Party Workflows", () => {
    it("should handle full marketplace flow after certification", () => {
      // 1. Artisan registers and creates product
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [Cl.stringAscii("Seller"), Cl.stringAscii("Bio"), Cl.stringAscii("Location")],
        wallet1
      );

      simnet.callPublicFn(
        "registry",
        "register-product",
        [Cl.stringAscii("Sellable Item"), Cl.stringAscii("Art"), Cl.stringAscii("Desc"), Cl.stringAscii("ipfs://item")],
        wallet1
      );

      // 2. Get certified
      simnet.callPublicFn(
        "certification",
        "register-certifier",
        [Cl.principal(wallet3), Cl.stringAscii("Art Authority"), Cl.stringAscii("Desc"), Cl.uint(2), Cl.list([])],
        deployer
      );

      simnet.callPublicFn(
        "certification",
        "issue-certification",
        [Cl.uint(1), Cl.uint(4), Cl.stringAscii("Platinum certified"), Cl.stringAscii("ipfs://cert"), Cl.uint(0)],
        wallet3
      );

      // 3. Mint NFT
      simnet.callPublicFn(
        "nft",
        "mint",
        [Cl.principal(wallet1), Cl.stringAscii("Sellable Item"), Cl.stringAscii("Art"), Cl.stringAscii("ipfs://item"), Cl.uint(1)],
        deployer
      );

      // 4. List for sale
      const listResult = simnet.callPublicFn(
        "nft",
        "list-for-sale",
        [Cl.uint(1), Cl.uint(5000000)], // 5 STX
        wallet1
      );
      expect(listResult.result).toBeOk(Cl.bool(true));

      // 5. Buyer purchases
      const buyResult = simnet.callPublicFn("nft", "buy", [Cl.uint(1)], wallet2);
      expect(buyResult.result).toBeOk(Cl.bool(true));

      // Verify ownership transferred
      const newOwner = simnet.callReadOnlyFn("nft", "get-owner", [Cl.uint(1)], deployer);
      expect(newOwner.result).toBeOk(Cl.some(Cl.principal(wallet2)));
    });

    it("should handle arbiter-mediated dispute resolution", () => {
      // Setup product
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [Cl.stringAscii("Disputed Artisan"), Cl.stringAscii("Bio"), Cl.stringAscii("Location")],
        wallet1
      );

      simnet.callPublicFn(
        "registry",
        "register-product",
        [Cl.stringAscii("Disputed Product"), Cl.stringAscii("Category"), Cl.stringAscii("Desc"), Cl.stringAscii("ipfs://meta")],
        wallet1
      );

      // Submit dispute
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet1), Cl.uint(2), Cl.stringAscii("Misrepresentation"), Cl.stringAscii("Product not as described")],
        wallet2
      );

      // Artisan responds
      simnet.callPublicFn(
        "disputes",
        "submit-response",
        [Cl.uint(1), Cl.stringAscii("Product is exactly as described"), Cl.stringAscii("ipfs://proof")],
        wallet1
      );

      // Register arbiters
      simnet.callPublicFn(
        "disputes",
        "register-arbiter",
        [Cl.principal(wallet3), Cl.stringAscii("Arbiter 1"), Cl.list([Cl.uint(2)])],
        deployer
      );

      simnet.callPublicFn(
        "disputes",
        "register-arbiter",
        [Cl.principal(wallet4), Cl.stringAscii("Arbiter 2"), Cl.list([Cl.uint(2)])],
        deployer
      );

      // Start voting
      simnet.callPublicFn("disputes", "start-voting", [Cl.uint(1)], deployer);

      // Arbiters vote
      simnet.callPublicFn(
        "disputes",
        "cast-vote",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("Product matches description")],
        wallet3
      );

      simnet.callPublicFn(
        "disputes",
        "cast-vote",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("Agree with artisan")],
        wallet4
      );

      // Check vote counts
      const votes = simnet.callReadOnlyFn("disputes", "get-dispute-vote-counts", [Cl.uint(1)], deployer);
      expect(votes.result.type).toBe(ClarityType.Tuple);

      // Admin resolves based on votes
      const resolveResult = simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("Arbiters voted in favor of artisan"), Cl.uint(0)],
        deployer
      );
      expect(resolveResult.result).toBeOk(Cl.bool(true));
    });
  });

  // ============================================================================
  // Edge Case Integration Tests
  // ============================================================================
  describe("Edge Cases and Error Handling", () => {
    it("should prevent actions on products during active dispute", () => {
      // Setup
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [Cl.stringAscii("Artisan"), Cl.stringAscii("Bio"), Cl.stringAscii("Location")],
        wallet1
      );

      simnet.callPublicFn(
        "registry",
        "register-product",
        [Cl.stringAscii("Product"), Cl.stringAscii("Cat"), Cl.stringAscii("Desc"), Cl.stringAscii("ipfs://meta")],
        wallet1
      );

      // Create dispute
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet1), Cl.uint(1), Cl.stringAscii("Dispute"), Cl.stringAscii("Desc")],
        wallet2
      );

      // Verify another dispute cannot be created
      const duplicateDispute = simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet1), Cl.uint(2), Cl.stringAscii("Another"), Cl.stringAscii("Desc")],
        wallet3
      );
      expect(duplicateDispute.result).toBeErr(Cl.uint(402)); // ERR-ALREADY-EXISTS
    });

    it("should handle concurrent certifications from multiple authorities", () => {
      // Setup
      simnet.callPublicFn(
        "registry",
        "register-artisan",
        [Cl.stringAscii("Multi-Cert Artisan"), Cl.stringAscii("Bio"), Cl.stringAscii("Location")],
        wallet1
      );

      simnet.callPublicFn(
        "registry",
        "register-product",
        [Cl.stringAscii("Premium Product"), Cl.stringAscii("Cat"), Cl.stringAscii("Desc"), Cl.stringAscii("ipfs://meta")],
        wallet1
      );

      // Register multiple certifiers of different types
      const certifiers = [
        { wallet: wallet2, name: "Government Body", type: 1 },
        { wallet: wallet3, name: "Trade Association", type: 2 },
        { wallet: wallet4, name: "Third Party Auditor", type: 3 },
      ];

      certifiers.forEach((c, i) => {
        simnet.callPublicFn(
          "certification",
          "register-certifier",
          [Cl.principal(c.wallet), Cl.stringAscii(c.name), Cl.stringAscii("Desc"), Cl.uint(c.type), Cl.list([])],
          deployer
        );
      });

      // Each certifier issues certification at different tier
      const tiers = [1, 2, 4]; // Bronze, Silver, Platinum
      certifiers.forEach((c, i) => {
        const result = simnet.callPublicFn(
          "certification",
          "issue-certification",
          [Cl.uint(1), Cl.uint(tiers[i]), Cl.stringAscii(`${c.name} certification`), Cl.stringAscii(`ipfs://cert${i}`), Cl.uint(0)],
          c.wallet
        );
        expect(result.result).toBeOk(Cl.uint(i + 1));
      });

      // Verify highest tier
      const highestTier = simnet.callReadOnlyFn(
        "certification",
        "get-product-highest-tier",
        [Cl.uint(1)],
        deployer
      );
      expect(highestTier.result).toStrictEqual(Cl.uint(4)); // Platinum
    });
  });
});
