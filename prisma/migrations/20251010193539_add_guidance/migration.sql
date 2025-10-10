-- CreateEnum
CREATE TYPE "Religion" AS ENUM ('BUDDHIST', 'HINDU', 'CHRISTIAN', 'ISLAM');

-- CreateTable
CREATE TABLE "Guidance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "religion" "Religion" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "references" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guidance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guidance_userId_createdAt_idx" ON "Guidance"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Guidance" ADD CONSTRAINT "Guidance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
