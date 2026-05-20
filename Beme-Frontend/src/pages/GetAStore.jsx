import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "../hooks/useSellerAuth";
import { SELLER_APPLIED_KEY } from "../components/SellerRoute";
import "./GetAStore.css";

/* ─── Pricing ─────────────────────────────────────────────── */
const MONTHLY = { free: 0, starter: 29, standard: 99, pro: 249 };
const YEARLY  = { free: 0, starter: 23, standard: 79, pro: 199 };

const PLANS = [
  {
    id:"free", name:"Free", tagline:"Test the waters",
    bg:"#fff", nameColor:"#9CA3AF", amtColor:"#111",
    cta:"Start for Free", ctaBg:"#111", ctaColor:"#fff", ctaBorder:"#111",
    dividerColor:"rgba(0,0,0,0.08)",
    features:[
      {t:"10 products",ok:true},{t:"Basic storefront",ok:true},
      {t:"WhatsApp redirect button",ok:true},{t:"Order management",ok:true},
      {t:"Basic analytics",ok:true},{t:"Live customer chat",ok:false},
      {t:"Product boosts",ok:false},{t:"Verified badge",ok:false},
    ],
  },
  {
    id:"starter", name:"Starter", tagline:"Launch your store",
    bg:"#fff", nameColor:"#9CA3AF", amtColor:"#111",
    cta:"Get Starter", ctaBg:"transparent", ctaColor:"#111", ctaBorder:"rgba(0,0,0,0.2)",
    dividerColor:"rgba(0,0,0,0.08)",
    features:[
      {t:"25 products",ok:true},{t:"Custom banner & colors",ok:true},
      {t:"WhatsApp redirect",ok:true},{t:"Order notifications",ok:true},
      {t:"Basic categories",ok:true},{t:"Reduced Beme branding",ok:true},
      {t:"Live customer chat",ok:false},{t:"Product boosts",ok:false},
    ],
  },
  {
    id:"standard", name:"Standard", tagline:"Grow your brand", badge:"Most Popular",
    bg:"#046EF2", nameColor:"rgba(255,255,255,0.6)", amtColor:"#fff",
    cta:"Get Standard", ctaBg:"#fff", ctaColor:"#046EF2", ctaBorder:"#fff",
    dividerColor:"rgba(255,255,255,0.15)",
    features:[
      {t:"500 products",ok:true},{t:"Premium store themes",ok:true},
      {t:"Real-time customer chat",ok:true},{t:"Discount codes & flash sales",ok:true},
      {t:"Featured product boosts",ok:true},{t:"Verified badge eligible",ok:true},
      {t:"TikTok / Instagram links",ok:true},{t:"Customer reviews enabled",ok:true},
      {t:"Sales & visit analytics",ok:true},
    ],
  },
  {
    id:"pro", name:"Pro", tagline:"Dominate the market", badge:"Business Pro",
    bg:"#fff", nameColor:"#7C3AED", amtColor:"#111",
    cta:"Get Pro", ctaBg:"#7C3AED", ctaColor:"#fff", ctaBorder:"#7C3AED",
    dividerColor:"rgba(0,0,0,0.08)",
    features:[
      {t:"Unlimited products",ok:true},{t:"Custom domain",ok:true},
      {t:"AI captions & descriptions",ok:true},{t:"Live selling sessions",ok:true},
      {t:"Loyalty rewards & referrals",ok:true},{t:"Homepage featured placement",ok:true},
      {t:"Priority marketplace ranking",ok:true},{t:"AI auto-replies in chat",ok:true},
      {t:"Pro Verified badge",ok:true},{t:"Remove Beme branding",ok:true},
    ],
  },
];

const STATS = [
  {value:"2,400+",  label:"Active sellers across Ghana"},
  {value:"GHS 1M+", label:"Processed every month"},
  {value:"160+",    label:"Cities and towns reached"},
  {value:"4.9 / 5", label:"Average seller rating"},
];

