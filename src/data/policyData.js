// ============================================================
// InsureX Policy & Policy Type Mock Data
// All data is fictional. Future backend: Express + PostgreSQL + Prisma
// ============================================================

import { initialCustomers } from './customerData'

export function formatINR(n) { return `₹${Number(n).toLocaleString('en-IN')}` }

export function generatePolicyNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `POL-2024-${n}`
}

// ── Policy Type definitions ──────────────────────────────────────
export const initialPolicyTypes = [
  {
    typeId: 'PTYPE-01', name: 'Life Insurance', code: 'LIFE', status: 'active',
    description: 'Provides financial security to nominated beneficiaries upon the insured individual\'s demise.',
    coverageDetails: 'Covers natural death, accidental death, and terminal illness. Sum assured ranges from ₹5,00,000 to ₹2,00,00,000.',
    eligibility: 'Indian residents aged 18–65 years with valid Aadhaar/PAN. Medical examination required for sum assured above ₹50,00,000.',
    terms: 'Policy term: 10–40 years. Premium payment: monthly, quarterly, half-yearly, or annually. Surrender value available after 3 years.',
    icon: 'Shield',
  },
  {
    typeId: 'PTYPE-02', name: 'Health Insurance', code: 'HEALTH', status: 'active',
    description: 'Covers medical expenses including hospitalisation, surgery, diagnostics, and post-operative care.',
    coverageDetails: 'Cashless treatment at 5,000+ network hospitals. Covers pre & post hospitalisation (30/60 days). Day-care procedures included.',
    eligibility: 'Individuals aged 18–65. Family floater plans available. No medical test required up to ₹10,00,000 sum insured.',
    terms: 'Annual renewal. Waiting period: 30 days (general), 2 years (pre-existing). No-claim bonus: 10–50% cumulative.',
    icon: 'Heart',
  },
  {
    typeId: 'PTYPE-03', name: 'Vehicle Insurance', code: 'VEHICLE', status: 'active',
    description: 'Protects against financial loss from vehicle damage, theft, and third-party liability.',
    coverageDetails: 'Comprehensive cover: own damage + third-party liability. Roadside assistance. Personal accident cover for owner-driver.',
    eligibility: 'Any registered vehicle owner in India. Vehicle must have valid RC and fitness certificate.',
    terms: 'Annual policy. NCB: 20–50%. Depreciation applicable on parts. Zero-depreciation add-on available.',
    icon: 'Car',
  },
  {
    typeId: 'PTYPE-04', name: 'Home Insurance', code: 'HOME', status: 'active',
    description: 'Covers residential property against damage from fire, natural disasters, burglary, and structural failure.',
    coverageDetails: 'Structure cover + contents cover. Fire, flood, earthquake, and theft protection. Temporary accommodation costs covered.',
    eligibility: 'Property owners or tenants in India. Structure must be a permanent dwelling with valid municipal records.',
    terms: 'Annual or multi-year policy (up to 5 years). Deductible applies per claim. No-claim discount: 5–15%.',
    icon: 'Home',
  },
  {
    typeId: 'PTYPE-05', name: 'Travel Insurance', code: 'TRAVEL', status: 'active',
    description: 'Protection during domestic and international travel covering medical emergencies, trip cancellation, and baggage loss.',
    coverageDetails: 'Emergency medical evacuation. Flight delay/cancellation cover. Lost baggage and passport assistance. Adventure sports optional.',
    eligibility: 'Indian citizens aged 6 months to 70 years. Valid travel documents required for international cover.',
    terms: 'Single-trip or multi-trip annual plans. Cover starts from departure. Claim within 30 days of return.',
    icon: 'Plane',
  },
  {
    typeId: 'PTYPE-06', name: 'Other Insurance', code: 'OTHER', status: 'active',
    description: 'Specialised insurance products including commercial, marine, crop, and professional liability.',
    coverageDetails: 'Customised cover as per business or professional requirements. Sum insured determined by risk assessment.',
    eligibility: 'Eligibility criteria vary per product. KYC verification required.',
    terms: 'Terms and premium determined during underwriting. Renewal subject to claims history.',
    icon: 'Package',
  },
]

// ── Policies ─────────────────────────────────────────────────────
const FREQ = ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually']

