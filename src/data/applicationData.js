// ============================================================
// InsureX Applications, Premiums & Payments Mock Data
// All data is fictional. Future backend: Express + PostgreSQL + Prisma
// ============================================================

import { initialCustomers } from './customerData'
import { initialPolicies, initialPolicyTypes } from './policyData'

export function formatINR(n) { return `₹${Number(n).toLocaleString('en-IN')}` }

// ════════════════════════════════════════════════════════════
// APPLICATIONS
// ════════════════════════════════════════════════════════════

export const APPLICATION_STATUS = {
  pending:   { label: 'Pending',   variant: 'yellow' },
  approved:  { label: 'Approved',  variant: 'green' },
  rejected:  { label: 'Rejected',  variant: 'red' },
  cancelled: { label: 'Cancelled', variant: 'gray' },
}

export const initialApplications = [
  { applicationId: 'APP-1001', customerId: 'CUST-1001', customerName: 'Arjun Mehta',    policyTypeId: 'PTYPE-02', policyType: 'Health Insurance',  requestedCoverage: 1500000, applicationDate: '2024-01-05', status: 'approved', policyCreated: true,  reviewHistory: [{ date: '2024-01-07', action: 'Reviewed', note: 'All documents verified.', reviewer: 'Admin' }, { date: '2024-01-08', action: 'Approved', note: 'Application approved. Policy POL-2023-0045 issued.', reviewer: 'Admin' }] },
  { applicationId: 'APP-1002', customerId: 'CUST-1002', customerName: 'Sunita Rao',     policyTypeId: 'PTYPE-02', policyType: 'Health Insurance',  requestedCoverage: 500000,  applicationDate: '2024-02-10', status: 'approved', policyCreated: true,  reviewHistory: [{ date: '2024-02-15', action: 'Approved', note: 'Fast-track approval.', reviewer: 'Admin' }] },
  { applicationId: 'APP-1003', customerId: 'CUST-1003', customerName: 'Ravi Desai',     policyTypeId: 'PTYPE-03', policyType: 'Vehicle Insurance', requestedCoverage: 800000,  applicationDate: '2024-03-01', status: 'approved', policyCreated: true,  reviewHistory: [{ date: '2024-03-05', action: 'Reviewed', note: 'RC & DL verified.', reviewer: 'Admin' }, { date: '2024-03-08', action: 'Approved', note: 'Policy POL-2024-0303 issued.', reviewer: 'Admin' }] },
  { applicationId: 'APP-1004', customerId: 'CUST-1004', customerName: 'Kavya Iyer',     policyTypeId: 'PTYPE-04', policyType: 'Home Insurance',    requestedCoverage: 3000000, applicationDate: '2024-03-20', status: 'approved', policyCreated: true,  reviewHistory: [{ date: '2024-03-25', action: 'Approved', note: 'Property documents verified.', reviewer: 'Admin' }] },
  { applicationId: 'APP-1005', customerId: 'CUST-1005', customerName: 'Deepak Sharma',  policyTypeId: 'PTYPE-01', policyType: 'Life Insurance',    requestedCoverage: 5000000, applicationDate: '2024-04-10', status: 'pending',  policyCreated: false, reviewHistory: [{ date: '2024-04-12', action: 'Reviewed', note: 'Awaiting medical report.', reviewer: 'Admin' }] },
  { applicationId: 'APP-1006', customerId: 'CUST-1006', customerName: 'Meera Pillai',   policyTypeId: 'PTYPE-02', policyType: 'Health Insurance',  requestedCoverage: 750000,  applicationDate: '2024-05-05', status: 'pending',  policyCreated: false, reviewHistory: [] },
  { applicationId: 'APP-1007', customerId: 'CUST-1008', customerName: 'Nisha Gupta',    policyTypeId: 'PTYPE-01', policyType: 'Life Insurance',    requestedCoverage: 2000000, applicationDate: '2024-06-15', status: 'rejected', rejectionReason: 'Missing income proof & ID verification documents.', policyCreated: false, reviewHistory: [{ date: '2024-06-20', action: 'Reviewed', note: 'Incomplete documentation.', reviewer: 'Admin' }, { date: '2024-06-22', action: 'Rejected', note: 'Application rejected — missing income proof & ID verification.', reviewer: 'Admin' }] },
  { applicationId: 'APP-1008', customerId: 'CUST-1010', customerName: 'Rahul Verma',    policyTypeId: 'PTYPE-05', policyType: 'Travel Insurance',  requestedCoverage: 300000,  applicationDate: '2024-07-01', status: 'cancelled', policyCreated: false, reviewHistory: [{ date: '2024-07-05', action: 'Cancelled', note: 'Customer withdrew application.', reviewer: 'System' }] },
  { applicationId: 'APP-1009', customerId: 'CUST-1011', customerName: 'Anjali Nair',    policyTypeId: 'PTYPE-02', policyType: 'Health Insurance',  requestedCoverage: 1000000, applicationDate: '2024-08-20', status: 'pending',  policyCreated: false, reviewHistory: [] },
  { applicationId: 'APP-1010', customerId: 'CUST-1007', customerName: 'Vikram Singh',   policyTypeId: 'PTYPE-04', policyType: 'Home Insurance',    requestedCoverage: 4500000, applicationDate: '2024-09-01', status: 'pending',  policyCreated: false, reviewHistory: [{ date: '2024-09-05', action: 'Reviewed', note: 'Property inspection scheduled.', reviewer: 'Admin' }] },
]