const WHY = [
  {title:"Built for Ghana",        desc:"MoMo, Visa, and bank payments built in. Customers pay the way they already do.",           d:"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"},
  {title:"Your Products, Your Prices", desc:"Sell fashion, electronics, food, handmade goods. You control what you list and charge.", d:"M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z M9 21V12h6v9"},
  {title:"Get Paid to MoMo",       desc:"Withdraw to MTN, Telecel, or AirtelTigo MoMo — or your Ghanaian bank. Minimum GHS 50.",  d:"M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5"},
  {title:"Real Buyers Waiting",    desc:"Thousands of active Ghanaian shoppers already on Beme Market, browsing every day.",       d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0"},
  {title:"Sell on WhatsApp & TikTok", desc:"Share your store link anywhere. Every click lands on your store.",                    d:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13"},
  {title:"Chat With Buyers",        desc:"Standard and Pro sellers get in-app live chat. Close deals faster.",                    d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"},
];

const HOW = [
  {n:"01", title:"Create Your Account",   desc:"Sign up in under a minute. Your buyer and seller account are the same."},
  {n:"02", title:"Set Up Your Store",      desc:"Add your store name, products, banner, and WhatsApp number. Done in 10 minutes."},
  {n:"03", title:"Pick a Plan",           desc:"Start free or go straight to Standard. Pay with MoMo, Visa, or Mastercard."},
  {n:"04", title:"Share & Get Paid",      desc:"Post your store link anywhere. Orders come in. Withdraw to MoMo."},
];

const FAQS = [
  {q:"Is this like Jumia?",             a:"Not exactly. On Jumia you can only buy. On Beme Market you can also open your own store and sell your own products — like Jumia meets your personal shop, built for Ghana."},
  {q:"Do I need a Ghana Card?",          a:"No. You can start selling immediately. A Ghana Card is only needed later if you apply for the Verified Seller badge."},
  {q:"How do I get paid?",               a:"Payments go to your Beme wallet. Withdraw to MTN, Telecel, AirtelTigo MoMo, or your Ghanaian bank. Minimum withdrawal is GHS 50."},
  {q:"Is the Free plan really free?",    a:"Yes. No card, no trial. You get 10 products and a real storefront for as long as you want. Upgrade whenever you're ready."},
  {q:"Can I sell second-hand items?",    a:"Yes — as long as they're legal and accurately described. No counterfeit or stolen goods."},
  {q:"Can I change my plan later?",      a:"Yes, anytime from your seller dashboard. Upgrades apply immediately. Downgrades at the next billing date."},
];

/* ─── Hero SVG Illustration ───────────────────────────────── */
function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 500 540"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="gs1" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#000" floodOpacity="0.08"/>
        </filter>
        <filter id="gs2" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#22C55E" floodOpacity="0.14"/>
        </filter>
        <filter id="gs3" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#7C3AED" floodOpacity="0.12"/>
        </filter>
        <filter id="gs4" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#F59E0B" floodOpacity="0.14"/>
        </filter>
        <filter id="gs5" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#046EF2" floodOpacity="0.14"/>
        </filter>
      </defs>

      {/* ── Background circles ── */}
      <circle cx="250" cy="270" r="215" fill="#EEF4FF"/>
      <circle cx="415" cy="105" r="72"  fill="#DDD6FE" opacity="0.5"/>
      <circle cx="75"  cy="430" r="52"  fill="#D1FAE5" opacity="0.5"/>
      <circle cx="435" cy="425" r="36"  fill="#FEE2E2" opacity="0.4"/>
      <circle cx="60"  cy="120" r="28"  fill="#FEF3C7" opacity="0.5"/>

      {/* ── Phone frame ── */}
      <rect x="162" y="55" width="176" height="362" rx="30" fill="#111827" filter="url(#gs1)"/>
      <rect x="159" y="148" width="4"  height="34" rx="2" fill="#374151"/>
      <rect x="159" y="192" width="4"  height="34" rx="2" fill="#374151"/>
      <rect x="337" y="163" width="4"  height="54" rx="2" fill="#374151"/>

      {/* Screen */}
      <rect x="170" y="68" width="160" height="336" rx="22" fill="#F9FAFB"/>

      {/* Notch */}
      <rect x="208" y="62" width="84"  height="16" rx="8" fill="#111827"/>
      <circle cx="250" cy="70" r="4"   fill="#374151"/>

      {/* Home bar */}
      <rect x="213" y="390" width="74" height="5" rx="2.5" fill="#D1D5DB"/>

      {/* ── Screen: Blue header ── */}
      <rect x="170" y="68"  width="160" height="58" rx="22" fill="#046EF2"/>
      <rect x="170" y="88"  width="160" height="38" fill="#046EF2"/>

      {/* Avatar */}
      <circle cx="191" cy="97" r="13"  fill="rgba(255,255,255,0.2)"/>
      <circle cx="191" cy="92" r="6"   fill="rgba(255,255,255,0.45)"/>
      <path   d="M182 104 Q191 100 200 104" fill="rgba(255,255,255,0.3)"/>

      {/* Name bars */}
      <rect x="209" y="90"  width="66" height="8" rx="4" fill="rgba(255,255,255,0.8)"/>
      <rect x="209" y="102" width="46" height="5" rx="2.5" fill="rgba(255,255,255,0.4)"/>

      {/* Bell */}
      <circle cx="318" cy="97" r="13" fill="rgba(255,255,255,0.12)"/>
      <rect   cx="318" cy="97" r="7" fill="none"/>
      <path   d="M313 94 Q313 89 318 89 Q323 89 323 94 L324 101 Q318 103 312 101Z"
              fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="323" cy="89" r="4" fill="#EF4444"/>

      {/* ── Revenue card ── */}
      <rect x="178" y="135" width="144" height="62" rx="12" fill="#fff" filter="url(#gs1)"/>
      <rect x="186" y="143" width="52"  height="6"  rx="3" fill="#E5E7EB"/>
      <rect x="186" y="153" width="86"  height="13" rx="5" fill="#DBEAFE"/>
      <rect x="189" y="156" width="76"  height="7"  rx="3" fill="#046EF2"/>
      <rect x="186" y="170" width="48"  height="7"  rx="3" fill="#D1FAE5"/>
      <rect x="189" y="172" width="30"  height="3"  rx="1.5" fill="#22C55E"/>
      {/* Sparkline */}
      <polyline points="248,179 256,171 264,175 272,165 280,168 288,159 296,162 308,153"
        stroke="#046EF2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>

      {/* ── Two mini stat cards ── */}
      <rect x="178" y="205" width="66" height="46" rx="10" fill="#EEF4FF"/>
      <rect x="186" y="213" width="38" height="6"  rx="3" fill="#CBD5E1"/>
      <rect x="186" y="223" width="28" height="12" rx="4" fill="#046EF2"/>
      <rect x="186" y="239" width="20" height="5"  rx="2" fill="#22C55E" opacity="0.7"/>

      <rect x="252" y="205" width="70" height="46" rx="10" fill="#F5F3FF"/>
      <rect x="260" y="213" width="38" height="6"  rx="3" fill="#CBD5E1"/>
      <rect x="260" y="223" width="32" height="12" rx="4" fill="#7C3AED" opacity="0.85"/>
      <rect x="260" y="239" width="24" height="5"  rx="2" fill="#F59E0B" opacity="0.8"/>

      {/* ── Bar chart ── */}
      <rect x="178" y="259" width="144" height="70" rx="12" fill="#fff" filter="url(#gs1)"/>
      <rect x="186" y="267" width="50"  height="6"  rx="3" fill="#E5E7EB"/>
      {/* Bars — rainbow gradient of blues */}
      <rect x="188" y="296" width="13" height="25" rx="3" fill="#BFDBFE"/>
      <rect x="205" y="288" width="13" height="33" rx="3" fill="#93C5FD"/>
      <rect x="222" y="280" width="13" height="41" rx="3" fill="#60A5FA"/>
      <rect x="239" y="284" width="13" height="37" rx="3" fill="#3B82F6"/>
      <rect x="256" y="274" width="13" height="47" rx="3" fill="#2563EB"/>
      <rect x="273" y="278" width="13" height="43" rx="3" fill="#1D4ED8"/>
      <rect x="290" y="268" width="16" height="53" rx="3" fill="#046EF2"/>

      {/* ── Orders list ── */}
      <rect x="178" y="337" width="144" height="54" rx="12" fill="#fff" filter="url(#gs1)"/>
      <rect x="186" y="345" width="46"  height="5"  rx="2" fill="#E5E7EB"/>
      {/* Row 1 */}
      <circle cx="193" cy="362" r="9" fill="#EEF4FF"/>
      <rect   x="207" y="357" width="58" height="5" rx="2" fill="#E5E7EB"/>
      <rect   x="207" y="365" width="38" height="4" rx="2" fill="#BFDBFE"/>
      <rect   x="284" y="355" width="30" height="14" rx="6" fill="#D1FAE5"/>
      <rect   x="287" y="360" width="24" height="4"  rx="2" fill="#22C55E" opacity="0.7"/>
      {/* Row 2 */}
      <circle cx="193" cy="380" r="9" fill="#F5F3FF"/>
      <rect   x="207" y="375" width="50" height="5" rx="2" fill="#E5E7EB"/>
      <rect   x="207" y="383" width="32" height="4" rx="2" fill="#DDD6FE"/>
      <rect   x="284" y="373" width="30" height="14" rx="6" fill="#FEF3C7"/>
      <rect   x="287" y="378" width="24" height="4"  rx="2" fill="#F59E0B" opacity="0.7"/>

      {/* ══ FLOATING CARDS ══ */}

      {/* Card 1 — Order Received (top-right, GREEN) */}
      <rect x="348" y="72" width="142" height="74" rx="14" fill="#fff" filter="url(#gs2)"/>
      <rect x="348" y="72" width="142" height="74" rx="14" fill="none" stroke="#D1FAE5" strokeWidth="1.5"/>
      <circle cx="369" cy="109" r="17" fill="#D1FAE5"/>
      <polyline points="361,109 367,115 378,101" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <rect x="392" y="90"  width="84" height="8" rx="4" fill="#111" opacity="0.8"/>
      <rect x="392" y="102" width="64" height="6" rx="3" fill="#22C55E" opacity="0.5"/>
      <rect x="392" y="112" width="74" height="6" rx="3" fill="#E5E7EB"/>
      <rect x="392" y="122" width="52" height="6" rx="3" fill="#D1FAE5"/>
      <circle cx="480" cy="82" r="6"  fill="#22C55E"/>
      <circle cx="480" cy="82" r="11" fill="#22C55E" opacity="0.18"/>

      {/* Card 2 — MoMo Payment (bottom-left, ORANGE) */}
      <rect x="8"   y="328" width="148" height="82" rx="14" fill="#fff" filter="url(#gs4)"/>
      <rect x="8"   y="328" width="148" height="82" rx="14" fill="none" stroke="#FEF3C7" strokeWidth="1.5"/>
      <rect x="20"  y="340" width="36"  height="36" rx="10" fill="#FEF3C7"/>
      <circle cx="38" cy="358" r="12" fill="#F59E0B" opacity="0.65"/>
      <circle cx="38" cy="358" r="6"  fill="#F59E0B"/>
      <rect x="62"  y="341" width="80" height="7" rx="3" fill="#111" opacity="0.75"/>
      <rect x="62"  y="352" width="84" height="11" rx="5" fill="#FEF9C3"/>
      <rect x="65"  y="356" width="68" height="4"  rx="2" fill="#F59E0B" opacity="0.8"/>
      <rect x="62"  y="367" width="62" height="6"  rx="3" fill="#E5E7EB"/>
      <rect x="62"  y="377" width="44" height="6"  rx="3" fill="#FDE68A"/>
      <circle cx="146" cy="338" r="6"  fill="#F59E0B"/>
      <circle cx="146" cy="338" r="11" fill="#F59E0B" opacity="0.18"/>

      {/* Card 3 — Product (top-left, PURPLE) */}
      <rect x="8"   y="132" width="148" height="86" rx="14" fill="#fff" filter="url(#gs3)"/>
      <rect x="8"   y="132" width="148" height="86" rx="14" fill="none" stroke="#EDE9FE" strokeWidth="1.5"/>
      <rect x="18"  y="142" width="50"  height="66" rx="8" fill="#F5F3FF"/>
      <rect x="26"  y="152" width="34"  height="22" rx="4" fill="#DDD6FE"/>
      <path d="M32 152 L26 158 L30 159 L30 173 L54 173 L54 159 L58 158 L52 152 Q42 156 32 152Z" fill="#7C3AED" opacity="0.45"/>
      <rect x="74"  y="144" width="68" height="8" rx="4" fill="#111" opacity="0.78"/>
      <rect x="74"  y="156" width="52" height="6" rx="3" fill="#E5E7EB"/>
      <rect x="74"  y="166" width="46" height="10" rx="5" fill="#7C3AED"/>
      <rect x="77"  y="169" width="38" height="4"  rx="2" fill="#fff" opacity="0.55"/>
      <rect x="74"  y="180" width="66" height="7"  rx="3" fill="#FEF3C7"/>
      <rect x="76"  y="182" width="50" height="3"  rx="1.5" fill="#F59E0B" opacity="0.8"/>
      <rect x="74"  y="191" width="46" height="6"  rx="3" fill="#EDE9FE"/>
      <rect x="76"  y="193" width="34" height="2"  rx="1" fill="#7C3AED" opacity="0.5"/>

      {/* Card 4 — Verified (bottom-right, BLUE) */}
      <rect x="346" y="350" width="146" height="76" rx="14" fill="#fff" filter="url(#gs5)"/>
      <rect x="346" y="350" width="146" height="76" rx="14" fill="none" stroke="#BFDBFE" strokeWidth="1.5"/>
      <circle cx="368" cy="388" r="19" fill="#DBEAFE"/>
      <path d="M361 380 L368 376 L375 380 L375 390 Q375 397 368 400 Q361 397 361 390Z" fill="#046EF2"/>
      <polyline points="363,388 368,393 374,383" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <rect x="393" y="362" width="84" height="8"  rx="4" fill="#111" opacity="0.8"/>
      <rect x="393" y="374" width="68" height="6"  rx="3" fill="#BFDBFE"/>
      <rect x="393" y="384" width="76" height="6"  rx="3" fill="#E5E7EB"/>
      <rect x="393" y="394" width="54" height="6"  rx="3" fill="#DBEAFE"/>
      <rect x="393" y="404" width="40" height="6"  rx="3" fill="#E5E7EB" opacity="0.6"/>
      <circle cx="482" cy="360" r="6"  fill="#046EF2"/>
      <circle cx="482" cy="360" r="11" fill="#046EF2" opacity="0.18"/>

      {/* ── Connector dashes ── */}
      <line x1="162" y1="190" x2="156" y2="182" stroke="#7C3AED" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.22"/>
      <line x1="330" y1="140" x2="347" y2="130" stroke="#22C55E" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.22"/>
      <line x1="162" y1="340" x2="156" y2="358" stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.22"/>
      <line x1="330" y1="360" x2="345" y2="372" stroke="#046EF2" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.22"/>

      {/* ── Sparkles ── */}
      <path d="M452 215 L454 222 L461 224 L454 226 L452 233 L450 226 L443 224 L450 222Z" fill="#046EF2" opacity="0.3"/>
      <path d="M62  195 L63.5 200 L69 201.5 L63.5 203 L62 208 L60.5 203 L55 201.5 L60.5 200Z" fill="#7C3AED" opacity="0.28"/>
      <path d="M468 458 L469.5 462 L474 464 L469.5 466 L468 470 L466.5 466 L462 464 L466.5 462Z" fill="#22C55E" opacity="0.38"/>
      <circle cx="76"  cy="482" r="6" fill="#F59E0B" opacity="0.32"/>
      <circle cx="460" cy="292" r="5" fill="#EC4899" opacity="0.28"/>
      <circle cx="128" cy="70"  r="7" fill="#046EF2" opacity="0.14"/>
      <circle cx="453" cy="178" r="4" fill="#22C55E" opacity="0.28"/>
    </svg>
  );
}

/* ─── Helpers ─────────────────────────────────────────────── */
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
      strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0, marginTop:1}}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB"
      strokeWidth="2" strokeLinecap="round" style={{flexShrink:0, marginTop:1}}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

