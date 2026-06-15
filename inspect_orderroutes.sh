#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let src = fs.readFileSync("Beme-Backend/src/routes/orderRoutes.js","utf8").replace(/\r\n/g,"\n");
const delIdx = src.indexOf("function sanitizeDelivery");
const retIdx = src.indexOf("return {", delIdx);
const endIdx = src.indexOf("\n}", retIdx) + 2;
console.log(src.slice(retIdx, endIdx));

// Also show where the order payload is built (to find where delivery is placed)
const payloadIdx = src.indexOf("const payload") !== -1 ? src.indexOf("const payload") : src.indexOf("delivery:");
console.log("\n--- delivery field in payload ---");
const dIdx2 = src.indexOf("delivery,", payloadIdx > 0 ? payloadIdx : 0);
if (dIdx2 > 0) console.log(src.slice(dIdx2 - 50, dIdx2 + 100));
NODEEOF
