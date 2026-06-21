#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — Patch 7c/8: DashboardOrders.jsx
#   Adds a small "Customer confirmed received" badge in the
#   seller's order detail header, next to the existing status
#   badge, shown when order.customerConfirmed === true. This
#   complements the BemeDeliveryPanel added in patch 6/8 — that
#   one shows courier status, this shows the customer's own
#   confirmation, which applies to ALL order types.
# CRLF-tolerant. Run from project root: bash apply-dashboardorders-confirmed-badge.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch 7c/8 — DashboardOrders.jsx customer-confirmed badge${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}DashboardOrders.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_confirmedbadge.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('Customer confirmed')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

const ANCHOR = `        <span className={BADGE_CLASS[order.status] || "do-badge do-badge--gray"}>
          {(order.status || "").replace(/_/g, " ")}
        </span>
      </div>`;

const REPLACEMENT = `        <span className={BADGE_CLASS[order.status] || "do-badge do-badge--gray"}>
          {(order.status || "").replace(/_/g, " ")}
        </span>
        {order.customerConfirmed === true && (
          <span className="do-badge do-badge--green" title={\`Confirmed by customer\`} style={{ marginLeft:6 }}>
            Customer confirmed
          </span>
        )}
      </div>`;

if (!s.includes(ANCHOR)) {
  console.error('NOT_FOUND: status badge anchor in do-detail-header — file may have been edited since this patch was written');
  process.exit(1);
}
s = s.replace(ANCHOR, REPLACEMENT);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-confirmedbadge"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} Customer-confirmed badge added (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "Customer confirmed" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-confirmedbadge" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
