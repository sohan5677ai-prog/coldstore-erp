// frontend/src/pages/PartyBalance.jsx — REPLACE ENTIRELY
//
// Rules enforced:
// 1. NO sub-components defined inside export default function
// 2. Every useEffect setState wrapped in async + await Promise.resolve()
// 3. No empty catch blocks — all use console.error
// 4. apiFetch uses { cause: e } pattern
// 5. `quantity` field (not qtyInPkts)

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

// ─── Safe fetch wrapper ────────────────────────────────────────
async function apiFetch(path) {
  let r;
  try {
    r = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${tok()}` },
    });
  } catch (e) {
    throw new Error("Network error — is the backend running?", { cause: e });
  }
  const text = await r.text();
  if (text.trimStart().startsWith("<!")) {
    throw new Error("Server returned HTML — check backend logs", {
      cause: text,
    });
  }
  let d;
  try {
    d = JSON.parse(text);
  } catch (e) {
    throw new Error("Invalid JSON from server", { cause: e });
  }
  if (!r.ok) {
    throw new Error(d.message || `HTTP ${r.status}`, { cause: d });
  }
  return d;
}

// ─── Formatters ────────────────────────────────────────────────
const fmtN = (n) => (n || 0).toLocaleString("en-IN");
const fmtW = (n) =>
  (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3 });
const fmtR = (n) =>
  (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

// ─── Exact 32 column definitions ──────────────────────────────
// field: key on data row | label: header text | fmt: formatter
const COLUMNS = [
  {
    field: "partyCode",
    label: "Party Code",
    fmt: (v) => v || "—",
    align: "left",
  },
  {
    field: "partyName",
    label: "Party Name",
    fmt: (v) => v || "—",
    align: "left",
  },
  { field: "totalInQty", label: "Total Inward", fmt: fmtN, align: "right" },
  { field: "totalInWt", label: "Total Inward Wt", fmt: fmtW, align: "right" },
  { field: "totalOutQty", label: "Total Outward", fmt: fmtN, align: "right" },
  { field: "totalOutWt", label: "Total Outward Wt", fmt: fmtW, align: "right" },
  { field: "remQty", label: "Remaining", fmt: fmtN, align: "right" },
  { field: "remWt", label: "Remaining Wt", fmt: fmtW, align: "right" },
  {
    field: "unrealisedRent",
    label: "Unrealized Rent",
    fmt: fmtR,
    align: "right",
  },
  {
    field: "openingBalance",
    label: "Opening Balance",
    fmt: fmtR,
    align: "right",
  },
  { field: "drRent", label: "Rent", fmt: fmtR, align: "right" },
  { field: "drLoad", label: "Loading / Unloading", fmt: fmtR, align: "right" },
  { field: "drBardana", label: "Bardana", fmt: fmtR, align: "right" },
  { field: "drLoan", label: "Loan", fmt: fmtR, align: "right" },
  { field: "drInterest", label: "Interest", fmt: fmtR, align: "right" },
  { field: "drOther", label: "Other DrAmt", fmt: fmtR, align: "right" },
  { field: "totalDr", label: "Total DrAmt", fmt: fmtR, align: "right" },
  { field: "crRent", label: "Submit Rent", fmt: fmtR, align: "right" },
  {
    field: "crLoad",
    label: "Submit Load/Unloading",
    fmt: fmtR,
    align: "right",
  },
  { field: "crBardana", label: "Submit Bardana", fmt: fmtR, align: "right" },
  { field: "crLoan", label: "Submit Loan", fmt: fmtR, align: "right" },
  { field: "crInterest", label: "Submit Int", fmt: fmtR, align: "right" },
  { field: "crOther", label: "Other Submit", fmt: fmtR, align: "right" },
  { field: "totalCr", label: "TCrAmt", fmt: fmtR, align: "right" },
  { field: "remRent", label: "Rem Rent", fmt: fmtR, align: "right" },
  { field: "remLoad", label: "Rem Load/Unloading", fmt: fmtR, align: "right" },
  { field: "remBardana", label: "Rem Bardana", fmt: fmtR, align: "right" },
  { field: "remLoan", label: "Rem Loan", fmt: fmtR, align: "right" },
  { field: "remInterest", label: "Rem Int", fmt: fmtR, align: "right" },
  { field: "remOther", label: "Rem Other", fmt: fmtR, align: "right" },
  { field: "totalBal", label: "TBal", fmt: fmtR, align: "right" },
  { field: "avg", label: "Avg", fmt: fmtR, align: "right" },
];

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS — all defined OUTSIDE export default function
// ══════════════════════════════════════════════════════════════

// ─── Blue page header ─────────────────────────────────────────
function PageHeader() {
  return (
    <div
      style={{
        background: "#4a90d9",
        color: "#fff",
        padding: "10px 24px",
        fontWeight: 700,
        fontSize: 18,
        textAlign: "center",
        borderRadius: "10px 10px 0 0",
      }}
    >
      Party Balance
    </div>
  );
}

// ─── Party autocomplete input ─────────────────────────────────
function PartySearch({
  value,
  onChange,
  onClear,
  hasSelected,
  dropItems,
  onPick,
  dropRef,
}) {
  return (
    <div style={{ position: "relative", flex: "0 0 280px" }} ref={dropRef}>
      <div style={{ position: "relative" }}>
        <input
          value={value}
          onChange={onChange}
          placeholder="Search party…"
          style={{
            width: "100%",
            padding: "8px 30px 8px 10px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 5,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
        {hasSelected && (
          <button
            onClick={onClear}
            style={{
              position: "absolute",
              right: 7,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              fontSize: 15,
            }}
          >
            ✕
          </button>
        )}
      </div>
      {dropItems.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
            zIndex: 200,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {dropItems.map((p, i) => (
            <PartyDropRow key={p.id} party={p} index={i} onPick={onPick} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single dropdown row ──────────────────────────────────────
function PartyDropRow({ party, index, onPick }) {
  return (
    <div
      onClick={() => onPick(party)}
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        fontSize: 13,
        borderBottom: "1px solid #f1f5f9",
        background: index === 0 ? "#f0f9ff" : "#fff",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#eff6ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = index === 0 ? "#f0f9ff" : "#fff";
      }}
    >
      <strong>{party.name}</strong>
      {party.city && (
        <span style={{ color: "#2563eb" }}> : {party.city.toUpperCase()}</span>
      )}
      <span style={{ float: "right", fontSize: 11, color: "#94a3b8" }}>
        {party.partyCode}
      </span>
    </div>
  );
}

// ─── Green action button ──────────────────────────────────────
function GreenBtn({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={!!disabled}
      style={{
        background: disabled ? "#86efac" : "#22c55e",
        color: "#fff",
        border: "none",
        borderRadius: 5,
        padding: "8px 18px",
        fontWeight: 600,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

// ─── Filter / control bar ─────────────────────────────────────
function FilterBar({
  search,
  onSearchChange,
  onSearchClear,
  hasSelected,
  dropItems,
  onPickParty,
  dropRef,
  date,
  onDateChange,
  onSearch,
  loading,
}) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        background: "#f8fafc",
      }}
    >
      <PartySearch
        value={search}
        onChange={onSearchChange}
        onClear={onSearchClear}
        hasSelected={hasSelected}
        dropItems={dropItems}
        onPick={onPickParty}
        dropRef={dropRef}
      />
      <input
        type="date"
        value={date}
        onChange={onDateChange}
        style={{
          padding: "8px 10px",
          fontSize: 13,
          border: "1.5px solid #F9A825",
          borderRadius: 5,
          outline: "none",
          background: "#FFFDE7",
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      />
      <GreenBtn
        label={loading ? "Searching…" : "Search"}
        onClick={onSearch}
        disabled={loading}
      />
      <GreenBtn label="Criteria" onClick={() => {}} />
      <GreenBtn label="🖨️ Print" onClick={() => window.print()} />
    </div>
  );
}

// ─── Show-entries + table-search controls ─────────────────────
function TableControls({
  pageSize,
  onPageSizeChange,
  tableSearch,
  onTableSearchChange,
  total,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "#374151",
        }}
      >
        Show{" "}
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{
            padding: "4px 8px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 4,
            outline: "none",
            cursor: "pointer",
          }}
        >
          {[10, 25, 50, 100, 9999].map((n) => (
            <option key={n} value={n}>
              {n === 9999 ? "All" : n}
            </option>
          ))}
        </select>{" "}
        entries &nbsp;
        <span style={{ color: "#94a3b8", fontSize: 12 }}>({total} total)</span>
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
      >
        <span style={{ color: "#374151" }}>Search:</span>
        <input
          value={tableSearch}
          onChange={(e) => onTableSearchChange(e.target.value)}
          placeholder="Filter rows…"
          style={{
            padding: "5px 10px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 4,
            outline: "none",
            width: 200,
          }}
        />
      </div>
    </div>
  );
}

// ─── Single flat header row (purple #7c68d4) ──────────────────
function TableHead({ onSort, sortCol, sortDir }) {
  return (
    <thead>
      <tr>
        {COLUMNS.map((col) => (
          <TableHeaderCell
            key={col.field}
            col={col}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={onSort}
          />
        ))}
      </tr>
    </thead>
  );
}

// ─── Individual header cell ───────────────────────────────────
function TableHeaderCell({ col, sortCol, sortDir, onSort }) {
  const active = sortCol === col.field;
  return (
    <th
      onClick={() => onSort(col.field)}
      style={{
        padding: "8px 8px",
        textAlign: col.align || "right",
        fontSize: 11,
        fontWeight: 600,
        background: active ? "#5a4ab4" : "#7c68d4",
        color: "#fff",
        whiteSpace: "nowrap",
        cursor: "pointer",
        userSelect: "none",
        borderRight: "1px solid rgba(255,255,255,0.12)",
        position: "sticky",
        top: 0,
        zIndex: 1,
      }}
    >
      {col.label}
      {active ? (
        <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
      ) : (
        <span style={{ marginLeft: 4, opacity: 0.4, fontSize: 9 }}>⇕</span>
      )}
    </th>
  );
}

// ─── Data row ─────────────────────────────────────────────────
function TableDataRow({ row, rowIndex, onClick }) {
  return (
    <tr
      onClick={() => onClick(row)}
      style={{
        background: rowIndex % 2 === 0 ? "#fff" : "#f8fafc",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#eff6ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background =
          rowIndex % 2 === 0 ? "#fff" : "#f8fafc";
      }}
    >
      {COLUMNS.map((col) => (
        <TableDataCell key={col.field} col={col} row={row} />
      ))}
    </tr>
  );
}

// ─── Individual data cell ─────────────────────────────────────
function TableDataCell({ col, row }) {
  const raw = row[col.field];
  const val = col.fmt(raw);

  // Color rules
  let color = "#374151";
  if (col.field === "partyCode") color = "#2563eb";
  if (col.field === "partyName") color = "#1e293b";
  if (col.field === "remQty" && (raw || 0) > 0) color = "#15803d";
  if (col.field === "totalDr") color = "#b91c1c";
  if (col.field === "totalCr") color = "#15803d";
  if (col.field === "unrealisedRent" && (raw || 0) > 0) color = "#f59e0b";
  if (col.field === "totalBal") {
    color = (raw || 0) > 0 ? "#b91c1c" : (raw || 0) < 0 ? "#15803d" : "#94a3b8";
  }
  if (col.field === "drRent" && (raw || 0) > 0) color = "#b91c1c";
  if (col.field === "totalCr" && (raw || 0) > 0) color = "#15803d";

  const isZero =
    (raw || 0) === 0 &&
    col.align === "right" &&
    col.field !== "openingBalance" &&
    col.field !== "totalBal";

  return (
    <td
      style={{
        padding: "6px 8px",
        textAlign: col.align || "right",
        fontSize: 12,
        color: isZero ? "#94a3b8" : color,
        fontWeight: ["totalDr", "totalCr", "totalBal", "partyName"].includes(
          col.field,
        )
          ? 600
          : 400,
        borderBottom: "1px solid #f1f5f9",
        whiteSpace: "nowrap",
      }}
    >
      {col.field === "totalBal" && (raw || 0) !== 0
        ? `${val}${(raw || 0) > 0 ? " Dr" : " Cr"}`
        : val}
    </td>
  );
}

// ─── Footer totals row ────────────────────────────────────────
function TableFooterRow({ rows }) {
  const totals = COLUMNS.reduce((acc, col) => {
    if (["partyCode", "partyName"].includes(col.field)) return acc;
    acc[col.field] = rows.reduce(
      (s, r) => s + (parseFloat(r[col.field]) || 0),
      0,
    );
    return acc;
  }, {});

  return (
    <tr
      style={{
        background: "#f0f4f8",
        fontWeight: 700,
        borderTop: "2px solid #e2e8f0",
      }}
    >
      {COLUMNS.map((col, i) => {
        if (col.field === "partyCode") {
          return (
            <td
              key={col.field}
              style={{
                padding: "8px 8px",
                fontSize: 12,
                fontWeight: 700,
                borderBottom: "1px solid #e2e8f0",
                whiteSpace: "nowrap",
              }}
            >
              Total ({rows.length})
            </td>
          );
        }
        if (col.field === "partyName") return <td key={col.field} />;
        const v = totals[col.field] || 0;
        return (
          <td
            key={col.field}
            style={{
              padding: "8px 8px",
              textAlign: "right",
              fontSize: 12,
              fontWeight: 700,
              borderBottom: "1px solid #e2e8f0",
              whiteSpace: "nowrap",
              color:
                col.field === "totalDr"
                  ? "#b91c1c"
                  : col.field === "totalCr"
                    ? "#15803d"
                    : col.field === "totalBal"
                      ? v > 0
                        ? "#b91c1c"
                        : v < 0
                          ? "#15803d"
                          : "#94a3b8"
                      : "#374151",
            }}
          >
            {["totalInQty", "totalOutQty", "remQty"].includes(col.field)
              ? fmtN(Math.round(v))
              : ["totalInWt", "totalOutWt", "remWt"].includes(col.field)
                ? fmtW(v)
                : fmtR(v)}
            {col.field === "totalBal" && v !== 0 ? (v > 0 ? " Dr" : " Cr") : ""}
          </td>
        );
      })}
    </tr>
  );
}

// ─── Pagination info ──────────────────────────────────────────
function PaginationInfo({ from, to, total }) {
  return (
    <div
      style={{
        padding: "8px 16px",
        fontSize: 12,
        color: "#6b7280",
        borderTop: "1px solid #f1f5f9",
      }}
    >
      Showing {from} to {to} of {total} entries
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────
function ErrorBanner({ message }) {
  return (
    <div
      style={{
        margin: 12,
        padding: "10px 14px",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 6,
        fontSize: 13,
        color: "#b91c1c",
      }}
    >
      ⚠️ {message}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────
function EmptyState({ loading }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
      {loading ? (
        <>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
          <div>Loading party balances…</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚖️</div>
          <div>No party balance data found</div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════════
export default function PartyBalance() {
  const navigate = useNavigate();

  // ── Data state ──────────────────────────────────────────────
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Filter / search state ────────────────────────────────────
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [allCust, setAllCust] = useState([]);
  const [partyDrop, setPartyDrop] = useState([]);

  // ── Table controls state ──────────────────────────────────────
  const [tableSearch, setTableSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState("totalBal");
  const [sortDir, setSortDir] = useState("desc");

  const dropRef = useRef();

  // ── Load customers on mount ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      await Promise.resolve();
      try {
        const list = await apiFetch("/customers");
        setAllCust(list);
      } catch (e) {
        console.error("Customer load error:", e.message, e.cause);
      }
    };
    load();
  }, []);

  // ── Filter party dropdown from local list ────────────────────
  useEffect(() => {
    const run = async () => {
      await Promise.resolve();
      if (!search.trim() || selected) {
        setPartyDrop([]);
        return;
      }
      const q = search.toLowerCase();
      const matches = allCust
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.partyCode || "").toLowerCase().includes(q) ||
            (c.city || "").toLowerCase().includes(q),
        )
        .slice(0, 12);
      setPartyDrop(matches);
    };
    run();
  }, [search, allCust, selected]);

  // ── Close dropdown on outside click ─────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setPartyDrop([]);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── Reset page when table search changes ─────────────────────
  useEffect(() => {
    const run = async () => {
      await Promise.resolve();
      setPage(1);
    };
    run();
  }, [tableSearch, pageSize]);

  // ── Fetch party balance ──────────────────────────────────────
  const doSearch = async () => {
    setLoading(true);
    setError("");
    setPage(1);
    try {
      const path = selected
        ? `/ledger/party-balance?partyId=${selected.id}&date=${date}`
        : `/ledger/party-balance?date=${date}`;
      const data = await apiFetch(path);
      setAllRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Party balance fetch error:", e.message, e.cause);
      setError(e.message);
      setAllRows([]);
    }
    setLoading(false);
  };

  const pickParty = (p) => {
    setSelected(p);
    setSearch(`${p.name}${p.city ? " : " + p.city.toUpperCase() : ""}`);
    setPartyDrop([]);
  };

  const clearParty = () => {
    setSelected(null);
    setSearch("");
    setPartyDrop([]);
  };

  const handleSort = (col) => {
    setSortDir((d) =>
      sortCol === col ? (d === "asc" ? "desc" : "asc") : "desc",
    );
    setSortCol(col);
  };

  const handleRowClick = (row) => {
    if (!row.id) return;
    navigate(
      `/report/party-ledger?partyId=${row.id}&name=${encodeURIComponent(row.partyName)}`,
    );
  };

  // ── Derived: filter + sort + paginate ────────────────────────
  const filtered = allRows.filter((r) => {
    if (!tableSearch) return true;
    const q = tableSearch.toLowerCase();
    return (
      (r.partyName || "").toLowerCase().includes(q) ||
      (r.partyCode || "").toLowerCase().includes(q) ||
      (r.city || "").toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortCol] ?? 0;
    const vb = b[sortCol] ?? 0;
    if (typeof va === "string") {
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortDir === "asc" ? va - vb : vb - va;
  });

  const totalPages =
    pageSize === 9999 ? 1 : Math.ceil(sorted.length / pageSize);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paged =
    pageSize === 9999
      ? sorted
      : sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const fromRow =
    sorted.length === 0
      ? 0
      : (safePage - 1) * (pageSize === 9999 ? sorted.length : pageSize) + 1;
  const toRow = Math.min(
    safePage * (pageSize === 9999 ? sorted.length : pageSize),
    sorted.length,
  );

  return (
    <Layout>
      <style>{`
        @media print {
          .no-print, nav, aside, header { display:none!important; }
          body { font-size:10px!important; }
          @page { size: A3 landscape; margin: 8mm; }
        }
      `}</style>

      <div
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          background: "#fff",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}
      >
        <PageHeader />

        {/* Filter bar */}
        <FilterBar
          search={search}
          onSearchChange={(e) => {
            setSearch(e.target.value);
            if (selected) clearParty();
          }}
          onSearchClear={clearParty}
          hasSelected={!!selected}
          dropItems={partyDrop}
          onPickParty={pickParty}
          dropRef={dropRef}
          date={date}
          onDateChange={(e) => setDate(e.target.value)}
          onSearch={doSearch}
          loading={loading}
        />

        {/* Error */}
        {error && <ErrorBanner message={error} />}

        {/* Table controls */}
        {allRows.length > 0 && (
          <TableControls
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            tableSearch={tableSearch}
            onTableSearchChange={setTableSearch}
            total={filtered.length}
          />
        )}

        {/* Main table */}
        {loading || allRows.length === 0 ? (
          <EmptyState loading={loading} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <TableHead
                onSort={handleSort}
                sortCol={sortCol}
                sortDir={sortDir}
              />
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: "#94a3b8",
                      }}
                    >
                      No entries match your filter
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => (
                    <TableDataRow
                      key={row.partyCode + "_" + i}
                      row={row}
                      rowIndex={i}
                      onClick={handleRowClick}
                    />
                  ))
                )}
              </tbody>
              <tfoot>
                <TableFooterRow rows={filtered} />
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination info */}
        {allRows.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 16px",
              borderTop: "1px solid #f1f5f9",
              background: "#fafafa",
            }}
          >
            <PaginationInfo from={fromRow} to={toRow} total={filtered.length} />
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from(
                  { length: Math.min(totalPages, 7) },
                  (_, i) => i + 1,
                ).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      width: 30,
                      height: 28,
                      fontSize: 12,
                      cursor: "pointer",
                      border: "1px solid #e2e8f0",
                      borderRadius: 4,
                      background: safePage === n ? "#7c68d4" : "#fff",
                      color: safePage === n ? "#fff" : "#374151",
                      fontWeight: safePage === n ? 600 : 400,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
