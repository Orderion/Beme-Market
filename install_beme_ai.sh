#!/bin/bash

# ═══════════════════════════════════════════════════════════════════
#  BEME AI COPILOT — SELF-CONTAINED INSTALL SCRIPT
#  No downloads folder needed. Run from your Beme Project root:
#    bash install_beme_ai.sh
# ═══════════════════════════════════════════════════════════════════

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Beme AI Copilot — Auto Installer     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE="$SCRIPT_DIR/Beme-Frontend/src"

if [ ! -d "$FE" ]; then
  echo -e "${RED}✗ Cannot find Beme-Frontend/src/${NC}"
  echo "  Run this from: C:/Users/user/Documents/Beme Project"
  exit 1
fi

echo -e "${BLUE}► Installing into:${NC} $FE"
echo ""

# Create directories
echo -e "${YELLOW}[1/3] Creating directories…${NC}"
mkdir -p "$FE/components/ai" "$FE/hooks" "$FE/services" "$FE/pages/dashboard"
echo -e "  ${GREEN}✓${NC} All directories ready"
echo ""

echo -e "${YELLOW}[2/3] Writing files…${NC}"

# ─────────────────────────────────────────────────────────────────
write() { echo -e "  ${GREEN}✓${NC} $1"; }
# ─────────────────────────────────────────────────────────────────

# ══════════════════════════════════════════════════════
# 1. index.css — remove neo-brutalist, clean modern
# ══════════════════════════════════════════════════════
cat > "$FE/../index.css" << 'EOF'
@import url("https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap");

:root {
  --bg: #f8f9fb;
  --text: #111111;
  --card: #ffffff;
  --soft: rgba(0,0,0,0.04);
  --accent: #111111;
  --button-text: #ffffff;
  --fsrh: #000;
  --caru: #F5F5F0;
  --grtheme: #046EF2;
  --txdark: #111111;
  --border: #e5e7eb;
  --border-width: 1px;
  --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06);
  --shadow-pressed: 0 1px 2px rgba(0,0,0,0.08);
  --shadow-accent: 0 4px 14px rgba(4,110,242,0.25);
  --radius: 10px;
  --radius-sm: 6px;
  --radius-lg: 14px;
  --muted: rgba(17,17,17,0.45);
  --btn: #111111;
  --btnText: #ffffff;
  --overlay: rgba(8,8,10,0.5);
  --font-main: "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-display: "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --ease-premium: cubic-bezier(0.22,1,0.36,1);
  --ease-soft: cubic-bezier(0.25,0.9,0.3,1);
  --motion-fast: 140ms var(--ease-premium);
  --motion-smooth: 260ms var(--ease-premium);
  --motion-slow: 400ms var(--ease-premium);
  --drawer-motion: 400ms var(--ease-premium);
  --page-motion: 300ms var(--ease-premium);
  --response-delay: 0ms;
  --backdrop-blur: blur(8px);
  --backdrop-blur-light: blur(4px);
}

body.dark {
  --bg: #0f1117;
  --text: #f1f3f9;
  --card: #1a1d27;
  --soft: rgba(255,255,255,0.05);
  --accent: #f1f3f9;
  --button-text: #111111;
  --fsrh: #f1f3f9;
  --caru: #1e2130;
  --grtheme: #046EF2;
  --txdark: #f1f3f9;
  --border: #2a2d3a;
  --shadow: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.25);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.4);
  --shadow-pressed: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-accent: 0 4px 14px rgba(4,110,242,0.35);
  --muted: rgba(241,243,249,0.45);
  --btn: #f1f3f9;
  --btnText: #111111;
  --overlay: rgba(0,0,0,0.7);
}

