;; ============================================================================
;; CERTIFICATION CONTRACT
;; ============================================================================
;; Advanced certification management for artisan products
;; Features: Multi-tier certifications, expiry tracking, renewal, revocation
;; Version: 1.0.0
;; ============================================================================

;; ============================================================================
;; CONSTANTS
;; ============================================================================

(define-constant CONTRACT-OWNER tx-sender)

;; Error codes (300-series for certification contract)
(define-constant ERR-NOT-AUTHORIZED (err u300))
(define-constant ERR-NOT-FOUND (err u301))
(define-constant ERR-ALREADY-EXISTS (err u302))
(define-constant ERR-INVALID-INPUT (err u303))
(define-constant ERR-NOT-CERTIFIER (err u304))
(define-constant ERR-CERTIFIER-INACTIVE (err u305))
(define-constant ERR-CERTIFICATION-EXPIRED (err u306))
(define-constant ERR-CERTIFICATION-REVOKED (err u307))
(define-constant ERR-INVALID-TIER (err u308))
(define-constant ERR-RENEWAL-TOO-EARLY (err u309))
(define-constant ERR-PRODUCT-NOT-ELIGIBLE (err u310))

;; Certification tiers (higher = better)
(define-constant TIER-BRONZE u1)
(define-constant TIER-SILVER u2)
(define-constant TIER-GOLD u3)
(define-constant TIER-PLATINUM u4)

;; Certification status
(define-constant STATUS-ACTIVE u1)
(define-constant STATUS-EXPIRED u2)
(define-constant STATUS-REVOKED u3)
(define-constant STATUS-SUSPENDED u4)

;; Certifier types
(define-constant CERTIFIER-GOVERNMENT u1)
(define-constant CERTIFIER-TRADE-ASSOCIATION u2)
(define-constant CERTIFIER-THIRD-PARTY u3)
(define-constant CERTIFIER-SELF-REGULATORY u4)

;; Default validity period (in blocks, ~1 year at 10 min/block)
(define-constant DEFAULT-VALIDITY-PERIOD u52560)

;; Minimum blocks before renewal allowed (90 days before expiry)
(define-constant RENEWAL-WINDOW u13140)

;; ============================================================================
;; DATA VARIABLES
;; ============================================================================

;; Counter for certification IDs
(define-data-var certification-id-counter uint u0)

;; Counter for certifier IDs
(define-data-var certifier-id-counter uint u0)

;; Counter for credential IDs
(define-data-var credential-id-counter uint u0)

;; ============================================================================
;; DATA MAPS
;; ============================================================================

;; Certifier profiles
(define-map certifiers uint {
    owner: principal,
    name: (string-ascii 128),
    description: (string-ascii 256),
    certifier-type: uint,
    specializations: (list 10 (string-ascii 64)),
    active: bool,
    total-certifications: uint,
    trust-score: uint,
    created-at: uint,
    updated-at: uint
})

;; Map principal to certifier ID for lookups
(define-map certifier-principals principal uint)

;; Individual certifications issued
(define-map certifications uint {
    product-id: uint,
    certifier-id: uint,
    tier: uint,
    status: uint,
    notes: (string-ascii 512),
    evidence-uri: (string-ascii 256),
    issued-at: uint,
    expires-at: uint,
    revoked-at: (optional uint),
    revocation-reason: (optional (string-ascii 256)),
    renewal-count: uint
})

;; Track certifications by product (product-id -> list of certification IDs)
(define-map product-certifications uint (list 20 uint))

;; Track certifications by certifier
(define-map certifier-certifications uint (list 100 uint))

;; Certification credentials/specializations that certifiers can hold
(define-map credentials uint {
    name: (string-ascii 128),
    description: (string-ascii 256),
    issuer: (string-ascii 128),
    active: bool,
    created-at: uint
})

;; Certifier credentials (certifier-id -> credential-id -> granted)
(define-map certifier-credentials {certifier-id: uint, credential-id: uint} {
    granted-at: uint,
    granted-by: principal
})

;; ============================================================================
;; READ-ONLY FUNCTIONS - Certifiers
;; ============================================================================

;; Get certifier by ID
(define-read-only (get-certifier (certifier-id uint))
    (map-get? certifiers certifier-id)
)

;; Get certifier ID by principal
(define-read-only (get-certifier-id-by-principal (certifier principal))
    (map-get? certifier-principals certifier)
)

;; Check if address is an active certifier
(define-read-only (is-active-certifier (certifier principal))
    (match (map-get? certifier-principals certifier)
        id (match (map-get? certifiers id)
            certifier-data (get active certifier-data)
            false
        )
        false
    )
)

