#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — BUGFIX: Checkout.jsx
#   placePayAtDoor() computes payload.shopOwnerId correctly via
#   buildOrderPayload(), but the fetch body to
#   /api/paystack/pay-at-door/create never included it — so every
#   Pay-at-Door order was created with shopOwnerId: null, making it
#   invisible to the seller's dashboard (which queries
#   where("shopOwnerId","==",sellerUid)). This adds the missing field.
# CRLF-tolerant. Run from project root: bash apply-checkout-shopowner-fix.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}BUGFIX — Checkout.jsx missing shopOwnerId in Pay-at-Door request${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/pages/Checkout.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}Checkout.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_checkoutshopowner.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

const OLD = `        body: JSON.stringify({
          email: payload.customer.email,
          items: payload.items,
          customer: payload.customer,
          delivery: { method: payload.delivery.method, provider: payload.delivery.provider, fee: payload.delivery.fee },
          pricing: payload.pricing,
        }),`;

const NEW = `        body: JSON.stringify({
          email: payload.customer.email,
          items: payload.items,
          customer: payload.customer,
          delivery: { method: payload.delivery.method, provider: payload.delivery.provider, fee: payload.delivery.fee },
          pricing: payload.pricing,
          // BUGFIX: this was missing — without it the backend had no way
          // to know which seller this order belongs to, so it never showed
          // up on the seller's dashboard (shopOwnerId stayed null).
          shopOwnerId: payload.shopOwnerId,
        }),`;

if (s.includes('shopOwnerId: payload.shopOwnerId')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

if (!s.includes(OLD)) {
  console.error('NOT_FOUND: pay-at-door fetch body block — exact text did not match');
  process.exit(1);
}
s = s.replace(OLD, NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-shopownerfix"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} shopOwnerId now included in Pay-at-Door request (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "shopOwnerId: payload.shopOwnerId" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-shopownerfix" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
