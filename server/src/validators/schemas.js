import { z } from 'zod'

// ── Auth Schemas ──────────────────────────────────────────────
const strongPassword = z.string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter.')
  .regex(/\d/, 'Password must contain a number.')

// Public registration never accepts a role: unknown keys (including "role") are stripped.
export const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: strongPassword,
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional(),
})

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1, 'Password is required.').max(128),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: strongPassword,
})

// ── Customer Schemas ──────────────────────────────────────────
export const customerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  gender: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(4),
  idProofType: z.string().min(1),
  maskedIdProofNumber: z.string().min(4),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
})

// ── Policy Type Schemas ───────────────────────────────────────
export const policyTypeSchema = z.object({
  typeCode: z.string().min(2),
  name: z.string().min(2),
  description: z.string().min(5),
  coverageDetails: z.string().min(5),
  eligibility: z.string().min(5),
  terms: z.string().min(5),
  icon: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

// ── Insurance Application Schemas ─────────────────────────────
export const applicationSchema = z.object({
  customerId: z.string().uuid(),
  policyTypeId: z.string().uuid(),
  requestedCoverage: z.number().positive(),
  annualIncome: z.number().positive().optional(),
  employmentStatus: z.string().optional(),
  nomineeName: z.string().optional(),
  nomineeRelation: z.string().optional(),
  notes: z.string().optional(),
})

export const applicationApproveSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  premiumAmount: z.number().positive().optional(),
  premiumFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY']).optional(),
  companyId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
})

export const applicationRejectSchema = z.object({
  rejectionReason: z.string().min(5, 'Rejection reason must be provided and detailed.'),
})

// ── Insurance Policy Schemas ──────────────────────────────────
export const policySchema = z.object({
  customerId: z.string().uuid(),
  policyTypeId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  sumAssured: z.number().positive(),
  premiumAmount: z.number().positive(),
  premiumFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED']).optional(),
})

// ── Premium Payment Schema ────────────────────────────────────
export const paymentSchema = z.object({
  premiumId: z.string().uuid(),
  amount: z.number().positive('Payment amount must be greater than zero.'),
  paymentMethod: z.enum(['UPI', 'NET_BANKING', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHEQUE']),
  transactionReference: z.string().min(4, 'Transaction reference/UTR is required.'),
  notes: z.string().optional(),
})

// ── Beneficiary Schema ────────────────────────────────────────
export const beneficiarySchema = z.object({
  policyId: z.string().uuid(),
  name: z.string().min(2),
  relationship: z.string().min(2),
  allocationPercentage: z.number().min(1).max(100),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  dateOfBirth: z.string().optional(),
  idProofType: z.string().optional(),
  idProofNumber: z.string().optional(),
  address: z.string().optional(),
})

// ── Agent Schema ──────────────────────────────────────────────
export const agentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  city: z.string().min(1),
  region: z.string().min(1),
  licenseNumber: z.string().min(3),
  specialization: z.string().min(2),
  companyId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'INACTIVE']).optional(),
  commissionRate: z.number().min(0).max(50).optional(),
  bio: z.string().optional(),
})

// ── Claim Schemas ─────────────────────────────────────────────
export const claimSchema = z.object({
  customerId: z.string().uuid(),
  policyId: z.string().uuid(),
  claimType: z.string().min(2),
  claimDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  claimedAmount: z.number().positive(),
  incidentDescription: z.string().min(10, 'Incident description is required.'),
  assignedAgentId: z.string().uuid().optional(),
})

export const claimAssignSchema = z.object({
  agentId: z.string().uuid(),
})

export const claimApproveSchema = z.object({
  approvedAmount: z.number().positive('Approved amount must be positive.'),
  notes: z.string().optional(),
})

export const claimRejectSchema = z.object({
  rejectionReason: z.string().min(5, 'Detailed rejection reason is mandatory.'),
})

export const claimSettleSchema = z.object({
  settlementMethod: z.string().min(2),
  transactionRef: z.string().min(4, 'Transaction reference/UTR is required.'),
  settlementDate: z.string().optional(),
})

// ── Document Schema ───────────────────────────────────────────
export const documentSchema = z.object({
  name: z.string().min(2),
  documentType: z.string().min(2),
  customerId: z.string().uuid(),
  policyId: z.string().uuid().optional(),
  claimId: z.string().uuid().optional(),
  fileSize: z.string().optional(),
  fileFormat: z.string().optional(),
  verificationNotes: z.string().optional(),
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'NEEDS_INFO', 'REJECTED']).optional(),
})

// ── Renewal Schema ────────────────────────────────────────────
export const renewalSchema = z.object({
  policyId: z.string().uuid(),
  newStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  renewalPremium: z.number().positive('Renewal premium must be greater than zero.'),
  notes: z.string().optional(),
})

