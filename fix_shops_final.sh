#!/bin/bash
# fix_shops_final.sh
# Run from: C:\Users\user\Documents\Beme Project\

ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

FILE="Beme-Backend/src/routes/orderRoutes.js"

echo "=== Lines 675-715 ==="
sed -n '675,715p' "$FILE"

echo ""
echo "=== Applying fix ==="

node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Backend/src/routes/orderRoutes.js';
let src = fs.readFileSync(path, 'utf8');

// The shops array is built at line 681 from item.shop (slug)
// storeIds is built separately but needs to be MERGED into shops
// Find the current state and fix it

// Pattern after previous fix — shops + storeIds both exist but shops is still from item.shop only
// Replace the allShopRefs build to ensure storeId goes first
src = src.replace(
  /const shops = Array\.from\(\s*new Set\(lineItems\.map\(\(item\) => normalizeShopKey\(item\.shop\)\)\.filter\(Boolean\)\)\s*\);\s*\/\/ Also collect storeIds.*?const allShopRefs = Array\.from\(new Set\(\[\.\.\.shops, \.\.\.storeIds\]\)\);/s,
  `// Collect storeIds first — this is what seller dashboard queries by
    const storeIds = Array.from(
      new Set(lineItems.map((item) => (item.storeId || item.shopId || "").trim()).filter(Boolean))
    );
    // Also keep shop slugs for backward compat
    const shopSlugs = Array.from(
      new Set(lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean))
    );
    // storeId goes first so primaryShop matches seller's storeId
    const allShopRefs = Array.from(new Set([...storeIds, ...shopSlugs]));
    const shops = allShopRefs;`
);

// Fix primaryShop to use storeId first
src = src.replace(
  /primaryShop: storeIds\[0\] \|\| shops\[0\] \|\| "main",/,
  'primaryShop: storeIds[0] || shopSlugs[0] || "main",'
);

// Also fix the old shops reference if allShopRefs wasn't applied
src = src.replace(
  /const shops = Array\.from\(\s*new Set\(lineItems\.map\(\(item\) => normalizeShopKey\(item\.shop\)\)\.filter\(Boolean\)\)\s*\);/,
  `// storeIds for seller dashboard lookup
    const storeIds = Array.from(
      new Set(lineItems.map((item) => (item.storeId || item.shopId || "").trim()).filter(Boolean))
    );
    const shopSlugs = Array.from(
      new Set(lineItems.map((item) => normalizeShopKey(item.shop)).filter(Boolean))
    );
    // storeId first so primaryShop matches seller dashboard query
    const shops = Array.from(new Set([...storeIds, ...shopSlugs]));`
);

fs.writeFileSync(path, src, 'utf8');
console.log('✅ shops array fixed — storeId first');
console.log('Lines:', src.split('\n').length);

// Show the fixed section
const lines = src.split('\n');
const idx = lines.findIndex(l => l.includes('storeIds for seller dashboard'));
if (idx > -1) console.log('\nFixed section:\n' + lines.slice(idx-1, idx+12).join('\n'));
NODEEOF

echo ""
echo "=== Verify lines around shops build ==="
grep -n "storeIds\|shopSlugs\|allShopRefs\|primaryShop\|shops =" "$FILE" | head -15

echo ""
echo "Push:"
echo "  git add Beme-Backend/src/routes/orderRoutes.js"
echo "  git commit -m 'fix: shops array puts storeId first so seller dashboard finds orders'"
echo "  git push"
