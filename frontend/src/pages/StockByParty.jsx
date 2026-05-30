// frontend/src/pages/StockByParty.jsx

import { useState as uSP, useEffect as uEP } from "react";
import { useNavigate as uNav } from "react-router-dom";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";

export default function StockByParty() {
  const navigate = uNav();
  const [data, setData] = uSP([]);
  const [loading, setLoading] = uSP(true);
  const [search, setSearch] = uSP("");
  const [expanded, setExpanded] = uSP({});

  const tk = () => localStorage.getItem("token");

  uEP(() => {
    const fetchStock = async () => {
      try {
        const r = await fetch(`${API}/stock`, {
          headers: { Authorization: `Bearer ${tk()}` },
        });
        const entries = await r.json();

        const map = {};
        entries.forEach((e) => {
          const id = e.customerId || e.customer?.id;
          const nm = e.customer?.name || "Unknown";
          const pc = e.customer?.partyCode || "";
          if (!map[id])
            map[id] = {
              id,
              name: nm,
              partyCode: pc,
              lots: [],
              totalBags: 0,
              totalWeight: 0,
            };
          map[id].lots.push(e);
          // Sum bags from packetEntries; weight from totalWeight
          const entryBags = (e.packetEntries || []).reduce(
            (s, p) => s + (p.quantity || 0),
            0,
          );
          map[id].totalBags += entryBags || e.remainingQty || 0;
          map[id].totalWeight += e.totalWeight || 0;
        });
        setData(
          Object.values(map).sort((a, b) => b.totalWeight - a.totalWeight),
        );
      } catch (error) {
        console.error("Failed to load party stock", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, []);

  const filtered = data.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.partyCode || "").toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

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
          Stock By Party
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
            placeholder="Search party name or code…"
            style={{
              padding: "7px 10px",
              fontSize: 13,
              border: "1px solid #d1d5db",
              borderRadius: 5,
              outline: "none",
              width: 300,
            }}
          />
          <div style={{ marginLeft: "auto", fontSize: 13, color: "#6b7280" }}>
            {filtered.length} parties with active stock
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
            <div style={{ color: "#94a3b8" }}>No active stock entries</div>
          </div>
        ) : (
          <div>
            {filtered.map((party, i) => (
              <div key={party.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                {/* Party row */}
                <div
                  onClick={() => toggle(party.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
                    background: i % 2 === 0 ? "#fff" : "#fafafa",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#eff6ff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      i % 2 === 0 ? "#fff" : "#fafafa")
                  }
                >
                  <span style={{ fontSize: 12, color: "#94a3b8", width: 20 }}>
                    {expanded[party.id] ? "▼" : "▶"}
                  </span>
                  <span
                    style={{
                      color: "#2563eb",
                      fontWeight: 500,
                      width: 80,
                      fontSize: 13,
                    }}
                  >
                    {party.partyCode}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
                    {party.name}
                  </span>
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 4,
                    }}
                  >
                    {party.lots.length} lots
                  </span>
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {Math.round(party.totalBags).toLocaleString("en-IN")} bags
                  </span>
                  <span
                    style={{
                      background: "#f0fdf4",
                      color: "#15803d",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {party.totalWeight.toLocaleString("en-IN", {
                      minimumFractionDigits: 3,
                    })}{" "}
                    KG
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/report/party-ledger/${party.id}`);
                    }}
                    style={{
                      background: "#00897B",
                      color: "#fff",
                      border: "none",
                      borderRadius: 5,
                      padding: "4px 12px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    View Ledger
                  </button>
                </div>

                {/* Expanded lots */}
                {expanded[party.id] && (
                  <div
                    style={{
                      background: "#f0f9ff",
                      borderTop: "1px solid #dbeafe",
                      borderBottom: "1px solid #dbeafe",
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
                        <tr style={{ background: "#dbeafe" }}>
                          {[
                            "CSR No",
                            "Lot",
                            "Commodity",
                            "Variety",
                            "No. of Bags",
                            "Total Wt (KG)",
                            "Inward Date",
                            "Days",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "6px 16px",
                                textAlign: "left",
                                fontWeight: 600,
                                color: "#1e40af",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {party.lots.map((e) => {
                          const days = Math.ceil(
                            (new Date() - new Date(e.inwardDate)) / 86400000,
                          );
                          return (
                            <tr
                              key={e.id}
                              style={{ borderBottom: "1px solid #e0f2fe" }}
                            >
                              <td
                                style={{
                                  padding: "6px 16px",
                                  color: "#2563eb",
                                  fontWeight: 500,
                                }}
                              >
                                {e.csrNo}
                              </td>
                              <td style={{ padding: "6px 16px" }}>
                                <span
                                  style={{
                                    background: "#2563eb",
                                    color: "#fff",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: "1px 6px",
                                    borderRadius: 3,
                                  }}
                                >
                                  {e.lot?.lotCode || "—"}
                                </span>
                              </td>
                              <td style={{ padding: "6px 16px" }}>
                                {e.variety?.commodity?.name || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "6px 16px",
                                  color: "#374151",
                                }}
                              >
                                {e.variety?.name || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "6px 16px",
                                  fontWeight: 600,
                                  color: "#1d4ed8",
                                }}
                              >
                                {(e.packetEntries || []).reduce(
                                  (s, p) => s + (p.quantity || 0),
                                  0,
                                ) ||
                                  e.remainingQty ||
                                  "—"}
                              </td>
                              <td
                                style={{
                                  padding: "6px 16px",
                                  fontWeight: 600,
                                  color: "#15803d",
                                }}
                              >
                                {e.totalWeight
                                  ? e.totalWeight.toLocaleString("en-IN", {
                                      minimumFractionDigits: 3,
                                    })
                                  : "—"}
                              </td>
                              <td
                                style={{
                                  padding: "6px 16px",
                                  color: "#6b7280",
                                }}
                              >
                                {new Date(e.inwardDate).toLocaleDateString(
                                  "en-IN",
                                )}
                              </td>
                              <td style={{ padding: "6px 16px" }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: "1px 6px",
                                    borderRadius: 3,
                                    background:
                                      days > 90
                                        ? "#fee2e2"
                                        : days > 60
                                          ? "#fef3c7"
                                          : "#dcfce7",
                                    color:
                                      days > 90
                                        ? "#b91c1c"
                                        : days > 60
                                          ? "#b45309"
                                          : "#15803d",
                                  }}
                                >
                                  {days}d
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
