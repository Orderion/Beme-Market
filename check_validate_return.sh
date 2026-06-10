#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

echo "=== validateDiscountCode return value ==="
grep -n "return\|codeId\|discountType\|discountValue\|id" \
  Beme-Frontend/src/services/marketingService.js | head -25
