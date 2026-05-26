import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const PLAN_FEATURES = {
  starter: ["10 product listings", "Customer messaging", "WhatsApp & social links", "Store banner & logo", "1,000 AI auto-replies/day"],
  growth:  ["25 product listings", "Beme Delivery Support", "Flash sales & discount codes", "5 featured boosts/month", "Analytics Pro dashboard", "20,000 AI auto-replies/day"],
  pro:     ["500 product listings", "Everything in Growth", "Beme Delivery (discounted)", "Custom domain", "20 featured boosts/month", "Unlimited AI auto-replies", "Priority support"],
};

export default function SubscriptionSuccess() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const planId    = params.get("plan")    || "starter";
  const billing   = params.get("billing") || "monthly";
  const planName  = planId.charAt(0).toUpperCase() + planId.slice(1);
  const features  = PLAN_FEATURES[planId] || [];
  const [count,   setCount] = useState(5);

  useEffect(() => {
    const t = setInterval(() => setCount(c => {
      if (c <= 1) { clearInterval(t); navigate("/seller-dashboard?tab=home"); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [navigate]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f7fa",
      fontFamily: "var(--font-main,'Nunito',sans-serif)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 24,
        padding: "48px 40px",
        maxWidth: 480,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 12px 48px rgba(0,0,0,0.10)",
        border: "1px solid rgba(0,0,0,0.07)",
      }}>

        {/* Animated checkmark */}
        <div style={{ width: 72, height: 72, borderRadius: "50%",
          background: "linear-gradient(135deg,#046EF2,#7C3AED)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: "0 8px 24px rgba(4,110,242,0.35)" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <div style={{ fontSize: 28, fontWeight: 900, color: "#111",
          letterSpacing: "-0.03em", marginBottom: 8 }}>
          Welcome to {planName}! 🎉
        </div>

        <div style={{ fontSize: 15, color: "#6b7280", marginBottom: 24,
          fontWeight: 500, lineHeight: 1.6 }}>
          Your {billing === "yearly" ? "yearly" : "monthly"} subscription is now active.
          Start selling with your upgraded features.
        </div>

        {/* Plan badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 18px", borderRadius: 20,
          background: "linear-gradient(135deg, rgba(4,110,242,0.08), rgba(124,58,237,0.08))",
          border: "1px solid rgba(4,110,242,0.2)", marginBottom: 28 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%",
            background: "linear-gradient(135deg, #046EF2, #7C3AED)" }}/>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#046EF2" }}>
            {planName} Plan · {billing === "yearly" ? "Yearly" : "Monthly"}
          </span>
        </div>

        {/* Features unlocked */}
        {features.length > 0 && (
          <div style={{ background: "#f8f9fb", borderRadius: 14,
            padding: "18px 20px", marginBottom: 28, textAlign: "left" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af",
              textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
              Now unlocked for you
            </div>
            {features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center",
                gap: 10, marginBottom: 9, fontSize: 14, fontWeight: 600, color: "#374151" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {f}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <button onClick={() => navigate("/seller-dashboard?tab=home")}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: "#046EF2", color: "#fff", fontSize: 15, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 16px rgba(4,110,242,0.35)",
            transition: "opacity 0.15s", marginBottom: 12 }}>
          Go to Dashboard →
        </button>

        <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>
          Redirecting automatically in {count}s
        </div>
      </div>
    </div>
  );
}
