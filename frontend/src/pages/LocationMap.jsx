// frontend/src/pages/LocationMap.jsx
// Cold Storage Digital Twin — live data from GET /api/inward
// Rules:
// • ALL sub-components defined OUTSIDE export default function
// • ALL useEffect setState wrapped in async + await Promise.resolve()
// • No empty catch blocks — explicit console.error everywhere

import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";

// ═══════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════

const API = "http://localhost:5000/api";

const tok = () => localStorage.getItem("token");

// Max capacity per chamber
const MAX_BAGS = 200;
const MAX_WEIGHT = 10000; // kg

// ── Building structure ────────────────────────────────────────
const BUILDING = [
  {
    id: "A",
    label: "Floor A",
    sublabel: "Ground Floor",
    color: "#3b82f6",
    shadow: "#1d4ed8",
    rooms: [
      { id: "A1", label: "Room 1", from: 1, to: 60 },
      { id: "A2", label: "Room 2", from: 61, to: 108 },
      { id: "A3", label: "Room 3", from: 109, to: 168 },
    ],
  },
  {
    id: "B",
    label: "Floor B",
    sublabel: "First Floor",
    color: "#8b5cf6",
    shadow: "#6d28d9",
    rooms: [
      { id: "B1", label: "Room 1", from: 169, to: 228 },
      { id: "B2", label: "Room 2", from: 229, to: 276 },
      { id: "B3", label: "Room 3", from: 277, to: 336 },
    ],
  },
  {
    id: "C",
    label: "Floor C",
    sublabel: "Second Floor",
    color: "#10b981",
    shadow: "#047857",
    rooms: [
      { id: "C1", label: "Room 1", from: 337, to: 396 },
      { id: "C2", label: "Room 2", from: 397, to: 444 },
      { id: "C3", label: "Room 3", from: 445, to: 504 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
//  DATA HELPERS
// ═══════════════════════════════════════════════════════════════

// Extract numeric chamber number from any lotCode format:
// "A47" → 47 | "B230" → 230 | "47" → 47 | "C-104" → 104
function parseLotCode(lotCode) {
  if (!lotCode) return null;
  const match = String(lotCode).match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  return n >= 1 && n <= 504 ? n : null;
}

function getChambers(room) {
  const result = [];
  for (let i = room.from; i <= room.to; i++) result.push(i);
  return result;
}

// Build stats from live chamberData state
function floorStats(floor, chamberData) {
  const all = floor.rooms.flatMap(getChambers);
  const occupied = all.filter((c) => chamberData[c]?.occupied).length;
  return { total: all.length, occupied, empty: all.length - occupied };
}

function roomStats(room, chamberData) {
  const chambers = getChambers(room);
  const occupied = chambers.filter((c) => chamberData[c]?.occupied).length;
  return {
    total: chambers.length,
    occupied,
    empty: chambers.length - occupied,
  };
}

// ── Safe apiFetch ─────────────────────────────────────────────
async function apiFetch(path) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${tok()}` },
  });
  const text = await r.text();
  if (text.trimStart().startsWith("<!")) {
    throw new Error("Server error — check backend logs", { cause: text });
  }
  const d = JSON.parse(text);
  if (!r.ok) throw new Error(d.message || `HTTP ${r.status}`, { cause: d });
  return d;
}

// ═══════════════════════════════════════════════════════════════
//  SUB-COMPONENTS — all defined OUTSIDE export default function
// ═══════════════════════════════════════════════════════════════

function UtilBar({ pct, color, bg, height }) {
  return (
    <div
      style={{
        width: "100%",
        height: height || 6,
        borderRadius: 3,
        background: bg || "rgba(255,255,255,0.15)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, pct || 0)}%`,
          background: color,
          borderRadius: 3,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "rgba(255,255,255,0.1)",
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {value} {label}
    </span>
  );
}

function Breadcrumb({ floor, room, onBuilding, onFloor }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        color: "#94a3b8",
        marginBottom: 20,
      }}
    >
      <button
        onClick={onBuilding}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#60a5fa",
          fontWeight: 600,
          fontSize: 13,
          padding: 0,
          textDecoration: "underline",
        }}
      >
        Building
      </button>
      {floor && (
        <>
          <span>›</span>
          <button
            onClick={onFloor}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: room ? "#60a5fa" : "#e2e8f0",
              fontWeight: 600,
              fontSize: 13,
              padding: 0,
              textDecoration: room ? "underline" : "none",
            }}
          >
            {floor.label}
          </button>
        </>
      )}
      {room && (
        <>
          <span>›</span>
          <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
            {room.label}
          </span>
        </>
      )}
    </div>
  );
}

