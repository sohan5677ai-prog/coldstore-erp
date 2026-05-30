// backend/src/telegramBot.js  — REPLACE ENTIRELY
// ColdStore Inward Entry Bot — single message, auto-save to DB
// Saves in EXACTLY the same structure as the web form so all ERP
// pages (Party Ledger, Stock, Outward, Reports) work correctly.
//
// FORMAT (type this and send):
//   Party: KNM Traders
//   Vehicle: TN52 M9625
//   Commodity: Tamarind
//   Variety: Seed Tamarind
//   Rent Type: KG
//   Packet Name: Seed bags
//   Bags: 400
//   Total Weight: 24940
//   Chamber: C340
//   Marks: Tharana
//   Date: 2026-04-04
//   Inward No: (leave blank for auto)
//
// Avg Weight is calculated automatically from Bags ÷ Total Weight.
// NO avg weight field needed from user.

"use strict";

require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const { PrismaClient } = require("@prisma/client");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const prisma = new PrismaClient();

console.log("🤖  ColdStore InwardBot started");

// ═══════════════════════════════════════════════════════════════
//  PARSER
// ═══════════════════════════════════════════════════════════════
// NOTE: "Avg Weight" is intentionally NOT in this list.
// It is calculated automatically from Bags ÷ Total Weight.
const FIELD_MAP = [
  {
    key: "inwardNo",
    labels: ["inward no", "inward no.", "inwardno", "csr no", "csr", "no"],
  },
  { key: "party", labels: ["party", "party name", "customer"] },
  {
    key: "vehicle",
    labels: ["vehicle", "vehicle no", "vehicle no.", "veh no", "truck"],
  },
  { key: "commodity", labels: ["commodity", "item"] },
  { key: "variety", labels: ["variety", "grade"] },
  { key: "rentType", labels: ["rent type", "renttype", "billing type"] },
  { key: "packetName", labels: ["packet name", "packet", "pkt", "bag type"] },
  {
    key: "bags",
    labels: ["bags", "no of bags", "no. of bags", "qty", "quantity", "pkts"],
  },
  {
    key: "totalWeight",
    labels: ["total weight", "total wt", "weight", "wt", "kg"],
  },
  {
    key: "chamber",
    labels: ["chamber", "chamber no", "lot", "location", "lot no"],
  },
  { key: "marks", labels: ["marks", "marka", "mark", "label"] },
  { key: "date", labels: ["date", "inward date"] },
];

// All known label strings (for boundary detection in regex)
const ALL_LABELS = FIELD_MAP.flatMap((f) => f.labels);

function buildTerminator() {
  return ALL_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length)
    .join("|");
}

const TERMINATOR = buildTerminator();

function parseMessage(text) {
  const clean = text.replace(/\r/g, " ").trim();
  const parsed = {};

  for (const field of FIELD_MAP) {
    const labelPattern = field.labels
      .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .sort((a, b) => b.length - a.length)
      .join("|");

    const regex = new RegExp(
      `(?:^|[\\n|])\\s*(?:[^\\w\\s]\\s*)?(?:${labelPattern})\\s*:\\s*([^\\n|]+?)(?=\\s*(?:[^\\w\\s]\\s*)?(?:${TERMINATOR})\\s*:|\\s*$)`,
      "i",
    );
    const m = clean.match(regex);
    if (m) parsed[field.key] = m[1].trim().replace(/\s+/g, " ");
  }

  // Coerce numbers
  if (parsed.bags)
    parsed.bags = parseFloat(parsed.bags.replace(/[^\d.]/g, "")) || 0;
  if (parsed.totalWeight)
    parsed.totalWeight =
      parseFloat(parsed.totalWeight.replace(/[^\d.]/g, "")) || 0;

  // Auto-calculate avg weight — NO user input needed
  if (parsed.bags > 0 && parsed.totalWeight > 0) {
    parsed.avgWeight = parseFloat(
      (parsed.totalWeight / parsed.bags).toFixed(3),
    );
  } else {
    parsed.avgWeight = 0;
  }

  // Parse date
  if (parsed.date) {
    const d = parsed.date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      // already ISO — fine
    } else {
      const m2 = d.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
      parsed.date = m2
        ? `${m2[3]}-${m2[2].padStart(2, "0")}-${m2[1].padStart(2, "0")}`
        : new Date().toISOString().slice(0, 10);
    }
  } else {
    parsed.date = new Date().toISOString().slice(0, 10);
  }

  return parsed;
}

