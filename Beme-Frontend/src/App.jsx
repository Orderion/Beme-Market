// src/App.jsx
import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";

import AdminRoute from "./components/AdminRoute";
import RequireAdmin from "./components/auth/RequireAdmin";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import CartDrawer from "./components/CartDrawer";
import LoaderOverlay from "./components/LoaderOverlay";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminLogin from "./pages/AdminLogin";
import AdminOrders from "./pages/AdminOrders";
import AdminAnalytics from "./pages/AdminAnalytics";

import ProductDetails from "./pages/ProductDetails";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";

import About from "./pages/About";
import Support from "./pages/Support";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import ShippingReturns from "./pages/ShippingReturns";

function AppShell() {
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { loading } = useAuth();

  return (
    <>
      {/* ✅ Global Header */}
      <Header onMenu={() => setMenuOpen(true)} onCart={() => setCartOpen(true)} />

      {/* ✅ Global loader during auth boot */}
      <LoaderOverlay show={loading} label="Preparing your experience..." />

      {/* ✅ Pages */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />

        {/* ✅ Customer auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* ✅ Admin auth */}
        <Route path="/admin-login" element={<AdminLogin />} />

        <Route
          path="/admin/orders"
          element={
            <RequireAdmin>
              <AdminOrders />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <RequireAdmin>
              <AdminAnalytics />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />

        {/* ✅ Info pages */}
        <Route path="/about" element={<About />} />
        <Route path="/support" element={<Support />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/shipping-returns" element={<ShippingReturns />} />
      </Routes>

      {/* ✅ Global Sidebar */}
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ✅ Global Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
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