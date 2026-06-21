#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — Patch 6/8: DashboardOrders.jsx
#   Adds a read-only BemeDeliveryPanel inside the existing
#   Delivery do-detail-section, shown only when
#   order.delivery.isBemeDelivery === true. The existing
#   Method/Fee grid is untouched — this renders ABOVE it.
#   Seller cannot change delivery status (admin-only per the
#   safety rules) — this is purely informational.
# CRLF-tolerant. Run from project root: bash apply-dashboardorders-beme-panel.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch 6/8 — DashboardOrders.jsx BemeDeliveryPanel${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/pages/dashboard/DashboardOrders.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}DashboardOrders.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_dashorders_panel.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('function BemeDeliveryPanel')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

// ── 1. Insert BemeDeliveryPanel component definition, right after
//       the existing EmptyDetail() function (a small, safe anchor
//       that sits before ProgressStepper). ──
const ANCHOR_1 = `function EmptyDetail() {
  return (
    <div className="do-no-order">
      <Ico d={IC.box} size={40} color="var(--sd-border)" sw={1.2} />
      <div className="do-no-order-label">Select an order</div>
    </div>
  );
}`;

const BEME_PANEL_COMPONENT = `function EmptyDetail() {
  return (
    <div className="do-no-order">
      <Ico d={IC.box} size={40} color="var(--sd-border)" sw={1.2} />
      <div className="do-no-order-label">Select an order</div>
    </div>
  );
}

/* ══════════════════════════════════════
   BEME DELIVERY — seller-facing read-only panel.
   Shown when order.delivery.isBemeDelivery === true.
   Sellers cannot change any of this — only admin moves
   delivery.status forward (see deliveryRoutes.js). This
   exists purely so the seller knows what's happening with
   a Beme-courier order: courier status, tracking, payment
   timing, and whether their payout is currently locked.
══════════════════════════════════════ */
const BEME_STATUS_LABELS = {
  pending_dispatch: "Awaiting courier assignment",
  dispatched:        "Courier assigned — pickup scheduled",
  picked_up:         "Picked up — on the way to customer",
  in_transit:        "In transit to customer",
  delivered:         "Delivered",
  failed:            "Delivery failed",
};
const BEME_STATUS_COLOR = {
  pending_dispatch: "var(--sd-muted)",
  dispatched:        "#1d4ed8",
  picked_up:         "var(--sd-accent)",
  in_transit:        "var(--sd-accent)",
  delivered:         "#15803d",
  failed:            "#b91c1c",
};
function BemeDeliveryPanel({ delivery }) {
  const status = delivery?.status || "pending_dispatch";
  const color  = BEME_STATUS_COLOR[status] || "var(--sd-muted)";
  const isPayAtDoor = delivery?.paymentTiming === "pay_at_door";

  return (
    <div style={{ marginBottom:16, padding:"14px 16px", borderRadius:12, background:"var(--sd-accent-dim)", border:"1px solid var(--sd-accent-border)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700, background:"var(--sd-white)", color, border:\`1px solid \${color}\` }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0 }} />
          {BEME_STATUS_LABELS[status] || status}
        </span>
        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:6, color:"var(--sd-muted)", background:"var(--sd-white)", border:"1px solid var(--sd-border)" }}>
          {isPayAtDoor ? "Pay at Door" : "Prepaid by customer"}
        </span>
        {delivery?.payoutLocked && (
          <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:6, color:"#b45309", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)" }}>
            Payout locked
          </span>
        )}
      </div>

      {isPayAtDoor && (
        <div style={{ fontSize:12, color:"var(--sd-muted)", marginBottom: delivery?.courierProvider ? 10 : 0, lineHeight:1.5 }}>
          {delivery?.payAtDoorStatus === "paid"
            ? "Customer has completed payment at the door."
            : delivery?.payAtDoorStatus === "failed"
              ? "Customer's payment failed at the door — admin will reschedule."
              : "Customer will pay via Paystack when the courier arrives."}
        </div>
      )}

      {delivery?.courierProvider && (
        <div className="do-info-grid">
          <div className="do-info-field"><span className="do-info-label">Courier</span><span className="do-info-value">{delivery.courierProvider}</span></div>
          {delivery?.trackingNumber && <div className="do-info-field"><span className="do-info-label">Tracking #</span><span className="do-info-value" style={{ fontFamily:"monospace" }}>{delivery.trackingNumber}</span></div>}
          {delivery?.estimatedPickup && <div className="do-info-field"><span className="do-info-label">Est. Pickup</span><span className="do-info-value">{delivery.estimatedPickup}</span></div>}
        </div>
      )}

      {status === "failed" && delivery?.failReason && (
        <div style={{ fontSize:12, color:"#b91c1c", marginTop:10 }}>Reason: {delivery.failReason}</div>
      )}
    </div>
  );
}`;

if (!s.includes(ANCHOR_1)) {
  console.error('NOT_FOUND: EmptyDetail() anchor — file may have been edited since this patch was written');
  process.exit(1);
}
s = s.replace(ANCHOR_1, BEME_PANEL_COMPONENT);

// ── 2. Render it inside the existing Delivery do-detail-section,
//       ABOVE the existing Method/Fee do-info-grid (which is untouched). ──
const ANCHOR_2 = `        {/* Delivery */}
        <div className="do-detail-section">
          <div className="do-section-label" style={{ marginBottom: 12 }}>
            <Ico d={IC.truck} size={12} /> Delivery
          </div>
          <div className="do-info-grid">
            <div className="do-info-field"><span className="do-info-label">Method</span><span className="do-info-value">{del.label || del.method || "—"}</span></div>
            <div className="do-info-field"><span className="do-info-label">Fee</span><span className="do-info-value">{fmtMoney(del.fee)}</span></div>
          </div>
        </div>`;

const REPLACEMENT_2 = `        {/* Delivery */}
        <div className="do-detail-section">
          <div className="do-section-label" style={{ marginBottom: 12 }}>
            <Ico d={IC.truck} size={12} /> Delivery
          </div>
          {del?.isBemeDelivery && <BemeDeliveryPanel delivery={del} />}
          <div className="do-info-grid">
            <div className="do-info-field"><span className="do-info-label">Method</span><span className="do-info-value">{del.label || del.method || "—"}</span></div>
            <div className="do-info-field"><span className="do-info-label">Fee</span><span className="do-info-value">{fmtMoney(del.fee)}</span></div>
          </div>
        </div>`;

if (!s.includes(ANCHOR_2)) {
  console.error('NOT_FOUND: Delivery do-detail-section anchor — file may have been edited since this patch was written');
  process.exit(1);
}
s = s.replace(ANCHOR_2, REPLACEMENT_2);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-bemepanel"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} BemeDeliveryPanel added and wired into Delivery section (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "function BemeDeliveryPanel\|del?.isBemeDelivery && <BemeDeliveryPanel" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-bemepanel" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
