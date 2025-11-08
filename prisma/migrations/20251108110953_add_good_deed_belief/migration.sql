-- CreateEnum
CREATE TYPE "GoodDeedBelief" AS ENUM ('BUDDHIST', 'HINDU', 'CHRISTIAN', 'ISLAM', 'ATHEIST');

-- AlterTable
ALTER TABLE "GoodDeed" ADD COLUMN     "belief" "GoodDeedBelief" NOT NULL DEFAULT 'ATHEIST';
