import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./GetAStore.css";

/* ─── Pricing data ────────────────────────────────────────────────────────── */
const MONTHLY = { free: 0, starter: 29, standard: 99, pro: 249 };
const YEARLY  = { free: 0, starter: 23, standard: 79, pro: 199 };

const PLANS = [
  {
    id: "free", name: "Free", tagline: "Test the waters",
    bg: "#fff", nameColor: "#9CA3AF", amtColor: "#111", cta: "Start for Free",
    ctaBg: "#111", ctaColor: "#fff", ctaBorder: "#111",
    dividerColor: "rgba(0,0,0,0.08)",
    features: [
      { t: "10 products",             ok: true  },
      { t: "Basic storefront",         ok: true  },
      { t: "WhatsApp redirect button", ok: true  },
      { t: "Order management",         ok: true  },
      { t: "Basic analytics",          ok: true  },
      { t: "Live customer chat",        ok: false },
      { t: "Product boosts",           ok: false },
      { t: "Verified badge",           ok: false },
    ],
  },
  {
    id: "starter", name: "Starter", tagline: "Launch your store",
    bg: "#fff", nameColor: "#9CA3AF", amtColor: "#111", cta: "Get Starter",
    ctaBg: "transparent", ctaColor: "#111", ctaBorder: "rgba(0,0,0,0.2)",
    dividerColor: "rgba(0,0,0,0.08)",
    features: [
      { t: "25 products",              ok: true  },
      { t: "Custom banner & colors",   ok: true  },
      { t: "WhatsApp redirect",        ok: true  },
      { t: "Order notifications",      ok: true  },
      { t: "Basic categories",         ok: true  },
      { t: "Reduced Beme branding",    ok: true  },
      { t: "Live customer chat",       ok: false },
      { t: "Product boosts",           ok: false },
    ],
  },
  {
    id: "standard", name: "Standard", tagline: "Grow your brand", badge: "Most Popular",
    bg: "#046EF2", nameColor: "rgba(255,255,255,0.6)", amtColor: "#fff",
    cta: "Get Standard", ctaBg: "#fff", ctaColor: "#046EF2", ctaBorder: "#fff",
    dividerColor: "rgba(255,255,255,0.15)",
    features: [
      { t: "500 products",              ok: true },
      { t: "Premium store themes",       ok: true },
      { t: "Real-time customer chat",    ok: true },
      { t: "Discount codes & flash sales", ok: true },
      { t: "Featured product boosts",   ok: true },
      { t: "Verified badge eligible",   ok: true },
      { t: "TikTok / Instagram links",  ok: true },
      { t: "Customer reviews enabled",  ok: true },
      { t: "Sales & visit analytics",   ok: true },
    ],
  },
  {
    id: "pro", name: "Pro", tagline: "Dominate the market", badge: "Business Pro",
    bg: "#fff", nameColor: "#7C3AED", amtColor: "#111", cta: "Get Pro",
    ctaBg: "#7C3AED", ctaColor: "#fff", ctaBorder: "#7C3AED",
    dividerColor: "rgba(0,0,0,0.08)",
    features: [
      { t: "Unlimited products",          ok: true },
      { t: "Custom domain",               ok: true },
      { t: "AI captions & descriptions",  ok: true },
      { t: "Live selling sessions",        ok: true },
      { t: "Loyalty rewards & referrals", ok: true },
      { t: "Homepage featured placement", ok: true },
      { t: "Priority marketplace ranking",ok: true },
      { t: "AI auto-replies in chat",     ok: true },
      { t: "Pro Verified badge",          ok: true },
      { t: "Remove Beme branding",        ok: true },
    ],
  },
];

const STATS = [
  { value: "2,400+",  label: "Active sellers across Ghana" },
  { value: "GHS 1M+", label: "Processed every month"       },
  { value: "160+",    label: "Cities and towns reached"     },
  { value: "4.9 / 5", label: "Average seller rating"       },
];

