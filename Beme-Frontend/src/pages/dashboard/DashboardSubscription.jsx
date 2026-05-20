import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { initSubscriptionPayment, redirectToPaystack } from "../../services/subscriptionService";
import { useAuth } from "../../context/AuthContext";

// Updated prices: GHS 0 / 59 / 129 / 399
// Beme Delivery: Growth and Pro only
const PLANS = [
  {
    id: "basic", name: "Basic", price: 0, limit: "5 products",
    color: "#6B7280",
    features: ["5 products","Basic storefront","Order management","Basic analytics"],
    locked: ["Social links","Beme Delivery Support"],
  },
  {
    id: "starter", name: "Starter", price: 59, limit: "10 products",
    color: "#374151",
    features: ["10 products","WhatsApp & social links","Customer messaging","Order notifications","Store banner & logo"],
    locked: ["Beme Delivery Support"],
  },
  {
    id: "growth", name: "Growth", price: 129, limit: "25 products",
    color: "#111", popular: true,
    features: ["25 products","WhatsApp & social links","Beme Delivery Support","Flash sales & discount codes","Featured boosts (5/mo)","Verified badge eligible","Advanced analytics"],
    locked: [],
  },
  {
    id: "pro", name: "Pro", price: 399, limit: "500 products",
    color: "#111",
    features: ["500 products","All Growth features","Beme Delivery (discounted rates)","Custom domain","AI descriptions","20 boosts/month","Pro verified badge","Priority support","Homepage ranking boost"],
    locked: [],
  },
];

function Check({ on }) {
  if (!on) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"12px 0", borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
      <span style={{ fontSize:14, fontWeight:600, color:"#6B7280" }}>{label}</span>
      <span style={{ fontSize:14, fontWeight:800, color: highlight || "#111" }}>{value}</span>
    </div>
  );
}