export const initialPolicies = [
  { policyId: 'POL-001', policyNumber: 'POL-2024-0101', customerId: 'CUST-1001', customerName: 'Arjun Mehta',    policyTypeId: 'PTYPE-01', policyType: 'Life Insurance',    sumAssured: 2500000, premiumAmount: 18500, premiumFrequency: 'Annually',    startDate: '2024-01-10', expiryDate: '2034-01-10', status: 'active' },
  { policyId: 'POL-002', policyNumber: 'POL-2023-0045', customerId: 'CUST-1001', customerName: 'Arjun Mehta',    policyTypeId: 'PTYPE-02', policyType: 'Health Insurance',  sumAssured: 1000000, premiumAmount: 12000, premiumFrequency: 'Annually',    startDate: '2023-06-01', expiryDate: '2024-06-01', status: 'expired' },
  { policyId: 'POL-003', policyNumber: 'POL-2024-0202', customerId: 'CUST-1002', customerName: 'Sunita Rao',     policyTypeId: 'PTYPE-02', policyType: 'Health Insurance',  sumAssured: 500000,  premiumAmount: 9800,  premiumFrequency: 'Annually',    startDate: '2024-02-20', expiryDate: '2025-02-20', status: 'active' },
  { policyId: 'POL-004', policyNumber: 'POL-2024-0303', customerId: 'CUST-1003', customerName: 'Ravi Desai',     policyTypeId: 'PTYPE-03', policyType: 'Vehicle Insurance', sumAssured: 800000,  premiumAmount: 8400,  premiumFrequency: 'Annually',    startDate: '2024-03-15', expiryDate: '2025-03-15', status: 'active' },
  { policyId: 'POL-005', policyNumber: 'POL-2023-0123', customerId: 'CUST-1003', customerName: 'Ravi Desai',     policyTypeId: 'PTYPE-01', policyType: 'Life Insurance',    sumAssured: 5000000, premiumAmount: 22000, premiumFrequency: 'Half-Yearly', startDate: '2022-05-01', expiryDate: '2023-05-01', status: 'expired' },
  { policyId: 'POL-006', policyNumber: 'POL-2024-0404', customerId: 'CUST-1004', customerName: 'Kavya Iyer',     policyTypeId: 'PTYPE-04', policyType: 'Home Insurance',    sumAssured: 3000000, premiumAmount: 9200,  premiumFrequency: 'Annually',    startDate: '2024-04-01', expiryDate: '2025-04-01', status: 'active' },
  { policyId: 'POL-007', policyNumber: 'POL-2024-0707', customerId: 'CUST-1007', customerName: 'Vikram Singh',   policyTypeId: 'PTYPE-01', policyType: 'Life Insurance',    sumAssured: 10000000,premiumAmount: 25000, premiumFrequency: 'Quarterly',   startDate: '2024-07-01', expiryDate: '2034-07-01', status: 'active' },
  { policyId: 'POL-008', policyNumber: 'POL-2024-0808', customerId: 'CUST-1008', customerName: 'Nisha Gupta',    policyTypeId: 'PTYPE-03', policyType: 'Vehicle Insurance', sumAssured: 600000,  premiumAmount: 7600,  premiumFrequency: 'Annually',    startDate: '2024-08-01', expiryDate: '2025-08-01', status: 'cancelled' },
  { policyId: 'POL-009', policyNumber: 'POL-2024-0909', customerId: 'CUST-1009', customerName: 'Priya Sharma',   policyTypeId: 'PTYPE-02', policyType: 'Health Insurance',  sumAssured: 1500000, premiumAmount: 14800, premiumFrequency: 'Annually',    startDate: '2024-06-01', expiryDate: '2025-06-01', status: 'active' },
  { policyId: 'POL-010', policyNumber: 'POL-2024-0910', customerId: 'CUST-1009', customerName: 'Priya Sharma',   policyTypeId: 'PTYPE-01', policyType: 'Life Insurance',    sumAssured: 7500000, premiumAmount: 20000, premiumFrequency: 'Half-Yearly', startDate: '2024-09-01', expiryDate: '2034-09-01', status: 'pending' },
  { policyId: 'POL-011', policyNumber: 'POL-2023-1201', customerId: 'CUST-1012', customerName: 'Suresh Kumar',   policyTypeId: 'PTYPE-04', policyType: 'Home Insurance',    sumAssured: 4500000, premiumAmount: 11000, premiumFrequency: 'Annually',    startDate: '2023-10-01', expiryDate: '2024-10-01', status: 'active' },
  { policyId: 'POL-012', policyNumber: 'POL-2024-1202', customerId: 'CUST-1012', customerName: 'Suresh Kumar',   policyTypeId: 'PTYPE-02', policyType: 'Health Insurance',  sumAssured: 2000000, premiumAmount: 13500, premiumFrequency: 'Annually',    startDate: '2024-04-10', expiryDate: '2025-04-10', status: 'active' },
  { policyId: 'POL-013', policyNumber: 'POL-2024-1301', customerId: 'CUST-1004', customerName: 'Kavya Iyer',     policyTypeId: 'PTYPE-05', policyType: 'Travel Insurance',  sumAssured: 200000,  premiumAmount: 3500,  premiumFrequency: 'Annually',    startDate: '2024-06-15', expiryDate: '2025-06-15', status: 'active' },
  { policyId: 'POL-014', policyNumber: 'POL-2024-1401', customerId: 'CUST-1005', customerName: 'Deepak Sharma',  policyTypeId: 'PTYPE-01', policyType: 'Life Insurance',    sumAssured: 3000000, premiumAmount: 16000, premiumFrequency: 'Quarterly',   startDate: '2024-02-01', expiryDate: '2034-02-01', status: 'pending' },
  { policyId: 'POL-015', policyNumber: 'POL-2024-1501', customerId: 'CUST-1010', customerName: 'Rahul Verma',    policyTypeId: 'PTYPE-06', policyType: 'Other Insurance',   sumAssured: 1000000, premiumAmount: 8000,  premiumFrequency: 'Annually',    startDate: '2024-05-01', expiryDate: '2025-05-01', status: 'active' },
]

