// backend/src/routes/commodities.js  — REPLACE your existing commodities.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

// ── GET all commodities (with varieties) ──────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const list = await prisma.commodity.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        varieties: { where: { isActive: true }, orderBy: { name: "asc" } },
      },
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── GET single commodity ──────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  try {
    const c = await prisma.commodity.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { varieties: { where: { isActive: true } } },
    });
    if (!c) return res.status(404).json({ message: "Not found" });
    res.json(c);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── POST create commodity ─────────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const { name, type, hsnCode, stockValue, sku, articleCode } = req.body;
    if (!name)
      return res.status(400).json({ message: "Commodity name required" });
    if (!type || type === "Select")
      return res
        .status(400)
        .json({ message: "Type required (Seasonally/Monthly/Daily)" });

    const c = await prisma.commodity.create({
      data: {
        name: name.trim(),
        type: type,
        hsnCode: hsnCode || null,
        isActive: true,
      },
    });
    res.json({ success: true, commodity: c });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── PUT update commodity ──────────────────────────────────────
router.put("/:id", auth, async (req, res) => {
  try {
    const c = await prisma.commodity.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name: req.body.name,
        type: req.body.type,
        hsnCode: req.body.hsnCode || null,
      },
    });
    res.json({ success: true, commodity: c });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── DELETE (soft) ─────────────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    await prisma.commodity.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
