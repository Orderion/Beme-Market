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

/* ── Icons ── */
function IconHome()       { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/><path d="M9 21V12h6v9"/></svg>; }
function IconShop()       { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>; }
function IconOrders()     { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function IconAdmin()      { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4 7v5c0 4.8 3.2 7.8 8 9 4.8-1.2 8-4.2 8-9V7l-8-4Z"/><path d="M9.2 12.2 11 14l3.8-3.8"/></svg>; }
function IconShopAdmin()  { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/><path d="M12 12v5"/><path d="M8 12v5"/><path d="M16 12v5"/></svg>; }
function IconGrid()       { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>; }
function IconDepts()      { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconMore()       { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>; }
function IconLogin()      { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>; }
function IconSignup()     { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>; }
function IconLogout()     { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function IconSun()        { return <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>; }
function IconChevronRight() { return <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10 8 4 4-4 4"/></svg>; }
function IconChevronLeft()  { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 8-4 4 4 4"/></svg>; }
function IconExpand()       { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10 8 4 4-4 4"/></svg>; }
function IconCollapse()     { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 8-4 4 4 4"/></svg>; }

/* ── My Requests icon ── */
function IconRequest() {
  return (
    <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  );
}

/* ── Admin product requests icon ── */
function IconInbox() {
  return (
    <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  );
}

/* ── Media Manager icon ── */
function IconMedia() {
  return (
    <svg viewBox="0 0 24 24" className="sb-svg" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

/* ── Logo mark ── */
function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 4 7v5c0 4.8 3.2 7.8 8 9 4.8-1.2 8-4.2 8-9V7l-8-4Z"/>
      <path d="M9.2 12.2 11 14l3.8-3.8"/>
    </svg>
  );
}

const ICON_MAP = {
  home:              <IconHome />,
  shop:              <IconShop />,
  orders:            <IconOrders />,
  adminControls:     <IconAdmin />,
  shopAdminControls: <IconShopAdmin />,
  categories:        <IconGrid />,
  departments:       <IconDepts />,
  more:              <IconMore />,
  login:             <IconLogin />,
  signup:            <IconSignup />,
  logout:            <IconLogout />,
};

/* ── Menu row (used in both desktop expanded + mobile) ── */
function MenuRow({ label, icon, onClick, danger = false, hasArrow = false, active = false, badge = null }) {
  return (
    <button
      type="button"
      className={[
        "sb-row",
        active  ? "sb-row--active"  : "",
        danger  ? "sb-row--danger"  : "",
      ].filter(Boolean).join(" ")}
      onClick={onClick}
    >
      {icon && <span className="sb-row-icon">{icon}</span>}
      <span className="sb-row-label">{label}</span>
      {badge != null && <span className="sb-badge">{badge}</span>}
      {hasArrow && <span className="sb-row-arrow"><IconChevronRight /></span>}
    </button>
  );
}

/* ── Icon-only row for collapsed desktop sidebar ── */
function IconRow({ label, icon, onClick, active = false, danger = false, badge = null }) {
  return (
    <button
      type="button"
      className={[
        "sb-icon-row",
        active ? "sb-icon-row--active" : "",
        danger ? "sb-icon-row--danger" : "",
      ].filter(Boolean).join(" ")}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <span className="sb-icon-wrap">{icon}</span>
      {badge != null && <span className="sb-icon-badge">{badge}</span>}
    </button>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout, isSuperAdmin, isShopAdmin, adminShop } = useAuth();

  const [subScreen,       setSubScreen]       = useState(null);
  const [confirmLogout,   setConfirmLogout]   = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);

  const shopLabel = useMemo(() => (adminShop ? titleize(adminShop) : ""), [adminShop]);

  const isActive = (path) => path && location.pathname === path;

  /* lock body scroll when mobile drawer open */
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  /* reset state when drawer closes */
  useEffect(() => {
    if (!isOpen) { setConfirmLogout(false); setSubScreen(null); }
  }, [isOpen]);

  /* keyboard: Escape */
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

  const onLogout = async () => {
    try { await logout(); }
    finally { setConfirmLogout(false); onClose?.(); navigate("/", { replace: true }); }
  };

  /* ── sub-screen definitions ── */
  const subScreens = {
    categories: {
      title: "Categories",
      icon: <IconGrid />,
      items: [
        { label: "Tech",        action: () => goCategory("tech") },
        { label: "Fashion",     action: () => goCategory("fashion") },
        { label: "Accessories", action: () => goCategory("accessories") },
      ],
    },
    departments: {
      title: "Departments",
      icon: <IconDepts />,
      items: [
        { label: "Men",         action: () => goDept("men") },
        { label: "Women",       action: () => goDept("women") },
        { label: "Unisex",      action: () => goDept("unisex") },
        { label: "Kids",        action: () => goDept("kids") },
        { label: "Accessories", action: () => goDept("accessories") },
      ],
    },
    more: {
      title: "More",
      icon: <IconMore />,
      items: [
        { label: "About us",           path: "/about" },
        { label: "Support us",         path: "/support" },
        { label: "Contact",            path: "/contact" },
        { label: "FAQ",                path: "/faq" },
        { label: "Shipping & Returns", path: "/shipping&returns" },
      ],
    },
    adminControls: {
      title: "Admin Controls",
      icon: <IconAdmin />,
      items: [
        { label: "Product Manager",    path: "/admin",                      icon: <IconAdmin />  },
        { label: "Review Queue",       path: "/admin-review-queue",         icon: <IconAdmin />  },
        { label: "Marketplace Orders", path: "/admin-orders",               icon: <IconAdmin />  },
        { label: "Analytics",          path: "/analytics",                  icon: <IconAdmin />  },
        { label: "Payout Requests",    path: "/payout-requests",            icon: <IconAdmin />  },
        { label: "Shop Applications",  path: "/shop-applications",          icon: <IconAdmin />  },
        { label: "Account Management", path: "/account-management",         icon: <IconAdmin />  },
        { label: "Product Requests",   path: "/admin/product-requests",     icon: <IconInbox />  },
        /* ── Media Manager ── */
        { label: "Media Manager",      path: "/admin/media",                icon: <IconMedia />  },
        { label: "Own a Shop",         path: "/own-a-shop",                 icon: <IconAdmin />  },
      ],
    },
    shopAdminControls: {
      title: `Shop Admin${shopLabel ? ` • ${shopLabel}` : ""}`,
      icon: <IconShopAdmin />,
      items: [
        { label: "Product Manager",    path: "/admin" },
        { label: "Review Queue",       path: "/admin-review-queue" },
        { label: "Shop Orders",        path: "/admin-orders" },
        { label: "Analytics",          path: "/analytics" },
        { label: "Payout Requests",    path: "/payout-requests" },
        { label: "Account Management", path: "/account-management" },
      ],
    },
  };

  const activeSubScreen = subScreen ? subScreens[subScreen] : null;

  /* ────────────────────────────────────────────
     DESKTOP SIDEBAR (always visible, left rail)
  ──────────────────────────────────────────── */
  const DesktopSidebar = () => (
    <aside
      className={`sb-desktop ${desktopExpanded ? "sb-desktop--expanded" : "sb-desktop--collapsed"}`}
      aria-label="Navigation"
    >
      {/* Logo + toggle */}
      <div className="sb-desktop-header">
        {desktopExpanded && <span className="sb-logo-text">Beme</span>}
        <button
          type="button"
          className="sb-toggle-btn"
          onClick={() => { setDesktopExpanded((v) => !v); setSubScreen(null); }}
          aria-label={desktopExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {desktopExpanded ? <IconCollapse /> : <IconExpand />}
        </button>
      </div>

      <div className="sb-desktop-scroll">

        {/* ── COLLAPSED: icon-only rail ── */}
        {!desktopExpanded && (
          <>
            <IconRow label="Home"  icon={<IconHome />}  onClick={() => go("/")}     active={isActive("/")} />
            <IconRow label="Shop"  icon={<IconShop />}  onClick={() => go("/shop")} active={isActive("/shop")} />
            {user && (
              <>
                <IconRow label="Orders"      icon={<IconOrders />}  onClick={() => go("/orders")}            active={isActive("/orders")} />
                <IconRow label="My Requests" icon={<IconRequest />} onClick={() => go("/account/requests")}  active={isActive("/account/requests")} />
              </>
            )}
            {isSuperAdmin && (
              <>
                <IconRow label="Admin Controls"   icon={<IconAdmin />}  onClick={() => { setDesktopExpanded(true); setSubScreen("adminControls"); }} />
                <IconRow label="Product Requests" icon={<IconInbox />}  onClick={() => go("/admin/product-requests")} active={isActive("/admin/product-requests")} />
                <IconRow label="Media Manager"    icon={<IconMedia />}  onClick={() => go("/admin/media")}             active={isActive("/admin/media")} />
              </>
            )}
            {isShopAdmin && (
              <IconRow label={`Shop Admin${shopLabel ? ` • ${shopLabel}` : ""}`} icon={<IconShopAdmin />} onClick={() => { setDesktopExpanded(true); setSubScreen("shopAdminControls"); }} />
            )}
            <IconRow label="Categories"  icon={<IconGrid />}  onClick={() => { setDesktopExpanded(true); setSubScreen("categories"); }} />
            <IconRow label="Departments" icon={<IconDepts />} onClick={() => { setDesktopExpanded(true); setSubScreen("departments"); }} />
            <IconRow label="More"        icon={<IconMore />}  onClick={() => { setDesktopExpanded(true); setSubScreen("more"); }} />

            <div className="sb-divider" />

            {!user ? (
              <>
                <IconRow label="Login"   icon={<IconLogin />}  onClick={() => go("/login")}  active={isActive("/login")} />
                <IconRow label="Sign up" icon={<IconSignup />} onClick={() => go("/signup")} active={isActive("/signup")} />
              </>
            ) : (
              <IconRow label="Logout" icon={<IconLogout />} onClick={() => setConfirmLogout(true)} danger />
            )}

            <div className="sb-divider" />

            <button
              type="button"
              className="sb-icon-row"
              onClick={toggleTheme}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              <span className="sb-icon-wrap"><IconSun /></span>
            </button>
          </>
        )}

        {/* ── EXPANDED: full labels (no sub-screen) ── */}
        {desktopExpanded && !subScreen && (
          <>
            <MenuRow label="Home"  icon={<IconHome />}  onClick={() => go("/")}     active={isActive("/")} />
            <MenuRow label="Shop"  icon={<IconShop />}  onClick={() => go("/shop")} active={isActive("/shop")} />
            {user && (
              <>
                <MenuRow label="Orders"      icon={<IconOrders />}  onClick={() => go("/orders")}           active={isActive("/orders")} />
                <MenuRow label="My Requests" icon={<IconRequest />} onClick={() => go("/account/requests")} active={isActive("/account/requests")} />
              </>
            )}
            {isSuperAdmin && (
              <>
                <MenuRow label="Admin Controls"   icon={<IconAdmin />}  onClick={() => setSubScreen("adminControls")} hasArrow />
                <MenuRow label="Product Requests" icon={<IconInbox />}  onClick={() => go("/admin/product-requests")} active={isActive("/admin/product-requests")} />
                <MenuRow label="Media Manager"    icon={<IconMedia />}  onClick={() => go("/admin/media")}             active={isActive("/admin/media")} />
              </>
            )}
            {isShopAdmin && (
              <MenuRow
                label={`Shop Admin${shopLabel ? ` • ${shopLabel}` : ""}`}
                icon={<IconShopAdmin />}
                onClick={() => setSubScreen("shopAdminControls")}
                hasArrow
              />
            )}
            <MenuRow label="Categories"  icon={<IconGrid />}  onClick={() => setSubScreen("categories")}  hasArrow />
            <MenuRow label="Departments" icon={<IconDepts />} onClick={() => setSubScreen("departments")} hasArrow />
            <MenuRow label="More"        icon={<IconMore />}  onClick={() => setSubScreen("more")}        hasArrow />

            <div className="sb-divider" />

            {!user ? (
              <>
                <MenuRow label="Login"   icon={<IconLogin />}  onClick={() => go("/login")}  active={isActive("/login")} />
                <MenuRow label="Sign up" icon={<IconSignup />} onClick={() => go("/signup")} active={isActive("/signup")} />
              </>
            ) : !confirmLogout ? (
              <MenuRow label="Logout" icon={<IconLogout />} onClick={() => setConfirmLogout(true)} danger />
            ) : (
              <div className="sb-confirm">
                <p className="sb-confirm-text">Are you sure you want to log out?</p>
                <div className="sb-confirm-actions">
                  <button className="sb-confirm-btn" onClick={() => setConfirmLogout(false)} type="button">Cancel</button>
                  <button className="sb-confirm-btn sb-confirm-btn--danger" onClick={onLogout} type="button">Log out</button>
                </div>
              </div>
            )}

            <div className="sb-divider" />

            <div className="sb-theme-row">
              <span className="sb-theme-icon"><IconSun /></span>
              <span className="sb-theme-label">{darkMode ? "Light mode" : "Dark mode"}</span>
              <button
                type="button"
                className={`sb-switch ${darkMode ? "sb-switch--on" : ""}`}
                onClick={toggleTheme}
                aria-label="Toggle theme"
                aria-pressed={darkMode}
              >
                <span className="sb-switch-thumb" />
              </button>
            </div>
          </>
        )}

        {/* ── EXPANDED: sub-screen ── */}
        {desktopExpanded && subScreen && activeSubScreen && (
          <>
            <button
              type="button"
              className="sb-back-btn"
              onClick={() => setSubScreen(null)}
              aria-label="Back"
            >
              <IconChevronLeft />
              <span>Back</span>
            </button>
            <div className="sb-sub-title">{activeSubScreen.title}</div>
            {activeSubScreen.items.map((item, i) => (
              <MenuRow
                key={i}
                label={item.label}
                icon={item.icon || activeSubScreen.icon}
                onClick={item.action ? item.action : () => go(item.path)}
                active={item.path ? isActive(item.path) : false}
              />
            ))}
          </>
        )}

      </div>
    </aside>
  );

  /* ────────────────────────────────────────────
     MOBILE DRAWER (overlay, existing behaviour)
  ──────────────────────────────────────────── */
  return (
    <>
      {/* Desktop rail — always mounted */}
      <DesktopSidebar />

      {/* Mobile overlay drawer */}
      <div className={`sb-shell ${isOpen ? "sb-shell--open" : ""}`} aria-hidden={!isOpen}>
        <div className={`sb-overlay ${isOpen ? "sb-overlay--open" : ""}`} onClick={onClose} />

        <aside className={`sb-panel ${isOpen ? "sb-panel--open" : ""}`} aria-label="Sidebar menu">

          {/* Main screen */}
          <div className={`sb-main-screen ${subScreen ? "sb-main-screen--out" : ""}`}>
            <div className="sb-header">
              <div className="sb-header-logo">
                <div className="sb-logo-mark"><LogoMark /></div>
                <span className="sb-logo-text">Beme</span>
              </div>
              <button onClick={onClose} aria-label="Close menu" className="sb-close" type="button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="sb-scroll">
              <MenuRow label="Home"  icon={<IconHome />}  onClick={() => go("/")}     active={isActive("/")} />
              <MenuRow label="Shop"  icon={<IconShop />}  onClick={() => go("/shop")} active={isActive("/shop")} />
              {user && (
                <>
                  <MenuRow label="Orders"      icon={<IconOrders />}  onClick={() => go("/orders")}           active={isActive("/orders")} />
                  <MenuRow label="My Requests" icon={<IconRequest />} onClick={() => go("/account/requests")} active={isActive("/account/requests")} />
                </>
              )}
              {isSuperAdmin && (
                <MenuRow label="Admin Controls" icon={<IconAdmin />} onClick={() => setSubScreen("adminControls")} hasArrow />
              )}
              {isShopAdmin && (
                <MenuRow
                  label={`Shop Admin${shopLabel ? ` • ${shopLabel}` : ""}`}
                  icon={<IconShopAdmin />}
                  onClick={() => setSubScreen("shopAdminControls")}
                  hasArrow
                />
              )}
              <MenuRow label="Categories"  icon={<IconGrid />}  onClick={() => setSubScreen("categories")}  hasArrow />
              <MenuRow label="Departments" icon={<IconDepts />} onClick={() => setSubScreen("departments")} hasArrow />
              <MenuRow label="More"        icon={<IconMore />}  onClick={() => setSubScreen("more")}        hasArrow />

              <div className="sb-divider" />

              {!user ? (
                <>
                  <MenuRow label="Login"   icon={<IconLogin />}  onClick={() => go("/login")}  active={isActive("/login")} />
                  <MenuRow label="Sign up" icon={<IconSignup />} onClick={() => go("/signup")} active={isActive("/signup")} />
                </>
              ) : !confirmLogout ? (
                <MenuRow label="Logout" icon={<IconLogout />} onClick={() => setConfirmLogout(true)} danger />
              ) : (
                <div className="sb-confirm">
                  <p className="sb-confirm-text">Are you sure you want to log out?</p>
                  <div className="sb-confirm-actions">
                    <button className="sb-confirm-btn" onClick={() => setConfirmLogout(false)} type="button">Cancel</button>
                    <button className="sb-confirm-btn sb-confirm-btn--danger" onClick={onLogout} type="button">Log out</button>
                  </div>
                </div>
              )}

              <div className="sb-divider" />

              <div className="sb-theme-row">
                <span className="sb-theme-icon"><IconSun /></span>
                <span className="sb-theme-label">{darkMode ? "Light mode" : "Dark mode"}</span>
                <button
                  type="button"
                  className={`sb-switch ${darkMode ? "sb-switch--on" : ""}`}
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  aria-pressed={darkMode}
                >
                  <span className="sb-switch-thumb" />
                </button>
              </div>
            </div>
          </div>

          {/* Sub screen */}
          {activeSubScreen && (
            <div className={`sb-sub-screen ${subScreen ? "sb-sub-screen--in" : ""}`}>
              <div className="sb-header">
                <button type="button" className="sb-back-btn" onClick={() => setSubScreen(null)} aria-label="Back">
                  <IconChevronLeft />
                  <span>Back</span>
                </button>
                <button onClick={onClose} aria-label="Close menu" className="sb-close" type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="sb-scroll">
                <div className="sb-sub-title">{activeSubScreen.title}</div>
                {activeSubScreen.items.map((item, i) => (
                  <MenuRow
                    key={i}
                    label={item.label}
                    icon={item.icon || activeSubScreen.icon}
                    onClick={item.action ? item.action : () => go(item.path)}
                    active={item.path ? isActive(item.path) : false}
                  />
                ))}
              </div>
            </div>
          )}

        </aside>
      </div>
    </>
  );
}