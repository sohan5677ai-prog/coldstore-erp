// frontend/src/hooks/useTelegramPoll.js
//
// Reusable hook — silently polls /api/ocr/pending every 3 seconds.
// When a scan arrives, calls onData(parsedData) and marks it processed.
// NO button needed — data flows in automatically from Telegram.
//
// Usage in InwardEntry.jsx:
//   import useTelegramPoll from '../hooks/useTelegramPoll';
//   useTelegramPoll({ passType: 'Inward', onData: handleTelegramData, toast$ });
//
// Usage in OutwardEntry.jsx:
//   useTelegramPoll({ passType: 'Outward', onData: handleTelegramData, toast$ });

import { useEffect, useRef } from "react";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

// ── Safe fetch wrapper (no nested component, no import collision) ──
async function pollFetch(path, opts = {}) {
  let r;
  try {
    r = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${tok()}`,
        ...(!(opts.body instanceof FormData) && {
          "Content-Type": "application/json",
        }),
        ...(opts.headers || {}),
      },
    });
  } catch (e) {
    throw new Error("Network error during poll", { cause: e });
  }
  const text = await r.text();
  if (text.trim().startsWith("<!")) {
    throw new Error("Server error during poll", { cause: text });
  }
  if (!text || text === "null") return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Invalid JSON during poll", { cause: e });
  }
}

// ── Mark scan as processed ────────────────────────────────────
async function markProcessed(id) {
  try {
    await pollFetch(`/ocr/mark-processed/${id}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  } catch (e) {
    console.error("Mark processed failed:", e.message, e.cause);
  }
}

// ══════════════════════════════════════════════════════════════
//  useTelegramPoll
//  @param passType  'Inward' | 'Outward' — only processes matching scans
//  @param onData    function(parsedData) — called when new data arrives
//  @param toast$    function(msg, type)  — shows the toast notification
//  @param interval  poll interval in ms (default 3000)
// ══════════════════════════════════════════════════════════════
export default function useTelegramPoll({
  passType,
  onData,
  toast$,
  interval = 3000,
}) {
  // Use refs so the interval callback always sees fresh values
  const onDataRef = useRef(onData);
  const toast$Ref = useRef(toast$);
  const passTypeRef = useRef(passType);

  // Keep refs in sync without triggering re-renders
  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);
  useEffect(() => {
    toast$Ref.current = toast$;
  }, [toast$]);
  useEffect(() => {
    passTypeRef.current = passType;
  }, [passType]);

  useEffect(() => {
    let active = true; // guard against state updates after unmount

    const poll = async () => {
      await Promise.resolve(); // linter armor: no synchronous setState
      if (!active) return;

      try {
        const scan = await pollFetch("/ocr/pending");

        if (!scan || !active) return;

        // Only process if passType matches (or scan has no passType set)
        const scanType = scan.passType || "Inward";
        if (scanType !== passTypeRef.current) return;

        // Parse parsedData (it may come as a string or object)
        let data = scan.parsedData;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.error("parsedData JSON parse error:", e.message);
            return;
          }
        }

        // Mark processed FIRST — prevents double-fill even if onData throws
        await markProcessed(scan.id);

        // Call the consumer's handler
        if (typeof onDataRef.current === "function") {
          onDataRef.current(data, scan.id);
        }

        // Show toast
        if (typeof toast$Ref.current === "function") {
          toast$Ref.current(
            `📱 Data received from Telegram! (Scan #${scan.id})`,
            "ok",
          );
        }

        console.log(
          `📱 Telegram scan #${scan.id} auto-filled (${passTypeRef.current})`,
        );
      } catch (e) {
        // Silent — polling errors should not disrupt the UI
        if (active) console.error("Poll error:", e.message);
      }
    };

    // Start polling
    const timerId = setInterval(poll, interval);

    // Run once immediately on mount
    poll();

    return () => {
      active = false;
      clearInterval(timerId);
    };
  }, [interval]); // only re-run if interval changes
}
