-- Agent profile: optional organisational fields
ALTER TABLE "InsuranceAgent" ADD COLUMN     "address" TEXT,
ADD COLUMN     "branch" TEXT,
ADD COLUMN     "department" TEXT;

-- One-time password setup / reset links (only a SHA-256 hash of the token is stored)
ALTER TABLE "User" ADD COLUMN     "passwordSetupExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordSetupPurpose" TEXT,
ADD COLUMN     "passwordSetupTokenHash" TEXT;

CREATE UNIQUE INDEX "User_passwordSetupTokenHash_key" ON "User"("passwordSetupTokenHash");
