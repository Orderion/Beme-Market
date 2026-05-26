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
import Shop            from "./pages/Shop";
import Offers          from "./pages/Offers";
import ProductDetails  from "./pages/ProductDetails";
import Checkout        from "./pages/Checkout";
import OrderSuccess    from "./pages/OrderSuccess";
import Orders          from "./pages/Orders";
import FlashDeals      from "./pages/FlashDeals";
import Chat            from "./pages/Chat";

/* ── AUTH ── */
import Login      from "./pages/Login";
import Signup     from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import Onboarding  from "./pages/Onboarding";
import AdminLogin  from "./pages/AdminLogin";

/* ── ADMIN ── */
import AdminDashboard        from "./pages/AdminDashboard";
import Admin                 from "./pages/Admin";
import AdminOrders           from "./pages/AdminOrders";
import AdminReviewQueue      from "./pages/AdminReviewQueue";
import Analytics             from "./pages/Analytics";
import PayoutRequests        from "./pages/PayoutRequests";
import ShopApplications      from "./pages/ShopApplications";
import ShopOwnerApply        from "./pages/ShopOwnerApply";
import HomepageAdmin         from "./pages/admin/HomepageAdmin";
import MediaManager          from "./pages/admin/MediaManager";
import AdminSupportDashboard from "./pages/admin/AdminSupportDashboard";
import AdminNotifications    from "./pages/admin/AdminNotifications";

/* ── LEGAL / INFO ── */
import About           from "./pages/About";
import Support         from "./pages/Support";
import Contact         from "./pages/Contact";
import FAQ             from "./pages/FAQ";
import ShippingReturns from "./pages/ShippingReturns";
import PrivacyPolicy   from "./pages/PrivacyPolicy";
import TermsOfService  from "./pages/TermsOfService";
import RefundPolicy    from "./pages/RefundPolicy";
import CookiePolicy    from "./pages/CookiePolicy";

/* ── ACCOUNT ── */
import Account           from "./pages/Account";
import ManageAccount     from "./pages/ManageAccount";
import PaymentMethods    from "./pages/PaymentMethods";
import AccountManagement from "./pages/AccountManagement";
import { SavedItems, Notifications, HelpSupport, ContactUs } from "./pages/AccountSubPages";
import UserRequests      from "./pages/UserRequests";
import ProductRequests   from "./pages/ProductRequests";

/* ── SELLER PUBLIC ── */
import GetAStore           from "./pages/GetAStore";
import StorePlans          from "./pages/StorePlans";
import SellerTerms         from "./pages/SellerTerms";
import SellerPolicy        from "./pages/SellerPolicy";
import CommunityGuidelines from "./pages/CommunityGuidelines";

/* ── SELLER ONBOARDING + DASHBOARD ── */
import StoreOnboarding      from "./pages/StoreOnboarding";
import StoreSurvey          from "./pages/StoreSurvey";
import SubscriptionSuccess  from "./pages/SubscriptionSuccess";
import SubscriptionCallback from "./pages/SubscriptionCallback";
import ResetPassword     from "./pages/ResetPassword";
import SellerDashboard      from "./pages/SellerDashboard";

/* ── SELLER PRODUCT DETAIL ── */
import DashboardProductDetail from "./pages/dashboard/DashboardProductDetail";

/* ── PUBLIC STOREFRONT ── */
import StoreFront from "./pages/StoreFront";

/* ── ADMIN SELLER MANAGEMENT ── */
import SellerPayoutRequests  from "./pages/admin/PayoutRequests";
import VerificationRequests  from "./pages/admin/VerificationRequests";
import StoreModeration       from "./pages/admin/StoreModeration";

function SuperAdminOnly({ children }) {
  const { loading, isSuperAdmin } = useAuth();
  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/" replace/>;
  return children;
}

const VERIFY_REQUIRED_PREFIXES = [
  "/account",
  "/saved",
  "/orders",
  "/order-success",
  "/seller-dashboard",
  "/store-onboarding",
  "/store-survey",
  "/subscription-success",
  "/subscription/success",
  "/onboarding",
];

function RequireVerified({ children }) {
  const { user, emailVerified, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return children;
  const needsVerification = VERIFY_REQUIRED_PREFIXES.some(prefix =>
    location.pathname.startsWith(prefix)
  );
  if (needsVerification && !emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  return children;
}

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
  "/subscription/callback",
  "/reset-password",
  "/subscription/success",
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
            <Route path="/messages"      element={<Chat/>}/>

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

            {/* ── SUBSCRIPTION FLOW ── */}
            <Route path="/subscription-success"
              element={<SellerRoute requireOnly="auth"><SubscriptionSuccess/></SellerRoute>}/>
            <Route path="/subscription/callback" element={<SubscriptionCallback/>}/>
            <Route path="/reset-password"        element={<ResetPassword/>}/>
            <Route path="/subscription/success"  element={<SubscriptionSuccess/>}/>

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