*,*::before,*::after { box-sizing: border-box; }
html,body { height:100%; scroll-behavior:smooth; }
html { -webkit-text-size-adjust:100%; }
body {
  margin:0; background:var(--bg); color:var(--text);
  font-family:var(--font-main); font-weight:600;
  letter-spacing:-0.01em; line-height:1.5;
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  transition:background var(--motion-slow),color var(--motion-slow);
  overflow-x:hidden;
}
#root { min-height:100%; }
::selection { background:var(--grtheme); color:#fff; }
h1,h2,h3,h4,h5,h6 {
  font-family:var(--font-display); font-weight:800;
  letter-spacing:-0.03em; line-height:1.1; margin:0;
}
p,span,li,label,input,textarea,select,button,a { font-family:var(--font-main); }
.hero-title,.shop-title,.product-title,.logo,.auth-title,.pd-title,.order-success-title {
  font-family:var(--font-display); font-weight:900;
}
img,video { max-width:100%; height:auto; display:block; }
a { color:inherit; text-decoration:none; }
button { font-family:var(--font-main); font-weight:700; cursor:pointer; border:none; }
* { -webkit-tap-highlight-color:transparent; }

.card {
  background:var(--card); border:var(--border-width) solid var(--border);
  border-radius:var(--radius); box-shadow:var(--shadow);
  transition:background var(--motion-slow),border-color var(--motion-slow),
    color var(--motion-slow),box-shadow var(--motion-smooth),transform var(--motion-smooth);
}
.card:hover { box-shadow:var(--shadow-lg); transform:translateY(-1px); }

input,select,textarea {
  background:var(--card); color:var(--text);
  border:var(--border-width) solid var(--border);
  border-radius:var(--radius-sm); padding:10px 12px;
  outline:none; font-size:16px; font-family:var(--font-main);
  font-weight:600;
  transition:box-shadow var(--motion-fast),border-color var(--motion-fast),
    background var(--motion-smooth),color var(--motion-smooth);
}
input:focus,select:focus,textarea:focus {
  border-color:var(--grtheme);
  box-shadow:0 0 0 3px rgba(4,110,242,0.12);
}
input::placeholder,textarea::placeholder { color:var(--muted); font-weight:500; }
@supports (-webkit-touch-callout:none) {
  input,select,textarea { font-size:16px !important; }
}

@keyframes fadeUpSoft { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes cartPopupIn { from{opacity:0;transform:translateY(10px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
.route-shell { animation:routeEnter var(--page-motion) both; }
@keyframes routeEnter { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

.side-panel,.sidebar {
  position:fixed; top:0; bottom:0; left:-100%; width:92vw; max-width:400px;
  background:var(--card); border-right:var(--border-width) solid var(--border);
  box-shadow:var(--shadow-lg); z-index:1300; overflow-y:auto;
  transform:translateX(-100%); transform-origin:left center;
  transition:transform var(--drawer-motion) var(--ease-premium),opacity var(--motion-slow);
  opacity:0;
}
.side-panel.open,.sidebar.open { transform:translateX(0); opacity:1; left:0; }

.cd { position:fixed; inset:0; z-index:9999; pointer-events:none; visibility:hidden; }
.cd.cd--open { pointer-events:auto; visibility:visible; }
.cd-overlay {
  position:absolute; inset:0; background:var(--overlay); opacity:0;
  transition:opacity var(--motion-slow); backdrop-filter:var(--backdrop-blur-light);
}
.cd.cd--open .cd-overlay { opacity:1; }
.cd-panel {
  position:absolute; top:0; right:0; height:100%; width:min(400px,92vw);
  background:var(--card); color:var(--text);
  transform:translateX(100%); opacity:0; transform-origin:right center;
  transition:transform var(--drawer-motion) var(--ease-premium),opacity var(--motion-slow);
  display:flex; flex-direction:column;
  border-left:var(--border-width) solid var(--border);
  box-shadow:var(--shadow-lg); will-change:transform;
}
.cd.cd--open .cd-panel { transform:translateX(0); opacity:1; }
.cd.closing .cd-panel { transform:translateX(100%); transition:transform var(--drawer-motion) var(--ease-premium),opacity var(--motion-slow); }

.cart-popup {
  position:fixed; left:12px; right:12px; bottom:80px; z-index:1400;
  border-radius:var(--radius-lg); border:var(--border-width) solid var(--border);
  background:var(--card); box-shadow:var(--shadow-lg); overflow:hidden;
  animation:cartPopupIn 280ms var(--ease-premium) both;
}
.cart-popup__close-wrap { display:flex; justify-content:flex-end; padding:10px 10px 0; }
.cart-popup__close {
  width:28px; height:28px; border-radius:50%;
  border:var(--border-width) solid var(--border);
  background:transparent; color:var(--muted); font-size:16px;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; line-height:1; font-weight:700;
  transition:background var(--motion-fast),color var(--motion-fast);
}
.cart-popup__close:hover { background:var(--soft); color:var(--text); }
.cart-popup__header { display:flex; align-items:center; gap:14px; padding:4px 18px 14px; }
.cart-popup__thumb {
  width:64px; height:64px; border-radius:var(--radius-sm);
  border:var(--border-width) solid var(--border); background:var(--soft);
  flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center;
}
.cart-popup__thumb img { width:100%; height:100%; object-fit:contain; padding:6px; }
.cart-popup__info { flex:1; min-width:0; }
.cart-popup__label {
  display:block; font-size:10px; font-weight:800;
  letter-spacing:0.08em; text-transform:uppercase; color:var(--grtheme); margin-bottom:4px;
}
.cart-popup__name {
  font-family:var(--font-display); font-size:14px; font-weight:800;
  color:var(--text); letter-spacing:-0.02em; margin:0 0 4px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.cart-popup__price { font-size:13px; font-weight:800; color:var(--grtheme); margin:0; font-family:var(--font-display); }
.cart-popup__divider { height:1px; background:var(--border); margin:0 18px; }
.cart-popup__thanks { padding:10px 18px; font-size:12px; font-weight:600; color:var(--muted); line-height:1.5; margin:0; }
.cart-popup__actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:4px 18px 18px; }
.cart-popup__btn {
  height:42px; border-radius:var(--radius-sm);
  font-family:var(--font-main); font-size:12px; font-weight:800;
  cursor:pointer; letter-spacing:0.02em;
  border:var(--border-width) solid var(--border);
  transition:opacity var(--motion-fast),transform var(--motion-fast);
}
.cart-popup__btn:hover { opacity:0.88; transform:translateY(-1px); }
.cart-popup__btn:active { opacity:1; transform:translateY(0); }
.cart-popup__btn--ghost { background:transparent; color:var(--text); }
.cart-popup__btn--primary { background:var(--btn); color:var(--btnText); border-color:var(--btn); }

@media (min-width:640px) { .cart-popup { left:auto; right:20px; bottom:24px; width:360px; } }

.shop-page,.home,.header,.side-panel,.sidebar,.cd,.cd-panel,
.product-grid,.p-card,.product-card,.site-footer,.hdr,.order-success-card,
.sidebar-link,.side-subitem,.theme-toggle-track,.theme-toggle-thumb,
.hdr-icon,.hdr-confirm,.cd-item,.cd-qty,.cd-remove,.cd-checkout,
button,a,input,select,textarea,.card,.route-shell,
.cart-popup,.cart-popup__btn,.cart-popup__close {
  transition:
    background var(--motion-slow),color var(--motion-slow),
    border-color var(--motion-slow),box-shadow var(--motion-fast),
    transform var(--motion-fast),opacity var(--motion-fast);
}

@media (prefers-reduced-motion:reduce) {
  *,*::before,*::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; scroll-behavior:auto !important; }
}
@media (max-width:640px) { .side-panel,.sidebar,.cd-panel { width:100vw; max-width:none; } }
EOF
write "src/index.css"

# ══════════════════════════════════════════════════════
# 2. aiUsageService.js
# ══════════════════════════════════════════════════════
cat > "$FE/services/aiUsageService.js" << 'EOF'
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const DAILY_LIMIT = 15;
function today() { return new Date().toISOString().split("T")[0]; }

export async function getDailyUsage(uid) {
  if (!uid) return { count:0, date:today(), extraCredits:0, dailyLimit:DAILY_LIMIT };
  const snap = await getDoc(doc(db,"aiUsage",uid));
  if (!snap.exists()) return { count:0, date:today(), extraCredits:0, dailyLimit:DAILY_LIMIT };
  const d = snap.data();
  if (d.date !== today()) return { count:0, date:today(), extraCredits:d.extraCredits||0, dailyLimit:DAILY_LIMIT };
  return { count:d.count||0, date:d.date||today(), extraCredits:d.extraCredits||0, dailyLimit:DAILY_LIMIT };
}

export async function incrementUsage(uid) {
  if (!uid) return { success:false, reason:"no_user" };
  const ref  = doc(db,"aiUsage",uid);
  const snap = await getDoc(ref);
  const t    = today();
  if (!snap.exists()) {
    await setDoc(ref,{ count:1, date:t, extraCredits:0, lastUpdated:serverTimestamp() });
    return { success:true, newCount:1, remaining:DAILY_LIMIT-1 };
  }
  const d = snap.data();
  if (d.date !== t) {
    await setDoc(ref,{ count:1, date:t, extraCredits:d.extraCredits||0, lastUpdated:serverTimestamp() });
    return { success:true, newCount:1, remaining:DAILY_LIMIT-1 };
  }
  const count  = d.count||0;
  const extra  = d.extraCredits||0;
  const limit  = DAILY_LIMIT+extra;
  if (count >= limit) return { success:false, reason:"limit_reached", newCount:count, remaining:0 };
  if (count >= DAILY_LIMIT && extra > 0) {
    await updateDoc(ref,{ count:increment(1), extraCredits:increment(-1), lastUpdated:serverTimestamp() });
  } else {
    await updateDoc(ref,{ count:increment(1), lastUpdated:serverTimestamp() });
  }
  return { success:true, newCount:count+1, remaining:Math.max(0,limit-count-1) };
}

export async function canSendMessage(uid) {
  const u = await getDailyUsage(uid);
  const t = today();
  if (u.date !== t) return { canSend:true, remaining:DAILY_LIMIT };
  const rem = Math.max(0, DAILY_LIMIT+(u.extraCredits||0)-u.count);
  return { canSend:rem>0, remaining:rem };
}

export async function addExtraCredits(uid, pack) {
  if (!uid) return;
  const PACKS = { small:50, medium:200, unlimited_week:9999 };
  const credits = PACKS[pack]||0;
  if (!credits) return;
  const ref  = doc(db,"aiUsage",uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref,{ count:0, date:today(), extraCredits:credits, lastUpdated:serverTimestamp() });
  } else {
    await updateDoc(ref,{ extraCredits:increment(credits), lastUpdated:serverTimestamp() });
  }
  await setDoc(doc(db,"aiTopups",`${uid}_${Date.now()}`),{ uid, pack, credits, purchasedAt:serverTimestamp() });
}
EOF
write "src/services/aiUsageService.js"

# ══════════════════════════════════════════════════════
# 3. aiService.js
# ══════════════════════════════════════════════════════
cat > "$FE/services/aiService.js" << 'EOF'
const RESPONSES = {
  products:["Looking at your Products tab — your titles and images are the biggest conversion drivers. Want me to write a better title or description for one of your listings?","For better search visibility, each product should have at least 3 images, a keyword-rich title under 60 characters, and a description over 100 words.","Pricing tip: check what similar products sell for and price within 10% of the average to stay competitive without a bidding war."],
  orders:["Your orders are active — great! Processing within 24 hours keeps your seller rating strong.","I can help you draft professional response templates for common customer questions like delivery times, returns, and availability.","For order management: sending a confirmation message to buyers right after purchase reduces disputes significantly."],
  analytics:["Your analytics are your roadmap. Traffic tells you reach; conversion rate tells you whether your store is convincing. Which one do you want to improve?","A drop in conversions usually points to one of three things: pricing, product images, or description quality. Want me to help diagnose yours?","I can explain any metric in plain English. What number on your analytics page is confusing you?"],
  marketing:["Here are 3 ready-to-use captions:\n\n📱 TikTok: 'POV: you just found the best deal on Beme Market 🔥 Link in bio!'\n\n📸 Instagram: 'Elevate your style with [product]. Now live on Beme Market — tap the link!'\n\n💬 WhatsApp: 'NEW DROP 🚀 [Product] just arrived. Limited stock — order now before it sells out!'\n\nWant me to customise these for a specific product?","Flash sales and limited-time offers convert 3× better than regular listings. Want me to help you plan one?"],
  customers:["Building loyalty starts with communication. A simple thank-you message after purchase increases the chance of a 5-star review and repeat order.","Here's a professional reply template:\n\n'Thank you for reaching out! 😊 [Address their concern]. I'll make sure [resolution] is done by [timeframe]. Please don't hesitate to message me if you need anything else!'"],
  default:["Hi! I'm your Beme AI Copilot. I can help you write product descriptions, explain analytics, create marketing captions, suggest pricing strategies, and answer any dashboard questions. What would you like to work on?","Great question! Let me help you with that.","I'm here to help your store grow. Ask me anything about products, orders, analytics, or marketing."],
};

function detectIntent(msg) {
  const m = msg.toLowerCase();
  if (/description|product|listing|title/.test(m)) return "product_description";
  if (/caption|instagram|tiktok|marketing|promo/.test(m)) return "marketing";
  if (/analytic|conversion|traffic|visitor|stat/.test(m)) return "analytics";
  if (/customer|buyer|message|reply|respond/.test(m)) return "customer";
  if (/price|pricing|discount|ghs|cedis/.test(m)) return "pricing";
  if (/hello|hi |hey /.test(m)) return "greeting";
  return "general";
}

function getMockResponse(message, context) {
  const intent = detectIntent(message);
  const pool   = RESPONSES[context?.currentPage] || RESPONSES.default;
  const intentMap = {
    greeting:`Hello! 👋 I'm your Beme AI Copilot, here to help you grow your store.\n\nI can help with:\n• Writing product descriptions\n• Explaining your analytics\n• Creating marketing captions\n• Suggesting pricing strategies\n• Answering any dashboard questions\n\nWhat would you like to work on today?`,
    product_description:`Here's an optimised product description template:\n\n**[Product Name]** — [One sentence about the main benefit]\n\nFeatures:\n• [Key feature 1]\n• [Key feature 2]\n• [Key feature 3]\n\nPerfect for [target customer]. Order now and get yours delivered fast!\n\nTell me your product name and what it does, and I'll write a specific one for you!`,
    marketing:`Here are 3 captions ready to use:\n\n📱 **TikTok:** "POV: you found the best [product] on Beme Market 🔥 Link in bio!"\n\n📸 **Instagram:** "Elevate your [lifestyle] with [product]. Now on Beme Market — tap the link!"\n\n💬 **WhatsApp:** "NEW DROP 🚀 [Product] just arrived. Limited stock — order before it sells out!"\n\nWant me to customise these for a specific product?`,
    analytics:`Here's how to read your key metrics:\n\n📊 **Visitors** — People who viewed your store\n🛒 **Add-to-cart rate** — % who added items (aim for 10%+)\n💳 **Conversion rate** — % who bought (aim for 2–5%)\n💰 **Average order value** — Increase with bundles or upsells\n\nIf visitors are high but sales are low, the problem is usually pricing or product photos. Want me to dig deeper?`,
    customer:`Here's a professional reply template:\n\n*"Thank you for reaching out! 😊 [Address their concern directly]. I'll make sure [resolution] is done by [timeframe]. Please don't hesitate to message me if you need anything else. Thank you for shopping with us!"*\n\nWant me to write a reply for a specific situation?`,
    pricing:`Pricing strategy for Beme Market:\n\n1. **Research** — Find 3–5 similar products and note their prices\n2. **Position** — Price 5–10% below if you're new, match once you have reviews\n3. **Profit check** — Cost + delivery + Beme fees + your profit margin\n4. **Psychology** — GHS 99 converts better than GHS 100\n\nWhat product are you pricing? I can give more specific advice.`,
  };
  if (intentMap[intent]) return intentMap[intent];
  return pool[Math.floor(Math.random()*pool.length)];
}

export async function sendAIMessage(messages, context={}) {
  const last = messages.filter(m=>m.role==="user").slice(-1)[0]?.content||"";
  const delay = Math.min(2500, Math.max(800, last.split(" ").length*40));
  await new Promise(r=>setTimeout(r,delay));
  return getMockResponse(last, context);
}

export function buildSystemPrompt(context={}) {
  return `You are the Beme AI Seller Copilot — an intelligent business assistant built into the Beme Market seller dashboard. Help sellers grow their sales, explain features clearly, generate product descriptions and marketing content, and explain analytics in plain English. Current page: ${context.currentPage||"Dashboard"}. Store: ${context.shopName||"Unknown"}. Platform: Beme Market, Ghana.`;
}
EOF
write "src/services/aiService.js"

# ══════════════════════════════════════════════════════
# 4. useAIUsage.js
# ══════════════════════════════════════════════════════
cat > "$FE/hooks/useAIUsage.js" << 'EOF'
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const DAILY_LIMIT = 15;
function today() { return new Date().toISOString().split("T")[0]; }

export function useAIUsage() {
  const { user } = useAuth();
  const [data, setData] = useState({ count:0, extraCredits:0, date:today() });
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    if (!user?.uid) { setData({ count:0, extraCredits:0, date:today() }); setLoading(false); return; }
    const unsub = onSnapshot(doc(db,"aiUsage",user.uid),(snap)=>{
      if (!snap.exists()) { setData({ count:0, extraCredits:0, date:today() }); }
      else {
        const d = snap.data(); const t = today();
        if (d.date!==t) setData({ count:0, extraCredits:d.extraCredits||0, date:t });
        else setData({ count:d.count||0, extraCredits:d.extraCredits||0, date:d.date||t });
      }
      setLoading(false);
    },(err)=>{ console.error("[useAIUsage]",err); setLoading(false); });
    return ()=>unsub();
  },[user?.uid]);

  const extra    = data.extraCredits;
  const limit    = DAILY_LIMIT+extra;
  const used     = data.count;
  const remaining= Math.max(0,limit-used);
  const pct      = Math.min(100, Math.round((used/DAILY_LIMIT)*100));

  return { messagesUsed:used, messagesRemaining:remaining, extraCredits:extra, dailyLimit:DAILY_LIMIT, effectiveLimit:limit, isAtLimit:remaining===0, isNearLimit:!!(remaining>0&&remaining<=3), usagePercent:pct, loading };
}
EOF
write "src/hooks/useAIUsage.js"

# ══════════════════════════════════════════════════════
# 5. useAISettings.js
# ══════════════════════════════════════════════════════
cat > "$FE/hooks/useAISettings.js" << 'EOF'
import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const DEFAULTS = { aiCustomerReplies:true, aiProductDescriptions:true, aiSeoOptimization:true, aiSalesSuggestions:true, aiMarketingAssistant:true, aiAnalyticsExplainer:true, aiFollowUpSuggestions:false, aiStoreHealthAnalysis:true };

export function useAISettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);

  useEffect(()=>{
    if (!user?.uid) { setSettings(DEFAULTS); setLoading(false); return; }
    const unsub = onSnapshot(doc(db,"aiSettings",user.uid),(snap)=>{
      setSettings(snap.exists()?{ ...DEFAULTS,...snap.data() }:DEFAULTS);
      setLoading(false);
    },(e)=>{ console.error(e); setLoading(false); });
    return ()=>unsub();
  },[user?.uid]);

  const updateSetting = useCallback(async(key,value)=>{
    if (!user?.uid) return;
    setSaving(true);
    try { await setDoc(doc(db,"aiSettings",user.uid),{ [key]:value, updatedAt:serverTimestamp() },{ merge:true }); }
    catch(e){ console.error(e); } finally { setSaving(false); }
  },[user?.uid]);

  return { settings, loading, saving, updateSetting };
}
EOF
write "src/hooks/useAISettings.js"

