// backend/src/routes/inward.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

// ── Rent calculation helper ───────────────────────────────────
function calcPacketRent(packetEntry, packetConfig) {
  if (!packetConfig) return 0;
  const rate = packetConfig.rentRateFirstPeriod || 0;
  const qty = packetEntry.quantity || 0;
  const totalWeight = packetEntry.totalWeight || 0;

  let rent = 0;
  switch (packetConfig.rentType) {
    case "KG":
      rent = totalWeight * rate;
      break;
    case "Packet":
      rent = qty * rate;
      break;
    case "Quintal":
      rent = (totalWeight / 100) * rate;
      break;
    case "Ton":
      rent = (totalWeight / 1000) * rate;
      break;
    default:
      rent = totalWeight * rate;
  }

  if (packetConfig.isZeroRent) return 0;
  if (packetConfig.isHalfRent) return rent / 2;
  return rent;
}

// ── GET /api/inward/next-csr ──────────────────────────────────
// Optional query param: ?seqStart=2346 — when provided, if the
// last CSR is below seqStart the response returns seqStart directly,
// effectively letting the user set a custom starting number.
router.get("/next-csr", auth, async (req, res) => {
  try {
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const last = await prisma.inwardEntry.findFirst({
      where: { financialYear: finYear },
      orderBy: { csrNo: "desc" },
      select: { csrNo: true },
    });
    const seqStart = req.query.seqStart
      ? parseInt(req.query.seqStart, 10)
      : null;
    const lastCsr = last?.csrNo ?? 0;
    let next = lastCsr + 1;
    // If a custom sequence start is requested and we haven't reached it yet, jump to it
    if (seqStart && !isNaN(seqStart) && lastCsr < seqStart) {
      next = seqStart;
    }
    res.json({ csrNo: next });
  } catch (e) {
    console.error("Error fetching next CSR:", e);
    res.status(500).json({ message: e.message });
  }
});

