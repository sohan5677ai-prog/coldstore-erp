// frontend/src/pages/ExcelInwardUpload.jsx  — CREATE this new file
// Bulk Inward Entry upload from Excel sheet
// Rules: no nested components, async useEffect + await Promise.resolve()

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import Layout from "../components/Layout";

const API =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "http://localhost:5000/api";

const tok = () => localStorage.getItem("token");

async function apiFetch(path, opts = {}) {
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
  const text = await r.text();
  if (text.trim().startsWith("<!"))
    throw new Error("Server error — check backend");
  const d = text ? JSON.parse(text) : {};
  if (!r.ok) throw new Error(d.message || `HTTP ${r.status}`);
  return d;
}

// ── Expected Excel columns (case-insensitive) ─────────────────
// Maps various possible column names to internal field names
const COL_MAP = {
  // Party
  party: "partyName",
  "party name": "partyName",
  customer: "partyName",
  "customer name": "partyName",
  // Commodity
  commodity: "commodity",
  item: "commodity",
  // Variety
  variety: "variety",
  grade: "variety",
  // Bags
  bags: "bags",
  "no of bags": "bags",
  "no. of bags": "bags",
  quantity: "bags",
  qty: "bags",
  // Total weight
  "total weight": "totalWeight",
  "total wt": "totalWeight",
  weight: "totalWeight",
  wt: "totalWeight",
  // Avg weight (optional)
  "avg weight": "avgWeight",
  "avg wt": "avgWeight",
  "avg weight/bag": "avgWeight",
  // Vehicle
  vehicle: "vehicleNo",
  "vehicle no": "vehicleNo",
  "vehicle no.": "vehicleNo",
  // Marka
  marka: "marka",
  marks: "marka",
  mark: "marka",
  // Chamber
  chamber: "chamberNumbers",
  "chamber no": "chamberNumbers",
  lot: "chamberNumbers",
  location: "chamberNumbers",
  // Rent type
  "rent type": "rentType",
  renttype: "rentType",
  // Packet name
  "packet name": "packetName",
  packet: "packetName",
  pkt: "packetName",
  // Date
  date: "inwardDate",
  "inward date": "inwardDate",
  // CSR/Inward No (optional)
  "inward no": "csrNo",
  "inward no.": "csrNo",
  "csr no": "csrNo",
  csr: "csrNo",
};