# ══════════════════════════════════════════════════════
# 6. useAIContext.js
# ══════════════════════════════════════════════════════
cat > "$FE/hooks/useAIContext.js" << 'EOF'
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SUGGESTIONS = {
  home:        ["How do I increase my sales this week?","What does conversion rate mean?","How can I get more store visitors?","Explain my dashboard overview"],
  products:    ["Write a product description for me","How do I optimise my product title for SEO?","What's the best pricing strategy for new products?","How many images should each product have?"],
  orders:      ["How do I handle a customer complaint?","Write a professional reply for a delayed order","How do I reduce order cancellations?","What's the best way to manage refunds?"],
  analytics:   ["Explain my traffic drop this week","What is a good conversion rate?","Why are visitors not buying?","How do I read the analytics graph?"],
  marketing:   ["Write an Instagram caption for my product","Give me 5 TikTok ideas for my store","How do I run a flash sale?","Create a WhatsApp status for new arrivals"],
  customers:   ["Write a thank-you message for repeat buyers","How do I get more customer reviews?","Draft a follow-up for inactive buyers","How do I handle difficult customers?"],
  chat:        ["Write a professional reply to this message","How do I handle a pricing negotiation?","Draft a delivery update message","How do I politely decline a request?"],
  withdrawals: ["How does the payout process work?","What fees apply to withdrawals?","How do I increase my available balance?"],
  appearance:  ["How do I make my store look professional?","Tips for a high-converting store banner","How do I write a good store bio?"],
  subscription:["What's included in the Pro plan?","Is the Pro plan worth it for my store?","What AI features do I get with Pro?"],
  delivery:    ["What delivery options should I offer?","How do I set competitive delivery fees?","How do I handle delayed deliveries?"],
  verification:["How do I get verified on Beme?","What are the benefits of being verified?","How long does verification take?"],
};
const LABELS = { home:"Dashboard Home",products:"Products",orders:"Orders",analytics:"Analytics",marketing:"Marketing",customers:"Customers",chat:"Messages",withdrawals:"Withdrawals",appearance:"Store Design",subscription:"Subscription",delivery:"Delivery",verification:"Verification",security:"Security","ai-assistant":"AI Copilot" };

