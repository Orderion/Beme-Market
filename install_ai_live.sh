#!/bin/bash

# ═══════════════════════════════════════════════════════════════════
#  BEME AI — MAKE IT LIVE INSTALLER
#  Run from your Beme Project root:  bash install_ai_live.sh
# ═══════════════════════════════════════════════════════════════════

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Beme AI — Go Live Installer          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE="$SCRIPT_DIR/Beme-Frontend/src"
BE="$SCRIPT_DIR/Beme-Backend/src"

if [ ! -d "$FE" ] || [ ! -d "$BE" ]; then
  echo -e "${RED}✗ Cannot find Beme-Frontend/src or Beme-Backend/src${NC}"
  echo "  Run this from: C:/Users/user/Documents/Beme Project"
  exit 1
fi

echo -e "${BLUE}► Frontend:${NC} $FE"
echo -e "${BLUE}► Backend: ${NC} $BE"
echo ""

# ══════════════════════════════════════════════════════
# STEP 1 — Install @anthropic-ai/sdk in backend
# ══════════════════════════════════════════════════════
echo -e "${YELLOW}[1/4] Installing Anthropic SDK in backend…${NC}"
cd "$SCRIPT_DIR/Beme-Backend"
if npm list @anthropic-ai/sdk > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} @anthropic-ai/sdk already installed"
else
  npm install @anthropic-ai/sdk --save
  if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} @anthropic-ai/sdk installed"
  else
    echo -e "  ${RED}✗${NC} Failed to install SDK — check your internet connection"
    exit 1
  fi
fi
cd "$SCRIPT_DIR"
echo ""

# ══════════════════════════════════════════════════════
# STEP 2 — Write backend AI route
# ══════════════════════════════════════════════════════
echo -e "${YELLOW}[2/4] Writing backend AI route…${NC}"

cat > "$BE/routes/aiRoutes.js" << 'ROUTEOF'
const express  = require("express");
const router   = express.Router();
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(context = {}) {
  const { currentPage = "home", shopName = "your store", plan = "pro" } = context;

  const PAGE_CONTEXT = {
    home:         "The seller is on the Dashboard Home — viewing revenue, orders, visitors, recent activity, and product performance summaries.",
    products:     "The seller is on the Products tab — managing inventory, adding/editing products, uploading images, managing pricing, stock, SEO, and boosting listings.",
    orders:       "The seller is on the Orders tab — viewing and managing customer purchases, updating order status, handling refunds, and communicating with buyers.",
    customers:    "The seller is on the Customers tab — viewing buyer history, identifying repeat customers, managing notes, and monitoring loyalty behavior.",
    chat:         "The seller is on the Messages tab — the direct communication center with buyers for order discussions, product questions, and customer support.",
    marketing:    "The seller is on the Marketing tab — creating discounts, flash sales, promotions, boosting products, managing campaigns and banners.",
    analytics:    "The seller is on the Analytics tab — viewing revenue, traffic, conversion rates, product performance, and customer behavior data.",
    appearance:   "The seller is on the Store Design tab — customizing storefront themes, uploading banners/logos, changing colors/fonts, managing layout.",
    subscription: "The seller is on the Subscription tab — viewing their plan, upgrading, managing billing and payment methods.",
    delivery:     "The seller is on the Delivery tab — configuring delivery options, fees, zones, and fulfillment rules.",
    verification: "The seller is on the Verification tab — submitting documents for the Beme Market verified badge.",
    security:     "The seller is on the Security tab — managing account security and two-factor authentication.",
    "ai-assistant":"The seller is on the AI Copilot page — their AI assistant and automation control center.",
  };

  return `You are the Beme AI Seller Copilot — a smart, friendly, and highly knowledgeable business assistant built directly into the Beme Market seller dashboard.

== WHO YOU ARE ==
You are a dedicated AI business partner for sellers on Beme Market — a Ghana-based social-commerce marketplace. You know every part of the platform deeply and give sellers specific, actionable guidance.

Personality:
- Smart and confident like a business advisor
- Friendly and approachable like a helpful colleague  
- Encouraging, especially for beginners
- Simple and clear — never robotic or overly technical
- Modern and premium — like Shopify Sidekick or ChatGPT

== BEME MARKET PLATFORM ==
Beme Market is a Ghana-based social-commerce marketplace combining:
- Shopify-style seller tools (products, orders, analytics, storefronts)
- Jumia/Amazon-style marketplace for product discovery
- TikTok Shop-style social selling and discovery
- WhatsApp-style direct seller-buyer communication

Sellers: fashion brands, sneaker sellers, beauty/perfume, electronics, food vendors, jewelry, creators, local Ghanaian businesses.
Goal: make online selling simple, modern, and scalable for African businesses.

== SELLER CONTEXT ==
Store: ${shopName}
Plan: ${plan}
Current page: ${PAGE_CONTEXT[currentPage] || PAGE_CONTEXT.home}

== FULL DASHBOARD KNOWLEDGE ==
DASHBOARD HOME: revenue, orders, visitors, traffic, recent activity, product performance, quick stats, shortcuts.
PRODUCTS: add/edit/delete/archive products, upload images/videos, manage pricing/stock/inventory, assign categories/tags, SEO titles/descriptions, collections, boost products, schedule launches.
ORDERS: view/accept/reject orders, update status, mark delivered, communicate with buyers, track fulfillment, manage cancellations/refunds, order history.
CUSTOMERS: customer history, repeat buyers, activity tracking, notes/tags, loyalty monitoring, purchase frequency.
MESSAGES: direct buyer messaging, images, order discussions, product questions, quick replies, notifications.
MARKETING: discounts/promo codes, flash sales, promotions, product boosts, banners, campaigns, referral programs, featured listings.
ANALYTICS: revenue analytics, product performance, traffic, conversion rates, customer behavior, retention, top products.
STORE DESIGN: themes, banners/logos, colors/fonts, layout, collections display, visual branding.
SUBSCRIPTION: view/upgrade plan (Basic/Standard/Pro), billing, invoices, payment methods, feature access.
DELIVERY: delivery options, fees, zones, fulfillment rules.
VERIFICATION: verified badge, document submission, verification status.
SECURITY: account security, 2FA, login sessions.

== HOW YOU HELP ==
- Explain metrics and performance in plain simple language
- Write optimized product descriptions, SEO titles, captions
- Suggest GHS-based pricing strategies for the Ghanaian market
- Create Instagram, TikTok, and WhatsApp marketing content
- Write professional customer replies and messages
- Explain analytics clearly for beginners
- Suggest specific growth strategies
- Guide sellers through platform features step by step
- Help with order management and customer satisfaction
- Recommend store design improvements

== LANGUAGE & TONE ==
- Primary: English (professional and clear)
- Can use light Ghanaian Pidgin naturally when friendly/casual: "No stress, I got you", "Make we see how we go improve this"
- Never force Pidgin — use only when natural
- Always use GHS for pricing examples
- Be specific and actionable — no vague advice
- Keep responses beginner-friendly and encouraging
- Maximum 300 words unless more detail is requested
- Always end with a specific next action the seller can take

You are the smartest business tool on Beme Market. Every seller should feel like they have a professional business advisor in their pocket.`;
}

