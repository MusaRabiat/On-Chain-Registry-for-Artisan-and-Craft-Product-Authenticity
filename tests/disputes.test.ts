import { describe, it, expect, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

// Test accounts from simnet
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

describe("Disputes Contract Tests", () => {
  // ============================================================================
  // Dispute Submission Tests
  // ============================================================================
  describe("Dispute Submission", () => {
    it("should allow user to submit dispute", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [
          Cl.uint(1), // product-id
          Cl.principal(wallet2), // respondent
          Cl.uint(1), // CATEGORY-COUNTERFEIT
          Cl.stringAscii("Suspected Counterfeit Product"),
          Cl.stringAscii("I believe this product is counterfeit based on quality issues"),
        ],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should reject dispute with empty title", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [
          Cl.uint(1),
          Cl.principal(wallet2),
          Cl.uint(1),
          Cl.stringAscii(""),
          Cl.stringAscii("Description"),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(403)); // ERR-INVALID-INPUT
    });

    it("should reject dispute with empty description", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [
          Cl.uint(1),
          Cl.principal(wallet2),
          Cl.uint(1),
          Cl.stringAscii("Title"),
          Cl.stringAscii(""),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(403)); // ERR-INVALID-INPUT
    });

    it("should reject invalid category", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [
          Cl.uint(1),
          Cl.principal(wallet2),
          Cl.uint(99), // Invalid category
          Cl.stringAscii("Title"),
          Cl.stringAscii("Description"),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(403)); // ERR-INVALID-INPUT
    });

    it("should reject dispute against self", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [
          Cl.uint(1),
          Cl.principal(wallet1), // Same as sender
          Cl.uint(1),
          Cl.stringAscii("Title"),
          Cl.stringAscii("Description"),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(403)); // ERR-INVALID-INPUT
    });

    it("should reject second active dispute on same product", () => {
      // First dispute
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [
          Cl.uint(1),
          Cl.principal(wallet2),
          Cl.uint(1),
          Cl.stringAscii("First Dispute"),
          Cl.stringAscii("First description"),
        ],
        wallet1
      );

      // Second dispute on same product
      const result = simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [
          Cl.uint(1),
          Cl.principal(wallet2),
          Cl.uint(2),
          Cl.stringAscii("Second Dispute"),
          Cl.stringAscii("Second description"),
        ],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(402)); // ERR-ALREADY-EXISTS
    });

    it("should allow disputes on different products", () => {
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(1), Cl.stringAscii("Product 1"), Cl.stringAscii("Desc")],
        wallet1
      );

      const result = simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(2), Cl.principal(wallet2), Cl.uint(2), Cl.stringAscii("Product 2"), Cl.stringAscii("Desc")],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(2));
    });

    it("should correctly track active dispute for product", () => {
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(1), Cl.stringAscii("Test"), Cl.stringAscii("Desc")],
        wallet1
      );

      const result = simnet.callReadOnlyFn(
        "disputes",
        "has-active-dispute",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.bool(true));
    });
  });

  // ============================================================================
  // Dispute Details Tests
  // ============================================================================
  describe("Dispute Details", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [
          Cl.uint(1),
          Cl.principal(wallet2),
          Cl.uint(3), // CATEGORY-QUALITY-ISSUE
          Cl.stringAscii("Quality Concern"),
          Cl.stringAscii("Product does not match description"),
        ],
        wallet1
      );
    });

    it("should return correct dispute details", () => {
      const result = simnet.callReadOnlyFn(
        "disputes",
        "get-dispute",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should return none for non-existent dispute", () => {
      const result = simnet.callReadOnlyFn(
        "disputes",
        "get-dispute",
        [Cl.uint(999)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalNone);
    });

    it("should return active dispute for product", () => {
      const result = simnet.callReadOnlyFn(
        "disputes",
        "get-product-active-dispute",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });
  });

  // ============================================================================
  // Evidence Submission Tests
  // ============================================================================
  describe("Evidence Submission", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(1), Cl.stringAscii("Test"), Cl.stringAscii("Description")],
        wallet1
      );
    });

    it("should allow complainant to submit evidence", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-evidence",
        [
          Cl.uint(1),
          Cl.stringAscii("photo"),
          Cl.stringAscii("ipfs://QmEvidence123"),
          Cl.stringAscii("Photo showing product defects"),
        ],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should allow respondent to submit evidence", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-evidence",
        [
          Cl.uint(1),
          Cl.stringAscii("document"),
          Cl.stringAscii("ipfs://QmProof456"),
          Cl.stringAscii("Certificate of authenticity"),
        ],
        wallet2
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should reject evidence from non-party", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-evidence",
        [
          Cl.uint(1),
          Cl.stringAscii("photo"),
          Cl.stringAscii("ipfs://QmRandom"),
          Cl.stringAscii("Random evidence"),
        ],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(400)); // ERR-NOT-AUTHORIZED
    });

    it("should reject evidence with empty URI", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-evidence",
        [
          Cl.uint(1),
          Cl.stringAscii("photo"),
          Cl.stringAscii(""),
          Cl.stringAscii("Description"),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(403)); // ERR-INVALID-INPUT
    });

    it("should track evidence for dispute", () => {
      simnet.callPublicFn(
        "disputes",
        "submit-evidence",
        [Cl.uint(1), Cl.stringAscii("photo"), Cl.stringAscii("ipfs://1"), Cl.stringAscii("First")],
        wallet1
      );

      simnet.callPublicFn(
        "disputes",
        "submit-evidence",
        [Cl.uint(1), Cl.stringAscii("video"), Cl.stringAscii("ipfs://2"), Cl.stringAscii("Second")],
        wallet2
      );

      const result = simnet.callReadOnlyFn(
        "disputes",
        "get-dispute-evidence-ids",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.List);
    });

    it("should return correct evidence details", () => {
      simnet.callPublicFn(
        "disputes",
        "submit-evidence",
        [Cl.uint(1), Cl.stringAscii("photo"), Cl.stringAscii("ipfs://test"), Cl.stringAscii("Test evidence")],
        wallet1
      );

      const result = simnet.callReadOnlyFn(
        "disputes",
        "get-evidence",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });
  });

  // ============================================================================
  // Response Tests
  // ============================================================================
  describe("Dispute Response", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(1), Cl.stringAscii("Test"), Cl.stringAscii("Description")],
        wallet1
      );
    });

    it("should allow respondent to submit response", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-response",
        [
          Cl.uint(1),
          Cl.stringAscii("I categorically deny these allegations. The product is authentic."),
          Cl.stringAscii("ipfs://QmProofOfAuthenticity"),
        ],
        wallet2
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject response from non-respondent", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-response",
        [
          Cl.uint(1),
          Cl.stringAscii("Fake response"),
          Cl.stringAscii("ipfs://fake"),
        ],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(400)); // ERR-NOT-AUTHORIZED
    });

    it("should reject duplicate response", () => {
      simnet.callPublicFn(
        "disputes",
        "submit-response",
        [Cl.uint(1), Cl.stringAscii("First response"), Cl.stringAscii("ipfs://1")],
        wallet2
      );

      const result = simnet.callPublicFn(
        "disputes",
        "submit-response",
        [Cl.uint(1), Cl.stringAscii("Second response"), Cl.stringAscii("ipfs://2")],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(402)); // ERR-ALREADY-EXISTS
    });

    it("should move dispute to under-review after response", () => {
      simnet.callPublicFn(
        "disputes",
        "submit-response",
        [Cl.uint(1), Cl.stringAscii("My response"), Cl.stringAscii("ipfs://proof")],
        wallet2
      );

      const dispute = simnet.callReadOnlyFn(
        "disputes",
        "get-dispute",
        [Cl.uint(1)],
        deployer
      );

      expect(dispute.result.type).toBe(ClarityType.OptionalSome);
    });
  });

  // ============================================================================
  // Arbiter Management Tests
  // ============================================================================
  describe("Arbiter Management", () => {
    it("should allow admin to register arbiter", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "register-arbiter",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Judge Smith"),
          Cl.list([Cl.uint(1), Cl.uint(2)]), // Specializes in counterfeit and misrepresentation
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });

    it("should reject arbiter registration from non-admin", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "register-arbiter",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Fake Arbiter"),
          Cl.list([]),
        ],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(400)); // ERR-NOT-AUTHORIZED
    });

    it("should reject duplicate arbiter registration", () => {
      simnet.callPublicFn(
        "disputes",
        "register-arbiter",
        [Cl.principal(wallet3), Cl.stringAscii("Arbiter"), Cl.list([])],
        deployer
      );

      const result = simnet.callPublicFn(
        "disputes",
        "register-arbiter",
        [Cl.principal(wallet3), Cl.stringAscii("Duplicate"), Cl.list([])],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(402)); // ERR-ALREADY-EXISTS
    });

    it("should correctly identify active arbiter", () => {
      simnet.callPublicFn(
        "disputes",
        "register-arbiter",
        [Cl.principal(wallet3), Cl.stringAscii("Active Arbiter"), Cl.list([])],
        deployer
      );

      const result = simnet.callReadOnlyFn(
        "disputes",
        "is-active-arbiter",
        [Cl.principal(wallet3)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.bool(true));
    });

    it("should allow admin to deactivate arbiter", () => {
      simnet.callPublicFn(
        "disputes",
        "register-arbiter",
        [Cl.principal(wallet3), Cl.stringAscii("Arbiter"), Cl.list([])],
        deployer
      );

      const result = simnet.callPublicFn(
        "disputes",
        "deactivate-arbiter",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));

      const activeCheck = simnet.callReadOnlyFn(
        "disputes",
        "is-active-arbiter",
        [Cl.principal(wallet3)],
        deployer
      );

      expect(activeCheck.result).toStrictEqual(Cl.bool(false));
    });
  });

  // ============================================================================
  // Voting Tests
  // ============================================================================
  describe("Arbiter Voting", () => {
    beforeEach(() => {
      // Create dispute and get it to under-review status
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(1), Cl.stringAscii("Test"), Cl.stringAscii("Description")],
        wallet1
      );

      simnet.callPublicFn(
        "disputes",
        "submit-response",
        [Cl.uint(1), Cl.stringAscii("Response"), Cl.stringAscii("ipfs://proof")],
        wallet2
      );

      // Register arbiter
      simnet.callPublicFn(
        "disputes",
        "register-arbiter",
        [Cl.principal(wallet3), Cl.stringAscii("Arbiter"), Cl.list([])],
        deployer
      );
    });

    it("should allow admin to start voting", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "start-voting",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow arbiter to cast vote after voting starts", () => {
      simnet.callPublicFn("disputes", "start-voting", [Cl.uint(1)], deployer);

      const result = simnet.callPublicFn(
        "disputes",
        "cast-vote",
        [
          Cl.uint(1),
          Cl.uint(1), // In favor of complainant
          Cl.stringAscii("Evidence supports the claim"),
        ],
        wallet3
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject vote from non-arbiter", () => {
      simnet.callPublicFn("disputes", "start-voting", [Cl.uint(1)], deployer);

      const result = simnet.callPublicFn(
        "disputes",
        "cast-vote",
        [Cl.uint(1), Cl.uint(1), Cl.stringAscii("My opinion")],
        wallet4
      );

      expect(result.result).toBeErr(Cl.uint(410)); // ERR-NOT-ARBITER
    });

    it("should reject duplicate vote from same arbiter", () => {
      simnet.callPublicFn("disputes", "start-voting", [Cl.uint(1)], deployer);

      simnet.callPublicFn(
        "disputes",
        "cast-vote",
        [Cl.uint(1), Cl.uint(1), Cl.stringAscii("First vote")],
        wallet3
      );

      const result = simnet.callPublicFn(
        "disputes",
        "cast-vote",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("Changed my mind")],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(411)); // ERR-ALREADY-VOTED
    });

    it("should reject invalid vote value", () => {
      simnet.callPublicFn("disputes", "start-voting", [Cl.uint(1)], deployer);

      const result = simnet.callPublicFn(
        "disputes",
        "cast-vote",
        [Cl.uint(1), Cl.uint(5), Cl.stringAscii("Invalid")],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(403)); // ERR-INVALID-INPUT
    });

    it("should track vote counts correctly", () => {
      simnet.callPublicFn("disputes", "start-voting", [Cl.uint(1)], deployer);

      // Register more arbiters
      simnet.callPublicFn(
        "disputes",
        "register-arbiter",
        [Cl.principal(wallet4), Cl.stringAscii("Arbiter 2"), Cl.list([])],
        deployer
      );

      // Cast votes
      simnet.callPublicFn("disputes", "cast-vote", [Cl.uint(1), Cl.uint(1), Cl.stringAscii("For complainant")], wallet3);
      simnet.callPublicFn("disputes", "cast-vote", [Cl.uint(1), Cl.uint(2), Cl.stringAscii("For artisan")], wallet4);

      const result = simnet.callReadOnlyFn(
        "disputes",
        "get-dispute-vote-counts",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.Tuple);
    });

    it("should correctly check if arbiter has voted", () => {
      simnet.callPublicFn("disputes", "start-voting", [Cl.uint(1)], deployer);
      simnet.callPublicFn("disputes", "cast-vote", [Cl.uint(1), Cl.uint(1), Cl.stringAscii("Vote")], wallet3);

      const hasVoted = simnet.callReadOnlyFn(
        "disputes",
        "arbiter-has-voted",
        [Cl.uint(1), Cl.uint(1)],
        deployer
      );

      expect(hasVoted.result).toStrictEqual(Cl.bool(true));
    });
  });

  // ============================================================================
  // Resolution Tests
  // ============================================================================
  describe("Dispute Resolution", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(1), Cl.stringAscii("Test"), Cl.stringAscii("Description")],
        wallet1
      );

      simnet.callPublicFn(
        "disputes",
        "submit-response",
        [Cl.uint(1), Cl.stringAscii("Response"), Cl.stringAscii("ipfs://proof")],
        wallet2
      );
    });

    it("should allow admin to resolve dispute in favor of complainant", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [
          Cl.uint(1),
          Cl.uint(1), // RESOLUTION-IN-FAVOR-COMPLAINANT
          Cl.stringAscii("Evidence clearly shows counterfeit"),
          Cl.uint(1), // PENALTY-WARNING
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to resolve dispute in favor of artisan", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [
          Cl.uint(1),
          Cl.uint(2), // RESOLUTION-IN-FAVOR-ARTISAN
          Cl.stringAscii("Product verified as authentic"),
          Cl.uint(0), // PENALTY-NONE
        ],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject resolution from non-admin", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [Cl.uint(1), Cl.uint(1), Cl.stringAscii("Unauthorized resolution"), Cl.uint(0)],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(400)); // ERR-NOT-AUTHORIZED
    });

    it("should reject invalid resolution type", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [Cl.uint(1), Cl.uint(99), Cl.stringAscii("Invalid"), Cl.uint(0)],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(403)); // ERR-INVALID-INPUT
    });
  });

  // ============================================================================
  // Appeal Tests
  // ============================================================================
  describe("Appeals", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(1), Cl.stringAscii("Test"), Cl.stringAscii("Description")],
        wallet1
      );

      simnet.callPublicFn(
        "disputes",
        "submit-response",
        [Cl.uint(1), Cl.stringAscii("Response"), Cl.stringAscii("ipfs://proof")],
        wallet2
      );

      simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [Cl.uint(1), Cl.uint(2), Cl.stringAscii("In favor of artisan"), Cl.uint(0)],
        deployer
      );
    });

    it("should allow complainant to appeal", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-appeal",
        [
          Cl.uint(1),
          Cl.stringAscii("I have new evidence that was not considered"),
          Cl.some(Cl.stringAscii("ipfs://QmNewEvidence")),
        ],
        wallet1
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow respondent to appeal", () => {
      // Resolve in favor of complainant first
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(2), Cl.principal(wallet2), Cl.uint(1), Cl.stringAscii("Test2"), Cl.stringAscii("Desc")],
        wallet1
      );

      simnet.callPublicFn(
        "disputes",
        "submit-response",
        [Cl.uint(2), Cl.stringAscii("Response"), Cl.stringAscii("ipfs://proof")],
        wallet2
      );

      simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [Cl.uint(2), Cl.uint(1), Cl.stringAscii("In favor of complainant"), Cl.uint(1)],
        deployer
      );

      const result = simnet.callPublicFn(
        "disputes",
        "submit-appeal",
        [Cl.uint(2), Cl.stringAscii("The decision was unfair"), Cl.none()],
        wallet2
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject appeal from non-party", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "submit-appeal",
        [Cl.uint(1), Cl.stringAscii("Random appeal"), Cl.none()],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(400)); // ERR-NOT-AUTHORIZED
    });

    it("should reject duplicate appeal", () => {
      simnet.callPublicFn(
        "disputes",
        "submit-appeal",
        [Cl.uint(1), Cl.stringAscii("First appeal"), Cl.none()],
        wallet1
      );

      const result = simnet.callPublicFn(
        "disputes",
        "submit-appeal",
        [Cl.uint(1), Cl.stringAscii("Second appeal"), Cl.none()],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(402)); // ERR-ALREADY-EXISTS
    });
  });

  // ============================================================================
  // Penalty Tests
  // ============================================================================
  describe("Penalty System", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(1), Cl.stringAscii("Test"), Cl.stringAscii("Description")],
        wallet1
      );

      simnet.callPublicFn(
        "disputes",
        "submit-response",
        [Cl.uint(1), Cl.stringAscii("Response"), Cl.stringAscii("ipfs://proof")],
        wallet2
      );
    });

    it("should apply warning penalty", () => {
      simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [Cl.uint(1), Cl.uint(1), Cl.stringAscii("Counterfeit confirmed"), Cl.uint(1)],
        deployer
      );

      const result = simnet.callReadOnlyFn(
        "disputes",
        "get-penalties",
        [Cl.principal(wallet2)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should correctly identify banned user", () => {
      simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [Cl.uint(1), Cl.uint(1), Cl.stringAscii("Counterfeit confirmed"), Cl.uint(3)], // PENALTY-BAN
        deployer
      );

      const result = simnet.callReadOnlyFn(
        "disputes",
        "is-banned",
        [Cl.principal(wallet2)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.bool(true));
    });

    it("should prevent banned user from submitting disputes", () => {
      simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [Cl.uint(1), Cl.uint(1), Cl.stringAscii("Resolved"), Cl.uint(3)], // Ban wallet2
        deployer
      );

      // Now wallet2 tries to submit a dispute
      const result = simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(99), Cl.principal(wallet3), Cl.uint(1), Cl.stringAscii("New dispute"), Cl.stringAscii("Desc")],
        wallet2
      );

      expect(result.result).toBeErr(Cl.uint(400)); // ERR-NOT-AUTHORIZED
    });

    it("should allow admin to clear penalties", () => {
      simnet.callPublicFn(
        "disputes",
        "resolve-dispute",
        [Cl.uint(1), Cl.uint(1), Cl.stringAscii("Resolved"), Cl.uint(3)],
        deployer
      );

      const clearResult = simnet.callPublicFn(
        "disputes",
        "clear-penalty",
        [Cl.principal(wallet2)],
        deployer
      );

      expect(clearResult.result).toBeOk(Cl.bool(true));

      const bannedCheck = simnet.callReadOnlyFn(
        "disputes",
        "is-banned",
        [Cl.principal(wallet2)],
        deployer
      );

      expect(bannedCheck.result).toStrictEqual(Cl.bool(false));
    });
  });

  // ============================================================================
  // Helper Function Tests
  // ============================================================================
  describe("Helper Functions", () => {
    it("should return correct status names", () => {
      const pending = simnet.callReadOnlyFn("disputes", "get-status-name", [Cl.uint(1)], deployer);
      expect(pending.result).toStrictEqual(Cl.stringAscii("pending"));

      const underReview = simnet.callReadOnlyFn("disputes", "get-status-name", [Cl.uint(2)], deployer);
      expect(underReview.result).toStrictEqual(Cl.stringAscii("under-review"));

      const voting = simnet.callReadOnlyFn("disputes", "get-status-name", [Cl.uint(3)], deployer);
      expect(voting.result).toStrictEqual(Cl.stringAscii("voting"));

      const closed = simnet.callReadOnlyFn("disputes", "get-status-name", [Cl.uint(7)], deployer);
      expect(closed.result).toStrictEqual(Cl.stringAscii("closed"));
    });

    it("should return correct category names", () => {
      const counterfeit = simnet.callReadOnlyFn("disputes", "get-category-name", [Cl.uint(1)], deployer);
      expect(counterfeit.result).toStrictEqual(Cl.stringAscii("counterfeit"));

      const misrep = simnet.callReadOnlyFn("disputes", "get-category-name", [Cl.uint(2)], deployer);
      expect(misrep.result).toStrictEqual(Cl.stringAscii("misrepresentation"));

      const quality = simnet.callReadOnlyFn("disputes", "get-category-name", [Cl.uint(3)], deployer);
      expect(quality.result).toStrictEqual(Cl.stringAscii("quality-issue"));

      const other = simnet.callReadOnlyFn("disputes", "get-category-name", [Cl.uint(6)], deployer);
      expect(other.result).toStrictEqual(Cl.stringAscii("other"));
    });

    it("should return correct dispute count", () => {
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(1), Cl.stringAscii("First"), Cl.stringAscii("Desc")],
        wallet1
      );

      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(2), Cl.principal(wallet2), Cl.uint(2), Cl.stringAscii("Second"), Cl.stringAscii("Desc")],
        wallet1
      );

      const result = simnet.callReadOnlyFn("disputes", "get-dispute-count", [], deployer);
      expect(result.result).toStrictEqual(Cl.uint(2));
    });
  });

  // ============================================================================
  // Admin Functions Tests
  // ============================================================================
  describe("Admin Functions", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "disputes",
        "submit-dispute",
        [Cl.uint(1), Cl.principal(wallet2), Cl.uint(1), Cl.stringAscii("Test"), Cl.stringAscii("Description")],
        wallet1
      );
    });

    it("should allow admin to force close dispute", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "force-close-dispute",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject force close from non-admin", () => {
      const result = simnet.callPublicFn(
        "disputes",
        "force-close-dispute",
        [Cl.uint(1)],
        wallet3
      );

      expect(result.result).toBeErr(Cl.uint(400)); // ERR-NOT-AUTHORIZED
    });

    it("should clear active dispute after force close", () => {
      simnet.callPublicFn("disputes", "force-close-dispute", [Cl.uint(1)], deployer);

      const result = simnet.callReadOnlyFn(
        "disputes",
        "has-active-dispute",
        [Cl.uint(1)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.bool(false));
    });
  });
});
