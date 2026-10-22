// ============================================================
// InsureX Claims & Claim Processing Mock Data
// All data is fictional. Future backend: Express + PostgreSQL + Prisma
// ============================================================

import { initialCustomers } from './customerData'
import { initialPolicies } from './policyData'

export function formatINR(n) { return `₹${Number(n).toLocaleString('en-IN')}` }

let claimCounter = 1020
export function generateClaimId() { return `CLM-${++claimCounter}` }

let procCounter = 520
export function generateProcessingId() { return `PROC-${++procCounter}` }

// ════════════════════════════════════════════════════════════
// AGENTS (mock — future module will manage these)
// ════════════════════════════════════════════════════════════

export const agents = [
  { agentId: 'AGT-101', name: 'Rajesh Kapoor',    region: 'Mumbai',     specialization: 'Health & Life',   status: 'active' },
  { agentId: 'AGT-102', name: 'Neha Agarwal',     region: 'Delhi NCR',  specialization: 'Vehicle & Home',  status: 'active' },
  { agentId: 'AGT-103', name: 'Sunil Patil',      region: 'Pune',       specialization: 'Health',          status: 'active' },
  { agentId: 'AGT-104', name: 'Kavitha Reddy',    region: 'Bengaluru',  specialization: 'Life & Travel',   status: 'active' },
  { agentId: 'AGT-105', name: 'Amitabh Chandra',  region: 'Kolkata',    specialization: 'All Categories',  status: 'inactive' },
]

// ════════════════════════════════════════════════════════════
// CLAIM TYPES
// ════════════════════════════════════════════════════════════

export const CLAIM_TYPES = [
  'Hospitalisation',
  'Accidental Death',
  'Vehicle Accident',
  'Vehicle Theft',
  'Property Damage',
  'Natural Disaster',
  'Travel Emergency',
  'Surgical Procedure',
  'Diagnostic & Tests',
  'Other',
]

// ════════════════════════════════════════════════════════════
// STATUS MAPPINGS
// ════════════════════════════════════════════════════════════

export const CLAIM_STATUS = {
  pending:      { label: 'Pending',      variant: 'yellow' },
  under_review: { label: 'Under Review', variant: 'blue' },
  approved:     { label: 'Approved',     variant: 'green' },
  rejected:     { label: 'Rejected',     variant: 'red' },
  settled:      { label: 'Settled',      variant: 'green' },
}

export const PROCESSING_STATUS = {
  awaiting_review:    { label: 'Awaiting Review',    variant: 'yellow' },
  assigned:           { label: 'Assigned',            variant: 'blue' },
  documents_required: { label: 'Docs Required',      variant: 'yellow' },
  under_verification: { label: 'Under Verification', variant: 'blue' },
  approved:           { label: 'Approved',            variant: 'green' },
  rejected:           { label: 'Rejected',            variant: 'red' },
  settled:            { label: 'Settled',             variant: 'green' },
}

export const VERIFICATION_STATUS = {
  pending:   { label: 'Pending',   variant: 'yellow' },
  verified:  { label: 'Verified',  variant: 'green' },
  failed:    { label: 'Failed',    variant: 'red' },
  partial:   { label: 'Partial',   variant: 'blue' },
}

// ════════════════════════════════════════════════════════════
// CLAIMS
// ════════════════════════════════════════════════════════════

