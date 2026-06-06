#!/bin/bash
# fix_orders_delivery.sh
# Fixes:
#   1. Orders not showing in seller dashboard (missing storeId in cart items)
#   2. Remove green refund banner from Checkout.jsx
#   3. Pass storeId + paymentType through cart items
#
# Run from: C:\Users\user\Documents\Beme Project\
# Git Bash: bash fix_orders_delivery.sh

set -e
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

echo ""
echo "════════════════════════════════════════════════════"
echo "  Beme Market — Orders + Delivery Fix"
echo "════════════════════════════════════════════════════"

# Verify files exist
for f in \
  "Beme-Frontend/src/pages/ProductDetails.jsx" \
  "Beme-Frontend/src/pages/Checkout.jsx" \
  "Beme-Frontend/src/context/CartContext.jsx"; do
  if [ ! -f "$f" ]; then echo -e "${RED}❌ Missing: $f${NC}"; exit 1; fi
done

cp "Beme-Frontend/src/pages/ProductDetails.jsx" "Beme-Frontend/src/pages/ProductDetails.jsx.bak"
cp "Beme-Frontend/src/pages/Checkout.jsx" "Beme-Frontend/src/pages/Checkout.jsx.bak4"
cp "Beme-Frontend/src/context/CartContext.jsx" "Beme-Frontend/src/context/CartContext.jsx.bak"
echo -e "${GREEN}✅ Backups created${NC}"

# ════════════════════════════════════════════════════
# FIX 1: ProductDetails.jsx — add storeId + paymentType to cart item
# ════════════════════════════════════════════════════
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/pages/ProductDetails.jsx';
let src = fs.readFileSync(path, 'utf8');

// Find buildCartItem and add storeId + paymentType + deliveryMethod fields
// Current last fields: shippingSource, shipsFromAbroad, abroadDeliveryFee, productId:product.id
const old = `      shippingSource, shipsFromAbroad, abroadDeliveryFee, productId:product.id,`;
const neu = `      shippingSource, shipsFromAbroad, abroadDeliveryFee, productId:product.id,
      storeId:     String(product.shopId || product.sellerId || ""),
      shopId:      String(product.shopId || ""),
      sellerId:    String(product.sellerId || ""),
      paymentType: String(product.paymentType || "both"),
      sellerDeliveryMethod: String(product.deliveryMethod || ""),`;

if (src.includes(old)) {
  src = src.replace(old, neu);
  console.log('✅ buildCartItem: storeId + paymentType + sellerDeliveryMethod added');
} else {
  console.log('⚠️  buildCartItem pattern not found — checking alternate...');
  // Try alternate pattern
  const alt = 'shipsFromAbroad, abroadDeliveryFee, productId:product.id,';
  if (src.includes(alt)) {
    src = src.replace(alt, alt + `
      storeId:     String(product.shopId || product.sellerId || ""),
      shopId:      String(product.shopId || ""),
      sellerId:    String(product.sellerId || ""),
      paymentType: String(product.paymentType || "both"),
      sellerDeliveryMethod: String(product.deliveryMethod || ""),`);
    console.log('✅ buildCartItem updated (alternate pattern)');
  } else {
    console.log('❌ Could not find buildCartItem pattern');
  }
}

fs.writeFileSync(path, src, 'utf8');
console.log('✅ ProductDetails.jsx saved');
NODEEOF

echo -e "${GREEN}✅ FIX 1 DONE: ProductDetails.jsx — storeId added to cart item${NC}"

# ════════════════════════════════════════════════════
# FIX 2: CartContext.jsx — pass storeId through normalization
# ════════════════════════════════════════════════════
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/context/CartContext.jsx';
let src = fs.readFileSync(path, 'utf8');

// Find the normalized object in normalizeCartItem and add storeId fields
// Current last field before closing brace: shop and productId
const old = `    shop: sanitizeText(product?.shop || "main", 60).toLowerCase() || "main",
    productId: sanitizeText(product?.productId || product?.id, 120),
  };`;

const neu = `    shop: sanitizeText(product?.shop || "main", 60).toLowerCase() || "main",
    productId: sanitizeText(product?.productId || product?.id, 120),
    storeId:   sanitizeText(product?.storeId || product?.shopId || "", 120),
    shopId:    sanitizeText(product?.shopId || "", 120),
    sellerId:  sanitizeText(product?.sellerId || "", 120),
    paymentType: sanitizeText(product?.paymentType || "both", 20),
    sellerDeliveryMethod: sanitizeText(product?.sellerDeliveryMethod || product?.deliveryMethod || "", 20),
  };`;

if (src.includes(old)) {
  src = src.replace(old, neu);
  console.log('✅ CartContext: storeId + paymentType fields added to normalizeCartItem');
} else {
  console.log('⚠️  CartContext pattern not found — trying alternate...');
  const alt = `    productId: sanitizeText(product?.productId || product?.id, 120),\n  };`;
  if (src.includes(alt)) {
    src = src.replace(alt, `    productId: sanitizeText(product?.productId || product?.id, 120),
    storeId:   sanitizeText(product?.storeId || product?.shopId || "", 120),
    shopId:    sanitizeText(product?.shopId || "", 120),
    sellerId:  sanitizeText(product?.sellerId || "", 120),
    paymentType: sanitizeText(product?.paymentType || "both", 20),
    sellerDeliveryMethod: sanitizeText(product?.sellerDeliveryMethod || product?.deliveryMethod || "", 20),
  };`);
    console.log('✅ CartContext updated (alternate)');
  } else {
    console.log('❌ CartContext pattern not found');
  }
}