const WHY = [
  {
    title: "Built for Ghana",
    desc: "MoMo, Visa, and bank payments built in. Customers pay the way they already do — no signup needed.",
    d: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z M12 9m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0",
  },
  {
    title: "Your Products, Your Prices",
    desc: "Sell fashion, electronics, food, handmade goods — anything legal. You control what you list and what you charge.",
    d: "M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z M9 21V12h6v9",
  },
  {
    title: "Get Paid to MoMo",
    desc: "Withdraw earnings directly to MTN, Telecel, or AirtelTigo. Or to your Ghanaian bank. Minimum GHS 50.",
    d: "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12h.01",
  },
  {
    title: "Real Buyers Waiting",
    desc: "Beme Market already has thousands of active Ghanaian shoppers. A store puts your products right in front of them.",
    d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    title: "Sell on WhatsApp & TikTok",
    desc: "Share your Beme store link anywhere. Every click lands on your store. Every order goes straight to your dashboard.",
    d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13",
  },
  {
    title: "Chat With Buyers",
    desc: "Standard and Pro sellers get in-app live chat. Close deals faster without switching to WhatsApp.",
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
];

const HOW = [
  { n: "01", title: "Create Your Account",   desc: "Sign up in under a minute. Your buyer account is your seller account — no switching." },
  { n: "02", title: "Set Up Your Store",      desc: "Add your store name, products, banner image, and WhatsApp number. Done in 10 minutes." },
  { n: "03", title: "Pick a Plan",           desc: "Start free or go straight to Standard. Pay with MoMo, Visa, or Mastercard via Paystack." },
  { n: "04", title: "Share & Get Paid",      desc: "Post your store link on WhatsApp and TikTok. Orders come in. Withdraw to MoMo." },
];

const FAQS = [
  { q: "Is this like Jumia?",                    a: "Not exactly. On Jumia you can only buy. On Beme Market you can also open your own store and sell your own products — think Jumia meets your own personal shop, built for Ghana." },
  { q: "Do I need a Ghana Card?",                 a: "No — you can start selling immediately. A Ghana Card is only needed later if you apply for the Verified Seller badge." },
  { q: "How do I get paid?",                      a: "Payments go to your Beme wallet. Withdraw anytime to MTN, Telecel, or AirtelTigo MoMo — or to your Ghanaian bank account. Minimum withdrawal is GHS 50." },
  { q: "Is the Free plan really free?",           a: "Yes. No card, no trial. You get 10 products and a real storefront for as long as you want. Upgrade whenever you're ready." },
  { q: "Can I sell second-hand items?",           a: "Yes — as long as they're legal and accurately described. No counterfeit or stolen goods allowed." },
  { q: "Can I change my plan later?",             a: "Yes, anytime from your seller dashboard. Upgrades apply immediately. Downgrades kick in at the next billing date." },
];

/* ─── SVG icon helper ─────────────────────────────────────────────────────── */
function Ico({ d, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split(" M").map((seg, i) => <path key={i} d={(i === 0 ? "" : "M") + seg} />)}
    </svg>
  );
}

