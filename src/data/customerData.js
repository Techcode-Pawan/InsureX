// ============================================================
// InsureX Customer Mock Data
// All data is fictional and for demonstration purposes only.
// Future backend: Express.js + PostgreSQL + Prisma
// ============================================================

// ── Helpers ──────────────────────────────────────────────────
export function formatINR(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

export function generateCustomerId() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `CUST-${n}`
}

// ── Avatar color palette (deterministic by initials) ─────────
const AVATAR_COLORS = [
  '#168BFF', '#10B981', '#F59E0B', '#6366F1',
  '#EF4444', '#20B8FF', '#8B5CF6', '#EC4899',
]
export function avatarColor(name = '') {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
export function initials(firstName = '', lastName = '') {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()
}

// ── Customers ─────────────────────────────────────────────────
export const initialCustomers = [
  {
    customerId: 'CUST-1001',
    firstName: 'Arjun',
    lastName: 'Mehta',
    dateOfBirth: '1988-04-15',
    gender: 'Male',
    email: 'arjun.mehta@email.com',
    phone: '+91 98201 34567',
    address: '14, Shivaji Nagar, Pune',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411005',
    idProofType: 'Aadhaar',
    maskedIdProofNumber: 'XXXX-XXXX-4521',
    status: 'active',
    registrationDate: '2022-03-10',
  },
  {
    customerId: 'CUST-1002',
    firstName: 'Sunita',
    lastName: 'Rao',
    dateOfBirth: '1992-09-22',
    gender: 'Female',
    email: 'sunita.rao@email.com',
    phone: '+91 99300 78901',
    address: '7, Jayanagar 4th Block, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560011',
    idProofType: 'PAN',
    maskedIdProofNumber: 'ABCXXXXX8D',
    status: 'active',
    registrationDate: '2022-07-18',
  },
  {
    customerId: 'CUST-1003',
    firstName: 'Ravi',
    lastName: 'Desai',
    dateOfBirth: '1979-12-05',
    gender: 'Male',
    email: 'ravi.desai@email.com',
    phone: '+91 90220 55678',
    address: '203, Sector 14, Gurugram',
    city: 'Gurugram',
    state: 'Haryana',
    postalCode: '122001',
    idProofType: 'Passport',
    maskedIdProofNumber: 'PXXXXXXX4',
    status: 'active',
    registrationDate: '2021-11-02',
  },
  {
    customerId: 'CUST-1004',
    firstName: 'Kavya',
    lastName: 'Iyer',
    dateOfBirth: '1995-06-30',
    gender: 'Female',
    email: 'kavya.iyer@email.com',
    phone: '+91 91760 23456',
    address: '56, Anna Salai, Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postalCode: '600002',
    idProofType: 'Aadhaar',
    maskedIdProofNumber: 'XXXX-XXXX-8830',
    status: 'active',
    registrationDate: '2023-01-25',
  },
  {
    customerId: 'CUST-1005',
    firstName: 'Deepak',
    lastName: 'Sharma',
    dateOfBirth: '1983-02-14',
    gender: 'Male',
    email: 'deepak.sharma@email.com',
    phone: '+91 87654 12345',
    address: '9, Civil Lines, Jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    postalCode: '302006',
    idProofType: 'Driving Licence',
    maskedIdProofNumber: 'RJ-XXXXXX789',
    status: 'inactive',
    registrationDate: '2021-06-12',
  },
  {
    customerId: 'CUST-1006',
    firstName: 'Meera',
    lastName: 'Pillai',
    dateOfBirth: '1990-11-18',
    gender: 'Female',
    email: 'meera.pillai@email.com',
    phone: '+91 94470 34567',
    address: '22, MG Road, Kochi',
    city: 'Kochi',
    state: 'Kerala',
    postalCode: '682016',
    idProofType: 'Aadhaar',
    maskedIdProofNumber: 'XXXX-XXXX-2214',
    status: 'pending_verification',
    registrationDate: '2024-01-08',
  },
  {
    customerId: 'CUST-1007',
    firstName: 'Vikram',
    lastName: 'Singh',
    dateOfBirth: '1975-07-07',
    gender: 'Male',
    email: 'vikram.singh@email.com',
    phone: '+91 98110 67890',
    address: '101, Model Town, Ludhiana',
    city: 'Ludhiana',
    state: 'Punjab',
    postalCode: '141002',
    idProofType: 'PAN',
    maskedIdProofNumber: 'BCDXXXXX5K',
    status: 'active',
    registrationDate: '2022-09-30',
  },
  {
    customerId: 'CUST-1008',
    firstName: 'Nisha',
    lastName: 'Gupta',
    dateOfBirth: '1998-03-28',
    gender: 'Female',
    email: 'nisha.gupta@email.com',
    phone: '+91 93005 11223',
    address: '34, Hazratganj, Lucknow',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    postalCode: '226001',
    idProofType: 'Aadhaar',
    maskedIdProofNumber: 'XXXX-XXXX-6677',
    status: 'active',
    registrationDate: '2023-05-15',
  },
  {
    customerId: 'CUST-1009',
    firstName: 'Priya',
    lastName: 'Sharma',
    dateOfBirth: '1986-08-11',
    gender: 'Female',
    email: 'priya.sharma@email.com',
    phone: '+91 77000 88990',
    address: '67, Salt Lake, Kolkata',
    city: 'Kolkata',
    state: 'West Bengal',
    postalCode: '700091',
    idProofType: 'Passport',
    maskedIdProofNumber: 'QXXXXXXX7',
    status: 'active',
    registrationDate: '2022-12-01',
  },
  {
    customerId: 'CUST-1010',
    firstName: 'Rahul',
    lastName: 'Verma',
    dateOfBirth: '1993-01-17',
    gender: 'Male',
    email: 'rahul.verma@email.com',
    phone: '+91 96321 54321',
    address: '88, Banjara Hills, Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '500034',
    idProofType: 'Driving Licence',
    maskedIdProofNumber: 'TS-XXXXXX456',
    status: 'inactive',
    registrationDate: '2021-04-20',
  },
  {
    customerId: 'CUST-1011',
    firstName: 'Anjali',
    lastName: 'Nair',
    dateOfBirth: '1997-05-09',
    gender: 'Female',
    email: 'anjali.nair@email.com',
    phone: '+91 88001 22334',
    address: '15, Viman Nagar, Pune',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411014',
    idProofType: 'Aadhaar',
    maskedIdProofNumber: 'XXXX-XXXX-9912',
    status: 'pending_verification',
    registrationDate: '2024-08-03',
  },
  {
    customerId: 'CUST-1012',
    firstName: 'Suresh',
    lastName: 'Kumar',
    dateOfBirth: '1970-10-25',
    gender: 'Male',
    email: 'suresh.kumar@email.com',
    phone: '+91 98400 11223',
    address: '45, T. Nagar, Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postalCode: '600017',
    idProofType: 'PAN',
    maskedIdProofNumber: 'DCEXXXXX2P',
    status: 'active',
    registrationDate: '2020-09-14',
  },
]

// ── Customer Policies ─────────────────────────────────────────
export const customerPolicies = [
  { policyId: 'CP-001', customerId: 'CUST-1001', policyNumber: 'POL-2024-0101', policyType: 'Life Insurance',    premiumAmount: 18500, policyStatus: 'active',    startDate: '2024-01-10', endDate: '2025-01-10' },
  { policyId: 'CP-002', customerId: 'CUST-1001', policyNumber: 'POL-2023-0045', policyType: 'Health Insurance',  premiumAmount: 12000, policyStatus: 'active',    startDate: '2023-06-01', endDate: '2024-06-01' },
  { policyId: 'CP-003', customerId: 'CUST-1002', policyNumber: 'POL-2024-0202', policyType: 'Health Insurance',  premiumAmount: 9800,  policyStatus: 'active',    startDate: '2024-02-20', endDate: '2025-02-20' },
  { policyId: 'CP-004', customerId: 'CUST-1003', policyNumber: 'POL-2024-0303', policyType: 'Vehicle Insurance', premiumAmount: 8400,  policyStatus: 'active',    startDate: '2024-03-15', endDate: '2025-03-15' },
  { policyId: 'CP-005', customerId: 'CUST-1003', policyNumber: 'POL-2023-0123', policyType: 'Life Insurance',    premiumAmount: 22000, policyStatus: 'expired',   startDate: '2022-05-01', endDate: '2023-05-01' },
  { policyId: 'CP-006', customerId: 'CUST-1004', policyNumber: 'POL-2024-0404', policyType: 'Home Insurance',    premiumAmount: 9200,  policyStatus: 'active',    startDate: '2024-04-01', endDate: '2025-04-01' },
  { policyId: 'CP-007', customerId: 'CUST-1007', policyNumber: 'POL-2024-0707', policyType: 'Life Insurance',    premiumAmount: 25000, policyStatus: 'active',    startDate: '2024-07-01', endDate: '2025-07-01' },
  { policyId: 'CP-008', customerId: 'CUST-1008', policyNumber: 'POL-2024-0808', policyType: 'Vehicle Insurance', premiumAmount: 7600,  policyStatus: 'cancelled', startDate: '2024-08-01', endDate: '2025-08-01' },
  { policyId: 'CP-009', customerId: 'CUST-1009', policyNumber: 'POL-2024-0909', policyType: 'Health Insurance',  premiumAmount: 14800, policyStatus: 'active',    startDate: '2024-06-01', endDate: '2025-06-01' },
  { policyId: 'CP-010', customerId: 'CUST-1009', policyNumber: 'POL-2024-0910', policyType: 'Life Insurance',    premiumAmount: 20000, policyStatus: 'pending',   startDate: '2024-09-01', endDate: '2025-09-01' },
  { policyId: 'CP-011', customerId: 'CUST-1012', policyNumber: 'POL-2023-1201', policyType: 'Home Insurance',    premiumAmount: 11000, policyStatus: 'active',    startDate: '2023-10-01', endDate: '2024-10-01' },
  { policyId: 'CP-012', customerId: 'CUST-1012', policyNumber: 'POL-2024-1202', policyType: 'Health Insurance',  premiumAmount: 13500, policyStatus: 'active',    startDate: '2024-04-10', endDate: '2025-04-10' },
]

// ── Customer Payments ─────────────────────────────────────────
export const customerPayments = [
  { paymentId: 'PAY-C001-01', policyId: 'CP-001', customerId: 'CUST-1001', amount: 18500, paymentDate: '2024-01-10', paymentMode: 'UPI',           paymentStatus: 'paid' },
  { paymentId: 'PAY-C001-02', policyId: 'CP-002', customerId: 'CUST-1001', amount: 12000, paymentDate: '2023-06-01', paymentMode: 'Bank Transfer',  paymentStatus: 'paid' },
  { paymentId: 'PAY-C002-01', policyId: 'CP-003', customerId: 'CUST-1002', amount: 9800,  paymentDate: '2024-02-20', paymentMode: 'Credit Card',    paymentStatus: 'paid' },
  { paymentId: 'PAY-C003-01', policyId: 'CP-004', customerId: 'CUST-1003', amount: 8400,  paymentDate: '2024-03-15', paymentMode: 'Net Banking',    paymentStatus: 'paid' },
  { paymentId: 'PAY-C004-01', policyId: 'CP-006', customerId: 'CUST-1004', amount: 9200,  paymentDate: '2024-04-01', paymentMode: 'UPI',            paymentStatus: 'paid' },
  { paymentId: 'PAY-C007-01', policyId: 'CP-007', customerId: 'CUST-1007', amount: 25000, paymentDate: '2024-07-01', paymentMode: 'Bank Transfer',  paymentStatus: 'paid' },
  { paymentId: 'PAY-C008-01', policyId: 'CP-008', customerId: 'CUST-1008', amount: 7600,  paymentDate: '2024-08-01', paymentMode: 'Debit Card',     paymentStatus: 'failed' },
  { paymentId: 'PAY-C009-01', policyId: 'CP-009', customerId: 'CUST-1009', amount: 14800, paymentDate: '2024-06-01', paymentMode: 'UPI',            paymentStatus: 'paid' },
  { paymentId: 'PAY-C009-02', policyId: 'CP-010', customerId: 'CUST-1009', amount: 20000, paymentDate: '2024-09-01', paymentMode: 'Credit Card',    paymentStatus: 'pending' },
  { paymentId: 'PAY-C012-01', policyId: 'CP-011', customerId: 'CUST-1012', amount: 11000, paymentDate: '2023-10-01', paymentMode: 'Bank Transfer',  paymentStatus: 'paid' },
  { paymentId: 'PAY-C012-02', policyId: 'CP-012', customerId: 'CUST-1012', amount: 13500, paymentDate: '2024-04-10', paymentMode: 'UPI',            paymentStatus: 'paid' },
]

// ── Customer Claims ────────────────────────────────────────────
export const customerClaims = [
  { claimId: 'CLM-C001-01', customerId: 'CUST-1001', policyId: 'CP-001', claimedAmount: 45000,  claimDate: '2024-05-12', claimStatus: 'approved',     description: 'Hospitalisation — appendix surgery' },
  { claimId: 'CLM-C002-01', customerId: 'CUST-1002', policyId: 'CP-003', claimedAmount: 18000,  claimDate: '2024-06-20', claimStatus: 'under_review', description: 'Diagnostic tests & consultation' },
  { claimId: 'CLM-C003-01', customerId: 'CUST-1003', policyId: 'CP-004', claimedAmount: 28000,  claimDate: '2024-07-05', claimStatus: 'pending',      description: 'Vehicle accident repair' },
  { claimId: 'CLM-C009-01', customerId: 'CUST-1009', policyId: 'CP-009', claimedAmount: 32000,  claimDate: '2024-08-14', claimStatus: 'settled',      description: 'ICU & post-op care' },
  { claimId: 'CLM-C009-02', customerId: 'CUST-1009', policyId: 'CP-010', claimedAmount: 500000, claimDate: '2024-09-18', claimStatus: 'rejected',     description: 'Pre-existing condition exclusion' },
  { claimId: 'CLM-C012-01', customerId: 'CUST-1012', policyId: 'CP-011', claimedAmount: 75000,  claimDate: '2024-03-22', claimStatus: 'settled',      description: 'Flood damage to property' },
]

// ── Customer Documents ─────────────────────────────────────────
export const customerDocuments = [
  { documentId: 'DOC-C001-01', customerId: 'CUST-1001', documentType: 'Aadhaar Card',        submissionDate: '2022-03-10', verificationStatus: 'verified' },
  { documentId: 'DOC-C001-02', customerId: 'CUST-1001', documentType: 'Income Proof',         submissionDate: '2022-03-12', verificationStatus: 'verified' },
  { documentId: 'DOC-C002-01', customerId: 'CUST-1002', documentType: 'PAN Card',             submissionDate: '2022-07-18', verificationStatus: 'verified' },
  { documentId: 'DOC-C002-02', customerId: 'CUST-1002', documentType: 'Address Proof',        submissionDate: '2022-07-19', verificationStatus: 'pending' },
  { documentId: 'DOC-C003-01', customerId: 'CUST-1003', documentType: 'Passport',             submissionDate: '2021-11-02', verificationStatus: 'verified' },
  { documentId: 'DOC-C004-01', customerId: 'CUST-1004', documentType: 'Aadhaar Card',        submissionDate: '2023-01-25', verificationStatus: 'verified' },
  { documentId: 'DOC-C006-01', customerId: 'CUST-1006', documentType: 'Aadhaar Card',        submissionDate: '2024-01-08', verificationStatus: 'pending' },
  { documentId: 'DOC-C006-02', customerId: 'CUST-1006', documentType: 'Income Proof',         submissionDate: '2024-01-09', verificationStatus: 'rejected' },
  { documentId: 'DOC-C007-01', customerId: 'CUST-1007', documentType: 'PAN Card',             submissionDate: '2022-09-30', verificationStatus: 'verified' },
  { documentId: 'DOC-C009-01', customerId: 'CUST-1009', documentType: 'Passport',             submissionDate: '2022-12-01', verificationStatus: 'verified' },
  { documentId: 'DOC-C009-02', customerId: 'CUST-1009', documentType: 'Medical Records',      submissionDate: '2024-08-16', verificationStatus: 'verified' },
  { documentId: 'DOC-C012-01', customerId: 'CUST-1012', documentType: 'PAN Card',             submissionDate: '2020-09-14', verificationStatus: 'verified' },
  { documentId: 'DOC-C012-02', customerId: 'CUST-1012', documentType: 'Property Documents',   submissionDate: '2023-10-02', verificationStatus: 'verified' },
]

// ── Customer Beneficiaries ─────────────────────────────────────
export const customerBeneficiaries = [
  { beneficiaryId: 'BEN-C001-01', customerId: 'CUST-1001', policyId: 'CP-001', name: 'Priti Mehta',    relationshipWithCustomer: 'Spouse',    allocationPercentage: 70 },
  { beneficiaryId: 'BEN-C001-02', customerId: 'CUST-1001', policyId: 'CP-001', name: 'Ramesh Mehta',   relationshipWithCustomer: 'Father',    allocationPercentage: 30 },
  { beneficiaryId: 'BEN-C002-01', customerId: 'CUST-1002', policyId: 'CP-003', name: 'Arun Rao',       relationshipWithCustomer: 'Spouse',    allocationPercentage: 100 },
  { beneficiaryId: 'BEN-C003-01', customerId: 'CUST-1003', policyId: 'CP-004', name: 'Geeta Desai',    relationshipWithCustomer: 'Mother',    allocationPercentage: 100 },
  { beneficiaryId: 'BEN-C007-01', customerId: 'CUST-1007', policyId: 'CP-007', name: 'Manpreet Kaur',  relationshipWithCustomer: 'Spouse',    allocationPercentage: 60 },
  { beneficiaryId: 'BEN-C007-02', customerId: 'CUST-1007', policyId: 'CP-007', name: 'Harjit Singh',   relationshipWithCustomer: 'Son',       allocationPercentage: 40 },
  { beneficiaryId: 'BEN-C009-01', customerId: 'CUST-1009', policyId: 'CP-009', name: 'Anoop Sharma',   relationshipWithCustomer: 'Spouse',    allocationPercentage: 100 },
  { beneficiaryId: 'BEN-C012-01', customerId: 'CUST-1012', policyId: 'CP-011', name: 'Lalitha Kumar',  relationshipWithCustomer: 'Spouse',    allocationPercentage: 50 },
  { beneficiaryId: 'BEN-C012-02', customerId: 'CUST-1012', policyId: 'CP-011', name: 'Karan Kumar',    relationshipWithCustomer: 'Son',       allocationPercentage: 50 },
]

// ── Derived helpers ────────────────────────────────────────────
export function getCustomerPolicies(customerId) {
  return customerPolicies.filter(p => p.customerId === customerId)
}
export function getCustomerPayments(customerId) {
  return customerPayments.filter(p => p.customerId === customerId)
}
export function getCustomerClaims(customerId) {
  return customerClaims.filter(c => c.customerId === customerId)
}
export function getCustomerDocuments(customerId) {
  return customerDocuments.filter(d => d.customerId === customerId)
}
export function getCustomerBeneficiaries(customerId) {
  return customerBeneficiaries.filter(b => b.customerId === customerId)
}

// ── Status label map ──────────────────────────────────────────
export const STATUS_MAP = {
  active:               { label: 'Active',               variant: 'green' },
  inactive:             { label: 'Inactive',             variant: 'gray' },
  pending_verification: { label: 'Pending Verification', variant: 'yellow' },
}
