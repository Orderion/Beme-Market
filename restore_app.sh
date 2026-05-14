#!/usr/bin/env bash
# ============================================================
# Beme Market — Restore App.jsx + Print Seller Additions
# Run from: C:\Users\user\Documents\Beme Project
# ============================================================

GREEN="\033[0;32m"; BLUE="\033[0;34m"; YELLOW="\033[1;33m"; NC="\033[0m"

echo -e "${BLUE}🔧 Restoring your original App.jsx...${NC}"

APPFILE="Beme-Frontend/src/App.jsx"
BAKFILE="${APPFILE}.bak"

if [ ! -f "$BAKFILE" ]; then
  echo -e "${YELLOW}⚠  No backup found at ${BAKFILE}${NC}"
  echo "   Your App.jsx was not changed — you're safe."
else
  cp "$BAKFILE" "$APPFILE"
  echo -e "${GREEN}✅ App.jsx restored from backup.${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  NOW: Manually add these 3 blocks to App.jsx  ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}── BLOCK 1: Paste these imports at the top (with your other imports) ──${NC}"
cat << 'IMPORTS'

// ── NEW: Seller guards
import SellerRoute   from "./components/SellerRoute";

// ── NEW: Seller public pages (header/footer visible)
const GetAStore           = lazy(() => import("./pages/GetAStore"));
const StorePlans          = lazy(() => import("./pages/StorePlans"));
const SellerTerms         = lazy(() => import("./pages/SellerTerms"));
const SellerPolicy        = lazy(() => import("./pages/SellerPolicy"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));

// ── NEW: Seller onboarding (full-screen)
const StoreOnboarding     = lazy(() => import("./pages/StoreOnboarding"));
const StoreSurvey         = lazy(() => import("./pages/StoreSurvey"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));

// ── NEW: Seller dashboard (full-screen)
const SellerDashboard     = lazy(() => import("./pages/SellerDashboard"));

// ── NEW: Admin seller management (full-screen)
const SellerPayoutRequests  = lazy(() => import("./pages/admin/PayoutRequests"));
const VerificationRequests  = lazy(() => import("./pages/admin/VerificationRequests"));
const StoreModeration       = lazy(() => import("./pages/admin/StoreModeration"));

IMPORTS

echo ""
echo -e "${YELLOW}── BLOCK 2: Add these to your FULL_SCREEN_ROUTES Set ──${NC}"
cat << 'ROUTES'

  // ── NEW seller routes (full-screen — no header/footer)
  "/store-onboarding",
  "/store-survey",
  "/subscription-success",
  "/seller-dashboard",
  "/admin/seller-payouts",
  "/admin/verification-requests",
  "/admin/store-moderation",

ROUTES

echo ""
echo -e "${YELLOW}── BLOCK 3: Paste these inside your <Routes> block ──${NC}"
cat << 'JSXROUTES'

          {/* ── NEW: Seller public pages (with header/footer) ── */}
          <Route path="/get-a-store"            element={<GetAStore />} />
          <Route path="/store-plans"            element={<StorePlans />} />
          <Route path="/seller-terms"           element={<SellerTerms />} />
          <Route path="/seller-policy"          element={<SellerPolicy />} />
          <Route path="/community-guidelines"   element={<CommunityGuidelines />} />

          {/* ── NEW: Seller onboarding (full-screen, any logged-in user) ── */}
          <Route path="/store-onboarding"
            element={<SellerRoute requireOnly="auth"><StoreOnboarding /></SellerRoute>} />
          <Route path="/store-survey"
            element={<SellerRoute requireOnly="auth"><StoreSurvey /></SellerRoute>} />
          <Route path="/subscription-success"
            element={<SellerRoute requireOnly="auth"><SubscriptionSuccess /></SellerRoute>} />

          {/* ── NEW: Seller dashboard (full-screen, requires seller role) ── */}
          <Route path="/seller-dashboard"
            element={<SellerRoute><SellerDashboard /></SellerRoute>} />

          {/* ── NEW: Admin seller management ── */}
          <Route path="/admin/seller-payouts"
            element={<SuperAdminOnly><SellerPayoutRequests /></SuperAdminOnly>} />
          <Route path="/admin/verification-requests"
            element={<SuperAdminOnly><VerificationRequests /></SuperAdminOnly>} />
          <Route path="/admin/store-moderation"
            element={<SuperAdminOnly><StoreModeration /></SuperAdminOnly>} />

JSXROUTES

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Done! Your original App.jsx is restored.      ${NC}"
echo -e "${GREEN}  Add the 3 blocks above and save — done.       ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
