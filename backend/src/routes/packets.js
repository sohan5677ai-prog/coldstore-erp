// backend/src/routes/packets.js  — CREATE this new file

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

// GET all packets — optionally filter by commodityId
router.get("/", auth, async (req, res) => {
  try {
    const { commodityId } = req.query;
    const where = { isActive: true };
    if (commodityId) where.commodityId = parseInt(commodityId);

    const list = await prisma.packet.findMany({
      where,
      orderBy: { packetName: "asc" },
      include: { commodity: { select: { id: true, name: true, type: true } } },
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST create packet
router.post("/", auth, async (req, res) => {
  try {
    const {
      commodityId,
      packetName,
      weight,
      rentType,
      billingType,
      rentRateFirstPeriod,
      rentRateOtherPeriod,
      isZeroRent,
      isHalfRent,
    } = req.body;

    if (!commodityId)
      return res.status(400).json({ message: "Commodity required" });
    if (!packetName)
      return res.status(400).json({ message: "Packet name required" });

    const p = await prisma.packet.create({
      data: {
        commodityId: parseInt(commodityId),
        packetName: packetName.trim(),
        weight: weight ? parseFloat(weight) : 0,
        rentType: rentType || "KG",
        billingType: billingType || "Seasonally",
        rentRateFirstPeriod: rentRateFirstPeriod
          ? parseFloat(rentRateFirstPeriod)
          : 0,
        rentRateOtherPeriod: rentRateOtherPeriod
          ? parseFloat(rentRateOtherPeriod)
          : 0,
        isZeroRent: isZeroRent || false,
        isHalfRent: isHalfRent || false,
      },
      include: { commodity: { select: { name: true } } },
    });
    res.json({ success: true, packet: p });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT update packet
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      packetName,
      weight,
      rentType,
      billingType,
      rentRateFirstPeriod,
      rentRateOtherPeriod,
      isZeroRent,
      isHalfRent,
    } = req.body;

    const p = await prisma.packet.update({
      where: { id: parseInt(req.params.id) },
      data: {
        packetName: packetName.trim(),
        weight: weight ? parseFloat(weight) : 0,
        rentType: rentType || "KG",
        billingType: billingType || "Seasonally",
        rentRateFirstPeriod: rentRateFirstPeriod
          ? parseFloat(rentRateFirstPeriod)
          : 0,
        rentRateOtherPeriod: rentRateOtherPeriod
          ? parseFloat(rentRateOtherPeriod)
          : 0,
        isZeroRent: isZeroRent || false,
        isHalfRent: isHalfRent || false,
      },
      include: { commodity: { select: { name: true } } },
    });
    res.json({ success: true, packet: p });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE (soft)
router.delete("/:id", auth, async (req, res) => {
  try {
    await prisma.packet.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
