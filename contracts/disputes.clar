;; ============================================================================
;; DISPUTES CONTRACT
;; ============================================================================
;; Advanced dispute resolution for artisan product authenticity
;; Features: Evidence tracking, arbitration, appeals, penalties, categories
;; Version: 1.0.0
;; ============================================================================

;; ============================================================================
;; CONSTANTS
;; ============================================================================

(define-constant CONTRACT-OWNER tx-sender)

;; Error codes (400-series for disputes contract)
(define-constant ERR-NOT-AUTHORIZED (err u400))
(define-constant ERR-NOT-FOUND (err u401))
(define-constant ERR-ALREADY-EXISTS (err u402))
(define-constant ERR-INVALID-INPUT (err u403))
(define-constant ERR-DISPUTE-CLOSED (err u404))
(define-constant ERR-DISPUTE-NOT-PENDING (err u405))
(define-constant ERR-EVIDENCE-LIMIT-REACHED (err u406))
(define-constant ERR-APPEAL-NOT-ALLOWED (err u407))
(define-constant ERR-DEADLINE-PASSED (err u408))
(define-constant ERR-INSUFFICIENT-STAKE (err u409))
(define-constant ERR-NOT-ARBITER (err u410))
(define-constant ERR-ALREADY-VOTED (err u411))
(define-constant ERR-VOTING-CLOSED (err u412))
(define-constant ERR-ARBITER-INACTIVE (err u413))

;; Dispute status
(define-constant STATUS-PENDING u1)
(define-constant STATUS-UNDER-REVIEW u2)
(define-constant STATUS-VOTING u3)
(define-constant STATUS-RESOLVED-UPHELD u4)
(define-constant STATUS-RESOLVED-REJECTED u5)
(define-constant STATUS-APPEALED u6)
(define-constant STATUS-CLOSED u7)

;; Dispute categories
(define-constant CATEGORY-COUNTERFEIT u1)
(define-constant CATEGORY-MISREPRESENTATION u2)
(define-constant CATEGORY-QUALITY-ISSUE u3)
(define-constant CATEGORY-ORIGIN-DISPUTE u4)
(define-constant CATEGORY-CERTIFICATION-FRAUD u5)
(define-constant CATEGORY-OTHER u6)

;; Resolution types
(define-constant RESOLUTION-IN-FAVOR-COMPLAINANT u1)
(define-constant RESOLUTION-IN-FAVOR-ARTISAN u2)
(define-constant RESOLUTION-PARTIAL u3)
(define-constant RESOLUTION-DISMISSED u4)

;; Penalty severity levels
(define-constant PENALTY-NONE u0)
(define-constant PENALTY-WARNING u1)
(define-constant PENALTY-SUSPENSION u2)
(define-constant PENALTY-BAN u3)

;; Timing constants (in blocks)
(define-constant RESPONSE-DEADLINE u1440)      ;; ~10 days for response
(define-constant VOTING-PERIOD u720)           ;; ~5 days for voting
(define-constant APPEAL-WINDOW u432)           ;; ~3 days for appeal
(define-constant MIN-STAKE-AMOUNT u10000000)   ;; 10 STX minimum stake

;; ============================================================================
;; DATA VARIABLES
;; ============================================================================

(define-data-var dispute-id-counter uint u0)
(define-data-var evidence-id-counter uint u0)
(define-data-var arbiter-id-counter uint u0)

;; ============================================================================
;; DATA MAPS
;; ============================================================================

;; Main dispute records
(define-map disputes uint {
    product-id: uint,
    complainant: principal,
    respondent: principal,
    category: uint,
    title: (string-ascii 128),
    description: (string-ascii 1024),
    status: uint,
    stake-amount: uint,
    response-deadline: uint,
    voting-deadline: (optional uint),
    appeal-deadline: (optional uint),
    resolution: (optional uint),
    resolution-notes: (optional (string-ascii 512)),
    penalty-applied: uint,
    created-at: uint,
    updated-at: uint,
    resolved-at: (optional uint)
})

;; Track active dispute per product (only one active at a time)
(define-map product-active-dispute uint uint)

;; Evidence submissions for disputes
(define-map evidence uint {
    dispute-id: uint,
    submitter: principal,
    evidence-type: (string-ascii 32),
    uri: (string-ascii 256),
    description: (string-ascii 512),
    submitted-at: uint
})

;; Evidence list per dispute
(define-map dispute-evidence uint (list 20 uint))