export const applicationDocuments = [
  { docId: 'ADOC-001', applicationId: 'APP-1001', type: 'Aadhaar Card',   status: 'verified' },
  { docId: 'ADOC-002', applicationId: 'APP-1001', type: 'Income Proof',   status: 'verified' },
  { docId: 'ADOC-003', applicationId: 'APP-1002', type: 'PAN Card',       status: 'verified' },
  { docId: 'ADOC-004', applicationId: 'APP-1003', type: 'Driving Licence',status: 'verified' },
  { docId: 'ADOC-005', applicationId: 'APP-1003', type: 'RC Book',        status: 'verified' },
  { docId: 'ADOC-006', applicationId: 'APP-1004', type: 'Property Deed',  status: 'verified' },
  { docId: 'ADOC-007', applicationId: 'APP-1005', type: 'PAN Card',       status: 'verified' },
  { docId: 'ADOC-008', applicationId: 'APP-1005', type: 'Medical Report', status: 'pending' },
  { docId: 'ADOC-009', applicationId: 'APP-1007', type: 'Aadhaar Card',   status: 'rejected' },
  { docId: 'ADOC-010', applicationId: 'APP-1009', type: 'Aadhaar Card',   status: 'pending' },
  { docId: 'ADOC-011', applicationId: 'APP-1010', type: 'Property Deed',  status: 'pending' },
]

export function getAppDocuments(appId) { return applicationDocuments.filter(d => d.applicationId === appId) }

// ════════════════════════════════════════════════════════════
// PREMIUMS  (enriched from policyData.policyPremiums)
// ════════════════════════════════════════════════════════════

export const PREMIUM_STATUS = {
  paid:           { label: 'Paid',           variant: 'green' },
  due:            { label: 'Due',            variant: 'yellow' },
  overdue:        { label: 'Overdue',        variant: 'red' },
  partially_paid: { label: 'Partially Paid', variant: 'blue' },
}

function policyLookup(policyId) { return initialPolicies.find(p => p.policyId === policyId) || {} }

