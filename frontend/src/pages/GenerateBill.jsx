// frontend/src/pages/GenerateBill.jsx
// Generate rent bills for parties — preview then save

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");
async function api(path, opts = {}) {
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
  const d = await r.json();
  if (!r.ok) throw new Error(d.message);
  return d;
}
function useDebounce(v, ms = 250) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

const fmt = (n) =>
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

const FY_START = `${new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-04-01`;

export default function GenerateBill() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [partyDrop, setPartyDrop] = useState([]);
  const [party, setParty] = useState(null);
  const [billFrom, setBillFrom] = useState(FY_START);
  const [billTo, setBillTo] = useState(new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [bills, setBills] = useState([]);
  const [tab, setTab] = useState("generate");
  const debSearch = useDebounce(search);
  const dropRef = useRef();

  const toast$ = (m, t = "ok") => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 4500);
  };

  // 🛡️ THE FIX: Safely wrapped in async, fixed dependencies, handled catch errors
  useEffect(() => {
    const fetchParties = async () => {
      if (!debSearch.trim() || party) {
        setPartyDrop([]);
        return;
      }
      try {
        const res = await api(
          `/customers/search?q=${encodeURIComponent(debSearch)}`,
        );
        setPartyDrop(res);
      } catch (err) {
        console.error("Party search failed:", err);
        setPartyDrop([]);
      }
    };
    fetchParties();
  }, [debSearch, party]);

  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setPartyDrop([]);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const pickParty = (p) => {
    setParty(p);
    setSearch(`${p.name}${p.city ? ` : ${p.city.toUpperCase()}` : ""}`);
    setPartyDrop([]);
    setPreview(null);
  };

  const generatePreview = async () => {
    if (!party) return;
    setLoading(true);
    try {
      setPreview(
        await api(`/bills/preview/${party.id}?from=${billFrom}&to=${billTo}`),
      );
    } catch (e) {
      toast$(e.message, "err");
    }
    setLoading(false);
  };

  // 🛡️ THE FIX: Safely wrapped in async to prevent empty block/state mutation errors
  useEffect(() => {
    const fetchBills = async () => {
      if (tab === "list") {
        try {
          const data = await api("/bills");
          setBills(data);
        } catch (err) {
          console.error("Failed to load bills:", err);
        }
      }
    };
    fetchBills();
  }, [tab]);

  const saveBill = async () => {
    if (!preview || !party) return;
    setSaving(true);
    try {
      const res = await api("/bills", {
        method: "POST",
        body: JSON.stringify({
          customerId: party.id,
          billFrom,
          billTo,
          items: preview.items,
          totals: preview.totals,
        }),
      });
      toast$(
        `✅ Bill ${res.bill.billNo} saved — ₹${fmt(res.bill.totalAmount)}`,
      );
      setPreview(null);
      setParty(null);
      setSearch("");

      // Manually refetch after saving
      try {
        const data = await api("/bills");
        setBills(data);
      } catch (err) {
        console.error("Failed to reload bills:", err);
      }

      setTab("list");
    } catch (e) {
      toast$(e.message, "err");
    }
    setSaving(false);
  };

  // 🛡️ THE FIX: Removed the unused PrintBill component to satisfy linter.

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
            background: "#2563eb",
            color: "#fff",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "10px 10px 0 0",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 17 }}>Generate Bill</span>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              ["generate", "🧾 Generate Bill"],
              ["list", `📋 Bill Report (${bills.length})`],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  background: tab === k ? "#fff" : "transparent",
                  color: tab === k ? "#2563eb" : "#fff",
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

        {tab === "generate" && (
          <div style={{ padding: 20 }}>
            {/* Filters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr auto",
                gap: 12,
                alignItems: "end",
                marginBottom: 16,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Party
                </label>
                <div style={{ position: "relative" }} ref={dropRef}>
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (party) {
                        setParty(null);
                        setPreview(null);
                      }
                    }}
                    placeholder="Type party name…"
                    style={inp}
                  />
                  {partyDrop.length > 0 && !party && (
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
                        zIndex: 100,
                        maxHeight: 200,
                        overflowY: "auto",
                      }}
                    >
                      {/* 🛡️ THE FIX: Removed unused 'i' parameter here */}
                      {partyDrop.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => pickParty(p)}
                          style={{
                            padding: "8px 12px",
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
                          <strong>{p.name}</strong>
                          {p.city && (
                            <span style={{ color: "#2563eb" }}>
                              {" "}
                              : {p.city}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  From Date
                </label>
                <input
                  type="date"
                  value={billFrom}
                  onChange={(e) => setBillFrom(e.target.value)}
                  style={inp}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  To Date
                </label>
                <input
                  type="date"
                  value={billTo}
                  onChange={(e) => setBillTo(e.target.value)}
                  style={inp}
                />
              </div>
              <button
                onClick={generatePreview}
                disabled={!party || loading}
                style={{
                  background: !party || loading ? "#94a3b8" : "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "9px 24px",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: !party || loading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  alignSelf: "end",
                }}
              >
                {loading ? "Calculating…" : "Preview Bill"}
              </button>
            </div>

            {/* Bill Preview */}
            {preview && (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                {/* Bill header */}
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "14px 20px",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          color: "#1e293b",
                        }}
                      >
                        Rent Bill Preview
                      </div>
                      <div
                        style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}
                      >
                        {preview.customer?.name}
                        {preview.customer?.city
                          ? ` : ${preview.customer.city}`
                          : ""}
                        {" · "}Period:{" "}
                        {new Date(billFrom).toLocaleDateString("en-IN")} to{" "}
                        {new Date(billTo).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    {preview.items?.length === 0 && (
                      <span
                        style={{
                          fontSize: 13,
                          color: "#b45309",
                          fontWeight: 500,
                          background: "#fef3c7",
                          padding: "4px 12px",
                          borderRadius: 6,
                        }}
                      >
                        No active stock for this party
                      </span>
                    )}
                  </div>
                </div>

                {preview.items?.length > 0 && (
                  <>
                    {/* Items table */}
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
                              "Lot",
                              "Commodity",
                              "Variety",
                              "Bags",
                              "Days",
                              "Storage Rate",
                              "Storage ₹",
                              "Handling ₹",
                              "Total ₹",
                            ].map((h) => (
                              <th
                                key={h}
                                style={{
                                  padding: "8px 10px",
                                  textAlign: [
                                    "Bags",
                                    "Days",
                                    "Storage Rate",
                                    "Storage ₹",
                                    "Handling ₹",
                                    "Total ₹",
                                  ].includes(h)
                                    ? "right"
                                    : "left",
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
                          {preview.items.map((item, i) => (
                            <tr
                              key={i}
                              style={{
                                background: i % 2 === 0 ? "#fff" : "#f8fafc",
                                borderBottom: "1px solid #f1f5f9",
                              }}
                            >
                              <td
                                style={{
                                  padding: "7px 10px",
                                  fontWeight: 500,
                                  color: "#2563eb",
                                }}
                              >
                                {item.csrNo}
                              </td>
                              <td style={{ padding: "7px 10px" }}>
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
                                  {item.lotCode || "—"}
                                </span>
                              </td>
                              <td style={{ padding: "7px 10px" }}>
                                {item.commodityName || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "7px 10px",
                                  color: "#6b7280",
                                }}
                              >
                                {item.varietyName || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "7px 10px",
                                  textAlign: "right",
                                }}
                              >
                                {item.bags}
                              </td>
                              <td
                                style={{
                                  padding: "7px 10px",
                                  textAlign: "right",
                                }}
                              >
                                {item.days}
                              </td>
                              <td
                                style={{
                                  padding: "7px 10px",
                                  textAlign: "right",
                                  color: "#6b7280",
                                }}
                              >
                                ₹{item.storageRate}/bag/mo
                              </td>
                              <td
                                style={{
                                  padding: "7px 10px",
                                  textAlign: "right",
                                }}
                              >
                                {fmt(item.storageCharge)}
                              </td>
                              <td
                                style={{
                                  padding: "7px 10px",
                                  textAlign: "right",
                                }}
                              >
                                {fmt(item.handlingCharge)}
                              </td>
                              <td
                                style={{
                                  padding: "7px 10px",
                                  textAlign: "right",
                                  fontWeight: 600,
                                }}
                              >
                                {fmt(item.storageCharge + item.handlingCharge)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div
                      style={{
                        padding: "16px 20px",
                        background: "#f8fafc",
                        borderTop: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <div style={{ width: 280 }}>
                        {[
                          ["Storage Charges", preview.totals.storage],
                          ["Handling Charges", preview.totals.handling],
                          ["CGST (2.5%)", preview.totals.cgst],
                          ["SGST (2.5%)", preview.totals.sgst],
                        ].map(([l, v]) => (
                          <div
                            key={l}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 13,
                              color: "#374151",
                              padding: "4px 0",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <span>{l}</span>
                            <span>₹{fmt(v)}</span>
                          </div>
                        ))}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#1e293b",
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: "2px solid #e2e8f0",
                          }}
                        >
                          <span>Total Amount</span>
                          <span style={{ color: "#16a34a" }}>
                            ₹{fmt(preview.totals.total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Save button */}
                    <div
                      style={{
                        padding: "14px 20px",
                        display: "flex",
                        gap: 10,
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      <button
                        onClick={saveBill}
                        disabled={saving}
                        style={{
                          background: saving ? "#86efac" : "#22c55e",
                          color: "#fff",
                          border: "none",
                          borderRadius: 7,
                          padding: "9px 32px",
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: saving ? "not-allowed" : "pointer",
                        }}
                      >
                        {saving ? "Saving…" : "Save Bill"}
                      </button>
                      <button
                        onClick={() => window.print()}
                        style={{
                          background: "#374151",
                          color: "#fff",
                          border: "none",
                          borderRadius: 7,
                          padding: "9px 22px",
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        🖨️ Print Preview
                      </button>
                      <button
                        onClick={() => setPreview(null)}
                        style={{
                          background: "#f59e0b",
                          color: "#fff",
                          border: "none",
                          borderRadius: 7,
                          padding: "9px 22px",
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bill list */}
        {tab === "list" && (
          <div style={{ padding: 16 }}>
            {bills.length === 0 ? (
              <div
                style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>
                No bills generated yet
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
                        "Bill No",
                        "Date",
                        "Party",
                        "Period",
                        "Storage ₹",
                        "GST ₹",
                        "Total ₹",
                        "Status",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 10px",
                            textAlign: [
                              "Storage ₹",
                              "GST ₹",
                              "Total ₹",
                            ].includes(h)
                              ? "right"
                              : "left",
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
                    {bills.map((b, i) => (
                      <tr
                        key={b.id}
                        style={{
                          background: i % 2 === 0 ? "#fff" : "#f8fafc",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <td
                          style={{
                            padding: "7px 10px",
                            fontWeight: 600,
                            color: "#2563eb",
                          }}
                        >
                          {b.billNo}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            color: "#6b7280",
                            fontSize: 12,
                          }}
                        >
                          {new Date(b.billDate).toLocaleDateString("en-IN")}
                        </td>
                        <td style={{ padding: "7px 10px", fontWeight: 500 }}>
                          {b.customer?.name}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            color: "#6b7280",
                            fontSize: 12,
                          }}
                        >
                          {new Date(b.billFrom).toLocaleDateString("en-IN")} →{" "}
                          {new Date(b.billTo).toLocaleDateString("en-IN")}
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>
                          {fmt(b.storageCharge)}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            textAlign: "right",
                            color: "#7c3aed",
                          }}
                        >
                          {fmt(b.cgst + b.sgst)}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#15803d",
                          }}
                        >
                          ₹{fmt(b.totalAmount)}
                        </td>
                        <td style={{ padding: "7px 10px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              padding: "2px 8px",
                              borderRadius: 3,
                              background:
                                b.status === "paid"
                                  ? "#dcfce7"
                                  : b.status === "sent"
                                    ? "#eff6ff"
                                    : "#f3f4f6",
                              color:
                                b.status === "paid"
                                  ? "#15803d"
                                  : b.status === "sent"
                                    ? "#2563eb"
                                    : "#6b7280",
                            }}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td style={{ padding: "7px 10px" }}>
                          <button
                            onClick={() => navigate(`/report/bill/${b.id}`)}
                            style={{
                              background: "#2563eb",
                              color: "#fff",
                              border: "none",
                              borderRadius: 5,
                              padding: "4px 10px",
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@media print{nav,aside,header{display:none!important}}`}</style>
    </Layout>
  );
}
