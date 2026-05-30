// frontend/src/components/IdleWarning.jsx  — CREATE this new file
// Shown 20 seconds before auto-logout due to inactivity
// Place this ONCE inside Layout.jsx (or App.jsx)

export default function IdleWarning() {
  return (
    <div
      id="__idle_warn__"
      style={{
        display: "none", // shown via JS in useIdleTimeout
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        background: "#fef3c7",
        border: "1.5px solid #f59e0b",
        borderRadius: 10,
        padding: "14px 20px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        fontSize: 14,
        color: "#92400e",
        fontWeight: 500,
        maxWidth: 320,
        alignItems: "center",
        gap: 12,
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <span style={{ fontSize: 22 }}>⏰</span>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 3 }}>
          Session expiring soon
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          You've been idle for nearly 2 minutes. Move the mouse or press any key
          to stay logged in.
        </div>
      </div>
    </div>
  );
}
