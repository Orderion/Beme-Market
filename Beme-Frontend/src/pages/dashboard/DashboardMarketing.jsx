import { useSellerAuth } from "../../hooks/useSellerAuth";
import { MARKETING_ICONS } from "../../components/icons/SellerIcons";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";
import { incrementUsage } from "../../services/aiUsageService";

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
  discount: "#7c3aed",
  boost:    "#7C3AED",
  ai:       "#22C55E",
  referral: "#EF4444",
  loyalty:  "#EC4899",
};

export default function DashboardMarketing() {
  const { subscriptionPlan, storeId } = useSellerAuth();
  const { user } = useAuth();
  const [showCaption,   setShowCaption]   = useState(false);
  const [captionProduct,setCaptionProduct]= useState("");
  const [captionStyle,  setCaptionStyle]  = useState("instagram");
  const [generating,    setGenerating]    = useState(false);
  const [captions,      setCaptions]      = useState(null);

  const canAccess = (plan) =>
    (PLAN_TIER[subscriptionPlan] || 0) >= (PLAN_TIER[plan] || 0);

  const generateCaptions = async () => {
    if (!captionProduct.trim()) { alert("Enter a product name first."); return; }
    setGenerating(true); setCaptions(null);
    try {
      const platformMap = {
        instagram: "Instagram — natural, conversational, 1-2 emojis, 3-5 relevant hashtags at end, 150 chars max. No asterisks, no markdown.",
        tiktok:    "TikTok — punchy opening line, trendy but natural, 3-5 hashtags at end. No asterisks, no markdown.",
        whatsapp:  "WhatsApp Status — casual, friendly, sounds like a real person texting. Direct CTA. No hashtags, no asterisks, no markdown.",
        all:       "Instagram, TikTok, AND WhatsApp Status — 3 separate natural captions. No asterisks, no markdown, no explanations."
      };
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Write marketing captions for a Ghanaian seller on Beme Market.

Product: ${captionProduct}
Platform: ${platformMap[captionStyle]}

${captionStyle === "all" ? `Write 3 captions. Format exactly:
INSTAGRAM: [caption]
TIKTOK: [caption]
WHATSAPP: [caption]` : `Write 1 caption ready to post. Just the caption text, nothing else.`}` }],
          context: { currentPage: "marketing" }
        })
      });
      const data = await res.json();
      const text = data.content || "";
      // Count toward daily usage
      const { auth } = await import("../../firebase");
      const uid = auth?.currentUser?.uid;
      if (uid) incrementUsage(uid).catch(() => {});
      if (captionStyle === "all") {
        const ig = text.match(/INSTAGRAM:\s*([\s\S]*?)(?=TIKTOK:|$)/i)?.[1]?.trim();
        const tt = text.match(/TIKTOK:\s*([\s\S]*?)(?=WHATSAPP:|$)/i)?.[1]?.trim();
        const wa = text.match(/WHATSAPP:\s*([\s\S]*?)$/i)?.[1]?.trim();
        setCaptions({ instagram: ig, tiktok: tt, whatsapp: wa });
      } else {
        setCaptions({ [captionStyle]: text.trim() });
      }
    } catch (e) {
      console.error(e);
      alert("AI is temporarily unavailable. Please try again.");
    } finally { setGenerating(false); }
  };


  return (
    <div style={{ background: "#fff" }}>
      <div className="sd-page-head">
        <div className="sd-page-title">Marketing</div>
        <div className="sd-page-sub">Grow your store with promotional tools</div>
      </div>

      {/* AI Caption Generator */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e5e7eb", padding:"18px 20px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20 }}>✨</span>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"#111" }}>AI Caption Generator</div>
              <div style={{ fontSize:12, color:"#9ca3af", fontWeight:600 }}>Create ready-to-post captions for any product</div>
            </div>
          </div>
          {!canAccess("pro") && (
            <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20, background:"#f3f4f6", color:"#6b7280", border:"1px solid #e5e7eb" }}>PRO</span>
          )}
        </div>

        {canAccess("pro") ? (
          <div>
            <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
              <input value={captionProduct} onChange={e=>setCaptionProduct(e.target.value)}
                placeholder="Enter product name e.g. Ankara Mini Dress"
                style={{ flex:1, minWidth:200, height:40, padding:"0 12px", border:"1.5px solid #e5e7eb", borderRadius:9, fontSize:13, fontWeight:600, outline:"none", fontFamily:"Nunito,sans-serif", color:"#111", background:"#f8f9fb" }}
                onFocus={e=>{e.target.style.borderColor="#7c3aed";e.target.style.boxShadow="0 0 0 3px rgba(124,58,237,0.10)";}}
                onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";}}
                onKeyDown={e=>e.key==="Enter"&&generateCaptions()}
              />
              <select value={captionStyle} onChange={e=>setCaptionStyle(e.target.value)}
                style={{ height:40, padding:"0 12px", border:"1.5px solid #e5e7eb", borderRadius:9, fontSize:13, fontWeight:600, outline:"none", fontFamily:"Nunito,sans-serif", color:"#111", background:"#f8f9fb", cursor:"pointer" }}>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="all">All 3 platforms</option>
              </select>
              <button onClick={generateCaptions} disabled={generating || !captionProduct.trim()}
                style={{ height:40, padding:"0 18px", borderRadius:9, border:"none", background:generating||!captionProduct.trim()?"#f0f0f0":"#7c3aed", color:generating||!captionProduct.trim()?"#9ca3af":"#fff", fontSize:13, fontWeight:800, cursor:generating||!captionProduct.trim()?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, transition:"all 0.15s" }}>
                {generating ? <><div style={{ width:12,height:12,border:"2px solid currentColor",borderTopColor:"transparent",borderRadius:"50%",animation:"mkt-spin 0.8s linear infinite" }}/> Writing…</> : "✨ Generate"}
              </button>
            </div>

            {captions && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(captions).map(([platform, text]) => text && (
                  <div key={platform} style={{ background:"#f8f9fb", borderRadius:10, border:"1px solid #e5e7eb", padding:"12px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontSize:11, fontWeight:800, color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                        {platform === "instagram" ? "📸 Instagram" : platform === "tiktok" ? "📱 TikTok" : "💬 WhatsApp"}
                      </span>
                      <button onClick={() => { navigator.clipboard.writeText(text); }}
                        style={{ fontSize:11, fontWeight:700, color:"#6b7280", background:"#fff", border:"1px solid #e5e7eb", borderRadius:6, padding:"3px 8px", cursor:"pointer" }}>
                        Copy
                      </button>
                    </div>
                    <div style={{ fontSize:13, color:"#374151", lineHeight:1.6, fontWeight:600, whiteSpace:"pre-wrap" }}>{text}</div>
                  </div>
                ))}
                <button onClick={()=>{setCaptions(null);generateCaptions();}} style={{ alignSelf:"flex-start", fontSize:12, color:"#7c3aed", background:"none", border:"none", cursor:"pointer", fontWeight:700, padding:0 }}>↺ Regenerate</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize:13, color:"#9ca3af", fontWeight:600 }}>
            Upgrade to Pro to unlock the AI Caption Generator.
          </div>
        )}
      </div>

      <style>{`@keyframes mkt-spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {TOOLS.map((t) => {
          const locked   = !canAccess(t.plan);
          const IconComp = MARKETING_ICONS[t.id];
          const iconColor = ICON_COLORS[t.id] || "#7c3aed";

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
    </div>
  );
}