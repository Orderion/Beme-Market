#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — Patch 7a/8: orderRoutes.js
#   Adds POST /api/orders/:orderId/confirm-received — lets the
#   CUSTOMER confirm they received their order, for ANY order
#   type (Beme courier, self-delivery, seller-arranged). This
#   is separate from delivery.status — it sets
#   customerConfirmed/customerConfirmedAt and immediately
#   unlocks payout (delivery.payoutLocked = false if present),
#   rather than waiting on the 48h auto-confirm window.
# CRLF-tolerant. Run from project root: bash apply-orderroutes-confirm-received.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch 7a/8 — orderRoutes.js confirm-received endpoint${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Backend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Backend/src/routes/orderRoutes.js"
[[ ! -f "$F" ]] && { echo -e "${RED}orderRoutes.js not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_confirmreceived.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('confirm-received')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

const ANCHOR = 'export default router;';

const lines = [
  '/* ══════════════════════════════════════',
  '   BEME DELIVERY — CUSTOMER CONFIRMS RECEIVED',
  '   Applies to ANY order type (Beme courier, self-delivery,',
  '   seller-arranged) — not just Beme-courier orders. This is a',
  '   separate signal from delivery.status: the customer vouching',
  '   they got the order is stronger than the silent 48h auto-confirm',
  '   window, so confirming immediately unlocks payout rather than',
  '   waiting on the timer. The 48h window still exists as a fallback',
  '   for customers who never tap the button.',
  '══════════════════════════════════════ */',
  'router.post("/:orderId/confirm-received", async (req, res) => {',
  '  try {',
  '    const authUser = await requireAuthUser(req);',
  '    const orderId = sanitizeText(req.params?.orderId, 200);',
  '    if (!orderId) return res.status(400).json({ success: false, error: "Missing orderId." });',
  '',
  '    const orderRef = adminDb.collection("orders").doc(orderId);',
  '    const orderSnap = await orderRef.get();',
  '    if (!orderSnap.exists) return res.status(404).json({ success: false, error: "Order not found." });',
  '',
  '    const order = orderSnap.data() || {};',
  '',
  '    if (order.userId !== authUser.uid) {',
  '      return res.status(403).json({ success: false, error: "This order does not belong to your account." });',
  '    }',
  '    if (order.customerConfirmed === true) {',
  '      return res.status(400).json({ success: false, error: "You have already confirmed this order." });',
  '    }',
  '',
  '    // Only allow confirming orders that have actually been fulfilled —',
  '    // covers both the Beme-courier path (delivery.status === "delivered")',
  '    // and self/seller-arranged orders (no delivery.status field at all,',
  '    // so we fall back to the order own paid/processing/shipped/delivered',
  '    // status, matching how Orders.jsx already classifies these).',
  '    const deliveryStatus = order?.delivery?.status || null;',
  '    const orderStatus = String(order.status || "").toLowerCase();',
  '    const fulfilledStatuses = ["delivered", "shipped", "processing", "paid"];',
  '    const isFulfillable = deliveryStatus === "delivered" || (!deliveryStatus && fulfilledStatuses.includes(orderStatus));',
  '',
  '    if (!isFulfillable) {',
  '      return res.status(400).json({ success: false, error: "This order has not been marked as delivered yet." });',
  '    }',
  '',
  '    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();',
  '    const updatePayload = {',
  '      customerConfirmed: true,',
  '      customerConfirmedAt: now,',
  '      updatedAt: now,',
  '    };',
  '    // Immediately unlock payout — customer confirmation is a stronger',
  '    // signal than the passive 48h auto-confirm window expiring.',
  '    if (order?.delivery && typeof order.delivery === "object") {',
  '      updatePayload["delivery.payoutLocked"] = false;',
  '    }',
  '',
  '    await orderRef.update(updatePayload);',
  '',
  '    return res.json({ success: true, message: "Thanks — order marked as received. Seller payout unlocked." });',
  '  } catch (error) {',
  '    console.error("[orderRoutes] confirm-received error:", error);',
  '    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Failed to confirm receipt." });',
  '  }',
  '});',
  '',
  ANCHOR,
].join('\n');

if (!s.includes(ANCHOR)) {
  console.error('NOT_FOUND: export default router; anchor not found');
  process.exit(1);
}
s = s.replace(ANCHOR, lines);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-confirmreceived"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} confirm-received endpoint added (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n 'router.post("/:orderId/confirm-received"' "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-confirmreceived" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