// ── GET /api/inward/register ──────────────────────────────────
router.get("/register", auth, async (req, res) => {
  try {
    const {
      from,
      to,
      partyId,
      commodity,
      variety,
      csrFrom,
      csrTo,
      vehicle,
      lotCode,
      receivedFrom,
    } = req.query;

    const finYear = req.headers["x-fin-year"] || "2026-27";
    const where = {};
    if (finYear) where.financialYear = finYear;

    // ── Default date range: start of financial year → end of financial year ──
    const parts = finYear.split("-");
    const startYear = parseInt(parts[0], 10);
    const endYear = startYear + 1;
    const defaultFrom = new Date(`${startYear}-04-01T00:00:00.000Z`);
    const defaultTo = new Date(`${endYear}-03-31T23:59:59.999Z`);

    where.inwardDate = {
      gte: from ? new Date(from) : defaultFrom,
      lte: to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : defaultTo,
    };

    if (partyId) where.customerId = parseInt(partyId);
    if (csrFrom || csrTo) {
      where.csrNo = {};
      if (csrFrom) where.csrNo.gte = parseInt(csrFrom);
      if (csrTo) where.csrNo.lte = parseInt(csrTo);
    }
    if (vehicle) where.vehicleNo = { contains: vehicle, mode: "insensitive" };
    if (receivedFrom)
      where.receivedFrom = { contains: receivedFrom, mode: "insensitive" };
    if (lotCode)
      where.lot = { lotCode: { contains: lotCode, mode: "insensitive" } };
    if (commodity || variety) {
      where.variety = {};
      if (variety)
        where.variety.name = { contains: variety, mode: "insensitive" };
      if (commodity)
        where.variety.commodity = {
          name: { contains: commodity, mode: "insensitive" },
        };
    }

    const entries = await prisma.inwardEntry.findMany({
      where,
      orderBy: { inwardDate: "desc" },
      take: 1000,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            partyCode: true,
            city: true,
            district: true,
            state: true,
            address: true,
            mobileNumber: true,
            aadhaarNo: true,
          },
        },
        variety: { include: { commodity: { select: { name: true } } } },
        lot: { include: { chamber: { select: { chamberCode: true } } } },
        packetEntries: true,
      },
    });

    const rows = [];
    for (const entry of entries) {
      const base = {
        id: entry.id,
        csrNo: entry.csrNo,
        inwardDate: entry.inwardDate,
        marka: entry.marka || null,
        rentType: entry.rentType || null,
        billingMode: entry.billingMode || "Seasonal",
        vehicleNo: entry.vehicleNo || null,
        receivedFrom: entry.receivedFrom || null,
        status: entry.status,
        lotCode: entry.lot?.lotCode || null,
        chamberCode: entry.lot?.chamber?.chamberCode || null,
        customerId: entry.customer?.id,
        customerName: entry.customer?.name || null,
        customerCity: entry.customer?.city || null,
        customerMobile: entry.customer?.mobileNumber || null,
        customerPartyCode: entry.customer?.partyCode || null,
        customerAddress:
          entry.customer?.address || entry.customer?.city || null,
        commodityName: entry.variety?.commodity?.name || null,
        varietyName: entry.variety?.name || null,
      };

      // ── Expand one row per packet entry that has qty OR weight ──
      // Check both quantity and totalWeight so old entries (saved before
      // schema was settled) still appear even if quantity=0
      const filled = (entry.packetEntries || []).filter(
        (p) => (p.quantity || 0) > 0 || (p.totalWeight || 0) > 0,
      );

      if (filled.length > 0) {
        for (const pkt of filled) {
          rows.push({
            ...base,
            pktName: pkt.packetName || null,
            pktMarka: pkt.packetName || null,
            quantity: pkt.quantity || 0,
            weight: pkt.totalWeight || 0,
            avgWeight: pkt.avgWeight || 0,
          });
        }
      } else {
        // No packet entries at all — show one row using the inward totals
        rows.push({
          ...base,
          pktName: null,
          pktMarka: null,
          quantity: 0,
          weight: entry.totalWeight || 0,
          avgWeight: 0,
        });
      }
    }

    res.json(rows);
  } catch (e) {
    console.error("Register error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── GET /api/inward — active entries ─────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const where = { status: "active" };
    if (finYear) where.financialYear = finYear;
    if (partyId) where.customerId = parseInt(partyId);

    const entries = await prisma.inwardEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        customer: { select: { name: true, partyCode: true, city: true } },
        variety: { include: { commodity: { select: { name: true } } } },
        lot: { select: { lotCode: true } },
        packetEntries: true,
        outwardEntries: true, // 👈 Added to calculate remaining stock
      },
    });

    // 🛡️ THE SHIELD: Calculate exact remaining stock & filter out empty lots
    const activeWithStock = entries
      .map((entry) => {
        const totalIn = entry.packetEntries.reduce(
          (sum, p) => sum + (p.quantity || 0),
          0,
        );
        const totalOut = entry.outwardEntries.reduce(
          (sum, o) => sum + (o.bagsOut || 0),
          0,
        );
        const remaining = totalIn - totalOut;

        // Proportional remaining weight
        const totalInWt = entry.totalWeight || 0;
        const remainingWt = totalIn > 0 ? (remaining / totalIn) * totalInWt : 0;

        return {
          ...entry,
          remainingQty: remaining,
          remainingWt: remainingWt,
        };
      })
      .filter((e) => e.remainingQty > 0); // Only return inwards that actually have stock left

    res.json(activeWithStock);
  } catch (e) {
    console.error("Error fetching active inward entries:", e);
    res.status(500).json({ message: e.message });
  }
});

