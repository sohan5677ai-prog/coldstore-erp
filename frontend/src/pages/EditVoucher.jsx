// frontend/src/pages/EditVoucher.jsx  — NEW FILE
// Voucher register table with Edit and Delete actions
// Rules: no nested components, async useEffect + await Promise.resolve()

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

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
  if (text.trim().startsWith("<!"))
    throw new Error("Server error — check backend");
  const d = text ? JSON.parse(text) : {};
  if (!r.ok) throw new Error(d.message || `HTTP ${r.status}`);
  return d;
}

const fmt = (n) =>
  Math.abs(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtD = (dt) => (dt ? new Date(dt).toLocaleDateString("en-IN") : "—");

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS — all OUTSIDE export default
// ══════════════════════════════════════════════════════════════

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
      Voucher Register
    </div>
  );
}

function TypeBadge({ type }) {
  const map = {
    PAYMENT: { bg: "#fee2e2", c: "#b91c1c" },
    RECEIPT: { bg: "#dcfce7", c: "#15803d" },
    JOURNAL: { bg: "#e0f2fe", c: "#0369a1" },
    receipt: { bg: "#dcfce7", c: "#15803d" },
    payment: { bg: "#fee2e2", c: "#b91c1c" },
    journal: { bg: "#e0f2fe", c: "#0369a1" },
  };
  const s = map[type] || { bg: "#f3f4f6", c: "#6b7280" };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 3,
        background: s.bg,
        color: s.c,
        whiteSpace: "nowrap",
        textTransform: "uppercase",
      }}
    >
      {type}
    </span>
  );
}

