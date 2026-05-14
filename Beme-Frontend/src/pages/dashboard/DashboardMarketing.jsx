// ============================================================
// DashboardMarketing.jsx
// ============================================================
import { useState } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";

export function DashboardMarketing() {
  const { subscriptionPlan, planLimits } = useSellerAuth();
  const [activeSection, setActiveSection] = useState("flash");

  const tools = [
    { id: "flash",    icon: "⚡", label: "Flash Sales",    desc: "Create time-limited sales with a countdown timer.",     plan: "standard" },
    { id: "discount", icon: "🏷️", label: "Discount Codes",  desc: "Generate discount codes for promotions.",                plan: "standard" },
    { id: "boost",    icon: "🚀", label: "Product Boosts",  desc: "Feature your products on the marketplace homepage.",     plan: "standard" },
    { id: "ai",       icon: "🤖", label: "AI Captions",     desc: "Generate marketing captions for your products with AI.", plan: "pro" },
    { id: "referral", icon: "👥", label: "Referral System", desc: "Earn rewards for every new seller you refer.",           plan: "pro" },
    { id: "loyalty",  icon: "⭐", label: "Loyalty Rewards", desc: "Reward repeat customers with points.",                   plan: "pro" },
  ];

  const canAccess = (plan) => {
    const tiers = { basic: 0, standard: 1, pro: 2 };
    return (tiers[subscriptionPlan] || 0) >= (tiers[plan] || 0);
  };

  return (
    <div>
      <div className="sd-page-head">
        <div className="sd-page-title">Marketing</div>
        <div className="sd-page-sub">Grow your store with promotional tools</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {tools.map((t) => {
          const locked = !canAccess(t.plan);
          return (
            <div key={t.id} className="sd-panel" style={{ opacity: locked ? 0.6 : 1, cursor: locked ? "not-allowed" : "pointer", position: "relative" }}>
              {locked && (
                <div style={{ position: "absolute", top: 12, right: 12 }}>
                  <span className="sd-badge sd-badge-purple" style={{ fontSize: 10 }}>
                    {t.plan.charAt(0).toUpperCase() + t.plan.slice(1)}+
                  </span>
                </div>
              )}
              <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
              <div className="sd-panel-title" style={{ marginBottom: 6 }}>{t.label}</div>
              <div style={{ fontSize: 13, color: "#8B8FA8", lineHeight: 1.5, marginBottom: 14 }}>{t.desc}</div>
              <button className={`sd-btn ${locked ? "sd-btn-ghost" : "sd-btn-primary"} sd-btn-sm`}
                onClick={() => locked && alert(`This feature requires the ${t.plan} plan. Upgrade in the Subscription section.`)}>
                {locked ? "🔒 Upgrade to Access" : "Configure →"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DashboardMarketing;