// ── Parse Excel date serial to ISO string ─────────────────────
function parseExcelDate(val) {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === "number") {
    // Excel serial date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

// ── Normalise a parsed row ────────────────────────────────────
function normaliseRow(raw, rowIndex) {
  const r = {};
  for (const [key, val] of Object.entries(raw)) {
    const mapped = COL_MAP[key.toLowerCase().trim()];
    if (mapped) r[mapped] = val;
  }

  // Coerce numbers
  r.bags = parseFloat(r.bags) || 0;
  r.totalWeight = parseFloat(r.totalWeight) || 0;
  r.avgWeight = parseFloat(r.avgWeight) || 0;

  // 3-way weight calculation
  if (r.bags > 0 && r.totalWeight > 0 && r.avgWeight === 0)
    r.avgWeight = parseFloat((r.totalWeight / r.bags).toFixed(3));
  else if (r.bags > 0 && r.avgWeight > 0 && r.totalWeight === 0)
    r.totalWeight = parseFloat((r.bags * r.avgWeight).toFixed(3));
  else if (r.totalWeight > 0 && r.avgWeight > 0 && r.bags === 0)
    r.bags = Math.round(r.totalWeight / r.avgWeight);

  // Parse date
  r.inwardDate = parseExcelDate(r.inwardDate);

  // Validation
  r._rowIndex = rowIndex + 2; // Excel row number (1-based header)
  r._errors = [];
  if (!r.partyName) r._errors.push("Party missing");
  if (!r.commodity) r._errors.push("Commodity missing");
  if (!r.variety) r._errors.push("Variety missing");
  if (r.bags <= 0) r._errors.push("Bags must be > 0");
  if (r.totalWeight <= 0) r._errors.push("Total Weight must be > 0");
  r._valid = r._errors.length === 0;

  return r;
}

// ═══════════════════════════════════════════════════════════════
//  SUB-COMPONENTS — all OUTSIDE export default
// ═══════════════════════════════════════════════════════════════

function DropZone({ onFile, isDragging, setIsDragging }) {
  const inputRef = useRef();

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2.5px dashed ${isDragging ? "#2563eb" : "#94a3b8"}`,
        borderRadius: 12,
        padding: "40px 24px",
        textAlign: "center",
        cursor: "pointer",
        background: isDragging ? "#eff6ff" : "#f8fafc",
        transition: "all 0.2s",
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 16,
          color: "#1e293b",
          marginBottom: 6,
        }}
      >
        Drop your Excel file here
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
        or click to browse — supports .xlsx and .xls
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>
        Required columns: Party · Commodity · Variety · Bags · Total Weight
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

function TemplateDownload() {
  const download = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      "Party",
      "Commodity",
      "Variety",
      "Bags",
      "Total Weight",
      "Vehicle",
      "Marka",
      "Chamber",
      "Rent Type",
      "Packet Name",
      "Inward Date",
      "Inward No",
    ];
    const sample = [
      "KNM Traders",
      "Tamarind",
      "Seed Tamarind",
      400,
      24940,
      "TN52 M9625",
      "Tharana",
      "C340",
      "KG",
      "Seed bags",
      new Date().toLocaleDateString("en-IN"),
      "",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    // Column widths
    ws["!cols"] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, "Inward Entries");
    XLSX.writeFile(wb, "inward_upload_template.xlsx");
  };

  return (
    <button
      onClick={download}
      style={{
        background: "#0f9d58",
        color: "#fff",
        border: "none",
        borderRadius: 7,
        padding: "8px 18px",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
      }}
    >
      ⬇️ Download Template
    </button>
  );
}

function PreviewTable({ rows }) {
  const validCount = rows.filter((r) => r._valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 13 }}>
        <span style={{ color: "#15803d", fontWeight: 600 }}>
          ✅ {validCount} valid rows
        </span>
        {invalidCount > 0 && (
          <span style={{ color: "#b91c1c", fontWeight: 600 }}>
            ❌ {invalidCount} rows with errors
          </span>
        )}
      </div>
      <div
        style={{
          overflowX: "auto",
          maxHeight: 340,
          border: "1px solid #e2e8f0",
          borderRadius: 8,
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
        >
          <thead>
            <tr
              style={{
                background: "#6d5fd3",
                color: "#fff",
                position: "sticky",
                top: 0,
              }}
            >
              {[
                "Row",
                "Status",
                "Party",
                "Commodity",
                "Variety",
                "Bags",
                "Total Wt",
                "Avg Wt",
                "Vehicle",
                "Chamber",
                "Date",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "7px 10px",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                style={{
                  background: r._valid
                    ? i % 2 === 0
                      ? "#fff"
                      : "#f8fafc"
                    : "#fef2f2",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <td style={{ padding: "6px 10px", color: "#6b7280" }}>
                  {r._rowIndex}
                </td>
                <td style={{ padding: "6px 10px" }}>
                  {r._valid ? (
                    <span style={{ color: "#15803d", fontWeight: 600 }}>
                      ✅
                    </span>
                  ) : (
                    <span
                      style={{ color: "#b91c1c", fontSize: 11 }}
                      title={r._errors.join(", ")}
                    >
                      ❌ {r._errors[0]}
                    </span>
                  )}
                </td>
                <td style={{ padding: "6px 10px", fontWeight: 500 }}>
                  {r.partyName || "—"}
                </td>
                <td style={{ padding: "6px 10px" }}>{r.commodity || "—"}</td>
                <td style={{ padding: "6px 10px" }}>{r.variety || "—"}</td>
                <td style={{ padding: "6px 10px", textAlign: "right" }}>
                  {r.bags || "—"}
                </td>
                <td style={{ padding: "6px 10px", textAlign: "right" }}>
                  {r.totalWeight || "—"}
                </td>
                <td
                  style={{
                    padding: "6px 10px",
                    textAlign: "right",
                    color: "#64748b",
                  }}
                >
                  {r.avgWeight || "—"}
                </td>
                <td style={{ padding: "6px 10px", color: "#64748b" }}>
                  {r.vehicleNo || "—"}
                </td>
                <td style={{ padding: "6px 10px", color: "#64748b" }}>
                  {r.chamberNumbers || "—"}
                </td>
                <td
                  style={{
                    padding: "6px 10px",
                    color: "#64748b",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.inwardDate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UploadProgress({ results }) {
  const done = results.filter((r) => r.status === "saved").length;
  const failed = results.filter((r) => r.status === "error").length;
  const pending = results.filter((r) => r.status === "pending").length;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#f8fafc",
          padding: "10px 16px",
          borderBottom: "1px solid #e2e8f0",
          fontSize: 13,
          display: "flex",
          gap: 16,
        }}
      >
        <span style={{ color: "#15803d", fontWeight: 600 }}>
          ✅ {done} saved
        </span>
        <span style={{ color: "#b91c1c", fontWeight: 600 }}>
          ❌ {failed} failed
        </span>
        <span style={{ color: "#94a3b8" }}>⏳ {pending} pending</span>
      </div>
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {results.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 16px",
              borderBottom: "1px solid #f1f5f9",
              fontSize: 12,
            }}
          >
            <span style={{ width: 20 }}>
              {r.status === "saved" ? "✅" : r.status === "error" ? "❌" : "⏳"}
            </span>
            <span style={{ width: 50, color: "#2563eb", fontWeight: 600 }}>
              #{r.csrNo || "—"}
            </span>
            <span style={{ flex: 1, fontWeight: 500 }}>{r.party}</span>
            <span style={{ color: "#6b7280" }}>{r.commodity}</span>
            <span style={{ marginLeft: "auto" }}>
              {r.status === "error" ? (
                <span
                  style={{
                    color: "#b91c1c",
                    maxWidth: 200,
                    display: "inline-block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={r.error}
                >
                  {r.error}
                </span>
              ) : r.status === "saved" ? (
                <span style={{ color: "#15803d" }}>{r.bags} bags</span>
              ) : (
                <span style={{ color: "#94a3b8" }}>waiting…</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
export default function ExcelInwardUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]); // parsed rows
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]); // upload progress
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Parse the uploaded Excel file
  const handleFile = useCallback((file) => {
    const process = async () => {
      await Promise.resolve();
      setError("");
      setPreview([]);
      setResults([]);
      setDone(false);
      setFileName(file.name);
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { raw: true, defval: "" });
        if (raw.length === 0) {
          setError("Excel sheet is empty — add data rows below the header.");
          return;
        }
        const parsed = raw.map((r, i) => normaliseRow(r, i));
        setPreview(parsed);
      } catch (e) {
        console.error("Excel parse error:", e.message);
        setError(`Could not read file: ${e.message}`);
      }
    };
    process();
  }, []);

  // Upload valid rows one by one to backend
  const handleUpload = useCallback(() => {
    const run = async () => {
      await Promise.resolve();
      const valid = preview.filter((r) => r._valid);
      if (valid.length === 0) {
        setError("No valid rows to upload.");
        return;
      }

      setUploading(true);
      setDone(false);

      // Init results with pending status
      const init = valid.map((r) => ({
        status: "pending",
        party: r.partyName,
        commodity: r.commodity,
        bags: r.bags,
        csrNo: null,
        error: null,
      }));
      setResults(init);

      // Upload each row sequentially (avoids race conditions on CSR number)
      const final = [...init];
      for (let i = 0; i < valid.length; i++) {
        const row = valid[i];
        try {
          // Fetch next CSR number
          const csrData = await apiFetch("/inward/next-csr");

          // Post to inward endpoint (same as web form)
          const payload = {
            customerId: null, // backend resolves by name (see below)
            partyName: row.partyName, // backend must accept this
            csrNo: row.csrNo || csrData.csrNo,
            inwardDate: row.inwardDate,
            vehicleNo: row.vehicleNo || null,
            marka: row.marka || null,
            chamberNumbers: row.chamberNumbers || null,
            rentType: row.rentType || "KG",
            billingMode: "Seasonal",
            totalWeight: row.totalWeight,
            commodityName: row.commodity, // backend resolves by name
            varietyName: row.variety, // backend resolves by name
            packetEntries: [
              {
                packetName: row.packetName || row.variety,
                avgWeight: row.avgWeight,
                quantity: row.bags,
                totalWeight: row.totalWeight,
              },
            ],
          };

          const res = await apiFetch("/inward/bulk", {
            method: "POST",
            body: JSON.stringify(payload),
          });

          final[i] = { ...final[i], status: "saved", csrNo: res.entry?.csrNo };
        } catch (e) {
          console.error(`Row ${i + 1} failed:`, e.message);
          final[i] = { ...final[i], status: "error", error: e.message };
        }
        setResults([...final]);
      }

      setUploading(false);
      setDone(true);
    };
    run();
  }, [preview]);

  const validCount = preview.filter((r) => r._valid).length;
  const invalidCount = preview.length - validCount;
  const savedCount = results.filter((r) => r.status === "saved").length;

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            background: "#4a90d9",
            color: "#fff",
            borderRadius: "10px 10px 0 0",
            padding: "12px 24px",
            marginBottom: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 18 }}>
            📊 Bulk Inward Upload (Excel)
          </span>
          <TemplateDownload />
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "0 0 10px 10px",
            padding: 24,
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}
        >
          {/* Instructions */}
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 13,
              color: "#1e40af",
              lineHeight: 1.7,
            }}
          >
            <strong>How to use:</strong>
            <br />
            1. Click <em>Download Template</em> to get the Excel format
            <br />
            2. Fill in your inward entries (one row per entry)
            <br />
            3. Drop or upload the file below
            <br />
            4. Review the preview, then click <em>Upload All Valid Rows</em>
          </div>

          {/* Drop zone */}
          {!preview.length && (
            <DropZone
              onFile={handleFile}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
            />
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                fontSize: 13,
                color: "#b91c1c",
                marginBottom: 16,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && !uploading && !done && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}
                >
                  📄 {fileName} — {preview.length} rows
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => {
                      setPreview([]);
                      setFileName("");
                      setError("");
                    }}
                    style={{
                      background: "#f3f4f6",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      padding: "7px 16px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    ✕ Change File
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={validCount === 0}
                    style={{
                      background: validCount > 0 ? "#22c55e" : "#86efac",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "7px 22px",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: validCount > 0 ? "pointer" : "not-allowed",
                    }}
                  >
                    ⬆️ Upload {validCount} Valid Row
                    {validCount !== 1 ? "s" : ""}
                    {invalidCount > 0 && ` (skip ${invalidCount} errors)`}
                  </button>
                </div>
              </div>
              <PreviewTable rows={preview} />
            </div>
          )}

          {/* Upload progress */}
          {(uploading || (done && results.length > 0)) && (
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#374151",
                  marginBottom: 12,
                }}
              >
                {uploading
                  ? "⏳ Uploading entries…"
                  : `✅ Upload complete — ${savedCount} / ${results.length} saved`}
              </div>
              <UploadProgress results={results} />
              {done && (
                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                  <button
                    onClick={() => {
                      setPreview([]);
                      setResults([]);
                      setFileName("");
                      setDone(false);
                    }}
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 20px",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Upload Another File
                  </button>
                  <a
                    href="/report/inward"
                    style={{
                      background: "#374151",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 20px",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    View Inward Register →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
