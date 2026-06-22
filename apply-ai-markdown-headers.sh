#!/usr/bin/env bash
# ============================================================
# BEME AI FIX — AIAssistant.jsx Markdown header support
#   The Markdown component handled bold/italic/numbered lists/
#   bullet lists, but had NO case for "#"/"##"/"###" headers — a
#   line like "## WHAT IS BEME MARKET?" fell through every check
#   into the plain-text else branch, rendering the literal "##"
#   characters instead of a styled heading. This adds header
#   handling using the same line-consumption pattern already
#   used for lists in this component.
# CRLF-tolerant. Run from project root: bash apply-ai-markdown-headers.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}BEME AI FIX — Markdown header support${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/pages/dashboard/AIAssistant.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}AIAssistant.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_aimarkdown.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('/^#{1,3}\\s/')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

const OLD = `  while (i < lines.length) {
    const line = lines[i];
    if (/^\\d+\\.\\s/.test(line)) {`;

const NEW = `  while (i < lines.length) {
    const line = lines[i];
    if (/^#{1,3}\\s/.test(line)) {
      const level = line.match(/^(#{1,3})\\s/)[1].length;
      const headerText = line.replace(/^#{1,3}\\s/, "");
      const sizeMap = { 1: 18, 2: 16, 3: 14.5 };
      out.push(
        <div key={i} style={{ fontSize: sizeMap[level], fontWeight: 800, margin: "14px 0 6px", lineHeight: 1.4 }}
          dangerouslySetInnerHTML={{ __html: boldify(headerText) }} />
      );
      i++;
      continue;
    }
    if (/^\\d+\\.\\s/.test(line)) {`;

if (!s.includes(OLD)) { console.error('NOT_FOUND: Markdown component line-loop anchor'); process.exit(1); }
s = s.replace(OLD, NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-aimarkdown"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} Markdown headers now render correctly (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "sizeMap" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-aimarkdown" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
