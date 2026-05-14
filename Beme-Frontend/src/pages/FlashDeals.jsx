import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./GetAStore.css";

/* ─── Pricing ─────────────────────────────────────────────────────────────── */
const MONTHLY = { free: 0, starter: 29, standard: 99, pro: 249 };
const YEARLY  = { free: 0, starter: 23, standard: 79, pro: 199 };

const PLANS = [
  {
    id: "free", name: "Free", tagline: "Test the waters",
    bg: "#fff", nameColor: "#9CA3AF", amtColor: "#111", cta: "Start for Free",
    ctaBg: "#111", ctaColor: "#fff", ctaBorder: "#111",
    dividerColor: "rgba(0,0,0,0.08)",
    features: [
      { t: "10 products",              ok: true  },
      { t: "Basic storefront",          ok: true  },
      { t: "WhatsApp redirect button",  ok: true  },
      { t: "Order management",          ok: true  },
      { t: "Basic analytics",           ok: true  },
      { t: "Live customer chat",        ok: false },
      { t: "Product boosts",            ok: false },
      { t: "Verified badge",            ok: false },
    ],
  },
  {
    id: "starter", name: "Starter", tagline: "Launch your store",
    bg: "#fff", nameColor: "#9CA3AF", amtColor: "#111", cta: "Get Starter",
    ctaBg: "transparent", ctaColor: "#111", ctaBorder: "rgba(0,0,0,0.2)",
    dividerColor: "rgba(0,0,0,0.08)",
    features: [
      { t: "25 products",             ok: true  },
      { t: "Custom banner & colors",  ok: true  },
      { t: "WhatsApp redirect",       ok: true  },
      { t: "Order notifications",     ok: true  },
      { t: "Basic categories",        ok: true  },
      { t: "Reduced Beme branding",   ok: true  },
      { t: "Live customer chat",      ok: false },
      { t: "Product boosts",          ok: false },
    ],
  },
  {
    id: "standard", name: "Standard", tagline: "Grow your brand", badge: "Most Popular",
    bg: "#046EF2", nameColor: "rgba(255,255,255,0.6)", amtColor: "#fff",
    cta: "Get Standard", ctaBg: "#fff", ctaColor: "#046EF2", ctaBorder: "#fff",
    dividerColor: "rgba(255,255,255,0.15)",
    features: [
      { t: "500 products",               ok: true },
      { t: "Premium store themes",       ok: true },
      { t: "Real-time customer chat",    ok: true },
      { t: "Discount codes & flash sales", ok: true },
      { t: "Featured product boosts",    ok: true },
      { t: "Verified badge eligible",    ok: true },
      { t: "TikTok / Instagram links",   ok: true },
      { t: "Customer reviews enabled",   ok: true },
      { t: "Sales & visit analytics",    ok: true },
    ],
  },
  {
    id: "pro", name: "Pro", tagline: "Dominate the market", badge: "Business Pro",
    bg: "#fff", nameColor: "#7C3AED", amtColor: "#111", cta: "Get Pro",
    ctaBg: "#7C3AED", ctaColor: "#fff", ctaBorder: "#7C3AED",
    dividerColor: "rgba(0,0,0,0.08)",
    features: [
      { t: "Unlimited products",          ok: true },
      { t: "Custom domain",               ok: true },
      { t: "AI captions & descriptions",  ok: true },
      { t: "Live selling sessions",        ok: true },
      { t: "Loyalty rewards & referrals", ok: true },
      { t: "Homepage featured placement", ok: true },
      { t: "Priority marketplace ranking",ok: true },
      { t: "AI auto-replies in chat",     ok: true },
      { t: "Pro Verified badge",          ok: true },
      { t: "Remove Beme branding",        ok: true },
    ],
  },
];

const STATS = [
  { value: "2,400+",  label: "Active sellers across Ghana" },
  { value: "GHS 1M+", label: "Processed every month"      },
  { value: "160+",    label: "Cities and towns reached"    },
  { value: "4.9 / 5", label: "Average seller rating"      },
];

