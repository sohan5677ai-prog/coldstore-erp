// backend/src/routes/ledger.js

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

// ═══════════════════════════════════════════════════════════
//  RENT CALCULATION ENGINE
//  Follows 3-step formula from spec:
//  Step A – Days/Months stored
//  Step B – Base rent by rentType (KG/Packet/Quintal/Ton)
//  Step C – Multiplier by billingMode (Seasonal=1, Monthly=months)
// ═══════════════════════════════════════════════════════════

function calcMonthsStored(inwardDate, asOfDate) {
  const ms = asOfDate - new Date(inwardDate);
  const days = ms / (1000 * 60 * 60 * 24);
  return Math.max(1, days / 30);
}

function calcBaseRent(rentType, outWeight, outQty, rate) {
  switch (rentType) {
    case "KG":
      return outWeight * rate;
    case "Packet":
      return outQty * rate;
    case "Quintal":
      return (outWeight / 100) * rate;
    case "Ton":
      return (outWeight / 1000) * rate;
    default:
      return outWeight * rate;
  }
}

// Full calc: base rent × billingMode multiplier, then zero/half overrides
function calcPacketRent(packetEntry, packetConfig, inwardDate, asOfDate) {
  if (!packetConfig) return 0;

  const rate = packetConfig.rentRateFirstPeriod || 0;
  const qty = packetEntry.quantity || 0; // DB field is `quantity`
  const weight = packetEntry.totalWeight || 0;
  const billingMode = packetConfig.billingType || "Seasonally"; // Seasonally | Monthly | Daily

  const base = calcBaseRent(packetConfig.rentType, weight, qty, rate);

  let multiplier = 1;
  if (billingMode === "Monthly" && inwardDate && asOfDate) {
    multiplier = calcMonthsStored(inwardDate, asOfDate);
  } else if (billingMode === "Daily" && inwardDate && asOfDate) {
    const ms = new Date(asOfDate) - new Date(inwardDate);
    multiplier = Math.max(1, ms / (1000 * 60 * 60 * 24));
  }

  let rent = base * multiplier;
  if (packetConfig.isZeroRent) return 0;
  if (packetConfig.isHalfRent) return rent / 2;
  return rent;
}

// ─── Load packet configs for a set of inward entries ───────
async function loadPacketConfigs(entries) {
  const ids = new Set();
  for (const e of entries) {
    for (const pe of e.packetEntries || []) {
      if (pe.packetId) ids.add(pe.packetId);
    }
  }
  if (ids.size === 0) return {};
  const configs = await prisma.packet.findMany({
    where: { id: { in: Array.from(ids) } },
  });
  const map = {};
  configs.forEach((c) => {
    map[c.id] = c;
  });
  return map;
}

// ─── Calculate UNREALISED rent (remaining active stock) ────
// Rent accruing on stock that is still in storage
async function calcUnrealisedRent(activeInwardEntries, asOfDate) {
  if (activeInwardEntries.length === 0) return 0;
  const packetMap = await loadPacketConfigs(activeInwardEntries);
  let total = 0;
  for (const entry of activeInwardEntries) {
    for (const pe of entry.packetEntries || []) {
      const cfg = pe.packetId ? packetMap[pe.packetId] : null;
      total += calcPacketRent(pe, cfg, entry.inwardDate, asOfDate);
    }
  }
  return total;
}

