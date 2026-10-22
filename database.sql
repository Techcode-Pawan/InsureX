-- =============================================================================
-- INSUREX INSURANCE MANAGEMENT SYSTEM - COMPLETE POSTGRESQL DATABASE
-- =============================================================================
-- Yeh file InsureX project ka complete database script hai.
-- Isme saari SQL queries beginner-friendly format me likhi gayi hain:
--
-- 1. Database & ENUM Creation (Datatypes)
-- 2. All 14 Tables Creation (DDL - Primary Keys, Foreign Keys, Constraints)
-- 3. Indexes Creation (Fast Search / Performance)
-- 4. Sample Seed Data Insertion (DML - INSERT statements)
-- 5. Useful Beginner Queries (SELECT, WHERE, JOINs, GROUP BY, UPDATE, DELETE)
-- 6. Handy Views for Reports
--
-- KAISE RUN KAREIN (HOW TO RUN):
-- 1. pgAdmin kholiye ya psql command line kholiye.
-- 2. Ek naya database banaye: CREATE DATABASE insurex_db;
-- 3. Is database se connect karein: \c insurex_db (ya pgAdmin me insurex_db select karein).
-- 4. Yeh poori file run (Execute / F5) kar dijiye.
-- =============================================================================

-- =============================================================================
-- STEP 1: DROP TABLES (Agar pehle se bani ho toh clean start ke liye)
-- Note: CASCADE se foreign keys wale tables bhi safely drop ho jaate hain.
-- =============================================================================
DROP TABLE IF EXISTS "PolicyRenewal" CASCADE;
DROP TABLE IF EXISTS "Document" CASCADE;
DROP TABLE IF EXISTS "ClaimProcessing" CASCADE;
DROP TABLE IF EXISTS "Claim" CASCADE;
DROP TABLE IF EXISTS "Beneficiary" CASCADE;
DROP TABLE IF EXISTS "PremiumPayment" CASCADE;
DROP TABLE IF EXISTS "Premium" CASCADE;
DROP TABLE IF EXISTS "InsurancePolicy" CASCADE;
DROP TABLE IF EXISTS "InsuranceApplication" CASCADE;
DROP TABLE IF EXISTS "InsuranceAgent" CASCADE;
DROP TABLE IF EXISTS "Customer" CASCADE;
DROP TABLE IF EXISTS "PolicyType" CASCADE;
DROP TABLE IF EXISTS "InsuranceCompany" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- ENUM Types Drop
DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "CompanyStatus" CASCADE;
DROP TYPE IF EXISTS "CustomerStatus" CASCADE;
DROP TYPE IF EXISTS "PolicyTypeStatus" CASCADE;
DROP TYPE IF EXISTS "ApplicationStatus" CASCADE;
DROP TYPE IF EXISTS "PolicyStatus" CASCADE;
DROP TYPE IF EXISTS "PremiumFrequency" CASCADE;
DROP TYPE IF EXISTS "PremiumStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentMethod" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "AgentStatus" CASCADE;
DROP TYPE IF EXISTS "ClaimStatus" CASCADE;
DROP TYPE IF EXISTS "VerificationStatus" CASCADE;
DROP TYPE IF EXISTS "ProcessingStatus" CASCADE;
DROP TYPE IF EXISTS "DocumentStatus" CASCADE;
DROP TYPE IF EXISTS "RenewalStatus" CASCADE;


-- =============================================================================
-- STEP 2: CREATE ENUM TYPES
-- ENUM ka matlab: Aise fields jinki value pehle se fix hoti hai (e.g. Status).
-- =============================================================================
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT', 'CUSTOMER');
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'UNDER_REVIEW', 'INACTIVE');
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "PolicyTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED');
CREATE TYPE "PremiumFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY');
CREATE TYPE "PremiumStatus" AS ENUM ('PAID', 'DUE', 'OVERDUE', 'PARTIALLY_PAID', 'GRACE_PERIOD');
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'NET_BANKING', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHEQUE');
CREATE TYPE "PaymentStatus" AS ENUM ('SUCCESS', 'PENDING', 'FAILED');
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE');
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'PARTIAL', 'VERIFIED', 'FAILED');
CREATE TYPE "ProcessingStatus" AS ENUM ('AWAITING_REVIEW', 'UNDER_VERIFICATION', 'DOCUMENTS_REQUIRED', 'APPROVED', 'REJECTED', 'SETTLED');
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'NEEDS_INFO', 'REJECTED');
CREATE TYPE "RenewalStatus" AS ENUM ('UPCOMING', 'RENEWED', 'OVERDUE', 'GRACE_PERIOD', 'LAPSED');


