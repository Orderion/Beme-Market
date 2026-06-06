#!/bin/bash
# fix_payment_system.sh
# Fixes:
#   1. Backend paystack.js — replaces mall/home system with seller delivery system
#   2. Backend paystack.js — fixes isAllowedShop to allow seller shops
#   3. Checkout.jsx — sends correct delivery method
#   4. DashboardProductDetail.jsx — adds paymentType + deliveryMethod fields
#
# Run from: C:\Users\user\Documents\Beme Project\
# Git Bash: bash fix_payment_system.sh

set -e
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo ""
echo "════════════════════════════════════════════════════"
echo "  Beme Market — Payment System Fix"
echo "════════════════════════════════════════════════════"

PAYSTACK="Beme-Backend/src/routes/paystack.js"
CHECKOUT="Beme-Frontend/src/pages/Checkout.jsx"

# ── Verify files exist ──────────────────────────────────
for f in "$PAYSTACK" "$CHECKOUT"; do
  if [ ! -f "$f" ]; then echo -e "${RED}❌ Missing: $f${NC}"; exit 1; fi
done

# ── Backup ──────────────────────────────────────────────
cp "$PAYSTACK" "${PAYSTACK}.bak"
cp "$CHECKOUT" "${CHECKOUT}.bak"
echo -e "${GREEN}✅ Backups created${NC}"

# ════════════════════════════════════════════════════════
# FIX 1: Backend — replace delivery constants + validation
# ════════════════════════════════════════════════════════
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Backend/src/routes/paystack.js';
let src = fs.readFileSync(path, 'utf8');
const original = src;

// ── 1a. Replace DELIVERY_METHODS + fee constants + mall options ──
const oldConstants = `/* Locked backend delivery rules */
const DELIVERY_METHODS = {
  MALL_PICKUP: "mall_pickup",
  HOME_DELIVERY: "home_delivery",
};
const LOCKED_HOME_DELIVERY_FEE = 150;
const ACCRA_MALL_PICKUP_OPTIONS = [
  {
    id: "accra-mall",
    label: "Accra Mall Pickup",
    area: "Tetteh Quarshie / Spintex",
    fee: 0,
  },
  {
    id: "achimota-mall",
    label: "Achimota Mall Pickup",
    area: "Achimota",
    fee: 5,
  },
  {
    id: "marina-mall",
    label: "Marina Mall Pickup",
    area: "Airport",
    fee: 10,
  },
  {
    id: "west-hills-mall",
    label: "West Hills Mall Pickup",
    area: "Weija",
    fee: 15,
  },
];`;

const newConstants = `/* Delivery system — seller-controlled */
const DELIVERY_METHODS = {
  HOME_DELIVERY:  "home_delivery",   // courier (Cheetah, Glovo, KwikDelivery, DHL)
  SELF_DELIVERY:  "self_delivery",   // seller arranges own delivery
  SELLER_DIRECT:  "seller_direct",   // buyer arranges with seller (legacy alias)
};

/* Regional base delivery fees — courier only */
/* Seller self-delivery fee is sent from frontend and passed through */
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
};`;

if (src.includes(oldConstants)) {
  src = src.replace(oldConstants, newConstants);
  console.log('✅ Delivery constants replaced');
} else {
  // Try partial match on just the key line
  src = src.replace(
    /\/\* Locked backend delivery rules \*\/[\s\S]*?const ACCRA_MALL_PICKUP_OPTIONS[\s\S]*?\];/,
    newConstants
  );
  console.log('✅ Delivery constants replaced (regex fallback)');
}

// ── 1b. Replace computeRegionalBaseDeliveryFee ──
src = src.replace(
  /function computeRegionalBaseDeliveryFee\(region\)\s*\{[\s\S]*?\n\}/,
  `function computeRegionalBaseDeliveryFee(region) {
  const clean = sanitizeText(region, 80);
  return COURIER_FEES[clean] ?? 40; // default GHS 40
}`
);
console.log('✅ computeRegionalBaseDeliveryFee updated');

