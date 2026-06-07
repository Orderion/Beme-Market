#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

echo "=== AbortController / signal / timeout in Checkout.jsx ==="
grep -n "AbortController\|signal\|timeout\|setTimeout\|abort\|clearTimeout" \
  Beme-Frontend/src/pages/Checkout.jsx | head -20

echo ""
echo "=== The actual COD fetch call ==="
grep -n "api/orders\|createCodOrder\|fetch\|axios" \
  Beme-Frontend/src/pages/Checkout.jsx | head -20

echo ""
echo "=== createCodOrder in api.js ==="
find Beme-Frontend/src -name "api.js" -o -name "api.ts" | while read f; do
  echo "FILE: $f"
  grep -n "createCodOrder\|AbortController\|signal\|timeout\|orders" "$f" | head -30
done
