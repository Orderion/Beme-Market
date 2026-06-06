#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"
echo "=== orderRoutes.js lines 1-50 ==="
sed -n '1,50p' Beme-Backend/src/routes/orderRoutes.js
echo ""
echo "=== lines 280-360 (sanitizeDelivery) ==="
sed -n '280,360p' Beme-Backend/src/routes/orderRoutes.js
