#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

# ── 1. Add shopOwnerId to paystack.js ──
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Backend/src/routes/paystack.js';
let src = fs.readFileSync(path, 'utf8');

// Find where the order payload is saved in paystack.js
// Look for storeId or sellerId in the payload and add shopOwnerId after it
const patterns = [
  'sellerId: storeIds[0] || null,\n      shopOwnerId: req.body?.shopOwnerId || null,',
  'storeId: storeIds[0] || null,\n      sellerId: storeIds[0] || null,\n      shopOwnerId: req.body?.shopOwnerId || null,'
];

if (src.includes('shopOwnerId')) {
  console.log('✅ paystack.js already has shopOwnerId');
} else if (src.includes('sellerId: storeIds[0] || null,')) {
  src = src.replace(
    'sellerId: storeIds[0] || null,',
    'sellerId: storeIds[0] || null,\n      shopOwnerId: req.body?.shopOwnerId || null,'
  );
  fs.writeFileSync(path, src, 'utf8');
  console.log('✅ paystack.js: shopOwnerId added');
} else {
  // Try alternate pattern
  const idx = src.indexOf('storeId: storeIds[0]');
  if (idx > -1) {
    src = src.slice(0, idx) +
      src.slice(idx).replace(
        /storeId: storeIds\[0\] \|\| null,/,
        'storeId: storeIds[0] || null,\n      shopOwnerId: req.body?.shopOwnerId || null,'
      );
    fs.writeFileSync(path, src, 'utf8');
    console.log('✅ paystack.js: shopOwnerId added (alternate)');
  } else {
    console.log('⚠️  paystack.js: could not find insertion point');
    // Show context
    const lines = src.split('\n');
    lines.forEach((l, i) => { if (l.includes('storeId') || l.includes('sellerId')) console.log(i+1, l); });
  }
}
NODEEOF

# ── 2. Remove array-contains fallback from storeService (causes noisy error) ──
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/services/storeService.js';
let src = fs.readFileSync(path, 'utf8');

const newFn = `export async function getSellerOrders(shopId, limitCount = 100) {
  if (!shopId) return [];
  const results = new Map();

  try {
    // Query by shopOwnerId — seller's Firebase auth uid stored on order at creation
    const snap = await getDocs(
      query(collection(db, "orders"), where("shopOwnerId", "==", shopId), limit(limitCount))
    );
    snap.docs.forEach((d) => results.set(d.id, { id: d.id, ...d.data() }));
    console.log("[getSellerOrders] shopOwnerId ==:", snap.size, "results");
  } catch (e) {
    console.warn("[getSellerOrders] query failed:", e?.code, e?.message);
  }

  return Array.from(results.values()).sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || 0;
    const tb = b.createdAt?.toMillis?.() || 0;
    return tb - ta;
  }).slice(0, limitCount);
}`;

const oldFn = src.match(/export async function getSellerOrders[\s\S]*?^}/m)?.[0];
if (oldFn) {
  src = src.replace(oldFn, newFn);
  fs.writeFileSync(path, src, 'utf8');
  console.log('✅ storeService: array-contains removed, single clean query');
} else {
  console.log('⚠️  getSellerOrders not found');
}
NODEEOF

echo ""
echo "Verify:"
grep -n "shopOwnerId" Beme-Backend/src/routes/paystack.js | head -5
grep -n "shopOwnerId\|array-contains" Beme-Frontend/src/services/storeService.js | head -5

echo ""
echo "Push:"
echo "  git add Beme-Backend/src/routes/paystack.js Beme-Frontend/src/services/storeService.js"
echo "  git commit -m 'fix: add shopOwnerId to paystack orders, clean up storeService query'"
echo "  git push"