export const initialPremiums = [
  { premiumId: 'PRM-001', policyId: 'POL-001', policyNumber: 'POL-2024-0101', customerId: 'CUST-1001', customerName: 'Arjun Mehta',  amount: 18500, dueDate: '2024-01-10', issueDate: '2024-01-02', premiumPeriod: 'Jan 2024 – Dec 2024', status: 'paid',    paidAmount: 18500 },
  { premiumId: 'PRM-002', policyId: 'POL-001', policyNumber: 'POL-2024-0101', customerId: 'CUST-1001', customerName: 'Arjun Mehta',  amount: 18500, dueDate: '2025-01-10', issueDate: '2024-12-15', premiumPeriod: 'Jan 2025 – Dec 2025', status: 'due',     paidAmount: 0 },
  { premiumId: 'PRM-003', policyId: 'POL-003', policyNumber: 'POL-2024-0202', customerId: 'CUST-1002', customerName: 'Sunita Rao',   amount: 9800,  dueDate: '2024-02-20', issueDate: '2024-02-10', premiumPeriod: 'Feb 2024 – Jan 2025',  status: 'paid',    paidAmount: 9800 },
  { premiumId: 'PRM-004', policyId: 'POL-004', policyNumber: 'POL-2024-0303', customerId: 'CUST-1003', customerName: 'Ravi Desai',   amount: 8400,  dueDate: '2024-03-15', issueDate: '2024-03-05', premiumPeriod: 'Mar 2024 – Feb 2025',  status: 'paid',    paidAmount: 8400 },
  { premiumId: 'PRM-005', policyId: 'POL-006', policyNumber: 'POL-2024-0404', customerId: 'CUST-1004', customerName: 'Kavya Iyer',   amount: 9200,  dueDate: '2024-04-01', issueDate: '2024-03-20', premiumPeriod: 'Apr 2024 – Mar 2025',  status: 'paid',    paidAmount: 9200 },
  { premiumId: 'PRM-006', policyId: 'POL-007', policyNumber: 'POL-2024-0707', customerId: 'CUST-1007', customerName: 'Vikram Singh', amount: 25000, dueDate: '2024-07-01', issueDate: '2024-06-20', premiumPeriod: 'Q3 2024',              status: 'paid',    paidAmount: 25000 },
  { premiumId: 'PRM-007', policyId: 'POL-007', policyNumber: 'POL-2024-0707', customerId: 'CUST-1007', customerName: 'Vikram Singh', amount: 25000, dueDate: '2024-10-01', issueDate: '2024-09-15', premiumPeriod: 'Q4 2024',              status: 'overdue', paidAmount: 0 },
  { premiumId: 'PRM-008', policyId: 'POL-009', policyNumber: 'POL-2024-0909', customerId: 'CUST-1009', customerName: 'Priya Sharma', amount: 14800, dueDate: '2024-06-01', issueDate: '2024-05-20', premiumPeriod: 'Jun 2024 – May 2025',  status: 'paid',    paidAmount: 14800 },
  { premiumId: 'PRM-009', policyId: 'POL-011', policyNumber: 'POL-2023-1201', customerId: 'CUST-1012', customerName: 'Suresh Kumar', amount: 11000, dueDate: '2023-10-01', issueDate: '2023-09-20', premiumPeriod: 'Oct 2023 – Sep 2024',  status: 'paid',    paidAmount: 11000 },
  { premiumId: 'PRM-010', policyId: 'POL-012', policyNumber: 'POL-2024-1202', customerId: 'CUST-1012', customerName: 'Suresh Kumar', amount: 13500, dueDate: '2024-04-10', issueDate: '2024-04-01', premiumPeriod: 'Apr 2024 – Mar 2025',  status: 'paid',    paidAmount: 13500 },
  { premiumId: 'PRM-011', policyId: 'POL-013', policyNumber: 'POL-2024-1301', customerId: 'CUST-1004', customerName: 'Kavya Iyer',   amount: 3500,  dueDate: '2024-06-15', issueDate: '2024-06-05', premiumPeriod: 'Jun 2024 – May 2025',  status: 'paid',    paidAmount: 3500 },
  { premiumId: 'PRM-012', policyId: 'POL-015', policyNumber: 'POL-2024-1501', customerId: 'CUST-1010', customerName: 'Rahul Verma',  amount: 8000,  dueDate: '2024-05-01', issueDate: '2024-04-20', premiumPeriod: 'May 2024 – Apr 2025',  status: 'paid',    paidAmount: 8000 },
  { premiumId: 'PRM-013', policyId: 'POL-009', policyNumber: 'POL-2024-0909', customerId: 'CUST-1009', customerName: 'Priya Sharma', amount: 14800, dueDate: '2025-06-01', issueDate: '2025-05-15', premiumPeriod: 'Jun 2025 – May 2026',  status: 'due',     paidAmount: 0 },
  { premiumId: 'PRM-014', policyId: 'POL-004', policyNumber: 'POL-2024-0303', customerId: 'CUST-1003', customerName: 'Ravi Desai',   amount: 8400,  dueDate: '2025-03-15', issueDate: '2025-03-01', premiumPeriod: 'Mar 2025 – Feb 2026',  status: 'due',     paidAmount: 0 },
  { premiumId: 'PRM-015', policyId: 'POL-012', policyNumber: 'POL-2024-1202', customerId: 'CUST-1012', customerName: 'Suresh Kumar', amount: 13500, dueDate: '2025-04-10', issueDate: '2025-03-25', premiumPeriod: 'Apr 2025 – Mar 2026',  status: 'due',     paidAmount: 5000, },
]

// ════════════════════════════════════════════════════════════
// PAYMENTS
// ════════════════════════════════════════════════════════════

export const PAYMENT_STATUS = {
  paid:    { label: 'Paid',    variant: 'green' },
  pending: { label: 'Pending', variant: 'yellow' },
  failed:  { label: 'Failed',  variant: 'red' },
}

export const PAYMENT_MODES = ['UPI', 'Card', 'Net Banking', 'Bank Transfer', 'Other']

function txnRef() { return `TXN${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random()*1000)}` }

