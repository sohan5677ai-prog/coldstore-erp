// frontend/src/components/Layout.jsx

import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import useIdleTimeout from "../hooks/useIdleTimeout";
import IdleWarning from "./IdleWarning";

const MENU = [
  { label: "Home", icon: "⊞", path: "/home" },
  { label: "Dashboard", icon: "▦", path: "/dashboard" },
  {
    label: "Master",
    icon: "✎",
    children: [{ label: "Create Customer", path: "/master/customer" }],
  },
  {
    label: "Commodity",
    icon: "⊡",
    children: [
      { label: "Create Commodity / Variety", path: "/commodity/master" },
    ],
  },
  {
    label: "Transaction",
    icon: "⇄",
    children: [
      { label: "Inward", path: "/transaction/inward" },
      { label: "Outward", path: "/transaction/outward" },
      { label: "Voucher", path: "/transaction/voucher" },
      { label: "Edit Vouchers", path: "/transaction/voucher-register" },
      { label: "Generate Bill", path: "/transaction/bill" },
      { label: "Bulk Upload (Excel)", path: "/transaction/inward-upload" },
    ],
  },
  {
    label: "Report",
    icon: "▤",
    children: [
      { label: "Inward Register", path: "/report/inward" },
      { label: "Outward Register", path: "/report/outward" },
      { label: "Party Ledger", path: "/report/party-ledger" },
      { label: "Party Balance", path: "/report/party-balance" },
      { label: "Party Rent Report", path: "/report/party-rent" },
      { label: "Stock Summary", path: "/report/stock-summary" },
      { label: "Stock By Party", path: "/report/stock-party" },
      { label: "Stock By Variety", path: "/report/stock-variety" },
      { label: "Gate Pass / Bill", path: "/report/gate-pass" },
      { label: "Bill Report", path: "/report/bill" },
      { label: "Location / Map", path: "/report/location" },
    ],
  },
  {
    label: "Account",
    icon: "▣",
    children: [
      { label: "Day Book", path: "/account/day" },
      { label: "Cash Book", path: "/account/cashbook" },
      { label: "Outstanding", path: "/account/outstanding" },
    ],
  },
  { label: "Settings", icon: "⚙", path: "/settings" },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Idle timeout (2-minute auto-logout) ──────────
  useIdleTimeout();
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  useEffect(() => {
    const onWarn = () => setShowIdleWarning(true);
    const onLogout = () => setShowIdleWarning(false);
    window.addEventListener("idle-warning", onWarn);
    window.addEventListener("idle-logout", onLogout);
    return () => {
      window.removeEventListener("idle-warning", onWarn);
      window.removeEventListener("idle-logout", onLogout);
    };
  }, []);

  // ── Sidebar open/close state ──────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expanded, setExpanded] = useState({});

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const finYear = localStorage.getItem("finYear") || "2026";
  const co = JSON.parse(
    localStorage.getItem("company") || '{"name":"KNM MULTI COLD STORAGE"}',
  );

  const toggle = (label) => setExpanded((p) => ({ ...p, [label]: !p[label] }));
  const toggleNav = () => setSidebarOpen((o) => !o);
  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const SIDEBAR_W = 240;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* ── Idle warning banner ── */}
      {showIdleWarning && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "#fef3c7",
            borderBottom: "2px solid #f59e0b",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 14,
            color: "#92400e",
            fontWeight: 500,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <span>⚠️ Session will expire in 15 seconds due to inactivity.</span>
          <button
            onClick={() => {
              setShowIdleWarning(false);
              // Moving the mouse resets the timer via the hook
              window.dispatchEvent(new MouseEvent("mousemove"));
            }}
            style={{
              background: "#f59e0b",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "5px 16px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Stay Logged In
          </button>
        </div>
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside
        style={{
          width: sidebarOpen ? SIDEBAR_W : 0,
          minWidth: sidebarOpen ? SIDEBAR_W : 0,
          background: "#1e2a38",
          color: "#c8d6e5",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden", // hides content when width=0
          transition: "width 0.25s ease, min-width 0.25s ease",
          zIndex: 20,
        }}
      >
        {/* Inner scroll container — fixed width so content doesn't squish */}
        <div
          style={{
            width: SIDEBAR_W,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#162030",
              padding: "14px 14px 12px",
              borderBottom: "1px solid #2d3f52",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#8a9bb0",
                fontWeight: 600,
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              SESSION-{finYear}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🏭</span>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 12,
                    color: "#fff",
                    letterSpacing: 0.3,
                  }}
                >
                  {co.name || "KNM MULTI COLD STORAGE"}
                </div>
                <div style={{ fontSize: 11, color: "#6b7f93" }}>
                  {user.username || "Admin"}
                </div>
              </div>
            </div>
            <input
              placeholder="Search…"
              style={{
                width: "100%",
                marginTop: 10,
                padding: "6px 10px",
                background: "#243448",
                border: "1px solid #2d3f52",
                borderRadius: 6,
                color: "#c8d6e5",
                fontSize: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "8px 0" }}>
            {MENU.map((item) => {
              const isActive = item.path === location.pathname;

              if (!item.children) {
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 16px",
                      textDecoration: "none",
                      color: isActive ? "#fff" : "#9aafc4",
                      background: isActive ? "#2a3f57" : "transparent",
                      borderLeft: isActive
                        ? "3px solid #4a90d9"
                        : "3px solid transparent",
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        e.currentTarget.style.background = "#243448";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span
                      style={{ fontSize: 15, width: 20, textAlign: "center" }}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              }

              const isOpen = expanded[item.label];
              const hasActive = item.children.some(
                (c) => c.path === location.pathname,
              );

              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggle(item.label)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 16px",
                      width: "100%",
                      background: "none",
                      border: "none",
                      color: hasActive ? "#fff" : "#9aafc4",
                      fontSize: 13,
                      cursor: "pointer",
                      borderLeft: hasActive
                        ? "3px solid #4a90d9"
                        : "3px solid transparent",
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#243448")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <span
                      style={{ fontSize: 15, width: 20, textAlign: "center" }}
                    >
                      {item.icon}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <span
                      style={{
                        fontSize: 10,
                        transition: "transform 0.2s",
                        transform: isOpen ? "rotate(90deg)" : "none",
                      }}
                    >
                      ›
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        background: "#162030",
                        borderBottom: "1px solid #2d3f52",
                      }}
                    >
                      {item.children.map((child) => {
                        const ca = child.path === location.pathname;
                        return (
                          <Link
                            key={child.label}
                            to={child.path}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "7px 16px 7px 44px",
                              textDecoration: "none",
                              color: ca ? "#4a90d9" : "#7a8fa3",
                              fontSize: 12,
                              background: ca ? "#1e2a38" : "transparent",
                              borderLeft: ca
                                ? "3px solid #4a90d9"
                                : "3px solid transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (!ca) e.currentTarget.style.color = "#c8d6e5";
                            }}
                            onMouseLeave={(e) => {
                              if (!ca) e.currentTarget.style.color = "#7a8fa3";
                            }}
                          >
                            <span style={{ fontSize: 5, color: "#4a6a8a" }}>
                              ●
                            </span>
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Sign Out */}
            <button
              onClick={logout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 16px",
                width: "100%",
                background: "none",
                border: "none",
                color: "#e07070",
                fontSize: 13,
                cursor: "pointer",
                marginTop: 8,
                borderLeft: "3px solid transparent",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>
                ⏻
              </span>
              Sign Out
            </button>
          </nav>
        </div>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Blue top bar */}
        <header
          style={{
            background: "#4a90d9",
            color: "#fff",
            padding: "0 20px",
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {/* ☰ Menu toggle button */}
          <button
            onClick={toggleNav}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: "6px 8px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 0.3,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            {/* Animated hamburger — 3 bars become arrow when closed */}
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                width: 18,
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  height: 2,
                  background: "#fff",
                  borderRadius: 1,
                  transition: "all 0.25s",
                  transform: !sidebarOpen
                    ? "rotate(45deg) translate(4px, 4px)"
                    : "none",
                }}
              />
              <span
                style={{
                  height: 2,
                  background: "#fff",
                  borderRadius: 1,
                  opacity: sidebarOpen ? 1 : 0,
                  transition: "opacity 0.2s",
                }}
              />
              <span
                style={{
                  height: 2,
                  background: "#fff",
                  borderRadius: 1,
                  transition: "all 0.25s",
                  transform: !sidebarOpen
                    ? "rotate(-45deg) translate(4px, -4px)"
                    : "none",
                }}
              />
            </span>
            Menu
          </button>

          {/* Right side: user info + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 13, opacity: 0.85 }}>
              Welcome, <strong>{user.username}</strong>
            </span>
            <button
              onClick={logout}
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 5,
                padding: "4px 12px",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            background: "#f0f4f8",
            padding: "20px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
