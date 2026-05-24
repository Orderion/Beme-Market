#!/bin/bash

# ═══════════════════════════════════════════════════════════════════
#  BEME AI COPILOT — INSTALL SCRIPT
#  Run this from the ROOT of your Beme Project folder in Git Bash:
#    bash install_ai_copilot.sh
# ═══════════════════════════════════════════════════════════════════

# ── Colors for output ──────────────────────────────────────────────
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Beme AI Copilot — File Installer     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# ── Detect project root ────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND="$SCRIPT_DIR/Beme-Frontend"
DOWNLOADS="$SCRIPT_DIR/beme-ai-downloads"

# Check Beme-Frontend exists
if [ ! -d "$FRONTEND" ]; then
  echo -e "${RED}✗ Could not find Beme-Frontend/ folder.${NC}"
  echo -e "  Make sure you run this script from inside:"
  echo -e "  C:/Users/user/Documents/Beme Project/"
  exit 1
fi

# Check downloads folder exists
if [ ! -d "$DOWNLOADS" ]; then
  echo -e "${RED}✗ Could not find beme-ai-downloads/ folder.${NC}"
  echo ""
  echo -e "${YELLOW}► Create a folder called  beme-ai-downloads  in:${NC}"
  echo -e "  $SCRIPT_DIR"
  echo ""
  echo -e "  Then place ALL downloaded AI files inside it and re-run."
  echo ""
  echo -e "  Expected files inside beme-ai-downloads/:"
  echo -e "    index.css"
  echo -e "    SellerDashboard_UPDATED.jsx"
  echo -e "    AIAssistant.jsx"
  echo -e "    AIMessage.jsx"
  echo -e "    AIRateLimitBanner.jsx"
  echo -e "    AIComponents.jsx"
  echo -e "    useAIUsage.js"
  echo -e "    useAIChat.js"
  echo -e "    useAIContext.js"
  echo -e "    useAISettings.js"
  echo -e "    aiService.js"
  echo -e "    aiUsageService.js"
  exit 1
fi

echo -e "${BLUE}► Project root :${NC} $SCRIPT_DIR"
echo -e "${BLUE}► Frontend     :${NC} $FRONTEND"
echo -e "${BLUE}► Downloads    :${NC} $DOWNLOADS"
echo ""

# ═══════════════════════════════════════════════════════════════════
# STEP 1 — Create all required directories
# ═══════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[1/3] Creating directories…${NC}"

mkdir -p "$FRONTEND/src/components/ai"
mkdir -p "$FRONTEND/src/hooks"
mkdir -p "$FRONTEND/src/services"
mkdir -p "$FRONTEND/src/pages/dashboard"

echo -e "  ${GREEN}✓${NC} src/components/ai/"
echo -e "  ${GREEN}✓${NC} src/hooks/"
echo -e "  ${GREEN}✓${NC} src/services/"
echo -e "  ${GREEN}✓${NC} src/pages/dashboard/"
echo ""

# ═══════════════════════════════════════════════════════════════════
# STEP 2 — Copy files to correct destinations
# ═══════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[2/3] Installing files…${NC}"

# Helper function: copy with feedback
install_file() {
  local SRC="$DOWNLOADS/$1"
  local DST="$2"
  local LABEL="$3"

  if [ -f "$SRC" ]; then
    # Backup existing file if it exists
    if [ -f "$DST" ]; then
      cp "$DST" "${DST}.bak" 2>/dev/null
    fi
    cp "$SRC" "$DST"
    echo -e "  ${GREEN}✓${NC} $LABEL"
  else
    echo -e "  ${RED}✗ MISSING:${NC} $1  (skipped)"
  fi
}

# ── Global styles ────────────────────────────────────────────────
install_file \
  "index.css" \
  "$FRONTEND/src/index.css" \
  "src/index.css  (neo-brutalist removed, clean modern styles)"

# ── Seller Dashboard ─────────────────────────────────────────────
install_file \
  "SellerDashboard_UPDATED.jsx" \
  "$FRONTEND/src/pages/SellerDashboard.jsx" \
  "src/pages/SellerDashboard.jsx  (AI Copilot tab added)"

