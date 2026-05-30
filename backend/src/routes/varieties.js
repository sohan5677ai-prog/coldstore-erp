// backend/src/routes/varieties.js — REPLACE your existing file
// Varieties are now SIMPLE — just a name under a commodity
// Rent is configured at the Packet level (Create Weight/Packet tab)

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

// GET varieties for a commodity  ?commodityId=1
router.get("/", auth, async (req, res) => {
  try {
    const { commodityId } = req.query;
    if (!commodityId)
      return res.status(400).json({ message: "commodityId required" });
    const list = await prisma.variety.findMany({
      where: { commodityId: parseInt(commodityId), isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, commodityId: true },
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST create variety — just name + commodityId
router.post("/", auth, async (req, res) => {
  try {
    const { commodityId, name } = req.body;
    if (!commodityId)
      return res.status(400).json({ message: "commodityId required" });
    if (!name)
      return res.status(400).json({ message: "Variety name required" });

    const v = await prisma.variety.create({
      data: {
        commodityId: parseInt(commodityId),
        name: name.trim(),
        // Keep default values for other fields so DB doesn't break
        storageRate: 0,
        handlingIn: 0,
        handlingOut: 0,
        gstPercent: 5,
        palletLoad: 0,
        stockValue: 0,
        isActive: true,
      },
    });
    res.json({
      success: true,
      variety: { id: v.id, name: v.name, commodityId: v.commodityId },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT update variety name
router.put("/:id", auth, async (req, res) => {
  try {
    const v = await prisma.variety.update({
      where: { id: parseInt(req.params.id) },
      data: { name: req.body.name },
    });
    res.json({ success: true, variety: { id: v.id, name: v.name } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE variety (soft)
router.delete("/:id", auth, async (req, res) => {
  try {
    await prisma.variety.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