;; Arbiter profiles (authorized dispute resolvers)
(define-map arbiters uint {
    owner: principal,
    name: (string-ascii 128),
    specializations: (list 5 uint),
    active: bool,
    disputes-resolved: uint,
    accuracy-score: uint,
    created-at: uint
})

;; Map principal to arbiter ID
(define-map arbiter-principals principal uint)

;; Arbiter votes on disputes
(define-map arbiter-votes {dispute-id: uint, arbiter-id: uint} {
    vote: uint,
    reasoning: (string-ascii 256),
    voted-at: uint
})

;; Track vote counts per dispute
(define-map dispute-votes uint {
    favor-complainant: uint,
    favor-artisan: uint,
    total-votes: uint
})

;; Dispute responses from respondent (artisan)
(define-map dispute-responses uint {
    response: (string-ascii 1024),
    evidence-uri: (string-ascii 256),
    responded-at: uint
})

;; Penalties applied to principals
(define-map penalties principal {
    warning-count: uint,
    suspension-until: (optional uint),
    banned: bool,
    last-penalty-at: (optional uint)
})

;; Appeal records
(define-map appeals uint {
    original-dispute-id: uint,
    appellant: principal,
    reason: (string-ascii 512),
    new-evidence-uri: (optional (string-ascii 256)),
    status: uint,
    created-at: uint,
    resolved-at: (optional uint)
})

;; ============================================================================
;; READ-ONLY FUNCTIONS - Disputes
;; ============================================================================

;; Get dispute by ID
(define-read-only (get-dispute (dispute-id uint))
    (map-get? disputes dispute-id)
)

;; Get active dispute for product
(define-read-only (get-product-active-dispute (product-id uint))
    (match (map-get? product-active-dispute product-id)
        dispute-id (map-get? disputes dispute-id)
        none
    )
)

;; Check if product has active dispute
(define-read-only (has-active-dispute (product-id uint))
    (match (map-get? product-active-dispute product-id)
        dispute-id (match (map-get? disputes dispute-id)
            dispute (and
                (not (is-eq (get status dispute) STATUS-CLOSED))
                (not (is-eq (get status dispute) STATUS-RESOLVED-UPHELD))
                (not (is-eq (get status dispute) STATUS-RESOLVED-REJECTED))
            )
            false
        )
        false
    )
)

;; Get dispute count
(define-read-only (get-dispute-count)
    (var-get dispute-id-counter)
)

;; Get dispute status name
(define-read-only (get-status-name (status uint))
    (if (is-eq status STATUS-PENDING)
        "pending"
        (if (is-eq status STATUS-UNDER-REVIEW)
            "under-review"
            (if (is-eq status STATUS-VOTING)
                "voting"
                (if (is-eq status STATUS-RESOLVED-UPHELD)
                    "resolved-upheld"
                    (if (is-eq status STATUS-RESOLVED-REJECTED)
                        "resolved-rejected"
                        (if (is-eq status STATUS-APPEALED)
                            "appealed"
                            (if (is-eq status STATUS-CLOSED)
                                "closed"
                                "unknown"
                            )
                        )
                    )
                )
            )
        )
    )
)

;; Get category name
(define-read-only (get-category-name (category uint))
    (if (is-eq category CATEGORY-COUNTERFEIT)
        "counterfeit"
        (if (is-eq category CATEGORY-MISREPRESENTATION)
            "misrepresentation"
            (if (is-eq category CATEGORY-QUALITY-ISSUE)
                "quality-issue"
                (if (is-eq category CATEGORY-ORIGIN-DISPUTE)
                    "origin-dispute"
                    (if (is-eq category CATEGORY-CERTIFICATION-FRAUD)
                        "certification-fraud"
                        "other"
                    )
                )
            )
        )
    )
)

;; ============================================================================
;; READ-ONLY FUNCTIONS - Evidence
;; ============================================================================

;; Get evidence by ID
(define-read-only (get-evidence (evidence-id uint))
    (map-get? evidence evidence-id)
)

;; Get all evidence IDs for dispute
(define-read-only (get-dispute-evidence-ids (dispute-id uint))
    (default-to (list) (map-get? dispute-evidence dispute-id))
)

;; ============================================================================
;; READ-ONLY FUNCTIONS - Arbiters
;; ============================================================================

;; Get arbiter by ID
(define-read-only (get-arbiter (arbiter-id uint))
    (map-get? arbiters arbiter-id)
)

