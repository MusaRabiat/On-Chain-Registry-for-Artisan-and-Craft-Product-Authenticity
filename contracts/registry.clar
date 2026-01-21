;; Artisan Product Registry Contract
;; Core registry for artisan craft products with verification and certification support
;; Manages product registration, artisan profiles, certifiers, and product lifecycle

;; ========================================
;; Constants
;; ========================================

(define-constant CONTRACT-OWNER tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u200))
(define-constant ERR-NOT-FOUND (err u201))
(define-constant ERR-ALREADY-EXISTS (err u202))
(define-constant ERR-INVALID-STATUS (err u203))
(define-constant ERR-INVALID-INPUT (err u204))
(define-constant ERR-NOT-ARTISAN (err u205))
(define-constant ERR-NOT-CERTIFIER (err u206))
(define-constant ERR-ALREADY-VERIFIED (err u207))
(define-constant ERR-PRODUCT-NOT-PENDING (err u208))
(define-constant ERR-DISPUTE-EXISTS (err u209))
(define-constant ERR-NO-DISPUTE (err u210))
(define-constant ERR-DISPUTE-RESOLVED (err u211))

;; Product status constants
(define-constant STATUS-PENDING u0)
(define-constant STATUS-VERIFIED u1)
(define-constant STATUS-DISPUTED u2)
(define-constant STATUS-RESOLVED u3)
(define-constant STATUS-REJECTED u4)

;; Certifier types
(define-constant CERTIFIER-TYPE-GOVERNMENT u0)
(define-constant CERTIFIER-TYPE-ASSOCIATION u1)
(define-constant CERTIFIER-TYPE-THIRD-PARTY u2)

;; ========================================
;; Data Variables
;; ========================================

;; Counter for product IDs
(define-data-var product-id-counter uint u0)

;; Counter for artisan IDs
(define-data-var artisan-id-counter uint u0)

;; Counter for certifier IDs
(define-data-var certifier-id-counter uint u0)

;; Counter for dispute IDs
(define-data-var dispute-id-counter uint u0)

;; ========================================
;; Data Maps
;; ========================================

;; ---- Artisan Maps ----

;; Map artisan principal to their ID
(define-map artisan-ids principal uint)

;; Map artisan ID to their profile
(define-map artisans uint {
  owner: principal,
  name: (string-ascii 128),
  bio: (string-ascii 256),
  location: (string-ascii 128),
  verified: bool,
  product-count: uint,
  created-at: uint
})

;; ---- Certifier Maps ----

;; Map certifier principal to their ID
(define-map certifier-ids principal uint)

;; Map certifier ID to their profile
(define-map certifiers uint {
  owner: principal,
  name: (string-ascii 128),
  certifier-type: uint,
  active: bool,
  certification-count: uint,
  created-at: uint
})

;; ---- Product Maps ----

;; Map product ID to product data
(define-map products uint {
  artisan-id: uint,
  name: (string-ascii 128),
  category: (string-ascii 64),
  description: (string-ascii 256),
  metadata-uri: (string-ascii 256),
  status: uint,
  nft-id: (optional uint),
  created-at: uint,
  updated-at: uint
})

;; Map product ID to its certifications
(define-map product-certifications {product-id: uint, certifier-id: uint} {
  status: uint,
  notes: (string-ascii 256),
  certified-at: uint
})

;; Track certification count per product
(define-map product-certification-count uint uint)

;; ---- Dispute Maps ----

;; Map dispute ID to dispute data
(define-map disputes uint {
  product-id: uint,
  complainant: principal,
  reason: (string-ascii 512),
  status: uint,
  resolution: (optional (string-ascii 256)),
  created-at: uint,
  resolved-at: (optional uint)
})

;; Map product ID to dispute ID (one active dispute per product)
(define-map product-disputes uint uint)

;; ========================================
;; Read-Only Functions - Artisans
;; ========================================

;; Get artisan ID by principal
(define-read-only (get-artisan-id (artisan principal))
  (map-get? artisan-ids artisan)
)

