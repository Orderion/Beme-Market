#!/bin/bash
# fix_checkout_banner_payment.sh
# 1. Remove green RefundGuaranteeBanner from Checkout.jsx
# 2. Add seller payment type gating to Checkout.jsx
# Run from: C:\Users\user\Documents\Beme Project\

ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

FILE="Beme-Frontend/src/pages/Checkout.jsx"
cp "$FILE" "${FILE}.bak5"

node << 'NODEEOF'
const fs = require('fs');
const path = 'Beme-Frontend/src/pages/Checkout.jsx';
let src = fs.readFileSync(path, 'utf8');

// ── 1. Remove RefundGuaranteeBanner component definition ──
src = src.replace(
  /function RefundGuaranteeBanner\(\)[\s\S]*?^\}\n/m,
  ''
);

// ── 2. Remove all usages of RefundGuaranteeBanner in JSX ──
src = src.replace(/<RefundGuaranteeBanner\s*\/>\s*\n?/g, '');
src = src.replace(/<RefundGuaranteeBanner\/>\s*\n?/g, '');

// ── 3. Read sellerDelivery already loads from shops/{storeId}
//       Extend it to also read paymentTypes from same doc ──
// Find the sellerDelivery useEffect and extend it to also set paymentTypes
src = src.replace(
  `      .then(snap => {
        if (snap.exists()) {
          const d = snap.data().delivery || {};
          setSellerDelivery({
            method:       d.method || "self",           // self | beme | both
            selfFee:      d.selfDelivery?.fee ?? null,
            selfFeeType:  d.selfDelivery?.feeType || "flat",
            bemeTier:     d.bemeDelivery?.tier || "standard",
            bemeEnrolled: d.bemeDelivery?.enrolled || false,
          });
        }
      })`,
  `      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          const d = data.delivery || {};
          setSellerDelivery({
            method:       d.method || "self",
            selfFee:      d.selfDelivery?.fee ?? null,
            selfFeeType:  d.selfDelivery?.feeType || "flat",
            bemeTier:     d.bemeDelivery?.tier || "standard",
            bemeEnrolled: d.bemeDelivery?.enrolled || false,
          });
          // Read seller payment preference
          const pt = data.paymentTypes || data.acceptedPayments || [];
          if (Array.isArray(pt) && pt.length > 0) {
            setSellerPaymentTypes(pt);
          } else if (typeof data.paymentType === "string") {
            setSellerPaymentTypes([data.paymentType]);
          }
        }
      })`
);

// ── 4. Add sellerPaymentTypes state after sellerDelivery state ──
src = src.replace(
  `  const [sellerDelivery,         setSellerDelivery]         = useState(null); // loaded from shops/{storeId}/delivery`,
  `  const [sellerDelivery,         setSellerDelivery]         = useState(null); // loaded from shops/{storeId}/delivery
  const [sellerPaymentTypes,     setSellerPaymentTypes]     = useState([]); // [] = no restriction, ["paystack"] = paystack only, ["cod"] = cod only`
);

// ── 5. Add seller payment type gating to codDisabledReason ──
// Also add paystackBlocked derived value
src = src.replace(
  `  const isCODBlocked   = !!codDisabledReason;`,
  `  const isCODBlocked   = !!codDisabledReason;

  // Seller-level payment restrictions
  const sellerBlocksPaystack = sellerPaymentTypes.length > 0 &&
    !sellerPaymentTypes.includes("paystack") &&
    !sellerPaymentTypes.includes("both");

  const sellerBlocksCOD = sellerPaymentTypes.length > 0 &&
    !sellerPaymentTypes.includes("cod") &&
    !sellerPaymentTypes.includes("both");

  const sellerPaymentNote = sellerPaymentTypes.length > 0 && !sellerPaymentTypes.includes("both")
    ? sellerPaymentTypes.includes("paystack")
      ? "This seller only accepts Paystack payments (card, bank transfer)."
      : sellerPaymentTypes.includes("cod")
        ? "This seller only accepts Pay on Delivery."
        : ""
    : "";`
);

// ── 6. Apply sellerBlocksPaystack to Paystack radio ──
src = src.replace(
  `disabled={inputsDisabled||checkingHistory} className="co-pay-radio"/>`,
  `disabled={inputsDisabled||checkingHistory||sellerBlocksPaystack} className="co-pay-radio"/>`
);

// ── 7. Apply sellerBlocksCOD to COD isCODBlocked logic ──
src = src.replace(
  `const isCODEffectivelyBlocked = isCODBlocked;`,
  ``
);

// Update the COD radio disabled to include sellerBlocksCOD
src = src.replace(
  `disabled={inputsDisabled||isCODBlocked} className="co-pay-radio"/>`,
  `disabled={inputsDisabled||isCODBlocked||sellerBlocksCOD} className="co-pay-radio"/>`
);

// ── 8. Show seller payment note below payment methods ──
src = src.replace(
  `                {showError("paymentMethod")&&<div className="co-field-error">{errors.paymentMethod}</div>}`,
  `                {sellerPaymentNote && (
                  <div className="co-seller-payment-note">
                    <InfoIcon/> {sellerPaymentNote}
                  </div>
                )}
                {showError("paymentMethod")&&<div className="co-field-error">{errors.paymentMethod}</div>}`
);

// ── 9. Also clear selected method if seller blocks it ──
src = src.replace(
  `  useEffect(() => { if(isCODBlocked&&method==="cod")setMethod(""); }, [isCODBlocked,method]);`,
  `  useEffect(() => { if(isCODBlocked&&method==="cod")setMethod(""); }, [isCODBlocked,method]);
  useEffect(() => { if(sellerBlocksPaystack&&method==="paystack")setMethod(""); }, [sellerBlocksPaystack,method]);
  useEffect(() => { if(sellerBlocksCOD&&method==="cod")setMethod(""); }, [sellerBlocksCOD,method]);`
);

fs.writeFileSync(path, src, 'utf8');
console.log('✅ Checkout.jsx updated');
console.log('Lines:', src.split('\n').length);

// Verify banner is gone
if (src.includes('RefundGuaranteeBanner')) {
  console.log('⚠️  RefundGuaranteeBanner still present');
} else {
  console.log('✅ RefundGuaranteeBanner fully removed');
}
NODEEOF

echo "Done. Push:"
echo "git add Beme-Frontend/src/pages/Checkout.jsx"
echo "git commit -m 'fix: remove green banner, seller payment type gating'"
echo "git push"
