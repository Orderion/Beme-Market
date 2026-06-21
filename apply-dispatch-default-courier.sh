#!/usr/bin/env bash
# ============================================================
# BEME DELIVERY — Patch: Dispatch.jsx
#   1. DispatchModal now defaults its courier selection to whatever
#      the CUSTOMER originally picked at checkout (delivery.provider,
#      e.g. "DHL eCommerce") instead of starting blank. Admin can
#      still override (e.g. if that courier is unavailable that day).
#   2. The order row in the queue now shows the customer's chosen
#      courier BEFORE dispatch happens, so admin doesn't have to
#      guess or open the order elsewhere to see what was selected.
# CRLF-tolerant. Run from project root: bash apply-dispatch-default-courier.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}Patch — Dispatch.jsx default to customer's chosen courier${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/pages/admin/sections/Dispatch.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}Dispatch.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_dispatchdefault.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('customerChosenCourierId')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

// ── 1. Add a helper to map the customer's display-name provider
//       (e.g. "DHL eCommerce") back to a COURIER_OPTIONS id ("dhl").
//       Inserted right after COURIER_OPTIONS definition. ──
const ANCHOR_1 = `const ZONE_OPTIONS = [`;
const HELPER_FN = `// Maps the customer's checkout-time provider display name (delivery.provider,
// e.g. "DHL eCommerce") back to a COURIER_OPTIONS id ("dhl"), so the dispatch
// modal can default to what the customer actually picked.
function customerChosenCourierId(delivery) {
  const providerName = String(delivery?.provider || delivery?.label || "").toLowerCase();
  if (!providerName) return "";
  const match = COURIER_OPTIONS.find(c => providerName.includes(c.id) || providerName.includes(c.label.toLowerCase()));
  return match?.id || "";
}

const ZONE_OPTIONS = [`;
if (!s.includes(ANCHOR_1)) { console.error('NOT_FOUND: ZONE_OPTIONS anchor'); process.exit(1); }
s = s.replace(ANCHOR_1, HELPER_FN);

// ── 2. DispatchModal: default courierProvider state to the customer's
//       choice instead of starting blank. ──
const ANCHOR_2 = `function DispatchModal({ order, onClose, onSuccess }) {
  const [courierProvider, setCourierProvider] = useState("");`;
const MODAL_NEW = `function DispatchModal({ order, onClose, onSuccess }) {
  const [courierProvider, setCourierProvider] = useState(() => customerChosenCourierId(order?.delivery));`;
if (!s.includes(ANCHOR_2)) { console.error('NOT_FOUND: DispatchModal courierProvider state init'); process.exit(1); }
s = s.replace(ANCHOR_2, MODAL_NEW);

// ── 3. Add a small note in the modal showing what the customer
//       originally picked, right above the courier select field. ──
const ANCHOR_3 = `        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ap-text)", marginBottom: 4 }}>Dispatch Courier</div>
        <div style={{ fontSize: 12, color: "var(--ap-muted)", marginBottom: 18 }}>Order #{String(order.id).slice(0, 8).toUpperCase()}</div>`;
const MODAL_NOTE_NEW = `        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ap-text)", marginBottom: 4 }}>Dispatch Courier</div>
        <div style={{ fontSize: 12, color: "var(--ap-muted)", marginBottom: 18 }}>Order #{String(order.id).slice(0, 8).toUpperCase()}</div>
        {(order?.delivery?.provider || order?.delivery?.label) && (
          <div style={{ fontSize: 12, color: "var(--ap-text2)", marginBottom: 14, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid var(--ap-border)" }}>
            Customer selected: <strong>{order.delivery.provider || order.delivery.label}</strong> at checkout — pre-filled below, override if needed.
          </div>
        )}`;
if (!s.includes(ANCHOR_3)) { console.error('NOT_FOUND: DispatchModal header block'); process.exit(1); }
s = s.replace(ANCHOR_3, MODAL_NOTE_NEW);

// ── 4. Order row: show the customer's chosen courier before dispatch
//      happens (when del.courierProvider is still null/not yet set). ──
const ANCHOR_4 = `      <div style={{ flex: "0 0 140px" }}>
        <div style={{ fontSize: 11, color: "var(--ap-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Courier</div>
        <div style={{ fontSize: 13, color: "var(--ap-text)" }}>{del.courierProvider || "—"}</div>
        {del.trackingNumber && <div style={{ fontSize: 11, color: "var(--ap-muted)", fontFamily: "monospace" }}>{del.trackingNumber}</div>}
      </div>`;
const ROW_NEW = `      <div style={{ flex: "0 0 140px" }}>
        <div style={{ fontSize: 11, color: "var(--ap-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
          {del.courierProvider ? "Courier" : "Customer Selected"}
        </div>
        <div style={{ fontSize: 13, color: del.courierProvider ? "var(--ap-text)" : "var(--ap-muted)" }}>
          {del.courierProvider || del.provider || del.label || "—"}
        </div>
        {del.trackingNumber && <div style={{ fontSize: 11, color: "var(--ap-muted)", fontFamily: "monospace" }}>{del.trackingNumber}</div>}
      </div>`;
if (!s.includes(ANCHOR_4)) { console.error('NOT_FOUND: order row courier display block'); process.exit(1); }
s = s.replace(ANCHOR_4, ROW_NEW);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-defaultcourier"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} Dispatch modal now defaults to customer's chosen courier (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "customerChosenCourierId\|Customer selected:" "$F" | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-defaultcourier" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