router.post("/chat", async (req, res) => {
  try {
    const { messages = [], context = {} } = req.body;
    if (!messages.length) return res.status(400).json({ error: "No messages provided" });

    const validMessages = messages
      .filter(m => m.role && m.content && typeof m.content === "string")
      .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));

    if (!validMessages.length) return res.status(400).json({ error: "Invalid message format" });

    const response = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:     buildSystemPrompt(context),
      messages:   validMessages,
    });

    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    res.json({ content: text, usage: response.usage });

  } catch (err) {
    console.error("[AI /chat] error:", err?.message || err);
    if (err?.status === 401) return res.status(401).json({ error: "Invalid API key" });
    if (err?.status === 429) return res.status(429).json({ error: "Rate limit reached" });
    if (err?.status === 529) return res.status(503).json({ error: "Claude API overloaded" });
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

module.exports = router;
ROUTEOF

echo -e "  ${GREEN}✓${NC} Beme-Backend/src/routes/aiRoutes.js"

# ══════════════════════════════════════════════════════
# STEP 3 — Register route in app.js
# ══════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}[3/4] Registering AI route in app.js…${NC}"

APP_FILE="$BE/app.js"
if ! grep -q "aiRoutes" "$APP_FILE" 2>/dev/null; then
  # Add require after the last require line
  sed -i "s|const express = require.*|&\nconst aiRoutes = require('./routes/aiRoutes');|" "$APP_FILE"
  # Add route registration — find app.use and add after it
  sed -i "s|app\.use.*authRoutes.*|&\napp.use('/api/ai', aiRoutes);|" "$APP_FILE"
  echo -e "  ${GREEN}✓${NC} AI route registered in app.js"
else
  echo -e "  ${GREEN}✓${NC} AI route already registered in app.js"
fi

# ══════════════════════════════════════════════════════
# STEP 4 — Update frontend aiService.js
# ══════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}[4/4] Updating frontend aiService.js to call real API…${NC}"

cat > "$FE/services/aiService.js" << 'SVCEOF'
/**
 * aiService.js — calls real Claude API through Beme-Backend.
 * API key stays secure on the server, never exposed to the browser.
 */

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

const FALLBACK = [
  "I'm having a bit of trouble connecting right now. Please try again in a moment!",
  "Connection issue — please retry. Your message wasn't lost!",
  "I'm briefly unavailable. Try again in a few seconds.",
];

export async function sendAIMessage(messages, context = {}, uid = null) {
  try {
    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messages, context }),
    });

    if (!response.ok) {
      if (response.status === 429) return "I'm getting a lot of requests right now. Give me a second and try again! 🙏";
      if (response.status === 401) return "There's a configuration issue with the AI service. Please contact Beme support.";
      if (response.status === 503) return "Claude is briefly overloaded. Please try again in a few seconds!";
      console.error("[aiService] backend error:", response.status);
      return FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    }

    const data = await response.json();
    return data.content || FALLBACK[0];

  } catch (err) {
    console.error("[aiService] fetch error:", err);
    return FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
  }
}

export function buildSystemPrompt(context = {}) {
  return `Beme AI Copilot — ${context.shopName || "Seller"} — ${context.currentPage || "dashboard"}`;
}
SVCEOF

echo -e "  ${GREEN}✓${NC} Beme-Frontend/src/services/aiService.js"

# ══════════════════════════════════════════════════════
# DONE
# ══════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓  All done!                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT — Before deploying:${NC}"
echo ""
echo -e "  1. Make sure  ANTHROPIC_API_KEY  is in  Beme-Backend/.env"
echo -e "  2. Add it to Render environment variables:"
echo -e "     Render dashboard → your backend service → Environment → Add variable"
echo -e "     Key:   ANTHROPIC_API_KEY"
echo -e "     Value: sk-ant-your-key-here"
echo ""
echo -e "${BLUE}Then deploy:${NC}"
echo -e "  cd Beme-Backend && git add . && git commit -m 'Add AI Copilot backend' && git push"
echo ""
echo -e "${BLUE}Frontend will auto-deploy on Vercel.${NC}"
echo ""
