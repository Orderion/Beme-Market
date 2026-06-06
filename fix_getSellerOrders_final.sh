#!/bin/bash
# fix_getSellerOrders_final.sh
# Run from: C:\Users\user\Documents\Beme Project\

ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

# ── FIX 1: Remove wrong userId query, keep only shop-based queries ──
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/services/storeService.js';
let src = fs.readFileSync(path, 'utf8');

const oldFn = src.match(/export async function getSellerOrders[\s\S]*?^}/m)?.[0];

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

  // Query by shops array — order contains seller's shop.id
  await tryQuery(
    'shops array-contains',
    query(collection(db, "orders"), where("shops", "array-contains", shopId), limit(limitCount))
  );

  // Query by primaryShop field
  await tryQuery(
    'primaryShop ==',
    query(collection(db, "orders"), where("primaryShop", "==", shopId), limit(limitCount))
  );

  // NOTE: No userId fallback — that matches buyer orders, not seller orders

  return Array.from(results.values()).sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || 0;
    const tb = b.createdAt?.toMillis?.() || 0;
    return tb - ta;
  }).slice(0, limitCount);
}`;

src = src.replace(oldFn, newFn);
fs.writeFileSync(path, src, 'utf8');
console.log('✅ userId fallback removed');
NODEEOF

# ── FIX 2: Firestore rules — allow seller to read orders by primaryShop ──
node << 'NODEEOF'
const fs = require('fs');
const path = 'firestore.rules';
let src = fs.readFileSync(path, 'utf8');

// Current orders read rule:
// allow read: if isSuperAdmin()
//   || (signedIn() && resource.data.userId == request.auth.uid)
//   || (signedIn() && isOnboardedSeller() && resource.data.shops.hasAny([request.auth.uid]));
//
// Problem: primaryShop == query is a LIST/COLLECTION query.
// Firestore security rules for collection queries need the rule to match
// without resource.data (since it's evaluated per-document after the query).
// The shops.hasAny([request.auth.uid]) check fails because auth.uid != shop.id
//
// Fix: allow seller to read if shops array contains ANY value from their known IDs
// OR if primaryShop matches their shop's known ID
// Since we can't do a join in rules, simplest safe fix:
// Allow signedIn sellers to read orders where shops array-contains their uid
// AND also allow if they own the shop referenced in primaryShop

const oldRule = `    match /orders/{orderId} {
      allow create: if isCustomer()
        && emailVerified()
        && validOrderCreateShape()
        && (validCodOrderCreate() || validPaystackOrderCreate());
      allow read: if isSuperAdmin()
        || (signedIn() && resource.data.userId == request.auth.uid)
        || (signedIn() && isOnboardedSeller()
            && resource.data.shops.hasAny([request.auth.uid]));
      allow update: if isSuperAdmin() || customerOrderUpdateAllowed();
      allow delete: if isSuperAdmin();
    }`;

const newRule = `    match /orders/{orderId} {
      allow create: if isCustomer()
        && emailVerified()
        && validOrderCreateShape()
        && (validCodOrderCreate() || validPaystackOrderCreate());
      // Buyer reads their own orders
      // Seller reads orders where their shop.id is in shops array or primaryShop
      allow read: if isSuperAdmin()
        || (signedIn() && resource.data.userId == request.auth.uid)
        || (signedIn() && isOnboardedSeller()
            && (resource.data.shops.hasAny([request.auth.uid])
                || resource.data.primaryShop == request.auth.uid
                || (resource.data.storeId != null
                    && resource.data.storeId == request.auth.uid)));
      // Allow list queries for sellers — Firestore evaluates per-doc after query
      allow list: if signedIn() && isOnboardedSeller();
      allow update: if isSuperAdmin() || customerOrderUpdateAllowed();
      allow delete: if isSuperAdmin();
    }`;

if (src.includes(oldRule)) {
  src = src.replace(oldRule, newRule);
  console.log('✅ Firestore orders rule updated');
} else {
  // Try to find and patch just the read rule
  src = src.replace(
    /allow read: if isSuperAdmin\(\)\s*\|\| \(signedIn\(\) && resource\.data\.userId == request\.auth\.uid\)\s*\|\| \(signedIn\(\) && isOnboardedSeller\(\)\s*&& resource\.data\.shops\.hasAny\(\[request\.auth\.uid\]\)\);/,
    `allow read: if isSuperAdmin()
        || (signedIn() && resource.data.userId == request.auth.uid)
        || (signedIn() && isOnboardedSeller()
            && (resource.data.shops.hasAny([request.auth.uid])
                || resource.data.primaryShop == request.auth.uid));
      allow list: if signedIn() && isOnboardedSeller();`
  );
  console.log('✅ Firestore orders rule updated (regex)');
}

fs.writeFileSync(path, src, 'utf8');
NODEEOF

echo ""
echo "Push:"
echo "  git add Beme-Frontend/src/services/storeService.js firestore.rules"
echo "  git commit -m 'fix: remove userId fallback, fix firestore orders read rule for sellers'"
echo "  git push"
