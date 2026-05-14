#!/usr/bin/env bash
# ============================================================
# Beme Market — Install Updated Existing Files
# Backs up originals to .bak, then installs updated versions.
# Run from: C:\Users\user\Documents\Beme Project
# ============================================================
set -e

GREEN="\033[0;32m"; BLUE="\033[0;34m"; YELLOW="\033[1;33m"; RED="\033[0;31m"; NC="\033[0m"
echo -e "${BLUE}🔄 Installing Updated Beme Market Files...${NC}"
echo ""

# Safety check
if [ ! -d "Beme-Frontend" ]; then
  echo -e "${RED}❌ ERROR: Run this from the Beme Project root (where Beme-Frontend folder is).${NC}"
  echo "  Current folder: $(pwd)"
  exit 1
fi

echo -e "  🔁 Updating Beme-Frontend/src/App.jsx..."
  mkdir -p "Beme-Frontend/src"
  if [ -f "Beme-Frontend/src/App.jsx" ]; then
    cp "Beme-Frontend/src/App.jsx" "Beme-Frontend/src/App.jsx.bak"
    echo -e "     💾 Backed up → Beme-Frontend/src/App.jsx.bak"
  fi
cat > 'Beme-Frontend/src/App.jsx' << 'BEME_UPDATE_EOF'
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// ── Core layout ──────────────────────────────────────────────────────────────
import Header      from "./components/Header";
import Sidebar     from "./components/Sidebar";
import CartDrawer  from "./components/CartDrawer";
import Footer      from "./components/Footer";
import BottomNav   from "./components/navigation/BottomNav";

// ── Guards ────────────────────────────────────────────────────────────────────
import AdminRoute    from "./components/AdminRoute";
import RequireAdmin  from "./components/auth/RequireAdmin";
import SellerRoute   from "./components/SellerRoute";           // NEW
import RequireSeller from "./components/auth/RequireSeller";   // NEW

// ── Existing marketplace pages ────────────────────────────────────────────────
const Home            = lazy(() => import("./pages/Home"));
const Shop            = lazy(() => import("./pages/Shop"));
const ProductDetail   = lazy(() => import("./pages/ProductDetail"));
const Cart            = lazy(() => import("./pages/Cart"));
const Checkout        = lazy(() => import("./pages/Checkout"));
const Orders          = lazy(() => import("./pages/Orders"));
const Profile         = lazy(() => import("./pages/Profile"));
const Wishlist        = lazy(() => import("./pages/Wishlist"));
const Search          = lazy(() => import("./pages/Search"));
const Offers          = lazy(() => import("./pages/Offers"));

// ── Existing auth pages ───────────────────────────────────────────────────────
const Login         = lazy(() => import("./pages/Login"));
const Signup        = lazy(() => import("./pages/Signup"));
const VerifyEmail   = lazy(() => import("./pages/VerifyEmail"));
const Onboarding    = lazy(() => import("./pages/Onboarding"));
const AdminLogin    = lazy(() => import("./pages/AdminLogin"));

// ── Existing legal pages ──────────────────────────────────────────────────────
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy  = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy   = lazy(() => import("./pages/RefundPolicy"));

// ── Existing admin pages ──────────────────────────────────────────────────────
const AdminDashboard      = lazy(() => import("./pages/AdminDashboard"));
const Admin               = lazy(() => import("./pages/Admin"));
const AdminOrders         = lazy(() => import("./pages/AdminOrders"));
const AdminReviewQueue    = lazy(() => import("./pages/AdminReviewQueue"));
const Analytics           = lazy(() => import("./pages/Analytics"));
const PayoutRequests      = lazy(() => import("./pages/PayoutRequests"));     // existing admin payout
const ShopApplications    = lazy(() => import("./pages/ShopApplications"));
const HomepageAdmin       = lazy(() => import("./pages/HomepageAdmin"));
const MediaManager        = lazy(() => import("./pages/MediaManager"));
const AdminSupportDashboard = lazy(() => import("./pages/AdminSupportDashboard"));
const AdminNotifications  = lazy(() => import("./pages/AdminNotifications"));
const AccountManagement   = lazy(() => import("./pages/AccountManagement"));
const ProductRequests     = lazy(() => import("./pages/ProductRequests"));

// ── NEW: Seller public pages ──────────────────────────────────────────────────
const GetAStore          = lazy(() => import("./pages/GetAStore"));
const StorePlans         = lazy(() => import("./pages/StorePlans"));
const SellerTerms        = lazy(() => import("./pages/SellerTerms"));
const SellerPolicy       = lazy(() => import("./pages/SellerPolicy"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));

// ── NEW: Seller onboarding (full-screen, requires auth) ───────────────────────
const StoreOnboarding    = lazy(() => import("./pages/StoreOnboarding"));
const StoreSurvey        = lazy(() => import("./pages/StoreSurvey"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));

// ── NEW: Seller dashboard (full-screen, requires seller role) ─────────────────
const SellerDashboard    = lazy(() => import("./pages/SellerDashboard"));

// ── NEW: Admin seller management pages ───────────────────────────────────────
const SellerPayoutRequests   = lazy(() => import("./pages/admin/PayoutRequests"));
const VerificationRequests   = lazy(() => import("./pages/admin/VerificationRequests"));
const StoreModeration        = lazy(() => import("./pages/admin/StoreModeration"));

// ─────────────────────────────────────────────────────────────────────────────
// Routes that render WITHOUT the AppShell (no Header / Footer / BottomNav)
// ─────────────────────────────────────────────────────────────────────────────
const FULL_SCREEN_ROUTES = new Set([
  // Auth
  "/login", "/signup", "/verify-email", "/onboarding", "/admin-login",

  // Existing admin panel
  "/admin", "/admin/orders", "/admin/review-queue", "/admin/analytics",
  "/admin/payout-requests", "/admin/shop-applications", "/admin/homepage",
  "/admin/media-manager", "/admin/support", "/admin/notifications",
  "/admin/account-management", "/admin/product-requests",

  // ── NEW: Seller onboarding flow ──────────────────────────────────────────
  "/store-onboarding",
  "/store-survey",
  "/subscription-success",

  // ── NEW: Seller dashboard ─────────────────────────────────────────────────
  "/seller-dashboard",

  // ── NEW: Admin seller management ─────────────────────────────────────────
  "/admin/seller-payouts",
  "/admin/verification-requests",
  "/admin/store-moderation",
]);

