import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import "./DashboardDelivery.css";

const REGIONS = [
  "Greater Accra","Ashanti","Western","Central","Eastern",
  "Northern","Upper East","Upper West","Volta","Brong-Ahafo",
  "Oti","Ahafo","Bono East","North East","Savannah","Western North",
];

const BEME_RATES = [
  { zone: "Within Accra",        eta: "Same day",   rate: "GHS 20"    },
  { zone: "Accra to Kumasi",     eta: "1–2 days",   rate: "GHS 35"    },
  { zone: "Accra to regions",    eta: "2–3 days",   rate: "GHS 40–55" },
  { zone: "Nationwide",          eta: "3–5 days",   rate: "GHS 30–60" },
];

const DELIVERY_ACCESS = {
  basic: false, free: false, starter: false,
  growth: true, standard: true, pro: true,
};

/* ── Icons ── */
const Svg = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const TruckIco  = () => <Svg><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></Svg>;
const BoxIco    = () => <Svg><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Svg>;
const SwitchIco = () => <Svg><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></Svg>;
const LockIco   = () => <Svg size={13}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>;
const CheckIco  = () => <Svg size={15}><polyline points="20 6 9 17 4 12"/></Svg>;
const InfoIco   = () => <Svg size={15}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Svg>;
const ZapIco    = () => <Svg size={13}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Svg>;
const ShieldIco = () => <Svg size={15}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></Svg>;
const SaveIco   = () => <Svg size={16}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></Svg>;

