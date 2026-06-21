#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — BUGFIX: paystack.js pay-at-door/create
#   1. Prefer req.body.shopOwnerId when the frontend sends it
#      (matches the proven pattern in /checkout/init, which has
#      worked correctly for COD/Paystack orders all along).
#   2. Widen the derived fallback to also check item.shop, not
#      just item.storeId/item.shopId — some products only carry
#      the seller id in the "shop" field.
#   Without this fix, Pay-at-Door orders were created with
#   shopOwnerId: null and never appeared on the seller's dashboard.
# CRLF-tolerant. Run from project root: bash apply-paystack-shopowner-fix.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}BUGFIX — paystack.js pay-at-door/create shopOwnerId resolution${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Backend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Backend/src/routes/paystack.js"
[[ ! -f "$F" ]] && { echo -e "${RED}paystack.js not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_paystackshopowner.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('const resolvedShopOwnerId = sanitizeText(req.body?.shopOwnerId')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

// This exact block only appears ONCE in the file — in the pay-at-door/create
// route (the checkout/init route's storeIds derivation is a different,
// unrelated occurrence and must not be touched).
const OLD = `    const orderRef = adminDb.collection("orders").doc();
    const now       = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    const storeIds = Array.from(new Set(lineItems.map((item) => (item.storeId || item.shopId || "").trim()).filter(Boolean)));
    const shops    = Array.from(new Set([...storeIds, ...lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean)]));`;

const NEW = `    const orderRef = adminDb.collection("orders").doc();
    const now       = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    // BUGFIX: widened to also check item.shop — some products only carry
    // the seller id there, not in storeId/shopId. This is the fallback;
    // req.body.shopOwnerId (sent by Checkout.jsx, same pattern as the
    // working checkout/init route) is preferred below when present.
    const storeIds = Array.from(new Set(lineItems.map((item) => (item.storeId || item.shopId || item.shop || "").trim()).filter(Boolean)));
    const shops    = Array.from(new Set([...storeIds, ...lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean)]));
    const resolvedShopOwnerId = sanitizeText(req.body?.shopOwnerId, 200) || storeIds[0] || null;`;

if (!s.includes(OLD)) {
  console.error('NOT_FOUND: orderRef/storeIds block in pay-at-door/create — exact text did not match');
  process.exit(1);
}
s = s.replace(OLD, NEW);

// Now point shopOwnerId at the resolved value instead of the bare storeIds[0]
// inside this SAME route's order.set() payload.
const OLD2 = `      storeId:  storeIds[0] || null,
      sellerId: storeIds[0] || null,
      shopOwnerId: storeIds[0] || null,`;

const NEW2 = `      storeId:  storeIds[0] || null,
      sellerId: resolvedShopOwnerId,
      shopOwnerId: resolvedShopOwnerId,`;

if (!s.includes(OLD2)) {
  console.error('NOT_FOUND: storeId/sellerId/shopOwnerId block in pay-at-door/create — exact text did not match');
  process.exit(1);
}
s = s.replace(OLD2, NEW2);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-paystackshopowner"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} pay-at-door/create now resolves shopOwnerId correctly (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "resolvedShopOwnerId" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-paystackshopowner" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
