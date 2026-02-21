;; Provenance Tracking & Artisan Royalties Contract
;; Tracks full ownership history of artisan product NFTs and enables
;; automatic royalty payments to original artisans on secondary sales.
;;
;; Key Features:
;; - Complete transfer history for every token (who, when, price)
;; - Configurable artisan royalty rates (up to 10%)
;; - Secondary sale execution with automatic royalty splitting
;; - Provenance verification queries for buyers
;; - Certificate of Authenticity summary per token

;; ========================================
;; Constants
;; ========================================

(define-constant CONTRACT-OWNER tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u300))
(define-constant ERR-NOT-FOUND (err u301))
(define-constant ERR-INVALID-INPUT (err u302))
(define-constant ERR-ALREADY-REGISTERED (err u303))
(define-constant ERR-NOT-TOKEN-OWNER (err u304))
(define-constant ERR-SAME-OWNER (err u305))
(define-constant ERR-ROYALTY-TOO-HIGH (err u306))
(define-constant ERR-LISTING-NOT-FOUND (err u307))
(define-constant ERR-WRONG-PRICE (err u308))
(define-constant ERR-INSUFFICIENT-FUNDS (err u309))

;; Royalty configuration limits (in basis points: 100 = 1%)
(define-constant MAX-ROYALTY-BPS u1000) ;; 10% max royalty
(define-constant DEFAULT-ROYALTY-BPS u500) ;; 5% default royalty
(define-constant BPS-DENOMINATOR u10000)

;; Transfer type constants
(define-constant TRANSFER-TYPE-MINT u0)
(define-constant TRANSFER-TYPE-SALE u1)
(define-constant TRANSFER-TYPE-TRANSFER u2)
(define-constant TRANSFER-TYPE-GIFT u3)

;; ========================================
;; Data Variables
;; ========================================

;; Total number of provenance-tracked tokens
(define-data-var tracked-token-count uint u0)

;; Total royalties distributed (in microSTX)
(define-data-var total-royalties-distributed uint u0)

;; Total secondary sales executed through this contract
(define-data-var total-secondary-sales uint u0)

;; ========================================
;; Data Maps
;; ========================================

;; ---- Provenance History ----

;; Map token-id -> total number of transfers recorded
(define-map token-transfer-count uint uint)

;; Map (token-id, transfer-index) -> transfer record
;; Index 0 is always the initial mint/registration
(define-map transfer-history {token-id: uint, index: uint} {
  from: principal,
  to: principal,
  price: uint,
  transfer-type: uint,
  block-height: uint,
  memo: (string-ascii 128)
})

;; ---- Royalty Configuration ----

;; Map token-id -> royalty settings
(define-map token-royalties uint {
  artisan: principal,
  royalty-bps: uint,
  total-earned: uint,
  sale-count: uint
})

;; Map artisan principal -> default royalty rate in basis points
(define-map artisan-default-royalty principal uint)

;; Map artisan principal -> total royalties earned across all tokens
(define-map artisan-total-royalties principal uint)

;; ---- Secondary Marketplace with Royalties ----

;; Map token-id -> listing details
(define-map provenance-listings uint {
  seller: principal,
  price: uint,
  listed-at: uint
})

;; ---- Token Registration ----

;; Map token-id -> whether it's registered for provenance tracking
(define-map tracked-tokens uint {
  registered-at: uint,
  original-artisan: principal,
  product-name: (string-ascii 128),
  product-category: (string-ascii 64)
})

;; ========================================
;; Read-Only Functions - Provenance
;; ========================================

;; Get the number of transfers for a token
(define-read-only (get-transfer-count (token-id uint))
  (default-to u0 (map-get? token-transfer-count token-id))
)

;; Get a specific transfer record by token ID and index
(define-read-only (get-transfer-record (token-id uint) (index uint))
  (map-get? transfer-history {token-id: token-id, index: index})
)

;; Get the latest transfer record for a token
(define-read-only (get-latest-transfer (token-id uint))
  (let (
    (count (get-transfer-count token-id))
  )
    (if (> count u0)
      (map-get? transfer-history {token-id: token-id, index: (- count u1)})
      none
    )
  )
)

;; Check if a token is registered for provenance tracking
(define-read-only (is-tracked (token-id uint))
  (is-some (map-get? tracked-tokens token-id))
)

;; Get token tracking info
(define-read-only (get-tracked-token (token-id uint))
  (map-get? tracked-tokens token-id)
)

;; Get total tracked tokens
(define-read-only (get-tracked-token-count)
  (var-get tracked-token-count)
)

;; ========================================
;; Read-Only Functions - Royalties
;; ========================================

;; Get royalty configuration for a token
(define-read-only (get-token-royalty (token-id uint))
  (map-get? token-royalties token-id)
)

;; Get an artisan's default royalty rate
(define-read-only (get-artisan-default-royalty (artisan principal))
  (default-to DEFAULT-ROYALTY-BPS (map-get? artisan-default-royalty artisan))
)

