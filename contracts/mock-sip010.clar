;; Mock SIP-010 Token for Testing

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-insufficient-balance (err u102))
(define-constant err-invalid-amount (err u103))

;; Token Metadata
(define-constant token-name "Mock Token")
(define-constant token-symbol "MOCK")
(define-constant token-decimals u6)

;; Data Variables
(define-data-var total-supply uint u1000000000000) ;; 1M tokens with 6 decimals

;; Data Maps
(define-map balances principal uint)

;; Initialize contract owner balance
(map-set balances contract-owner (var-get total-supply))

;; SIP-010 Functions

(define-public (transfer (amount uint) (from principal) (to principal) (memo (optional principal)))
  (begin
    (asserts! (or (is-eq tx-sender from) (is-eq tx-sender contract-caller)) err-not-token-owner)
    (asserts! (> amount u0) err-invalid-amount)
    (let ((from-balance (get-balance-of from)))
      (asserts! (>= from-balance amount) err-insufficient-balance)
      (map-set balances from (- from-balance amount))
      (map-set balances to (+ (get-balance-of to) amount))
      (ok true)
    )
  )
)

(define-read-only (get-name)
  (ok token-name)
)

(define-read-only (get-symbol)
  (ok token-symbol)
)

(define-read-only (get-decimals)
  (ok token-decimals)
)

(define-read-only (get-balance (who principal))
  (ok (get-balance-of who))
)

(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

(define-read-only (get-token-uri)
  (ok none)
)

;; Helper Functions
(define-private (get-balance-of (who principal))
  (default-to u0 (map-get? balances who))
)

;; Testing utility functions
(define-public (mint (amount uint) (to principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (> amount u0) err-invalid-amount)
    (let ((current-balance (get-balance-of to))
          (new-total-supply (+ (var-get total-supply) amount)))
      (map-set balances to (+ current-balance amount))
      (var-set total-supply new-total-supply)
      (ok true)
    )
  )
)

(define-public (set-balance (who principal) (new-balance uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (map-set balances who new-balance)
    (ok true)
  )
)

(define-read-only (get-contract-owner)
  contract-owner
)