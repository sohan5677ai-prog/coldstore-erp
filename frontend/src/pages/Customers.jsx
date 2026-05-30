// frontend/src/pages/Customers.jsx  — REPLACE existing
// KEY CHANGE: City/Village field is now a live-search dropdown from Village master

import { useState, useEffect, useRef } from "react";
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
  if (!r.ok) throw new Error(d.message || "Error");
  return d;
}

function useDebounce(value, delay = 250) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

const inp = (err) => ({
  width: "100%",
  padding: "7px 10px",
  fontSize: 13,
  boxSizing: "border-box",
  border: `1.5px solid ${err ? "#f87171" : "#d1d5db"}`,
  borderRadius: 6,
  outline: "none",
  fontFamily: "inherit",
});

function F({ label, required, err, children }) {
  return (
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
        {required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
      {err && (
        <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>
          {err}
        </div>
      )}
    </div>
  );
}

function SH({ t }) {
  return (
    <div
      style={{
        background: "#2563eb",
        color: "#fff",
        padding: "7px 16px",
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: 0.4,
      }}
    >
      {t}
    </div>
  );
}

function G({ cols = 2, children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols},1fr)`,
        gap: "11px 18px",
        padding: "13px 16px",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      {children}
    </div>
  );
}

// ── City/Village live-search field ──────────────────────────
function CitySearch({ value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || "");
  const [villages, setVillages] = useState([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query, 200);
  const ref = useRef();

  // 🛡️ THE FIX: Wrap in an async function to safely update state
  useEffect(() => {
    const fetchVillages = async () => {
      if (!debounced.trim()) {
        setVillages([]);
        return;
      }
      try {
        const data = await api(`/villages?q=${encodeURIComponent(debounced)}`);
        setVillages(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchVillages();
  }, [debounced]);

  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const pick = (v) => {
    setQuery(`${v.name}${v.district ? ` (${v.district})` : ""}`);
    onChange(v.name);
    onSelect(v);
    setOpen(false);
    setVillages([]);
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Type city / village name…"
        style={inp()}
      />
      {open && villages.length > 0 && (
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
          {villages.map((v) => (
            <div
              key={v.id}
              onClick={() => pick(v)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 13,
                borderBottom: "1px solid #f1f5f9",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#eff6ff")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <strong>{v.name}</strong>
              {v.district && (
                <span style={{ color: "#6b7280", fontSize: 12 }}>
                  {" "}
                  ({v.district})
                </span>
              )}
              <span style={{ float: "right", fontSize: 11, color: "#94a3b8" }}>
                {v.state}
              </span>
            </div>
          ))}
          <div
            style={{
              padding: "6px 12px",
              fontSize: 11,
              color: "#6b7280",
              background: "#f8fafc",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Not listed?</span>
            <span
              style={{
                color: "#2563eb",
                cursor: "pointer",
                textDecoration: "underline",
              }}
              onClick={() => window.open("/master/village", "_blank")}
            >
              Add city / village →
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
const BLANK = {
  customerType: "Kishan",
  name: "",
  address: "",
  city: "",
  district: "",
  state: "",
  pinCode: "",
  mobileNumber: "",
  phoneNumber: "",
  email: "",
  gstin: "",
  subGroup: "FARMER",
  guarantor: "",
  openingBalance: "",
  obDate: "",
  aadhaarNo: "",
  panNo: "",
  paymentMode: "CASH",
  isBlacklisted: false,
  gstStatus: false,
  palletDetails: "",
};

export default function Customers() {
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("form");
  const [editId, setEditId] = useState(null);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const toast$ = (msg, t = "ok") => {
    setToast({ msg, t });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      setCustomers(await api("/customers"));
    } catch (e) {
      toast$(e.message, "err");
    }
    setLoading(false);
  };

  // 🛡️ THE FIX: Wrap load() in an async initialization function
  useEffect(() => {
    const initLoad = async () => {
      await load();
    };
    initLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.mobileNumber.trim()) e.mobileNumber = "Mobile required";
    else if (!/^\d{10}$/.test(form.mobileNumber))
      e.mobileNumber = "Enter 10-digit mobile";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        openingBalance: parseFloat(form.openingBalance) || 0,
      };
      if (editId) {
        await api(`/customers/${editId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast$("✅ Customer updated!");
      } else {
        await api("/customers", { method: "POST", body: JSON.stringify(body) });
        toast$("✅ Customer created!");
      }
      setForm(BLANK);
      setEditId(null);
      setErrors({});
      load();
      setTab("list");
    } catch (e) {
      toast$("❌ " + e.message, "err");
    }
    setSaving(false);
  };

  const startEdit = (c) => {
    setForm({
      customerType: c.customerType || "Kishan",
      name: c.name || "",
      address: c.address || "",
      city: c.city || "",
      district: c.district || "",
      state: c.state || "",
      pinCode: c.pinCode || "",
      mobileNumber: c.mobileNumber || "",
      phoneNumber: c.phoneNumber || "",
      email: c.email || "",
      gstin: c.gstin || "",
      subGroup: c.subGroup || "FARMER",
      guarantor: c.guarantor || "",
      openingBalance: c.openingBalance || "",
      obDate: c.obDate ? c.obDate.slice(0, 10) : "",
      aadhaarNo: c.aadhaarNo || "",
      panNo: c.panNo || "",
      paymentMode: c.paymentMode || "CASH",
      isBlacklisted: c.isBlacklisted || false,
      gstStatus: c.gstStatus || false,
      palletDetails: c.palletDetails || "",
    });
    setEditId(c.id);
    setTab("form");
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.mobileNumber || "").includes(search) ||
      (c.partyCode || "").toLowerCase().includes(search.toLowerCase()),
  );

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
          {toast.msg}
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
        {/* Header */}
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
          <span style={{ fontWeight: 700, fontSize: 17 }}>Customer Ledger</span>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              ["form", editId ? "✎ Edit" : "＋ New Customer"],
              ["list", `📋 All (${customers.length})`],
            ].map(([t, lbl]) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  if (t === "list") load();
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
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {tab === "form" && (
          <>
            <SH t="PARTY DETAILS" />
            <G cols={3}>
              <F label="Customer Type">
                <select
                  value={form.customerType}
                  onChange={(e) => set("customerType", e.target.value)}
                  style={inp()}
                >
                  {["Kishan", "Trader", "Agent", "Company", "Other"].map(
                    (t) => (
                      <option key={t}>{t}</option>
                    ),
                  )}
                </select>
              </F>
              <F label="Customer Name" required err={errors.name}>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Full name"
                  style={inp(errors.name)}
                />
              </F>
              <F label="Sub Group">
                <select
                  value={form.subGroup}
                  onChange={(e) => set("subGroup", e.target.value)}
                  style={inp()}
                >
                  {["FARMER", "TRADER", "AGENT", "BROKER", "OTHERS"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </F>
            </G>

            <SH t="ADDRESS" />
            <G cols={2}>
              <F label="Address">
                <input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Street / House No."
                  style={inp()}
                />
              </F>
              {/* ── City/Village — live dropdown ── */}
              <F label="City / Village">
                <CitySearch
                  value={form.city}
                  onChange={(val) => set("city", val)}
                  onSelect={(v) => {
                    set("city", v.name);
                    set("district", v.district || form.district);
                    set("state", v.state || form.state);
                  }}
                />
              </F>
              <F label="District">
                <input
                  value={form.district}
                  onChange={(e) => set("district", e.target.value)}
                  placeholder="District (auto-fills from city)"
                  style={inp()}
                />
              </F>
              <F label="State">
                <input
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="State (auto-fills from city)"
                  style={inp()}
                />
              </F>
              <F label="PIN Code">
                <div style={{ position: "relative" }}>
                  <input
                    value={form.pinCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      set("pinCode", val);
                      if (val.length === 6) {
                        // Auto-fetch at exactly 6 digits
                        const fetchPin = async () => {
                          try {
                            const res = await fetch(
                              `https://api.postalpincode.in/pincode/${val}`,
                            );
                            const data = await res.json();
                            if (
                              data?.[0]?.Status === "Success" &&
                              data[0].PostOffice?.length > 0
                            ) {
                              const po = data[0].PostOffice[0];
                              if (!form.city) set("city", po.Name || "");
                              if (!form.district)
                                set("district", po.District || "");
                              if (!form.state) set("state", po.State || "");
                            }
                          } catch (err) {
                            console.error("PIN fetch error:", err.message);
                          }
                        };
                        fetchPin();
                      }
                    }}
                    placeholder="6-digit PIN (auto-fills city)"
                    maxLength={6}
                    style={inp()}
                  />
                  {form.pinCode.length === 6 && (
                    <span
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 11,
                        color: "#22c55e",
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              </F>
              <F label="Guarantor">
                <input
                  value={form.guarantor}
                  onChange={(e) => set("guarantor", e.target.value)}
                  placeholder="Guarantor (optional)"
                  style={inp()}
                />
              </F>
            </G>

            <SH t="CONTACT & IDENTITY" />
            <G cols={3}>
              <F label="Mobile Number" required err={errors.mobileNumber}>
                <input
                  value={form.mobileNumber}
                  onChange={(e) => set("mobileNumber", e.target.value)}
                  placeholder="10-digit mobile"
                  maxLength={10}
                  style={inp(errors.mobileNumber)}
                />
              </F>
              <F label="Phone Number">
                <input
                  value={form.phoneNumber}
                  onChange={(e) => set("phoneNumber", e.target.value)}
                  placeholder="Landline (optional)"
                  style={inp()}
                />
              </F>
              <F label="Email ID">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@example.com"
                  style={inp()}
                />
              </F>
              <F label="Aadhaar No.">
                <input
                  value={form.aadhaarNo}
                  onChange={(e) => set("aadhaarNo", e.target.value)}
                  placeholder="12-digit Aadhaar"
                  maxLength={12}
                  style={inp()}
                />
              </F>
              <F label="PAN No.">
                <input
                  value={form.panNo}
                  onChange={(e) => set("panNo", e.target.value)}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  style={{ ...inp(), textTransform: "uppercase" }}
                />
              </F>
              <F label="GSTIN">
                <input
                  value={form.gstin}
                  onChange={(e) => set("gstin", e.target.value)}
                  placeholder="15-char GSTIN"
                  maxLength={15}
                  style={inp()}
                />
              </F>
            </G>

            <SH t="FINANCIAL" />
            <G cols={3}>
              <F label="Opening Balance (₹)">
                <input
                  type="number"
                  value={form.openingBalance}
                  onChange={(e) => set("openingBalance", e.target.value)}
                  placeholder="0.00"
                  style={inp()}
                />
              </F>
              <F label="O.B. Date">
                <input
                  type="date"
                  value={form.obDate}
                  onChange={(e) => set("obDate", e.target.value)}
                  style={inp()}
                />
              </F>
              <F label="Payment Mode">
                <select
                  value={form.paymentMode}
                  onChange={(e) => set("paymentMode", e.target.value)}
                  style={inp()}
                >
                  {["CASH", "BANK", "UPI", "CHEQUE"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </F>
              <F label="GST Status">
                <select
                  value={form.gstStatus ? "Yes" : "No"}
                  onChange={(e) => set("gstStatus", e.target.value === "Yes")}
                  style={inp()}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </F>
              <F label="Blacklisted">
                <select
                  value={form.isBlacklisted ? "Yes" : "No"}
                  onChange={(e) =>
                    set("isBlacklisted", e.target.value === "Yes")
                  }
                  style={inp()}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </F>
              <F label="Pallet Details">
                <input
                  value={form.palletDetails}
                  onChange={(e) => set("palletDetails", e.target.value)}
                  placeholder="Optional"
                  style={inp()}
                />
              </F>
            </G>

            <div
              style={{
                padding: "14px 16px",
                display: "flex",
                gap: 10,
                borderTop: "1px solid #f1f5f9",
              }}
            >
              <button
                onClick={handleSave}
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
                {saving ? "Saving…" : editId ? "Update" : "Save Customer"}
              </button>
              <button
                onClick={() => {
                  setForm(BLANK);
                  setEditId(null);
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
                Cancel
              </button>
            </div>
          </>
        )}

        {tab === "list" && (
          <div style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 14,
                alignItems: "center",
              }}
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, mobile, party code…"
                style={{ ...inp(), maxWidth: 360 }}
              />
              <button
                onClick={() => {
                  setTab("form");
                  setForm(BLANK);
                  setEditId(null);
                }}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "8px 18px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                ＋ Add Customer
              </button>
              <span
                style={{ fontSize: 12, color: "#6b7280", marginLeft: "auto" }}
              >
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div
                style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}
              >
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>👥</div>
                <div style={{ color: "#94a3b8" }}>
                  {search
                    ? "No results"
                    : "No customers yet — add the first one!"}
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
                        "Code",
                        "Name",
                        "Type",
                        "City",
                        "Mobile",
                        "Sub Group",
                        "Status",
                        "Action",
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
                    {filtered.map((c, i) => (
                      <tr
                        key={c.id}
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
                          {c.partyCode || "—"}
                        </td>
                        <td style={{ padding: "7px 10px", fontWeight: 500 }}>
                          {c.name}
                        </td>
                        <td style={{ padding: "7px 10px", color: "#6b7280" }}>
                          {c.customerType}
                        </td>
                        <td style={{ padding: "7px 10px", color: "#6b7280" }}>
                          {c.city || "—"}
                        </td>
                        <td style={{ padding: "7px 10px" }}>
                          {c.mobileNumber || "—"}
                        </td>
                        <td style={{ padding: "7px 10px", color: "#6b7280" }}>
                          {c.subGroup || "—"}
                        </td>
                        <td style={{ padding: "7px 10px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 3,
                              fontWeight: 500,
                              background: c.isBlacklisted
                                ? "#fee2e2"
                                : "#dcfce7",
                              color: c.isBlacklisted ? "#b91c1c" : "#15803d",
                            }}
                          >
                            {c.isBlacklisted ? "Blacklisted" : "Active"}
                          </span>
                        </td>
                        <td style={{ padding: "7px 10px" }}>
                          <button
                            onClick={() => startEdit(c)}
                            style={{
                              background: "#2563eb",
                              color: "#fff",
                              border: "none",
                              borderRadius: 5,
                              padding: "4px 12px",
                              fontSize: 12,
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            Edit
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
    </Layout>
  );
}
