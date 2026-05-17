import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSellerAuth } from "../../hooks/useSellerAuth";

/* ── Updated 4-tier plan structure — no unlimited ── */
const PLANS = [
  {
    id: "basic", name: "Basic", price: 0, yearly: 0,
    color: "#6B7280", limit: "5 products",
    features: [
      "5 products max",
      "Basic storefront",
      "Order management",
      "Basic analytics",
      "No social links",
    ],
  },
  {
    id: "starter", name: "Starter", price: 49, yearly: 39,
    color: "#374151", limit: "10 products",
    features: [
      "10 products max",
      "WhatsApp & social links",
      "Customer chat",
      "Order notifications",
      "Store banner & logo",
    ],
  },
  {
    id: "growth", name: "Growth", price: 99, yearly: 79,
    color: "#046EF2", popular: true, limit: "25 products",
    features: [
      "25 products max",
      "WhatsApp & social links",
      "Real-time customer chat",
      "Discount codes & flash sales",
      "Featured boosts (5/mo)",
      "Verified badge eligible",
      "Advanced analytics",
    ],
  },
  {
    id: "pro", name: "Pro", price: 249, yearly: 199,
    color: "#7C3AED", limit: "500 products",
    features: [
      "500 products max",
      "Custom domain",
      "AI descriptions",
      "Live selling sessions",
      "20 boosts/month",
      "Pro verified badge",
      "Priority support",
      "Homepage ranking boost",
    ],
  },
];

/* ── Helpers ── */
function Check({ color }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 0", borderBottom: "1px solid var(--border-soft, rgba(0,0,0,0.06))",
    }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--muted,#6B7280)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: highlight || "var(--text,#111)" }}>{value}</span>
    </div>
  );
}

