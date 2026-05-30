// frontend/src/api.js  — CREATE this new file (replaces individual fetch calls)
// This handles Invalid Token automatically — redirects to login on 401

const BASE = "http://localhost:5000/api";

// ── Core fetcher — used by all pages ────────────────────────
export async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("token");
  const finYear = localStorage.getItem("finYear") || "2026-27";

  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    "x-fin-year": finYear,
    ...(!(opts.body instanceof FormData) && {
      "Content-Type": "application/json",
    }),
    ...(opts.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));

  // ── If token is invalid/expired → clear session + go to login ──
  if (res.status === 401) {
    console.warn("Session expired — redirecting to login");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("finYear");
    window.location.href = "/login";
    return null;
  }

  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

// ── Shorthand helpers ────────────────────────────────────────
export const apiGet = (path) => apiFetch(path);
export const apiPost = (path, body) =>
  apiFetch(path, { method: "POST", body: JSON.stringify(body) });
export const apiPut = (path, body) =>
  apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = (path) => apiFetch(path, { method: "DELETE" });

// ── Multipart (for file/image uploads like OCR) ──────────────
export const apiUpload = (path, formData) =>
  apiFetch(path, { method: "POST", body: formData });

// ── Check if user is logged in on app start ──────────────────
export async function verifySession() {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return false;
    }
    const data = await res.json();
    return data.valid;
  } catch {
    return false; // network error — don't log out, just try again
  }
}

export default apiFetch;