// ── Insurance Company Schema ──────────────────────────────────
export const companySchema = z.object({
  name: z.string().min(2),
  shortName: z.string().optional(),
  registrationNumber: z.string().min(3),
  category: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email(),
  website: z.string().optional(),
  address: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(4),
  status: z.enum(['ACTIVE', 'UNDER_REVIEW', 'INACTIVE']).optional(),
  rating: z.string().optional(),
  description: z.string().optional(),
})

// ── Role-scoped schemas (customer portal / agent workspace / admin) ──
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD')

export const uuidParam = z.object({ id: z.string().uuid('Record not found.') })

// Fields a customer or agent may change on a customer record after creation.
export const customerContactSchema = z.object({
  phone: z.string().trim().min(10).max(20),
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  postalCode: z.string().trim().min(4).max(12),
}).partial().strict()

export const customerProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  dateOfBirth: isoDate,
  gender: z.string().trim().min(1).max(30),
  phone: z.string().trim().min(10).max(20),
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  postalCode: z.string().trim().min(4).max(12),
  idProofType: z.string().trim().min(1).max(40),
  idProofLast4: z.string().trim().regex(/^[A-Za-z0-9]{4}$/, 'Enter only the last 4 characters of your ID.'),
}).strict()

export const agentCustomerCreateSchema = customerProfileSchema.extend({
  email: z.string().trim().email().max(254),
})

export const selfApplicationSchema = z.object({
  policyTypeId: z.string().uuid(),
  requestedCoverage: z.number().positive().max(1_000_000_000),
  annualIncome: z.number().positive().max(10_000_000_000).optional(),
  employmentStatus: z.string().trim().max(60).optional(),
  nomineeName: z.string().trim().max(120).optional(),
  nomineeRelation: z.string().trim().max(60).optional(),
}).strict()

export const agentApplicationSchema = selfApplicationSchema.extend({
  customerId: z.string().uuid(),
  notes: z.string().trim().max(2000).optional(),
}).strict()

export const selfClaimSchema = z.object({
  policyId: z.string().uuid(),
  claimType: z.string().trim().min(2).max(60),
  claimDate: isoDate,
  claimedAmount: z.number().positive(),
  incidentDescription: z.string().trim().min(10, 'Please describe the incident (at least 10 characters).').max(5000),
}).strict()

export const paymentSubmissionSchema = z.object({
  premiumId: z.string().uuid(),
  amount: z.number().positive('Payment amount must be greater than zero.'),
  paymentMethod: z.enum(['UPI', 'NET_BANKING', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHEQUE']),
  transactionReference: z.string().trim().min(4, 'Enter the transaction reference / UTR from your bank.').max(64),
}).strict()

export const paymentVerifySchema = z.object({
  decision: z.enum(['SUCCESS', 'FAILED']),
  notes: z.string().trim().max(500).optional(),
}).strict()

export const renewalRequestSchema = z.object({
  policyId: z.string().uuid(),
  notes: z.string().trim().max(1000).optional(),
}).strict()

export const renewalUpdateSchema = z.object({
  status: z.enum(['UPCOMING', 'RENEWED', 'OVERDUE', 'GRACE_PERIOD', 'LAPSED']).optional(),
  paymentMethod: z.string().trim().max(40).optional(),
  paymentReference: z.string().trim().max(64).optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict()

export const documentUploadMetaSchema = z.object({
  name: z.string().trim().min(2).max(160),
  documentType: z.string().trim().min(2).max(60),
  customerId: z.string().uuid().optional(),
  policyId: z.string().uuid().optional(),
  claimId: z.string().uuid().optional(),
})

export const documentReviewSchema = z.object({
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'NEEDS_INFO', 'REJECTED']),
  verificationNotes: z.string().trim().max(1000).optional(),
}).strict()

export const agentDocumentReviewSchema = z.object({
  verificationStatus: z.literal('NEEDS_INFO'),
  verificationNotes: z.string().trim().min(5).max(1000),
}).strict()

export const assignAgentSchema = z.object({
  agentId: z.string().uuid().nullable(),
}).strict()

export const adminCreateUserSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(2).max(120),
  password: strongPassword,
  role: z.enum(['ADMIN', 'AGENT']),
  agentId: z.string().uuid().optional(),
}).strict().refine((v) => v.role !== 'AGENT' || v.agentId, { message: 'An agent login must be linked to an agent profile.', path: ['agentId'] })

export const adminResetPasswordSchema = z.object({
  temporaryPassword: strongPassword,
}).strict()

export const adminUpdateUserSchema = z.object({
  isActive: z.boolean().optional(),
  linkCustomerId: z.string().uuid().nullable().optional(),
  linkAgentId: z.string().uuid().nullable().optional(),
}).strict()
