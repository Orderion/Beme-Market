#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");

// ── 1. Patch DashboardWithdrawals.jsx — add referral balance + withdraw section ──
let wd = fs.readFileSync("Beme-Frontend/src/pages/dashboard/DashboardWithdrawals.jsx","utf8").replace(/\r\n/g,"\n");

// Add referralService import after existing imports
if (!wd.includes("referralService")) {
  wd = wd.replace(
    'import { useSellerAuth } from "../../hooks/useSellerAuth";',
    'import { useSellerAuth } from "../../hooks/useSellerAuth";\nimport { getReferralBalance, submitReferralWithdrawal, REFERRAL_MIN_WITHDRAW } from "../../services/referralService";'
  );
  console.log("✅ DashboardWithdrawals: referralService import added");
} else {
  console.log("⚠️  DashboardWithdrawals: import already present");
}

fs.writeFileSync("Beme-Frontend/src/pages/dashboard/DashboardWithdrawals.jsx", wd.replace(/\n/g,"\r\n"),"utf8");

// ── 2. Patch SellerDashboard.jsx — wire ReferralPanel as a standalone tab ──
let sd = fs.readFileSync("Beme-Frontend/src/pages/SellerDashboard.jsx","utf8").replace(/\r\n/g,"\n");

// Add import for ReferralPanel if not already there
if (!sd.includes("ReferralPanel")) {
  // Find the last dashboard import and add after it
  const insertAfter = 'import DashboardMarketing   from "./dashboard/DashboardMarketing.jsx";';
  if (sd.includes(insertAfter)) {
    sd = sd.replace(insertAfter,
      insertAfter + '\nimport ReferralPanel        from "./dashboard/marketing/ReferralPanel.jsx";'
    );
    console.log("✅ SellerDashboard: ReferralPanel import added");
  } else {
    console.log("❌ SellerDashboard: could not find insert point for import");
  }
}

// Add referrals to the tab renderer (find where tab === "marketing" renders and add referrals after)
const TAB_OLD = '{tab === "marketing"   && <DashboardMarketing />}';
const TAB_NEW = '{tab === "marketing"   && <DashboardMarketing />}\n        {tab === "referrals"  && <div className="sd-page-pad"><ReferralPanel onBack={() => setTab("home")} /></div>}';
if (sd.includes(TAB_OLD)) {
  sd = sd.replace(TAB_OLD, TAB_NEW);
  console.log("✅ SellerDashboard: referrals tab render added");
} else {
  console.log("❌ SellerDashboard: tab render pattern not found — checking alternatives");
  // Try broader pattern
  const idx = sd.indexOf('"marketing"');
  if (idx > 0) console.log("  Found marketing at:", sd.slice(idx-20, idx+60));
}

fs.writeFileSync("Beme-Frontend/src/pages/SellerDashboard.jsx", sd.replace(/\n/g,"\r\n"),"utf8");

console.log("Done");
NODEEOF

echo ""
echo "=== Check sidebar nav items for referrals entry point ==="
grep -n "referral\|marketing\|Referral" Beme-Frontend/src/pages/SellerDashboard.jsx | head -15
