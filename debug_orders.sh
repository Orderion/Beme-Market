#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

echo "=== DashboardOrders — what storeId is passed ==="
grep -n "storeId\|shopId\|getSellerOrders\|useSellerAuth" \
  Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx

echo ""
echo "=== useSellerAuth — what storeId returns ==="
find Beme-Frontend/src -name "useSellerAuth*" | while read f; do
  echo "FILE: $f"
  grep -n "storeId\|shopId\|return\|ownerId\|uid\|shop\." "$f" | head -30
done

echo ""
echo "=== orderRoutes lines 670-720 (how shops array is built) ==="
sed -n '670,720p' Beme-Backend/src/routes/orderRoutes.js
