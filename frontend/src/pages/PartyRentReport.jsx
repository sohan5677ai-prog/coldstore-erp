// frontend/src/pages/PartyRentReport.jsx

import { useState as uSR, useEffect as uER } from "react";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";

export default function PartyRentReport() {
  const [data, setData] = uSR([]);
  const [loading, setLoading] = uSR(true);
  const [asOf, setAsOf] = uSR(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = uSR("");

  const tk = () => localStorage.getItem("token");
  const fmtR = (n) =>
    (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/stock`, {
        headers: { Authorization: `Bearer ${tk()}` },
      });
      const stock = await r.json();
      const asOfDate = new Date(asOf);

      // Group by customer, calculate accrued rent
      const map = {};
      stock.forEach((e) => {
        const id = e.customerId || e.customer?.id;
        if (!map[id])
          map[id] = {
            id,
            name: e.customer?.name || "—",
            partyCode: e.customer?.partyCode || "—",
            city: e.customer?.city || "—",
            lots: 0,
            totalBags: 0,
            accrued: 0,
          };
        const days = Math.max(
          1,
          Math.ceil((asOfDate - new Date(e.inwardDate)) / 86400000),
        );
        const bags = e.totalWeight || 0;
        const rate = e.variety?.storageRate || 0;
        const rent = bags * rate * (days / 30);
        map[id].lots++;
        map[id].totalBags += bags;
        map[id].accrued += rent;
      });

      setData(Object.values(map).sort((a, b) => b.accrued - a.accrued));
    } catch (error) {
      console.error("Failed to load rent report data", error);
    }
    setLoading(false);
  };

  uER(() => {
    const initLoad = async () => {
      await load();
    };
    initLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOf]);

  const filtered = data.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.partyCode || "").toLowerCase().includes(search.toLowerCase()),
  );
  const totalRent = filtered.reduce((s, d) => s + d.accrued, 0);

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
          Party Rent Report
        </div>

        {/* Filters */}
        <div
          style={{
            padding: "14px 16px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              As of:
            </label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
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
                padding: "8px 16px",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party…"
            style={{
              padding: "7px 10px",
              fontSize: 13,
              border: "1px solid #d1d5db",
              borderRadius: 5,
              outline: "none",
              width: 220,
            }}
          />
          <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#b91c1c" }}>
                ₹{fmtR(totalRent)}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                Total Accrued Rent
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#2563eb" }}>
                {filtered.length}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Parties</div>
            </div>
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
            Calculating rent…
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
                    "Party Code",
                    "Party Name",
                    "City",
                    "Active Lots",
                    "Total Bags",
                    "Accrued Rent ₹",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 10px",
                        textAlign: [
                          "Active Lots",
                          "Total Bags",
                          "Accrued Rent ₹",
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
                    key={d.id}
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
                        color: "#2563eb",
                        fontWeight: 500,
                      }}
                    >
                      {d.partyCode}
                    </td>
                    <td style={{ padding: "7px 10px", fontWeight: 500 }}>
                      {d.name}
                    </td>
                    <td style={{ padding: "7px 10px", color: "#6b7280" }}>
                      {d.city}
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
                    <td style={{ padding: "7px 10px", textAlign: "right" }}>
                      {d.totalBags.toLocaleString("en-IN", {
                        minimumFractionDigits: 3,
                      })}
                    </td>
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#b91c1c",
                        fontSize: 14,
                      }}
                    >
                      ₹{fmtR(d.accrued)}
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
                  <td colSpan={4} style={{ padding: "8px 10px", fontSize: 13 }}>
                    Total ({filtered.length} parties)
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                    {filtered.reduce((s, d) => s + d.lots, 0)}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                    {filtered
                      .reduce((s, d) => s + d.totalBags, 0)
                      .toLocaleString("en-IN", { minimumFractionDigits: 3 })}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "right",
                      color: "#b91c1c",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    ₹{fmtR(totalRent)}
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