export function useAIContext() {
  const [params]      = useSearchParams();
  const { profile, user } = useAuth();
  const currentPage   = params.get("tab")||"home";
  const aiContext     = useMemo(()=>({ currentPage, shopName:profile?.shopName||profile?.storeName||"Your Store", sellerId:user?.uid||null, sellerEmail:user?.email||null, plan:profile?.subscriptionPlan||"basic" }),[currentPage,profile,user]);
  return { currentPage, pageLabel:LABELS[currentPage]||"Dashboard", suggestions:SUGGESTIONS[currentPage]||SUGGESTIONS.home, aiContext };
}
EOF
write "src/hooks/useAIContext.js"

# ══════════════════════════════════════════════════════
# 7. useAIChat.js
# ══════════════════════════════════════════════════════
cat > "$FE/hooks/useAIChat.js" << 'EOF'
import { useState, useCallback, useEffect, useRef } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { sendAIMessage } from "../services/aiService";
import { incrementUsage } from "../services/aiUsageService";

export function useAIChat({ aiContext={}, onLimitReached }={}) {
  const { user } = useAuth();
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [isTyping,    setIsTyping]    = useState(false);
  const [error,       setError]       = useState(null);
  const [histLoading, setHistLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(()=>{
    if (!user?.uid) { setHistLoading(false); return; }
    const q    = query(collection(db,"aiChats",user.uid,"messages"),orderBy("createdAt","asc"),limit(50));
    const unsub= onSnapshot(q,(snap)=>{ setMessages(snap.docs.map(d=>({id:d.id,...d.data()}))); setHistLoading(false); },(e)=>{ console.error(e); setHistLoading(false); });
    return ()=>unsub();
  },[user?.uid]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); },[messages,isTyping]);

  const saveMessage = useCallback(async(role,content)=>{
    if (!user?.uid) return;
    try { await addDoc(collection(db,"aiChats",user.uid,"messages"),{ role, content, createdAt:serverTimestamp(), page:aiContext?.currentPage||"home" }); }
    catch(e){ console.error(e); }
  },[user?.uid,aiContext?.currentPage]);

  const sendMessage = useCallback(async(text)=>{
    const trimmed=(text||input).trim();
    if (!trimmed||isTyping||!user?.uid) return;
    setError(null);
    const result = await incrementUsage(user.uid);
    if (!result.success) { if (result.reason==="limit_reached"&&onLimitReached) onLimitReached(); return; }
    setInput("");
    setMessages(prev=>[...prev,{ role:"user",content:trimmed,createdAt:new Date(),id:`tmp_${Date.now()}` }]);
    await saveMessage("user",trimmed);
    setIsTyping(true);
    try {
      const history = messages.slice(-10).map(m=>({ role:m.role,content:m.content }));
      history.push({ role:"user",content:trimmed });
      const res = await sendAIMessage(history,aiContext,user.uid);
      await saveMessage("assistant",res);
    } catch(e) {
      console.error(e); setError("Something went wrong. Please try again.");
      await saveMessage("assistant","I'm having trouble responding right now. Please try again in a moment.");
    } finally { setIsTyping(false); }
  },[input,isTyping,user?.uid,messages,aiContext,saveMessage,onLimitReached]);

  return { messages, input, setInput, isTyping, error, histLoading, bottomRef, sendMessage };
}
EOF
write "src/hooks/useAIChat.js"

