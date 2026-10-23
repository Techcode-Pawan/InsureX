-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "assignedAgentId" TEXT;

-- AlterTable
ALTER TABLE "InsuranceApplication" ADD COLUMN     "assistedByAgentId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "customerId" TEXT,
    "agentId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_customerId_idx" ON "ActivityLog"("customerId");

-- CreateIndex
CREATE INDEX "ActivityLog_agentId_idx" ON "ActivityLog"("agentId");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Customer_assignedAgentId_idx" ON "Customer"("assignedAgentId");

-- CreateIndex
CREATE INDEX "InsuranceApplication_assistedByAgentId_idx" ON "InsuranceApplication"("assistedByAgentId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "InsuranceAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_assistedByAgentId_fkey" FOREIGN KEY ("assistedByAgentId") REFERENCES "InsuranceAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill (non-destructive): assign each existing customer to the agent already servicing
-- their earliest agent-linked policy, so agents keep visibility of the customers they serve.
UPDATE "Customer" c
SET "assignedAgentId" = p."agentId"
FROM (
  SELECT DISTINCT ON ("customerId") "customerId", "agentId"
  FROM "InsurancePolicy"
  WHERE "agentId" IS NOT NULL
  ORDER BY "customerId", "createdAt"
) p
WHERE c."id" = p."customerId" AND c."assignedAgentId" IS NULL;