export default function DashboardDelivery() {
  const { user, shop, storeId, appData, subscriptionPlan } = useSellerAuth();
  const planId    = (appData?.planId || shop?.planId || subscriptionPlan || "basic").toLowerCase();
  const canBeme   = DELIVERY_ACCESS[planId] ?? false;
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
          const d  = snap.data().delivery || {};
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

  const toggleRegion = r =>
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

  if (loading) return (
    <div className="dd-loading">
      <div className="dd-spinner" /><span>Loading…</span>
    </div>
  );

  return (
    <div className="dd-root">

      {/* ── Page header ── */}
      <div className="dd-page-header">
        <div>
          <h2 className="dd-page-title">Delivery Settings</h2>
          <p className="dd-page-sub">
            Control how orders reach your customers.
            Beme Delivery is available on Growth (GHS 129/mo) and Pro plans.
          </p>
        </div>
      </div>

      {/* ── Method selector — compact horizontal tabs ── */}
      <div className="dd-method-tabs">

        <button type="button"
          className={`dd-tab${method === "self" ? " dd-tab--active" : ""}`}
          onClick={() => setMethod("self")}>
          <span className="dd-tab__icon"><TruckIco /></span>
          <div className="dd-tab__text">
            <span className="dd-tab__name">Self Delivery</span>
            <span className="dd-tab__tag">You ship it</span>
          </div>
          <div className={`dd-tab__dot${method === "self" ? " dd-tab__dot--on" : ""}`}/>
        </button>

        <button type="button"
          className={`dd-tab${method === "beme" ? " dd-tab--active" : ""}${!canBeme ? " dd-tab--locked" : ""}`}
          onClick={() => canBeme && setMethod("beme")} disabled={!canBeme}>
          <span className="dd-tab__icon"><BoxIco /></span>
          <div className="dd-tab__text">
            <span className="dd-tab__name">
              Beme Delivery
              {!canBeme && <span className="dd-tab__lock"><LockIco /> Growth+</span>}
            </span>
            <span className="dd-tab__tag">We coordinate it</span>
          </div>
          <div className={`dd-tab__dot${method === "beme" ? " dd-tab__dot--on" : ""}`}/>
        </button>

        <button type="button"
          className={`dd-tab${method === "both" ? " dd-tab--active" : ""}${!canBeme ? " dd-tab--locked" : ""}`}
          onClick={() => canBeme && setMethod("both")} disabled={!canBeme}>
          <span className="dd-tab__icon"><SwitchIco /></span>
          <div className="dd-tab__text">
            <span className="dd-tab__name">
              Both Options
              {!canBeme && <span className="dd-tab__lock"><LockIco /> Growth+</span>}
            </span>
            <span className="dd-tab__tag">Customer chooses</span>
          </div>
          <div className={`dd-tab__dot${method === "both" ? " dd-tab__dot--on" : ""}`}/>
        </button>

      </div>

      {/* ── Main content grid ── */}
      <div className="dd-content-grid">

        {/* LEFT: settings panel */}
        <div className="dd-left">

          {/* Self delivery settings */}
          {(method === "self" || method === "both") && (
            <div className="dd-card">
              <div className="dd-card__header">
                <span className="dd-card__header-icon"><TruckIco /></span>
                Self delivery settings
              </div>

              {/* Fee type */}
              <div className="dd-field">
                <div className="dd-label">Delivery fee type</div>
                <div className="dd-option-row">
                  {[
                    { val:"flat",       label:"Flat rate",    tag:"Fixed fee per order"          },
                    { val:"free",       label:"Free",         tag:"You absorb all costs"         },
                    { val:"negotiable", label:"Negotiable",   tag:"Customer contacts you"        },
                  ].map(o => (
                    <label key={o.val} className={`dd-option${feeType === o.val ? " dd-option--on" : ""}`}>
                      <input type="radio" name="feeType" value={o.val} checked={feeType === o.val}
                        onChange={() => setFeeType(o.val)} className="dd-sr-input"/>
                      <span className="dd-option__label">{o.label}</span>
                      <span className="dd-option__tag">{o.tag}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Flat fee */}
              {feeType === "flat" && (
                <div className="dd-field dd-inline-field">
                  <label className="dd-label">Delivery fee</label>
                  <div className="dd-input-wrap">
                    <span className="dd-input-prefix">GHS</span>
                    <input type="number" value={flatFee} onChange={e => setFlatFee(e.target.value)}
                      placeholder="0.00" min="0" inputMode="decimal" className="dd-input dd-input--fee"/>
                  </div>
                </div>
              )}

              {/* Two-col row: processing + coverage */}
              <div className="dd-two-col">
                <div className="dd-field">
                  <label className="dd-label">Processing time</label>
                  <select value={processingDays} onChange={e => setProcessingDays(e.target.value)} className="dd-select">
                    {[["1","Same day"],["2","1–2 days"],["3","2–3 days"],["5","3–5 days"],["7","Up to 7 days"]].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="dd-field">
                  <div className="dd-label">Coverage</div>
                  <div className="dd-pill-row">
                    {[["nationwide","Nationwide"],["selected","By region"]].map(([v,l]) => (
                      <button key={v} type="button" onClick={() => setCoverage(v)}
                        className={`dd-pill${coverage === v ? " dd-pill--on" : ""}`}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              {coverage === "selected" && (
                <div className="dd-field">
                  <div className="dd-label">Select regions</div>
                  <div className="dd-chips">
                    {REGIONS.map(r => (
                      <label key={r} className={`dd-chip${selectedRegions.includes(r) ? " dd-chip--on" : ""}`}>
                        <input type="checkbox" checked={selectedRegions.includes(r)}
                          onChange={() => toggleRegion(r)} className="dd-sr-input"/>
                        {r}
                      </label>
                    ))}
                  </div>
                  {selectedRegions.length > 0 && (
                    <div className="dd-hint">{selectedRegions.length} region{selectedRegions.length > 1 ? "s" : ""} selected</div>
                  )}
                </div>
              )}

              {/* Policy */}
              <div className="dd-field dd-field--last">
                <label className="dd-label">Delivery policy <span className="dd-label-opt">(optional)</span></label>
                <textarea value={selfPolicy} onChange={e => setSelfPolicy(e.target.value)}
                  rows={3} maxLength={300}
                  placeholder="e.g. Orders placed before 2pm ship same day…"
                  className="dd-textarea"/>
                <div className="dd-char-count">{selfPolicy.length}/300</div>
              </div>
            </div>
          )}

          {/* Beme delivery settings */}
          {(method === "beme" || method === "both") && canBeme && (
            <div className="dd-card">
              <div className="dd-card__header">
                <span className="dd-card__header-icon"><BoxIco /></span>
                Beme Delivery Support
              </div>
              <p className="dd-card__sub">
                Beme coordinates pickup via courier partners. Delivery fee is collected at checkout
                and the courier cost is deducted from your payout.
              </p>

              {/* Tier selector */}
              <div className="dd-field">
                <div className="dd-label">Delivery tier</div>
                <div className="dd-option-row">
                  <label className={`dd-option${bemeTier === "standard" ? " dd-option--on" : ""}`}>
                    <input type="radio" name="tier" value="standard" checked={bemeTier === "standard"}
                      onChange={() => setBemeTier("standard")} className="dd-sr-input"/>
                    <span className="dd-option__label"><ZapIco /> Standard</span>
                    <span className="dd-option__tag">Same-day Accra · 2–3 days nationwide</span>
                  </label>
                  <label className={`dd-option${bemeTier === "express" ? " dd-option--on" : ""}`}>
                    <input type="radio" name="tier" value="express" checked={bemeTier === "express"}
                      onChange={() => setBemeTier("express")} className="dd-sr-input"/>
                    <span className="dd-option__label"><ZapIco /> Express</span>
                    <span className="dd-option__tag">Priority same-day and next-day</span>
                  </label>
                </div>
              </div>

              {/* Enrollment status */}
              <div className={`dd-enroll${bemeEnrolled ? " dd-enroll--on" : ""}`}>
                <span className="dd-enroll__icon">
                  {bemeEnrolled ? <ShieldIco /> : <InfoIco />}
                </span>
                <p className="dd-enroll__text">
                  {bemeEnrolled
                    ? "Your store is enrolled. Our team coordinates pickups once orders come in."
                    : "Saving will enroll your store. Our team contacts you within 24 hours for your first pickup."}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT: info panels */}
        <div className="dd-right">

          {/* Beme rates */}
          <div className="dd-info-card">
            <div className="dd-info-card__title">Beme delivery rates</div>
            <div className="dd-rates">
              {BEME_RATES.map((r, i) => (
                <div key={i} className={`dd-rate-row${i < BEME_RATES.length - 1 ? " dd-rate-row--border" : ""}`}>
                  <div>
                    <div className="dd-rate-row__zone">{r.zone}</div>
                    <div className="dd-rate-row__eta">{r.eta}</div>
                  </div>
                  <div className="dd-rate-row__amount">{r.rate}</div>
                </div>
              ))}
            </div>
            <div className="dd-info-card__note">
              GHS 5–10 handling fee deducted per Beme-delivered order.
            </div>
          </div>

          {/* How it works */}
          <div className="dd-info-card">
            <div className="dd-info-card__title">How delivery works</div>
            {[
              ["Customer orders",   "Product and delivery option selected at checkout."],
              ["Payment collected", "Paystack collects product price and delivery fee together."],
              ["You prepare",       "Hand to Beme courier or ship yourself."],
              ["Payout sent",       "Product price minus platform and handling fees."],
            ].map(([t, d], i) => (
              <div key={i} className={`dd-step${i < 3 ? " dd-step--border" : ""}`}>
                <div className="dd-step__num">{i + 1}</div>
                <div>
                  <div className="dd-step__title">{t}</div>
                  <div className="dd-step__desc">{d}</div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* ── Footer actions ── */}
      <div className="dd-footer">
        {msg && (
          <div className={`dd-msg${msgOk ? " dd-msg--ok" : " dd-msg--err"}`}>
            {msgOk ? <CheckIco /> : <InfoIco />}
            {msg}
          </div>
        )}
        <button type="button" onClick={handleSave} disabled={saving} className="dd-save">
          {saving ? <><div className="dd-spinner dd-spinner--sm"/>Saving…</> : <><SaveIco />Save delivery settings</>}
        </button>
      </div>

    </div>
  );
}