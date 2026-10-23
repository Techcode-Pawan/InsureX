// Claim status rules mirrored from server/src/services/claimService.js (the API enforces them).
const OPEN = ['PENDING', 'UNDER_REVIEW']
export const SETTLEMENT_METHODS = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cashless (hospital)']

export const CLAIM_STEPS = [
  { key: 'PENDING', label: 'Filed' },
  { key: 'UNDER_REVIEW', label: 'Under review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'SETTLED', label: 'Settled' },
]

// Valid decisions for a claim in its current status. The API re-checks every transition.
export function availableClaimActions(status) {
  return {
    assign: OPEN.includes(status),
    approve: OPEN.includes(status),
    reject: OPEN.includes(status),
    settle: status === 'APPROVED',
  }
}
