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

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path
        d="M12 3 19 6v5c0 5-2.8 8.5-7 10-4.2-1.5-7-5-7-10V6l7-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAccount() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <circle
        cx="12"
        cy="8"
        r="3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5 19a7 7 0 0 1 14 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M18.5 5.5h2M19.5 4.5v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTools() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path
        d="M14.5 6.5a4 4 0 0 0 4.9 4.9l-7.6 7.6a2 2 0 1 1-2.8-2.8l7.6-7.6a4 4 0 0 0-4.9-4.9l2.4 2.4-1.8 1.8-2.4-2.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chevron({ open = false }) {
  return (
    <span className={`side-chevron ${open ? "open" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="side-chevron-svg">
        <path
          d="m8 10 4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function SidebarRow({
  icon,
  label,
  onClick,
  danger = false,
  expand = false,
  open = false,
}) {
  return (
    <button
      className={`sidebar-link ${danger ? "sidebar-link--danger" : ""} ${
        expand ? "sidebar-link--expand" : ""
      } ${open ? "is-open" : ""}`}
      onClick={onClick}
      aria-expanded={expand ? open : undefined}
      type="button"
    >
      <span className="side-link-content">
        {icon}
        <span>{label}</span>
      </span>
      {expand ? <Chevron open={open} /> : null}
    </button>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout, isSuperAdmin, isShopAdmin, adminShop } = useAuth();

  const [openSection, setOpenSection] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [mounted, setMounted] = useState(isOpen);

  const offers = useMemo(() => [], []);
  const shopLabel = useMemo(
    () => (adminShop ? titleize(adminShop) : ""),
    [adminShop]
  );

  useEffect(() => {
    let timeoutId;

    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      timeoutId = window.setTimeout(() => {
        setMounted(false);
      }, 360);
    }

    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmLogout(false);
      setOpenSection(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose]);

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

  if (!mounted && !isOpen) return null;

  return (
    <div
      className={`side-shell ${isOpen ? "is-open" : ""}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`overlay ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
      />

      <aside
        className={`side-panel ${isOpen ? "open" : ""}`}
        aria-label="Sidebar menu"
      >
        <div className="side-header">
          <div className="side-header-copy">
            <h3 className="side-title">Menu</h3>
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="side-close"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="side-scroll">
          <section className="side-group side-group--intro">
            <div className="side-group-list">
              <SidebarRow
                icon={<IconHome />}
                label="Home"
                onClick={() => go("/")}
              />
              <SidebarRow
                icon={<IconShop />}
                label="Shop"
                onClick={() => go("/shop")}
              />
              {user ? (
                <SidebarRow
                  icon={<IconOrders />}
                  label="Orders"
                  onClick={() => go("/orders")}
                />
              ) : null}
            </div>
          </section>

          {isSuperAdmin ? (
            <section className="side-group">
              <div className="side-group-label">Admin</div>
              <div className="side-group-list">
                <SidebarRow
                  icon={<IconShield />}
                  label="Product Manager"
                  onClick={() => go("/admin")}
                />
                <SidebarRow
                  icon={<IconOrders />}
                  label="Marketplace Orders"
                  onClick={() => go("/admin-orders")}
                />
                <SidebarRow
                  icon={<IconGrid />}
                  label="Analytics"
                  onClick={() => go("/analytics")}
                />
                <SidebarRow
                  icon={<IconTag />}
                  label="Payout Requests"
                  onClick={() => go("/payout-requests")}
                />
                <SidebarRow
                  icon={<IconLayers />}
                  label="Shop Applications"
                  onClick={() => go("/shop-applications")}
                />
                <SidebarRow
                  icon={<IconAccount />}
                  label="Account Management"
                  onClick={() => go("/account-management")}
                />
                <SidebarRow
                  icon={<IconTools />}
                  label="Own a Shop"
                  onClick={() => go("/own-a-shop")}
                />
              </div>
            </section>
          ) : null}

          {isShopAdmin ? (
            <section className="side-group">
              <div className="side-group-label">
                Shop Admin{shopLabel ? ` • ${shopLabel}` : ""}
              </div>
              <div className="side-group-list">
                <SidebarRow
                  icon={<IconShield />}
                  label="Product Manager"
                  onClick={() => go("/admin")}
                />
                <SidebarRow
                  icon={<IconOrders />}
                  label="Shop Orders"
                  onClick={() => go("/admin-orders")}
                />
                <SidebarRow
                  icon={<IconGrid />}
                  label="Analytics"
                  onClick={() => go("/analytics")}
                />
                <SidebarRow
                  icon={<IconTag />}
                  label="Payout Requests"
                  onClick={() => go("/payout-requests")}
                />
                <SidebarRow
                  icon={<IconAccount />}
                  label="Account Management"
                  onClick={() => go("/account-management")}
                />
              </div>
            </section>
          ) : null}

          <section className="side-group">
            <div className="side-group-list">
              <SidebarRow
                icon={<IconGrid />}
                label="Categories"
                onClick={() => toggleSection("categories")}
                expand
                open={openSection === "categories"}
              />

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

              <SidebarRow
                icon={<IconLayers />}
                label="Departments"
                onClick={() => toggleSection("departments")}
                expand
                open={openSection === "departments"}
              />

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
                    onClick={() => goDept("unisex")}
                    type="button"
                  >
                    Unisex
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

              <SidebarRow
                icon={<IconMore />}
                label="More"
                onClick={() => toggleSection("more")}
                expand
                open={openSection === "more"}
              />

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

              <SidebarRow
                icon={<IconTag />}
                label="Offers"
                onClick={onOffersClick}
              />
            </div>
          </section>

          <section className="side-group">
            <div className="side-group-list">
              {!user ? (
                <>
                  <SidebarRow
                    icon={<IconLogin />}
                    label="Login"
                    onClick={() => go("/login")}
                  />
                  <SidebarRow
                    icon={<IconUserPlus />}
                    label="Sign up"
                    onClick={() => go("/signup")}
                  />
                </>
              ) : !confirmLogout ? (
                <SidebarRow
                  icon={<IconLogout />}
                  label="Logout"
                  onClick={() => setConfirmLogout(true)}
                  danger
                />
              ) : (
                <div className="side-confirm">
                  <p className="side-confirm-text">
                    Are you sure you want to log out?
                  </p>
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
            </div>
          </section>

          <section className="side-group side-group--toggle">
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
          </section>
        </div>
      </aside>
    </div>
  );
}