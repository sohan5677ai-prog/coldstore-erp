// backend/src/routes/customers.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

// GET all customers
router.get("/", auth, async (req, res) => {
  try {
    const list = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        partyCode: true,
        name: true,
        customerType: true,
        city: true,
        district: true,
        state: true,
        mobileNumber: true,
        gstin: true,
        subGroup: true,
        isBlacklisted: true,
        createdAt: true,
      },
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET search  ?q=raju
router.get("/search", auth, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);
    const list = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { partyCode: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { mobileNumber: { contains: q } },
        ],
      },
      orderBy: { name: "asc" },
      take: 20,
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST create
router.post("/", auth, async (req, res) => {
  try {
    const count = await prisma.customer.count();
    const partyCode = `CUST-${String(count + 1).padStart(4, "0")}`;

    const customer = await prisma.customer.create({
      data: {
        customerType: req.body.customerType || "Kishan",
        name: req.body.name,
        partyCode: req.body.partyCode || partyCode,
        address: req.body.address || null,
        city: req.body.city || null,
        district: req.body.district || null,
        state: req.body.state || null,
        pinCode: req.body.pinCode || null,
        // 🛡️ THE FIX: Safely trims mobile and passes null if blank
        mobileNumber: req.body.mobileNumber?.trim() || null,
        phoneNumber: req.body.phoneNumber || null,
        email: req.body.email || null,
        gstin: req.body.gstin || null,
        subGroup: req.body.subGroup || "FARMER",
        guarantor: req.body.guarantor || null,
        openingBalance: req.body.openingBalance
          ? parseFloat(req.body.openingBalance)
          : 0,
        obDate: req.body.obDate ? new Date(req.body.obDate) : null,
        aadhaarNo: req.body.aadhaarNo || null,
        panNo: req.body.panNo || null,
        paymentMode: req.body.paymentMode || "CASH",
        isBlacklisted: req.body.isBlacklisted || false,
        gstStatus: req.body.gstStatus || false,
        palletDetails: req.body.palletDetails || null,
      },
    });
    res.json({ success: true, customer });
  } catch (e) {
    console.error("Customer create error:", e.message);
    // 🛡️ THE FIX: Better error handling for Prisma Unique Constraints
    if (e.code === "P2002") {
      const field = e.meta?.target?.[0] || "field";
      if (field === "mobileNumber") {
        return res.status(400).json({
          message:
            "A customer with this mobile number already exists. Leave mobile blank if unknown.",
        });
      }
      return res
        .status(400)
        .json({ message: `Duplicate value for ${field} - it already exists.` });
    }
    res.status(500).json({ message: e.message });
  }
});

// PUT update existing customer
router.put("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const payload = { ...req.body };

    // Safely set date to null if blank
    if (!payload.obDate || payload.obDate === "") {
      payload.obDate = null;
    } else {
      payload.obDate = new Date(payload.obDate);
    }

    // Ensure opening balance is safely converted
    if (payload.openingBalance) {
      payload.openingBalance = parseFloat(payload.openingBalance);
    } else {
      payload.openingBalance = 0;
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        customerType: payload.customerType || "Kishan",
        name: payload.name,
        partyCode: payload.partyCode,
        address: payload.address || null,
        city: payload.city || null,
        district: payload.district || null,
        state: payload.state || null,
        pinCode: payload.pinCode || null,
        // 🛡️ THE FIX: Safely trims mobile and passes null if blank
        mobileNumber: payload.mobileNumber?.trim() || null,
        phoneNumber: payload.phoneNumber || null,
        email: payload.email || null,
        gstin: payload.gstin || null,
        subGroup: payload.subGroup || "FARMER",
        guarantor: payload.guarantor || null,
        openingBalance: payload.openingBalance,
        obDate: payload.obDate,
        aadhaarNo: payload.aadhaarNo || null,
        panNo: payload.panNo || null,
        paymentMode: payload.paymentMode || "CASH",
        isBlacklisted: payload.isBlacklisted || false,
        gstStatus: payload.gstStatus || false,
        palletDetails: payload.palletDetails || null,
      },
    });
    res.json({ success: true, customer });
  } catch (e) {
    console.error("Customer update error:", e.message);
    // 🛡️ THE FIX: Better error handling for Prisma Unique Constraints
    if (e.code === "P2002") {
      const field = e.meta?.target?.[0] || "field";
      if (field === "mobileNumber") {
        return res.status(400).json({
          message:
            "A customer with this mobile number already exists. Leave mobile blank if unknown.",
        });
      }
      return res
        .status(400)
        .json({ message: `Duplicate value for ${field} - it already exists.` });
    }
    res.status(500).json({ message: e.message });
  }
});

// GET single customer
router.get("/:id", auth, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE customer
router.delete("/:id", auth, async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "P2003")
      return res
        .status(400)
        .json({ message: "Cannot delete — customer has existing entries." });
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