;; Get artisan profile by ID
(define-read-only (get-artisan (artisan-id uint))
  (map-get? artisans artisan-id)
)

;; Get artisan profile by principal
(define-read-only (get-artisan-by-principal (artisan principal))
  (match (map-get? artisan-ids artisan)
    id (map-get? artisans id)
    none
  )
)

;; Check if principal is a registered artisan
(define-read-only (is-artisan (account principal))
  (is-some (map-get? artisan-ids account))
)

;; Get total artisan count
(define-read-only (get-artisan-count)
  (var-get artisan-id-counter)
)

;; ========================================
;; Read-Only Functions - Certifiers
;; ========================================

;; Get certifier ID by principal
(define-read-only (get-certifier-id (certifier principal))
  (map-get? certifier-ids certifier)
)

;; Get certifier profile by ID
(define-read-only (get-certifier (certifier-id uint))
  (map-get? certifiers certifier-id)
)

;; Check if principal is a registered and active certifier
(define-read-only (is-active-certifier (account principal))
  (match (map-get? certifier-ids account)
    id (match (map-get? certifiers id)
      certifier (get active certifier)
      false
    )
    false
  )
)

;; Get total certifier count
(define-read-only (get-certifier-count)
  (var-get certifier-id-counter)
)

;; ========================================
;; Read-Only Functions - Products
;; ========================================

;; Get product by ID
(define-read-only (get-product (product-id uint))
  (map-get? products product-id)
)

;; Get product status
(define-read-only (get-product-status (product-id uint))
  (match (map-get? products product-id)
    product (some (get status product))
    none
  )
)

;; Check if product exists
(define-read-only (product-exists (product-id uint))
  (is-some (map-get? products product-id))
)

;; Get total product count
(define-read-only (get-product-count)
  (var-get product-id-counter)
)

;; Get certification for a product by a specific certifier
(define-read-only (get-certification (product-id uint) (certifier-id uint))
  (map-get? product-certifications {product-id: product-id, certifier-id: certifier-id})
)

;; Get number of certifications for a product
(define-read-only (get-product-certification-count (product-id uint))
  (default-to u0 (map-get? product-certification-count product-id))
)

;; ========================================
;; Read-Only Functions - Disputes
;; ========================================

;; Get dispute by ID
(define-read-only (get-dispute (dispute-id uint))
  (map-get? disputes dispute-id)
)

;; Get dispute ID for a product
(define-read-only (get-product-dispute-id (product-id uint))
  (map-get? product-disputes product-id)
)

;; Check if product has an active dispute
(define-read-only (has-active-dispute (product-id uint))
  (match (map-get? product-disputes product-id)
    dispute-id (match (map-get? disputes dispute-id)
      dispute (is-eq (get status dispute) STATUS-DISPUTED)
      false
    )
    false
  )
)

;; Get total dispute count
(define-read-only (get-dispute-count)
  (var-get dispute-id-counter)
)

;; ========================================
;; Read-Only Functions - Utilities
;; ========================================

;; Get status name as string
(define-read-only (get-status-name (status uint))
  (if (is-eq status STATUS-PENDING)
    "pending"
    (if (is-eq status STATUS-VERIFIED)
      "verified"
      (if (is-eq status STATUS-DISPUTED)
        "disputed"
        (if (is-eq status STATUS-RESOLVED)
          "resolved"
          (if (is-eq status STATUS-REJECTED)
            "rejected"
            "unknown"
          )
        )
      )
    )
  )
)

;; ========================================
;; Public Functions - Artisan Management
;; ========================================

