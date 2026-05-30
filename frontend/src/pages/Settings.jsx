// frontend/src/pages/Settings.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

const inp = {
  width: "100%",
  padding: "8px 11px",
  fontSize: 13,
  border: "1.5px solid #d1d5db",
  borderRadius: 6,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const getCompany = () =>
  JSON.parse(
    localStorage.getItem("company") ||
      JSON.stringify({
        name: "S.V. Cold Storage",
        address: "Madanapalli Road, Kallupalli Village, Gangavaram",
        gstin: "",
        phone: "",
        email: "",
      }),
  );

// 🛡️ THE FIX: Moved the 'Field' component OUTSIDE the main function!
const Field = ({ label, value, onChange, type = "text", placeholder = "" }) => (
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
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inp}
    />
  </div>
);

export default function Settings() {
  const navigate = useNavigate();
  const me = JSON.parse(localStorage.getItem("user") || "{}");
  const [tab, setTab] = useState("company");
  const [company, setCompany] = useState(getCompany());
  const [pwd, setPwd] = useState({ current: "", newPwd: "", confirm: "" });
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const toast$ = (m, t = "ok") => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 4000);
  };
  const setC = (k, v) => setCompany((c) => ({ ...c, [k]: v }));

  const saveCompany = () => {
    localStorage.setItem("company", JSON.stringify(company));
    toast$("✅ Company settings saved!");
  };

  const changePassword = async () => {
    if (!pwd.current || !pwd.newPwd) {
      toast$("Fill all fields", "err");
      return;
    }
    if (pwd.newPwd !== pwd.confirm) {
      toast$("Passwords do not match", "err");
      return;
    }
    if (pwd.newPwd.length < 6) {
      toast$("Password must be at least 6 characters", "err");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify({
          currentPassword: pwd.current,
          newPassword: pwd.newPwd,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      toast$("✅ Password changed successfully!");
      setPwd({ current: "", newPwd: "", confirm: "" });
    } catch (e) {
      toast$(e.message, "err");
    }
    setSaving(false);
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login");
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
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          background: "#fff",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#374151",
            color: "#fff",
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: 17,
            borderRadius: "10px 10px 0 0",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ⚙️ Settings
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          {[
            ["company", "🏭 Company Details"],
            ["account", "👤 My Account"],
            ["session", "🔑 Session Info"],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: tab === k ? "#fff" : "transparent",
                color: tab === k ? "#374151" : "#6b7280",
                borderBottom:
                  tab === k ? "2px solid #374151" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <div style={{ padding: 28 }}>
          {/* ── COMPANY TAB ── */}
          {tab === "company" && (
            <div style={{ maxWidth: 580 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#1e293b",
                  marginBottom: 18,
                }}
              >
                Cold Storage Company Details
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <Field
                  label="Company / Cold Storage Name"
                  value={company.name}
                  onChange={(v) => setC("name", v)}
                />
                <Field
                  label="Address"
                  value={company.address}
                  onChange={(v) => setC("address", v)}
                />
                <Field
                  label="GSTIN"
                  value={company.gstin}
                  onChange={(v) => setC("gstin", v)}
                  placeholder="15-character GSTIN"
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                  }}
                >
                  <Field
                    label="Phone Number"
                    value={company.phone}
                    onChange={(v) => setC("phone", v)}
                  />
                  <Field
                    label="Email"
                    value={company.email}
                    onChange={(v) => setC("email", v)}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#1e40af",
                  marginBottom: 18,
                }}
              >
                ℹ️ These details appear on all printed documents — bills, gate
                passes, and ledger headers.
              </div>

              <button
                onClick={saveCompany}
                style={{
                  background: "#22c55e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "9px 28px",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Save Company Settings
              </button>
            </div>
          )}

          {/* ── ACCOUNT TAB ── */}
          {tab === "account" && (
            <div style={{ maxWidth: 480 }}>
              {/* Current user info */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "16px 20px",
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "#eff6ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#2563eb",
                    }}
                  >
                    {(me.username || "A")[0].toUpperCase()}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: "#1e293b",
                      }}
                    >
                      {me.username}
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "#eff6ff",
                        color: "#2563eb",
                      }}
                    >
                      {me.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Change password */}
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#1e293b",
                  marginBottom: 14,
                }}
              >
                Change Password
              </div>
              <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                {[
                  ["current", "Current Password"],
                  ["newPwd", "New Password"],
                  ["confirm", "Confirm New Password"],
                ].map(([k, l]) => (
                  <div key={k}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 4,
                      }}
                    >
                      {l}
                    </label>
                    <input
                      type="password"
                      value={pwd[k]}
                      onChange={(e) =>
                        setPwd((p) => ({ ...p, [k]: e.target.value }))
                      }
                      style={inp}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={changePassword}
                disabled={saving}
                style={{
                  background: saving ? "#86efac" : "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "9px 24px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {saving ? "Updating…" : "Update Password"}
              </button>
            </div>
          )}

          {/* ── SESSION TAB ── */}
          {tab === "session" && (
            <div style={{ maxWidth: 480 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#1e293b",
                  marginBottom: 18,
                }}
              >
                Session Information
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  overflow: "hidden",
                  marginBottom: 20,
                }}
              >
                {[
                  ["Logged in as", me.username],
                  ["Role", me.role],
                  ["Financial Year", localStorage.getItem("finYear") || "2026"],
                  ["Token duration", "30 days"],
                  ["Data storage", "PostgreSQL (localhost:5432)"],
                  ["Backend URL", "http://localhost:5000"],
                  ["Frontend URL", "http://localhost:5173"],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "8px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{ color: "#6b7280", width: 150, flexShrink: 0 }}
                    >
                      {l}
                    </span>
                    <strong style={{ color: "#1e293b" }}>{v}</strong>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={logout}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    padding: "9px 24px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Sign Out
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/login";
                  }}
                  style={{
                    background: "#6b7280",
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    padding: "9px 20px",
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Clear Token & Re-login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