// ── Policy Premiums (installment records) ─────────────────────────
export const policyPremiums = [
  { premiumId: 'PRM-001-01', policyId: 'POL-001', amount: 18500, dueDate: '2024-01-10', paidDate: '2024-01-10', status: 'paid' },
  { premiumId: 'PRM-001-02', policyId: 'POL-001', amount: 18500, dueDate: '2025-01-10', paidDate: null,         status: 'due' },
  { premiumId: 'PRM-003-01', policyId: 'POL-003', amount: 9800,  dueDate: '2024-02-20', paidDate: '2024-02-20', status: 'paid' },
  { premiumId: 'PRM-004-01', policyId: 'POL-004', amount: 8400,  dueDate: '2024-03-15', paidDate: '2024-03-15', status: 'paid' },
  { premiumId: 'PRM-006-01', policyId: 'POL-006', amount: 9200,  dueDate: '2024-04-01', paidDate: '2024-04-01', status: 'paid' },
  { premiumId: 'PRM-007-01', policyId: 'POL-007', amount: 25000, dueDate: '2024-07-01', paidDate: '2024-07-01', status: 'paid' },
  { premiumId: 'PRM-007-02', policyId: 'POL-007', amount: 25000, dueDate: '2024-10-01', paidDate: null,         status: 'due' },
  { premiumId: 'PRM-009-01', policyId: 'POL-009', amount: 14800, dueDate: '2024-06-01', paidDate: '2024-06-01', status: 'paid' },
  { premiumId: 'PRM-011-01', policyId: 'POL-011', amount: 11000, dueDate: '2023-10-01', paidDate: '2023-10-01', status: 'paid' },
  { premiumId: 'PRM-012-01', policyId: 'POL-012', amount: 13500, dueDate: '2024-04-10', paidDate: '2024-04-10', status: 'paid' },
  { premiumId: 'PRM-013-01', policyId: 'POL-013', amount: 3500,  dueDate: '2024-06-15', paidDate: '2024-06-15', status: 'paid' },
  { premiumId: 'PRM-015-01', policyId: 'POL-015', amount: 8000,  dueDate: '2024-05-01', paidDate: '2024-05-01', status: 'paid' },
]

