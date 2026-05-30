// frontend/src/pages/GatePass.jsx

import { useState } from "react";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

async function api(path) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${tok()}` },
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || "Error");
  return d;
}

const fmt = (n) =>
  (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const inp = {
  padding: "8px 12px",
  fontSize: 13,
  border: "1.5px solid #d1d5db",
  borderRadius: 6,
  outline: "none",
  fontFamily: "inherit",
};

export default function GatePass() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await api(`/outward/register?from=2020-01-01&to=2099-12-31`);
      const q = search.toLowerCase();
      const filtered = data
        .filter(
          (e) =>
            String(e.inward?.csrNo || "").includes(q) ||
            (e.customer?.name || "").toLowerCase().includes(q) ||
            (e.outwardNo || "").toLowerCase().includes(q) ||
            (e.inward?.lot?.lotCode || "").toLowerCase().includes(q),
        )
        .slice(0, 20);
      setResults(filtered);
      if (filtered.length === 0) setError("No entries found for: " + search);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const co = JSON.parse(
    localStorage.getItem("company") ||
      '{"name":"S.V. Cold Storage","address":"Madanapalli Road, Kallupalli Village, Gangavaram"}',
  );

  return (
    <Layout>
      <style>{`@media print {
        .no-print, nav, aside, header { display:none!important; }
        body { background:#fff!important; }
        #gate-pass { padding:20px!important; box-shadow:none!important; }
      }`}</style>

      <div
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          background: "#fff",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            background: "#4a90d9",
            color: "#fff",
            padding: "10px 24px",
            fontWeight: 700,
            fontSize: 18,
            textAlign: "center",
          }}
        >
          Gate Pass / Outward Bill
        </div>

        {/* Search bar */}
        <div
          className="no-print"
          style={{ padding: 16, borderBottom: "1px solid #f1f5f9" }}
        >
          <div style={{ display: "flex", gap: 10, maxWidth: 560 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Search by CSR No, Party Name, Out No, Lot Code…"
              style={{ ...inp, flex: 1 }}
            />
            <button
              onClick={doSearch}
              disabled={loading}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "0 22px",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {loading ? "…" : "Search"}
            </button>
            {entry && (
              <button
                onClick={() => {
                  setEntry(null);
                  setResults([]);
                }}
                style={{
                  background: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "0 16px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                ← New Search
              </button>
            )}
          </div>
          {error && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c" }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results list */}
        {results.length > 0 && !entry && (
          <div style={{ padding: "0 16px 16px" }}>
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ background: "#6d5fd3", color: "#fff" }}>
                    {[
                      "Out No",
                      "Date",
                      "Party",
                      "Lot",
                      "Variety",
                      "Bags Out",
                      "Total ₹",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((e, i) => (
                    <tr
                      key={e.id}
                      style={{
                        background: i % 2 === 0 ? "#fff" : "#f8fafc",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <td
                        style={{
                          padding: "7px 10px",
                          color: "#2563eb",
                          fontWeight: 500,
                        }}
                      >
                        {e.outwardNo}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          color: "#6b7280",
                          fontSize: 12,
                        }}
                      >
                        {new Date(e.outwardDate).toLocaleDateString("en-IN")}
                      </td>
                      <td style={{ padding: "7px 10px", fontWeight: 500 }}>
                        {e.customer?.name}
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        <span
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 3,
                          }}
                        >
                          {e.inward?.lot?.lotCode || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "7px 10px", color: "#6b7280" }}>
                        {e.inward?.variety?.name || "—"}
                      </td>
                      <td style={{ padding: "7px 10px" }}>{e.bagsOut}</td>
                      <td
                        style={{
                          padding: "7px 10px",
                          fontWeight: 600,
                          color: "#15803d",
                        }}
                      >
                        ₹{fmt(e.totalAmount)}
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        <button
                          onClick={() => setEntry(e)}
                          style={{
                            background: "#22c55e",
                            color: "#fff",
                            border: "none",
                            borderRadius: 5,
                            padding: "5px 14px",
                            fontSize: 12,
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Print Gate Pass
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PRINTABLE GATE PASS ── */}
        {entry && (
          <div>
            <div
              className="no-print"
              style={{
                padding: "10px 16px",
                background: "#f0fdf4",
                borderBottom: "1px solid #86efac",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13, color: "#15803d", fontWeight: 500 }}>
                ✅ Gate Pass ready — {entry.outwardNo}
              </span>
              <button
                onClick={() => window.print()}
                style={{
                  marginLeft: "auto",
                  background: "#374151",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 22px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                🖨️ Print Gate Pass
              </button>
            </div>

            <div
              id="gate-pass"
              style={{
                padding: "32px 48px",
                maxWidth: 780,
                margin: "0 auto",
                fontFamily: "'Segoe UI', Arial, sans-serif",
              }}
            >
              {/* Header */}
              <div
                style={{
                  textAlign: "center",
                  borderBottom: "2px solid #000",
                  paddingBottom: 16,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}
                >
                  {co.name}
                </div>
                <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>
                  {co.address}
                </div>
                {co.gstin && (
                  <div style={{ fontSize: 12, color: "#374151", marginTop: 2 }}>
                    GSTIN: {co.gstin}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginTop: 10,
                    textDecoration: "underline",
                    letterSpacing: 1,
                  }}
                >
                  GATE PASS / OUTWARD BILL
                </div>
              </div>

              {/* Basic info grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px 32px",
                  fontSize: 13,
                  marginBottom: 20,
                  borderBottom: "1px solid #ddd",
                  paddingBottom: 14,
                }}
              >
                {[
                  ["Gate Pass No", entry.outwardNo],
                  [
                    "Date",
                    new Date(entry.outwardDate).toLocaleDateString("en-IN"),
                  ],
                  ["Party Name", entry.customer?.name],
                  ["City / Village", entry.customer?.city || "—"],
                  ["Inward CSR No", entry.inward?.csrNo],
                  [
                    "Inward Date",
                    new Date(
                      entry.inward?.inwardDate || entry.outwardDate,
                    ).toLocaleDateString("en-IN"),
                  ],
                  ["Lot / Room No", entry.inward?.lot?.lotCode || "—"],
                  ["Vehicle No", entry.vehicleNo || "—"],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", gap: 8 }}>
                    <span
                      style={{ color: "#6b7280", minWidth: 120, flexShrink: 0 }}
                    >
                      {l}:
                    </span>
                    <strong style={{ color: "#1e293b" }}>{v}</strong>
                  </div>
                ))}
              </div>

              {/* Stock detail table */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                  marginBottom: 20,
                  border: "1px solid #d1d5db",
                }}
              >
                <thead>
                  <tr style={{ background: "#374151", color: "#fff" }}>
                    {[
                      "Commodity",
                      "Variety",
                      "Bags / Wt.",
                      "Days Stored",
                      "Storage ₹",
                      "Handling ₹",
                      "GST ₹",
                      "Total ₹",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "9px 10px",
                          textAlign: "left",
                          fontSize: 12,
                          fontWeight: 600,
                          border: "1px solid #4b5563",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      style={{ padding: "10px", border: "1px solid #e5e7eb" }}
                    >
                      {entry.inward?.variety?.commodity?.name || "—"}
                    </td>
                    <td
                      style={{ padding: "10px", border: "1px solid #e5e7eb" }}
                    >
                      {entry.inward?.variety?.name || "—"}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        border: "1px solid #e5e7eb",
                        fontWeight: 600,
                      }}
                    >
                      {entry.bagsOut}
                    </td>
                    <td
                      style={{ padding: "10px", border: "1px solid #e5e7eb" }}
                    >
                      {entry.daysStored} days
                    </td>
                    <td
                      style={{ padding: "10px", border: "1px solid #e5e7eb" }}
                    >
                      {fmt(entry.storageCharge)}
                    </td>
                    <td
                      style={{ padding: "10px", border: "1px solid #e5e7eb" }}
                    >
                      {fmt(entry.handlingCharge)}
                    </td>
                    <td
                      style={{ padding: "10px", border: "1px solid #e5e7eb" }}
                    >
                      {fmt(entry.gstAmount)}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        border: "1px solid #e5e7eb",
                        fontWeight: 700,
                        color: "#15803d",
                      }}
                    >
                      ₹{fmt(entry.totalAmount)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr
                    style={{
                      background: "#f9fafb",
                      fontWeight: 700,
                      borderTop: "2px solid #374151",
                    }}
                  >
                    <td
                      colSpan={7}
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        fontSize: 14,
                        border: "1px solid #d1d5db",
                      }}
                    >
                      TOTAL AMOUNT:
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        fontSize: 16,
                        color: "#15803d",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      ₹{fmt(entry.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Remarks */}
              {entry.remarks && (
                <div
                  style={{
                    fontSize: 13,
                    marginBottom: 20,
                    padding: "10px 14px",
                    background: "#fef3c7",
                    border: "1px solid #fde68a",
                    borderRadius: 6,
                  }}
                >
                  <strong>Remarks:</strong> {entry.remarks}
                </div>
              )}

              {/* Signature row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 32,
                  marginTop: 48,
                }}
              >
                {[
                  "Receiver Signature",
                  "Authorised Signatory",
                  "Manager / Owner",
                ].map((l) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        height: 50,
                        borderBottom: "1px solid #374151",
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ fontSize: 12, color: "#374151" }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Footer note */}
              <div
                style={{
                  marginTop: 32,
                  textAlign: "center",
                  fontSize: 11,
                  color: "#94a3b8",
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: 12,
                }}
              >
                Generated on {new Date().toLocaleString("en-IN")} · {co.name}
                {co.phone && ` · Ph: ${co.phone}`}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