// ── POST /api/inward — create ─────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const {
      customerId,
      csrNo,
      inwardDate,
      receivedFrom,
      vehicleNo,
      driverNo,
      commodityId,
      varietyId,
      lotCode,
      rentType,
      billingMode,
      marka,
      totalWeight,
      bookingNo,
      packetEntries,
    } = req.body;

    // 🛡️ PERMANENT FIX: Strict Validation Shields
    if (!customerId)
      return res.status(400).json({ message: "Customer is required." });
    if (!inwardDate)
      return res.status(400).json({ message: "Inward date is required." });
    if (!commodityId)
      return res.status(400).json({ message: "Commodity is required." });
    if (!varietyId)
      return res.status(400).json({ message: "Variety is required." });
    if (!rentType)
      return res.status(400).json({ message: "Rent type is required." });

    // 🛡️ PERMANENT FIX: Protect against NaN crashing Prisma
    const parsedCsrNo = parseInt(csrNo, 10);
    if (isNaN(parsedCsrNo)) {
      return res
        .status(400)
        .json({ message: "A valid numerical CSR/Inward No. is required." });
    }

    const parsedCustomerId = parseInt(customerId, 10);
    if (isNaN(parsedCustomerId)) {
      return res.status(400).json({ message: "Invalid Customer selection." });
    }

    const filled = (packetEntries || []).filter(
      (p) => parseFloat(p.quantity) > 0,
    );
    if (filled.length === 0) {
      return res
        .status(400)
        .json({ message: "Enter quantity in at least one packet row." });
    }

    let lotId = null;
    if (lotCode) {
      const lot = await prisma.lot.findUnique({ where: { lotCode } });
      if (!lot)
        return res.status(400).json({ message: `Lot ${lotCode} not found.` });
      if (lot.status === "filled")
        return res.status(400).json({ message: `Lot ${lotCode} is occupied.` });
      lotId = lot.id;
    }

    const financialYear =
      req.headers["x-fin-year"] ||
      (() => {
        const now = new Date();
        const yr =
          now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        return `${yr}-${String(yr + 1).slice(-2)}`;
      })();

    const calcTotal = filled.reduce(
      (s, p) => s + (parseFloat(p.totalWeight) || 0),
      0,
    );
    const finalWeight = parseFloat(
      (calcTotal > 0 ? calcTotal : parseFloat(totalWeight) || 0).toFixed(3),
    );

    const entry = await prisma.inwardEntry.create({
      data: {
        csrNo: parsedCsrNo, // 👈 Shield applied
        customerId: parsedCustomerId, // 👈 Shield applied
        inwardDate: new Date(inwardDate),
        receivedFrom: receivedFrom || null,
        vehicleNo: vehicleNo || null,
        driverNo: driverNo || null,
        marka: marka || null,
        rentType,
        billingMode: billingMode || "Seasonal",
        totalWeight: finalWeight,
        bookingNo: bookingNo || null,
        financialYear: financialYear,
        status: "active",
        varietyId: varietyId ? parseInt(varietyId, 10) : null,
        lotId,
        createdById: req.user.id,
        packetEntries: {
          create: filled.map((p) => ({
            packetId: p.packetId ? parseInt(p.packetId, 10) : null,
            packetName: String(p.packetName || ""),
            avgWeight: parseFloat(p.avgWeight) || 0,
            quantity: parseFloat(p.quantity) || 0,
            totalWeight: parseFloat(p.totalWeight) || 0,
          })),
        },
      },
      include: {
        customer: { select: { name: true, partyCode: true } },
        variety: { select: { name: true } },
        lot: { select: { lotCode: true } },
        packetEntries: true,
      },
    });

    if (lotId) {
      await prisma.lot.update({
        where: { id: lotId },
        data: { status: "filled" },
      });
    }

    res.json({ success: true, entry });
  } catch (e) {
    console.error("Inward create error:", e.message);
    if (e.code === "P2002")
      return res.status(400).json({ message: "CSR number already exists." });
    res.status(500).json({ message: e.message });
  }
});

// ── DELETE /api/inward/:id ────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const outCount = await prisma.outwardEntry.count({
      where: { inwardId: id },
    });
    if (outCount > 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete — outward entries exist" });
    }
    await prisma.inwardPacketEntry.deleteMany({ where: { inwardId: id } });
    const entry = await prisma.inwardEntry.findUnique({
      where: { id },
      select: { lotId: true },
    });
    await prisma.inwardEntry.delete({ where: { id } });
    if (entry?.lotId) {
      await prisma.lot.update({
        where: { id: entry.lotId },
        data: { status: "empty" },
      });
    }
    res.json({ success: true });
  } catch (e) {
    console.error("Error deleting inward entry:", e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
module.exports.calcPacketRent = calcPacketRent;
