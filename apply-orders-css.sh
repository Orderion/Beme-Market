#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — Patch 7b/8: Orders.css
#   Adds CSS for the new BemeDeliveryTracker, Pay Now block,
#   and Confirm Received section in Orders.jsx. Appends to the
#   end of the file — does not touch any existing rule.
# CRLF-tolerant. Run from project root: bash apply-orders-css.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch 7b/8 — Orders.css Beme Delivery styles${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/pages/Orders.css"
[[ ! -f "$F" ]] && { echo -e "${RED}Orders.css not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_orderscss.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('ord-beme-track')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

const ADDITION = `

/* ══════════════════════════════════════════════
   BEME DELIVERY — courier tracker, Pay at Door,
   and Confirm Received. Follows the existing
   var(--text)/var(--card)/var(--muted)/var(--grtheme)
   pattern and body.dark overrides used throughout
   this file.
══════════════════════════════════════════════ */

.ord-pad-badge {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 700;
  background: rgba(245,158,11,0.1); color: #b45309;
  border: 1px solid rgba(245,158,11,0.25);
  white-space: nowrap;
}
.ord-pad-badge--paid   { background: rgba(34,197,94,0.1); color: #15803d; border-color: rgba(34,197,94,0.25); }
.ord-pad-badge--failed { background: rgba(239,68,68,0.1); color: #b91c1c; border-color: rgba(239,68,68,0.25); }

.ord-beme-track {
  display: flex; align-items: flex-start;
  overflow-x: auto; scrollbar-width: none; padding-bottom: 4px;
}
.ord-beme-track::-webkit-scrollbar { display: none; }

.ord-beme-failed-note {
  margin-top: 10px; padding: 10px 13px; border-radius: 8px;
  background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2);
  font-size: 12px; color: #b91c1c; line-height: 1.55;
}

.ord-beme-meta {
  display: flex; gap: 16px; flex-wrap: wrap;
  margin-top: 10px; font-size: 12px; color: var(--muted);
}
.ord-beme-meta strong { color: var(--text); font-weight: 700; }

.ord-pad-note {
  margin-top: 10px; font-size: 12px; color: var(--muted); line-height: 1.5;
}

.ord-paynow-block {
  margin-top: 14px; padding: 14px; border-radius: 10px;
  background: rgba(124,58,237,0.06); border: 1px solid rgba(124,58,237,0.2);
}
body.dark .ord-paynow-block { background: rgba(124,58,237,0.12); border-color: rgba(124,58,237,0.3); }
.ord-paynow-text {
  margin: 0 0 10px; font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.5;
}
.ord-paynow-text--warn { color: #b45309; }
.ord-paynow-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 100%; height: 44px; border: none; border-radius: 100px;
  background: var(--grtheme, #7c3aed); color: #fff;
  font-family: var(--font-main); font-size: 13px; font-weight: 800;
  cursor: pointer; transition: opacity 0.15s;
}
.ord-paynow-btn:hover:not(:disabled) { opacity: 0.88; }
.ord-paynow-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.ord-paynow-error {
  margin-top: 8px; font-size: 12px; font-weight: 600; color: #dc2626;
}

.ord-confirm-section {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
}
.ord-confirm-text { margin: 0; font-size: 13px; font-weight: 600; color: var(--text); }
.ord-confirm-btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 38px; padding: 0 18px; border: 1.5px solid var(--grtheme, #7c3aed);
  border-radius: 100px; background: transparent; color: var(--grtheme, #7c3aed);
  font-family: var(--font-main); font-size: 12.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.ord-confirm-btn:hover:not(:disabled) { background: var(--grtheme, #7c3aed); color: #fff; }
.ord-confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.ord-confirm-error { width: 100%; font-size: 12px; font-weight: 600; color: #dc2626; }

.ord-confirm-section--done { justify-content: flex-start; }
.ord-confirm-done-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; font-weight: 700; color: #15803d;
}

@media (max-width: 640px) {
  .ord-confirm-section { flex-direction: column; align-items: stretch; }
  .ord-confirm-btn { width: 100%; }
}
`;

s = s + ADDITION;

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-bemecss"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} Beme Delivery styles appended to Orders.css (${OUT#OK_} line endings)"
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-bemecss" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
fi
echo ""
