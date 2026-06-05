/**
 * DashboardMarketing.jsx — Updated
 * ─────────────────────────────────────────────────────────────
 * Existing logic preserved 100%:
 *   - PLAN_TIER gate (canAccess)
 *   - AI Caption Generator (all logic untouched)
 *   - TOOLS array + ICON_COLORS
 *   - All CSS styles
 *
 * New additions:
 *   - useMarketing() hook provides all 6 feature data + actions
 *   - useSellerProducts() loads products for Flash Sale + Boost pickers
 *   - "Configure →" now opens the matching panel instead of nothing
 *   - view state controls panel routing
 */

import { useSellerAuth }     from "../../hooks/useSellerAuth";
import { useAuth }           from "../../context/AuthContext";
import { useMarketing }      from "../../hooks/useMarketing";
import { MARKETING_ICONS }   from "../../components/icons/SellerIcons";
import { useState, useEffect } from "react";
import { incrementUsage }    from "../../services/aiUsageService";
import { getSellerProducts } from "../../services/storeService";

// Panel components (lazy via dynamic import would also work — keeping it simple)
import FlashSalePanel      from "./marketing/FlashSalePanel";
import DiscountCodePanel   from "./marketing/DiscountCodePanel";
import ProductBoostPanel   from "./marketing/ProductBoostPanel";
import ReferralPanel       from "./marketing/ReferralPanel";
import LoyaltyRewardsPanel from "./marketing/LoyaltyRewardsPanel";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

// ── EXISTING CONSTANTS — unchanged ──────────────────────────
const TOOLS = [
  { id: "flash",    label: "Flash Sales",     desc: "Create time-limited sales with a countdown timer.",      plan: "starter" },
  { id: "discount", label: "Discount Codes",  desc: "Generate discount codes for promotions.",                plan: "starter" },
  { id: "boost",    label: "Product Boosts",  desc: "Feature your products on the marketplace homepage.",     plan: "starter" },
  { id: "ai",       label: "AI Captions",     desc: "Generate marketing captions for your products with AI.", plan: "pro" },
  { id: "referral", label: "Referral System", desc: "Earn rewards for every new seller you refer.",           plan: "pro" },
  { id: "loyalty",  label: "Loyalty Rewards", desc: "Reward repeat customers with points.",                   plan: "pro" },
];

const PLAN_TIER  = { basic: 0, free: 0, starter: 1, standard: 2, growth: 2, pro: 3 };
const ICON_COLORS = {
  flash:    "#F59E0B",
  discount: "#7c3aed",
  boost:    "#7C3AED",
  ai:       "#22C55E",
  referral: "#EF4444",
  loyalty:  "#EC4899",
};

// Panel ID → component mapping (ai is handled inline)
const PANEL_IDS = ["flash", "discount", "boost", "referral", "loyalty"];