function TableHead() {
  return (
    <thead>
      <tr style={{ background: "#6d5fd3", color: "#fff" }}>
        {[
          { l: "V.Date", w: 90 },
          { l: "V.No", w: 80 },
          { l: "Type", w: 90 },
          { l: "Account Name", w: 200 },
          { l: "Amount ₹", w: 110 },
          { l: "Narration", w: 220 },
          { l: "Action", w: 100 },
        ].map(({ l, w }) => (
          <th
            key={l}
            style={{
              padding: "9px 12px",
              textAlign: "left",
              fontWeight: 600,
              fontSize: 12,
              minWidth: w,
              borderRight: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {l}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function VoucherRow({ v, index, onEdit, onDelete, deleting }) {
  return (
    <tr
      style={{
        background: index % 2 === 0 ? "#fff" : "#f8fafc",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <td style={{ padding: "8px 12px", fontSize: 13, whiteSpace: "nowrap" }}>
        {fmtD(v.voucherDate)}
      </td>
      <td
        style={{
          padding: "8px 12px",
          fontWeight: 700,
          color: "#2563eb",
          fontSize: 13,
        }}
      >
        {v.voucherNo}
      </td>
      <td style={{ padding: "8px 12px" }}>
        <TypeBadge type={v.voucherType} />
      </td>
      <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 500 }}>
        {v.customer?.name || "—"}
        {v.customer?.partyCode && (
          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>
            {v.customer.partyCode}
          </span>
        )}
      </td>
      <td
        style={{
          padding: "8px 12px",
          textAlign: "right",
          fontWeight: 700,
          fontSize: 13,
          color: "#15803d",
        }}
      >
        ₹{fmt(v.amount)}
      </td>
      <td
        style={{
          padding: "8px 12px",
          fontSize: 12,
          color: "#6b7280",
          maxWidth: 220,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {v.narration || "—"}
      </td>
      <td style={{ padding: "8px 12px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => onEdit(v)}
            title="Edit this voucher"
            style={{
              background: "#eff6ff",
              color: "#2563eb",
              border: "1px solid #bfdbfe",
              borderRadius: 5,
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => onDelete(v.id, v.voucherNo)}
            disabled={deleting === v.id}
            title="Delete this voucher"
            style={{
              background: deleting === v.id ? "#f3f4f6" : "#fef2f2",
              color: deleting === v.id ? "#94a3b8" : "#ef4444",
              border: "1px solid #fecaca",
              borderRadius: 5,
              padding: "4px 10px",
              fontSize: 12,
              cursor: deleting === v.id ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {deleting === v.id ? "…" : "🗑 Del"}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Inline edit modal ─────────────────────────────────────────
function EditModal({ voucher, customers, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    voucherDate: voucher.voucherDate
      ? new Date(voucher.voucherDate).toISOString().slice(0, 10)
      : "",
    voucherType: voucher.voucherType || "PAYMENT",
    amount: String(voucher.amount || ""),
    paymentMode: voucher.paymentMode || "CASH",
    narration: voucher.narration || "",
    referenceNo: voucher.referenceNo || "",
  });

  const inp = {
    padding: "7px 10px",
    fontSize: 13,
    border: "1.5px solid #d1d5db",
    borderRadius: 6,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1000,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: "#fff",
          borderRadius: 12,
          zIndex: 1001,
          width: "min(480px, 95vw)",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#2563eb",
            color: "#fff",
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            Edit Voucher #{voucher.voucherNo}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              borderRadius: 6,
              width: 28,
              height: 28,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div
          style={{
            padding: 20,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 16px",
          }}
        >
          {[
            { label: "Date", key: "voucherDate", type: "date" },
            { label: "Amount ₹", key: "amount", type: "number" },
            { label: "Ref / UTR", key: "referenceNo", type: "text" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 3,
                }}
              >
                {label}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                style={inp}
              />
            </div>
          ))}

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 3,
              }}
            >
              Type
            </label>
            <select
              value={form.voucherType}
              onChange={(e) =>
                setForm((f) => ({ ...f, voucherType: e.target.value }))
              }
              style={{ ...inp, cursor: "pointer" }}
            >
              {["PAYMENT", "RECEIPT", "JOURNAL"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 3,
              }}
            >
              Payment Mode
            </label>
            <select
              value={form.paymentMode}
              onChange={(e) =>
                setForm((f) => ({ ...f, paymentMode: e.target.value }))
              }
              style={{ ...inp, cursor: "pointer" }}
            >
              {["CASH", "BANK", "UPI", "CHEQUE", "NEFT", "RTGS"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 3,
              }}
            >
              Narration
            </label>
            <input
              value={form.narration}
              onChange={(e) =>
                setForm((f) => ({ ...f, narration: e.target.value }))
              }
              placeholder="Optional narration"
              style={inp}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: 6,
              padding: "8px 20px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(voucher.id, form)}
            disabled={saving}
            style={{
              background: saving ? "#86efac" : "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 24px",
              fontWeight: 700,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>💵</div>
      <div>No vouchers found. Create one from the Voucher entry page.</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════
export default function EditVoucher() {
  const navigate = useNavigate();

  const [vouchers, setVouchers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [editingV, setEditingV] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Table filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const toast$ = (m, t = "ok") => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const load = async () => {
      await Promise.resolve();
      setLoading(true);
      try {
        const [vs, cs] = await Promise.all([
          apiFetch("/vouchers"),
          apiFetch("/customers"),
        ]);
        setVouchers(Array.isArray(vs) ? vs : []);
        setCustomers(Array.isArray(cs) ? cs : []);
      } catch (e) {
        console.error("Voucher register load error:", e.message);
        setError(e.message);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleDelete = async (id, vNo) => {
    if (!window.confirm(`Delete voucher ${vNo}? This cannot be undone.`))
      return;
    setDeleting(id);
    try {
      await apiFetch(`/vouchers/${id}`, { method: "DELETE" });
      setVouchers((vs) => vs.filter((v) => v.id !== id));
      toast$(`✅ Voucher ${vNo} deleted`);
    } catch (e) {
      console.error("Delete voucher error:", e.message);
      toast$(e.message, "err");
    }
    setDeleting(null);
  };

  const handleSaveEdit = async (id, form) => {
    setSaving(true);
    try {
      const updated = await apiFetch(`/vouchers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          voucherDate: form.voucherDate,
          voucherType: form.voucherType,
          amount: parseFloat(form.amount) || 0,
          paymentMode: form.paymentMode,
          narration: form.narration || null,
          referenceNo: form.referenceNo || null,
        }),
      });
      setVouchers((vs) =>
        vs.map((v) => (v.id === id ? { ...v, ...updated } : v)),
      );
      setEditingV(null);
      toast$("✅ Voucher updated");
    } catch (e) {
      console.error("Edit voucher error:", e.message);
      toast$(e.message, "err");
    }
    setSaving(false);
  };

  // Filter + search
  const filtered = vouchers.filter((v) => {
    const matchType =
      typeFilter === "ALL" ||
      (v.voucherType || "").toUpperCase() === typeFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (v.voucherNo || "").toLowerCase().includes(q) ||
      (v.customer?.name || "").toLowerCase().includes(q) ||
      (v.narration || "").toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const totalAmt = filtered.reduce((s, v) => s + (v.amount || 0), 0);

  return (
    <Layout>
      <style>{`@media print { .no-print, nav, aside, header { display:none!important; } }`}</style>

      {/* Toast */}
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
        <PageHeader />

        {/* Controls bar */}
        <div
          className="no-print"
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            background: "#f8fafc",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by voucher no, party, narration…"
            style={{
              padding: "7px 12px",
              fontSize: 13,
              border: "1px solid #d1d5db",
              borderRadius: 5,
              outline: "none",
              width: 280,
            }}
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "7px 10px",
              fontSize: 13,
              border: "1px solid #d1d5db",
              borderRadius: 5,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Types</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="RECEIPT">RECEIPT</option>
            <option value="JOURNAL">JOURNAL</option>
          </select>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: 13, color: "#374151" }}>
            {filtered.length} vouchers &nbsp;|&nbsp;
            <strong style={{ color: "#15803d" }}>
              ₹{totalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>
          </span>

          <button
            onClick={() => navigate("/transaction/voucher")}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              padding: "7px 16px",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ＋ New Voucher
          </button>

          <button
            onClick={() => window.print()}
            style={{
              background: "#374151",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              padding: "7px 14px",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🖨️ Print
          </button>
        </div>

        {/* Error */}
        {error && (
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
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div
            style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>Loading
            vouchers…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <TableHead />
              <tbody>
                {filtered.map((v, i) => (
                  <VoucherRow
                    key={v.id}
                    v={v}
                    index={i}
                    onEdit={setEditingV}
                    onDelete={handleDelete}
                    deleting={deleting}
                  />
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
                  <td colSpan={4} style={{ padding: "9px 12px", fontSize: 13 }}>
                    Total — {filtered.length} vouchers
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      textAlign: "right",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#15803d",
                    }}
                  >
                    ₹
                    {totalAmt.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingV && (
        <EditModal
          voucher={editingV}
          customers={customers}
          onSave={handleSaveEdit}
          onClose={() => setEditingV(null)}
          saving={saving}
        />
      )}
    </Layout>
  );
}