function validate(p) {
  const missing = [];
  if (!p.party) missing.push("Party");
  if (!p.commodity) missing.push("Commodity");
  if (!p.variety) missing.push("Variety");
  if (!(p.bags > 0)) missing.push("Bags");
  if (!(p.totalWeight > 0)) missing.push("Total Weight");
  return missing;
}

// ═══════════════════════════════════════════════════════════════
//  DATABASE SAVE — mirrors exactly what the web form does
// ═══════════════════════════════════════════════════════════════

async function fuzzyFind(list, query, key = "name") {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  return (
    list.find((r) => r[key].toLowerCase() === q) ||
    list.find((r) => r[key].toLowerCase().includes(q)) ||
    list.find((r) => q.includes(r[key].toLowerCase())) ||
    null
  );
}

// Get the first admin user from DB — don't hardcode ID=1
async function getAdminUserId() {
  const user = await prisma.user
    .findFirst({
      where: {
        OR: [{ role: "admin" }, { role: "Admin" }, { username: "admin" }],
      },
      select: { id: true },
      orderBy: { id: "asc" },
    })
    .catch(() => null);

  if (user) return user.id;

  // Fallback: any user
  const any = await prisma.user
    .findFirst({
      select: { id: true },
      orderBy: { id: "asc" },
    })
    .catch(() => null);

  if (any) return any.id;
  throw new Error(
    "No users found in database. Please log in to the ERP web app first to create the admin user.",
  );
}

// Get next CSR — restart from 2346 if old data is above 4000
async function getNextCsr(overrideNo) {
  if (overrideNo) {
    const n = parseInt(String(overrideNo).replace(/\D/g, ""), 10);
    if (n > 0) {
      const exists = await prisma.inwardEntry.findFirst({
        where: { csrNo: n },
      });
      if (exists)
        throw new Error(
          `Inward No. ${n} already exists. Leave it blank to auto-assign.`,
        );
      return n;
    }
  }
  const last = await prisma.inwardEntry.findFirst({
    orderBy: { csrNo: "desc" },
    select: { csrNo: true },
  });
  const lastCsr = last?.csrNo ?? 0;
  return lastCsr >= 4000 ? 2346 : lastCsr + 1;
}

// Find the best matching Packet config for rent calculation
// This is critical — without it, outward rent calculation fails
async function findPacketConfig(commodityId, rentType) {
  const packet = await prisma.packet
    .findFirst({
      where: {
        commodityId,
        rentType: rentType || "KG",
      },
      orderBy: { id: "asc" },
    })
    .catch(() => null);

  // Also try without rentType filter
  if (!packet) {
    return prisma.packet
      .findFirst({
        where: { commodityId },
        orderBy: { id: "asc" },
      })
      .catch(() => null);
  }

  return packet;
}

