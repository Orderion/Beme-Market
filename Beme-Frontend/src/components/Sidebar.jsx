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

/* ICONS */

function Arrow() {
  return (
    <span className="side-arrow">
      <svg viewBox="0 0 24 24">
        <path d="M9 6l6 6-6 6" stroke="currentColor" fill="none" />
      </svg>
    </span>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" fill="none" />
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

/* ROW */

function SidebarRow({ label, onClick, showArrow = false }) {
  return (
    <button className="sidebar-link" onClick={onClick}>
      <span>{label}</span>
      {showArrow && <Arrow />}
    </button>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout, isSuperAdmin, isShopAdmin, adminShop } =
    useAuth();

  const [menuStack, setMenuStack] = useState(["main"]);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const shopLabel = useMemo(
    () => (adminShop ? titleize(adminShop) : ""),
    [adminShop]
  );

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

  /* NAVIGATION */

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
    await logout();
    onClose?.();
    navigate("/");
  };

  /* INDEX FOR SLIDE */
  const menuIndexMap = {
    main: 0,
    categories: 1,
    departments: 2,
    more: 3,
    admin: 4,
    shopAdmin: 5,
  };

  const currentIndex = menuIndexMap[menuStack[menuStack.length - 1]];

  return (
    <div className={`side-shell ${isOpen ? "is-open" : ""}`}>
      <div className="overlay" onClick={onClose} />

      <aside className="side-panel">
        {/* HEADER */}
        <div className="side-header">
          {menuStack.length > 1 && (
            <button onClick={popMenu} className="side-back">
              <BackIcon />
              Back
            </button>
          )}

          <h3 className="side-title">Menu</h3>

          <button onClick={onClose} className="side-close">
            ×
          </button>
        </div>

        {/* STACK */}
        <div className="side-scroll">
          <div
            className="menu-stack"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {/* MAIN */}
            <div className="menu-view">
              <SidebarRow label="Home" onClick={() => go("/")} />
              <SidebarRow label="Shop" onClick={() => go("/shop")} />

              {user && (
                <SidebarRow label="Orders" onClick={() => go("/orders")} />
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
            </div>

            {/* CATEGORIES */}
            <div className="menu-view">
              <SidebarRow label="Tech" onClick={() => goCategory("tech")} />
              <SidebarRow label="Fashion" onClick={() => goCategory("fashion")} />
              <SidebarRow label="Accessories" onClick={() => goCategory("accessories")} />
            </div>

            {/* DEPARTMENTS */}
            <div className="menu-view">
              <SidebarRow label="Men" onClick={() => goDept("men")} />
              <SidebarRow label="Women" onClick={() => goDept("women")} />
              <SidebarRow label="Unisex" onClick={() => goDept("unisex")} />
              <SidebarRow label="Kids" onClick={() => goDept("kids")} />
            </div>

            {/* MORE */}
            <div className="menu-view">
              <SidebarRow label="About Us" onClick={() => go("/about")} />
              <SidebarRow label="Support" onClick={() => go("/support")} />
              <SidebarRow label="Contact" onClick={() => go("/contact")} />
              <SidebarRow label="FAQ" onClick={() => go("/faq")} />
            </div>

            {/* ADMIN */}
            <div className="menu-view">
              <SidebarRow label="Product Manager" onClick={() => go("/admin")} />
              <SidebarRow label="Orders" onClick={() => go("/admin-orders")} />
            </div>

            {/* FOOTER PAGE */}
            <div className="menu-view">
              {!user ? (
                <>
                  <SidebarRow label="Login" onClick={() => go("/login")} />
                  <SidebarRow label="Sign Up" onClick={() => go("/signup")} />
                </>
              ) : (
                <SidebarRow label="Logout" onClick={onLogout} />
              )}

              <button onClick={toggleTheme} className="theme-toggle-btn">
                <IconSun />
                {darkMode ? "Light Mode" : "Dark Mode"}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}