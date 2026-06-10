#!/bin/bash
cd "/c/Users/user/Documents/Beme Project"

node << 'NODEEOF'
const fs = require("fs");
const path = "Beme-Backend/src/routes/orderRoutes.js";
let src = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const lines = src.split("\n");

// Find line: const orderRef = await adminDb.collection("orders").add(payload);
const idx = lines.findIndex(l => l.includes('adminDb.collection("orders").add(payload)'));
if (idx === -1) { console.error("❌ not found"); process.exit(1); }
console.log("Found at line", idx+1, ":", lines[idx]);
console.log("Next line:", lines[idx+1]);
console.log("Line after:", lines[idx+2]);

// Insert increment block after line idx+1 (the "const created = await orderRef.get();" line)
const insertAfter = idx + 1; // after "const created = await orderRef.get();"
const increment = [
  "",
  "    // Increment discount code usedCount if a code was applied",
  "    if (pricing?.discountCodeId && pricing?.discount > 0) {",
  "      adminDb.collection(\"discountCodes\").doc(String(pricing.discountCodeId))",
  "        .get().then(snap => {",
  "          if (snap.exists) {",
  "            snap.ref.update({ usedCount: (snap.data().usedCount || 0) + 1 });",
  "          }",
  "        }).catch(e => console.error(\"[discount increment]\", e));",
  "    }",
];

lines.splice(insertAfter + 1, 0, ...increment);
const result = lines.join("\n");
fs.writeFileSync(path, result.replace(/\n/g, "\r\n"), "utf8");
console.log("✅ Inserted increment block after line", insertAfter+1);

const { execSync } = require("child_process");
try {
  execSync('node --check "Beme-Backend/src/routes/orderRoutes.js"');
  console.log("✅ Syntax OK");
} catch(e) { console.error("❌", e.stderr?.toString()); }
NODEEOF
