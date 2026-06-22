#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY/UI — Patch: ProductDetails.jsx
#   1. Removes the inline <style>{`...`}</style> block at the
#      bottom of the file entirely — that CSS gets appended to
#      ProductDetails.css instead (separate script).
#   2. Removes the separate black "Pay now" button.
#   3. Renames "Buy now" -> "Checkout" and adds a monochromatic
#      wallet SVG icon (uses currentColor, matches existing
#      icon component pattern in this file).
# CRLF-tolerant. Run from project root: bash apply-pd-buttons-and-style.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch — ProductDetails.jsx button + style cleanup${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/pages/ProductDetails.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}ProductDetails.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_pdbuttons.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('function WalletIcon')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

// ── 1. Add WalletIcon component, right after CartIcon ──
const ICON_ANCHOR = `function CartIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>; }`;
const ICON_NEW = `function CartIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>; }
function WalletIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>; }`;
if (!s.includes(ICON_ANCHOR)) { console.error('NOT_FOUND: CartIcon definition'); process.exit(1); }
s = s.replace(ICON_ANCHOR, ICON_NEW);

// ── 2. Replace the CTA block: remove the black Pay-now button,
//       rename Buy now -> Checkout, add wallet icon ──
const CTA_OLD = `          <div className="pd-cta">
            <button type="button" className="pd-btn pd-btn--outline" onClick={handleAdd} disabled={isOutOfStock}><CartIcon/>{isOutOfStock?"Unavailable":"Add to cart"}</button>
            <button type="button" className="pd-btn pd-btn--primary" onClick={handleBuyNow} disabled={isOutOfStock}>{isOutOfStock?"Out of stock":"Buy now"}</button>
          </div>
          <button type="button" className="pd-btn pd-btn--pay" style={{marginBottom:6}} onClick={handleBuyNow} disabled={isOutOfStock}>
            {isOutOfStock ? "Unavailable" : \`Pay now · \${formatMoney(finalUnitPrice * qty)}\`}
          </button>`;

const CTA_NEW = `          <div className="pd-cta">
            <button type="button" className="pd-btn pd-btn--outline" onClick={handleAdd} disabled={isOutOfStock}><CartIcon/>{isOutOfStock?"Unavailable":"Add to cart"}</button>
            <button type="button" className="pd-btn pd-btn--primary" onClick={handleBuyNow} disabled={isOutOfStock}><WalletIcon/>{isOutOfStock?"Out of stock":"Checkout"}</button>
          </div>`;

if (!s.includes(CTA_OLD)) { console.error('NOT_FOUND: CTA button block — exact text did not match'); process.exit(1); }
s = s.replace(CTA_OLD, CTA_NEW);

// ── 3. Remove the inline <style>{`...`}</style> block entirely.
//       It starts with "      <style>{`" and ends with the matching
//       "      `}</style>" right before the final closing "    </div>\n  );\n}".
//       We capture everything between (and including) those markers. ──
const STYLE_START = '\n      <style>{`';
const styleStartIdx = s.indexOf(STYLE_START);
if (styleStartIdx === -1) { console.error('NOT_FOUND: inline <style> block start'); process.exit(1); }
const STYLE_END_MARKER = '`}</style>\n    </div>\n  );\n}';
const styleEndIdx = s.indexOf(STYLE_END_MARKER, styleStartIdx);
if (styleEndIdx === -1) { console.error('NOT_FOUND: inline <style> block end'); process.exit(1); }
const extractedCss = s.slice(styleStartIdx + STYLE_START.length, styleEndIdx);
// Write the extracted CSS to a sibling temp file so the CSS-file script can pick it up
fs.writeFileSync(fp + '.extracted-style.css', extractedCss, 'utf8');
// Remove the style block, leaving the closing </div> and component close intact
s = s.slice(0, styleStartIdx) + '\n    </div>\n  );\n}' + s.slice(styleEndIdx + STYLE_END_MARKER.length);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-pdbuttons"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} Buttons updated, inline style extracted (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "WalletIcon\|Checkout\|pd-btn--pay" "$F" | sed 's/^/    /'
  echo ""
  if [[ -f "$F.extracted-style.css" ]]; then
    echo -e "  ${YELLOW}→${NC} Extracted CSS saved to: $F.extracted-style.css"
    echo "    Run apply-pd-css-merge.sh next to append it into ProductDetails.css"
  fi
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-pdbuttons" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