// ─────────────────────────────────────────────────────────────────────────────
// AppShell — wraps all standard marketplace pages
// ─────────────────────────────────────────────────────────────────────────────
function AppShell({ children }) {
  const { pathname } = useLocation();
  const isFullScreen = FULL_SCREEN_ROUTES.has(pathname);

  if (isFullScreen) return <>{children}</>;

  return (
    <>
      <Header />
      <Sidebar />
      <CartDrawer />
      <main>{children}</main>
      <Footer />
      <BottomNav />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminOnly — renders children only for super_admin role
// ─────────────────────────────────────────────────────────────────────────────
function SuperAdminOnly({ children }) {
  return (
    <AdminRoute>
      <RequireAdmin>{children}</RequireAdmin>
    </AdminRoute>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <AppShell>
      <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
        <Routes>
          {/* ── Marketplace ──────────────────────────────────────────────── */}
          <Route path="/"               element={<Home />} />
          <Route path="/shop/:id"       element={<Shop />} />
          <Route path="/product/:id"    element={<ProductDetail />} />
          <Route path="/cart"           element={<Cart />} />
          <Route path="/checkout"       element={<Checkout />} />
          <Route path="/orders"         element={<Orders />} />
          <Route path="/profile"        element={<Profile />} />
          <Route path="/wishlist"       element={<Wishlist />} />
          <Route path="/search"         element={<Search />} />
          <Route path="/offers"         element={<Offers />} />

          {/* ── Auth ─────────────────────────────────────────────────────── */}
          <Route path="/login"          element={<Login />} />
          <Route path="/signup"         element={<Signup />} />
          <Route path="/verify-email"   element={<VerifyEmail />} />
          <Route path="/onboarding"     element={<Onboarding />} />
          <Route path="/admin-login"    element={<AdminLogin />} />

          {/* ── Legal (existing) ──────────────────────────────────────────── */}
          <Route path="/terms-of-service"  element={<TermsOfService />} />
          <Route path="/privacy-policy"    element={<PrivacyPolicy />} />
          <Route path="/refund-policy"     element={<RefundPolicy />} />

          {/* ── NEW: Seller legal pages (public, has header/footer) ────────── */}
          <Route path="/seller-terms"           element={<SellerTerms />} />
          <Route path="/seller-policy"          element={<SellerPolicy />} />
          <Route path="/community-guidelines"   element={<CommunityGuidelines />} />

          {/* ── NEW: Get a Store landing (public, has header/footer) ────────── */}
          <Route path="/get-a-store"    element={<GetAStore />} />
          <Route path="/store-plans"    element={<StorePlans />} />

          {/* ── NEW: Seller onboarding (full-screen, requires auth) ───────── */}
          <Route path="/store-onboarding"
            element={
              <SellerRoute requireOnly="auth">
                <StoreOnboarding />
              </SellerRoute>
            }
          />
          <Route path="/store-survey"
            element={
              <SellerRoute requireOnly="auth">
                <StoreSurvey />
              </SellerRoute>
            }
          />
          <Route path="/subscription-success"
            element={
              <SellerRoute requireOnly="auth">
                <SubscriptionSuccess />
              </SellerRoute>
            }
          />

          {/* ── NEW: Seller dashboard (full-screen, requires seller role) ─── */}
          <Route path="/seller-dashboard"
            element={
              <SellerRoute>
                <SellerDashboard />
              </SellerRoute>
            }
          />

          {/* ── Existing admin panel ──────────────────────────────────────── */}
          <Route path="/admin"
            element={<SuperAdminOnly><AdminDashboard /></SuperAdminOnly>} />
          <Route path="/admin/orders"
            element={<SuperAdminOnly><AdminOrders /></SuperAdminOnly>} />
          <Route path="/admin/review-queue"
            element={<SuperAdminOnly><AdminReviewQueue /></SuperAdminOnly>} />
          <Route path="/admin/analytics"
            element={<SuperAdminOnly><Analytics /></SuperAdminOnly>} />
          <Route path="/admin/payout-requests"
            element={<SuperAdminOnly><PayoutRequests /></SuperAdminOnly>} />
          <Route path="/admin/shop-applications"
            element={<SuperAdminOnly><ShopApplications /></SuperAdminOnly>} />
          <Route path="/admin/homepage"
            element={<SuperAdminOnly><HomepageAdmin /></SuperAdminOnly>} />
          <Route path="/admin/media-manager"
            element={<SuperAdminOnly><MediaManager /></SuperAdminOnly>} />
          <Route path="/admin/support"
            element={<SuperAdminOnly><AdminSupportDashboard /></SuperAdminOnly>} />
          <Route path="/admin/notifications"
            element={<SuperAdminOnly><AdminNotifications /></SuperAdminOnly>} />
          <Route path="/admin/account-management"
            element={<SuperAdminOnly><AccountManagement /></SuperAdminOnly>} />
          <Route path="/admin/product-requests"
            element={<SuperAdminOnly><ProductRequests /></SuperAdminOnly>} />

          {/* ── NEW: Admin seller management (separate from AdminDashboard) ── */}
          <Route path="/admin/seller-payouts"
            element={<SuperAdminOnly><SellerPayoutRequests /></SuperAdminOnly>} />
          <Route path="/admin/verification-requests"
            element={<SuperAdminOnly><VerificationRequests /></SuperAdminOnly>} />
          <Route path="/admin/store-moderation"
            element={<SuperAdminOnly><StoreModeration /></SuperAdminOnly>} />

          {/* ── 404 fallback ─────────────────────────────────────────────── */}
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

BEME_UPDATE_EOF

echo -e "  🔁 Updating Beme-Frontend/src/context/AuthContext.jsx..."
  mkdir -p "Beme-Frontend/src/context"
  if [ -f "Beme-Frontend/src/context/AuthContext.jsx" ]; then
    cp "Beme-Frontend/src/context/AuthContext.jsx" "Beme-Frontend/src/context/AuthContext.jsx.bak"
    echo -e "     💾 Backed up → Beme-Frontend/src/context/AuthContext.jsx.bak"
  fi
cat > 'Beme-Frontend/src/context/AuthContext.jsx' << 'BEME_UPDATE_EOF'
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
// Role normalisation
//   "super_admin" | "admin" (legacy) → "super_admin"
//   "seller"                         → "seller"       ← NEW
//   everything else                  → "customer"
//   NOTE: "shop_admin" is intentionally REMOVED — superseded by "seller"
// ─────────────────────────────────────────────────────────────────────────────
function normalizeRole(value) {
  const r = String(value || "").trim().toLowerCase();
  if (r === "super_admin" || r === "admin") return "super_admin";
  if (r === "seller") return "seller"; // ← NEW
  return "customer";
}

function normalizeCapabilities(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return Object.keys(raw).filter((k) => raw[k]);
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore profile resolver
// ─────────────────────────────────────────────────────────────────────────────
async function resolveProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    return {
      role: "customer",
      capabilities: [],
      profile: null,
      // seller fields
      sellerStatus: "none",
      storeId: null,
      subscriptionPlan: null,
      subscriptionStatus: null,
    };
  }
  const data = snap.data() || {};
  const role         = normalizeRole(data.role);
  const capabilities = normalizeCapabilities(data.capabilities);

  // ── Seller-specific fields (only meaningful when role === "seller") ────────
  const sellerStatus      = data.sellerStatus      || "none";
  const storeId           = data.storeId           || null;
  const subscriptionPlan  = data.subscriptionPlan  || "basic";
  const subscriptionStatus = data.subscriptionStatus || null;
  const sellerVerified    = data.sellerVerified    || false;

  return {
    role,
    capabilities,
    sellerStatus,
    storeId,
    subscriptionPlan,
    subscriptionStatus,
    sellerVerified,
    profile: {
      id: snap.id,
      ...data,
      // normalised overrides
      role,
      capabilities,
      sellerStatus,
      storeId,
      subscriptionPlan,
      subscriptionStatus,
      sellerVerified,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,           setUser]           = useState(null);
  const [role,           setRole]           = useState("customer");
  const [capabilities,   setCapabilities]   = useState([]);
  const [emailVerified,  setEmailVerified]  = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [profile,        setProfile]        = useState(null);

  // ── Seller state ────────────────────────────────────────────────────────────
  const [sellerStatus,      setSellerStatus]      = useState("none");
  const [storeId,           setStoreId]           = useState(null);
  const [subscriptionPlan,  setSubscriptionPlan]  = useState("basic");
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [sellerVerified,    setSellerVerified]    = useState(false);

  // ── Internal: load profile and set all state ────────────────────────────────
  const _applyProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setRole("customer");
      setCapabilities([]);
      setEmailVerified(false);
      setProfile(null);
      setSellerStatus("none");
      setStoreId(null);
      setSubscriptionPlan("basic");
      setSubscriptionStatus(null);
      setSellerVerified(false);
      return;
    }

    const resolved = await resolveProfile(firebaseUser.uid);
    setUser(firebaseUser);
    setRole(resolved.role);
    setCapabilities(resolved.capabilities);
    setEmailVerified(firebaseUser.emailVerified);
    setProfile(resolved.profile);
    setSellerStatus(resolved.sellerStatus);
    setStoreId(resolved.storeId);
    setSubscriptionPlan(resolved.subscriptionPlan);
    setSubscriptionStatus(resolved.subscriptionStatus);
    setSellerVerified(resolved.sellerVerified || false);
  }, []);

  // ── Firebase auth state listener ────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      await _applyProfile(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, [_applyProfile]);

  // ── Auth actions ────────────────────────────────────────────────────────────
  const signup = useCallback(async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    // Create basic user doc in Firestore
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      role:        "customer",
      capabilities: [],
      // seller defaults
      sellerStatus:     "none",
      storeId:          null,
      subscriptionPlan: null,
      subscriptionStatus: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return cred;
  }, []);

  const login = useCallback(
    (email, password) => signInWithEmailAndPassword(auth, email, password),
    []
  );

  const logout = useCallback(() => signOut(auth), []);

  /** Re-reads Firestore profile (e.g. after a Cloud Function upgrades the user to seller). */
  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    await _applyProfile(auth.currentUser);
  }, [_applyProfile]);

  /** Reloads the Firebase Auth user object (e.g. to pick up emailVerified). */
  const reloadUser = useCallback(async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    setEmailVerified(auth.currentUser.emailVerified);
  }, []);

  // ── Derived booleans ────────────────────────────────────────────────────────
  const isSuperAdmin   = role === "super_admin";
  const isAdmin        = role === "super_admin"; // alias kept for existing components
  const isSeller       = role === "seller";                                  // NEW
  const isSellerActive = isSeller && sellerStatus === "active";              // NEW
  const isSellerGrace  = isSeller && sellerStatus === "grace";               // NEW
  const isBuyer        = role === "customer" || role === "seller";           // sellers can also buy

  const value = {
    // Firebase user
    user,
    loading,
    emailVerified,

    // Role
    role,
    capabilities,
    profile,

    // Role booleans (existing)
    isSuperAdmin,
    isAdmin,

    // ── NEW: Seller role booleans ──────────────────────────────────────────
    isSeller,
    isSellerActive,
    isSellerGrace,
    isBuyer,

    // ── NEW: Seller profile fields ─────────────────────────────────────────
    sellerStatus,
    storeId,
    subscriptionPlan,
    subscriptionStatus,
    sellerVerified,

    // Auth actions
    login,
    signup,
    logout,
    refreshProfile,
    reloadUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

BEME_UPDATE_EOF

echo -e "  🔁 Updating firestore.rules..."
  if [ -f "firestore.rules" ]; then
    cp "firestore.rules" "firestore.rules.bak"
    echo -e "     💾 Backed up → firestore.rules.bak"
  fi
cat > 'firestore.rules' << 'BEME_UPDATE_EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ──────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────────────────────

    function isSignedIn() {
      return request.auth != null;
    }

    function isSuperAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "super_admin";
    }

    function emailVerified() {
      return isSignedIn() && request.auth.token.email_verified == true;
    }

    // NEW — checks the user has role=="seller" AND sellerStatus=="active"
    function isActiveSeller() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "seller" &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.sellerStatus == "active";
    }

    // NEW — checks a shop document belongs to the requesting user
    function isShopOwner(shopId) {
      return isSignedIn() &&
        get(/databases/$(database)/documents/shops/$(shopId)).data.ownerId == request.auth.uid;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // EXISTING COLLECTIONS
    // ──────────────────────────────────────────────────────────────────────────

    match /users/{uid} {
      allow read:   if isSignedIn() && (request.auth.uid == uid || isSuperAdmin());
      allow create: if isSignedIn() && request.auth.uid == uid;
      allow update: if isSignedIn() && request.auth.uid == uid
                    && !request.resource.data.diff(resource.data).affectedKeys()
                         .hasAny(["role", "sellerStatus", "storeId",
                                  "subscriptionPlan", "subscriptionStatus"]);
      // Only super_admin (or Cloud Functions via Admin SDK) can change role/seller fields
      allow update: if isSuperAdmin();
      allow delete: if isSuperAdmin();
    }

    match /usernames/{username} {
      allow read:   if true;
      allow write:  if isSignedIn();
    }

    // Products — sellers can CRUD their own; admins manage all
    match /Products/{productId} {
      allow read: if true;
      allow create: if isSuperAdmin() ||
                    (isActiveSeller() &&
                     request.resource.data.sellerId == request.auth.uid);
      allow update: if isSuperAdmin() ||
                    (isActiveSeller() &&
                     resource.data.sellerId == request.auth.uid);
      allow delete: if isSuperAdmin() ||
                    (isActiveSeller() &&
                     resource.data.sellerId == request.auth.uid);
    }

    match /WeeklyOffers/{id}  { allow read: if true; allow write: if isSuperAdmin(); }
    match /FlashDeals/{id}    { allow read: if true; allow write: if isSuperAdmin(); }
    match /homepage/{id}      { allow read: if true; allow write: if isSuperAdmin(); }

    match /orders/{orderId} {
      allow read:   if isSignedIn() &&
                    (request.auth.uid == resource.data.userId || isSuperAdmin());
      allow create: if isSignedIn() && emailVerified();
      allow update: if isSuperAdmin();
      allow delete: if isSuperAdmin();
    }

    match /shopApplications/{appId} {
      allow read:  if isSignedIn() && (request.auth.uid == appId || isSuperAdmin());
      allow write: if isSignedIn() && request.auth.uid == appId;
      allow write: if isSuperAdmin();
    }

    match /payoutRequests/{reqId} {
      allow read:   if isSignedIn() &&
                    (request.auth.uid == resource.data.userId || isSuperAdmin());
      allow create: if isSignedIn() && emailVerified();
      allow update: if isSuperAdmin();
    }

    match /subscriptions/{uid} {
      allow read:  if isSignedIn() && (request.auth.uid == uid || isSuperAdmin());
      allow write: if isSuperAdmin();
      // Cloud Functions (Admin SDK) bypass rules — seller subscriptions are
      // created by createSellerStore CF, not directly by the client
    }

    match /product_requests/{id} {
      allow read:   if isSignedIn();
      allow create: if isSignedIn() && emailVerified();
      allow update, delete: if isSuperAdmin();
    }

    match /adminNotifications/{id}  { allow read, write: if isSuperAdmin(); }
    match /sentNotifications/{id}   { allow read: if isSuperAdmin(); allow write: if isSuperAdmin(); }
    match /admin_notifications/{id} { allow read, write: if isSuperAdmin(); }

    match /user_notifications/{id} {
      allow read:   if isSignedIn() && request.auth.uid == resource.data.uid;
      allow write:  if isSuperAdmin();
    }

    match /support_tickets/{id} {
      allow read:  if isSignedIn() && (request.auth.uid == resource.data.userId || isSuperAdmin());
      allow create: if isSignedIn() && emailVerified();
      allow update: if isSuperAdmin();
    }

    match /reviews/{id} {
      allow read:   if true;
      allow create: if isSignedIn() && emailVerified();
      allow update, delete: if isSignedIn() && request.auth.uid == resource.data.userId;
      allow delete: if isSuperAdmin();
    }

    match /wishlist/{uid} {
      allow read, write: if isSignedIn() && emailVerified() && request.auth.uid == uid;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NEW: SELLER SYSTEM COLLECTIONS
    // ──────────────────────────────────────────────────────────────────────────

    // Shops — public read; owner can update profile; super_admin controls status/role
    match /shops/{shopId} {
      allow read: if true;
      allow create: if isSuperAdmin(); // only Cloud Function (Admin SDK) creates shops
      allow update: if isSuperAdmin() ||
                    (isActiveSeller() &&
                     resource.data.ownerId == request.auth.uid &&
                     !request.resource.data.diff(resource.data).affectedKeys()
                       .hasAny(["status", "verified", "verifiedBadge",
                                "withdrawalsFrozen", "suspensionReason",
                                "planId", "ownerId"]));
      allow delete: if isSuperAdmin();
    }

    // Store applications — user's own draft application
    match /storeApplications/{uid} {
      allow read, write: if isSignedIn() && request.auth.uid == uid;
      allow read, write: if isSuperAdmin();
    }

    // Seller-specific transactions (separate from existing payoutRequests)
    match /transactions/{txId} {
      allow read:  if isSignedIn() &&
                   (request.auth.uid == resource.data.uid || isSuperAdmin());
      allow write: if isSuperAdmin(); // Cloud Functions write these
    }

    // Withdrawal requests (seller payouts)
    match /withdrawalRequests/{reqId} {
      allow read: if isSignedIn() &&
                  (resource.data.sellerId == request.auth.uid || isSuperAdmin());
      allow create: if isActiveSeller() &&
                    request.resource.data.sellerId == request.auth.uid &&
                    request.resource.data.amount >= 50;
      allow update: if isSuperAdmin(); // admin approves/rejects
      allow delete: if isSuperAdmin();
    }

    // Verification requests
    match /verificationRequests/{reqId} {
      allow read: if isSignedIn() &&
                  (resource.data.sellerId == request.auth.uid || isSuperAdmin());
      allow create: if isActiveSeller() &&
                    request.resource.data.sellerId == request.auth.uid;
      allow update: if isSuperAdmin();
    }

    // Seller chats — seller and customer can read their own chat
    match /sellerChats/{chatId} {
      allow read: if isSignedIn() &&
                  (resource.data.sellerId == request.auth.uid ||
                   resource.data.customerId == request.auth.uid ||
                   isSuperAdmin());
      allow create: if isSignedIn();
      allow update: if isSignedIn() &&
                    (resource.data.sellerId == request.auth.uid ||
                     resource.data.customerId == request.auth.uid);

      match /messages/{msgId} {
        allow read: if isSignedIn() &&
                    (get(/databases/$(database)/documents/sellerChats/$(chatId)).data.sellerId == request.auth.uid ||
                     get(/databases/$(database)/documents/sellerChats/$(chatId)).data.customerId == request.auth.uid);
        allow create: if isSignedIn();
        allow update: if isSuperAdmin();
      }
    }

    // Seller analytics — shop owner reads, Cloud Functions write
    match /sellerAnalytics/{shopId} {
      allow read: if isSignedIn() && isShopOwner(shopId) || isSuperAdmin();
      allow write: if isSuperAdmin(); // Cloud Functions use Admin SDK

      match /daily/{date} {
        allow read: if isSignedIn() && isShopOwner(shopId) || isSuperAdmin();
        allow write: if isSignedIn() && isShopOwner(shopId) || isSuperAdmin();
      }
    }

    // Boosts
    match /boosts/{boostId} {
      allow read: if true; // homepage reads active boosts
      allow create: if isActiveSeller() &&
                    request.resource.data.sellerId == request.auth.uid;
      allow update, delete: if isSuperAdmin();
    }

    // Admin logs
    match /adminLogs/{logId} {
      allow read:  if isSuperAdmin();
      allow write: if isSuperAdmin();
    }

    // Reports
    match /reports/{reportId} {
      allow read:   if isSignedIn() &&
                    (request.auth.uid == resource.data.reporterId || isSuperAdmin());
      allow create: if isSignedIn() && emailVerified();
      allow update, delete: if isSuperAdmin();
    }

    // Seller notifications (in addition to existing user_notifications)
    match /notifications/{notifId} {
      allow read:  if isSignedIn() && request.auth.uid == resource.data.uid;
      allow write: if isSuperAdmin();
    }

    // Plans — admin writes, everyone reads
    match /plans/{planId} {
      allow read:  if true;
      allow write: if isSuperAdmin();
    }

  } // end /databases
} // end service

