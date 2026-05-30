-- CreateTable
CREATE TABLE "TelegramScan" (
    "id" SERIAL NOT NULL,
    "passType" TEXT NOT NULL DEFAULT 'Inward',
    "parsedData" JSONB NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "chatId" TEXT,
    "rawCaption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramScan_pkey" PRIMARY KEY ("id")
);