;; Get certifier count
(define-read-only (get-certifier-count)
    (var-get certifier-id-counter)
)

;; Check if certifier has specific credential
(define-read-only (certifier-has-credential (certifier-id uint) (credential-id uint))
    (is-some (map-get? certifier-credentials {certifier-id: certifier-id, credential-id: credential-id}))
)

;; ============================================================================
;; READ-ONLY FUNCTIONS - Certifications
;; ============================================================================

;; Get certification by ID
(define-read-only (get-certification (certification-id uint))
    (map-get? certifications certification-id)
)

;; Get all certification IDs for a product
(define-read-only (get-product-certification-ids (product-id uint))
    (default-to (list) (map-get? product-certifications product-id))
)

;; Get certification count
(define-read-only (get-certification-count)
    (var-get certification-id-counter)
)

;; Check if certification is currently valid (not expired, not revoked)
(define-read-only (is-certification-valid (certification-id uint))
    (match (map-get? certifications certification-id)
        cert (and
            (is-eq (get status cert) STATUS-ACTIVE)
            (> (get expires-at cert) stacks-block-height)
        )
        false
    )
)

;; Get highest tier certification for a product
(define-read-only (get-product-highest-tier (product-id uint))
    (let (
        (cert-ids (default-to (list) (map-get? product-certifications product-id)))
    )
        (fold get-max-tier cert-ids u0)
    )
)

;; Helper to get max tier from certification
(define-private (get-max-tier (cert-id uint) (current-max uint))
    (match (map-get? certifications cert-id)
        cert (if (and
                    (is-eq (get status cert) STATUS-ACTIVE)
                    (> (get expires-at cert) stacks-block-height)
                    (> (get tier cert) current-max)
                 )
                 (get tier cert)
                 current-max
             )
        current-max
    )
)

;; Get tier name as string
(define-read-only (get-tier-name (tier uint))
    (if (is-eq tier TIER-BRONZE)
        "bronze"
        (if (is-eq tier TIER-SILVER)
            "silver"
            (if (is-eq tier TIER-GOLD)
                "gold"
                (if (is-eq tier TIER-PLATINUM)
                    "platinum"
                    "unknown"
                )
            )
        )
    )
)

;; Get status name as string
(define-read-only (get-status-name (status uint))
    (if (is-eq status STATUS-ACTIVE)
        "active"
        (if (is-eq status STATUS-EXPIRED)
            "expired"
            (if (is-eq status STATUS-REVOKED)
                "revoked"
                (if (is-eq status STATUS-SUSPENDED)
                    "suspended"
                    "unknown"
                )
            )
        )
    )
)

;; ============================================================================
;; READ-ONLY FUNCTIONS - Credentials
;; ============================================================================

;; Get credential by ID
(define-read-only (get-credential (credential-id uint))
    (map-get? credentials credential-id)
)

;; Get credential count
(define-read-only (get-credential-count)
    (var-get credential-id-counter)
)

;; ============================================================================
;; PUBLIC FUNCTIONS - Certifier Management
;; ============================================================================

;; Register a new certifier (admin only)
(define-public (register-certifier
    (certifier-principal principal)
    (name (string-ascii 128))
    (description (string-ascii 256))
    (certifier-type uint)
    (specializations (list 10 (string-ascii 64))))
    (let (
        (new-id (+ (var-get certifier-id-counter) u1))
    )
        ;; Only admin can register certifiers
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        ;; Validate inputs
        (asserts! (> (len name) u0) ERR-INVALID-INPUT)
        ;; Validate certifier type
        (asserts! (and (>= certifier-type CERTIFIER-GOVERNMENT)
                       (<= certifier-type CERTIFIER-SELF-REGULATORY)) ERR-INVALID-INPUT)
        ;; Check not already registered
        (asserts! (is-none (map-get? certifier-principals certifier-principal)) ERR-ALREADY-EXISTS)

        ;; Create certifier profile
        (map-set certifiers new-id {
            owner: certifier-principal,
            name: name,
            description: description,
            certifier-type: certifier-type,
            specializations: specializations,
            active: true,
            total-certifications: u0,
            trust-score: u100,
            created-at: stacks-block-height,
            updated-at: stacks-block-height
        })

        ;; Map principal to ID
        (map-set certifier-principals certifier-principal new-id)

        ;; Update counter
        (var-set certifier-id-counter new-id)

        (ok new-id)
    )
)

