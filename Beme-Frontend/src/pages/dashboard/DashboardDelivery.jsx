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
  { zone: "Within Accra (same day)",  eta: "Same day",  rate: "GHS 20"    },
  { zone: "Accra to Kumasi",          eta: "1-2 days",  rate: "GHS 35"    },
  { zone: "Accra to Other regions",   eta: "2-3 days",  rate: "GHS 40-55" },
  { zone: "Nationwide (standard)",    eta: "3-5 days",  rate: "GHS 30-60" },
];

const DELIVERY_ACCESS = {
  basic: false, free: false, starter: false,
  growth: true, standard: true, pro: true,
};

/* ── SVG icon helpers ── */
function TruckSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2"/>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}
function BoxSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}
function SwitchSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <polyline points="7 23 3 19 7 15"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}
function GridSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}
function InfoSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function LockSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function CheckSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function ShieldSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}
function ZapSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

/* ════════════════════════════════
   COMPONENT
════════════════════════════════ */
export default function DashboardDelivery() {
  const { user, shop, storeId, appData, subscriptionPlan } = useSellerAuth();
  const planId   = (appData?.planId || shop?.planId || subscriptionPlan || "basic").toLowerCase();
  const canBeme  = DELIVERY_ACCESS[planId] ?? false;
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

  if (loading) {
    return (
      <div className="dd-loading">
        <div className="dd-loading__spinner"/>
        <span>Loading delivery settings...</span>
      </div>
    );
  }

  return (
    <div className="dd-root">

      {/* ── Header ── */}
      <div className="dd-header">
        <h2 className="dd-header__title">Delivery Settings</h2>
        <p className="dd-header__sub">
          Choose how orders reach your customers. Beme Delivery requires Growth plan (GHS 129/mo) or higher.
        </p>
      </div>

      {/* ── Method cards ── */}
      <div className="dd-method-grid">

        {/* Self Delivery */}
        <button type="button" className={`dd-card${method === "self" ? " dd-card--active" : ""}`}
          onClick={() => setMethod("self")}>
          <div className="dd-card__icon"><TruckSvg /></div>
          <div className="dd-card__body">
            <div className="dd-card__title">Self Delivery</div>
            <div className="dd-card__desc">You handle all shipping. Set your own rates, coverage and processing time.</div>
          </div>
          <div className={`dd-card__radio${method === "self" ? " dd-card__radio--on" : ""}`}>
            {method === "self" && <div className="dd-card__radio-dot"/>}
          </div>
        </button>

        {/* Beme Delivery */}
        <button type="button"
          className={`dd-card${method === "beme" ? " dd-card--active" : ""}${!canBeme ? " dd-card--locked" : ""}`}
          onClick={() => canBeme && setMethod("beme")}
          disabled={!canBeme}>
          <div className="dd-card__icon"><BoxSvg /></div>
          <div className="dd-card__body">
            <div className="dd-card__title">
              Beme Delivery Support
              {!canBeme && (
                <span className="dd-card__lock-badge">
                  <LockSvg /> Growth+ required
                </span>
              )}
            </div>
            <div className="dd-card__desc">Beme coordinates pickup via courier partners. Delivery fee deducted from payout per order.</div>
          </div>
          <div className={`dd-card__radio${method === "beme" ? " dd-card__radio--on" : ""}`}>
            {method === "beme" && <div className="dd-card__radio-dot"/>}
          </div>
        </button>

        {/* Both Options */}
        <button type="button"
          className={`dd-card${method === "both" ? " dd-card--active" : ""}${!canBeme ? " dd-card--locked" : ""}`}
          onClick={() => canBeme && setMethod("both")}
          disabled={!canBeme}>
          <div className="dd-card__icon"><SwitchSvg /></div>
          <div className="dd-card__body">
            <div className="dd-card__title">
              Both Options
              {!canBeme && (
                <span className="dd-card__lock-badge">
                  <LockSvg /> Growth+ required
                </span>
              )}
            </div>
            <div className="dd-card__desc">Customers choose at checkout between your rate or Beme's courier network.</div>
          </div>
          <div className={`dd-card__radio${method === "both" ? " dd-card__radio--on" : ""}`}>
            {method === "both" && <div className="dd-card__radio-dot"/>}
          </div>
        </button>

      </div>

      {/* ── Self delivery settings ── */}
      {(method === "self" || method === "both") && (
        <div className="dd-section">
          <div className="dd-section__title">Self delivery settings</div>

          {/* Fee type */}
          <div className="dd-field">
            <div className="dd-label">Delivery fee type</div>
            <div className="dd-radio-stack">
              {[
                { val: "flat",       label: "Flat rate",     desc: "Fixed fee per order" },
                { val: "free",       label: "Free delivery", desc: "You absorb all costs" },
                { val: "negotiable", label: "Negotiable",    desc: "Customer contacts you to arrange" },
              ].map(o => (
                <label key={o.val} className={`dd-radio-card${feeType === o.val ? " dd-radio-card--on" : ""}`}>
                  <input type="radio" name="feeType" value={o.val} checked={feeType === o.val}
                    onChange={() => setFeeType(o.val)} className="dd-radio-input"/>
                  <div>
                    <div className="dd-radio-card__label">{o.label}</div>
                    <div className="dd-radio-card__desc">{o.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Flat fee amount */}
          {feeType === "flat" && (
            <div className="dd-field">
              <label className="dd-label">Delivery fee (GHS)</label>
              <input type="number" value={flatFee} onChange={e => setFlatFee(e.target.value)}
                placeholder="e.g. 20" min="0" inputMode="decimal" className="dd-input dd-input--sm"/>
            </div>
          )}

          {/* Processing days */}
          <div className="dd-field">
            <label className="dd-label">Processing time</label>
            <select value={processingDays} onChange={e => setProcessingDays(e.target.value)} className="dd-select">
              {[["1","Same day"],["2","1-2 days"],["3","2-3 days"],["5","3-5 days"],["7","Up to 7 days"]].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Coverage */}
          <div className="dd-field">
            <div className="dd-label">Delivery coverage</div>
            <div className="dd-pill-row">
              {[["nationwide","Nationwide"],["selected","Selected regions"]].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setCoverage(v)}
                  className={`dd-pill${coverage === v ? " dd-pill--on" : ""}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {coverage === "selected" && (
            <div className="dd-field">
              <div className="dd-regions">
                {REGIONS.map(r => (
                  <label key={r} className={`dd-region-chip${selectedRegions.includes(r) ? " dd-region-chip--on" : ""}`}>
                    <input type="checkbox" checked={selectedRegions.includes(r)}
                      onChange={() => toggleRegion(r)} className="dd-radio-input"/>
                    {r}
                  </label>
                ))}
              </div>
              {selectedRegions.length > 0 && (
                <div className="dd-hint">{selectedRegions.length} region{selectedRegions.length > 1 ? "s" : ""} selected</div>
              )}
            </div>
          )}

          {/* Policy note */}
          <div className="dd-field">
            <label className="dd-label">
              Delivery policy <span className="dd-label__opt">(optional)</span>
            </label>
            <textarea value={selfPolicy} onChange={e => setSelfPolicy(e.target.value)}
              rows={3} maxLength={300}
              placeholder="e.g. Orders placed before 2pm ship same day…"
              className="dd-textarea"/>
            <div className="dd-char-count">{selfPolicy.length}/300</div>
          </div>
        </div>
      )}

      {/* ── Beme delivery settings ── */}
      {(method === "beme" || method === "both") && canBeme && (
        <div className="dd-section">
          <div className="dd-section__title">Beme Delivery Support</div>
          <p className="dd-section__sub">
            Beme coordinates pickup via courier partners. Delivery fee collected at checkout; courier cost deducted from your payout.
          </p>

          {/* Rates table */}
          <div className="dd-rates-card">
            <div className="dd-rates-card__heading">
              <GridSvg />
              <span>Current delivery rates</span>
            </div>
            {BEME_RATES.map((r, i) => (
              <div key={i} className={`dd-rates-row${i < BEME_RATES.length - 1 ? " dd-rates-row--border" : ""}`}>
                <div>
                  <div className="dd-rates-row__zone">{r.zone}</div>
                  <div className="dd-rates-row__eta">{r.eta}</div>
                </div>
                <div className="dd-rates-row__rate">{r.rate}</div>
              </div>
            ))}
            <div className="dd-rates-card__note">
              GHS 5-10 handling fee deducted per Beme-delivered order. Rates confirmed at checkout.
            </div>
          </div>

          {/* Tier */}
          <div className="dd-field">
            <div className="dd-label">Delivery tier</div>
            <div className="dd-radio-stack">
              <label className={`dd-radio-card${bemeTier === "standard" ? " dd-radio-card--on" : ""}`}>
                <input type="radio" name="tier" value="standard" checked={bemeTier === "standard"}
                  onChange={() => setBemeTier("standard")} className="dd-radio-input"/>
                <div>
                  <div className="dd-radio-card__label">
                    <ZapSvg />
                    Standard
                  </div>
                  <div className="dd-radio-card__desc">2-3 day nationwide, same-day within Accra</div>
                </div>
              </label>
              <label className={`dd-radio-card${bemeTier === "express" ? " dd-radio-card--on" : ""}`}>
                <input type="radio" name="tier" value="express" checked={bemeTier === "express"}
                  onChange={() => setBemeTier("express")} className="dd-radio-input"/>
                <div>
                  <div className="dd-radio-card__label">
                    <ZapSvg />
                    Express
                  </div>
                  <div className="dd-radio-card__desc">Priority same-day and next-day. Higher rates apply.</div>
                </div>
              </label>
            </div>
          </div>

          {/* Enrollment status */}
          <div className={`dd-enroll-banner${bemeEnrolled ? " dd-enroll-banner--on" : ""}`}>
            <div className="dd-enroll-banner__icon">
              {bemeEnrolled ? <ShieldSvg /> : <InfoSvg />}
            </div>
            <p className="dd-enroll-banner__text">
              {bemeEnrolled
                ? "Enrolled in Beme Delivery. Our team coordinates pickups once orders are placed."
                : "Saving will enroll your store. Our team contacts you within 24 hours for your first pickup."}
            </p>
          </div>
        </div>
      )}

      {/* ── How it works ── */}
      <div className="dd-how">
        <div className="dd-how__heading">
          <InfoSvg />
          <span>How delivery works on Beme Market</span>
        </div>
        {[
          ["Customer orders",     "Product and delivery option selected at checkout."],
          ["Payment collected",   "Paystack collects product price and delivery fee in one transaction."],
          ["You prepare order",   "Hand to Beme courier (Beme Delivery) or ship yourself (Self Delivery)."],
          ["Payout sent",         "You receive product price minus platform and delivery handling fees."],
        ].map(([title, desc], i) => (
          <div key={i} className={`dd-how__step${i < 3 ? " dd-how__step--border" : ""}`}>
            <div className="dd-how__num">{i + 1}</div>
            <div>
              <div className="dd-how__step-title">{title}</div>
              <div className="dd-how__step-desc">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Save feedback ── */}
      {msg && (
        <div className={`dd-msg${msgOk ? " dd-msg--ok" : " dd-msg--err"}`}>
          <span className="dd-msg__icon">{msgOk ? <CheckSvg /> : <InfoSvg />}</span>
          {msg}
        </div>
      )}

      <button type="button" onClick={handleSave} disabled={saving} className="dd-save-btn">
        {saving ? (
          <>
            <div className="dd-save-btn__spinner"/>
            Saving...
          </>
        ) : (
          <>
            <CheckSvg />
            Save delivery settings
          </>
        )}
      </button>

    </div>
  );
}