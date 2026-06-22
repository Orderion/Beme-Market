#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY/UI — Patch: ProductDetails.css
#   Appends the CSS extracted from ProductDetails.jsx's inline
#   <style> block (by apply-pd-buttons-and-style.sh) onto the
#   end of ProductDetails.css. Run apply-pd-buttons-and-style.sh
#   FIRST — this script reads its output file.
# CRLF-tolerant. Run from project root: bash apply-pd-css-merge.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch — ProductDetails.css merge extracted styles${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
CSS_FILE="$ROOT/Beme-Frontend/src/pages/ProductDetails.css"
JSX_FILE="$ROOT/Beme-Frontend/src/pages/ProductDetails.jsx"
EXTRACTED="$JSX_FILE.extracted-style.css"

[[ ! -f "$CSS_FILE" ]] && { echo -e "${RED}ProductDetails.css not found at $CSS_FILE${NC}"; exit 1; }
[[ ! -f "$EXTRACTED" ]] && {
  echo -e "${RED}No extracted styles found at $EXTRACTED${NC}"
  echo "  Run apply-pd-buttons-and-style.sh FIRST — it produces this file."
  exit 1
}
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

if grep -q "pd-flash-img-badge" "$CSS_FILE" 2>/dev/null; then
  echo -e "  ${YELLOW}→${NC} Already merged — no changes made"
  echo ""
  exit 0
fi

cp "$CSS_FILE" "$CSS_FILE.bak-pdmerge"

HELPER="$ROOT/.beme_pdcssmerge.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const cssPath = process.argv[2];
const extractedPath = process.argv[3];

let cssRaw = fs.readFileSync(cssPath, 'utf8');
const usesCRLF = (cssRaw.match(/\r\n/g) || []).length >= (cssRaw.split('\n').length / 2);
let css = cssRaw.replace(/\r\n/g, '\n');

const extracted = fs.readFileSync(extractedPath, 'utf8').replace(/\r\n/g, '\n');

const header = `

/* ─────────────────────────────────────────────
   MOVED FROM INLINE <style> IN ProductDetails.jsx
   (flash deals, seller info panel, dark mode overrides)
───────────────────────────────────────────── */`;

css = css + header + extracted;

if (usesCRLF) css = css.replace(/\n/g, '\r\n');
fs.writeFileSync(cssPath, css, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

OUT=$(node "$HELPER" "$CSS_FILE" "$EXTRACTED" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} Extracted styles merged into ProductDetails.css (${OUT#OK_} line endings)"
  rm -f "$EXTRACTED"
  echo "  Cleaned up temp file: $EXTRACTED"
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$CSS_FILE.bak-pdmerge" "$CSS_FILE"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
fi
echo ""
