#!/bin/bash
# fix_orders_shops.sh
# Fix: orders shops array uses item.shop key not storeId
# Run from: C:\Users\user\Documents\Beme Project\

ROOT="/c/Users/user/Documents\Beme Project"
cd "$ROOT"

echo "=== FIX 1: orderRoutes.js — save storeId on order ==="
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Backend/src/routes/orderRoutes.js';
let src = fs.readFileSync(path, 'utf8');

// Find the shops array build and add storeId fields to payload
// shops array is built from item.shop keys — we need to ALSO save storeId from items
const old = `    const shops = Array.from(
      new Set(lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean))
    );`;

const neu = `    const shops = Array.from(
      new Set(lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean))
    );
    // Also collect storeIds for seller dashboard queries
    const storeIds = Array.from(
      new Set(lineItems.map((item) => (item.storeId || item.shopId || "").trim()).filter(Boolean))
    );
    // Merge shops + storeIds so getSellerOrders finds orders by either
    const allShopRefs = Array.from(new Set([...shops, ...storeIds]));`;

if (src.includes(old)) {
  src = src.replace(old, neu);
  console.log('✅ shops array extended with storeIds');
} else {
  console.log('⚠️  shops pattern not found');
}

// Update payload to use allShopRefs and add storeId field
const oldPayload = `      shops,
      primaryShop: shops[0] || "main",`;
const neuPayload = `      shops: allShopRefs,
      primaryShop: storeIds[0] || shops[0] || "main",
      storeId: storeIds[0] || null,
      sellerId: storeIds[0] || null,`;

if (src.includes(oldPayload)) {
  src = src.replace(oldPayload, neuPayload);
  console.log('✅ payload updated with storeId + sellerId');
} else {
  console.log('⚠️  payload pattern not found — trying alternate');
  // Try without leading spaces
  src = src.replace(
    'shops,\n      primaryShop: shops[0] || "main",',
    'shops: allShopRefs,\n      primaryShop: storeIds[0] || shops[0] || "main",\n      storeId: storeIds[0] || null,\n      sellerId: storeIds[0] || null,'
  );
}

// Also need lineItems to include storeId from incoming items
// Find normalizeIncomingItems and add storeId to returned object
const oldItem = `      shop: normalizeShopKey(item?.shop || "main"),`;
const neuItem = `      shop: normalizeShopKey(item?.shop || "main"),
        storeId: String(item?.storeId || item?.shopId || "").trim(),
        shopId:  String(item?.shopId  || item?.storeId || "").trim(),`;

if (src.includes(oldItem)) {
  src = src.replace(oldItem, neuItem);
  console.log('✅ normalizeIncomingItems: storeId added');
} else {
  console.log('⚠️  item shop pattern not found');
}

fs.writeFileSync(path, src, 'utf8');
console.log('Lines:', src.split('\n').length);
NODEEOF

echo ""
echo "=== FIX 2: Checkout.jsx — ensure storeId is in buildOrderPayload items ==="
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/pages/Checkout.jsx';
let src = fs.readFileSync(path, 'utf8');

// In buildOrderPayload, items currently don't pass storeId
// Find the items map in buildOrderPayload and add storeId
const old = `      image:item.image||"",shop:normalizeShop(item.shop),`;
const neu = `      image:item.image||"",shop:normalizeShop(item.storeId||item.shop),
      storeId:item.storeId||item.shopId||item.sellerId||"",
      shopId:item.shopId||item.storeId||"",`;

if (src.includes(old)) {
  src = src.replace(old, neu);
  console.log('✅ buildOrderPayload items: storeId added');
} else {
  console.log('⚠️  item image/shop pattern not found — trying alternate');
  const alt = 'image:item.image||"",shop:normalizeShop(item.shop)';
  if (src.includes(alt)) {
    src = src.replace(alt, `image:item.image||"",shop:normalizeShop(item.storeId||item.shop),storeId:item.storeId||item.shopId||"",shopId:item.shopId||item.storeId||""`);
    console.log('✅ alternate pattern replaced');
  }
}

fs.writeFileSync(path, src, 'utf8');
console.log('Lines:', src.split('\n').length);
NODEEOF

echo ""
echo "=== FIX 3: storeService.js — also query by primaryShop == storeId ==="
# Already done in previous fix — getSellerOrders runs 3 queries
# Just verify
grep -n "Query 1\|Query 2\|Query 3\|array-contains\|primaryShop\|sellerId" \
  Beme-Frontend/src/services/storeService.js | head -15

echo ""
echo "=== Done. Push: ==="
echo "  git add Beme-Backend/src/routes/orderRoutes.js"
echo "  git add Beme-Frontend/src/pages/Checkout.jsx"
echo "  git commit -m 'fix: save storeId on orders so seller dashboard can find them'"
echo "  git push"