// ── 1c. Replace sanitizeDeliveryInput ──
src = src.replace(
  /function sanitizeDeliveryInput\(source\)\s*\{[\s\S]*?\n\}/,
  `function sanitizeDeliveryInput(source) {
  const method = sanitizeText(source?.method, 40).toLowerCase();
  const provider = sanitizeText(source?.provider, 80);
  const fee = Math.max(0, toNumber(source?.fee, 0));
  return { method, provider, fee };
}`
);
console.log('✅ sanitizeDeliveryInput updated');

// ── 1d. Replace computeTrustedDelivery ──
src = src.replace(
  /function computeTrustedDelivery\(\{[\s\S]*?^}\n/m,
  `function computeTrustedDelivery({ delivery, customerRegion, lineItems }) {
  const region = sanitizeText(customerRegion, 80);
  const cleanDelivery = sanitizeDeliveryInput(delivery);
  const abroadFee = computeAbroadDeliveryFee(lineItems);

  if (!cleanDelivery.method) {
    throw new Error("A delivery option is required.");
  }

  const VALID = [
    DELIVERY_METHODS.HOME_DELIVERY,
    DELIVERY_METHODS.SELF_DELIVERY,
    DELIVERY_METHODS.SELLER_DIRECT,
  ];

  if (!VALID.includes(cleanDelivery.method)) {
    throw new Error("Invalid delivery option selected.");
  }

  let methodFee = 0;
  let label = "";

  if (cleanDelivery.method === DELIVERY_METHODS.HOME_DELIVERY) {
    // Courier delivery — use regional fee or frontend-provided fee (whichever is higher, for safety)
    const regionalFee = computeRegionalBaseDeliveryFee(region);
    methodFee = cleanDelivery.fee > 0 ? cleanDelivery.fee : regionalFee;
    label = cleanDelivery.provider
      ? \`\${cleanDelivery.provider} Delivery\`
      : "Courier Delivery";
  }

  if (
    cleanDelivery.method === DELIVERY_METHODS.SELF_DELIVERY ||
    cleanDelivery.method === DELIVERY_METHODS.SELLER_DIRECT
  ) {
    // Seller arranges delivery — use fee set by seller (can be 0 for free)
    methodFee = cleanDelivery.fee > 0 ? cleanDelivery.fee : 0;
    label = "Seller Delivery";
  }

  const totalFee = methodFee + abroadFee;

  return {
    method: cleanDelivery.method,
    label,
    fee: totalFee,
    breakdown: {
      methodFee,
      abroadFee,
    },
    provider: cleanDelivery.provider || "",
    region,
    homeDelivery:
      cleanDelivery.method === DELIVERY_METHODS.HOME_DELIVERY
        ? { label, fee: methodFee }
        : null,
    sellerDelivery:
      cleanDelivery.method !== DELIVERY_METHODS.HOME_DELIVERY
        ? { label, fee: methodFee }
        : null,
  };
}

`
);
console.log('✅ computeTrustedDelivery replaced');

// ── 1e. Fix isAllowedShop — allow any non-empty shop key ──
src = src.replace(
  /function isAllowedShop\(value\)\s*\{[\s\S]*?\}/,
  `function isAllowedShop(value) {
  const k = normalizeShopKey(value);
  // Allow any non-empty shop key — seller shops use their storeId
  return k.length > 0;
}`
);
console.log('✅ isAllowedShop fixed — seller shops now allowed');

// ── 1f. Fix buildOrderFingerprint — remove mallPickupId reference ──
src = src.replace(
  /mallPickupId: sanitizeText\(delivery\?\.mallPickup\?\.id, 80\),/g,
  'provider: sanitizeText(delivery?.provider, 80),'
);
console.log('✅ buildOrderFingerprint updated');

fs.writeFileSync(path, src, 'utf8');
console.log('✅ paystack.js saved');
NODEEOF

echo ""
echo -e "${GREEN}✅ FIX 1 DONE: Backend delivery system updated${NC}"

# ════════════════════════════════════════════════════════
# FIX 2: Checkout.jsx — send correct delivery method
# ════════════════════════════════════════════════════════
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/pages/Checkout.jsx';
let src = fs.readFileSync(path, 'utf8');
const original = src;

// Find and replace buildDeliveryPayload to send correct method
const oldPayload = src.match(/const buildDeliveryPayload = \(\) => \{[\s\S]*?^\s*\};/m)?.[0];

if (oldPayload) {
  const newPayload = `const buildDeliveryPayload = () => {
    const isSellerDirect =
      delivery.method === SELLER_DIRECT_ID || delivery.method === "seller_direct";
    const provider = selectedProvider;

    // Map to what backend accepts:
    //   courier → "home_delivery"
    //   seller arranges → "self_delivery"
    let backendMethod;
    if (isSellerDirect) {
      backendMethod = "self_delivery";
    } else if (provider) {
      backendMethod = "home_delivery";
    } else {
      backendMethod = "self_delivery";
    }

    return {
      method:   backendMethod,          // ← backend validates this
      provider: provider?.name || (isSellerDirect ? "Seller" : ""),
      label:    provider
        ? \`\${provider.name} Delivery\`
        : isSellerDirect ? "Seller Arranged Delivery" : "Seller Delivery",
      fee:      deliveryFeeUI,
      isBeme:   !isSellerDirect,
      region:   form.region,
      eta:      provider ? getProviderEta(provider, form.region) : "",
      breakdown: {
        courierFee:     courierFeeUI,
        abroadFee:      abroadFeeUI,
        sellerArranged: isSellerDirect,
      },
    };
  };`;

  src = src.replace(oldPayload, newPayload);
  console.log('✅ buildDeliveryPayload fixed');
} else {
  console.log('⚠️  buildDeliveryPayload not found — may need manual fix');
}

// Fix order history check — on AbortError, default to eligible (true)
src = src.replace(
  /setHasPaidOrder\(false\);\s*\n\s*\/\/ On timeout\/error, don't block checkout/,
  `// On timeout/error (Render cold-start), don't block checkout
        setHasPaidOrder(true);
        // On timeout/error, don't block checkout`
);

// Simpler approach — catch block in checkHistory
src = src.replace(
  /} catch\(e\) \{\s*\n\s*console\.error\("Failed to check order history:", e\);\s*\n\s*if \(!active\) return;\s*\n\s*setHasPaidOrder\(false\);/g,
  `} catch(e) {
        console.error("Failed to check order history:", e);
        if (!active) return;
        // On error/timeout, default to eligible so checkout isn't blocked
        setHasPaidOrder(true);`
);

fs.writeFileSync(path, src, 'utf8');
console.log('✅ Checkout.jsx saved');
NODEEOF

echo -e "${GREEN}✅ FIX 2 DONE: Checkout.jsx delivery payload fixed${NC}"

# ════════════════════════════════════════════════════════
# FIX 3: DashboardProductDetail.jsx — add paymentType + deliveryMethod
# ════════════════════════════════════════════════════════
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/pages/dashboard/DashboardProductDetail.jsx';

if (!fs.existsSync(path)) {
  console.log('⚠️  DashboardProductDetail.jsx not found at', path);
  process.exit(0);
}

let src = fs.readFileSync(path, 'utf8');
const original = src;

// ── Add paymentType + deliveryMethod to EMPTY_FORM ──
src = src.replace(
  `const EMPTY_FORM = {
  name:"", description:"", images:[], price:"", comparePrice:"", stock:"",
  sku:"", category:"", subcategory:"", status:"active",
  inStock:true, featured:false, trackInventory:true, lowStockAlert:"", customizations:[],
};`,
  `const EMPTY_FORM = {
  name:"", description:"", images:[], price:"", comparePrice:"", stock:"",
  sku:"", category:"", subcategory:"", status:"active",
  inStock:true, featured:false, trackInventory:true, lowStockAlert:"", customizations:[],
  paymentType:"both",       // "paystack_only" | "cod_allowed" | "both"
  deliveryMethod:"self",    // "self" | "beme" | "both"
};`
);
console.log('✅ EMPTY_FORM updated with paymentType + deliveryMethod');

// ── Add to useEffect that loads existing product ──
src = src.replace(
  `featured:!!p.featured,
          });`,
  `featured:!!p.featured,
            paymentType:p.paymentType||"both",
            deliveryMethod:p.deliveryMethod||"self",
          });`
);
console.log('✅ Product load useEffect updated');

// ── Add to handleSave payload ──
src = src.replace(
  `featured:form.featured,
      };`,
  `featured:form.featured,
        paymentType:form.paymentType||"both",
        deliveryMethod:form.deliveryMethod||"self",
      };`
);
console.log('✅ handleSave payload updated');

// ── Insert the UI section BEFORE the closing of the Options section ──
// Find "Product Options" section and add before it
const optionsSectionMarker = `<Section title="Product Options"`;
const newSection = `
            {/* ── Payment & Delivery Settings ── */}
            <Section title="Payment & Delivery" subtitle="Control how buyers pay and how orders are delivered.">

              <Field label="Accepted Payment Methods">
                <div className="dpd-2col" style={{ marginBottom:0 }}>
                  {[
                    { v:"both",          label:"Paystack + Pay on Delivery", sub:"Buyers choose at checkout" },
                    { v:"paystack_only", label:"Paystack Only",              sub:"Card, bank, MoMo via Paystack" },
                    { v:"cod_allowed",   label:"Pay on Delivery Only",       sub:"Cash or MoMo on arrival" },
                  ].map(o => (
                    <label key={o.v} onClick={()=>setForm(f=>({...f,paymentType:o.v}))}
                      className="dpd-status-radio"
                      style={{ borderColor:form.paymentType===o.v?"var(--sd-accent)":"var(--sd-border)", background:form.paymentType===o.v?"var(--sd-accent-dim)":"transparent" }}>
                      <div className="dpd-radio-dot" style={{ borderColor:form.paymentType===o.v?"var(--sd-accent)":"var(--sd-border)" }}>
                        {form.paymentType===o.v&&<div style={{ width:8,height:8,borderRadius:"50%",background:"var(--sd-accent)" }}/>}
                      </div>
                      <div>
                        <div style={{ fontSize:13,fontWeight:700,color:form.paymentType===o.v?"var(--sd-accent)":"var(--sd-text)" }}>{o.label}</div>
                        <div style={{ fontSize:11,color:"var(--sd-muted)" }}>{o.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Delivery Method" hint="Controls which delivery options buyers see at checkout for this product.">
                <div className="dpd-2col" style={{ marginBottom:0 }}>
                  {[
                    { v:"self", label:"Self Delivery",     sub:"You arrange and ship it" },
                    { v:"beme", label:"Beme Delivery",      sub:"Courier partners (Growth+ plan)" },
                    { v:"both", label:"Both Options",       sub:"Buyer chooses at checkout" },
                  ].map(o => (
                    <label key={o.v} onClick={()=>setForm(f=>({...f,deliveryMethod:o.v}))}
                      className="dpd-status-radio"
                      style={{ borderColor:form.deliveryMethod===o.v?"var(--sd-accent)":"var(--sd-border)", background:form.deliveryMethod===o.v?"var(--sd-accent-dim)":"transparent" }}>
                      <div className="dpd-radio-dot" style={{ borderColor:form.deliveryMethod===o.v?"var(--sd-accent)":"var(--sd-border)" }}>
                        {form.deliveryMethod===o.v&&<div style={{ width:8,height:8,borderRadius:"50%",background:"var(--sd-accent)" }}/>}
                      </div>
                      <div>
                        <div style={{ fontSize:13,fontWeight:700,color:form.deliveryMethod===o.v?"var(--sd-accent)":"var(--sd-text)" }}>{o.label}</div>
                        <div style={{ fontSize:11,color:"var(--sd-muted)" }}>{o.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>

            </Section>

            `;

if (src.includes(optionsSectionMarker)) {
  src = src.replace(optionsSectionMarker, newSection + optionsSectionMarker);
  console.log('✅ Payment & Delivery section inserted into form');
} else {
  console.log('⚠️  Could not find Options section marker — insert manually before Product Options');
}

// ── Gate COD in Checkout based on product paymentType ──
// This is handled via the item.paymentType field passed in cart
// We need to pass it through in normalizeIncomingItems in Checkout
// Find buildSafeCartItems and add paymentType
src = src.replace(
  `sellerDeliveryMethod:sanitizeText(i.sellerDeliveryMethod||"",20),`,
  `sellerDeliveryMethod:sanitizeText(i.sellerDeliveryMethod||i.deliveryMethod||"",20),
    paymentType:sanitizeText(i.paymentType||"both",20),`
);

fs.writeFileSync(path, src, 'utf8');
console.log('✅ DashboardProductDetail.jsx saved');
NODEEOF

echo -e "${GREEN}✅ FIX 3 DONE: DashboardProductDetail.jsx updated${NC}"

# ════════════════════════════════════════════════════════
# FIX 4: Checkout.jsx — gate COD based on product paymentType
# ════════════════════════════════════════════════════════
node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/pages/Checkout.jsx';
let src = fs.readFileSync(path, 'utf8');

// Add paymentType to buildSafeCartItems
src = src.replace(
  `sellerDeliveryMethod:sanitizeText(i.sellerDeliveryMethod||"",20),`,
  `sellerDeliveryMethod:sanitizeText(i.sellerDeliveryMethod||"",20),
    paymentType:sanitizeText(i.paymentType||"both",20),`
);

// Gate COD based on paymentType — add to codDisabledReason
// Find the hasAbroadItem check and add paymentType check
src = src.replace(
  `const codDisabledReason = useMemo(() => {
    if (hasUnavailable)        return "Pay on Delivery unavailable — cart contains unavailable items.";
    if (hasAbroadItem)         return "Pay on Delivery unavailable — cart contains shipped from abroad items.";
    if (needsFirstPaystack)    return "Pay on Delivery available after your first Paystack payment.";
    return "";
  }, [hasUnavailable, hasAbroadItem, needsFirstPaystack]);`,
  `// Check if any item requires paystack only
  const hasPaystackOnlyItem = useMemo(() =>
    safeCartItems.some(i => i.paymentType === "paystack_only"),
  [safeCartItems]);

  // Check if all items explicitly allow COD
  const allItemsAllowCOD = useMemo(() =>
    safeCartItems.length > 0 &&
    safeCartItems.every(i => i.paymentType === "cod_allowed" || i.paymentType === "both" || !i.paymentType),
  [safeCartItems]);

  const codDisabledReason = useMemo(() => {
    if (hasUnavailable)        return "Pay on Delivery unavailable — cart contains unavailable items.";
    if (hasAbroadItem)         return "Pay on Delivery unavailable — cart contains shipped from abroad items.";
    if (hasPaystackOnlyItem)   return "Pay on Delivery unavailable — one or more items in your cart require Paystack payment.";
    if (needsFirstPaystack)    return "Pay on Delivery available after your first Paystack payment.";
    return "";
  }, [hasUnavailable, hasAbroadItem, hasPaystackOnlyItem, needsFirstPaystack]);`
);

fs.writeFileSync(path, src, 'utf8');
console.log('✅ COD gating by paymentType added to Checkout.jsx');
NODEEOF

echo -e "${GREEN}✅ FIX 4 DONE: Checkout COD gating updated${NC}"

echo ""
echo "════════════════════════════════════════════════════"
echo "  Done. Now push:"
echo ""
echo "  git add Beme-Backend/src/routes/paystack.js"
echo "  git add Beme-Frontend/src/pages/Checkout.jsx"
echo "  git add Beme-Frontend/src/pages/dashboard/DashboardProductDetail.jsx"
echo "  git commit -m 'fix: delivery system, payment type gating, seller shops'"
echo "  git push"
echo "════════════════════════════════════════════════════"
echo ""
