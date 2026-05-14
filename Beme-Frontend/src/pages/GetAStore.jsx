import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./GetAStore.css";

const FEATURES = [
  { icon: "🏪", title: "Your Own Storefront",  desc: "Get a beautiful, shareable store page in minutes. Customise your logo, banner, and brand colors." },
  { icon: "📦", title: "Easy Product Listing",  desc: "List products with photos, prices, and descriptions. Manage stock and featured items effortlessly." },
  { icon: "💬", title: "WhatsApp Integration",  desc: "Let customers reach you on WhatsApp directly from your store. Ghana's favourite way to close deals." },
  { icon: "📊", title: "Sales Analytics",        desc: "Track revenue, orders, visitors, and customer trends in real time with a beautiful dashboard." },
  { icon: "🚀", title: "Marketplace Boosts",    desc: "Feature your products on the Beme Market homepage and trending sections for maximum visibility." },
  { icon: "✅", title: "Verified Seller Badge", desc: "Get verified to build customer trust and unlock higher withdrawal limits." },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Create Your Account",   desc: "Sign up or log in to Beme Market. Your buyer account doubles as your seller account."   },
  { step: "2", title: "Set Up Your Store",      desc: "Choose your business type, fill in your store details, pick a theme, and upload your logo." },
  { step: "3", title: "Choose a Plan",          desc: "Start free with Basic or unlock premium features with Standard or Pro. Powered by Paystack." },
  { step: "4", title: "Start Selling",          desc: "Go live instantly! Add products, share your store link, and accept orders from anywhere in Ghana." },
];

const TESTIMONIALS = [
  { name: "Abena K.",    role: "Fashion Seller, Kumasi",  text: "I went from selling on Instagram to having a proper storefront. My sales doubled in the first month!", avatar: "A" },
  { name: "Kwame A.",    role: "Electronics Dealer, Accra", text: "The WhatsApp integration alone is worth it. Customers can chat me immediately — conversion is way up.", avatar: "K" },
  { name: "Efua M.",     role: "Cosmetics & Hair, Takoradi", text: "The dashboard is so clean and easy to use. I check my sales analytics every morning like it's my news.", avatar: "E" },
];

const PLANS = [
  { id: "basic",    name: "Basic",    price: 0,   unit: "Free forever", highlight: false, color: "#6B7280", features: ["25 products",  "Basic storefront",  "MoMo checkout",   "Order management", "Basic analytics"]   },
  { id: "standard", name: "Standard", price: 99,  unit: "/ month",      highlight: true,  color: "#046EF2", features: ["500 products", "Premium themes",   "Live customer chat","Discount codes",  "Featured boosts",  "Verified badge eligible"] },
  { id: "pro",      name: "Pro",      price: 249, unit: "/ month",      highlight: false, color: "#7C3AED", features: ["Unlimited products", "Custom domain", "AI captions", "Live selling", "Loyalty rewards", "Priority support", "Homepage boosts", "Pro verified badge"] },
];

const FAQ = [
  { q: "Do I need a Ghana Card to sell?",          a: "No, you can start selling immediately. Ghana Card is only needed for store verification to unlock the verified badge and higher payout limits." },
  { q: "How do I get paid?",                        a: "We pay directly to your MTN, Telecel, or AirtelTigo Mobile Money account, or to your Ghanaian bank account. Minimum payout is GHS 50." },
  { q: "Can I sell used or second-hand items?",     a: "Yes! Used and second-hand items are allowed as long as they're legal and accurately described. No counterfeit or stolen goods." },
  { q: "What happens if a customer disputes an order?", a: "Our support team reviews both sides. Sellers with clear product descriptions and photos are usually protected. We encourage honest listings." },
  { q: "Is Basic really free forever?",             a: "Yes. The Basic plan is permanently free. You only pay for Standard (GHS 99/mo) or Pro (GHS 249/mo) if you want premium features." },
  { q: "Can I upgrade or downgrade my plan?",       a: "Yes, at any time from your Seller Dashboard. Upgrades take effect immediately. Downgrades apply at the next billing cycle." },
];

