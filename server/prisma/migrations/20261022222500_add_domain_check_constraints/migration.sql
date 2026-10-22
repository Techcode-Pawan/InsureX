-- PostgreSQL Database Hardening: Domain CHECK Constraints
-- InsureX Insurance Management System

-- 1. Insurance Policies: Non-negative monetary amounts and chronological validity
ALTER TABLE "InsurancePolicy"
  ADD CONSTRAINT "chk_policy_sum_assured" CHECK ("sumAssured" > 0),
  ADD CONSTRAINT "chk_policy_premium_amount" CHECK ("premiumAmount" > 0),
  ADD CONSTRAINT "chk_policy_date_range" CHECK ("startDate" < "expiryDate");

-- 2. Premiums: Positive installment amounts and non-negative paidAmount <= amount
ALTER TABLE "Premium"
  ADD CONSTRAINT "chk_premium_amount" CHECK (amount > 0),
  ADD CONSTRAINT "chk_premium_paid_amount" CHECK ("paidAmount" >= 0 AND "paidAmount" <= amount);

-- 3. Premium Payments: Positive transaction amounts
ALTER TABLE "PremiumPayment"
  ADD CONSTRAINT "chk_payment_amount" CHECK (amount > 0);

-- 4. Claims: Positive claimed amounts, non-negative approved amount bounded by claimed amount
ALTER TABLE "Claim"
  ADD CONSTRAINT "chk_claim_claimed_amount" CHECK ("claimedAmount" > 0),
  ADD CONSTRAINT "chk_claim_approved_amount" CHECK ("approvedAmount" IS NULL OR ("approvedAmount" >= 0 AND "approvedAmount" <= "claimedAmount"));

-- 5. Claim Processing: Non-negative approved amount
ALTER TABLE "ClaimProcessing"
  ADD CONSTRAINT "chk_claimproc_approved_amount" CHECK ("approvedAmount" IS NULL OR "approvedAmount" >= 0);

-- 6. Beneficiaries: Valid allocation percentages (0 < allocation <= 100)
ALTER TABLE "Beneficiary"
  ADD CONSTRAINT "chk_beneficiary_allocation" CHECK ("allocationPercentage" > 0 AND "allocationPercentage" <= 100);

-- 7. Applications: Positive requested coverage and non-negative income
ALTER TABLE "InsuranceApplication"
  ADD CONSTRAINT "chk_app_requested_coverage" CHECK ("requestedCoverage" > 0),
  ADD CONSTRAINT "chk_app_annual_income" CHECK ("annualIncome" IS NULL OR "annualIncome" >= 0);

-- 8. Agents: Valid commission rates (0-100%) and star ratings (0-5)
ALTER TABLE "InsuranceAgent"
  ADD CONSTRAINT "chk_agent_commission" CHECK ("commissionRate" >= 0 AND "commissionRate" <= 100),
  ADD CONSTRAINT "chk_agent_rating" CHECK (rating >= 0 AND rating <= 5);

-- 9. Policy Renewals: Positive renewal premium, valid dates (newStart < newExpiry AND newStart >= previousExpiry)
ALTER TABLE "PolicyRenewal"
  ADD CONSTRAINT "chk_renewal_premium" CHECK ("renewalPremium" > 0),
  ADD CONSTRAINT "chk_renewal_dates" CHECK ("newStartDate" < "newExpiryDate" AND "newStartDate" >= "previousExpiryDate");

-- 10. Insurance Companies: Non-negative solvency ratio
ALTER TABLE "InsuranceCompany"
  ADD CONSTRAINT "chk_company_solvency" CHECK ("solvencyRatio" IS NULL OR "solvencyRatio" >= 0);
