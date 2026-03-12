// src/components/Sidebar.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_KIND_BY_DEPT } from "../constants/catalog";
import "./Sidebar.css";

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShop() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path
        d="M5 8h14l-1 11H6L5 8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 8V6a3 3 0 0 1 6 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="7"
        height="7"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="13"
        y="4"
        width="7"
        height="7"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="4"
        y="13"
        width="7"
        height="7"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="13"
        y="13"
        width="7"
        height="7"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path
        d="m12 4 8 4-8 4-8-4 8-4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m4 12 8 4 8-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m4 16 8 4 8-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMore() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path
        d="M20 13 11 22l-9-9V4h9l9 9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path
        d="M7 4.5h10a2 2 0 0 1 2 2V19a1 1 0 0 1-1.6.8L12 16l-5.4 3.8A1 1 0 0 1 5 19V6.5a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 8.5h6M9 11.5h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLogin() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path
        d="M10 17v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M4 12h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m11 9 3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUserPlus() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5 20a7 7 0 0 1 14 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M19 8V4M17 6h4"
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
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path
        d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M4 12h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m7 9-3 3 3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [openSection, setOpenSection] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const offers = useMemo(() => [], []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmLogout(false);
      setOpenSection(null);
    }
  }, [isOpen]);

  const go = (path) => {
    setConfirmLogout(false);
    navigate(path);
    onClose?.();
  };

  const goDept = (dept) => {
    const kind = DEFAULT_KIND_BY_DEPT[dept];
    go(`/shop?dept=${dept}${kind ? `&kind=${kind}` : ""}`);
  };

  const goCategory = (cat) => {
    go(`/shop?q=${encodeURIComponent(cat)}`);
  };

  const onOffersClick = () => {
    if (!offers.length) {
      alert("You have no offers yet.");
      return;
    }
    onClose?.();
  };

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      setConfirmLogout(false);
      onClose?.();
      navigate("/", { replace: true });
    }
  };

  const toggleSection = (name) => {
    setOpenSection((prev) => (prev === name ? null : name));
  };

  return (
    <>
      <div
        className={`side-shell ${isOpen ? "is-open" : ""}`}
        aria-hidden={!isOpen}
      >
        <div
          className={`overlay ${isOpen ? "is-open" : ""}`}
          onClick={onClose}
        />

        <div className={`side-panel ${isOpen ? "open" : ""}`}>
          <div className="side-header">
            <h3>Menu</h3>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="side-close"
              type="button"
            >
              ×
            </button>
          </div>

          <div className="side-links">
            <button
              className="sidebar-link"
              onClick={() => go("/")}
              type="button"
            >
              <span className="side-link-content">
                <IconHome />
                <span>Home</span>
              </span>
            </button>

            <button
              className="sidebar-link"
              onClick={() => go("/shop")}
              type="button"
            >
              <span className="side-link-content">
                <IconShop />
                <span>Shop</span>
              </span>
            </button>

            {user ? (
              <button
                className="sidebar-link"
                onClick={() => go("/orders")}
                type="button"
              >
                <span className="side-link-content">
                  <IconOrders />
                  <span>Orders</span>
                </span>
              </button>
            ) : null}

            <div className="side-divider" />

            <button
              className="sidebar-link sidebar-link--expand"
              onClick={() => toggleSection("categories")}
              aria-expanded={openSection === "categories"}
              type="button"
            >
              <span className="side-link-content">
                <IconGrid />
                <span>Categories</span>
              </span>
              <span
                className={`side-chevron ${
                  openSection === "categories" ? "open" : ""
                }`}
              >
                ▾
              </span>
            </button>

            <div
              className={`side-submenu-wrap ${
                openSection === "categories" ? "is-open" : ""
              }`}
            >
              <div className="side-submenu">
                <button
                  className="side-subitem"
                  onClick={() => goCategory("tech")}
                  type="button"
                >
                  Tech
                </button>
                <button
                  className="side-subitem"
                  onClick={() => goCategory("fashion")}
                  type="button"
                >
                  Fashion
                </button>
                <button
                  className="side-subitem"
                  onClick={() => goCategory("accessories")}
                  type="button"
                >
                  Accessories
                </button>
              </div>
            </div>

            <button
              className="sidebar-link sidebar-link--expand"
              onClick={() => toggleSection("departments")}
              aria-expanded={openSection === "departments"}
              type="button"
            >
              <span className="side-link-content">
                <IconLayers />
                <span>Departments</span>
              </span>
              <span
                className={`side-chevron ${
                  openSection === "departments" ? "open" : ""
                }`}
              >
                ▾
              </span>
            </button>

            <div
              className={`side-submenu-wrap ${
                openSection === "departments" ? "is-open" : ""
              }`}
            >
              <div className="side-submenu">
                <button
                  className="side-subitem"
                  onClick={() => goDept("men")}
                  type="button"
                >
                  Men
                </button>
                <button
                  className="side-subitem"
                  onClick={() => goDept("women")}
                  type="button"
                >
                  Women
                </button>
                <button
                  className="side-subitem"
                  onClick={() => goDept("kids")}
                  type="button"
                >
                  Kids
                </button>
                <button
                  className="side-subitem"
                  onClick={() => goDept("accessories")}
                  type="button"
                >
                  Accessories
                </button>
              </div>
            </div>

            <button
              className="sidebar-link sidebar-link--expand"
              onClick={() => toggleSection("more")}
              aria-expanded={openSection === "more"}
              type="button"
            >
              <span className="side-link-content">
                <IconMore />
                <span>More</span>
              </span>
              <span
                className={`side-chevron ${openSection === "more" ? "open" : ""}`}
              >
                ▾
              </span>
            </button>

            <div
              className={`side-submenu-wrap ${
                openSection === "more" ? "is-open" : ""
              }`}
            >
              <div className="side-submenu">
                <button
                  className="side-subitem"
                  onClick={() => go("/about")}
                  type="button"
                >
                  About us
                </button>
                <button
                  className="side-subitem"
                  onClick={() => go("/support")}
                  type="button"
                >
                  Support us
                </button>
                <button
                  className="side-subitem"
                  onClick={() => go("/contact")}
                  type="button"
                >
                  Contact
                </button>
                <button
                  className="side-subitem"
                  onClick={() => go("/faq")}
                  type="button"
                >
                  FAQ
                </button>
                <button
                  className="side-subitem"
                  onClick={() => go("/shipping&returns")}
                  type="button"
                >
                  Shipping & Returns
                </button>
              </div>
            </div>

            <button className="sidebar-link" onClick={onOffersClick} type="button">
              <span className="side-link-content">
                <IconTag />
                <span>Offers</span>
              </span>
            </button>

            <div className="side-divider" />

            {!user ? (
              <>
                <button
                  className="sidebar-link"
                  onClick={() => go("/login")}
                  type="button"
                >
                  <span className="side-link-content">
                    <IconLogin />
                    <span>Login</span>
                  </span>
                </button>

                <button
                  className="sidebar-link"
                  onClick={() => go("/signup")}
                  type="button"
                >
                  <span className="side-link-content">
                    <IconUserPlus />
                    <span>Sign up</span>
                  </span>
                </button>
              </>
            ) : !confirmLogout ? (
              <button
                className="sidebar-link sidebar-link--danger"
                onClick={() => setConfirmLogout(true)}
                type="button"
              >
                <span className="side-link-content">
                  <IconLogout />
                  <span>Logout</span>
                </span>
              </button>
            ) : (
              <div className="side-confirm">
                <p className="side-confirm-text">Are you sure you want to log out?</p>
                <div className="side-confirm-actions">
                  <button
                    className="side-confirm-btn"
                    onClick={() => setConfirmLogout(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="side-confirm-btn side-confirm-btn--danger"
                    onClick={onLogout}
                    type="button"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}

            <div className="side-divider" />

            <div className="sidebar-toggle-row">
              <div className="side-link-content">
                <IconSun />
                <span>{darkMode ? "Light mode" : "Dark mode"}</span>
              </div>

              <button
                type="button"
                className={`theme-toggle ${darkMode ? "active" : ""}`}
                onClick={toggleTheme}
                aria-label="Toggle theme"
                aria-pressed={darkMode}
              >
                <span className="theme-toggle-track">
                  <span className="theme-toggle-thumb" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}