#!/usr/bin/env bash
# ============================================================
# ONBOARDING FIX — useSellerAuth.js: expose hasApplication
#
#   GetAStore.jsx needs to distinguish "genuinely has a store"
#   from "has a stuck/incomplete storeApplications doc" — but the
#   hook's return object only exposed isSellerActive, which
#   conflates both cases (isSeller || hasApplication || hasShop).
#   This adds hasApplication and onboardingComplete to the return
#   object so callers can tell these two states apart, without
#   changing any existing behavior for current callers.
# CRLF-tolerant. Run from project root: bash apply-usesellerauth-expose-hasapp.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}ONBOARDING FIX — useSellerAuth.js expose hasApplication${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/hooks/useSellerAuth.js"
[[ ! -f "$F" ]] && { echo -e "${RED}useSellerAuth.js not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_usesellerauthfix.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('onboardingComplete: appData?.onboardingComplete')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

const OLD = `  return {
    isSeller: isSeller || hasApplication || hasShop,
    isSellerActive,
    isSellerGrace,
    isSellerPending,
    sellerStatus,
    storeId:  effectiveStoreId,
    shop,
    subscriptionPlan,
    subscriptionStatus,
    planLimits,
    sellerData,
    appData,
    loading,
  };`;

const NEW = `  return {
    isSeller: isSeller || hasApplication || hasShop,
    isSellerActive,
    isSellerGrace,
    isSellerPending,
    sellerStatus,
    storeId:  effectiveStoreId,
    shop,
    subscriptionPlan,
    subscriptionStatus,
    planLimits,
    sellerData,
    appData,
    loading,
    // ONBOARDING FIX: exposed so callers (e.g. GetAStore.jsx) can tell
    // "genuinely has a real shop" apart from "only has an incomplete
    // storeApplications doc" — isSellerActive alone conflates both,
    // since it's isSeller || hasApplication || hasShop.
    hasApplication,
    hasShop,
    onboardingComplete: appData?.onboardingComplete === true,
  };`;

if (!s.includes(OLD)) { console.error('NOT_FOUND: return object — exact text did not match'); process.exit(1); }
s = s.replace(OLD, NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-usesellerauthfix"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} hasApplication/hasShop/onboardingComplete now exposed (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "hasApplication,\|onboardingComplete: appData" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-usesellerauthfix" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
