// backend/src/routes/vouchers.js

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

// ── GET next voucher number ───────────────────────────────────
router.get("/next-no", auth, async (req, res) => {
  try {
    const last = await prisma.voucher.findFirst({
      orderBy: { id: "desc" },
      select: { voucherNo: true },
    });
    let next = 15001;
    if (last?.voucherNo) {
      const parts = last.voucherNo.split("-");
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n)) next = n + 1;
    }
    res.json({ voucherNo: String(next) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── GET all vouchers ──────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const finYear = req.headers["x-fin-year"] || "2026-27";
    const where = {};
    if (finYear) {
      const { startDate, endDate } = getFinYearDates(finYear);
      where.voucherDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, partyCode: true } },
      },
    });

    // Map the database format to match what EditVoucher.jsx expects
    const formattedVouchers = vouchers.map((v) => ({
      ...v,
      totalAmount: v.amount,
      accountName: v.customer ? v.customer.name : "Multiple/Split",
    }));

    res.json(formattedVouchers);
  } catch (e) {
    console.error("Error fetching vouchers:", e);
    res.status(500).json({ message: e.message });
  }
});

// ── POST create voucher ───────────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const {
      voucherNo,
      voucherDate,
      voucherType,
      paymentMode,
      referenceNo,
      narration,
      totalAmount,
      lines,
    } = req.body;

    // 1. Extract Customer ID from the DR/CR lines
    // Customers are the options with numeric IDs. Cash/Bank have text IDs (e.g., 'cash')
    const customerLine = (lines || []).find(
      (l) => !isNaN(parseInt(l.accountId)),
    );
    const customerId = customerLine ? parseInt(customerLine.accountId) : null;

    if (!customerId) {
      return res.status(400).json({
        message: "A valid Customer must be selected in the DR/CR lines.",
      });
    }

    // 2. Extract Bank/Cash type from the other line
    const cashLine = (lines || []).find((l) => isNaN(parseInt(l.accountId)));
    const finalPaymentMode = cashLine
      ? cashLine.accountName
      : paymentMode || "CASH";

    // 3. Generate/Verify Voucher Number
    let finalVoucherNo = voucherNo;
    if (!finalVoucherNo || String(finalVoucherNo).trim() === "") {
      const last = await prisma.voucher.findFirst({
        orderBy: { id: "desc" },
        select: { voucherNo: true },
      });
      let next = 15001;
      if (last?.voucherNo) {
        const parts = last.voucherNo.split("-");
        const n = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(n)) next = n + 1;
      }
      finalVoucherNo = String(next);
    }

    // 4. Save to database
    const v = await prisma.voucher.create({
      data: {
        voucherNo: finalVoucherNo,
        voucherDate: new Date(voucherDate),
        voucherType: voucherType || "receipt",
        amount: parseFloat(totalAmount) || 0,
        paymentMode: finalPaymentMode,
        referenceNo: referenceNo || null,
        narration: narration || null,
        customerId: customerId,
        createdById: req.user.id,
      },
    });

    res.json({ success: true, voucher: v });
  } catch (e) {
    console.error("Voucher Create Error:", e);
    res.status(500).json({ message: e.message });
  }
});

// ── DELETE voucher ────────────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.voucher.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error("Voucher Delete Error:", e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
