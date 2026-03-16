// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider, useCart } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import AdminRoute from "./components/AdminRoute";
import RequireAdmin from "./components/auth/RequireAdmin";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminLogin from "./pages/AdminLogin";
import AdminOrders from "./pages/AdminOrders";
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

  return (
    <div className="cart-added-popup" role="status" aria-live="polite">
      <button
        type="button"
        className="cart-added-popup__close"
        onClick={hideCartPopup}
        aria-label="Close cart popup"
      >
        ×
      </button>

      <div className="cart-added-popup__content">
        <div className="cart-added-popup__media">
          {item.image ? (
            <img src={item.image} alt={item.name || "Product"} />
          ) : (
            <div className="cart-added-popup__media-empty">No image</div>
          )}
        </div>

        <div className="cart-added-popup__text">
          <span className="cart-added-popup__eyebrow">Added to cart</span>
          <h4>Thank you for shopping with us</h4>
          <p>
            <strong>{item.name}</strong> has been added to your cart.
          </p>
          {item.selectedOptionsLabel ? (
            <small>{item.selectedOptionsLabel}</small>
          ) : null}
        </div>
      </div>

      <div className="cart-added-popup__actions">
        <button
          type="button"
          className="cart-added-popup__btn cart-added-popup__btn--ghost"
          onClick={onContinueShopping}
        >
          Continue Shopping
        </button>

        <button
          type="button"
          className="cart-added-popup__btn cart-added-popup__btn--primary"
          onClick={onCheckout}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hideCartPopup } = useCart();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const hideHeaderRoutes = useMemo(
    () => new Set(["/login", "/signup", "/admin-login"]),
    []
  );

  const shouldHideHeader = hideHeaderRoutes.has(location.pathname);

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
    navigate("/checkout");
  };

  return (
    <>
      {!shouldHideHeader ? (
        <>
          <Header
            onMenu={() => setSidebarOpen(true)}
            onCart={() => setCartOpen(true)}
          />
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
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

          <Route
            path="/shop-payment-status"
            element={<Navigate to="/" replace />}
          />

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
        </Routes>
      </main>

      {!shouldHideHeader ? <Footer /> : null}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}