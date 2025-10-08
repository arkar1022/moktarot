-- CreateTable
CREATE TABLE "ZodiacView" (
    "id" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastViewed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZodiacView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZodiacView_readingId_idx" ON "ZodiacView"("readingId");

-- CreateIndex
CREATE UNIQUE INDEX "ZodiacView_readingId_userId_key" ON "ZodiacView"("readingId", "userId");

-- AddForeignKey
ALTER TABLE "ZodiacView" ADD CONSTRAINT "ZodiacView_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "ZodiacReading"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZodiacView" ADD CONSTRAINT "ZodiacView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
