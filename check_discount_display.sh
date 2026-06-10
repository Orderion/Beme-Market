#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

echo "=== Orders.jsx discount row ==="
grep -n "discount\|discountCode" Beme-Frontend/src/pages/Orders.jsx | head -15

echo ""
echo "=== DashboardOrders.jsx discount row ==="
grep -n "discount\|discountCode" Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx | head -15

echo ""
echo "=== Checkout.jsx increment call ==="
grep -n "incrementDiscount\|codeId\|discountApplied" Beme-Frontend/src/pages/Checkout.jsx | head -20