export default function GetAStore() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const handleStart = () => {
    if (!user) navigate("/login?redirect=/store-onboarding");
    else navigate("/store-onboarding");
  };

  return (
    <div className="gsa-root">
      {/* ── HERO ── */}
      <section className="gsa-hero">
        <div className="gsa-hero-inner">
          <div className="gsa-hero-badge">🇬🇭 Ghana's Premier Seller Platform</div>
          <h1 className="gsa-hero-title">
            Turn What You Love<br />Into a Thriving Business
          </h1>
          <p className="gsa-hero-sub">
            Get your own Beme Market storefront in minutes. List products, accept orders, chat with customers on WhatsApp, and get paid to your MoMo account. Simple, fast, built for Ghana.
          </p>
          <div className="gsa-hero-actions">
            <button className="gsa-btn-primary" onClick={handleStart}>
              Get Your Free Store →
            </button>
            <button className="gsa-btn-ghost" onClick={() => document.getElementById("gsa-pricing").scrollIntoView({ behavior: "smooth" })}>
              View Pricing
            </button>
          </div>
          <div className="gsa-hero-social-proof">
            <div className="gsa-avatars">
              {["K","A","E","M","D"].map((l, i) => (
                <div key={i} className="gsa-avatar-dot" style={{ zIndex: 5 - i, background: ["#046EF2","#22C55E","#7C3AED","#F59E0B","#EF4444"][i] }}>{l}</div>
              ))}
            </div>
            <span className="gsa-proof-text">Joined by <strong>2,400+</strong> sellers across Ghana</span>
          </div>
        </div>

        {/* Hero visual */}
        <div className="gsa-hero-visual">
          <div className="gsa-dashboard-mockup">
            <div className="gsa-mockup-bar">
              <div className="gsa-dot" style={{ background: "#EF4444" }} />
              <div className="gsa-dot" style={{ background: "#F59E0B" }} />
              <div className="gsa-dot" style={{ background: "#22C55E" }} />
              <span style={{ fontSize: 11, color: "#8B8FA8", flex: 1, textAlign: "center" }}>Beme Seller Dashboard</span>
            </div>
            <div className="gsa-mockup-body">
              {[{ l: "Revenue",   v: "GHS 4,280", up: true  },
                { l: "Orders",    v: "38",         up: true  },
                { l: "Visitors",  v: "1,204",      up: true  },
                { l: "Products",  v: "52",         up: false }].map((c) => (
                <div key={c.l} className="gsa-mockup-card">
                  <div style={{ fontSize: 10, color: "#8B8FA8", marginBottom: 4 }}>{c.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1D3B", fontFamily: "'Space Grotesk', sans-serif" }}>{c.v}</div>
                  <div style={{ fontSize: 10, color: c.up ? "#22C55E" : "#EF4444" }}>{c.up ? "↑" : "↓"} this week</div>
                </div>
              ))}
              <div className="gsa-mockup-chart">
                {[40,65,45,80,60,90,75,95].map((h, i) => (
                  <div key={i} style={{ flex: 1, background: i === 7 ? "#046EF2" : "#E8EFFF", borderRadius: "3px 3px 0 0", height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="gsa-stats-bar">
        {[
          { value: "2,400+",  label: "Active Sellers"   },
          { value: "GHS 1M+", label: "Processed Monthly" },
          { value: "160+",    label: "Cities in Ghana"   },
          { value: "4.9★",    label: "Seller Rating"     },
        ].map((s) => (
          <div key={s.label} className="gsa-stat">
            <div className="gsa-stat-value">{s.value}</div>
            <div className="gsa-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── FEATURES ── */}
      <section className="gsa-section">
        <div className="gsa-section-head">
          <div className="gsa-section-badge">Everything You Need</div>
          <h2 className="gsa-section-title">Built for Ghana's Digital Economy</h2>
          <p className="gsa-section-sub">From Kumasi to Accra, Takoradi to Tamale — sell to customers across the country and get paid to your phone.</p>
        </div>
        <div className="gsa-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="gsa-feature-card">
              <div className="gsa-feature-icon">{f.icon}</div>
              <h3 className="gsa-feature-title">{f.title}</h3>
              <p className="gsa-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="gsa-section gsa-section-dark">
        <div className="gsa-section-head">
          <div className="gsa-section-badge" style={{ background: "rgba(4,110,242,0.15)", color: "#60A5FA" }}>Simple Process</div>
          <h2 className="gsa-section-title" style={{ color: "#fff" }}>Get Selling in 4 Steps</h2>
        </div>
        <div className="gsa-steps-grid">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="gsa-step">
              <div className="gsa-step-num">{s.step}</div>
              <h3 className="gsa-step-title">{s.title}</h3>
              <p className="gsa-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button className="gsa-btn-primary" onClick={handleStart}>Start Now — It's Free →</button>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="gsa-section" id="gsa-pricing">
        <div className="gsa-section-head">
          <div className="gsa-section-badge">Pricing</div>
          <h2 className="gsa-section-title">Choose Your Plan</h2>
          <p className="gsa-section-sub">Start free. Scale when you're ready. No hidden fees, no contracts.</p>
        </div>
        <div className="gsa-pricing-grid">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`gsa-plan-card ${plan.highlight ? "gsa-plan-highlight" : ""}`}>
              {plan.highlight && <div className="gsa-plan-popular">Most Popular</div>}
              <div className="gsa-plan-name" style={{ color: plan.color }}>{plan.name}</div>
              <div className="gsa-plan-price">
                {plan.price === 0 ? <span className="gsa-plan-amt">Free</span>
                  : <><span className="gsa-plan-amt">GHS {plan.price}</span><span className="gsa-plan-unit">{plan.unit}</span></>
                }
              </div>
              <ul className="gsa-plan-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.highlight ? "#fff" : plan.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={plan.highlight ? "gsa-btn-primary" : "gsa-btn-outline"}
                style={{ width: "100%", borderColor: plan.color, color: plan.highlight ? "#fff" : plan.color }}
                onClick={() => navigate(`/store-plans?plan=${plan.id}`)}
              >
                {plan.price === 0 ? "Start Free" : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="gsa-section gsa-section-soft">
        <div className="gsa-section-head">
          <div className="gsa-section-badge">Seller Stories</div>
          <h2 className="gsa-section-title">Real Sellers, Real Results</h2>
        </div>
        <div className="gsa-testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="gsa-testimonial">
              <p className="gsa-testimonial-text">"{t.text}"</p>
              <div className="gsa-testimonial-author">
                <div className="gsa-testimonial-avatar">{t.avatar}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                  <div style={{ color: "#8B8FA8", fontSize: 12 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="gsa-section">
        <div className="gsa-section-head">
          <div className="gsa-section-badge">FAQ</div>
          <h2 className="gsa-section-title">Common Questions</h2>
        </div>
        <div className="gsa-faq-grid">
          {FAQ.map((f) => (
            <div key={f.q} className="gsa-faq-item">
              <h4 className="gsa-faq-q">{f.q}</h4>
              <p className="gsa-faq-a">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="gsa-cta">
        <h2 className="gsa-cta-title">Ready to Start Selling?</h2>
        <p className="gsa-cta-sub">Join over 2,400 Ghanaian sellers already growing on Beme Market. Your store is one click away.</p>
        <button className="gsa-btn-primary gsa-btn-lg" onClick={handleStart}>
          Get Your Free Store Today →
        </button>
        <div style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>No credit card required • Free plan available • Setup in minutes</div>
      </section>
    </div>
  );
}

