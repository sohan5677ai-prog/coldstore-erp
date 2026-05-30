// frontend/src/hooks/useIdleTimeout.js  — CREATE this new file
// Detects 2 minutes of inactivity and logs the user out

import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const IDLE_MINUTES = 2;
const IDLE_MS = IDLE_MINUTES * 60 * 1000; // 120,000 ms
const WARN_BEFORE = 20 * 1000; // warn 20 seconds before logout

// Events that count as "activity"
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "touchmove",
  "scroll",
  "click",
];

export default function useIdleTimeout() {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const warnRef = useRef(null);
  const warnShown = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnRef.current) clearTimeout(warnRef.current);
    warnShown.current = false;
  }, []);

  const logout = useCallback(() => {
    clearTimers();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }, [navigate, clearTimers]);

  const resetTimer = useCallback(() => {
    clearTimers();

    // Warn 20 seconds before logout
    warnRef.current = setTimeout(() => {
      if (warnShown.current) return;
      warnShown.current = true;
      // Show a non-blocking toast — inject into DOM directly (no React state needed)
      const el = document.getElementById("__idle_warn__");
      if (el) el.style.display = "flex";
    }, IDLE_MS - WARN_BEFORE);

    // Actual logout after full idle period
    timerRef.current = setTimeout(() => {
      logout();
    }, IDLE_MS);
  }, [clearTimers, logout]);

  useEffect(() => {
    // Start timer on mount
    resetTimer();

    // Re-start timer on any activity
    const handleActivity = () => {
      // Hide warning if shown
      const el = document.getElementById("__idle_warn__");
      if (el) el.style.display = "none";
      resetTimer();
    };

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, handleActivity, { passive: true }),
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, handleActivity),
      );
    };
  }, [resetTimer, clearTimers]);
}