;; Update certifier profile (certifier or admin)
(define-public (update-certifier-profile
    (certifier-id uint)
    (name (string-ascii 128))
    (description (string-ascii 256))
    (specializations (list 10 (string-ascii 64))))
    (let (
        (certifier (unwrap! (map-get? certifiers certifier-id) ERR-NOT-FOUND))
    )
        ;; Must be certifier owner or admin
        (asserts! (or (is-eq tx-sender (get owner certifier))
                      (is-eq tx-sender CONTRACT-OWNER)) ERR-NOT-AUTHORIZED)
        ;; Validate name
        (asserts! (> (len name) u0) ERR-INVALID-INPUT)

        ;; Update profile
        (map-set certifiers certifier-id (merge certifier {
            name: name,
            description: description,
            specializations: specializations,
            updated-at: stacks-block-height
        }))

        (ok true)
    )
)

;; Deactivate certifier (admin only)
(define-public (deactivate-certifier (certifier-id uint))
    (let (
        (certifier (unwrap! (map-get? certifiers certifier-id) ERR-NOT-FOUND))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)

        (map-set certifiers certifier-id (merge certifier {
            active: false,
            updated-at: stacks-block-height
        }))

        (ok true)
    )
)

;; Reactivate certifier (admin only)
(define-public (reactivate-certifier (certifier-id uint))
    (let (
        (certifier (unwrap! (map-get? certifiers certifier-id) ERR-NOT-FOUND))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)

        (map-set certifiers certifier-id (merge certifier {
            active: true,
            updated-at: stacks-block-height
        }))

        (ok true)
    )
)

;; Update certifier trust score (admin only)
(define-public (update-trust-score (certifier-id uint) (new-score uint))
    (let (
        (certifier (unwrap! (map-get? certifiers certifier-id) ERR-NOT-FOUND))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        (asserts! (<= new-score u100) ERR-INVALID-INPUT)

        (map-set certifiers certifier-id (merge certifier {
            trust-score: new-score,
            updated-at: stacks-block-height
        }))

        (ok true)
    )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - Certification Issuance
;; ============================================================================

;; Issue a new certification for a product
(define-public (issue-certification
    (product-id uint)
    (tier uint)
    (notes (string-ascii 512))
    (evidence-uri (string-ascii 256))
    (validity-period uint))
    (let (
        (certifier-id (unwrap! (map-get? certifier-principals tx-sender) ERR-NOT-CERTIFIER))
        (certifier (unwrap! (map-get? certifiers certifier-id) ERR-NOT-FOUND))
        (new-cert-id (+ (var-get certification-id-counter) u1))
        (current-certs (default-to (list) (map-get? product-certifications product-id)))
        (certifier-certs (default-to (list) (map-get? certifier-certifications certifier-id)))
        (actual-validity (if (is-eq validity-period u0) DEFAULT-VALIDITY-PERIOD validity-period))
    )
        ;; Verify certifier is active
        (asserts! (get active certifier) ERR-CERTIFIER-INACTIVE)
        ;; Validate tier
        (asserts! (and (>= tier TIER-BRONZE) (<= tier TIER-PLATINUM)) ERR-INVALID-TIER)

        ;; Create certification record
        (map-set certifications new-cert-id {
            product-id: product-id,
            certifier-id: certifier-id,
            tier: tier,
            status: STATUS-ACTIVE,
            notes: notes,
            evidence-uri: evidence-uri,
            issued-at: stacks-block-height,
            expires-at: (+ stacks-block-height actual-validity),
            revoked-at: none,
            revocation-reason: none,
            renewal-count: u0
        })

        ;; Add to product's certification list
        (map-set product-certifications product-id
            (unwrap! (as-max-len? (append current-certs new-cert-id) u20) ERR-INVALID-INPUT))

        ;; Add to certifier's certification list
        (map-set certifier-certifications certifier-id
            (unwrap! (as-max-len? (append certifier-certs new-cert-id) u100) ERR-INVALID-INPUT))

        ;; Update certifier stats
        (map-set certifiers certifier-id (merge certifier {
            total-certifications: (+ (get total-certifications certifier) u1),
            updated-at: stacks-block-height
        }))

        ;; Update counter
        (var-set certification-id-counter new-cert-id)

        (ok new-cert-id)
    )
)

;; Renew an existing certification
(define-public (renew-certification
    (certification-id uint)
    (notes (string-ascii 512))
    (evidence-uri (string-ascii 256))
    (validity-period uint))
    (let (
        (cert (unwrap! (map-get? certifications certification-id) ERR-NOT-FOUND))
        (certifier-id (unwrap! (map-get? certifier-principals tx-sender) ERR-NOT-CERTIFIER))
        (certifier (unwrap! (map-get? certifiers certifier-id) ERR-NOT-FOUND))
        (actual-validity (if (is-eq validity-period u0) DEFAULT-VALIDITY-PERIOD validity-period))
    )
        ;; Must be original certifier
        (asserts! (is-eq certifier-id (get certifier-id cert)) ERR-NOT-AUTHORIZED)
        ;; Certifier must be active
        (asserts! (get active certifier) ERR-CERTIFIER-INACTIVE)
        ;; Must not be revoked
        (asserts! (not (is-eq (get status cert) STATUS-REVOKED)) ERR-CERTIFICATION-REVOKED)
        ;; Can only renew within renewal window (90 days before expiry) or after expiry
        (asserts! (or
            (>= stacks-block-height (get expires-at cert))
            (>= stacks-block-height (- (get expires-at cert) RENEWAL-WINDOW))
        ) ERR-RENEWAL-TOO-EARLY)

        ;; Update certification
        (map-set certifications certification-id (merge cert {
            status: STATUS-ACTIVE,
            notes: notes,
            evidence-uri: evidence-uri,
            expires-at: (+ stacks-block-height actual-validity),
            renewal-count: (+ (get renewal-count cert) u1)
        }))

        (ok true)
    )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - Certification Management
;; ============================================================================

;; Revoke a certification
(define-public (revoke-certification
    (certification-id uint)
    (reason (string-ascii 256)))
    (let (
        (cert (unwrap! (map-get? certifications certification-id) ERR-NOT-FOUND))
        (certifier-id (unwrap! (map-get? certifier-principals tx-sender) ERR-NOT-CERTIFIER))
    )
        ;; Must be original certifier or admin
        (asserts! (or (is-eq certifier-id (get certifier-id cert))
                      (is-eq tx-sender CONTRACT-OWNER)) ERR-NOT-AUTHORIZED)
        ;; Must not already be revoked
        (asserts! (not (is-eq (get status cert) STATUS-REVOKED)) ERR-CERTIFICATION-REVOKED)
        ;; Validate reason
        (asserts! (> (len reason) u0) ERR-INVALID-INPUT)

        ;; Update certification
        (map-set certifications certification-id (merge cert {
            status: STATUS-REVOKED,
            revoked-at: (some stacks-block-height),
            revocation-reason: (some reason)
        }))

        (ok true)
    )
)

;; Suspend a certification temporarily (admin only)
(define-public (suspend-certification (certification-id uint))
    (let (
        (cert (unwrap! (map-get? certifications certification-id) ERR-NOT-FOUND))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status cert) STATUS-ACTIVE) ERR-INVALID-INPUT)

        (map-set certifications certification-id (merge cert {
            status: STATUS-SUSPENDED
        }))

        (ok true)
    )
)

;; Unsuspend a certification (admin only)
(define-public (unsuspend-certification (certification-id uint))
    (let (
        (cert (unwrap! (map-get? certifications certification-id) ERR-NOT-FOUND))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status cert) STATUS-SUSPENDED) ERR-INVALID-INPUT)

        (map-set certifications certification-id (merge cert {
            status: STATUS-ACTIVE
        }))

        (ok true)
    )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - Credential Management (Admin)
