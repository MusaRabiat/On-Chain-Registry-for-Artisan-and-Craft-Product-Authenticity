;; Artisan Product NFT Contract
;; Implements SIP-009 NFT standard for artisan craft product authenticity tokens
;; Each NFT represents a unique, verified artisan product

;; ========================================
;; Constants
;; ========================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-NOT-FOUND (err u101))
(define-constant ERR-ALREADY-EXISTS (err u102))
(define-constant ERR-NOT-TOKEN-OWNER (err u103))
(define-constant ERR-INVALID-TOKEN (err u104))
(define-constant ERR-LISTING-NOT-FOUND (err u105))
(define-constant ERR-WRONG-PRICE (err u106))
(define-constant ERR-SAME-OWNER (err u107))

;; ========================================
;; SIP-009 Trait Definition
;; ========================================

(define-trait sip009-nft-trait
  (
    ;; Get the last minted token ID
    (get-last-token-id () (response uint uint))
    ;; Get the token URI for metadata
    (get-token-uri (uint) (response (optional (string-ascii 256)) uint))
    ;; Get the owner of a token
    (get-owner (uint) (response (optional principal) uint))
    ;; Transfer a token between principals
    (transfer (uint principal principal) (response bool uint))
  )
)

;; ========================================
;; Data Variables
;; ========================================

;; Track the last minted token ID
(define-data-var last-token-id uint u0)

;; ========================================
;; Data Maps
;; ========================================

;; Map token ID to owner principal
(define-map token-owners uint principal)

;; Map token ID to metadata URI (IPFS/Arweave)
(define-map token-uris uint (string-ascii 256))

;; Map token ID to product metadata
(define-map token-metadata uint {
  name: (string-ascii 128),
  artisan: principal,
  category: (string-ascii 64),
  created-at: uint,
  product-id: uint
})

;; Track token count per owner for enumeration
(define-map owner-token-count principal uint)

;; Marketplace: token listings for sale
(define-map token-listings uint {
  price: uint,
  seller: principal
})

;; Approved operators for token transfers
(define-map token-approvals uint principal)

;; Operator approvals (owner -> operator -> approved)
(define-map operator-approvals {owner: principal, operator: principal} bool)

;; ========================================
;; SIP-009 Read-Only Functions
;; ========================================

;; Get the last minted token ID
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; Get the token URI for a specific token
(define-read-only (get-token-uri (token-id uint))
  (ok (map-get? token-uris token-id))
)

;; Get the owner of a specific token
(define-read-only (get-owner (token-id uint))
  (ok (map-get? token-owners token-id))
)

;; ========================================
;; Additional Read-Only Functions
;; ========================================

;; Get token metadata
(define-read-only (get-token-metadata (token-id uint))
  (map-get? token-metadata token-id)
)

;; Get the number of tokens owned by an address
(define-read-only (get-balance (owner principal))
  (default-to u0 (map-get? owner-token-count owner))
)

;; Check if a token exists
(define-read-only (token-exists (token-id uint))
  (is-some (map-get? token-owners token-id))
)

;; Get token listing details
(define-read-only (get-listing (token-id uint))
  (map-get? token-listings token-id)
)

;; Check if an operator is approved for a token
(define-read-only (get-approved (token-id uint))
  (map-get? token-approvals token-id)
)

;; Check if an operator is approved for all tokens of an owner
(define-read-only (is-approved-for-all (owner principal) (operator principal))
  (default-to false (map-get? operator-approvals {owner: owner, operator: operator}))
)

;; ========================================
;; Private Functions
;; ========================================

;; Internal function to check if caller can transfer a token
(define-private (is-authorized-to-transfer (token-id uint) (sender principal))
  (let (
    (owner (unwrap! (map-get? token-owners token-id) false))
  )
    (or 
      (is-eq sender owner)
      (is-eq (some sender) (map-get? token-approvals token-id))
      (default-to false (map-get? operator-approvals {owner: owner, operator: sender}))
    )
  )
)

;; Internal transfer logic
(define-private (transfer-token (token-id uint) (sender principal) (recipient principal))
  (let (
    (sender-balance (get-balance sender))
    (recipient-balance (get-balance recipient))
  )
    ;; Update token owner
    (map-set token-owners token-id recipient)
    ;; Update balances
    (map-set owner-token-count sender (- sender-balance u1))
    (map-set owner-token-count recipient (+ recipient-balance u1))
    ;; Clear approval
    (map-delete token-approvals token-id)
    ;; Remove from marketplace if listed
    (map-delete token-listings token-id)
    (ok true)
  )
)

;; Internal transfer with typed error for marketplace
(define-private (do-marketplace-transfer (token-id uint) (seller principal) (buyer principal))
  (begin
    (map-set token-owners token-id buyer)
    (map-set owner-token-count seller (- (get-balance seller) u1))
    (map-set owner-token-count buyer (+ (get-balance buyer) u1))
    (map-delete token-approvals token-id)
    (map-delete token-listings token-id)
    true
  )
)

