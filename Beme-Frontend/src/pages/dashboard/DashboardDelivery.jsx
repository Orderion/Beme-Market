import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useSellerAuth } from "../../hooks/useSellerAuth";

const REGIONS = [
  "Greater Accra","Ashanti","Western","Central","Eastern",
  "Northern","Upper East","Upper West","Volta","Brong-Ahafo",
  "Oti","Ahafo","Bono East","North East","Savannah","Western North",
];

const BEME_RATES = [
  { zone: "Within Accra (same day)",  eta: "Same day",   rate: "GHS 20" },
  { zone: "Accra → Kumasi",           eta: "1–2 days",   rate: "GHS 35" },
  { zone: "Accra → Other regions",    eta: "2–3 days",   rate: "GHS 40–55" },
  { zone: "Nationwide (standard)",    eta: "3–5 days",   rate: "GHS 30–60" },
];

// Beme Delivery: Growth (GHS 129) and Pro (GHS 399) only
const DELIVERY_ACCESS = {
  basic:    false, free: false, starter: false,
  growth:   true,  standard: true, pro: true,
};

function Ico({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

export default function DashboardDelivery() {
  const { user, shop, storeId, appData, subscriptionPlan } = useSellerAuth();
  const planId  = (appData?.planId || shop?.planId || subscriptionPlan || "basic").toLowerCase();
  const canBeme = DELIVERY_ACCESS[planId] ?? false;
  const shopDocId = storeId || user?.uid;

  const [method,          setMethod]          = useState("self");
  const [feeType,         setFeeType]         = useState("flat");
  const [flatFee,         setFlatFee]         = useState("");
  const [processingDays,  setProcessingDays]  = useState("1");
  const [coverage,        setCoverage]        = useState("nationwide");
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [selfPolicy,      setSelfPolicy]      = useState("");
  const [bemeEnrolled,    setBemeEnrolled]    = useState(false);
  const [bemeTier,        setBemeTier]        = useState("standard");
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [msg,             setMsg]             = useState("");
  const [msgOk,           setMsgOk]           = useState(true);

  useEffect(() => {
    if (!shopDocId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "shops", shopDocId));
        if (snap.exists()) {
          const d = snap.data().delivery || {};
          setMethod(d.method || "self");
          const sd = d.selfDelivery || {};
          setFeeType(sd.feeType || "flat");
          setFlatFee(sd.fee != null ? String(sd.fee) : "");
          setProcessingDays(sd.processingDays != null ? String(sd.processingDays) : "1");
          setCoverage(sd.coverage || "nationwide");
          setSelectedRegions(sd.regions || []);
          setSelfPolicy(sd.policy || "");
          const bd = d.bemeDelivery || {};
          setBemeEnrolled(bd.enrolled || false);
          setBemeTier(bd.tier || "standard");
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [shopDocId]);

  const toggleRegion = (r) =>
    setSelectedRegions(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);

  const handleSave = async () => {
    setMsg(""); setSaving(true);
    if ((method === "self" || method === "both") && feeType === "flat" && flatFee !== "") {
      if (isNaN(Number(flatFee)) || Number(flatFee) < 0) {
        setMsg("Enter a valid delivery fee."); setMsgOk(false); setSaving(false); return;
      }
    }
    if ((method === "self" || method === "both") && coverage === "selected" && selectedRegions.length === 0) {
      setMsg("Select at least one region."); setMsgOk(false); setSaving(false); return;
    }
    try {
      const payload = { "delivery.method": method, "delivery.updatedAt": serverTimestamp() };
      if (method === "self" || method === "both") {
        payload["delivery.selfDelivery"] = {
          feeType,
          fee: feeType === "flat" && flatFee !== "" ? Number(flatFee) : null,
          processingDays: Number(processingDays) || 1,
          coverage,
          regions: coverage === "selected" ? selectedRegions : [],
          policy: selfPolicy.trim(),
        };
      }
      if ((method === "beme" || method === "both") && canBeme) {
        payload["delivery.bemeDelivery"] = { enrolled: true, tier: bemeTier };
        if (!bemeEnrolled) payload["delivery.bemeDelivery.enrolledAt"] = serverTimestamp();
        setBemeEnrolled(true);
      }
      await updateDoc(doc(db, "shops", shopDocId), payload);
      setMsg("Delivery settings saved!"); setMsgOk(true);
    } catch (e) {
      console.error(e); setMsg("Failed to save. Try again."); setMsgOk(false);
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>Loading…</div>;

  const Card = ({ icon, title, desc, value, locked, onClick }) => (
    <button type="button" onClick={() => !locked && onClick()}
      style={{
        display: "flex", alignItems: "flex-start", gap: 14,
        padding: "16px 16px", borderRadius: 14, border: "1.5px solid",
        borderColor: method === value ? "#111" : "rgba(0,0,0,0.1)",
        background: method === value ? "#111" : "#fff",
        cursor: locked ? "not-allowed" : "pointer", width: "100%",
        opacity: locked ? 0.55 : 1, textAlign: "left", transition: "all 0.15s",
      }}>
      <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: method === value ? "#fff" : "#111", marginBottom: 3 }}>
          {title}
          {locked && <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 8, padding: "2px 8px", borderRadius: 6, background: "rgba(0,0,0,0.08)", color: "#6B7280" }}>Growth+ required</span>}
        </div>
        <div style={{ fontSize: 13, color: method === value ? "rgba(255,255,255,0.7)" : "#6B7280", lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 2,
        border: `2px solid ${method === value ? "#fff" : "rgba(0,0,0,0.2)"}`,
        background: method === value ? "#fff" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {method === value && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#111" }}/>}
      </div>
    </button>
  );

  const RadioCard = ({ label, desc, val, group, checked, onChange }) => (
    <label style={{
      display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
      borderRadius: 10, border: `1.5px solid ${checked ? "#111" : "rgba(0,0,0,0.1)"}`,
      background: checked ? "#fafafa" : "#fff", cursor: "pointer", transition: "all 0.12s",
    }}>
      <input type="radio" name={group} value={val} checked={checked} onChange={onChange}
        style={{ accentColor: "#111", marginTop: 3, flexShrink: 0 }}/>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{desc}</div>
      </div>
    </label>
  );

  return (
    <div style={{ fontFamily: "var(--font-main,'Nunito',sans-serif)", background: "#fff", maxWidth: 640 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#111", letterSpacing: "-0.03em", marginBottom: 4 }}>
          Delivery Settings
        </div>
        <div style={{ fontSize: 13, color: "#9CA3AF" }}>
          Choose how orders reach your customers. Beme Delivery requires Growth plan (GHS 129/mo) or higher.
        </div>
      </div>

      {/* Method cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        <Card icon="🚗" title="Self Delivery"
          desc="You handle all shipping. Set your own rates, coverage and processing time."
          value="self" locked={false} onClick={() => setMethod("self")}/>
        <Card icon="📦" title="Beme Delivery Support"
          desc="Beme coordinates pickup via courier partners. Delivery fee deducted from payout per order."
          value="beme" locked={!canBeme} onClick={() => setMethod("beme")}/>
        <Card icon="🔄" title="Both Options"
          desc="Customers choose at checkout between your rate or Beme's courier network."
          value="both" locked={!canBeme} onClick={() => setMethod("both")}/>
      </div>

      {/* Self delivery settings */}
      {(method === "self" || method === "both") && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111", marginBottom: 16 }}>Self delivery settings</div>

          {/* Fee type */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Delivery fee type</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { val: "flat",       label: "Flat rate",       desc: "Fixed fee per order" },
                { val: "free",       label: "Free delivery",   desc: "You absorb all costs" },
                { val: "negotiable", label: "Negotiable",      desc: "Customer contacts you to arrange" },
              ].map(o => (
                <RadioCard key={o.val} label={o.label} desc={o.desc} val={o.val}
                  group="feeType" checked={feeType === o.val} onChange={() => setFeeType(o.val)}/>
              ))}
            </div>
          </div>

          {/* Flat fee input */}
          {feeType === "flat" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Delivery fee (GHS)
              </label>
              <input type="number" value={flatFee} onChange={e => setFlatFee(e.target.value)}
                placeholder="e.g. 20" min="0" inputMode="decimal"
                style={{ width: 140, padding: "10px 14px", borderRadius: 10,
                  border: "1.5px solid rgba(0,0,0,0.12)", background: "#fafafa",
                  fontSize: 15, fontWeight: 700, color: "#111", outline: "none",
                  fontFamily: "inherit" }}/>
            </div>
          )}

          {/* Processing days */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Processing time
            </label>
            <select value={processingDays} onChange={e => setProcessingDays(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.12)",
                background: "#fafafa", fontSize: 14, fontWeight: 600, color: "#111",
                outline: "none", fontFamily: "inherit", cursor: "pointer" }}>
              {[["1","Same day"],["2","1–2 days"],["3","2–3 days"],["5","3–5 days"],["7","Up to 7 days"]].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Coverage */}
          <div style={{ marginBottom: selectedRegions.length || coverage === "selected" ? 12 : 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Delivery coverage
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["nationwide","🌍 Nationwide"],["selected","📍 Selected regions"]].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setCoverage(v)}
                  style={{ padding: "8px 16px", borderRadius: 100,
                    border: `1.5px solid ${coverage === v ? "#111" : "rgba(0,0,0,0.12)"}`,
                    background: coverage === v ? "#111" : "#fff",
                    color: coverage === v ? "#fff" : "#374151",
                    fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {coverage === "selected" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                {REGIONS.map(r => (
                  <label key={r} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                    borderRadius: 100, border: `1.5px solid ${selectedRegions.includes(r) ? "#111" : "rgba(0,0,0,0.1)"}`,
                    background: selectedRegions.includes(r) ? "#111" : "#fff",
                    color: selectedRegions.includes(r) ? "#fff" : "#374151",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.12s",
                  }}>
                    <input type="checkbox" checked={selectedRegions.includes(r)}
                      onChange={() => toggleRegion(r)} style={{ display: "none" }}/>
                    {r}
                  </label>
                ))}
              </div>
              {selectedRegions.length > 0 && (
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>
                  {selectedRegions.length} region{selectedRegions.length > 1 ? "s" : ""} selected
                </div>
              )}
            </div>
          )}

          {/* Policy note */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Delivery policy <span style={{ fontWeight: 500, textTransform: "none" }}>(optional)</span>
            </label>
            <textarea value={selfPolicy} onChange={e => setSelfPolicy(e.target.value)} rows={3}
              maxLength={300} placeholder="e.g. Orders placed before 2pm ship same day…"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1.5px solid rgba(0,0,0,0.12)", background: "#fafafa",
                fontSize: 13, color: "#111", outline: "none", resize: "vertical",
                fontFamily: "inherit", boxSizing: "border-box" }}/>
            <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "right" }}>{selfPolicy.length}/300</div>
          </div>
        </div>
      )}

      {/* Beme delivery settings */}
      {(method === "beme" || method === "both") && canBeme && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111", marginBottom: 6 }}>Beme Delivery Support</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
            Beme coordinates pickup via courier partners. Delivery fee collected at checkout, courier cost deducted from your payout.
          </div>

          {/* Rates table */}
          <div style={{ background: "#fafafa", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 12 }}>📋 Current delivery rates</div>
            {BEME_RATES.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: i < BEME_RATES.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{r.zone}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>{r.eta}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#111" }}>{r.rate}</div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 10, lineHeight: 1.5 }}>
              GHS 5–10 handling fee deducted per Beme-delivered order. Rates confirmed at checkout.
            </div>
          </div>

          {/* Tier */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Delivery tier</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <RadioCard label="⚡ Standard" desc="2–3 day nationwide, same-day within Accra"
                val="standard" group="tier" checked={bemeTier === "standard"} onChange={() => setBemeTier("standard")}/>
              <RadioCard label="🚀 Express" desc="Priority same-day and next-day. Higher rates apply."
                val="express" group="tier" checked={bemeTier === "express"} onChange={() => setBemeTier("express")}/>
            </div>
          </div>

          {/* Enrollment banner */}
          <div style={{ padding: "12px 14px", borderRadius: 10,
            background: bemeEnrolled ? "rgba(34,197,94,0.08)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${bemeEnrolled ? "rgba(34,197,94,0.2)" : "rgba(0,0,0,0.08)"}`,
            fontSize: 13, color: bemeEnrolled ? "#166534" : "#374151", lineHeight: 1.5 }}>
            {bemeEnrolled
              ? "✅ Enrolled in Beme Delivery. Our team coordinates pickups once orders are placed."
              : "ℹ️ Saving will enroll your store. Our team contacts you within 24 hours for your first pickup."}
          </div>
        </div>
      )}

      {/* How it works */}
      <div style={{ background: "#fafafa", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 12 }}>💡 How delivery works on Beme Market</div>
        {[
          ["Customer orders","Product + delivery option selected at checkout."],
          ["Payment collected","Paystack collects product price + delivery fee in one transaction."],
          ["You prepare the order","Hand to Beme courier (Beme Delivery) or ship yourself (Self Delivery)."],
          ["Payout sent","You receive product price minus any platform and delivery handling fees."],
        ].map(([title, desc], i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < 3 ? 10 : 0 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#111", color: "#fff",
              fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {i + 1}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{title}</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Message */}
      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14,
          background: msgOk ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${msgOk ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
          color: msgOk ? "#166534" : "#991b1b", fontSize: 13 }}>
          {msg}
        </div>
      )}

      <button type="button" onClick={handleSave} disabled={saving}
        style={{ padding: "13px 28px", borderRadius: 12, border: "none",
          background: "#111", color: "#fff", fontSize: 15, fontWeight: 800,
          cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
          fontFamily: "inherit", boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}>
        {saving ? "Saving…" : "Save delivery settings"}
      </button>
    </div>
  );
}