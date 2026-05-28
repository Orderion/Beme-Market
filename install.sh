#!/usr/bin/env bash
# ============================================================
#  Beme Market — Topbar Dropdown Install Script
#  Run from the repo root:  bash beme-patch/install.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND="Beme-Frontend"

echo ""
echo "=================================================="
echo "  Beme — Topbar Dropdown Installer"
echo "=================================================="
echo ""

# ── Verify we're in the right directory ────────────────────
if [ ! -d "$FRONTEND/src/pages" ]; then
  echo "ERROR: Run this script from the repo root (where $FRONTEND/ lives)."
  exit 1
fi

# ── 1. Write TopbarDropdown.jsx ────────────────────────────
DEST="$FRONTEND/src/pages/dashboard/TopbarDropdown.jsx"
echo "[1/4] Writing $DEST …"
node -e "
const fs = require('fs');
const src = fs.readFileSync('$SCRIPT_DIR/TopbarDropdown.jsx', 'utf8');
fs.writeFileSync('$DEST', src, 'utf8');
"
echo "      Done."

# ── 2. Patch SellerDashboard.jsx ───────────────────────────
JSX="$FRONTEND/src/pages/SellerDashboard.jsx"
echo "[2/4] Patching $JSX …"
node "$SCRIPT_DIR/patch-jsx.js" "$JSX"

# ── 3. Patch SellerDashboard.css ───────────────────────────
CSS="$FRONTEND/src/pages/SellerDashboard.css"
echo "[3/4] Patching $CSS …"
node "$SCRIPT_DIR/patch-css.js" "$CSS" "$SCRIPT_DIR/dropdown-additions.css"

# ── 4. Git commit & push ───────────────────────────────────
echo "[4/4] Committing and pushing …"
git add \
  "$DEST" \
  "$JSX"  \
  "$CSS"

git commit -m "feat(seller-dashboard): topbar avatar dropdown

- Dropdown menu on avatar click: Settings, Get Help, Upgrade Plan,
  Learn More, Gift Beme, Log Out
- GetHelpModal: live chat link, FAQ accordion, Firestore support ticket
- LearnMoreModal: 6 categorised resource cards
- GiftBemeModal: preset + custom amount, Paystack donate flow,
  writes pending record to Firestore donations collection
- LogoutSheet: bottom-sheet confirmation, calls useAuth().logout()
- Full dark-mode support via CSS vars
- No emojis, monochromatic SVG icons throughout"

git push

echo ""
echo "=================================================="
echo "  All done — Vercel will auto-deploy shortly."
echo "=================================================="
echo ""
