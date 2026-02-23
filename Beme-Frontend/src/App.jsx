import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Sun, Moon } from "lucide-react";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext"; // ✅ make sure this path matches
import AdminRoute from "./components/AdminRoute";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import CartDrawer from "./components/CartDrawer";

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);

  // 🔥 THEME SYSTEM
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  const [darkMode, setDarkMode] = useState(getInitialTheme);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <AuthProvider>
      <CartProvider>
        {/* 🌙 PREMIUM THEME TOGGLE */}
        <div
          onClick={() => setDarkMode(!darkMode)}
          style={{
            position: "fixed",
            top: "70px",
            right: "55px",
            width: "60px",
            height: "30px",
            background: darkMode ? "#222" : "#e5e5e5",
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            justifyContent: darkMode ? "flex-end" : "flex-start",
            padding: "4px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              background: darkMode ? "#fff" : "#000",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
            }}
          >
            {darkMode ? <Moon size={14} color="#000" /> : <Sun size={14} color="#fff" />}
          </div>
        </div>

        {/* 🚀 ROUTES */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
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

        {/* 🛒 CART DRAWER */}
        <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      </CartProvider>
    </AuthProvider>
  );
}