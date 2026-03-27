import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import "./BottomNav.css";

/* ================= ICONS ================= */

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M4 11l8-7 8 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6 10v10h12V10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function IconShop() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M3 9l1-4h16l1 4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 9h16v10H4z" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M6 4h12v16H6z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 9h6M9 13h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 20a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconOffers() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M5 12l5-5 9 9-5 5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/* ================= COMPONENT ================= */

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuth();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutConfirmMounted, setLogoutConfirmMounted] = useState(false);
  const logoutWrapRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  /* Logout confirmation effect */
  useEffect(() => {
    let timeoutId;
    if (showLogoutConfirm) setLogoutConfirmMounted(true);
    else
      timeoutId = setTimeout(() => setLogoutConfirmMounted(false), 220);
    return () => clearTimeout(timeoutId);
  }, [showLogoutConfirm]);

  useEffect(() => {
    if (!showLogoutConfirm && !logoutConfirmMounted) return;

    const handleClickOutside = (event) => {
      if (!logoutWrapRef.current) return;
      if (!logoutWrapRef.current.contains(event.target)) setShowLogoutConfirm(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setShowLogoutConfirm(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showLogoutConfirm, logoutConfirmMounted]);

  return (
    <nav className="bottom-nav">

      {/* HOME */}
      <button
        className={`bn-item ${isActive("/") ? "active" : ""}`}
        onClick={() => navigate("/")}
      >
        <IconHome />
        <span>Home</span>
      </button>

      {/* OFFERS */}
      <button
        className={`bn-item ${isActive("/offers") ? "active" : ""}`}
        onClick={() => alert("No offer available")}
      >
        <IconOffers />
        <span>Offers</span>
      </button>

      {/* CENTER SHOP BUTTON */}
      <div className="bn-center-spacer" aria-hidden="true" />
         <button
         className="bn-center"
         onClick={() => navigate("/shop")}
         aria-label="Shop"
         >
         <IconShop />
      </button>

      {/* ORDERS */}
      <button
        className={`bn-item ${isActive("/orders") ? "active" : ""}`}
        onClick={() => navigate("/orders")}
      >
        <IconOrders />
        <span>Orders</span>
      </button>

      {/* ACCOUNT / LOGIN */}
      <div className="bn-item bn-account-wrap" ref={logoutWrapRef}>
        {!user ? (
          <button
            className={`bn-item ${isActive("/login") ? "active" : ""}`}
            onClick={() => navigate("/login")}
          >
            <IconUser />
            <span>Login</span>
          </button>
        ) : (
          <>
            <button
              className={`bn-item ${showLogoutConfirm ? "is-active" : ""}`}
              onClick={() => setShowLogoutConfirm((prev) => !prev)}
              aria-label="Open logout confirmation"
            >
              <IconUser />
              <span>Account</span>
            </button>

            {(logoutConfirmMounted || showLogoutConfirm) && (
              <div
                className={`bn-confirm ${showLogoutConfirm ? "is-open" : ""}`}
                aria-hidden={!showLogoutConfirm}
              >
                <p>Log out of your account?</p>
                <div className="bn-confirm-actions">
                  <button onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                  <button
                    className="bn-confirm-btn--danger"
                    onClick={async () => {
                      await logout();
                      setShowLogoutConfirm(false);
                      navigate("/", { replace: true });
                    }}
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  );
}