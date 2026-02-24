// src/App.jsx
import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";

import AdminRoute from "./components/AdminRoute";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import CartDrawer from "./components/CartDrawer";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Admin from "./pages/Admin";
import Login from "./pages/Login";

import ProductDetails from "./pages/ProductDetails";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          {/* ✅ Global Header */}
          <Header
            onMenu={() => setMenuOpen(true)}
            onCart={() => setCartOpen(true)}
          />

          {/* ✅ Pages */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
          </Routes>

          {/* ✅ Global Sidebar (THIS is what menu opens) */}
          <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

          {/* ✅ Global Cart Drawer */}
          <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}