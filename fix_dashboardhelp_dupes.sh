#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let src = fs.readFileSync("Beme-Frontend/src/pages/dashboard/DashboardHelp.jsx","utf8").replace(/\r\n/g,"\n");

// 1. Remove duplicate chatResolved state line
src = src.replace(
  `  const [chatResolved, setChatResolved] = useState(false); // true when ticket resolved
  const [chatResolved, setChatResolved] = useState(false); // true when ticket resolved`,
  `  const [chatResolved, setChatResolved] = useState(false); // true when ticket resolved`
);

// 2. Remove duplicate .dh-resolved-bar CSS block
const resolvedBarCSS = `
  .dh-resolved-bar {
    display: flex; align-items: center; gap: 8px; padding: 12px 16px;
    border-top: 1px solid var(--sd-border); border-radius: 0 0 12px 12px;
    background: rgba(21,128,61,0.06); border-color: rgba(21,128,61,0.15);
    font-size: 13px; font-weight: 700; color: #15803d; flex-shrink: 0;
  }`;

// Count occurrences
const count = (src.match(/\.dh-resolved-bar \{/g) || []).length;
console.log(".dh-resolved-bar occurrences:", count);

if (count === 2) {
  // Remove the second occurrence by finding it after the first
  const firstIdx  = src.indexOf(".dh-resolved-bar {");
  const secondIdx = src.indexOf(".dh-resolved-bar {", firstIdx + 10);
  // Remove from secondIdx back to the newline before it, to end of block
  const blockEnd = src.indexOf("}", secondIdx) + 1;
  // Remove the duplicate block including leading newlines
  const before = src.slice(0, secondIdx - 3); // -3 to trim leading newline+spaces
  const after  = src.slice(blockEnd);
  src = before + after;
  console.log("✅ Duplicate .dh-resolved-bar removed");
}

// 3. Fix JSX structure — style tag must be inside the return, not dangling
// The issue is <style>{STYLES}</style> is inside )} block
// Check current structure around the style tag
const styleIdx = src.lastIndexOf("<style>{STYLES}</style>");
const context  = src.slice(styleIdx - 100, styleIdx + 150);
console.log("\nStyle tag context:\n" + context);

fs.writeFileSync("Beme-Frontend/src/pages/dashboard/DashboardHelp.jsx", src.replace(/\n/g,"\r\n"),"utf8");

const checks = [
  ["no duplicate state", (src.match(/const \[chatResolved/g)||[]).length === 1],
  ["no duplicate CSS",   (src.match(/\.dh-resolved-bar \{/g)||[]).length === 1],
];
checks.forEach(([l,ok]) => console.log("  "+(ok?"✅":"❌")+" "+l));
NODEEOF