# ══════════════════════════════════════════════════════
# 8. AIMessage.jsx
# ══════════════════════════════════════════════════════
cat > "$FE/components/ai/AIMessage.jsx" << 'EOF'
import React from "react";

export default function AIMessage({ message, isLight=true }) {
  const { role, content, createdAt } = message;
  const isUser = role==="user";
  const isAI   = role==="assistant";
  const time   = createdAt ? new Date(createdAt?.toMillis?.() || createdAt).toLocaleTimeString("en-GH",{hour:"2-digit",minute:"2-digit"}) : "";

  function render(text) {
    return text.split("\n").map((line,i)=>{
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return <span key={i} style={{display:"block",minHeight:line?undefined:"0.5em"}}>{parts.map((p,j)=>j%2===1?<strong key={j}>{p}</strong>:p)}</span>;
    });
  }

  if (isUser) return (
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
      <div style={{maxWidth:"78%"}}>
        <div style={{background:"#046EF2",color:"#fff",borderRadius:"14px 14px 3px 14px",padding:"10px 14px",fontSize:13,lineHeight:1.6,fontWeight:600,fontFamily:"Nunito,sans-serif"}}>{render(content)}</div>
        {time&&<div style={{fontSize:10,color:"#9ca3af",textAlign:"right",marginTop:3,fontWeight:600}}>{time}</div>}
      </div>
    </div>
  );

  if (isAI) return (
    <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
      </div>
      <div style={{maxWidth:"82%"}}>
        <div style={{background:isLight?"#f8f9fb":"#1E2235",color:isLight?"#111":"#E2E8F0",border:`1px solid ${isLight?"#e5e7eb":"transparent"}`,borderRadius:"3px 14px 14px 14px",padding:"10px 14px",fontSize:13,lineHeight:1.7,fontWeight:600,fontFamily:"Nunito,sans-serif"}}>{render(content)}</div>
        {time&&<div style={{fontSize:10,color:"#9ca3af",marginTop:3,fontWeight:600}}>Beme AI · {time}</div>}
      </div>
    </div>
  );
  return null;
}

