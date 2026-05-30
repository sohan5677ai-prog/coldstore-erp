-- CreateTable
CREATE TABLE "OutwardEntry" (
    "id" SERIAL NOT NULL,
    "outwardNo" TEXT NOT NULL,
    "outwardDate" TIMESTAMP(3) NOT NULL,
    "bagsOut" DOUBLE PRECISION NOT NULL,
    "vehicleNo" TEXT,
    "remarks" TEXT,
    "daysStored" INTEGER NOT NULL,
    "storageCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "handlingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inwardId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "OutwardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutwardEntry_outwardNo_key" ON "OutwardEntry"("outwardNo");

-- AddForeignKey
ALTER TABLE "OutwardEntry" ADD CONSTRAINT "OutwardEntry_inwardId_fkey" FOREIGN KEY ("inwardId") REFERENCES "InwardEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutwardEntry" ADD CONSTRAINT "OutwardEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutwardEntry" ADD CONSTRAINT "OutwardEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
