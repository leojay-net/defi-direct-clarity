;; title: defi-direct

;; traits
(define-trait sip010-trait (
  (transfer
    (uint principal principal (optional principal))
    (response bool uint)
  )
  (get-balance
    (principal)
    (response uint uint)
  )
  (get-decimals
    ()
    (response uint uint)
  )
  (get-symbol
    ()
    (response (string-ascii 32) uint)
  )
  (get-name
    ()
    (response (string-ascii 32) uint)
  )
))


;; constants
(define-constant err-fee-too-high (err u100))
(define-constant err-not-owner (err u101))
(define-constant err-not-tx-manager (err u102))
(define-constant err-token-not-supported (err u103))
(define-constant err-invalid-address (err u104))
(define-constant err-paused (err u105))
(define-constant err-not-paused (err u106))
(define-constant err-already-processed (err u107))
(define-constant err-amount-mismatch (err u108))
(define-constant err-insufficient-balance (err u109))
(define-constant err-invalid-amount (err u110))
(define-constant err-invalid-bank-account (err u111))
(define-constant err-invalid-bank-name (err u112))
(define-constant err-invalid-recipient-name (err u113))
(define-constant err-transaction-not-found (err u114))
(define-constant err-transaction-data-error (err u115))
(define-constant err-list-too-long (err u116))
(define-constant err-invalid-fiat-amount (err u117))
(define-constant err-arithmetic-overflow (err u118))

;; fee constant
(define-constant MAX-FEE u500)

;; data vars
(define-data-var owner principal tx-sender)
(define-data-var paused bool false)
(define-data-var spread-fee-percentage uint u0)
(define-data-var transaction-manager (optional principal) none)
(define-data-var fee-receiver (optional principal) none)
(define-data-var vault-address (optional principal) none)

;; data maps
(define-map supported-tokens
  principal
  bool
)
(define-map collected-fees
  principal
  uint
)
(define-map transactions
  (buff 32)
  {
    user: principal,
    token: principal,
    amount: uint,
    amount-spent: uint,
    transaction-fee: uint,
    transaction-timestamp: uint,
    fiat-bank-account-number: uint,
    fiat-bank: (string-ascii 32),
    recipient-name: (string-ascii 32),
    fiat-amount: uint,
    is-completed: bool,
    is-refunded: bool,
  }
)
(define-map user-transaction-ids
  principal
  (list 100 (buff 32))
)

;; public functions

(define-public (initializer
    (fee uint)
    (tx-manager principal)
    (fee-recv principal)
    (vault principal)
  )
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) err-not-owner)
    (asserts! (<= fee MAX-FEE) err-fee-too-high)
    (var-set spread-fee-percentage fee)
    (var-set transaction-manager (some tx-manager))
    (var-set fee-receiver (some fee-recv))
    (var-set vault-address (some vault))
    (ok true)
  )
)

(define-public (add-supported-token (token principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) err-not-owner)
    (map-set supported-tokens token true)
    (ok true)
  )
)

(define-public (remove-supported-token (token principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) err-not-owner)
    (map-set supported-tokens token false)
    (ok true)
  )
)

(define-public (update-spread-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) err-not-owner)
    (asserts! (<= new-fee MAX-FEE) err-fee-too-high)
    (var-set spread-fee-percentage new-fee)
    (ok true)
  )
)

(define-public (set-fee-receiver (fee-recv principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) err-not-owner)
    (var-set fee-receiver (some fee-recv))
    (ok true)
  )
)

(define-public (set-vault-address (vault principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) err-not-owner)
    (var-set vault-address (some vault))
    (ok true)
  )
)

(define-public (set-transaction-manager (tx-manager principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) err-not-owner)
    (var-set transaction-manager (some tx-manager))
    (ok true)
  )
)

(define-public (pause)
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) err-not-owner)
    (var-set paused true)
    (ok true)
  )
)

(define-public (unpause)
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) err-not-owner)
    (var-set paused false)
    (ok true)
  )
)