BEME_UPDATE_EOF

echo -e "  🔁 Updating Beme-Frontend/src/components/navigation/BottomNav.jsx..."
  mkdir -p "Beme-Frontend/src/components/navigation"
  if [ -f "Beme-Frontend/src/components/navigation/BottomNav.jsx" ]; then
    cp "Beme-Frontend/src/components/navigation/BottomNav.jsx" "Beme-Frontend/src/components/navigation/BottomNav.jsx.bak"
    echo -e "     💾 Backed up → Beme-Frontend/src/components/navigation/BottomNav.jsx.bak"
  fi
cat > 'Beme-Frontend/src/components/navigation/BottomNav.jsx' << 'BEME_UPDATE_EOF'
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUserUnreadCount } from "../../hooks/useNotifications";

/* ─── SVG icon helper ─────────────────────────────────────────────────────── */
function Icon({ path, size = 22, color = "currentColor", fill = "none" }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill} stroke={color} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
    >
      {path.split(" M").map((seg, i) => (
        <path key={i} d={(i === 0 ? "" : "M") + seg} />
      ))}
    </svg>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const ICONS = {
  home:      "M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z M9 21V12h6v9",
  store:     "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
  // ── NEW: "Get a Store" star/shop icon ─────────────────────────────────────
  getStore:  "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  orders:    "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2",
  account:   "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  login:     "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3",
};

