// backend/src/routes/inwardBulk.js  — CREATE this new file
// POST /api/inward/bulk  — accepts one row from Excel upload
// Resolves party/commodity/variety by NAME (not by ID)
// so the Excel file doesn't need database IDs

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

// Fuzzy match helper
function fuzzyFind(list, query, key = "name") {
  if (!query) return null;
  const q = String(query).toLowerCase().trim();
  return (
    list.find((r) => r[key].toLowerCase() === q) ||
    list.find((r) => r[key].toLowerCase().includes(q)) ||
    list.find((r) => q.includes(r[key].toLowerCase())) ||
    null
  );
}

// POST /api/inward/bulk — one row at a time from Excel
router.post("/", auth, async (req, res) => {
  try {
    const {
      partyName,
      commodityName,
      varietyName,
      csrNo,
      inwardDate,
      vehicleNo,
      marka,
      chamberNumbers,
      rentType,
      billingMode,
      totalWeight,
      packetEntries,
    } = req.body;

    // ── Resolve party by name ─────────────────────────────────
    const customers = await prisma.customer.findMany({
      select: { id: true, name: true },
    });
    const customer = fuzzyFind(customers, partyName);
    if (!customer) {
      return res.status(400).json({
        message: `Party "${partyName}" not found. Add them in ERP Master → Customers first.`,
      });
    }

    // ── Resolve commodity by name ─────────────────────────────
    const commodities = await prisma.commodity.findMany({
      select: { id: true, name: true },
    });
    const commodity = fuzzyFind(commodities, commodityName);
    if (!commodity) {
      return res.status(400).json({
        message: `Commodity "${commodityName}" not found. Add it in ERP Master → Commodity first.`,
      });
    }

    // ── Resolve variety by name under commodity ───────────────
    const varieties = await prisma.variety.findMany({
      where: { commodityId: commodity.id },
      select: { id: true, name: true },
    });
    const variety = fuzzyFind(varieties, varietyName);
    if (!variety) {
      return res.status(400).json({
        message: `Variety "${varietyName}" not found under ${commodity.name}. Add it in ERP Master → Variety first.`,
      });
    }

    // ── Validate and coerce CSR ───────────────────────────────
    const parsedCsr = parseInt(csrNo, 10);
    if (isNaN(parsedCsr)) {
      return res.status(400).json({ message: "Invalid Inward No." });
    }

    // Check uniqueness
    const existing = await prisma.inwardEntry.findFirst({
      where: { csrNo: parsedCsr },
    });
    if (existing) {
      return res.status(400).json({
        message: `Inward No. ${parsedCsr} already exists. Leave the column blank to auto-assign.`,
      });
    }

    // ── Find packet config for rent calculation ───────────────
    const finalRent = ["KG", "Packet", "Quintal", "Ton"].includes(rentType)
      ? rentType
      : "KG";

    const packetConfig =
      (await prisma.packet
        .findFirst({
          where: { commodityId: commodity.id, rentType: finalRent },
        })
        .catch(() => null)) ||
      (await prisma.packet
        .findFirst({
          where: { commodityId: commodity.id },
        })
        .catch(() => null));

    // ── Financial year ────────────────────────────────────────
    const d = new Date(inwardDate || new Date());
    const yr = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    const finY = `${yr}-${String(yr + 1).slice(-2)}`;

    // ── Create entry ──────────────────────────────────────────
    const filled = (packetEntries || []).filter(
      (p) => parseFloat(p.quantity) > 0,
    );

    if (filled.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid packet rows (quantity must be > 0)." });
    }

    const entry = await prisma.inwardEntry.create({
      data: {
        csrNo: parsedCsr,
        customerId: customer.id,
        inwardDate: d,
        vehicleNo: vehicleNo || null,
        marka: marka || null,
        chamberNumbers: chamberNumbers || null,
        rentType: finalRent,
        billingMode: billingMode || "Seasonal",
        totalWeight: parseFloat(totalWeight) || 0,
        financialYear: finY,
        status: "active",
        varietyId: variety.id,
        createdById: req.user.id,
        packetEntries: {
          create: filled.map((p) => ({
            packetId: packetConfig?.id || null,
            packetName: String(p.packetName || variety.name),
            avgWeight: parseFloat(p.avgWeight) || 0,
            quantity: parseFloat(p.quantity) || 0,
            totalWeight: parseFloat(p.totalWeight) || 0,
          })),
        },
      },
      include: {
        customer: { select: { name: true, partyCode: true } },
        variety: { select: { name: true } },
        packetEntries: true,
      },
    });

    res.json({ success: true, entry });
  } catch (e) {
    console.error("Bulk inward error:", e.message);
    if (e.code === "P2002") {
      return res.status(400).json({ message: "Inward No. already exists." });
    }
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