export default function DashboardSubscription() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { appData, subscriptionPlan, shop } = useSellerAuth();

  const rawPlan  = appData?.planId || subscriptionPlan || shop?.planId || "basic";
  const planId   = String(rawPlan).toLowerCase();
  const planName = planId.charAt(0).toUpperCase() + planId.slice(1);
  const current  = PLANS.find(p => p.id === planId) || PLANS[0];

  const [initiating, setInitiating] = useState(null);
  const [err,        setErr]        = useState("");

  const handleUpgrade = async (plan) => {
    if (plan.price === 0) return;
    if (!user?.email) { setErr("Sign in to upgrade."); return; }
    setErr(""); setInitiating(plan.id);
    try {
      const res = await initSubscriptionPayment({
        planId: plan.id,
        uid: user.uid,
        email: user.email,
        shopId: shop?.id || user.uid,
      });
      if (res?.isFree) {
        navigate("/subscription-success?plan=" + plan.id);
      } else if (res?.authorization_url) {
        redirectToPaystack(res.authorization_url);
      }
    } catch (e) {
      setErr(e.message || "Payment initiation failed.");
    } finally {
      setInitiating(null);
    }
  };

  return (
    <div style={{ fontFamily:"var(--font-main,'Nunito',sans-serif)", background:"#fff" }}>

      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:22, fontWeight:900, color:"#111", letterSpacing:"-0.03em", marginBottom:4 }}>
          Subscription
        </div>
        <div style={{ fontSize:13, color:"#9CA3AF" }}>
          Manage your plan. Upgrade to unlock more products, Beme Delivery and advanced features.
        </div>
      </div>

      {/* Current plan card */}
      <div style={{ background:"#fff", borderRadius:16, border:"1px solid rgba(0,0,0,0.08)",
        padding:"20px 20px", marginBottom:20 }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase",
          letterSpacing:"0.08em", marginBottom:12 }}>
          Your current plan
        </div>
        <InfoRow label="Plan"     value={planName} />
        <InfoRow label="Price"    value={current.price === 0 ? "Free" : `GHS ${current.price}/month`} />
        <InfoRow label="Products" value={current.limit} />
        <InfoRow label="Beme Delivery" value={["growth","pro"].includes(planId) ? "✅ Included" : "🔒 Growth+ only"} highlight={["growth","pro"].includes(planId) ? "#22C55E" : "#9CA3AF"} />
        <InfoRow label="Social links"  value={planId === "basic" ? "🔒 Locked" : "✅ Included"} highlight={planId === "basic" ? "#9CA3AF" : "#22C55E"} />
      </div>

      {err && (
        <div style={{ padding:"10px 14px", borderRadius:10, marginBottom:16,
          background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
          color:"#991b1b", fontSize:13 }}>
          {err}
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
        {PLANS.map(plan => {
          const isCurrent = plan.id === planId;
          const isLower   = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === planId);
          return (
            <div key={plan.id} style={{
              background:"#fff", borderRadius:16,
              border: isCurrent ? "2.5px solid #111" : "1.5px solid rgba(0,0,0,0.09)",
              padding:"20px 18px", position:"relative",
              boxShadow: isCurrent ? "0 4px 20px rgba(0,0,0,0.1)" : "none",
            }}>
              {plan.popular && !isCurrent && (
                <div style={{ position:"absolute", top:-10, right:14,
                  background:"#111", color:"#fff", fontSize:10, fontWeight:900,
                  padding:"3px 10px", borderRadius:100, letterSpacing:"0.06em" }}>
                  POPULAR
                </div>
              )}
              {isCurrent && (
                <div style={{ position:"absolute", top:-10, left:14,
                  background:"#22C55E", color:"#fff", fontSize:10, fontWeight:900,
                  padding:"3px 10px", borderRadius:100 }}>
                  CURRENT
                </div>
              )}

              {/* Plan name + price */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:17, fontWeight:900, color:"#111", marginBottom:4 }}>
                  {plan.name}
                </div>
                <div style={{ fontSize:28, fontWeight:900, color:"#111", letterSpacing:"-0.04em", lineHeight:1 }}>
                  {plan.price === 0 ? "Free" : `GHS ${plan.price}`}
                  {plan.price > 0 && <span style={{ fontSize:13, fontWeight:600, color:"#9CA3AF" }}>/mo</span>}
                </div>
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:4 }}>{plan.limit}</div>
              </div>

              {/* Features */}
              <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:16 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#374151" }}>
                    <Check on={true}/>{f}
                  </div>
                ))}
                {plan.locked.map((f, i) => (
                  <div key={"l"+i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#9CA3AF" }}>
                    <Check on={false}/>{f}
                  </div>
                ))}
              </div>

              {/* CTA */}
              {isCurrent ? (
                <div style={{ padding:"11px 0", textAlign:"center", fontSize:13, fontWeight:700, color:"#6B7280" }}>
                  ✓ Active plan
                </div>
              ) : isLower ? (
                <div style={{ padding:"11px 0", textAlign:"center", fontSize:12, color:"#9CA3AF" }}>
                  Downgrade available via support
                </div>
              ) : (
                <button type="button" onClick={() => handleUpgrade(plan)}
                  disabled={!!initiating}
                  style={{ width:"100%", padding:"12px 0", borderRadius:10, border:"none",
                    background:"#111", color:"#fff", fontSize:14, fontWeight:800,
                    cursor: initiating ? "not-allowed" : "pointer", opacity: initiating ? 0.7 : 1,
                    fontFamily:"inherit", boxShadow:"0 4px 14px rgba(0,0,0,0.15)" }}>
                  {initiating === plan.id ? "Processing…" : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div style={{ marginTop:24, background:"#fff", borderRadius:16, border:"1px solid rgba(0,0,0,0.08)", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#111" }}>Feature comparison</div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:480 }}>
            <thead>
              <tr style={{ background:"#fafafa" }}>
                <th style={{ padding:"12px 20px", textAlign:"left", fontSize:12, fontWeight:700, color:"#6B7280", borderBottom:"1px solid rgba(0,0,0,0.06)" }}>Feature</th>
                {PLANS.map(p => (
                  <th key={p.id} style={{ padding:"12px 14px", textAlign:"center", fontSize:12, fontWeight:700,
                    color: p.id === planId ? "#111" : "#6B7280",
                    borderBottom:"1px solid rgba(0,0,0,0.06)",
                    background: p.id === planId ? "rgba(0,0,0,0.03)" : "transparent" }}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Price",              ["Free","GHS 59/mo","GHS 129/mo","GHS 399/mo"], null],
                ["Products",           ["5","10","25","500"], null],
                ["Social links",       [false,true,true,true], "bool"],
                ["Beme Delivery",      [false,false,true,true], "bool"],
                ["Verified badge",     [false,false,true,true], "bool"],
                ["Featured boosts",    ["—","—","5/mo","20/mo"], null],
                ["Advanced analytics", [false,false,true,true], "bool"],
                ["Priority support",   [false,false,false,true], "bool"],
              ].map(([label, vals, type], ri) => (
                <tr key={ri} style={{ borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                  <td style={{ padding:"11px 20px", fontSize:13, fontWeight:600, color:"#374151" }}>{label}</td>
                  {vals.map((v, ci) => (
                    <td key={ci} style={{ padding:"11px 14px", textAlign:"center",
                      background: PLANS[ci].id === planId ? "rgba(0,0,0,0.02)" : "transparent" }}>
                      {type === "bool"
                        ? <Check on={v}/>
                        : <span style={{ fontSize:13, fontWeight:700, color:"#111" }}>{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}