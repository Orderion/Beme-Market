import { useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  useLocation,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";
import AdminRoute from "./components/AdminRoute";
import RequireAdmin from "./components/auth/RequireAdmin";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import LoaderOverlay from "./components/LoaderOverlay"; // ✅ ADD THIS

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminLogin from "./pages/AdminLogin";
import AdminOrders from "./pages/AdminOrders";
import AdminReviewQueue from "./pages/AdminReviewQueue";
import Analytics from "./pages/Analytics";
import ShopOwnerApply from "./pages/ShopOwnerApply";
import PayoutRequests from "./pages/PayoutRequests";
import ShopApplications from "./pages/ShopApplications";
import ProductDetails from "./pages/ProductDetails";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import About from "./pages/About";
import Support from "./pages/Support";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import ShippingReturns from "./pages/ShippingReturns";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import AccountManagement from "./pages/AccountManagement";

function SuperAdminOnly({ children }) {
  const { loading, isSuperAdmin } = useAuth();

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return children;
}

function CartAddedPopup({ onContinueShopping, onCheckout }) {
  const { cartPopup, hideCartPopup } = useCart();

  if (!cartPopup?.visible || !cartPopup?.item) return null;

  const item = cartPopup.item;
  const title = cartPopup?.title || "Added to cart";
  const message =
    cartPopup?.message ||
    "Thank you for shopping with us. Your item has been added to cart.";
  const image =
    item?.image ||
    (Array.isArray(item?.images) ? item.images[0] : "") ||
    "";

  return (
    <div className="cart-added-popup-backdrop" role="presentation">
      <div className="cart-added-popup" role="dialog" aria-modal="true">
        <button
          type="button"
          className="cart-added-popup__close"
          onClick={hideCartPopup}
        >
          ×
        </button>

        <div className="cart-added-popup__content">
          <div className="cart-added-popup__media">
            {image ? (
              <img src={image} alt={item.name || "Product"} />
            ) : (
              <div>No image</div>
            )}
          </div>

          <div className="cart-added-popup__text">
            <h4>{title}</h4>
            <p>{message}</p>
            <strong>{item.name}</strong>
            <span>GHS {Number(item.price || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="cart-added-popup__actions">
          <button onClick={onContinueShopping}>Continue Shopping</button>
          <button onClick={onCheckout}>Checkout</button>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hideCartPopup } = useCart();
  const { loading: authLoading } = useAuth(); // ✅ IMPORTANT

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [routeLoading, setRouteLoading] = useState(false); // ✅ NEW

  const hideHeaderRoutes = useMemo(
    () => new Set(["/login", "/signup", "/admin-login"]),
    []
  );

  const shouldHideHeader = hideHeaderRoutes.has(location.pathname);

  // ✅ ROUTE LOADER (AUTO)
  useEffect(() => {
    setRouteLoading(true);

    const timeout = setTimeout(() => {
      setRouteLoading(false);
    }, 500); // prevents flicker

    return () => clearTimeout(timeout);
  }, [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
    setCartOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  const handleContinueShopping = () => {
    hideCartPopup();
  };

  const handleCheckoutFromPopup = () => {
    hideCartPopup();
    setCartOpen(false);
    navigate("/checkout");
  };

  return (
    <>
      {/* ✅ GLOBAL LOADER */}
      <LoaderOverlay isVisible={authLoading || routeLoading} />

      {!shouldHideHeader ? (
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

          <CartAddedPopup
            onContinueShopping={handleContinueShopping}
            onCheckout={handleCheckoutFromPopup}
          />
        </>
      ) : null}

      <main key={location.pathname} className="route-shell">
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin-login" element={<AdminLogin />} />

          <Route
            path="/own-a-shop"
            element={
              <SuperAdminOnly>
                <ShopOwnerApply />
              </SuperAdminOnly>
            }
          />

          <Route path="/shop-payment-status" element={<Navigate to="/" replace />} />

          <Route path="/about" element={<About />} />
          <Route path="/support" element={<Support />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/shipping&returns" element={<ShippingReturns />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />

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
              </RequireAdmin>
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
        </Routes>
      </main>

      {!shouldHideHeader ? <Footer /> : null}
    </>
  );
}

export default function App() {
  return <AppShell />;
}