;; Get arbiter ID by principal
(define-read-only (get-arbiter-id-by-principal (arbiter principal))
    (map-get? arbiter-principals arbiter)
)

;; Check if address is active arbiter
(define-read-only (is-active-arbiter (arbiter principal))
    (match (map-get? arbiter-principals arbiter)
        id (match (map-get? arbiters id)
            arbiter-data (get active arbiter-data)
            false
        )
        false
    )
)

;; Get vote counts for dispute
(define-read-only (get-dispute-vote-counts (dispute-id uint))
    (default-to {favor-complainant: u0, favor-artisan: u0, total-votes: u0}
                (map-get? dispute-votes dispute-id))
)

;; Check if arbiter has voted on dispute
(define-read-only (arbiter-has-voted (dispute-id uint) (arbiter-id uint))
    (is-some (map-get? arbiter-votes {dispute-id: dispute-id, arbiter-id: arbiter-id}))
)

;; ============================================================================
;; READ-ONLY FUNCTIONS - Penalties
;; ============================================================================

;; Get penalty record for principal
(define-read-only (get-penalties (account principal))
    (map-get? penalties account)
)

;; Check if account is banned
(define-read-only (is-banned (account principal))
    (match (map-get? penalties account)
        penalty-record (get banned penalty-record)
        false
    )
)

;; Check if account is currently suspended
(define-read-only (is-suspended (account principal))
    (match (map-get? penalties account)
        penalty-record (match (get suspension-until penalty-record)
            until (> until stacks-block-height)
            false
        )
        false
    )
)

;; ============================================================================
;; READ-ONLY FUNCTIONS - Responses and Appeals
;; ============================================================================

;; Get dispute response
(define-read-only (get-dispute-response (dispute-id uint))
    (map-get? dispute-responses dispute-id)
)

;; Get appeal for dispute
(define-read-only (get-appeal (dispute-id uint))
    (map-get? appeals dispute-id)
)

;; ============================================================================
;; PUBLIC FUNCTIONS - Dispute Submission
;; ============================================================================

;; Submit a new dispute
(define-public (submit-dispute
    (product-id uint)
    (respondent principal)
    (category uint)
    (title (string-ascii 128))
    (description (string-ascii 1024)))
    (let (
        (new-id (+ (var-get dispute-id-counter) u1))
    )
        ;; Validate inputs
        (asserts! (> (len title) u0) ERR-INVALID-INPUT)
        (asserts! (> (len description) u0) ERR-INVALID-INPUT)
        (asserts! (and (>= category CATEGORY-COUNTERFEIT) (<= category CATEGORY-OTHER)) ERR-INVALID-INPUT)
        ;; Check no active dispute on product
        (asserts! (not (has-active-dispute product-id)) ERR-ALREADY-EXISTS)
        ;; Complainant cannot be respondent
        (asserts! (not (is-eq tx-sender respondent)) ERR-INVALID-INPUT)
        ;; Check complainant not banned or suspended
        (asserts! (not (is-banned tx-sender)) ERR-NOT-AUTHORIZED)
        (asserts! (not (is-suspended tx-sender)) ERR-NOT-AUTHORIZED)

        ;; Create dispute record
        (map-set disputes new-id {
            product-id: product-id,
            complainant: tx-sender,
            respondent: respondent,
            category: category,
            title: title,
            description: description,
            status: STATUS-PENDING,
            stake-amount: u0,
            response-deadline: (+ stacks-block-height RESPONSE-DEADLINE),
            voting-deadline: none,
            appeal-deadline: none,
            resolution: none,
            resolution-notes: none,
            penalty-applied: PENALTY-NONE,
            created-at: stacks-block-height,
            updated-at: stacks-block-height,
            resolved-at: none
        })

        ;; Track active dispute for product
        (map-set product-active-dispute product-id new-id)

        ;; Initialize vote counts
        (map-set dispute-votes new-id {
            favor-complainant: u0,
            favor-artisan: u0,
            total-votes: u0
        })

        ;; Update counter
        (var-set dispute-id-counter new-id)

        (ok new-id)
    )
)

