// frontend/src/pages/Vouchers.jsx
// Record payment receipts from parties — linked to Party Ledger

import { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

async function api(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok()}`,
      "x-fin-year": localStorage.getItem("finYear") || "2026-27",
      ...(!(opts.body instanceof FormData) && {
        "Content-Type": "application/json",
      }),
      ...(opts.headers || {}),
    },
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || "Error");
  return d;
}

function useDebounce(v, ms = 250) {
  const [d, s] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => s(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

const INR = (n) =>
  (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const inp = {
  padding: "8px 10px",
  fontSize: 13,
  border: "1.5px solid #d1d5db",
  borderRadius: 6,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

// 🛡️ THE FIX: Moved the 'F' helper component OUTSIDE the main function
const F = ({ label, err, children }) => (
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
      {label}
    </label>
    {children}
    {err && (
      <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{err}</div>
    )}
  </div>
);

const vTypeColors = {
  receipt: "#dcfce7",
  payment: "#fee2e2",
  journal: "#e0f2fe",
};
const vTypeText = {
  receipt: "#15803d",
  payment: "#b91c1c",
  journal: "#0369a1",
};

export default function Vouchers() {
  const [tab, setTab] = useState("create");

  // ── Voucher header state ─────────────────────────────────────
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [voucherNo, setVoucherNo] = useState("");
  const [narration, setNarration] = useState("");
  const [refNo, setRefNo] = useState("");

  // ── DR/CR rows — starts with one DR and one CR ───────────────
  const [rows, setRows] = useState([
    {
      id: 1,
      drCr: "DR",
      accountType: "customer",
      customerId: "",
      customerSearch: "",
      cashAccount: "Cash A/C",
      drAmt: "",
      crAmt: "",
    },
    {
      id: 2,
      drCr: "CR",
      accountType: "cash",
      customerId: "",
      customerSearch: "",
      cashAccount: "Cash A/C",
      drAmt: "",
      crAmt: "",
    },
  ]);

  const [customers, setCustomers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Per-row dropdown open state
  const [dropOpen, setDropOpen] = useState({});
  const dropRef = useRef();

  const toast$ = (m, t = "ok") => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 4000);
  };
  const debouncedParty = useDebounce("", 250);

  const loadVouchers = async () => {
    setLoading(true);
    try {
      setVouchers(await api("/vouchers"));
    } catch (error) {
      toast$(error.message, "err");
    }
    setLoading(false);
  };

  useEffect(() => {
    const initLoad = async () => {
      try {
        const [custData, vData] = await Promise.all([
          api("/customers"),
          api("/vouchers").catch(() => []),
        ]);
        setCustomers(custData);
        setVouchers(Array.isArray(vData) ? vData : []);
        setVoucherNo("");
      } catch (error) {
        console.error("Failed to load", error);
      }
    };
    initLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setDropOpen({});
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── Row helpers ───────────────────────────────────────────────
  const updateRow = (id, key, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [key]: value };

        // When DR/CR switches, zero out the opposite amount
        if (key === "drCr") {
          if (value === "DR") {
            updated.crAmt = "";
            updated.accountType = "customer";
          } else {
            updated.drAmt = "";
            updated.accountType = "cash";
          }
        }
        return updated;
      }),
    );
  };

  const addRow = () => {
    const id = Date.now();
    setRows((prev) => [
      ...prev,
      {
        id,
        drCr: "CR",
        accountType: "cash",
        customerId: "",
        customerSearch: "",
        cashAccount: "Cash A/C",
        drAmt: "",
        crAmt: "",
      },
    ]);
  };

  const removeRow = (id) => {
    if (rows.length <= 2) {
      toast$("Minimum 2 rows required", "err");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Totals ────────────────────────────────────────────────────
  const totalDr = rows.reduce((s, r) => s + (parseFloat(r.drAmt) || 0), 0);
  const totalCr = rows.reduce((s, r) => s + (parseFloat(r.crAmt) || 0), 0);
  const isBalanced = Math.abs(totalDr - totalCr) < 0.01;

  const handleSave = async () => {
    const e = {};
    if (!isBalanced)
      e.balance = `Dr (${totalDr.toFixed(2)}) ≠ Cr (${totalCr.toFixed(2)}) — must be equal`;
    rows.forEach((r, i) => {
      if (r.drCr === "DR" && !r.customerId)
        e[`row_${r.id}`] = `Row ${i + 1}: Select a party`;
      if (!r.drAmt && !r.crAmt) e[`amt_${r.id}`] = `Row ${i + 1}: Enter amount`;
    });
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    try {
      // Post the first DR row as the main voucher (simplified — adjust for your backend)
      const drRow = rows.find((r) => r.drCr === "DR");
      await api("/vouchers", {
        method: "POST",
        body: JSON.stringify({
          customerId: drRow?.customerId,
          voucherNo,
          voucherDate,
          voucherType: "PAYMENT",
          amount: parseFloat(drRow?.drAmt || 0),
          paymentMode:
            rows.find((r) => r.drCr === "CR")?.cashAccount === "Cash A/C"
              ? "CASH"
              : "BANK",
          referenceNo: refNo || null,
          narration: narration || null,
        }),
      });
      toast$("✅ Voucher saved!");
      setRows([
        {
          id: 1,
          drCr: "DR",
          accountType: "customer",
          customerId: "",
          customerSearch: "",
          cashAccount: "Cash A/C",
          drAmt: "",
          crAmt: "",
        },
        {
          id: 2,
          drCr: "CR",
          accountType: "cash",
          customerId: "",
          customerSearch: "",
          cashAccount: "Cash A/C",
          drAmt: "",
          crAmt: "",
        },
      ]);
      setNarration("");
      setRefNo("");
      setErrors({});
      loadVouchers();
      setVoucherNo("");
    } catch (error) {
      toast$(error.message, "err");
    }
    setSaving(false);
  };

  return (
    <Layout>
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
          overflow: "visible",
          border: "1px solid #e2e8f0",
          background: "#fff",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            background: "#4a90d9",
            color: "#fff",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "10px 10px 0 0",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 17 }}>Vouchers</span>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              ["create", "＋ New Voucher"],
              ["list", `📋 All (${vouchers.length})`],
            ].map(([t, l]) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  if (t === "list") loadVouchers();
                }}
                style={{
                  background: tab === t ? "#fff" : "transparent",
                  color: tab === t ? "#2563eb" : "#fff",
                  border: "2px solid #fff",
                  borderRadius: 6,
                  padding: "5px 14px",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {tab === "create" && (
          <div style={{ padding: 20 }}>
            {/* Header row: Voucher No | Date | Ref | Narration */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "160px 160px 1fr 2fr",
                gap: "10px 16px",
                marginBottom: 18,
              }}
            >
              <F label="Voucher No.">
                <input
                  value={voucherNo}
                  onChange={(e) => setVoucherNo(e.target.value)}
                  style={inp}
                />
              </F>
              <F label="Date">
                <input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  style={inp}
                />
              </F>
              <F label="Reference / Cheque / UTR">
                <input
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="Optional"
                  style={inp}
                />
              </F>
              <F label="Narration">
                <input
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="e.g. Rent payment for tamarind lot"
                  style={inp}
                />
              </F>
            </div>

            {/* DR/CR entry table */}
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
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
                      "DR / CR",
                      "Account Name",
                      "Dr Amount (₹)",
                      "Cr Amount (₹)",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "9px 12px",
                          textAlign: "left",
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody ref={dropRef}>
                  {rows.map((row, idx) => {
                    const isDr = row.drCr === "DR";
                    const filteredCustomers = row.customerSearch
                      ? customers
                          .filter(
                            (c) =>
                              c.name
                                .toLowerCase()
                                .includes(row.customerSearch.toLowerCase()) ||
                              (c.partyCode || "")
                                .toLowerCase()
                                .includes(row.customerSearch.toLowerCase()),
                          )
                          .slice(0, 10)
                      : customers.slice(0, 10);

                    return (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: idx % 2 === 0 ? "#fff" : "#f8fafc",
                        }}
                      >
                        {/* DR / CR toggle */}
                        <td style={{ padding: "8px 10px", width: 100 }}>
                          <select
                            value={row.drCr}
                            onChange={(e) =>
                              updateRow(row.id, "drCr", e.target.value)
                            }
                            style={{
                              ...inp,
                              width: 80,
                              fontWeight: 700,
                              cursor: "pointer",
                              color: isDr ? "#b91c1c" : "#15803d",
                              background: isDr ? "#fef2f2" : "#f0fdf4",
                              border: `1.5px solid ${isDr ? "#fca5a5" : "#86efac"}`,
                            }}
                          >
                            <option value="DR">DR</option>
                            <option value="CR">CR</option>
                          </select>
                        </td>

                        {/* Account Name — Customer dropdown for DR, Cash/Bank for CR */}
                        <td style={{ padding: "8px 10px", minWidth: 220 }}>
                          {isDr ? (
                            /* DR → Customer dropdown with search */
                            <div style={{ position: "relative" }}>
                              <input
                                value={
                                  row.customerSearch ||
                                  (row.customerId
                                    ? customers.find(
                                        (c) => String(c.id) === row.customerId,
                                      )?.name || ""
                                    : "")
                                }
                                onChange={(e) => {
                                  updateRow(
                                    row.id,
                                    "customerSearch",
                                    e.target.value,
                                  );
                                  updateRow(row.id, "customerId", "");
                                  setDropOpen((d) => ({
                                    ...d,
                                    [row.id]: true,
                                  }));
                                }}
                                onFocus={() =>
                                  setDropOpen((d) => ({ ...d, [row.id]: true }))
                                }
                                placeholder="Select customer (DR)…"
                                style={{
                                  ...inp,
                                  borderColor: errors[`row_${row.id}`]
                                    ? "#f87171"
                                    : "#d1d5db",
                                }}
                              />
                              {dropOpen[row.id] &&
                                filteredCustomers.length > 0 && (
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
                                      maxHeight: 180,
                                      overflowY: "auto",
                                    }}
                                  >
                                    {filteredCustomers.map((c) => (
                                      <div
                                        key={c.id}
                                        onClick={() => {
                                          updateRow(
                                            row.id,
                                            "customerId",
                                            String(c.id),
                                          );
                                          updateRow(
                                            row.id,
                                            "customerSearch",
                                            `${c.name}${c.city ? " : " + c.city : ""}`,
                                          );
                                          setDropOpen((d) => ({
                                            ...d,
                                            [row.id]: false,
                                          }));
                                        }}
                                        style={{
                                          padding: "7px 12px",
                                          cursor: "pointer",
                                          fontSize: 13,
                                          borderBottom: "1px solid #f1f5f9",
                                        }}
                                        onMouseEnter={(e) =>
                                          (e.currentTarget.style.background =
                                            "#eff6ff")
                                        }
                                        onMouseLeave={(e) =>
                                          (e.currentTarget.style.background =
                                            "#fff")
                                        }
                                      >
                                        <strong>{c.name}</strong>
                                        {c.city && (
                                          <span style={{ color: "#6b7280" }}>
                                            {" "}
                                            : {c.city}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              {errors[`row_${row.id}`] && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#ef4444",
                                    marginTop: 2,
                                  }}
                                >
                                  {errors[`row_${row.id}`]}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* CR → Cash / Bank dropdown */
                            <select
                              value={row.cashAccount}
                              onChange={(e) =>
                                updateRow(row.id, "cashAccount", e.target.value)
                              }
                              style={{
                                ...inp,
                                cursor: "pointer",
                                color: "#374151",
                              }}
                            >
                              <option value="Cash A/C">Cash A/C</option>
                              <option value="Bank A/C">Bank A/C</option>
                              <option value="UPI A/C">UPI A/C</option>
                              <option value="HDFC Bank">HDFC Bank</option>
                              <option value="SBI Bank">SBI Bank</option>
                            </select>
                          )}
                        </td>

                        {/* Dr Amount — editable only when DR, disabled when CR */}
                        <td style={{ padding: "8px 10px", width: 140 }}>
                          <input
                            type="number"
                            value={isDr ? row.drAmt : "0.00"}
                            disabled={!isDr}
                            onChange={(e) =>
                              isDr && updateRow(row.id, "drAmt", e.target.value)
                            }
                            placeholder="0.00"
                            style={{
                              ...inp,
                              textAlign: "right",
                              fontWeight: isDr ? 600 : 400,
                              background: isDr ? "#fff" : "#f3f4f6",
                              color: isDr ? "#b91c1c" : "#94a3b8",
                              cursor: isDr ? "text" : "not-allowed",
                            }}
                          />
                        </td>

                        {/* Cr Amount — editable only when CR, disabled when DR */}
                        <td style={{ padding: "8px 10px", width: 140 }}>
                          <input
                            type="number"
                            value={!isDr ? row.crAmt : "0.00"}
                            disabled={isDr}
                            onChange={(e) =>
                              !isDr &&
                              updateRow(row.id, "crAmt", e.target.value)
                            }
                            placeholder="0.00"
                            style={{
                              ...inp,
                              textAlign: "right",
                              fontWeight: !isDr ? 600 : 400,
                              background: !isDr ? "#fff" : "#f3f4f6",
                              color: !isDr ? "#15803d" : "#94a3b8",
                              cursor: !isDr ? "text" : "not-allowed",
                            }}
                          />
                        </td>

                        {/* Remove row */}
                        <td
                          style={{
                            padding: "8px 10px",
                            width: 40,
                            textAlign: "center",
                          }}
                        >
                          <button
                            onClick={() => removeRow(row.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#ef4444",
                              fontSize: 16,
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Totals row */}
                <tfoot>
                  <tr
                    style={{
                      background: "#f8fafc",
                      borderTop: "2px solid #e2e8f0",
                      fontWeight: 700,
                    }}
                  >
                    <td
                      colSpan={2}
                      style={{
                        padding: "9px 12px",
                        fontSize: 12,
                        color: "#374151",
                      }}
                    >
                      <button
                        onClick={addRow}
                        style={{
                          background: "#eff6ff",
                          color: "#2563eb",
                          border: "1px solid #bfdbfe",
                          borderRadius: 5,
                          padding: "4px 12px",
                          fontSize: 12,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        ＋ Add Row
                      </button>
                    </td>
                    <td
                      style={{
                        padding: "9px 12px",
                        textAlign: "right",
                        fontSize: 14,
                        color: "#b91c1c",
                      }}
                    >
                      {totalDr.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      style={{
                        padding: "9px 12px",
                        textAlign: "right",
                        fontSize: 14,
                        color: "#15803d",
                      }}
                    >
                      {totalCr.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Balance check */}
            {!isBalanced && totalDr > 0 && totalCr > 0 && (
              <div
                style={{
                  padding: "8px 14px",
                  background: "#fef3c7",
                  border: "1px solid #fde68a",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#b45309",
                  marginBottom: 12,
                }}
              >
                ⚠️ Dr total (₹{totalDr.toFixed(2)}) ≠ Cr total (₹
                {totalCr.toFixed(2)}) — voucher must balance before saving.
              </div>
            )}
            {isBalanced && totalDr > 0 && (
              <div
                style={{
                  padding: "8px 14px",
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#15803d",
                  marginBottom: 12,
                }}
              >
                ✓ Voucher balanced — ₹{totalDr.toFixed(2)}
              </div>
            )}
            {errors.balance && (
              <div
                style={{
                  padding: "8px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#b91c1c",
                  marginBottom: 12,
                }}
              >
                ⚠️ {errors.balance}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving || !isBalanced}
                style={{
                  background: saving || !isBalanced ? "#86efac" : "#22c55e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "9px 32px",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saving || !isBalanced ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving…" : "Save Voucher"}
              </button>
              <button
                onClick={() => {
                  setRows([
                    {
                      id: 1,
                      drCr: "DR",
                      accountType: "customer",
                      customerId: "",
                      customerSearch: "",
                      cashAccount: "Cash A/C",
                      drAmt: "",
                      crAmt: "",
                    },
                    {
                      id: 2,
                      drCr: "CR",
                      accountType: "cash",
                      customerId: "",
                      customerSearch: "",
                      cashAccount: "Cash A/C",
                      drAmt: "",
                      crAmt: "",
                    },
                  ]);
                  setNarration("");
                  setRefNo("");
                  setErrors({});
                }}
                style={{
                  background: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "9px 24px",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {tab === "list" && (
          <div style={{ padding: 16 }}>
            {loading ? (
              <div
                style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}
              >
                Loading…
              </div>
            ) : vouchers.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>💵</div>
                <div style={{ color: "#94a3b8" }}>No vouchers yet</div>
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
                        "Voucher No",
                        "Date",
                        "Party",
                        "Type",
                        "Mode",
                        "Amount (₹)",
                        "Reference",
                        "Narration",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 10px",
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map((v, i) => (
                      <tr
                        key={v.id}
                        style={{
                          background: i % 2 === 0 ? "#fff" : "#f8fafc",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#eff6ff")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
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
                          {v.voucherNo}
                        </td>
                        <td
                          style={{ padding: "7px 10px", whiteSpace: "nowrap" }}
                        >
                          {new Date(v.voucherDate).toLocaleDateString("en-IN")}
                        </td>
                        <td style={{ padding: "7px 10px", fontWeight: 500 }}>
                          {v.customer?.name}
                        </td>
                        <td style={{ padding: "7px 10px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 3,
                              fontWeight: 500,
                              background:
                                vTypeColors[v.voucherType] || "#f3f4f6",
                              color: vTypeText[v.voucherType] || "#374151",
                            }}
                          >
                            {v.voucherType}
                          </span>
                        </td>
                        <td style={{ padding: "7px 10px", color: "#6b7280" }}>
                          {v.paymentMode}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            textAlign: "right",
                            fontWeight: 600,
                            color:
                              v.voucherType === "receipt"
                                ? "#15803d"
                                : "#b91c1c",
                          }}
                        >
                          {INR(v.amount)}
                        </td>
                        <td style={{ padding: "7px 10px", color: "#6b7280" }}>
                          {v.referenceNo || "—"}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            color: "#6b7280",
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {v.narration || "—"}
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
                      <td
                        colSpan={5}
                        style={{ padding: "8px 10px", fontSize: 12 }}
                      >
                        Total receipts
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          color: "#15803d",
                          fontSize: 12,
                        }}
                      >
                        {INR(
                          vouchers
                            .filter((v) => v.voucherType === "receipt")
                            .reduce((s, v) => s + (v.amount || 0), 0),
                        )}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
    