function BackBtn({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#94a3b8",
        borderRadius: 7,
        padding: "7px 16px",
        fontSize: 13,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 20,
        fontFamily: "inherit",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
      }}
    >
      ← {label}
    </button>
  );
}

// ── Global stats cards — reads from live chamberData ──────────
function GlobalStats({ chamberData, isLoading }) {
  const total = 504;
  const occupied = Object.values(chamberData).filter((c) => c.occupied).length;
  const empty = total - occupied;
  const pct = Math.round((occupied / total) * 100);

  const totalBags = Object.values(chamberData)
    .filter((c) => c.occupied)
    .reduce((s, c) => s + (c.bags || 0), 0);

  const totalWt = Object.values(chamberData)
    .filter((c) => c.occupied)
    .reduce((s, c) => s + (c.weight || 0), 0);

  const stats = [
    { label: "Total Chambers", value: total, color: "#60a5fa", icon: "🏢" },
    { label: "Occupied", value: occupied, color: "#22c55e", icon: "📦" },
    { label: "Empty", value: empty, color: "#94a3b8", icon: "📭" },
    { label: "Utilisation", value: `${pct}%`, color: "#f59e0b", icon: "📊" },
    {
      label: "Total Bags",
      value: totalBags.toLocaleString("en-IN"),
      color: "#a78bfa",
      icon: "🛍",
    },
    {
      label: "Total Weight",
      value: `${(totalWt / 1000).toFixed(1)}T`,
      color: "#34d399",
      icon: "⚖️",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 10,
        marginBottom: 24,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: "#1e293b",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: "12px 14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            opacity: isLoading ? 0.5 : 1,
            transition: "opacity 0.3s",
          }}
        >
          <div style={{ fontSize: 18, marginBottom: 3 }}>{s.icon}</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: s.color,
              lineHeight: 1.2,
            }}
          >
            {isLoading ? "…" : s.value}
          </div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── View 1: Building ──────────────────────────────────────────
