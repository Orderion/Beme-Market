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

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import LoaderOverlay from "./components/LoaderOverlay";
import BottomNav from "./components/navigation/BottomNav.jsx";

/* PAGES */
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
import Onboarding from "./pages/Onboarding";
import AdminLogin from "./pages/AdminLogin";

import Admin from "./pages/Admin";
import AdminOrders from "./pages/AdminOrders";
import AdminReviewQueue from "./pages/AdminReviewQueue";
import Analytics from "./pages/Analytics";
import PayoutRequests from "./pages/PayoutRequests";
import ShopApplications from "./pages/ShopApplications";
import ShopOwnerApply from "./pages/ShopOwnerApply";

import HomepageAdmin from "./pages/admin/HomepageAdmin";
import MediaManager from "./pages/admin/MediaManager";
import AdminSupportDashboard from "./pages/admin/AdminSupportDashboard"; // ← NEW

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

/* ── Product Request Pages ── */
import UserRequests from "./pages/UserRequests";
import ProductRequests from "./pages/ProductRequests";

/* ================= HELPERS ================= */

function SuperAdminOnly({ children }) {
  const { loading, isSuperAdmin } = useAuth();

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return children;
}

/* ================= APP SHELL ================= */

function AppShell() {
  const location = useLocation();
  const { loading: authLoading } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  /*
   * Routes where the global header, footer and bottom nav are hidden.
   * /onboarding is added here so the questionnaire is a clean full-screen
   * experience with no navigation chrome around it.
   */
  const hideHeaderRoutes = useMemo(
    () => new Set(["/login", "/signup", "/admin-login", "/onboarding"]),
    []
  );

  const isHomepageAdmin   = location.pathname === "/admin/homepage";
  const isAdminSupport    = location.pathname === "/admin/support"; // ← NEW

  const shouldHideHeader =
    hideHeaderRoutes.has(location.pathname) || isHomepageAdmin || isAdminSupport;

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

          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <CartDrawer
            isOpen={cartOpen}
            onClose={() => setCartOpen(false)}
          />
        </>
      )}

      <main key={location.pathname} className="route-shell">
        <Routes>

          {/* PUBLIC */}
          <Route path="/"             element={<Home />} />
          <Route path="/shop"         element={<Shop />} />
          <Route path="/offers"       element={<Offers />} />
          <Route path="/flash-deals"  element={<FlashDeals />} />
          <Route path="/product/:id"  element={<ProductDetails />} />
          <Route path="/checkout"     element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/orders"       element={<Orders />} />

          {/* AUTH */}
          <Route path="/login"        element={<Login />} />
          <Route path="/signup"       element={<Signup />} />
          <Route path="/onboarding"   element={<Onboarding />} />
          <Route path="/admin-login"  element={<AdminLogin />} />

          {/* ACCOUNT */}
          <Route path="/account"               element={<Account />} />
          <Route path="/account/manage"        element={<ManageAccount />} />
          <Route path="/account/payments"      element={<PaymentMethods hasCompletedOrder={false} />} />
          <Route path="/account/notifications" element={<Notifications />} />
          <Route path="/account/help"          element={<HelpSupport />} />
          <Route path="/account/contact"       element={<ContactUs />} />
          <Route path="/saved"                 element={<SavedItems />} />
          <Route path="/account/requests"      element={<UserRequests />} />

          {/* ADMIN */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <RequireAdmin>
                  <Admin />
                </RequireAdmin>
              </AdminRoute>
            }
          />

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

          {/* HOMEPAGE ADMIN */}
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

          {/* ADMIN PRODUCT REQUESTS */}
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

          {/* MEDIA MANAGER */}
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

          {/* ── SUPPORT INBOX  ← NEW ── */}
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

          {/* SUPER ADMIN */}
          <Route
            path="/own-a-shop"
            element={
              <SuperAdminOnly>
                <ShopOwnerApply />
              </SuperAdminOnly>
            }
          />

          {/* FALLBACK */}
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