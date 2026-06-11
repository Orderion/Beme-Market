#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let src = fs.readFileSync("Beme-Frontend/src/pages/dashboard/AIAssistant.jsx","utf8").replace(/\r\n/g,"\n");

// The noAccess block needs to return early — hide the bottom bar and input entirely
// Find the noAccess JSX block and make it a full early return
const OLD = `        {noAccess ? (
          <div className="ai-empty" style={{ paddingTop:40 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
            <div className="ai-empty-greeting" style={{ fontSize:18 }}>Beme AI is not available on your plan</div>
            <div className="ai-empty-hint">Upgrade to Starter, Growth, or Pro to access AI features including product descriptions, marketing copy, and store analytics.</div>
            <button className="ai-example-card" style={{ marginTop:16, padding:"12px 24px", borderRadius:12, background:"var(--sd-accent)", color:"#fff", border:"none", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}
              onClick={() => {}}>Upgrade Plan →</button>
          </div>
        ) : isEmpty ? (`;

const NEW = `        {noAccess ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"40px 24px" }}>
            <div style={{ fontSize:56, marginBottom:20 }}>🔒</div>
            <div style={{ fontSize:20, fontWeight:900, color:"var(--sd-text)", marginBottom:10, letterSpacing:"-0.02em" }}>Beme AI is not available on your plan</div>
            <div style={{ fontSize:14, color:"var(--sd-muted)", maxWidth:320, lineHeight:1.7, marginBottom:28 }}>Upgrade to Starter, Growth, or Pro to access AI features including product descriptions, marketing copy, and store analytics.</div>
            <button style={{ padding:"12px 28px", borderRadius:12, background:"var(--sd-accent)", color:"#fff", border:"none", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit", letterSpacing:"-0.01em" }}
              onClick={() => { window.dispatchEvent(new CustomEvent("beme:nav", { detail:"subscription" })); }}>
              Upgrade Plan →
            </button>
          </div>
        ) : isEmpty ? (`;

if (src.includes(OLD.trim().slice(0,80))) {
  src = src.replace(OLD, NEW);
  console.log("✅ noAccess block updated");
} else {
  console.log("❌ noAccess pattern not found — trying alternate");
  const idx = src.indexOf("noAccess ?");
  if (idx > -1) console.log(src.slice(idx, idx+300));
}

// Also hide the bottom bar (ai-bottom) when noAccess
// Wrap the ai-bottom div with a noAccess check
src = src.replace(
  '      {/* ══ PINNED INPUT ══ */}\n      <div className="ai-bottom">',
  '      {/* ══ PINNED INPUT ══ */}\n      {!noAccess && <div className="ai-bottom">'
);
// Close the conditional
src = src.replace(
  '      {showTopup && <TopupModal',
  '      }\n      {showTopup && <TopupModal'
);

// Also hide the usage bar section when noAccess
// The noAccess check on ai-bottom already covers this since bar is inside ai-bottom

fs.writeFileSync("Beme-Frontend/src/pages/dashboard/AIAssistant.jsx", src.replace(/\n/g,"\r\n"),"utf8");

const checks = [
  ["noAccess early return",  src.includes("Upgrade Plan →")],
  ["bottom hidden",          src.includes("{!noAccess && <div className=\"ai-bottom\">")],
];
checks.forEach(([l,ok]) => console.log("  "+(ok?"✅":"❌")+" "+l));
NODEEOF
