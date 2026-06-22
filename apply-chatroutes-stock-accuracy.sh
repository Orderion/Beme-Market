#!/usr/bin/env bash
# ============================================================
# CHAT FIX — chatRoutes.js auto-reply accuracy
#
#   PROBLEM: the system prompt told the AI to ALWAYS say
#   "Yes, it's available!" for availability questions, regardless
#   of whether productContext (fetched from real Firestore data
#   moments earlier) showed the item was actually out of stock.
#   This made the AI actively misleading — telling a customer an
#   out-of-stock item was available.
#
#   FIX: when productContext resolves real stock data, the prompt
#   now tells the AI the EXACT in-stock status and instructs it to
#   answer truthfully from that, instead of defaulting to a blanket
#   "yes available" line. When no product context could be
#   resolved at all (no productName passed, or no Firestore match),
#   the AI is told to be upfront that it doesn't have exact details
#   and the seller will confirm — instead of guessing.
#
# CRLF-tolerant. Run from project root: bash apply-chatroutes-stock-accuracy.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}CHAT FIX — chatRoutes.js auto-reply stock accuracy${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Backend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Backend/src/routes/chatRoutes.js"
[[ ! -f "$F" ]] && { echo -e "${RED}chatRoutes.js not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_chatstockfix.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('hasProductContext')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

// ── 1. Track whether we resolved real product data, so the prompt can
//      be honest about uncertainty when we didn't. ──
const OLD_CONTEXT = [
  '    // B — Smart context: fetch product details if productName provided',
  '    let productContext = "";',
  '    if (productName) {',
  '      try {',
  '        const pSnap = await db.collection("Products")',
  '          .where("name", "==", productName)',
  '          .where("sellerId", "==", sellerId)',
  '          .limit(1)',
  '          .get();',
  '        if (!pSnap.empty) {',
  '          const p = pSnap.docs[0].data();',
  '          productContext = `\\n\\nProduct the customer is asking about:\\n- Name: ${p.name || productName}\\n- Price: GHS ${p.price || "?"}\\n- Description: ${(p.description || "").slice(0, 200)}\\n- In Stock: ${p.inStock !== false ? "Yes" : "No"}`;',
  '        } else {',
  '          productContext = `\\n\\nCustomer is asking about: ${productName}`;',
  '        }',
  '      } catch {',
  '        productContext = `\\n\\nCustomer is asking about: ${productName}`;',
  '      }',
  '    }',
].join('\n');

const NEW_CONTEXT = [
  '    // B — Smart context: fetch product details if productName provided.',
  '    // hasProductContext is true ONLY when a real Firestore document was',
  '    // resolved — this lets the system prompt below distinguish "I know',
  '    // the real stock status" from "I am guessing", instead of always',
  '    // defaulting to a reassuring \"yes it is available\" answer.',
  '    let productContext = "";',
  '    let hasProductContext = false;',
  '    let productInStock = null;',
  '    if (productName) {',
  '      try {',
  '        const pSnap = await db.collection("Products")',
  '          .where("name", "==", productName)',
  '          .where("sellerId", "==", sellerId)',
  '          .limit(1)',
  '          .get();',
  '        if (!pSnap.empty) {',
  '          const p = pSnap.docs[0].data();',
  '          productInStock = p.inStock !== false;',
  '          const stockNote = p.stock !== undefined && p.stock !== null ? ` (${p.stock} units left)` : "";',
  '          productContext = `\\n\\nProduct the customer is asking about:\\n- Name: ${p.name || productName}\\n- Price: GHS ${p.price || "?"}\\n- Description: ${(p.description || "").slice(0, 200)}\\n- In Stock: ${productInStock ? "Yes" + stockNote : "No, currently out of stock"}`;',
  '          hasProductContext = true;',
  '        } else {',
  '          productContext = `\\n\\nCustomer is asking about: ${productName}. No exact product record was found, so do not state availability or stock as fact.`;',
  '        }',
  '      } catch {',
  '        productContext = `\\n\\nCustomer is asking about: ${productName}. Product lookup failed, so do not state availability or stock as fact.`;',
  '      }',
  '    }',
].join('\n');

if (!s.includes(OLD_CONTEXT)) { console.error('NOT_FOUND: product context fetch block — exact text did not match'); process.exit(1); }
s = s.replace(OLD_CONTEXT, NEW_CONTEXT);

// ── 2. Replace the single hardcoded "always say available" instruction
//      line with conditional guidance that checks the actual stock status
//      written into productContext above, instead of assuming yes. ──
const OLD_LINE = '- For availability questions: say "Yes, it\'s available! You can order it directly from our store."';

const NEW_LINES = [
  '- For availability/stock questions: answer truthfully based on the "In Stock" line in the product context above',
  '  - If it says "In Stock: Yes" — confirm availability and invite them to order',
  '  - If it says "In Stock: No" — say it is currently out of stock, do NOT claim it is available, and suggest they check back or ask about similar items',
  '  - If no product context is given at all — say you do not have exact stock details for that item right now and the seller will confirm shortly',
].join('\n');

if (!s.includes(OLD_LINE)) { console.error('NOT_FOUND: availability instruction line — exact text did not match'); process.exit(1); }
s = s.replace(OLD_LINE, NEW_LINES);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-chatstockfix"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} Auto-reply now answers stock/availability truthfully (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "hasProductContext\|currently out of stock\b" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-chatstockfix" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