/* ─── Main ────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════════
   SELLER GUIDE — Full how-it-works for new sellers / students
═══════════════════════════════════════════════════════════ */
function SellerGuide() {
  const [openSection, setOpenSection] = useState(null);
  const toggle = (id) => setOpenSection(p => p === id ? null : id);

  const Section = ({ id, icon, title, children }) => (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
      <button type="button"
        onClick={() => toggle(id)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 0", background:"none", border:"none", cursor:"pointer",
          fontFamily:"inherit", textAlign:"left" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>{icon}</span>
          <span style={{ fontSize:15, fontWeight:800, color:"#111" }}>{title}</span>
        </div>
        <span style={{ fontSize:18, color:"#9CA3AF", transform: openSection===id?"rotate(180deg)":"none",
          transition:"transform 0.2s", lineHeight:1 }}>⌄</span>
      </button>
      {openSection === id && (
        <div style={{ paddingBottom:20, paddingLeft:36, fontSize:14, color:"#374151", lineHeight:1.75 }}>
          {children}
        </div>
      )}
    </div>
  );

  const Step = ({ n, title, desc }) => (
    <div style={{ display:"flex", gap:14, marginBottom:14 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:"#111", color:"#fff",
        fontSize:13, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {n}
      </div>
      <div>
        <div style={{ fontSize:14, fontWeight:800, color:"#111", marginBottom:2 }}>{title}</div>
        <div style={{ fontSize:13, color:"#6B7280", lineHeight:1.6 }}>{desc}</div>
      </div>
    </div>
  );

  const PlanRow = ({ name, price, products, delivery, social }) => (
    <tr style={{ borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
      <td style={{ padding:"10px 0", fontWeight:800, color:"#111", fontSize:14 }}>{name}</td>
      <td style={{ padding:"10px 8px", textAlign:"center", fontSize:14, fontWeight:700 }}>{price}</td>
      <td style={{ padding:"10px 8px", textAlign:"center", fontSize:13 }}>{products}</td>
      <td style={{ padding:"10px 8px", textAlign:"center", fontSize:13 }}>{social ? "✅":"🔒"}</td>
      <td style={{ padding:"10px 8px", textAlign:"center", fontSize:13 }}>{delivery ? "✅":"🔒"}</td>
    </tr>
  );

  return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"0 20px 80px", fontFamily:"var(--font-main,'Nunito',sans-serif)" }}>

      {/* Hero divider */}
      <div style={{ textAlign:"center", margin:"56px 0 32px" }}>
        <div style={{ display:"inline-block", padding:"4px 16px", background:"rgba(0,0,0,0.06)",
          borderRadius:100, fontSize:12, fontWeight:800, color:"#6B7280",
          letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>
          New to Beme Market?
        </div>
        <h2 style={{ fontSize:28, fontWeight:900, color:"#111", letterSpacing:"-0.04em",
          margin:"0 0 10px", lineHeight:1.2 }}>
          Everything you need to know
        </h2>
        <p style={{ fontSize:14, color:"#6B7280", margin:0, lineHeight:1.65 }}>
          A complete guide for first-time sellers — from signup to your first sale.
        </p>
      </div>

      {/* What is Beme Market */}
      <div style={{ background:"#fafafa", borderRadius:16, border:"1px solid rgba(0,0,0,0.07)",
        padding:"20px 20px", marginBottom:24 }}>
        <div style={{ fontSize:16, fontWeight:900, color:"#111", marginBottom:10 }}>
          🛍️ What is Beme Market?
        </div>
        <p style={{ fontSize:14, color:"#374151", lineHeight:1.75, margin:"0 0 10px" }}>
          Beme Market is <strong>Ghana's multi-vendor marketplace</strong> — think of it as having your own
          Shopify store inside a marketplace like Jumia. Customers browse Beme Market, discover your store,
          follow it, and buy directly from you.
        </p>
        <p style={{ fontSize:14, color:"#374151", lineHeight:1.75, margin:0 }}>
          You get your own store page at <strong>bememarket.store/store/your-name</strong>, your own product
          listings, and your own brand — all within a trusted platform that handles payments, discovery, and (on Growth/Pro plans) even delivery.
        </p>
      </div>

      {/* Getting started steps */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:16, fontWeight:900, color:"#111", marginBottom:16 }}>
          🚀 Getting started — 5 steps
        </div>
        <Step n={1} title="Create your account" desc="Sign up with email or Google. Verify your email address to unlock full access."/>
        <Step n={2} title="Apply for a store" desc="Fill in your store name, choose a category, and select a subscription plan. Basic is completely free to start."/>
        <Step n={3} title="Customise your store" desc="Go to Store Design in your dashboard. Upload a banner image, store logo, set your social links (Starter+), and choose how customers contact you."/>
        <Step n={4} title="Add your products" desc="Go to Products and click '+ Add Product'. Upload photos, set a price, write a description, and manage your inventory. Your plan determines how many products you can list."/>
        <Step n={5} title="Share your store link" desc="Copy your store URL from Store Design and share it on WhatsApp, Instagram, TikTok. The more you share, the more followers and sales you get."/>
      </div>

      {/* Dashboard sections accordion */}
      <div style={{ background:"#fff", borderRadius:16, border:"1px solid rgba(0,0,0,0.08)",
        padding:"4px 20px 4px", marginBottom:24 }}>
        <div style={{ fontSize:15, fontWeight:900, color:"#111", padding:"16px 0 12px",
          borderBottom:"1px solid rgba(0,0,0,0.07)" }}>
          📋 Your Seller Dashboard — every menu explained
        </div>

        <Section id="home" icon="📊" title="Analytics (Home)">
          <p>Your dashboard home shows a snapshot of your store&apos;s performance:</p>
          <ul style={{ paddingLeft:18, margin:"8px 0" }}>
            <li><strong>Total revenue</strong> — how much you&apos;ve earned from completed orders</li>
            <li><strong>Orders</strong> — total orders placed in your store</li>
            <li><strong>Products</strong> — how many products you have listed vs your plan limit</li>
            <li><strong>Followers</strong> — customers who follow your store</li>
          </ul>
          <p>Use this to track growth week by week. If revenue is flat, try adding more products or sharing your store link.</p>
        </Section>

        <Section id="products" icon="📦" title="Products">
          <p>This is where you manage everything you sell.</p>
          <ul style={{ paddingLeft:18, margin:"8px 0" }}>
            <li><strong>Add product</strong> — upload photos (up to 5), set a name, price, description, category and stock level</li>
            <li><strong>Edit product</strong> — tap the edit icon on any product to update details</li>
            <li><strong>Active vs Draft</strong> — Active products are visible to customers. Draft products are hidden while you prepare them</li>
            <li><strong>Stock tracking</strong> — turn on inventory tracking to show customers when stock is low</li>
            <li><strong>Product limit</strong> — Basic plan: 5 products · Starter: 10 · Growth: 25 · Pro: 500</li>
          </ul>
          <p style={{ background:"rgba(0,0,0,0.04)", padding:"10px 12px", borderRadius:8, marginTop:10, fontSize:13 }}>
            💡 <strong>Tip:</strong> Good photos = more sales. Use natural lighting and a clean background.
          </p>
        </Section>

        <Section id="orders" icon="🧾" title="Orders">
          <p>Every time a customer buys from your store, an order appears here.</p>
          <ul style={{ paddingLeft:18, margin:"8px 0" }}>
            <li><strong>Pending</strong> — payment received, you need to prepare the order</li>
            <li><strong>Processing</strong> — you&apos;ve started preparing it</li>
            <li><strong>Shipped</strong> — order is on its way to the customer</li>
            <li><strong>Completed</strong> — customer received the order, your payout is triggered</li>
          </ul>
          <p>Always update the order status so customers know what&apos;s happening. Good communication = good reviews.</p>
        </Section>

        <Section id="appearance" icon="🎨" title="Store Design (Appearance)">
          <p>This is where you build your brand on Beme Market.</p>
          <ul style={{ paddingLeft:18, margin:"8px 0" }}>
            <li><strong>Store name</strong> — your public brand name (shown on your store page and in search)</li>
            <li><strong>Store URL/slug</strong> — your unique link: bememarket.store/store/your-slug</li>
            <li><strong>Banner image</strong> — the wide image at the top of your store page. Use 1400×500px for best quality</li>
            <li><strong>Store logo</strong> — your profile picture / icon. 400×400px recommended</li>
            <li><strong>Chat preference</strong> — choose how customers contact you: WhatsApp, Beme Chat, or Website</li>
            <li><strong>Social links</strong> — Instagram, TikTok, WhatsApp, website links (Starter plan and above)</li>
            <li><strong>Copy store URL button</strong> — instantly copies your link to share anywhere</li>
          </ul>
        </Section>

        <Section id="delivery" icon="🚚" title="Delivery Settings">
          <p>Choose how you get products to customers.</p>
          <ul style={{ paddingLeft:18, margin:"8px 0" }}>
            <li><strong>Self Delivery</strong> — you handle everything yourself. Set your own fee (flat rate, free, or negotiable), processing time, and which regions you cover</li>
            <li><strong>Beme Delivery Support</strong> — available on <strong>Growth plan (GHS 129/mo) and Pro (GHS 399/mo)</strong>. Beme coordinates pickup via courier partners. Delivery fee collected from customer at checkout, courier cost deducted from your payout</li>
            <li><strong>Both options</strong> — let the customer choose at checkout</li>
          </ul>
          <p style={{ background:"rgba(0,0,0,0.04)", padding:"10px 12px", borderRadius:8, marginTop:10, fontSize:13 }}>
            📦 <strong>Beme Delivery rates:</strong> Within Accra GHS 20 (same day) · Accra→Kumasi GHS 35 (1–2 days) · Nationwide GHS 30–60 (3–5 days)
          </p>
        </Section>

        <Section id="withdrawal" icon="💰" title="Withdrawals">
          <p>This is where you request payouts from your Beme Market wallet.</p>
          <ul style={{ paddingLeft:18, margin:"8px 0" }}>
            <li><strong>Available balance</strong> — money from completed orders ready to withdraw</li>
            <li><strong>Pending balance</strong> — orders that are processing or in transit</li>
            <li><strong>Request withdrawal</strong> — enter your Mobile Money or bank details and request a payout</li>
          </ul>
          <p>Payouts are processed via Paystack to MoMo or bank. Processing typically takes 1–3 business days.</p>
        </Section>

        <Section id="verification" icon="✅" title="Verification">
          <p>Get a verified badge on your store — it builds customer trust.</p>
          <ul style={{ paddingLeft:18, margin:"8px 0" }}>
            <li>Upload a valid Ghana Card or business registration document</li>
            <li>Our team reviews it within 24–48 hours</li>
            <li>Once verified, a ✅ badge appears on your store page and search results</li>
            <li>Verified stores rank higher in search and get more customer trust</li>
          </ul>
        </Section>

        <Section id="subscription" icon="⭐" title="Subscription">
          <p>Manage your plan and upgrade for more features.</p>
          <ul style={{ paddingLeft:18, margin:"8px 0" }}>
            <li>See your current plan, its limits, and what&apos;s locked</li>
            <li>Compare all 4 plans side-by-side</li>
            <li>Upgrade payments go through Paystack — secure and instant</li>
            <li>Downgrades are handled via support to protect your existing listings</li>
          </ul>
        </Section>
      </div>

      {/* How customers find you */}
      <div style={{ background:"#fafafa", borderRadius:16, border:"1px solid rgba(0,0,0,0.07)",
        padding:"20px 20px", marginBottom:24 }}>
        <div style={{ fontSize:15, fontWeight:900, color:"#111", marginBottom:12 }}>
          🔍 How customers find your store
        </div>
        {[
          ["Search","Customers search by product name or store name in the Beme Market search bar."],
          ["Categories","Products appear under their category (Fashion, Tech, Food, etc.) when customers browse."],
          ["Flash Deals","Featured on the homepage. Admins can add your products to flash deals for extra visibility."],
          ["Your store link","Share bememarket.store/store/your-slug directly on WhatsApp, Instagram, TikTok — this is your most powerful tool."],
          ["Followers","When someone follows your store, they see your new products in their feed."],
        ].map(([title, desc], i) => (
          <div key={i} style={{ display:"flex", gap:10, marginBottom:i<4?12:0 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#111",
              flexShrink:0, marginTop:7 }}/>
            <div>
              <span style={{ fontSize:14, fontWeight:800, color:"#111" }}>{title}: </span>
              <span style={{ fontSize:14, color:"#374151" }}>{desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Payments + payouts */}
      <div style={{ background:"#fff", borderRadius:16, border:"1px solid rgba(0,0,0,0.08)",
        padding:"20px 20px", marginBottom:24 }}>
        <div style={{ fontSize:15, fontWeight:900, color:"#111", marginBottom:12 }}>
          💳 Payments & payouts — how the money works
        </div>
        <ol style={{ paddingLeft:20, margin:0, fontSize:14, color:"#374151", lineHeight:1.9 }}>
          <li>Customer adds product to cart and checks out</li>
          <li>Payment processed via <strong>Paystack</strong> (card, Mobile Money, bank transfer)</li>
          <li>Money sits in your Beme Market wallet as <em>pending</em> until order is completed</li>
          <li>Once order is marked <strong>Completed</strong>, balance moves to <em>available</em></li>
          <li>You go to <strong>Withdrawals</strong> and request a payout to your MoMo or bank</li>
          <li>Beme processes within 1–3 business days</li>
        </ol>
        <div style={{ marginTop:14, padding:"10px 12px", background:"rgba(0,0,0,0.04)",
          borderRadius:8, fontSize:13, color:"#374151" }}>
          🔒 <strong>All payments go through Paystack</strong> — Ghana&apos;s most trusted payment gateway. Your customer&apos;s card details are never stored on Beme Market.
        </div>
      </div>

      {/* Plan comparison table */}
      <div style={{ background:"#fff", borderRadius:16, border:"1px solid rgba(0,0,0,0.08)",
        padding:"20px 20px", marginBottom:24, overflowX:"auto" }}>
        <div style={{ fontSize:15, fontWeight:900, color:"#111", marginBottom:16 }}>
          📊 Plan comparison
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
          <thead>
            <tr style={{ borderBottom:"2px solid rgba(0,0,0,0.08)" }}>
              <th style={{ padding:"8px 0", textAlign:"left", fontSize:12, fontWeight:700, color:"#6B7280" }}>Plan</th>
              <th style={{ padding:"8px 8px", textAlign:"center", fontSize:12, fontWeight:700, color:"#6B7280" }}>Price</th>
              <th style={{ padding:"8px 8px", textAlign:"center", fontSize:12, fontWeight:700, color:"#6B7280" }}>Products</th>
              <th style={{ padding:"8px 8px", textAlign:"center", fontSize:12, fontWeight:700, color:"#6B7280" }}>Social links</th>
              <th style={{ padding:"8px 8px", textAlign:"center", fontSize:12, fontWeight:700, color:"#6B7280" }}>Beme Delivery</th>
            </tr>
          </thead>
          <tbody>
            <PlanRow name="Basic"   price="Free"       products="5"   social={false} delivery={false}/>
            <PlanRow name="Starter" price="GHS 59/mo"  products="10"  social={true}  delivery={false}/>
            <PlanRow name="Growth"  price="GHS 129/mo" products="25"  social={true}  delivery={true}/>
            <PlanRow name="Pro"     price="GHS 399/mo" products="500" social={true}  delivery={true}/>
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div style={{ background:"#fafafa", borderRadius:16, border:"1px solid rgba(0,0,0,0.07)", padding:"20px 20px" }}>
        <div style={{ fontSize:15, fontWeight:900, color:"#111", marginBottom:16 }}>❓ Common questions</div>
        {[
          ["Do I need to pay to start?","No. The Basic plan is completely free. You can list up to 5 products and start selling with zero upfront cost."],
          ["How do I get paid?","Through your Beme Market wallet. Once orders are completed, request a payout to your Mobile Money or bank account via the Withdrawals section."],
          ["Can I have more than one store?","No — each account gets one store. This keeps the marketplace fair and prevents spam stores."],
          ["What is Beme Delivery?","It's our courier coordination service. We arrange pickup from your location and delivery to the customer. Available on Growth and Pro plans only."],
          ["How do I upgrade my plan?","Go to Subscription in your dashboard and click 'Upgrade to [Plan]'. Payment is handled securely via Paystack."],
          ["My store link — where do I find it?","In your dashboard, go to Store Design. Your full store URL is shown there with a copy button."],
        ].map(([q, a], i) => (
          <div key={i} style={{ marginBottom: i < 5 ? 16 : 0 }}>
            <div style={{ fontSize:14, fontWeight:800, color:"#111", marginBottom:4 }}>Q: {q}</div>
            <div style={{ fontSize:13, color:"#374151", lineHeight:1.65, paddingLeft:16 }}>{a}</div>
          </div>
        ))}
      </div>

  </div>
  );
}

export default function GetAStore() {
  const navigate = useNavigate();
  const { user, isSellerActive } = useAuth();
  const { shop, isSeller } = useSellerAuth();
  const [billing, setBilling] = useState("monthly");
  const prices = billing === "yearly" ? YEARLY : MONTHLY;

  // One store per account — block access if user already has one
  const appliedUid = typeof window !== "undefined" ? localStorage.getItem("beme_seller_applied") : null;
  const hasStore = !!(shop?.id || isSeller || isSellerActive || (appliedUid && user && appliedUid === user?.uid));

  if (user && hasStore) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 32,
        fontFamily: "var(--font-main,'Nunito',sans-serif)", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(4,110,242,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#046EF2" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
            <path d="M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text,#111)", marginBottom: 10, letterSpacing: "-0.02em" }}>
          You already have a store
        </h2>
        <p style={{ fontSize: 15, color: "var(--muted,#6B7280)", maxWidth: 340, lineHeight: 1.6, marginBottom: 8 }}>
          Each Beme Market account is eligible for <strong>one store only</strong>, regardless of your subscription tier.
        </p>
        <p style={{ fontSize: 13, color: "var(--muted,#9CA3AF)", maxWidth: 320, lineHeight: 1.5, marginBottom: 28 }}>
          To manage your store, add products, change your plan or view your storefront — go to your Seller Dashboard.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" onClick={() => navigate("/seller-dashboard")}
            style={{ padding: "12px 28px", borderRadius: 12, border: "none",
              background: "#046EF2", color: "#fff", fontSize: 15, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(4,110,242,0.3)" }}>
            Go to Dashboard
          </button>
          <button type="button" onClick={() => navigate("/")}
            style={{ padding: "12px 28px", borderRadius: 12,
              border: "1.5px solid rgba(0,0,0,0.1)", background: "transparent",
              color: "var(--text,#333)", fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit" }}>
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  const goStart = (planId) => {
    if (isSellerActive) { navigate("/seller-dashboard"); return; }
    const to = `/store-onboarding?plan=${planId}`;
    if (user) { navigate(to); return; }
    navigate(`/login?redirect=${encodeURIComponent(to)}`);
  };

  return (
    <div className="gsa-root">

      {/* ══ HERO — illustration LEFT, text RIGHT ══════════════ */}
      <div className="gsa-hero">

        {/* LEFT: SVG */}
        <div className="gsa-hero-visual">
          <HeroIllustration />
        </div>

        {/* RIGHT: Text */}
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
              onClick={() => document.getElementById("gsa-pricing").scrollIntoView({behavior:"smooth"})}>
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
      </div>

      {/* ══ STATS ════════════════════════════════════════════ */}
      <section className="gsa-stats">
        {STATS.map((s) => (
          <div key={s.label} className="gsa-stat-item">
            <div className="gsa-stat-val">{s.value}</div>
            <div className="gsa-stat-lbl">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ══ WHY ══════════════════════════════════════════════ */}
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

      {/* ══ HOW ══════════════════════════════════════════════ */}
      <section className="gsa-dark-section">
        <div style={{maxWidth:1100, margin:"0 auto"}}>
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
          <div style={{textAlign:"center", marginTop:48}}>
            <button className="gsa-btn-white" onClick={() => goStart("free")}>
              Open Your Store — It's Free →
            </button>
          </div>
        </div>
      </section>

      {/* ══ PRICING ══════════════════════════════════════════ */}
      <section className="gsa-section" id="gsa-pricing">
        <div className="gsa-section-label">Pricing</div>
        <h2 className="gsa-section-title">Choose how you want to sell</h2>
        <p className="gsa-section-sub">Start free. Upgrade when you're ready. Cancel anytime.</p>

        <div className="gsa-billing-toggle">
          <button className={`gsa-toggle-btn ${billing==="monthly"?"gsa-toggle-active":""}`} onClick={()=>setBilling("monthly")}>Monthly</button>
          <button className={`gsa-toggle-btn ${billing==="yearly"?"gsa-toggle-active":""}`}  onClick={()=>setBilling("yearly")}>
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
                className={`gsa-plan-card ${plan.badge==="Most Popular"?"gsa-plan-popular":""}`}
                style={{background:plan.bg}}>
                {plan.badge && (
                  <div className="gsa-plan-badge"
                    style={{background:plan.badge==="Most Popular"?"#111":"#7C3AED", color:"#fff"}}>
                    {plan.badge}
                  </div>
                )}
                <div className="gsa-plan-name" style={{color:plan.nameColor}}>{plan.name}</div>
                <div className="gsa-plan-price">
                  {isFree
                    ? <span className="gsa-plan-amt" style={{color:plan.amtColor}}>Free</span>
                    : <><span className="gsa-plan-amt" style={{color:plan.amtColor}}>GHS {price}</span>
                        <span className="gsa-plan-unit" style={{color:isDark?"rgba(255,255,255,0.55)":"#9CA3AF"}}> / mo</span></>
                  }
                </div>
                {billing==="yearly" && !isFree && (
                  <div className="gsa-plan-yearly-note" style={{color:isDark?"rgba(255,255,255,0.5)":"#9CA3AF"}}>
                    Billed GHS {price*12} / year
                  </div>
                )}
                <div className="gsa-plan-tagline" style={{color:isDark?"rgba(255,255,255,0.7)":"#6B7280"}}>{plan.tagline}</div>
                <button className="gsa-plan-cta"
                  style={{background:plan.ctaBg, color:plan.ctaColor, border:`2px solid ${plan.ctaBorder}`}}
                  onClick={()=>goStart(plan.id)}>
                  {plan.cta}
                </button>
                <div className="gsa-plan-divider" style={{borderTopColor:plan.dividerColor}}/>
                <ul className="gsa-plan-features">
                  {plan.features.map((f) => (
                    <li key={f.t} style={{color:f.ok?(isDark?"rgba(255,255,255,0.9)":"#1A1D3B"):"#9CA3AF"}}>
                      {f.ok
                        ? <CheckIcon color={isDark?"#fff":plan.id==="pro"?"#7C3AED":"#046EF2"}/>
                        : <CrossIcon/>}
                      {f.t}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        {billing==="yearly" && (
          <p className="gsa-yearly-note">All yearly plans billed upfront · 20% cheaper than monthly · Cancel anytime</p>
        )}
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════ */}
      <section className="gsa-dark-section">
        <div style={{maxWidth:1100, margin:"0 auto"}}>
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

      {/* ══ CTA ══════════════════════════════════════════════ */}
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

    <SellerGuide />
    </div>
  );
}