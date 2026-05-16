import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  initSubscriptionPayment,
  redirectToPaystack,
} from "../services/subscriptionService";
import "./StorePlans.css";

/* ─── Plans — matches GetAStore.jsx exactly ──────────────── */
const PLANS = [
  {
    id: "basic", name: "Basic", label: "Free forever", price: 0,
    color: "#6B7280", highlight: false,
    badge: "5 products",
    features: [
      { t: "5 products max",                ok: true  },
      { t: "Basic storefront",              ok: true  },
      { t: "Order management",              ok: true  },
      { t: "Basic analytics",               ok: true  },
      { t: "Social links & contacts",       ok: false },
      { t: "Customer chat",                 ok: false },
      { t: "Product boosts",                ok: false },
      { t: "Verified badge",                ok: false },
    ],
  },
  {
    id: "starter", name: "Starter", label: "GHS 49/month", price: 49,
    color: "#374151", highlight: false,
    badge: "10 products",
    features: [
      { t: "10 products max",               ok: true  },
      { t: "WhatsApp & social links",       ok: true  },
      { t: "Customer chat",                 ok: true  },
      { t: "Order notifications",           ok: true  },
      { t: "Store banner & logo",           ok: true  },
      { t: "Product boosts",                ok: false },
      { t: "Verified badge",                ok: false },
    ],
  },
  {
    id: "growth", name: "Growth", label: "GHS 99/month", price: 99,
    color: "#046EF2", highlight: true, popular: true,
    badge: "25 products",
    features: [
      { t: "25 products max",               ok: true },
      { t: "WhatsApp & social links",       ok: true },
      { t: "Real-time customer chat",       ok: true },
      { t: "Discount codes & flash sales",  ok: true },
      { t: "Featured boosts (5/mo)",        ok: true },
      { t: "Verified badge eligible",       ok: true },
      { t: "Advanced analytics",            ok: true },
      { t: "Customer reviews",              ok: true },
    ],
  },
  {
    id: "pro", name: "Pro", label: "GHS 249/month", price: 249,
    color: "#7C3AED", highlight: false,
    badge: "500 products",
    features: [
      { t: "500 products max",              ok: true },
      { t: "Custom domain",                 ok: true },
      { t: "AI captions & descriptions",    ok: true },
      { t: "Live selling sessions",         ok: true },
      { t: "20 boosts/month",               ok: true },
      { t: "Pro verified badge",            ok: true },
      { t: "Priority support",              ok: true },
      { t: "Loyalty & referrals",           ok: true },
      { t: "Homepage ranking boost",        ok: true },
    ],
  },
];

function CheckSVG({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function CrossSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

export default function StorePlans() {
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [selected, setSelected] = useState("standard");
  const [agreed,   setAgreed]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const plan = PLANS.find((p) => p.id === selected);

  const handleStart = async () => {
    if (!agreed) { setError("Please agree to the terms to continue."); return; }
    if (!user)   { navigate("/login?redirect=/store-plans"); return; }
    setError(null);
    setLoading(true);
    try {
      if (plan.price === 0) {
        navigate("/subscription-success?status=free&plan=basic");
        return;
        return;
      }
      const result = await initSubscriptionPayment({
        planId: selected, uid: user.uid, email: user.email, shopId: null,
      });
      if (result?.authorization_url) {
        redirectToPaystack(result.authorization_url);
      } else {
        throw new Error("Could not start payment. Please try again.");
      }
    } catch (err) {
      setError(
        err?.code === "functions/unavailable"
          ? "Payment service is temporarily unavailable. Please try again shortly."
          : err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sp-root">
      {/* Header */}
      <div className="sp-header">
        <button className="sp-back" onClick={() => navigate("/store-survey")}>← Back</button>
        <div className="sp-progress-bar">
          <div className="sp-progress-fill" style={{ width: "100%" }} />
        </div>
        <div className="sp-step-label">Step 4 of 4</div>
      </div>

      <div className="sp-content">
        <div className="sp-intro">
          <h1 className="sp-title">Choose Your Plan</h1>
          <p className="sp-sub">Start free, scale when ready. All plans include Ghana MoMo checkout.</p>
        </div>

        {/* 4 Plan Cards */}
        <div className="sp-plans-grid">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`sp-plan ${selected === p.id ? "sp-plan-selected" : ""}`}
              onClick={() => setSelected(p.id)}
            >
              {p.popular && <div className="sp-popular">Most Popular</div>}

              <div className="sp-plan-name" style={{ color: selected === p.id ? p.color : "#9CA3AF" }}>
                {p.name}
              </div>

              <div className="sp-plan-price">
                {p.price === 0
                  ? <span className="sp-price-main">Free</span>
                  : <>
                      <span className="sp-price-main">GHS {p.price}</span>
                      <span className="sp-price-unit">/month</span>
                    </>
                }
              </div>

              <ul className="sp-features">
                {p.features.map((f) => (
                  <li key={f.t} style={{ color: f.ok ? "#1A1D3B" : "#C4C9D4" }}>
                    {f.ok ? <CheckSVG color={selected === p.id ? p.color : "#046EF2"}/> : <CrossSVG/>}
                    {f.t}
                  </li>
                ))}
              </ul>

              {selected === p.id && (
                <div className="sp-selected-check">✓ Selected</div>
              )}
            </div>
          ))}
        </div>

        {/* Terms */}
        <div className="sp-terms-box">
          <label className="sp-terms-check">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => { setAgreed(e.target.checked); setError(null); }}
            />
            <div>
              I agree to Beme Market's{" "}
              <a href="/seller-terms"   target="_blank">Seller Terms & Conditions</a>,{" "}
              <a href="/seller-policy"  target="_blank">Seller Policy</a>, and{" "}
              <a href="/privacy-policy" target="_blank">Privacy Policy</a>.
              I understand that subscriptions are non-refundable and that my store can be
              suspended for policy violations.
            </div>
          </label>
        </div>

        {error && <div className="sp-error">{error}</div>}

        <div className="sp-cta">
          <button
            className="sp-start-btn"
            onClick={handleStart}
            disabled={loading || !agreed}
          >
            {loading
              ? "Processing…"
              : plan?.price === 0
                ? "Activate Free Store →"
                : `Pay GHS ${plan?.price}/mo with Paystack →`
            }
          </button>
          <div className="sp-secure-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" style={{ display:"inline", verticalAlign:"middle", marginRight:4 }}>
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Secured by Paystack · MoMo, Visa, Mastercard accepted
          </div>
        </div>
      </div>
    </div>
  );
}