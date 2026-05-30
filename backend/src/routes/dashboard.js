// backend/src/routes/dashboard.js  — CREATE this new file

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

// ── GET /api/dashboard  — all dashboard stats in one call ─────
router.get("/", auth, async (req, res) => {
  try {
    const today = new Date();
    const month1 = new Date(today.getFullYear(), today.getMonth(), 1);

    // ── Key stats ────────────────────────────────────────────
    const [
      totalCustomers,
      activeStock,
      totalInward,
      totalOutward,
      monthInward,
      monthOutward,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.inwardEntry.count({ where: { status: "active" } }),
      prisma.inwardEntry.count(),
      prisma.outwardEntry.count(),
      prisma.inwardEntry.count({ where: { inwardDate: { gte: month1 } } }),
      prisma.outwardEntry.count({ where: { outwardDate: { gte: month1 } } }),
    ]);

    // ── Total bags in storage ─────────────────────────────────
    const activeEntries = await prisma.inwardEntry.findMany({
      where: { status: "active" },
      select: { totalWeight: true },
    });
    const totalBagsInStorage = activeEntries.reduce(
      (s, e) => s + (e.totalWeight || 0),
      0,
    );

    // ── Chamber utilization ───────────────────────────────────
    const chambers = await prisma.chamber.findMany({
      include: {
        lots: {
          include: {
            inwardEntries: {
              where: { status: "active" },
              select: { totalWeight: true },
            },
          },
        },
      },
    });

    const chamberStats = chambers.map((ch) => {
      const totalLots = ch.lots.length;
      const occupiedLots = ch.lots.filter(
        (l) => l.inwardEntries.length > 0,
      ).length;
      const totalBags = ch.lots.reduce(
        (s, l) =>
          s + l.inwardEntries.reduce((ss, e) => ss + (e.totalWeight || 0), 0),
        0,
      );
      return {
        chamberCode: ch.chamberCode,
        totalLots,
        occupiedLots,
        emptyLots: totalLots - occupiedLots,
        totalBags: Math.round(totalBags),
        occupancyPct: Math.round((occupiedLots / totalLots) * 100),
        filledInventory: occupiedLots,
        totalInventory: totalLots,
      };
    });

    // ── Stock by commodity ────────────────────────────────────
    const stockByCommodity = await prisma.inwardEntry.findMany({
      where: { status: "active" },
      include: {
        variety: { include: { commodity: { select: { name: true } } } },
      },
    });

    const commodityMap = {};
    stockByCommodity.forEach((e) => {
      const name = e.variety?.commodity?.name || "Unknown";
      if (!commodityMap[name]) commodityMap[name] = { name, bags: 0, lots: 0 };
      commodityMap[name].bags += e.totalWeight || 0;
      commodityMap[name].lots += 1;
    });
    const commodityStats = Object.values(commodityMap).sort(
      (a, b) => b.bags - a.bags,
    );

    // ── Recent activity (last 10 entries) ────────────────────
    const recentInward = await prisma.inwardEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        customer: { select: { name: true } },
        variety: { select: { name: true } },
        lot: { select: { lotCode: true } },
      },
    });

    const recentOutward = await prisma.outwardEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        customer: { select: { name: true } },
        inward: {
          include: {
            variety: { select: { name: true } },
            lot: { select: { lotCode: true } },
          },
        },
      },
    });

    // ── Monthly revenue (last 6 months) ──────────────────────
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dEnd = new Date(
        today.getFullYear(),
        today.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );
      const outs = await prisma.outwardEntry.findMany({
        where: { outwardDate: { gte: d, lte: dEnd } },
        select: { totalAmount: true },
      });
      const revenue = outs.reduce((s, e) => s + (e.totalAmount || 0), 0);
      monthlyRevenue.push({
        month: d.toLocaleString("en-IN", { month: "short" }),
        revenue: +revenue.toFixed(2),
        entries: outs.length,
      });
    }

    // ── Ageing analysis ───────────────────────────────────────
    const ageing = { under30: 0, d30to60: 0, d60to90: 0, over90: 0 };
    activeEntries.forEach((_, i) => {
      const entry = stockByCommodity[i];
      if (!entry) return;
      const days = Math.ceil((today - new Date(entry.inwardDate)) / 86400000);
      if (days <= 30) ageing.under30++;
      else if (days <= 60) ageing.d30to60++;
      else if (days <= 90) ageing.d60to90++;
      else ageing.over90++;
    });

    res.json({
      stats: {
        totalCustomers,
        activeStock,
        totalBagsInStorage: Math.round(totalBagsInStorage),
        totalInward,
        totalOutward,
        monthInward,
        monthOutward,
        lotsFilled: chamberStats.reduce((s, c) => s + c.occupiedLots, 0),
        lotsTotal: chamberStats.reduce((s, c) => s + c.totalLots, 0),
      },
      chamberStats,
      commodityStats,
      monthlyRevenue,
      ageing,
      recentInward: recentInward.map((e) => ({
        id: e.id,
        csrNo: e.csrNo,
        customerName: e.customer?.name,
        varietyName: e.variety?.name,
        lotCode: e.lot?.lotCode,
        totalWeight: e.totalWeight,
        date: e.inwardDate,
        status: e.status,
      })),
      recentOutward: recentOutward.map((e) => ({
        id: e.id,
        outwardNo: e.outwardNo,
        customerName: e.customer?.name,
        varietyName: e.inward?.variety?.name,
        lotCode: e.inward?.lot?.lotCode,
        bagsOut: e.bagsOut,
        totalAmount: e.totalAmount,
        date: e.outwardDate,
      })),
    });
  } catch (e) {
    console.error("Dashboard error:", e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
