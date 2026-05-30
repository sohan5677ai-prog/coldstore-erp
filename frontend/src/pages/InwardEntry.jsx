// frontend/src/pages/InwardEntry.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/Layout";
import useTelegramPoll from "../hooks/useTelegramPoll";

const API = "http://localhost:5000/api";
const tok = () => localStorage.getItem("token");

async function apiFetch(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok()}`,
      "x-fin-year": localStorage.getItem("finYear") || "2026-27",
      ...(!isForm && { "Content-Type": "application/json" }),
      ...(opts.headers || {}),
    },
  });

  const text = await r.text();
  let d;
  try {
    d = text ? JSON.parse(text) : {};
  } catch (e) {
    if (!r.ok)
      throw new Error(
        `Server Error: ${r.status} ${r.statusText}. Check backend.`,
        { cause: e },
      );
    return {};
  }
  if (!r.ok) throw new Error(d.message || "Error");
  return d;
}

function useDebounce(v, ms = 250) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

const AVG_LOCKED = ["Packet"];

function SectionBar({ title }) {
  return (
    <div
      style={{
        background: "#2563eb",
        color: "#fff",
        padding: "8px 16px",
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {title}
    </div>
  );
}

function FieldGrid({ cols, children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "12px 20px",
        padding: "14px 16px",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      {children}
    </div>
  );
}

function FieldLabel({ label, ocr, required, err, children }) {
  return (
    <div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: "#374151",
          marginBottom: 4,
        }}
      >
        {label}
        {required && <span style={{ color: "#ef4444" }}>*</span>}
        {ocr && (
          <span
            style={{
              fontSize: 10,
              background: "#dcfce7",
              color: "#15803d",
              padding: "1px 6px",
              borderRadius: 3,
            }}
          >
            ✓ OCR
          </span>
        )}
      </label>
      {children}
      {err && (
        <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>
          {err}
        </div>
      )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  style,
  disabled,
  ocr,
  err,
}) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "8px 10px",
        fontSize: 13,
        boxSizing: "border-box",
        outline: "none",
        fontFamily: "inherit",
        border: `1.5px solid ${err ? "#f87171" : ocr ? "#86efac" : "#d1d5db"}`,
        background: disabled ? "#f3f4f6" : ocr ? "#f0fdf4" : "#fff",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "text",
        color: disabled ? "#9ca3af" : "#1e293b",
        ...style,
      }}
    />
  );
}

function PartyDropItem({ party, index, onPick, highlighted }) {
  const defaultBg = highlighted ? "#dbeafe" : index === 0 ? "#f0f9ff" : "#fff";
  return (
    <div
      onClick={() => onPick(party)}
      style={{
        padding: "9px 14px",
        cursor: "pointer",
        fontSize: 13,
        borderBottom: "1px solid #f1f5f9",
        borderLeft: highlighted ? "3px solid #2563eb" : "3px solid transparent",
        background: defaultBg,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#eff6ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = defaultBg;
      }}
    >
      <strong>{party.name}</strong>
      {party.city && (
        <span style={{ color: "#2563eb" }}> : {party.city.toUpperCase()}</span>
      )}
      <div style={{ fontSize: 11, color: "#94a3b8" }}>
        {party.partyCode} · {party.mobileNumber || "—"}
      </div>
    </div>
  );
}

function PacketTableRow({
  row,
  idx,
  isAvgLocked,
  onQtyChange,
  onAvgChange,
  onWtChange,
}) {
  const qty = parseFloat(row.quantity) || 0;
  const avg = parseFloat(row.avgWeight) || 0;
  const wt = parseFloat(row.totalWeight) || 0;

  // Display helpers — empty string when zero (no leading-zero bug)
  const avgDisplay = row.avgWeight === "" || avg === 0 ? "" : row.avgWeight;
  const wtDisplay = row.totalWeight === "" || wt === 0 ? "" : row.totalWeight;

  const rowActive = qty > 0 || wt > 0;

  const cellSt = { padding: "8px 6px" };
  const inputBase = {
    padding: "6px 8px",
    fontSize: 13,
    borderRadius: 5,
    outline: "none",
    textAlign: "right",
    width: 110,
  };

  return (
    <tr
      style={{
        borderBottom: "1px solid #f1f5f9",
        background: rowActive ? "#f0fdf4" : "#fff",
      }}
    >
      {/* Packet name */}
      <td style={{ padding: "8px 12px", fontWeight: 600, fontSize: 13 }}>
        {row.packetName}
      </td>

      {/* Avg Weight per bag */}
      <td style={cellSt}>
        {isAvgLocked ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="text"
              readOnly
              value={parseFloat(row.avgWeight || 0).toFixed(3)}
              title="Fixed from Commodity Master"
              style={{
                ...inputBase,
                width: 90,
                background: "#f3f4f6",
                border: "1.5px solid #e2e8f0",
                color: "#6b7280",
                cursor: "not-allowed",
              }}
            />
            <span style={{ fontSize: 10, color: "#94a3b8" }}>🔒</span>
          </div>
        ) : (
          <input
            type="number"
            min="0"
            step="0.001"
            value={avgDisplay}
            onChange={(e) => onAvgChange(idx, e.target.value)}
            placeholder="0.000"
            title="Avg weight per bag — auto-calculates if you fill Bags + Total Wt"
            style={{
              ...inputBase,
              border: "1.5px solid #86efac",
              background: "#f0fdf4",
            }}
          />
        )}
      </td>

      {/* No. of bags */}
      <td style={cellSt}>
        <input
          type="number"
          min="0"
          value={row.quantity}
          onChange={(e) => onQtyChange(idx, e.target.value)}
          placeholder="0"
          title="No. of bags — auto-calculates if you fill Avg Wt + Total Wt"
          style={{
            ...inputBase,
            width: 110,
            fontWeight: 600,
            border: `2px solid ${qty > 0 ? "#22c55e" : "#d1d5db"}`,
            background: qty > 0 ? "#f0fdf4" : "#fff",
          }}
        />
      </td>

      {/* Total weight — NOW EDITABLE */}
      <td style={cellSt}>
        <input
          type="number"
          min="0"
          step="0.001"
          value={wtDisplay}
          onChange={(e) => onWtChange(idx, e.target.value)}
          placeholder="0.000"
          title="Total weight — auto-calculates if you fill Bags + Avg Wt"
          style={{
            ...inputBase,
            width: 120,
            border: `1.5px solid ${wt > 0 ? "#2563eb" : "#d1d5db"}`,
            background: wt > 0 ? "#eff6ff" : "#fff",
            fontWeight: wt > 0 ? 700 : 400,
            color: wt > 0 ? "#15803d" : "#94a3b8",
          }}
        />
      </td>

      <td style={{ padding: "8px 12px", color: "#6b7280", fontSize: 12 }}>
        {row.type}
      </td>
      <td style={{ padding: "8px 12px", color: "#6b7280", fontSize: 12 }}>
        ₹{row.rate || 0}
      </td>
    </tr>
  );
}

function TelegramIndicator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(255,255,255,0.12)",
        borderRadius: 6,
        padding: "4px 10px",
        fontSize: 12,
        color: "#fff",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#22c55e",
          display: "inline-block",
          boxShadow: "0 0 0 2px rgba(34,197,94,0.4)",
          animation: "pulse 2s infinite",
        }}
      />
      Telegram Live
    </div>
  );
}

const KG_COMMODITIES = [
  "tamarind",
  "horse gram",
  "horsegram",
  "green peas",
  "chillies",
  "chilli",
];

function inferRentType(commodityName) {
  if (!commodityName) return null;
  const lower = commodityName.toLowerCase().trim();
  const matched = KG_COMMODITIES.some(
    (c) => lower.includes(c) || c.includes(lower),
  );
  return matched ? "KG" : null;
}

export default function InwardEntry() {
  const [form, setForm] = useState({
    partySearch: "",
    bookingNo: "",
    csrNo: "",
    inwardDate: new Date().toISOString().slice(0, 10),
    receivedFrom: "",
    vehicleNo: "",
    driverNo: "",
    commodityId: "",
    varietyId: "",
    rentType: "",
    billingMode: "Seasonal",
    marka: "",
    lotCode: "",
  });

  const [commodities, setCommodities] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [allPackets, setAllPackets] = useState([]);
  const [packetRows, setPacketRows] = useState([]);
  const [party, setParty] = useState(null);
  const [partyDrop, setPartyDrop] = useState([]);
  const [dropIdx, setDropIdx] = useState(-1); // keyboard nav cursor
  const [seqEdit, setSeqEdit] = useState(false); // Edit Sequence panel open
  const [seqInput, setSeqInput] = useState(""); // user-typed sequence start
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrPreview, setOcrPreview] = useState(null);
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [ocrFilled, setOcrFilled] = useState({});

  const fileRef = useRef();
  const dropRef = useRef();
  const debounced = useDebounce(form.partySearch, 250);

  const setField = useCallback((k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }, []);

  const toast$ = useCallback((msg, t = "ok") => {
    setToast({ msg, t });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const weightUnlocked = !!(
    form.commodityId &&
    form.varietyId &&
    form.rentType
  );
  const isAvgLocked = AVG_LOCKED.includes(form.rentType);
  const totalWeight = packetRows.reduce(
    (s, r) => s + (parseFloat(r.totalWeight) || 0),
    0,
  );
  const hasQty = packetRows.some((r) => parseFloat(r.quantity) > 0);

  const handleTelegramData = useCallback(
    (data) => {
      const apply = async () => {
        await Promise.resolve();
        const filled = {};

        if (data.inward_date || data.date) {
          setField(
            "inwardDate",
            data.inward_date || data.date || form.inwardDate,
          );
          filled.inwardDate = true;
        }
        if (data.vehicle_no) {
          setField("vehicleNo", data.vehicle_no);
          filled.vehicleNo = true;
        }
        if (data.driver_no) {
          setField("driverNo", data.driver_no);
          filled.driverNo = true;
        }
        if (data.marka) {
          setField("marka", data.marka);
          filled.marka = true;
        }
        if (data.received_from) setField("receivedFrom", data.received_from);
        if (data.lot_no) setField("lotCode", data.lot_no);

        const scanBags = parseFloat(data.noOfBags || data.bags || 0) || 0;
        const scanWeight =
          parseFloat(data.totalKgs || data.weight_kg || 0) || 0;
        let calculatedAvg = 0;
        if (scanBags > 0 && scanWeight > 0)
          calculatedAvg = parseFloat((scanWeight / scanBags).toFixed(3));

        let resolvedCommodityName = null;
        if (data.commodity && commodities.length > 0) {
          const commMatch = commodities.find(
            (c) =>
              c.name.toLowerCase().includes(data.commodity.toLowerCase()) ||
              data.commodity.toLowerCase().includes(c.name.toLowerCase()),
          );
          if (commMatch) {
            resolvedCommodityName = commMatch.name;
            setField("varietyId", "");
            setField("rentType", "");
            setPacketRows([]);
            setField("commodityId", String(commMatch.id));
            filled.commodityId = true;

            if (data.variety) {
              try {
                const freshVars = await apiFetch(
                  `/varieties?commodityId=${commMatch.id}`,
                );
                const varMatch = freshVars.find(
                  (v) =>
                    v.name.toLowerCase().includes(data.variety.toLowerCase()) ||
                    data.variety.toLowerCase().includes(v.name.toLowerCase()),
                );
                if (varMatch) {
                  setField("varietyId", String(varMatch.id));
                  filled.varietyId = true;
                }
              } catch (e) {
                console.error("Auto-select variety error:", e.message);
              }
            }
          }
        }

        const VALID_RENT = ["Packet", "KG", "Quintal", "Ton"];
        let resolvedRentType = null;
        if (data.rent_type && VALID_RENT.includes(data.rent_type))
          resolvedRentType = data.rent_type;
        else
          resolvedRentType = inferRentType(
            resolvedCommodityName || data.commodity || null,
          );

        if (resolvedRentType) {
          setField("rentType", resolvedRentType);
          filled.rentType = true;
        }
        setOcrFilled(filled);

        if (calculatedAvg > 0 || scanBags > 0) {
          setTimeout(() => {
            const patch = async () => {
              await Promise.resolve();
              setPacketRows((currentRows) => {
                if (!currentRows || currentRows.length === 0)
                  return currentRows;

                // ── Smart keyword matcher ───────────────────────────────
                // Splits a string into meaningful words (length > 2)
                const keywords = (str) =>
                  String(str || "")
                    .toLowerCase()
                    .split(/[\s,_-]+/)
                    .filter((w) => w.length > 2);

                // Words from the OCR variety + packet_name fields
                const varietyWords = keywords(data.variety);
                const packetWords = keywords(data.packet_name);
                const targetWords = [
                  ...new Set([...varietyWords, ...packetWords]),
                ];

                // Score a packet row: count how many target words appear in its name
                const score = (rowName) => {
                  const rowWords = keywords(rowName);
                  return targetWords.filter((w) =>
                    rowWords.some((rw) => rw.includes(w) || w.includes(rw)),
                  ).length;
                };

                // ── Find best-matching row index ───────────────────────
                let bestIdx = 0; // default: first row (safe fallback)

                if (currentRows.length > 1 && targetWords.length > 0) {
                  const scores = currentRows.map((row) =>
                    score(row.packetName),
                  );
                  const maxScore = Math.max(...scores);
                  if (maxScore > 0) bestIdx = scores.indexOf(maxScore);
                  // if maxScore === 0 → no keyword matched → stays at index 0
                }

                // ── Apply to matched row only; zero out all others ─────
                return currentRows.map((row, idx) => {
                  if (idx !== bestIdx) {
                    // Not the match — clear qty, keep config avgWeight
                    return { ...row, quantity: "", totalWeight: "0.000" };
                  }
                  // Matched row — apply OCR values
                  const avg =
                    calculatedAvg > 0 ? calculatedAvg : row.avgWeight || 0;
                  const qty =
                    scanBags > 0 ? scanBags : parseFloat(row.quantity) || 0;
                  const wt = parseFloat((qty * avg).toFixed(3));
                  return {
                    ...row,
                    avgWeight: avg,
                    quantity: qty > 0 ? String(qty) : "",
                    totalWeight: wt > 0 ? String(wt) : "0.000",
                  };
                });
              });
            };
            patch();
          }, 450);
        }

        if (data.party_name || data.partyName) {
          const name = data.party_name || data.partyName;
          setField("partySearch", name);
          try {
            const list = await apiFetch(
              `/customers/search?q=${encodeURIComponent(name)}`,
            );
            if (list.length === 1) {
              setParty(list[0]);
              setField(
                "partySearch",
                `${list[0].name}${list[0].city ? " : " + list[0].city.toUpperCase() : ""}`,
              );
            } else if (list.length > 1) {
              setPartyDrop(list);
            }
          } catch (e) {
            console.error("Party search error:", e.message);
          }
        }
      };
      apply();
    },
    [commodities, form.inwardDate, setField],
  );

  useTelegramPoll({ passType: "Inward", onData: handleTelegramData, toast$ });

  useEffect(() => {
    const load = async () => {
      await Promise.resolve();
      try {
        const [comList, csrData] = await Promise.all([
          apiFetch("/commodities"),
          apiFetch("/inward/next-csr"),
        ]);
        setCommodities(comList);
        const storedStart = parseInt(localStorage.getItem("inward_seqStart"), 10);
        let nextCsr = csrData.csrNo;
        if (!isNaN(storedStart) && nextCsr < storedStart) {
          nextCsr = storedStart;
        }
        setField("csrNo", String(nextCsr));
        setSeqInput(String(nextCsr)); // keep seqInput in sync
      } catch (_) {
        const storedStart = localStorage.getItem("inward_seqStart") || "2346";
        setField("csrNo", storedStart);
        setSeqInput(storedStart);
      }
    };
    load();
  }, [setField]);

  useEffect(() => {
    if (!form.commodityId) {
      const reset = async () => {
        await Promise.resolve();
        setVarieties([]);
        setAllPackets([]);
        setPacketRows([]);
        setField("varietyId", "");
        setField("rentType", "");
      };
      reset();
      return;
    }
    const load = async () => {
      await Promise.resolve();
      try {
        const [vars, pkts] = await Promise.all([
          apiFetch(`/varieties?commodityId=${form.commodityId}`),
          apiFetch(`/packets?commodityId=${form.commodityId}`),
        ]);
        setVarieties(vars);
        setAllPackets(pkts);
      } catch (err) {
        console.error("Failed to load varieties/packets", err);
      }
    };
    load();
  }, [form.commodityId, setField]);

  useEffect(() => {
    if (!form.rentType || !form.commodityId) {
      const reset = async () => {
        await Promise.resolve();
        setPacketRows([]);
      };
      reset();
      return;
    }
    const build = async () => {
      await Promise.resolve();
      const matched = allPackets.filter((p) => p.rentType === form.rentType);
      setPacketRows(
        matched.map((p) => ({
          packetId: p.id,
          packetName: p.packetName,
          avgWeight: parseFloat(p.weight || 0),
          quantity: "",
          totalWeight: "0.000",
          type: p.rentType,
          rate: p.rentRateFirstPeriod,
        })),
      );
    };
    build();
  }, [form.rentType, allPackets, form.commodityId]);

  useEffect(() => {
    if (!debounced.trim() || party) {
      const clear = async () => {
        await Promise.resolve();
        setPartyDrop([]);
      };
      clear();
      return;
    }
    const search = async () => {
      await Promise.resolve();
      try {
        const list = await apiFetch(
          `/customers/search?q=${encodeURIComponent(debounced)}`,
        );
        setPartyDrop(list);
      } catch (err) {
        setPartyDrop([]);
      }
    };
    search();
  }, [debounced, party]);

  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setPartyDrop([]);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const pickParty = (p) => {
    setParty(p);
    setField(
      "partySearch",
      `${p.name}${p.city ? " : " + p.city.toUpperCase() : ""}`,
    );
    setPartyDrop([]);
    setDropIdx(-1);
  };

  // ── Arrow/Enter keyboard navigation for party dropdown ────────
  const handlePartyKeyDown = (e) => {
    if (!partyDrop.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropIdx((i) => Math.min(i + 1, partyDrop.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDropIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = dropIdx >= 0 ? partyDrop[dropIdx] : partyDrop[0];
      if (target) pickParty(target);
    } else if (e.key === "Escape") {
      setPartyDrop([]);
      setDropIdx(-1);
    }
  };

  // ── Smart 3-way calculation ───────────────────────────────────
  // Rule 1: bags + avg     → totalWeight = bags × avg
  // Rule 2: totalWt + bags → avg = totalWt ÷ bags
  // Rule 3: totalWt + avg  → bags = round(totalWt ÷ avg)

  const updateQty = (idx, value) => {
    setPacketRows((rows) => {
      const nr = [...rows];
      const row = nr[idx];
      const qty = parseFloat(value) || 0;
      const avg = parseFloat(row.avgWeight) || 0;
      const wt = parseFloat(row.totalWeight) || 0;

      let newWt = row.totalWeight;
      let newAvg = row.avgWeight;

      if (qty > 0 && avg > 0) {
        // Rule 1: have bags + avg → compute totalWeight
        newWt = (qty * avg).toFixed(3);
      } else if (qty > 0 && wt > 0) {
        // Rule 2: have bags + totalWt → compute avg
        newAvg = (wt / qty).toFixed(3);
      }
      // if qty=0, leave others unchanged

      nr[idx] = {
        ...row,
        quantity: value,
        avgWeight: newAvg,
        totalWeight: newWt,
      };
      return nr;
    });
    setErrors((e) => ({ ...e, quantity: "" }));
  };

  const updateAvg = (idx, value) => {
    setPacketRows((rows) => {
      const nr = [...rows];
      const row = nr[idx];
      const avg = parseFloat(value) || 0;
      const qty = parseFloat(row.quantity) || 0;
      const wt = parseFloat(row.totalWeight) || 0;

      let newWt = row.totalWeight;
      let newQty = row.quantity;

      if (avg > 0 && qty > 0) {
        // Rule 1: have avg + bags → compute totalWeight
        newWt = (avg * qty).toFixed(3);
      } else if (avg > 0 && wt > 0) {
        // Rule 3: have avg + totalWt → compute bags
        newQty = String(Math.round(wt / avg));
      }

      nr[idx] = {
        ...row,
        avgWeight: value,
        quantity: newQty,
        totalWeight: newWt,
      };
      return nr;
    });
  };

  const updateWt = (idx, value) => {
    setPacketRows((rows) => {
      const nr = [...rows];
      const row = nr[idx];
      const wt = parseFloat(value) || 0;
      const qty = parseFloat(row.quantity) || 0;
      const avg = parseFloat(row.avgWeight) || 0;

      let newAvg = row.avgWeight;
      let newQty = row.quantity;

      if (wt > 0 && qty > 0) {
        // Rule 2: have totalWt + bags → compute avg
        newAvg = (wt / qty).toFixed(3);
      } else if (wt > 0 && avg > 0) {
        // Rule 3: have totalWt + avg → compute bags
        newQty = String(Math.round(wt / avg));
      }

      nr[idx] = {
        ...row,
        totalWeight: value,
        avgWeight: newAvg,
        quantity: newQty,
      };
      return nr;
    });
  };

  const onFile = (f) => {
    if (!f) return;
    setOcrFile(f);
    setOcrPreview(URL.createObjectURL(f));
    setOcrError("");
    setOcrFilled({});
  };

  const runOCR = async () => {
    if (!ocrFile) return;
    setOcrRunning(true);
    setOcrError("");
    try {
      const fd = new FormData();
      fd.append("image", ocrFile);
      const res = await fetch(`${API}/ocr/gatepass`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
        body: fd,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "OCR failed");
      const d = json.data;
      const upd = {};
      const filled = {};
      if (d.vehicle_no) {
        upd.vehicleNo = d.vehicle_no;
        filled.vehicleNo = true;
      }
      if (d.driver_no) {
        upd.driverNo = d.driver_no;
        filled.driverNo = true;
      }
      if (d.marka) {
        upd.marka = d.marka;
        filled.marka = true;
      }
      if (d.rent_type) {
        upd.rentType = d.rent_type;
        filled.rentType = true;
      }
      if (d.inward_date) {
        upd.inwardDate = d.inward_date;
        filled.inwardDate = true;
      }
      if (d.commodity) {
        const m = commodities.find((c) =>
          c.name.toLowerCase().includes(d.commodity.toLowerCase()),
        );
        if (m) {
          upd.commodityId = String(m.id);
          filled.commodityId = true;
        }
      }
      setForm((f) => ({ ...f, ...upd }));
      setOcrFilled(filled);
      if (d.party_name) {
        setField("partySearch", d.party_name);
        const list = await apiFetch(
          `/customers/search?q=${encodeURIComponent(d.party_name)}`,
        );
        if (list.length === 1) pickParty(list[0]);
        else setPartyDrop(list);
      }
      setOcrOpen(false);
      toast$(`✅ ${Object.keys(filled).length} fields auto-filled!`);
    } catch (e) {
      setOcrError("OCR failed: " + e.message);
    }
    setOcrRunning(false);
  };

  const validate = () => {
    const e = {};
    if (!party) e.party = "Select a party";
    if (!form.commodityId) e.commodityId = "Select commodity";
    if (!form.varietyId) e.varietyId = "Select variety";
    if (!form.rentType) e.rentType = "Select rent type";
    if (!form.csrNo || String(form.csrNo).trim() === "")
      e.csrNo = "Inward No. is required";

    // ── Chamber / Lot Code validation with floor-range rules ──────
    const rawLot = String(form.lotCode || "").trim();

    if (!rawLot) {
      e.lotCode = "Chamber Number / Lot Code is required";
    } else {
      // Floor letter → allowed number range
      const FLOOR_RANGES = {
        A: { min: 1, max: 168 },
        B: { min: 169, max: 336 },
        C: { min: 337, max: 504 },
      };

      // Detect the first floor letter present anywhere in the string
      const floorLetterMatch = rawLot.toUpperCase().match(/[ABC]/);
      const declaredFloor = floorLetterMatch ? floorLetterMatch[0] : null;

      // Extract every integer from the string
      // "A1, 2, 3" → [1, 2, 3]   "C340" → [340]   "47" → [47]
      const allNumbers = [...rawLot.matchAll(/\d+/g)].map((m) =>
        parseInt(m[0], 10),
      );

      if (allNumbers.length === 0) {
        e.lotCode = "Enter at least one valid chamber number";
      } else {
        // Step 1 – global range check (1–504)
        const outOfRange = allNumbers.find((n) => n < 1 || n > 504);
        if (outOfRange !== undefined) {
          e.lotCode = `Chamber ${outOfRange} is invalid — must be between 1 and 504`;
        } else if (declaredFloor) {
          // Steps 3–5 – every number must belong to the declared floor
          const { min, max } = FLOOR_RANGES[declaredFloor];
          const wrongChamber = allNumbers.find((n) => n < min || n > max);
          if (wrongChamber !== undefined) {
            const actualFloor = Object.entries(FLOOR_RANGES).find(
              ([, r]) => wrongChamber >= r.min && wrongChamber <= r.max,
            );
            const actualLabel = actualFloor
              ? `Floor ${actualFloor[0]} (${actualFloor[1].min}–${actualFloor[1].max})`
              : "an unknown floor";
            e.lotCode =
              `Chamber ${wrongChamber} does not belong to Floor ${declaredFloor} ` +
              `(${min}–${max}). It is on ${actualLabel}.`;
          }
        } else {
          // No floor letter typed — infer floor per number & flag mixed floors
          const inferFloor = (n) => {
            if (n >= 1 && n <= 168) return "A";
            if (n >= 169 && n <= 336) return "B";
            if (n >= 337 && n <= 504) return "C";
            return "?";
          };
          const floors = [...new Set(allNumbers.map(inferFloor))];
          if (floors.length > 1) {
            e.lotCode =
              `Mixed floors detected (${floors.join(", ")}). ` +
              "All chamber numbers in one entry must be on the same floor.";
          }
        }
      }
    }

    if (packetRows.length === 0)
      e.quantity = "No packets configured for this rent type";
    else if (!hasQty) e.quantity = "Enter quantity in at least one packet row";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const filledRows = packetRows.filter((r) => parseFloat(r.quantity) > 0);
      await apiFetch("/inward", {
        method: "POST",
        body: JSON.stringify({
          customerId: party.id,
          csrNo: form.csrNo,
          inwardDate: form.inwardDate,
          receivedFrom: form.receivedFrom,
          vehicleNo: form.vehicleNo,
          driverNo: form.driverNo,
          commodityId: form.commodityId,
          varietyId: form.varietyId,
          rentType: form.rentType,
          billingMode: form.billingMode,
          marka: form.marka,
          totalWeight: totalWeight,
          bookingNo: form.bookingNo,
          chamberNumbers: form.lotCode || null, // 👈 FIX 3C applied
          lotCode: form.lotCode || null,
          packetEntries: filledRows.map((r) => ({
            packetId: r.packetId,
            packetName: r.packetName,
            avgWeight: r.avgWeight,
            quantity: parseFloat(r.quantity) || 0,
            totalWeight: parseFloat(r.totalWeight) || 0,
          })),
        }),
      });
      toast$("✅ Inward entry saved!");
      // ── Full form reset — wipes party name text + all fields ──
      setForm((f) => ({
        ...f,
        partySearch: "",
        vehicleNo: "",
        driverNo: "",
        marka: "",
        lotCode: "",
        varietyId: "",
        commodityId: "",
        rentType: "",
        receivedFrom: "",
        bookingNo: "",
      }));
      setParty(null);
      setPartyDrop([]);
      setDropIdx(-1);
      setOcrFilled({});
      setErrors({});
      setPacketRows([]);
      setAllPackets([]);
      setVarieties([]);
      const csrData = await apiFetch("/inward/next-csr").catch(() => ({
        csrNo: parseInt(form.csrNo, 10) + 1,
      }));
      const storedStart = parseInt(localStorage.getItem("inward_seqStart"), 10);
      let nextCsr = csrData.csrNo;
      if (!isNaN(storedStart) && nextCsr < storedStart) {
        nextCsr = storedStart;
      }
      setField("csrNo", String(nextCsr));
      setSeqInput(String(nextCsr));
    } catch (e) {
      toast$("❌ " + e.message, "err");
    }
    setSaving(false);
  };

  const resetForm = () => {
    setForm((f) => ({
      ...f,
      partySearch: "",
      vehicleNo: "",
      driverNo: "",
      marka: "",
      lotCode: "",
      varietyId: "",
      commodityId: "",
      rentType: "",
      receivedFrom: "",
      bookingNo: "",
    }));
    setParty(null);
    setPartyDrop([]);
    setDropIdx(-1);
    setOcrFilled({});
    setErrors({});
    setPacketRows([]);
    setAllPackets([]);
    setVarieties([]);
  };

  const fc = Object.keys(ocrFilled).length;

  return (
    <Layout>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 999,
            background: toast.t === "err" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${toast.t === "err" ? "#fecaca" : "#86efac"}`,
            borderRadius: 8,
            padding: "12px 20px",
            fontSize: 14,
            fontWeight: 500,
            color: toast.t === "err" ? "#b91c1c" : "#15803d",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div
        style={{
          borderRadius: 10,
          overflow: "visible",
          border: "1px solid #e2e8f0",
          background: "#fff",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            background: "#2563eb",
            color: "#fff",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "10px 10px 0 0",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 17 }}>Inward Multiple</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {fc > 0 && (
              <span
                style={{
                  fontSize: 12,
                  background: "#22c55e",
                  padding: "3px 10px",
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                {fc} OCR fields ✓
              </span>
            )}
            <TelegramIndicator />
            <button
              onClick={() => setOcrOpen((o) => !o)}
              style={{
                background: ocrOpen ? "#1d4ed8" : "#fff",
                color: ocrOpen ? "#fff" : "#2563eb",
                border: "2px solid #fff",
                borderRadius: 7,
                padding: "6px 16px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              📷 {ocrOpen ? "Close Scanner" : "Scan Gate Pass (AI OCR)"}
            </button>
          </div>
        </div>

        {ocrOpen && (
          <div
            style={{
              background: "#f0f9ff",
              borderBottom: "1px solid #bae6fd",
              padding: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files[0]);
              }}
              style={{
                border: "2px dashed #93c5fd",
                borderRadius: 10,
                background: "#fff",
                cursor: "pointer",
                minHeight: 170,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {ocrPreview ? (
                <img
                  src={ocrPreview}
                  alt="prev"
                  style={{
                    maxHeight: 160,
                    maxWidth: "100%",
                    borderRadius: 6,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <>
                  {" "}
                  <span style={{ fontSize: 40 }}>🧾</span>{" "}
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}
                  >
                    Click or drag gate pass here
                  </span>{" "}
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => onFile(e.target.files[0])}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ocrError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 12,
                    color: "#b91c1c",
                  }}
                >
                  ⚠️ {ocrError}
                </div>
              )}
              <button
                onClick={runOCR}
                disabled={!ocrFile || ocrRunning}
                style={{
                  background: !ocrFile || ocrRunning ? "#94a3b8" : "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "14px 0",
                  fontWeight: 700,
                  fontSize: 14,
                  marginTop: "auto",
                  cursor: !ocrFile || ocrRunning ? "not-allowed" : "pointer",
                }}
              >
                {ocrRunning ? "Extracting…" : "✨ Extract & Auto-Fill"}
              </button>
            </div>
          </div>
        )}

        <SectionBar title="INWARD" />
        <FieldGrid cols={3}>
          <FieldLabel label="Party" err={errors.party} required>
            <div style={{ position: "relative" }} ref={dropRef}>
              <TextInput
                value={form.partySearch}
                onChange={(e) => {
                  setField("partySearch", e.target.value);
                  setDropIdx(-1);
                  if (party) {
                    setParty(null);
                    setPartyDrop([]);
                  }
                }}
                onKeyDown={handlePartyKeyDown}
                placeholder="Type party name to search…"
                err={!!errors.party}
              />
              {partyDrop.length > 0 && !party && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    zIndex: 100,
                    maxHeight: 260,
                    overflowY: "auto",
                  }}
                >
                  {partyDrop.map((p, i) => (
                    <PartyDropItem
                      key={p.id}
                      party={p}
                      index={i}
                      onPick={pickParty}
                      highlighted={i === dropIdx}
                    />
                  ))}
                </div>
              )}
            </div>
          </FieldLabel>
          <FieldLabel label="Search Inward">
            <TextInput
              value={form.bookingNo}
              onChange={(e) => setField("bookingNo", e.target.value)}
              placeholder="Search Inward"
            />
          </FieldLabel>
          <FieldLabel label="Booking No.">
            <TextInput
              value={form.bookingNo}
              onChange={(e) => setField("bookingNo", e.target.value)}
              placeholder="Booking No."
            />
          </FieldLabel>
        </FieldGrid>

        <FieldGrid cols={3}>
          <FieldLabel
            label="Inward No."
            ocr={ocrFilled.csrNo}
            err={errors.csrNo}
            required
          >
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <TextInput
                  value={form.csrNo}
                  onChange={(e) => setField("csrNo", e.target.value)}
                  ocr={ocrFilled.csrNo}
                  err={!!errors.csrNo}
                />
              </div>
              {/* ── Edit Sequence button ── */}
              <button
                type="button"
                title="Set custom starting sequence"
                onClick={() => setSeqEdit((v) => !v)}
                style={{
                  padding: "7px 9px",
                  fontSize: 12,
                  flexShrink: 0,
                  border: "1.5px solid #d1d5db",
                  borderRadius: 6,
                  background: seqEdit ? "#eff6ff" : "#f8fafc",
                  color: seqEdit ? "#2563eb" : "#6b7280",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ✏️
              </button>
            </div>
            {/* ── Sequence panel ── */}
            {seqEdit && (
              <div
                style={{
                  marginTop: 6,
                  padding: "10px 12px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 6,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "#1e40af",
                    whiteSpace: "nowrap",
                  }}
                >
                  Start from:
                </span>
                <input
                  type="number"
                  value={seqInput}
                  onChange={(e) => setSeqInput(e.target.value)}
                  style={{
                    width: 90,
                    padding: "5px 8px",
                    fontSize: 13,
                    border: "1.5px solid #93c5fd",
                    borderRadius: 5,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const n = parseInt(seqInput, 10);
                    if (!isNaN(n) && n > 0) {
                      setField("csrNo", String(n));
                      localStorage.setItem("inward_seqStart", String(n));
                      setSeqEdit(false);
                    }
                  }}
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 5,
                    padding: "5px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 600,
                  }}
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setSeqEdit(false)}
                  style={{
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: 5,
                    padding: "5px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </FieldLabel>
          <FieldLabel label="Inward Date" ocr={ocrFilled.inwardDate}>
            <input
              type="date"
              value={form.inwardDate}
              onChange={(e) => setField("inwardDate", e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                boxSizing: "border-box",
                outline: "none",
                fontFamily: "inherit",
                border: `1.5px solid ${ocrFilled.inwardDate ? "#86efac" : "#d1d5db"}`,
                background: ocrFilled.inwardDate ? "#f0fdf4" : "#fff",
                borderRadius: 6,
              }}
            />
          </FieldLabel>
          <FieldLabel label="Received From">
            <TextInput
              value={form.receivedFrom}
              onChange={(e) => setField("receivedFrom", e.target.value)}
              placeholder="Received From"
            />
          </FieldLabel>
        </FieldGrid>

        <SectionBar title="Party Information" />
        <div
          style={{
            padding: "12px 16px",
            background: "#f8fafc",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          {party ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: "6px 24px",
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: "#6b7280" }}>Name: </span>
                <strong>{party.name}</strong>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>City/Village: </span>
                <strong>{party.city || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>District: </span>
                <strong>{party.district || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>State: </span>
                <strong>{party.state || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>Post: </span>
                <strong>{party.pinCode || "—"}</strong>
              </div>
              <div style={{ gridColumn: "2 / -1" }}>
                <span style={{ color: "#6b7280" }}>Complete Address: </span>
                <strong>{party.address || "—"}</strong>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
              Type a party name above — results appear as you type
            </p>
          )}
        </div>

        <SectionBar title="Inward Detail" />
        <FieldGrid cols={2}>
          <FieldLabel label="Vehicle No." ocr={ocrFilled.vehicleNo}>
            <TextInput
              value={form.vehicleNo}
              onChange={(e) => setField("vehicleNo", e.target.value)}
              placeholder="Enter Vehicle No."
              ocr={ocrFilled.vehicleNo}
            />
          </FieldLabel>
          <FieldLabel label="Driver Number" ocr={ocrFilled.driverNo}>
            <TextInput
              value={form.driverNo}
              onChange={(e) => setField("driverNo", e.target.value)}
              placeholder="Enter Driver No"
              ocr={ocrFilled.driverNo}
            />
          </FieldLabel>
        </FieldGrid>

        <FieldGrid cols={2}>
          <FieldLabel
            label="Commodity"
            ocr={ocrFilled.commodityId}
            err={errors.commodityId}
            required
          >
            <select
              value={form.commodityId}
              onChange={(e) => {
                setField("commodityId", e.target.value);
                setField("varietyId", "");
                setField("rentType", "");
                setPacketRows([]);
                setAllPackets([]);
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                boxSizing: "border-box",
                border: `1.5px solid ${errors.commodityId ? "#f87171" : "#d1d5db"}`,
                borderRadius: 6,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Select</option>
              {commodities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Variety" err={errors.varietyId} required>
            <select
              value={form.varietyId}
              onChange={(e) => {
                setField("varietyId", e.target.value);
                setField("rentType", "");
                setPacketRows([]);
              }}
              disabled={!form.commodityId}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                boxSizing: "border-box",
                border: `1.5px solid ${errors.varietyId ? "#f87171" : "#d1d5db"}`,
                borderRadius: 6,
                outline: "none",
                cursor: "pointer",
                background: !form.commodityId ? "#f3f4f6" : "#fff",
              }}
            >
              <option value="">Select</option>
              {varieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {!form.commodityId && (
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                Select commodity first
              </div>
            )}
          </FieldLabel>
        </FieldGrid>

        <FieldGrid cols={2}>
          <FieldLabel
            label="Select Rent Type"
            ocr={ocrFilled.rentType}
            err={errors.rentType}
            required
          >
            <div
              style={{
                display: "flex",
                gap: 28,
                paddingTop: 4,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {["Packet", "KG", "Quintal", "Ton"].map((rt) => (
                <label
                  key={rt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    cursor: form.varietyId ? "pointer" : "not-allowed",
                    opacity: form.varietyId ? 1 : 0.4,
                  }}
                >
                  <input
                    type="radio"
                    name="rentType"
                    value={rt}
                    checked={form.rentType === rt}
                    disabled={!form.varietyId}
                    onChange={() => setField("rentType", rt)}
                  />
                  {rt === "KG" ? "K.G." : rt}
                </label>
              ))}
              {!form.varietyId && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#f59e0b",
                    fontWeight: 500,
                    background: "#fffbeb",
                    padding: "3px 10px",
                    borderRadius: 4,
                  }}
                >
                  ⚠ Select commodity and variety first
                </span>
              )}
            </div>
          </FieldLabel>
          <FieldLabel label="Billing Mode" required>
            <div
              style={{
                display: "flex",
                gap: 28,
                paddingTop: 4,
                alignItems: "center",
              }}
            >
              {["Seasonal", "Monthly"].map((bm) => (
                <label
                  key={bm}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="billingMode"
                    value={bm}
                    checked={form.billingMode === bm}
                    onChange={() => setField("billingMode", bm)}
                  />
                  {bm}
                </label>
              ))}
            </div>
          </FieldLabel>
        </FieldGrid>

        {weightUnlocked && (
          <>
            <SectionBar title="Quantity" />
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              {packetRows.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    background: "#fef3c7",
                    border: "1px solid #fde68a",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "#b45309",
                  }}
                >
                  ⚠️ No <strong>{form.rentType}</strong> packets configured.{" "}
                  <a
                    href="/commodity/master"
                    target="_blank"
                    style={{ color: "#2563eb", textDecoration: "underline" }}
                  >
                    Add in Commodity Master → Create Weight/Packet
                  </a>
                </div>
              ) : (
                <>
                  {errors.quantity && (
                    <div
                      style={{
                        marginBottom: 8,
                        padding: "8px 12px",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: 6,
                        fontSize: 12,
                        color: "#b91c1c",
                      }}
                    >
                      ⚠️ {errors.quantity}
                    </div>
                  )}
                  {isAvgLocked ? (
                    <div
                      style={{
                        marginBottom: 8,
                        padding: "7px 12px",
                        background: "#f0f9ff",
                        border: "1px solid #bae6fd",
                        borderRadius: 6,
                        fontSize: 12,
                        color: "#1e40af",
                      }}
                    >
                      🔒 <strong>Packet</strong> type — Avg Weight fixed from
                      commodity config. Only Qty editable.
                    </div>
                  ) : (
                    <div
                      style={{
                        marginBottom: 8,
                        padding: "7px 12px",
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        borderRadius: 6,
                        fontSize: 12,
                        color: "#15803d",
                      }}
                    >
                      ✏️ <strong>{form.rentType}</strong> type — Avg Weight is
                      editable per row.
                    </div>
                  )}

                  <div
                    style={{
                      overflowX: "auto",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
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
                        <tr style={{ background: "#6d5fd3", color: "#fff" }}>
                          {[
                            "Packet",
                            "Avg. Wt / Bag (KG)",
                            "No. of Bags *",
                            "Total Wt (KG) *",
                            "Type",
                            "Rate (₹)",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "9px 12px",
                                textAlign: "left",
                                fontSize: 11,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {packetRows.map((row, idx) => (
                          <PacketTableRow
                            key={row.packetId}
                            row={row}
                            idx={idx}
                            isAvgLocked={isAvgLocked}
                            onQtyChange={updateQty}
                            onAvgChange={updateAvg}
                            onWtChange={updateWt}
                          />
                        ))}
                      </tbody>
                      <tfoot>
                        <tr
                          style={{
                            background: "#f8fafc",
                            fontWeight: 700,
                            borderTop: "2px solid #e2e8f0",
                          }}
                        >
                          <td
                            colSpan={2}
                            style={{ padding: "10px 12px", fontSize: 13 }}
                          >
                            Total
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "right",
                              fontSize: 14,
                              color: "#2563eb",
                            }}
                          >
                            {packetRows
                              .reduce(
                                (s, r) => s + (parseFloat(r.quantity) || 0),
                                0,
                              )
                              .toLocaleString("en-IN")}{" "}
                            pkts
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: 15,
                              fontWeight: 700,
                              color: "#15803d",
                            }}
                          >
                            {totalWeight.toFixed(3)} KG
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: "#94a3b8" }}>
                    * Qty. In Pkts is compulsory
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <FieldGrid cols={3}>
          <FieldLabel label="Marka" ocr={ocrFilled.marka}>
            <TextInput
              value={form.marka}
              onChange={(e) => setField("marka", e.target.value)}
              placeholder="Enter Marka"
              ocr={ocrFilled.marka}
              disabled={!weightUnlocked}
            />
          </FieldLabel>
          <FieldLabel
            label="Chamber No. (e.g. A1, 2, 3)"
            err={errors.lotCode}
            required
          >
            {/* 👈 FIX 2A applied here */}
            <TextInput
              value={form.lotCode}
              onChange={(e) => setField("lotCode", e.target.value)}
              placeholder="e.g. A1, 2, 3 or 47"
              disabled={!weightUnlocked}
              err={!!errors.lotCode}
            />
          </FieldLabel>
          <FieldLabel label="T.Wt. (auto-calculated)">
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                background:
                  weightUnlocked && totalWeight > 0 ? "#f0fdf4" : "#f3f4f6",
                border: `1.5px solid ${weightUnlocked && totalWeight > 0 ? "#86efac" : "#e2e8f0"}`,
                color: totalWeight > 0 ? "#15803d" : "#94a3b8",
              }}
            >
              {weightUnlocked
                ? `${totalWeight.toFixed(3)}`
                : "Select commodity → variety → rent type"}
            </div>
          </FieldLabel>
        </FieldGrid>

        <div
          style={{
            padding: "16px",
            display: "flex",
            gap: 10,
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? "#86efac" : "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "9px 36px",
              fontWeight: 700,
              fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={resetForm}
            style={{
              background: "#f59e0b",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "9px 24px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </Layout>
  );
}
