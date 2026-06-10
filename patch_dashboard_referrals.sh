#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let sd = fs.readFileSync("Beme-Frontend/src/pages/SellerDashboard.jsx","utf8").replace(/\r\n/g,"\n");

// ── 1. Add lazy import after DashboardMarketing ──
sd = sd.replace(
  'const DashboardMarketing    = lazy(() => import("./dashboard/DashboardMarketing"));',
  'const DashboardMarketing    = lazy(() => import("./dashboard/DashboardMarketing"));\nconst ReferralPanel         = lazy(() => import("./dashboard/marketing/ReferralPanel"));'
);

// ── 2. Add referrals to sidebar nav array ──
sd = sd.replace(
  '  { id: "marketing",    label: "Marketing",     icon: D.marketing    },',
  '  { id: "marketing",    label: "Marketing",     icon: D.marketing    },\n  { id: "referrals",    label: "Referrals",     icon: D.marketing    },'
);

// ── 3. Add referrals to tab label map ──
sd = sd.replace(
  'marketing:"Marketing",',
  'marketing:"Marketing", referrals:"Referrals",'
);

// ── 4. Add referrals to tab render map ──
sd = sd.replace(
  '    marketing:    <DashboardMarketing />,',
  '    marketing:    <DashboardMarketing />,\n    referrals:    <ReferralPanel onBack={() => setTab("home")} />,'
);

fs.writeFileSync("Beme-Frontend/src/pages/SellerDashboard.jsx", sd.replace(/\n/g,"\r\n"),"utf8");

const checks = [
  ["ReferralPanel import",  sd.includes('import("./dashboard/marketing/ReferralPanel")')],
  ["referrals nav item",    sd.includes('id: "referrals"')],
  ["referrals label",       sd.includes('referrals:"Referrals"')],
  ["referrals tab render",  sd.includes('referrals:    <ReferralPanel')],
];
checks.forEach(([l,ok]) => console.log("  " + (ok?"✅":"❌") + " " + l));
NODEEOF
