#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — Patch: DashboardProductDetail.jsx
#   Relabels the per-product Payment & Delivery section to match
#   the new Pay at Door terminology used everywhere else in this
#   build. This is copy/label only — the underlying paymentType
#   and deliveryMethod values ("both"/"paystack_only"/"cod_allowed"
#   and "self"/"beme"/"both") are UNCHANGED, since Pay-at-Door
#   eligibility is computed at checkout time from the courier
#   selection (Checkout.jsx), not from this per-product field.
#   Changing the underlying values here would risk breaking
#   whatever already reads sellerPaymentTypes elsewhere.
# CRLF-tolerant. Run from project root: bash apply-dpd-relabel.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch — DashboardProductDetail.jsx Pay at Door relabel${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/pages/dashboard/DashboardProductDetail.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}DashboardProductDetail.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_dpdrelabel.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('Pay at Door Only')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

// 1. Payment methods radio list
const PAY_OLD = `                    { v:"both",          label:"Paystack + Pay on Delivery", sub:"Buyers choose at checkout" },
                    { v:"paystack_only", label:"Paystack Only",              sub:"Card, bank, MoMo via Paystack" },
                    { v:"cod_allowed",   label:"Pay on Delivery Only",       sub:"Cash or MoMo on arrival" },`;

const PAY_NEW = `                    { v:"both",          label:"Paystack + Pay at Door",    sub:"Buyers choose at checkout" },
                    { v:"paystack_only", label:"Paystack Only",              sub:"Card, bank, MoMo via Paystack" },
                    { v:"cod_allowed",   label:"Pay at Door Only",           sub:"Paystack payment when courier arrives" },`;

if (!s.includes(PAY_OLD)) { console.error('NOT_FOUND: payment methods radio list — exact text did not match'); process.exit(1); }
s = s.replace(PAY_OLD, PAY_NEW);

// 2. Delivery method radio list
const DEL_OLD = `                    { v:"self", label:"Self Delivery",     sub:"You arrange and ship it" },
                    { v:"beme", label:"Beme Delivery",      sub:"Courier partners (Growth+ plan)" },
                    { v:"both", label:"Both Options",       sub:"Buyer chooses at checkout" },`;

const DEL_NEW = `                    { v:"self", label:"Self Delivery",     sub:"You arrange and ship it" },
                    { v:"beme", label:"Beme Delivery",      sub:"Courier partners · Pay at Door available (Growth+ plan)" },
                    { v:"both", label:"Both Options",       sub:"Buyer chooses at checkout" },`;

if (!s.includes(DEL_OLD)) { console.error('NOT_FOUND: delivery method radio list — exact text did not match'); process.exit(1); }
s = s.replace(DEL_OLD, DEL_NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-dpdrelabel"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} Payment & Delivery copy updated to Pay at Door terminology (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "Pay at Door" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-dpdrelabel" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
