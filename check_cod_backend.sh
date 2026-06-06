#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

echo "=== COD route file ==="
find Beme-Backend -name "*.js" | xargs grep -l "cod\|createCod\|Invalid delivery" 2>/dev/null | grep -v node_modules

echo ""
echo "=== Lines with delivery validation in orders route ==="
find Beme-Backend -name "orders.js" -o -name "cod.js" | grep -v node_modules | while read f; do
  echo "FILE: $f"
  grep -n "delivery\|method\|Invalid\|VALID\|allowed" "$f" | head -30
done

echo ""
echo "=== All backend route files ==="
find Beme-Backend/src -name "*.js" | grep -v node_modules
