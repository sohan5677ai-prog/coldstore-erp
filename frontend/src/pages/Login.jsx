// frontend/src/pages/Login.jsx  — REPLACE
// Matches SVCold image 1: logo + KNM MULTI COLD STORAGE + Sign into account + Select Year

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000/api";
if (import.meta?.env?.VITE_API_URL) {
  // will be overridden by env at build time — just ensuring BASE is always set
}
const BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : `${API}`;

const co = JSON.parse(
  localStorage.getItem("company") || '{"name":"KNM MULTI COLD STORAGE"}',
);

// ── Sub-components ────────────────────────────────────────────

function LogoBlock() {
  return (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🏭</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1e293b",
          letterSpacing: 0.5,
          textDecoration: "underline",
          fontStyle: "italic",
          marginBottom: 4,
        }}
      >
        {co.name || "KNM MULTI COLD STORAGE"}
      </div>
      <div style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>
        Sign into your account
      </div>
    </div>
  );
}

function FormField({ label, type, value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
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
      )}
      <input
        type={type || "text"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: 14,
          border: "1px solid #d1d5db",
          borderRadius: 6,
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
      />
    </div>
  );
}

function ErrorBanner({ msg }) {
  return msg ? (
    <div
      style={{
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 6,
        padding: "8px 12px",
        marginBottom: 14,
        fontSize: 13,
        color: "#b91c1c",
      }}
    >
      ⚠️ {msg}
    </div>
  ) : null;
}

// ── Main export ───────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();

  const [step, setStep] = useState("year"); // 'year' | 'credentials'
  const [sessions, setSessions] = useState([]);
  const [selYear, setSelYear] = useState("");
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  // Check if already logged in with valid token
  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const expiresAt = payload.exp * 1000;
          if (expiresAt > Date.now()) {
            navigate("/home", { replace: true });
            return;
          }
        } catch (e) {
          console.error("Token parse error:", e.message);
        }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      // Load sessions for year selector
      try {
        const res = await fetch(`${BASE}/sessions`);
        const data = await res.json();
        const filtered = Array.isArray(data) ? data.filter((s) => s.label === "2026-27") : [];
        setSessions(filtered);
        setSelYear("2026-27");
      } catch (e) {
        console.error("Session load error:", e.message);
        // If no sessions exist yet, show credentials directly
        setSessions([]);
      }
      setChecking(false);
    };
    run();
  }, []);

  const handleYearNext = () => {
    if (!selYear) {
      setError("Please select a year");
      return;
    }
    setError("");
    setStep("credentials");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError("Enter username and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem(
        "finYear",
        selYear || sessions[0]?.label || "2026-27",
      );
      localStorage.setItem("sessionLabel", selYear);

      navigate("/home", { replace: true });
    } catch (e) {
      console.error("Login error:", e.message);
      setError("Cannot connect to server. Is the backend running?");
    }
    setLoading(false);
  };

  if (checking)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#f0f4f8",
          color: "#94a3b8",
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        Checking session…
      </div>
    );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f0f4f8",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "40px 40px 36px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.1)",
          width: 400,
          maxWidth: "95vw",
        }}
      >
        <LogoBlock />
        <ErrorBanner msg={error} />

        {/* ── STEP 1: Select Year ── */}
        {step === "year" && (
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Select Year
            </label>
            <select
              value={selYear}
              onChange={(e) => {
                setSelYear(e.target.value);
                setError("");
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                outline: "none",
                boxSizing: "border-box",
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: 20,
              }}
            >
              <option value="">Select Year</option>
              <option value="2026-27">2026-27</option>
            </select>

            <button
              onClick={handleYearNext}
              style={{
                width: "100%",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "11px 0",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Continue →
            </button>

            <div
              style={{
                marginTop: 12,
                fontSize: 11,
                color: "#94a3b8",
                textAlign: "center",
              }}
            >
              Each financial year is a separate session. Data is grouped by
              year.
            </div>
          </div>
        )}

        {/* ── STEP 2: Username + Password ── */}
        {step === "credentials" && (
          <form onSubmit={handleLogin}>
            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 6,
                padding: "6px 12px",
                marginBottom: 16,
                fontSize: 12,
                color: "#1e40af",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>
                Session: <strong>{selYear}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep("year");
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#2563eb",
                  fontSize: 11,
                  textDecoration: "underline",
                }}
              >
                Change
              </button>
            </div>

            <FormField
              label="Username"
              value={form.username}
              autoFocus
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              placeholder="Enter username"
            />

            <FormField
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="Enter password"
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "#93c5fd" : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "11px 0",
                fontWeight: 700,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>

            <div
              style={{
                textAlign: "center",
                marginTop: 16,
                fontSize: 11,
                color: "#94a3b8",
              }}
            >
              Default: admin / admin123
            </div>
          </form>
        )}

        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 10,
            color: "#cbd5e1",
          }}
        >
          Cold Storage ERP · Built with ❤️
        </div>
      </div>
    </div>
  );
}
