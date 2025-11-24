;; title: registry
;; version: 1.0.0
;; summary: Core registry for artisan and craft product authenticity
;; description: Manages product registration, ownership tracking, and metadata for artisan products.
;;              Each registered product is linked to a unique NFT for immutable provenance.

;; traits
;;

;; token definitions
;;

;; constants
;;
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u200))
(define-constant ERR_PRODUCT_NOT_FOUND (err u201))
(define-constant ERR_ALREADY_REGISTERED (err u202))
(define-constant ERR_INVALID_INPUT (err u203))
(define-constant ERR_INVALID_CATEGORY (err u204))
(define-constant ERR_INVALID_LOCATION (err u205))
(define-constant ERR_NFT_MINT_FAILED (err u206))

;; Product categories (0-9 for MVP)
(define-constant CATEGORY_TEXTILES u0)
(define-constant CATEGORY_JEWELRY u1)
(define-constant CATEGORY_CERAMICS u2)
(define-constant CATEGORY_WOODWORK u3)
(define-constant CATEGORY_METALWORK u4)
(define-constant CATEGORY_LEATHER u5)
(define-constant CATEGORY_GLASS u6)
(define-constant CATEGORY_PAPER u7)
(define-constant CATEGORY_FOOD u8)
(define-constant CATEGORY_OTHER u9)

;; data vars
;;
(define-data-var last-product-id uint u0)

;; data maps
;;
(define-map products
  uint ;; product-id
  {
    artisan: principal,
    product-name: (string-utf8 128),
    category: uint,
    description: (string-utf8 512),
    materials: (string-utf8 256),
    production-location: (string-utf8 128),
    production-date: uint,
    metadata-uri: (string-utf8 256),
    nft-token-id: uint,
    registered-at: uint,
    verified: bool
  }
)

;; Map to track products per artisan for enumeration
(define-map artisan-product-count principal uint)
(define-map artisan-product-at-index { artisan: principal, index: uint } uint)

;; Map to prevent duplicate registrations by name per artisan
(define-map product-uniqueness { artisan: principal, product-name: (string-utf8 128) } bool)

;; public functions
;;

;; Register a new artisan product and mint its authenticity NFT
(define-public (register-product
  (product-name (string-utf8 128))
  (category uint)
  (description (string-utf8 512))
  (materials (string-utf8 256))
  (production-location (string-utf8 128))
  (production-date uint)
  (metadata-uri (string-utf8 256))
)
  (let
    (
      (new-product-id (+ (var-get last-product-id) u1))
      (artisan tx-sender)
      (artisan-count (default-to u0 (map-get? artisan-product-count artisan)))
    )
    ;; Input validation
    (asserts! (> (len product-name) u0) ERR_INVALID_INPUT)
    (asserts! (<= category CATEGORY_OTHER) ERR_INVALID_CATEGORY)
    (asserts! (> (len production-location) u0) ERR_INVALID_LOCATION)
    (asserts! (> (len metadata-uri) u0) ERR_INVALID_INPUT)
    
    ;; Check uniqueness per artisan
    (asserts! (is-none (map-get? product-uniqueness { artisan: artisan, product-name: product-name })) 
              ERR_ALREADY_REGISTERED)
    
    ;; Mint NFT for this product (call nft contract)
    (let
      (
        (nft-result (try! (contract-call? .nft mint artisan metadata-uri)))
      )
      ;; Store product record
      (map-set products new-product-id {
        artisan: artisan,
        product-name: product-name,
        category: category,
        description: description,
        materials: materials,
        production-location: production-location,
        production-date: production-date,
        metadata-uri: metadata-uri,
        nft-token-id: nft-result,
        registered-at: stacks-block-height,
        verified: false
      })
      
      ;; Update artisan product tracking
      (map-set artisan-product-count artisan (+ artisan-count u1))
      (map-set artisan-product-at-index { artisan: artisan, index: artisan-count } new-product-id)
      
      ;; Mark uniqueness
      (map-set product-uniqueness { artisan: artisan, product-name: product-name } true)
      
      ;; Update last product ID
      (var-set last-product-id new-product-id)
      
      (ok new-product-id)
    )
  )
)

;; Update product verification status (admin or certifier only for now)
(define-public (set-product-verified (product-id uint) (verified bool))
  (let
    (
      (product (unwrap! (map-get? products product-id) ERR_PRODUCT_NOT_FOUND))
    )
    ;; Only contract owner can verify for MVP (later: add certifier role)
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    
    ;; Update verification status
    (map-set products product-id (merge product { verified: verified }))
    (ok true)
  )
)

;; read only functions
;;

;; Get product details by ID
(define-read-only (get-product (product-id uint))
  (map-get? products product-id)
)

;; Get total number of products registered
(define-read-only (get-total-products)
  (ok (var-get last-product-id))
)

;; Get number of products registered by an artisan
(define-read-only (get-artisan-product-count (artisan principal))
  (ok (default-to u0 (map-get? artisan-product-count artisan)))
)

;; Get product ID by artisan and index (for pagination)
(define-read-only (get-artisan-product-at-index (artisan principal) (index uint))
  (map-get? artisan-product-at-index { artisan: artisan, index: index })
)

;; Check if a product is verified
(define-read-only (is-product-verified (product-id uint))
  (match (map-get? products product-id)
    product (ok (get verified product))
    (err ERR_PRODUCT_NOT_FOUND)
  )
)

;; Get product by artisan and name (for checking duplicates)
(define-read-only (product-exists-for-artisan (artisan principal) (product-name (string-utf8 128)))
  (is-some (map-get? product-uniqueness { artisan: artisan, product-name: product-name }))
)

;; private functions
;;

