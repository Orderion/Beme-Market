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

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
        fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="m10 8 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="m14 8-4 4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuRow({ label, onClick, danger = false, hasArrow = false, active = false }) {
  return (
    <button
      type="button"
      className={`menu-row${danger ? " menu-row--danger" : ""}${active ? " menu-row--active" : ""}`}
      onClick={onClick}
    >
      <span className="menu-row-label">{label}</span>
      {hasArrow && <ChevronRight />}
    </button>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout, isSuperAdmin, isShopAdmin, adminShop } = useAuth();

  const [subScreen, setSubScreen] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const offers = useMemo(() => [], []);
  const shopLabel = useMemo(() => (adminShop ? titleize(adminShop) : ""), [adminShop]);

  const isRouteActive = (path) => path && location.pathname === path;

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmLogout(false);
      setSubScreen(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") { subScreen ? setSubScreen(null) : onClose?.(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, subScreen]);

  const go = (path) => {
    setConfirmLogout(false);
    navigate(path);
    onClose?.();
  };

  const goDept = (dept) => {
    const kind = DEFAULT_KIND_BY_DEPT[dept];
    go(`/shop?dept=${dept}${kind ? `&kind=${kind}` : ""}`);
  };

  const goCategory = (cat) => go(`/shop?q=${encodeURIComponent(cat)}`);

  const onOffersClick = () => {
    if (!offers.length) { alert("You have no offers yet."); return; }
    onClose?.();
  };

  const onLogout = async () => {
    try { await logout(); }
    finally { setConfirmLogout(false); onClose?.(); navigate("/", { replace: true }); }
  };

  const subScreens = {
    categories: {
      title: "Categories",
      items: [
        { label: "Tech", action: () => goCategory("tech") },
        { label: "Fashion", action: () => goCategory("fashion") },
        { label: "Accessories", action: () => goCategory("accessories") },
      ],
    },
    departments: {
      title: "Departments",
      items: [
        { label: "Men", action: () => goDept("men") },
        { label: "Women", action: () => goDept("women") },
        { label: "Unisex", action: () => goDept("unisex") },
        { label: "Kids", action: () => goDept("kids") },
        { label: "Accessories", action: () => goDept("accessories") },
      ],
    },
    more: {
      title: "More",
      items: [
        { label: "About us", path: "/about" },
        { label: "Support us", path: "/support" },
        { label: "Contact", path: "/contact" },
        { label: "FAQ", path: "/faq" },
        { label: "Shipping & Returns", path: "/shipping&returns" },
      ],
    },
    adminControls: {
      title: "Admin Controls",
      items: [
        { label: "Product Manager", path: "/admin" },
        { label: "Admin Review Queue", path: "/admin-review-queue" },
        { label: "Marketplace Orders", path: "/admin-orders" },
        { label: "Analytics", path: "/analytics" },
        { label: "Payout Requests", path: "/payout-requests" },
        { label: "Shop Applications", path: "/shop-applications" },
        { label: "Account Management", path: "/account-management" },
        { label: "Own a Shop", path: "/own-a-shop" },
      ],
    },
    shopAdminControls: {
      title: `Shop Admin${shopLabel ? ` • ${shopLabel}` : ""}`,
      items: [
        { label: "Product Manager", path: "/admin" },
        { label: "Review Queue", path: "/admin-review-queue" },
        { label: "Shop Orders", path: "/admin-orders" },
        { label: "Analytics", path: "/analytics" },
        { label: "Payout Requests", path: "/payout-requests" },
        { label: "Account Management", path: "/account-management" },
      ],
    },
  };

  const activeSubScreen = subScreen ? subScreens[subScreen] : null;

  return (
    <div className={`side-shell ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
      <div className={`overlay ${isOpen ? "is-open" : ""}`} onClick={onClose} />

      <aside className={`side-panel ${isOpen ? "open" : ""}`} aria-label="Sidebar menu">

        {/* Main screen */}
        <div className={`main-screen ${subScreen ? "slide-out" : ""}`}>
          <div className="side-header">
            <h3 className="side-title">Menu</h3>
            <button onClick={onClose} aria-label="Close menu" className="side-close" type="button">×</button>
          </div>

          <div className="side-scroll">
            <MenuRow label="Home" onClick={() => go("/")} active={isRouteActive("/")} />
            <MenuRow label="Shop" onClick={() => go("/shop")} active={isRouteActive("/shop")} />
            {user && (
              <MenuRow label="Orders" onClick={() => go("/orders")} active={isRouteActive("/orders")} />
            )}
            {isSuperAdmin && (
              <MenuRow label="Admin Controls" onClick={() => setSubScreen("adminControls")} hasArrow />
            )}
            {isShopAdmin && (
              <MenuRow
                label={`Shop Admin${shopLabel ? ` • ${shopLabel}` : ""}`}
                onClick={() => setSubScreen("shopAdminControls")}
                hasArrow
              />
            )}
            <MenuRow label="Categories" onClick={() => setSubScreen("categories")} hasArrow />
            <MenuRow label="Departments" onClick={() => setSubScreen("departments")} hasArrow />
            <MenuRow label="More" onClick={() => setSubScreen("more")} hasArrow />
            <MenuRow label="Offers" onClick={onOffersClick} />

            <div className="menu-divider" />

            {!user ? (
              <>
                <MenuRow label="Login" onClick={() => go("/login")} active={isRouteActive("/login")} />
                <MenuRow label="Sign up" onClick={() => go("/signup")} active={isRouteActive("/signup")} />
              </>
            ) : !confirmLogout ? (
              <MenuRow label="Logout" onClick={() => setConfirmLogout(true)} danger />
            ) : (
              <div className="side-confirm">
                <p className="side-confirm-text">Are you sure you want to log out?</p>
                <div className="side-confirm-actions">
                  <button className="side-confirm-btn" onClick={() => setConfirmLogout(false)} type="button">Cancel</button>
                  <button className="side-confirm-btn side-confirm-btn--danger" onClick={onLogout} type="button">Log out</button>
                </div>
              </div>
            )}

            <div className="menu-divider" />

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

        {/* Sub screen */}
        {activeSubScreen && (
          <div className={`sub-screen ${subScreen ? "slide-in" : ""}`}>
            <div className="side-header">
              <button type="button" className="side-back" onClick={() => setSubScreen(null)} aria-label="Back">
                <ChevronLeft />
                <span>Back</span>
              </button>
              <button onClick={onClose} aria-label="Close menu" className="side-close" type="button">×</button>
            </div>

            <div className="side-scroll">
              <div className="sub-screen-title">{activeSubScreen.title}</div>
              {activeSubScreen.items.map((item, i) => (
                <MenuRow
                  key={i}
                  label={item.label}
                  onClick={item.action ? item.action : () => go(item.path)}
                  active={item.path ? isRouteActive(item.path) : false}
                />
              ))}
            </div>
          </div>
        )}

      </aside>
    </div>
  );
}