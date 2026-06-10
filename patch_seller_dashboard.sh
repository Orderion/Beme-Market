#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let sd = fs.readFileSync("Beme-Frontend/src/pages/SellerDashboard.jsx","utf8").replace(/\r\n/g,"\n");

// Show lines around the imports and the tab map
const lines = sd.split("\n");
const importEnd = lines.findIndex(l => l.includes("DashboardMarketing"));
const tabMapIdx = lines.findIndex(l => l.includes("marketing:") && l.includes("DashboardMarketing"));
console.log("DashboardMarketing import at line:", importEnd+1, "->", lines[importEnd]);
console.log("Tab map entry at line:", tabMapIdx+1, "->", lines[tabMapIdx]);

// Show 3 lines around tab map
lines.slice(tabMapIdx-2, tabMapIdx+6).forEach((l,i) => console.log(tabMapIdx-2+1+i,":", l));
NODEEOF