export function TypingIndicator({ isLight=true }) {
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
      </div>
      <div style={{background:isLight?"#f8f9fb":"#1E2235",border:`1px solid ${isLight?"#e5e7eb":"transparent"}`,borderRadius:"3px 14px 14px 14px",padding:"12px 16px",display:"flex",alignItems:"center",gap:5}}>
        {[0,1,2].map(i=><span key={i} style={{width:7,height:7,borderRadius:"50%",background:isLight?"#9ca3af":"#4B5563",display:"inline-block",animation:`bai-bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
        <style>{`@keyframes bai-bounce{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-5px);opacity:1}}`}</style>
      </div>
    </div>
  );
}
EOF
write "src/components/ai/AIMessage.jsx"

# ══════════════════════════════════════════════════════
# 9. AIAssistant.jsx — main dashboard page
# ══════════════════════════════════════════════════════
cat > "$FE/pages/dashboard/AIAssistant.jsx" << 'EOF'
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth }         from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { useAIUsage }      from "../../hooks/useAIUsage";
import { useAIChat }       from "../../hooks/useAIChat";
import { useAISettings }   from "../../hooks/useAISettings";
import { useAIContext }    from "../../hooks/useAIContext";
import AIMessage, { TypingIndicator } from "../../components/ai/AIMessage";

function Ico({ d, size=16, color="currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}
const I = {
  sparkle:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  send:"M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7Z",
  lock:"M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Z M7 11V7a5 5 0 0 1 10 0v4",
  star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z",
  chat:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z",
  check:"M20 6L9 17l-5-5",
};

const AUTOS = [
  { key:"aiCustomerReplies",    label:"Customer Auto-Replies",  desc:"AI handles common buyer questions" },
  { key:"aiProductDescriptions",label:"Product Descriptions",   desc:"Generate optimised product copy" },
  { key:"aiSeoOptimization",    label:"SEO Optimization",       desc:"Improve titles for search visibility" },
  { key:"aiSalesSuggestions",   label:"Sales Suggestions",      desc:"Personalised tips to boost conversion" },
  { key:"aiMarketingAssistant", label:"Marketing Assistant",    desc:"Instagram, TikTok & WhatsApp captions" },
  { key:"aiAnalyticsExplainer", label:"Analytics Explainer",    desc:"Understand metrics in plain English" },
  { key:"aiFollowUpSuggestions",label:"Follow-Up Suggestions",  desc:"Re-engage past buyers" },
  { key:"aiStoreHealthAnalysis",label:"Store Health Analysis",  desc:"Weekly store performance diagnosis" },
];

const PACKS = [
  { id:"small",          msgs:"50 messages",     price:"$1", ghs:"GHS 15" },
  { id:"medium",         msgs:"200 messages",    price:"$3", ghs:"GHS 45" },
  { id:"unlimited_week", msgs:"7-day unlimited", price:"$5", ghs:"GHS 75" },
];

function TopupModal({ onClose }) {
  const { user }=useAuth(); const [bought,setBought]=useState(null); const [busy,setBusy]=useState(null);
  const buy=async(id)=>{ setBusy(id); try{ const {addExtraCredits}=await import("../../services/aiUsageService"); if(user?.uid) await addExtraCredits(user.uid,id); setBought(id); setTimeout(()=>{onClose();setBought(null);},1800); }catch(e){console.error(e);}finally{setBusy(null);} };
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}}>
      <div style={{background:"#fff",borderRadius:16,padding:"28px 28px 24px",width:"100%",maxWidth:360,border:"1px solid #e5e7eb",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <div style={{fontSize:17,fontWeight:800,color:"#111",letterSpacing:"-0.02em"}}>Get more AI messages</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:"#9ca3af",cursor:"pointer",lineHeight:1,padding:0}}>×</button>
        </div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:20,fontWeight:600}}>Your 15 free messages reset at midnight.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {PACKS.map(p=>(
            <button key={p.id} onClick={()=>buy(p.id)} disabled={!!busy||!!bought} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",background:bought===p.id?"#f0fdf4":"#f8f9fb",border:`1px solid ${bought===p.id?"#86efac":"#e5e7eb"}`,borderRadius:10,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#111",marginBottom:2}}>{bought===p.id?"✓ Credits added!":busy===p.id?"Processing…":p.msgs}</div>
                <div style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{p.ghs}</div>
              </div>
              <div style={{fontSize:14,fontWeight:800,color:"#046EF2",background:"#eff6ff",padding:"5px 12px",borderRadius:8}}>{p.price}</div>
            </button>
          ))}
        </div>
        <div style={{fontSize:11,color:"#9ca3af",textAlign:"center",marginTop:16,fontWeight:600}}>Payments via Paystack · Credits added instantly</div>
      </div>
    </div>
  );
}

function LockedState({ onUpgrade }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:480,padding:"48px 24px",textAlign:"center"}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,color:"#046EF2"}}><Ico d={I.lock} size={28}/></div>
      <div style={{fontSize:22,fontWeight:800,color:"#111",marginBottom:8,letterSpacing:"-0.03em"}}>AI Copilot is Pro only</div>
      <div style={{fontSize:14,color:"#6b7280",lineHeight:1.7,maxWidth:320,marginBottom:28,fontWeight:600}}>Upgrade to Pro to unlock your personal AI business assistant.</div>
      <button onClick={onUpgrade} style={{padding:"12px 28px",background:"#046EF2",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:8,boxShadow:"0 4px 14px rgba(4,110,242,0.3)"}}>Upgrade to Pro — $10/mo</button>
      <div style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>Cancel anytime · 14-day free trial</div>
      <div style={{marginTop:32,background:"#f8f9fb",border:"1px solid #e5e7eb",borderRadius:12,padding:"20px 24px",maxWidth:320,width:"100%",textAlign:"left"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>What you unlock</div>
        {["AI chat — 15 messages/day free","Product description generator","Analytics explainer in plain English","Instagram & TikTok caption generator","Customer reply assistant","Store health analysis","AI sales suggestions"].map((f,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:13,color:"#374151",fontWeight:600}}>
            <span style={{color:"#046EF2",flexShrink:0}}><Ico d={I.check} size={13}/></span>{f}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPanel({ aiContext, suggestions, pageLabel, shopName }) {
  const [showTopup,setShowTopup]=useState(false);
  const { messagesUsed,dailyLimit,messagesRemaining,isAtLimit,isNearLimit,usagePercent }=useAIUsage();
  const { messages,input,setInput,isTyping,error,histLoading,bottomRef,sendMessage }=useAIChat({ aiContext, onLimitReached:()=>setShowTopup(true) });
  const bar = usagePercent>=100?"#ef4444":usagePercent>=80?"#f59e0b":"#046EF2";
  const handleKey=e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendMessage(); } };
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
      {/* Usage bar */}
      <div style={{padding:"10px 18px",borderBottom:"1px solid #f5f5f5",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
          <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{isAtLimit?"Daily limit reached":`${messagesUsed} / ${dailyLimit} messages today`}</span>
          <button onClick={()=>setShowTopup(true)} style={{fontSize:12,color:"#046EF2",background:"none",border:"none",cursor:"pointer",fontWeight:700,padding:0}}>Get more →</button>
        </div>
        <div style={{height:4,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${usagePercent}%`,background:bar,borderRadius:4,transition:"width 0.4s ease,background 0.3s"}}/>
        </div>
        {isNearLimit&&!isAtLimit&&<div style={{fontSize:11,color:"#f59e0b",marginTop:4,fontWeight:600}}>{messagesRemaining} message{messagesRemaining!==1?"s":""} left today</div>}
      </div>
      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:2}}>
        {histLoading?(
          <div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:32,fontWeight:600}}>Loading…</div>
        ):messages.length===0?(
          <div style={{padding:"8px 0"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",color:"#fff"}}><Ico d={I.sparkle} size={22}/></div>
              <div style={{fontSize:16,fontWeight:800,color:"#111",marginBottom:6,letterSpacing:"-0.02em"}}>Hi! I'm your Beme AI Copilot</div>
              <div style={{fontSize:13,color:"#6b7280",lineHeight:1.7,maxWidth:280,margin:"0 auto",fontWeight:600}}>I'm here to help <strong style={{color:"#111"}}>{shopName}</strong> grow. Ask me anything about products, orders, analytics, or marketing.</div>
            </div>
            <div style={{fontSize:11,color:"#9ca3af",textAlign:"center",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,fontWeight:700}}>Try asking</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {suggestions.slice(0,4).map((s,i)=>(
                <button key={i} onClick={()=>sendMessage(s)} style={{background:"#f8f9fb",border:"1px solid #e5e7eb",borderRadius:9,color:"#374151",fontSize:13,padding:"10px 14px",cursor:"pointer",textAlign:"left",fontWeight:600,fontFamily:"Nunito,sans-serif",transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff";e.currentTarget.style.borderColor="#bfdbfe";e.currentTarget.style.color="#046EF2";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#f8f9fb";e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.color="#374151";}}
                >{s}</button>
              ))}
            </div>
          </div>
        ):messages.map(m=><AIMessage key={m.id} message={m} isLight/>)}
        {isTyping&&<TypingIndicator isLight/>}
        {error&&<div style={{fontSize:12,color:"#ef4444",textAlign:"center",padding:"8px 12px",background:"#fef2f2",borderRadius:8,fontWeight:600}}>{error}</div>}
        <div ref={bottomRef}/>
      </div>
      {/* Input */}
      <div style={{padding:"12px 16px 14px",borderTop:"1px solid #f5f5f5",flexShrink:0,background:"#fff"}}>
        {isAtLimit?(
          <div style={{textAlign:"center",fontSize:13,color:"#6b7280",padding:"8px 0",fontWeight:600}}>
            Daily limit reached.{" "}
            <button onClick={()=>setShowTopup(true)} style={{color:"#046EF2",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:700}}>Top up →</button>
          </div>
        ):(
          <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
              placeholder={`Ask me anything about ${pageLabel}…`} rows={1} disabled={isTyping}
              style={{flex:1,background:"#f8f9fb",border:"1px solid #e5e7eb",borderRadius:10,color:"#111",fontSize:13,padding:"10px 13px",resize:"none",outline:"none",lineHeight:1.5,maxHeight:120,overflowY:"auto",fontFamily:"Nunito,sans-serif",fontWeight:600,transition:"border-color 0.15s,box-shadow 0.15s"}}
              onFocus={e=>{e.target.style.borderColor="#046EF2";e.target.style.boxShadow="0 0 0 3px rgba(4,110,242,0.10)";}}
              onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";}}
              onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}
            />
            <button onClick={()=>sendMessage()} disabled={!input.trim()||isTyping}
              style={{width:40,height:40,borderRadius:10,flexShrink:0,border:"none",background:input.trim()&&!isTyping?"#046EF2":"#f0f0f0",cursor:input.trim()&&!isTyping?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",color:input.trim()&&!isTyping?"#fff":"#9ca3af",transition:"all 0.15s"}}>
              <Ico d={I.send} size={15}/>
            </button>
          </div>
        )}
        <div style={{fontSize:10,color:"#d1d5db",textAlign:"center",marginTop:6,fontWeight:600}}>Enter to send · Shift+Enter for new line</div>
      </div>
      {showTopup&&<TopupModal onClose={()=>setShowTopup(false)}/>}
    </div>
  );
}

function SettingsPanel({ messagesUsed, dailyLimit, messagesRemaining, usagePercent }) {
  const { settings, loading, saving, updateSetting } = useAISettings();
  const bar = usagePercent>=100?"#ef4444":usagePercent>=80?"#f59e0b":"#046EF2";
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 20px",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:14}}>Today's Usage</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
          <div><div style={{fontSize:30,fontWeight:900,color:"#111",letterSpacing:"-0.04em",lineHeight:1}}>{messagesUsed}</div><div style={{fontSize:12,color:"#9ca3af",fontWeight:600,marginTop:2}}>of {dailyLimit} used</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:24,fontWeight:900,color:"#046EF2",letterSpacing:"-0.03em",lineHeight:1}}>{messagesRemaining}</div><div style={{fontSize:12,color:"#9ca3af",fontWeight:600,marginTop:2}}>remaining</div></div>
        </div>
        <div style={{height:6,background:"#f0f0f0",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:`${usagePercent}%`,background:bar,borderRadius:6,transition:"width 0.4s ease"}}/></div>
        <div style={{fontSize:11,color:"#9ca3af",marginTop:8,fontWeight:600}}>Resets at midnight</div>
      </div>
      <div style={{background:"linear-gradient(135deg,#046EF2 0%,#7C3AED 100%)",borderRadius:12,padding:"16px 20px",color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><Ico d={I.star} size={13}/><span style={{fontSize:13,fontWeight:800}}>Pro Plan Active</span></div>
        <div style={{fontSize:12,opacity:0.85,lineHeight:1.6,fontWeight:600}}>15 free messages/day + pay-as-you-go top-ups</div>
      </div>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 20px",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>AI Automations</div>
        <div style={{fontSize:12,color:"#9ca3af",marginBottom:14,fontWeight:600}}>Control which features are active</div>
        {loading?<div style={{fontSize:13,color:"#9ca3af",padding:"8px 0",fontWeight:600}}>Loading…</div>:
          AUTOS.map((a,idx)=>(
            <div key={a.key} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,padding:"11px 0",borderBottom:idx<AUTOS.length-1?"1px solid #f5f5f5":"none"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"#111",marginBottom:2}}>{a.label}</div>
                <div style={{fontSize:11,color:"#9ca3af",lineHeight:1.5,fontWeight:600}}>{a.desc}</div>
              </div>
              <button onClick={()=>updateSetting(a.key,!settings[a.key])} disabled={saving} aria-label={`Toggle ${a.label}`}
                style={{width:38,height:22,borderRadius:11,flexShrink:0,background:settings[a.key]?"#046EF2":"#e5e7eb",border:"none",cursor:saving?"not-allowed":"pointer",position:"relative",transition:"background 0.2s",marginTop:3}}>
                <span style={{position:"absolute",top:2,left:settings[a.key]?18:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.15)"}}/>
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const [,setParams]       = useSearchParams();
  const { profile }        = useAuth();
  const { plan, isActive } = useSubscription();
  const { messagesUsed, dailyLimit, messagesRemaining, usagePercent } = useAIUsage();
  const { aiContext, suggestions, pageLabel } = useAIContext();
  const isPro    = plan==="pro"&&isActive;
  const shopName = profile?.shopName||profile?.storeName||"Your Store";
  if (!isPro) return <LockedState onUpgrade={()=>setParams({tab:"subscription"})}/>;
  return (
    <div style={{padding:"24px 24px 40px",maxWidth:1080,margin:"0 auto"}}>
      <div style={{marginBottom:22}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0}}><Ico d={I.sparkle} size={15}/></div>
          <div style={{fontSize:22,fontWeight:900,color:"#111",letterSpacing:"-0.03em"}}>AI Copilot</div>
          <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"#eff6ff",color:"#046EF2",border:"1px solid #bfdbfe"}}>PRO</span>
        </div>
        <div style={{fontSize:13,color:"#9ca3af",fontWeight:600,paddingLeft:44}}>Your AI business assistant — helping with <strong style={{color:"#374151"}}>{pageLabel}</strong></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:18,alignItems:"start"}}>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden",display:"flex",flexDirection:"column",height:"calc(100vh - 210px)",minHeight:500}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><Ico d={I.chat} size={14}/></div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#111"}}>Beme AI Copilot</div>
              <div style={{fontSize:11,color:"#9ca3af",fontWeight:600}}>Helping {shopName} grow</div>
            </div>
            <div style={{marginLeft:"auto"}}><span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0"}}>Online</span></div>
          </div>
          <ChatPanel aiContext={aiContext} suggestions={suggestions} pageLabel={pageLabel} shopName={shopName}/>
        </div>
        <SettingsPanel messagesUsed={messagesUsed} dailyLimit={dailyLimit} messagesRemaining={messagesRemaining} usagePercent={usagePercent}/>
      </div>
      <style>{`@media(max-width:768px){.ai-layout{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
EOF
write "src/pages/dashboard/AIAssistant.jsx"

# ══════════════════════════════════════════════════════
# 10. SellerDashboard.jsx — patch in AI tab
# ══════════════════════════════════════════════════════
# Back up original first
if [ -f "$FE/pages/SellerDashboard.jsx" ]; then
  cp "$FE/pages/SellerDashboard.jsx" "$FE/pages/SellerDashboard.jsx.bak"
fi

# Inject the import line after existing dashboard imports
SFILE="$FE/pages/SellerDashboard.jsx"
# Add import if not already there
if ! grep -q "DashboardAIAssistant" "$SFILE" 2>/dev/null; then
  sed -i "s|import DashboardSecurity.*from.*DashboardSecurity.*|&\nimport DashboardAIAssistant  from \"./dashboard/AIAssistant\";|" "$SFILE"
fi
# Add sparkle icon if not already there
if ! grep -q "sparkle" "$SFILE" 2>/dev/null; then
  sed -i "s|  logout:.*|  logout:   \"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9\",\n  sparkle:  \"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\",|" "$SFILE"
fi
# Add nav item if not already there
if ! grep -q "ai-assistant" "$SFILE" 2>/dev/null; then
  sed -i "s|{ id: \"subscription\", icon: \"star\",|{ id: \"ai-assistant\", icon: \"sparkle\", label: \"AI Copilot\"   },\n  { id: \"subscription\", icon: \"star\",|" "$SFILE"
fi
# Add TAB_TITLE if not already there
if ! grep -q '"ai-assistant"' "$SFILE" 2>/dev/null; then
  sed -i 's|security:     "Security",|security:      "Security",\n    "ai-assistant":"AI Copilot",|' "$SFILE"
fi
# Add PAGE_MAP entry if not already there
if ! grep -q 'DashboardAIAssistant' "$SFILE" 2>/dev/null; then
  sed -i 's|security:     <DashboardSecurity />,|security:     <DashboardSecurity />,\n    "ai-assistant":<DashboardAIAssistant />,|' "$SFILE"
fi
write "src/pages/SellerDashboard.jsx  (AI Copilot tab injected)"

echo ""

# ══════════════════════════════════════════════════════
# STEP 3 — Verify
# ══════════════════════════════════════════════════════
echo -e "${YELLOW}[3/3] Verifying…${NC}"
ALL_OK=true
FILES=(
  "$FE/../index.css"
  "$FE/services/aiUsageService.js"
  "$FE/services/aiService.js"
  "$FE/hooks/useAIUsage.js"
  "$FE/hooks/useAISettings.js"
  "$FE/hooks/useAIContext.js"
  "$FE/hooks/useAIChat.js"
  "$FE/components/ai/AIMessage.jsx"
  "$FE/pages/dashboard/AIAssistant.jsx"
)
for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then echo -e "  ${GREEN}✓${NC} $(basename $f)"
  else echo -e "  ${RED}✗${NC} $f"; ALL_OK=false; fi
done

echo ""
if [ "$ALL_OK" = true ]; then
  echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   ✓  All files installed!              ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BLUE}Run your dev server:${NC}"
  echo -e "  cd Beme-Frontend && npm run dev"
  echo ""
  echo -e "${YELLOW}Then go to your seller dashboard → AI Copilot tab${NC}"
  echo -e "  (visible only to Pro plan sellers)"
  echo ""
else
  echo -e "${RED}╔════════════════════════════════════════╗${NC}"
  echo -e "${RED}║   ✗  Some files failed to write        ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════╝${NC}"
fi
