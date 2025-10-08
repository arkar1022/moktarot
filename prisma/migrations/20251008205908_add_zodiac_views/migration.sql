-- AlterTable
ALTER TABLE "ZodiacReading" ADD COLUMN     "fakeReactions" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ZodiacReaction" (
    "id" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZodiacReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZodiacReaction_readingId_idx" ON "ZodiacReaction"("readingId");

-- CreateIndex
CREATE UNIQUE INDEX "ZodiacReaction_readingId_userId_key" ON "ZodiacReaction"("readingId", "userId");

-- AddForeignKey
ALTER TABLE "ZodiacReaction" ADD CONSTRAINT "ZodiacReaction_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "ZodiacReading"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZodiacReaction" ADD CONSTRAINT "ZodiacReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
