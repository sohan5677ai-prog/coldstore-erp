// backend/src/routes/ocr.js  — REPLACE ENTIRELY

const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

// ── Gemini client (for existing gate pass OCR) ────────────────
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(
    process.env.AIzaSyBnk6JvZLNT6uWWHMyXJUP4fpT_HcIvxkA,
  );
}

// ═══════════════════════════════════════════════════════════
//  TELEGRAM SCAN ENDPOINTS
// ═══════════════════════════════════════════════════════════

// ── GET /api/ocr/pending  ─────────────────────────────────────
// Returns the oldest unprocessed Telegram scan (or null)
// Frontend polls this every 3 seconds
router.get("/pending", auth, async (req, res) => {
  try {
    const scan = await prisma.telegramScan.findFirst({
      where: { isProcessed: false },
      orderBy: { createdAt: "asc" },
    });
    // Always return 200 — null means nothing pending
    res.json(scan || null);
  } catch (e) {
    console.error("Pending scan error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── POST /api/ocr/mark-processed/:id  ────────────────────────
// Marks a scan as processed so it doesn't auto-fill twice
router.post("/mark-processed/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid scan id" });

    const scan = await prisma.telegramScan.update({
      where: { id },
      data: { isProcessed: true },
    });
    res.json({ success: true, scan });
  } catch (e) {
    console.error("Mark processed error:", e.message);
    // P2025 = record not found
    if (e.code === "P2025")
      return res.status(404).json({ message: "Scan not found" });
    res.status(500).json({ message: e.message });
  }
});

// ── GET /api/ocr/scans  ──────────────────────────────────────
// List recent scans (for admin/debug)
router.get("/scans", auth, async (req, res) => {
  try {
    const scans = await prisma.telegramScan.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(scans);
  } catch (e) {
    console.error("Scans list error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  EXISTING GATE PASS OCR  (camera upload from InwardEntry)
// ═══════════════════════════════════════════════════════════

// ── POST /api/ocr/gatepass  ──────────────────────────────────
// Accepts multipart image upload, runs Gemini Vision, returns JSON
router.post("/gatepass", auth, async (req, res) => {
  try {
    if (!genAI) {
      return res.status(503).json({
        success: false,
        error: "OCR not configured — set GEMINI_API_KEY in .env",
      });
    }

    // multer is expected to be configured upstream, or handle raw body
    // If using multer: const file = req.file;
    const multer = require("multer");
    const upload = multer({ storage: multer.memoryStorage() }).single("image");

    // Run multer as a promise
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No image uploaded" });
    }

    const base64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";

    // Initialize Gemini 1.5 Flash Model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const promptText = `Extract all visible text from this gate pass / inward slip and return ONLY a JSON object.
Return ONLY valid JSON, no markdown fences, no explanations.
{
  "inward_date":   "YYYY-MM-DD or null",
  "party_name":    "string or null",
  "vehicle_no":    "string or null",
  "driver_no":     "string or null",
  "marka":         "string or null",
  "commodity":     "string or null",
  "variety":       "string or null",
  "bags":          number or null,
  "weight_kg":     number or null,
  "lot_no":        "string or null",
  "rent_type":     "Packet or KG or Quintal or Ton or null",
  "received_from": "string or null"
}`;

    const imagePart = {
      inlineData: {
        data: base64,
        mimeType: mimeType,
      },
    };

    // Call Gemini API
    const result = await model.generateContent([promptText, imagePart]);
    const responseText = result.response.text();

    // Clean up response in case Gemini includes markdown blocks like ```json
    const cleaned = responseText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const data = JSON.parse(cleaned);
    res.json({ success: true, data });
  } catch (e) {
    console.error("Gate pass OCR error:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