export default function DashboardSubscription() {
  const navigate  = useNavigate();
  const { shop, subscriptionPlan } = useSellerAuth();
  const [billing, setBilling] = useState("monthly");

  /* Normalize plan ID — map old IDs to new ones */
  const rawPlan = (subscriptionPlan || shop?.planId || "basic").toLowerCase();
  const normalizedPlan = rawPlan === "free" || rawPlan === "" ? "basic"
    : rawPlan === "standard" ? "growth"
    : rawPlan;

  const currentPlan = PLANS.find(p => p.id === normalizedPlan) || PLANS[0];
  const currentIdx  = PLANS.findIndex(p => p.id === currentPlan.id);

  const nextBilling = shop?.nextBillingDate
    ? new Date(shop.nextBillingDate?.toMillis?.() || shop.nextBillingDate)
        .toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const card = {
    bg:    "var(--card, #fff)",
    text:  "var(--text, #111)",
    muted: "var(--muted, #6B7280)",
    soft:  "var(--bg, #F7F8FA)",
    border:"var(--border, rgba(0,0,0,0.08))",
  };

  return (
    <div style={{ fontFamily: "var(--font-main,'Nunito',sans-serif)" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: card.text, letterSpacing: "-0.03em" }}>
            Subscription
          </div>
          <div style={{ fontSize: 13, color: card.muted, fontWeight: 500, marginTop: 3 }}>
            Manage your plan and billing
          </div>
        </div>
        {currentPlan.id !== "pro" && (
          <button onClick={() => navigate("/store-plans")}
            style={{ padding: "10px 20px", background: "#046EF2", color: "#fff",
              border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(4,110,242,0.3)" }}>
            Upgrade Plan
          </button>
        )}
      </div>

      {/* Current plan card */}
      <div style={{ background: card.bg, borderRadius: 16, border: `1px solid ${card.border}`,
        padding: "20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
              textTransform: "uppercase", color: card.muted, marginBottom: 6 }}>
              Current Plan
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: currentPlan.color,
                letterSpacing: "-0.03em" }}>
                {currentPlan.name}
              </span>
              <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 800,
                background: `${currentPlan.color}18`, color: currentPlan.color }}>
                Active
              </span>
            </div>
            <div style={{ fontSize: 13, color: card.muted, fontWeight: 500, marginTop: 4 }}>
              {currentPlan.limit}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: card.text, letterSpacing: "-0.04em" }}>
              {currentPlan.price === 0 ? "Free" : `GHS ${currentPlan.price}`}
            </div>
            {currentPlan.price > 0 && (
              <div style={{ fontSize: 12, color: card.muted }}>/month</div>
            )}
          </div>
        </div>

        <InfoRow label="Plan"            value={currentPlan.name} highlight={currentPlan.color}/>
        <InfoRow label="Status"          value="Active"           highlight="#22C55E"/>
        <InfoRow label="Next billing"    value={nextBilling}/>
        <InfoRow label="Store"           value={shop?.shopName || "My Store"}/>
        <InfoRow label="Product limit"   value={currentPlan.limit}/>

        {currentPlan.id !== "pro" && (
          <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(4,110,242,0.06)",
            borderRadius: 10, border: "1px solid rgba(4,110,242,0.12)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#046EF2" }}>
                Unlock more with {PLANS[currentIdx + 1]?.name}
              </div>
              <div style={{ fontSize: 12, color: card.muted, marginTop: 2 }}>
                {PLANS[currentIdx + 1]?.limit} · contacts · boosts · verified badge
              </div>
            </div>
            <button onClick={() => navigate("/store-plans")}
              style={{ padding: "9px 16px", background: "#046EF2", color: "#fff",
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
              Upgrade →
            </button>
          </div>
        )}
      </div>

      {/* Billing toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: card.text }}>Compare Plans</div>
        <div style={{ display: "flex", background: "var(--bg,rgba(0,0,0,0.05))",
          borderRadius: 100, padding: 3, border: `1px solid ${card.border}` }}>
          {["monthly", "yearly"].map(b => (
            <button key={b} onClick={() => setBilling(b)}
              style={{ padding: "6px 14px", borderRadius: 100, border: "none",
                cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                transition: "all 0.15s",
                background: billing === b ? card.bg : "transparent",
                color: billing === b ? card.text : card.muted,
                boxShadow: billing === b ? "0 1px 6px rgba(0,0,0,0.1)" : "none" }}>
              {b === "yearly" ? "Yearly (−20%)" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      {/* Plan comparison cards — 2×2 grid on mobile */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 24 }}>
        {PLANS.map((plan, idx) => {
          const price    = billing === "yearly" ? plan.yearly : plan.price;
          const isCurrent = plan.id === currentPlan.id;
          const isUpgrade = idx > currentIdx;

          return (
            <div key={plan.id} style={{
              borderRadius: 14, padding: "16px 14px",
              border: `1.5px solid ${isCurrent ? plan.color : card.border}`,
              background: isCurrent ? `${plan.color}08` : card.bg,
              position: "relative",
              boxShadow: isCurrent ? `0 0 0 3px ${plan.color}20` : "none",
            }}>
              {/* Badge */}
              {(plan.popular && !isCurrent) && (
                <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                  background: "#111", color: "#fff", fontSize: 9, fontWeight: 800,
                  padding: "3px 9px", borderRadius: 100, whiteSpace: "nowrap", letterSpacing: "0.06em" }}>
                  POPULAR
                </div>
              )}
              {isCurrent && (
                <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                  background: plan.color, color: "#fff", fontSize: 9, fontWeight: 800,
                  padding: "3px 9px", borderRadius: 100, whiteSpace: "nowrap" }}>
                  CURRENT
                </div>
              )}

              {/* Plan name */}
              <div style={{ fontSize: 10, fontWeight: 800, color: plan.color,
                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                {plan.name}
              </div>

              {/* Price */}
              <div style={{ fontSize: 19, fontWeight: 900, color: card.text,
                letterSpacing: "-0.03em", marginBottom: 4 }}>
                {price === 0 ? "Free" : `GHS ${price}`}
                {price > 0 && <span style={{ fontSize: 10, fontWeight: 500, color: card.muted }}>/mo</span>}
              </div>

              {/* Limit pill */}
              <div style={{ fontSize: 10, fontWeight: 700, color: plan.color,
                background: `${plan.color}12`, padding: "2px 8px", borderRadius: 100,
                display: "inline-block", marginBottom: 10 }}>
                {plan.limit}
              </div>

              {/* Features */}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px",
                display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start",
                    gap: 6, fontSize: 11, fontWeight: 500, color: card.muted }}>
                    <Check color={plan.color}/>{f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {!isCurrent && (
                <button onClick={() => navigate("/store-plans")}
                  style={{ width: "100%", padding: "9px", borderRadius: 8,
                    border: `1.5px solid ${plan.color}`,
                    background: isUpgrade && plan.popular ? plan.color : "transparent",
                    color: isUpgrade && plan.popular ? "#fff" : plan.color,
                    fontSize: 11, fontWeight: 800, cursor: "pointer",
                    fontFamily: "inherit" }}>
                  {isUpgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Note about pro */}
      <div style={{ padding: "14px 16px", borderRadius: 10, background: card.soft,
        border: `1px solid ${card.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: card.text, marginBottom: 4 }}>
          One store per account
        </div>
        <div style={{ fontSize: 12, color: card.muted, lineHeight: 1.5 }}>
          Each Beme Market account is eligible for one store, regardless of the plan tier. Your plan controls how many products you can list and what features you can access.
        </div>
      </div>
    </div>
  );
}