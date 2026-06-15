#!/usr/bin/env bash
# ============================================================
# BEME MARKET — BUILD 5 PATCH 1 ONLY (CRLF-tolerant)
# Orders pagination. Handles mixed CRLF/LF line endings.
# Run from project root: bash apply-build5-patch1.sh
# ============================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo ""
echo -e "${BOLD}Build 5 — Patch 1: orders pagination (CRLF-tolerant)${NC}"
echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -f "$ROOT/package.json" ]]; do
  ROOT="$(dirname "$ROOT")"
done
if [[ ! -f "$ROOT/package.json" ]]; then
  echo -e "${RED}ERROR: project root not found.${NC}"; exit 1
fi

F_ORDER="$ROOT/Beme-Backend/src/routes/orderRoutes.js"
if [[ ! -f "$F_ORDER" ]]; then
  echo -e "${RED}ERROR: orderRoutes.js not found.${NC}"; exit 1
fi
echo -e "Target: ${CYAN}${F_ORDER#$ROOT/}${NC}"

if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}ERROR: node not found.${NC}"; exit 1
fi

HELPER="$ROOT/.beme_patch1_helper.cjs"

cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const filePath = process.argv[2];
let raw = fs.readFileSync(filePath, 'utf8');

if (raw.includes('const pageLimit = Math.min(')) {
  console.log('ALREADY_PATCHED'); process.exit(0);
}

// Detect the file's dominant line ending so we can write back consistently.
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);

// Normalize to LF for matching only.
const lf = raw.replace(/\r\n/g, '\n');

const ANCHOR =
'    const snap = await adminDb.collection("orders").where("userId", "==", authUser.uid).get();\n' +
'    const orders = snap.docs\n' +
'      .map(sanitizeOrderForResponse)\n' +
'      .sort((a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt));\n' +
'    return res.json({ success: true, orders });';

const REPLACEMENT =
'    // Pagination: ?limit= (default 50, capped 100) and ?offset= for paging.\n' +
'    // Sorted in-memory by createdAt desc so no composite Firestore index is needed.\n' +
'    const pageLimit = Math.min(100, Math.max(1, parseInt(req.query && req.query.limit, 10) || 50));\n' +
'    const offset    = Math.max(0, parseInt(req.query && req.query.offset, 10) || 0);\n' +
'\n' +
'    const snap = await adminDb.collection("orders").where("userId", "==", authUser.uid).get();\n' +
'\n' +
'    const allOrders = snap.docs\n' +
'      .map(sanitizeOrderForResponse)\n' +
'      .sort((a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt));\n' +
'\n' +
'    const total   = allOrders.length;\n' +
'    const orders  = allOrders.slice(offset, offset + pageLimit);\n' +
'    const hasMore = offset + pageLimit < total;\n' +
'\n' +
'    return res.json({\n' +
'      success: true,\n' +
'      orders,\n' +
'      total,\n' +
'      limit: pageLimit,\n' +
'      offset,\n' +
'      hasMore,\n' +
'      nextOffset: hasMore ? offset + pageLimit : null,\n' +
'    });';

if (lf.indexOf(ANCHOR) === -1) {
  console.error('NOT_FOUND even after LF normalization');
  process.exit(1);
}

let out = lf.replace(ANCHOR, REPLACEMENT);

// Restore the file's original dominant line ending.
if (usesCRLF) out = out.replace(/\n/g, '\r\n');

fs.writeFileSync(filePath, out, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F_ORDER" "$F_ORDER.bak5c"
OUT=$(node "$HELPER" "$F_ORDER" 2>&1)
CODE=$?
rm -f "$HELPER"

if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched"
elif [[ $CODE -eq 0 && ( "$OUT" == "OK_CRLF" || "$OUT" == "OK_LF" ) ]]; then
  echo -e "  ${GREEN}✓${NC} Applied (${OUT#OK_} line endings preserved) — orders capped at 50/request"
  echo ""
  echo -e "${GREEN}Done.${NC} Push everything:"
  echo ""
  echo -e "  ${CYAN}git add -A && git commit -m \"Build 5: orders pagination + AuthContext retry\" && git push${NC}"
else
  echo -e "  ${RED}✗${NC} Failed (exit $CODE): $OUT"
  cp "$F_ORDER.bak5c" "$F_ORDER"
  echo -e "  ${YELLOW}File restored from backup.${NC}"
fi
echo ""
