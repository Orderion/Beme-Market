import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import Home from "./pages/Home";
import CartDrawer from "./components/CartDrawer";

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);

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
    <>
      {/* PREMIUM TOGGLE */}
      <div
        onClick={() => setDarkMode(!darkMode)}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
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
          zIndex: 999
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
            transition: "all 0.3s ease"
          }}
        >
          {darkMode ? (
            <Moon size={14} color="#000" />
          ) : (
            <Sun size={14} color="#fff" />
          )}
        </div>
      </div>

      <Home />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </>
  );
}