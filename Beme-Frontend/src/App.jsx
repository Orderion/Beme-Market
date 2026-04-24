import { useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  useLocation,
  Navigate,
  useNavigate,
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
import OfferDetail from "./pages/OfferDetail";
import ProductDetails from "./pages/ProductDetails";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import FlashDeals from "./pages/FlashDeals";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminLogin from "./pages/AdminLogin";

import Admin from "./pages/Admin";
import AdminOrders from "./pages/AdminOrders";
import AdminReviewQueue from "./pages/AdminReviewQueue";
import Analytics from "./pages/Analytics";
import PayoutRequests from "./pages/PayoutRequests";
import ShopApplications from "./pages/ShopApplications";
import ShopOwnerApply from "./pages/ShopOwnerApply";

/* ── NEW: Homepage Admin ── */
import HomepageAdmin from "./pages/admin/HomepageAdmin";

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

  /* Routes where the header/footer/nav should be hidden */
  const hideHeaderRoutes = useMemo(
    () => new Set(["/login", "/signup", "/admin-login"]),
    []
  );

  /* Also hide the shell chrome on the homepage admin panel */
  const isHomepageAdmin = location.pathname === "/admin/homepage";

  const shouldHideHeader = hideHeaderRoutes.has(location.pathname) || isHomepageAdmin;

  /* Route loading effect */
  useEffect(() => {
    setRouteLoading(true);
    const timeout = setTimeout(() => setRouteLoading(false), 500);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  /* Close UI on route change */
  useEffect(() => {
    setSidebarOpen(false);
    setCartOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/offer/:id" element={<OfferDetail />} />
          <Route path="/flash-deals" element={<FlashDeals />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/orders" element={<Orders />} />

          {/* AUTH */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin-login" element={<AdminLogin />} />

          {/* ACCOUNT */}
          <Route path="/account" element={<Account />} />
          <Route path="/account/manage" element={<ManageAccount />} />
          <Route path="/account/payments" element={<PaymentMethods hasCompletedOrder={false} />} />
          <Route path="/account/notifications" element={<Notifications />} />
          <Route path="/account/help" element={<HelpSupport />} />
          <Route path="/account/contact" element={<ContactUs />} />
          <Route path="/saved" element={<SavedItems />} />

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

          {/* ── HOMEPAGE ADMIN (new) ── */}
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

/* ================= EXPORT ================= */

export default function App() {
  return <AppShell />;
}