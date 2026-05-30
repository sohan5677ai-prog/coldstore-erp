import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/Layout";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok()}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await r.text();
  let d;
  try {
    d = text ? JSON.parse(text) : {};
  } catch (e) {
    if (!r.ok) throw new Error(`Server Error: ${r.status}`, { cause: e });
    return {};
  }
  if (!r.ok) throw new Error(d.message || "Error");
  return d;
}

// 🛡️ Math Engine for Rent
const calcRentLive = (
  type,
  rate,
  outQty,
  outWt,
  billingMode,
  inwardDateStr,
  outwardDateStr,
) => {
  const inDate = new Date(inwardDateStr);
  const outDate = new Date(outwardDateStr);
  const diffTime = outDate.getTime() - inDate.getTime();

  let daysStored = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (daysStored <= 0) daysStored = 1;
  const monthsStored = Math.max(1, Math.ceil(daysStored / 30));

  let baseRent;
  switch (type) {
    case "KG":
      baseRent = outWt * rate;
      break;
    case "Packet":
      baseRent = outQty * rate;
      break;
    case "Quintal":
      baseRent = (outWt / 100) * rate;
      break;
    case "Ton":
      baseRent = (outWt / 1000) * rate;
      break;
    default:
      baseRent = outWt * rate;
  }

  if (billingMode === "Monthly") {
    return baseRent * monthsStored;
  }
  return baseRent;
};

// ── EXTERNAL COMPONENTS ───────────────────────────────────────

