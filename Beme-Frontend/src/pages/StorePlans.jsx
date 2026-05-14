import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  initSubscriptionPayment,
  redirectToPaystack,
  PLAN_PRICES,
} from "../services/subscriptionService";
import { getApplicationDraft } from "../services/storeService";
import "./StorePlans.css";

/* ─── Plan definitions ───────────────────────────────────────────────────── */
const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 0,
    label: "Free forever",
    highlight: false,
    color: "#6B7280",
    features: [
      { t: "25 products",      ok: true  },
      { t: "Basic storefront", ok: true  },
      { t: "MoMo checkout",    ok: true  },
      { t: "Order management", ok: true  },
      { t: "Basic analytics",  ok: true  },
      { t: "Live customer chat", ok: false },
      { t: "Discount codes",   ok: false },
      { t: "Product boosts",   ok: false },
      { t: "Verified badge",   ok: false },
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: 99,
    label: "/month",
    highlight: true,
    color: "#046EF2",
    features: [
      { t: "500 products",          ok: true  },
      { t: "Premium themes",        ok: true  },
      { t: "Live customer chat",    ok: true  },
      { t: "Discount codes",        ok: true  },
      { t: "Featured boosts (5/mo)", ok: true },
      { t: "Verified badge eligible", ok: true },
      { t: "Advanced analytics",    ok: true  },
      { t: "AI captions",           ok: false },
      { t: "Custom domain",         ok: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 249,
    label: "/month",
    highlight: false,
    color: "#7C3AED",
    features: [
      { t: "Unlimited products",    ok: true },
      { t: "Custom domain",         ok: true },
      { t: "AI captions & replies", ok: true },
      { t: "Live selling",          ok: true },
      { t: "20 boosts/month",       ok: true },
      { t: "Pro verified badge",    ok: true },
      { t: "Priority support",      ok: true },
      { t: "Loyalty & referrals",   ok: true },
      { t: "Homepage ranking",      ok: true },
    ],
  },
];

/* ─── Check icon ─────────────────────────────────────────────────────────── */
function Check({ ok, color }) {
  return ok ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function StorePlans() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const { user }     = useAuth();

  const [selected, setSelected] = useState(params.get("plan") || "standard");
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
        /* ── Free (Basic) plan ─────────────────────────────────────────────
           We save the intent to Firestore and redirect to success.
           The seller account is activated by the Cloud Function after deploy.
           For now we navigate to success with status=free so the user sees
           the confirmation screen immediately. ──────────────────────────── */
        navigate("/subscription-success?status=free&plan=basic");
        return;
      }

      /* ── Paid plan — init Paystack transaction ─────────────────────────── */
      const result = await initSubscriptionPayment({
        planId: selected,
        uid:    user.uid,
        email:  user.email,
        shopId: null,
      });

      if (result?.authorization_url) {
        redirectToPaystack(result.authorization_url);
      } else {
        throw new Error("Could not start payment. Please try again.");
      }
    } catch (err) {
      console.error("[StorePlans] error:", err);
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
      {/* Progress header */}
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

        {/* Plan cards */}
        <div className="sp-plans-grid">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`sp-plan ${selected === p.id ? "sp-plan-selected" : ""} ${p.highlight ? "sp-plan-highlight" : ""}`}
              onClick={() => setSelected(p.id)}
            >
              {p.highlight && <div className="sp-popular">Most Popular</div>}

              <div className="sp-plan-name" style={{ color: selected === p.id ? p.color : "#6B7280" }}>
                {p.name}
              </div>

              <div className="sp-plan-price">
                {p.price === 0
                  ? <span className="sp-price-main">Free</span>
                  : <>
                      <span className="sp-price-main">GHS {p.price}</span>
                      <span className="sp-price-unit">{p.label}</span>
                    </>
                }
              </div>

              <ul className="sp-features">
                {p.features.map((f) => (
                  <li key={f.t} style={{ color: f.ok ? "#1A1D3B" : "#C4C9D4" }}>
                    <Check ok={f.ok} color={p.color} />
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
              <a href="/privacy-policy" target="_blank">Privacy Policy</a>.{" "}
              I understand that subscriptions are non-refundable and that my store can be
              suspended for policy violations.
            </div>
          </label>
        </div>

        {/* Error */}
        {error && <div className="sp-error">{error}</div>}

        {/* CTA */}
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
            🔒 Secured by Paystack • MoMo, Visa, Mastercard accepted
          </div>
        </div>
      </div>
    </div>
  );
}