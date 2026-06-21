#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — Patch: app.js
#   Registers deliveryRoutes.js (file 1 of the build) so the
#   admin dispatch endpoints actually become reachable.
# CRLF-tolerant. Run from project root: bash apply-app-delivery-routes.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch — app.js register deliveryRoutes${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Backend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Backend/src/app.js"
[[ ! -f "$F" ]] && { echo -e "${RED}app.js not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_appdelivery.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('deliveryRoutes')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

const IMPORT_ANCHOR = 'import orderRoutes        from "./routes/orderRoutes.js";';
const IMPORT_NEW = 'import orderRoutes        from "./routes/orderRoutes.js";\nimport deliveryRoutes     from "./routes/deliveryRoutes.js";';

if (!s.includes(IMPORT_ANCHOR)) {
  console.error('NOT_FOUND: orderRoutes import line');
  process.exit(1);
}
s = s.replace(IMPORT_ANCHOR, IMPORT_NEW);

const USE_ANCHOR = 'app.use("/api/orders",        orderLimiter,    orderRoutes);';
const USE_NEW = 'app.use("/api/orders",        orderLimiter,    orderRoutes);\napp.use("/api/delivery",       generalLimiter,  deliveryRoutes);';

if (!s.includes(USE_ANCHOR)) {
  console.error('NOT_FOUND: orderRoutes app.use line');
  process.exit(1);
}
s = s.replace(USE_ANCHOR, USE_NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-deliveryroutes"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} deliveryRoutes registered in app.js (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "deliveryRoutes" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-deliveryroutes" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
