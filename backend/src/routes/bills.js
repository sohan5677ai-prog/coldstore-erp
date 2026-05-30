// backend/src/routes/bills.js  — CREATE this new file

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

function getFinYearDates(finYear) {
  const parts = finYear.split("-");
  const startYear = parseInt(parts[0], 10);
  const endYear = startYear + 1;
  const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`);
  const endDate = new Date(`${endYear}-03-31T23:59:59.999Z`);
  return { startDate, endDate };
}

// ── GET next bill number ──────────────────────────────────────
router.get("/next-bill-no", auth, async (req, res) => {
  try {
    const last = await prisma.bill.findFirst({
      orderBy: { id: "desc" },
      select: { billNo: true },
    });
    let next = 1;
    if (last?.billNo) {
      const parts = last.billNo.split("-");
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n)) next = n + 1;
    }
    res.json({ billNo: `BILL-${next}` });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── GET /api/bills  — list all bills with filters ─────────────
router.get("/", auth, async (req, res) => {
  try {
    const { customerId, status, from, to } = req.query;
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const where = {};
    if (customerId) where.customerId = parseInt(customerId);
    if (status) where.status = status;
    if (finYear) {
      const { startDate, endDate } = getFinYearDates(finYear);
      where.billDate = {
        gte: startDate,
        lte: endDate,
      };
    }
    if (from || to) {
      where.billDate = {};
      if (from) where.billDate.gte = new Date(from);
      if (to)
        where.billDate.lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    const bills = await prisma.bill.findMany({
      where,
      orderBy: { billDate: "desc" },
      take: 200,
      include: {
        customer: { select: { name: true, partyCode: true, city: true } },
        items: true,
      },
    });
    res.json(bills);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── GET /api/bills/:id  — single bill ─────────────────────────
router.get("/:id", auth, async (req, res) => {
  try {
    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { username: true } },
      },
    });
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    res.json(bill);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── GET /api/bills/preview/:customerId  — preview bill before saving ─
router.get("/preview/:customerId", auth, async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const { startDate, endDate } = getFinYearDates(finYear);
    const today = new Date();
    const defaultTo = today < endDate ? today : endDate;
    const billTo = req.query.to ? new Date(req.query.to) : defaultTo;
    const billFrom = req.query.from
      ? new Date(req.query.from)
      : startDate;

    // Get all active inward entries for this customer
    const entries = await prisma.inwardEntry.findMany({
      where: { customerId, status: "active", inwardDate: { lte: billTo } },
      include: {
        variety: { include: { commodity: { select: { name: true } } } },
        lot: { include: { chamber: true } },
      },
      orderBy: { inwardDate: "asc" },
    });

    if (entries.length === 0)
      return res.json({
        items: [],
        totals: { storage: 0, handling: 0, cgst: 0, sgst: 0, total: 0 },
      });

    let totalStorage = 0,
      totalHandling = 0;

    const items = entries.map((e) => {
      const inDate = new Date(Math.max(new Date(e.inwardDate), billFrom));
      const days = Math.max(1, Math.ceil((billTo - inDate) / 86400000));
      const bags = e.totalWeight || 0;
      const rate = e.variety?.storageRate || 0;
      const hOut = e.variety?.handlingOut || 0;
      const storage = bags * rate * (days / 30);
      const handling = bags * hOut;
      totalStorage += storage;
      totalHandling += handling;
      return {
        csrNo: e.csrNo,
        lotCode: e.lot?.lotCode || "",
        commodityName: e.variety?.commodity?.name || "",
        varietyName: e.variety?.name || "",
        bags,
        days,
        storageRate: rate,
        handlingOut: hOut,
        storageCharge: +storage.toFixed(2),
        handlingCharge: +handling.toFixed(2),
        inwardDate: e.inwardDate,
      };
    });

    const subtotal = totalStorage + totalHandling;
    const gstRate = entries[0]?.variety?.gstPercent || 5;
    const cgst = subtotal * (gstRate / 2 / 100);
    const sgst = subtotal * (gstRate / 2 / 100);

    res.json({
      customer: await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          name: true,
          partyCode: true,
          city: true,
          gstin: true,
        },
      }),
      items,
      totals: {
        storage: +totalStorage.toFixed(2),
        handling: +totalHandling.toFixed(2),
        cgst: +cgst.toFixed(2),
        sgst: +sgst.toFixed(2),
        total: +(subtotal + cgst + sgst).toFixed(2),
      },
      billFrom: billFrom.toISOString().slice(0, 10),
      billTo: billTo.toISOString().slice(0, 10),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── POST /api/bills  — save generated bill ────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const { customerId, billFrom, billTo, items, totals, notes } = req.body;
    if (!customerId)
      return res.status(400).json({ message: "Customer required" });
    if (!items?.length)
      return res.status(400).json({ message: "No items to bill" });

    const last = await prisma.bill.findFirst({
      orderBy: { id: "desc" },
      select: { billNo: true },
    });
    let next = 1;
    if (last?.billNo) {
      const parts = last.billNo.split("-");
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n)) next = n + 1;
    }
    const billNo = `BILL-${next}`;

    const bill = await prisma.bill.create({
      data: {
        billNo,
        billDate: new Date(),
        billFrom: new Date(billFrom),
        billTo: new Date(billTo),
        storageCharge: totals.storage,
        handlingCharge: totals.handling,
        cgst: totals.cgst,
        sgst: totals.sgst,
        totalAmount: totals.total,
        status: "draft",
        notes: notes || null,
        customerId: parseInt(customerId),
        createdById: req.user.id,
        items: {
          create: items.map((i) => ({
            csrNo: i.csrNo,
            lotCode: i.lotCode || null,
            commodityName: i.commodityName || null,
            varietyName: i.varietyName || null,
            bags: i.bags,
            days: i.days,
            storageRate: i.storageRate,
            handlingOut: i.handlingOut,
            storageCharge: i.storageCharge,
            handlingCharge: i.handlingCharge,
          })),
        },
      },
      include: { customer: true, items: true },
    });
    res.json({ success: true, bill });
  } catch (e) {
    if (e.code === "P2002")
      return res.status(400).json({ message: "Bill number exists" });
    res.status(500).json({ message: e.message });
  }
});

// ── PATCH /api/bills/:id/status  — update bill status ─────────
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const bill = await prisma.bill.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status },
    });
    res.json({ success: true, bill });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