// ── Policy Payments ───────────────────────────────────────────────
export const policyPayments = [
  { paymentId: 'PPAY-001', policyId: 'POL-001', amount: 18500, paymentDate: '2024-01-10', mode: 'UPI',           status: 'paid' },
  { paymentId: 'PPAY-002', policyId: 'POL-003', amount: 9800,  paymentDate: '2024-02-20', mode: 'Credit Card',   status: 'paid' },
  { paymentId: 'PPAY-003', policyId: 'POL-004', amount: 8400,  paymentDate: '2024-03-15', mode: 'Net Banking',   status: 'paid' },
  { paymentId: 'PPAY-004', policyId: 'POL-006', amount: 9200,  paymentDate: '2024-04-01', mode: 'UPI',           status: 'paid' },
  { paymentId: 'PPAY-005', policyId: 'POL-007', amount: 25000, paymentDate: '2024-07-01', mode: 'Bank Transfer', status: 'paid' },
  { paymentId: 'PPAY-006', policyId: 'POL-008', amount: 7600,  paymentDate: '2024-08-01', mode: 'Debit Card',    status: 'failed' },
  { paymentId: 'PPAY-007', policyId: 'POL-009', amount: 14800, paymentDate: '2024-06-01', mode: 'UPI',           status: 'paid' },
  { paymentId: 'PPAY-008', policyId: 'POL-011', amount: 11000, paymentDate: '2023-10-01', mode: 'Bank Transfer', status: 'paid' },
  { paymentId: 'PPAY-009', policyId: 'POL-012', amount: 13500, paymentDate: '2024-04-10', mode: 'UPI',           status: 'paid' },
  { paymentId: 'PPAY-010', policyId: 'POL-013', amount: 3500,  paymentDate: '2024-06-15', mode: 'Credit Card',   status: 'paid' },
  { paymentId: 'PPAY-011', policyId: 'POL-015', amount: 8000,  paymentDate: '2024-05-01', mode: 'Net Banking',   status: 'paid' },
]

// ── Policy Claims ─────────────────────────────────────────────────
export const policyClaims = [
  { claimId: 'PCLM-001', policyId: 'POL-001', claimedAmount: 45000,  claimDate: '2024-05-12', status: 'approved',     description: 'Hospitalisation — appendix surgery' },
  { claimId: 'PCLM-002', policyId: 'POL-003', claimedAmount: 18000,  claimDate: '2024-06-20', status: 'under_review', description: 'Diagnostic tests & consultation' },
  { claimId: 'PCLM-003', policyId: 'POL-004', claimedAmount: 28000,  claimDate: '2024-07-05', status: 'pending',      description: 'Vehicle accident repair' },
  { claimId: 'PCLM-004', policyId: 'POL-009', claimedAmount: 32000,  claimDate: '2024-08-14', status: 'settled',      description: 'ICU & post-op care' },
  { claimId: 'PCLM-005', policyId: 'POL-010', claimedAmount: 500000, claimDate: '2024-09-18', status: 'rejected',     description: 'Pre-existing condition exclusion' },
  { claimId: 'PCLM-006', policyId: 'POL-011', claimedAmount: 75000,  claimDate: '2024-03-22', status: 'settled',      description: 'Flood damage to property' },
]

// ── Policy Beneficiaries ──────────────────────────────────────────
export const policyBeneficiaries = [
  { beneficiaryId: 'PBEN-001', policyId: 'POL-001', name: 'Priti Mehta',   relationship: 'Spouse', allocation: 70 },
  { beneficiaryId: 'PBEN-002', policyId: 'POL-001', name: 'Ramesh Mehta',  relationship: 'Father', allocation: 30 },
  { beneficiaryId: 'PBEN-003', policyId: 'POL-007', name: 'Manpreet Kaur', relationship: 'Spouse', allocation: 60 },
  { beneficiaryId: 'PBEN-004', policyId: 'POL-007', name: 'Harjit Singh',  relationship: 'Son',    allocation: 40 },
  { beneficiaryId: 'PBEN-005', policyId: 'POL-009', name: 'Anoop Sharma',  relationship: 'Spouse', allocation: 100 },
  { beneficiaryId: 'PBEN-006', policyId: 'POL-010', name: 'Anoop Sharma',  relationship: 'Spouse', allocation: 100 },
  { beneficiaryId: 'PBEN-007', policyId: 'POL-011', name: 'Lalitha Kumar', relationship: 'Spouse', allocation: 50 },
  { beneficiaryId: 'PBEN-008', policyId: 'POL-011', name: 'Karan Kumar',   relationship: 'Son',    allocation: 50 },
]