-- =============================================================================
-- STEP 3: CREATE TABLES (DDL)
-- Sabhi 14 tables with Primary Keys, Foreign Keys aur CHECK Constraints.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: User (Login & Authentication)
-- -----------------------------------------------------------------------------
CREATE TABLE "User" (
    id VARCHAR(36) PRIMARY KEY,                       -- Unique User ID
    email VARCHAR(255) NOT NULL UNIQUE,               -- Login Email (Unique)
    "passwordHash" VARCHAR(255) NOT NULL,             -- Bcrypt hashed password
    role "Role" NOT NULL DEFAULT 'CUSTOMER',          -- ADMIN, AGENT ya CUSTOMER
    name VARCHAR(255) NOT NULL,                       -- Full Name
    phone VARCHAR(50),                                -- Contact Number
    "isActive" BOOLEAN NOT NULL DEFAULT true,         -- Account active/inactive
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. Table: InsuranceCompany (Carriers / Bima Companies)
-- -----------------------------------------------------------------------------
CREATE TABLE "InsuranceCompany" (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,                       -- e.g. HDFC ERGO General Insurance
    "shortName" VARCHAR(100),
    "registrationNumber" VARCHAR(100) NOT NULL UNIQUE,-- IRDAI Registration No.
    category VARCHAR(100) NOT NULL,                   -- General, Health, Life
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    "postalCode" VARCHAR(20) NOT NULL,
    "solvencyRatio" NUMERIC(5, 2),                    -- e.g. 1.85 (Check constraint: >= 0)
    rating VARCHAR(20),                               -- AAA, AA+
    status "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    description TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_company_solvency" CHECK ("solvencyRatio" IS NULL OR "solvencyRatio" >= 0)
);

-- -----------------------------------------------------------------------------
-- 3. Table: Customer (Policyholders / Grahak)
-- -----------------------------------------------------------------------------
CREATE TABLE "Customer" (
    id VARCHAR(36) PRIMARY KEY,
    "customerNumber" VARCHAR(50) NOT NULL UNIQUE,     -- e.g. CUST-1001
    "userId" VARCHAR(36) UNIQUE REFERENCES "User"(id) ON DELETE SET NULL, -- Optional Login link
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "dateOfBirth" TIMESTAMP NOT NULL,
    gender VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    "postalCode" VARCHAR(20) NOT NULL,
    "idProofType" VARCHAR(50) NOT NULL,               -- Aadhaar, PAN, Passport
    "maskedIdProofNumber" VARCHAR(50) NOT NULL,       -- e.g. XXXX-XXXX-1234
    status "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "registrationDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. Table: PolicyType (Insurance Categories / Plans)
-- -----------------------------------------------------------------------------
CREATE TABLE "PolicyType" (
    id VARCHAR(36) PRIMARY KEY,
    "typeCode" VARCHAR(50) NOT NULL UNIQUE,           -- e.g. HLTH-01, LIFE-01, AUTO-01
    name VARCHAR(255) NOT NULL,                       -- Comprehensive Health Shield
    description TEXT NOT NULL,
    "coverageDetails" TEXT NOT NULL,
    eligibility TEXT NOT NULL,
    terms TEXT NOT NULL,
    icon VARCHAR(100),
    status "PolicyTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. Table: InsuranceAgent (Advisors / Agents)
-- -----------------------------------------------------------------------------
CREATE TABLE "InsuranceAgent" (
    id VARCHAR(36) PRIMARY KEY,
    "agentNumber" VARCHAR(50) NOT NULL UNIQUE,        -- e.g. AGT-1001
    "userId" VARCHAR(36) UNIQUE REFERENCES "User"(id) ON DELETE SET NULL,
    "companyId" VARCHAR(36) REFERENCES "InsuranceCompany"(id) ON DELETE SET NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    "licenseNumber" VARCHAR(100) NOT NULL UNIQUE,     -- IRDAI License No.
    specialization VARCHAR(100) NOT NULL,             -- Health & Life, Motor
    status "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "joiningDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commissionRate" NUMERIC(5, 2) NOT NULL DEFAULT 8.00, -- Commission percentage
    rating NUMERIC(3, 2) NOT NULL DEFAULT 4.80,       -- Rating out of 5
    bio TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_agent_commission" CHECK ("commissionRate" >= 0 AND "commissionRate" <= 100),
    CONSTRAINT "chk_agent_rating" CHECK (rating >= 0 AND rating <= 5)
);

-- -----------------------------------------------------------------------------
-- 6. Table: InsuranceApplication (Customer Proposals)
-- -----------------------------------------------------------------------------
CREATE TABLE "InsuranceApplication" (
    id VARCHAR(36) PRIMARY KEY,
    "applicationNumber" VARCHAR(50) NOT NULL UNIQUE,  -- e.g. APP-1001
    "customerId" VARCHAR(36) NOT NULL REFERENCES "Customer"(id) ON DELETE RESTRICT,
    "policyTypeId" VARCHAR(36) NOT NULL REFERENCES "PolicyType"(id) ON DELETE RESTRICT,
    "requestedCoverage" NUMERIC(14, 2) NOT NULL,      -- Bima Rashi maangi gayi
    "annualIncome" NUMERIC(14, 2),
    "employmentStatus" VARCHAR(100),                  -- Salaried, Self-Employed
    "nomineeName" VARCHAR(255),
    "nomineeRelation" VARCHAR(100),
    status "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "applicationDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewDate" TIMESTAMP,
    "rejectionReason" TEXT,
    notes TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_app_requested_coverage" CHECK ("requestedCoverage" > 0),
    CONSTRAINT "chk_app_annual_income" CHECK ("annualIncome" IS NULL OR "annualIncome" >= 0)
);

-- -----------------------------------------------------------------------------
-- 7. Table: InsurancePolicy (Issued Active Policies)
-- -----------------------------------------------------------------------------
CREATE TABLE "InsurancePolicy" (
    id VARCHAR(36) PRIMARY KEY,
    "policyNumber" VARCHAR(50) NOT NULL UNIQUE,       -- e.g. POL-2025-1001
    "applicationId" VARCHAR(36) UNIQUE REFERENCES "InsuranceApplication"(id) ON DELETE SET NULL, -- 1:1 prevents duplicate policy
    "customerId" VARCHAR(36) NOT NULL REFERENCES "Customer"(id) ON DELETE RESTRICT,
    "policyTypeId" VARCHAR(36) NOT NULL REFERENCES "PolicyType"(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(36) REFERENCES "InsuranceCompany"(id) ON DELETE SET NULL,
    "agentId" VARCHAR(36) REFERENCES "InsuranceAgent"(id) ON DELETE SET NULL,
    "sumAssured" NUMERIC(14, 2) NOT NULL,             -- Total Insurance Cover (₹)
    "premiumAmount" NUMERIC(14, 2) NOT NULL,          -- Premium Amount (₹)
    "premiumFrequency" "PremiumFrequency" NOT NULL DEFAULT 'ANNUALLY',
    "startDate" TIMESTAMP NOT NULL,
    "expiryDate" TIMESTAMP NOT NULL,
    status "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_policy_sum_assured" CHECK ("sumAssured" > 0),
    CONSTRAINT "chk_policy_premium_amount" CHECK ("premiumAmount" > 0),
    CONSTRAINT "chk_policy_date_range" CHECK ("startDate" < "expiryDate")
);

-- -----------------------------------------------------------------------------
-- 8. Table: Premium (Installment / Billing Schedule)
-- -----------------------------------------------------------------------------
CREATE TABLE "Premium" (
    id VARCHAR(36) PRIMARY KEY,
    "premiumNumber" VARCHAR(50) NOT NULL UNIQUE,      -- e.g. PREM-1001
    "policyId" VARCHAR(36) NOT NULL REFERENCES "InsurancePolicy"(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL,                   -- Kul Premium Kist
    "paidAmount" NUMERIC(14, 2) NOT NULL DEFAULT 0,   -- Kitna jama hua
    "dueDate" TIMESTAMP NOT NULL,                     -- Last date of payment
    "paidDate" TIMESTAMP,                             -- Kab pay hua
    status "PremiumStatus" NOT NULL DEFAULT 'DUE',
    "billingPeriodStart" TIMESTAMP,
    "billingPeriodEnd" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_premium_amount" CHECK (amount > 0),
    CONSTRAINT "chk_premium_paid_amount" CHECK ("paidAmount" >= 0 AND "paidAmount" <= amount)
);

-- -----------------------------------------------------------------------------
-- 9. Table: PremiumPayment (Actual Transactions)
-- -----------------------------------------------------------------------------
CREATE TABLE "PremiumPayment" (
    id VARCHAR(36) PRIMARY KEY,
    "paymentNumber" VARCHAR(50) NOT NULL UNIQUE,      -- e.g. PPAY-1001
    "premiumId" VARCHAR(36) NOT NULL REFERENCES "Premium"(id) ON DELETE RESTRICT,
    "policyId" VARCHAR(36) NOT NULL REFERENCES "InsurancePolicy"(id) ON DELETE RESTRICT,
    amount NUMERIC(14, 2) NOT NULL,                   -- Paid Amount
    "paymentDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'UPI',
    "transactionReference" VARCHAR(100) NOT NULL UNIQUE, -- Bank UTR / Txn ID
    status "PaymentStatus" NOT NULL DEFAULT 'SUCCESS',
    notes VARCHAR(255),
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_payment_amount" CHECK (amount > 0)
);

-- -----------------------------------------------------------------------------
-- 10. Table: Beneficiary (Nominees for Policy)
-- -----------------------------------------------------------------------------
CREATE TABLE "Beneficiary" (
    id VARCHAR(36) PRIMARY KEY,
    "policyId" VARCHAR(36) NOT NULL REFERENCES "InsurancePolicy"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,                       -- Nominee Full Name
    relationship VARCHAR(100) NOT NULL,               -- Spouse, Child, Father, Mother
    "allocationPercentage" NUMERIC(5, 2) NOT NULL,    -- Hisa (e.g. 50.00%)
    phone VARCHAR(50),
    email VARCHAR(255),
    "dateOfBirth" TIMESTAMP,
    "idProofType" VARCHAR(50),
    "idProofNumber" VARCHAR(100),
    address VARCHAR(255),
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_beneficiary_allocation" CHECK ("allocationPercentage" > 0 AND "allocationPercentage" <= 100)
);

-- -----------------------------------------------------------------------------
-- 11. Table: Claim (Loss / Incident Claims by Policyholder)
-- -----------------------------------------------------------------------------
CREATE TABLE "Claim" (
    id VARCHAR(36) PRIMARY KEY,
    "claimNumber" VARCHAR(50) NOT NULL UNIQUE,        -- e.g. CLM-1001
    "customerId" VARCHAR(36) NOT NULL REFERENCES "Customer"(id) ON DELETE RESTRICT,
    "policyId" VARCHAR(36) NOT NULL REFERENCES "InsurancePolicy"(id) ON DELETE RESTRICT,
    "assignedAgentId" VARCHAR(36) REFERENCES "InsuranceAgent"(id) ON DELETE SET NULL,
    "claimType" VARCHAR(100) NOT NULL,                -- Hospitalization, Theft, Accidental Damage
    "claimDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAmount" NUMERIC(14, 2) NOT NULL,          -- Maanga gaya claim
    "approvedAmount" NUMERIC(14, 2),                  -- Kitna pass hua
    status "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "incidentDescription" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "settlementDate" TIMESTAMP,
    "settlementMethod" VARCHAR(100),
    "settlementTransactionRef" VARCHAR(100),
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_claim_claimed_amount" CHECK ("claimedAmount" > 0),
    CONSTRAINT "chk_claim_approved_amount" CHECK ("approvedAmount" IS NULL OR ("approvedAmount" >= 0 AND "approvedAmount" <= "claimedAmount"))
);

-- -----------------------------------------------------------------------------
-- 12. Table: ClaimProcessing (Investigation & Assessor Review)
-- -----------------------------------------------------------------------------
CREATE TABLE "ClaimProcessing" (
    id VARCHAR(36) PRIMARY KEY,
    "claimId" VARCHAR(36) NOT NULL UNIQUE REFERENCES "Claim"(id) ON DELETE CASCADE,
    "assignedAgentId" VARCHAR(36) REFERENCES "InsuranceAgent"(id) ON DELETE SET NULL,
    "processingDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationNotes" TEXT,
    "approvedAmount" NUMERIC(14, 2),
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'AWAITING_REVIEW',
    "documentsVerified" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_claimproc_approved_amount" CHECK ("approvedAmount" IS NULL OR "approvedAmount" >= 0)
);

-- -----------------------------------------------------------------------------
-- 13. Table: Document (KYC, Medical Bills, FIR, Schedules)
-- -----------------------------------------------------------------------------
CREATE TABLE "Document" (
    id VARCHAR(36) PRIMARY KEY,
    "documentNumber" VARCHAR(50) NOT NULL UNIQUE,     -- e.g. DOC-1001
    name VARCHAR(255) NOT NULL,                       -- Document Title
    "documentType" VARCHAR(100) NOT NULL,             -- AADHAAR, HOSPITAL_BILL, VEHICLE_RC
    "fileSize" VARCHAR(50),
    "fileFormat" VARCHAR(50),
    "customerId" VARCHAR(36) NOT NULL REFERENCES "Customer"(id) ON DELETE RESTRICT,
    "policyId" VARCHAR(36) REFERENCES "InsurancePolicy"(id) ON DELETE SET NULL,
    "claimId" VARCHAR(36) REFERENCES "Claim"(id) ON DELETE SET NULL,
    "submissionDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "verificationNotes" TEXT,
    "verifiedBy" VARCHAR(100),
    "verifiedDate" TIMESTAMP,
    "fileUrl" VARCHAR(500),
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 14. Table: PolicyRenewal (Annual Renewals & Policy Extensions)
-- -----------------------------------------------------------------------------
CREATE TABLE "PolicyRenewal" (
    id VARCHAR(36) PRIMARY KEY,
    "renewalNumber" VARCHAR(50) NOT NULL UNIQUE,      -- e.g. REN-1001
    "policyId" VARCHAR(36) NOT NULL REFERENCES "InsurancePolicy"(id) ON DELETE CASCADE,
    "previousExpiryDate" TIMESTAMP NOT NULL,
    "newStartDate" TIMESTAMP NOT NULL,
    "newExpiryDate" TIMESTAMP NOT NULL,
    "renewalPremium" NUMERIC(14, 2) NOT NULL,
    "renewalDate" TIMESTAMP,
    status "RenewalStatus" NOT NULL DEFAULT 'UPCOMING',
    "paymentMethod" VARCHAR(100),
    "paymentReference" VARCHAR(100),
    notes TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_renewal_premium" CHECK ("renewalPremium" > 0),
    CONSTRAINT "chk_renewal_dates" CHECK ("newStartDate" < "newExpiryDate" AND "newStartDate" >= "previousExpiryDate")
);


-- =============================================================================
-- STEP 4: INDEXES CREATION (Fast Lookups & Joins)
-- Indexes se search queries super fast (sub-millisecond) chalti hain.
-- =============================================================================
CREATE INDEX "idx_user_email" ON "User"(email);
CREATE INDEX "idx_user_role" ON "User"(role);

CREATE INDEX "idx_customer_number" ON "Customer"("customerNumber");
CREATE INDEX "idx_customer_email" ON "Customer"(email);
CREATE INDEX "idx_customer_phone" ON "Customer"(phone);
CREATE INDEX "idx_customer_status" ON "Customer"(status);

CREATE INDEX "idx_policy_number" ON "InsurancePolicy"("policyNumber");
CREATE INDEX "idx_policy_customer" ON "InsurancePolicy"("customerId");
CREATE INDEX "idx_policy_status" ON "InsurancePolicy"(status);
CREATE INDEX "idx_policy_expiry" ON "InsurancePolicy"("expiryDate");

CREATE INDEX "idx_premium_policy" ON "Premium"("policyId");
CREATE INDEX "idx_premium_status" ON "Premium"(status);
CREATE INDEX "idx_premium_due_date" ON "Premium"("dueDate");

CREATE INDEX "idx_payment_premium" ON "PremiumPayment"("premiumId");
CREATE INDEX "idx_payment_policy" ON "PremiumPayment"("policyId");
CREATE INDEX "idx_payment_txn_ref" ON "PremiumPayment"("transactionReference");
CREATE INDEX "idx_payment_status" ON "PremiumPayment"(status);

CREATE INDEX "idx_claim_number" ON "Claim"("claimNumber");
CREATE INDEX "idx_claim_customer" ON "Claim"("customerId");
CREATE INDEX "idx_claim_policy" ON "Claim"("policyId");
CREATE INDEX "idx_claim_status" ON "Claim"(status);

CREATE INDEX "idx_app_number" ON "InsuranceApplication"("applicationNumber");
CREATE INDEX "idx_app_customer" ON "InsuranceApplication"("customerId");
CREATE INDEX "idx_app_status" ON "InsuranceApplication"(status);

CREATE INDEX "idx_agent_number" ON "InsuranceAgent"("agentNumber");
CREATE INDEX "idx_agent_license" ON "InsuranceAgent"("licenseNumber");
CREATE INDEX "idx_agent_email" ON "InsuranceAgent"(email);


-- =============================================================================
-- STEP 5: SAMPLE SEED DATA INSERTION (DML)
-- Testing aur working data ke liye realistic Indian insurance sample records.
-- =============================================================================

-- 1. Insert Users (Password: Admin@123 for admin, Agent@123 for agent, hashed with bcrypt)
INSERT INTO "User" (id, email, "passwordHash", role, name, phone, "isActive")
VALUES 
('usr-admin-01', 'admin@gmail.com', '$2b$10$iI0qK12Fq8l7R4x4Hq8p.OWQjUfqzR1bXn9U/0t/vVl.Zl6sS6WpW', 'ADMIN', 'System Administrator', '+91 98765 43210', true),
('usr-agent-01', 'agent@gmail.com', '$2b$10$wT8K8tF0cM1x2Y3z4A5b6eG7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v', 'AGENT', 'Pawan (Field Advisor)', '+91 91234 56789', true),
('usr-cust-01',  'arjun.mehta@email.com', '$2b$10$iI0qK12Fq8l7R4x4Hq8p.OWQjUfqzR1bXn9U/0t/vVl.Zl6sS6WpW', 'CUSTOMER', 'Arjun Mehta', '+91 98111 22334', true),
('usr-cust-02',  'sunita.rao@email.com',  '$2b$10$iI0qK12Fq8l7R4x4Hq8p.OWQjUfqzR1bXn9U/0t/vVl.Zl6sS6WpW', 'CUSTOMER', 'Sunita Rao', '+91 98222 33445', true);

-- 2. Insert Insurance Companies
INSERT INTO "InsuranceCompany" (id, name, "shortName", "registrationNumber", category, phone, email, address, city, state, "postalCode", "solvencyRatio", rating, status)
VALUES 
('cmp-01', 'HDFC ERGO General Insurance', 'HDFC ERGO', 'IRDAI-REG-146', 'General & Health', '022-62346234', 'care@hdfcergo.com', '165-166 Backbay Reclamation', 'Mumbai', 'Maharashtra', '400020', 1.95, 'AAA', 'ACTIVE'),
('cmp-02', 'Star Health and Allied Insurance', 'Star Health', 'IRDAI-REG-129', 'Health', '044-28288800', 'support@starhealth.in', '1 New Tank Street, Valluvarkottam High Rd', 'Chennai', 'Tamil Nadu', '600034', 1.82, 'AA+', 'ACTIVE');

-- 3. Insert Customers
INSERT INTO "Customer" (id, "customerNumber", "userId", "firstName", "lastName", "dateOfBirth", gender, email, phone, address, city, state, "postalCode", "idProofType", "maskedIdProofNumber", status)
VALUES 
('cust-01', 'CUST-1001', 'usr-cust-01', 'Arjun', 'Mehta', '1988-06-14', 'Male', 'arjun.mehta@email.com', '+91 98111 22334', 'Flat 402, Green Glen Layout, Bellandur', 'Bengaluru', 'Karnataka', '560103', 'Aadhaar', 'XXXX-XXXX-4589', 'ACTIVE'),
('cust-02', 'CUST-1002', 'usr-cust-02', 'Sunita', 'Rao', '1992-11-20', 'Female', 'sunita.rao@email.com', '+91 98222 33445', 'B-12, Sector 62', 'Noida', 'Uttar Pradesh', '201301', 'PAN', 'ABCDE1234F', 'ACTIVE');

-- 4. Insert Policy Types
INSERT INTO "PolicyType" (id, "typeCode", name, description, "coverageDetails", eligibility, terms, icon, status)
VALUES 
('pt-01', 'HLTH-01', 'Comprehensive Health Shield', 'Full family health and hospitalization coverage', 'In-patient hospitalization up to ₹10 Lakhs, Day care procedures, Pre-post hospitalization expenses', 'Ages 18-65 years, Indian residents', '1 year term with lifetime renewability, 30-day initial waiting period', 'ShieldPlus', 'ACTIVE'),
('pt-02', 'LIFE-01', 'Term Life Secure Elite', 'High sum assured pure term life protection', '₹1 Crore natural & accidental death benefit with terminal illness accelerator', 'Ages 18-55 years, Salaried or Self-employed', 'Term from 10 to 40 years, Suicide exclusion during first 12 months', 'HeartHandshake', 'ACTIVE'),
('pt-03', 'AUTO-01', 'Motor Comprehensive Protect', 'Bumper-to-bumper car insurance with zero depreciation', 'Own damage, third-party liability, personal accident cover for owner-driver up to ₹15 Lakhs', 'Private 4-wheeler registered in India', 'Annual renewal required, standard wear-and-tear excluded', 'Car', 'ACTIVE');

-- 5. Insert Insurance Agent
INSERT INTO "InsuranceAgent" (id, "agentNumber", "userId", "companyId", "firstName", "lastName", email, phone, city, region, "licenseNumber", specialization, status, "commissionRate", rating)
VALUES 
('agt-01', 'AGT-1001', 'usr-agent-01', 'cmp-01', 'Pawan', 'Kumar', 'agent@gmail.com', '+91 91234 56789', 'New Delhi', 'North Region', 'IRDAI-AGN-994821', 'Health & Life Underwriting', 'ACTIVE', 8.50, 4.90);

-- 6. Insert Insurance Application
INSERT INTO "InsuranceApplication" (id, "applicationNumber", "customerId", "policyTypeId", "requestedCoverage", "annualIncome", "employmentStatus", "nomineeName", "nomineeRelation", status)
VALUES 
('app-01', 'APP-1001', 'cust-01', 'pt-01', 1000000.00, 1450000.00, 'Salaried', 'Pooja Mehta', 'Spouse', 'APPROVED');

-- 7. Insert Insurance Policy
INSERT INTO "InsurancePolicy" (id, "policyNumber", "applicationId", "customerId", "policyTypeId", "companyId", "agentId", "sumAssured", "premiumAmount", "premiumFrequency", "startDate", "expiryDate", status)
VALUES 
('pol-01', 'POL-2025-1001', 'app-01', 'cust-01', 'pt-01', 'cmp-01', 'agt-01', 1000000.00, 18500.00, 'ANNUALLY', '2025-01-01', '2026-01-01', 'ACTIVE');

-- 8. Insert Premium Schedule
INSERT INTO "Premium" (id, "premiumNumber", "policyId", amount, "paidAmount", "dueDate", "paidDate", status, "billingPeriodStart", "billingPeriodEnd")
VALUES 
('prem-01', 'PREM-1001', 'pol-01', 18500.00, 18500.00, '2025-01-15', '2025-01-05', 'PAID', '2025-01-01', '2026-01-01');

-- 9. Insert Premium Payment
INSERT INTO "PremiumPayment" (id, "paymentNumber", "premiumId", "policyId", amount, "paymentDate", "paymentMethod", "transactionReference", status, notes)
VALUES 
('pay-01', 'PPAY-1001', 'prem-01', 'pol-01', 18500.00, '2025-01-05', 'UPI', 'UPI/20250105/984729104', 'SUCCESS', 'Annual premium paid in full via GooglePay');

-- 10. Insert Beneficiaries (Sum of allocation = 100%)
INSERT INTO "Beneficiary" (id, "policyId", name, relationship, "allocationPercentage", phone)
VALUES 
('ben-01', 'pol-01', 'Pooja Mehta', 'Spouse', 60.00, '+91 98111 88990'),
('ben-02', 'pol-01', 'Kabir Mehta', 'Child', 40.00, '+91 98111 22334');

-- 11. Insert Claim & Claim Processing
INSERT INTO "Claim" (id, "claimNumber", "customerId", "policyId", "assignedAgentId", "claimType", "claimDate", "claimedAmount", "approvedAmount", status, "incidentDescription", "settlementDate", "settlementMethod", "settlementTransactionRef")
VALUES 
('clm-01', 'CLM-1001', 'cust-01', 'pol-01', 'agt-01', 'Hospitalization', '2025-06-10', 45000.00, 42500.00, 'SETTLED', 'Dengue fever 4-day inpatient treatment at Manipal Hospital, Bengaluru.', '2025-06-18', 'NEFT', 'NEFT-AXIS-20250618002');

INSERT INTO "ClaimProcessing" (id, "claimId", "assignedAgentId", "processingDate", "verificationStatus", "verificationNotes", "approvedAmount", "processingStatus", "documentsVerified")
VALUES 
('clm-proc-01', 'clm-01', 'agt-01', '2025-06-12', 'VERIFIED', 'All hospital bills and discharge summary verified with Manipal Hospital records.', 42500.00, 'SETTLED', true);

-- 12. Insert Document
INSERT INTO "Document" (id, "documentNumber", name, "documentType", "fileSize", "fileFormat", "customerId", "policyId", "claimId", "verificationStatus", "verifiedBy")
VALUES 
('doc-01', 'DOC-1001', 'Manipal Hospital Final Bill & Discharge Summary', 'HOSPITAL_BILL', '2.4 MB', 'PDF', 'cust-01', 'pol-01', 'clm-01', 'VERIFIED', 'Dr. S. Sharma (Medical Assessor)');

-- 13. Insert Policy Renewal
INSERT INTO "PolicyRenewal" (id, "renewalNumber", "policyId", "previousExpiryDate", "newStartDate", "newExpiryDate", "renewalPremium", status, "paymentMethod", "paymentReference")
VALUES 
('ren-01', 'REN-1001', 'pol-01', '2026-01-01', '2026-01-01', '2027-01-01', 19425.00, 'UPCOMING', NULL, NULL);


-- =============================================================================
-- STEP 6: USEFUL BEGINNER QUERIES & EXAMPLES
-- Yahan rozmarra ki basic aur important queries di gayi hain jinhe aap 
-- run karke dekh sakte hain:
-- =============================================================================

-- Query 1: Saare Customers ki list dekhna
SELECT id, "customerNumber", "firstName", "lastName", email, phone, city, status 
FROM "Customer" 
ORDER BY "createdAt" DESC;

-- Query 2: Active Policies ke saath Customer ka naam aur Insurance Company ka naam dekhna (INNER JOIN)
SELECT 
    p."policyNumber",
    c."firstName" || ' ' || c."lastName" AS customer_name,
    c.phone,
    pt.name AS policy_plan,
    comp.name AS company_name,
    p."sumAssured",
    p."premiumAmount",
    p.status
FROM "InsurancePolicy" p
JOIN "Customer" c ON p."customerId" = c.id
JOIN "PolicyType" pt ON p."policyTypeId" = pt.id
LEFT JOIN "InsuranceCompany" comp ON p."companyId" = comp.id
WHERE p.status = 'ACTIVE';

-- Query 3: Kisi Policy ke Nominees (Beneficiaries) aur unka Percentage hissa dekhna
SELECT 
    p."policyNumber",
    b.name AS nominee_name,
    b.relationship,
    b."allocationPercentage" || '%' AS share_percentage
FROM "Beneficiary" b
JOIN "InsurancePolicy" p ON b."policyId" = p.id;

-- Query 4: Unpaid / Due Premiums ki list aur Due Date dekhna
SELECT 
    pr."premiumNumber",
    p."policyNumber",
    c."firstName" || ' ' || c."lastName" AS customer_name,
    pr.amount,
    pr."paidAmount",
    (pr.amount - pr."paidAmount") AS remaining_balance,
    pr."dueDate",
    pr.status
FROM "Premium" pr
JOIN "InsurancePolicy" p ON pr."policyId" = p.id
JOIN "Customer" c ON p."customerId" = c.id
WHERE pr.status IN ('DUE', 'OVERDUE', 'PARTIALLY_PAID');

-- Query 5: Total Successful Payments ka sum nikalna (Aggregation SUM)
SELECT 
    COUNT(*) AS total_transactions,
    SUM(amount) AS total_amount_collected_inr
FROM "PremiumPayment"
WHERE status = 'SUCCESS';

-- Query 6: Claims Summary Report (Kis customer ka kitna claim approve hua)
SELECT 
    clm."claimNumber",
    c."firstName" || ' ' || c."lastName" AS claimant_name,
    p."policyNumber",
    clm."claimType",
    clm."claimedAmount",
    clm."approvedAmount",
    clm.status AS claim_status,
    cp."processingStatus" AS assessor_status
FROM "Claim" clm
JOIN "Customer" c ON clm."customerId" = c.id
JOIN "InsurancePolicy" p ON clm."policyId" = p.id
LEFT JOIN "ClaimProcessing" cp ON clm.id = cp."claimId";

-- Query 7: Ek naya Customer insert karna (Simple INSERT)
-- INSERT INTO "Customer" (id, "customerNumber", "firstName", "lastName", "dateOfBirth", gender, email, phone, address, city, state, "postalCode", "idProofType", "maskedIdProofNumber", status)
-- VALUES (gen_random_uuid()::text, 'CUST-1003', 'Vikram', 'Singh', '1995-03-22', 'Male', 'vikram.singh@gmail.com', '+91 98333 44556', 'Flat 101, Hiranandani', 'Mumbai', 'Maharashtra', '400076', 'Aadhaar', 'XXXX-XXXX-9901', 'ACTIVE');

-- Query 8: Customer ka address update karna (Simple UPDATE)
-- UPDATE "Customer" 
-- SET address = 'New Flat 505, Sector 15', city = 'Gurugram', state = 'Haryana', "updatedAt" = NOW()
-- WHERE "customerNumber" = 'CUST-1001';

-- Query 9: Safe Cleanup Query (Agar test record delete karna ho)
-- DELETE FROM "Customer" WHERE "customerNumber" = 'CUST-1003';


-- =============================================================================
-- STEP 7: HANDY VIEWS (Read-made reports for easy querying)
-- Views se complex JOINs ko ek single table ki tarah query kiya ja sakta hai.
-- =============================================================================

-- View 1: Active Policyholders Dashboard View
CREATE OR REPLACE VIEW vw_active_policyholders AS
SELECT 
    p.id AS policy_id,
    p."policyNumber",
    c."customerNumber",
    c."firstName" || ' ' || c."lastName" AS customer_name,
    c.email,
    c.phone,
    pt.name AS plan_name,
    p."sumAssured",
    p."premiumAmount",
    p."premiumFrequency",
    p."startDate",
    p."expiryDate"
FROM "InsurancePolicy" p
JOIN "Customer" c ON p."customerId" = c.id
JOIN "PolicyType" pt ON p."policyTypeId" = pt.id
WHERE p.status = 'ACTIVE';

-- View 2: Claims Tracking View
CREATE OR REPLACE VIEW vw_claims_tracking AS
SELECT 
    clm."claimNumber",
    c."customerNumber",
    c."firstName" || ' ' || c."lastName" AS customer_name,
    p."policyNumber",
    clm."claimType",
    clm."claimedAmount",
    COALESCE(clm."approvedAmount", 0) AS approved_amount,
    clm.status AS claim_status,
    clm."claimDate"
FROM "Claim" clm
JOIN "Customer" c ON clm."customerId" = c.id
JOIN "InsurancePolicy" p ON clm."policyId" = p.id;

-- Ab aap in views ko simple SELECT se query kar sakte hain:
-- SELECT * FROM vw_active_policyholders;
-- SELECT * FROM vw_claims_tracking;

-- =============================================================================
-- SCRIPT COMPLETE!
-- InsureX database is ready for exploration, querying, and DBMS submissions.
-- =============================================================================