export const initialClaims = [
  {
    claimId: 'CLM-1001',
    customerId: 'CUST-1001', customerName: 'Arjun Mehta',
    policyId: 'POL-002', policyNumber: 'POL-2023-0045', policyType: 'Health Insurance',
    claimType: 'Hospitalisation',
    claimDate: '2024-05-12',
    claimedAmount: 145000,
    approvedAmount: 132000,
    incidentDescription: 'Emergency appendectomy surgery at Fortis Hospital, Pune. Patient was admitted on 10-May and discharged on 14-May after successful laparoscopic procedure.',
    assignedAgentId: 'AGT-101', assignedAgentName: 'Rajesh Kapoor',
    status: 'settled',
    rejectionReason: null,
    settlementDetails: { settledAmount: 132000, settledDate: '2024-06-15', settledVia: 'Bank Transfer', txnRef: 'TXN-SETT-8841' },
    documents: [
      { docId: 'CDOC-001', type: 'Hospital Discharge Summary', status: 'verified' },
      { docId: 'CDOC-002', type: 'Medical Bills & Receipts', status: 'verified' },
      { docId: 'CDOC-003', type: 'Doctor Prescription', status: 'verified' },
    ],
    processingHistory: [
      { date: '2024-05-12', action: 'Claim Filed', note: 'Claim submitted by customer.', by: 'System' },
      { date: '2024-05-13', action: 'Agent Assigned', note: 'Rajesh Kapoor assigned for investigation.', by: 'Admin' },
      { date: '2024-05-18', action: 'Documents Verified', note: 'All hospital records and bills verified.', by: 'Rajesh Kapoor' },
      { date: '2024-05-25', action: 'Approved', note: 'Claim approved for ₹1,32,000 (deducting non-covered medicines).', by: 'Admin' },
      { date: '2024-06-15', action: 'Settled', note: 'Settlement of ₹1,32,000 transferred via Bank Transfer.', by: 'Accounts' },
    ],
  },
  {
    claimId: 'CLM-1002',
    customerId: 'CUST-1002', customerName: 'Sunita Rao',
    policyId: 'POL-003', policyNumber: 'POL-2024-0202', policyType: 'Health Insurance',
    claimType: 'Diagnostic & Tests',
    claimDate: '2024-06-20',
    claimedAmount: 18000,
    approvedAmount: null,
    incidentDescription: 'Full-body health checkup including MRI scan, cardiac stress test, and comprehensive blood panel at Manipal Hospital, Bengaluru.',
    assignedAgentId: 'AGT-103', assignedAgentName: 'Sunil Patil',
    status: 'under_review',
    rejectionReason: null,
    settlementDetails: null,
    documents: [
      { docId: 'CDOC-004', type: 'Lab Reports', status: 'verified' },
      { docId: 'CDOC-005', type: 'Hospital Invoice', status: 'pending' },
    ],
    processingHistory: [
      { date: '2024-06-20', action: 'Claim Filed', note: 'Customer submitted claim with diagnostic reports.', by: 'System' },
      { date: '2024-06-22', action: 'Agent Assigned', note: 'Sunil Patil assigned for review.', by: 'Admin' },
      { date: '2024-06-28', action: 'Under Review', note: 'Awaiting final hospital invoice verification.', by: 'Sunil Patil' },
    ],
  },
  {
    claimId: 'CLM-1003',
    customerId: 'CUST-1003', customerName: 'Ravi Desai',
    policyId: 'POL-004', policyNumber: 'POL-2024-0303', policyType: 'Vehicle Insurance',
    claimType: 'Vehicle Accident',
    claimDate: '2024-07-05',
    claimedAmount: 128000,
    approvedAmount: null,
    incidentDescription: 'Rear-end collision on NH-48 near Manesar. Vehicle sustained damage to bumper, tail lights, and trunk panel. FIR copy and police report filed.',
    assignedAgentId: null, assignedAgentName: null,
    status: 'pending',
    rejectionReason: null,
    settlementDetails: null,
    documents: [
      { docId: 'CDOC-006', type: 'FIR Copy', status: 'verified' },
      { docId: 'CDOC-007', type: 'Vehicle Photos', status: 'verified' },
      { docId: 'CDOC-008', type: 'Repair Estimate', status: 'pending' },
    ],
    processingHistory: [
      { date: '2024-07-05', action: 'Claim Filed', note: 'Customer filed vehicle accident claim with FIR.', by: 'System' },
      { date: '2024-07-06', action: 'Pending Review', note: 'Awaiting agent assignment.', by: 'System' },
    ],
  },
  {
    claimId: 'CLM-1004',
    customerId: 'CUST-1009', customerName: 'Priya Sharma',
    policyId: 'POL-009', policyNumber: 'POL-2024-0909', policyType: 'Health Insurance',
    claimType: 'Surgical Procedure',
    claimDate: '2024-08-14',
    claimedAmount: 232000,
    approvedAmount: 220000,
    incidentDescription: 'Knee replacement surgery (partial) at Apollo Hospital, Delhi. 5-day ICU stay followed by 3 days general ward. Post-operative physiotherapy charges included.',
    assignedAgentId: 'AGT-101', assignedAgentName: 'Rajesh Kapoor',
    status: 'settled',
    rejectionReason: null,
    settlementDetails: { settledAmount: 220000, settledDate: '2024-09-28', settledVia: 'NEFT', txnRef: 'TXN-SETT-9102' },
    documents: [
      { docId: 'CDOC-009', type: 'Hospital Discharge Summary', status: 'verified' },
      { docId: 'CDOC-010', type: 'Surgical Notes', status: 'verified' },
      { docId: 'CDOC-011', type: 'ICU Bills', status: 'verified' },
      { docId: 'CDOC-012', type: 'Physiotherapy Receipts', status: 'verified' },
    ],
    processingHistory: [
      { date: '2024-08-14', action: 'Claim Filed', note: 'Surgical claim filed post-discharge.', by: 'System' },
      { date: '2024-08-15', action: 'Agent Assigned', note: 'Rajesh Kapoor assigned.', by: 'Admin' },
      { date: '2024-08-22', action: 'Documents Verified', note: 'All surgical and ICU documentation verified.', by: 'Rajesh Kapoor' },
      { date: '2024-09-10', action: 'Approved', note: 'Approved ₹2,20,000. Room upgrade difference of ₹12,000 excluded per policy terms.', by: 'Admin' },
      { date: '2024-09-28', action: 'Settled', note: 'NEFT settlement processed to customer bank account.', by: 'Accounts' },
    ],
  },
  {
    claimId: 'CLM-1005',
    customerId: 'CUST-1009', customerName: 'Priya Sharma',
    policyId: 'POL-010', policyNumber: 'POL-2024-0910', policyType: 'Life Insurance',
    claimType: 'Other',
    claimDate: '2024-09-18',
    claimedAmount: 500000,
    approvedAmount: 0,
    incidentDescription: 'Claimed maturity benefit for a term plan. However, the policy is still in the pending activation state and has not yet commenced coverage.',
    assignedAgentId: 'AGT-104', assignedAgentName: 'Kavitha Reddy',
    status: 'rejected',
    rejectionReason: 'Policy POL-2024-0910 is currently in pending status and coverage has not commenced. Claims can only be filed against active policies with an effective start date.',
    settlementDetails: null,
    documents: [
      { docId: 'CDOC-013', type: 'Policy Copy', status: 'verified' },
    ],
    processingHistory: [
      { date: '2024-09-18', action: 'Claim Filed', note: 'Customer filed maturity benefit claim.', by: 'System' },
      { date: '2024-09-19', action: 'Agent Assigned', note: 'Kavitha Reddy assigned for verification.', by: 'Admin' },
      { date: '2024-09-22', action: 'Under Review', note: 'Checking policy activation status.', by: 'Kavitha Reddy' },
      { date: '2024-09-25', action: 'Rejected', note: 'Policy not yet active. Claim rejected. Customer notified.', by: 'Admin' },
    ],
  },
  {
    claimId: 'CLM-1006',
    customerId: 'CUST-1012', customerName: 'Suresh Kumar',
    policyId: 'POL-011', policyNumber: 'POL-2023-1201', policyType: 'Home Insurance',
    claimType: 'Natural Disaster',
    claimDate: '2024-03-22',
    claimedAmount: 375000,
    approvedAmount: 340000,
    incidentDescription: 'Severe flooding in residential area of sector 7, Dwarka, Delhi during unseasonal rains. Ground floor submerged with damage to flooring, electrical wiring, furniture, and electronic appliances.',
    assignedAgentId: 'AGT-102', assignedAgentName: 'Neha Agarwal',
    status: 'settled',
    rejectionReason: null,
    settlementDetails: { settledAmount: 340000, settledDate: '2024-05-10', settledVia: 'Bank Transfer', txnRef: 'TXN-SETT-7723' },
    documents: [
      { docId: 'CDOC-014', type: 'Damage Photos', status: 'verified' },
      { docId: 'CDOC-015', type: 'Municipal Flood Report', status: 'verified' },
      { docId: 'CDOC-016', type: 'Repair Estimates', status: 'verified' },
      { docId: 'CDOC-017', type: 'Insurance Surveyor Report', status: 'verified' },
    ],
    processingHistory: [
      { date: '2024-03-22', action: 'Claim Filed', note: 'Flood damage claim submitted with photographic evidence.', by: 'System' },
      { date: '2024-03-23', action: 'Agent Assigned', note: 'Neha Agarwal assigned for on-site inspection.', by: 'Admin' },
      { date: '2024-03-30', action: 'Site Inspection', note: 'Physical inspection completed. Damage assessment confirms extensive flood damage.', by: 'Neha Agarwal' },
      { date: '2024-04-15', action: 'Documents Verified', note: 'All supporting documents and surveyor report verified.', by: 'Neha Agarwal' },
      { date: '2024-04-25', action: 'Approved', note: 'Approved ₹3,40,000. Excluded ₹35,000 for pre-existing wear and depreciation.', by: 'Admin' },
      { date: '2024-05-10', action: 'Settled', note: 'Bank transfer settlement completed.', by: 'Accounts' },
    ],
  },
  {
    claimId: 'CLM-1007',
    customerId: 'CUST-1004', customerName: 'Kavya Iyer',
    policyId: 'POL-006', policyNumber: 'POL-2024-0404', policyType: 'Home Insurance',
    claimType: 'Property Damage',
    claimDate: '2024-10-01',
    claimedAmount: 95000,
    approvedAmount: null,
    incidentDescription: 'Water pipe burst in master bedroom causing damage to ceiling, walls, and wooden flooring. Plumbing repair and painting required.',
    assignedAgentId: 'AGT-102', assignedAgentName: 'Neha Agarwal',
    status: 'under_review',
    rejectionReason: null,
    settlementDetails: null,
    documents: [
      { docId: 'CDOC-018', type: 'Damage Photos', status: 'verified' },
      { docId: 'CDOC-019', type: 'Plumber Report', status: 'pending' },
    ],
    processingHistory: [
      { date: '2024-10-01', action: 'Claim Filed', note: 'Property damage claim for pipe burst.', by: 'System' },
      { date: '2024-10-02', action: 'Agent Assigned', note: 'Neha Agarwal assigned for assessment.', by: 'Admin' },
      { date: '2024-10-05', action: 'Under Review', note: 'Plumber report pending. Site visit scheduled.', by: 'Neha Agarwal' },
    ],
  },
  {
    claimId: 'CLM-1008',
    customerId: 'CUST-1012', customerName: 'Suresh Kumar',
    policyId: 'POL-012', policyNumber: 'POL-2024-1202', policyType: 'Health Insurance',
    claimType: 'Hospitalisation',
    claimDate: '2024-10-08',
    claimedAmount: 68000,
    approvedAmount: 65000,
    incidentDescription: 'Dengue fever hospitalisation at Max Hospital, Delhi. 4-day stay with platelet transfusion and IV treatment.',
    assignedAgentId: 'AGT-103', assignedAgentName: 'Sunil Patil',
    status: 'approved',
    rejectionReason: null,
    settlementDetails: null,
    documents: [
      { docId: 'CDOC-020', type: 'Hospital Discharge Summary', status: 'verified' },
      { docId: 'CDOC-021', type: 'Blood Test Reports', status: 'verified' },
      { docId: 'CDOC-022', type: 'Hospital Bills', status: 'verified' },
    ],
    processingHistory: [
      { date: '2024-10-08', action: 'Claim Filed', note: 'Hospitalisation claim for dengue treatment.', by: 'System' },
      { date: '2024-10-09', action: 'Agent Assigned', note: 'Sunil Patil assigned.', by: 'Admin' },
      { date: '2024-10-12', action: 'Documents Verified', note: 'All medical records verified.', by: 'Sunil Patil' },
      { date: '2024-10-15', action: 'Approved', note: 'Approved ₹65,000. ₹3,000 telephone charges excluded.', by: 'Admin' },
    ],
  },
  {
    claimId: 'CLM-1009',
    customerId: 'CUST-1004', customerName: 'Kavya Iyer',
    policyId: 'POL-013', policyNumber: 'POL-2024-1301', policyType: 'Travel Insurance',
    claimType: 'Travel Emergency',
    claimDate: '2024-09-05',
    claimedAmount: 42000,
    approvedAmount: null,
    incidentDescription: 'Flight cancellation and emergency hotel stay during Goa trip. Additional transportation costs incurred for rebooking.',
    assignedAgentId: null, assignedAgentName: null,
    status: 'pending',
    rejectionReason: null,
    settlementDetails: null,
    documents: [
      { docId: 'CDOC-023', type: 'Flight Cancellation Proof', status: 'pending' },
      { docId: 'CDOC-024', type: 'Hotel Receipts', status: 'pending' },
    ],
    processingHistory: [
      { date: '2024-09-05', action: 'Claim Filed', note: 'Travel disruption claim submitted.', by: 'System' },
    ],
  },
  {
    claimId: 'CLM-1010',
    customerId: 'CUST-1010', customerName: 'Rahul Verma',
    policyId: 'POL-015', policyNumber: 'POL-2024-1501', policyType: 'Other Insurance',
    claimType: 'Other',
    claimDate: '2024-10-12',
    claimedAmount: 85000,
    approvedAmount: null,
    incidentDescription: 'Equipment damage in commercial premises — power surge destroyed 2 desktop computers and 1 printer. Electrician and equipment replacement receipts attached.',
    assignedAgentId: null, assignedAgentName: null,
    status: 'pending',
    rejectionReason: null,
    settlementDetails: null,
    documents: [
      { docId: 'CDOC-025', type: 'Electrician Report', status: 'pending' },
      { docId: 'CDOC-026', type: 'Equipment Purchase Receipts', status: 'pending' },
    ],
    processingHistory: [
      { date: '2024-10-12', action: 'Claim Filed', note: 'Equipment damage claim submitted.', by: 'System' },
    ],
  },
]

