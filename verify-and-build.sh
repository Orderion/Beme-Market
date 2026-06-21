#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — pre-push verification
#   Checks all 8 build pieces are actually in place before you
#   build and push anything. Run from project root.
#   Does NOT push anything by itself — just checks + builds.
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'

echo ""
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}  BEME DELIVERY — pre-push verification${NC}"
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo ""

ROOT="$PWD"
PASS=0
FAIL=0

check() {
  local desc="$1"
  local result="$2"
  if [[ "$result" == "0" ]]; then
    echo -e "  ${GREEN}✓${NC} $desc"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗${NC} $desc"
    FAIL=$((FAIL+1))
  fi
}

echo -e "${BOLD}── Backend ──${NC}"

F="$ROOT/Beme-Backend/src/routes/deliveryRoutes.js"
[[ -f "$F" ]] && grep -q "export default router" "$F" 2>/dev/null
check "deliveryRoutes.js exists with default export" "$?"

F="$ROOT/Beme-Backend/src/routes/paystack.js"
[[ -f "$F" ]] && grep -q "pay-at-door/create" "$F" 2>/dev/null
check "paystack.js has Pay-at-Door routes" "$?"

F="$ROOT/Beme-Backend/src/routes/orderRoutes.js"
[[ -f "$F" ]] && grep -q "isBemeDelivery: false" "$F" 2>/dev/null
check "orderRoutes.js has delivery tagging patch" "$?"

F="$ROOT/Beme-Backend/src/routes/orderRoutes.js"
[[ -f "$F" ]] && grep -q "confirm-received" "$F" 2>/dev/null
check "orderRoutes.js has confirm-received endpoint" "$?"

F="$ROOT/Beme-Backend/src/app.js"
[[ -f "$F" ]] && grep -q "deliveryRoutes" "$F" 2>/dev/null
check "app.js registers deliveryRoutes (YOU MUST DO THIS MANUALLY — see note below)" "$?"

echo ""
echo -e "${BOLD}── Frontend ──${NC}"

F="$ROOT/Beme-Frontend/src/pages/Checkout.jsx"
[[ -f "$F" ]] && grep -q "co-pay-name.*Pay at Door" "$F" 2>/dev/null
check "Checkout.jsx relabeled to Pay at Door (UI text, not comments)" "$?"

F="$ROOT/Beme-Frontend/src/pages/Orders.jsx"
[[ -f "$F" ]] && grep -q "BemeDeliveryTracker" "$F" 2>/dev/null
check "Orders.jsx has BemeDeliveryTracker (confirm you replaced this file!)" "$?"

F="$ROOT/Beme-Frontend/src/pages/Orders.jsx"
[[ -f "$F" ]] && grep -q "confirmOrderReceived" "$F" 2>/dev/null
check "Orders.jsx has Confirm Received logic" "$?"

F="$ROOT/Beme-Frontend/src/pages/Orders.css"
[[ -f "$F" ]] && grep -q "ord-beme-track" "$F" 2>/dev/null
check "Orders.css has Beme Delivery styles" "$?"

F="$ROOT/Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx"
[[ -f "$F" ]] && grep -q "BemeDeliveryPanel" "$F" 2>/dev/null
check "DashboardOrders.jsx has BemeDeliveryPanel" "$?"

F="$ROOT/Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx"
[[ -f "$F" ]] && grep -q "Customer confirmed" "$F" 2>/dev/null
check "DashboardOrders.jsx has customer-confirmed badge" "$?"

F="$ROOT/Beme-Frontend/src/pages/admin/sections/Dispatch.jsx"
[[ -f "$F" ]] && grep -q "DispatchSection" "$F" 2>/dev/null
check "Dispatch.jsx exists in admin/sections" "$?"

echo ""
echo -e "${BOLD}── Firestore Rules (informational only — not blocking) ──${NC}"

F="$ROOT/firestore.rules"
if [[ -f "$F" ]] && grep -q "match /dispatches/" "$F" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} firestore.rules has dispatches collection"
else
  echo -e "  ${YELLOW}○${NC} firestore.rules has dispatches collection (skipped per your instruction)"
fi

F="$ROOT/firestore.rules"
if [[ -f "$F" ]] && grep -q 'get("delivery", null)' "$F" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} firestore.rules has the delivery write-lock security fix"
else
  echo -e "  ${YELLOW}○${NC} firestore.rules has the delivery write-lock security fix (skipped per your instruction)"
fi

echo ""
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo -e "  ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC}"
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${YELLOW}Fix the ✗ items above before continuing. Do not build/push yet.${NC}"
  echo ""
  exit 1
fi

echo -e "${YELLOW}REMINDER — these need manual confirmation, the script can't fully verify them:${NC}"
echo "  1. app.js: confirm this line exists exactly:"
echo '     import deliveryRoutes from "./routes/deliveryRoutes.js";'
echo '     app.use("/api/delivery", generalLimiter, deliveryRoutes);'
echo "  2. Dispatch.jsx: confirm it's wired into your admin panel's nav/routing"
echo "     (this script only checks the file exists, not that it's reachable)"
echo "  3. firestore.rules: deploy SEPARATELY from frontend/backend — see below"
echo ""
read -p "Have you confirmed both of the above manually? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Go confirm those two things, then re-run this script.${NC}"
  exit 1
fi

echo ""
echo -e "${BOLD}── Building frontend locally ──${NC}"
echo ""
cd "$ROOT/Beme-Frontend" || { echo -e "${RED}Beme-Frontend not found${NC}"; exit 1; }
npm run build
BUILD_CODE=$?

if [[ $BUILD_CODE -ne 0 ]]; then
  echo ""
  echo -e "${RED}✗ Build failed. Do not push. Fix the error above first.${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Frontend build succeeded.${NC}"
echo ""
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}  Ready to push. Run these yourself:${NC}"
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo ""
echo "  cd \"$ROOT\""
echo "  git add -A"
echo "  git commit -m \"Beme Delivery: Pay at Door, dispatch system, confirm receipt\""
echo "  git push"
echo ""
echo "  # Firestore rules deploy SEPARATELY (not via git push):"
echo "  firebase deploy --only firestore:rules"
echo ""
echo -e "${YELLOW}This script does NOT run git push or firebase deploy for you —${NC}"
echo -e "${YELLOW}you run those commands yourself after reviewing everything once more.${NC}"
echo ""