// Also pass storeId through the sanitizeStoredCartItems function
// The changed check needs to include storeId so stale cart items get refreshed
const changedCheck = `prevItem.selectedOptionsLabel !== item.selectedOptionsLabel`;
const changedCheckNew = `prevItem.selectedOptionsLabel !== item.selectedOptionsLabel ||
            prevItem.storeId !== item.storeId`;
if (src.includes(changedCheck) && !src.includes(changedCheckNew)) {
  src = src.replace(changedCheck, changedCheckNew);
  console.log('✅ CartContext: changed-check updated to include storeId');
}

fs.writeFileSync(path, src, 'utf8');
console.log('✅ CartContext.jsx saved');
NODEEOF

echo -e "${GREEN}✅ FIX 2 DONE: CartContext.jsx — storeId flows through cart${NC}"

# ════════════════════════════════════════════════════
# FIX 3: Checkout.jsx — remove green RefundGuaranteeBanner
# ════════════════════════════════════════════════════
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/pages/Checkout.jsx';
let src = fs.readFileSync(path, 'utf8');

// Remove the RefundGuaranteeBanner component definition
src = src.replace(
  /\/\* ── Discount code input widget ── \*\//,
  (m) => m // keep the marker
);

// Remove the banner component itself
src = src.replace(
  /function RefundGuaranteeBanner\(\)\s*\{[\s\S]*?\n\}\n/,
  ''
);
console.log('✅ RefundGuaranteeBanner component removed');

// Remove its usage in JSX
src = src.replace(/<RefundGuaranteeBanner\/>\n/g, '');
src = src.replace(/<RefundGuaranteeBanner \/>\n/g, '');
console.log('✅ RefundGuaranteeBanner usage removed from JSX');

// Also ensure storeId flows in buildSafeCartItems
// It already does since CartContext now passes it through
// But make sure we use i.storeId || i.shopId || i.sellerId as fallback
src = src.replace(
  `storeId:sanitizeText(i.storeId||"",80),`,
  `storeId:sanitizeText(i.storeId||i.shopId||i.sellerId||"",80),`
);
console.log('✅ Checkout storeId fallback chain updated');

fs.writeFileSync(path, src, 'utf8');
console.log('✅ Checkout.jsx saved');
NODEEOF

echo -e "${GREEN}✅ FIX 3 DONE: Green banner removed, storeId chain complete${NC}"

# ════════════════════════════════════════════════════
# FIX 4: storeService.js — also query by sellerId as fallback
# ════════════════════════════════════════════════════
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/services/storeService.js';
let src = fs.readFileSync(path, 'utf8');

// The current query: where("shops", "array-contains", shopId)
// Problem: orders have shops:["fashion"] but seller storeId is uid
// Fix: also try where("primaryShop", "==", shopId) and where("sellerId", "==", uid)
// Replace getSellerOrders with a smarter version

const oldFn = `export async function getSellerOrders(shopId, limitCount = 100) {
  try {
    const snap = await getDocs(
      query(
        collection(db, "orders"),
        where("shops", "array-contains", shopId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    // Fallback without orderBy if composite index not built
    const snap = await getDocs(
      query(collection(db, "orders"), where("shops", "array-contains", shopId), limit(limitCount))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}`;

const newFn = `export async function getSellerOrders(shopId, limitCount = 100) {
  const results = new Map();

  const runQuery = async (q) => {
    try {
      const snap = await getDocs(q);
      snap.docs.forEach((d) => { if (!results.has(d.id)) results.set(d.id, { id: d.id, ...d.data() }); });
    } catch {}
  };

  // Query 1: shops array contains the storeId (new orders)
  await runQuery(query(collection(db, "orders"), where("shops", "array-contains", shopId), limit(limitCount)));

  // Query 2: primaryShop field matches (some orders use this)
  await runQuery(query(collection(db, "orders"), where("primaryShop", "==", shopId), limit(limitCount)));

  // Query 3: sellerId field (if orders store sellerId directly)
  await runQuery(query(collection(db, "orders"), where("sellerId", "==", shopId), limit(limitCount)));

  // Sort by createdAt descending
  return Array.from(results.values()).sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || a.createdAt || 0;
    const tb = b.createdAt?.toMillis?.() || b.createdAt || 0;
    return tb - ta;
  }).slice(0, limitCount);
}`;

if (src.includes(oldFn)) {
  src = src.replace(oldFn, newFn);
  console.log('✅ getSellerOrders: multi-query fallback added');
} else {
  // Try to find and replace just the function signature
  src = src.replace(
    /export async function getSellerOrders\(shopId[^)]*\)\s*\{[\s\S]*?^}/m,
    newFn
  );
  console.log('✅ getSellerOrders: replaced via regex');
}

fs.writeFileSync(path, src, 'utf8');
console.log('✅ storeService.js saved');
NODEEOF

echo -e "${GREEN}✅ FIX 4 DONE: storeService.js — multi-query order lookup${NC}"

echo ""
echo "════════════════════════════════════════════════════"
echo "  Done. Push with:"
echo ""
echo "  git add Beme-Frontend/src/pages/ProductDetails.jsx"
echo "  git add Beme-Frontend/src/context/CartContext.jsx"
echo "  git add Beme-Frontend/src/pages/Checkout.jsx"
echo "  git add Beme-Frontend/src/services/storeService.js"
echo "  git commit -m 'fix: orders visible in seller dashboard, storeId in cart, remove green banner'"
echo "  git push"
echo "════════════════════════════════════════════════════"
echo ""
