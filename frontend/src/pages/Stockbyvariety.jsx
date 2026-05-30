// frontend/src/pages/StockByVariety.jsx

import { useState as uSV, useEffect as uEV } from "react";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";

export default function StockByVariety() {
  const [data, setData] = uSV([]);
  const [loading, setLoading] = uSV(true);
  const [search, setSearch] = uSV("");

  const tk = () => localStorage.getItem("token");

  uEV(() => {
    const fetchStock = async () => {
      try {
        const r = await fetch(`${API}/stock`, {
          headers: { Authorization: `Bearer ${tk()}` },
        });
        const entries = await r.json();

        const map = {};
        entries.forEach((e) => {
          const key = `${e.variety?.commodity?.name || "Unknown"}__${e.variety?.name || "Unknown"}`;
          if (!map[key])
            map[key] = {
              commodity: e.variety?.commodity?.name || "Unknown",
              variety: e.variety?.name || "Unknown",
              lots: 0,
              totalBags: 0,
              oldestDate: null,
            };
          map[key].lots++;
          map[key].totalBags += e.totalWeight || 0;
          const d = new Date(e.inwardDate);
          if (!map[key].oldestDate || d < map[key].oldestDate)
            map[key].oldestDate = d;
        });
        setData(Object.values(map).sort((a, b) => b.totalBags - a.totalBags));
      } catch (error) {
        console.error("Failed to load stock data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, []);

  const filtered = data.filter(
    (d) =>
      d.variety.toLowerCase().includes(search.toLowerCase()) ||
      d.commodity.toLowerCase().includes(search.toLowerCase()),
  );
  const totalBags = filtered.reduce((s, d) => s + d.totalBags, 0);
  const totalLots = filtered.reduce((s, d) => s + d.lots, 0);

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
          Stock By Variety
        </div>
        <div
          style={{
            padding: "14px 16px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commodity or variety…"
            style={{
              padding: "7px 10px",
              fontSize: 13,
              border: "1px solid #d1d5db",
              borderRadius: 5,
              outline: "none",
              width: 280,
            }}
          />
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 20,
              fontSize: 13,
            }}
          >
            <span style={{ color: "#6b7280" }}>
              Varieties: <strong>{filtered.length}</strong>
            </span>
            <span style={{ color: "#2563eb", fontWeight: 600 }}>
              Total Bags: {totalBags.toLocaleString("en-IN")}
            </span>
            <span style={{ color: "#374151" }}>Total Lots: {totalLots}</span>
          </div>
          <button
            onClick={() => window.print()}
            className="no-print"
            style={{
              background: "#374151",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "7px 14px",
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
            Loading…
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
                    "Commodity",
                    "Variety",
                    "Active Lots",
                    "Total Bags / Wt.",
                    "Oldest Inward",
                    "Avg Bags/Lot",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 10px",
                        textAlign: [
                          "Active Lots",
                          "Total Bags / Wt.",
                          "Avg Bags/Lot",
                        ].includes(h)
                          ? "right"
                          : "left",
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
                {filtered.map((d, i) => (
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
                    <td style={{ padding: "7px 10px", fontWeight: 500 }}>
                      {d.commodity}
                    </td>
                    <td style={{ padding: "7px 10px", color: "#2563eb" }}>
                      {d.variety}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {d.lots}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: "#2563eb",
                      }}
                    >
                      {d.totalBags.toLocaleString("en-IN", {
                        minimumFractionDigits: 3,
                      })}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        color: "#6b7280",
                        fontSize: 12,
                      }}
                    >
                      {d.oldestDate
                        ? d.oldestDate.toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        color: "#6b7280",
                      }}
                    >
                      {d.lots > 0 ? (d.totalBags / d.lots).toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    background: "#f8fafc",
                    fontWeight: 700,
                    borderTop: "2px solid #e2e8f0",
                  }}
                >
                  <td colSpan={3} style={{ padding: "8px 10px", fontSize: 13 }}>
                    Total ({filtered.length} varieties)
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "right",
                      color: "#374151",
                    }}
                  >
                    {totalLots}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "right",
                      color: "#2563eb",
                      fontWeight: 700,
                    }}
                  >
                    {totalBags.toLocaleString("en-IN", {
                      minimumFractionDigits: 3,
                    })}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
