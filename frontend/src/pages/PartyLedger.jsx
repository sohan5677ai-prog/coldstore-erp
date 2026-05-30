// frontend/src/pages/PartyLedger.jsx  — REPLACE ENTIRELY
// Rules: no nested components, async useEffect + await Promise.resolve(),
//        explicit catch blocks, `quantity` field (not qtyInPkts)

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

// ── Safe fetch wrapper ────────────────────────────────────────
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
const fmtR = (n) =>
  (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtW = (n) =>
  (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3 });
const fmtN = (n) => (n || 0).toLocaleString("en-IN");

// ══════════════════════════════════════════════════════════════
//  SUB-COMPONENTS  — all defined OUTSIDE export default function
// ══════════════════════════════════════════════════════════════

function PageHeader({ title }) {
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
      {title}
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  onKeyDown,
  onClear,
  hasSelected,
  children,
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Type party name to search…"
        style={{
          width: "100%",
          padding: "9px 36px 9px 12px",
          fontSize: 14,
          border: "1.5px solid #d1d5db",
          borderRadius: 6,
          outline: "none",
          fontWeight: hasSelected ? 600 : 400,
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
      {hasSelected && (
        <button
          onClick={onClear}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#94a3b8",
            fontSize: 16,
          }}
        >
          ✕
        </button>
      )}
      {children}
    </div>
  );
}