(define-public (initiate-fiat-transaction
    (token-contract <sip010-trait>)
    (amount uint)
    (fiat-bank-account-number uint)
    (fiat-amount uint)
    (fiat-bank (string-ascii 32))
    (recipient-name (string-ascii 32))
  )
  (let (
      (token (contract-of token-contract))
      (is-supported (default-to false (map-get? supported-tokens token)))
      (fee (var-get spread-fee-percentage))
      (fee-amt (/ (* amount fee) u10000))
      (total-amt (+ amount fee-amt))
      (now stacks-block-height)
      (tx-id (sha256 (concat (unwrap! (to-consensus-buff? amount) err-transaction-data-error)
        (unwrap! (to-consensus-buff? now) err-transaction-data-error)
      )))
    )
    (begin
      ;; Validation 
      (asserts! (not (var-get paused)) err-paused)
      (asserts! (> amount u0) err-invalid-amount)
      (asserts! (> fiat-bank-account-number u0) err-invalid-bank-account)
      (asserts! (> fiat-amount u0) err-invalid-fiat-amount)
      (asserts! (> (len fiat-bank) u0) err-invalid-bank-name)
      (asserts! (> (len recipient-name) u0) err-invalid-recipient-name)
      (asserts! is-supported err-token-not-supported)
      ;; Checking for arithmetic overflow
      (asserts! (> total-amt amount) err-arithmetic-overflow)
      (try! (contract-call? token-contract transfer total-amt tx-sender
        (as-contract tx-sender) none
      ))
      ;; Recording the transaction
      (map-set transactions tx-id {
        user: tx-sender,
        token: token,
        amount: amount,
        amount-spent: u0,
        transaction-fee: fee-amt,
        transaction-timestamp: now,
        fiat-bank-account-number: fiat-bank-account-number,
        fiat-bank: fiat-bank,
        recipient-name: recipient-name,
        fiat-amount: fiat-amount,
        is-completed: false,
        is-refunded: false,
      })
      ;; Update user transaction list
      (let ((existing-ids (default-to (list) (map-get? user-transaction-ids tx-sender))))
        (map-set user-transaction-ids tx-sender
          (unwrap! (as-max-len? (append existing-ids tx-id) u100) (err u116))
        )
      )
      (ok tx-id)
    )
  )
)

(define-public (complete-transaction
    (token <sip010-trait>) ;; Require trait reference
    (tx-id (buff 32))
    (amount-spent uint)
  )
  (let (
      (tx (map-get? transactions tx-id))
      (tx-manager (var-get transaction-manager))
    )
    (begin
      (asserts! (is-some tx-manager) err-not-tx-manager)
      (asserts! (is-eq tx-sender (unwrap! tx-manager err-not-tx-manager))
        err-not-tx-manager
      )
      (asserts! (is-some tx) err-transaction-not-found)
      (let ((txn (unwrap! tx err-transaction-data-error)))
        (asserts! (not (get is-completed txn)) err-already-processed)
        (asserts! (not (get is-refunded txn)) err-already-processed)
        (asserts! (is-eq amount-spent (get amount txn)) err-amount-mismatch)
        ;; Verify the token matches stored principal
        (asserts! (is-eq (contract-of token) (get token txn))
          err-token-not-supported
        )
        (try! (contract-call? token transfer (get transaction-fee txn)
          (as-contract tx-sender)
          (unwrap! (var-get fee-receiver) err-invalid-address) none
        ))
        (map-set transactions tx-id
          (merge txn {
            amount-spent: amount-spent,
            is-completed: true,
          })
        )
        (ok true)
      )
    )
  )
)

(define-public (refund
    (tx-id (buff 32))
    (token-contract <sip010-trait>)
  )
  (let ((tx (map-get? transactions tx-id)))
    (begin
      (asserts! (is-eq tx-sender (var-get owner)) err-not-owner)
      (asserts! (is-some tx) err-transaction-not-found)
      (let ((txn (unwrap! tx err-transaction-data-error)))
        (asserts! (not (get is-completed txn)) err-already-processed)
        (asserts! (not (get is-refunded txn)) err-already-processed)
        (try! (contract-call? token-contract transfer (get amount txn)
          (as-contract (get user txn))
          (unwrap! (var-get vault-address) err-invalid-address) none
        ))
        (map-set transactions tx-id (merge txn { is-refunded: true }))
        (ok true)
      )
    )
  )
)

;; read only functions

(define-read-only (get-fee-receiver)
  (var-get fee-receiver)
)

(define-read-only (get-vault-address)
  (var-get vault-address)
)

(define-read-only (get-transaction-manager)
  (var-get transaction-manager)
)

(define-read-only (get-transaction-ids (user principal))
  (default-to (list) (map-get? user-transaction-ids user))
)

(define-read-only (get-transaction (tx-id (buff 32)))
  (map-get? transactions tx-id)
)
(define-read-only (is-token-supported (token principal))
  (default-to false (map-get? supported-tokens token))
)
(define-read-only (is-paused)
  (var-get paused)
)