function CheckIcon({ color = "#046EF2" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB"
      strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function GetAStore() {
  const navigate        = useNavigate();
  const { user }        = useAuth();
  const [billing, setBilling] = useState("monthly");

  const prices = billing === "yearly" ? YEARLY : MONTHLY;

  const goStart = (planId) => {
    const to = `/store-onboarding?plan=${planId}`;
    navigate(user ? to : `/login?redirect=${encodeURIComponent(to)}`);
  };

  return (
    <div className="gsa-root">

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="gsa-hero">
        <div className="gsa-hero-tag">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          Selling in Ghana, made simple
        </div>

        <h1 className="gsa-hero-title">
          Open your store.<br />
          Sell to Ghana.<br />
          Get paid to MoMo.
        </h1>

        <p className="gsa-hero-sub">
          Beme Market is where thousands of Ghanaians shop every day. Get your own store, list your products, and receive orders from customers across the country — starting free.
        </p>

        <div className="gsa-hero-btns">
          <button className="gsa-btn-primary" onClick={() => goStart("free")}>
            Open a Free Store →
          </button>
          <button className="gsa-btn-ghost"
            onClick={() => document.getElementById("gsa-pricing").scrollIntoView({ behavior: "smooth" })}>
            View Pricing
          </button>
        </div>

        <div className="gsa-hero-trust">
          {["No card required", "MoMo payouts", "Free plan available", "Setup in 10 minutes"].map((t) => (
            <div key={t} className="gsa-hero-trust-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {t}
            </div>
          ))}
        </div>
      </section>

      {/* ══ STATS ══════════════════════════════════════════════════════════════ */}
      <section className="gsa-stats">
        {STATS.map((s) => (
          <div key={s.label} className="gsa-stat-item">
            <div className="gsa-stat-val">{s.value}</div>
            <div className="gsa-stat-lbl">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ══ WHY ════════════════════════════════════════════════════════════════ */}
      <section className="gsa-section">
        <div className="gsa-section-label">Why Open a Store</div>
        <h2 className="gsa-section-title">Everything you need to sell in Ghana</h2>
        <div className="gsa-why-grid">
          {WHY.map((w) => (
            <div key={w.title} className="gsa-why-card">
              <div className="gsa-why-icon">
                <Ico d={w.d} size={22} />
              </div>
              <h3 className="gsa-why-title">{w.title}</h3>
              <p className="gsa-why-desc">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════════════════ */}
      <section className="gsa-dark-section">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="gsa-section-label gsa-label-dark">How it works</div>
          <h2 className="gsa-section-title gsa-title-dark">Up and selling in 4 steps</h2>
          <div className="gsa-how-grid">
            {HOW.map((h) => (
              <div key={h.n} className="gsa-how-item">
                <div className="gsa-how-num">{h.n}</div>
                <h3 className="gsa-how-title">{h.title}</h3>
                <p className="gsa-how-desc">{h.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 52 }}>
            <button className="gsa-btn-white" onClick={() => goStart("free")}>
              Open Your Store — It's Free →
            </button>
          </div>
        </div>
      </section>

      {/* ══ PRICING ═══════════════════════════════════════════════════════════ */}
      <section className="gsa-section" id="gsa-pricing">
        <div className="gsa-section-label">Pricing</div>
        <h2 className="gsa-section-title">Choose how you want to sell</h2>
        <p className="gsa-section-sub">Start free. Upgrade when you're ready. Cancel anytime.</p>

        {/* Billing toggle */}
        <div className="gsa-billing-toggle">
          <button
            className={`gsa-toggle-btn ${billing === "monthly" ? "gsa-toggle-active" : ""}`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            className={`gsa-toggle-btn ${billing === "yearly" ? "gsa-toggle-active" : ""}`}
            onClick={() => setBilling("yearly")}
          >
            Yearly
            <span className="gsa-toggle-badge">Save 20%</span>
          </button>
        </div>

        {/* 4 plan cards */}
        <div className="gsa-plans-grid">
          {PLANS.map((plan) => {
            const price  = prices[plan.id];
            const isFree = price === 0;
            const isDark = plan.bg === "#046EF2";

            return (
              <div
                key={plan.id}
                className={`gsa-plan-card ${plan.badge === "Most Popular" ? "gsa-plan-popular" : ""}`}
                style={{ background: plan.bg }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    className="gsa-plan-badge"
                    style={{
                      background: plan.badge === "Most Popular" ? "#111" : "#7C3AED",
                      color: "#fff",
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                {/* Name */}
                <div className="gsa-plan-name" style={{ color: plan.nameColor }}>
                  {plan.name}
                </div>

                {/* Price */}
                <div className="gsa-plan-price">
                  {isFree
                    ? <span className="gsa-plan-amt" style={{ color: plan.amtColor }}>Free</span>
                    : <>
                        <span className="gsa-plan-amt" style={{ color: plan.amtColor }}>
                          GHS {price}
                        </span>
                        <span className="gsa-plan-unit"
                          style={{ color: isDark ? "rgba(255,255,255,0.55)" : "#9CA3AF" }}>
                          / mo
                        </span>
                      </>
                  }
                </div>

                {billing === "yearly" && !isFree && (
                  <div className="gsa-plan-yearly-note"
                    style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#9CA3AF" }}>
                    Billed GHS {price * 12} / year
                  </div>
                )}

                <div className="gsa-plan-tagline"
                  style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#6B7280" }}>
                  {plan.tagline}
                </div>

                {/* CTA */}
                <button
                  className="gsa-plan-cta"
                  style={{
                    background:  plan.ctaBg,
                    color:       plan.ctaColor,
                    border:      `2px solid ${plan.ctaBorder}`,
                  }}
                  onClick={() => goStart(plan.id)}
                >
                  {plan.cta}
                </button>

                <div className="gsa-plan-divider"
                  style={{ borderTopColor: plan.dividerColor }} />

                {/* Features */}
                <ul className="gsa-plan-features">
                  {plan.features.map((f) => (
                    <li key={f.t}
                      style={{ color: f.ok ? (isDark ? "rgba(255,255,255,0.9)" : "#1A1D3B") : "#9CA3AF" }}>
                      {f.ok
                        ? <CheckIcon color={isDark ? "#fff" : (plan.id === "pro" ? "#7C3AED" : "#046EF2")} />
                        : <CrossIcon />
                      }
                      {f.t}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {billing === "yearly" && (
          <p className="gsa-yearly-note">
            All yearly plans billed upfront · 20% cheaper than monthly · Cancel anytime
          </p>
        )}
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════════════ */}
      <section className="gsa-dark-section">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="gsa-section-label gsa-label-dark">FAQ</div>
          <h2 className="gsa-section-title gsa-title-dark">Common questions</h2>
          <div className="gsa-faq-grid">
            {FAQS.map((f) => (
              <div key={f.q} className="gsa-faq-card">
                <h4 className="gsa-faq-q">{f.q}</h4>
                <p className="gsa-faq-a">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BOTTOM CTA ════════════════════════════════════════════════════════ */}
      <section className="gsa-cta-section">
        <h2 className="gsa-cta-title">Ready to start selling?</h2>
        <p className="gsa-cta-sub">
          Join 2,400+ Ghanaian sellers already making money on Beme Market.<br />
          Free. No card. No contract.
        </p>
        <button className="gsa-btn-primary gsa-cta-btn" onClick={() => goStart("free")}>
          Open a Free Store →
        </button>
      </section>

    </div>
  );
}