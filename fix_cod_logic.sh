#!/bin/bash
# fix_cod_direct.sh — targeted line-level fix
# Run from: C:\Users\user\Documents\Beme Project\

ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

FILE="Beme-Frontend/src/pages/Checkout.jsx"
cp "$FILE" "${FILE}.bak7"

node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/pages/Checkout.jsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const remove = (needle) => {
  const idx = lines.findIndex(l => l.includes(needle));
  if (idx > -1) { lines.splice(idx, 1); console.log(`✅ Removed line ${idx+1}: ${needle.trim()}`); return true; }
  console.log(`⚠️  Not found: ${needle.trim()}`); return false;
};

const replace = (needle, replacement) => {
  const idx = lines.findIndex(l => l.includes(needle));
  if (idx > -1) { lines[idx] = lines[idx].replace(needle, replacement); console.log(`✅ Replaced line ${idx+1}: ${needle.trim()}`); return true; }
  console.log(`⚠️  Not found: ${needle.trim()}`); return false;
};

// 1. Remove state declarations
remove(`const [checkingHistory,        setCheckingHistory]`);
remove(`const [hasPaidOrder,           setHasPaidOrder]`);

// 2. Remove derived value
remove(`const needsFirstPaystack`);

// 3. Remove the COD disabled reason line
remove(`if (needsFirstPaystack)`);

// 4. Remove checkingHistory from isCheckoutDisabled
replace(`||checkingHistory||hasUnavailable`, `||hasUnavailable`);
replace(`|| checkingHistory || hasUnavailable`, `|| hasUnavailable`);

// 5. Remove checkingHistory from payWithPaystack guard
replace(`if(loading||checkingHistory||hasUnavailable`, `if(loading||hasUnavailable`);
replace(`if(loading || checkingHistory || hasUnavailable`, `if(loading || hasUnavailable`);

// 6. Remove checkingHistory from placeCOD guard
replace(`if(loading||isCODBlocked||checkingHistory||hasUnavailable`, `if(loading||isCODBlocked||hasUnavailable`);

// 7. Remove checkingHistory from Paystack radio disabled
replace(`disabled={inputsDisabled||checkingHistory}`, `disabled={inputsDisabled}`);
replace(`disabled={inputsDisabled || checkingHistory}`, `disabled={inputsDisabled}`);

// 8. Remove "Checking eligibility" hint paragraph
const hintIdx = lines.findIndex(l => l.includes('Checking eligibility'));
if (hintIdx > -1) { lines.splice(hintIdx, 1); console.log('✅ Removed checking eligibility hint'); }

// 9. Remove needsFirstPaystack from codDisabledReason deps array
replace(`, hasPaystackOnlyItem, needsFirstPaystack]`, `, hasPaystackOnlyItem]`);
replace(`, needsFirstPaystack]`, `]`);
replace(`, hasAbroadItem, needsFirstPaystack]`, `, hasAbroadItem]`);

// 10. Fix getMyOrders import — remove it since we no longer use it
replace(
  `import { createCodOrder, getMyOrders } from "../services/api";`,
  `import { createCodOrder } from "../services/api";`
);

// 11. Fix the broken "false&&" line left from previous script
const falseIdx = lines.findIndex(l => l.trim() === '{false&&}');
if (falseIdx > -1) { lines.splice(falseIdx, 1); console.log('✅ Removed stray {false&&}'); }

// Also fix false&& inline patterns
lines = lines.map(l => {
  if (l.includes('{false&&<p') || l.includes('{false &&<p')) return '';
  return l;
});

const result = lines.join('\n');
fs.writeFileSync(path, result, 'utf8');

// Final verify
const remaining = ['checkingHistory','needsFirstPaystack','hasPaidOrder','getMyOrders'];
remaining.forEach(token => {
  const count = (result.match(new RegExp(token,'g'))||[]).length;
  if (count) console.log(`⚠️  ${token} still appears ${count}x`);
  else console.log(`✅ ${token} fully removed`);
});
console.log('Total lines:', result.split('\n').length);
NODEEOF

echo ""
echo "=== Final verify ==="
grep -n "needsFirstPaystack\|checkingHistory\|hasPaidOrder\|getMyOrders" "$FILE" | head -10

echo ""
echo "Push:"
echo "  git add Beme-Frontend/src/pages/Checkout.jsx"
echo "  git commit -m 'fix: COD available to all buyers, remove first-order block'"
echo "  git push"