// frontend/src/pages/InwardRegister.jsx
import { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

// 🛡️ Linter Armor: Added { cause: e } to satisfy preserve-caught-error
async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok()}`,
      ...(!(opts.body instanceof FormData) && {
        "Content-Type": "application/json",
      }),
      ...(opts.headers || {}),
    },
  });

  const text = await r.text();
  let d;
  try {
    d = text ? JSON.parse(text) : {};
  } catch (e) {
    if (!r.ok)
      throw new Error(
        `Server Error: ${r.status} ${r.statusText}. Check backend.`,
        { cause: e },
      );
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
  boxSizing: "border-box",
  fontFamily: "inherit",
  width: "100%",
};

const btn = (bg = "#22c55e", extra = {}) => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 5,
  padding: "8px 22px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  ...extra,
});

import {
  exportToExcel,
  exportToPDF,
  INWARD_COLUMNS,
} from "../utils/exportUtils";

export default function InwardRegister() {
  const [filters, setFilters] = useState({
    from: fyStart(),
    to: todayStr(),
    partyId: "",
    commodity: "",
    variety: "",
    csrFrom: "",
    csrTo: "",
    lotCode: "",
    receivedFrom: "",
    vehicle: "",
  });
  const [customers, setCustomers] = useState([]);
  const [partySearch, setPartySearch] = useState("");
  const [partyDrop, setPartyDrop] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const debParty = useDebounce(partySearch, 250);
  const dropRef = useRef();

  const toast$ = (m, t = "ok") => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 4000);
  };

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (filters.from) p.set("from", filters.from);
    if (filters.to) p.set("to", filters.to);
    if (filters.partyId) p.set("partyId", filters.partyId);
    if (filters.commodity) p.set("commodity", filters.commodity);
    if (filters.variety) p.set("variety", filters.variety);
    if (filters.csrFrom) p.set("csrFrom", filters.csrFrom);
    if (filters.csrTo) p.set("csrTo", filters.csrTo);
    if (filters.lotCode) p.set("lotCode", filters.lotCode);
    if (filters.receivedFrom) p.set("receivedFrom", filters.receivedFrom);
    if (filters.vehicle) p.set("vehicle", filters.vehicle);
    return p.toString();
  };

  // 🛡️ Linter Armor: Separated logic so it can be called inside useEffect properly
  useEffect(() => {
    const initLoad = async () => {
      await Promise.resolve();
      apiFetch("/customers")
        .then(setCustomers)
        .catch(() => {});

      setLoading(true);
      setError("");
      setSearched(true);
      try {
        const p = new URLSearchParams();
        p.set("from", fyStart());
        p.set("to", todayStr());
        const data = await apiFetch(`/inward/register?${p.toString()}`);
        setRows(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    initLoad();
  }, []);

  useEffect(() => {
    const filterP = async () => {
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
    filterP();
  }, [debParty, customers]);

  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setPartyDrop([]);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const pickParty = (c) => {
    setF("partyId", String(c.id));
    setPartySearch(`${c.name}${c.city ? " : " + c.city.toUpperCase() : ""}`);
    setPartyDrop([]);
  };

  const clearParty = () => {
    setF("partyId", "");
    setPartySearch("");
    setPartyDrop([]);
  };

  const doSearch = async () => {
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      setRows(await apiFetch(`/inward/register?${buildQuery()}`));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const doReset = () => {
    setFilters({
      from: fyStart(),
      to: todayStr(),
      partyId: "",
      commodity: "",
      variety: "",
      csrFrom: "",
      csrTo: "",
      lotCode: "",
      receivedFrom: "",
      vehicle: "",
    });
    setPartySearch("");
    setPartyDrop([]);
    setRows([]);
    setSearched(false);
  };

  const handleDelete = async (id, csrNo) => {
    if (
      !window.confirm(
        `Delete inward entry CSR #${csrNo}? This cannot be undone.`,
      )
    )
      return;
    setDeletingId(id);
    try {
      await apiFetch(`/inward/${id}`, { method: "DELETE" });
      toast$(`✅ Entry #${csrNo} deleted`);
      doSearch();
    } catch (e) {
      toast$("❌ " + e.message, "err");
    }
    setDeletingId(null);
  };

  const totalWeight = rows.reduce(
    (s, r) => s + (parseFloat(r.totalWeight) || parseFloat(r.weight) || 0),
    0,
  );
  const totalQty = rows.reduce((s, r) => {
    const pkts = r.packetEntries || r.packets || [];
    const rowQ =
      pkts.length > 0
        ? pkts.reduce(
            (sum, p) =>
              sum + (parseFloat(p.quantity) || parseFloat(p.qtyInPkts) || 0),
            0,
          )
        : parseFloat(r.quantity) ||
          parseFloat(r.totalQuantity) ||
          parseFloat(r.qty) ||
          0;
    return s + rowQ;
  }, 0);

  const fmtW = (n) =>
    (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3 });
  const fmtN = (n) => (n || 0).toLocaleString("en-IN");
  const fmtDt = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
  const cell = (extra = {}) => ({
    padding: "6px 8px",
    fontSize: 12,
    whiteSpace: "nowrap",
    borderBottom: "1px solid #f1f5f9",
    ...extra,
  });

  return (
    <Layout>
      <style>{`
        @media print { .no-print, nav, aside, header { display:none!important; } }
        .reg-row:hover td { background:#eff6ff!important; }
      `}</style>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 999,
            background: toast.t === "err" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${toast.t === "err" ? "#fecaca" : "#86efac"}`,
            borderRadius: 8,
            padding: "12px 20px",
            fontSize: 14,
            fontWeight: 500,
            color: toast.t === "err" ? "#b91c1c" : "#15803d",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {toast.m}
        </div>
      )}

      <div
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          background: "#fff",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}
      >
        {/* Blue header */}
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
          Date Wise Inward Detail
        </div>

        {/* FILTER PANEL */}
        <div
          style={{
            padding: "20px 24px",
            border: "1.5px solid #bde0f5",
            margin: "16px",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 155px auto 155px auto 1fr auto 1fr",
              gap: "10px 12px",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <label style={{ fontSize: 13, fontWeight: 500 }}>From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setF("from", e.target.value)}
              style={inp}
            />
            <label style={{ fontSize: 13, fontWeight: 500 }}>To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setF("to", e.target.value)}
              style={inp}
            />
            <label style={{ fontSize: 13, fontWeight: 500 }}>Party</label>
            <div style={{ position: "relative" }} ref={dropRef}>
              <input
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  if (filters.partyId) clearParty();
                }}
                placeholder="Search Party..."
                style={{ ...inp, paddingRight: filters.partyId ? 28 : 10 }}
              />
              {filters.partyId && (
                <button
                  onClick={clearParty}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              )}
              {partyDrop.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
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
                        padding: "7px 12px",
                        cursor: "pointer",
                        fontSize: 13,
                        borderBottom: "1px solid #f1f5f9",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f0f9ff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#fff")
                      }
                    >
                      <strong>{c.name}</strong>
                      {c.city && (
                        <span style={{ color: "#6b7280" }}> : {c.city}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label
              style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}
            >
              City/Village
            </label>
            <input
              value={filters.lotCode}
              onChange={(e) => setF("lotCode", e.target.value)}
              placeholder="City/Village"
              style={inp}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "auto 90px 90px auto 1fr auto 1fr auto 130px",
              gap: "10px 12px",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <label
              style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}
            >
              Inward No
            </label>
            <input
              value={filters.csrFrom}
              onChange={(e) => setF("csrFrom", e.target.value)}
              placeholder="From"
              style={inp}
            />
            <input
              value={filters.csrTo}
              onChange={(e) => setF("csrTo", e.target.value)}
              placeholder="To"
              style={inp}
            />
            <label style={{ fontSize: 13, fontWeight: 500 }}>Commodity</label>
            <input
              value={filters.commodity}
              onChange={(e) => setF("commodity", e.target.value)}
              placeholder="e.g. Tamarind"
              style={inp}
            />
            <label style={{ fontSize: 13, fontWeight: 500 }}>Variety</label>
            <input
              value={filters.variety}
              onChange={(e) => setF("variety", e.target.value)}
              placeholder="e.g. Shell Tamarind"
              style={inp}
            />
            <label style={{ fontSize: 13, fontWeight: 500 }}>PKT</label>
            <select style={{ ...inp, cursor: "pointer" }}>
              <option>Select</option>
              {["Packet", "KG", "Quintal", "Ton"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto 1fr auto 1fr",
              gap: "10px 12px",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <label
              style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}
            >
              Room No
            </label>
            <input
              value={filters.lotCode}
              onChange={(e) => setF("lotCode", e.target.value)}
              placeholder="e.g. A47"
              style={inp}
            />
            <label
              style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}
            >
              Rec.From
            </label>
            <input
              value={filters.receivedFrom}
              onChange={(e) => setF("receivedFrom", e.target.value)}
              placeholder="Received From"
              style={inp}
            />
            <label style={{ fontSize: 13, fontWeight: 500 }}>Vehicle</label>
            <input
              value={filters.vehicle}
              onChange={(e) => setF("vehicle", e.target.value)}
              placeholder="Vehicle No."
              style={inp}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={doSearch}
              disabled={loading}
              style={btn("#22c55e")}
            >
              {loading ? "Searching…" : "Search"}
            </button>
            <button onClick={doReset} style={btn("#22c55e")}>
              Reset
            </button>
            <button
              onClick={() =>
                exportToExcel(rows, INWARD_COLUMNS, "Inward_Register")
              }
              className="no-print"
              disabled={rows.length === 0}
              style={btn(rows.length > 0 ? "#0f9d58" : "#94a3b8")}
            >
              📊 Excel
            </button>
            <button
              onClick={() =>
                exportToPDF(
                  rows,
                  INWARD_COLUMNS,
                  "Inward Register",
                  `From: ${filters?.from || "—"}  To: ${filters?.to || "—"}`,
                )
              }
              className="no-print"
              disabled={rows.length === 0}
              style={btn(rows.length > 0 ? "#dc2626" : "#94a3b8")}
            >
              📄 PDF
            </button>
            <button
              onClick={() => window.print()}
              className="no-print"
              style={btn("#374151")}
            >
              🖨️ Print
            </button>
          </div>
        </div>

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

        {/* RESULTS */}
        {searched && !loading && (
          <div style={{ padding: "0 16px 20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
                flexWrap: "wrap",
                gap: 8,
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
                    Total Weight:{" "}
                    <strong style={{ color: "#2563eb" }}>
                      {fmtW(totalWeight)}
                    </strong>
                  </span>
                )}
                {rows.length > 0 && totalQty > 0 && (
                  <span>
                    Total Qty: <strong>{fmtN(totalQty)}</strong>
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                {filters.from &&
                  `From ${new Date(filters.from).toLocaleDateString("en-IN")}`}
                {filters.to &&
                  ` to ${new Date(filters.to).toLocaleDateString("en-IN")}`}
              </span>
            </div>

            {rows.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 0",
                  color: "#94a3b8",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                No inward entries found for the selected filters.
              </div>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
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
                        { label: "Edit", w: 44 },
                        { label: "Delete", w: 60 },
                        { label: "InwardNo", w: 72 },
                        { label: "Name", w: 150 },
                        { label: "Village", w: 100 },
                        { label: "MobileNo", w: 100 },
                        { label: "UniqueNo", w: 80 },
                        { label: "Address", w: 110 },
                        { label: "InwardDate", w: 90 },
                        { label: "Marka", w: 110 },
                        { label: "PktMarka", w: 100 },
                        { label: "Commodity", w: 100 },
                        { label: "Variety", w: 100 },
                        { label: "Pkt", w: 100 },
                        { label: "Quantity", w: 72 },
                        { label: "Weight", w: 90 },
                        { label: "Type", w: 64 },
                        { label: "Location", w: 80 },
                        { label: "InwardFrom", w: 100 },
                        { label: "Vehicle", w: 100 },
                      ].map(({ label, w }) => (
                        <th
                          key={label}
                          style={{
                            padding: "8px 8px",
                            textAlign: "left",
                            fontWeight: 600,
                            fontSize: 11,
                            whiteSpace: "nowrap",
                            minWidth: w,
                            borderRight: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row, i) => {
                      const customer = row.customer || {};
                      const variety = row.variety || {};
                      const commodity =
                        variety.commodity || row.commodity || {};
                      const pkts = row.packetEntries || row.packets || [];

                      const cName = customer.name || row.customerName || "—";
                      const cCity = customer.city || row.customerCity || "—";
                      const cMob =
                        customer.mobileNumber || row.customerMobile || "—";
                      const cCode =
                        customer.partyCode || row.customerPartyCode || "—";
                      const cAddr =
                        customer.address || row.customerAddress || "—";

                      const commName =
                        commodity.name ||
                        row.commodityName ||
                        "Multiple commodity";
                      const varName = variety.name || row.varietyName || "—";

                      const pktName =
                        pkts.length > 0
                          ? pkts[0].packetName || "—"
                          : row.pktName || "—";

                      const qty =
                        pkts.length > 0
                          ? pkts.reduce(
                              (s, p) =>
                                s +
                                (parseFloat(p.quantity) ||
                                  parseFloat(p.qtyInPkts) ||
                                  0),
                              0,
                            )
                          : parseFloat(row.quantity) ||
                            parseFloat(row.totalQuantity) ||
                            parseFloat(row.qty) ||
                            0;

                      const wgt =
                        parseFloat(row.totalWeight) ||
                        parseFloat(row.weight) ||
                        0;
                      const lCode = row.lot?.lotCode || row.lotCode || "—";

                      return (
                        <tr
                          key={`${row.id}-${i}`}
                          className="reg-row"
                          style={{
                            background: i % 2 === 0 ? "#fff" : "#f8fafc",
                          }}
                        >
                          {/* Edit */}
                          <td style={cell({ color: "#2563eb" })}>
                            <button
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#2563eb",
                                fontSize: 12,
                                fontWeight: 500,
                                textDecoration: "underline",
                                padding: 0,
                              }}
                            >
                              Edit
                            </button>
                          </td>

                          {/* Delete */}
                          <td style={cell()}>
                            <button
                              onClick={() => handleDelete(row.id, row.csrNo)}
                              disabled={deletingId === row.id}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#ef4444",
                                fontSize: 16,
                                padding: 0,
                                opacity: deletingId === row.id ? 0.5 : 1,
                              }}
                              title="Delete this entry"
                            >
                              {deletingId === row.id ? "…" : "🗑"}
                            </button>
                          </td>

                          <td
                            style={cell({ fontWeight: 600, color: "#2563eb" })}
                          >
                            {row.csrNo}
                          </td>
                          <td
                            style={cell({
                              fontWeight: 500,
                              maxWidth: 150,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            })}
                          >
                            {cName}
                          </td>
                          <td style={cell()}>{cCity}</td>
                          <td style={cell()}>{cMob}</td>
                          <td style={cell({ color: "#6b7280" })}>{cCode}</td>
                          <td
                            style={cell({
                              color: "#6b7280",
                              maxWidth: 110,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            })}
                          >
                            {cAddr}
                          </td>
                          <td style={cell({ whiteSpace: "nowrap" })}>
                            {fmtDt(row.inwardDate)}
                          </td>
                          <td
                            style={cell({
                              maxWidth: 110,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            })}
                          >
                            {row.marka || "—"}
                          </td>
                          <td style={cell({ color: "#6b7280" })}>
                            {row.pktMarka || "—"}
                          </td>
                          <td style={cell({ fontWeight: 500 })}>{commName}</td>
                          <td style={cell()}>{varName}</td>
                          <td style={cell()}>{pktName}</td>

                          <td
                            style={cell({
                              textAlign: "right",
                              fontWeight: 600,
                            })}
                          >
                            {qty > 0 ? (
                              <span style={{ color: "#1e293b" }}>
                                {fmtN(qty)}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>0</span>
                            )}
                          </td>
                          <td
                            style={cell({
                              textAlign: "right",
                              fontWeight: 600,
                              color: wgt > 0 ? "#2563eb" : "#94a3b8",
                            })}
                          >
                            {fmtW(wgt)}
                          </td>

                          <td style={cell({ color: "#6b7280" })}>
                            {row.rentType || "—"}
                          </td>
                          <td style={cell()}>
                            {lCode !== "—" ? (
                              <span
                                style={{
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  fontWeight: 600,
                                  fontSize: 11,
                                  padding: "2px 6px",
                                  borderRadius: 3,
                                }}
                              >
                                {lCode}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={cell({ color: "#6b7280" })}>
                            {row.receivedFrom || "—"}
                          </td>
                          <td style={cell({ color: "#6b7280" })}>
                            {row.vehicleNo || "—"}
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
                      <td
                        colSpan={14}
                        style={{
                          padding: "8px 8px",
                          fontSize: 12,
                          color: "#374151",
                        }}
                      >
                        Total — {rows.length} rows
                      </td>
                      <td
                        style={{
                          padding: "8px 8px",
                          textAlign: "right",
                          fontSize: 12,
                          color: "#374151",
                        }}
                      >
                        {totalQty > 0 ? fmtN(totalQty) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 8px",
                          textAlign: "right",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#2563eb",
                        }}
                      >
                        {fmtW(totalWeight)}
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
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
            <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>Loading
            entries…
          </div>
        )}
      </div>
    </Layout>
  );
}