;; Add stake to dispute (increases weight/priority)
(define-public (add-stake (dispute-id uint) (amount uint))
    (let (
        (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
    )
        ;; Must be complainant
        (asserts! (is-eq tx-sender (get complainant dispute)) ERR-NOT-AUTHORIZED)
        ;; Dispute must be pending or under review
        (asserts! (or (is-eq (get status dispute) STATUS-PENDING)
                      (is-eq (get status dispute) STATUS-UNDER-REVIEW)) ERR-DISPUTE-CLOSED)
        ;; Amount must be positive
        (asserts! (> amount u0) ERR-INVALID-INPUT)

        ;; Transfer stake
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

        ;; Update dispute stake
        (map-set disputes dispute-id (merge dispute {
            stake-amount: (+ (get stake-amount dispute) amount),
            updated-at: stacks-block-height
        }))

        (ok true)
    )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - Evidence Management
;; ============================================================================

;; Submit evidence for dispute
(define-public (submit-evidence
    (dispute-id uint)
    (evidence-type (string-ascii 32))
    (uri (string-ascii 256))
    (description (string-ascii 512)))
    (let (
        (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
        (new-evidence-id (+ (var-get evidence-id-counter) u1))
        (current-evidence (default-to (list) (map-get? dispute-evidence dispute-id)))
    )
        ;; Only complainant or respondent can submit evidence
        (asserts! (or (is-eq tx-sender (get complainant dispute))
                      (is-eq tx-sender (get respondent dispute))) ERR-NOT-AUTHORIZED)
        ;; Dispute must be in valid state for evidence
        (asserts! (or (is-eq (get status dispute) STATUS-PENDING)
                      (is-eq (get status dispute) STATUS-UNDER-REVIEW)
                      (is-eq (get status dispute) STATUS-APPEALED)) ERR-DISPUTE-CLOSED)
        ;; Validate inputs
        (asserts! (> (len uri) u0) ERR-INVALID-INPUT)

        ;; Create evidence record
        (map-set evidence new-evidence-id {
            dispute-id: dispute-id,
            submitter: tx-sender,
            evidence-type: evidence-type,
            uri: uri,
            description: description,
            submitted-at: stacks-block-height
        })

        ;; Add to dispute's evidence list
        (map-set dispute-evidence dispute-id
            (unwrap! (as-max-len? (append current-evidence new-evidence-id) u20) ERR-EVIDENCE-LIMIT-REACHED))

        ;; Update counter
        (var-set evidence-id-counter new-evidence-id)

        (ok new-evidence-id)
    )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - Response
;; ============================================================================

;; Respondent submits response to dispute
(define-public (submit-response
    (dispute-id uint)
    (response (string-ascii 1024))
    (evidence-uri (string-ascii 256)))
    (let (
        (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
    )
        ;; Must be the respondent
        (asserts! (is-eq tx-sender (get respondent dispute)) ERR-NOT-AUTHORIZED)
        ;; Must be pending status
        (asserts! (is-eq (get status dispute) STATUS-PENDING) ERR-DISPUTE-NOT-PENDING)
        ;; Must be within deadline
        (asserts! (<= stacks-block-height (get response-deadline dispute)) ERR-DEADLINE-PASSED)
        ;; No existing response
        (asserts! (is-none (map-get? dispute-responses dispute-id)) ERR-ALREADY-EXISTS)

        ;; Create response record
        (map-set dispute-responses dispute-id {
            response: response,
            evidence-uri: evidence-uri,
            responded-at: stacks-block-height
        })

        ;; Move dispute to under-review
        (map-set disputes dispute-id (merge dispute {
            status: STATUS-UNDER-REVIEW,
            updated-at: stacks-block-height
        }))

        (ok true)
    )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - Arbiter Management (Admin)
;; ============================================================================

;; Register a new arbiter (admin only)
(define-public (register-arbiter
    (arbiter-principal principal)
    (name (string-ascii 128))
    (specializations (list 5 uint)))
    (let (
        (new-id (+ (var-get arbiter-id-counter) u1))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        (asserts! (> (len name) u0) ERR-INVALID-INPUT)
        (asserts! (is-none (map-get? arbiter-principals arbiter-principal)) ERR-ALREADY-EXISTS)

        ;; Create arbiter record
        (map-set arbiters new-id {
            owner: arbiter-principal,
            name: name,
            specializations: specializations,
            active: true,
            disputes-resolved: u0,
            accuracy-score: u100,
            created-at: stacks-block-height
        })

        ;; Map principal to ID
        (map-set arbiter-principals arbiter-principal new-id)

        ;; Update counter
        (var-set arbiter-id-counter new-id)

        (ok new-id)
    )
)

;; Deactivate arbiter (admin only)
(define-public (deactivate-arbiter (arbiter-id uint))
    (let (
        (arbiter (unwrap! (map-get? arbiters arbiter-id) ERR-NOT-FOUND))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)

        (map-set arbiters arbiter-id (merge arbiter {
            active: false
        }))

        (ok true)
    )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - Voting
;; ============================================================================

;; Start voting period (admin only)
(define-public (start-voting (dispute-id uint))
    (let (
        (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status dispute) STATUS-UNDER-REVIEW) ERR-DISPUTE-NOT-PENDING)

        (map-set disputes dispute-id (merge dispute {
            status: STATUS-VOTING,
            voting-deadline: (some (+ stacks-block-height VOTING-PERIOD)),
            updated-at: stacks-block-height
        }))

        (ok true)
    )
)

;; Arbiter casts vote
(define-public (cast-vote
    (dispute-id uint)
    (vote uint)
    (reasoning (string-ascii 256)))
    (let (
        (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
        (arbiter-id (unwrap! (map-get? arbiter-principals tx-sender) ERR-NOT-ARBITER))
        (arbiter (unwrap! (map-get? arbiters arbiter-id) ERR-NOT-FOUND))
        (current-votes (default-to {favor-complainant: u0, favor-artisan: u0, total-votes: u0}
                                   (map-get? dispute-votes dispute-id)))
    )
        ;; Arbiter must be active
        (asserts! (get active arbiter) ERR-ARBITER-INACTIVE)
        ;; Dispute must be in voting status
        (asserts! (is-eq (get status dispute) STATUS-VOTING) ERR-VOTING-CLOSED)
        ;; Check voting deadline
        (asserts! (match (get voting-deadline dispute)
            deadline (<= stacks-block-height deadline)
            false
        ) ERR-DEADLINE-PASSED)
        ;; Check not already voted
        (asserts! (not (arbiter-has-voted dispute-id arbiter-id)) ERR-ALREADY-VOTED)
        ;; Validate vote (1 = favor complainant, 2 = favor artisan)
        (asserts! (or (is-eq vote u1) (is-eq vote u2)) ERR-INVALID-INPUT)

        ;; Record vote
        (map-set arbiter-votes {dispute-id: dispute-id, arbiter-id: arbiter-id} {
            vote: vote,
            reasoning: reasoning,
            voted-at: stacks-block-height
        })

        ;; Update vote counts
        (map-set dispute-votes dispute-id {
            favor-complainant: (if (is-eq vote u1)
                                   (+ (get favor-complainant current-votes) u1)
                                   (get favor-complainant current-votes)),
            favor-artisan: (if (is-eq vote u2)
                               (+ (get favor-artisan current-votes) u1)
                               (get favor-artisan current-votes)),
            total-votes: (+ (get total-votes current-votes) u1)
        })

        (ok true)
    )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - Resolution
;; ============================================================================

;; Resolve dispute (admin only)
(define-public (resolve-dispute
    (dispute-id uint)
    (resolution uint)
    (notes (string-ascii 512))
    (penalty uint))
    (let (
        (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
        (final-status (if (or (is-eq resolution RESOLUTION-IN-FAVOR-COMPLAINANT)
                              (is-eq resolution RESOLUTION-PARTIAL))
                         STATUS-RESOLVED-UPHELD
                         STATUS-RESOLVED-REJECTED))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        ;; Dispute must be in resolvable state
        (asserts! (or (is-eq (get status dispute) STATUS-UNDER-REVIEW)
                      (is-eq (get status dispute) STATUS-VOTING)
                      (is-eq (get status dispute) STATUS-APPEALED)) ERR-DISPUTE-CLOSED)
        ;; Validate resolution
        (asserts! (and (>= resolution RESOLUTION-IN-FAVOR-COMPLAINANT)
                       (<= resolution RESOLUTION-DISMISSED)) ERR-INVALID-INPUT)

        ;; Update dispute
        (map-set disputes dispute-id (merge dispute {
            status: final-status,
            resolution: (some resolution),
            resolution-notes: (some notes),
            penalty-applied: penalty,
            appeal-deadline: (some (+ stacks-block-height APPEAL-WINDOW)),
            resolved-at: (some stacks-block-height),
            updated-at: stacks-block-height
        }))

        ;; Apply penalty if specified
        (if (> penalty PENALTY-NONE)
            (apply-penalty-internal (get respondent dispute) penalty)
            true
        )

        ;; Return stake to complainant (if upheld)
        (if (and (is-eq resolution RESOLUTION-IN-FAVOR-COMPLAINANT)
                 (> (get stake-amount dispute) u0))
            (as-contract (stx-transfer? (get stake-amount dispute) tx-sender (get complainant dispute)))
            (ok true)
        )
    )
)

;; Internal penalty application
(define-private (apply-penalty-internal (account principal) (penalty uint))
    (let (
        (current-penalties (default-to {
            warning-count: u0,
            suspension-until: none,
            banned: false,
            last-penalty-at: none
        } (map-get? penalties account)))
    )
        (if (is-eq penalty PENALTY-WARNING)
            (map-set penalties account (merge current-penalties {
                warning-count: (+ (get warning-count current-penalties) u1),
                last-penalty-at: (some stacks-block-height)
            }))
            (if (is-eq penalty PENALTY-SUSPENSION)
                (map-set penalties account (merge current-penalties {
                    suspension-until: (some (+ stacks-block-height u10080)),
                    last-penalty-at: (some stacks-block-height)
                }))
                (if (is-eq penalty PENALTY-BAN)
                    (map-set penalties account (merge current-penalties {
                        banned: true,
                        last-penalty-at: (some stacks-block-height)
                    }))
                    true
                )
            )
        )
    )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - Appeals
;; ============================================================================

;; Submit appeal
(define-public (submit-appeal
    (dispute-id uint)
    (reason (string-ascii 512))
    (new-evidence-uri (optional (string-ascii 256))))
    (let (
        (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
    )
        ;; Must be complainant or respondent
        (asserts! (or (is-eq tx-sender (get complainant dispute))
                      (is-eq tx-sender (get respondent dispute))) ERR-NOT-AUTHORIZED)
        ;; Dispute must be resolved
        (asserts! (or (is-eq (get status dispute) STATUS-RESOLVED-UPHELD)
                      (is-eq (get status dispute) STATUS-RESOLVED-REJECTED)) ERR-APPEAL-NOT-ALLOWED)
        ;; Must be within appeal window
        (asserts! (match (get appeal-deadline dispute)
            deadline (<= stacks-block-height deadline)
            false
        ) ERR-DEADLINE-PASSED)
        ;; No existing appeal
        (asserts! (is-none (map-get? appeals dispute-id)) ERR-ALREADY-EXISTS)

        ;; Create appeal record
        (map-set appeals dispute-id {
            original-dispute-id: dispute-id,
            appellant: tx-sender,
            reason: reason,
            new-evidence-uri: new-evidence-uri,
            status: STATUS-PENDING,
            created-at: stacks-block-height,
            resolved-at: none
        })

        ;; Update dispute status
        (map-set disputes dispute-id (merge dispute {
            status: STATUS-APPEALED,
            updated-at: stacks-block-height
        }))

        (ok true)
    )
)

;; Close dispute (admin only - after appeal window passes)
(define-public (close-dispute (dispute-id uint))
    (let (
        (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        ;; Must be resolved and past appeal window
        (asserts! (or (is-eq (get status dispute) STATUS-RESOLVED-UPHELD)
                      (is-eq (get status dispute) STATUS-RESOLVED-REJECTED)) ERR-DISPUTE-NOT-PENDING)
        (asserts! (match (get appeal-deadline dispute)
            deadline (> stacks-block-height deadline)
            true
        ) ERR-APPEAL-NOT-ALLOWED)

        ;; Clear active dispute for product
        (map-delete product-active-dispute (get product-id dispute))

        ;; Update status
        (map-set disputes dispute-id (merge dispute {
            status: STATUS-CLOSED,
            updated-at: stacks-block-height
        }))

        (ok true)
    )
)

;; ============================================================================
;; ADMIN FUNCTIONS
;; ============================================================================

;; Clear penalty (admin only)
(define-public (clear-penalty (account principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)

        (map-delete penalties account)

        (ok true)
    )
)

;; Force close dispute (admin emergency function)
(define-public (force-close-dispute (dispute-id uint))
    (let (
        (dispute (unwrap! (map-get? disputes dispute-id) ERR-NOT-FOUND))
    )
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)

        ;; Clear active dispute for product
        (map-delete product-active-dispute (get product-id dispute))

        ;; Update status
        (map-set disputes dispute-id (merge dispute {
            status: STATUS-CLOSED,
            updated-at: stacks-block-height
        }))

        (ok true)
    )
)
