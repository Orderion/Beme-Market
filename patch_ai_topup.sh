#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let src = fs.readFileSync("Beme-Frontend/src/pages/dashboard/AIAssistant.jsx","utf8").replace(/\r\n/g,"\n");

// 1. Import useSellerAuth if not already there
if (!src.includes("useSellerAuth")) {
  src = src.replace(
    'import { useSubscription } from "../../hooks/useSubscription";',
    'import { useSubscription } from "../../hooks/useSubscription";\nimport { useSellerAuth } from "../../hooks/useSellerAuth";'
  );
}

// 2. Add subscriptionPlan to main component
src = src.replace(
  '  const { plan }          = useSubscription();',
  '  const { plan }          = useSubscription();\n  const { subscriptionPlan, planLimits } = useSellerAuth();'
);

// 3. Replace the broken TopupModal with real Paystack payment
const OLD_TOPUP_START = "const PACKS = [";
const OLD_TOPUP_END   = "}\nfunction TopupModal";
// Find and replace entire TopupModal
const topupStart = src.indexOf("/* ─── Topup modal ─── */");
const topupEnd   = src.indexOf("/* ════════════════════════════════════════\n   MAIN");
if (topupStart === -1 || topupEnd === -1) {
  console.log("❌ TopupModal boundaries not found");
  console.log("Looking for:", src.indexOf("Topup modal"), src.indexOf("MAIN"));
} else {
  const NEW_TOPUP = `/* ─── Topup modal ─── */
const PACKS = [
  { id:"small",          msgs:"50 messages",     price:"GHS 15", desc:"One-time top up" },
  { id:"medium",         msgs:"200 messages",    price:"GHS 45", desc:"Best value"      },
  { id:"unlimited_week", msgs:"7-day unlimited", price:"GHS 75", desc:"Power user"      },
];

function TopupModal({ onClose, plan }) {
  const { user }  = useAuth();
  const [busy,    setBusy]    = useState(null);
  const [error,   setError]   = useState("");
  const API = import.meta.env.VITE_BACKEND_URL || "https://beme-market-1.onrender.com";

  const canTopup = plan && plan !== "basic" && plan !== "free";

  const buy = async (id) => {
    if (!canTopup) return;
    setBusy(id); setError("");
    try {
      const token = await (await import("firebase/auth")).getAuth().currentUser.getIdToken(true);
      const res   = await fetch(\`\${API}/api/paystack/topup/init\`, {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:\`Bearer \${token}\` },
        body:    JSON.stringify({ pack: id }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        // Redirect to Paystack
        window.location.href = data.authorization_url;
      } else {
        setError(data.error || "Failed to initialize payment.");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(6px)" }}>
      <div style={{ background:"var(--sd-white)",borderRadius:20,padding:"26px 22px",width:"100%",maxWidth:360,border:"1px solid var(--sd-border)",boxShadow:"0 24px 64px rgba(0,0,0,0.18)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
          <div style={{ fontSize:16,fontWeight:800,color:"var(--sd-text)" }}>Top up messages</div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:22,color:"var(--sd-muted)",cursor:"pointer",lineHeight:1,padding:0 }}>×</button>
        </div>
        <div style={{ fontSize:12,color:"var(--sd-muted)",marginBottom:18 }}>Free messages reset daily. Purchase extra credits below.</div>

        {!canTopup ? (
          <div style={{ padding:"16px",borderRadius:12,background:"var(--sd-accent-dim)",border:"1px solid rgba(124,58,237,0.2)",textAlign:"center" }}>
            <div style={{ fontSize:14,fontWeight:700,color:"var(--sd-accent)",marginBottom:6 }}>Upgrade your plan</div>
            <div style={{ fontSize:13,color:"var(--sd-muted)",marginBottom:12 }}>AI features are available on Starter, Growth, and Pro plans.</div>
            <button onClick={onClose} style={{ padding:"8px 20px",borderRadius:9,background:"var(--sd-accent)",color:"#fff",border:"none",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
              View Plans
            </button>
          </div>
        ) : (
          <>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {PACKS.map(p => (
                <button key={p.id} onClick={() => buy(p.id)} disabled={!!busy}
                  style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"var(--sd-bg,var(--sd-white))",border:"1px solid var(--sd-border)",borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:"var(--sd-font)",opacity:busy?0.6:1 }}>
                  <div>
                    <div style={{ fontSize:14,fontWeight:700,color:"var(--sd-text)",marginBottom:2 }}>
                      {busy===p.id ? "Redirecting to payment…" : p.msgs}
                    </div>
                    <div style={{ fontSize:11,color:"var(--sd-muted)" }}>{p.desc}</div>
                  </div>
                  <div style={{ fontSize:13,fontWeight:800,color:"var(--sd-accent)",background:"var(--sd-accent-dim)",padding:"4px 10px",borderRadius:7,flexShrink:0 }}>{p.price}</div>
                </button>
              ))}
            </div>
            {error && <div style={{ marginTop:10,fontSize:12,color:"#ef4444",fontWeight:600 }}>{error}</div>}
            <div style={{ fontSize:11,color:"var(--sd-muted)",textAlign:"center",marginTop:14 }}>Secured by Paystack · Credits added after payment</div>
          </>
        )}
      </div>
    </div>
  );
}

`;
  src = src.slice(0, topupStart) + NEW_TOPUP + src.slice(topupEnd);
  console.log("✅ TopupModal replaced with real Paystack");
}

// 4. Pass subscriptionPlan to TopupModal
src = src.replace(
  '{showTopup && <TopupModal onClose={() => setShowTopup(false)}/>}',
  '{showTopup && <TopupModal onClose={() => setShowTopup(false)} plan={subscriptionPlan}/>}'
);

// 5. Show no-access state when plan has no AI
src = src.replace(
  '  const isEmpty   = !histLoading && messages.length === 0;',
  '  const isEmpty   = !histLoading && messages.length === 0;\n  const noAccess  = !planLimits?.hasAI && subscriptionPlan;'
);

// 6. Show upgrade prompt if no AI access
src = src.replace(
  "        {isEmpty ? (\n          /* ── Empty state ── */",
  `        {noAccess ? (
          <div className="ai-empty" style={{ paddingTop:40 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
            <div className="ai-empty-greeting" style={{ fontSize:18 }}>Beme AI is not available on your plan</div>
            <div className="ai-empty-hint">Upgrade to Starter, Growth, or Pro to access AI features including product descriptions, marketing copy, and store analytics.</div>
            <button className="ai-example-card" style={{ marginTop:16, padding:"12px 24px", borderRadius:12, background:"var(--sd-accent)", color:"#fff", border:"none", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}
              onClick={() => {}}>Upgrade Plan →</button>
          </div>
        ) : isEmpty ? (
          /* ── Empty state ── */`
);

// Close the noAccess ternary
src = src.replace(
  "        ) : (\n          /* ── Messages ── */",
  "        ) : (\n          /* ── Messages ── */"
);

fs.writeFileSync("Beme-Frontend/src/pages/dashboard/AIAssistant.jsx", src.replace(/\n/g,"\r\n"),"utf8");
const checks = [
  ["useSellerAuth",     src.includes("useSellerAuth")],
  ["real Paystack",     src.includes("topup/init")],
  ["plan passed",       src.includes("plan={subscriptionPlan}")],
  ["noAccess guard",    src.includes("noAccess")],
];
checks.forEach(([l,ok]) => console.log("  "+(ok?"✅":"❌")+" "+l));
NODEEOF