;; Get total royalties earned by an artisan
(define-read-only (get-artisan-total-royalties (artisan principal))
  (default-to u0 (map-get? artisan-total-royalties artisan))
)

;; Calculate royalty amount for a given sale price and token
(define-read-only (calculate-royalty (token-id uint) (sale-price uint))
  (match (map-get? token-royalties token-id)
    royalty-info (ok (/ (* sale-price (get royalty-bps royalty-info)) BPS-DENOMINATOR))
    (err u301) ;; ERR-NOT-FOUND
  )
)

;; Get total royalties distributed through the contract
(define-read-only (get-total-royalties-distributed)
  (var-get total-royalties-distributed)
)

;; Get total secondary sales count
(define-read-only (get-total-secondary-sales)
  (var-get total-secondary-sales)
)

;; ========================================
;; Read-Only Functions - Marketplace
;; ========================================

;; Get listing details for a token
(define-read-only (get-provenance-listing (token-id uint))
  (map-get? provenance-listings token-id)
)

;; Check if a token is listed for sale
(define-read-only (is-listed (token-id uint))
  (is-some (map-get? provenance-listings token-id))
)

;; ========================================
;; Read-Only Functions - Provenance Summary
;; ========================================

;; Get a comprehensive provenance summary for a token
;; Returns: tracked info, transfer count, royalty config, listing status
(define-read-only (get-provenance-summary (token-id uint))
  (let (
    (tracked-info (map-get? tracked-tokens token-id))
    (transfer-count (get-transfer-count token-id))
    (royalty-info (map-get? token-royalties token-id))
    (listing-info (map-get? provenance-listings token-id))
  )
    (ok {
      is-tracked: (is-some tracked-info),
      transfer-count: transfer-count,
      has-royalty: (is-some royalty-info),
      is-listed: (is-some listing-info),
      royalty-bps: (match royalty-info info (some (get royalty-bps info)) none),
      original-artisan: (match tracked-info info (some (get original-artisan info)) none)
    })
  )
)

;; ========================================
;; Public Functions - Token Registration
;; ========================================

;; Register a token for provenance tracking
;; Called after minting an NFT to set up tracking and royalties
(define-public (register-token
  (token-id uint)
  (artisan principal)
  (product-name (string-ascii 128))
  (product-category (string-ascii 64))
  (royalty-bps uint))
  (let (
    (current-count (var-get tracked-token-count))
  )
    ;; Only contract owner or deployer can register tokens
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Token must not already be tracked
    (asserts! (not (is-tracked token-id)) ERR-ALREADY-REGISTERED)
    ;; Validate royalty rate
    (asserts! (<= royalty-bps MAX-ROYALTY-BPS) ERR-ROYALTY-TOO-HIGH)
    ;; Validate inputs
    (asserts! (> (len product-name) u0) ERR-INVALID-INPUT)

    ;; Register the token
    (map-set tracked-tokens token-id {
      registered-at: stacks-block-height,
      original-artisan: artisan,
      product-name: product-name,
      product-category: product-category
    })

    ;; Set up royalty configuration
    (map-set token-royalties token-id {
      artisan: artisan,
      royalty-bps: royalty-bps,
      total-earned: u0,
      sale-count: u0
    })

    ;; Record the initial mint as the first provenance entry
    (map-set transfer-history {token-id: token-id, index: u0} {
      from: CONTRACT-OWNER,
      to: artisan,
      price: u0,
      transfer-type: TRANSFER-TYPE-MINT,
      block-height: stacks-block-height,
      memo: "Initial mint to artisan"
    })
    (map-set token-transfer-count token-id u1)

    ;; Update global counter
    (var-set tracked-token-count (+ current-count u1))

    (ok true)
  )
)

;; ========================================
;; Public Functions - Royalty Configuration
;; ========================================

;; Set default royalty rate for an artisan
;; Artisans call this to set their preferred royalty for future tokens
(define-public (set-artisan-default-royalty (royalty-bps uint))
  (begin
    (asserts! (<= royalty-bps MAX-ROYALTY-BPS) ERR-ROYALTY-TOO-HIGH)
    (map-set artisan-default-royalty tx-sender royalty-bps)
    (ok true)
  )
)

;; Update royalty rate for a specific token (artisan only)
(define-public (update-token-royalty (token-id uint) (new-royalty-bps uint))
  (let (
    (royalty-info (unwrap! (map-get? token-royalties token-id) ERR-NOT-FOUND))
  )
    ;; Only the original artisan can update royalty rate
    (asserts! (is-eq tx-sender (get artisan royalty-info)) ERR-NOT-AUTHORIZED)
    ;; Validate new rate
    (asserts! (<= new-royalty-bps MAX-ROYALTY-BPS) ERR-ROYALTY-TOO-HIGH)

    (map-set token-royalties token-id (merge royalty-info {
      royalty-bps: new-royalty-bps
    }))

    (ok true)
  )
)

