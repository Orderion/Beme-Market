#!/usr/bin/env bash
# ============================================================
# Beme Market — Fix File Locations
# Moves files from wrong root src/ into Beme-Frontend/src/
# Run from: C:\Users\user\Documents\Beme Project
# ============================================================

GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

echo -e "${BLUE}🔧 Fixing file locations...${NC}"
echo ""

# ── Safety check ──────────────────────────────────────────
if [ ! -d "Beme-Frontend" ]; then
  echo -e "${RED}❌ ERROR: Beme-Frontend folder not found.${NC}"
  echo "   Make sure you're running this from the Beme Project root."
  echo "   Current folder: $(pwd)"
  exit 1
fi

if [ ! -d "src" ]; then
  echo -e "${RED}❌ ERROR: No src/ folder found at root.${NC}"
  echo "   Nothing to move."
  exit 1
fi

echo -e "${YELLOW}📂 Found src/ at root — moving to Beme-Frontend/src/${NC}"
echo ""

# ── Create target dirs in Beme-Frontend ───────────────────
mkdir -p Beme-Frontend/src/components/getStore
mkdir -p Beme-Frontend/src/components/payout
mkdir -p Beme-Frontend/src/components/admin
mkdir -p Beme-Frontend/src/components/auth
mkdir -p Beme-Frontend/src/hooks
mkdir -p Beme-Frontend/src/services
mkdir -p Beme-Frontend/src/pages/dashboard
mkdir -p Beme-Frontend/src/pages/admin

# ── Move everything from root src/ to Beme-Frontend/src/ ──
echo "  Moving components..."
cp -r src/components/. Beme-Frontend/src/components/

echo "  Moving hooks..."
cp -r src/hooks/. Beme-Frontend/src/hooks/

echo "  Moving services..."
cp -r src/services/. Beme-Frontend/src/services/

echo "  Moving pages..."
cp -r src/pages/. Beme-Frontend/src/pages/

# ── Remove the wrong root src/ ────────────────────────────
echo ""
echo "  Cleaning up wrong src/ at root..."
rm -rf src/

echo ""
echo -e "${GREEN}✅ Files moved successfully!${NC}"
echo ""
echo "📁 Your files are now in:"
echo "   Beme-Frontend/src/components/SellerRoute.jsx"
echo "   Beme-Frontend/src/components/auth/RequireSeller.jsx"
echo "   Beme-Frontend/src/components/getStore/ (6 files)"
echo "   Beme-Frontend/src/hooks/ (5 files)"
echo "   Beme-Frontend/src/services/ (6 files)"
echo "   Beme-Frontend/src/pages/ (all seller pages)"
echo "   Beme-Frontend/src/pages/dashboard/ (11 files)"
echo "   Beme-Frontend/src/pages/admin/ (3 files)"
echo ""
echo "📁 Functions stay at:"
echo "   functions/ (already in correct place)"
echo ""
echo -e "${BLUE}✅ Done! Check VS Code explorer to confirm.${NC}"
