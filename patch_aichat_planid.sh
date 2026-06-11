#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let src = fs.readFileSync("Beme-Frontend/src/hooks/useAIChat.js","utf8").replace(/\r\n/g,"\n");

// Import useSellerAuth
src = src.replace(
  'import { useAuth } from "../context/AuthContext";',
  'import { useAuth } from "../context/AuthContext";\nimport { useSellerAuth } from "./useSellerAuth";'
);

// Add subscriptionPlan to hook body
src = src.replace(
  '  const { user } = useAuth();',
  '  const { user } = useAuth();\n  const { subscriptionPlan } = useSellerAuth();'
);

// Pass planId to incrementUsage
src = src.replace(
  '    const result = await incrementUsage(user.uid);',
  '    const result = await incrementUsage(user.uid, subscriptionPlan || "basic");'
);

fs.writeFileSync("Beme-Frontend/src/hooks/useAIChat.js", src.replace(/\n/g,"\r\n"),"utf8");
const checks = [
  ["useSellerAuth import", src.includes("useSellerAuth")],
  ["subscriptionPlan",     src.includes("subscriptionPlan")],
  ["planId passed",        src.includes("subscriptionPlan || \"basic\"")],
];
checks.forEach(([l,ok]) => console.log("  "+(ok?"✅":"❌")+" "+l));
NODEEOF
