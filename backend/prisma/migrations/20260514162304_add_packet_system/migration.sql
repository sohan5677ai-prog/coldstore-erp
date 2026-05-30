-- CreateTable
CREATE TABLE "Packet" (
    "id" SERIAL NOT NULL,
    "packetName" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentType" TEXT NOT NULL DEFAULT 'KG',
    "billingType" TEXT NOT NULL DEFAULT 'Seasonally',
    "rentRateFirstPeriod" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentRateOtherPeriod" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isZeroRent" BOOLEAN NOT NULL DEFAULT false,
    "isHalfRent" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commodityId" INTEGER NOT NULL,

    CONSTRAINT "Packet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InwardPacketEntry" (
    "id" SERIAL NOT NULL,
    "packetId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "inwardId" INTEGER NOT NULL,

    CONSTRAINT "InwardPacketEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Packet" ADD CONSTRAINT "Packet_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InwardPacketEntry" ADD CONSTRAINT "InwardPacketEntry_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "Packet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InwardPacketEntry" ADD CONSTRAINT "InwardPacketEntry_inwardId_fkey" FOREIGN KEY ("inwardId") REFERENCES "InwardEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
