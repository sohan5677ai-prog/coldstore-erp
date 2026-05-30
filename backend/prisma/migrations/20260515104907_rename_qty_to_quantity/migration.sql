/*
  Warnings:

  - You are about to drop the column `qtyInPkts` on the `InwardPacketEntry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InwardPacketEntry" DROP COLUMN "qtyInPkts",
ADD COLUMN     "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "packetName" DROP DEFAULT;