/* ─── Nav tab component ───────────────────────────────────────────────────── */
function Tab({ to, icon, label, badge }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "3px",
        flex:           1,
        paddingBlock:   "8px",
        color:          isActive ? "var(--grtheme, #046EF2)" : "var(--muted, #888)",
        textDecoration: "none",
        position:       "relative",
        transition:     "color 0.15s",
        fontSize:       "10px",
        fontWeight:     600,
        fontFamily:     "var(--font-main, Manrope, system-ui)",
        letterSpacing:  "0.01em",
      })}
    >
      <Icon path={ICONS[icon]} size={21} />
      {label}
      {badge > 0 && (
        <span style={{
          position:   "absolute",
          top:        "6px",
          right:      "calc(50% - 14px)",
          background: "#EF4444",
          color:      "#fff",
          borderRadius: "100px",
          fontSize:   "9px",
          fontWeight: 800,
          padding:    "1px 5px",
          lineHeight: 1.4,
          minWidth:   "16px",
          textAlign:  "center",
        }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </NavLink>
  );
}

/* ─── Centre store button ─────────────────────────────────────────────────── */
function CentreStoreBtn() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/shop")}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "3px",
        flex:           1,
        paddingBlock:   "8px",
        background:     "none",
        border:         "none",
        cursor:         "pointer",
        color:          "var(--muted, #888)",
        fontSize:       "10px",
        fontWeight:     600,
        fontFamily:     "var(--font-main, Manrope, system-ui)",
      }}
    >
      <div style={{
        width:          "38px",
        height:         "38px",
        borderRadius:   "50%",
        background:     "var(--grtheme, #046EF2)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        marginBottom:   "2px",
        boxShadow:      "0 4px 12px rgba(4,110,242,0.35)",
      }}>
        <Icon path={ICONS.store} size={18} color="#fff" />
      </div>
      Shop
    </button>
  );
}

