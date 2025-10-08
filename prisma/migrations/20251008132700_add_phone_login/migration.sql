/*
  Warnings:

  - A unique constraint covering the columns `[phoneCode,phoneNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneCode" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneCode_phoneNumber_key" ON "User"("phoneCode", "phoneNumber");
