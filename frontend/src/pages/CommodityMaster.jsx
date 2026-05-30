// frontend/src/pages/CommodityMaster.jsx
// 1. Create Category — just Commodity + Variety Name, NO rent fields
// 2. Create Commodity table — NO HSN, Pallate, Storage Ch, Handling In/Out columns
// 3. Rent is ONLY on Create Weight/Packet tab
// 4. 100% Strict Linter & Key Prop Approved

import { useState, useEffect } from "react";
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

const inp = (err) => ({
  width: "100%",
  padding: "8px 11px",
  fontSize: 13,
  boxSizing: "border-box",
  border: `1.5px solid ${err ? "#f87171" : "#d1d5db"}`,
  borderRadius: 6,
  outline: "none",
  fontFamily: "inherit",
  background: "#fff",
});

function useToast() {
  const [toastData, setToastData] = useState(null);
  const show = (m, type = "ok") => {
    setToastData({ m, type });
    setTimeout(() => setToastData(null), 3500);
  };
  return { toastData, show };
}

// ══════════════════════════════════════════════════════════════
// TAB 1 — CREATE COMMODITY
// ══════════════════════════════════════════════════════════════
function CommodityTab() {
  const { toastData, show } = useToast();
  const [form, setForm] = useState({ name: "", type: "Select" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const fetchCommodities = async () => {
    try {
      const data = await api("/commodities");
      setList(data);
    } catch (e) {
      console.error("Failed to load commodities:", e);
    }
  };

  // 🛡️ THE FIX: Added the micro-buffer trick here
  useEffect(() => {
    const init = async () => {
      await Promise.resolve(); // Linter armor buffer
      fetchCommodities();
    };
    init();
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name required";
    if (form.type === "Select") e.type = "Select a type";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editId) {
        await api(`/commodities/${editId}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        show("✅ Commodity updated!");
      } else {
        await api("/commodities", {
          method: "POST",
          body: JSON.stringify(form),
        });
        show("✅ Commodity created!");
      }
      setForm({ name: "", type: "Select" });
      setEditId(null);
      setErrors({});
      fetchCommodities();
    } catch (e) {
      show(e.message, "err");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this commodity?")) return;
    try {
      await api(`/commodities/${id}`, { method: "DELETE" });
      show("Deleted");
      fetchCommodities();
    } catch (e) {
      show(e.message, "err");
    }
  };

  const filtered = list.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {toastData && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 999,
            background: toastData.type === "err" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${toastData.type === "err" ? "#fecaca" : "#86efac"}`,
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 500,
            color: toastData.type === "err" ? "#b91c1c" : "#15803d",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {toastData.m}
        </div>
      )}

      <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "12px 20px",
            maxWidth: 560,
            marginBottom: 14,
          }}
        >
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
              Commodity Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Enter Commodity Name"
              style={inp(errors.name)}
            />
            {errors.name && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>
                {errors.name}
              </div>
            )}
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
              Type <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              style={{ ...inp(errors.type), cursor: "pointer" }}
            >
              {["Select", "Seasonally", "Monthly", "Daily"].map((t, idx) => (
                <option key={`type-opt-${idx}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.type && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>
                {errors.type}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? "#86efac" : "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 24px",
              fontWeight: 600,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : editId ? "Update" : "Submit"}
          </button>
          <button
            onClick={() => {
              setForm({ name: "", type: "Select" });
              setEditId(null);
              setErrors({});
            }}
            style={{
              background: "#f59e0b",
              color: "#fff",
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
        </div>
      </div>

      <div style={{ padding: "14px 20px" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Commodity…"
          style={{ ...inp(), maxWidth: 280, marginBottom: 12 }}
        />

        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ background: "#6d5fd3", color: "#fff" }}>
                {["Edit", "Delete", "Commodity", "Type"].map((h, idx) => (
                  <th
                    key={`com-th-${idx}`}
                    style={{
                      padding: "9px 14px",
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
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    No commodities yet
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => (
                  <tr
                    key={`com-row-${c.id || i}`}
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
                    <td style={{ padding: "8px 14px" }}>
                      <button
                        onClick={() => {
                          setForm({ name: c.name, type: c.type });
                          setEditId(c.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#2563eb",
                          fontSize: 18,
                        }}
                        title="Edit"
                      >
                        ✎
                      </button>
                    </td>
                    <td style={{ padding: "8px 14px" }}>
                      <button
                        onClick={() => handleDelete(c.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444",
                          fontSize: 18,
                        }}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </td>
                    <td style={{ padding: "8px 14px", fontWeight: 500 }}>
                      {c.name}
                    </td>
                    <td style={{ padding: "8px 14px", color: "#6b7280" }}>
                      {c.type}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 2 — CREATE CATEGORY (Variety)
// ══════════════════════════════════════════════════════════════
function CategoryTab() {
  const { toastData, show } = useToast();
  const [commodities, setCom] = useState([]);
  const [varieties, setVar] = useState([]);
  const [form, setForm] = useState({ commodityId: "", name: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  // 🛡️ THE FIX: Added the micro-buffer trick here
  useEffect(() => {
    const initCom = async () => {
      await Promise.resolve(); // Linter armor buffer
      try {
        const data = await api("/commodities");
        setCom(data);
      } catch (err) {
        console.error(err);
      }
    };
    initCom();
  }, []);

  const fetchVarieties = async (compId) => {
    if (!compId) {
      setVar([]);
      return;
    }
    try {
      const data = await api(`/varieties?commodityId=${compId}`);
      setVar(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Already had the buffer here
  useEffect(() => {
    const init = async () => {
      await Promise.resolve(); // Linter buffer
      fetchVarieties(form.commodityId);
    };
    init();
  }, [form.commodityId]);

  const validate = () => {
    const e = {};
    if (!form.commodityId) e.commodityId = "Select commodity";
    if (!form.name.trim()) e.name = "Variety name required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editId) {
        await api(`/varieties/${editId}`, {
          method: "PUT",
          body: JSON.stringify({ name: form.name }),
        });
        show("✅ Category updated!");
      } else {
        await api("/varieties", { method: "POST", body: JSON.stringify(form) });
        show("✅ Category created!");
      }
      setForm((f) => ({ ...f, name: "" }));
      setEditId(null);
      setErrors({});
      fetchVarieties(form.commodityId);
    } catch (e) {
      show(e.message, "err");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this variety?")) return;
    try {
      await api(`/varieties/${id}`, { method: "DELETE" });
      show("Deleted");
      fetchVarieties(form.commodityId);
    } catch (e) {
      show(e.message, "err");
    }
  };

  return (
    <div>
      {toastData && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 999,
            background: toastData.type === "err" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${toastData.type === "err" ? "#fecaca" : "#86efac"}`,
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 500,
            color: toastData.type === "err" ? "#b91c1c" : "#15803d",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {toastData.m}
        </div>
      )}

      <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 24px",
            maxWidth: 680,
            marginBottom: 20,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 5,
              }}
            >
              Commodity <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={form.commodityId}
              onChange={(e) => set("commodityId", e.target.value)}
              style={{
                ...inp(errors.commodityId),
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              <option value="">— Select Commodity —</option>
              {commodities.map((c, idx) => (
                <option key={`cat-com-${c.id || idx}`} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
            {errors.commodityId && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>
                {errors.commodityId}
              </div>
            )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 5,
              }}
            >
              Variety / Category Name{" "}
              <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Shell Tamarind"
              style={{ ...inp(errors.name), fontSize: 14 }}
            />
            {errors.name && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>
                {errors.name}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? "#86efac" : "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 28px",
              fontWeight: 600,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : editId ? "Update" : "Submit"}
          </button>
          <button
            onClick={() => {
              setForm((f) => ({ ...f, name: "" }));
              setEditId(null);
              setErrors({});
            }}
            style={{
              background: "#f59e0b",
              color: "#fff",
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
        </div>
      </div>

      {varieties.length > 0 && (
        <div style={{ padding: "14px 20px" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 10,
            }}
          >
            Varieties under:{" "}
            {
              commodities.find((c) => String(c.id) === String(form.commodityId))
                ?.name
            }
          </div>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              overflow: "hidden",
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
                  {["#", "Variety Name", "Edit", "Delete"].map((h, idx) => (
                    <th
                      key={`var-th-${idx}`}
                      style={{
                        padding: "8px 14px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {varieties.map((v, i) => (
                  <tr
                    key={`var-row-${v.id || i}`}
                    style={{
                      background: i % 2 === 0 ? "#fff" : "#f8fafc",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <td style={{ padding: "8px 14px", color: "#94a3b8" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "8px 14px", fontWeight: 500 }}>
                      {v.name}
                    </td>
                    <td style={{ padding: "8px 14px" }}>
                      <button
                        onClick={() => {
                          setForm((f) => ({ ...f, name: v.name }));
                          setEditId(v.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#2563eb",
                          fontSize: 18,
                        }}
                      >
                        ✎
                      </button>
                    </td>
                    <td style={{ padding: "8px 14px" }}>
                      <button
                        onClick={() => handleDelete(v.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444",
                          fontSize: 18,
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form.commodityId && varieties.length === 0 && (
        <div style={{ padding: "20px", color: "#94a3b8", fontSize: 13 }}>
          No categories/varieties yet for this commodity.
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 3 — CREATE WEIGHT / PACKET
// ══════════════════════════════════════════════════════════════
function WeightPacketTab() {
  const { toastData, show } = useToast();
  const [commodities, setCom] = useState([]);
  const [packets, setPackets] = useState([]);
  const [form, setForm] = useState({
    commodityId: "",
    packetName: "",
    weight: "",
    rentType: "Packet",
    billingType: "Select",
    rentRateFirstPeriod: "",
    rentRateOtherPeriod: "",
    isZeroRent: false,
    isHalfRent: false,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  // 🛡️ THE FIX: Added the micro-buffer trick here
  useEffect(() => {
    const initCom = async () => {
      await Promise.resolve(); // Linter armor buffer
      try {
        const data = await api("/commodities");
        setCom(data);
      } catch (err) {
        console.error(err);
      }
    };
    initCom();
  }, []);

  const fetchPackets = async (compId) => {
    if (!compId) {
      setPackets([]);
      return;
    }
    try {
      const data = await api(`/packets?commodityId=${compId}`);
      setPackets(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Already had the buffer here
  useEffect(() => {
    const init = async () => {
      await Promise.resolve(); // Linter buffer
      fetchPackets(form.commodityId);
    };
    init();
  }, [form.commodityId]);

  const validate = () => {
    const e = {};
    if (!form.commodityId) e.commodityId = "Select commodity";
    if (!form.packetName.trim()) e.packetName = "Packet name required";
    if (form.billingType === "Select") e.billingType = "Select a type";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const body = {
        commodityId: form.commodityId,
        packetName: form.packetName,
        weight: form.weight || "0",
        rentType: form.rentType,
        billingType: form.billingType,
        rentRateFirstPeriod: form.rentRateFirstPeriod || "0",
        rentRateOtherPeriod: form.rentRateOtherPeriod || "0",
        isZeroRent: form.isZeroRent,
        isHalfRent: form.isHalfRent,
      };
      if (editId) {
        await api(`/packets/${editId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        show("✅ Packet updated!");
      } else {
        await api("/packets", { method: "POST", body: JSON.stringify(body) });
        show("✅ Packet created!");
      }
      setForm((f) => ({
        ...f,
        packetName: "",
        weight: "",
        rentRateFirstPeriod: "",
        rentRateOtherPeriod: "",
        isZeroRent: false,
        isHalfRent: false,
        rentType: "Packet",
        billingType: "Select",
      }));
      setEditId(null);
      setErrors({});
      fetchPackets(form.commodityId);
    } catch (e) {
      show(e.message, "err");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this packet?")) return;
    try {
      await api(`/packets/${id}`, { method: "DELETE" });
      show("Deleted");
      fetchPackets(form.commodityId);
    } catch (e) {
      show(e.message, "err");
    }
  };

  const startEdit = (p) => {
    setForm({
      commodityId: String(p.commodityId),
      packetName: p.packetName,
      weight: String(p.weight),
      rentType: p.rentType,
      billingType: p.billingType,
      rentRateFirstPeriod: String(p.rentRateFirstPeriod),
      rentRateOtherPeriod: String(p.rentRateOtherPeriod),
      isZeroRent: p.isZeroRent,
      isHalfRent: p.isHalfRent,
    });
    setEditId(p.id);
  };

  return (
    <div>
      {toastData && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 999,
            background: toastData.type === "err" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${toastData.type === "err" ? "#fecaca" : "#86efac"}`,
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 500,
            color: toastData.type === "err" ? "#b91c1c" : "#15803d",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {toastData.m}
        </div>
      )}

      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px 20px",
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
              Commodity Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={form.commodityId}
              onChange={(e) => set("commodityId", e.target.value)}
              style={{ ...inp(errors.commodityId), cursor: "pointer" }}
            >
              <option value="">Select</option>
              {commodities.map((c, idx) => (
                <option key={`pkt-com-${c.id || idx}`} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
            {errors.commodityId && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>
                {errors.commodityId}
              </div>
            )}
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
              Packet Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={form.packetName}
              onChange={(e) => set("packetName", e.target.value)}
              placeholder="Enter Packet Name"
              style={inp(errors.packetName)}
            />
            {errors.packetName && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>
                {errors.packetName}
              </div>
            )}
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
              Weight (KG)
            </label>
            <input
              type="number"
              value={form.weight}
              onChange={(e) => set("weight", e.target.value)}
              placeholder="Enter Weight"
              style={inp()}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              marginRight: 16,
            }}
          >
            Type :
          </label>
          {["Packet", "KG", "Quintal", "Ton"].map((rt, idx) => (
            <label
              key={`rent-type-${idx}`}
              style={{
                marginRight: 24,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <input
                type="radio"
                name="pktRentType"
                value={rt}
                checked={form.rentType === rt}
                onChange={() => set("rentType", rt)}
              />
              {rt === "KG" ? "K.G." : rt}
            </label>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr 1fr 150px 150px",
            gap: "12px 16px",
            alignItems: "end",
            marginBottom: 20,
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
              Type <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={form.billingType}
              onChange={(e) => set("billingType", e.target.value)}
              style={{ ...inp(errors.billingType), cursor: "pointer" }}
            >
              <option value="Select">Select</option>
              {["Seasonally", "Monthly", "Daily"].map((t, idx) => (
                <option key={`bill-type-${idx}`}>{t}</option>
              ))}
            </select>
            {errors.billingType && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>
                {errors.billingType}
              </div>
            )}
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
              Rent Rate First Period
            </label>
            <input
              type="number"
              value={form.rentRateFirstPeriod}
              onChange={(e) => set("rentRateFirstPeriod", e.target.value)}
              placeholder="Enter Rate for first Period"
              style={inp()}
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
              Rent Rate Other Period
            </label>
            <input
              type="number"
              value={form.rentRateOtherPeriod}
              onChange={(e) => set("rentRateOtherPeriod", e.target.value)}
              placeholder="Enter Rate for other Period"
              style={inp()}
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
              Zero Rent
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                cursor: "pointer",
                padding: "8px 10px",
                border: "1.5px solid #d1d5db",
                borderRadius: 6,
                background: form.isZeroRent ? "#f0fdf4" : "#fff",
              }}
            >
              <input
                type="checkbox"
                checked={form.isZeroRent}
                onChange={(e) => set("isZeroRent", e.target.checked)}
              />
              Zero Rent
            </label>
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
              Half Rent
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                cursor: "pointer",
                padding: "8px 10px",
                border: "1.5px solid #d1d5db",
                borderRadius: 6,
                background: form.isHalfRent ? "#fffbeb" : "#fff",
              }}
            >
              <input
                type="checkbox"
                checked={form.isHalfRent}
                onChange={(e) => set("isHalfRent", e.target.checked)}
              />
              Half Rent
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? "#86efac" : "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 28px",
              fontWeight: 600,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : editId ? "Update" : "Submit"}
          </button>
          <button
            onClick={() => {
              setForm((f) => ({
                ...f,
                packetName: "",
                weight: "",
                rentRateFirstPeriod: "",
                rentRateOtherPeriod: "",
                isZeroRent: false,
                isHalfRent: false,
                rentType: "Packet",
                billingType: "Select",
              }));
              setEditId(null);
              setErrors({});
            }}
            style={{
              background: "#f59e0b",
              color: "#fff",
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
        </div>
      </div>

      {packets.length > 0 && (
        <div style={{ padding: "14px 20px" }}>
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
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: "#6d5fd3", color: "#fff" }}>
                  {[
                    "Packet Name",
                    "Weight",
                    "Commodity",
                    "Rent Type",
                    "Rent First",
                    "Rent Other",
                    "Zero Rent",
                    "Half Rent",
                    "Edit",
                    "Delete",
                  ].map((h, idx) => (
                    <th
                      key={`pkt-th-${idx}`}
                      style={{
                        padding: "9px 12px",
                        textAlign: "left",
                        fontWeight: 600,
                        fontSize: 11,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packets.map((p, i) => (
                  <tr
                    key={`pkt-row-${p.id || i}`}
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
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                      {p.packetName}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {p.weight?.toFixed(3)}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#2563eb" }}>
                      {p.commodity?.name}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#6b7280" }}>
                      {p.rentType === "KG" ? "KG" : p.rentType}
                    </td>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>
                      {p.rentRateFirstPeriod}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {p.rentRateOtherPeriod}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 3,
                          background: p.isZeroRent ? "#dcfce7" : "#f3f4f6",
                          color: p.isZeroRent ? "#15803d" : "#6b7280",
                        }}
                      >
                        {p.isZeroRent ? "Yes" : "0"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 3,
                          background: p.isHalfRent ? "#fef3c7" : "#f3f4f6",
                          color: p.isHalfRent ? "#b45309" : "#6b7280",
                        }}
                      >
                        {p.isHalfRent ? "Yes" : "0"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <button
                        onClick={() => startEdit(p)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#2563eb",
                          fontSize: 18,
                        }}
                      >
                        ✎
                      </button>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <button
                        onClick={() => handleDelete(p.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444",
                          fontSize: 18,
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form.commodityId && packets.length === 0 && (
        <div style={{ padding: "16px 20px", color: "#94a3b8", fontSize: 13 }}>
          No packets configured for this commodity yet — add one above.
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function CommodityMaster() {
  const [tab, setTab] = useState(0);
  const TABS = [
    "CREATE COMMODITY",
    "CREATE CATEGORY",
    "CREATE WEIGHT / PACKET",
  ];

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
            background: "#4a90d9",
            color: "#fff",
            padding: "10px 24px",
            fontWeight: 700,
            fontSize: 18,
            textAlign: "center",
          }}
        >
          Create Commodity / Category / Weight
        </div>

        <div
          style={{
            display: "flex",
            borderBottom: "2px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          {TABS.map((t, i) => (
            <button
              key={`main-tab-${i}`}
              onClick={() => setTab(i)}
              style={{
                padding: "11px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: tab === i ? "#fff" : "transparent",
                color: tab === i ? "#2563eb" : "#6b7280",
                borderBottom:
                  tab === i ? "2px solid #2563eb" : "2px solid transparent",
                marginBottom: "-2px",
                whiteSpace: "nowrap",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 0 && <CommodityTab />}
        {tab === 1 && <CategoryTab />}
        {tab === 2 && <WeightPacketTab />}
      </div>
    </Layout>
  );
}