function TableHeader({ cols }) {
  return (
    <thead>
      <tr style={{ background: "#7c68d4", color: "#fff" }}>
        {cols.map((c, i) => (
          <th
            key={i}
            style={{
              padding: "10px 12px",
              fontSize: 12,
              textAlign: "left",
              whiteSpace: "nowrap",
              borderRight: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// Modal for "Select Lots"
function LotsModal({ isOpen, onClose, lots, onSelect }) {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#e0d4f5",
          borderRadius: 8,
          width: "80%",
          maxWidth: 900,
          overflow: "hidden",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: "#8b5cf6",
            color: "#fff",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 700,
          }}
        >
          <span>Party Lot</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 20, background: "#f8f5ff" }}>
          <div
            style={{
              overflowX: "auto",
              background: "#fff",
              borderRadius: 6,
              border: "1px solid #d8b4fe",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: "#7c68d4", color: "#fff" }}>
                  <th style={{ padding: 10 }}>Select</th>
                  <th style={{ padding: 10 }}>Inw/CSR No</th>
                  <th style={{ padding: 10 }}>Marka</th>
                  <th style={{ padding: 10 }}>Inward (Qty)</th>
                  <th style={{ padding: 10 }}>Commodity</th>
                  <th style={{ padding: 10 }}>Kism</th>
                  <th style={{ padding: 10 }}>Total Weight</th>
                  <th style={{ padding: 10 }}>Inward Date</th>
                  <th style={{ padding: 10 }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {lots.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      No active lots found.
                    </td>
                  </tr>
                ) : (
                  lots.map((lot, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e9d5ff" }}>
                      <td style={{ padding: 10, textAlign: "center" }}>
                        <button
                          onClick={() => onSelect(lot)}
                          style={{
                            background: "#22c55e",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 12px",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          &raquo;
                        </button>
                      </td>
                      <td style={{ padding: 10, fontWeight: 600 }}>
                        {lot.csrNo}
                      </td>
                      <td style={{ padding: 10 }}>{lot.marka}</td>
                      <td
                        style={{
                          padding: 10,
                          fontWeight: 600,
                          color: "#2563eb",
                        }}
                      >
                        {lot.remainingQty}
                      </td>
                      <td style={{ padding: 10 }}>
                        {lot.variety?.commodity?.name} <br />
                        <span style={{ fontSize: 10, color: "#6b7280" }}>
                          ({lot.billingMode})
                        </span>
                      </td>
                      <td style={{ padding: 10 }}>
                        {lot.variety?.name || "."}
                      </td>
                      <td style={{ padding: 10 }}>
                        {parseFloat(lot.remainingWt).toFixed(3)}
                      </td>
                      <td style={{ padding: 10 }}>
                        {new Date(lot.inwardDate).toLocaleDateString("en-IN")}
                      </td>
                      <td style={{ padding: 10 }}>{lot.lot?.lotCode || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────

export default function OutwardEntry() {
  // ── States ──
  const [customers, setCustomers] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partySearch, setPartySearch] = useState("");
  const [partyDrop, setPartyDrop] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableLots, setAvailableLots] = useState([]);
  const [selectedInwards, setSelectedInwards] = useState([]);

  // Form Fields matching screenshot perfectly
  const [form, setForm] = useState({
    outNo: "Auto",
    billNo: "",
    date: new Date().toISOString().slice(0, 10),
    type: "Outward",
    wrNo: "",
    depositeNo: "",
    vehicleNo: "",
    driverName: "",
    refDocNo: "",
    deliTo: "",
    deliDate: new Date().toISOString().slice(0, 10),
    remark: "",
    mode: "Credit",
    loadTruck: "No",
    selectContractor1: "Select",
    unloadStore: "No",
    selectContractor2: "Select",
  });

  const [loading, setLoading] = useState(false);
  const dropRef = useRef();

  // Load Customers
  useEffect(() => {
    const load = async () => {
      await Promise.resolve();
      try {
        const c = await apiFetch("/customers");
        setCustomers(c);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  // Handle Search Dropdown
  useEffect(() => {
    const filter = async () => {
      await Promise.resolve();
      if (!partySearch.trim() || selectedParty) {
        setPartyDrop([]);
        return;
      }
      const q = partySearch.toLowerCase();
      setPartyDrop(
        customers
          .filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              (c.partyCode || "").toLowerCase().includes(q),
          )
          .slice(0, 10),
      );
    };
    filter();
  }, [partySearch, customers, selectedParty]);

  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setPartyDrop([]);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const pickParty = (c) => {
    setSelectedParty(c);
    setPartySearch(c.name);
    setPartyDrop([]);
    setSelectedInwards([]); // Clear table if party changes
  };

  const handleForm = useCallback((k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  // ── Modal Logic ──
  const openLotsModal = async () => {
    if (!selectedParty) return alert("Please select a party first!");
    setLoading(true);
    try {
      const res = await apiFetch(`/inward?partyId=${selectedParty.id}`);
      setAvailableLots(res);
      setIsModalOpen(true);
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  const selectLot = (inw) => {
    const isAlreadyAdded = selectedInwards.some(
      (row) => row.inwardId === inw.id,
    );
    if (isAlreadyAdded) return alert("This lot is already added to the table.");

    const pkt = inw.packetEntries?.[0] || {};
    const newRow = {
      inwardId: inw.id,
      inwardDate: inw.inwardDate,
      billingMode: inw.billingMode || "Seasonal",
      marka: inw.marka || "",
      pktMarka: pkt.packetName || "",
      commodity: inw.variety?.commodity?.name || "",
      packet: pkt.packetName || "",
      pktWt: pkt.avgWeight || 0,
      batchNo: inw.lot?.lotCode || "",
      wt: inw.remainingWt || 0,
      qty: inw.remainingQty || 0, // 👈 True remaining quantity
      outQty: "",
      totalWeight: "0.000",
      unloadCh: "0.00",
      rent: "0.00",
      gstPer: "0.00 0.00 0.00",
      gstAmt: "0.00",
      tRent: "0.00",
      pallate: "",
      type: inw.rentType || "KG",
      rate: pkt.rate || 0,
    };

    setSelectedInwards((prev) => [...prev, newRow]);
    setIsModalOpen(false);
  };

  // ── Recalculate Live Rent if Date Changes ──
  useEffect(() => {
    const recalc = async () => {
      await Promise.resolve();
      setSelectedInwards((prev) =>
        prev.map((row) => {
          if (!row.outQty || parseFloat(row.outQty) <= 0) return row;
          const outQ = parseFloat(row.outQty) || 0;
          const outWt = parseFloat(row.totalWeight) || 0;
          const rentAmt = calcRentLive(
            row.type,
            row.rate,
            outQ,
            outWt,
            row.billingMode,
            row.inwardDate,
            form.date,
          );
          return {
            ...row,
            rent: rentAmt.toFixed(2),
            tRent: rentAmt.toFixed(2),
          };
        }),
      );
    };
    recalc();
  }, [form.date]);

  // ── Handle Table Math & ALERTS ──
  const handleOutQtyChange = (index, val) => {
    setSelectedInwards((prev) => {
      const arr = [...prev];
      const row = arr[index];

      let outQ = parseFloat(val);
      if (isNaN(outQ)) outQ = 0;

      // 🛡️ SHIELD: Out Qty is Greater then Balance Qty!
      if (outQ > row.qty) {
        alert("Out Qty is Greater then Balance Qty!");
        outQ = 0; // Reset to 0
        val = "";
      }

      const ratio = row.qty > 0 ? outQ / row.qty : 0;
      const outWt = row.wt * ratio;

      const rentAmt = calcRentLive(
        row.type,
        row.rate,
        outQ,
        outWt,
        row.billingMode,
        row.inwardDate,
        form.date,
      );

      arr[index] = {
        ...row,
        outQty: val,
        totalWeight: outWt.toFixed(3),
        rent: rentAmt.toFixed(2),
        tRent: rentAmt.toFixed(2),
      };
      return arr;
    });
  };

  const removeRow = (index) => {
    setSelectedInwards((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submission ──
  const submitOutward = async () => {
    const valid = selectedInwards.filter((i) => parseFloat(i.outQty) > 0);
    if (valid.length === 0)
      return alert("Please enter outward quantity for at least one lot.");
    try {
      await apiFetch("/outward", {
        method: "POST",
        body: JSON.stringify({
          entries: valid,
          customerId: selectedParty.id,
          outwardDate: form.date,
          vehicleNo: form.vehicleNo,
          remarks: form.remark,
        }),
      });
      alert("Outward processed successfully!");
      setSelectedParty(null);
      setPartySearch("");
      setSelectedInwards([]);
    } catch (e) {
      alert(e.message);
    }
  };

  const entryColumns = [
    "Marka",
    "Pkt Marka",
    "Commodity",
    "Packet",
    "Pkt Wt",
    "Batch No.",
    "Wt",
    "Qty",
    "Out Qty",
    "Total Weight",
    "Unload Ch",
    "Rent",
    "GSTPer",
    "GSTAmt",
    "T.Rent",
    "Pallate",
    "Type",
    "Act",
  ];

  const inpStyle = {
    padding: "6px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 4,
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <Layout>
      <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 5px rgba(0,0,0,0.05)",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#60a5fa",
              color: "#fff",
              padding: "12px 24px",
              textAlign: "center",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Outward
          </div>

          <div style={{ padding: 20 }}>
            {/* Top Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 2fr 1.5fr",
                gap: 20,
                alignItems: "end",
                marginBottom: 20,
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: 4,
                    display: "block",
                  }}
                >
                  Out.No.
                </label>
                <input
                  value={form.outNo}
                  disabled
                  style={{ ...inpStyle, background: "#f1f5f9" }}
                />
                <input
                  value={form.wrNo}
                  onChange={(e) => handleForm("wrNo", e.target.value)}
                  placeholder="WR No"
                  style={{ ...inpStyle, marginTop: 8 }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: 4,
                    display: "block",
                  }}
                >
                  Bill No.
                </label>
                <input
                  value={form.billNo}
                  onChange={(e) => handleForm("billNo", e.target.value)}
                  style={{ ...inpStyle, background: "#f1f5f9" }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: 4,
                    display: "block",
                  }}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleForm("date", e.target.value)}
                  style={inpStyle}
                />

                <div
                  style={{
                    position: "relative",
                    marginTop: 8,
                    display: "flex",
                    gap: 10,
                  }}
                  ref={dropRef}
                >
                  <input
                    value={partySearch}
                    onChange={(e) => {
                      setPartySearch(e.target.value);
                      if (selectedParty) setSelectedParty(null);
                    }}
                    placeholder="Search Party"
                    style={{ ...inpStyle, flex: 1 }}
                  />
                  <button
                    onClick={openLotsModal}
                    style={{
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "0 16px",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {loading ? "..." : "Select Lots"}
                  </button>

                  {/* Dropdown */}
                  {partyDrop.length > 0 && !selectedParty && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        width: "100%",
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        zIndex: 100,
                        maxHeight: 200,
                        overflowY: "auto",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    >
                      {partyDrop.map((c, i) => (
                        <div
                          key={c.id}
                          onClick={() => pickParty(c)}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: 13,
                            borderBottom: "1px solid #f1f5f9",
                            background: i % 2 === 0 ? "#fff" : "#f8fafc",
                          }}
                        >
                          {c.name}{" "}
                          <span style={{ color: "#3b82f6" }}>
                            {c.city && `- ${c.city}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  height: "100%",
                  paddingBottom: 32,
                }}
              >
                <label
                  style={{
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <input type="radio" checked readOnly /> Outward
                </label>
                <label
                  style={{
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <input type="radio" disabled /> Challan
                </label>
              </div>
            </div>

            {/* Outward Details Ribbon */}
            <div
              style={{
                background: "#60a5fa",
                color: "#fff",
                padding: "6px 12px",
                fontWeight: 700,
                fontSize: 14,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              Outward Details
            </div>

            {/* Middle Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "16px 20px",
                marginBottom: 20,
              }}
            >
              <div>
                <label
                  style={{ fontSize: 11, color: "#64748b", display: "block" }}
                >
                  Deposite No.
                </label>
                <input
                  value={form.depositeNo}
                  onChange={(e) => handleForm("depositeNo", e.target.value)}
                  style={inpStyle}
                />
              </div>
              <div>
                <label
                  style={{ fontSize: 11, color: "#64748b", display: "block" }}
                >
                  Vehicle No
                </label>
                <input
                  value={form.vehicleNo}
                  onChange={(e) => handleForm("vehicleNo", e.target.value)}
                  style={inpStyle}
                />
              </div>
              <div>
                <label
                  style={{ fontSize: 11, color: "#64748b", display: "block" }}
                >
                  Driver Name
                </label>
                <input
                  value={form.driverName}
                  onChange={(e) => handleForm("driverName", e.target.value)}
                  style={inpStyle}
                />
              </div>
              <div>
                <label
                  style={{ fontSize: 11, color: "#64748b", display: "block" }}
                >
                  Ref. Doc. No
                </label>
                <input
                  value={form.refDocNo}
                  onChange={(e) => handleForm("refDocNo", e.target.value)}
                  style={inpStyle}
                />
              </div>
              <div>
                <label
                  style={{ fontSize: 11, color: "#64748b", display: "block" }}
                >
                  Deli. Date
                </label>
                <input
                  type="date"
                  value={form.deliDate}
                  onChange={(e) => handleForm("deliDate", e.target.value)}
                  style={inpStyle}
                />
              </div>
              <div style={{ gridColumn: "2 / 4" }}>
                <label
                  style={{ fontSize: 11, color: "#64748b", display: "block" }}
                >
                  Remark
                </label>
                <input
                  value={form.remark}
                  onChange={(e) => handleForm("remark", e.target.value)}
                  style={inpStyle}
                />
              </div>
              <div>
                <label
                  style={{ fontSize: 11, color: "#64748b", display: "block" }}
                >
                  Mode
                </label>
                <select
                  value={form.mode}
                  onChange={(e) => handleForm("mode", e.target.value)}
                  style={inpStyle}
                >
                  <option>Credit</option>
                  <option>Cash</option>
                </select>
              </div>
            </div>

            {/* Sub Middle Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr 1fr 2fr",
                gap: "16px 20px",
                marginBottom: 20,
              }}
            >
              <div>
                <label
                  style={{ fontSize: 11, color: "#64748b", display: "block" }}
                >
                  Load Truck:
                </label>
                <select
                  value={form.loadTruck}
                  onChange={(e) => handleForm("loadTruck", e.target.value)}
                  style={inpStyle}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </div>
              <div>
                <label
                  style={{ fontSize: 11, color: "#64748b", display: "block" }}
                >
                  Select Contractor
                </label>
                <select
                  value={form.selectContractor1}
                  onChange={(e) =>
                    handleForm("selectContractor1", e.target.value)
                  }
                  style={inpStyle}
                >
                  <option>Select</option>
                </select>
              </div>
              <div>
                <label
                  style={{ fontSize: 11, color: "#64748b", display: "block" }}
                >
                  Unload Store:
                </label>
                <select
                  value={form.unloadStore}
                  onChange={(e) => handleForm("unloadStore", e.target.value)}
                  style={inpStyle}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </div>
              <div>
                <label
                  style={{ fontSize: 11, color: "#64748b", display: "block" }}
                >
                  Select Contractor
                </label>
                <select
                  value={form.selectContractor2}
                  onChange={(e) =>
                    handleForm("selectContractor2", e.target.value)
                  }
                  style={inpStyle}
                >
                  <option>Select</option>
                </select>
              </div>
            </div>

            {/* TABLE */}
            {selectedInwards.length === 0 ? (
              <div
                style={{
                  background: "#e0f2fe",
                  color: "#0369a1",
                  padding: 12,
                  textAlign: "center",
                  fontSize: 13,
                  borderRadius: 4,
                  fontWeight: 500,
                  marginBottom: 20,
                }}
              >
                Please select Inward to view details.
              </div>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid #e2e8f0",
                  borderRadius: 4,
                  marginBottom: 20,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <TableHeader cols={entryColumns} />
                  <tbody>
                    {selectedInwards.map((row, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          background: i % 2 === 0 ? "#fff" : "#f8fafc",
                        }}
                      >
                        <td style={{ padding: "8px 12px" }}>
                          {row.marka} <br />{" "}
                          <span style={{ fontSize: 9, color: "#64748b" }}>
                            {row.batchNo}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>
                          {row.pktMarka}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {row.commodity}
                          <br />
                          <span style={{ fontSize: 10, color: "#6b7280" }}>
                            ({row.billingMode})
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px" }}>{row.packet}</td>
                        <td style={{ padding: "8px 12px" }}>
                          {parseFloat(row.pktWt).toFixed(6)}
                        </td>
                        <td style={{ padding: "8px 12px" }}>{row.batchNo}</td>
                        <td style={{ padding: "8px 12px" }}>
                          {parseFloat(row.wt).toFixed(3)}
                        </td>
                        <td style={{ padding: "8px 12px", fontWeight: 700 }}>
                          {row.qty}
                        </td>

                        {/* Out Qty Input */}
                        <td style={{ padding: "8px 12px", width: 80 }}>
                          <input
                            type="number"
                            value={row.outQty}
                            onChange={(e) =>
                              handleOutQtyChange(i, e.target.value)
                            }
                            style={{
                              width: "100%",
                              padding: "6px",
                              borderRadius: 4,
                              border: "2px solid #3b82f6",
                              outline: "none",
                              textAlign: "right",
                              fontWeight: 600,
                            }}
                          />
                        </td>

                        <td
                          style={{
                            padding: "8px 12px",
                            background: "#e2e8f0",
                            fontWeight: 600,
                          }}
                        >
                          {row.totalWeight}{" "}
                          <span style={{ fontSize: 9 }}>KG</span>
                        </td>
                        <td style={{ padding: "8px 12px" }}>{row.unloadCh}</td>
                        <td
                          style={{ padding: "8px 12px", background: "#f1f5f9" }}
                        >
                          {row.rent}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            color: "#94a3b8",
                            fontSize: 10,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.gstPer}
                        </td>
                        <td style={{ padding: "8px 12px", color: "#94a3b8" }}>
                          {row.gstAmt}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            background: "#e2e8f0",
                            fontWeight: 700,
                            color: "#374151",
                          }}
                        >
                          {row.tRent}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <input
                            style={{ width: 40, border: "1px solid #ccc" }}
                          />
                        </td>
                        <td style={{ padding: "8px 12px" }}>{row.type}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <button
                            onClick={() => removeRow(i)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              fontSize: 16,
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        background: "#f8fafc",
                        fontWeight: 700,
                        borderTop: "2px solid #cbd5e1",
                      }}
                    >
                      <td
                        colSpan={7}
                        style={{ padding: 12, textAlign: "right" }}
                      >
                        Total:
                      </td>
                      <td style={{ padding: 12 }}>
                        {selectedInwards.reduce(
                          (s, r) => s + (parseFloat(r.qty) || 0),
                          0,
                        )}
                      </td>
                      <td style={{ padding: 12 }}>
                        {selectedInwards.reduce(
                          (s, r) => s + (parseFloat(r.outQty) || 0),
                          0,
                        )}
                      </td>
                      <td style={{ padding: 12 }}>
                        {selectedInwards
                          .reduce(
                            (s, r) => s + (parseFloat(r.totalWeight) || 0),
                            0,
                          )
                          .toFixed(3)}
                      </td>
                      <td style={{ padding: 12 }}>0.00</td>
                      <td style={{ padding: 12 }}>
                        {selectedInwards
                          .reduce((s, r) => s + (parseFloat(r.rent) || 0), 0)
                          .toFixed(2)}
                      </td>
                      <td style={{ padding: 12 }}></td>
                      <td style={{ padding: 12 }}>0.00</td>
                      <td style={{ padding: 12, color: "#15803d" }}>
                        {selectedInwards
                          .reduce((s, r) => s + (parseFloat(r.tRent) || 0), 0)
                          .toFixed(2)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={submitOutward}
                style={{
                  background: "#22c55e",
                  color: "#fff",
                  padding: "8px 24px",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setSelectedInwards([]);
                  setSelectedParty(null);
                  setPartySearch("");
                }}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  padding: "8px 24px",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>
            <button
              style={{
                background: "#64748b",
                color: "#fff",
                padding: "8px 20px",
                border: "none",
                borderRadius: 4,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 10,
              }}
            >
              Show All Outward
            </button>
          </div>
        </div>
      </div>

      <LotsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lots={availableLots}
        onSelect={selectLot}
      />
    </Layout>
  );
}
