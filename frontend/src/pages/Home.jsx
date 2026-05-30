// src/pages/Home.jsx
// 8-tile home screen + functional Lot/Party search modals

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

// ── Safe fetch ────────────────────────────────────────────────
async function apiFetch(path) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${tok()}` },
  });
  const text = await r.text();
  if (text.trim().startsWith("<!")) throw new Error("Server error");
  return JSON.parse(text);
}

const TILES = [
  {
    title: "Inward",
    desc: "Record items received in storage",
    icon: "↓",
    path: "/transaction/inward",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    title: "Outward",
    desc: "Log items leaving storage",
    icon: "↑",
    path: "/transaction/outward",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    title: "Bill",
    desc: "Manage billing and invoices",
    icon: "📄",
    path: "/transaction/bill",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    title: "Vouchers",
    desc: "Track vouchers and financial transactions",
    icon: "💵",
    path: "/transaction/voucher",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    title: "Stock Status",
    desc: "Check current stock status",
    icon: "📦",
    path: "/report/stock-summary",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    title: "Party Ledger",
    desc: "Manage party accounts and ledger",
    icon: "👥",
    path: "/report/party-ledger",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    title: "Inward Register",
    desc: "Keep track of inward entries",
    icon: "📋",
    path: "/report/inward",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    title: "Outward Register",
    desc: "Record outward transactions / entries",
    icon: "✅",
    path: "/report/outward",
    color: "#2563eb",
    bg: "#eff6ff",
  },
];

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS — all OUTSIDE export default
// ══════════════════════════════════════════════════════════════

function ModalOverlay({ onClose, children }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1000,
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          zIndex: 1001,
          width: "min(540px, 95vw)",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div
      style={{
        background: "#2563eb",
        color: "#fff",
        padding: "14px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
      <button
        onClick={onClose}
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "none",
          color: "#fff",
          borderRadius: 6,
          width: 28,
          height: 28,
          cursor: "pointer",
          fontSize: 16,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ×
      </button>
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "7px 0",
        borderBottom: "1px solid #f1f5f9",
        fontSize: 13,
        gap: 12,
      }}
    >
      <span style={{ color: "#6b7280", minWidth: 120, flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          color: color || "#1e293b",
          fontWeight: color ? 600 : 400,
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 40,
        color: "#94a3b8",
        fontSize: 14,
      }}
    >
      Searching…
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div
      style={{
        margin: 16,
        padding: "10px 14px",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 6,
        fontSize: 13,
        color: "#b91c1c",
      }}
    >
      ⚠️ {message}
    </div>
  );
}

// ── Lot Search Modal ──────────────────────────────────────────
function LotModal({ result, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="📍 Chamber Search Result" onClose={onClose} />
      <div style={{ padding: 20, overflowY: "auto" }}>
        {result ? (
          <>
            <InfoRow
              label="Chamber No."
              value={result.lotCode}
              color="#2563eb"
            />
            <InfoRow label="Party Name" value={result.partyName} />
            <InfoRow label="Location" value={result.location} />
            <InfoRow label="Commodity" value={result.commodity} />
            <InfoRow label="Variety" value={result.variety} />
            <InfoRow
              label="Total Bags"
              value={result.totalBags ? String(result.totalBags) : null}
            />
            <InfoRow
              label="Balance Bags"
              value={result.balanceBags ? String(result.balanceBags) : null}
              color="#15803d"
            />
            <InfoRow
              label="Status"
              value={result.status}
              color={result.status === "filled" ? "#b91c1c" : "#15803d"}
            />
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <div>No lot found with that number.</div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

// ── Party Search Modal ────────────────────────────────────────
function PartyModal({ result, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="👤 Party Details" onClose={onClose} />
      <div style={{ padding: 20, overflowY: "auto" }}>
        {result ? (
          <>
            <InfoRow label="Party Name" value={result.name} color="#2563eb" />
            <InfoRow label="Father Name" value={result.fatherName} />
            <InfoRow label="Village" value={result.city} />
            <InfoRow label="Mobile" value={result.mobileNumber} />
            <InfoRow label="Aadhaar No." value={result.aadhaarNo} />
            <InfoRow label="PAN No." value={result.panNo} />
            <InfoRow label="Party Code" value={result.partyCode} />

            {result.activeLots && result.activeLots.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    marginBottom: 8,
                    color: "#374151",
                  }}
                >
                  Active Lots / Transactions
                </div>
                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 12,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#6d5fd3", color: "#fff" }}>
                        {[
                          "CSR No",
                          "Commodity",
                          "Bags",
                          "Wt (KG)",
                          "Chamber",
                          "Date",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "7px 10px",
                              textAlign: "left",
                              fontWeight: 600,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.activeLots.map((lot, i) => (
                        <tr
                          key={i}
                          style={{
                            background: i % 2 === 0 ? "#fff" : "#f8fafc",
                            borderBottom: "1px solid #f1f5f9",
                          }}
                        >
                          <td
                            style={{
                              padding: "6px 10px",
                              color: "#2563eb",
                              fontWeight: 600,
                            }}
                          >
                            {lot.csrNo}
                          </td>
                          <td style={{ padding: "6px 10px" }}>
                            {lot.commodity}
                          </td>
                          <td style={{ padding: "6px 10px" }}>{lot.bags}</td>
                          <td style={{ padding: "6px 10px" }}>{lot.weight}</td>
                          <td style={{ padding: "6px 10px" }}>{lot.chamber}</td>
                          <td style={{ padding: "6px 10px", color: "#6b7280" }}>
                            {lot.date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(!result.activeLots || result.activeLots.length === 0) && (
              <div
                style={{
                  marginTop: 14,
                  padding: "12px 0",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                No active lots for this party.
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👤</div>
            <div>No party found with that name or code.</div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

// ── Tile button ───────────────────────────────────────────────
function Tile({ tile, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "28px 20px",
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.18s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.12)";
        e.currentTarget.style.borderColor = "#93c5fd";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
        e.currentTarget.style.borderColor = "#e2e8f0";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: tile.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
          fontSize: 22,
          color: tile.color,
          border: `2px solid ${tile.color}22`,
        }}
      >
        {tile.icon}
      </div>
      <div
        style={{
          fontWeight: 600,
          fontSize: 15,
          color: "#1e293b",
          marginBottom: 6,
        }}
      >
        {tile.title}
      </div>
      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
        {tile.desc}
      </div>
    </button>
  );
}

// ── Search bar row ────────────────────────────────────────────
function SearchBar({ label, placeholder, value, onChange, onSearch, loading }) {
  const handleKey = (e) => {
    if (e.key === "Enter") onSearch();
  };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span
        style={{
          fontSize: 12,
          color: "#6b7280",
          minWidth: 80,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        style={{
          flex: 1,
          padding: "8px 12px",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
          color: "#374151",
        }}
      />
      <button
        onClick={onSearch}
        disabled={loading}
        style={{
          background: loading ? "#86efac" : "#22c55e",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {loading ? "…" : "Search"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════
export default function Home() {
  const navigate = useNavigate();

  const [lotQ, setLotQ] = useState("");
  const [partyQ, setPartyQ] = useState("");
  const [lotLoading, setLotLoading] = useState(false);
  const [partyLoading, setPartyLoading] = useState(false);
  const [lotModal, setLotModal] = useState(false);
  const [partyModal, setPartyModal] = useState(false);
  const [lotResult, setLotResult] = useState(null);
  const [partyResult, setPartyResult] = useState(null);
  const [lotError, setLotError] = useState("");
  const [partyError, setPartyError] = useState("");

  // ── Lot search ──────────────────────────────────────────────
  // TODO: connect to real /api/stock/lots?lotCode= endpoint
  // ── Chamber Search — STRICT exact match ──────────────────────
  // "5" must only return chamber 5, not 15, 25, 50, 51, "1,2,3" etc.
  const searchLot = useCallback(async () => {
    if (!lotQ.trim()) return;
    setLotLoading(true);
    setLotError("");

    const rawQ = lotQ.trim();
    const numericQ = rawQ.replace(/[^\d]/g, ""); // "A47" → "47", "5" → "5"
    const letterQ = rawQ.replace(/[\d\s]/g, "").toUpperCase(); // "A47" → "A"

    try {
      const data = await apiFetch(`/inward`);
      const entries = Array.isArray(data) ? data : [];

      // Find the FIRST entry whose chamber number matches EXACTLY
      const match = entries.find((e) => {
        const rawCode = String(e.chamberNumbers || e.lot?.lotCode || "");
        // Compare each comma-separated segment
        return rawCode.split(",").some((seg) => {
          const segNum = seg.trim().replace(/[^\d]/g, "");
          const segLet = seg
            .trim()
            .replace(/[\d\s]/g, "")
            .toUpperCase();
          const numMatch = segNum === numericQ;
          const letMatch =
            letterQ.length === 0 || segLet === letterQ || segLet === "";
          return numMatch && letMatch;
        });
      });

      if (match) {
        const totalQty = (match.packetEntries || []).reduce(
          (s, p) => s + (p.quantity || 0),
          0,
        );
        const outQty = (match.outwardEntries || []).reduce(
          (s, o) => s + (o.bagsOut || 0),
          0,
        );
        setLotResult({
          lotCode: match.chamberNumbers || match.lot?.lotCode || rawQ,
          partyName: match.customer?.name,
          location: match.chamberNumbers || match.lot?.lotCode || "—",
          commodity: match.variety?.commodity?.name,
          variety: match.variety?.name,
          totalBags: totalQty,
          balanceBags: totalQty - outQty,
          status: match.status,
        });
      } else {
        setLotResult(null);
      }
    } catch (e) {
      console.error("Chamber search error:", e.message);
      setLotError(e.message);
      setLotResult(null);
    }
    setLotLoading(false);
    setLotModal(true);
  }, [lotQ]);

  // ── Party search ────────────────────────────────────────────
  const searchParty = useCallback(async () => {
    if (!partyQ.trim()) return;
    setPartyLoading(true);
    setPartyError("");
    try {
      // Real API call to customer search
      const list = await apiFetch(
        `/customers/search?q=${encodeURIComponent(partyQ.trim())}`,
      );
      const customer = Array.isArray(list) && list.length > 0 ? list[0] : null;

      if (customer) {
        // Fetch their active inward entries
        let activeLots = [];
        try {
          const inwards = await apiFetch(`/inward?partyId=${customer.id}`);
          activeLots = (Array.isArray(inwards) ? inwards : []).map((e) => ({
            csrNo: e.csrNo,
            commodity: e.variety?.commodity?.name || "—",
            bags: (e.packetEntries || []).reduce(
              (s, p) => s + (p.quantity || 0),
              0,
            ),
            weight: (e.totalWeight || 0).toFixed(3),
            chamber: e.chamberNumbers || e.lot?.lotCode || "—",
            date: new Date(e.inwardDate).toLocaleDateString("en-IN"),
          }));
        } catch (e) {
          console.error("Active lots fetch:", e.message);
        }

        setPartyResult({ ...customer, activeLots });
      } else {
        setPartyResult(null);
      }
    } catch (e) {
      console.error("Party search error:", e.message);
      setPartyError(e.message);
      setPartyResult(null);
    }
    setPartyLoading(false);
    setPartyModal(true);
  }, [partyQ]);

  return (
    <Layout>
      {/* ── 8-tile grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
          marginBottom: 32,
        }}
      >
        {TILES.map((tile) => (
          <Tile
            key={tile.title}
            tile={tile}
            onClick={() => navigate(tile.path)}
          />
        ))}
      </div>

      {/* ── Search bar ── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "20px 24px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            textAlign: "center",
            color: "#1e293b",
            marginBottom: 16,
          }}
        >
          Quick Search
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {lotError && (
            <div
              style={{
                padding: "8px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                fontSize: 12,
                color: "#b91c1c",
              }}
            >
              ⚠️ {lotError}
            </div>
          )}
          {partyError && (
            <div
              style={{
                padding: "8px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                fontSize: 12,
                color: "#b91c1c",
              }}
            >
              ⚠️ {partyError}
            </div>
          )}

          <SearchBar
            label="Chamber No."
            placeholder="e.g. A47 or 340 (exact match)"
            value={lotQ}
            onChange={setLotQ}
            onSearch={searchLot}
            loading={lotLoading}
          />
          <SearchBar
            label="Party Name"
            placeholder="Party name or code…"
            value={partyQ}
            onChange={setPartyQ}
            onSearch={searchParty}
            loading={partyLoading}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      {lotModal && (
        <LotModal result={lotResult} onClose={() => setLotModal(false)} />
      )}
      {partyModal && (
        <PartyModal result={partyResult} onClose={() => setPartyModal(false)} />
      )}
    </Layout>
  );
}
