import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "../hooks/useSellerAuth";
import { initSubscriptionPayment, redirectToPaystack } from "../services/subscriptionService";
import "./StorePlans.css";

// Updated prices: Basic GHS 0 / Starter GHS 59 / Growth GHS 129 / Pro GHS 399
// Beme Delivery Support: Growth and Pro only
const PLANS = [
  {
    id: "basic", name: "Basic", price: 0, limit: "5 products",
    tagline: "Get started for free",
    features: [
      { label: "5 product listings",     on: true  },
      { label: "Basic storefront",        on: true  },
      { label: "Paystack payments",       on: true  },
      { label: "Order management",        on: true  },
      { label: "Social media links",      on: false },
      { label: "Beme Delivery Support",   on: false, badge: "Growth+ only" },
    ],
  },
  {
    id: "starter", name: "Starter", price: 59, limit: "10 products",
    tagline: "For growing sellers",
    features: [
      { label: "10 product listings",     on: true  },
      { label: "WhatsApp & social links", on: true  },
      { label: "Customer messaging",      on: true  },
      { label: "Store banner & logo",     on: true  },
      { label: "Order notifications",     on: true  },
      { label: "Beme Delivery Support",   on: false, badge: "Growth+ only" },
    ],
  },
  {
    id: "growth", name: "Growth", price: 129, limit: "25 products",
    tagline: "For serious sellers", popular: true,
    features: [
      { label: "25 product listings",         on: true },
      { label: "WhatsApp & social links",     on: true },
      { label: "Beme Delivery Support",       on: true },
      { label: "Flash sales & discount codes",on: true },
      { label: "Featured boosts (5/mo)",      on: true },
      { label: "Verified badge eligible",     on: true },
      { label: "Advanced analytics",          on: true },
    ],
  },
  {
    id: "pro", name: "Pro", price: 399, limit: "500 products",
    tagline: "For power sellers",
    features: [
      { label: "500 product listings",       on: true },
      { label: "All Growth features",         on: true },
      { label: "Beme Delivery (discounted)",  on: true },
      { label: "Custom domain",               on: true },
      { label: "AI product descriptions",     on: true },
      { label: "20 featured boosts/month",    on: true },
      { label: "Pro verified badge",          on: true },
      { label: "Priority support",            on: true },
    ],
  },
];

function Check({ on }) {
  if (!on) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0 }}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

export default function StorePlans() {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { shop, appData, subscriptionPlan } = useSellerAuth();

  const currentPlanId = String(appData?.planId || subscriptionPlan || shop?.planId || "basic").toLowerCase();
  const [initiating,  setInitiating]  = useState(null);
  const [err,         setErr]         = useState("");

  const handleSelect = async (plan) => {
    if (plan.id === currentPlanId) return;
    if (!user) { navigate("/login?redirect=/plans"); return; }
    if (plan.price === 0) { navigate("/get-a-store"); return; }
    setErr(""); setInitiating(plan.id);
    try {
      const res = await initSubscriptionPayment({
        planId: plan.id, uid: user.uid,
        email: user.email, shopId: shop?.id || user.uid,
      });
      if (res?.isFree)              navigate("/subscription-success?plan=" + plan.id);
      else if (res?.authorization_url) redirectToPaystack(res.authorization_url);
    } catch (e) {
      setErr(e.message || "Payment initiation failed.");
    } finally {
      setInitiating(null);
    }
  };

  return (
    <div className="sp-page">
      <div className="sp-hero">
        <h1 className="sp-hero-title">Simple, transparent pricing</h1>
        <p className="sp-hero-sub">
          Start free. Upgrade when you're ready. No hidden fees — cancel anytime.
        </p>
      </div>

      {err && (
        <div className="sp-err">{err}</div>
      )}

      <div className="sp-grid">
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlanId;
          const idx       = PLANS.findIndex(p => p.id === plan.id);
          const curIdx    = PLANS.findIndex(p => p.id === currentPlanId);
          const isDowngrade = idx < curIdx;

          return (
            <div key={plan.id} className={`sp-card${plan.popular ? " sp-card--popular" : ""}${isCurrent ? " sp-card--current" : ""}`}>
              {plan.popular && <div className="sp-badge sp-badge--popular">MOST POPULAR</div>}
              {isCurrent   && <div className="sp-badge sp-badge--current">YOUR PLAN</div>}

              <div className="sp-card-header">
                <div className="sp-plan-name">{plan.name}</div>
                <div className="sp-plan-tagline">{plan.tagline}</div>
                <div className="sp-plan-price">
                  {plan.price === 0
                    ? <span className="sp-price-amount">Free</span>
                    : <><span className="sp-price-amount">GHS {plan.price}</span><span className="sp-price-period">/mo</span></>}
                </div>
                <div className="sp-plan-limit">{plan.limit}</div>
              </div>

              <ul className="sp-features">
                {plan.features.map((f, i) => (
                  <li key={i} className={`sp-feature${f.on ? "" : " sp-feature--off"}`}>
                    <Check on={f.on}/>
                    <span>{f.label}</span>
                    {f.badge && !f.on && <span className="sp-feature-badge">{f.badge}</span>}
                  </li>
                ))}
              </ul>

              <div className="sp-card-footer">
                {isCurrent ? (
                  <div className="sp-btn sp-btn--current">✓ Current plan</div>
                ) : isDowngrade ? (
                  <div className="sp-btn sp-btn--disabled">Contact support to downgrade</div>
                ) : (
                  <button type="button" className="sp-btn sp-btn--cta"
                    onClick={() => handleSelect(plan)}
                    disabled={!!initiating}>
                    {initiating === plan.id
                      ? "Processing…"
                      : plan.price === 0 ? "Get started free" : `Choose ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delivery callout */}
      <div className="sp-delivery-note">
        <div className="sp-delivery-icon">📦</div>
        <div>
          <div className="sp-delivery-title">Beme Delivery Support — Growth & Pro plans</div>
          <div className="sp-delivery-desc">
            Upgrade to Growth (GHS 129/mo) or Pro (GHS 399/mo) to access Beme's courier network.
            We coordinate pickup and delivery so you can focus on selling.
          </div>
        </div>
      </div>
    </div>
  );
}