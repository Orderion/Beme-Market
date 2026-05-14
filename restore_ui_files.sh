#!/usr/bin/env bash
# ============================================================
# Beme Market — Restore UI Files + Show Minimal Additions
# Restores Header.jsx, BottomNav.jsx, Footer.jsx from .bak
# Run from: C:\Users\user\Documents\Beme Project
# ============================================================

GREEN="\033[0;32m"; BLUE="\033[0;34m"; YELLOW="\033[1;33m"; RED="\033[0;31m"; NC="\033[0m"

echo -e "${BLUE}🔧 Restoring original UI files from backups...${NC}"
echo ""

FRONTEND="Beme-Frontend"

restore_file() {
  local FILE="$1"
  local BAK="${FILE}.bak"
  if [ -f "$BAK" ]; then
    cp "$BAK" "$FILE"
    echo -e "  ${GREEN}✅ Restored: $FILE${NC}"
  else
    echo -e "  ${YELLOW}⚠  No backup found for $FILE — skipping${NC}"
  fi
}

restore_file "$FRONTEND/src/components/Header.jsx"
restore_file "$FRONTEND/src/components/navigation/BottomNav.jsx"
restore_file "$FRONTEND/src/components/Footer.jsx"

echo ""
echo -e "${GREEN}All UI files restored to originals.${NC}"
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Now make ONLY these 3 small changes in VS Code:         ${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"

# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}━━━ CHANGE 1: Header.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "In your Header.jsx find the nav links area — the line with"
echo "'Support' or your last nav link. Add this RIGHT AFTER it:"
echo ""
cat << 'HEADERSNIP'

  {/* ── NEW: Get a Store / Dashboard link ── */}
  <Link
    to={isSellerActive ? "/seller-dashboard" : "/get-a-store"}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "7px 16px",
      background: "var(--grtheme, #046EF2)",
      color: "#fff",
      borderRadius: "var(--radius, 6px)",
      fontSize: "13px",
      fontWeight: 700,
      textDecoration: "none",
      whiteSpace: "nowrap",
    }}
  >
    {isSellerActive ? "My Dashboard" : "Get a Store"}
  </Link>

HEADERSNIP

echo "Also add this to your existing destructuring at the top:"
echo ""
echo '  const { user, isSuperAdmin, isSeller, isSellerActive } = useAuth();'
echo ""
echo "  (just add  isSellerActive  to what you already destructure)"

# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}━━━ CHANGE 2: BottomNav.jsx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Find your 'Offers' tab in BottomNav.jsx."
echo "It will look something like:"
echo ""
echo '  <NavLink to="/offers">Offers</NavLink>'
echo '  or'
echo '  <Tab to="/offers" label="Offers" .../>'
echo ""
echo "Replace ONLY that one tab with:"
echo ""
cat << 'BOTTOMNAVSNIP'

  {/* ── CHANGED: Offers → Get a Store ── */}
  {isSeller ? (
    <NavLink to="/seller-dashboard">Dashboard</NavLink>
  ) : (
    <NavLink to="/get-a-store">Get a Store</NavLink>
  )}

BOTTOMNAVSNIP

echo "Also add  isSeller  to your useAuth() destructure at the top."

# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}━━━ CHANGE 3: Footer.jsx (optional) ━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Find the last column/section in your footer."
echo "Add this new column AFTER it:"
echo ""
cat << 'FOOTERSNIP'

  {/* ── NEW: Seller Hub column ── */}
  <div>
    <div style={{ fontSize:"11px", fontWeight:700, textTransform:"uppercase",
      letterSpacing:"0.1em", color:"rgba(255,255,255,0.4)", marginBottom:"14px" }}>
      Sell on Beme
    </div>
    <ul style={{ listStyle:"none", padding:0, margin:0,
      display:"flex", flexDirection:"column", gap:"10px" }}>
      {[
        ["Get a Store",         "/get-a-store"],
        ["Pricing Plans",       "/store-plans"],
        ["Seller Dashboard",    "/seller-dashboard"],
        ["Seller Terms",        "/seller-terms"],
        ["Seller Policy",       "/seller-policy"],
        ["Community Guidelines","/community-guidelines"],
      ].map(([label, to]) => (
        <li key={label}>
          <Link to={to} style={{ fontSize:"13px",
            color:"rgba(255,255,255,0.5)", textDecoration:"none" }}>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  </div>

FOOTERSNIP

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  3 small changes. Your original UI stays 100% intact.   ${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo ""
