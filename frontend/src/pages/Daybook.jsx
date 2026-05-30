// frontend/src/pages/DayBook.jsx

import { useState, useEffect } from "react";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");
const get = (p) =>
  fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${tok()}` } }).then(
    (r) => r.json(),
  );
const fmt = (n) =>
  (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

export default function DayBook() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({
    inward: 0,
    outward: 0,
    amount: 0,
    vouchers: 0,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [inwards, outwards, vouchers] = await Promise.all([
        get(`/inward/register?from=${date}&to=${date}`),
        get(`/outward/register?from=${date}&to=${date}`),
        get(`/vouchers?from=${date}&to=${date}`),
      ]);

      const rows = [
        ...inwards.map((e) => ({
          time: new Date(e.inwardDate).toLocaleTimeString("en-IN"),
          type: "Inward",
          ref: String(e.csrNo),
          party: e.customer?.name || "—",
          detail: `${e.variety?.name || "—"} · Lot: ${e.lot?.lotCode || "—"}`,
          bags: e.totalWeight || 0,
          drAmt: 0,
          crAmt: 0,
          sort: new Date(e.inwardDate).getTime(),
        })),
        ...outwards.map((e) => ({
          time: new Date(e.outwardDate).toLocaleTimeString("en-IN"),
          type: "Bill",
          ref: e.outwardNo,
          party: e.customer?.name || "—",
          detail: `Rent A/C · Lot: ${e.inward?.lot?.lotCode || "—"}`,
          bags: e.bagsOut || 0,
          drAmt: e.totalAmount || 0,
          crAmt: 0,
          sort: new Date(e.outwardDate).getTime() + 1,
        })),
        ...vouchers.map((v) => ({
          time: new Date(v.voucherDate).toLocaleTimeString("en-IN"),
          type: "Receipt",
          ref: v.voucherNo,
          party: v.customer?.name || "—",
          detail: `${v.paymentMode} ${v.referenceNo ? `· Ref: ${v.referenceNo}` : ""}`,
          bags: 0,
          drAmt: 0,
          crAmt: v.amount || 0,
          sort: new Date(v.voucherDate).getTime() + 2,
        })),
      ].sort((a, b) => a.sort - b.sort);

      setEntries(rows);
      setTotals({
        inward: inwards.length,
        outward: outwards.length,
        amount: outwards.reduce((s, e) => s + (e.totalAmount || 0), 0),
        vouchers: vouchers.reduce((s, v) => s + (v.amount || 0), 0),
      });
    } catch (error) {
      console.error("Failed to load day book data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const initLoad = async () => {
      await load();
    };
    initLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const typeColor = (t) =>
    t === "Inward"
      ? { bg: "#eff6ff", c: "#1d4ed8" }
      : t === "Bill"
        ? { bg: "#fef3c7", c: "#b45309" }
        : { bg: "#dcfce7", c: "#15803d" };

  return (
    <Layout>
      <style>{`@media print{nav,aside,header,.no-print{display:none!important}}`}</style>
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
          Day Book
        </div>

        {/* Date selector + summary */}
        <div
          style={{
            padding: "14px 20px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Date:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                padding: "7px 12px",
                fontSize: 13,
                borderRadius: 6,
                outline: "none",
                background: "#fffde7",
                fontWeight: 600,
                border: "1.5px solid #f9a825",
              }}
            />
            <button
              onClick={load}
              style={{
                background: "#00897B",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 18px",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
            {[
              ["Inward", totals.inward, "#2563eb"],
              ["Outward", totals.outward, "#b45309"],
              ["Dr Amount", `₹${fmt(totals.amount)}`, "#b91c1c"],
              ["Cr Amount", `₹${fmt(totals.vouchers)}`, "#15803d"],
            ].map(([l, v, c]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: c }}>
                  {v}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{l}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="no-print"
            style={{
              background: "#374151",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            🖨️ Print
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
            Loading day book…
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
            <div style={{ color: "#94a3b8" }}>
              No entries on {new Date(date).toLocaleDateString("en-IN")}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
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
                    "#",
                    "Type",
                    "Reference",
                    "Party",
                    "Details",
                    "Bags/Wt.",
                    "Dr ₹",
                    "Cr ₹",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 10px",
                        textAlign: ["Dr ₹", "Cr ₹", "Bags/Wt."].includes(h)
                          ? "right"
                          : "left",
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const tc = typeColor(e.type);
                  return (
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
                      <td style={{ padding: "7px 10px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 3,
                            background: tc.bg,
                            color: tc.c,
                          }}
                        >
                          {e.type}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          fontWeight: 500,
                          color: "#2563eb",
                        }}
                      >
                        {e.ref}
                      </td>
                      <td style={{ padding: "7px 10px", fontWeight: 500 }}>
                        {e.party}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          color: "#6b7280",
                          fontSize: 12,
                        }}
                      >
                        {e.detail}
                      </td>
                      <td style={{ padding: "7px 10px", textAlign: "right" }}>
                        {e.bags > 0 ? e.bags.toLocaleString("en-IN") : "—"}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          textAlign: "right",
                          color: e.drAmt > 0 ? "#b91c1c" : "#94a3b8",
                          fontWeight: e.drAmt > 0 ? 600 : 400,
                        }}
                      >
                        {e.drAmt > 0 ? fmt(e.drAmt) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          textAlign: "right",
                          color: e.crAmt > 0 ? "#15803d" : "#94a3b8",
                          fontWeight: e.crAmt > 0 ? 600 : 400,
                        }}
                      >
                        {e.crAmt > 0 ? fmt(e.crAmt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    background: "#f8fafc",
                    fontWeight: 700,
                    borderTop: "2px solid #e2e8f0",
                  }}
                >
                  <td colSpan={6} style={{ padding: "8px 10px", fontSize: 13 }}>
                    Total — {entries.length} entries
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "right",
                      color: "#b91c1c",
                      fontSize: 13,
                    }}
                  >
                    {fmt(totals.amount)}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "right",
                      color: "#15803d",
                      fontSize: 13,
                    }}
                  >
                    {fmt(totals.vouchers)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