async function saveEntry(parsed, chatId) {
  // ── 1. Admin user ────────────────────────────────────────────
  const createdById = await getAdminUserId();

  // ── 2. Customer (fuzzy match) ────────────────────────────────
  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, partyCode: true, city: true },
  });
  const customer = await fuzzyFind(customers, parsed.party);
  if (!customer) {
    throw new Error(
      `Party "${parsed.party}" not found.\n` +
        `Check spelling or add them in ERP → Master → Customers.`,
    );
  }

  // ── 3. Commodity (fuzzy match) ───────────────────────────────
  const commodities = await prisma.commodity.findMany({
    select: { id: true, name: true },
  });
  const commodity = await fuzzyFind(commodities, parsed.commodity);
  if (!commodity) {
    throw new Error(
      `Commodity "${parsed.commodity}" not found.\n` +
        `Add it in ERP → Master → Commodity.`,
    );
  }

  // ── 4. Variety (fuzzy match under commodity) ─────────────────
  const varieties = await prisma.variety.findMany({
    where: { commodityId: commodity.id },
    select: { id: true, name: true },
  });
  const variety = await fuzzyFind(varieties, parsed.variety);
  if (!variety) {
    throw new Error(
      `Variety "${parsed.variety}" not found under ${commodity.name}.\n` +
        `Add it in ERP → Master → Variety.`,
    );
  }

  // ── 5. Rent type ─────────────────────────────────────────────
  const VALID_RENT = {
    KG: "KG",
    PACKET: "Packet",
    QUINTAL: "Quintal",
    TON: "Ton",
  };
  const rentTypeKey = (parsed.rentType || "KG").toUpperCase().trim();
  const rentType = VALID_RENT[rentTypeKey] || "KG";

  // ── 6. Packet config — needed for outward rent calculation ───
  const packetConfig = await findPacketConfig(commodity.id, rentType);
  const packetId = packetConfig?.id || null;

  // ── 7. Packet name ───────────────────────────────────────────
  const packetName =
    parsed.packetName || packetConfig?.packetName || variety.name;

  // ── 8. CSR number ────────────────────────────────────────────
  const csrNo = await getNextCsr(parsed.inwardNo);

  // ── 9. Financial year ────────────────────────────────────────
  const d = new Date(parsed.date);
  const yr = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const finY = `${yr}-${String(yr + 1).slice(-2)}`;

  // ── 10. Final values ─────────────────────────────────────────
  const bags = parsed.bags || 0;
  const totalWt = parsed.totalWeight || 0;
  const avgWt = bags > 0 ? parseFloat((totalWt / bags).toFixed(3)) : 0;

  // ── 11. Create InwardEntry exactly like the web form does ────
  const entry = await prisma.inwardEntry.create({
    data: {
      csrNo,
      inwardDate: new Date(parsed.date),
      vehicleNo: parsed.vehicle || null,
      marka: parsed.marks || null,
      chamberNumbers: parsed.chamber || null,
      rentType,
      billingMode: "Seasonal",
      totalWeight: parseFloat(totalWt.toFixed(3)),
      financialYear: finY,
      status: "active",
      customerId: customer.id,
      varietyId: variety.id,
      createdById, // real user ID from DB
      packetEntries: {
        create: [
          {
            packetId: packetId, // linked to Packet config for rent calc
            packetName,
            avgWeight: avgWt,
            quantity: bags,
            totalWeight: parseFloat(totalWt.toFixed(3)),
          },
        ],
      },
    },
    include: {
      customer: { select: { name: true, partyCode: true } },
      variety: { include: { commodity: { select: { name: true } } } },
      packetEntries: true,
    },
  });

  return {
    entry,
    csrNo,
    customer,
    variety,
    commodity,
    bags,
    totalWt,
    avgWt,
    rentType,
    finY,
  };
}

// ═══════════════════════════════════════════════════════════════
//  DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════

const TODAY = () => new Date().toISOString().slice(0, 10);

function showParsed(p) {
  return (
    `\`\`\`\n` +
    `Inward No:    ${p.inwardNo || "auto"}\n` +
    `Party:        ${p.party || "—"}\n` +
    `Vehicle:      ${p.vehicle || "—"}\n` +
    `Commodity:    ${p.commodity || "—"}\n` +
    `Variety:      ${p.variety || "—"}\n` +
    `Rent Type:    ${p.rentType || "KG"}\n` +
    `Packet Name:  ${p.packetName || "—"}\n` +
    `Bags:         ${p.bags || "—"}\n` +
    `Total Weight: ${p.totalWeight || "—"} KG\n` +
    `Avg Wt/bag:   ${p.avgWeight || "auto-calc"} KG\n` +
    `Chamber:      ${p.chamber || "—"}\n` +
    `Marks:        ${p.marks || "—"}\n` +
    `Date:         ${p.date || TODAY()}\n` +
    `\`\`\``
  );
}

// ═══════════════════════════════════════════════════════════════
//  COMMANDS
// ═══════════════════════════════════════════════════════════════