;; ============================================================================

;; Create a new credential type (admin only)
(define-public (create-credential
    (name (string-ascii 128))
    (description (string-ascii 256))
    (issuer (string-ascii 128)))
    (let (
        (new-id (+ (var-get credential-id-counter) u1))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        (asserts! (> (len name) u0) ERR-INVALID-INPUT)

        (map-set credentials new-id {
            name: name,
            description: description,
            issuer: issuer,
            active: true,
            created-at: stacks-block-height
        })

        (var-set credential-id-counter new-id)

        (ok new-id)
    )
)

;; Grant credential to certifier (admin only)
(define-public (grant-credential (certifier-id uint) (credential-id uint))
    (let (
        (certifier (unwrap! (map-get? certifiers certifier-id) ERR-NOT-FOUND))
        (credential (unwrap! (map-get? credentials credential-id) ERR-NOT-FOUND))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        (asserts! (get active credential) ERR-INVALID-INPUT)
        (asserts! (is-none (map-get? certifier-credentials {certifier-id: certifier-id, credential-id: credential-id})) ERR-ALREADY-EXISTS)

        (map-set certifier-credentials {certifier-id: certifier-id, credential-id: credential-id} {
            granted-at: stacks-block-height,
            granted-by: tx-sender
        })

        (ok true)
    )
)

;; Revoke credential from certifier (admin only)
(define-public (revoke-credential (certifier-id uint) (credential-id uint))
    (begin
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        (asserts! (is-some (map-get? certifier-credentials {certifier-id: certifier-id, credential-id: credential-id})) ERR-NOT-FOUND)

        (map-delete certifier-credentials {certifier-id: certifier-id, credential-id: credential-id})

        (ok true)
    )
)
