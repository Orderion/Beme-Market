#!/bin/bash
# fix_order_routes.sh — fix delivery validation in COD order route
# Run from: C:\Users\user\Documents\Beme Project\

ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

FILE="Beme-Backend/src/routes/orderRoutes.js"
cp "$FILE" "${FILE}.bak"

node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Backend/src/routes/orderRoutes.js';
let src = fs.readFileSync(path, 'utf8');

// ── 1. Replace DELIVERY_METHODS + fee constants + mall options ──
const oldConstants = `/* Secure backend delivery config */
const DELIVERY_METHODS = {
  MALL_PICKUP: "mall_pickup",
  HOME_DELIVERY: "home_delivery",
};
const OUTSIDE_ACCRA_DELIVERY_FEE = 50;
const HOME_DELIVERY_FLAT_FEE = 150;
const ACCRA_MALL_PICKUP_OPTIONS = {
  "accra-mall": {
    id: "accra-mall",
    label: "Accra Mall Pickup",
    area: "Tetteh Quarshie / Spintex",
    fee: 0,
  },
  "achimota-mall": {
    id: "achimota-mall",
    label: "Achimota Mall Pickup",
    area: "Achimota",
    fee: 5,
  },
  "marina-mall": {
    id: "marina-mall",
    label: "Marina Mall Pickup",
    area: "Airport",
    fee: 10,
  },
  "west-hills-mall": {
    id: "west-hills-mall",
    label: "West Hills Mall Pickup",
    area: "Weija",
    fee: 15,`;

// Find and replace everything from the constants block to closing }
// Use a regex to catch the full block
src = src.replace(
  /\/\* Secure backend delivery config \*\/[\s\S]*?fee: 15,\s*\},?\s*\};/,
  `/* Delivery methods — matches paystack.js */
const DELIVERY_METHODS = {
  HOME_DELIVERY: "home_delivery",   // courier
  SELF_DELIVERY: "self_delivery",   // seller arranges
  SELLER_DIRECT: "seller_direct",   // alias
};

/* Regional courier fees */
const COURIER_FEES = {
  "Greater Accra": 25,
  "Ashanti":       35,
  "Western":       45,
  "Central":       45,
  "Eastern":       45,
  "Northern":      55,
  "Upper East":    55,
  "Upper West":    55,
  "Volta":         50,
  "Brong-Ahafo":   50,
  "Oti":           55,
  "Ahafo":         50,
  "Bono East":     50,
  "North East":    55,
  "Savannah":      55,
  "Western North": 50,
};`
);
console.log('✅ DELIVERY_METHODS constants replaced');

// ── 2. Replace sanitizeDelivery function ──
src = src.replace(
  /function sanitizeDelivery\(delivery = \{\}, customer = \{\}, abroadDeliveryFeeTotal = 0\) \{[\s\S]*?^\}/m,
  `function sanitizeDelivery(delivery = {}, customer = {}, abroadDeliveryFeeTotal = 0) {
  const method = sanitizeText(delivery?.method, 40).toLowerCase();
  const provider = sanitizeText(delivery?.provider, 80);
  const customerRegion = sanitizeText(customer?.region, 80);
  const abroadFee = Math.max(0, toNumber(abroadDeliveryFeeTotal, 0));

  if (!method) {
    throw new Error("Delivery method is required.");
  }

  const VALID = [
    DELIVERY_METHODS.HOME_DELIVERY,
    DELIVERY_METHODS.SELF_DELIVERY,
    DELIVERY_METHODS.SELLER_DIRECT,
  ];

  if (!VALID.includes(method)) {
    throw new Error("Invalid delivery method.");
  }

  let methodFee = 0;
  let label = "";

  if (method === DELIVERY_METHODS.HOME_DELIVERY) {
    // Courier — use regional fee or frontend-provided fee
    const regionalFee = COURIER_FEES[customerRegion] ?? 40;
    const frontendFee = Math.max(0, toNumber(delivery?.fee, 0));
    methodFee = frontendFee > 0 ? frontendFee : regionalFee;
    label = provider ? \`\${provider} Delivery\` : "Courier Delivery";
  } else {
    // Seller arranges (self_delivery / seller_direct)
    const frontendFee = Math.max(0, toNumber(delivery?.fee, 0));
    methodFee = frontendFee;
    label = "Seller Delivery";
  }

  const totalFee = methodFee + abroadFee;

  return {
    method,
    label,
    fee: totalFee,
    provider: provider || "",
    breakdown: {
      methodFee,
      abroadFee,
    },
  };
}`
);
console.log('✅ sanitizeDelivery replaced');

fs.writeFileSync(path, src, 'utf8');

// Verify
if (!src.includes('mall_pickup')) console.log('✅ mall_pickup removed');
else console.log('⚠️  mall_pickup still present');
if (!src.includes('HOME_DELIVERY_FLAT_FEE')) console.log('✅ flat fee removed');
else console.log('⚠️  HOME_DELIVERY_FLAT_FEE still present');
if (src.includes('self_delivery')) console.log('✅ self_delivery added');
if (src.includes('seller_direct')) console.log('✅ seller_direct added');

console.log('Lines:', src.split('\n').length);
NODEEOF

echo ""
echo "=== Verify ==="
grep -n "mall_pickup\|HOME_DELIVERY_FLAT_FEE\|self_delivery\|seller_direct\|Invalid delivery" \
  "$FILE" | head -15

echo ""
echo "Push:"
echo "  git add Beme-Backend/src/routes/orderRoutes.js"
echo "  git commit -m 'fix: COD delivery validation — accept home_delivery and self_delivery'"
echo "  git push"
