/*
  Warnings:

  - You are about to drop the column `phone` on the `Customer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[partyCode]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mobileNumber]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `commodityId` to the `Variety` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Customer_phone_key";

-- DropIndex
DROP INDEX "Variety_name_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "phone",
ADD COLUMN     "aadhaarNo" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "customerType" TEXT DEFAULT 'Kishan',
ADD COLUMN     "district" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "gstStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "guarantor" TEXT,
ADD COLUMN     "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loginId" TEXT,
ADD COLUMN     "mobileNumber" TEXT,
ADD COLUMN     "obDate" TIMESTAMP(3),
ADD COLUMN     "openingBalance" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "palletDetails" TEXT,
ADD COLUMN     "panNo" TEXT,
ADD COLUMN     "partyCode" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "paymentMode" TEXT DEFAULT 'CASH',
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "pinCode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "subGroup" TEXT DEFAULT 'FARMER';

-- AlterTable
ALTER TABLE "InwardEntry" ADD COLUMN     "lotId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Variety" ADD COLUMN     "commodityId" INTEGER NOT NULL,
ADD COLUMN     "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "handlingIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "handlingOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "palletLoad" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "storageRate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Commodity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Seasonal',
    "hsnCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commodity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_partyCode_key" ON "Customer"("partyCode");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_mobileNumber_key" ON "Customer"("mobileNumber");

-- AddForeignKey
ALTER TABLE "Variety" ADD CONSTRAINT "Variety_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InwardEntry" ADD CONSTRAINT "InwardEntry_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