;; ========================================
;; SIP-009 Public Functions
;; ========================================

;; Transfer a token from sender to recipient
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (let (
    (owner (unwrap! (map-get? token-owners token-id) ERR-NOT-FOUND))
  )
    ;; Verify sender is the actual owner
    (asserts! (is-eq sender owner) ERR-NOT-TOKEN-OWNER)
    ;; Verify tx-sender is authorized (owner, approved for token, or approved for all)
    (asserts! (is-authorized-to-transfer token-id tx-sender) ERR-NOT-AUTHORIZED)
    ;; Verify recipient is different from sender
    (asserts! (not (is-eq sender recipient)) ERR-SAME-OWNER)
    ;; Execute transfer
    (transfer-token token-id sender recipient)
  )
)

;; ========================================
;; Minting Functions
;; ========================================

;; Mint a new NFT for a registered product
;; Only callable by the registry contract or contract owner
(define-public (mint 
  (recipient principal)
  (name (string-ascii 128))
  (category (string-ascii 64))
  (metadata-uri (string-ascii 256))
  (product-id uint))
  (let (
    (new-token-id (+ (var-get last-token-id) u1))
    (recipient-balance (get-balance recipient))
  )
    ;; Only contract owner can mint (registry contract will be added later)
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    
    ;; Set token owner
    (map-set token-owners new-token-id recipient)
    
    ;; Set token URI
    (map-set token-uris new-token-id metadata-uri)
    
    ;; Set token metadata
    (map-set token-metadata new-token-id {
      name: name,
      artisan: recipient,
      category: category,
      created-at: stacks-block-height,
      product-id: product-id
    })
    
    ;; Update owner balance
    (map-set owner-token-count recipient (+ recipient-balance u1))
    
    ;; Update last token ID
    (var-set last-token-id new-token-id)
    
    (ok new-token-id)
  )
)

;; ========================================
;; Approval Functions
;; ========================================

;; Approve an operator to transfer a specific token
(define-public (approve (operator principal) (token-id uint))
  (let (
    (owner (unwrap! (map-get? token-owners token-id) ERR-NOT-FOUND))
  )
    (asserts! (is-eq tx-sender owner) ERR-NOT-TOKEN-OWNER)
    (map-set token-approvals token-id operator)
    (ok true)
  )
)

;; Set approval for an operator to manage all tokens
(define-public (set-approval-for-all (operator principal) (approved bool))
  (begin
    (map-set operator-approvals {owner: tx-sender, operator: operator} approved)
    (ok true)
  )
)

;; ========================================
;; Marketplace Functions
;; ========================================

;; List a token for sale
(define-public (list-for-sale (token-id uint) (price uint))
  (let (
    (owner (unwrap! (map-get? token-owners token-id) ERR-NOT-FOUND))
  )
    (asserts! (is-eq tx-sender owner) ERR-NOT-TOKEN-OWNER)
    (asserts! (> price u0) ERR-WRONG-PRICE)
    (map-set token-listings token-id {price: price, seller: owner})
    (ok true)
  )
)

;; Remove token from sale
(define-public (unlist (token-id uint))
  (let (
    (listing (unwrap! (map-get? token-listings token-id) ERR-LISTING-NOT-FOUND))
  )
    (asserts! (is-eq tx-sender (get seller listing)) ERR-NOT-TOKEN-OWNER)
    (map-delete token-listings token-id)
    (ok true)
  )
)

;; Buy a listed token
(define-public (buy (token-id uint))
  (let (
    (listing (unwrap! (map-get? token-listings token-id) ERR-LISTING-NOT-FOUND))
    (price (get price listing))
    (seller (get seller listing))
  )
    ;; Buyer cannot be seller
    (asserts! (not (is-eq tx-sender seller)) ERR-SAME-OWNER)
    ;; Transfer STX from buyer to seller
    (try! (stx-transfer? price tx-sender seller))
    ;; Transfer token to buyer
    (asserts! (do-marketplace-transfer token-id seller tx-sender) ERR-NOT-AUTHORIZED)
    (ok true)
  )
)

;; ========================================
;; Burn Function
;; ========================================

;; Burn a token (only owner can burn)
(define-public (burn (token-id uint))
  (let (
    (owner (unwrap! (map-get? token-owners token-id) ERR-NOT-FOUND))
    (owner-balance (get-balance owner))
  )
    (asserts! (is-eq tx-sender owner) ERR-NOT-TOKEN-OWNER)
    ;; Remove token data
    (map-delete token-owners token-id)
    (map-delete token-uris token-id)
    (map-delete token-metadata token-id)
    (map-delete token-approvals token-id)
    (map-delete token-listings token-id)
    ;; Update balance
    (map-set owner-token-count owner (- owner-balance u1))
    (ok true)
  )
)
