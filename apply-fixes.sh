#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Beme Market — Dark Theme Fix
#  Edits files directly in their original locations
#  Run from Git Bash at:
#    C:\Users\user\Documents\Beme Project
#  Command:  bash apply-fixes.sh
# ═══════════════════════════════════════════════════════════════

BASE="/c/Users/user/Documents/Beme Project/Beme-Frontend"

echo ""
echo "🚀  Applying dark theme fixes directly to project files..."
echo ""

# ── 1. index.css ───────────────────────────────────────────────
FILE="$BASE/src/index.css"
if [ -f "$FILE" ]; then
  sed -i 's/--bg: #111111;/--bg: #131416;/g' "$FILE"
  sed -i 's/--card: #1A1A18;/--card: #1c1f22;/g' "$FILE"
  sed -i 's/--card: #1a1a18;/--card: #1c1f22;/g' "$FILE"
  sed -i 's/--caru: #222220;/--caru: #21242a;/g' "$FILE"
  sed -i 's/--overlay: rgba(0, 0, 0, 0.76);/--overlay: rgba(0, 0, 0, 0.82);/g' "$FILE"
  echo "✅  src/index.css"
else
  echo "⚠️   Not found: src/index.css"
fi

# ── 2. SellerDashboard.jsx ─────────────────────────────────────
FILE="$BASE/src/pages/SellerDashboard.jsx"
if [ -f "$FILE" ]; then
  sed -i 's/--sd-bg:.*#0e0b1a;/--sd-bg:            #131416;/g' "$FILE"
  sed -i 's/--sd-white:.*#18152a;/--sd-white:         #1c1f22;/g' "$FILE"
  sed -i 's/--sd-border:.*#2d2547;/--sd-border:        #2a2d32;/g' "$FILE"
  sed -i 's/--sd-border-light:.*#231d38;/--sd-border-light:  #21242a;/g' "$FILE"
  sed -i 's/--sd-text:.*#ede9fa;/--sd-text:          #e8eaed;/g' "$FILE"
  sed -i 's/--sd-text2:.*#c4b5fd;/--sd-text2:         #b0b8c4;/g' "$FILE"
  sed -i 's/--sd-muted:.*#7c6fab;/--sd-muted:         #6b7380;/g' "$FILE"
  sed -i 's/--sd-nav-icon:.*#6b5f8a;/--sd-nav-icon:      #565c66;/g' "$FILE"
  sed -i 's/--sd-muted:.*#a89fc5;/--sd-muted:         #6b7380;/g' "$FILE"
  echo "✅  src/pages/SellerDashboard.jsx"
else
  echo "⚠️   Not found: src/pages/SellerDashboard.jsx"
fi

# ── 3. DashboardAnalytics.jsx ──────────────────────────────────
FILE="$BASE/src/pages/dashboard/DashboardAnalytics.jsx"
if [ -f "$FILE" ]; then
  # Remove the old purple/indigo AI card dark gradient
  sed -i 's|background: linear-gradient(135deg, #0f0e2e 0%, #1e1b4b 32%, #312e81 65%, #09090f 100%);|background: linear-gradient(135deg, #131416 0%, #1c1f22 40%, #21242a 100%);|g' "$FILE"
  sed -i 's|background: linear-gradient(135deg, #0e0b1a 0%, #1e1b4b 32%, #312e81 65%, #0a0a1a 100%);|background: linear-gradient(135deg, #131416 0%, #1c1f22 40%, #21242a 100%);|g' "$FILE"
  echo "✅  src/pages/dashboard/DashboardAnalytics.jsx"
else
  echo "⚠️   Not found: src/pages/dashboard/DashboardAnalytics.jsx"
fi

# ── 4. DashboardHome.jsx ───────────────────────────────────────
FILE="$BASE/src/pages/dashboard/DashboardHome.jsx"
if [ -f "$FILE" ]; then
  sed -i "s/background: \"#fff\"/background: \"var(--sd-white)\"/g" "$FILE"
  sed -i "s/background:\"#fff\"/background:\"var(--sd-white)\"/g" "$FILE"
  sed -i "s/color: \"#111\"/color: \"var(--sd-text)\"/g" "$FILE"
  sed -i "s/color:\"#111\"/color:\"var(--sd-text)\"/g" "$FILE"
  sed -i "s/color: \"#111111\"/color: \"var(--sd-text)\"/g" "$FILE"
  sed -i "s/background: \"#ffffff\"/background: \"var(--sd-white)\"/g" "$FILE"
  echo "✅  src/pages/dashboard/DashboardHome.jsx"
else
  echo "⚠️   Not found: src/pages/dashboard/DashboardHome.jsx"
fi

# ── 5. DashboardChat.jsx ───────────────────────────────────────
FILE="$BASE/src/pages/dashboard/DashboardChat.jsx"
if [ -f "$FILE" ]; then
  sed -i "s/background:\"#fff\"/background:\"var(--sd-white)\"/g" "$FILE"
  sed -i "s/background: \"#fff\"/background: \"var(--sd-white)\"/g" "$FILE"
  sed -i "s/color: \"#111\"/color: \"var(--sd-text)\"/g" "$FILE"
  sed -i "s/color:\"#111\"/color:\"var(--sd-text)\"/g" "$FILE"
  echo "✅  src/pages/dashboard/DashboardChat.jsx"
else
  echo "⚠️   Not found: src/pages/dashboard/DashboardChat.jsx"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Dark theme updated to #131416 across all files."
echo ""
echo "  Changes made:"
echo "  • index.css          --bg #111111 → #131416"
echo "                       --card #1A1A18 → #1c1f22"
echo "  • SellerDashboard    sd-bg, sd-white, borders, text"
echo "  • DashboardAnalytics AI card gradient neutralised"
echo "  • DashboardHome      hardcoded #fff → css variables"
echo "  • DashboardChat      hardcoded #fff → css variables"
echo ""
echo "  Next: cd Beme-Frontend && npm run dev"
echo "═══════════════════════════════════════════════════════"
echo ""
