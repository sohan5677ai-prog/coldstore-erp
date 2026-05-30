/*
  Warnings:

  - You are about to drop the column `bardanaCharge` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `financialYear` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `loadingCharge` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `loanAmount` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `otherCharge` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `unloadingCharge` on the `Bill` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bill" DROP COLUMN "bardanaCharge",
DROP COLUMN "financialYear",
DROP COLUMN "loadingCharge",
DROP COLUMN "loanAmount",
DROP COLUMN "otherCharge",
DROP COLUMN "paidAmount",
DROP COLUMN "unloadingCharge",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'draft';

-- CreateTable
CREATE TABLE "BillItem" (
    "id" SERIAL NOT NULL,
    "csrNo" INTEGER NOT NULL,
    "lotCode" TEXT,
    "commodityName" TEXT,
    "varietyName" TEXT,
    "bags" DOUBLE PRECISION NOT NULL,
    "days" INTEGER NOT NULL,
    "storageRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "handlingOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storageCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "handlingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billId" INTEGER NOT NULL,

    CONSTRAINT "BillItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
