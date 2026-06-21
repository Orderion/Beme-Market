#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — Patch: AdminPanel.jsx
#   Wires the existing Dispatch.jsx (file 5 of the build) into
#   the admin nav. Without this, the file exists but is
#   completely unreachable — no way to navigate to it.
#   Adds: 1 import, 1 icon path, 1 NAV entry, 1 switch case.
# CRLF-tolerant. Run from project root: bash apply-adminpanel-dispatch-nav.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch — AdminPanel.jsx wire in Dispatch section${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/pages/admin/AdminPanel.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}AdminPanel.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_adminpaneldispatch.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('DispatchSection')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

// 1. Import — right after OrdersSection import
const IMPORT_OLD = `import OrdersSection       from "./sections/Orders";`;
const IMPORT_NEW = `import OrdersSection       from "./sections/Orders";
import DispatchSection     from "./sections/Dispatch";`;
if (!s.includes(IMPORT_OLD)) { console.error('NOT_FOUND: OrdersSection import'); process.exit(1); }
s = s.replace(IMPORT_OLD, IMPORT_NEW);

// 2. Icon — add a truck icon for dispatch, right after the orders icon definition
const ICON_OLD = `  orders:    "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z | M3 6h18 | M16 10a4 4 0 0 1-8 0",`;
const ICON_NEW = `  orders:    "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z | M3 6h18 | M16 10a4 4 0 0 1-8 0",
  dispatch:  "M1 3h15v13H1z | M16 8h4l3 3v5h-7V8z | M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z | M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",`;
if (!s.includes(ICON_OLD)) { console.error('NOT_FOUND: orders icon definition'); process.exit(1); }
s = s.replace(ICON_OLD, ICON_NEW);

// 3. NAV entry — right after the orders nav item, before products
const NAV_OLD = `  { key:"orders",     label:"Orders",        path:"/admin/orders",        icon:I.orders    },`;
const NAV_NEW = `  { key:"orders",     label:"Orders",        path:"/admin/orders",        icon:I.orders    },
  { key:"dispatch",   label:"Dispatch",      path:"/admin/dispatch",      icon:I.dispatch  },`;
if (!s.includes(NAV_OLD)) { console.error('NOT_FOUND: orders NAV entry'); process.exit(1); }
s = s.replace(NAV_OLD, NAV_NEW);

// 4. switch case — right after the orders case
const CASE_OLD = `      case "orders":     return <OrdersSection/>;`;
const CASE_NEW = `      case "orders":     return <OrdersSection/>;
      case "dispatch":   return <DispatchSection/>;`;
if (!s.includes(CASE_OLD)) { console.error('NOT_FOUND: orders switch case'); process.exit(1); }
s = s.replace(CASE_OLD, CASE_NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-dispatchnav"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} Dispatch wired into admin nav (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "DispatchSection\|key:\"dispatch\"" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-dispatchnav" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
