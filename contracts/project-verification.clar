;; Project Verification Contract
;; Validates technical and financial viability of renewable energy projects

(define-data-var admin principal tx-sender)

;; Project status: 0 = pending, 1 = approved, 2 = rejected
(define-map projects
  { project-id: (string-ascii 36) }
  {
    owner: principal,
    technical-score: uint,
    financial-score: uint,
    status: uint,
    timestamp: uint
  }
)

;; Minimum scores required for approval
(define-data-var min-technical-score uint u70)
(define-data-var min-financial-score uint u70)

;; Register a new project for verification
(define-public (register-project (project-id (string-ascii 36)))
  (let ((caller tx-sender))
    (asserts! (is-none (map-get? projects { project-id: project-id })) (err u1))
    (ok (map-set projects
      { project-id: project-id }
      {
        owner: caller,
        technical-score: u0,
        financial-score: u0,
        status: u0,
        timestamp: block-height
      }
    ))
  )
)

;; Submit technical and financial scores (admin only)
(define-public (evaluate-project (project-id (string-ascii 36)) (technical-score uint) (financial-score uint))
  (let ((caller tx-sender))
    (asserts! (is-eq caller (var-get admin)) (err u2))
    (asserts! (is-some (map-get? projects { project-id: project-id })) (err u3))

    (map-set projects
      { project-id: project-id }
      (merge (unwrap-panic (map-get? projects { project-id: project-id }))
        {
          technical-score: technical-score,
          financial-score: financial-score
        }
      )
    )

    (ok true)
  )
)

;; Approve or reject a project based on scores
(define-public (finalize-verification (project-id (string-ascii 36)))
  (let (
    (caller tx-sender)
    (project-opt (map-get? projects { project-id: project-id }))
  )
    (asserts! (is-eq caller (var-get admin)) (err u2))
    (asserts! (is-some project-opt) (err u3))

    (let ((project (unwrap-panic project-opt)))
      (asserts! (is-eq (get status project) u0) (err u4))

      (if (and (>= (get technical-score project) (var-get min-technical-score))
               (>= (get financial-score project) (var-get min-financial-score)))
        (map-set projects
          { project-id: project-id }
          (merge project { status: u1 })
        )
        (map-set projects
          { project-id: project-id }
          (merge project { status: u2 })
        )
      )

      (ok true)
    )
  )
)

;; Check if a project is approved
(define-read-only (is-project-approved (project-id (string-ascii 36)))
  (let ((project-opt (map-get? projects { project-id: project-id })))
    (if (is-some project-opt)
      (is-eq (get status (unwrap-panic project-opt)) u1)
      false
    )
  )
)

;; Get project details
(define-read-only (get-project (project-id (string-ascii 36)))
  (map-get? projects { project-id: project-id })
)

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (let ((caller tx-sender))
    (asserts! (is-eq caller (var-get admin)) (err u2))
    (ok (var-set admin new-admin))
  )
)