// ═══════════════════════════════════════════════════════════
//  GET /api/ledger/party/:id
//  Party Ledger Summary
// ═══════════════════════════════════════════════════════════
router.get("/party/:id", auth, async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const tillDate = req.query.date
      ? new Date(new Date(req.query.date).setHours(23, 59, 59, 999))
      : new Date();
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const { startDate, endDate } = getFinYearDates(finYear);

    // ── 1. Customer ──────────────────────────────────────────
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        partyCode: true,
        city: true,
        district: true,
        state: true,
        address: true,
        mobileNumber: true,
        phoneNumber: true,
        gstin: true,
        openingBalance: true,
      },
    });
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    // ── 2. All inward entries up to date ─────────────────────
    const allInward = await prisma.inwardEntry.findMany({
      where: {
        customerId,
        inwardDate: { lte: tillDate },
        financialYear: finYear,
      },
      orderBy: { inwardDate: "asc" },
      include: {
        variety: { include: { commodity: true } }, // 🛡️ Fetches ID and Name securely
        lot: { include: { chamber: { select: { chamberCode: true } } } },
        packetEntries: true,
        outwardEntries: {
          select: {
            bagsOut: true,
            totalAmount: true,
            outwardDate: true,
            totalWeight: true,
          }, // 🛡️ Added totalWeight
        },
      },
    });

    // ── 3. All outward entries up to date ────────────────────
    const allOutward = await prisma.outwardEntry.findMany({
      where: {
        customerId,
        outwardDate: { lte: tillDate },
        inward: { financialYear: finYear },
      },
      orderBy: { outwardDate: "asc" },
      include: {
        inward: {
          include: {
            variety: { include: { commodity: true } }, // 🛡️ Fixed: This previously omitted ID, causing mapping failures
            lot: { include: { chamber: { select: { chamberCode: true } } } },
            packetEntries: true,
          },
        },
      },
    });

    // ── 4. Vouchers (payments) ───────────────────────────────
    let vouchers = [];
    try {
      vouchers = await prisma.voucher.findMany({
        where: { customerId, voucherDate: { gte: startDate, lte: tillDate } },
        orderBy: { voucherDate: "asc" },
      });
    } catch (e) {
      console.error("Voucher fetch error:", e.message);
    }

    // ── 5. Qty/Weight summaries ──────────────────────────────
    const totalInwardQty = allInward.reduce((s, e) => {
      return (
        s + (e.packetEntries || []).reduce((ps, p) => ps + (p.quantity || 0), 0)
      );
    }, 0);

    const totalInwardWt = allInward.reduce(
      (s, e) => s + (e.totalWeight || 0),
      0,
    );

    const totalOutwardQty = allOutward.reduce(
      (s, e) => s + (e.bagsOut || 0),
      0,
    );
    const totalOutwardWt = allOutward.reduce(
      (s, e) => s + (e.totalWeight || 0),
      0,
    ); // 🛡️ Fixed: Uses totalWeight instead of bagsOut

    const balanceQty = totalInwardQty - totalOutwardQty;
    const balanceWt = parseFloat((totalInwardWt - totalOutwardWt).toFixed(3));

    // ── 6. Active (remaining) inward entries ─────────────────
    const activeInward = allInward.filter((e) => e.status === "active");

    // ── 7. Rent calculations ─────────────────────────────────
    const realisedRent = allOutward.reduce(
      (s, e) => s + (e.totalAmount || 0),
      0,
    );
    const unrealisedRent = await calcUnrealisedRent(activeInward, tillDate);

    // ── 8. Payments received ─────────────────────────────────
    const totalPaid = vouchers.reduce((s, v) => s + (v.amount || 0), 0);

    // ── 9. Opening balance ───────────────────────────────────
    const ob = customer.openingBalance || 0;
    const obDr = ob > 0 ? ob : 0;
    const obCr = ob < 0 ? Math.abs(ob) : 0;

    // ── 10. Dr/Cr totals ─────────────────────────────────────
    const totalDr = realisedRent + obDr; // rent billed + OB
    const totalCr = totalPaid + obCr;
    const balance = totalDr - totalCr;
    const avgRent = allInward.length > 0 ? realisedRent / allInward.length : 0;

    // ── 11. Commodity / Variety summary table ────────────────
    const commodityMap = {};

    for (const e of allInward) {
      const key = `${e.variety?.commodityId || e.variety?.commodity?.id || 0}__${e.varietyId || e.variety?.id || 0}`;
      const comName = e.variety?.commodity?.name || "Unknown";
      const varName = e.variety?.name || ".";
      const inQty = (e.packetEntries || []).reduce(
        (s, p) => s + (p.quantity || 0),
        0,
      );
      const inWt = e.totalWeight || 0;

      if (!commodityMap[key]) {
        commodityMap[key] = {
          commodity: comName,
          variety: varName,
          inwardQty: 0,
          inwardWt: 0,
          outwardQty: 0,
          outwardWt: 0,
        };
      }
      commodityMap[key].inwardQty += inQty;
      commodityMap[key].inwardWt += inWt;
    }

    for (const e of allOutward) {
      const inward = e.inward;
      const key = `${inward?.variety?.commodityId || inward?.variety?.commodity?.id || 0}__${inward?.varietyId || inward?.variety?.id || 0}`;

      if (commodityMap[key]) {
        commodityMap[key].outwardQty += e.bagsOut || 0;
        commodityMap[key].outwardWt += e.totalWeight || 0; // 🛡️ Fixed: correctly uses the database totalWeight now
      }
    }

    const commoditySummary = Object.values(commodityMap).map((c) => ({
      ...c,
      remainingQty: parseFloat((c.inwardQty - c.outwardQty).toFixed(3)),
      remainingWt: parseFloat((c.inwardWt - c.outwardWt).toFixed(3)),
      inwardWt: parseFloat(c.inwardWt.toFixed(3)),
      outwardWt: parseFloat(c.outwardWt.toFixed(3)),
    }));

    res.json({
      customer,
      summary: {
        totalInwardQty: Math.round(totalInwardQty),
        totalInwardWt: parseFloat(totalInwardWt.toFixed(3)),
        totalOutwardQty: Math.round(totalOutwardQty),
        totalOutwardWt: parseFloat(totalOutwardWt.toFixed(3)), // 🛡️ Properly displayed here
        balanceQty: Math.round(balanceQty),
        balanceWt: parseFloat(balanceWt.toFixed(3)),
        realisedRent: parseFloat(realisedRent.toFixed(2)),
        unrealisedRent: parseFloat(unrealisedRent.toFixed(2)),
        loan: 0,
        interest: 0,
        bardana: 0,
        other: 0,
        openingBalance: ob,
        totalDr: parseFloat(totalDr.toFixed(2)),
        totalCr: parseFloat(totalCr.toFixed(2)),
        balance: parseFloat(balance.toFixed(2)),
        avg: parseFloat(avgRent.toFixed(2)),
        unRent: activeInward.length,
        totalPaid: parseFloat(totalPaid.toFixed(2)),
      },
      // Right side table of ledger summary
      ledgerRight: [
        { label: "Rent", drAmt: parseFloat(realisedRent.toFixed(2)) },
        { label: "Bardana", drAmt: 0 },
        { label: "Loan", drAmt: 0 },
        { label: "Loading Charge", drAmt: 0 },
        { label: "Unloading Charge", drAmt: 0 },
      ],
      commoditySummary,
      tillDate: tillDate.toISOString(),
    });
  } catch (e) {
    console.error("Ledger party error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  GET /api/ledger/party/:id/detail
//  Full Detail Ledger with running balance
// ═══════════════════════════════════════════════════════════
router.get("/party/:id/detail", auth, async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const tillDate = req.query.date
      ? new Date(new Date(req.query.date).setHours(23, 59, 59, 999))
      : new Date();
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const { startDate, endDate } = getFinYearDates(finYear);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        partyCode: true,
        city: true,
        address: true,
        mobileNumber: true,
        openingBalance: true,
      },
    });
    if (!customer) return res.status(404).json({ message: "Not found" });

    const inwards = await prisma.inwardEntry.findMany({
      where: {
        customerId,
        inwardDate: { lte: tillDate },
        financialYear: finYear,
      },
      orderBy: { inwardDate: "asc" },
      include: {
        variety: { include: { commodity: true } },
        lot: { include: { chamber: true } },
        packetEntries: true,
      },
    });

    const outwards = await prisma.outwardEntry.findMany({
      where: {
        customerId,
        outwardDate: { lte: tillDate },
        inward: { financialYear: finYear },
      },
      orderBy: { outwardDate: "asc" },
      include: {
        inward: {
          include: {
            variety: { include: { commodity: true } },
            lot: { include: { chamber: true } },
            packetEntries: true,
          },
        },
      },
    });

    let vouchers = [];
    try {
      vouchers = await prisma.voucher.findMany({
        where: { customerId, voucherDate: { gte: startDate, lte: tillDate } },
        orderBy: { voucherDate: "asc" },
      });
    } catch (e) {
      console.error("Voucher detail error:", e.message);
    }

    // Build unified ledger lines
    const lines = [];

    // Opening balance
    if (customer.openingBalance && customer.openingBalance !== 0) {
      lines.push({
        date: null,
        type: "OB",
        particular: "Opening Balance",
        drAmt: customer.openingBalance > 0 ? customer.openingBalance : 0,
        crAmt:
          customer.openingBalance < 0 ? Math.abs(customer.openingBalance) : 0,
        sortKey: 0,
      });
    }

    // Inward entries
    for (const e of inwards) {
      const comName = e.variety?.commodity?.name || "CM";
      const lotCode = e.lot?.lotCode || "";
      const totalQty = (e.packetEntries || []).reduce(
        (s, p) => s + (p.quantity || 0),
        0,
      );

      lines.push({
        date: e.inwardDate,
        type: "Inward",
        particular: `${comName} Lot: ${lotCode} InwardNo: ${e.csrNo}`,
        drAmt: 0,
        crAmt: 0,
        bags: totalQty,
        weight: e.totalWeight || 0,
        rentCalc: 0, // shown as info only
        sortKey: new Date(e.inwardDate).getTime(),
      });
    }

    // Outward entries (rent billed)
    for (const e of outwards) {
      const comName = e.inward?.variety?.commodity?.name || "CM";
      const lotCode = e.inward?.lot?.lotCode || "";
      lines.push({
        date: e.outwardDate,
        type: "Bill",
        particular: `Rent A/C — ${comName} Lot:${lotCode} Bill:${e.outwardNo}`,
        drAmt: e.totalAmount || 0,
        crAmt: 0,
        bags: e.bagsOut || 0,
        weight: e.totalWeight || 0, // 🛡️ Fixed: Uses totalWeight instead of bagsOut
        sortKey: new Date(e.outwardDate).getTime() + 1,
      });
    }

    // Payment receipts
    for (const v of vouchers) {
      lines.push({
        date: v.voucherDate,
        type: "Receipt",
        particular: `Payment — ${v.paymentMode || "CASH"} ${v.referenceNo ? "· Ref:" + v.referenceNo : ""}`,
        drAmt: 0,
        crAmt: v.amount || 0,
        sortKey: new Date(v.voucherDate).getTime() + 2,
      });
    }

    lines.sort((a, b) => a.sortKey - b.sortKey);

    // Running balance
    let balance = 0;
    const ledger = lines.map((l) => {
      balance = balance + (l.drAmt || 0) - (l.crAmt || 0);
      return {
        ...l,
        balance: parseFloat(balance.toFixed(2)),
        dateStr: l.date ? new Date(l.date).toLocaleDateString("en-IN") : "—",
      };
    });

    const totalDr = lines.reduce((s, l) => s + (l.drAmt || 0), 0);
    const totalCr = lines.reduce((s, l) => s + (l.crAmt || 0), 0);

    res.json({
      customer,
      ledger,
      totalDr: parseFloat(totalDr.toFixed(2)),
      totalCr: parseFloat(totalCr.toFixed(2)),
      finalBal: parseFloat(balance.toFixed(2)),
      tillDate: tillDate.toLocaleDateString("en-IN"),
    });
  } catch (e) {
    console.error("Detail ledger error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  GET /api/ledger/party-balance
//  Big party balance table — all columns per spec
// ═══════════════════════════════════════════════════════════
router.get("/party-balance", auth, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        partyCode: true,
        city: true,
        mobileNumber: true,
        openingBalance: true,
      },
      orderBy: { name: "asc" },
    });

    const finYear = req.headers["x-fin-year"] || "2026-27";
    const { startDate, endDate } = getFinYearDates(finYear);

    const results = await Promise.all(
      customers.map(async (c) => {
        try {
          // Inward
          const inwards = await prisma.inwardEntry.findMany({
            where: { customerId: c.id, financialYear: finYear },
            include: { packetEntries: true },
          });
          // Outward
          const outwards = await prisma.outwardEntry.findMany({
            where: { customerId: c.id, inward: { financialYear: finYear } },
          });
          // Vouchers
          let vouchers = [];
          try {
            vouchers = await prisma.voucher.findMany({
              where: {
                customerId: c.id,
                voucherDate: { gte: startDate, lte: endDate },
              },
              select: { amount: true },
            });
          } catch (e) {
            console.error("Voucher balance error:", e.message);
          }

          // Qty / Wt
          const totalInQty = inwards.reduce(
            (s, e) =>
              s +
              (e.packetEntries || []).reduce(
                (ps, p) => ps + (p.quantity || 0),
                0,
              ),
            0,
          );
          const totalInWt = inwards.reduce(
            (s, e) => s + (e.totalWeight || 0),
            0,
          );
          const totalOutQty = outwards.reduce(
            (s, e) => s + (e.bagsOut || 0),
            0,
          );
          const totalOutWt = outwards.reduce(
            (s, e) => s + (e.totalWeight || 0),
            0,
          ); // 🛡️ Fixed here as well
          const remQty = totalInQty - totalOutQty;
          const remWt = totalInWt - totalOutWt;

          // Rent
          const realisedRent = outwards.reduce(
            (s, e) => s + (e.totalAmount || 0),
            0,
          );
          const activeInwards = inwards.filter((e) => e.status === "active");
          const unrealisedRent = await calcUnrealisedRent(activeInwards, asOf);

          // Payments
          const totalPaid = vouchers.reduce((s, v) => s + (v.amount || 0), 0);

          const ob = c.openingBalance || 0;
          const obDr = ob > 0 ? ob : 0;
          const obCr = ob < 0 ? Math.abs(ob) : 0;

          // Dr breakdown
          const drRent = realisedRent;
          const drLoad = 0;
          const drBardana = 0;
          const drLoan = 0;
          const drInterest = 0;
          const drOther = 0;
          const totalDr = drRent + obDr;

          // Cr breakdown
          const crRent = 0; // Submit Rent (from payment towards rent)
          const crLoad = 0;
          const crBardana = 0;
          const crLoan = 0;
          const crInterest = 0;
          const crOther = 0;
          const totalCr = totalPaid + obCr;

          // Remaining balances
          const remRent = realisedRent; // unpaid realised rent
          const totalBal = totalDr - totalCr;
          const avg = inwards.length > 0 ? realisedRent / inwards.length : 0;

          // Only include parties with any activity
          if (totalDr === 0 && totalCr === 0 && totalInQty === 0) return null;

          return {
            partyCode: c.partyCode || "—",
            partyName: c.name,
            city: c.city || "—",
            mobile: c.mobileNumber || "—",
            // Quantity metrics
            totalInQty: Math.round(totalInQty),
            totalInWt: parseFloat(totalInWt.toFixed(3)),
            totalOutQty: Math.round(totalOutQty),
            totalOutWt: parseFloat(totalOutWt.toFixed(3)),
            remQty: Math.round(remQty),
            remWt: parseFloat(remWt.toFixed(3)),
            // Dr breakdown
            unrealisedRent: parseFloat(unrealisedRent.toFixed(2)),
            openingBalance: ob,
            drRent: parseFloat(drRent.toFixed(2)),
            drLoad: 0,
            drBardana: 0,
            drLoan: 0,
            drInterest: 0,
            drOther: 0,
            totalDr: parseFloat(totalDr.toFixed(2)),
            // Cr breakdown
            crRent: 0,
            crLoad: 0,
            crBardana: 0,
            crLoan: 0,
            crInterest: 0,
            crOther: 0,
            totalCr: parseFloat(totalCr.toFixed(2)),
            // Remaining balances
            remRent: parseFloat(remRent.toFixed(2)),
            remLoad: 0,
            remBardana: 0,
            remLoan: 0,
            remInterest: 0,
            remOther: 0,
            totalBal: parseFloat(totalBal.toFixed(2)),
            avg: parseFloat(avg.toFixed(2)),
          };
        } catch (e) {
          console.error(`Party balance error for ${c.id}:`, e.message);
          return null;
        }
      }),
    );

    res.json(results.filter(Boolean));
  } catch (e) {
    console.error("Party balance error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
