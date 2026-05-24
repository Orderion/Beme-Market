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
