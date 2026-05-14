import { useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import { useAuth } from "./context/AuthContext";

import AdminRoute from "./components/AdminRoute";
import RequireAdmin from "./components/auth/RequireAdmin";
import SellerRoute from "./components/SellerRoute"; // ← NEW

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import LoaderOverlay from "./components/LoaderOverlay";
import BottomNav from "./components/navigation/BottomNav.jsx";

/* PAGES — existing (untouched) */
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Offers from "./pages/Offers";
import ProductDetails from "./pages/ProductDetails";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import FlashDeals from "./pages/FlashDeals";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import Onboarding from "./pages/Onboarding";
import AdminLogin from "./pages/AdminLogin";

/* Admin pages — existing (untouched) */
import AdminDashboard from "./pages/AdminDashboard";
import Admin from "./pages/Admin";
import AdminOrders from "./pages/AdminOrders";
import AdminReviewQueue from "./pages/AdminReviewQueue";
import Analytics from "./pages/Analytics";
import PayoutRequests from "./pages/PayoutRequests";
import ShopApplications from "./pages/ShopApplications";
import ShopOwnerApply from "./pages/ShopOwnerApply";

import HomepageAdmin from "./pages/admin/HomepageAdmin";
import MediaManager from "./pages/admin/MediaManager";
import AdminSupportDashboard from "./pages/admin/AdminSupportDashboard";
import AdminNotifications from "./pages/admin/AdminNotifications";

import About from "./pages/About";
import Support from "./pages/Support";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import ShippingReturns from "./pages/ShippingReturns";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import CookiePolicy from "./pages/CookiePolicy";

import Account from "./pages/Account";
import ManageAccount from "./pages/ManageAccount";
import PaymentMethods from "./pages/PaymentMethods";
import AccountManagement from "./pages/AccountManagement";

import {
  SavedItems,
  Notifications,
  HelpSupport,
  ContactUs,
} from "./pages/AccountSubPages";

import UserRequests from "./pages/UserRequests";
import ProductRequests from "./pages/ProductRequests";

/* ── NEW: Seller public pages (header + footer show) ── */
import GetAStore           from "./pages/GetAStore";
import StorePlans          from "./pages/StorePlans";
import SellerTerms         from "./pages/SellerTerms";
import SellerPolicy        from "./pages/SellerPolicy";
import CommunityGuidelines from "./pages/CommunityGuidelines";

/* ── NEW: Seller onboarding + dashboard (full-screen) ── */
import StoreOnboarding     from "./pages/StoreOnboarding";
import StoreSurvey         from "./pages/StoreSurvey";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SellerDashboard     from "./pages/SellerDashboard";

/* ── NEW: Admin seller management pages ── */
import SellerPayoutRequests from "./pages/admin/PayoutRequests";
import VerificationRequests from "./pages/admin/VerificationRequests";
import StoreModeration      from "./pages/admin/StoreModeration";

/* ================= HELPERS ================= */

function SuperAdminOnly({ children }) {
  const { loading, isSuperAdmin } = useAuth();
  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return children;
}

/* ================= FULL-SCREEN PATHS ================= */
const FULL_SCREEN_ROUTES = new Set([
  "/login",
  "/signup",
  "/verify-email",
  "/admin-login",
  "/onboarding",
  // admin hub
  "/admin",
  // all admin sub-pages (existing)
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
  // ── NEW: seller onboarding + dashboard ──────────────
  "/store-onboarding",
  "/store-survey",
  "/subscription-success",
  "/seller-dashboard",
  // ── NEW: admin seller management ────────────────────
  "/admin/seller-payouts",
  "/admin/verification-requests",
  "/admin/store-moderation",
]);

/* ================= APP SHELL ================= */

function AppShell() {
  const location = useLocation();
  const { loading: authLoading } = useAuth();

  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [cartOpen, setCartOpen]         = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  const shouldHideHeader = FULL_SCREEN_ROUTES.has(location.pathname);

  useEffect(() => {
    setRouteLoading(true);
    const timeout = setTimeout(() => setRouteLoading(false), 300);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
    setCartOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <>
      <LoaderOverlay isVisible={authLoading || routeLoading} />

      {!shouldHideHeader && (
        <>
          <Header
            onMenu={() => setSidebarOpen(true)}
            onCart={() => setCartOpen(true)}
          />
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
        </>
      )}

      <main key={location.pathname} className="route-shell">
        <Routes>

          {/* ── PUBLIC ── */}
          <Route path="/"              element={<Home />} />
          <Route path="/shop"          element={<Shop />} />
          <Route path="/offers"        element={<Offers />} />
          <Route path="/flash-deals"   element={<FlashDeals />} />
          <Route path="/product/:id"   element={<ProductDetails />} />
          <Route path="/checkout"      element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/orders"        element={<Orders />} />

          {/* ── AUTH ── */}
          <Route path="/login"         element={<Login />} />
          <Route path="/signup"        element={<Signup />} />
          <Route path="/verify-email"  element={<VerifyEmail />} />
          <Route path="/onboarding"    element={<Onboarding />} />
          <Route path="/admin-login"   element={<AdminLogin />} />

          {/* ── ACCOUNT ── */}
          <Route path="/account"               element={<Account />} />
          <Route path="/account/manage"        element={<ManageAccount />} />
          <Route path="/account/payments"      element={<PaymentMethods hasCompletedOrder={false} />} />
          <Route path="/account/notifications" element={<Notifications />} />
          <Route path="/account/help"          element={<HelpSupport />} />
          <Route path="/account/contact"       element={<ContactUs />} />
          <Route path="/saved"                 element={<SavedItems />} />
          <Route path="/account/requests"      element={<UserRequests />} />

          {/* ── INFO / LEGAL (existing) ── */}
          <Route path="/about"            element={<About />} />
          <Route path="/support"          element={<Support />} />
          <Route path="/contact"          element={<Contact />} />
          <Route path="/faq"              element={<FAQ />} />
          <Route path="/shipping-returns" element={<ShippingReturns />} />
          <Route path="/privacy-policy"   element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/refund-policy"    element={<RefundPolicy />} />
          <Route path="/cookie-policy"    element={<CookiePolicy />} />

          {/* ── NEW: Seller public pages (header + footer visible) ── */}
          <Route path="/get-a-store"          element={<GetAStore />} />
          <Route path="/store-plans"          element={<StorePlans />} />
          <Route path="/seller-terms"         element={<SellerTerms />} />
          <Route path="/seller-policy"        element={<SellerPolicy />} />
          <Route path="/community-guidelines" element={<CommunityGuidelines />} />

          {/* ── NEW: Seller onboarding (full-screen, logged-in users) ── */}
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

          {/* ── NEW: Seller dashboard (full-screen, seller role required) ── */}
          <Route path="/seller-dashboard"
            element={
              <SellerRoute>
                <SellerDashboard />
              </SellerRoute>
            }
          />

          {/* ── ADMIN HUB ── */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── PRODUCT MANAGER ── */}
          <Route
            path="/admin/product-manager"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <Admin />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── ADMIN ORDERS ── */}
          <Route
            path="/admin-orders"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <AdminOrders />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── REVIEW QUEUE ── */}
          <Route
            path="/admin-review-queue"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <AdminReviewQueue />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── ANALYTICS ── */}
          <Route
            path="/analytics"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <Analytics />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── PAYOUT REQUESTS ── */}
          <Route
            path="/payout-requests"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <PayoutRequests />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── SHOP APPLICATIONS ── */}
          <Route
            path="/shop-applications"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <ShopApplications />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── ACCOUNT MANAGEMENT ── */}
          <Route
            path="/account-management"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <AccountManagement />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── HOMEPAGE EDITOR ── */}
          <Route
            path="/admin/homepage"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <HomepageAdmin />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── PRODUCT REQUESTS ── */}
          <Route
            path="/admin/product-requests"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <ProductRequests />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── MEDIA MANAGER ── */}
          <Route
            path="/admin/media"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <MediaManager />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── SUPPORT INBOX ── */}
          <Route
            path="/admin/support"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <AdminSupportDashboard />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── NOTIFICATIONS ── */}
          <Route
            path="/admin/notifications"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <AdminNotifications />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── NEW: Admin seller management ── */}
          <Route
            path="/admin/seller-payouts"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <SellerPayoutRequests />
                </RequireAdmin>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/verification-requests"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <VerificationRequests />
                </RequireAdmin>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/store-moderation"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <StoreModeration />
                </RequireAdmin>
              </AdminRoute>
            }
          />

          {/* ── SUPER ADMIN ── */}
          <Route
            path="/own-a-shop"
            element={
              <SuperAdminOnly>
                <ShopOwnerApply />
              </SuperAdminOnly>
            }
          />

          {/* ── FALLBACK ── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>

      {!shouldHideHeader && <Footer />}
      {!shouldHideHeader && <BottomNav />}
    </>
  );
}

export default function App() {
  return <AppShell />;
}