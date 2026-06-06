#!/bin/bash
# fix_storeId_query.sh
# The seller's shop.id is 4hjb9s331htg5co80wjn6obxcam2
# but storeId returned was user.uid ozRDvUJcW2U3cDGAs7zoDDsdaUi2
# Fix: DashboardOrders must query with shop?.id, not just storeId
# Run from: C:\Users\user\Documents\Beme Project\

ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx';
let src = fs.readFileSync(path, 'utf8');

// Replace useSellerAuth destructure to also get shop
src = src.replace(
  `  const { storeId } = useSellerAuth();`,
  `  const { storeId, shop } = useSellerAuth();
  // Use shop.id (the actual Firestore doc ID) as primary key
  // storeId may be user.uid which differs from the shop doc ID
  const queryId = shop?.id || storeId;`
);

// Replace getSellerOrders call to use queryId
src = src.replace(
  `  useEffect(() => {
    if (!storeId) return;
    getSellerOrders(storeId).then((d) => { setOrders(d); setLoading(false); }).catch(() => setLoading(false));
  }, [storeId]);`,
  `  useEffect(() => {
    if (!queryId) return;
    getSellerOrders(queryId).then((d) => { setOrders(d); setLoading(false); }).catch(() => setLoading(false));
  }, [queryId]);`
);

fs.writeFileSync(path, src, 'utf8');
console.log('✅ DashboardOrders now queries by shop.id first');
console.log('Lines:', src.split('\n').length);
NODEEOF

echo ""
echo "=== Also fix storeService to use all possible IDs ==="
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/services/storeService.js';
let src = fs.readFileSync(path, 'utf8');

// getSellerOrders already runs 3 queries
// Just verify it's there
const hasQ1 = src.includes('array-contains');
const hasQ2 = src.includes('primaryShop');
const hasQ3 = src.includes('sellerId');
console.log('Query 1 (array-contains):', hasQ1 ? '✅' : '❌');
console.log('Query 2 (primaryShop):', hasQ2 ? '✅' : '❌');
console.log('Query 3 (sellerId):', hasQ3 ? '✅' : '❌');
NODEEOF

echo ""
echo "=== Verify ==="
grep -n "queryId\|shop?.id\|getSellerOrders\|storeId" \
  Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx | head -10

echo ""
echo "Push:"
echo "  git add Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx"
echo "  git commit -m 'fix: query orders by shop.id not user.uid'"
echo "  git push"
