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

