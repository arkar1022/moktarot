-- AlterTable
ALTER TABLE "NatalReadingRecord" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
