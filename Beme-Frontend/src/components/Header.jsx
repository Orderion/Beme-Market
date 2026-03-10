import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
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

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path
        d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M4 12h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M7 9l-3 3 3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStorefront() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path
        d="M4 8h16M5 8l1 11h12l1-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8 8V5h8v3"
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
  const { user, logout } = useAuth();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const logoutWrapRef = useRef(null);

  const count =
    cartItems?.reduce((sum, i) => sum + Number(i.qty || 1), 0) || 0;

  const goAuth = () => navigate("/login");
  const goOwnShop = () => navigate("/own-a-shop");

  const onConfirmLogout = async () => {
    try {
      await logout();
    } finally {
      setShowLogoutConfirm(false);
      navigate("/", { replace: true });
    }
  };

  useEffect(() => {
    if (!showLogoutConfirm) return;

    const handleClickOutside = (event) => {
      if (!logoutWrapRef.current) return;
      if (!logoutWrapRef.current.contains(event.target)) {
        setShowLogoutConfirm(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showLogoutConfirm]);

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
        <button
          className="hdr-seller-btn"
          onClick={goOwnShop}
          aria-label="Own a shop"
          type="button"
        >
          <IconStorefront />
          <span className="hdr-seller-text">Own a Shop</span>
        </button>

        {!user ? (
          <button className="hdr-icon" onClick={goAuth} aria-label="Login">
            <IconUser />
          </button>
        ) : (
          <div className="hdr-auth-wrap" ref={logoutWrapRef}>
            <button
              className={`hdr-icon ${showLogoutConfirm ? "is-active" : ""}`}
              onClick={() => setShowLogoutConfirm((prev) => !prev)}
              aria-label="Open logout confirmation"
              type="button"
            >
              <IconLogout />
            </button>

            <div
              className={`hdr-confirm ${showLogoutConfirm ? "is-open" : ""}`}
              aria-hidden={!showLogoutConfirm}
            >
              <p className="hdr-confirm-text">Log out of your account?</p>
              <div className="hdr-confirm-actions">
                <button
                  className="hdr-confirm-btn"
                  onClick={() => setShowLogoutConfirm(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="hdr-confirm-btn hdr-confirm-btn--danger"
                  onClick={onConfirmLogout}
                  type="button"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          className="hdr-icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          type="button"
        >
          {darkMode ? <IconMoon /> : <IconSun />}
        </button>

        <button
          className="hdr-icon hdr-bag"
          onClick={onCart}
          aria-label="Open cart"
          type="button"
        >
          <IconBag />
          {count > 0 && <span className="hdr-badge">{count}</span>}
        </button>
      </div>
    </header>
  );
}