;; Register a new artisan
(define-public (register-artisan 
  (name (string-ascii 128))
  (bio (string-ascii 256))
  (location (string-ascii 128)))
  (let (
    (new-id (+ (var-get artisan-id-counter) u1))
  )
    ;; Check artisan not already registered
    (asserts! (is-none (map-get? artisan-ids tx-sender)) ERR-ALREADY-EXISTS)
    ;; Validate inputs
    (asserts! (> (len name) u0) ERR-INVALID-INPUT)
    
    ;; Create artisan profile
    (map-set artisan-ids tx-sender new-id)
    (map-set artisans new-id {
      owner: tx-sender,
      name: name,
      bio: bio,
      location: location,
      verified: false,
      product-count: u0,
      created-at: stacks-block-height
    })
    
    ;; Update counter
    (var-set artisan-id-counter new-id)
    
    (ok new-id)
  )
)

;; Update artisan profile
(define-public (update-artisan-profile
  (name (string-ascii 128))
  (bio (string-ascii 256))
  (location (string-ascii 128)))
  (let (
    (artisan-id (unwrap! (map-get? artisan-ids tx-sender) ERR-NOT-ARTISAN))
    (artisan (unwrap! (map-get? artisans artisan-id) ERR-NOT-FOUND))
  )
    (asserts! (> (len name) u0) ERR-INVALID-INPUT)
    
    (map-set artisans artisan-id (merge artisan {
      name: name,
      bio: bio,
      location: location
    }))
    
    (ok true)
  )
)

;; Verify an artisan (admin only)
(define-public (verify-artisan (artisan-id uint))
  (let (
    (artisan (unwrap! (map-get? artisans artisan-id) ERR-NOT-FOUND))
  )
    ;; Only contract owner can verify artisans
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    
    (map-set artisans artisan-id (merge artisan {verified: true}))
    
    (ok true)
  )
)

;; ========================================
;; Public Functions - Certifier Management
;; ========================================

;; Register a new certifier (admin only)
(define-public (register-certifier
  (certifier-principal principal)
  (name (string-ascii 128))
  (certifier-type uint))
  (let (
    (new-id (+ (var-get certifier-id-counter) u1))
  )
    ;; Only contract owner can register certifiers
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Check certifier not already registered
    (asserts! (is-none (map-get? certifier-ids certifier-principal)) ERR-ALREADY-EXISTS)
    ;; Validate certifier type
    (asserts! (<= certifier-type CERTIFIER-TYPE-THIRD-PARTY) ERR-INVALID-INPUT)
    
    ;; Create certifier profile
    (map-set certifier-ids certifier-principal new-id)
    (map-set certifiers new-id {
      owner: certifier-principal,
      name: name,
      certifier-type: certifier-type,
      active: true,
      certification-count: u0,
      created-at: stacks-block-height
    })
    
    ;; Update counter
    (var-set certifier-id-counter new-id)
    
    (ok new-id)
  )
)

