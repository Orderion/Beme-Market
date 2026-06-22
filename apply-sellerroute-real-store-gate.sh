#!/usr/bin/env bash
# ============================================================
# ONBOARDING FIX — SellerRoute.jsx: real store-existence gate
#
#   PROBLEM: the seller-only mode of this guard checked
#   role==="seller" OR localStorage[SELLER_APPLIED_KEY]===uid.
#   That localStorage flag is set client-side with no server
#   validation, and is exactly the same bypass that let accounts
#   with NO real store (only a stuck/incomplete storeApplications
#   doc) reach /seller-dashboard directly by typing the URL.
#
#   FIX: gate on the same "genuinely has a store" signal now used
#   in GetAStore.jsx — shop?.id, hasShop, or isSeller — via
#   useSellerAuth(). This requires waiting for useSellerAuth()'s
#   own loading state too, not just useAuth()'s, otherwise a
#   legitimate seller could be redirected away during the brief
#   window before their shop data has loaded.
#
#   Mode 1 (requireOnly="auth", used by onboarding pages) is
#   completely untouched — those still only need a logged-in user.
#
# CRLF-tolerant. Run from project root: bash apply-sellerroute-real-store-gate.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}ONBOARDING FIX — SellerRoute.jsx real store-existence gate${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/components/SellerRoute.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}SellerRoute.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_sellerroutefix.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('genuinelyHasStore')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

// ── 1. Import useSellerAuth ──
const IMPORT_OLD = `import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";`;
const IMPORT_NEW = `import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "../hooks/useSellerAuth";`;
if (!s.includes(IMPORT_OLD)) { console.error('NOT_FOUND: imports block'); process.exit(1); }
s = s.replace(IMPORT_OLD, IMPORT_NEW);

// ── 2. Call the hook and wait on its loading state too ──
const HOOKCALL_OLD = `export default function SellerRoute({ children, requireOnly }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // Wait for auth to resolve
  if (loading) {`;
const HOOKCALL_NEW = `export default function SellerRoute({ children, requireOnly }) {
  const { user, role, loading } = useAuth();
  // ONBOARDING FIX: only needed for the seller-only mode below, but
  // calling it unconditionally keeps hook order stable across renders.
  const { shop, hasShop, isSeller: hasSellerFlag, loading: sellerAuthLoading } = useSellerAuth();
  const location = useLocation();

  // Wait for auth to resolve. For seller-only mode we also wait on
  // useSellerAuth()'s own loading — otherwise a legitimate seller could
  // be redirected away during the brief window before shop/hasShop data
  // has actually loaded from Firestore.
  const stillLoading = loading || (requireOnly !== "auth" && sellerAuthLoading);
  if (stillLoading) {`;
if (!s.includes(HOOKCALL_OLD)) { console.error('NOT_FOUND: function signature + loading check'); process.exit(1); }
s = s.replace(HOOKCALL_OLD, HOOKCALL_NEW);

// ── 3. Replace the seller-only check itself ──
const CHECK_OLD = `  // ── Mode 2: seller-only ───────────────────────────────────────────────────
  // Check 1: Firestore role is "seller" (set by Cloud Function after payment)
  if (role === "seller") {
    return children;
  }

  // Check 2: User just completed onboarding on this device.
  // SubscriptionSuccess sets localStorage[SELLER_APPLIED_KEY] = uid.
  // This allows dashboard access until Cloud Functions are deployed and
  // Firestore role is updated to "seller".
  const appliedUid = localStorage.getItem(SELLER_APPLIED_KEY);
  if (appliedUid && appliedUid === user.uid) {
    return children;
  }

  // Not a seller and hasn't completed onboarding → back to Get a Store
  return <Navigate to="/get-a-store" replace />;`;

const CHECK_NEW = `  // ── Mode 2: seller-only ───────────────────────────────────────────────────
  // ONBOARDING FIX: gate on whether the account GENUINELY has a store
  // (a real shop document, or role already flipped to "seller"), instead
  // of trusting localStorage[SELLER_APPLIED_KEY] — that flag is set
  // client-side with no server validation, and was letting accounts with
  // only a stuck/incomplete application (no real store) reach the
  // dashboard by typing the URL directly. Accounts without a genuine
  // store now always fall back to /get-a-store, which itself correctly
  // shows either the create-a-store page or the "application incomplete"
  // message, depending on whether they have a stuck attempt.
  const genuinelyHasStore = role === "seller" || hasSellerFlag || hasShop || !!shop?.id;
  if (genuinelyHasStore) {
    return children;
  }

  // No real store — fall back to Get a Store (handles both "never
  // started" and "stuck/incomplete application" states correctly).
  return <Navigate to="/get-a-store" replace />;`;

if (!s.includes(CHECK_OLD)) { console.error('NOT_FOUND: seller-only check block — exact text did not match'); process.exit(1); }
s = s.replace(CHECK_OLD, CHECK_NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-sellerroutefix"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} SellerRoute.jsx now gates on real store existence (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "genuinelyHasStore\|sellerAuthLoading" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-sellerroutefix" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
