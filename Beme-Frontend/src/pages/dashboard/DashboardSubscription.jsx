import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { useSellerAuth }       from "../../hooks/useSellerAuth";
import { useAuth }             from "../../context/AuthContext";
import {
  initSubscriptionPayment,
  redirectToPaystack,
  getSubscriptionStatus,
} from "../../services/subscriptionService";

/* ── Pricing ── */
const MONTHLY  = { basic:0,   starter:59,   growth:129,  pro:399  };
const YEARLY   = { basic:0,   starter:588,  growth:1284, pro:3972 };
const YEARLY_PM= { basic:0,   starter:49,   growth:107,  pro:331  };

const PLANS = [
  {
    id:"basic", name:"Basic", tagline:"Get started for free", limit:"5 products", color:"#6B7280",
    features:[
      { t:"5 product listings",           on:true  },
      { t:"Basic storefront page",         on:true  },
      { t:"Paystack payment processing",   on:true  },
      { t:"Order management",              on:true  },
      { t:"Basic store analytics",         on:true  },
      { t:"Customer messaging",            on:false },
      { t:"WhatsApp & social links",       on:false },
      { t:"Store banner & logo",           on:false },
      { t:"AI auto-replies",               on:false },
      { t:"Beme Delivery Support",         on:false, note:"Growth+" },
      { t:"Analytics Pro",                 on:false },
    ],
  },
  {
    id:"starter", name:"Starter", tagline:"For growing sellers", limit:"10 products", color:"#046EF2",
    features:[
      { t:"10 product listings",           on:true  },
      { t:"Full storefront page",           on:true  },
      { t:"Paystack payment processing",   on:true  },
      { t:"Order management",              on:true  },
      { t:"Customer messaging",            on:true  },
      { t:"WhatsApp & social links",       on:true  },
      { t:"Store banner & logo",           on:true  },
      { t:"1,000 AI auto-replies/day",     on:true  },
      { t:"Order notifications",           on:true  },
      { t:"Beme Delivery Support",         on:false, note:"Growth+" },
      { t:"Analytics Pro",                 on:false },
    ],
  },
  {
    id:"growth", name:"Growth", tagline:"For serious sellers", limit:"25 products",
    color:"#6366F1", popular:true,
    features:[
      { t:"25 product listings",           on:true  },
      { t:"Everything in Starter",         on:true  },
      { t:"Beme Delivery Support",         on:true  },
      { t:"Flash sales & discount codes",  on:true  },
      { t:"Featured boosts (5/month)",     on:true  },
      { t:"Verified badge eligible",       on:true  },
      { t:"Analytics Pro dashboard",       on:true  },
      { t:"20,000 AI auto-replies/day",    on:true  },
      { t:"Priority customer support",     on:false },
      { t:"Custom domain",                 on:false },
    ],
  },
  {
    id:"pro", name:"Pro", tagline:"For power sellers", limit:"500 products", color:"#7C3AED",
    features:[
      { t:"500 product listings",          on:true  },
      { t:"Everything in Growth",          on:true  },
      { t:"Beme Delivery (discounted)",    on:true  },
      { t:"Custom domain",                 on:true  },
      { t:"AI product descriptions",       on:true  },
      { t:"20 featured boosts/month",      on:true  },
      { t:"Pro verified badge",            on:true  },
      { t:"Unlimited AI auto-replies",     on:true  },
      { t:"Priority support (24h)",        on:true  },
      { t:"Early access to new features",  on:true  },
    ],
  },
];

const TABLE_ROWS = [
  ["Products",            ["5","10","25","500"]],
  ["Price/month",         ["Free","GHS 59","GHS 129","GHS 399"]],
  ["Storefront",          [true,true,true,true]],
  ["Customer messaging",  [false,true,true,true]],
  ["Social links",        [false,true,true,true]],
  ["AI auto-replies",     ["—","1K/day","20K/day","Unlimited"]],
  ["Beme Delivery",       [false,false,true,true]],
  ["Flash sales",         [false,false,true,true]],
  ["Featured boosts",     ["—","—","5/mo","20/mo"]],
  ["Analytics Pro",       [false,false,true,true]],
  ["Verified badge",      [false,false,true,true]],
  ["Custom domain",       [false,false,false,true]],
  ["Priority support",    [false,false,false,true]],
];

function Chk({ on, color="#22C55E" }) {
  if (on === false) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
  if (on === true) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  return <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{on}</span>;
}

