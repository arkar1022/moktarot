-- CreateTable
CREATE TABLE "NatalReadingRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "context" TEXT NOT NULL,
    "phase" TEXT,
    "language" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NatalReadingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NatalReadingRecord_userId_createdAt_idx" ON "NatalReadingRecord"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "NatalReadingRecord" ADD CONSTRAINT "NatalReadingRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