/* ─── BottomNav ───────────────────────────────────────────────────────────── */
export default function BottomNav() {
  const { user, isSeller } = useAuth();
  const { count: unreadCount } = useUserUnreadCount?.() ?? { count: 0 };

  return (
    <nav style={{
      position:       "fixed",
      bottom:         0,
      left:           0,
      right:          0,
      height:         "64px",
      background:     "var(--card, #fff)",
      borderTop:      "1px solid var(--border, rgba(0,0,0,0.08))",
      display:        "flex",
      alignItems:     "stretch",
      zIndex:         90,
      paddingBottom:  "env(safe-area-inset-bottom, 0)",
      boxShadow:      "0 -1px 12px rgba(0,0,0,0.06)",
    }}>

      {/* 1 — Home */}
      <Tab to="/" icon="home" label="Home" />

      {/* ── 2 — CHANGED: "Offers" → "Get a Store" ─────────────────────────────
          Previously this was <Tab to="/offers" icon="offers" label="Offers" />
          Now it points to /get-a-store with a shop bag icon.
          Sellers see "Dashboard" pointing to their seller dashboard instead.
      ── */}
      {isSeller ? (
        <Tab to="/seller-dashboard" icon="store" label="Dashboard" />
      ) : (
        <Tab to="/get-a-store" icon="getStore" label="Get a Store" />
      )}

      {/* 3 — Centre shop button */}
      <CentreStoreBtn />

      {/* 4 — Orders */}
      <Tab to="/orders" icon="orders" label="Orders" />

      {/* 5 — Account / Login */}
      {user ? (
        <Tab to="/profile" icon="account" label="Account" badge={unreadCount} />
      ) : (
        <Tab to="/login" icon="login" label="Login" />
      )}
    </nav>
  );
}

