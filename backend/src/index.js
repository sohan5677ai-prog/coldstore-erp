// backend/src/index.js  — REPLACE your existing index.js

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/commodities", require("./routes/commodities"));
app.use("/api/varieties", require("./routes/varieties"));
app.use("/api/packets", require("./routes/packets"));
app.use("/api/inward/bulk", require("./routes/inwardBulk"));
app.use("/api/inward", require("./routes/inward"));
app.use("/api/outward", require("./routes/outward"));
app.use("/api/stock", require("./routes/stock"));
app.use("/api/ocr", require("./routes/ocr"));
app.use("/api/ledger", require("./routes/ledger")); // NEW
app.use("/api/vouchers", require("./routes/vouchers"));
app.use("/api/bills", require("./routes/bills")); // NEW
app.use("/api/dashboard", require("./routes/dashboard")); // NEW

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server → http://localhost:${PORT}`));
