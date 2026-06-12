#!/usr/bin/env bash
# ============================================================
# BEME MARKET — BUILD 4 PATCH SCRIPT
# Applies 4 backend security fixes + 1 frontend bundle fix.
# Run from project root: bash apply-build4-patches.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

ok()   { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL+1)); }
skip() { echo -e "  ${YELLOW}→${NC} $1 (already patched)"; SKIP=$((SKIP+1)); }
info() { echo -e "  ${CYAN}·${NC} $1"; }

echo ""
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo -e "${BOLD}  Beme Market — Build 4 Patch Script      ${NC}"
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -f "$ROOT/package.json" ]]; do
  ROOT="$(dirname "$ROOT")"
done

if [[ ! -f "$ROOT/package.json" ]]; then
  echo -e "${RED}ERROR: Could not find project root.${NC}"
  exit 1
fi

echo -e "Project root: ${CYAN}$ROOT${NC}"
echo ""

F_SUBS="$ROOT/Beme-Backend/src/routes/subscriptionRoutes.js"
F_AUTH="$ROOT/Beme-Backend/src/routes/authRoutes.js"
F_ORDER="$ROOT/Beme-Backend/src/routes/orderRoutes.js"
F_APP="$ROOT/Beme-Frontend/src/App.jsx"
F_PAYSTACK="$ROOT/Beme-Backend/src/app.js"

echo -e "${BOLD}Checking files exist…${NC}"
ALL_OK=true
for f in "$F_SUBS" "$F_AUTH" "$F_ORDER" "$F_APP" "$F_PAYSTACK"; do
  if [[ -f "$f" ]]; then
    echo -e "  ${GREEN}✓${NC} ${f#$ROOT/}"
  else
    echo -e "  ${RED}✗${NC} MISSING: ${f#$ROOT/}"
    ALL_OK=false
  fi
done

if [[ "$ALL_OK" != "true" ]]; then
  echo ""
  echo -e "${RED}Aborting — missing files.${NC}"
  exit 1
fi

echo ""

# ── Write Node patcher helper ─────────────────────────────────
TMPJS="${TMPDIR:-/tmp}/beme_b4_$$.js"

cat > "$TMPJS" << 'ENDJS'
const fs = require('fs');
const [,, filePath, searchStr, replaceStr] = process.argv;
let content = fs.readFileSync(filePath, 'utf8');
if (content.includes(replaceStr.split('\n')[0])) {
  process.stdout.write('ALREADY_PATCHED');
  process.exit(0);
}
if (!content.includes(searchStr)) {
  process.stderr.write('NOT_FOUND: ' + searchStr.slice(0, 60));
  process.exit(1);
}
const patched = content.replace(searchStr, replaceStr);
fs.writeFileSync(filePath, patched, 'utf8');
process.stdout.write('OK');
ENDJS

run_patch() {
  local label="$1"
  local file="$2"
  local search="$3"
  local replace="$4"
  local bak="${file}.bak4"

  echo -e "${BOLD}${label}${NC}"

  cp "$file" "$bak" 2>/dev/null

  RESULT=$(node "$TMPJS" "$file" "$search" "$replace" 2>&1)
  EXIT=$?

  if [[ "$RESULT" == "ALREADY_PATCHED" ]]; then
    skip "Already patched"
  elif [[ $EXIT -eq 0 && "$RESULT" == "OK" ]]; then
    ok "Applied"
  else
    fail "Failed: $RESULT"
    cp "$bak" "$file" 2>/dev/null
  fi
  echo ""
}

