#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/services/storeService.js';
let src = fs.readFileSync(path, 'utf8');

const oldFn = src.match(/export async function getSellerOrders[\s\S]*?^}/m)?.[0];
if (!oldFn) { console.log('❌ not found'); process.exit(1); }

const newFn = `export async function getSellerOrders(shopId, limitCount = 100) {
  if (!shopId) return [];
  const results = new Map();

  const tryQuery = async (label, q) => {
    try {
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        if (!results.has(d.id)) results.set(d.id, { id: d.id, ...d.data() });
      });
      console.log(\`[getSellerOrders] \${label}: \${snap.size} results\`);
    } catch (e) {
      console.warn(\`[getSellerOrders] \${label} failed:\`, e?.code, e?.message);
    }
  };

  // Primary query — uses shopOwnerId field stored on order (seller's auth uid)
  // This works for collection queries without needing get() in Firestore rules
  await tryQuery(
    'shopOwnerId ==',
    query(collection(db, "orders"), where("shopOwnerId", "==", shopId), limit(limitCount))
  );

  // Fallback — shops array contains the shop doc ID (for orders that have it)
  await tryQuery(
    'shops array-contains',
    query(collection(db, "orders"), where("shops", "array-contains", shopId), limit(limitCount))
  );

  return Array.from(results.values()).sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || 0;
    const tb = b.createdAt?.toMillis?.() || 0;
    return tb - ta;
  }).slice(0, limitCount);
}`;

src = src.replace(oldFn, newFn);
fs.writeFileSync(path, src, 'utf8');
console.log('✅ getSellerOrders updated — shopOwnerId query first');
NODEEOF

echo ""
grep -n "shopOwnerId\|array-contains\|primaryShop" Beme-Frontend/src/services/storeService.js | head -10

echo ""
echo "Push:"
echo "  git add Beme-Frontend/src/services/storeService.js"
echo "  git commit -m 'fix: query orders by shopOwnerId (seller auth uid)'"
echo "  git push"
