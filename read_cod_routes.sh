#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

echo "=== orderValidators.js ==="
cat Beme-Backend/src/modules/dropship/orderValidators.js

echo ""
echo "=== orderRoutes.js (delivery lines) ==="
grep -n "delivery\|method\|Invalid\|valid\|VALID\|home_delivery\|self_delivery\|seller" \
  Beme-Backend/src/routes/orderRoutes.js | head -40

echo ""
echo "=== orderRoutes.js lines around COD handler ==="
grep -n "cod\|COD\|createCod\|placeCod" Beme-Backend/src/routes/orderRoutes.js | head -20
