import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok()}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

  const text = await r.text();
  let d;
  try {
    d = text ? JSON.parse(text) : {};
  } catch (e) {
    if (!r.ok) throw new Error(`Server Error: ${r.status}`, { cause: e });
    return {};
  }
  if (!r.ok) throw new Error(d.message || "Error");
  return d;
}

function useDebounce(v, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

const fyStart = () => {
  const n = new Date();
  const yr = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
  return `${yr}-04-01`;
};
const todayStr = () => new Date().toISOString().slice(0, 10);

const inp = {
  padding: "7px 10px",
  fontSize: 13,
  border: "1px solid #d1d5db",
  borderRadius: 5,
  outline: "none",
  width: "100%",
};
const btn = (bg = "#22c55e") => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 5,
  padding: "8px 22px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
});

import {
  exportToExcel,
  exportToPDF,
  OUTWARD_COLUMNS,
} from "../utils/exportUtils";

export default function OutwardRegister() {
  const [filters, setFilters] = useState({
    from: fyStart(),
    to: todayStr(),
    partyId: "",
    vehicle: "",
  });

  const [customers, setCustomers] = useState([]);
  const [partySearch, setPartySearch] = useState("");
  const [partyDrop, setPartyDrop] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const debParty = useDebounce(partySearch, 250);
  const dropRef = useRef();

  useEffect(() => {
    const loadCust = async () => {
      await Promise.resolve();
      try {
        const d = await apiFetch("/customers");
        setCustomers(d);
      } catch (e) {
        console.error(e);
      }
    };
    loadCust();
  }, []);

  useEffect(() => {
    const initSearch = async () => {
      await Promise.resolve();
      setLoading(true);
      setError("");
      try {
        const p = new URLSearchParams();
        p.set("from", fyStart());
        p.set("to", todayStr());
        const data = await apiFetch(`/outward/register?${p.toString()}`);
        setRows(data);
        setSearched(true);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    };
    initSearch();
  }, []);

  useEffect(() => {
    const filter = async () => {
      await Promise.resolve();
      if (!debParty.trim()) {
        setPartyDrop([]);
        return;
      }
      const q = debParty.toLowerCase();
      setPartyDrop(
        customers
          .filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              (c.partyCode || "").toLowerCase().includes(q),
          )
          .slice(0, 10),
      );
    };
    filter();
  }, [debParty, customers]);

  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setPartyDrop([]);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const setF = useCallback((k, v) => setFilters((f) => ({ ...f, [k]: v })), []);

  const pickParty = (c) => {
    setF("partyId", String(c.id));
    setPartySearch(`${c.name}`);
    setPartyDrop([]);
  };

  const doSearch = async () => {
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const p = new URLSearchParams();
      if (filters.from) p.set("from", filters.from);
      if (filters.to) p.set("to", filters.to);
      if (filters.partyId) p.set("partyId", filters.partyId);
      const data = await apiFetch(`/outward/register?${p.toString()}`);
      setRows(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const doReset = () => {
    setFilters({ from: fyStart(), to: todayStr(), partyId: "", vehicle: "" });
    setPartySearch("");
    setPartyDrop([]);
    setRows([]);
    setSearched(false);
    setError("");
  };

  const fmtN = (n) =>
    (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const fmtDt = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
  const cell = (extra = {}) => ({
    padding: "8px 10px",
    fontSize: 12,
    whiteSpace: "nowrap",
    borderBottom: "1px solid #f1f5f9",
    ...extra,
  });

  // 🛡️ Explicitly rendering ONLY the exact 26 requested columns
  const cols = [
    "Edit",
    "Payment_Mode",
    "BillNo",
    "OutNo",
    "OutwardDate",
    "Marka",
    "Vehicle",
    "Name",
    "Village",
    "UniqueNo",
    "DeliverTo",
    "Commodity",
    "PId",
    "InwardNo",
    "InwDate",
    "Rent",
    "CGSTAmt",
    "SGSTAmt",
    "IGSTAmt",
    "TRent",
    "AvgWt",
    "Type",
    "Location",
    "Variety",
    "Quantity",
    "Weight",
  ];

  // This calculation is now correctly utilized in the Summary and Footer sections below
  const totalRent = rows.reduce((s, r) => s + (parseFloat(r.tRent) || 0), 0);

  return (
    <Layout>
      <div
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          background: "#fff",
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
          Date Wise Outward Detail
        </div>

        <div
          style={{
            padding: "20px 24px",
            margin: "16px",
            background: "#f8fafc",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 155px auto 155px auto 1fr auto 1fr",
              gap: "10px 12px",
              alignItems: "center",
            }}
          >
            <label style={{ fontSize: 13, fontWeight: 600 }}>From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setF("from", e.target.value)}
              style={inp}
            />
            <label style={{ fontSize: 13, fontWeight: 600 }}>To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setF("to", e.target.value)}
              style={inp}
            />
            <label style={{ fontSize: 13, fontWeight: 600 }}>Party</label>
            <div style={{ position: "relative" }} ref={dropRef}>
              <input
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  if (filters.partyId) setF("partyId", "");
                }}
                placeholder="Search Party..."
                style={inp}
              />
              {partyDrop.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    zIndex: 100,
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  {partyDrop.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => pickParty(c)}
                      style={{
                        padding: "8px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={doSearch} disabled={loading} style={btn()}>
              Search
            </button>
            <button onClick={doReset} style={btn("#0ea5e9")}>
              Reset
            </button>
            <button
              onClick={() =>
                exportToExcel(rows, OUTWARD_COLUMNS, "Outward_Register")
              }
              disabled={rows.length === 0}
              style={btn(rows.length > 0 ? "#0f9d58" : "#94a3b8")}
            >
              📊 Excel
            </button>
            <button
              onClick={() =>
                exportToPDF(
                  rows,
                  OUTWARD_COLUMNS,
                  "Outward Register",
                  `From: ${filters?.from || "—"}  To: ${filters?.to || "—"}`,
                )
              }
              disabled={rows.length === 0}
              style={btn(rows.length > 0 ? "#dc2626" : "#94a3b8")}
            >
              📄 PDF
            </button>
            <button onClick={() => window.print()} style={btn("#374151")}>
              🖨️ Print
            </button>
          </div>
        </div>

        {/* 🛡️ Renders the error banner so 'error' is not unused */}
        {error && (
          <div
            style={{
              margin: "0 16px 12px",
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 6,
              fontSize: 13,
              color: "#b91c1c",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {searched && !loading && (
          <div style={{ padding: "0 16px 20px" }}>
            {/* 🛡️ Renders the summary bar so 'totalRent' is not unused */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "#374151",
                  display: "flex",
                  gap: 16,
                }}
              >
                <span>
                  <strong>{rows.length}</strong> entries found
                </span>
                {rows.length > 0 && (
                  <span>
                    Total Rent Generated:{" "}
                    <strong style={{ color: "#15803d" }}>
                      ₹{fmtN(totalRent)}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                overflowX: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
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
                    {cols.map((c) => (
                      <th
                        key={c}
                        style={{
                          padding: "10px",
                          textAlign: "left",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={26}
                        style={{
                          padding: "24px",
                          textAlign: "center",
                          color: "#94a3b8",
                        }}
                      >
                        No outward records found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, i) => (
                      <tr
                        key={i}
                        style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}
                      >
                        <td
                          style={cell({ color: "#2563eb", cursor: "pointer" })}
                        >
                          Edit
                        </td>
                        <td style={cell()}>{row.paymentMode || "Credit"}</td>
                        <td style={cell()}>{row.billNo}</td>
                        <td style={cell({ fontWeight: 600, color: "#4f46e5" })}>
                          {row.outNo}
                        </td>
                        <td style={cell()}>{fmtDt(row.outwardDate)}</td>
                        <td style={cell()}>{row.marka || "—"}</td>
                        <td style={cell({ color: "#6b7280" })}>
                          {row.vehicle || "—"}
                        </td>
                        <td style={cell({ fontWeight: 600 })}>{row.name}</td>
                        <td style={cell()}>{row.village || "—"}</td>
                        <td style={cell({ color: "#6b7280" })}>
                          {row.uniqueNo || "—"}
                        </td>
                        <td style={cell()}>{row.deliverTo || "—"}</td>
                        <td style={cell()}>{row.commodity}</td>
                        <td style={cell()}>{row.pId || "—"}</td>
                        <td style={cell()}>{row.inwardNo}</td>
                        <td style={cell()}>{fmtDt(row.inwDate)}</td>
                        <td style={cell({ textAlign: "right" })}>
                          {fmtN(row.rent)}
                        </td>
                        <td
                          style={cell({ textAlign: "right", color: "#94a3b8" })}
                        >
                          0.00
                        </td>
                        <td
                          style={cell({ textAlign: "right", color: "#94a3b8" })}
                        >
                          0.00
                        </td>
                        <td
                          style={cell({ textAlign: "right", color: "#94a3b8" })}
                        >
                          0.00
                        </td>
                        <td
                          style={cell({
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#15803d",
                          })}
                        >
                          {fmtN(row.tRent)}
                        </td>
                        <td style={cell({ textAlign: "right" })}>
                          {row.avgWt}
                        </td>
                        <td style={cell({ color: "#6b7280" })}>{row.type}</td>
                        <td style={cell()}>{row.location || "—"}</td>

                        {/* The explicitly requested columns at the very end */}
                        <td style={cell({ fontWeight: 500, color: "#0369a1" })}>
                          {row.variety}
                        </td>
                        <td
                          style={cell({ textAlign: "right", fontWeight: 600 })}
                        >
                          {fmtN(row.quantity)}
                        </td>
                        <td
                          style={cell({ textAlign: "right", fontWeight: 600 })}
                        >
                          {row.weight.toFixed(3)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* 🛡️ Renders the footer so 'totalRent' is utilized in the table bottom */}
                {rows.length > 0 && (
                  <tfoot>
                    <tr
                      style={{
                        background: "#f8fafc",
                        fontWeight: 700,
                        borderTop: "2px solid #e2e8f0",
                      }}
                    >
                      <td
                        colSpan={19}
                        style={{
                          padding: "10px",
                          fontSize: 13,
                          color: "#374151",
                          textAlign: "right",
                        }}
                      >
                        Grand Total:
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          textAlign: "right",
                          fontSize: 14,
                          color: "#15803d",
                        }}
                      >
                        {fmtN(totalRent)}
                      </td>
                      <td colSpan={6} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 0",
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            ⏳ Loading Outward Register...
          </div>
        )}
      </div>
    </Layout>
  );
}
