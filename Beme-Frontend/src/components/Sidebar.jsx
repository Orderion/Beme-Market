import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

/* ---------------- ICONS ---------------- */

function Arrow() {
  return (
    <span className="side-arrow">
      <svg viewBox="0 0 24 24">
        <path
          d="M9 6l6 6-6 6"
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

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg">
      <path
        d="M15 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" fill="none" />
    </svg>
  );
}

/* ---------------- ROW ---------------- */

function SidebarRow({
  label,
  onClick,
  showArrow = false,
  active = false,
  danger = false,
}) {
  return (
    <button
      className={`sidebar-link ${active ? "is-active" : ""} ${
        danger ? "sidebar-link--danger" : ""
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="side-link-content">
        <span>{label}</span>
      </span>
      {showArrow && <Arrow />}
    </button>
  );
}

/* ---------------- MAIN COMPONENT ---------------- */

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout, isSuperAdmin, isShopAdmin, adminShop } =
    useAuth();

  const [menuStack, setMenuStack] = useState(["main"]);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const currentMenu = menuStack[menuStack.length - 1];

  const shopLabel = useMemo(
    () => (adminShop ? titleize(adminShop) : ""),
    [adminShop]
  );

  const isRouteActive = (path) => location.pathname === path;

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setMenuStack(["main"]);
      setConfirmLogout(false);
    }
  }, [isOpen]);

  /* -------- NAVIGATION -------- */

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  const pushMenu = (menu) => {
    setMenuStack((prev) => [...prev, menu]);
  };

  const popMenu = () => {
    setMenuStack((prev) => prev.slice(0, -1));
  };

  const goDept = (dept) => {
    const kind = DEFAULT_KIND_BY_DEPT[dept];
    go(`/shop?dept=${dept}${kind ? `&kind=${kind}` : ""}`);
  };

  const goCategory = (cat) => {
    go(`/shop?q=${encodeURIComponent(cat)}`);
  };

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      onClose?.();
      navigate("/", { replace: true });
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className={`side-shell ${isOpen ? "is-open" : ""}`}>
      <div className="overlay" onClick={onClose} />

      <aside className="side-panel">
        {/* HEADER */}
        <div className="side-header">
          {menuStack.length > 1 && (
            <button onClick={popMenu} className="side-back">
              <BackIcon />
              <span>Back</span>
            </button>
          )}

          <h3 className="side-title">
            {currentMenu === "main"
              ? "Menu"
              : titleize(currentMenu)}
          </h3>

          <button onClick={onClose} className="side-close">
            ×
          </button>
        </div>

        {/* CONTENT */}
        <div className="side-scroll">

          {/* MAIN MENU */}
          {currentMenu === "main" && (
            <>
              <SidebarRow
                label="Home"
                onClick={() => go("/")}
                active={isRouteActive("/")}
              />

              <SidebarRow
                label="Shop"
                onClick={() => go("/shop")}
                active={isRouteActive("/shop")}
              />

              {user && (
                <SidebarRow
                  label="Orders"
                  onClick={() => go("/orders")}
                />
              )}

              <SidebarRow
                label="Categories"
                onClick={() => pushMenu("categories")}
                showArrow
              />

              <SidebarRow
                label="Departments"
                onClick={() => pushMenu("departments")}
                showArrow
              />

              <SidebarRow
                label="More"
                onClick={() => pushMenu("more")}
                showArrow
              />

              {isSuperAdmin && (
                <SidebarRow
                  label="Admin Controls"
                  onClick={() => pushMenu("admin")}
                  showArrow
                />
              )}

              {isShopAdmin && (
                <SidebarRow
                  label={`Shop Admin${shopLabel ? ` • ${shopLabel}` : ""}`}
                  onClick={() => pushMenu("shopAdmin")}
                  showArrow
                />
              )}
            </>
          )}

          {/* CATEGORIES */}
          {currentMenu === "categories" && (
            <>
              <SidebarRow label="Tech" onClick={() => goCategory("tech")} />
              <SidebarRow label="Fashion" onClick={() => goCategory("fashion")} />
              <SidebarRow label="Accessories" onClick={() => goCategory("accessories")} />
            </>
          )}

          {/* DEPARTMENTS */}
          {currentMenu === "departments" && (
            <>
              <SidebarRow label="Men" onClick={() => goDept("men")} />
              <SidebarRow label="Women" onClick={() => goDept("women")} />
              <SidebarRow label="Unisex" onClick={() => goDept("unisex")} />
              <SidebarRow label="Kids" onClick={() => goDept("kids")} />
            </>
          )}

          {/* MORE */}
          {currentMenu === "more" && (
            <>
              <SidebarRow label="About Us" onClick={() => go("/about")} />
              <SidebarRow label="Support" onClick={() => go("/support")} />
              <SidebarRow label="Contact" onClick={() => go("/contact")} />
              <SidebarRow label="FAQ" onClick={() => go("/faq")} />
              <SidebarRow label="Shipping & Returns" onClick={() => go("/shipping&returns")} />
            </>
          )}

          {/* SUPER ADMIN */}
          {currentMenu === "admin" && (
            <>
              <SidebarRow label="Product Manager" onClick={() => go("/admin")} />
              <SidebarRow label="Review Queue" onClick={() => go("/admin-review-queue")} />
              <SidebarRow label="Marketplace Orders" onClick={() => go("/admin-orders")} />
              <SidebarRow label="Analytics" onClick={() => go("/analytics")} />
              <SidebarRow label="Payout Requests" onClick={() => go("/payout-requests")} />
            </>
          )}

          {/* SHOP ADMIN */}
          {currentMenu === "shopAdmin" && (
            <>
              <SidebarRow label="Product Manager" onClick={() => go("/admin")} />
              <SidebarRow label="Review Queue" onClick={() => go("/admin-review-queue")} />
              <SidebarRow label="Shop Orders" onClick={() => go("/admin-orders")} />
              <SidebarRow label="Analytics" onClick={() => go("/analytics")} />
              <SidebarRow label="Payout Requests" onClick={() => go("/payout-requests")} />
            </>
          )}

          {/* FOOTER */}
          <div className="side-footer">
            {!user ? (
              <>
                <SidebarRow label="Login" onClick={() => go("/login")} />
                <SidebarRow label="Sign Up" onClick={() => go("/signup")} />
              </>
            ) : !confirmLogout ? (
              <SidebarRow
                label="Logout"
                onClick={() => setConfirmLogout(true)}
                danger
              />
            ) : (
              <div className="side-confirm">
                <p>Confirm logout?</p>
                <button onClick={() => setConfirmLogout(false)}>Cancel</button>
                <button onClick={onLogout}>Logout</button>
              </div>
            )}

            <button onClick={toggleTheme} className="theme-toggle-btn">
              <IconSun />
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}