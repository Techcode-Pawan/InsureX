-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'UNDER_REVIEW', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PolicyTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PremiumFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "PremiumStatus" AS ENUM ('PAID', 'DUE', 'OVERDUE', 'PARTIALLY_PAID', 'GRACE_PERIOD');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'NET_BANKING', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHEQUE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUCCESS', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'PARTIAL', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('AWAITING_REVIEW', 'UNDER_VERIFICATION', 'DOCUMENTS_REQUIRED', 'APPROVED', 'REJECTED', 'SETTLED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'NEEDS_INFO', 'REJECTED');

-- CreateEnum
CREATE TYPE "RenewalStatus" AS ENUM ('UPCOMING', 'RENEWED', 'OVERDUE', 'GRACE_PERIOD', 'LAPSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "solvencyRatio" DECIMAL(5,2),
    "rating" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "idProofType" TEXT NOT NULL,
    "maskedIdProofNumber" TEXT NOT NULL,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyType" (
    "id" TEXT NOT NULL,
    "typeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverageDetails" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "icon" TEXT,
    "status" "PolicyTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceApplication" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "policyTypeId" TEXT NOT NULL,
    "requestedCoverage" DECIMAL(14,2) NOT NULL,
    "annualIncome" DECIMAL(14,2),
    "employmentStatus" TEXT,
    "nomineeName" TEXT,
    "nomineeRelation" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "applicationId" TEXT,
    "customerId" TEXT NOT NULL,
    "policyTypeId" TEXT NOT NULL,
    "companyId" TEXT,
    "agentId" TEXT,
    "sumAssured" DECIMAL(14,2) NOT NULL,
    "premiumAmount" DECIMAL(14,2) NOT NULL,
    "premiumFrequency" "PremiumFrequency" NOT NULL DEFAULT 'ANNUALLY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Premium" (
    "id" TEXT NOT NULL,
    "premiumNumber" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" "PremiumStatus" NOT NULL DEFAULT 'DUE',
    "billingPeriodStart" TIMESTAMP(3),
    "billingPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Premium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremiumPayment" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "premiumId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'UPI',
    "transactionReference" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCESS',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremiumPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "allocationPercentage" DECIMAL(5,2) NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "idProofType" TEXT,
    "idProofNumber" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceAgent" (
    "id" TEXT NOT NULL,
    "agentNumber" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "joiningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 8.0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 4.8,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "assignedAgentId" TEXT,
    "claimType" TEXT NOT NULL,
    "claimDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAmount" DECIMAL(14,2) NOT NULL,
    "approvedAmount" DECIMAL(14,2),
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "incidentDescription" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "settlementDate" TIMESTAMP(3),
    "settlementMethod" TEXT,
    "settlementTransactionRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimProcessing" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "assignedAgentId" TEXT,
    "processingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationNotes" TEXT,
    "approvedAmount" DECIMAL(14,2),
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'AWAITING_REVIEW',
    "documentsVerified" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimProcessing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileSize" TEXT,
    "fileFormat" TEXT,
    "customerId" TEXT NOT NULL,
    "policyId" TEXT,
    "claimId" TEXT,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationStatus" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "verificationNotes" TEXT,
    "verifiedBy" TEXT,
    "verifiedDate" TIMESTAMP(3),
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRenewal" (
    "id" TEXT NOT NULL,
    "renewalNumber" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "previousExpiryDate" TIMESTAMP(3) NOT NULL,
    "newStartDate" TIMESTAMP(3) NOT NULL,
    "newExpiryDate" TIMESTAMP(3) NOT NULL,
    "renewalPremium" DECIMAL(14,2) NOT NULL,
    "renewalDate" TIMESTAMP(3),
    "status" "RenewalStatus" NOT NULL DEFAULT 'UPCOMING',
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyRenewal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceCompany_registrationNumber_key" ON "InsuranceCompany"("registrationNumber");

-- CreateIndex
CREATE INDEX "InsuranceCompany_registrationNumber_idx" ON "InsuranceCompany"("registrationNumber");

-- CreateIndex
CREATE INDEX "InsuranceCompany_status_idx" ON "InsuranceCompany"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerNumber_key" ON "Customer"("customerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_customerNumber_idx" ON "Customer"("customerNumber");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyType_typeCode_key" ON "PolicyType"("typeCode");

-- CreateIndex
CREATE INDEX "PolicyType_typeCode_idx" ON "PolicyType"("typeCode");

-- CreateIndex
CREATE INDEX "PolicyType_status_idx" ON "PolicyType"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceApplication_applicationNumber_key" ON "InsuranceApplication"("applicationNumber");

-- CreateIndex
CREATE INDEX "InsuranceApplication_applicationNumber_idx" ON "InsuranceApplication"("applicationNumber");

-- CreateIndex
CREATE INDEX "InsuranceApplication_customerId_idx" ON "InsuranceApplication"("customerId");

-- CreateIndex
CREATE INDEX "InsuranceApplication_policyTypeId_idx" ON "InsuranceApplication"("policyTypeId");

-- CreateIndex
CREATE INDEX "InsuranceApplication_status_idx" ON "InsuranceApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InsurancePolicy_policyNumber_key" ON "InsurancePolicy"("policyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InsurancePolicy_applicationId_key" ON "InsurancePolicy"("applicationId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_policyNumber_idx" ON "InsurancePolicy"("policyNumber");

-- CreateIndex
CREATE INDEX "InsurancePolicy_customerId_idx" ON "InsurancePolicy"("customerId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_policyTypeId_idx" ON "InsurancePolicy"("policyTypeId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_companyId_idx" ON "InsurancePolicy"("companyId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_agentId_idx" ON "InsurancePolicy"("agentId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_status_idx" ON "InsurancePolicy"("status");

-- CreateIndex
CREATE INDEX "InsurancePolicy_expiryDate_idx" ON "InsurancePolicy"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Premium_premiumNumber_key" ON "Premium"("premiumNumber");

-- CreateIndex
CREATE INDEX "Premium_premiumNumber_idx" ON "Premium"("premiumNumber");

-- CreateIndex
CREATE INDEX "Premium_policyId_idx" ON "Premium"("policyId");

-- CreateIndex
CREATE INDEX "Premium_status_idx" ON "Premium"("status");

-- CreateIndex
CREATE INDEX "Premium_dueDate_idx" ON "Premium"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "PremiumPayment_paymentNumber_key" ON "PremiumPayment"("paymentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PremiumPayment_transactionReference_key" ON "PremiumPayment"("transactionReference");

-- CreateIndex
CREATE INDEX "PremiumPayment_paymentNumber_idx" ON "PremiumPayment"("paymentNumber");

-- CreateIndex
CREATE INDEX "PremiumPayment_premiumId_idx" ON "PremiumPayment"("premiumId");

-- CreateIndex
CREATE INDEX "PremiumPayment_policyId_idx" ON "PremiumPayment"("policyId");

-- CreateIndex
CREATE INDEX "PremiumPayment_transactionReference_idx" ON "PremiumPayment"("transactionReference");

-- CreateIndex
CREATE INDEX "PremiumPayment_status_idx" ON "PremiumPayment"("status");

-- CreateIndex
CREATE INDEX "Beneficiary_policyId_idx" ON "Beneficiary"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceAgent_agentNumber_key" ON "InsuranceAgent"("agentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceAgent_userId_key" ON "InsuranceAgent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceAgent_email_key" ON "InsuranceAgent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceAgent_licenseNumber_key" ON "InsuranceAgent"("licenseNumber");

-- CreateIndex
CREATE INDEX "InsuranceAgent_agentNumber_idx" ON "InsuranceAgent"("agentNumber");

-- CreateIndex
CREATE INDEX "InsuranceAgent_licenseNumber_idx" ON "InsuranceAgent"("licenseNumber");

-- CreateIndex
CREATE INDEX "InsuranceAgent_email_idx" ON "InsuranceAgent"("email");

-- CreateIndex
CREATE INDEX "InsuranceAgent_status_idx" ON "InsuranceAgent"("status");

-- CreateIndex
CREATE INDEX "InsuranceAgent_region_idx" ON "InsuranceAgent"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimNumber_key" ON "Claim"("claimNumber");

-- CreateIndex
CREATE INDEX "Claim_claimNumber_idx" ON "Claim"("claimNumber");

-- CreateIndex
CREATE INDEX "Claim_customerId_idx" ON "Claim"("customerId");

-- CreateIndex
CREATE INDEX "Claim_policyId_idx" ON "Claim"("policyId");

-- CreateIndex
CREATE INDEX "Claim_assignedAgentId_idx" ON "Claim"("assignedAgentId");

-- CreateIndex
CREATE INDEX "Claim_status_idx" ON "Claim"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimProcessing_claimId_key" ON "ClaimProcessing"("claimId");

-- CreateIndex
CREATE INDEX "ClaimProcessing_claimId_idx" ON "ClaimProcessing"("claimId");

-- CreateIndex
CREATE INDEX "ClaimProcessing_processingStatus_idx" ON "ClaimProcessing"("processingStatus");

-- CreateIndex
CREATE INDEX "ClaimProcessing_verificationStatus_idx" ON "ClaimProcessing"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Document_documentNumber_key" ON "Document"("documentNumber");

-- CreateIndex
CREATE INDEX "Document_documentNumber_idx" ON "Document"("documentNumber");

-- CreateIndex
CREATE INDEX "Document_customerId_idx" ON "Document"("customerId");

-- CreateIndex
CREATE INDEX "Document_policyId_idx" ON "Document"("policyId");

-- CreateIndex
CREATE INDEX "Document_claimId_idx" ON "Document"("claimId");

-- CreateIndex
CREATE INDEX "Document_verificationStatus_idx" ON "Document"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyRenewal_renewalNumber_key" ON "PolicyRenewal"("renewalNumber");

-- CreateIndex
CREATE INDEX "PolicyRenewal_renewalNumber_idx" ON "PolicyRenewal"("renewalNumber");

-- CreateIndex
CREATE INDEX "PolicyRenewal_policyId_idx" ON "PolicyRenewal"("policyId");

-- CreateIndex
CREATE INDEX "PolicyRenewal_status_idx" ON "PolicyRenewal"("status");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_policyTypeId_fkey" FOREIGN KEY ("policyTypeId") REFERENCES "PolicyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "InsuranceApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_policyTypeId_fkey" FOREIGN KEY ("policyTypeId") REFERENCES "PolicyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "InsuranceCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "InsuranceAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Premium" ADD CONSTRAINT "Premium_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumPayment" ADD CONSTRAINT "PremiumPayment_premiumId_fkey" FOREIGN KEY ("premiumId") REFERENCES "Premium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumPayment" ADD CONSTRAINT "PremiumPayment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceAgent" ADD CONSTRAINT "InsuranceAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceAgent" ADD CONSTRAINT "InsuranceAgent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "InsuranceCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "InsuranceAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimProcessing" ADD CONSTRAINT "ClaimProcessing_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimProcessing" ADD CONSTRAINT "ClaimProcessing_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "InsuranceAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRenewal" ADD CONSTRAINT "PolicyRenewal_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
