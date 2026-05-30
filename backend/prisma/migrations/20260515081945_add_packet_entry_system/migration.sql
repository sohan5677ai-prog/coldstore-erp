/*
  Warnings:

  - You are about to drop the column `quantity` on the `InwardPacketEntry` table. All the data in the column will be lost.
  - You are about to drop the column `financialYear` on the `Voucher` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "InwardPacketEntry" DROP CONSTRAINT "InwardPacketEntry_packetId_fkey";

-- AlterTable
ALTER TABLE "Commodity" ALTER COLUMN "type" SET DEFAULT 'Seasonally';

-- AlterTable
ALTER TABLE "InwardPacketEntry" DROP COLUMN "quantity",
ADD COLUMN     "avgWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "packetName" TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "qtyInPkts" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "packetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Voucher" DROP COLUMN "financialYear",
ALTER COLUMN "voucherType" SET DEFAULT 'Receipt';

-- CreateTable
CREATE TABLE "AdvanceBooking" (
    "id" SERIAL NOT NULL,
    "bookingNo" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "expectedDate" TIMESTAMP(3),
    "commodity" TEXT,
    "variety" TEXT,
    "expectedBags" DOUBLE PRECISION,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "AdvanceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InwardLoading" (
    "id" SERIAL NOT NULL,
    "loadingDate" TIMESTAMP(3) NOT NULL,
    "contractorName" TEXT,
    "labourCount" INTEGER NOT NULL DEFAULT 0,
    "bags" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratePerBag" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inwardId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "InwardLoading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "reminderDate" TIMESTAMP(3) NOT NULL,
    "message" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'note',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdvanceBooking_bookingNo_key" ON "AdvanceBooking"("bookingNo");

-- AddForeignKey
ALTER TABLE "AdvanceBooking" ADD CONSTRAINT "AdvanceBooking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceBooking" ADD CONSTRAINT "AdvanceBooking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InwardLoading" ADD CONSTRAINT "InwardLoading_inwardId_fkey" FOREIGN KEY ("inwardId") REFERENCES "InwardEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InwardLoading" ADD CONSTRAINT "InwardLoading_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
