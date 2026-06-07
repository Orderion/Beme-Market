#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Backend/src/routes/paystack.js';
let src = fs.readFileSync(path, 'utf8');

// Find the shops array build in checkout/init and add storeIds + shopOwnerId
const old = `    const shops = Array.from(
      new Set(lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean))
    );`;

const neu = `    // Collect storeIds from items (seller's shop doc ID)
    const storeIds = Array.from(
      new Set(lineItems.map((item) => (item.storeId || item.shopId || "").trim()).filter(Boolean))
    );
    const shops = Array.from(
      new Set([...storeIds, ...lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean)])
    );`;

if (src.includes(old)) {
  src = src.replace(old, neu);
  console.log('✅ shops array extended with storeIds');
} else {
  console.log('⚠️  shops pattern not found');
}

// Add shopOwnerId to the orderRef.set() payload
// Find: shops, primaryShop: shops[0] || "main",
const oldPayload = `      shops,
      primaryShop: shops[0] || "main",`;
const neuPayload = `      shops,
      primaryShop: storeIds[0] || shops[0] || "main",
      storeId: storeIds[0] || null,
      sellerId: storeIds[0] || null,
      shopOwnerId: req.body?.shopOwnerId || null,`;

if (src.includes(oldPayload)) {
  src = src.replace(oldPayload, neuPayload);
  console.log('✅ shopOwnerId added to Paystack order payload');
} else {
  console.log('⚠️  payload pattern not found — trying alternate');
  if (src.includes("shops,\n      primaryShop: shops[0] || \"main\",")) {
    src = src.replace(
      "shops,\n      primaryShop: shops[0] || \"main\",",
      "shops,\n      primaryShop: storeIds[0] || shops[0] || \"main\",\n      storeId: storeIds[0] || null,\n      sellerId: storeIds[0] || null,\n      shopOwnerId: req.body?.shopOwnerId || null,"
    );
    console.log('✅ shopOwnerId added (alternate pattern)');
  }
}

// Also add storeId to normalizeIncomingItems so lineItems carry it through
const oldItem = `        syncEnabled: item?.syncEnabled !== false,
      };
    })
    .filter((item) => item.id)
    .slice(0, MAX_CART_ITEMS);`;

const neuItem = `        syncEnabled: item?.syncEnabled !== false,
        storeId: String(item?.storeId || item?.shopId || "").trim(),
        shopId:  String(item?.shopId  || item?.storeId || "").trim(),
      };
    })
    .filter((item) => item.id)
    .slice(0, MAX_CART_ITEMS);`;

if (src.includes(oldItem)) {
  src = src.replace(oldItem, neuItem);
  console.log('✅ normalizeIncomingItems: storeId added');
} else {
  console.log('⚠️  normalizeIncomingItems end pattern not found');
}

fs.writeFileSync(path, src, 'utf8');
console.log('Lines:', src.split('\n').length);
NODEEOF

echo ""
echo "=== Verify ==="
grep -n "shopOwnerId\|storeIds\|storeId:" Beme-Backend/src/routes/paystack.js | head -15

echo ""
echo "Push:"
echo "  git add Beme-Backend/src/routes/paystack.js Beme-Frontend/src/services/storeService.js"
echo "  git commit -m 'fix: shopOwnerId on Paystack orders, clean storeService query'"
echo "  git push"