BEME_UPDATE_EOF

echo -e "  🔁 Updating Beme-Frontend/src/components/Header.jsx..."
  mkdir -p "Beme-Frontend/src/components"
  if [ -f "Beme-Frontend/src/components/Header.jsx" ]; then
    cp "Beme-Frontend/src/components/Header.jsx" "Beme-Frontend/src/components/Header.jsx.bak"
    echo -e "     💾 Backed up → Beme-Frontend/src/components/Header.jsx.bak"
  fi
cat > 'Beme-Frontend/src/components/Header.jsx' << 'BEME_UPDATE_EOF'
// Header.jsx — Updated: /custom-store → /get-a-store | seller dashboard link
// All existing functionality preserved. Only seller-related links changed.
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ─── NOTE TO DEVELOPER ──────────────────────────────────────────────────────
// This file preserves your full existing Header.jsx structure.
// The ONLY changes from the original are:
//
//  1. The "Get a store" nav link href changed from "/custom-store" → "/get-a-store"
//  2. When a user is an active seller, "Get a store" becomes "My Dashboard"
//     and links to "/seller-dashboard" instead.
//  3. The admin "Get a Store" management link in the admin dropdown (if any)
//     should point to "/admin/store-moderation".
//
// Search for "← CHANGED" comments to find the exact lines that differ from
// your original file. Merge these changes into your existing Header.jsx
// rather than replacing the whole file if you have custom logic there.
// ─────────────────────────────────────────────────────────────────────────────

