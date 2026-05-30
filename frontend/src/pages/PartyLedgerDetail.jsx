// frontend/src/pages/DetailLedger.jsx  — REPLACE ENTIRELY
// Full-page printable detail ledger with running balance
// Rules: no nested components, async useEffect + await Promise.resolve()

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

// ── Safe fetch ────────────────────────────────────────────────
async function apiFetch(path) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${tok()}` },
  });
  const text = await r.text();
  if (text.trim().startsWith("<!")) {
    throw new Error("Server error — check backend logs");
  }
  const d = JSON.parse(text);
  if (!r.ok) throw new Error(d.message || `HTTP ${r.status}`);
  return d;
}

const fmt = (n) =>
  Math.abs(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtN = (n) => (n || 0).toLocaleString("en-IN");

// ── Sub-components ────────────────────────────────────────────

function PrintHeader({ customer, tillDate }) {
  const co = JSON.parse(
    localStorage.getItem("company") ||
      '{"name":"S.V. Cold Storage","address":""}',
  );
  return (
    <div
      style={{
        textAlign: "center",
        borderBottom: "2px solid #000",
        paddingBottom: 12,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700 }}>{co.name}</div>
      {co.address && (
        <div style={{ fontSize: 12, color: "#374151", marginTop: 2 }}>
          {co.address}
        </div>
      )}
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          marginTop: 8,
          textDecoration: "underline",
          letterSpacing: 1,
        }}
      >
        PARTY DETAIL LEDGER
      </div>
      <div
        style={{
          fontSize: 13,
          marginTop: 6,
          display: "flex",
          justifyContent: "center",
          gap: 32,
        }}
      >
        <span>
          Party: <strong>{customer?.name}</strong>
        </span>
        <span>
          Code: <strong>{customer?.partyCode || "—"}</strong>
        </span>
        <span>
          Till: <strong>{tillDate}</strong>
        </span>
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  const map = {
    Inward: { bg: "#eff6ff", c: "#1d4ed8" },
    Bill: { bg: "#fef3c7", c: "#b45309" },
    Receipt: { bg: "#dcfce7", c: "#15803d" },
    OB: { bg: "#f3f4f6", c: "#6b7280" },
  };
  const s = map[type] || { bg: "#f3f4f6", c: "#6b7280" };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 3,
        background: s.bg,
        color: s.c,
        whiteSpace: "nowrap",
      }}
    >
      {type}
    </span>
  );
}

function EmptyLedger() {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
      <div>No transactions found for this party.</div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function PartyLedgerDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const date =
    searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const name = searchParams.get("name") || "";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      await Promise.resolve();
      setLoading(true);
      try {
        const d = await apiFetch(`/ledger/party/${id}/detail?date=${date}`);
        setData(d);
      } catch (e) {
        console.error("Detail ledger load error:", e.message);
        setError(e.message);
      }
      setLoading(false);
    };
    load();
  }, [id, date]);

  const handlePrint = () => window.print();
  const handleBack = () => navigate(-1);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "#94a3b8",
          fontSize: 14,
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
          Loading detail ledger…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "'Segoe UI', sans-serif" }}>
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: 16,
            color: "#b91c1c",
          }}
        >
          ⚠️ {error}
        </div>
        <button
          onClick={handleBack}
          style={{
            marginTop: 12,
            background: "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 20px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Arial, sans-serif",
        background: "#fff",
        minHeight: "100vh",
        padding: "24px 40px",
      }}
    >
      <style>{`
        @media print {
          .no-print { display:none!important; }
          body { background:#fff!important; }
          @page { size: A4 landscape; margin: 12mm; }
        }
      `}</style>

      {/* Action bar */}
      <div
        className="no-print"
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <button
          onClick={handleBack}
          style={{
            background: "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 20px",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ← Back to Ledger
        </button>
        <button
          onClick={handlePrint}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 20px",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          🖨️ Print
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Balance:{" "}
          <strong
            style={{
              color: data.finalBal >= 0 ? "#b91c1c" : "#15803d",
              fontSize: 16,
            }}
          >
            ₹{fmt(data.finalBal)}
          </strong>
          {data.finalBal >= 0 ? " Dr" : " Cr"}
        </div>
      </div>

      {/* Print header */}
      <PrintHeader customer={data.customer} tillDate={data.tillDate} />

      {/* Customer details */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 32px",
          fontSize: 13,
          marginBottom: 16,
          borderBottom: "1px solid #ddd",
          paddingBottom: 10,
        }}
      >
        {[
          ["Address", data.customer?.address || "—"],
          ["Mobile", data.customer?.mobileNumber || "—"],
        ].map(([l, v]) => (
          <div key={l}>
            <span style={{ color: "#6b7280" }}>{l}: </span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>

      {/* Ledger table */}
      {data.ledger.length === 0 ? (
        <EmptyLedger />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ background: "#374151", color: "#fff" }}>
                {[
                  "#",
                  "Date",
                  "Type",
                  "Particular",
                  "Bags/Wt.",
                  "Dr ₹",
                  "Cr ₹",
                  "Balance ₹",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 10px",
                      textAlign: [
                        "Dr ₹",
                        "Cr ₹",
                        "Balance ₹",
                        "Bags/Wt.",
                      ].includes(h)
                        ? "right"
                        : "left",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRight: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.ledger.map((line, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? "#fff" : "#f8fafc",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <td
                    style={{
                      padding: "7px 10px",
                      color: "#94a3b8",
                      fontSize: 12,
                    }}
                  >
                    {i + 1}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      whiteSpace: "nowrap",
                      color: "#374151",
                    }}
                  >
                    {line.dateStr}
                  </td>
                  <td style={{ padding: "7px 10px" }}>
                    <TypeBadge type={line.type} />
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      color: "#374151",
                      maxWidth: 280,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {line.particular}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      color: "#6b7280",
                    }}
                  >
                    {line.bags || line.weight
                      ? (line.bags || line.weight).toLocaleString("en-IN")
                      : "—"}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: line.drAmt > 0 ? 600 : 400,
                      color: line.drAmt > 0 ? "#b91c1c" : "#94a3b8",
                    }}
                  >
                    {line.drAmt > 0 ? fmt(line.drAmt) : "—"}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: line.crAmt > 0 ? 600 : 400,
                      color: line.crAmt > 0 ? "#15803d" : "#94a3b8",
                    }}
                  >
                    {line.crAmt > 0 ? fmt(line.crAmt) : "—"}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: line.balance >= 0 ? "#b91c1c" : "#15803d",
                    }}
                  >
                    {fmt(line.balance)}
                    {line.balance >= 0 ? " Dr" : " Cr"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  background: "#f8fafc",
                  fontWeight: 700,
                  borderTop: "2px solid #374151",
                }}
              >
                <td colSpan={5} style={{ padding: "9px 10px", fontSize: 13 }}>
                  Total
                </td>
                <td
                  style={{
                    padding: "9px 10px",
                    textAlign: "right",
                    fontSize: 14,
                    color: "#b91c1c",
                  }}
                >
                  {fmt(data.totalDr)}
                </td>
                <td
                  style={{
                    padding: "9px 10px",
                    textAlign: "right",
                    fontSize: 14,
                    color: "#15803d",
                  }}
                >
                  {fmt(data.totalCr)}
                </td>
                <td
                  style={{
                    padding: "9px 10px",
                    textAlign: "right",
                    fontSize: 15,
                    fontWeight: 700,
                    color: data.finalBal >= 0 ? "#b91c1c" : "#15803d",
                  }}
                >
                  {fmt(data.finalBal)}
                  {data.finalBal >= 0 ? " Dr" : " Cr"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Print footer */}
      <div
        style={{
          marginTop: 40,
          fontSize: 11,
          color: "#94a3b8",
          borderTop: "1px solid #e5e7eb",
          paddingTop: 12,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Generated: {new Date().toLocaleString("en-IN")}</span>
        <span>
          {data.customer?.name} · Detail Ledger till {data.tillDate}
        </span>
      </div>

      {/* Signature block */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 32,
          marginTop: 48,
        }}
      >
        {["Prepared By", "Authorised Signatory", "Party Acknowledgement"].map(
          (l) => (
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
          ),
        )}
      </div>
    </div>
  );
}
