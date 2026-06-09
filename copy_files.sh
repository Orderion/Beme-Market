#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
OUTPUTS="/mnt/user-data/outputs"

cd "$ROOT"

# Copy StoreFront.jsx
cp "$OUTPUTS/StoreFront.jsx" "Beme-Frontend/src/pages/StoreFront.jsx"
echo "✅ StoreFront.jsx copied ($(wc -l < Beme-Frontend/src/pages/StoreFront.jsx) lines)"

# Copy DashboardAppearance.jsx
cp "$OUTPUTS/DashboardAppearance.jsx" "Beme-Frontend/src/pages/dashboard/DashboardAppearance.jsx"
echo "✅ DashboardAppearance.jsx copied ($(wc -l < Beme-Frontend/src/pages/dashboard/DashboardAppearance.jsx) lines)"

echo ""
echo "=== Verify key markers ==="
grep -c "sf-banner" Beme-Frontend/src/pages/StoreFront.jsx && echo "  StoreFront: sf-banner class found"
grep -c "da-root"   Beme-Frontend/src/pages/dashboard/DashboardAppearance.jsx && echo "  Appearance: da-root class found"

echo ""
echo "=== Git status ==="
git status --short Beme-Frontend/src/pages/StoreFront.jsx \
                   Beme-Frontend/src/pages/dashboard/DashboardAppearance.jsx