;; ========================================
;; Public Functions - Provenance Recording
;; ========================================

;; Record a transfer in the provenance history
;; Called by admin/contract when a transfer occurs
(define-public (record-transfer
  (token-id uint)
  (from principal)
  (to principal)
  (price uint)
  (transfer-type uint)
  (memo (string-ascii 128)))
  (let (
    (current-count (get-transfer-count token-id))
  )
    ;; Only contract owner can record transfers
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Token must be tracked
    (asserts! (is-tracked token-id) ERR-NOT-FOUND)
    ;; Validate transfer type
    (asserts! (<= transfer-type TRANSFER-TYPE-GIFT) ERR-INVALID-INPUT)

    ;; Record the transfer
    (map-set transfer-history {token-id: token-id, index: current-count} {
      from: from,
      to: to,
      price: price,
      transfer-type: transfer-type,
      block-height: stacks-block-height,
      memo: memo
    })

    ;; Update transfer count
    (map-set token-transfer-count token-id (+ current-count u1))

    (ok true)
  )
)

;; ========================================
;; Public Functions - Secondary Sale with Royalties
;; ========================================

;; List a token for sale with royalty-aware pricing
(define-public (list-with-royalty (token-id uint) (price uint))
  (begin
    ;; Token must be tracked for provenance
    (asserts! (is-tracked token-id) ERR-NOT-FOUND)
    ;; Price must be positive
    (asserts! (> price u0) ERR-WRONG-PRICE)
    ;; Token must not already be listed
    (asserts! (not (is-listed token-id)) ERR-ALREADY-REGISTERED)

    ;; Create listing
    (map-set provenance-listings token-id {
      seller: tx-sender,
      price: price,
      listed-at: stacks-block-height
    })

    (ok true)
  )
)

;; Remove a token listing
(define-public (unlist-token (token-id uint))
  (let (
    (listing (unwrap! (map-get? provenance-listings token-id) ERR-LISTING-NOT-FOUND))
  )
    ;; Only seller can unlist
    (asserts! (is-eq tx-sender (get seller listing)) ERR-NOT-AUTHORIZED)

    (map-delete provenance-listings token-id)
    (ok true)
  )
)

;; Execute a secondary sale with automatic royalty distribution
;; Splits the payment: royalty goes to artisan, remainder to seller
(define-public (execute-sale-with-royalty (token-id uint))
  (let (
    (listing (unwrap! (map-get? provenance-listings token-id) ERR-LISTING-NOT-FOUND))
    (seller (get seller listing))
    (price (get price listing))
    (royalty-info (unwrap! (map-get? token-royalties token-id) ERR-NOT-FOUND))
    (artisan (get artisan royalty-info))
    (royalty-bps (get royalty-bps royalty-info))
    (royalty-amount (/ (* price royalty-bps) BPS-DENOMINATOR))
    (seller-amount (- price royalty-amount))
    (current-transfer-count (get-transfer-count token-id))
    (artisan-current-total (get-artisan-total-royalties artisan))
  )
    ;; Buyer cannot be seller
    (asserts! (not (is-eq tx-sender seller)) ERR-SAME-OWNER)

    ;; Transfer royalty to artisan (if royalty > 0 and artisan != seller)
    (if (and (> royalty-amount u0) (not (is-eq artisan seller)))
      (begin
        (try! (stx-transfer? royalty-amount tx-sender artisan))
        (try! (stx-transfer? seller-amount tx-sender seller))
      )
      ;; If no royalty or artisan is the seller, full amount goes to seller
      (try! (stx-transfer? price tx-sender seller))
    )

    ;; Record the transfer in provenance history
    (map-set transfer-history {token-id: token-id, index: current-transfer-count} {
      from: seller,
      to: tx-sender,
      price: price,
      transfer-type: TRANSFER-TYPE-SALE,
      block-height: stacks-block-height,
      memo: "Secondary sale with royalty"
    })
    (map-set token-transfer-count token-id (+ current-transfer-count u1))

    ;; Update royalty tracking
    (map-set token-royalties token-id (merge royalty-info {
      total-earned: (+ (get total-earned royalty-info) royalty-amount),
      sale-count: (+ (get sale-count royalty-info) u1)
    }))

    ;; Update artisan total royalties
    (map-set artisan-total-royalties artisan (+ artisan-current-total royalty-amount))

    ;; Update global stats
    (var-set total-royalties-distributed (+ (var-get total-royalties-distributed) royalty-amount))
    (var-set total-secondary-sales (+ (var-get total-secondary-sales) u1))

    ;; Remove listing
    (map-delete provenance-listings token-id)

    (ok {
      price: price,
      royalty-paid: royalty-amount,
      seller-received: seller-amount
    })
  )
)