;; Deactivate a certifier (admin only)
(define-public (deactivate-certifier (certifier-id uint))
  (let (
    (certifier (unwrap! (map-get? certifiers certifier-id) ERR-NOT-FOUND))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    
    (map-set certifiers certifier-id (merge certifier {active: false}))
    
    (ok true)
  )
)

;; Reactivate a certifier (admin only)
(define-public (reactivate-certifier (certifier-id uint))
  (let (
    (certifier (unwrap! (map-get? certifiers certifier-id) ERR-NOT-FOUND))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    
    (map-set certifiers certifier-id (merge certifier {active: true}))
    
    (ok true)
  )
)

;; ========================================
;; Public Functions - Product Management
;; ========================================

;; Register a new product
(define-public (register-product
  (name (string-ascii 128))
  (category (string-ascii 64))
  (description (string-ascii 256))
  (metadata-uri (string-ascii 256)))
  (let (
    (artisan-id (unwrap! (map-get? artisan-ids tx-sender) ERR-NOT-ARTISAN))
    (artisan (unwrap! (map-get? artisans artisan-id) ERR-NOT-FOUND))
    (new-product-id (+ (var-get product-id-counter) u1))
  )
    ;; Validate inputs
    (asserts! (> (len name) u0) ERR-INVALID-INPUT)
    (asserts! (> (len category) u0) ERR-INVALID-INPUT)
    
    ;; Create product
    (map-set products new-product-id {
      artisan-id: artisan-id,
      name: name,
      category: category,
      description: description,
      metadata-uri: metadata-uri,
      status: STATUS-PENDING,
      nft-id: none,
      created-at: stacks-block-height,
      updated-at: stacks-block-height
    })
    
    ;; Update artisan product count
    (map-set artisans artisan-id (merge artisan {
      product-count: (+ (get product-count artisan) u1)
    }))
    
    ;; Update product counter
    (var-set product-id-counter new-product-id)
    
    (ok new-product-id)
  )
)

;; Update product metadata
(define-public (update-product
  (product-id uint)
  (name (string-ascii 128))
  (description (string-ascii 256))
  (metadata-uri (string-ascii 256)))
  (let (
    (product (unwrap! (map-get? products product-id) ERR-NOT-FOUND))
    (artisan-id (unwrap! (map-get? artisan-ids tx-sender) ERR-NOT-ARTISAN))
  )
    ;; Verify caller is the product owner
    (asserts! (is-eq artisan-id (get artisan-id product)) ERR-NOT-AUTHORIZED)
    ;; Can only update pending products
    (asserts! (is-eq (get status product) STATUS-PENDING) ERR-PRODUCT-NOT-PENDING)
    ;; Validate inputs
    (asserts! (> (len name) u0) ERR-INVALID-INPUT)
    
    (map-set products product-id (merge product {
      name: name,
      description: description,
      metadata-uri: metadata-uri,
      updated-at: stacks-block-height
    }))
    
    (ok true)
  )
)

;; Link NFT to product (internal use after minting)
(define-public (link-nft-to-product (product-id uint) (nft-id uint))
  (let (
    (product (unwrap! (map-get? products product-id) ERR-NOT-FOUND))
  )
    ;; Only contract owner can link NFTs (called after minting)
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Verify no NFT already linked
    (asserts! (is-none (get nft-id product)) ERR-ALREADY-EXISTS)
    
    (map-set products product-id (merge product {
      nft-id: (some nft-id),
      updated-at: stacks-block-height
    }))
    
    (ok true)
  )
)

;; ========================================
;; Public Functions - Certification
;; ========================================

;; Certify a product
(define-public (certify-product
  (product-id uint)
  (notes (string-ascii 256)))
  (let (
    (certifier-id (unwrap! (map-get? certifier-ids tx-sender) ERR-NOT-CERTIFIER))
    (certifier (unwrap! (map-get? certifiers certifier-id) ERR-NOT-FOUND))
    (product (unwrap! (map-get? products product-id) ERR-NOT-FOUND))
    (current-cert-count (get-product-certification-count product-id))
  )
    ;; Verify certifier is active
    (asserts! (get active certifier) ERR-NOT-CERTIFIER)
    ;; Check product is pending or verified (can add more certifications)
    (asserts! (or (is-eq (get status product) STATUS-PENDING) 
                  (is-eq (get status product) STATUS-VERIFIED)) ERR-INVALID-STATUS)
    ;; Check this certifier hasn't already certified this product
    (asserts! (is-none (map-get? product-certifications {product-id: product-id, certifier-id: certifier-id})) ERR-ALREADY-EXISTS)
    
    ;; Add certification
    (map-set product-certifications {product-id: product-id, certifier-id: certifier-id} {
      status: STATUS-VERIFIED,
      notes: notes,
      certified-at: stacks-block-height
    })
    
    ;; Update certification count
    (map-set product-certification-count product-id (+ current-cert-count u1))
    
    ;; Update certifier stats
    (map-set certifiers certifier-id (merge certifier {
      certification-count: (+ (get certification-count certifier) u1)
    }))
    
    ;; Update product status to verified
    (map-set products product-id (merge product {
      status: STATUS-VERIFIED,
      updated-at: stacks-block-height
    }))
    
    (ok true)
  )
)

;; Reject a product certification
(define-public (reject-product
  (product-id uint)
  (notes (string-ascii 256)))
  (let (
    (certifier-id (unwrap! (map-get? certifier-ids tx-sender) ERR-NOT-CERTIFIER))
    (certifier (unwrap! (map-get? certifiers certifier-id) ERR-NOT-FOUND))
    (product (unwrap! (map-get? products product-id) ERR-NOT-FOUND))
  )
    ;; Verify certifier is active
    (asserts! (get active certifier) ERR-NOT-CERTIFIER)
    ;; Check product is pending
    (asserts! (is-eq (get status product) STATUS-PENDING) ERR-PRODUCT-NOT-PENDING)
    
    ;; Add rejection record
    (map-set product-certifications {product-id: product-id, certifier-id: certifier-id} {
      status: STATUS-REJECTED,
      notes: notes,
      certified-at: stacks-block-height
    })
    
    ;; Update product status to rejected
    (map-set products product-id (merge product {
      status: STATUS-REJECTED,
      updated-at: stacks-block-height
    }))
    
    (ok true)
  )
)

;; ========================================
;; Public Functions - Dispute Resolution
;; ========================================

;; Submit a dispute against a product
(define-public (submit-dispute
  (product-id uint)
  (reason (string-ascii 512)))
  (let (
    (product (unwrap! (map-get? products product-id) ERR-NOT-FOUND))
    (new-dispute-id (+ (var-get dispute-id-counter) u1))
  )
    ;; Validate reason is provided
    (asserts! (> (len reason) u0) ERR-INVALID-INPUT)
    ;; Check product is verified (can only dispute verified products)
    (asserts! (is-eq (get status product) STATUS-VERIFIED) ERR-INVALID-STATUS)
    ;; Check no existing active dispute
    (asserts! (not (has-active-dispute product-id)) ERR-DISPUTE-EXISTS)
    
    ;; Create dispute
    (map-set disputes new-dispute-id {
      product-id: product-id,
      complainant: tx-sender,
      reason: reason,
      status: STATUS-DISPUTED,
      resolution: none,
      created-at: stacks-block-height,
      resolved-at: none
    })
    
    ;; Link dispute to product
    (map-set product-disputes product-id new-dispute-id)
    
    ;; Update product status
    (map-set products product-id (merge product {
      status: STATUS-DISPUTED,
      updated-at: stacks-block-height
    }))
    
    ;; Update counter
    (var-set dispute-id-counter new-dispute-id)
    
    (ok new-dispute-id)
  )
)

;; Resolve a dispute (admin only)
(define-public (resolve-dispute
  (dispute-id uint)
  (resolution (string-ascii 256))
  (uphold-product bool))
  (let (
    (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
    (product-id (get product-id dispute))
    (product (unwrap! (map-get? products product-id) ERR-NOT-FOUND))
  )
    ;; Only contract owner can resolve disputes
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Check dispute is still active
    (asserts! (is-eq (get status dispute) STATUS-DISPUTED) ERR-DISPUTE-RESOLVED)
    ;; Validate resolution
    (asserts! (> (len resolution) u0) ERR-INVALID-INPUT)
    
    ;; Update dispute
    (map-set disputes dispute-id (merge dispute {
      status: STATUS-RESOLVED,
      resolution: (some resolution),
      resolved-at: (some stacks-block-height)
    }))
    
    ;; Update product status based on resolution
    (map-set products product-id (merge product {
      status: (if uphold-product STATUS-VERIFIED STATUS-REJECTED),
      updated-at: stacks-block-height
    }))
    
    (ok true)
  )
)

;; ========================================
;; Admin Functions
;; ========================================

;; Update product status manually (admin only, for edge cases)
(define-public (admin-update-product-status (product-id uint) (new-status uint))
  (let (
    (product (unwrap! (map-get? products product-id) ERR-NOT-FOUND))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (<= new-status STATUS-REJECTED) ERR-INVALID-STATUS)
    
    (map-set products product-id (merge product {
      status: new-status,
      updated-at: stacks-block-height
    }))
    
    (ok true)
  )
)