export const initialPayments = [
  { paymentId: 'PAY-001', transactionRef: 'TXN2024A001', premiumId: 'PRM-001', policyId: 'POL-001', policyNumber: 'POL-2024-0101', customerId: 'CUST-1001', customerName: 'Arjun Mehta',  amount: 18500, paymentDate: '2024-01-10', paymentMode: 'UPI',           status: 'paid' },
  { paymentId: 'PAY-002', transactionRef: 'TXN2024A002', premiumId: 'PRM-003', policyId: 'POL-003', policyNumber: 'POL-2024-0202', customerId: 'CUST-1002', customerName: 'Sunita Rao',   amount: 9800,  paymentDate: '2024-02-20', paymentMode: 'Credit Card',   status: 'paid' },
  { paymentId: 'PAY-003', transactionRef: 'TXN2024A003', premiumId: 'PRM-004', policyId: 'POL-004', policyNumber: 'POL-2024-0303', customerId: 'CUST-1003', customerName: 'Ravi Desai',   amount: 8400,  paymentDate: '2024-03-15', paymentMode: 'Net Banking',   status: 'paid' },
  { paymentId: 'PAY-004', transactionRef: 'TXN2024A004', premiumId: 'PRM-005', policyId: 'POL-006', policyNumber: 'POL-2024-0404', customerId: 'CUST-1004', customerName: 'Kavya Iyer',   amount: 9200,  paymentDate: '2024-04-01', paymentMode: 'UPI',           status: 'paid' },
  { paymentId: 'PAY-005', transactionRef: 'TXN2024A005', premiumId: 'PRM-006', policyId: 'POL-007', policyNumber: 'POL-2024-0707', customerId: 'CUST-1007', customerName: 'Vikram Singh', amount: 25000, paymentDate: '2024-07-01', paymentMode: 'Bank Transfer', status: 'paid' },
  { paymentId: 'PAY-006', transactionRef: 'TXN2024A006', premiumId: null,      policyId: 'POL-008', policyNumber: 'POL-2024-0808', customerId: 'CUST-1008', customerName: 'Nisha Gupta',  amount: 7600,  paymentDate: '2024-08-01', paymentMode: 'Card',          status: 'failed' },
  { paymentId: 'PAY-007', transactionRef: 'TXN2024A007', premiumId: 'PRM-008', policyId: 'POL-009', policyNumber: 'POL-2024-0909', customerId: 'CUST-1009', customerName: 'Priya Sharma', amount: 14800, paymentDate: '2024-06-01', paymentMode: 'UPI',           status: 'paid' },
  { paymentId: 'PAY-008', transactionRef: 'TXN2024A008', premiumId: 'PRM-009', policyId: 'POL-011', policyNumber: 'POL-2023-1201', customerId: 'CUST-1012', customerName: 'Suresh Kumar', amount: 11000, paymentDate: '2023-10-01', paymentMode: 'Bank Transfer', status: 'paid' },
  { paymentId: 'PAY-009', transactionRef: 'TXN2024A009', premiumId: 'PRM-010', policyId: 'POL-012', policyNumber: 'POL-2024-1202', customerId: 'CUST-1012', customerName: 'Suresh Kumar', amount: 13500, paymentDate: '2024-04-10', paymentMode: 'UPI',           status: 'paid' },
  { paymentId: 'PAY-010', transactionRef: 'TXN2024A010', premiumId: 'PRM-011', policyId: 'POL-013', policyNumber: 'POL-2024-1301', customerId: 'CUST-1004', customerName: 'Kavya Iyer',   amount: 3500,  paymentDate: '2024-06-15', paymentMode: 'Net Banking',   status: 'paid' },
  { paymentId: 'PAY-011', transactionRef: 'TXN2024A011', premiumId: 'PRM-012', policyId: 'POL-015', policyNumber: 'POL-2024-1501', customerId: 'CUST-1010', customerName: 'Rahul Verma',  amount: 8000,  paymentDate: '2024-05-01', paymentMode: 'Net Banking',   status: 'paid' },
  { paymentId: 'PAY-012', transactionRef: 'TXN2024A012', premiumId: 'PRM-015', policyId: 'POL-012', policyNumber: 'POL-2024-1202', customerId: 'CUST-1012', customerName: 'Suresh Kumar', amount: 5000,  paymentDate: '2025-04-02', paymentMode: 'UPI',           status: 'pending' },
]

export function generatePaymentId() { return `PAY-${Math.floor(1000 + Math.random() * 9000)}` }
export function generateTxnRef()    { return txnRef() }

export function getPaymentsForPremium(premiumId) { return initialPayments.filter(p => p.premiumId === premiumId) }
export function getPaymentsForPolicy(policyId)   { return initialPayments.filter(p => p.policyId === policyId) }

export const DOC_STATUS = {
  verified: { label: 'Verified', variant: 'green' },
  pending:  { label: 'Pending',  variant: 'yellow' },
  rejected: { label: 'Rejected', variant: 'red' },
}