// ── Policy Renewals ───────────────────────────────────────────────
export const policyRenewals = [
  { renewalId: 'REN-001', policyId: 'POL-001', dueDate: '2025-01-10', renewedDate: null,         status: 'upcoming', newPremium: 19500 },
  { renewalId: 'REN-002', policyId: 'POL-003', dueDate: '2025-02-20', renewedDate: null,         status: 'upcoming', newPremium: 10200 },
  { renewalId: 'REN-003', policyId: 'POL-004', dueDate: '2025-03-15', renewedDate: null,         status: 'upcoming', newPremium: 8800 },
  { renewalId: 'REN-004', policyId: 'POL-006', dueDate: '2025-04-01', renewedDate: null,         status: 'upcoming', newPremium: 9600 },
  { renewalId: 'REN-005', policyId: 'POL-002', dueDate: '2024-06-01', renewedDate: null,         status: 'overdue',  newPremium: 12500 },
  { renewalId: 'REN-006', policyId: 'POL-009', dueDate: '2025-06-01', renewedDate: null,         status: 'upcoming', newPremium: 15200 },
  { renewalId: 'REN-007', policyId: 'POL-011', dueDate: '2024-10-01', renewedDate: '2024-09-25', status: 'renewed',  newPremium: 11500 },
]

// ── Derived helper functions ──────────────────────────────────────
export function getPolicyPremiums(policyId)       { return policyPremiums.filter(p => p.policyId === policyId) }
export function getPolicyPayments(policyId)       { return policyPayments.filter(p => p.policyId === policyId) }
export function getPolicyClaims(policyId)         { return policyClaims.filter(c => c.policyId === policyId) }
export function getPolicyBeneficiaries(policyId)  { return policyBeneficiaries.filter(b => b.policyId === policyId) }
export function getPolicyRenewals(policyId)       { return policyRenewals.filter(r => r.policyId === policyId) }

export function getCustomerForPolicy(customerId) {
  return initialCustomers.find(c => c.customerId === customerId) || null
}

export function countPoliciesByType(policies, typeId) {
  return policies.filter(p => p.policyTypeId === typeId).length
}

// ── Status mappings ──────────────────────────────────────────────
export const POLICY_STATUS = {
  active:    { label: 'Active',    variant: 'green' },
  pending:   { label: 'Pending',   variant: 'yellow' },
  expired:   { label: 'Expired',   variant: 'red' },
  cancelled: { label: 'Cancelled', variant: 'gray' },
}

export const PREMIUM_STATUS = {
  paid:    { label: 'Paid',    variant: 'green' },
  due:     { label: 'Due',     variant: 'yellow' },
  overdue: { label: 'Overdue', variant: 'red' },
}

export const CLAIM_STATUS = {
  approved:     { label: 'Approved',     variant: 'green' },
  under_review: { label: 'Under Review', variant: 'blue' },
  pending:      { label: 'Pending',      variant: 'yellow' },
  rejected:     { label: 'Rejected',     variant: 'red' },
  settled:      { label: 'Settled',      variant: 'green' },
}

export const RENEWAL_STATUS = {
  upcoming: { label: 'Upcoming', variant: 'blue' },
  overdue:  { label: 'Overdue',  variant: 'red' },
  renewed:  { label: 'Renewed',  variant: 'green' },
}

export const PAYMENT_STATUS = {
  paid:    { label: 'Paid',    variant: 'green' },
  pending: { label: 'Pending', variant: 'yellow' },
  failed:  { label: 'Failed',  variant: 'red' },
}

export const FREQUENCY_OPTIONS = ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually']

export const POLICY_TYPE_OPTIONS = initialPolicyTypes.map(t => ({ value: t.typeId, label: t.name }))

export const CUSTOMER_OPTIONS = initialCustomers.map(c => ({
  value: c.customerId,
  label: `${c.firstName} ${c.lastName}`,
  fullName: `${c.firstName} ${c.lastName}`,
}))