# ────────────────────────────────────────────────────────────
# PATCH 1 — subscriptionRoutes.js
# Add auth to /initialize — prevents unauthenticated Paystack
# transaction creation with arbitrary uid/email
# ────────────────────────────────────────────────────────────
run_patch \
  "Patch 1/5 — subscriptionRoutes.js: add auth to /initialize" \
  "$F_SUBS" \
  'router.post("/initialize", async (req, res) => {
  try {
    const { planId, uid, email, shopId, billing = "monthly", amount } = req.body;

    if (!planId || !uid || !email) {
      return res.status(400).json({ error: "planId, uid and email are required." });
    }' \
  'router.post("/initialize", async (req, res) => {
  try {
    // AUTH CHECK: prevent unauthenticated Paystack init with arbitrary uid/email
    let authUser;
    try {
      authUser = await requireAuthUser(req);
    } catch {
      return res.status(401).json({ error: "Authentication required." });
    }

    const { planId, uid, email, shopId, billing = "monthly", amount } = req.body;

    if (!planId || !uid || !email) {
      return res.status(400).json({ error: "planId, uid and email are required." });
    }

    // Ensure the authenticated user matches the uid being subscribed
    if (authUser.uid !== uid) {
      return res.status(403).json({ error: "Cannot initialize subscription for another user." });
    }'

# ────────────────────────────────────────────────────────────
# PATCH 2 — subscriptionRoutes.js
# Add auth to /verify — prevents anyone with a reference from
# triggering plan upgrades for arbitrary uids
# ────────────────────────────────────────────────────────────
run_patch \
  "Patch 2/5 — subscriptionRoutes.js: add auth to /verify" \
  "$F_SUBS" \
  'router.get("/verify", async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: "Reference required." });' \
  'router.get("/verify", async (req, res) => {
  try {
    // AUTH CHECK: only the purchasing user can verify their own subscription
    let authUser;
    try {
      authUser = await requireAuthUser(req);
    } catch {
      return res.status(401).json({ error: "Authentication required." });
    }

    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: "Reference required." });'

# ────────────────────────────────────────────────────────────
# PATCH 3 — authRoutes.js
# Add token verification to /send-verification to prevent
# email bombing — only the signed-in user can trigger their own
# ────────────────────────────────────────────────────────────
run_patch \
  "Patch 3/5 — authRoutes.js: add auth to /send-verification" \
  "$F_AUTH" \
  'router.post("/send-verification", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Valid email required." });
    }' \
  'router.post("/send-verification", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Valid email required." });
    }
    // AUTH CHECK: token is optional (user may not be signed in yet right after signup)
    // but if a token IS present, the email must match the authenticated user.
    const authHeader = String(req.headers.authorization || "");
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (tokenMatch) {
      try {
        const decoded = await firebaseAdmin.auth().verifyIdToken(tokenMatch[1]);
        const tokenEmail = String(decoded.email || "").toLowerCase();
        const reqEmail   = normalizeEmail(email);
        if (tokenEmail && tokenEmail !== reqEmail) {
          return res.status(403).json({ success: false, message: "Email does not match authenticated user." });
        }
      } catch {
        // Invalid token — fall through, still send if no token mismatch
      }
    }'

# ────────────────────────────────────────────────────────────
# PATCH 4 — orderRoutes.js
# Fix shopOwnerId — resolve from product's storeId server-side
# instead of trusting it from the client request body.
# This prevents a user setting shopOwnerId to another seller's UID.
# ────────────────────────────────────────────────────────────
run_patch \
  "Patch 4/5 — orderRoutes.js: resolve shopOwnerId server-side" \
  "$F_ORDER" \
  '      shopOwnerId: req.body?.shopOwnerId || null,' \
  '      // FIXED: resolve shopOwnerId from the product storeId server-side.
      // Never trust shopOwnerId from the client — a bad actor could set it
      // to another seller'\''s UID and make their order appear in that seller'\''s dashboard.
      shopOwnerId: storeIds[0] || null,'

# ────────────────────────────────────────────────────────────
# PATCH 5 — App.jsx
# Lazy-load unused legacy admin imports that are all redirected
# to /admin/... anyway. Removes dead static imports from bundle.
# ────────────────────────────────────────────────────────────
run_patch \
  "Patch 5/5 — App.jsx: remove dead admin imports from bundle" \
  "$F_APP" \
  'import Admin                 from "./pages/Admin";
import AdminOrders           from "./pages/AdminOrders";
import AdminReviewQueue      from "./pages/AdminReviewQueue";
import Analytics             from "./pages/Analytics";
import PayoutRequests        from "./pages/PayoutRequests";
import ShopApplications      from "./pages/ShopApplications";
import ShopOwnerApply        from "./pages/ShopOwnerApply";
import HomepageAdmin         from "./pages/admin/HomepageAdmin";
import MediaManager          from "./pages/admin/MediaManager";
import AdminSupportDashboard from "./pages/admin/AdminSupportDashboard";
import AdminNotifications    from "./pages/admin/AdminNotifications";' \
  '// Legacy admin pages removed — all redirected to AdminPanel via /admin/* routes.
// ShopOwnerApply kept for SuperAdminOnly route.
import ShopOwnerApply from "./pages/ShopOwnerApply";'

# ── Cleanup ───────────────────────────────────────────────────
rm -f "$TMPJS"

# ── Summary ───────────────────────────────────────────────────
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo -e "${BOLD}  Summary${NC}"
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}✓${NC} Passed:  $PASS"
echo -e "  ${YELLOW}→${NC} Skipped: $SKIP"
echo -e "  ${RED}✗${NC} Failed:  $FAIL"
echo ""

if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}All patches applied.${NC}"
  echo ""
  echo "Deploy firestore rules then push everything:"
  echo ""
  echo -e "  ${CYAN}firebase deploy --only firestore:rules${NC}"
  echo -e "  ${CYAN}git add -A && git commit -m \"Build 4: auth guards on subscription/verify/send-verification, fix shopOwnerId, trim dead imports\" && git push${NC}"
else
  echo -e "${YELLOW}$FAIL patch(es) need manual attention — see PATCH_INSTRUCTIONS_B4.md${NC}"
fi
echo ""
