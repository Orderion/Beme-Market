#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let src = fs.readFileSync("Beme-Frontend/src/pages/dashboard/AIAssistant.jsx","utf8").replace(/\r\n/g,"\n");

// Add topup_ref handling on mount — verify payment when returning from Paystack
const OLD = `  const [showTopup,   setShowTopup]   = useState(false);`;
const NEW = `  const [showTopup,   setShowTopup]   = useState(false);
  const [topupMsg,    setTopupMsg]    = useState("");

  // Handle return from Paystack topup payment
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const topupRef = params.get("topup_ref");
    if (!topupRef || !topupRef.startsWith("topup_")) return;

    const API = import.meta.env.VITE_BACKEND_URL || "https://beme-market-1.onrender.com";
    // Remove param from URL without reload
    const newUrl = window.location.pathname + "?tab=ai";
    window.history.replaceState({}, "", newUrl);

    (async () => {
      try {
        const res  = await fetch(\`\${API}/api/paystack/topup/verify?reference=\${encodeURIComponent(topupRef)}\`);
        const data = await res.json();
        if (data.success) {
          setTopupMsg(\`✅ \${data.credits} messages added to your account!\`);
          setTimeout(() => setTopupMsg(""), 5000);
        }
      } catch {}
    })();
  }, []);`;

if (src.includes(OLD)) {
  src = src.replace(OLD, NEW);
  console.log("✅ Topup callback handler added");
} else {
  console.log("❌ Pattern not found");
}

// Show topup success message in header
src = src.replace(
  '        <div className="ai-hdr-right">',
  `        <div className="ai-hdr-right">
          {topupMsg && <div style={{ fontSize:11,color:"#16a34a",fontWeight:700,padding:"3px 10px",background:"rgba(21,128,61,0.08)",borderRadius:100,border:"1px solid rgba(21,128,61,0.2)" }}>{topupMsg}</div>}`
);

fs.writeFileSync("Beme-Frontend/src/pages/dashboard/AIAssistant.jsx", src.replace(/\n/g,"\r\n"),"utf8");
const checks = [
  ["topupMsg state",      src.includes("topupMsg")],
  ["topup_ref handler",   src.includes("topup_ref")],
  ["success message",     src.includes("messages added")],
];
checks.forEach(([l,ok]) => console.log("  "+(ok?"✅":"❌")+" "+l));
NODEEOF
