-- CreateEnum
CREATE TYPE "ZodiacSign" AS ENUM ('ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO', 'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES');

-- CreateTable
CREATE TABLE "ZodiacReading" (
    "id" TEXT NOT NULL,
    "sign" "ZodiacSign" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "cards" JSONB NOT NULL,
    "general" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "workMoney" TEXT NOT NULL,
    "health" TEXT NOT NULL,
    "education" TEXT NOT NULL,
    "warnings" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZodiacReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZodiacReading_sign_createdAt_idx" ON "ZodiacReading"("sign", "createdAt");
