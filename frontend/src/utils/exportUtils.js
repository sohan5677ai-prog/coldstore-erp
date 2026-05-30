// frontend/src/utils/exportUtils.js  — CREATE this new file
// Shared Excel + PDF export used by InwardRegister and OutwardRegister
// Usage:
//   import { exportToExcel, exportToPDF, INWARD_COLUMNS } from "../utils/exportUtils";

import * as XLSX from "xlsx";

// ═══════════════════════════════════════════════════════════════
//  EXCEL EXPORT
// ═══════════════════════════════════════════════════════════════
export function exportToExcel(rows, columns, filename) {
  if (!rows || rows.length === 0) {
    alert("No data to export. Run a search first.");
    return;
  }

  const headers = columns.map((c) => c.label);

  const data = rows.map((row) =>
    columns.map((col) => {
      const val =
        typeof col.value === "function" ? col.value(row) : row[col.key];
      return val ?? "";
    }),
  );

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width || 18 }));

  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(
    wb,
    `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

// ═══════════════════════════════════════════════════════════════
//  PDF EXPORT — opens a styled print window
// ═══════════════════════════════════════════════════════════════
export function exportToPDF(rows, columns, title, filterSummary) {
  if (!rows || rows.length === 0) {
    alert("No data to export. Run a search first.");
    return;
  }

  const co = JSON.parse(
    localStorage.getItem("company") || '{"name":"S.V. Cold Storage"}',
  );
  const now = new Date().toLocaleString("en-IN");

  const headerHTML = columns.map((c) => `<th>${c.label}</th>`).join("");

  const rowsHTML = rows
    .map((row, i) => {
      const cells = columns
        .map((col) => {
          const val =
            typeof col.value === "function" ? col.value(row) : row[col.key];
          return `<td>${val ?? "—"}</td>`;
        })
        .join("");
      return `<tr class="${i % 2 === 0 ? "even" : "odd"}">${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; padding: 12px; }
    .header { text-align: center; margin-bottom: 10px; }
    .header h1 { font-size: 15px; font-weight: 700; }
    .header h2 { font-size: 12px; color: #374151; margin-top: 2px; }
    .meta { display: flex; justify-content: space-between; font-size: 9px;
            color: #6b7280; margin-bottom: 8px; padding-bottom: 5px;
            border-bottom: 1px solid #e2e8f0; }
    .count { font-size: 10px; font-weight: 600; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #4a3fa0; color: #fff; padding: 5px 7px;
         text-align: left; font-size: 9px; white-space: nowrap; }
    td { padding: 4px 7px; border-bottom: 1px solid #f1f5f9;
         font-size: 9px; white-space: nowrap; }
    tr.even { background: #fff; }
    tr.odd  { background: #f8fafc; }
    .footer { text-align: center; font-size: 8px; color: #94a3b8;
              border-top: 1px solid #e2e8f0; padding-top: 5px; margin-top: 8px; }
    @page { size: A4 landscape; margin: 8mm; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${co.name || "S.V. Cold Storage"}</h1>
    <h2>${title}</h2>
  </div>
  <div class="meta">
    <span>${filterSummary || ""}</span>
    <span>Printed: ${now}</span>
  </div>
  <div class="count">${rows.length} records</div>
  <table>
    <thead><tr>${headerHTML}</tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>
  <div class="footer">${co.name} · ColdStore ERP · ${now}</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1200,height=800");
  win.document.write(html);
  win.document.close();
}

// ═══════════════════════════════════════════════════════════════
//  COLUMN DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const INWARD_COLUMNS = [
  { key: "csrNo", label: "Inward No", width: 10 },
  {
    key: "inwardDate",
    label: "Date",
    width: 12,
    value: (r) =>
      r.inwardDate ? new Date(r.inwardDate).toLocaleDateString("en-IN") : "—",
  },
  { key: "customerName", label: "Party Name", width: 22 },
  { key: "customerCity", label: "Village", width: 14 },
  { key: "customerMobile", label: "Mobile", width: 12 },
  { key: "customerPartyCode", label: "Party Code", width: 10 },
  { key: "commodityName", label: "Commodity", width: 14 },
  { key: "varietyName", label: "Variety", width: 18 },
  { key: "pktName", label: "Packet", width: 14 },
  { key: "quantity", label: "Bags", width: 8 },
  { key: "weight", label: "Weight (KG)", width: 12 },
  { key: "rentType", label: "Rent Type", width: 10 },
  { key: "lotCode", label: "Chamber", width: 10 },
  { key: "marka", label: "Marka", width: 14 },
  { key: "vehicleNo", label: "Vehicle", width: 12 },
  { key: "receivedFrom", label: "Received From", width: 14 },
];

export const OUTWARD_COLUMNS = [
  { key: "outNo", label: "Bill No", width: 10 },
  {
    key: "outwardDate",
    label: "Date",
    width: 12,
    value: (r) =>
      r.outwardDate ? new Date(r.outwardDate).toLocaleDateString("en-IN") : "—",
  },
  { key: "name", label: "Party Name", width: 22 },
  { key: "village", label: "Village", width: 14 },
  { key: "uniqueNo", label: "Party Code", width: 10 },
  { key: "commodity", label: "Commodity", width: 14 },
  { key: "variety", label: "Variety", width: 18 },
  { key: "quantity", label: "Bags Out", width: 8 },
  { key: "weight", label: "Weight (KG)", width: 12 },
  { key: "rent", label: "Rent (₹)", width: 12 },
  { key: "location", label: "Chamber", width: 10 },
  { key: "vehicle", label: "Vehicle", width: 12 },
  { key: "marka", label: "Marka", width: 14 },
  {
    key: "inwDate",
    label: "Inward Date",
    width: 12,
    value: (r) =>
      r.inwDate ? new Date(r.inwDate).toLocaleDateString("en-IN") : "—",
  },
  { key: "inwardNo", label: "Inward No", width: 10 },
];
