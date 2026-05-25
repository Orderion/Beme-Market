import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "../hooks/useSellerAuth";
import { initSubscriptionPayment, redirectToPaystack } from "../services/subscriptionService";
import "./StorePlans.css";

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 0,
    period: "",
    tagline: "Get started for free",
    limit: "5 products",
    color: "#6B7280",
    features: [
      { label:"5 product listings",            on:true  },
      { label:"Basic storefront page",          on:true  },
      { label:"Paystack payment processing",    on:true  },
      { label:"Order management",               on:true  },
      { label:"Customer messaging",             on:false },
      { label:"Social media links",             on:false },
      { label:"Store banner & logo",            on:false },
      { label:"Beme Delivery Support",          on:false, note:"Growth+ only" },
      { label:"Analytics Pro",                  on:false },
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 59,
    period: "/mo",
    tagline: "For growing sellers",
    limit: "10 products",
    color: "#046EF2",
    features: [
      { label:"10 product listings",            on:true  },
      { label:"Full storefront page",           on:true  },
      { label:"Paystack payment processing",    on:true  },
      { label:"Order management",               on:true  },
      { label:"Customer messaging",             on:true  },
      { label:"WhatsApp & social links",        on:true  },
      { label:"Store banner & logo",            on:true  },
      { label:"1,000 AI auto-replies/day",      on:true  },
      { label:"Beme Delivery Support",          on:false, note:"Growth+ only" },
      { label:"Analytics Pro",                  on:false },
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 129,
    period: "/mo",
    tagline: "For serious sellers",
    limit: "25 products",
    color: "#6366F1",
    popular: true,
    features: [
      { label:"25 product listings",            on:true  },
      { label:"Everything in Starter",          on:true  },
      { label:"Beme Delivery Support",          on:true  },
      { label:"Flash sales & discount codes",   on:true  },
      { label:"Featured boosts (5/month)",      on:true  },
      { label:"Verified badge eligible",        on:true  },
      { label:"Analytics Pro dashboard",        on:true  },
      { label:"20,000 AI auto-replies/day",     on:true  },
      { label:"Priority customer support",      on:false },
      { label:"Custom domain",                  on:false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 399,
    period: "/mo",
    tagline: "For power sellers",
    limit: "500 products",
    color: "#7C3AED",
    features: [
      { label:"500 product listings",           on:true  },
      { label:"Everything in Growth",           on:true  },
      { label:"Beme Delivery (discounted rate)", on:true  },
      { label:"Custom domain",                  on:true  },
      { label:"AI product descriptions",        on:true  },
      { label:"20 featured boosts/month",       on:true  },
      { label:"Pro verified badge",             on:true  },
      { label:"Unlimited AI auto-replies",      on:true  },
      { label:"Priority support (24h response)",on:true  },
      { label:"Early access to new features",   on:true  },
    ],
  },
];

function Check({ on, color }) {
  if (!on) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0 }}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={color || "#22C55E"} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

export default function StorePlans() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { shop, appData, subscriptionPlan } = useSellerAuth();

  const currentPlanId = String(appData?.planId || subscriptionPlan || shop?.planId || "basic").toLowerCase();
  const [initiating, setInitiating] = useState(null);
  const [err,        setErr]        = useState("");

  const handleSelect = async (plan) => {
    if (plan.id === currentPlanId) return;
    if (!user) { navigate("/login?redirect=/store-plans"); return; }
    if (plan.price === 0) { navigate("/get-a-store"); return; }
    setErr(""); setInitiating(plan.id);
    try {
      const res = await initSubscriptionPayment({
        planId: plan.id, uid: user.uid,
        email: user.email, shopId: shop?.id || user.uid,
      });
      if (res?.isFree)                 navigate("/subscription-success?plan=" + plan.id);
      else if (res?.authorization_url) redirectToPaystack(res.authorization_url);
    } catch (e) {
      setErr(e.message || "Payment initiation failed. Please try again.");
    } finally {
      setInitiating(null);
    }
  };

  return (
    <div className="sp-page">

      {/* ── Gradient hero ── */}
      <div className="sp-hero">
        <div className="sp-orb sp-orb-1"/>
        <div className="sp-orb sp-orb-2"/>
        <div className="sp-orb sp-orb-3"/>
        <div className="sp-hero-content">
          <h1 className="sp-hero-title">Simple, transparent pricing</h1>
          <p className="sp-hero-sub">
            Start free. Upgrade when you're ready.<br/>
            No hidden fees — cancel anytime.
          </p>
        </div>
      </div>

      {err && <div className="sp-err">{err}</div>}

      {/* ── Plan cards ── */}
      <div className="sp-grid">
        {PLANS.map(plan => {
          const isCurrent  = plan.id === currentPlanId;
          const idx        = PLANS.findIndex(p => p.id === plan.id);
          const curIdx     = PLANS.findIndex(p => p.id === currentPlanId);
          const isDowngrade = idx < curIdx;

          return (
            <div key={plan.id}
              className={`sp-card ${plan.popular ? "sp-card--popular" : ""} ${isCurrent ? "sp-card--current" : ""}`}
              style={ plan.popular ? { "--plan-color": plan.color } : {} }>

              {plan.popular && (
                <div className="sp-badge sp-badge--popular">⭐ Most Popular</div>
              )}
              {isCurrent && !plan.popular && (
                <div className="sp-badge sp-badge--current">Your Plan</div>
              )}

              <div className="sp-card-top">
                <div className="sp-plan-dot" style={{ background: plan.color }}/>
                <div>
                  <div className="sp-plan-name" style={{ color: plan.color }}>{plan.name}</div>
                  <div className="sp-plan-tagline">{plan.tagline}</div>
                </div>
              </div>

              <div className="sp-plan-price">
                {plan.price === 0
                  ? <span className="sp-price-amount">Free</span>
                  : <>
                      <span className="sp-price-currency">GHS</span>
                      <span className="sp-price-amount">{plan.price}</span>
                      <span className="sp-price-period">{plan.period}</span>
                    </>
                }
              </div>

              <div className="sp-plan-limit">{plan.limit}</div>

              <ul className="sp-features">
                {plan.features.map((f, i) => (
                  <li key={i} className={`sp-feature ${!f.on ? "sp-feature--off" : ""}`}>
                    <Check on={f.on} color={plan.color}/>
                    <span>{f.label}</span>
                    {f.note && !f.on && <span className="sp-feature-note">{f.note}</span>}
                  </li>
                ))}
              </ul>

              <div className="sp-card-footer">
                {isCurrent ? (
                  <div className="sp-btn sp-btn--current">✓ Current Plan</div>
                ) : isDowngrade ? (
                  <div className="sp-btn sp-btn--disabled">Contact support to downgrade</div>
                ) : (
                  <button type="button" className="sp-btn sp-btn--cta"
                    style={{ background: "#046EF2" }}
                    onClick={() => handleSelect(plan)}
                    disabled={!!initiating}>
                    {initiating === plan.id ? "Processing…"
                      : plan.price === 0 ? "Get started free"
                      : `Choose ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Delivery callout ── */}
      <div className="sp-delivery-note">
        <div className="sp-delivery-icon">📦</div>
        <div>
          <div className="sp-delivery-title">Beme Delivery — Growth & Pro plans</div>
          <div className="sp-delivery-desc">
            Upgrade to Growth (GHS 129/mo) or Pro (GHS 399/mo) to access Beme's courier network.
            We coordinate pickup and delivery so you can focus on selling.
          </div>
        </div>
      </div>

      <p className="sp-footer-note">
        All plans include Paystack payments · Secure checkout · 24/7 platform uptime
      </p>
    </div>
  );
}
