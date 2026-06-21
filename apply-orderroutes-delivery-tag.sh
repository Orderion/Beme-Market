#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — Patch 3/8: orderRoutes.js
#   Adds isBemeDelivery:false / status:null / paymentTiming:null
#   to sanitizeDelivery()'s return object. COD orders created by
#   this route are always self-delivery (Pay at Door requires
#   Beme courier, which this route never creates) — this just
#   makes that explicit so admin's dispatch queue query
#   (where delivery.isBemeDelivery == true) never has to deal
#   with an undefined field on COD orders.
# CRLF-tolerant. Run from project root: bash apply-orderroutes-delivery-tag.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch 3/8 — orderRoutes.js delivery tagging${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -f "$ROOT/package.json" ]]; do ROOT="$(dirname "$ROOT")"; done
if [[ ! -f "$ROOT/package.json" ]]; then
  ROOT="$PWD"
  while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Backend" ]]; do ROOT="$(dirname "$ROOT")"; done
fi
F="$ROOT/Beme-Backend/src/routes/orderRoutes.js"
[[ ! -f "$F" ]] && { echo -e "${RED}orderRoutes.js not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_orderdelivery.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('isBemeDelivery: false,') && s.includes('// Beme Delivery: COD orders')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

const OLD = `  return {
    method, label,
    fee: methodFee + abroadFee,
    provider: provider || "",
    breakdown: { methodFee, abroadFee },
  };
}`;

const NEW = `  return {
    method, label,
    fee: methodFee + abroadFee,
    provider: provider || "",
    breakdown: { methodFee, abroadFee },
    // Beme Delivery: COD orders created by this route are always
    // self-delivery — Pay at Door (the only safe way to pair Beme
    // courier with non-checkout-time payment) requires its own
    // creation path in paystack.js. Tagging this explicitly false
    // (rather than leaving it undefined) keeps admin's dispatch
    // queue query — where("delivery.isBemeDelivery","==",true) —
    // clean and keeps order.delivery.isBemeDelivery always defined
    // for any UI that reads it.
    isBemeDelivery: false,
    status: null,
    paymentTiming: null,
  };
}`;

if (!s.includes(OLD)) {
  console.error('NOT_FOUND: sanitizeDelivery return block — check for prior edits to this function');
  process.exit(1);
}
s = s.replace(OLD, NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-deliverytag"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} sanitizeDelivery() now tags isBemeDelivery:false/status:null/paymentTiming:null (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "isBemeDelivery: false" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-deliverytag" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