// ════════════════════════════════════════════════════════════
// CLAIM PROCESSING RECORDS
// ════════════════════════════════════════════════════════════

export const initialProcessing = [
  {
    processingId: 'PROC-501', claimId: 'CLM-1001',
    customerId: 'CUST-1001', customerName: 'Arjun Mehta',
    assignedAgentId: 'AGT-101', assignedAgentName: 'Rajesh Kapoor',
    processingDate: '2024-05-13',
    verificationStatus: 'verified',
    verificationNotes: 'All hospital documentation verified against policy coverage terms. Appendectomy qualifies under surgical procedures.',
    approvedAmount: 132000,
    processingStatus: 'settled',
    documentsVerified: true,
    history: [
      { date: '2024-05-13', action: 'Processing Started', note: 'Claim PROC-501 created.', by: 'Admin' },
      { date: '2024-05-18', action: 'Documents Verified', note: 'Hospital records, bills, and prescriptions verified.', by: 'Rajesh Kapoor' },
      { date: '2024-05-25', action: 'Approved', note: 'Approved ₹1,32,000 — excluded ₹13,000 non-covered items.', by: 'Admin' },
      { date: '2024-06-15', action: 'Settled', note: 'Settlement processed via Bank Transfer.', by: 'Accounts' },
    ],
  },
  {
    processingId: 'PROC-502', claimId: 'CLM-1002',
    customerId: 'CUST-1002', customerName: 'Sunita Rao',
    assignedAgentId: 'AGT-103', assignedAgentName: 'Sunil Patil',
    processingDate: '2024-06-22',
    verificationStatus: 'partial',
    verificationNotes: 'Lab reports verified. Hospital invoice pending final stamp.',
    approvedAmount: null,
    processingStatus: 'under_verification',
    documentsVerified: false,
    history: [
      { date: '2024-06-22', action: 'Processing Started', note: 'Assigned to Sunil Patil.', by: 'Admin' },
      { date: '2024-06-28', action: 'Partial Verification', note: 'Lab reports OK. Hospital final invoice awaited.', by: 'Sunil Patil' },
    ],
  },
  {
    processingId: 'PROC-503', claimId: 'CLM-1004',
    customerId: 'CUST-1009', customerName: 'Priya Sharma',
    assignedAgentId: 'AGT-101', assignedAgentName: 'Rajesh Kapoor',
    processingDate: '2024-08-15',
    verificationStatus: 'verified',
    verificationNotes: 'All surgical, ICU, and physiotherapy documents verified. Room upgrade charge of ₹12,000 excluded as per policy sub-limits.',
    approvedAmount: 220000,
    processingStatus: 'settled',
    documentsVerified: true,
    history: [
      { date: '2024-08-15', action: 'Processing Started', note: 'Claim assigned to Rajesh Kapoor.', by: 'Admin' },
      { date: '2024-08-22', action: 'Documents Verified', note: 'All surgical documentation checked.', by: 'Rajesh Kapoor' },
      { date: '2024-09-10', action: 'Approved', note: 'Approved ₹2,20,000 after policy sub-limit adjustments.', by: 'Admin' },
      { date: '2024-09-28', action: 'Settled', note: 'NEFT settlement completed.', by: 'Accounts' },
    ],
  },
  {
    processingId: 'PROC-504', claimId: 'CLM-1005',
    customerId: 'CUST-1009', customerName: 'Priya Sharma',
    assignedAgentId: 'AGT-104', assignedAgentName: 'Kavitha Reddy',
    processingDate: '2024-09-19',
    verificationStatus: 'failed',
    verificationNotes: 'Policy not active. Coverage period has not commenced. Claim is ineligible.',
    approvedAmount: 0,
    processingStatus: 'rejected',
    documentsVerified: true,
    rejectionReason: 'Policy POL-2024-0910 is in pending status. Coverage has not commenced. Claims require active policy status.',
    history: [
      { date: '2024-09-19', action: 'Processing Started', note: 'Kavitha Reddy assigned.', by: 'Admin' },
      { date: '2024-09-22', action: 'Under Review', note: 'Policy activation status being verified.', by: 'Kavitha Reddy' },
      { date: '2024-09-25', action: 'Rejected', note: 'Rejected — policy not active.', by: 'Admin' },
    ],
  },
  {
    processingId: 'PROC-505', claimId: 'CLM-1006',
    customerId: 'CUST-1012', customerName: 'Suresh Kumar',
    assignedAgentId: 'AGT-102', assignedAgentName: 'Neha Agarwal',
    processingDate: '2024-03-23',
    verificationStatus: 'verified',
    verificationNotes: 'On-site inspection confirmed extensive flood damage. Municipal flood report corroborates claim. Surveyor assessment matches customer description.',
    approvedAmount: 340000,
    processingStatus: 'settled',
    documentsVerified: true,
    history: [
      { date: '2024-03-23', action: 'Processing Started', note: 'Neha Agarwal assigned for on-site inspection.', by: 'Admin' },
      { date: '2024-03-30', action: 'Site Inspection', note: 'Physical inspection completed.', by: 'Neha Agarwal' },
      { date: '2024-04-15', action: 'Documents Verified', note: 'All supporting documents verified.', by: 'Neha Agarwal' },
      { date: '2024-04-25', action: 'Approved', note: 'Approved ₹3,40,000 after depreciation adjustments.', by: 'Admin' },
      { date: '2024-05-10', action: 'Settled', note: 'Bank transfer completed.', by: 'Accounts' },
    ],
  },
  {
    processingId: 'PROC-506', claimId: 'CLM-1007',
    customerId: 'CUST-1004', customerName: 'Kavya Iyer',
    assignedAgentId: 'AGT-102', assignedAgentName: 'Neha Agarwal',
    processingDate: '2024-10-02',
    verificationStatus: 'partial',
    verificationNotes: 'Damage photos verified. Plumber report still pending.',
    approvedAmount: null,
    processingStatus: 'documents_required',
    documentsVerified: false,
    history: [
      { date: '2024-10-02', action: 'Processing Started', note: 'Neha Agarwal assigned.', by: 'Admin' },
      { date: '2024-10-05', action: 'Partial Verification', note: 'Photos OK. Plumber report required.', by: 'Neha Agarwal' },
    ],
  },
  {
    processingId: 'PROC-507', claimId: 'CLM-1008',
    customerId: 'CUST-1012', customerName: 'Suresh Kumar',
    assignedAgentId: 'AGT-103', assignedAgentName: 'Sunil Patil',
    processingDate: '2024-10-09',
    verificationStatus: 'verified',
    verificationNotes: 'All dengue treatment records and hospital bills verified against policy terms.',
    approvedAmount: 65000,
    processingStatus: 'approved',
    documentsVerified: true,
    history: [
      { date: '2024-10-09', action: 'Processing Started', note: 'Sunil Patil assigned.', by: 'Admin' },
      { date: '2024-10-12', action: 'Documents Verified', note: 'Medical records verified.', by: 'Sunil Patil' },
      { date: '2024-10-15', action: 'Approved', note: 'Approved ₹65,000.', by: 'Admin' },
    ],
  },
]

// ════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════

export function getClaimById(claims, id) {
  return claims.find(c => c.claimId === id) || null
}

export function getProcessingForClaim(processing, claimId) {
  return processing.find(p => p.claimId === claimId) || null
}

export function getCustomerPolicies(customerId) {
  return initialPolicies.filter(p => p.customerId === customerId && p.status === 'active')
}

export function getCustomerById(customerId) {
  return initialCustomers.find(c => c.customerId === customerId) || null
}