# ── AI Dashboard Page ────────────────────────────────────────────
install_file \
  "AIAssistant.jsx" \
  "$FRONTEND/src/pages/dashboard/AIAssistant.jsx" \
  "src/pages/dashboard/AIAssistant.jsx  (new)"

# ── AI Components ────────────────────────────────────────────────
install_file \
  "AIMessage.jsx" \
  "$FRONTEND/src/components/ai/AIMessage.jsx" \
  "src/components/ai/AIMessage.jsx  (new)"

install_file \
  "AIRateLimitBanner.jsx" \
  "$FRONTEND/src/components/ai/AIRateLimitBanner.jsx" \
  "src/components/ai/AIRateLimitBanner.jsx  (new)"

install_file \
  "AIComponents.jsx" \
  "$FRONTEND/src/components/ai/AIComponents.jsx" \
  "src/components/ai/AIComponents.jsx  (new)"

# ── Hooks ────────────────────────────────────────────────────────
install_file \
  "useAIUsage.js" \
  "$FRONTEND/src/hooks/useAIUsage.js" \
  "src/hooks/useAIUsage.js  (new)"

install_file \
  "useAIChat.js" \
  "$FRONTEND/src/hooks/useAIChat.js" \
  "src/hooks/useAIChat.js  (new)"

install_file \
  "useAIContext.js" \
  "$FRONTEND/src/hooks/useAIContext.js" \
  "src/hooks/useAIContext.js  (new)"

install_file \
  "useAISettings.js" \
  "$FRONTEND/src/hooks/useAISettings.js" \
  "src/hooks/useAISettings.js  (new)"

# ── Services ─────────────────────────────────────────────────────
install_file \
  "aiService.js" \
  "$FRONTEND/src/services/aiService.js" \
  "src/services/aiService.js  (new)"

install_file \
  "aiUsageService.js" \
  "$FRONTEND/src/services/aiUsageService.js" \
  "src/services/aiUsageService.js  (new)"

echo ""

# ═══════════════════════════════════════════════════════════════════
# STEP 3 — Verify installation
# ═══════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[3/3] Verifying installation…${NC}"

REQUIRED=(
  "$FRONTEND/src/index.css"
  "$FRONTEND/src/pages/SellerDashboard.jsx"
  "$FRONTEND/src/pages/dashboard/AIAssistant.jsx"
  "$FRONTEND/src/components/ai/AIMessage.jsx"
  "$FRONTEND/src/components/ai/AIRateLimitBanner.jsx"
  "$FRONTEND/src/components/ai/AIComponents.jsx"
  "$FRONTEND/src/hooks/useAIUsage.js"
  "$FRONTEND/src/hooks/useAIChat.js"
  "$FRONTEND/src/hooks/useAIContext.js"
  "$FRONTEND/src/hooks/useAISettings.js"
  "$FRONTEND/src/services/aiService.js"
  "$FRONTEND/src/services/aiUsageService.js"
)

ALL_OK=true
for FILE in "${REQUIRED[@]}"; do
  if [ -f "$FILE" ]; then
    echo -e "  ${GREEN}✓${NC} $(basename $FILE)"
  else
    echo -e "  ${RED}✗ MISSING:${NC} $FILE"
    ALL_OK=false
  fi
done

echo ""

# ═══════════════════════════════════════════════════════════════════
# RESULT
# ═══════════════════════════════════════════════════════════════════
if [ "$ALL_OK" = true ]; then
  echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   ✓  Installation complete!            ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo -e "  1.  cd Beme-Frontend"
  echo -e "  2.  npm run dev"
  echo -e "  3.  Go to your seller dashboard"
  echo -e "  4.  Click  AI Copilot  in the sidebar"
  echo ""
  echo -e "${YELLOW}Note:${NC} AI Copilot only appears for Pro plan sellers."
  echo -e "      Backup files (.bak) were created for any replaced files."
  echo ""
else
  echo -e "${RED}╔════════════════════════════════════════╗${NC}"
  echo -e "${RED}║   ✗  Some files are missing!           ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  Check that all files are in: $DOWNLOADS"
  echo -e "  Then re-run:  bash install_ai_copilot.sh"
  echo ""
fi
