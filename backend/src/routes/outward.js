// backend/src/routes/outward.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

// Helper to calc rent exactly per the new Seasonal/Monthly rules
async function calcOutwardRent(inwardId, outQty, outTotalWeight, outwardDate) {
  const inward = await prisma.inwardEntry.findUnique({
    where: { id: parseInt(inwardId) },
    include: { packetEntries: true },
  });

  if (!inward || !inward.packetEntries || inward.packetEntries.length === 0)
    return { rent: 0, daysStored: 0 };

  const packetEntry = inward.packetEntries[0];
  if (!packetEntry.packetId) return { rent: 0, daysStored: 0 };

  const packetConfig = await prisma.packet.findUnique({
    where: { id: parseInt(packetEntry.packetId) },
  });

  if (!packetConfig) return { rent: 0, daysStored: 0 };

  const rate = packetConfig.rentRateFirstPeriod || 0;

  // Step A: Calculate Time
  const inDate = new Date(inward.inwardDate);
  const outDate = new Date(outwardDate);
  const diffTime = outDate.getTime() - inDate.getTime();

  let daysStored = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (daysStored <= 0) daysStored = 1;
  const monthsStored = Math.max(1, Math.ceil(daysStored / 30));

  // Step B: Calculate Base Rent
  let baseRent = 0;
  switch (packetConfig.rentType) {
    case "KG":
      baseRent = outTotalWeight * rate;
      break;
    case "Packet":
      baseRent = outQty * rate;
      break;
    case "Quintal":
      baseRent = (outTotalWeight / 100) * rate;
      break;
    case "Ton":
      baseRent = (outTotalWeight / 1000) * rate;
      break;
    default:
      baseRent = outTotalWeight * rate;
  }

  if (packetConfig.isZeroRent) baseRent = 0;
  if (packetConfig.isHalfRent) baseRent = baseRent / 2;

  // Step C: Apply Billing Mode Multiplier
  let finalRent = baseRent;
  if (inward.billingMode === "Monthly") {
    finalRent = baseRent * monthsStored;
  }

  return { rent: finalRent, daysStored };
}