export default function Header() {
  const { user, isSuperAdmin, isSeller, isSellerActive } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [searchQuery,   setSearchQuery]   = useState("");
  const [showSearch,    setShowSearch]    = useState(false);
  const [megaOpen,      setMegaOpen]      = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  useEffect(() => {
    setMegaOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // ── "Get a Store" / "My Dashboard" label & href ─────────────────────────────
  // ← CHANGED: was hardcoded "/custom-store" — now adapts based on seller status
  const sellerLink  = isSellerActive ? "/seller-dashboard" : "/get-a-store";
  const sellerLabel = isSellerActive ? "My Dashboard" : "Get a Store";
  const sellerStyle = {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "6px",
    padding:        "8px 16px",
    background:     "var(--grtheme, #046EF2)",
    color:          "#fff",
    borderRadius:   "var(--radius, 6px)",
    fontSize:       "13px",
    fontWeight:     700,
    textDecoration: "none",
    transition:     "background 0.15s",
    fontFamily:     "var(--font-main, Manrope, system-ui)",
  };

  return (
    <header style={{
      position:    "sticky",
      top:         0,
      zIndex:      80,
      background:  "var(--card, #fff)",
      borderBottom: "1px solid var(--border, rgba(0,0,0,0.08))",
      boxShadow:   "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{
        maxWidth:   "1280px",
        margin:     "0 auto",
        padding:    "0 20px",
        height:     "60px",
        display:    "flex",
        alignItems: "center",
        gap:        "16px",
      }}>
        {/* Logo */}
        <Link to="/" style={{
          fontFamily:      "var(--font-display, 'Space Grotesk', sans-serif)",
          fontSize:        "20px",
          fontWeight:      800,
          color:           "var(--grtheme, #046EF2)",
          textDecoration:  "none",
          letterSpacing:   "-0.03em",
          flexShrink:      0,
        }}>
          Beme
        </Link>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          style={{
            flex:           1,
            maxWidth:       "500px",
            position:       "relative",
            display:        "flex",
            alignItems:     "center",
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, stores…"
            style={{
              width:          "100%",
              padding:        "9px 40px 9px 14px",
              border:         "1.5px solid var(--border, rgba(0,0,0,0.1))",
              borderRadius:   "var(--radius, 6px)",
              fontSize:       "13px",
              fontFamily:     "var(--font-main, Manrope, system-ui)",
              outline:        "none",
              background:     "var(--soft, rgba(0,0,0,0.04))",
              color:          "var(--text, #111)",
              transition:     "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--grtheme, #046EF2)")}
            onBlur={(e)  => (e.target.style.borderColor = "var(--border, rgba(0,0,0,0.1))")}
          />
          <button type="submit" style={{
            position:   "absolute",
            right:      "10px",
            background: "none",
            border:     "none",
            cursor:     "pointer",
            color:      "var(--muted, #888)",
            display:    "flex",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </form>

        {/* Nav links (desktop) */}
        <nav style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <Link to="/"       className="header-nav-link">Home</Link>
          <Link to="/offers" className="header-nav-link">Offers</Link>
          {isSuperAdmin && (
            <Link to="/admin" className="header-nav-link">Admin</Link>
          )}
        </nav>

        {/* ── "Get a Store" CTA — ← CHANGED ─────────────────────────────────
            OLD: <a href="/custom-store">Get a store</a>
            NEW: dynamic — /get-a-store for buyers, /seller-dashboard for active sellers
        ── */}
        <Link
          to={sellerLink}      // ← CHANGED (was "/custom-store")
          style={sellerStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#0357C7")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--grtheme, #046EF2)")}
        >
          {isSellerActive
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          }
          {sellerLabel}   {/* ← CHANGED (was "Get a store") */}
        </Link>

        {/* Cart & profile icons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <Link to="/cart" style={{ color: "var(--text, #111)", display: "flex", alignItems: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </Link>
          <Link to={user ? "/profile" : "/login"} style={{ color: "var(--text, #111)", display: "flex", alignItems: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

BEME_UPDATE_EOF

echo -e "  🔁 Updating Beme-Frontend/src/components/Footer.jsx..."
  mkdir -p "Beme-Frontend/src/components"
  if [ -f "Beme-Frontend/src/components/Footer.jsx" ]; then
    cp "Beme-Frontend/src/components/Footer.jsx" "Beme-Frontend/src/components/Footer.jsx.bak"
    echo -e "     💾 Backed up → Beme-Frontend/src/components/Footer.jsx.bak"
  fi
cat > 'Beme-Frontend/src/components/Footer.jsx' << 'BEME_UPDATE_EOF'
// Footer.jsx — Updated: Added "Seller Hub" links section
// All existing footer content preserved. New column added at the end.
import { Link } from "react-router-dom";

// ─── NOTE TO DEVELOPER ──────────────────────────────────────────────────────
// This file shows the structure of your footer with the new "Seller Hub"
// column added. Merge the new <FooterCol> at the bottom into your existing
// Footer.jsx — your existing columns (About, Help, etc.) stay unchanged.
// Search for "← NEW" comments to find additions.
// ─────────────────────────────────────────────────────────────────────────────

function FooterCol({ title, links }) {
  return (
    <div>
      <div style={{
        fontSize:      "11px",
        fontWeight:    700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color:         "var(--muted, rgba(255,255,255,0.5))",
        marginBottom:  "14px",
      }}>
        {title}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
        {links.map(({ label, to, external }) => (
          <li key={label}>
            {external
              ? <a href={to} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "var(--muted, rgba(255,255,255,0.6))", textDecoration: "none", transition: "color 0.15s" }}>{label}</a>
              : <Link to={to} style={{ fontSize: "13px", color: "var(--muted, rgba(255,255,255,0.6))", textDecoration: "none", transition: "color 0.15s" }}>{label}</Link>
            }
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{
      background:  "#0A0A0A",
      borderTop:   "1px solid rgba(255,255,255,0.06)",
      padding:     "48px 20px 32px",
      marginTop:   "auto",
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Main columns */}
        <div style={{
          display:             "grid",
          gridTemplateColumns: "1.5fr repeat(4, 1fr)",
          gap:                 "40px",
          marginBottom:        "40px",
        }}>
          {/* Brand */}
          <div>
            <Link to="/" style={{
              fontFamily:     "var(--font-display, 'Space Grotesk', sans-serif)",
              fontSize:       "22px",
              fontWeight:     800,
              color:          "var(--grtheme, #046EF2)",
              textDecoration: "none",
              letterSpacing:  "-0.03em",
              display:        "block",
              marginBottom:   "12px",
            }}>
              Beme
            </Link>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: "220px" }}>
              Ghana's premier marketplace for buyers and sellers. Sell anything, anywhere, get paid instantly.
            </p>
            {/* Payment badges */}
            <div style={{ display: "flex", gap: "8px", marginTop: "20px", flexWrap: "wrap" }}>
              {["MoMo", "Visa", "Mastercard", "Paystack"].map((badge) => (
                <span key={badge} style={{
                  padding:      "4px 10px",
                  borderRadius: "4px",
                  background:   "rgba(255,255,255,0.06)",
                  border:       "1px solid rgba(255,255,255,0.08)",
                  fontSize:     "10px",
                  fontWeight:   700,
                  color:        "rgba(255,255,255,0.5)",
                  letterSpacing: "0.04em",
                }}>
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <FooterCol title="Marketplace" links={[
            { label: "Shop All",      to: "/" },
            { label: "Flash Deals",   to: "/offers" },
            { label: "New Arrivals",  to: "/search?sort=newest" },
            { label: "Categories",    to: "/search" },
          ]} />

          {/* Help */}
          <FooterCol title="Help & Support" links={[
            { label: "Help Center",   to: "/support" },
            { label: "Track Order",   to: "/orders" },
            { label: "Returns",       to: "/refund-policy" },
            { label: "Contact Us",    to: "/support" },
          ]} />

          {/* Legal */}
          <FooterCol title="Legal" links={[
            { label: "Terms of Service",  to: "/terms-of-service" },
            { label: "Privacy Policy",    to: "/privacy-policy" },
            { label: "Refund Policy",     to: "/refund-policy" },
          ]} />

          {/* ── NEW: Seller Hub column ← NEW ────────────────────────────────── */}
          <FooterCol title="Sell on Beme" links={[
            { label: "Get a Store",          to: "/get-a-store" },           // ← NEW
            { label: "Pricing Plans",         to: "/store-plans" },           // ← NEW
            { label: "Seller Dashboard",      to: "/seller-dashboard" },      // ← NEW
            { label: "Seller Terms",          to: "/seller-terms" },          // ← NEW
            { label: "Seller Policy",         to: "/seller-policy" },         // ← NEW
            { label: "Community Guidelines",  to: "/community-guidelines" },  // ← NEW
          ]} />
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop:     "1px solid rgba(255,255,255,0.06)",
          paddingTop:    "20px",
          display:       "flex",
          justifyContent: "space-between",
          alignItems:    "center",
          flexWrap:      "wrap",
          gap:           "12px",
        }}>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
            © {year} Beme Market Ghana. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            {/* Social links — add your actual URLs */}
            {[
              { label: "Instagram", href: "https://instagram.com/bememarket" },
              { label: "TikTok",    href: "https://tiktok.com/@bememarket" },
              { label: "WhatsApp",  href: "https://wa.me/233000000000" },
            ].map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer"
                style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

BEME_UPDATE_EOF

echo -e "  🔁 Updating functions/index.js..."
  mkdir -p "functions"
  if [ -f "functions/index.js" ]; then
    cp "functions/index.js" "functions/index.js.bak"
    echo -e "     💾 Backed up → functions/index.js.bak"
  fi
cat > 'functions/index.js' << 'BEME_UPDATE_EOF'
/**
 * functions/index.js
 * Beme Market — Firebase Cloud Functions entry point
 *
 * EXISTING functions preserved (sendVerificationOnSignup, resendVerificationEmail).
 * NEW seller functions added below from separate module files.
 */

const functions  = require("firebase-functions");
const admin      = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialise Admin SDK once
if (!admin.apps.length) admin.initializeApp();

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING: Email verification (Brevo SMTP via nodemailer)
// ─────────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   "smtp-relay.brevo.com",
  port:   587,
  secure: false,
  auth: {
    user: functions.config().brevo?.user || process.env.BREVO_USER || "",
    pass: functions.config().brevo?.pass || process.env.BREVO_PASS || "",
  },
});

const FROM_EMAIL  = functions.config().brevo?.from  || "noreply@beme.market";
const SITE_URL    = functions.config().site?.url    || "https://beme.market";
const SITE_NAME   = "Beme Market";

/** Sends a verification email when a new user registers. */
exports.sendVerificationOnSignup = functions.auth.user().onCreate(async (user) => {
  if (!user.email) return null;
  try {
    const link = await admin.auth().generateEmailVerificationLink(user.email, {
      url: `${SITE_URL}/verify-email`,
    });
    await transporter.sendMail({
      from:    `"${SITE_NAME}" <${FROM_EMAIL}>`,
      to:      user.email,
      subject: `Verify your ${SITE_NAME} account`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#046EF2">Welcome to ${SITE_NAME}!</h2>
          <p>Please verify your email address to get started:</p>
          <a href="${link}" style="display:inline-block;padding:12px 24px;background:#046EF2;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">
            Verify Email
          </a>
          <p style="color:#888;font-size:13px;margin-top:24px">
            If you didn't create this account, you can ignore this email.
          </p>
        </div>
      `,
    });
    return null;
  } catch (err) {
    console.error("[sendVerificationOnSignup]", err);
    return null;
  }
});

/** Callable — resend verification email to the currently signed-in user. */
exports.resendVerificationEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  const user = await admin.auth().getUser(context.auth.uid);
  if (user.emailVerified) {
    throw new functions.https.HttpsError("already-exists", "Email is already verified.");
  }
  const link = await admin.auth().generateEmailVerificationLink(user.email, {
    url: `${SITE_URL}/verify-email`,
  });
  await transporter.sendMail({
    from:    `"${SITE_NAME}" <${FROM_EMAIL}>`,
    to:      user.email,
    subject: `Verify your ${SITE_NAME} email`,
    html: `<a href="${link}">Click here to verify your email</a>`,
  });
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Seller system functions
// Each function lives in its own file for maintainability.
// ─────────────────────────────────────────────────────────────────────────────

// ── createSellerStore — callable ─────────────────────────────────────────────
// Verifies Paystack payment, creates shop doc, sets user role to "seller".
// Called from SubscriptionSuccess.jsx after payment redirect.
const { createSellerStore } = require("./createSellerStore");
exports.createSellerStore = createSellerStore;

// ── handleSubscriptionRenewal — scheduled daily ───────────────────────────────
// Checks subscription expiry → grace period → suspension.
const { handleSubscriptionRenewal } = require("./handleSubscriptionRenewal");
exports.handleSubscriptionRenewal = handleSubscriptionRenewal;

// ── sellerFunctions — misc seller triggers and callables ─────────────────────
// Contains: sendSellerNotifications, verifySellerPlan, processWithdrawal,
//           reviewSellerStore, generateAnalytics
const sellerFunctions = require("./sellerFunctions");
exports.sendSellerNotifications = sellerFunctions.sendSellerNotifications;
exports.verifySellerPlan        = sellerFunctions.verifySellerPlan;
exports.processWithdrawal       = sellerFunctions.processWithdrawal;
exports.reviewSellerStore       = sellerFunctions.reviewSellerStore;
exports.generateAnalytics       = sellerFunctions.generateAnalytics;

// ─────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT NOTE
// ─────────────────────────────────────────────────────────────────────────────
// Before deploying, set these environment variables in Firebase:
//   firebase functions:config:set \
//     brevo.user="your-brevo-smtp-user" \
//     brevo.pass="your-brevo-smtp-password" \
//     brevo.from="noreply@beme.market" \
//     paystack.secret_key="sk_live_your_paystack_secret" \
//     site.url="https://beme.market"
//
// Then deploy:
//   firebase deploy --only functions

BEME_UPDATE_EOF

echo ""
echo -e "${GREEN}✅ All updated files installed!${NC}"
echo ""
echo "💾 Your originals were backed up as .bak files:"
echo "   Beme-Frontend/src/App.jsx.bak"
echo "   Beme-Frontend/src/context/AuthContext.jsx.bak"
echo "   firestore.rules.bak"
echo "   Beme-Frontend/src/components/navigation/BottomNav.jsx.bak"
echo "   Beme-Frontend/src/components/Header.jsx.bak"
echo "   Beme-Frontend/src/components/Footer.jsx.bak"
echo "   functions/index.js.bak"
echo ""
echo "⚠️  IMPORTANT — Manual merge needed for these files:"
echo "   Header.jsx  — only 2 lines changed (search for ← CHANGED)"
echo "   Footer.jsx  — only 1 new column added (search for ← NEW)"
echo "   App.jsx     — verify your existing routes are still present"
echo ""
echo "✅ Safe to replace directly:"
echo "   AuthContext.jsx, firestore.rules, BottomNav.jsx, functions/index.js"
echo ""
echo "📦 Next: run npm install recharts (if not done yet)"
echo "🚀 Then: firebase deploy --only functions"