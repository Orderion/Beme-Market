import { useState, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import AdminRoute from "./components/AdminRoute";
import RequireAdmin from "./components/auth/RequireAdmin";
import SellerRoute from "./components/SellerRoute";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import LoaderOverlay from "./components/LoaderOverlay";
import BottomNav from "./components/navigation/BottomNav.jsx";

/* ── PUBLIC PAGES ── */
import Home            from "./pages/Home";
import Chat from "./pages/Chat";
import Shop            from "./pages/Shop";
import Chat from "./pages/Chat";
import Offers          from "./pages/Offers";
import Chat from "./pages/Chat";
import ProductDetails  from "./pages/ProductDetails";
import Chat from "./pages/Chat";
import Checkout        from "./pages/Checkout";
import Chat from "./pages/Chat";
import OrderSuccess    from "./pages/OrderSuccess";
import Chat from "./pages/Chat";
import Orders          from "./pages/Orders";
import Chat from "./pages/Chat";
import FlashDeals      from "./pages/FlashDeals";
import Chat from "./pages/Chat";

/* ── AUTH ── */
import Login      from "./pages/Login";
import Chat from "./pages/Chat";
import Signup     from "./pages/Signup";
import Chat from "./pages/Chat";
import VerifyEmail from "./pages/VerifyEmail";
import Chat from "./pages/Chat";
import Onboarding  from "./pages/Onboarding";
import Chat from "./pages/Chat";
import AdminLogin  from "./pages/AdminLogin";
import Chat from "./pages/Chat";

/* ── ADMIN ── */
import AdminDashboard        from "./pages/AdminDashboard";
import Chat from "./pages/Chat";
import Admin                 from "./pages/Admin";
import Chat from "./pages/Chat";
import AdminOrders           from "./pages/AdminOrders";
import Chat from "./pages/Chat";
import AdminReviewQueue      from "./pages/AdminReviewQueue";
import Chat from "./pages/Chat";
import Analytics             from "./pages/Analytics";
import Chat from "./pages/Chat";
import PayoutRequests        from "./pages/PayoutRequests";
import Chat from "./pages/Chat";
import ShopApplications      from "./pages/ShopApplications";
import Chat from "./pages/Chat";
import ShopOwnerApply        from "./pages/ShopOwnerApply";
import Chat from "./pages/Chat";
import HomepageAdmin         from "./pages/admin/HomepageAdmin";
import Chat from "./pages/Chat";
import MediaManager          from "./pages/admin/MediaManager";
import Chat from "./pages/Chat";
import AdminSupportDashboard from "./pages/admin/AdminSupportDashboard";
import Chat from "./pages/Chat";
import AdminNotifications    from "./pages/admin/AdminNotifications";
import Chat from "./pages/Chat";

/* ── LEGAL / INFO ── */
import About           from "./pages/About";
import Chat from "./pages/Chat";
import Support         from "./pages/Support";
import Chat from "./pages/Chat";
import Contact         from "./pages/Contact";
import Chat from "./pages/Chat";
import FAQ             from "./pages/FAQ";
import Chat from "./pages/Chat";
import ShippingReturns from "./pages/ShippingReturns";
import Chat from "./pages/Chat";
import PrivacyPolicy   from "./pages/PrivacyPolicy";
import Chat from "./pages/Chat";
import TermsOfService  from "./pages/TermsOfService";
import Chat from "./pages/Chat";
import RefundPolicy    from "./pages/RefundPolicy";
import Chat from "./pages/Chat";
import CookiePolicy    from "./pages/CookiePolicy";
import Chat from "./pages/Chat";

/* ── ACCOUNT ── */
import Account           from "./pages/Account";
import Chat from "./pages/Chat";
import ManageAccount     from "./pages/ManageAccount";
import Chat from "./pages/Chat";
import PaymentMethods    from "./pages/PaymentMethods";
import Chat from "./pages/Chat";
import AccountManagement from "./pages/AccountManagement";
import Chat from "./pages/Chat";
import { SavedItems, Notifications, HelpSupport, ContactUs } from "./pages/AccountSubPages";
import Chat from "./pages/Chat";
import UserRequests      from "./pages/UserRequests";
import Chat from "./pages/Chat";
import ProductRequests   from "./pages/ProductRequests";
import Chat from "./pages/Chat";

/* ── SELLER PUBLIC ── */
import GetAStore           from "./pages/GetAStore";
import Chat from "./pages/Chat";
import StorePlans          from "./pages/StorePlans";
import Chat from "./pages/Chat";
import SellerTerms         from "./pages/SellerTerms";
import Chat from "./pages/Chat";
import SellerPolicy        from "./pages/SellerPolicy";
import Chat from "./pages/Chat";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import Chat from "./pages/Chat";

/* ── SELLER ONBOARDING + DASHBOARD ── */
import StoreOnboarding      from "./pages/StoreOnboarding";
import Chat from "./pages/Chat";
import StoreSurvey          from "./pages/StoreSurvey";
import Chat from "./pages/Chat";
import SubscriptionSuccess  from "./pages/SubscriptionSuccess";
import Chat from "./pages/Chat";
import SellerDashboard      from "./pages/SellerDashboard";
import Chat from "./pages/Chat";

/* ── SELLER PRODUCT DETAIL ── */
import DashboardProductDetail from "./pages/dashboard/DashboardProductDetail";
import Chat from "./pages/Chat";

/* ── PUBLIC STOREFRONT ── */
import StoreFront from "./pages/StoreFront";
import Chat from "./pages/Chat";

/* ── ADMIN SELLER MANAGEMENT ── */
import SellerPayoutRequests  from "./pages/admin/PayoutRequests";
import Chat from "./pages/Chat";
import VerificationRequests  from "./pages/admin/VerificationRequests";
import Chat from "./pages/Chat";
import StoreModeration       from "./pages/admin/StoreModeration";
import Chat from "./pages/Chat";

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

function SuperAdminOnly({ children }) {
  const { loading, isSuperAdmin } = useAuth();
  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/" replace/>;
  return children;
}

/* ════════════════════════════════════════════════════════════
   RequireVerified
   FIX for Issue 2: unverified users who open a new tab can
   see the site as "logged in". This guard catches any attempt
   to access account/seller routes before email is verified
   and redirects them to /verify-email.

   Routes that are EXEMPT (always accessible):
   - Public pages, legal, auth pages, storefronts
   Routes that REQUIRE verification:
   - /account/*, /saved, /orders, /order-success
   - /seller-dashboard*, /store-onboarding, /store-survey
════════════════════════════════════════════════════════════ */
const VERIFY_REQUIRED_PREFIXES = [
  "/account",
  "/saved",
  "/orders",
  "/order-success",
  "/seller-dashboard",
  "/store-onboarding",
  "/store-survey",
  "/subscription-success",
  "/onboarding",
];

function RequireVerified({ children }) {
  const { user, emailVerified, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  // Not logged in at all — let other guards handle it
  if (!user) return children;

  // Admins bypass email verification requirement
  // (they're already verified via Firebase Admin)

  // Check if current route requires verification
  const needsVerification = VERIFY_REQUIRED_PREFIXES.some(prefix =>
    location.pathname.startsWith(prefix)
  );

  if (needsVerification && !emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return children;
}

/* ─── FULL-SCREEN PATHS (hide header / footer / bottom nav) ─── */
const FULL_SCREEN_ROUTES = new Set([
  "/login",
  "/signup",
  "/verify-email",
  "/admin-login",
  "/onboarding",
  "/admin",
  "/admin/product-manager",
  "/admin/homepage",
  "/admin/support",
  "/admin/media",
  "/admin/product-requests",
  "/admin/notifications",
  "/admin-orders",
  "/admin-review-queue",
  "/analytics",
  "/payout-requests",
  "/shop-applications",
  "/account-management",
  "/store-onboarding",
  "/store-survey",
  "/subscription-success",
  "/seller-dashboard",
  "/admin/seller-payouts",
  "/admin/verification-requests",
  "/admin/store-moderation",
]);

function isFullScreen(pathname) {
  if (FULL_SCREEN_ROUTES.has(pathname)) return true;
  if (pathname.startsWith("/seller-dashboard/products/")) return true;
  return false;
}

/* ─── APP SHELL ─── */
function AppShell() {
  const location = useLocation();
  const { loading: authLoading } = useAuth();

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [cartOpen,     setCartOpen]     = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  const shouldHideHeader = isFullScreen(location.pathname);
  const shouldHideFooter =
    shouldHideHeader ||
    location.pathname.startsWith("/account") ||
    location.pathname === "/account";

  useEffect(() => {
    setRouteLoading(true);
    const t = setTimeout(() => setRouteLoading(false), 300);
    return () => clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
    setCartOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <>
      <LoaderOverlay isVisible={authLoading || routeLoading}/>

      {!shouldHideHeader && (
        <>
          <Header onMenu={() => setSidebarOpen(true)} onCart={() => setCartOpen(true)}/>
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
          <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)}/>
        </>
      )}

      {/* RequireVerified wraps all routes — redirects unverified users
          away from protected paths to /verify-email                    */}
      <RequireVerified>
        <main key={location.pathname} className="route-shell">
          <Routes>

            {/* ── PUBLIC ── */}
            <Route path="/"              element={<Home/>}/>
            <Route path="/shop"          element={<Shop/>}/>
            <Route path="/offers"        element={<Offers/>}/>
            <Route path="/flash-deals"   element={<FlashDeals/>}/>
            <Route path="/product/:id"   element={<ProductDetails/>}/>
            <Route path="/checkout"      element={<Checkout/>}/>
            <Route path="/order-success" element={<OrderSuccess/>}/>
            <Route path="/orders"        element={<Orders/>}/>

            {/* ── AUTH ── */}
            <Route path="/login"        element={<Login/>}/>
            <Route path="/signup"       element={<Signup/>}/>
            <Route path="/verify-email" element={<VerifyEmail/>}/>
            <Route path="/onboarding"   element={<Onboarding/>}/>
            <Route path="/admin-login"  element={<AdminLogin/>}/>

            {/* ── ACCOUNT ── */}
            <Route path="/account"               element={<Account/>}/>
            <Route path="/account/manage"        element={<ManageAccount/>}/>
            <Route path="/account/payments"      element={<PaymentMethods hasCompletedOrder={false}/>}/>
            <Route path="/account/notifications" element={<Notifications/>}/>
            <Route path="/account/help"          element={<HelpSupport/>}/>
            <Route path="/account/contact"       element={<ContactUs/>}/>
            <Route path="/saved"                 element={<SavedItems/>}/>
            <Route path="/account/requests"      element={<UserRequests/>}/>

            {/* ── LEGAL ── */}
            <Route path="/about"            element={<About/>}/>
            <Route path="/support"          element={<Support/>}/>
            <Route path="/contact"          element={<Contact/>}/>
            <Route path="/faq"              element={<FAQ/>}/>
            <Route path="/shipping-returns" element={<ShippingReturns/>}/>
            <Route path="/privacy-policy"   element={<PrivacyPolicy/>}/>
            <Route path="/terms-of-service" element={<TermsOfService/>}/>
            <Route path="/refund-policy"    element={<RefundPolicy/>}/>
            <Route path="/cookie-policy"    element={<CookiePolicy/>}/>

            {/* ── SELLER PUBLIC ── */}
            <Route path="/get-a-store"          element={<GetAStore/>}/>
            <Route path="/store-plans"          element={<StorePlans/>}/>
            <Route path="/seller-terms"         element={<SellerTerms/>}/>
            <Route path="/seller-policy"        element={<SellerPolicy/>}/>
            <Route path="/community-guidelines" element={<CommunityGuidelines/>}/>

            {/* ── PUBLIC STOREFRONT ── */}
            <Route path="/store/:storeSlug" element={<StoreFront/>}/>

            {/* ── SELLER ONBOARDING ── */}
            <Route path="/store-onboarding"
              element={<SellerRoute requireOnly="auth"><StoreOnboarding/></SellerRoute>}/>
            <Route path="/store-survey"
              element={<SellerRoute requireOnly="auth"><StoreSurvey/></SellerRoute>}/>
            <Route path="/subscription-success"
              element={<SellerRoute requireOnly="auth"><SubscriptionSuccess/></SellerRoute>}/>

            {/* ── SELLER DASHBOARD ── */}
            <Route path="/seller-dashboard" element={<SellerDashboard/>}/>

            {/* ── SELLER PRODUCT ADD / EDIT ── */}
            <Route path="/seller-dashboard/products/new"
              element={<SellerRoute requireOnly="auth"><DashboardProductDetail/></SellerRoute>}/>
            <Route path="/seller-dashboard/products/:productId"
              element={<SellerRoute requireOnly="auth"><DashboardProductDetail/></SellerRoute>}/>

            {/* ── ADMIN ── */}
            <Route path="/admin"
              element={<AdminRoute><RequireAdmin><AdminDashboard/></RequireAdmin></AdminRoute>}/>
            <Route path="/admin/product-manager"
              element={<AdminRoute><RequireAdmin><Admin/></RequireAdmin></AdminRoute>}/>
            <Route path="/admin-orders"
              element={<AdminRoute><RequireAdmin><AdminOrders/></RequireAdmin></AdminRoute>}/>
            <Route path="/admin-review-queue"
              element={<AdminRoute><RequireAdmin><AdminReviewQueue/></RequireAdmin></AdminRoute>}/>
            <Route path="/analytics"
              element={<AdminRoute><RequireAdmin><Analytics/></RequireAdmin></AdminRoute>}/>
            <Route path="/payout-requests"
              element={<AdminRoute><RequireAdmin><PayoutRequests/></RequireAdmin></AdminRoute>}/>
            <Route path="/shop-applications"
              element={<AdminRoute><RequireAdmin><ShopApplications/></RequireAdmin></AdminRoute>}/>
            <Route path="/account-management"
              element={<AdminRoute><RequireAdmin><AccountManagement/></RequireAdmin></AdminRoute>}/>
            <Route path="/admin/homepage"
              element={<AdminRoute><RequireAdmin><HomepageAdmin/></RequireAdmin></AdminRoute>}/>
            <Route path="/admin/product-requests"
              element={<AdminRoute><RequireAdmin><ProductRequests/></RequireAdmin></AdminRoute>}/>
            <Route path="/admin/media"
              element={<AdminRoute><RequireAdmin><MediaManager/></RequireAdmin></AdminRoute>}/>
            <Route path="/admin/support"
              element={<AdminRoute><RequireAdmin><AdminSupportDashboard/></RequireAdmin></AdminRoute>}/>
            <Route path="/admin/notifications"
              element={<AdminRoute><RequireAdmin><AdminNotifications/></RequireAdmin></AdminRoute>}/>
            <Route path="/admin/seller-payouts"
              element={<AdminRoute><RequireAdmin><SellerPayoutRequests/></RequireAdmin></AdminRoute>}/>
            <Route path="/admin/verification-requests"
              element={<AdminRoute><RequireAdmin><VerificationRequests/></RequireAdmin></AdminRoute>}/>
            <Route path="/admin/store-moderation"
              element={<AdminRoute><RequireAdmin><StoreModeration/></RequireAdmin></AdminRoute>}/>

            {/* ── SUPER ADMIN ONLY ── */}
            <Route path="/own-a-shop"
              element={<SuperAdminOnly><ShopOwnerApply/></SuperAdminOnly>}/>

            {/* ── FALLBACK ── */}
            <Route path="*" element={<Navigate to="/" replace/>}/>

            <Route path="/messages" element={<Chat />} />
</Routes>
        </main>
      </RequireVerified>

      {!shouldHideFooter && <Footer/>}
      {!shouldHideHeader && <BottomNav/>}
    </>
  );
}

export default function App() {
  return <AppShell/>;
}