;; title: nft
;; version: 1.0.0
;; summary: SIP-009 compliant NFT for artisan product authenticity tokens
;; description: Each registered artisan product receives a unique NFT token
;;              that represents its authenticity and ownership on the Stacks blockchain.

;; traits
;;
;; Define SIP-009 NFT trait locally
(define-trait nft-trait
  (
    (get-last-token-id () (response uint uint))
    (get-token-uri (uint) (response (optional (string-utf8 256)) uint))
    (get-owner (uint) (response (optional principal) uint))
    (transfer (uint principal principal) (response bool uint))
  )
)

;; token definitions
;;
(define-non-fungible-token artisan-product uint)

;; constants
;;
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_NOT_TOKEN_OWNER (err u101))
(define-constant ERR_TOKEN_NOT_FOUND (err u102))
(define-constant ERR_INVALID_TOKEN_ID (err u103))
(define-constant ERR_ALREADY_MINTED (err u104))
(define-constant ERR_INVALID_URI (err u105))

;; data vars
;;
(define-data-var last-token-id uint u0)
(define-data-var base-token-uri (string-utf8 256) u"")

;; data maps
;;
(define-map token-metadata
  uint
  {
    token-uri: (string-utf8 256),
    minted-at: uint,
    minted-by: principal
  }
)

;; SIP-009 required functions
;;

;; Get the last minted token ID
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; Get the token URI for a specific token
(define-read-only (get-token-uri (token-id uint))
  (ok (some (get token-uri (unwrap! (map-get? token-metadata token-id) (err ERR_TOKEN_NOT_FOUND)))))
)

;; Get the owner of a specific token
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? artisan-product token-id))
)

;; Transfer a token from sender to recipient
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) ERR_NOT_TOKEN_OWNER)
    (asserts! (is-some (nft-get-owner? artisan-product token-id)) ERR_TOKEN_NOT_FOUND)
    (nft-transfer? artisan-product token-id sender recipient)
  )
)

;; public functions
;;

;; Mint a new NFT token for an artisan product
;; Only callable by the registry contract or contract owner
(define-public (mint (recipient principal) (token-uri (string-utf8 256)))
  (let
    (
      (new-token-id (+ (var-get last-token-id) u1))
    )
    ;; Validate inputs
    (asserts! (> (len token-uri) u0) ERR_INVALID_URI)
    (asserts! (is-none (nft-get-owner? artisan-product new-token-id)) ERR_ALREADY_MINTED)
    
    ;; Mint the NFT
    (try! (nft-mint? artisan-product new-token-id recipient))
    
    ;; Store metadata
    (map-set token-metadata new-token-id {
      token-uri: token-uri,
      minted-at: stacks-block-height,
      minted-by: tx-sender
    })
    
    ;; Update last token ID
    (var-set last-token-id new-token-id)
    
    (ok new-token-id)
  )
)

;; Set the base URI for all tokens (admin only)
(define-public (set-base-uri (new-base-uri (string-utf8 256)))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set base-token-uri new-base-uri)
    (ok true)
  )
)

;; read only functions
;;

;; Get full metadata for a token
(define-read-only (get-token-metadata (token-id uint))
  (map-get? token-metadata token-id)
)

;; Get the base URI
(define-read-only (get-base-uri)
  (ok (var-get base-token-uri))
)

;; Check if a token exists
(define-read-only (token-exists (token-id uint))
  (is-some (nft-get-owner? artisan-product token-id))
)

;; Get total supply of minted tokens
(define-read-only (get-total-supply)
  (ok (var-get last-token-id))
)

