#!/usr/bin/env bash
# ============================================================
# ONBOARDING FIX — GetAStore.jsx: distinguish real store vs stuck application
#
#   Previously, "You already have a store" fired for BOTH a
#   genuinely completed store AND a stuck/incomplete
#   storeApplications draft — actively misleading the latter
#   group, who have no real store and can't get back into
#   onboarding to finish.
#
#   Now shows two different messages:
#   - Genuine store (real shop, or isSeller true) → unchanged
#     "You already have a store" + Go to Dashboard
#   - Stuck/incomplete application (only an application doc
#     exists, onboardingComplete is not true, no real shop) →
#     NEW "Your store application is incomplete" message with a
#     Continue Setup button that sends them back into
#     /store-onboarding to finish, instead of a dead-end
#     Dashboard link.
#
#   Requires apply-usesellerauth-expose-hasapp.sh to have been
#   run first — this patch uses hasApplication/hasShop/
#   onboardingComplete which that script adds to useSellerAuth().
#
# CRLF-tolerant. Run from project root: bash apply-getastore-stuck-state.sh
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
echo ""; echo -e "${BOLD}ONBOARDING FIX — GetAStore.jsx stuck application state${NC}"; echo ""

ROOT="$PWD"
while [[ "$ROOT" != "/" && ! -d "$ROOT/Beme-Frontend" ]]; do ROOT="$(dirname "$ROOT")"; done
F="$ROOT/Beme-Frontend/src/pages/GetAStore.jsx"
[[ ! -f "$F" ]] && { echo -e "${RED}GetAStore.jsx not found at $F${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node not found${NC}"; exit 1; }

HELPER="$ROOT/.beme_getastorefix.cjs"
cat > "$HELPER" << 'ENDJS'
const fs = require('fs');
const fp = process.argv[2];
let raw = fs.readFileSync(fp, 'utf8');
const usesCRLF = (raw.match(/\r\n/g) || []).length >= (raw.split('\n').length / 2);
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('Your store application is incomplete')) {
  console.log('ALREADY_PATCHED');
  process.exit(0);
}

// ── 1. Read the new signals from useSellerAuth(), and split hasStore
//      into two distinct states instead of one conflated check. ──
const OLD_HOOK = `  const { shop, isSeller } = useSellerAuth();
  const [billing, setBilling] = useState("monthly");
  const prices = billing === "yearly" ? YEARLY : MONTHLY;

  // One store per account — block access if user already has one
  const appliedUid = typeof window !== "undefined" ? localStorage.getItem("beme_seller_applied") : null;
  const hasStore = !!(shop?.id || isSeller || isSellerActive || (appliedUid && user && appliedUid === user?.uid));

  if (user && hasStore) {`;

const NEW_HOOK = `  const { shop, isSeller, hasApplication, hasShop, onboardingComplete } = useSellerAuth();
  const [billing, setBilling] = useState("monthly");
  const prices = billing === "yearly" ? YEARLY : MONTHLY;

  // ONBOARDING FIX: split into two distinct states instead of one
  // conflated "hasStore" check. A genuinely completed store (real
  // shop doc, or role already flipped to seller) is different from
  // a stuck/incomplete application — the latter should let the user
  // continue setup, not be told they already have a store.
  const appliedUid = typeof window !== "undefined" ? localStorage.getItem("beme_seller_applied") : null;
  const genuinelyHasStore = !!(shop?.id || hasShop || isSeller);
  const hasStuckApplication = !genuinelyHasStore && !!(hasApplication || (appliedUid && user && appliedUid === user?.uid));
  const hasStore = genuinelyHasStore || hasStuckApplication;

  if (user && hasStuckApplication) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 32,
        fontFamily: "var(--font-main,'Nunito',sans-serif)", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(245,158,11,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="#F59E0B" stroke="none"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text,#111)", marginBottom: 10, letterSpacing: "-0.02em" }}>
          Your store application is incomplete
        </h2>
        <p style={{ fontSize: 15, color: "var(--muted,#6B7280)", maxWidth: 340, lineHeight: 1.6, marginBottom: 8 }}>
          You started setting up a store but didn't finish. You don't have an active store yet —
          let's pick up where you left off.
        </p>
        <p style={{ fontSize: 13, color: "var(--muted,#9CA3AF)", maxWidth: 320, lineHeight: 1.5, marginBottom: 28 }}>
          If this keeps happening, contact support and we'll sort it out.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" onClick={() => navigate("/store-onboarding")}
            style={{ padding: "12px 28px", borderRadius: 12, border: "none",
              background: "#F59E0B", color: "#fff", fontSize: 15, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(245,158,11,0.3)" }}>
            Continue Setup
          </button>
          <button type="button" onClick={() => navigate("/support")}
            style={{ padding: "12px 28px", borderRadius: 12,
              border: "1.5px solid rgba(0,0,0,0.1)", background: "transparent",
              color: "var(--text,#333)", fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit" }}>
            Contact Support
          </button>
        </div>
      </div>
    );
  }

  if (user && genuinelyHasStore) {`;

if (!s.includes(OLD_HOOK)) { console.error('NOT_FOUND: hook + hasStore block — exact text did not match'); process.exit(1); }
s = s.replace(OLD_HOOK, NEW_HOOK);

if (usesCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(fp, s, 'utf8');
console.log(usesCRLF ? 'OK_CRLF' : 'OK_LF');
ENDJS

cp "$F" "$F.bak-getastorefix"
OUT=$(node "$HELPER" "$F" 2>&1); CODE=$?
rm -f "$HELPER"

echo ""
if [[ "$OUT" == "ALREADY_PATCHED" ]]; then
  echo -e "  ${YELLOW}→${NC} Already patched — no changes made"
elif [[ $CODE -eq 0 && ( "$OUT" == OK_* ) ]]; then
  echo -e "  ${GREEN}✓${NC} GetAStore.jsx now distinguishes stuck applications from real stores (${OUT#OK_} line endings)"
  echo ""
  echo "  Verification:"
  grep -n "hasStuckApplication\|genuinelyHasStore" "$F" | head -5 | sed 's/^/    /'
else
  echo -e "  ${RED}✗${NC} Failed: $OUT"
  cp "$F.bak-getastorefix" "$F"
  echo -e "  ${YELLOW}File restored from backup — no changes were kept.${NC}"
  echo "  Paste this error output back so it can be fixed before retrying."
fi
echo ""
