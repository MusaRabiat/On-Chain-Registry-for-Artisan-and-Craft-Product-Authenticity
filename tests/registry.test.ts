import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const artisan1 = accounts.get("wallet_1")!;
const artisan2 = accounts.get("wallet_2")!;
const admin = accounts.get("deployer")!;

describe("Registry Contract - Product Registration", () => {
  beforeEach(() => {
    simnet.setEpoch("3.2");
  });

  describe("Initialization", () => {
    it("should initialize with zero products", () => {
      const { result } = simnet.callReadOnlyFn(
        "registry",
        "get-total-products",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.uint(0));
    });

    it("should return zero products for new artisan", () => {
      const { result } = simnet.callReadOnlyFn(
        "registry",
        "get-artisan-product-count",
        [Cl.principal(artisan1)],
        deployer
      );
      expect(result).toBeOk(Cl.uint(0));
    });
  });

  describe("Product Registration", () => {
    it("should successfully register a new product", () => {
      const { result } = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Handwoven Silk Scarf"),
          Cl.uint(0), // CATEGORY_TEXTILES
          Cl.stringUtf8("Beautiful handwoven silk scarf with traditional patterns"),
          Cl.stringUtf8("100% pure silk, natural dyes"),
          Cl.stringUtf8("Varanasi, India"),
          Cl.uint(1640995200), // production date timestamp
          Cl.stringUtf8("ipfs://QmProduct123"),
        ],
        artisan1
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it("should increment product ID for each registration", () => {
      // Register first product
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Product 1"),
          Cl.uint(0),
          Cl.stringUtf8("Description 1"),
          Cl.stringUtf8("Materials 1"),
          Cl.stringUtf8("Location 1"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct1"),
        ],
        artisan1
      );

      // Register second product
      const { result } = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Product 2"),
          Cl.uint(1),
          Cl.stringUtf8("Description 2"),
          Cl.stringUtf8("Materials 2"),
          Cl.stringUtf8("Location 2"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct2"),
        ],
        artisan1
      );

      expect(result).toBeOk(Cl.uint(2));
    });

    it("should reject registration with empty product name", () => {
      const { result } = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8(""),
          Cl.uint(0),
          Cl.stringUtf8("Description"),
          Cl.stringUtf8("Materials"),
          Cl.stringUtf8("Location"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct123"),
        ],
        artisan1
      );
      expect(result).toBeErr(Cl.uint(203)); // ERR_INVALID_INPUT
    });

    it("should reject registration with invalid category", () => {
      const { result } = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Test Product"),
          Cl.uint(99), // Invalid category
          Cl.stringUtf8("Description"),
          Cl.stringUtf8("Materials"),
          Cl.stringUtf8("Location"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct123"),
        ],
        artisan1
      );
      expect(result).toBeErr(Cl.uint(204)); // ERR_INVALID_CATEGORY
    });

    it("should reject registration with empty location", () => {
      const { result } = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Test Product"),
          Cl.uint(0),
          Cl.stringUtf8("Description"),
          Cl.stringUtf8("Materials"),
          Cl.stringUtf8(""),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct123"),
        ],
        artisan1
      );
      expect(result).toBeErr(Cl.uint(205)); // ERR_INVALID_LOCATION
    });

    it("should reject registration with empty metadata URI", () => {
      const { result } = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Test Product"),
          Cl.uint(0),
          Cl.stringUtf8("Description"),
          Cl.stringUtf8("Materials"),
          Cl.stringUtf8("Location"),
          Cl.uint(1640995200),
          Cl.stringUtf8(""),
        ],
        artisan1
      );
      expect(result).toBeErr(Cl.uint(203)); // ERR_INVALID_INPUT
    });

    it("should prevent duplicate product names per artisan", () => {
      const productName = "Unique Product Name";

      // Register first product
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8(productName),
          Cl.uint(0),
          Cl.stringUtf8("Description"),
          Cl.stringUtf8("Materials"),
          Cl.stringUtf8("Location"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct1"),
        ],
        artisan1
      );

      // Try to register duplicate
      const { result } = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8(productName),
          Cl.uint(0),
          Cl.stringUtf8("Different Description"),
          Cl.stringUtf8("Different Materials"),
          Cl.stringUtf8("Different Location"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct2"),
        ],
        artisan1
      );

      expect(result).toBeErr(Cl.uint(202)); // ERR_ALREADY_REGISTERED
    });

    it("should allow different artisans to use same product name", () => {
      const productName = "Handmade Pottery";

      // Artisan 1 registers
      const result1 = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8(productName),
          Cl.uint(2),
          Cl.stringUtf8("Description 1"),
          Cl.stringUtf8("Materials 1"),
          Cl.stringUtf8("Location 1"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct1"),
        ],
        artisan1
      );

      // Artisan 2 registers same name
      const result2 = simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8(productName),
          Cl.uint(2),
          Cl.stringUtf8("Description 2"),
          Cl.stringUtf8("Materials 2"),
          Cl.stringUtf8("Location 2"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct2"),
        ],
        artisan2
      );

      expect(result1.result).toBeOk(Cl.uint(1));
      expect(result2.result).toBeOk(Cl.uint(2));
    });

    it("should mint NFT automatically on registration", () => {
      // Register product
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Test Product"),
          Cl.uint(0),
          Cl.stringUtf8("Description"),
          Cl.stringUtf8("Materials"),
          Cl.stringUtf8("Location"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct123"),
        ],
        artisan1
      );

      // Check NFT was minted
      const { result } = simnet.callReadOnlyFn(
        "nft",
        "get-owner",
        [Cl.uint(1)],
        deployer
      );
      expect(result).toBeOk(Cl.some(Cl.principal(artisan1)));
    });
  });

  describe("Product Retrieval", () => {
    beforeEach(() => {
      // Register test products
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Test Product 1"),
          Cl.uint(0),
          Cl.stringUtf8("Description 1"),
          Cl.stringUtf8("Materials 1"),
          Cl.stringUtf8("Location 1"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct1"),
        ],
        artisan1
      );
    });

    it("should retrieve product details by ID", () => {
      const { result } = simnet.callReadOnlyFn(
        "registry",
        "get-product",
        [Cl.uint(1)],
        deployer
      );
      expect(result).toBeSome();
    });

    it("should return none for non-existent product", () => {
      const { result } = simnet.callReadOnlyFn(
        "registry",
        "get-product",
        [Cl.uint(999)],
        deployer
      );
      expect(result).toBeNone();
    });

    it("should track total products correctly", () => {
      // Register second product
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Test Product 2"),
          Cl.uint(1),
          Cl.stringUtf8("Description 2"),
          Cl.stringUtf8("Materials 2"),
          Cl.stringUtf8("Location 2"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct2"),
        ],
        artisan1
      );

      const { result } = simnet.callReadOnlyFn(
        "registry",
        "get-total-products",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.uint(2));
    });
  });

  describe("Artisan Product Tracking", () => {
    beforeEach(() => {
      // Register products for artisan1
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Artisan1 Product 1"),
          Cl.uint(0),
          Cl.stringUtf8("Description"),
          Cl.stringUtf8("Materials"),
          Cl.stringUtf8("Location"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct1"),
        ],
        artisan1
      );

      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Artisan1 Product 2"),
          Cl.uint(1),
          Cl.stringUtf8("Description"),
          Cl.stringUtf8("Materials"),
          Cl.stringUtf8("Location"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct2"),
        ],
        artisan1
      );

      // Register product for artisan2
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Artisan2 Product 1"),
          Cl.uint(2),
          Cl.stringUtf8("Description"),
          Cl.stringUtf8("Materials"),
          Cl.stringUtf8("Location"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct3"),
        ],
        artisan2
      );
    });

    it("should correctly count products per artisan", () => {
      const result1 = simnet.callReadOnlyFn(
        "registry",
        "get-artisan-product-count",
        [Cl.principal(artisan1)],
        deployer
      );
      expect(result1.result).toBeOk(Cl.uint(2));

      const result2 = simnet.callReadOnlyFn(
        "registry",
        "get-artisan-product-count",
        [Cl.principal(artisan2)],
        deployer
      );
      expect(result2.result).toBeOk(Cl.uint(1));
    });

    it("should retrieve product by artisan and index", () => {
      const { result } = simnet.callReadOnlyFn(
        "registry",
        "get-artisan-product-at-index",
        [Cl.principal(artisan1), Cl.uint(0)],
        deployer
      );
      expect(result).toBeSome();
    });

    it("should return none for invalid index", () => {
      const { result } = simnet.callReadOnlyFn(
        "registry",
        "get-artisan-product-at-index",
        [Cl.principal(artisan1), Cl.uint(999)],
        deployer
      );
      expect(result).toBeNone();
    });

    it("should check product existence for artisan", () => {
      const exists = simnet.callReadOnlyFn(
        "registry",
        "product-exists-for-artisan",
        [Cl.principal(artisan1), Cl.stringUtf8("Artisan1 Product 1")],
        deployer
      );
      expect(exists.result).toBeBool(true);

      const notExists = simnet.callReadOnlyFn(
        "registry",
        "product-exists-for-artisan",
        [Cl.principal(artisan1), Cl.stringUtf8("Non-existent Product")],
        deployer
      );
      expect(notExists.result).toBeBool(false);
    });
  });

  describe("Product Verification", () => {
    beforeEach(() => {
      // Register a test product
      simnet.callPublicFn(
        "registry",
        "register-product",
        [
          Cl.stringUtf8("Test Product"),
          Cl.uint(0),
          Cl.stringUtf8("Description"),
          Cl.stringUtf8("Materials"),
          Cl.stringUtf8("Location"),
          Cl.uint(1640995200),
          Cl.stringUtf8("ipfs://QmProduct1"),
        ],
        artisan1
      );
    });

    it("should initialize products as unverified", () => {
      const { result } = simnet.callReadOnlyFn(
        "registry",
        "is-product-verified",
        [Cl.uint(1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(false));
    });

    it("should allow admin to verify product", () => {
      const { result } = simnet.callPublicFn(
        "registry",
        "set-product-verified",
        [Cl.uint(1), Cl.bool(true)],
        admin
      );
      expect(result).toBeOk(Cl.bool(true));

      // Check verification status
      const status = simnet.callReadOnlyFn(
        "registry",
        "is-product-verified",
        [Cl.uint(1)],
        deployer
      );
      expect(status.result).toBeOk(Cl.bool(true));
    });

    it("should reject verification from non-admin", () => {
      const { result } = simnet.callPublicFn(
        "registry",
        "set-product-verified",
        [Cl.uint(1), Cl.bool(true)],
        artisan1
      );
      expect(result).toBeErr(Cl.uint(200)); // ERR_UNAUTHORIZED
    });

    it("should return error for non-existent product verification", () => {
      const { result } = simnet.callReadOnlyFn(
        "registry",
        "is-product-verified",
        [Cl.uint(999)],
        deployer
      );
      expect(result).toBeErr(Cl.uint(201)); // ERR_PRODUCT_NOT_FOUND
    });

    it("should allow admin to unverify product", () => {
      // First verify
      simnet.callPublicFn(
        "registry",
        "set-product-verified",
        [Cl.uint(1), Cl.bool(true)],
        admin
      );

      // Then unverify
      const { result } = simnet.callPublicFn(
        "registry",
        "set-product-verified",
        [Cl.uint(1), Cl.bool(false)],
        admin
      );
      expect(result).toBeOk(Cl.bool(true));

      // Check status
      const status = simnet.callReadOnlyFn(
        "registry",
        "is-product-verified",
        [Cl.uint(1)],
        deployer
      );
      expect(status.result).toBeOk(Cl.bool(false));
    });
  });

  describe("Category Validation", () => {
    it("should accept all valid category values (0-9)", () => {
      const categories = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

      categories.forEach((category, index) => {
        const result = simnet.callPublicFn(
          "registry",
          "register-product",
          [
            Cl.stringUtf8(`Product ${index}`),
            Cl.uint(category),
            Cl.stringUtf8("Description"),
            Cl.stringUtf8("Materials"),
            Cl.stringUtf8("Location"),
            Cl.uint(1640995200),
            Cl.stringUtf8(`ipfs://QmProduct${index}"),
          ],
          artisan1
        );
        expect(result.result).toBeOk(Cl.uint(index + 1));
      });
    });
  });
});
