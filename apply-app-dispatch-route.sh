#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — Patch: App.jsx
#   AdminPanel.jsx's NAV array and switch statement already know
#   about "dispatch", but there was never an actual <Route> for
#   /admin/dispatch in the router — so navigating to it 404s or
#   falls through to the "*" catch-all redirect to "/". This adds:
#   1. /admin/dispatch to FULL_SCREEN_ROUTES (so it doesn't show
#      the public header/footer, matching every other /admin/* path)
#   2. The actual <Route path="/admin/dispatch" .../> entry,
#      wrapped in the same AdminRoute><RequireAdmin> guard as
#      every other admin route.
# CRLF-tolerant. Run from project root: bash apply-app-dispatch-route.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch — App.jsx add /admin/dispatch route${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/App.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}App.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_appdispatch.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('/admin/dispatch')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

// 1. FULL_SCREEN_ROUTES — add right after "/admin/orders"
const FS_OLD = `  "/admin/orders",`;
const FS_NEW = `  "/admin/orders",
  "/admin/dispatch",`;
if (!s.includes(FS_OLD)) { console.error('NOT_FOUND: "/admin/orders" in FULL_SCREEN_ROUTES'); process.exit(1); }
s = s.replace(FS_OLD, FS_NEW);

// 2. <Route> entry — add right after the /admin/orders route
const ROUTE_OLD = `            <Route path="/admin/orders"        element={<AdminRoute><RequireAdmin><AdminPanel /></RequireAdmin></AdminRoute>} />`;
const ROUTE_NEW = `            <Route path="/admin/orders"        element={<AdminRoute><RequireAdmin><AdminPanel /></RequireAdmin></AdminRoute>} />
            <Route path="/admin/dispatch"      element={<AdminRoute><RequireAdmin><AdminPanel /></RequireAdmin></AdminRoute>} />`;
if (!s.includes(ROUTE_OLD)) { console.error('NOT_FOUND: /admin/orders <Route> entry'); process.exit(1); }
s = s.replace(ROUTE_OLD, ROUTE_NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-dispatchroute"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} /admin/dispatch route added (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n '"/admin/dispatch"' "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-dispatchroute" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
