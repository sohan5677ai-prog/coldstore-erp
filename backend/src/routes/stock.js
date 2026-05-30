const express2 = require("express");
const { PrismaClient: PC2 } = require("@prisma/client");
const auth2 = require("../middleware/auth");
const routerStock = express2.Router();
const prisma2 = new PC2();

// GET /api/stock  — current stock summary
routerStock.get("/", auth2, async (req, res) => {
  try {
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const where = { status: "active" };
    if (finYear) where.financialYear = finYear;

    // All active inward entries with lot info
    const active = await prisma2.inwardEntry.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, partyCode: true } },
        variety: { include: { commodity: { select: { name: true } } } },
        lot: { include: { chamber: { select: { chamberCode: true } } } },
      },
      orderBy: { inwardDate: "asc" },
    });

    // Enrich with days stored
    const today = new Date();
    const enriched = active.map((e) => {
      const days = Math.ceil((today - new Date(e.inwardDate)) / 86400000);
      return { ...e, daysStored: days };
    });

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/stock/chambers — chamber-wise occupancy
routerStock.get("/chambers", auth2, async (req, res) => {
  try {
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const chambers = await prisma2.chamber.findMany({
      include: {
        lots: {
          include: {
            inwardEntries: {
              where: { status: "active", financialYear: finYear },
              select: { id: true, totalWeight: true },
            },
          },
        },
      },
    });

    const summary = chambers.map((ch) => {
      const totalLots = ch.lots.length;
      const occupiedLots = ch.lots.filter(
        (l) => l.inwardEntries.length > 0,
      ).length;
      const totalBags = ch.lots.reduce(
        (sum, l) =>
          sum + l.inwardEntries.reduce((s, e) => s + (e.totalWeight || 0), 0),
        0,
      );
      return {
        chamberCode: ch.chamberCode,
        totalLots,
        occupiedLots,
        emptyLots: totalLots - occupiedLots,
        totalBags: Math.round(totalBags),
        occupancyPct: Math.round((occupiedLots / totalLots) * 100),
      };
    });

    res.json(summary);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/stock/lots?chamber=A — lots for one chamber
routerStock.get("/lots", auth2, async (req, res) => {
  try {
    const { chamber } = req.query;
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const where = chamber
      ? { chamber: { chamberCode: chamber.toUpperCase() } }
      : {};

    const lots = await prisma2.lot.findMany({
      where,
      orderBy: { lotNumber: "asc" },
      include: {
        chamber: { select: { chamberCode: true } },
        inwardEntries: {
          where: { status: "active", financialYear: finYear },
          include: {
            customer: { select: { name: true } },
            variety: { select: { name: true } },
          },
          take: 1,
        },
      },
    });
    res.json(lots);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/stock/party/:customerId
routerStock.get("/party/:customerId", auth2, async (req, res) => {
  try {
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const entries = await prisma2.inwardEntry.findMany({
      where: { customerId: parseInt(req.params.customerId), status: "active", financialYear: finYear },
      include: {
        variety: { include: { commodity: true } },
        lot: { include: { chamber: true } },
      },
    });
    res.json(entries);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = routerStock;
