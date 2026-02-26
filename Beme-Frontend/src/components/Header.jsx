// src/components/Header.jsx
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext"; // ✅ NEW (optional: shows logout)
import logo from "../assets/logo.png";
import "./Header.css";

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBag() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path
        d="M6 7h12l-1 12H7L6 7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V5a3 3 0 0 1 6 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path
        d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path
        d="M21 13.5A8.5 8.5 0 0 1 10.5 3a7 7 0 1 0 10.5 10.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ✅ NEW: simple user icon (monochrome)
function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M4 20a8 8 0 0 1 16 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Header({ onMenu, onCart }) {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const { cartItems } = useCart();

  // optional: if you want logout icon later
  const authCtx = (() => {
    try {
      return useAuth();
    } catch {
      return null;
    }
  })();

  const count =
    cartItems?.reduce((sum, i) => sum + Number(i.qty || 1), 0) || 0;

  const goAuth = () => {
    // If logged in, you may route to account page later.
    // For now: go to /login always.
    navigate("/login");
  };

  return (
    <header className="hdr">
      <button className="hdr-icon" onClick={onMenu} aria-label="Open menu">
        <IconMenu />
      </button>

      <button
        className="hdr-brand"
        onClick={() => navigate("/shop")}
        aria-label="Go to shop"
      >
        Beme Market
      </button>

      <div className="hdr-right">
        {/* ✅ NEW: Login / User button */}
        <button className="hdr-icon" onClick={goAuth} aria-label="Login">
          <IconUser />
        </button>

        <button
          className="hdr-icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {darkMode ? <IconMoon /> : <IconSun />}
        </button>

        <button
          className="hdr-icon hdr-bag"
          onClick={onCart}
          aria-label="Open cart"
        >
          <IconBag />
          {count > 0 && <span className="hdr-badge">{count}</span>}
        </button>
      </div>
    </header>
  );
}