-- CreateEnum
CREATE TYPE "ReadingCategory" AS ENUM ('LOVE', 'MARRIAGE', 'WORK', 'LIFESTYLE', 'SPIRITUAL', 'EDUCATION', 'HEALTH', 'MONEY');

-- AlterTable
ALTER TABLE "Reading" ADD COLUMN     "category" "ReadingCategory";
