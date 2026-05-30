import { useState as uS, useEffect as uE } from "react";
import Layout from "../components/Layout";

export function StockStatus() {
  const [stock, setStock] = uS([]);
  const [chambers, setChambers] = uS([]);
  const [selCh, setSelCh] = uS("ALL");
  const [search, setSearch] = uS("");
  const [loading, setLoading] = uS(true);

  const tok = () => localStorage.getItem("token");
  const get = async (path) => {
    const r = await fetch(`http://localhost:5000/api${path}`, {
      headers: { Authorization: `Bearer ${tok()}` },
    });
    return r.json();
  };

  uE(() => {
    Promise.all([get("/stock"), get("/stock/chambers")])
      .then(([s, c]) => {
        setStock(s);
        setChambers(c);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = stock.filter((e) => {
    const matchCh = selCh === "ALL" || e.lot?.chamber?.chamberCode === selCh;
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      e.customer?.name?.toLowerCase().includes(q) ||
      String(e.csrNo).includes(q) ||
      e.lot?.lotCode?.toLowerCase().includes(q) ||
      e.variety?.name?.toLowerCase().includes(q);
    return matchCh && matchQ;
  });

  const inpS = {
    padding: "7px 12px",
    fontSize: 13,
    border: "1.5px solid #d1d5db",
    borderRadius: 6,
    outline: "none",
  };

  return (
    <Layout>
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
            background: "#2563eb",
            color: "#fff",
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: 17,
          }}
        >
          Stock Status
        </div>

        {/* Chamber summary cards */}
        <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {/* All summary */}
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 10,
                padding: "12px 16px",
                cursor: "pointer",
                borderWidth: selCh === "ALL" ? 2 : 1,
                borderColor: selCh === "ALL" ? "#2563eb" : "#bfdbfe",
              }}
              onClick={() => setSelCh("ALL")}
            >
              <div style={{ fontWeight: 700, fontSize: 22, color: "#1d4ed8" }}>
                {stock.length}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                Total Active Lots
              </div>
            </div>

            {chambers.map((ch) => (
              <div
                key={ch.chamberCode}
                onClick={() => setSelCh(ch.chamberCode)}
                style={{
                  background: selCh === ch.chamberCode ? "#eff6ff" : "#f8fafc",
                  border: `${selCh === ch.chamberCode ? 2 : 1}px solid ${selCh === ch.chamberCode ? "#2563eb" : "#e2e8f0"}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#1e293b",
                    marginBottom: 4,
                  }}
                >
                  Chamber {ch.chamberCode}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 4,
                  }}
                >
                  {[
                    ["Occupied", ch.occupiedLots, "#2563eb"],
                    ["Empty", ch.emptyLots, "#22c55e"],
                    ["Total", ch.totalLots, "#6b7280"],
                    ["Bags", ch.totalBags, "#f59e0b"],
                  ].map(([lbl, val, clr]) => (
                    <div key={lbl}>
                      <div
                        style={{ fontSize: 15, fontWeight: 700, color: clr }}
                      >
                        {val}
                      </div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>
                        {lbl}
                      </div>
                    </div>
                  ))}
                </div>
                {/* occupancy bar */}
                <div
                  style={{
                    height: 4,
                    background: "#e2e8f0",
                    borderRadius: 2,
                    marginTop: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "#2563eb",
                      width: ch.occupancyPct + "%",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                  {ch.occupancyPct}% occupied
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lot / party / variety…"
              style={{ ...inpS, width: 300 }}
            />
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Showing {filtered.length} entries
            </span>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              color: "#94a3b8",
              fontSize: 15,
            }}
          >
            Loading stock…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <div style={{ color: "#94a3b8" }}>
              {search || selCh !== "ALL"
                ? "No entries match filters"
                : "No active stock entries"}
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
                    "CSR No",
                    "Party",
                    "Lot",
                    "Commodity/Variety",
                    "Inward Date",
                    "Bags",
                    "Days Stored",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontWeight: 600,
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const days = e.daysStored || 0;
                  const ageClr =
                    days > 90 ? "#b91c1c" : days > 60 ? "#b45309" : "#15803d";
                  const ageBg =
                    days > 90 ? "#fee2e2" : days > 60 ? "#fef3c7" : "#dcfce7";
                  return (
                    <tr
                      key={e.id}
                      style={{
                        background: i % 2 === 0 ? "#fff" : "#f8fafc",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                      onMouseEnter={(ev) =>
                        (ev.currentTarget.style.background = "#eff6ff")
                      }
                      onMouseLeave={(ev) =>
                        (ev.currentTarget.style.background =
                          i % 2 === 0 ? "#fff" : "#f8fafc")
                      }
                    >
                      <td
                        style={{
                          padding: "7px 10px",
                          fontWeight: 500,
                          color: "#2563eb",
                        }}
                      >
                        {e.csrNo}
                      </td>
                      <td style={{ padding: "7px 10px", fontWeight: 500 }}>
                        {e.customer?.name || "—"}
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {e.customer?.partyCode}
                        </div>
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        <span
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontWeight: 600,
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 4,
                          }}
                        >
                          {e.lot?.lotCode || "—"}
                        </span>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          Chamber {e.lot?.chamber?.chamberCode}
                        </div>
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        <div style={{ fontWeight: 500 }}>
                          {e.variety?.commodity?.name || "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {e.variety?.name || "—"}
                        </div>
                      </td>
                      <td style={{ padding: "7px 10px", color: "#6b7280" }}>
                        {new Date(e.inwardDate).toLocaleDateString("en-IN")}
                      </td>
                      <td style={{ padding: "7px 10px", fontWeight: 500 }}>
                        {e.totalWeight || "—"}
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        <span
                          style={{
                            fontSize: 12,
                            background: ageBg,
                            color: ageClr,
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontWeight: 500,
                          }}
                        >
                          {days}d
                        </span>
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            background: "#dcfce7",
                            color: "#15803d",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontWeight: 500,
                          }}
                        >
                          Active
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
    </Layout>
  );
}
export default StockStatus;