const WHY = [
  { title: "Built for Ghana",       desc: "MoMo, Visa, and bank payments built in. Customers pay the way they already do.",              d: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z M12 9m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0" },
  { title: "Your Products, Your Prices", desc: "Sell fashion, electronics, food, handmade goods — anything legal. Your price, your rules.", d: "M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z M9 21V12h6v9" },
  { title: "Get Paid to MoMo",      desc: "Withdraw to MTN, Telecel, or AirtelTigo MoMo — or your Ghanaian bank. Minimum GHS 50.",        d: "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12h.01" },
  { title: "Real Buyers Waiting",   desc: "Thousands of active Ghanaian shoppers already on Beme Market, browsing every day.",            d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
  { title: "Sell on WhatsApp & TikTok", desc: "Share your store link anywhere. Every click lands on your store and goes to your dashboard.", d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13" },
  { title: "Chat With Buyers",      desc: "Standard and Pro sellers get in-app live chat. Close deals faster, right in the dashboard.",    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
];

const HOW = [
  { n: "01", title: "Create Your Account",    desc: "Sign up in under a minute. Your buyer and seller account are the same — no switching." },
  { n: "02", title: "Set Up Your Store",       desc: "Add your store name, products, banner, and WhatsApp number. Done in 10 minutes."      },
  { n: "03", title: "Pick a Plan",            desc: "Start free or go straight to Standard. Pay with MoMo, Visa, or Mastercard."           },
  { n: "04", title: "Share & Get Paid",       desc: "Post your store link anywhere. Orders come to your dashboard. Withdraw to MoMo."      },
];

const FAQS = [
  { q: "Is this like Jumia?",               a: "Not exactly. On Jumia you can only buy. On Beme Market you open your own store and sell your own products — like Jumia meets your personal shop, built for Ghana." },
  { q: "Do I need a Ghana Card?",            a: "No. You can start selling immediately. Ghana Card is only needed if you later apply for the Verified Seller badge." },
  { q: "How do I get paid?",                 a: "Payments go to your Beme wallet. Withdraw to MTN, Telecel, AirtelTigo MoMo, or your Ghanaian bank. Minimum withdrawal is GHS 50." },
  { q: "Is the Free plan really free?",      a: "Yes. No card, no trial. You get 10 products and a real storefront for as long as you want. Upgrade whenever you're ready." },
  { q: "Can I sell second-hand items?",      a: "Yes — as long as they're legal and accurately described. No counterfeit or stolen goods." },
  { q: "Can I change my plan later?",        a: "Yes, anytime from your seller dashboard. Upgrades apply immediately. Downgrades kick in at the next billing date." },
];

/* ─── Hero SVG Illustration ───────────────────────────────────────────────── */
function HeroIllustration() {
  return (
    <svg viewBox="0 0 480 520" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 460, height: "auto" }}>
      <defs>
        <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#000" floodOpacity="0.08"/>
        </filter>
        <filter id="phoneShadow" x="-15%" y="-10%" width="130%" height="125%">
          <feDropShadow dx="0" dy="16" stdDeviation="24" floodColor="#046EF2" floodOpacity="0.18"/>
        </filter>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EEF4FF"/>
          <stop offset="100%" stopColor="#F5F0FF"/>
        </linearGradient>
        <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#046EF2"/>
          <stop offset="100%" stopColor="#0357C7"/>
        </linearGradient>
        <clipPath id="screenClip">
          <rect x="176" y="72" width="148" height="296" rx="20"/>
        </clipPath>
      </defs>

      {/* ── Background ── */}
      <circle cx="260" cy="256" r="220" fill="url(#bgGrad)"/>
      <circle cx="390" cy="100" r="55" fill="#DBEAFE" opacity="0.5"/>
      <circle cx="70"  cy="400" r="38" fill="#EDE9FE" opacity="0.5"/>
      <circle cx="420" cy="390" r="28" fill="#DBEAFE" opacity="0.35"/>

      {/* ── Person silhouette (seller) ── */}
      {/* Body */}
      <ellipse cx="370" cy="420" rx="22" ry="6" fill="#111" opacity="0.06"/>
      <rect x="351" y="360" width="38" height="62" rx="10" fill="#1A1A2E"/>
      {/* Shirt/top detail */}
      <rect x="351" y="360" width="38" height="18" rx="10" fill="#046EF2"/>
      <rect x="351" y="370" width="38" height="8" fill="#046EF2"/>
      {/* Head */}
      <circle cx="370" cy="338" r="22" fill="#FBBF82"/>
      {/* Hair */}
      <path d="M348 330 Q350 310 370 308 Q390 310 392 330 Q390 315 370 313 Q350 315 348 330Z" fill="#1A0A00"/>
      {/* Face features */}
      <circle cx="363" cy="338" r="2.5" fill="#333" opacity="0.7"/>
      <circle cx="377" cy="338" r="2.5" fill="#333" opacity="0.7"/>
      <path d="M364 346 Q370 350 376 346" stroke="#333" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6"/>
      {/* Left arm — holding phone */}
      <path d="M351 375 Q330 385 322 395 L328 404 Q334 392 355 384Z" fill="#FBBF82"/>
      {/* Right arm — relaxed */}
      <path d="M389 375 Q408 382 412 395 L406 400 Q400 388 385 382Z" fill="#FBBF82"/>
      {/* Legs */}
      <rect x="356" y="418" width="10" height="36" rx="5" fill="#1A1A2E"/>
      <rect x="374" y="418" width="10" height="36" rx="5" fill="#1A1A2E"/>
      {/* Shoes */}
      <ellipse cx="361" cy="454" rx="9" ry="5" fill="#111"/>
      <ellipse cx="379" cy="454" rx="9" ry="5" fill="#111"/>

      {/* ── Phone in seller's hand ── */}
      <rect x="308" y="390" width="28" height="46" rx="5" fill="#111"/>
      <rect x="311" y="393" width="22" height="40" rx="3" fill="#1A2540"/>
      {/* Tiny screen glow */}
      <rect x="312" y="394" width="20" height="38" rx="3" fill="#046EF2" opacity="0.15"/>
      <rect x="314" y="397" width="16" height="4" rx="2" fill="#fff" opacity="0.4"/>
      <rect x="314" y="403" width="12" height="3" rx="1.5" fill="#fff" opacity="0.25"/>
      <rect x="314" y="408" width="14" height="3" rx="1.5" fill="#fff" opacity="0.2"/>
      {/* WhatsApp-style chat bubble on phone */}
      <rect x="313" y="414" width="16" height="10" rx="3" fill="#22C55E" opacity="0.6"/>
      <rect x="315" y="416" width="12" height="2" rx="1" fill="#fff" opacity="0.8"/>
      <rect x="315" y="420" width="8"  height="2" rx="1" fill="#fff" opacity="0.5"/>

      {/* ── Main phone mockup (left/center) ── */}
      <rect x="148" y="48" width="168" height="348" rx="30" fill="#0F0F12" filter="url(#phoneShadow)"/>
      {/* Side buttons */}
      <rect x="145" y="140" width="4" height="32" rx="2" fill="#222"/>
      <rect x="145" y="182" width="4" height="32" rx="2" fill="#222"/>
      <rect x="316" y="150" width="4" height="48" rx="2" fill="#222"/>
      {/* Screen bezel */}
      <rect x="156" y="60" width="152" height="324" rx="22" fill="#1A1A2E"/>
      {/* Screen */}
      <rect x="159" y="63" width="146" height="318" rx="20" fill="#F8FAFF"/>
      {/* Notch */}
      <rect x="198" y="58" width="68" height="14" rx="7" fill="#0F0F12"/>
      <circle cx="226" cy="65" r="3.5" fill="#1A1A2E"/>
      {/* Home indicator */}
      <rect x="207" y="366" width="50" height="4" rx="2" fill="#CBD5E1"/>

      {/* ── SCREEN CONTENT ── */}
      {/* App header */}
      <rect x="159" y="63" width="146" height="56" rx="20" fill="url(#screenGrad)"/>
      <rect x="159" y="83" width="146" height="36" fill="url(#screenGrad)"/>
      {/* Avatar */}
      <circle cx="178" cy="91" r="11" fill="rgba(255,255,255,0.2)"/>
      <circle cx="178" cy="87" r="5" fill="rgba(255,255,255,0.4)"/>
      <path d="M168 97 Q178 93 188 97" fill="rgba(255,255,255,0.3)"/>
      {/* Store name bar */}
      <rect x="194" y="85" width="55" height="7" rx="3" fill="rgba(255,255,255,0.75)"/>
      <rect x="194" y="96" width="38" height="5" rx="2" fill="rgba(255,255,255,0.4)"/>
      {/* Bell */}
      <circle cx="289" cy="91" r="11" fill="rgba(255,255,255,0.12)"/>
      <path d="M284 88 Q284 84 289 84 Q294 84 294 88 L295 93 Q295 95 289 96 Q283 95 283 93Z" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3"/>
      <path d="M287 96 Q289 98 291 96" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="294" cy="84" r="3" fill="#EF4444"/>

      {/* Revenue card */}
      <rect x="167" y="127" width="136" height="58" rx="12" fill="#fff" filter="url(#cardShadow)"/>
      <rect x="175" y="134" width="52" height="6" rx="3" fill="#E2E8F0"/>
      <rect x="175" y="144" width="80" height="14" rx="4" fill="#046EF2" opacity="0.12"/>
      <rect x="178" y="147" width="70" height="8" rx="3" fill="#046EF2"/>
      {/* Trend up */}
      <rect x="175" y="163" width="44" height="6" rx="3" fill="#DCFCE7"/>
      <rect x="177" y="165" width="28" height="2" rx="1" fill="#22C55E"/>
      {/* Mini sparkline */}
      <polyline points="234,173 240,166 247,169 254,161 261,163 268,156 275,158 282,150 289,152 296,145"
        stroke="#046EF2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>

      {/* 2 stat mini cards */}
      <rect x="167" y="193" width="62" height="44" rx="10" fill="#EEF4FF"/>
      <rect x="175" y="200" width="38" height="6" rx="3" fill="#CBD5E1"/>
      <rect x="175" y="210" width="28" height="10" rx="3" fill="#046EF2" opacity="0.85"/>
      <rect x="175" y="224" width="20" height="5" rx="2" fill="#22C55E" opacity="0.6"/>

      <rect x="237" y="193" width="66" height="44" rx="10" fill="#F5F3FF"/>
      <rect x="245" y="200" width="38" height="6" rx="3" fill="#CBD5E1"/>
      <rect x="245" y="210" width="30" height="10" rx="3" fill="#7C3AED" opacity="0.7"/>
      <rect x="245" y="224" width="22" height="5" rx="2" fill="#F59E0B" opacity="0.7"/>

      {/* Bar chart panel */}
      <rect x="167" y="245" width="136" height="64" rx="12" fill="#fff" filter="url(#cardShadow)"/>
      <rect x="175" y="252" width="48" height="6" rx="3" fill="#E2E8F0"/>
      {/* Bars */}
      <rect x="178" y="275" width="13" height="26" rx="3" fill="#046EF2" opacity="0.15"/>
      <rect x="195" y="268" width="13" height="33" rx="3" fill="#046EF2" opacity="0.3"/>
      <rect x="212" y="261" width="13" height="40" rx="3" fill="#046EF2" opacity="0.55"/>
      <rect x="229" y="265" width="13" height="36" rx="3" fill="#046EF2" opacity="0.45"/>
      <rect x="246" y="255" width="13" height="46" rx="3" fill="#046EF2" opacity="0.8"/>
      <rect x="263" y="258" width="13" height="43" rx="3" fill="#046EF2" opacity="0.65"/>
      <rect x="280" y="250" width="15" height="51" rx="3" fill="#046EF2"/>

      {/* Orders list */}
      <rect x="167" y="317" width="136" height="56" rx="12" fill="#fff" filter="url(#cardShadow)"/>
      <rect x="175" y="324" width="44" height="6" rx="3" fill="#E2E8F0"/>
      {/* Row 1 */}
      <circle cx="182" cy="342" r="8" fill="#EEF4FF"/>
      <rect x="195" y="337" width="52" height="5" rx="2.5" fill="#E2E8F0"/>
      <rect x="195" y="345" width="34" height="4" rx="2" fill="#BFDBFE"/>
      <rect x="277" y="335" width="20" height="14" rx="5" fill="#DCFCE7"/>
      <rect x="279" y="340" width="16" height="4" rx="2" fill="#22C55E" opacity="0.6"/>
      {/* Row 2 */}
      <circle cx="182" cy="360" r="8" fill="#F5F3FF"/>
      <rect x="195" y="355" width="46" height="5" rx="2.5" fill="#E2E8F0"/>
      <rect x="195" y="363" width="30" height="4" rx="2" fill="#DDD6FE"/>
      <rect x="277" y="353" width="20" height="14" rx="5" fill="#FEF3C7"/>
      <rect x="279" y="358" width="16" height="4" rx="2" fill="#F59E0B" opacity="0.6"/>

      {/* ── FLOATING CARDS ── */}

      {/* Card — Order received (top right) */}
      <rect x="336" y="108" width="132" height="70" rx="14" fill="#fff" filter="url(#cardShadow)"/>
      <circle cx="357" cy="131" r="14" fill="#EEF4FF"/>
      {/* Check */}
      <polyline points="350,131 355,136 365,124" stroke="#046EF2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <rect x="378" y="118" width="72" height="7" rx="3.5" fill="#111" opacity="0.8"/>
      <rect x="378" y="129" width="52" height="6" rx="3" fill="#E2E8F0"/>
      <rect x="378" y="139" width="62" height="6" rx="3" fill="#046EF2" opacity="0.35"/>
      <rect x="378" y="150" width="42" height="6" rx="3" fill="#DCFCE7"/>
      {/* Pulse */}
      <circle cx="460" cy="118" r="6" fill="#22C55E"/>
      <circle cx="460" cy="118" r="10" fill="#22C55E" opacity="0.2"/>

      {/* Card — MoMo Payment (bottom left) */}
      <rect x="10" y="308" width="148" height="76" rx="14" fill="#fff" filter="url(#cardShadow)"/>
      {/* MoMo-style icon */}
      <rect x="22" y="320" width="32" height="32" rx="8" fill="#FFB800"/>
      <circle cx="38" cy="336" r="10" fill="#FF6B00" opacity="0.5"/>
      <path d="M32 334 L36 330 L38 333 L40 328 L44 334" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <rect x="62" y="321" width="74" height="7" rx="3.5" fill="#E2E8F0"/>
      <rect x="62" y="333" width="82" height="11" rx="5" fill="#DCFCE7"/>
      <rect x="65" y="337" width="64" height="5" rx="2" fill="#22C55E" opacity="0.7"/>
      <rect x="62" y="349" width="56" height="6" rx="3" fill="#E2E8F0" opacity="0.7"/>
      <rect x="62" y="359" width="40" height="6" rx="3" fill="#E2E8F0" opacity="0.5"/>
      <circle cx="148" cy="318" r="5" fill="#22C55E"/>
      <circle cx="148" cy="318" r="9" fill="#22C55E" opacity="0.18"/>

      {/* Card — Product listing (top left) */}
      <rect x="8" y="130" width="130" height="80" rx="14" fill="#fff" filter="url(#cardShadow)"/>
      {/* Product image placeholder */}
      <rect x="18" y="140" width="46" height="60" rx="8" fill="#EEF4FF"/>
      <rect x="26" y="150" width="30" height="20" rx="4" fill="#BFDBFE"/>
      <path d="M26 170 L28 165 L33 172 L37 162 L43 172 L50 160 L56 172" stroke="#046EF2" strokeWidth="1.2" fill="none" opacity="0.4"/>
      {/* Product info */}
      <rect x="70" y="142" width="58" height="7" rx="3" fill="#E2E8F0"/>
      <rect x="70" y="153" width="44" height="6" rx="3" fill="#E2E8F0" opacity="0.7"/>
      <rect x="70" y="163" width="38" height="9" rx="4" fill="#046EF2" opacity="0.9"/>
      <rect x="73" y="166" width="30" height="3" rx="1.5" fill="#fff" opacity="0.7"/>
      {/* Stars */}
      {[0,1,2,3,4].map((i) => (
        <path key={i}
          d={`M${70 + i*12} 181 L${71.2 + i*12} 184.6 L${75 + i*12} 184.6 L${72 + i*12} 186.8 L${73.2 + i*12} 190 L${70 + i*12} 187.8 L${66.8 + i*12} 190 L${68 + i*12} 186.8 L${65 + i*12} 184.6 L${68.8 + i*12} 184.6Z`}
          fill="#F59E0B" opacity={i < 4 ? 0.85 : 0.3}
          transform={`scale(0.55) translate(${70 + i * 8}, ${168})`}
        />
      ))}
      <rect x="70" y="180" width="50" height="5" rx="2" fill="#FEF3C7"/>
      <rect x="71" y="181" width="38" height="3" rx="1.5" fill="#F59E0B" opacity="0.5"/>

      {/* Card — Verified badge (bottom right) */}
      <rect x="336" y="342" width="136" height="68" rx="14" fill="#fff" filter="url(#cardShadow)"/>
      <circle cx="360" cy="368" r="16" fill="#EEF4FF"/>
      {/* Shield check */}
      <path d="M355 361 L360 358 L365 361 L365 368 Q365 373 360 375 Q355 373 355 368Z" fill="#046EF2" opacity="0.9"/>
      <polyline points="357,368 360,371 364,364" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <rect x="382" y="357" width="76" height="8" rx="4" fill="#111" opacity="0.8"/>
      <rect x="382" y="369" width="58" height="6" rx="3" fill="#BFDBFE"/>
      <rect x="382" y="380" width="46" height="6" rx="3" fill="#E2E8F0" opacity="0.6"/>
      <circle cx="462" cy="352" r="5" fill="#046EF2"/>
      <circle cx="462" cy="352" r="9" fill="#046EF2" opacity="0.15"/>

      {/* ── Dashed connector lines ── */}
      <line x1="156" y1="192" x2="138" y2="182" stroke="#046EF2" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.2"/>
      <line x1="305" y1="162" x2="335" y2="148" stroke="#046EF2" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.2"/>
      <line x1="163" y1="328" x2="158" y2="342" stroke="#046EF2" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.2"/>
      <line x1="305" y1="340" x2="335" y2="358" stroke="#046EF2" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.2"/>

      {/* ── Sparkles ── */}
      <path d="M428 218 L430 224 L436 226 L430 228 L428 234 L426 228 L420 226 L426 224Z" fill="#046EF2" opacity="0.25"/>
      <path d="M60  192 L61.5 196.5 L66 198 L61.5 199.5 L60 204 L58.5 199.5 L54 198 L58.5 196.5Z" fill="#7C3AED" opacity="0.2"/>
      <path d="M446 420 L447 423 L450 424 L447 425 L446 428 L445 425 L442 424 L445 423Z" fill="#22C55E" opacity="0.4"/>
      <circle cx="76"  cy="274" r="5" fill="#046EF2" opacity="0.15"/>
      <circle cx="450" cy="280" r="4" fill="#7C3AED" opacity="0.18"/>
      <circle cx="120" cy="86"  r="7" fill="#046EF2" opacity="0.1"/>
      <circle cx="420" cy="460" r="5" fill="#F59E0B" opacity="0.2"/>
    </svg>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function Ico({ d, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split(" M").map((seg, i) => <path key={i} d={(i === 0 ? "" : "M") + seg}/>)}
    </svg>
  );
}
function CheckIcon({ color = "#046EF2" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB"
      strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function GetAStore() {
  const navigate = useNavigate();
  const { user, isSeller, isSellerActive } = useAuth();
  const [billing, setBilling] = useState("monthly");
  const prices = billing === "yearly" ? YEARLY : MONTHLY;

  const goStart = (planId) => {
    // Already an active seller → go straight to dashboard
    if (isSellerActive) { navigate("/seller-dashboard"); return; }
    // Logged in (customer on the way to becoming a seller) → start onboarding
    const to = `/store-onboarding?plan=${planId}`;
    if (user) { navigate(to); return; }
    // Not logged in → send to login then back to onboarding
    navigate(`/login?redirect=${encodeURIComponent(to)}`);
  };

  return (
    <div className="gsa-root">

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <div className="gsa-hero">
        {/* Text side */}
        <div className="gsa-hero-inner">
          <div className="gsa-hero-tag">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            Selling in Ghana, made simple
          </div>

          <h1 className="gsa-hero-title">
            Open your store.<br/>
            Sell to Ghana.<br/>
            Get paid to MoMo.
          </h1>

          <p className="gsa-hero-sub">
            Beme Market is where thousands of Ghanaians shop every day. Get your own store, list your products, and receive orders — starting free.
          </p>

          <div className="gsa-hero-btns">
            <button className="gsa-btn-primary" onClick={() => goStart("free")}>
              Open a Free Store →
            </button>
            <button className="gsa-btn-ghost"
              onClick={() => document.getElementById("gsa-pricing").scrollIntoView({ behavior: "smooth" })}>
              View Pricing
            </button>
          </div>

          <div className="gsa-hero-trust">
            {["No card required","MoMo payouts","Free plan available","Setup in 10 minutes"].map((t) => (
              <div key={t} className="gsa-hero-trust-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Illustration side */}
        <div className="gsa-hero-visual">
          <HeroIllustration />
        </div>
      </div>

      {/* ══ STATS ══════════════════════════════════════════════════════════════ */}
      <section className="gsa-stats">
        {STATS.map((s) => (
          <div key={s.label} className="gsa-stat-item">
            <div className="gsa-stat-val">{s.value}</div>
            <div className="gsa-stat-lbl">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ══ WHY ════════════════════════════════════════════════════════════════ */}
      <section className="gsa-section">
        <div className="gsa-section-label">Why Open a Store</div>
        <h2 className="gsa-section-title">Everything you need to sell in Ghana</h2>
        <div className="gsa-why-grid">
          {WHY.map((w) => (
            <div key={w.title} className="gsa-why-card">
              <div className="gsa-why-icon"><Ico d={w.d} size={22}/></div>
              <h3 className="gsa-why-title">{w.title}</h3>
              <p className="gsa-why-desc">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════════════════ */}
      <section className="gsa-dark-section">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="gsa-section-label gsa-label-dark">How it works</div>
          <h2 className="gsa-section-title gsa-title-dark">Up and selling in 4 steps</h2>
          <div className="gsa-how-grid">
            {HOW.map((h) => (
              <div key={h.n} className="gsa-how-item">
                <div className="gsa-how-num">{h.n}</div>
                <h3 className="gsa-how-title">{h.title}</h3>
                <p className="gsa-how-desc">{h.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 52 }}>
            <button className="gsa-btn-white" onClick={() => goStart("free")}>
              Open Your Store — It's Free →
            </button>
          </div>
        </div>
      </section>

      {/* ══ PRICING ════════════════════════════════════════════════════════════ */}
      <section className="gsa-section" id="gsa-pricing">
        <div className="gsa-section-label">Pricing</div>
        <h2 className="gsa-section-title">Choose how you want to sell</h2>
        <p className="gsa-section-sub">Start free. Upgrade when you're ready. Cancel anytime.</p>

        <div className="gsa-billing-toggle">
          <button className={`gsa-toggle-btn ${billing === "monthly" ? "gsa-toggle-active" : ""}`} onClick={() => setBilling("monthly")}>Monthly</button>
          <button className={`gsa-toggle-btn ${billing === "yearly"  ? "gsa-toggle-active" : ""}`} onClick={() => setBilling("yearly")}>
            Yearly <span className="gsa-toggle-badge">Save 20%</span>
          </button>
        </div>

        <div className="gsa-plans-grid">
          {PLANS.map((plan) => {
            const price  = prices[plan.id];
            const isFree = price === 0;
            const isDark = plan.bg === "#046EF2";
            return (
              <div key={plan.id}
                className={`gsa-plan-card ${plan.badge === "Most Popular" ? "gsa-plan-popular" : ""}`}
                style={{ background: plan.bg }}>
                {plan.badge && (
                  <div className="gsa-plan-badge" style={{ background: plan.badge === "Most Popular" ? "#111" : "#7C3AED", color: "#fff" }}>
                    {plan.badge}
                  </div>
                )}
                <div className="gsa-plan-name" style={{ color: plan.nameColor }}>{plan.name}</div>
                <div className="gsa-plan-price">
                  {isFree
                    ? <span className="gsa-plan-amt" style={{ color: plan.amtColor }}>Free</span>
                    : <><span className="gsa-plan-amt" style={{ color: plan.amtColor }}>GHS {price}</span>
                        <span className="gsa-plan-unit" style={{ color: isDark ? "rgba(255,255,255,0.55)" : "#9CA3AF" }}> / mo</span></>
                  }
                </div>
                {billing === "yearly" && !isFree && (
                  <div className="gsa-plan-yearly-note" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#9CA3AF" }}>
                    Billed GHS {price * 12} / year
                  </div>
                )}
                <div className="gsa-plan-tagline" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#6B7280" }}>{plan.tagline}</div>
                <button className="gsa-plan-cta"
                  style={{ background: plan.ctaBg, color: plan.ctaColor, border: `2px solid ${plan.ctaBorder}` }}
                  onClick={() => goStart(plan.id)}>
                  {plan.cta}
                </button>
                <div className="gsa-plan-divider" style={{ borderTopColor: plan.dividerColor }}/>
                <ul className="gsa-plan-features">
                  {plan.features.map((f) => (
                    <li key={f.t} style={{ color: f.ok ? (isDark ? "rgba(255,255,255,0.9)" : "#1A1D3B") : "#9CA3AF" }}>
                      {f.ok ? <CheckIcon color={isDark ? "#fff" : plan.id === "pro" ? "#7C3AED" : "#046EF2"}/> : <CrossIcon/>}
                      {f.t}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {billing === "yearly" && (
          <p className="gsa-yearly-note">All yearly plans billed upfront · 20% cheaper than monthly · Cancel anytime</p>
        )}
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════════════════════ */}
      <section className="gsa-dark-section">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="gsa-section-label gsa-label-dark">FAQ</div>
          <h2 className="gsa-section-title gsa-title-dark">Common questions</h2>
          <div className="gsa-faq-grid">
            {FAQS.map((f) => (
              <div key={f.q} className="gsa-faq-card">
                <h4 className="gsa-faq-q">{f.q}</h4>
                <p className="gsa-faq-a">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════════════════════ */}
      <section className="gsa-cta-section">
        <h2 className="gsa-cta-title">Ready to start selling?</h2>
        <p className="gsa-cta-sub">
          Join 2,400+ Ghanaian sellers already making money on Beme Market.<br/>
          Free. No card. No contract.
        </p>
        <button className="gsa-btn-primary gsa-cta-btn" onClick={() => goStart("free")}>
          Open a Free Store →
        </button>
      </section>

    </div>
  );
}