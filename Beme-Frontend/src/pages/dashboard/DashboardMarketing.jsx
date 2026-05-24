import { useSellerAuth } from "../../hooks/useSellerAuth";
import { MARKETING_ICONS } from "../../components/icons/SellerIcons";
import TutorialOverlay from "../../components/ai/TutorialOverlay";
import { TUTORIAL_STEPS } from "../../components/ai/tutorialSteps";
import { useTutorial } from "../../hooks/useTutorial";

const TOOLS = [
  { id: "flash",    label: "Flash Sales",    desc: "Create time-limited sales with a countdown timer.",      plan: "standard" },
  { id: "discount", label: "Discount Codes", desc: "Generate discount codes for promotions.",                 plan: "standard" },
  { id: "boost",    label: "Product Boosts", desc: "Feature your products on the marketplace homepage.",      plan: "standard" },
  { id: "ai",       label: "AI Captions",    desc: "Generate marketing captions for your products with AI.", plan: "pro" },
  { id: "referral", label: "Referral System",desc: "Earn rewards for every new seller you refer.",            plan: "pro" },
  { id: "loyalty",  label: "Loyalty Rewards",desc: "Reward repeat customers with points.",                    plan: "pro" },
];

const PLAN_TIER = { basic: 0, standard: 1, pro: 2 };

const ICON_COLORS = {
  flash:    "#F59E0B",
  discount: "#046EF2",
  boost:    "#7C3AED",
  ai:       "#22C55E",
  referral: "#EF4444",
  loyalty:  "#EC4899",
};

export default function DashboardMarketing() {
  const { showTutorial, markSeen } = useTutorial("marketing");
  const { subscriptionPlan } = useSellerAuth();

  const canAccess = (plan) =>
    (PLAN_TIER[subscriptionPlan] || 0) >= (PLAN_TIER[plan] || 0);

  return (
    <div style={{ background: "#fff" }}>
      <div className="sd-page-head">
        <div className="sd-page-title">Marketing</div>
        <div className="sd-page-sub">Grow your store with promotional tools</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {TOOLS.map((t) => {
          const locked   = !canAccess(t.plan);
          const IconComp = MARKETING_ICONS[t.id];
          const iconColor = ICON_COLORS[t.id] || "#046EF2";

          return (
            <div
              key={t.id}
              className="sd-panel"
              style={{
                opacity: locked ? 0.6 : 1,
                position: "relative",
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              {locked && (
                <div style={{ position: "absolute", top: 12, right: 12 }}>
                  {/* Gray badge instead of purple for locked plans */}
                  <span style={{
                    fontSize: 10, fontWeight: 800,
                    padding: "3px 9px", borderRadius: 100,
                    background: "rgba(0,0,0,0.07)", color: "#6B7280",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}>
                    {t.plan.charAt(0).toUpperCase() + t.plan.slice(1)}+
                  </span>
                </div>
              )}

              {/* Icon in colored circle */}
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${iconColor}12`,
                border: `1px solid ${iconColor}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                <IconComp size={22} color={iconColor} />
              </div>

              <div className="sd-panel-title" style={{ marginBottom: 6 }}>{t.label}</div>
              <div style={{ fontSize: 13, color: "#8B8FA8", lineHeight: 1.5, marginBottom: 16 }}>
                {t.desc}
              </div>

              {/* Locked → ghost outline. Unlocked → black (not blue) */}
              <button
                className={`sd-btn sd-btn-sm ${locked ? "sd-btn-ghost" : ""}`}
                style={!locked ? {
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                } : {}}
                onClick={() =>
                  locked && alert(`This feature requires the ${t.plan} plan. Upgrade in the Subscription section.`)
                }
              >
                {locked ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Upgrade to Access
                  </>
                ) : "Configure →"}
              </button>
            </div>
          );
        })}
      </div>
    {showTutorial && (
      <TutorialOverlay
        steps={TUTORIAL_STEPS.marketing}
        onFinish={markSeen}
        pageTitle="Marketing"
      />
    )}
    </div>
  );
}