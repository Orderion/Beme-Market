import { useState, useMemo } from "react";

function Ico({ d, size = 20, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const IC = {
  search:  "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
  chevron: "M9 18l6-6-6-6",
  chevronD:"M6 9l6 6 6-6",
  arrow:   "M5 12h14|M12 5l7 7-7 7",
  check:   "M20 6L9 17l-5-5",
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  tip:     "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

// ─── Aesthetic SVG illustrations per section ───
const ILLUSTRATIONS = {
  home: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g1)"/>
      <defs><linearGradient id="g1" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#7c3aed" stopOpacity="0.12"/><stop offset="1" stopColor="#9333ea" stopOpacity="0.04"/></linearGradient></defs>
      <rect x="16" y="20" width="50" height="30" rx="8" fill="#7c3aed" fillOpacity="0.15"/>
      <rect x="16" y="20" width="50" height="30" rx="8" stroke="#7c3aed" strokeOpacity="0.4" strokeWidth="1.5"/>
      <text x="41" y="42" textAnchor="middle" fill="#7c3aed" fontSize="12" fontWeight="800">GHS 0</text>
      <rect x="74" y="20" width="50" height="30" rx="8" fill="#22c55e" fillOpacity="0.12"/>
      <rect x="74" y="20" width="50" height="30" rx="8" stroke="#22c55e" strokeOpacity="0.4" strokeWidth="1.5"/>
      <text x="99" y="42" textAnchor="middle" fill="#16a34a" fontSize="12" fontWeight="800">12 Orders</text>
      <rect x="132" y="20" width="50" height="30" rx="8" fill="#f59e0b" fillOpacity="0.12"/>
      <rect x="132" y="20" width="50" height="30" rx="8" stroke="#f59e0b" strokeOpacity="0.4" strokeWidth="1.5"/>
      <text x="157" y="42" textAnchor="middle" fill="#b45309" fontSize="12" fontWeight="800">480 Views</text>
      <rect x="16" y="62" width="168" height="62" rx="10" fill="white" fillOpacity="0.7" stroke="#e8e4f5" strokeWidth="1.5"/>
      {[0,1,2,3,4,5,6].map((i) => { const h = [30,50,40,65,45,70,55][i]; return (<rect key={i} x={28+i*22} y={112-h} width="14" height={h} rx="4" fill="#7c3aed" fillOpacity={0.2+i*0.08}/> ); })}
      <polyline points="28,95 50,75 72,85 94,60 116,70 138,55 160,65" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  products: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g2)"/>
      <defs><linearGradient id="g2" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#7c3aed" stopOpacity="0.1"/><stop offset="1" stopColor="#6366f1" stopOpacity="0.05"/></linearGradient></defs>
      {[[16,16],[76,16],[136,16],[16,76],[76,76],[136,76]].map(([x,y],i)=>(
        <g key={i}>
          <rect x={x} y={y} width="52" height="52" rx="10" fill="white" fillOpacity="0.8" stroke="#e8e4f5" strokeWidth="1.5"/>
          <rect x={x+8} y={y+8} width="36" height="24" rx="5" fill="#7c3aed" fillOpacity={0.1+i*0.04}/>
          <rect x={x+8} y={y+38} width="22" height="4" rx="2" fill="#111" fillOpacity="0.15"/>
          <rect x={x+8} y={y+44} width="14" height="3" rx="1.5" fill="#7c3aed" fillOpacity="0.4"/>
        </g>
      ))}
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g3)"/>
      <defs><linearGradient id="g3" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#22c55e" stopOpacity="0.1"/><stop offset="1" stopColor="#7c3aed" stopOpacity="0.05"/></linearGradient></defs>
      <rect x="16" y="16" width="168" height="24" rx="8" fill="white" fillOpacity="0.8" stroke="#e8e4f5" strokeWidth="1.5"/>
      <circle cx="28" cy="28" r="5" fill="#22c55e" fillOpacity="0.3"/>
      <circle cx="28" cy="28" r="3" fill="#22c55e"/>
      <rect x="40" y="23" width="60" height="4" rx="2" fill="#111" fillOpacity="0.15"/>
      <rect x="40" y="30" width="30" height="3" rx="1.5" fill="#9ca3af" fillOpacity="0.5"/>
      <rect x="150" y="21" width="26" height="12" rx="6" fill="#22c55e" fillOpacity="0.15"/>
      <text x="163" y="30" textAnchor="middle" fill="#16a34a" fontSize="8" fontWeight="700">Paid</text>
      {[1,2,3,4].map(i=>(
        <g key={i}>
          <rect x="16" y={16+i*28} width="168" height="24" rx="8" fill="white" fillOpacity="0.6" stroke="#e8e4f5" strokeWidth="1"/>
          <circle cx="28" cy={28+i*28} r="5" fill={["#f59e0b","#7c3aed","#3b82f6","#ef4444"][i-1]} fillOpacity="0.2"/>
          <circle cx="28" cy={28+i*28} r="3" fill={["#f59e0b","#7c3aed","#3b82f6","#ef4444"][i-1]}/>
          <rect x="40" y={23+i*28} width={[50,70,45,55][i-1]} height="4" rx="2" fill="#111" fillOpacity="0.12"/>
        </g>
      ))}
    </svg>
  ),
  customers: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g4)"/>
      <defs><linearGradient id="g4" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#f59e0b" stopOpacity="0.1"/><stop offset="1" stopColor="#7c3aed" stopOpacity="0.05"/></linearGradient></defs>
      {[0,1,2,3,4].map(i=>{
        const colors=["#7c3aed","#22c55e","#f59e0b","#3b82f6","#ef4444"];
        const names=["AK","BB","CL","DM","EO"];
        return (<g key={i}><circle cx={30+i*36} cy={50} r={22} fill={colors[i]} fillOpacity="0.15" stroke={colors[i]} strokeOpacity="0.3" strokeWidth="1.5"/><text x={30+i*36} y={55} textAnchor="middle" fill={colors[i]} fontSize="11" fontWeight="800">{names[i]}</text></g>);
      })}
      <rect x="16" y="84" width="168" height="16" rx="4" fill="white" fillOpacity="0.6"/>
      <rect x="16" y="106" width="168" height="16" rx="4" fill="white" fillOpacity="0.4"/>
      <rect x="16" y="84" width="110" height="16" rx="4" fill="#7c3aed" fillOpacity="0.2"/>
      <rect x="16" y="106" width="65" height="16" rx="4" fill="#22c55e" fillOpacity="0.2"/>
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g5)"/>
      <defs><linearGradient id="g5" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#6366f1" stopOpacity="0.1"/><stop offset="1" stopColor="#7c3aed" stopOpacity="0.05"/></linearGradient></defs>
      <path d="M16,110 C40,90 60,100 80,70 C100,40 120,80 140,50 C160,20 180,40 184,30" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M16,110 C40,90 60,100 80,70 C100,40 120,80 140,50 C160,20 180,40 184,30 L184,120 L16,120 Z" fill="#7c3aed" fillOpacity="0.06"/>
      <path d="M16,118 C40,105 60,112 80,95 C100,78 120,100 140,80 C160,60 180,75 184,65" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeDasharray="4,3" fill="none"/>
      {[80,120,160].map((x,i)=><circle key={i} cx={x} cy={[70,50,30][i]} r={4} fill="#7c3aed" stroke="white" strokeWidth="2"/>)}
      <rect x="16" y="16" width="45" height="20" rx="6" fill="white" fillOpacity="0.8" stroke="#e8e4f5" strokeWidth="1"/>
      <text x="38" y="30" textAnchor="middle" fill="#7c3aed" fontSize="9" fontWeight="800">Revenue</text>
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g6)"/>
      <defs><linearGradient id="g6" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#7c3aed" stopOpacity="0.08"/><stop offset="1" stopColor="#3b82f6" stopOpacity="0.04"/></linearGradient></defs>
      <rect x="16" y="16" width="110" height="32" rx="10" fill="white" fillOpacity="0.9" stroke="#e8e4f5" strokeWidth="1.5"/>
      <rect x="24" y="24" width="70" height="6" rx="3" fill="#111" fillOpacity="0.15"/>
      <rect x="24" y="34" width="45" height="5" rx="2.5" fill="#9ca3af" fillOpacity="0.4"/>
      <rect x="74" y="60" width="110" height="32" rx="10" fill="#7c3aed" fillOpacity="0.15" stroke="#7c3aed" strokeOpacity="0.3" strokeWidth="1.5"/>
      <rect x="82" y="68" width="70" height="6" rx="3" fill="#7c3aed" fillOpacity="0.5"/>
      <rect x="82" y="78" width="50" height="5" rx="2.5" fill="#7c3aed" fillOpacity="0.3"/>
      <rect x="16" y="100" width="100" height="28" rx="10" fill="white" fillOpacity="0.9" stroke="#e8e4f5" strokeWidth="1.5"/>
      <rect x="24" y="108" width="60" height="5" rx="2.5" fill="#111" fillOpacity="0.12"/>
      <rect x="24" y="116" width="40" height="4" rx="2" fill="#9ca3af" fillOpacity="0.3"/>
      <circle cx="175" cy="20" r="12" fill="#7c3aed" fillOpacity="0.2"/>
      <text x="175" y="24" textAnchor="middle" fill="#7c3aed" fontSize="10" fontWeight="800">AI</text>
    </svg>
  ),
  marketing: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g7)"/>
      <defs><linearGradient id="g7" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#ec4899" stopOpacity="0.1"/><stop offset="1" stopColor="#7c3aed" stopOpacity="0.05"/></linearGradient></defs>
      <rect x="16" y="20" width="80" height="100" rx="12" fill="white" fillOpacity="0.85" stroke="#e8e4f5" strokeWidth="1.5"/>
      <rect x="24" y="32" width="64" height="40" rx="8" fill="#7c3aed" fillOpacity="0.15"/>
      <circle cx="56" cy="52" r="12" fill="#7c3aed" fillOpacity="0.3"/>
      <rect x="24" y="80" width="48" height="5" rx="2.5" fill="#111" fillOpacity="0.15"/>
      <rect x="24" y="88" width="36" height="4" rx="2" fill="#9ca3af" fillOpacity="0.35"/>
      <rect x="24" y="96" width="28" height="14" rx="6" fill="#7c3aed" fillOpacity="0.2"/>
      <text x="38" y="107" textAnchor="middle" fill="#7c3aed" fontSize="7" fontWeight="800">Boost</text>
      <rect x="108" y="20" width="76" height="46" rx="10" fill="white" fillOpacity="0.85" stroke="#e8e4f5" strokeWidth="1.5"/>
      <rect x="116" y="28" width="60" height="5" rx="2.5" fill="#111" fillOpacity="0.15"/>
      <rect x="116" y="36" width="46" height="4" rx="2" fill="#9ca3af" fillOpacity="0.3"/>
      <rect x="116" y="44" width="52" height="4" rx="2" fill="#9ca3af" fillOpacity="0.3"/>
      <rect x="116" y="52" width="38" height="4" rx="2" fill="#9ca3af" fillOpacity="0.3"/>
      <rect x="108" y="74" width="76" height="46" rx="10" fill="#7c3aed" fillOpacity="0.1" stroke="#7c3aed" strokeOpacity="0.25" strokeWidth="1.5"/>
      <text x="146" y="100" textAnchor="middle" fill="#7c3aed" fontSize="8" fontWeight="700">AI Caption</text>
      <text x="146" y="111" textAnchor="middle" fill="#7c3aed" fontSize="8" fontWeight="700">Generated</text>
    </svg>
  ),
  withdrawals: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g8)"/>
      <defs><linearGradient id="g8" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#22c55e" stopOpacity="0.1"/><stop offset="1" stopColor="#7c3aed" stopOpacity="0.05"/></linearGradient></defs>
      <rect x="16" y="16" width="168" height="44" rx="12" fill="white" fillOpacity="0.9" stroke="#e8e4f5" strokeWidth="1.5"/>
      <text x="32" y="34" fill="#111" fillOpacity="0.4" fontSize="9" fontWeight="700">AVAILABLE BALANCE</text>
      <text x="32" y="52" fill="#111" fontSize="18" fontWeight="900">GHS 0.00</text>
      <rect x="16" y="70" width="168" height="26" rx="8" fill="white" fillOpacity="0.7" stroke="#e8e4f5" strokeWidth="1"/>
      <circle cx="30" cy="83" r="8" fill="#22c55e" fillOpacity="0.2"/>
      <text x="30" y="87" textAnchor="middle" fill="#16a34a" fontSize="8" fontWeight="800">M</text>
      <rect x="46" y="78" width="60" height="4" rx="2" fill="#111" fillOpacity="0.15"/>
      <rect x="46" y="85" width="40" height="3" rx="1.5" fill="#9ca3af" fillOpacity="0.4"/>
      <rect x="150" y="76" width="26" height="14" rx="6" fill="#7c3aed" fillOpacity="0.2"/>
      <text x="163" y="86" textAnchor="middle" fill="#7c3aed" fontSize="8" fontWeight="700">Pay</text>
      <rect x="16" y="104" width="168" height="22" rx="7" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeOpacity="0.3" strokeWidth="1"/>
      <text x="100" y="119" textAnchor="middle" fill="#16a34a" fontSize="10" fontWeight="700">Withdraw GHS 0</text>
    </svg>
  ),
  appearance: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g9)"/>
      <defs><linearGradient id="g9" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#ec4899" stopOpacity="0.08"/><stop offset="1" stopColor="#7c3aed" stopOpacity="0.06"/></linearGradient></defs>
      <rect x="16" y="16" width="168" height="36" rx="10" fill="url(#banner)"/>
      <defs><linearGradient id="banner" x1="16" y1="16" x2="184" y2="52" gradientUnits="userSpaceOnUse"><stop stopColor="#7c3aed"/><stop offset="1" stopColor="#9333ea"/></linearGradient></defs>
      <text x="100" y="38" textAnchor="middle" fill="white" fillOpacity="0.9" fontSize="12" fontWeight="800">My Store Banner</text>
      <circle cx="40" cy="70" r="18" fill="white" stroke="#e8e4f5" strokeWidth="2"/>
      <circle cx="40" cy="70" r="12" fill="#7c3aed" fillOpacity="0.3"/>
      <text x="40" y="75" textAnchor="middle" fill="#7c3aed" fontSize="10" fontWeight="800">S</text>
      <rect x="64" y="62" width="80" height="6" rx="3" fill="#111" fillOpacity="0.2"/>
      <rect x="64" y="72" width="50" height="4" rx="2" fill="#9ca3af" fillOpacity="0.4"/>
      <div/>
      {["#7c3aed","#22c55e","#f59e0b","#ef4444","#3b82f6"].map((c,i)=><circle key={i} cx={64+i*16} cy={90} r={6} fill={c} fillOpacity="0.6"/>)}
      <rect x="16" y="104" width="168" height="22" rx="7" fill="white" fillOpacity="0.7" stroke="#e8e4f5" strokeWidth="1"/>
      <rect x="24" y="110" width="100" height="4" rx="2" fill="#111" fillOpacity="0.1"/>
      <rect x="24" y="118" width="70" height="3" rx="1.5" fill="#9ca3af" fillOpacity="0.3"/>
    </svg>
  ),
  subscription: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g10)"/>
      <defs><linearGradient id="g10" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#7c3aed" stopOpacity="0.12"/><stop offset="1" stopColor="#9333ea" stopOpacity="0.06"/></linearGradient></defs>
      {[{x:16,h:100,label:"Basic",color:"#6b7280",price:"Free"},{x:60,h:115,label:"Starter",color:"#7c3aed",price:"GHS 59"},{x:104,h:130,label:"Growth",color:"#6366f1",price:"GHS 129",popular:true},{x:148,h:120,label:"Pro",color:"#7c3aed",price:"GHS 399"}].map((p,i)=>(
        <g key={i}>
          <rect x={p.x} y={140-p.h} width="34" height={p.h} rx="8" fill={p.color} fillOpacity={p.popular?0.3:0.15}/>
          {p.popular && <rect x={p.x} y={140-p.h-14} width="34" height="12" rx="6" fill="#7c3aed"/>}
          {p.popular && <text x={p.x+17} y={140-p.h-5} textAnchor="middle" fill="white" fontSize="6" fontWeight="800">BEST</text>}
          <text x={p.x+17} y={136} textAnchor="middle" fill={p.color} fontSize="7" fontWeight="700">{p.label}</text>
        </g>
      ))}
    </svg>
  ),
  security: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g11)"/>
      <defs><linearGradient id="g11" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#7c3aed" stopOpacity="0.1"/><stop offset="1" stopColor="#6366f1" stopOpacity="0.05"/></linearGradient></defs>
      <path d="M100 20 L140 36 L140 68 C140 90 122 108 100 116 C78 108 60 90 60 68 L60 36 Z" fill="#7c3aed" fillOpacity="0.15" stroke="#7c3aed" strokeOpacity="0.4" strokeWidth="2"/>
      <polyline points="82,70 96,84 120,60" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="100" cy="70" r="30" stroke="#7c3aed" strokeOpacity="0.15" strokeWidth="1.5" fill="none"/>
      <circle cx="100" cy="70" r="20" stroke="#7c3aed" strokeOpacity="0.1" strokeWidth="1" fill="none"/>
    </svg>
  ),
  delivery: (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="140" rx="16" fill="url(#g12)"/>
      <defs><linearGradient id="g12" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#3b82f6" stopOpacity="0.1"/><stop offset="1" stopColor="#7c3aed" stopOpacity="0.05"/></linearGradient></defs>
      <rect x="16" y="55" width="110" height="55" rx="8" fill="white" fillOpacity="0.8" stroke="#e8e4f5" strokeWidth="1.5"/>
      <rect x="126" y="68" width="58" height="42" rx="8" fill="white" fillOpacity="0.8" stroke="#e8e4f5" strokeWidth="1.5"/>
      <rect x="134" y="76" width="42" height="18" rx="5" fill="#3b82f6" fillOpacity="0.2"/>
      <rect x="16" y="15" width="110" height="30" rx="8" fill="#7c3aed" fillOpacity="0.1" stroke="#7c3aed" strokeOpacity="0.25" strokeWidth="1.5"/>
      <text x="71" y="34" textAnchor="middle" fill="#7c3aed" fontSize="9" fontWeight="700">Greater Accra — GHS 15</text>
      <circle cx="46" cy="97" r="12" fill="none" stroke="#3b82f6" strokeWidth="2"/>
      <circle cx="46" cy="97" r="5" fill="#3b82f6" fillOpacity="0.4"/>
      <circle cx="96" cy="80" r="8" fill="none" stroke="#7c3aed" strokeWidth="1.5"/>
      <circle cx="96" cy="80" r="3" fill="#7c3aed" fillOpacity="0.5"/>
      <line x1="53" y1="93" x2="89" y2="83" stroke="#9ca3af" strokeWidth="1" strokeDasharray="4,3"/>
    </svg>
  ),
};