export default function DashboardMarketing() {
  const { subscriptionPlan, storeId, user: sellerUser } = useSellerAuth();
  const { user } = useAuth();

  // ── AI Caption state — UNTOUCHED ────────────────────────
  const [captionProduct, setCaptionProduct] = useState("");
  const [captionStyle,   setCaptionStyle]   = useState("instagram");
  const [generating,     setGenerating]     = useState(false);
  const [captions,       setCaptions]       = useState(null);

  // ── New: panel navigation ────────────────────────────────
  const [activePanel, setActivePanel] = useState(null); // null | "flash" | "discount" | "boost" | "referral" | "loyalty"

  // ── New: seller products (for Flash Sale + Boost pickers) ─
  const [products, setProducts]       = useState([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Load products once when a panel that needs them is opened
  useEffect(() => {
    if (!user?.uid || productsLoaded) return;
    if (activePanel === "flash" || activePanel === "boost") {
      getSellerProducts(user.uid, storeId)
        .then((p) => { setProducts(p); setProductsLoaded(true); })
        .catch(() => setProductsLoaded(true));
    }
  }, [activePanel, user?.uid, storeId, productsLoaded]);

  // ── Marketing hook — all 6 features ─────────────────────
  const mkt = useMarketing();

  // ── EXISTING: plan gate ──────────────────────────────────
  const canAccess = (plan) =>
    (PLAN_TIER[subscriptionPlan] || 0) >= (PLAN_TIER[plan] || 0);

  // ── EXISTING: AI Caption generator — 100% unchanged ──────
  const generateCaptions = async () => {
    if (!captionProduct.trim()) { alert("Enter a product name first."); return; }
    setGenerating(true); setCaptions(null);
    try {
      const platformMap = {
        instagram: "Instagram — natural, conversational, 1-2 emojis, 3-5 relevant hashtags at end, 150 chars max. No asterisks, no markdown.",
        tiktok:    "TikTok — punchy opening line, trendy but natural, 3-5 hashtags at end. No asterisks, no markdown.",
        whatsapp:  "WhatsApp Status — casual, friendly, sounds like a real person texting. Direct CTA. No hashtags, no asterisks, no markdown.",
        all:       "Instagram, TikTok, AND WhatsApp Status — 3 separate natural captions. No asterisks, no markdown, no explanations.",
      };
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Write marketing captions for a Ghanaian seller on Beme Market.\n\nProduct: ${captionProduct}\nPlatform: ${platformMap[captionStyle]}\n\n${captionStyle === "all" ? `Write 3 captions. Format exactly:\nINSTAGRAM: [caption]\nTIKTOK: [caption]\nWHATSAPP: [caption]` : `Write 1 caption ready to post. Just the caption text, nothing else.`}` }],
          context: { currentPage: "marketing" },
        }),
      });
      const data = await res.json();
      const text = data.content || "";
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

  // ── Panel routing ────────────────────────────────────────
  const handleConfigure = (toolId) => {
    if (toolId === "ai") return; // AI is inline, no panel
    setActivePanel(toolId);
  };

  // ── Render active panel ──────────────────────────────────
  if (activePanel === "flash") {
    return (
      <div className="mkt-root">
        <FlashSalePanel
          onBack={() => setActivePanel(null)}
          products={products}
          flashSales={mkt.flashSales}
          activeSales={mkt.activeSales}
          flashLoading={mkt.flashLoading}
          createSale={mkt.createSale}
          endSale={mkt.endSale}
          removeSale={mkt.removeSale}
          submitting={mkt.submitting}
        />
        <style>{BASE_STYLES}</style>
      </div>
    );
  }

  if (activePanel === "discount") {
    return (
      <div className="mkt-root">
        <DiscountCodePanel
          onBack={() => setActivePanel(null)}
          discountCodes={mkt.discountCodes}
          codesLoading={mkt.codesLoading}
          createCode={mkt.createCode}
          toggleCode={mkt.toggleCode}
          removeCode={mkt.removeCode}
          submitting={mkt.submitting}
        />
        <style>{BASE_STYLES}</style>
      </div>
    );
  }

  if (activePanel === "boost") {
    return (
      <div className="mkt-root">
        <ProductBoostPanel
          onBack={() => setActivePanel(null)}
          products={products}
          boosts={mkt.boosts}
          activeBoosts={mkt.activeBoosts}
          boostsLoading={mkt.boostsLoading}
          startBoostPayment={mkt.startBoostPayment}
          refreshBoosts={mkt.refreshBoosts}
          submitting={mkt.submitting}
        />
        <style>{BASE_STYLES}</style>
      </div>
    );
  }

  if (activePanel === "referral") {
    return (
      <div className="mkt-root">
        <ReferralPanel
          onBack={() => setActivePanel(null)}
          referrals={mkt.referrals}
          referralCode={mkt.referralCode}
          referralLink={mkt.referralLink}
          referralsLoading={mkt.referralsLoading}
          totalReferralEarned={mkt.totalReferralEarned}
        />
        <style>{BASE_STYLES}</style>
      </div>
    );
  }

  if (activePanel === "loyalty") {
    return (
      <div className="mkt-root">
        <LoyaltyRewardsPanel
          onBack={() => setActivePanel(null)}
          loyaltyConfig={mkt.loyaltyConfig}
          loyaltyLeaderboard={mkt.loyaltyLeaderboard}
          loyaltyLoading={mkt.loyaltyLoading}
          saveLoyalty={mkt.saveLoyalty}
          submitting={mkt.submitting}
        />
        <style>{BASE_STYLES}</style>
      </div>
    );
  }

  // ── MAIN MARKETING PAGE (unchanged from original) ────────
  return (
    <div className="mkt-root">

      {/* Page head — UNCHANGED */}
      <div className="sd-page-head">
        <div className="sd-page-title">Marketing</div>
        <div className="sd-page-sub">Grow your store with promotional tools</div>
      </div>

      {/* AI Caption Generator — COMPLETELY UNCHANGED */}
      <div className="mkt-ai-card">
        <div className="mkt-ai-header">
          <div className="mkt-ai-header-left">
            <span className="mkt-ai-emoji">✨</span>
            <div>
              <div className="mkt-ai-title">AI Caption Generator</div>
              <div className="mkt-ai-sub">Create ready-to-post captions for any product</div>
            </div>
          </div>
          {!canAccess("pro") && (
            <span className="mkt-plan-badge">PRO</span>
          )}
        </div>

        {canAccess("pro") ? (
          <div>
            <div className="mkt-ai-controls">
              <input
                value={captionProduct}
                onChange={e => setCaptionProduct(e.target.value)}
                placeholder="Enter product name e.g. Ankara Mini Dress"
                className="mkt-input"
                onKeyDown={e => e.key === "Enter" && generateCaptions()}
              />
              <select
                value={captionStyle}
                onChange={e => setCaptionStyle(e.target.value)}
                className="mkt-select"
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="all">All 3 platforms</option>
              </select>
              <button
                onClick={generateCaptions}
                disabled={generating || !captionProduct.trim()}
                className="mkt-gen-btn"
              >
                {generating
                  ? <><div className="mkt-spinner"/> Writing…</>
                  : "✨ Generate"
                }
              </button>
            </div>

            {captions && (
              <div className="mkt-captions">
                {Object.entries(captions).map(([platform, text]) => text && (
                  <div key={platform} className="mkt-caption-card">
                    <div className="mkt-caption-top">
                      <span className="mkt-caption-platform">
                        {platform === "instagram" ? "📸 Instagram" : platform === "tiktok" ? "📱 TikTok" : "💬 WhatsApp"}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(text)}
                        className="mkt-copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="mkt-caption-text">{text}</div>
                  </div>
                ))}
                <button
                  onClick={() => { setCaptions(null); generateCaptions(); }}
                  className="mkt-regen-btn"
                >
                  ↺ Regenerate
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mkt-locked-sub">
            Upgrade to Pro to unlock the AI Caption Generator.
          </div>
        )}
      </div>

      {/* Tool cards — UNCHANGED structure, "Configure →" now wires to panels */}
      <div className="mkt-grid">
        {TOOLS.map((t) => {
          const locked    = !canAccess(t.plan);
          const IconComp  = MARKETING_ICONS[t.id];
          const iconColor = ICON_COLORS[t.id] || "#7c3aed";
          return (
            <div key={t.id} className={`mkt-tool-card${locked ? " mkt-tool-card--locked" : ""}`}>
              {locked && (
                <span className="mkt-plan-badge mkt-plan-badge--tool">
                  {t.plan.charAt(0).toUpperCase() + t.plan.slice(1)}+
                </span>
              )}
              <div className="mkt-icon-wrap" style={{ background:`${iconColor}12`, border:`1px solid ${iconColor}22` }}>
                <IconComp size={22} color={iconColor}/>
              </div>
              <div className="mkt-tool-label">{t.label}</div>
              <div className="mkt-tool-desc">{t.desc}</div>
              <button
                className={`sd-btn sd-btn-sm${locked ? " sd-btn-ghost" : " mkt-tool-btn-active"}`}
                onClick={() => {
                  if (locked) {
                    alert(`This feature requires the ${t.plan} plan. Upgrade in the Subscription section.`);
                  } else {
                    handleConfigure(t.id);
                  }
                }}
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
                ) : (
                  t.id === "ai" ? "Open Generator ↑" : "Configure →"
                )}
              </button>
            </div>
          );
        })}
      </div>

      <style>{BASE_STYLES}</style>
    </div>
  );
}

// ── ALL ORIGINAL STYLES — COMPLETELY UNCHANGED ───────────────
const BASE_STYLES = `
  @keyframes mkt-spin { to { transform: rotate(360deg); } }

  .mkt-root {
    font-family: var(--sd-font, 'DM Sans', system-ui, sans-serif);
    background: transparent;
    color: var(--sd-text);
    min-height: 100%;
  }

  .mkt-ai-card {
    background: var(--sd-white);
    border-radius: 14px;
    border: 1px solid var(--sd-border);
    padding: 18px 20px;
    margin-bottom: 16px;
    transition: background 0.25s, border-color 0.25s;
  }
  .mkt-ai-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
  }
  .mkt-ai-header-left { display: flex; align-items: center; gap: 10px; }
  .mkt-ai-emoji { font-size: 20px; }
  .mkt-ai-title { font-size: 15px; font-weight: 800; color: var(--sd-text); }
  .mkt-ai-sub   { font-size: 12px; color: var(--sd-muted); font-weight: 600; margin-top: 1px; }

  .mkt-plan-badge {
    font-size: 10px; font-weight: 700; padding: 3px 8px;
    border-radius: 20px;
    background: var(--sd-border-light);
    color: var(--sd-muted);
    border: 1px solid var(--sd-border);
  }

  .mkt-ai-controls { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
  .mkt-input {
    flex: 1; min-width: 200px; height: 40px;
    padding: 0 12px;
    border: 1.5px solid var(--sd-border);
    border-radius: 9px;
    font-size: 13px; font-weight: 500;
    outline: none;
    font-family: var(--sd-font);
    color: var(--sd-text);
    background: var(--sd-bg);
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .mkt-input:focus {
    border-color: var(--sd-accent);
    box-shadow: 0 0 0 3px var(--sd-accent-dim);
  }
  .mkt-input::placeholder { color: var(--sd-muted); }

  .mkt-select {
    height: 40px; padding: 0 12px;
    border: 1.5px solid var(--sd-border);
    border-radius: 9px;
    font-size: 13px; font-weight: 600;
    outline: none;
    font-family: var(--sd-font);
    color: var(--sd-text);
    background: var(--sd-bg);
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .mkt-select:focus { border-color: var(--sd-accent); }

  .mkt-gen-btn {
    height: 40px; padding: 0 18px;
    border-radius: 9px; border: none;
    background: var(--sd-accent);
    color: #fff;
    font-size: 13px; font-weight: 800;
    cursor: pointer; font-family: inherit;
    display: flex; align-items: center; gap: 6px;
    transition: all 0.15s; white-space: nowrap;
  }
  .mkt-gen-btn:disabled { background: var(--sd-border-light); color: var(--sd-muted); cursor: not-allowed; }
  .mkt-gen-btn:not(:disabled):hover { background: var(--sd-accent2, #6d28d9); }

  .mkt-spinner {
    width: 12px; height: 12px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: mkt-spin 0.8s linear infinite;
  }

  .mkt-captions { display: flex; flex-direction: column; gap: 10px; }
  .mkt-caption-card {
    background: var(--sd-bg);
    border-radius: 10px;
    border: 1px solid var(--sd-border);
    padding: 12px 14px;
    transition: background 0.25s;
  }
  .mkt-caption-top {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 6px;
  }
  .mkt-caption-platform {
    font-size: 11px; font-weight: 800;
    color: var(--sd-accent);
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .mkt-copy-btn {
    font-size: 11px; font-weight: 700;
    color: var(--sd-muted);
    background: var(--sd-white);
    border: 1px solid var(--sd-border);
    border-radius: 6px; padding: 3px 8px; cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .mkt-copy-btn:hover { background: var(--sd-accent-dim); color: var(--sd-accent); }
  .mkt-caption-text {
    font-size: 13px; color: var(--sd-text2);
    line-height: 1.6; font-weight: 500; white-space: pre-wrap;
  }
  .mkt-regen-btn {
    align-self: flex-start;
    font-size: 12px; color: var(--sd-accent);
    background: none; border: none;
    cursor: pointer; font-weight: 700; padding: 0;
    transition: opacity 0.15s;
  }
  .mkt-regen-btn:hover { opacity: 0.7; }
  .mkt-locked-sub { font-size: 13px; color: var(--sd-muted); font-weight: 600; }

  .mkt-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
  }
  .mkt-tool-card {
    background: var(--sd-white);
    border-radius: var(--sd-radius-lg, 14px);
    border: 1px solid var(--sd-border);
    padding: 20px 24px;
    position: relative;
    transition: background 0.25s, border-color 0.25s;
  }
  .mkt-tool-card--locked { opacity: 0.65; }
  .mkt-plan-badge--tool { position: absolute; top: 12px; right: 12px; }
  .mkt-icon-wrap {
    width: 44px; height: 44px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
  }
  .mkt-tool-label {
    font-size: 13px; font-weight: 700;
    color: var(--sd-muted);
    letter-spacing: 0.07em; text-transform: uppercase;
    margin-bottom: 6px;
  }
  .mkt-tool-desc {
    font-size: 13px; color: var(--sd-muted);
    line-height: 1.5; margin-bottom: 16px;
  }
  .mkt-tool-btn-active {
    background: var(--sd-accent) !important;
    color: #fff !important;
    border: none !important;
    box-shadow: 0 2px 8px rgba(124,58,237,0.25) !important;
  }
  .mkt-tool-btn-active:hover { background: var(--sd-accent2, #6d28d9) !important; }

  @media (max-width: 480px) {
    .mkt-ai-controls { flex-direction: column; }
    .mkt-input, .mkt-select, .mkt-gen-btn { width: 100%; min-width: unset; }
  }
`;