function DropdownList({ items, onPick, highlightedIdx }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        zIndex: 200,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        maxHeight: 260,
        overflowY: "auto",
      }}
    >
      {items.map((p, i) => {
        const isHL = i === highlightedIdx;
        const defaultBg = isHL ? "#dbeafe" : i === 0 ? "#f0f9ff" : "#fff";
        return (
          <div
            key={p.id}
            onClick={() => onPick(p)}
            style={{
              padding: "9px 14px",
              cursor: "pointer",
              fontSize: 13,
              borderBottom: "1px solid #f1f5f9",
              borderLeft: isHL ? "3px solid #2563eb" : "3px solid transparent",
              background: defaultBg,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#eff6ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = defaultBg;
            }}
          >
            <strong>{p.name}</strong>
            {p.city && (
              <span style={{ color: "#2563eb" }}>
                {" "}
                : {p.city.toUpperCase()}
              </span>
            )}
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {p.partyCode} · {p.mobileNumber || "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryLeftRow({ label, value, color, bold, borderTop }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        fontSize: 13,
        borderBottom: "1px solid #f1f5f9",
        borderTop: borderTop ? "2px solid #e2e8f0" : "none",
        marginTop: borderTop ? 4 : 0,
      }}
    >
      <span style={{ color: "#374151", fontWeight: bold ? 600 : 400 }}>
        {label}
      </span>
      <span style={{ color: color || "#2563eb", fontWeight: bold ? 700 : 500 }}>
        {value}
      </span>
    </div>
  );
}

function LedgerRightTable({ rows, totalDr, totalCr, balance }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr style={{ background: "#6d5fd3", color: "#fff" }}>
            {["Cr.", "Particular", "Dr.", "Particular"].map((h, i) => (
              <th
                key={i}
                style={{
                  padding: "8px 12px",
                  textAlign: i >= 2 ? "right" : "left",
                  fontWeight: 600,
                  fontSize: 12,
                  borderRight:
                    i < 3 ? "1px solid rgba(255,255,255,0.15)" : "none",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "9px 12px",
                  borderRight: "1px solid #f1f5f9",
                  color: "#6b7280",
                }}
              >
                —
              </td>
              <td
                style={{
                  padding: "9px 12px",
                  borderRight: "1px solid #f1f5f9",
                  color: "#6b7280",
                }}
              >
                —
              </td>
              <td
                style={{
                  padding: "9px 12px",
                  textAlign: "right",
                  borderRight: "1px solid #f1f5f9",
                  color: "#374151",
                  fontWeight: row.drAmt > 0 ? 600 : 400,
                }}
              >
                {row.drAmt > 0 ? fmt(row.drAmt) : "0.00"}
              </td>
              <td style={{ padding: "9px 12px", color: "#374151" }}>
                {row.label}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr
            style={{
              borderTop: "2px solid #e2e8f0",
              background: "#f8fafc",
              fontWeight: 700,
            }}
          >
            <td
              style={{
                padding: "9px 12px",
                borderRight: "1px solid #e2e8f0",
                color: "#15803d",
              }}
            >
              {fmt(totalCr)}
            </td>
            <td
              style={{ padding: "9px 12px", borderRight: "1px solid #e2e8f0" }}
            />
            <td
              style={{
                padding: "9px 12px",
                textAlign: "right",
                borderRight: "1px solid #e2e8f0",
                color: "#b91c1c",
              }}
            >
              {fmt(totalDr)}
            </td>
            <td
              style={{ padding: "9px 12px", color: "#b91c1c", fontWeight: 700 }}
            >
              Balance : {fmt(balance)}Dr
            </td>
          </tr>
          <tr style={{ background: "#fffbeb" }}>
            <td
              colSpan={4}
              style={{ padding: "7px 12px", fontSize: 12, color: "#92400e" }}
            >
              Dr with UNRent: {fmt(balance + 0)}Dr &nbsp; Balance with UNRent:{" "}
              {fmt(balance)}Dr
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CommodityTable({ rows }) {
  const COL_HEADERS = [
    { k: "commodity", l: "Commodity", align: "left" },
    { k: "variety", l: "Variety", align: "left" },
    { k: "inwardQty", l: "Inward", align: "right" },
    { k: "inwardWt", l: "InWt", align: "right" },
    { k: "outwardQty", l: "Outward", align: "right" },
    { k: "outwardWt", l: "OutWt", align: "right" },
    { k: "remainingQty", l: "Remaining", align: "right" },
    { k: "remainingWt", l: "RWt", align: "right" },
  ];

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr style={{ background: "#6d5fd3", color: "#fff" }}>
            {COL_HEADERS.map((h) => (
              <th
                key={h.k}
                style={{
                  padding: "9px 12px",
                  textAlign: h.align,
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                {h.l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                style={{ padding: 18, textAlign: "center", color: "#94a3b8" }}
              >
                No stock entries
              </td>
            </tr>
          ) : (
            rows.map((c, i) => (
              <tr
                key={i}
                style={{
                  background: i % 2 === 0 ? "#fff" : "#f8fafc",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                  {c.commodity}
                </td>
                <td style={{ padding: "8px 12px", color: "#6b7280" }}>
                  {c.variety}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    color: "#2563eb",
                    fontWeight: 500,
                  }}
                >
                  {fmtN(c.inwardQty)}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  {fmtW(c.inwardWt)}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    color: "#2563eb",
                    fontWeight: 500,
                  }}
                >
                  {fmtN(c.outwardQty)}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  {fmtW(c.outwardWt)}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: c.remainingQty > 0 ? "#15803d" : "#b91c1c",
                  }}
                >
                  {fmtN(c.remainingQty)}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  {fmtW(c.remainingWt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
      <div style={{ fontSize: 14 }}>Loading ledger…</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📒</div>
      <div style={{ fontSize: 15 }}>
        Search and select a party to view their ledger
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div
      style={{
        margin: "12px 20px",
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

// ══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════════
export default function PartyLedger() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [partyDrop, setPartyDrop] = useState([]);
  const [dropIdx, setDropIdx] = useState(-1); // keyboard nav cursor
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allCustomers, setAllCustomers] = useState([]);

  const dropRef = useRef();

  // Load customer list
  useEffect(() => {
    const load = async () => {
      await Promise.resolve();
      try {
        const list = await apiFetch("/customers");
        setAllCustomers(list);
      } catch (e) {
        console.error("Customer load error:", e.message);
      }
    };
    load();
  }, []);

  // Handle URL params (e.g. from StockByParty)
  useEffect(() => {
    const partyId = searchParams.get("partyId");
    const name = searchParams.get("name");
    const run = async () => {
      await Promise.resolve();
      if (partyId && name) {
        const p = { id: parseInt(partyId), name: decodeURIComponent(name) };
        setSelected(p);
        setSearch(decodeURIComponent(name));
      }
    };
    run();
  }, [searchParams]);

  // Filter party dropdown from local list
  useEffect(() => {
    const run = async () => {
      await Promise.resolve();
      if (!search.trim() || selected) {
        setPartyDrop([]);
        return;
      }
      const q = search.toLowerCase();
      const matches = allCustomers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.partyCode || "").toLowerCase().includes(q) ||
            (c.city || "").toLowerCase().includes(q),
        )
        .slice(0, 15);
      setPartyDrop(matches);
    };
    run();
  }, [search, allCustomers, selected]);

  // Auto-load ledger when party or date changes
  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      await Promise.resolve();
      setLoading(true);
      setError("");
      try {
        const d = await apiFetch(`/ledger/party/${selected.id}?date=${date}`);
        setData(d);
      } catch (e) {
        console.error("Ledger load error:", e.message);
        setError(e.message);
        setData(null);
      }
      setLoading(false);
    };
    load();
  }, [selected, date]);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setPartyDrop([]);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const pickParty = (p) => {
    setSelected(p);
    setSearch(`${p.name}${p.city ? " : " + p.city.toUpperCase() : ""}`);
    setPartyDrop([]);
    setDropIdx(-1);
  };

  const clearParty = () => {
    setSelected(null);
    setSearch("");
    setData(null);
    setPartyDrop([]);
    setDropIdx(-1);
    setError("");
  };

  // ── Arrow/Enter keyboard navigation for party dropdown ────────
  const handleSearchKeyDown = (e) => {
    if (!partyDrop.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropIdx((i) => Math.min(i + 1, partyDrop.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDropIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = dropIdx >= 0 ? partyDrop[dropIdx] : partyDrop[0];
      if (target) pickParty(target);
    } else if (e.key === "Escape") {
      setPartyDrop([]);
      setDropIdx(-1);
    }
  };

  const handleRefresh = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const d = await apiFetch(`/ledger/party/${selected.id}?date=${date}`);
      setData(d);
    } catch (e) {
      console.error("Refresh error:", e.message);
      setError(e.message);
    }
    setLoading(false);
  };

  const openDetailLedger = () => {
    if (!selected) return;
    navigate(
      `/report/party-ledger/detail/${selected.id}?date=${date}&name=${encodeURIComponent(selected.name)}`,
    );
  };

  const s = data?.summary;

  return (
    <Layout>
      <style>{`@media print { .no-print, nav, aside, header { display:none!important; } }`}</style>

      <div
        style={{
          borderRadius: 10,
          overflow: "visible",
          border: "1px solid #e2e8f0",
          background: "#fff",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}
      >
        <PageHeader title="Party Ledger" />

        {/* ── Control bar ── */}
        <div
          style={{
            padding: "14px 20px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "grid",
            gridTemplateColumns: "1fr 220px 180px auto",
            gap: 12,
            alignItems: "start",
          }}
        >
          {/* Party search */}
          <div ref={dropRef}>
            <SearchBar
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setDropIdx(-1);
                if (selected) clearParty();
              }}
              onKeyDown={handleSearchKeyDown}
              onClear={clearParty}
              hasSelected={!!selected}
            >
              {partyDrop.length > 0 && !selected && (
                <DropdownList
                  items={partyDrop}
                  onPick={pickParty}
                  highlightedIdx={dropIdx}
                />
              )}
            </SearchBar>
          </div>

          {/* Date — yellow like SVCold */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "9px 12px",
              fontSize: 14,
              border: "1.5px solid #F9A825",
              borderRadius: 6,
              outline: "none",
              background: "#FFFDE7",
              fontWeight: 600,
              textAlign: "center",
              width: "100%",
              boxSizing: "border-box",
            }}
          />

          {/* Refresh — teal like SVCold */}
          <button
            onClick={handleRefresh}
            disabled={!selected || loading}
            style={{
              background: "#00897B",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "9px 0",
              fontWeight: 600,
              fontSize: 14,
              cursor: !selected || loading ? "not-allowed" : "pointer",
              opacity: !selected || loading ? 0.65 : 1,
              width: "100%",
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>

          {/* Phone display */}
          <div style={{ fontSize: 13, color: "#374151", padding: "10px 4px" }}>
            {data?.customer?.mobileNumber ? (
              <span>
                Phone: <strong>{data.customer.mobileNumber}</strong>
              </span>
            ) : (
              <span style={{ color: "#94a3b8" }}>Phone: —</span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && <ErrorBanner message={error} />}

        {/* Loading */}
        {loading && <LoadingSpinner />}

        {/* Empty */}
        {!selected && !loading && <EmptyState />}

        {/* ── Ledger content ── */}
        {data && !loading && (
          <>
            {/* Heading */}
            <div
              style={{
                textAlign: "center",
                padding: "14px 0 4px",
                fontWeight: 700,
                fontSize: 15,
                color: "#1e293b",
              }}
            >
              Ledger Detail of {data.customer.name} Till Date:{" "}
              {new Date(date).toLocaleDateString("en-IN")}
            </div>

            {/* ── Stock summary banner ── */}
            <div
              style={{
                margin: "8px 20px",
                padding: "10px 16px",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 8,
                display: "flex",
                gap: 32,
                flexWrap: "wrap",
                fontSize: 13,
              }}
            >
              {[
                ["Party Inward (qty)", fmtN(s.totalInwardQty), "#2563eb"],
                ["Inward Weight", fmtW(s.totalInwardWt), "#374151"],
                ["Party Outward (qty)", fmtN(s.totalOutwardQty), "#b45309"],
                ["Outward Weight", fmtW(s.totalOutwardWt), "#374151"],
                ["Balance (qty)", fmtN(s.balanceQty), "#15803d"],
                ["Remaining Weight", fmtW(s.balanceWt), "#374151"],
              ].map(([l, v, c]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{l}</div>
                  <div style={{ fontWeight: 700, color: c, fontSize: 15 }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>

            {/* ── 2-column layout: summary left + Cr/Dr right ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "300px 1fr",
                gap: 0,
                padding: "8px 20px 12px",
              }}
            >
              {/* LEFT: summary */}
              <div style={{ paddingRight: 20 }}>
                <SummaryLeftRow
                  label="Party Inward"
                  value={fmtN(s.totalInwardQty)}
                />
                <SummaryLeftRow
                  label="Party Outward"
                  value={fmtN(s.totalOutwardQty)}
                />
                <SummaryLeftRow
                  label="Party Balance"
                  value={fmtN(s.balanceQty)}
                />
                <SummaryLeftRow
                  label="Rent (Realised)"
                  value={fmtR(s.realisedRent)}
                  color="#b91c1c"
                />
                <SummaryLeftRow
                  label="Unrealised Rent"
                  value={fmtR(s.unrealisedRent)}
                  color="#f59e0b"
                />
                <SummaryLeftRow label="Loan" value={fmtR(s.loan)} />
                <SummaryLeftRow label="Int on Loan" value={fmtR(s.interest)} />
                <SummaryLeftRow label="Bardana" value={fmtN(s.bardana)} />
                <SummaryLeftRow label="Other" value={`${fmtR(s.other)}Dr`} />
                <SummaryLeftRow
                  label="Balance"
                  value={`${fmt(s.balance)}Dr`}
                  color="#b91c1c"
                  bold
                  borderTop
                />
                <SummaryLeftRow label="Avg" value={fmtR(s.avg)} />
                <SummaryLeftRow label="UN Rent" value={fmtN(s.unRent)} />
              </div>

              {/* RIGHT: Cr/Dr table */}
              <LedgerRightTable
                rows={data.ledgerRight}
                totalDr={s.totalDr}
                totalCr={s.totalCr}
                balance={s.balance}
              />
            </div>

            {/* Narration */}
            <div
              style={{
                padding: "4px 20px 8px",
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              Narration: —
            </div>

            {/* Action buttons */}
            <div
              style={{
                padding: "8px 20px 10px",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <button
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 18px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Show Location
              </button>
              <div style={{ flex: 1 }} />
              <button
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
                Chitthi Bilti
              </button>
              <button
                onClick={openDetailLedger}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 22px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Detail Ledger →
              </button>
              <button
                onClick={() => window.print()}
                className="no-print"
                style={{
                  background: "#374151",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 18px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                🖨️ Print
              </button>
            </div>

            {/* Commodity table */}
            <div style={{ margin: "0 20px 20px" }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  marginBottom: 8,
                  color: "#1e293b",
                }}
              >
                Stock Summary by Commodity & Variety
              </div>
              <CommodityTable rows={data.commoditySummary || []} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