function BuildingView({ onSelectFloor, chamberData }) {
  const floors = [...BUILDING].reverse(); // C top → A bottom

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            fontSize: 13,
            color: "#94a3b8",
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Cold Storage Complex • 504 Chambers
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          Click a floor to explore rooms and chambers
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          maxWidth: 700,
          margin: "0 auto",
        }}
      >
        {floors.map((floor, idx) => {
          const stats = floorStats(floor, chamberData);
          const pct = Math.round((stats.occupied / stats.total) * 100);
          const indent = (floors.length - 1 - idx) * 16;

          return (
            <div
              key={floor.id}
              onClick={() => onSelectFloor(floor)}
              style={{
                cursor: "pointer",
                marginLeft: indent,
                marginRight: indent,
                marginBottom: idx < floors.length - 1 ? -8 : 0,
                position: "relative",
                zIndex: idx,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  "translateY(-6px) scale(1.02)";
                e.currentTarget.style.zIndex = 10;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.zIndex = idx;
              }}
            >
              <div
                style={{
                  background: `linear-gradient(135deg, ${floor.color}, ${floor.shadow})`,
                  borderRadius: "10px 10px 0 0",
                  padding: "18px 24px 14px",
                  color: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>
                      {floor.label}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 1 }}>
                      {floor.sublabel} • {floor.rooms.length} Rooms •{" "}
                      {stats.total} Chambers
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}
                    >
                      {pct}%
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                      occupied
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <UtilBar pct={pct} color="rgba(255,255,255,0.9)" />
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <StatPill
                      label="filled"
                      value={stats.occupied}
                      color="#22c55e"
                    />
                    <StatPill
                      label="empty"
                      value={stats.empty}
                      color="#94a3b8"
                    />
                    <StatPill label="rooms" value={3} color="#fbbf24" />
                  </div>
                </div>
              </div>

              <div
                style={{
                  height: 14,
                  background: floor.shadow,
                  borderRadius: "0 0 6px 6px",
                  opacity: 0.7,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 22,
                  opacity: 0.4,
                }}
              >
                ›
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          marginTop: 32,
          fontSize: 12,
          color: "#64748b",
        }}
      >
        {[
          ["#22c55e", "Occupied"],
          ["#94a3b8", "Empty"],
          ["#3b82f6", "Floor A"],
          ["#8b5cf6", "Floor B"],
          ["#10b981", "Floor C"],
        ].map(([c, l]) => (
          <span
            key={l}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: c,
                display: "inline-block",
              }}
            />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── View 2: Floor ─────────────────────────────────────────────
function FloorView({ floor, onSelectRoom, chamberData }) {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#e2e8f0",
            marginBottom: 4,
          }}
        >
          {floor.label} — {floor.sublabel}
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          Select a room to view its chambers
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        {floor.rooms.map((room) => {
          const stats = roomStats(room, chamberData);
          const pct = Math.round((stats.occupied / stats.total) * 100);

          return (
            <div
              key={room.id}
              onClick={() => onSelectRoom(room)}
              style={{ cursor: "pointer", transition: "transform 0.2s" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  background: `linear-gradient(135deg, ${floor.color}, ${floor.shadow})`,
                  borderRadius: "12px 12px 0 0",
                  padding: "20px 18px 16px",
                  color: "#fff",
                  boxShadow: `0 4px 20px ${floor.shadow}60`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.7,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {floor.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>
                  {room.label}
                </div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
                  Chambers {room.from}–{room.to}
                </div>

                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      opacity: 0.8,
                      marginBottom: 5,
                    }}
                  >
                    <span>Utilisation</span>
                    <span style={{ fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <UtilBar pct={pct} color="rgba(255,255,255,0.9)" />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 12,
                    fontSize: 12,
                  }}
                >
                  <span>🟢 {stats.occupied} filled</span>
                  <span>⚪ {stats.empty} empty</span>
                </div>
              </div>

              <div
                style={{
                  height: 10,
                  borderRadius: "0 0 8px 8px",
                  background: floor.shadow,
                  opacity: 0.6,
                }}
              />
              <div
                style={{
                  textAlign: "center",
                  marginTop: 8,
                  fontSize: 11,
                  color: "#64748b",
                }}
              >
                {stats.total} chambers total
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── View 3: Room Chamber Grid ─────────────────────────────────
function RoomGridView({ floor, room, onSelectChamber, chamberData }) {
  const chambers = getChambers(room);
  const stats = roomStats(room, chamberData);
  const pct = Math.round((stats.occupied / stats.total) * 100);

  return (
    <div>
      <div
        style={{
          background: `linear-gradient(135deg, ${floor.color}22, ${floor.shadow}11)`,
          border: `1px solid ${floor.color}44`,
          borderRadius: 10,
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
            {floor.label} — {room.label}
            <span
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: "#94a3b8",
                marginLeft: 10,
              }}
            >
              Chambers {room.from}–{room.to}
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 13,
            alignItems: "center",
          }}
        >
          <span style={{ color: "#22c55e", fontWeight: 600 }}>
            ● {stats.occupied} occupied
          </span>
          <span style={{ color: "#64748b" }}>○ {stats.empty} empty</span>
          <span style={{ color: floor.color, fontWeight: 700 }}>{pct}%</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 16,
          fontSize: 12,
          color: "#94a3b8",
          flexWrap: "wrap",
        }}
      >
        {[
          ["#22c55e", "Occupied — click for details"],
          ["#0f172a", "Empty"],
        ].map(([c, l]) => (
          <span
            key={l}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: c,
                display: "inline-block",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
            {l}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
          gap: 6,
        }}
      >
        {chambers.map((chamberNo) => {
          const cd = chamberData[chamberNo];
          const isOccupied = cd?.occupied;
          const bagPct = isOccupied
            ? Math.round(((cd.bags || 0) / MAX_BAGS) * 100)
            : 0;

          return (
            <button
              key={chamberNo}
              onClick={() =>
                isOccupied ? onSelectChamber(chamberNo) : undefined
              }
              title={
                isOccupied
                  ? `Chamber ${chamberNo} — ${cd.name} | ${cd.bags} bags (${bagPct}%)`
                  : `Chamber ${chamberNo} — Empty`
              }
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: 5,
                cursor: isOccupied ? "pointer" : "default",
                border: isOccupied
                  ? `1.5px solid ${floor.color}88`
                  : "1px solid #1e3a5f66",
                background: isOccupied
                  ? `linear-gradient(135deg, ${floor.color}cc, ${floor.shadow})`
                  : "#0f172a",
                color: "#fff",
                fontSize: 9,
                fontWeight: 600,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                transition: "transform 0.15s, box-shadow 0.15s",
                boxShadow: isOccupied ? `0 2px 8px ${floor.color}44` : "none",
                padding: 0,
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                if (!isOccupied) return;
                e.currentTarget.style.transform = "scale(1.15)";
                e.currentTarget.style.zIndex = "10";
                e.currentTarget.style.boxShadow = `0 4px 16px ${floor.color}88`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.zIndex = "1";
                e.currentTarget.style.boxShadow = isOccupied
                  ? `0 2px 8px ${floor.color}44`
                  : "none";
              }}
            >
              <span style={{ fontSize: 9, opacity: isOccupied ? 1 : 0.25 }}>
                {chamberNo}
              </span>
              {isOccupied && (
                <div
                  style={{
                    width: "70%",
                    height: 3,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.2)",
                    overflow: "hidden",
                    marginTop: 2,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${bagPct}%`,
                      background:
                        bagPct >= 80
                          ? "#ef4444"
                          : bagPct >= 50
                            ? "#fbbf24"
                            : "#22c55e",
                    }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── View 4: Chamber Detail Modal — reads from live chamberData ─
function ChamberModal({ chamberNo, floor, room, onClose, chamberData }) {
  if (!chamberNo) return null;
  const cd = chamberData[chamberNo];
  const bagPct = cd?.occupied
    ? Math.round(((cd.bags || 0) / MAX_BAGS) * 100)
    : 0;
  const wtPct = cd?.occupied
    ? Math.round(((cd.weight || 0) / MAX_WEIGHT) * 100)
    : 0;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          zIndex: 1000,
          backdropFilter: "blur(4px)",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 400,
          zIndex: 1001,
          borderRadius: 14,
          boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
          overflow: "hidden",
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${floor.color}, ${floor.shadow})`,
            padding: "20px 22px 16px",
            color: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.75,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {floor.label} · {room.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>
                Chamber {chamberNo}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "#fff",
                borderRadius: 8,
                width: 32,
                height: 32,
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "inherit",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: cd?.occupied
                ? "rgba(34,197,94,0.25)"
                : "rgba(100,116,139,0.25)",
              border: `1px solid ${cd?.occupied ? "#22c55e" : "#475569"}`,
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 600,
              marginTop: 10,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: cd?.occupied ? "#22c55e" : "#475569",
                display: "inline-block",
                boxShadow: cd?.occupied
                  ? "0 0 0 3px rgba(34,197,94,0.3)"
                  : "none",
              }}
            />
            {cd?.occupied ? "OCCUPIED" : "EMPTY"}
          </div>
        </div>

        {/* Body */}
        <div style={{ background: "#1e293b", padding: "20px 22px" }}>
          {cd?.occupied ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px 14px",
                  marginBottom: 18,
                }}
              >
                {[
                  ["👤 Party", cd.name || "—"],
                  ["📦 Commodity", cd.commodity || "—"],
                  ["🌿 Variety", cd.variety || "—"],
                  ["🛍 Bags", `${(cd.bags || 0).toLocaleString("en-IN")} bags`],
                  [
                    "⚖️ Weight",
                    `${(cd.weight || 0).toLocaleString("en-IN")} kg`,
                  ],
                  [
                    "📍 Location",
                    `${floor.label} · ${room.label} · Ch.${chamberNo}`,
                  ],
                  ["🧾 CSR Nos", cd.csrNos ? cd.csrNos.join(", ") : "—"],
                  [
                    "📊 Inwards",
                    cd.entryCount
                      ? `${cd.entryCount} batch${cd.entryCount > 1 ? "es" : ""}`
                      : "1 batch",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      background: "#0f172a",
                      borderRadius: 8,
                      padding: "9px 12px",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        marginBottom: 3,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#e2e8f0",
                        wordBreak: "break-word",
                        lineHeight: 1.4,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Capacity bars */}
              <div
                style={{
                  background: "#0f172a",
                  borderRadius: 10,
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    marginBottom: 10,
                    letterSpacing: 0.5,
                  }}
                >
                  CAPACITY UTILISATION
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "#94a3b8",
                      marginBottom: 5,
                    }}
                  >
                    <span>Bags</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: bagPct >= 80 ? "#ef4444" : "#22c55e",
                      }}
                    >
                      {cd.bags} / {MAX_BAGS} ({bagPct}%)
                    </span>
                  </div>
                  <UtilBar
                    pct={bagPct}
                    height={10}
                    color={
                      bagPct >= 80
                        ? "#ef4444"
                        : bagPct >= 50
                          ? "#f59e0b"
                          : "#22c55e"
                    }
                    bg="#1e3a5f"
                  />
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "#94a3b8",
                      marginBottom: 5,
                    }}
                  >
                    <span>Weight</span>
                    <span style={{ fontWeight: 700, color: floor.color }}>
                      {(cd.weight || 0).toLocaleString("en-IN")} /{" "}
                      {MAX_WEIGHT.toLocaleString("en-IN")} kg ({wtPct}%)
                    </span>
                  </div>
                  <UtilBar
                    pct={wtPct}
                    height={10}
                    color={floor.color}
                    bg="#1e3a5f"
                  />
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "30px 0",
                color: "#475569",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#64748b" }}>
                Chamber {chamberNo} is Empty
              </div>
              <div style={{ fontSize: 12, marginTop: 6, color: "#334155" }}>
                Capacity: {MAX_BAGS} bags / {MAX_WEIGHT.toLocaleString("en-IN")}{" "}
                kg
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            background: "#1e293b",
            padding: "12px 22px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: floor.color,
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "8px 22px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

// ── Loading spinner ───────────────────────────────────────────
function LoadingMap() {
  return (
    <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8" }}>
      <div
        style={{
          fontSize: 48,
          marginBottom: 16,
          animation: "spin 1.5s linear infinite",
          display: "inline-block",
        }}
      >
        🏭
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#64748b",
          marginBottom: 8,
        }}
      >
        Loading Map…
      </div>
      <div style={{ fontSize: 13, color: "#475569" }}>
        Fetching live stock data from backend
      </div>
      <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────
function ErrorBanner({ message, onRetry }) {
  return (
    <div
      style={{
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 8,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 13, color: "#b91c1c" }}>⚠️ {message}</div>
      <button
        onClick={onRetry}
        style={{
          background: "#ef4444",
          color: "#fff",
          border: "none",
          borderRadius: 5,
          padding: "6px 14px",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Retry
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
export default function LocationMap() {
  // ── Navigation state ────────────────────────────────────────
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedChamber, setSelectedChamber] = useState(null);

  // ── Live data state ──────────────────────────────────────────
  const [chamberData, setChamberData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lastFetched, setLastFetched] = useState(null);

  // ── Fetch and map live inward data ───────────────────────────
  const fetchData = () => {
    const load = async () => {
      await Promise.resolve();
      setIsLoading(true);
      setLoadError("");

      try {
        const entries = await apiFetch("/inward");

        // ── Smart mapping: lotCode → chamber number ────────────
        // Supports: "A47" → 47, "B230" → 230, "A1, 2, 3" → [1, 2, 3]
        const newChamberData = {};

        for (const entry of entries) {
          const rawCode = entry.chamberNumbers || entry.lot?.lotCode || null;
          if (!rawCode) continue;

          // 🔥 THIS IS THE CRITICAL NEW MULTI-CHAMBER LOGIC 🔥
          // It splits "A1, 2, B230" by commas, removes letters, and gets the numbers
          const segments = String(rawCode)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const chamberNums = segments
            .map(parseLotCode)
            .filter((n) => n !== null);

          if (chamberNums.length === 0) continue;

          for (const chamberNo of chamberNums) {
            // Values: backend already returns remainingQty & remainingWt
            const qty = parseFloat(entry.remainingQty || 0);
            const wt = parseFloat(entry.remainingWt || entry.totalWeight || 0);

            if (qty <= 0 && wt <= 0) continue; // no stock left

            if (newChamberData[chamberNo]) {
              // ── AGGREGATION: multiple inward entries in same chamber ──
              newChamberData[chamberNo].bags += qty;
              newChamberData[chamberNo].weight += wt;
              newChamberData[chamberNo].csrNos.push(entry.csrNo);
              newChamberData[chamberNo].entryCount += 1;
              // Keep first party's details for display; note multi-party
              if (entry.customer?.name !== newChamberData[chamberNo].name) {
                newChamberData[chamberNo].multiParty = true;
              }
            } else {
              // ── First entry for this chamber ──────────────────────
              newChamberData[chamberNo] = {
                occupied: true,
                name: entry.customer?.name || "Unknown Party",
                commodity: entry.variety?.commodity?.name || "Unknown",
                variety: entry.variety?.name || "Unknown",
                bags: qty,
                weight: wt,
                csrNos: [entry.csrNo],
                entryCount: 1,
                multiParty: false,
                lotCode: rawCode,
              };
            }
          }
        }

        // Fill all 504 chambers — unoccupied ones get {occupied:false}
        const fullData = {};
        for (let i = 1; i <= 504; i++) {
          fullData[i] = newChamberData[i] || { occupied: false };
        }

        setChamberData(fullData);
        setLastFetched(new Date());
      } catch (e) {
        console.error("LocationMap fetch error:", e.message, e.cause);
        setLoadError(e.message || "Failed to load stock data");
        // Build empty map so UI still renders
        const empty = {};
        for (let i = 1; i <= 504; i++) empty[i] = { occupied: false };
        setChamberData(empty);
      }

      setIsLoading(false);
    };

    load();
  };

  // Load on mount
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation handlers ──────────────────────────────────────
  const handleSelectFloor = (floor) => {
    const go = async () => {
      await Promise.resolve();
      setSelectedFloor(floor);
      setSelectedRoom(null);
      setSelectedChamber(null);
    };
    go();
  };

  const handleSelectRoom = (room) => {
    const go = async () => {
      await Promise.resolve();
      setSelectedRoom(room);
      setSelectedChamber(null);
    };
    go();
  };

  const handleSelectChamber = (chamberNo) => {
    const go = async () => {
      await Promise.resolve();
      setSelectedChamber(chamberNo);
    };
    go();
  };

  const handleCloseModal = () => {
    const go = async () => {
      await Promise.resolve();
      setSelectedChamber(null);
    };
    go();
  };

  const goBuilding = () => {
    const go = async () => {
      await Promise.resolve();
      setSelectedFloor(null);
      setSelectedRoom(null);
      setSelectedChamber(null);
    };
    go();
  };

  const goFloor = () => {
    const go = async () => {
      await Promise.resolve();
      setSelectedRoom(null);
      setSelectedChamber(null);
    };
    go();
  };

  // ── Modal needs floor/room context ───────────────────────────
  const modalFloor = useMemo(
    () => selectedFloor || BUILDING[0],
    [selectedFloor],
  );
  const modalRoom = useMemo(
    () => selectedRoom || BUILDING[0].rooms[0],
    [selectedRoom],
  );

  const viewLabel = !selectedFloor
    ? "Building Overview"
    : !selectedRoom
      ? `${selectedFloor.label} — ${selectedFloor.sublabel}`
      : `${selectedFloor.label} · ${selectedRoom.label}`;

  return (
    <Layout>
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: 20,
          fontFamily: "'Segoe UI', sans-serif",
          color: "#e2e8f0",
          borderRadius: 10,
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Report → Location / Map
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              🏭 Cold Storage — Location Map
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {lastFetched && !isLoading && (
                <span style={{ fontSize: 11, color: "#475569" }}>
                  Updated {lastFetched.toLocaleTimeString("en-IN")}
                </span>
              )}
              <button
                onClick={fetchData}
                disabled={isLoading}
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: isLoading ? "#475569" : "#60a5fa",
                  borderRadius: 7,
                  padding: "6px 14px",
                  fontSize: 12,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {isLoading ? "⏳ Loading…" : "⟳ Refresh"}
              </button>
              <div
                style={{
                  fontSize: 12,
                  color: "#475569",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  padding: "5px 12px",
                }}
              >
                {viewLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {loadError && <ErrorBanner message={loadError} onRetry={fetchData} />}

        {/* Global stats — always visible */}
        <GlobalStats chamberData={chamberData} isLoading={isLoading} />

        {/* Loading spinner */}
        {isLoading && <LoadingMap />}

        {/* Main content — only when data ready */}
        {!isLoading && (
          <>
            <Breadcrumb
              floor={selectedFloor}
              room={selectedRoom}
              onBuilding={goBuilding}
              onFloor={goFloor}
            />

            {selectedRoom && (
              <BackBtn
                label={`Back to ${selectedFloor.label}`}
                onClick={goFloor}
              />
            )}
            {selectedFloor && !selectedRoom && (
              <BackBtn label="Back to Building" onClick={goBuilding} />
            )}

            {!selectedFloor && (
              <BuildingView
                onSelectFloor={handleSelectFloor}
                chamberData={chamberData}
              />
            )}

            {selectedFloor && !selectedRoom && (
              <FloorView
                floor={selectedFloor}
                onSelectRoom={handleSelectRoom}
                chamberData={chamberData}
              />
            )}

            {selectedFloor && selectedRoom && (
              <RoomGridView
                floor={selectedFloor}
                room={selectedRoom}
                onSelectChamber={handleSelectChamber}
                chamberData={chamberData}
              />
            )}
          </>
        )}

        {/* Chamber modal — above everything */}
        {selectedChamber && (
          <ChamberModal
            chamberNo={selectedChamber}
            floor={modalFloor}
            room={modalRoom}
            onClose={handleCloseModal}
            chamberData={chamberData}
          />
        )}
      </div>
    </Layout>
  );
}
