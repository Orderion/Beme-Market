#!/bin/bash
# fix_getSellerOrders.sh
# Simplify getSellerOrders — remove multi-query and just use array-contains
# which is the only one that needs no index
# Run from: C:\Users\user\Documents\Beme Project\

ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/services/storeService.js';
let src = fs.readFileSync(path, 'utf8');

// Replace the complex multi-query with a simple direct approach
// that also catches errors per query and logs them
const oldFn = src.match(/export async function getSellerOrders[\s\S]*?^}/m)?.[0];
if (!oldFn) { console.log('❌ getSellerOrders not found'); process.exit(1); }

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

  // Primary: shops array contains shopId
  await tryQuery(
    'shops array-contains',
    query(collection(db, "orders"), where("shops", "array-contains", shopId), limit(limitCount))
  );

  // Fallback: primaryShop field
  await tryQuery(
    'primaryShop ==',
    query(collection(db, "orders"), where("primaryShop", "==", shopId), limit(limitCount))
  );

  // Fallback: userId matches (for stores where userId == shopId)
  await tryQuery(
    'userId ==',
    query(collection(db, "orders"), where("userId", "==", shopId), limit(limitCount))
  );

  return Array.from(results.values()).sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || 0;
    const tb = b.createdAt?.toMillis?.() || 0;
    return tb - ta;
  }).slice(0, limitCount);
}`;

src = src.replace(oldFn, newFn);
fs.writeFileSync(path, src, 'utf8');
console.log('✅ getSellerOrders simplified with per-query error logging');
console.log('Lines:', src.split('\n').length);
NODEEOF

echo ""
echo "Push:"
echo "  git add Beme-Frontend/src/services/storeService.js"
echo "  git commit -m 'fix: getSellerOrders with debug logging and userId fallback'"
echo "  git push"
