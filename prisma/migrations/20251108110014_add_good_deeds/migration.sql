-- CreateEnum
CREATE TYPE "GoodDeedCategory" AS ENUM ('FAMILY', 'COMMUNITY', 'RELIGION', 'SELF_GROWTH', 'HEALTH', 'FINANCIAL', 'EDUCATION', 'ENVIRONMENT', 'KINDNESS', 'PROFESSIONAL');

-- CreateTable
CREATE TABLE "GoodDeed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deedDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "categories" "GoodDeedCategory"[],
    "aiFeedback" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'my',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodDeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoodDeed_userId_deedDate_idx" ON "GoodDeed"("userId", "deedDate");

-- AddForeignKey
ALTER TABLE "GoodDeed" ADD CONSTRAINT "GoodDeed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
