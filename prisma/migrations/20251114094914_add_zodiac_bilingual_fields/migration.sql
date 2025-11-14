-- AlterTable
ALTER TABLE "ZodiacReading" ADD COLUMN     "educationEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "generalEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "healthEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "relationshipEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "warningsEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "workMoneyEn" TEXT NOT NULL DEFAULT '';