// ─── Section data ───
const SECTIONS = [
  {
    id: "home",
    label: "Dashboard Overview",
    icon: "M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z|M9 21V12h6v9",
    intro: "Your dashboard home is a live snapshot of how your store is performing. Every number updates in real time as orders come in and customers interact with your store.",
    steps: [
      { title: "Read your stats cards", desc: "Revenue, Orders, Customers, and Page Views are shown at the top. Revenue = total amount customers have paid. Orders = total number of orders placed. Views = how many people have visited your store." },
      { title: "Check the revenue chart", desc: "The line chart shows your revenue over the past 30 days. A rising line means you're growing. Look for spikes — something worked that day. Look for dips — something may have gone wrong." },
      { title: "Review recent orders", desc: "The recent orders table shows your latest transactions. Yellow = pending (waiting for you to process). Green = completed. Red = cancelled." },
      { title: "Use the AI assistant shortcut", desc: "Click the Beme AI tab in the sidebar to get instant insights on any metric you see. Ask 'Why did my views drop this week?' and get an actionable answer." },
    ],
    tips: ["Check your dashboard every morning before you start your day.", "If revenue is at zero, verify that your Paystack account is connected and your products are published.", "Views without orders = your listing needs better photos or a lower price."],
    faqs: [
      { q: "What's the difference between pending and completed revenue?", a: "Pending = orders that have been placed but not yet processed or confirmed. Completed = orders that have been fulfilled and payment confirmed. Only completed revenue is withdrawable." },
      { q: "Why are my page views high but orders low?", a: "Customers are finding your store but not buying. Common reasons: product prices are too high, photos aren't clear, descriptions are thin, or you have no reviews yet. Try reducing prices or adding better photos." },
    ],
  },
  {
    id: "products",
    label: "Products",
    icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z|M3.27 6.96L12 12.01l8.73-5.05|M12 22.08V12",
    intro: "Products are the heart of your store. Each product listing is a chance to convince a buyer to purchase. A great listing has a clear name, honest pricing, sharp photos, and enough description to answer common questions.",
    steps: [
      { title: "Click Add Product", desc: "From the Products tab, hit the Add Product button. Fill in the product name, price, category, and write a description that highlights what makes it special and who it's for." },
      { title: "Upload photos", desc: "Upload at least 3 photos: a front view, a back view, and one showing the product in use. Use natural lighting. Blurry or dark photos are the single biggest reason buyers don't purchase." },
      { title: "Add variants if needed", desc: "If your product comes in different sizes or colours, add variants. Each variant can have its own price difference. For example, a Large size might cost GHS 10 more than a Small." },
      { title: "Set stock and publish", desc: "Enter your current stock quantity so the dashboard can track it for you. Then hit Publish. Your product goes live immediately and appears in your store." },
    ],
    tips: ["Use your product name as customers would search for it. 'Black Leather Shoulder Bag' beats 'Nice Bag'.", "Keep your stock updated — selling out of stock creates a bad experience and hurts your ranking.", "Products with at least 4 photos get 60% more clicks on average."],
    faqs: [
      { q: "How many products can I have?", a: "It depends on your plan. Basic = 5, Starter = 10, Growth = 25, Pro = 500. You can upgrade at any time from the Subscription tab." },
      { q: "What is a 'featured' product?", a: "Featured products appear in the trending and homepage sections of Beme, giving them extra visibility. You can set a product as featured when editing it. Featured boosts are included in Growth (5/month) and Pro (20/month) plans." },
      { q: "Can I import products from a spreadsheet?", a: "Yes. On the Products page, look for the CSV import button. Download the template, fill in your products, and upload. All your products will be imported at once." },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    icon: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z|M3 6h18|M16 10a4 4 0 0 1-8 0",
    intro: "Every sale creates an order. Your job is to move each order through the fulfilment process quickly and keep the buyer informed. Fast fulfilment = better reviews = more sales.",
    steps: [
      { title: "View new orders", desc: "Orders tab shows all incoming orders. New orders appear at the top in Pending status. You'll also get a notification when a new order arrives." },
      { title: "Process the order", desc: "Open the order, confirm the details (product, size, delivery address), then change the status to Processing. This tells the buyer you've started preparing their order." },
      { title: "Ship and update status", desc: "Once you've dispatched the order, update it to Shipped and enter the tracking number if you have one. The buyer receives a notification automatically." },
      { title: "Mark as delivered", desc: "When the buyer confirms receipt, or after the expected delivery window, mark the order as Delivered. This unlocks the order amount for withdrawal." },
    ],
    tips: ["Process orders within 24 hours — buyers get anxious when they don't hear anything.", "Always send a message to the buyer when you ship, even if you don't have a tracking number.", "Cancelled orders hurt your conversion score. Avoid them by keeping stock updated."],
    faqs: [
      { q: "What do the different order statuses mean?", a: "Pending = buyer paid, you haven't started. Processing = you're preparing it. Shipped = it's on its way. Delivered = customer received it. Cancelled = order was cancelled by buyer or seller. Refunded = money was returned to the buyer." },
      { q: "How do I issue a refund?", a: "Go to the order, open the order detail panel, and look for the Refund option. Refunds go back to the buyer's original payment method within 3–7 business days." },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75",
    intro: "The Customers tab shows you who has bought from you. Understanding your customers — who they are, what they buy, and how often — helps you make better decisions about what to stock and how to market.",
    steps: [
      { title: "Review your customer list", desc: "Each row in the customer table shows a buyer's name, email, number of orders, and total spend. Customers who appear multiple times are your most loyal buyers." },
      { title: "Identify repeat buyers", desc: "Repeat customers cost 5× less to sell to than new ones. They already trust you. Consider sending them a discount code through the Messages tab to encourage another purchase." },
      { title: "Spot your best customers", desc: "Sort by Total Spend to see who has bought the most from you. These are your VIPs. Give them early access to new products or special deals." },
    ],
    tips: ["Reply to buyer messages quickly — fast replies lead to repeat purchases.", "Customers who leave reviews are your best marketing. Ask happy buyers to leave a review after delivery.", "If one customer keeps ordering, reach out and ask if they'd like to order in bulk at a discount."],
    faqs: [
      { q: "Can I contact my customers directly?", a: "Yes — use the Messages tab to chat with any customer who has messaged you or placed an order. You cannot send unsolicited messages to customers who haven't interacted with you first." },
      { q: "What is the 'New' vs 'Repeat' customer label?", a: "New = placing their first order with you. Repeat = has ordered from you before. Focus on converting new buyers into repeat customers with great service and post-purchase follow-ups." },
    ],
  },
  {
    id: "analytics",
    label: "Analytics Pro",
    icon: "M18 20V10|M12 20V4|M6 20v-6",
    intro: "Analytics Pro gives you deeper visibility into your store's performance over 90 days. Unlike the home dashboard (30 days), Analytics Pro shows longer trends so you can see seasonality and growth patterns.",
    steps: [
      { title: "Read the 90-day revenue chart", desc: "Toggle between Revenue and Orders using the tabs above the chart. Look for consistent growth over time. A flat line means you've hit a ceiling — time to try something new." },
      { title: "Interpret the activity heatmap", desc: "The green heatmap shows which days you had the most activity. Dark green = busy day. Light green = quiet. Identify your peak days and make sure your stock is ready for them." },
      { title: "Check top products", desc: "The top products bar chart shows which of your products drive the most revenue. Double down on your winners — add more stock, similar products, or bundle deals." },
      { title: "Compare traffic vs conversions", desc: "If you get high traffic but low sales, your listing needs work. If you get low traffic but good conversions, invest in marketing to bring more people to your store." },
    ],
    tips: ["Look at Analytics weekly, not daily. Day-to-day swings are normal — weekly trends are what matter.", "If a product appears in your top 3 consistently, make sure it's never out of stock.", "Use the heatmap to plan promotions — launch flash sales on your historically quietest days to boost them."],
    faqs: [
      { q: "How is revenue calculated?", a: "Revenue = sum of all completed order totals. Pending and cancelled orders are not counted. This matches your actual earned income." },
      { q: "Why is Analytics Pro a paid feature?", a: "Analytics Pro requires significant server processing to compute 90-day datasets. It's available on Growth and Pro plans. Basic and Starter plans have access to the 30-day dashboard view." },
    ],
  },
  {
    id: "chat",
    label: "Messages",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    intro: "Messages is your direct line to buyers. Responding quickly builds trust and dramatically increases conversion rates. Studies show that sellers who reply within 1 hour close 3× more sales than those who reply after a day.",
    steps: [
      { title: "Open the Messages tab", desc: "Each conversation shows the buyer's name, their last message, and a timestamp. Unread conversations are highlighted. Open one to see the full chat." },
      { title: "Reply to buyer questions", desc: "Type your response in the input at the bottom. Be helpful and specific. 'The bag is 30cm wide and comes in black, brown, and tan' is much better than 'Yes we have it'." },
      { title: "Use AI suggestions", desc: "Click the sparkle button (✨) next to the input to have Beme AI draft a reply for you. Review it, adjust if needed, and send. This is especially useful when you're busy." },
      { title: "Toggle AI auto-replies", desc: "Enable AI Auto-Replies in Settings → AI Capabilities to let the AI handle common questions automatically while you sleep. It answers things like 'What sizes do you have?' or 'When will it arrive?'." },
    ],
    tips: ["Set a goal to reply to all messages within 2 hours during business hours.", "If you're going to be unavailable, set an away message so buyers know when to expect a reply.", "Friendly, personal replies ('Hi Ama! Yes we have that in your size 🙂') convert better than robotic ones."],
    faqs: [
      { q: "Can buyers message me before buying?", a: "Yes. Buyers can message you from your store page or from a product listing. Many buyers ask questions before purchasing — this is a buying signal. Reply fast." },
      { q: "What kinds of questions does AI auto-reply handle?", a: "The AI handles FAQs like product availability, sizing, delivery time estimates, return policies, and payment methods. It pulls answers from your product listings and store settings." },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    intro: "The Marketing tab gives you tools to promote your store and products. Even the best products need promotion. Use AI captions, flash sales, and product boosts to bring more buyers to your store.",
    steps: [
      { title: "Generate AI captions", desc: "Enter a product name and choose your platform (Instagram, TikTok, WhatsApp). The AI will write a ready-to-post caption with relevant hashtags. Copy and post directly to your social media." },
      { title: "Run a flash sale", desc: "Flash sales create urgency. Set a discount percentage, choose which products to include, and set a start and end time. Flash sale products are badged on your store with a countdown timer." },
      { title: "Boost a product", desc: "Boosted products appear on the Beme homepage trending section, giving them exposure to thousands of visitors who aren't your existing followers. Growth plan includes 5 boosts/month, Pro includes 20." },
      { title: "Share your store link", desc: "Your unique store URL (bememarket.store/store/your-store-name) can be shared anywhere — Instagram bio, WhatsApp status, TikTok description. Every visit is a potential sale." },
    ],
    tips: ["Post on social media consistently, even when sales are slow. Consistency compounds.", "Use flash sales to clear old stock rather than discounting permanently.", "The best time to boost a product is when you've just added new photos or a new variant — fresh listings perform better."],
    faqs: [
      { q: "How many AI captions can I generate?", a: "Caption generation is available on Starter plans and above. There's no hard limit on caption generation — it's powered by the same AI credit system as the chat assistant." },
      { q: "Do flash sales affect my regular pricing?", a: "No. Flash sale prices are temporary and only apply during the sale window you set. When the timer expires, the price automatically reverts to your regular listing price." },
    ],
  },
  {
    id: "withdrawals",
    label: "Withdrawals",
    icon: "M21 12V7H5a2 2 0 0 1 0-4h14v4|M3 5v14a2 2 0 0 0 2 2h16v-5|M18 12h.01",
    intro: "Withdrawals let you move your earned revenue from your Beme wallet to your bank account or mobile money. Your wallet accumulates as orders are completed. You can withdraw at any time above the minimum.",
    steps: [
      { title: "Add your payout account", desc: "Go to Withdrawals and click Add Payout Account. Choose MoMo (MTN, Vodafone, AirtelTigo) or bank transfer, enter your account details, and save. Always double-check the account number — wrong numbers mean delays." },
      { title: "Check your available balance", desc: "Your Available Balance is the amount you can withdraw right now. It only includes completed orders. Pending orders are shown separately as Pending Balance." },
      { title: "Request a withdrawal", desc: "Enter the amount you want to withdraw (minimum GHS 10), select your payout account, and confirm. MoMo arrives within a few hours. Bank transfers take 1–2 business days." },
      { title: "Track your withdrawal history", desc: "All your withdrawal requests are listed below with status: Pending (being processed), Completed (paid), or Failed (there was an issue — contact support)." },
    ],
    tips: ["Withdraw regularly rather than letting large balances accumulate.", "If a withdrawal shows Failed, check your account details are correct and try again, or contact support.", "Your first withdrawal may take a bit longer while we verify your account details."],
    faqs: [
      { q: "When do completed orders become available for withdrawal?", a: "Order funds are available for withdrawal immediately once the order status is marked Delivered. If there's a dispute or refund, the amount is held until resolved." },
      { q: "Are there fees for withdrawals?", a: "Beme charges a small processing fee on withdrawals. The fee is shown clearly before you confirm. MoMo transfers may also have a small network fee applied by the mobile operator." },
    ],
  },
  {
    id: "appearance",
    label: "Store Design",
    icon: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",
    intro: "Your store design is the first impression buyers get. A professional-looking store builds instant trust. Use the Appearance tab to customise your banner, logo, colours, and store description.",
    steps: [
      { title: "Upload a banner image", desc: "Your banner is the wide image that appears at the top of your store page. Use a high-quality photo of your products, your workspace, or a branded graphic. Recommended size: 1200×300px." },
      { title: "Set your store logo", desc: "Upload a square logo or profile photo. This appears next to your store name everywhere on Beme. A clear logo builds brand recognition." },
      { title: "Write your store bio", desc: "Write 2–3 sentences about your store. What do you sell? Who is it for? What makes you different? Buyers read this to decide if they trust you." },
      { title: "Add social links", desc: "Link your Instagram, TikTok, WhatsApp, and Facebook. Buyers who follow you on social media are 4× more likely to become repeat customers." },
    ],
    tips: ["Consistent colours across your banner, logo, and product photos signal a professional brand.", "Update your banner seasonally — a fresh look shows buyers your store is active.", "A filled-out store profile ranks higher in search results than an empty one."],
    faqs: [
      { q: "What image formats are accepted?", a: "JPEG, PNG, and WebP are accepted for banners and logos. Maximum file size is 5MB. Images are automatically compressed and resized for optimal loading speed." },
      { q: "Can buyers see my social media?", a: "Yes. Your linked social accounts appear on your store page. Clicking them opens the respective platform. This helps buyers connect with you outside Beme and follow your updates." },
    ],
  },
  {
    id: "subscription",
    label: "Subscription",
    icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    intro: "Your subscription plan determines how many products you can list, which features you can use, and how much support you get. Start free and upgrade as your business grows.",
    steps: [
      { title: "Understand your current plan", desc: "Open the Subscription tab to see your current plan, what it includes, and when it renews. Your product limit and feature access are shown clearly." },
      { title: "Choose a plan to upgrade to", desc: "Compare plans side by side. Basic is free forever. Starter (GHS 59/mo) unlocks more products and messaging. Growth (GHS 129/mo) adds Beme Delivery and Analytics Pro. Pro (GHS 399/mo) is for high-volume sellers." },
      { title: "Pay via Paystack", desc: "Click Choose Plan, confirm the amount, and complete payment with Paystack. Your plan upgrades immediately after payment. No waiting." },
      { title: "Choose monthly or yearly", desc: "Yearly billing saves you 17% compared to monthly. If you're committed to selling on Beme, yearly is the better value." },
    ],
    tips: ["Upgrade when your product limit is holding you back, not before.", "Growth plan is the best value for most active sellers — it includes Beme Delivery which can save you significant time.", "If your plan lapses, your store stays live but you lose access to features above your plan's tier."],
    faqs: [
      { q: "Can I downgrade my plan?", a: "Downgrading is handled by our support team. Contact us via Get Help. Note that downgrading may cause some products to become unlisted if you exceed the lower plan's product limit." },
      { q: "What happens when my yearly plan expires?", a: "You'll receive reminder emails before expiry. If you don't renew, you're automatically moved to the free Basic plan. Your store stays live but paid features are disabled." },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    intro: "Your account security protects your store, your earnings, and your customers' data. Set up two-step verification and use a strong, unique password to prevent unauthorised access.",
    steps: [
      { title: "Enable two-step verification", desc: "Go to Settings → Security and click Set up authenticator. Install Google Authenticator or Authy on your phone, scan the QR code, and enter the first 6-digit code to activate. After this, every login requires your code." },
      { title: "Use a strong password", desc: "Your password should be at least 12 characters and include letters, numbers, and symbols. Never use your business name, birthday, or 'password123'. Use a password manager if you have trouble remembering complex ones." },
      { title: "Never share your login", desc: "Do not share your Beme password with anyone, even support staff. Beme support will never ask for your password. If someone does, it's a scam." },
      { title: "Log out on shared devices", desc: "If you access your dashboard from a shared computer or phone, always log out when you're done. Use the Log Out option in the top-right avatar menu." },
    ],
    tips: ["Enable 2FA before your store becomes active — it's much harder to recover a compromised account than to prevent it.", "If you think your account has been accessed without permission, contact support immediately and change your password.", "Your Beme password should be different from your email password and Paystack password."],
    faqs: [
      { q: "What authenticator apps work with Beme?", a: "Google Authenticator, Authy, and Microsoft Authenticator all work. Authy is recommended because it backs up your codes to the cloud, so you don't lose access if you change phones." },
      { q: "What if I lose access to my authenticator app?", a: "Contact Beme support immediately with your registered email. We'll verify your identity and help you recover access. This process takes 1–2 business days for security reasons." },
    ],
  },
  {
    id: "delivery",
    label: "Delivery Settings",
    icon: "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3|M9 17H7|M17 21H9|M3 9h11|M13 17h2l1-1V9h-3|M16 9l3 3|M19 12v5a2 2 0 0 1-2 2|M17 21a2 2 0 1 0 4 0 2 2 0 0 0-4 0|M7 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0",
    intro: "Delivery Settings controls how customers receive their orders from you. Getting this right is critical — unclear delivery fees or long wait times are a leading cause of abandoned carts.",
    steps: [
      { title: "Choose your delivery method", desc: "Self Delivery = you handle everything using your own courier or personal delivery. Beme Network = Beme coordinates a courier for you (Growth and Pro plans). Pickup Only = customers collect from your location." },
      { title: "Set your delivery fee structure", desc: "Flat fee = everyone pays the same amount. Free delivery = you absorb the cost. Free above threshold = delivery is free when the order total exceeds a set amount (great for increasing average order value)." },
      { title: "Define your delivery zones", desc: "Select which regions of Ghana you deliver to. This prevents buyers outside your service area from placing orders you can't fulfil." },
      { title: "Set cut-off and minimum order", desc: "Cut-off time = orders placed before this time are delivered same day. Orders after this time are dispatched the next day. Minimum order = the smallest cart total you'll accept." },
    ],
    tips: ["Free delivery above GHS 100 typically increases average order value by 15–20% as buyers add items to hit the threshold.", "Be realistic about your zones. It's better to serve fewer areas well than to overcommit and deliver late.", "If you use Beme Delivery, keep your store address in your profile up to date so couriers know where to collect from."],
    faqs: [
      { q: "How does Beme Delivery work?", a: "When an order is placed, Beme assigns a courier partner to pick up from your address. You package the item, the courier collects, and delivers to the customer. You can track the delivery status in the Orders tab." },
      { q: "Can I offer both pickup and delivery?", a: "Currently, you choose one primary method. If you need flexibility, set Self Delivery and manually coordinate pickup arrangements with buyers through the Messages tab." },
    ],
  },
];

export default function LearnMore() {
  const [activeId, setActiveId]   = useState("home");
  const [search, setSearch]       = useState("");
  const [openFaqs, setOpenFaqs]   = useState({});

  const filtered = useMemo(() => {
    if (!search.trim()) return SECTIONS;
    const q = search.toLowerCase();
    return SECTIONS.filter(s =>
      s.label.toLowerCase().includes(q) ||
      s.intro.toLowerCase().includes(q) ||
      s.steps.some(st => st.title.toLowerCase().includes(q) || st.desc.toLowerCase().includes(q))
    );
  }, [search]);

  const active = SECTIONS.find(s => s.id === activeId) || SECTIONS[0];
  const toggleFaq = (key) => setOpenFaqs(f => ({ ...f, [key]: !f[key] }));

  return (
    <div style={{ fontFamily: "var(--sd-font)", minHeight: "calc(100vh - 100px)" }}>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, var(--sd-accent) 0%, #9333ea 60%, #6366f1 100%)", borderRadius: 20, padding: "40px 36px", marginBottom: 28, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -60, left: 60, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 520 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", borderRadius: 100, padding: "5px 14px", marginBottom: 16 }}>
            <Ico d={IC.star} size={13} color="#fff" sw={2} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Beme Seller Guide</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.04em", lineHeight: 1.15 }}>Everything you need to sell on Beme</h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "0 0 24px", lineHeight: 1.65 }}>Step-by-step guides for every feature. Practical tips from sellers who are already growing. Search or browse by section.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 16px", border: "1px solid rgba(255,255,255,0.2)", maxWidth: 400, backdropFilter: "blur(8px)" }}>
            <Ico d={IC.search} size={16} color="rgba(255,255,255,0.7)" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search guides…"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#fff", fontFamily: "var(--sd-font)", fontWeight: 500 }} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[["13", "Dashboard Sections"], ["50+", "Pro Tips"], ["Everything", "You Need to Succeed"]].map(([num, label]) => (
          <div key={label} style={{ background: "var(--sd-white)", borderRadius: 14, border: "1px solid var(--sd-border)", padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "var(--sd-accent)", letterSpacing: "-0.04em", marginBottom: 4 }}>{num}</div>
            <div style={{ fontSize: 12, color: "var(--sd-muted)", fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>

        {/* Left sidebar nav */}
        <aside style={{ background: "var(--sd-white)", borderRadius: 16, border: "1px solid var(--sd-border)", padding: "12px 8px", position: "sticky", top: 80 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--sd-muted)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 8px", marginBottom: 6 }}>Sections</div>
          {(search ? filtered : SECTIONS).map(sec => (
            <button key={sec.id} onClick={() => { setActiveId(sec.id); setSearch(""); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 10px", borderRadius: 9, border: "none", background: activeId === sec.id ? "var(--sd-accent-dim)" : "transparent", cursor: "pointer", fontFamily: "var(--sd-font)", fontSize: 13, fontWeight: activeId === sec.id ? 700 : 500, color: activeId === sec.id ? "var(--sd-accent)" : "var(--sd-text2)", textAlign: "left", transition: "background 0.12s", marginBottom: 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeId === sec.id ? "var(--sd-accent)" : "var(--sd-muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {sec.icon.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sec.label}</span>
              {activeId === sec.id && <Ico d={IC.chevron} size={12} color="var(--sd-accent)" />}
            </button>
          ))}
        </aside>

        {/* Right content */}
        <div>
          {/* Illustration */}
          <div style={{ width: "100%", borderRadius: 16, overflow: "hidden", marginBottom: 20, border: "1px solid var(--sd-border)" }}>
            {ILLUSTRATIONS[active.id] || ILLUSTRATIONS["home"]}
          </div>

          {/* Section header */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--sd-text)", margin: "0 0 8px", letterSpacing: "-0.03em" }}>{active.label}</h2>
            <p style={{ fontSize: 14, color: "var(--sd-muted)", lineHeight: 1.7, margin: 0 }}>{active.intro}</p>
          </div>

          {/* How it works steps */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>How It Works</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {active.steps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 14, padding: "16px", background: "var(--sd-white)", borderRadius: 14, border: "1px solid var(--sd-border)", transition: "box-shadow 0.15s" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--sd-accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--sd-text)", marginBottom: 5, letterSpacing: "-0.01em" }}>{step.title}</div>
                    <div style={{ fontSize: 13, color: "var(--sd-muted)", lineHeight: 1.7 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pro tips */}
          <div style={{ padding: "18px 20px", background: "var(--sd-accent-dim)", borderRadius: 14, border: "1px solid var(--sd-accent-border)", marginBottom: 24, borderLeft: "4px solid var(--sd-accent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ico d={IC.tip} size={16} color="var(--sd-accent)" />
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--sd-accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pro Tips</span>
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 4px", listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {active.tips.map((tip, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--sd-text)", lineHeight: 1.65 }}>
                  <Ico d={IC.check} size={14} color="var(--sd-accent)" sw={2.5} />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* FAQ */}
          {active.faqs?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Common Questions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {active.faqs.map((faq, i) => {
                  const key = `${active.id}-${i}`;
                  return (
                    <div key={key} style={{ background: "var(--sd-white)", border: "1px solid var(--sd-border)", borderRadius: 12, overflow: "hidden" }}>
                      <button onClick={() => toggleFaq(key)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--sd-font)", fontSize: 14, fontWeight: 600, color: "var(--sd-text)", textAlign: "left" }}>
                        <span>{faq.q}</span>
                        <span style={{ flexShrink: 0, color: "var(--sd-muted)", transform: openFaqs[key] ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "flex" }}>
                          <Ico d={IC.chevronD} size={15} />
                        </span>
                      </button>
                      {openFaqs[key] && (
                        <div style={{ padding: "0 16px 16px", fontSize: 13, color: "var(--sd-muted)", lineHeight: 1.75 }}>{faq.a}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--sd-border-light)" }}>
            {(() => {
              const idx = SECTIONS.findIndex(s => s.id === active.id);
              const prev = SECTIONS[idx - 1];
              const next = SECTIONS[idx + 1];
              return (
                <>
                  {prev ? (
                    <button onClick={() => setActiveId(prev.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px solid var(--sd-border)", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontFamily: "var(--sd-font)", fontSize: 13, fontWeight: 600, color: "var(--sd-text)" }}>
                      ← {prev.label}
                    </button>
                  ) : <div />}
                  {next && (
                    <button onClick={() => setActiveId(next.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--sd-accent)", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontFamily: "var(--sd-font)", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                      {next.label} →
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .learn-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}