function InfoPill({ label, value, color }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"11px 0",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
      <span style={{fontSize:13,fontWeight:600,color:"#6B7280"}}>{label}</span>
      <span style={{fontSize:13,fontWeight:800,color:color||"#111"}}>{value}</span>
    </div>
  );
}

export default function DashboardSubscription() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { appData, subscriptionPlan, shop } = useSellerAuth();

  const rawPlan   = (appData?.planId || subscriptionPlan || shop?.planId || "basic").toLowerCase();
  const planName  = rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1);
  const curIdx    = PLANS.findIndex(p => p.id === rawPlan);

  const [billing,    setBilling]    = useState("monthly");
  const [initiating, setInitiating] = useState(null);
  const [err,        setErr]        = useState("");
  const [subData,    setSubData]    = useState(null);
  const isYearly = billing === "yearly";

  const getPrice   = id => isYearly ? YEARLY[id]    : MONTHLY[id];
  const getPerMonth= id => isYearly ? YEARLY_PM[id] : MONTHLY[id];

  /* Load subscription data */
  useEffect(() => {
    if (!user?.uid) return;
    getSubscriptionStatus(user.uid).then(d => setSubData(d)).catch(()=>{});
  }, [user?.uid]);

  const handleUpgrade = async (plan) => {
    if (!user?.email) { setErr("Please sign in to upgrade."); return; }
    if (plan.id === rawPlan) return;
    if (plan.id === "basic") return;
    setErr(""); setInitiating(plan.id);
    try {
      const res = await initSubscriptionPayment({
        planId: plan.id, uid: user.uid,
        email: user.email, shopId: shop?.id || user.uid,
        billing, amount: getPrice(plan.id),
      });
      if (res?.isFree)               navigate("/subscription/success?plan=" + plan.id);
      else if (res?.authorization_url) redirectToPaystack(res.authorization_url);
    } catch (e) { setErr(e.message || "Payment initiation failed."); }
    finally { setInitiating(null); }
  };

  const expiresStr = subData?.expiresAt
    ? (subData.expiresAt?.toDate ? subData.expiresAt.toDate() : new Date(subData.expiresAt))
        .toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" })
    : null;

  return (
    <div style={{fontFamily:"var(--font-main,'Nunito',sans-serif)"}}>

      {/* ── Header ── */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:22,fontWeight:900,color:"#111",letterSpacing:"-0.03em",marginBottom:4}}>
          Subscription
        </div>
        <div style={{fontSize:13,color:"#9CA3AF",fontWeight:500}}>
          Manage your plan · Upgrade to unlock products, Beme Delivery, AI features and more.
        </div>
      </div>

      {/* ── Current plan status card ── */}
      <div style={{background:"#fff",borderRadius:16,border:"1px solid rgba(0,0,0,0.08)",
        padding:"20px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.08em"}}>
            Current Plan
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 12px",
            borderRadius:20,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#22C55E"}}/>
            <span style={{fontSize:12,fontWeight:700,color:"#15803d"}}>Active</span>
          </div>
        </div>
        <InfoPill label="Plan"          value={`${planName} Plan`} color="#111"/>
        <InfoPill label="Price"         value={MONTHLY[rawPlan]===0 ? "Free" : `GHS ${MONTHLY[rawPlan]}/month`}/>
        <InfoPill label="Product limit" value={PLANS.find(p=>p.id===rawPlan)?.limit||"5 products"}/>
        <InfoPill label="Billing"       value={subData?.billing ? subData.billing.charAt(0).toUpperCase()+subData.billing.slice(1) : "Monthly"}/>
        {expiresStr && <InfoPill label="Renews on" value={expiresStr} color="#046EF2"/>}
        <InfoPill label="Beme Delivery"  value={["growth","pro"].includes(rawPlan) ? "✅ Included" : "🔒 Growth+ only"}
          color={["growth","pro"].includes(rawPlan) ? "#15803d" : "#9CA3AF"}/>
        <InfoPill label="Analytics Pro"  value={["growth","pro"].includes(rawPlan) ? "✅ Included" : "🔒 Growth+ only"}
          color={["growth","pro"].includes(rawPlan) ? "#15803d" : "#9CA3AF"}/>
        <InfoPill label="AI Auto-replies" value={rawPlan==="basic"?"🔒 Locked":rawPlan==="starter"?"1,000/day":rawPlan==="growth"?"20,000/day":"Unlimited"}
          color={rawPlan==="basic"?"#9CA3AF":"#15803d"}/>
      </div>

      {err && (
        <div style={{padding:"10px 14px",borderRadius:10,marginBottom:16,
          background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",
          color:"#991b1b",fontSize:13,fontWeight:600}}>
          {err}
        </div>
      )}

      {/* ── Billing toggle ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:20}}>
        <div style={{display:"inline-flex",background:"#f1f3f5",borderRadius:14,padding:4,gap:2}}>
          {[{k:"monthly",l:"Monthly"},{k:"yearly",l:"Yearly"}].map(b => (
            <button key={b.k} onClick={()=>setBilling(b.k)}
              style={{padding:"9px 22px",borderRadius:10,border:"none",fontFamily:"inherit",
                fontSize:14,fontWeight:700,cursor:"pointer",transition:"all 0.2s",
                display:"flex",alignItems:"center",gap:8,
                background:billing===b.k?"#fff":"transparent",
                color:billing===b.k?"#111":"#9ca3af",
                boxShadow:billing===b.k?"0 2px 10px rgba(0,0,0,0.10)":"none"}}>
              {b.l}
              {b.k==="yearly" && (
                <span style={{fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:20,
                  background:"linear-gradient(135deg,#046EF2,#7C3AED)",color:"#fff",
                  animation: billing==="yearly" ? "badge-pop 0.3s ease" : "none"}}>
                  Save 17%
                </span>
              )}
            </button>
          ))}
        </div>
        {isYearly && (
          <span style={{fontSize:13,color:"#046EF2",fontWeight:700}}>
            Billed annually · Pay once, save all year
          </span>
        )}
      </div>

      {/* ── Plan cards ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14,marginBottom:24}}>
        {PLANS.map(plan => {
          const isCurrent  = plan.id === rawPlan;
          const planIdx    = PLANS.findIndex(p=>p.id===plan.id);
          const isDowngrade= planIdx < curIdx;
          const price      = getPrice(plan.id);
          const perMonth   = getPerMonth(plan.id);

          return (
            <div key={plan.id} style={{
              background:"#fff", borderRadius:18, padding:"22px 18px",
              position:"relative", display:"flex", flexDirection:"column",
              border: isCurrent
                ? "2px solid #046EF2"
                : plan.popular
                  ? "2px solid transparent"
                  : "1.5px solid rgba(0,0,0,0.08)",
              boxShadow: isCurrent ? "0 0 0 4px rgba(4,110,242,0.10)" : "0 2px 12px rgba(0,0,0,0.05)",
              background: plan.popular && !isCurrent
                ? "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#046EF2,#6366F1,#7C3AED) border-box"
                : "#fff",
            }}>
              {plan.popular && !isCurrent && (
                <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",
                  background:"linear-gradient(135deg,#046EF2,#7C3AED)",color:"#fff",
                  fontSize:10,fontWeight:800,padding:"4px 12px",borderRadius:100,whiteSpace:"nowrap"}}>
                  ⭐ Most Popular
                </div>
              )}
              {isCurrent && (
                <div style={{position:"absolute",top:-12,left:14,
                  background:"#046EF2",color:"#fff",fontSize:10,fontWeight:800,
                  padding:"4px 12px",borderRadius:100}}>
                  Your Plan
                </div>
              )}

              {/* Plan header */}
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:plan.color,flexShrink:0}}/>
                  <div style={{fontSize:15,fontWeight:900,color:plan.color}}>{plan.name}</div>
                </div>
                <div style={{fontSize:11,color:"#9ca3af",fontWeight:500,marginBottom:12}}>{plan.tagline}</div>

                {price === 0
                  ? <div style={{fontSize:30,fontWeight:900,color:"#111",letterSpacing:"-0.04em",lineHeight:1}}>Free</div>
                  : <div style={{display:"flex",alignItems:"baseline",gap:2}}>
                      <span style={{fontSize:13,fontWeight:700,color:"#9ca3af"}}>GHS</span>
                      <span style={{fontSize:30,fontWeight:900,color:"#111",letterSpacing:"-0.04em",lineHeight:1}}>{perMonth}</span>
                      <span style={{fontSize:12,color:"#9ca3af",fontWeight:500}}>/mo</span>
                    </div>
                }
                {isYearly && price > 0 && (
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>
                    GHS {YEARLY[plan.id].toLocaleString()} billed yearly
                  </div>
                )}
                <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",
                  letterSpacing:"0.06em",marginTop:8,paddingTop:8,borderTop:"1px solid rgba(0,0,0,0.06)"}}>
                  {plan.limit}
                </div>
              </div>

              {/* Features */}
              <div style={{display:"flex",flexDirection:"column",gap:8,flex:1,marginBottom:16}}>
                {plan.features.map((f,i) => (
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,
                    fontSize:12,fontWeight:600,color:f.on?"#374151":"#9ca3af",lineHeight:1.4}}>
                    <Chk on={f.on} color={plan.color}/>
                    <span>{f.t}</span>
                    {f.note && !f.on && (
                      <span style={{fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:4,
                        background:"#f5f7fa",color:"#9ca3af",whiteSpace:"nowrap",marginLeft:"auto"}}>
                        {f.note}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* CTA */}
              {isCurrent ? (
                <div style={{padding:"11px",textAlign:"center",fontSize:13,fontWeight:700,
                  color:"#046EF2",background:"rgba(4,110,242,0.06)",borderRadius:10}}>
                  ✓ Current Plan
                </div>
              ) : isDowngrade ? (
                <div style={{padding:"11px",textAlign:"center",fontSize:11,color:"#9ca3af",
                  background:"#f5f7fa",borderRadius:10,fontWeight:600}}>
                  Contact support to downgrade
                </div>
              ) : (
                <button type="button" onClick={()=>handleUpgrade(plan)} disabled={!!initiating}
                  style={{width:"100%",padding:"12px",borderRadius:10,border:"none",
                    background:"#046EF2",color:"#fff",fontSize:13,fontWeight:800,
                    cursor:initiating?"not-allowed":"pointer",fontFamily:"inherit",
                    opacity:initiating?0.7:1,
                    boxShadow:"0 4px 14px rgba(4,110,242,0.35)",transition:"opacity 0.15s"}}>
                  {initiating===plan.id ? "Processing…"
                    : price===0 ? "Get started free"
                    : `Choose ${plan.name} →`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Full feature comparison table ── */}
      <div style={{background:"#fff",borderRadius:16,border:"1px solid rgba(0,0,0,0.08)",overflow:"hidden",marginBottom:24}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
          <div style={{fontSize:15,fontWeight:800,color:"#111"}}>Full Feature Comparison</div>
          <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>Every feature across all plans</div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
            <thead>
              <tr style={{background:"#fafafa"}}>
                <th style={{padding:"12px 20px",textAlign:"left",fontSize:12,fontWeight:700,
                  color:"#6B7280",borderBottom:"1px solid rgba(0,0,0,0.06)",minWidth:160}}>Feature</th>
                {PLANS.map(p => (
                  <th key={p.id} style={{padding:"12px 14px",textAlign:"center",fontSize:12,fontWeight:800,
                    color:p.id===rawPlan?"#046EF2":"#6B7280",
                    borderBottom:"1px solid rgba(0,0,0,0.06)",
                    background:p.id===rawPlan?"rgba(4,110,242,0.04)":"transparent"}}>
                    {p.name}
                    {p.id===rawPlan && <div style={{fontSize:9,color:"#046EF2",fontWeight:700}}>YOUR PLAN</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map(([label,vals],ri) => (
                <tr key={ri} style={{borderBottom:"1px solid rgba(0,0,0,0.04)"}}>
                  <td style={{padding:"10px 20px",fontSize:13,fontWeight:600,color:"#374151"}}>{label}</td>
                  {vals.map((v,ci) => (
                    <td key={ci} style={{padding:"10px 14px",textAlign:"center",
                      background:PLANS[ci].id===rawPlan?"rgba(4,110,242,0.02)":"transparent"}}>
                      {typeof v === "boolean"
                        ? <div style={{display:"flex",justifyContent:"center"}}><Chk on={v} color={PLANS[ci].color}/></div>
                        : <span style={{fontSize:13,fontWeight:700,color:"#111"}}>{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Delivery callout ── */}
      <div style={{background:"#fff",borderRadius:16,border:"1px solid rgba(0,0,0,0.08)",
        padding:"20px 24px",display:"flex",alignItems:"flex-start",gap:16}}>
        <div style={{fontSize:28,flexShrink:0}}>📦</div>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:"#111",marginBottom:4}}>
            Beme Delivery Support — Growth & Pro
          </div>
          <div style={{fontSize:13,color:"#6b7280",fontWeight:500,lineHeight:1.6}}>
            Upgrade to Growth or Pro to access Beme's courier network. We coordinate pickup
            and delivery so you focus on selling. Pro sellers get discounted delivery rates.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes badge-pop {
          from { transform:scale(0.6); opacity:0; }
          to   { transform:scale(1);   opacity:1; }
        }
      `}</style>
    </div>
  );
}
