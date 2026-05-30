// frontend/src/pages/Dashboard.jsx
// Full dashboard matching SVCold — stats, charts, recent activity

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");
const get = (p) =>
  fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${tok()}` } }).then(
    (r) => r.json(),
  );

const fmt = (n) => (n || 0).toLocaleString("en-IN");
const fmtR = (n) =>
  (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const CHAMBER_COLORS = ["#2563eb", "#16a34a", "#f59e0b"];

function StatCard({ icon, label, value, sub, color = "#2563eb" }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "16px 20px",
        borderTop: `3px solid ${color}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span
          style={{
            fontSize: 11,
            color: "#94a3b8",
            background: "#f8fafc",
            padding: "2px 8px",
            borderRadius: 4,
          }}
        >
          {sub}
        </span>
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "#1e293b",
          letterSpacing: -0.5,
          marginBottom: 3,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("inventory"); // inventory | accounting | customer

  useEffect(() => {
    get("/dashboard")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <Layout>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 400,
            color: "#94a3b8",
            fontSize: 14,
          }}
        >
          <div>
            <div
              style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}
            >
              📊
            </div>
            Loading dashboard…
          </div>
        </div>
      </Layout>
    );

  const s = data?.stats || {};

  return (
    <Layout>
      {/* ── 3 sub-dashboards ── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px 10px 0 0",
          padding: "12px 20px",
          display: "flex",
          gap: 10,
          marginBottom: 0,
        }}
      >
        {[
          ["inventory", "📦 Inventory Dashboard"],
          ["accounting", "💰 Accounting Dashboard"],
          ["customer", "👥 Customer Dashboard"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              background: tab === k ? "#eff6ff" : "transparent",
              color: tab === k ? "#2563eb" : "#374151",
              border: `1px solid ${tab === k ? "#bfdbfe" : "#e2e8f0"}`,
              borderRadius: 8,
              padding: "7px 18px",
              fontWeight: tab === k ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ── INVENTORY DASHBOARD ── */}
      {tab === "inventory" && (
        <div
          style={{
            background: "#f0f4f8",
            padding: 20,
            borderRadius: "0 0 10px 10px",
            border: "1px solid #e2e8f0",
            borderTop: "none",
          }}
        >
          {/* Stat cards row 1 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard
              icon="📦"
              label="Active Lots in Storage"
              value={fmt(s.activeStock)}
              sub="current"
              color="#2563eb"
            />
            <StatCard
              icon="⚖️"
              label="Total Bags in Storage"
              value={fmt(s.totalBagsInStorage)}
              sub="bags/wt"
              color="#16a34a"
            />
            <StatCard
              icon="📍"
              label="Lots Occupied"
              value={`${fmt(s.lotsFilled)} / ${fmt(s.lotsTotal)}`}
              sub="lots"
              color="#f59e0b"
            />
            <StatCard
              icon="📥"
              label="This Month Inward"
              value={fmt(s.monthInward)}
              sub="entries"
              color="#8b5cf6"
            />
          </div>

          {/* Chamber utilization chart */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "3fr 2fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "16px 20px",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  marginBottom: 14,
                  color: "#1e293b",
                }}
              >
                Chamber-Wise Location Overview
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.chamberStats || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="chamberCode" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v, n) => [
                      fmt(v),
                      n === "filledInventory" ? "Occupied" : "Total",
                    ]}
                  />
                  <Legend
                    formatter={(n) =>
                      n === "filledInventory" ? "Filled" : "Total Capacity"
                    }
                  />
                  <Bar
                    dataKey="totalInventory"
                    fill="#bfdbfe"
                    name="totalInventory"
                  />
                  <Bar
                    dataKey="filledInventory"
                    fill="#2563eb"
                    name="filledInventory"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chamber cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(data?.chamberStats || []).map((ch, i) => (
                <div
                  key={ch.chamberCode}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "12px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#1e293b",
                      }}
                    >
                      Chamber {ch.chamberCode}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          ch.occupancyPct > 80
                            ? "#fee2e2"
                            : ch.occupancyPct > 50
                              ? "#fef3c7"
                              : "#dcfce7",
                        color:
                          ch.occupancyPct > 80
                            ? "#b91c1c"
                            : ch.occupancyPct > 50
                              ? "#b45309"
                              : "#15803d",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {ch.occupancyPct}% full
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "#f1f5f9",
                      borderRadius: 3,
                      overflow: "hidden",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: ch.occupancyPct + "%",
                        background: CHAMBER_COLORS[i] || "#2563eb",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 4,
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#2563eb" }}>
                        {fmt(ch.occupiedLots)}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 10 }}>
                        Occupied
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#16a34a" }}>
                        {fmt(ch.emptyLots)}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 10 }}>
                        Empty
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#374151" }}>
                        {fmt(ch.totalBags)}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 10 }}>Bags</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock overview by commodity */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
              Stock Overview — by Commodity
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.commodityStats || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v, n) => [
                    fmt(v),
                    n === "bags" ? "Total Bags" : "Lots",
                  ]}
                />
                <Bar dataKey="bags" name="bags" radius={[4, 4, 0, 0]}>
                  {(data?.commodityStats || []).map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        ["#2563eb", "#16a34a", "#f59e0b", "#8b5cf6", "#ef4444"][
                          i % 5
                        ]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ageing analysis */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 14,
            }}
          >
            {[
              ["< 30 days", data?.ageing?.under30 || 0, "#dcfce7", "#15803d"],
              ["30-60 days", data?.ageing?.d30to60 || 0, "#fef3c7", "#b45309"],
              ["60-90 days", data?.ageing?.d60to90 || 0, "#fed7aa", "#c2410c"],
              ["> 90 days", data?.ageing?.over90 || 0, "#fee2e2", "#b91c1c"],
            ].map(([l, v, bg, cl]) => (
              <div
                key={l}
                style={{
                  background: bg,
                  borderRadius: 10,
                  padding: "14px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 700, color: cl }}>
                  {fmt(v)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: cl,
                    marginTop: 4,
                    fontWeight: 500,
                  }}
                >
                  {l}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: cl,
                    opacity: 0.7,
                    marginTop: 2,
                  }}
                >
                  lots ageing
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ACCOUNTING DASHBOARD ── */}
      {tab === "accounting" && (
        <div
          style={{
            background: "#f0f4f8",
            padding: 20,
            borderRadius: "0 0 10px 10px",
            border: "1px solid #e2e8f0",
            borderTop: "none",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard
              icon="💰"
              label="This Month Revenue"
              color="#16a34a"
              value={`₹${fmtR(data?.monthlyRevenue?.[5]?.revenue || 0)}`}
              sub={data?.monthlyRevenue?.[5]?.month || ""}
            />
            <StatCard
              icon="📤"
              label="This Month Outward"
              color="#2563eb"
              value={fmt(s.monthOutward)}
              sub="entries"
            />
            <StatCard
              icon="📊"
              label="Total Revenue (6mo)"
              color="#8b5cf6"
              value={`₹${fmtR((data?.monthlyRevenue || []).reduce((s, m) => s + m.revenue, 0))}`}
              sub="6 months"
            />
            <StatCard
              icon="🏷️"
              label="Avg Revenue / Entry"
              color="#f59e0b"
              value={`₹${fmtR(
                s.monthOutward > 0
                  ? (data?.monthlyRevenue?.[5]?.revenue || 0) /
                      (s.monthOutward || 1)
                  : 0,
              )}`}
              sub="this month"
            />
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
              Monthly Revenue — Last 6 Months
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data?.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v) => [`₹${fmtR(v)}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent outward */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "16px 20px",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
              Recent Outward Entries
            </div>
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
                    "Variety",
                    "Lot",
                    "Bags",
                    "Amount ₹",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "7px 10px",
                        textAlign: h === "Amount ₹" ? "right" : "left",
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
                {(data?.recentOutward || []).map((e, i) => (
                  <tr
                    key={e.id}
                    style={{
                      background: i % 2 === 0 ? "#fff" : "#f8fafc",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <td
                      style={{
                        padding: "6px 10px",
                        color: "#2563eb",
                        fontWeight: 500,
                      }}
                    >
                      {e.outwardNo}
                    </td>
                    <td
                      style={{
                        padding: "6px 10px",
                        color: "#6b7280",
                        fontSize: 12,
                      }}
                    >
                      {new Date(e.date).toLocaleDateString("en-IN")}
                    </td>
                    <td style={{ padding: "6px 10px", fontWeight: 500 }}>
                      {e.customerName}
                    </td>
                    <td style={{ padding: "6px 10px", color: "#6b7280" }}>
                      {e.varietyName || "—"}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
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
                        {e.lotCode || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "6px 10px" }}>{fmt(e.bagsOut)}</td>
                    <td
                      style={{
                        padding: "6px 10px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: "#15803d",
                      }}
                    >
                      ₹{fmtR(e.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CUSTOMER DASHBOARD ── */}
      {tab === "customer" && (
        <div
          style={{
            background: "#f0f4f8",
            padding: 20,
            borderRadius: "0 0 10px 10px",
            border: "1px solid #e2e8f0",
            borderTop: "none",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard
              icon="👥"
              label="Total Customers"
              value={fmt(s.totalCustomers)}
              sub="registered"
              color="#2563eb"
            />
            <StatCard
              icon="📥"
              label="Total Inward Entries"
              value={fmt(s.totalInward)}
              sub="all time"
              color="#16a34a"
            />
            <StatCard
              icon="📤"
              label="Total Outward Entries"
              value={fmt(s.totalOutward)}
              sub="all time"
              color="#f59e0b"
            />
            <StatCard
              icon="📦"
              label="Active Lots"
              value={fmt(s.activeStock)}
              sub="in storage"
              color="#8b5cf6"
            />
          </div>

          {/* Recent inward */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "16px 20px",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
              Recent Inward Entries
            </div>
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
                    "CSR No",
                    "Date",
                    "Party",
                    "Variety",
                    "Lot",
                    "Bags",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "7px 10px",
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
                {(data?.recentInward || []).map((e, i) => (
                  <tr
                    key={e.id}
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
                      {e.csrNo}
                    </td>
                    <td
                      style={{
                        padding: "6px 10px",
                        color: "#6b7280",
                        fontSize: 12,
                      }}
                    >
                      {new Date(e.date).toLocaleDateString("en-IN")}
                    </td>
                    <td style={{ padding: "6px 10px", fontWeight: 500 }}>
                      {e.customerName}
                    </td>
                    <td style={{ padding: "6px 10px", color: "#6b7280" }}>
                      {e.varietyName || "—"}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
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
                        {e.lotCode || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      {fmt(e.totalWeight)}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "2px 7px",
                          borderRadius: 3,
                          background:
                            e.status === "active" ? "#dcfce7" : "#f3f4f6",
                          color: e.status === "active" ? "#15803d" : "#6b7280",
                        }}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