bot.onText(/\/start/, async (msg) => {
  const name = msg.from?.first_name || "there";
  await bot.sendMessage(
    msg.chat.id,
    `🌾 *Hi ${name}! ColdStore InwardBot*\n\n` +
      `Send inward details and the entry is saved to ERP automatically.\n\n` +
      `/format — blank template to fill\n` +
      `/recent — last 5 inward entries\n` +
      `/help   — field guide\n` +
      `/status — bot connection check`,
    { parse_mode: "Markdown" },
  );
});

bot.onText(/\/format/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `📋 *Copy, fill in the values, and send:*\n\n` +
      `\`\`\`\n` +
      `Inward No: \n` +
      `Party: \n` +
      `Vehicle: \n` +
      `Commodity: \n` +
      `Variety: \n` +
      `Rent Type: KG\n` +
      `Packet Name: \n` +
      `Bags: \n` +
      `Total Weight: \n` +
      `Chamber: \n` +
      `Marks: \n` +
      `Date: ${TODAY()}\n` +
      `\`\`\`\n\n` +
      `_Avg Weight per bag is calculated automatically._\n` +
      `_Leave Inward No blank to auto-assign._`,
    { parse_mode: "Markdown" },
  );
});

bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `📖 *Field Guide*\n\n` +
      `*Required fields:*\n` +
      `• Party — exact or partial name\n` +
      `• Commodity — Tamarind, Horse Gram, Chillies, etc.\n` +
      `• Variety — Seed Tamarind, Shell Tamarind, etc.\n` +
      `• Bags — number of bags\n` +
      `• Total Weight — total KG\n\n` +
      `*Optional fields:*\n` +
      `• Inward No — leave blank to auto-assign\n` +
      `• Vehicle, Chamber, Marks, Packet Name, Date, Rent Type\n\n` +
      `*Avg Weight* is auto-calculated: Total Weight ÷ Bags\n\n` +
      `*Rent Type options:* KG · Packet · Quintal · Ton\n` +
      `*Date:* DD/MM/YYYY or YYYY-MM-DD (default: today)\n\n` +
      `*Why does Party Ledger/Stock not update?*\n` +
      `It updates immediately — just refresh the page or re-search the party.`,
    { parse_mode: "Markdown" },
  );
});

bot.onText(/\/status/, async (msg) => {
  try {
    const [count, lastEntry, userCount] = await Promise.all([
      prisma.inwardEntry.count(),
      prisma.inwardEntry.findFirst({
        orderBy: { createdAt: "desc" },
        select: { csrNo: true, createdAt: true },
      }),
      prisma.user.count(),
    ]);
    const userId = await getAdminUserId().catch(() => null);
    await bot.sendMessage(
      msg.chat.id,
      `✅ *Bot is connected to ERP database*\n\n` +
        `📊 Total inward entries: *${count}*\n` +
        `🔢 Last Inward No: *${lastEntry?.csrNo || "none"}*\n` +
        `👤 Users in DB: *${userCount}*\n` +
        `🔑 Admin user ID: *${userId || "not found"}*\n` +
        `🕐 Last entry: ${lastEntry ? new Date(lastEntry.createdAt).toLocaleString("en-IN") : "—"}`,
      { parse_mode: "Markdown" },
    );
  } catch (e) {
    console.error("Status error:", e.message);
    await bot.sendMessage(
      msg.chat.id,
      `❌ *Cannot connect to database*\n\n${e.message}\n\nCheck DATABASE_URL in your .env`,
    );
  }
});