// ── GET Outward Register ──────────────────────────────────────
router.get("/register", auth, async (req, res) => {
  try {
    const { from, to, partyId } = req.query;
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const where = {};
    if (finYear) {
      where.inward = { financialYear: finYear };
    }

    // Default dates from financial year start/end
    const parts = finYear.split("-");
    const startYear = parseInt(parts[0], 10);
    const endYear = startYear + 1;
    const defaultFrom = new Date(`${startYear}-04-01T00:00:00.000Z`);
    const defaultTo = new Date(`${endYear}-03-31T23:59:59.999Z`);

    where.outwardDate = {
      gte: from ? new Date(from) : defaultFrom,
      lte: to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : defaultTo,
    };

    if (partyId) where.customerId = parseInt(partyId);

    const outwards = await prisma.outwardEntry.findMany({
      where,
      orderBy: { outwardDate: "desc" },
      include: {
        customer: true,
        inward: {
          include: {
            variety: { include: { commodity: true } },
            lot: { include: { chamber: true } },
            packetEntries: true,
          },
        },
      },
    });

    const results = outwards.map((o) => {
      const pkt = o.inward?.packetEntries?.[0] || {};
      return {
        id: o.id,
        paymentMode: "Credit",
        billNo: o.outwardNo,
        outNo: o.outwardNo,
        outwardDate: o.outwardDate,
        marka: o.inward?.marka || "",
        vehicle: o.vehicleNo || "",
        name: o.customer?.name || "",
        village: o.customer?.city || "",
        uniqueNo: o.customer?.partyCode || "",
        deliverTo: o.remarks || "",
        commodity: o.inward?.variety?.commodity?.name || "",
        pId: pkt.packetId || "",
        inwardNo: o.inward?.csrNo || "",
        inwDate: o.inward?.inwardDate || "",
        rent: o.totalAmount || 0,
        tRent: o.totalAmount || 0,
        avgWt: pkt.avgWeight || 0,
        type: o.inward?.rentType || "",
        location: o.inward?.lot?.lotCode || "",
        variety: o.inward?.variety?.name || "",
        quantity: o.bagsOut || 0,
        weight: o.totalWeight || 0,
      };
    });

    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

// ── POST Outward Entry ────────────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const { entries, customerId, outwardDate, vehicleNo, remarks } = req.body;

    // 🛡️ PRE-FLIGHT SHIELD: Verify stock limits before saving anything
    for (const e of entries) {
      const totalOutSoFar = await prisma.outwardEntry.aggregate({
        where: { inwardId: parseInt(e.inwardId) },
        _sum: { bagsOut: true },
      });
      const inw = await prisma.inwardPacketEntry.aggregate({
        where: { inwardId: parseInt(e.inwardId) },
        _sum: { quantity: true },
      });

      const allowed = inw._sum?.quantity || 0;
      const alreadyOut = totalOutSoFar._sum?.bagsOut || 0;
      const requestedOut = parseFloat(e.outQty) || 0;

      if (alreadyOut + requestedOut > allowed) {
        return res.status(400).json({
          message: `Cannot outward more than available stock! Inward CSR only has ${allowed - alreadyOut} bags left.`,
        });
      }
    }

    const lastOut = await prisma.outwardEntry.findFirst({
      orderBy: { id: "desc" },
      select: { outwardNo: true },
    });
    let nextOutNum = 1001;
    if (lastOut?.outwardNo) {
      const parts = lastOut.outwardNo.split("-");
      // outwardNo is saved as `${nextOutNo}-${e.inwardId}` e.g. "OUT-1001-5"
      // Split by '-' yields ["OUT", "1001", "5"]. parts[1] is the number.
      let numStr = parts[1];
      if (!numStr || isNaN(parseInt(numStr, 10))) {
        const found = parts.find((p) => !isNaN(parseInt(p, 10)));
        if (found) numStr = found;
      }
      const n = parseInt(numStr, 10);
      if (!isNaN(n)) nextOutNum = n + 1;
    }
    const nextOutNo = `OUT-${nextOutNum}`;

    const created = [];
    for (const e of entries) {
      const { rent, daysStored } = await calcOutwardRent(
        e.inwardId,
        e.outQty,
        e.totalWeight,
        outwardDate,
      );

      const out = await prisma.outwardEntry.create({
        data: {
          outwardNo: `${nextOutNo}-${e.inwardId}`,
          outwardDate: new Date(outwardDate),
          bagsOut: parseFloat(e.outQty) || 0,
          totalWeight: parseFloat(e.totalWeight) || 0,
          vehicleNo: vehicleNo || null,
          remarks: remarks || null,
          daysStored: daysStored,
          storageCharge: 0,
          handlingCharge: 0,
          gstAmount: 0,
          totalAmount: rent,
          inwardId: parseInt(e.inwardId),
          customerId: parseInt(customerId),
          createdById: req.user.id,
        },
      });
      created.push(out);

      const totalOut = await prisma.outwardEntry.aggregate({
        where: { inwardId: parseInt(e.inwardId) },
        _sum: { bagsOut: true },
      });
      const inw = await prisma.inwardPacketEntry.aggregate({
        where: { inwardId: parseInt(e.inwardId) },
        _sum: { quantity: true },
      });

      if ((totalOut._sum?.bagsOut || 0) >= (inw._sum?.quantity || 0)) {
        const iData = await prisma.inwardEntry.findUnique({
          where: { id: parseInt(e.inwardId) },
        });

        // 🛡️ Change status to completed so it disappears from the active list
        await prisma.inwardEntry.update({
          where: { id: parseInt(e.inwardId) },
          data: { status: "completed" },
        });

        if (iData && iData.lotId) {
          await prisma.lot.update({
            where: { id: iData.lotId },
            data: { status: "empty" },
          });
        }
      }
    }

    res.json({ success: true, created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
