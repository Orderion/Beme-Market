import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import "./BottomNav.css";

/* ================= ICONS ================= */

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M4 11l8-7 8 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M6 10v10h12V10" fill="none" stroke="currentColor" strokeWidth="1.7"/>
    </svg>
  );
}

function IconShop() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M3 9l1-4h16l1 4" fill="none" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M4 9h16v10H4z" fill="none" stroke="currentColor" strokeWidth="1.7"/>
    </svg>
  );
}

function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M6 4h12v16H6z" fill="none" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth="1.7"/>
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" stroke="currentColor" strokeWidth="1.7" fill="none"/>
      <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.7" fill="none"/>
    </svg>
  );
}

function IconOffers() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M5 12l5-5 9 9-5 5z" fill="none" stroke="currentColor" strokeWidth="1.7"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
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
  const navRef = useRef(null);
  const indicatorRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  /* 🔥 ORDER (IMPORTANT for animation positions) */
  const items = [
    { key: "home", path: "/", icon: <IconHome />, label: "Home" },
    { key: "offers", path: "/offers", icon: <IconOffers />, label: "Offers" },
    { key: "shop", path: "/shop", icon: <IconShop />, label: "Shop" },
    { key: "orders", path: "/orders", icon: <IconOrders />, label: "Orders" },
    {
      key: "account",
      path: user ? "/account" : "/login",
      icon: <IconUser />,
      label: user ? "Account" : "Login",
    },
  ];

  /* 🔥 MOVE INDICATOR */
  useEffect(() => {
    const index = items.findIndex((i) => i.path === location.pathname);
    if (index === -1) return;

    const nav = navRef.current;
    const indicator = indicatorRef.current;

    if (!nav || !indicator) return;

    const itemWidth = nav.offsetWidth / items.length;
    const x = itemWidth * index + itemWidth / 2 - 28;

    indicator.style.transform = `translateX(${x}px)`;
  }, [location.pathname]);

  /* Logout confirmation logic (UNCHANGED) */
  useEffect(() => {
    let timeoutId;
    if (showLogoutConfirm) setLogoutConfirmMounted(true);
    else timeoutId = setTimeout(() => setLogoutConfirmMounted(false), 220);
    return () => clearTimeout(timeoutId);
  }, [showLogoutConfirm]);

  useEffect(() => {
    if (!showLogoutConfirm && !logoutConfirmMounted) return;

    const handleClickOutside = (event) => {
      if (!logoutWrapRef.current) return;
      if (!logoutWrapRef.current.contains(event.target)) {
        setShowLogoutConfirm(false);
      }
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
    <nav className="bottom-nav" ref={navRef}>
      {/* 🔥 MOVING PULSE */}
      <div className="bn-indicator" ref={indicatorRef} />

      {items.map((item) => {
        if (item.key === "offers") {
          return (
            <button
              key={item.key}
              className={`bn-item ${isActive(item.path) ? "active" : ""}`}
              onClick={() => alert("No offer available")}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        }

        if (item.key === "account" && user) {
          return (
            <div key={item.key} className="bn-item bn-account-wrap" ref={logoutWrapRef}>
              <button
                className={`bn-item ${showLogoutConfirm ? "is-active" : ""}`}
                onClick={() => setShowLogoutConfirm((prev) => !prev)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>

              {(logoutConfirmMounted || showLogoutConfirm) && (
                <div className={`bn-confirm ${showLogoutConfirm ? "is-open" : ""}`}>
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
            </div>
          );
        }

        return (
          <button
            key={item.key}
            className={`bn-item ${isActive(item.path) ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}