bot.onText(/\/recent/, async (msg) => {
  try {
    const entries = await prisma.inwardEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        customer: { select: { name: true } },
        variety: { include: { commodity: { select: { name: true } } } },
        packetEntries: { select: { quantity: true, totalWeight: true } },
      },
    });
    if (!entries.length) {
      await bot.sendMessage(msg.chat.id, "No inward entries yet.");
      return;
    }
    const lines = entries.map((e, i) => {
      const qty = (e.packetEntries || []).reduce(
        (s, p) => s + (p.quantity || 0),
        0,
      );
      const wt = (e.packetEntries || []).reduce(
        (s, p) => s + (p.totalWeight || 0),
        0,
      );
      return (
        `*${i + 1}. CSR ${e.csrNo}* — ${new Date(e.inwardDate).toLocaleDateString("en-IN")}\n` +
        `   👤 ${e.customer?.name}\n` +
        `   📦 ${e.variety?.commodity?.name} › ${e.variety?.name}\n` +
        `   🛍 ${qty} bags | 🏋️ ${wt.toFixed(0)} KG`
      );
    });
    await bot.sendMessage(
      msg.chat.id,
      `📋 *Last 5 Inward Entries:*\n\n${lines.join("\n\n")}`,
      { parse_mode: "Markdown" },
    );
  } catch (e) {
    console.error("Recent error:", e.message);
    await bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════════
//  MAIN MESSAGE HANDLER — parse + validate + save in one shot
// ═══════════════════════════════════════════════════════════════

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  if (text.startsWith("/")) return;

  // Must look like an inward entry message
  const lc = text.toLowerCase();
  const hasParty = lc.includes("party") || lc.includes("customer");
  const hasCargo =
    lc.includes("commodity") ||
    lc.includes("bags") ||
    lc.includes("weight") ||
    lc.includes("tamarind");
  if (!hasParty && !hasCargo) {
    await bot.sendMessage(
      chatId,
      `💬 Include Party and stock details to save an entry.\n\n/format → blank template`,
    );
    return;
  }

  await bot.sendChatAction(chatId, "typing");

  // 1. Parse message
  const parsed = parseMessage(text);
  const missing = validate(parsed);

  if (missing.length > 0) {
    await bot.sendMessage(
      chatId,
      `⚠️ *Missing: ${missing.join(", ")}*\n\n` +
        `*What I understood:*\n` +
        showParsed(parsed) +
        `\n\nResend with the missing fields added.\n/format → blank template`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // 2. Show parsed and saving
  await bot.sendMessage(chatId, `⏳ *Saving…*\n\n` + showParsed(parsed), {
    parse_mode: "Markdown",
  });

  // 3. Save to DB
  try {
    const {
      csrNo,
      customer,
      variety,
      commodity,
      bags,
      totalWt,
      avgWt,
      rentType,
    } = await saveEntry(parsed, chatId);

    await bot.sendMessage(
      chatId,
      `✅ *Saved to ERP!*\n\n` +
        `🔢 *Inward No:* ${csrNo}\n` +
        `👤 *Party:* ${customer.name} _(${customer.partyCode})_\n` +
        `🚛 *Vehicle:* ${parsed.vehicle || "—"}\n` +
        `📦 *Commodity:* ${commodity.name}\n` +
        `🌿 *Variety:* ${variety.name}\n` +
        `💰 *Rent Type:* ${rentType}\n` +
        `🛍 *Bags:* ${bags}\n` +
        `🏋️ *Total Weight:* ${totalWt.toLocaleString("en-IN")} KG\n` +
        `⚖️ *Avg/bag:* ${avgWt} KG _(auto)_\n` +
        `📍 *Chamber:* ${parsed.chamber || "—"}\n` +
        `🏷 *Marks:* ${parsed.marks || "—"}\n` +
        `📅 *Date:* ${new Date(parsed.date).toLocaleDateString("en-IN")}\n\n` +
        `_Visible in Party Ledger, Stock, and all Reports immediately._`,
      { parse_mode: "Markdown" },
    );
  } catch (e) {
    console.error("Save error:", e.message);
    await bot.sendMessage(
      chatId,
      `❌ *Save Failed*\n\n*Reason:* ${e.message}\n\n` +
        `Fix the issue and resend.\n/help for field guide`,
      { parse_mode: "Markdown" },
    );
  }
});

// ── Graceful shutdown ─────────────────────────────────────────
process.once("SIGINT", () => {
  bot.stopPolling();
  prisma.$disconnect();
  process.exit(0);
});
process.once("SIGTERM", () => {
  bot.stopPolling();
  prisma.$disconnect();
  process.exit(0);
});
process.on("unhandledRejection", (e) =>
  console.error("Unhandled:", e?.message),
);
bot.on("polling_error", (e) => console.error("Polling error:", e.message));
