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

/* --- ICONS (Preserved exactly as provided) --- */
function IconHome() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>; }
function IconShop() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><path d="M5 8h14l-1 11H6L5 8z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function IconGrid() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg>; }
function IconLayers() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><path d="m12 4 8 4-8 4-8-4 8-4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m4 12 8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m4 16 8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>; }
function IconMore() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><circle cx="6" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="18" cy="12" r="1.6" fill="currentColor" /></svg>; }
function IconTag() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><path d="M20 13 11 22l-9-9V4h9l9 9Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="7" cy="7" r="1.5" fill="currentColor" /></svg>; }
function IconOrders() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><path d="M7 4.5h10a2 2 0 0 1 2 2V19a1 1 0 0 1-1.6.8L12 16l-5.4 3.8A1 1 0 0 1 5 19V6.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 8.5h6M9 11.5h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function IconReviewQueue() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><path d="M6 5.5h9a2 2 0 0 1 2 2V18a1 1 0 0 1-1.6.8L12 16.5l-3.4 2.3A1 1 0 0 1 7 18V6.5a1 1 0 0 0-1-1Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 9.2h5.5M9 12.2h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="18" cy="17.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="m19.8 19.3 1.7 1.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function IconLogin() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><path d="M10 17v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M4 12h10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="m11 9 3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconUserPlus() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M5 20a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M19 8V4M17 6h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function IconLogout() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><path d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M4 12h10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="m7 9-3 3 3 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconSun() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function IconShield() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><path d="M12 3 19 6v5c0 5-2.8 8.5-7 10-4.2-1.5-7-5-7-10V6l7-3Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>; }
function IconAccount() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M5 19a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M18.5 5.5h2M19.5 4.5v2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function IconTools() { return <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true"><path d="M14.5 6.5a4 4 0 0 0 4.9 4.9l-7.6 7.6a2 2 0 1 1-2.8-2.8l7.6-7.6a4 4 0 0 0-4.9-4.9l2.4 2.4-1.8 1.8-2.4-2.4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

// New Drill-down Arrows
function IconNext() { return <svg viewBox="0 0 24 24" className="side-svg-small"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconBack() { return <svg viewBox="0 0 24 24" className="side-svg-small"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

function SidebarRow({ icon, label, onClick, danger, expand, active, showChevron = false }) {
  return (
    <button
      className={`sidebar-link ${danger ? "danger" : ""} ${active ? "is-active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <div className="side-link-content">
        {icon}
        <span>{label}</span>
      </div>
      {showChevron && <IconNext />}
    </button>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout, isSuperAdmin, isShopAdmin, adminShop } = useAuth();

  // "main", "categories", "departments", "more"
  const [currentView, setCurrentView] = useState("main");
  const [confirmLogout, setConfirmLogout] = useState(false);

  const offers = useMemo(() => [], []);
  const shopLabel = useMemo(() => (adminShop ? titleize(adminShop) : ""), [adminShop]);

  const isRouteActive = (path) => path && location.pathname === path;

  // Effects
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (!isOpen) {
      setCurrentView("main");
      setConfirmLogout(false);
    }
  }, [isOpen]);

  const go = (path) => {
    setConfirmLogout(false);
    navigate(path);
    onClose?.();
  };

  const onLogout = async () => {
    try { await logout(); } finally { onClose?.(); navigate("/", { replace: true }); }
  };

  /* --- VIEW RENDERING --- */

  const MainView = () => (
    <div className="menu-page">
      <section className="side-group">
        <SidebarRow icon={<IconHome />} label="Home" onClick={() => go("/")} active={isRouteActive("/")} />
        <SidebarRow icon={<IconShop />} label="Shop" onClick={() => go("/shop")} active={isRouteActive("/shop")} />
        {user && <SidebarRow icon={<IconOrders />} label="Orders" onClick={() => go("/orders")} active={isRouteActive("/orders")} />}
      </section>

      {(isSuperAdmin || isShopAdmin) && (
        <section className="side-group">
          <div className="side-group-label">{isSuperAdmin ? "Admin Controls" : `Shop Admin • ${shopLabel}`}</div>
          <SidebarRow icon={<IconShield />} label="Product Manager" onClick={() => go("/admin")} active={isRouteActive("/admin")} />
          <SidebarRow icon={<IconReviewQueue />} label="Review Queue" onClick={() => go("/admin-review-queue")} active={isRouteActive("/admin-review-queue")} />
          <SidebarRow icon={<IconOrders />} label="Orders" onClick={() => go("/admin-orders")} active={isRouteActive("/admin-orders")} />
          <SidebarRow icon={<IconGrid />} label="Analytics" onClick={() => go("/analytics")} active={isRouteActive("/analytics")} />
        </section>
      )}

      <section className="side-group">
        <SidebarRow icon={<IconGrid />} label="Categories" onClick={() => setCurrentView("categories")} showChevron />
        <SidebarRow icon={<IconLayers />} label="Departments" onClick={() => setCurrentView("departments")} showChevron />
        <SidebarRow icon={<IconMore />} label="More" onClick={() => setCurrentView("more")} showChevron />
        <SidebarRow icon={<IconTag />} label="Offers" onClick={() => { if(!offers.length) alert("No offers yet"); else onClose(); }} />
      </section>

      <section className="side-group footer-actions">
        {!user ? (
          <>
            <SidebarRow icon={<IconLogin />} label="Login" onClick={() => go("/login")} />
            <SidebarRow icon={<IconUserPlus />} label="Sign up" onClick={() => go("/signup")} />
          </>
        ) : (
          <SidebarRow icon={<IconLogout />} label="Logout" onClick={() => setConfirmLogout(true)} danger />
        )}
        
        <div className="theme-row" onClick={toggleTheme}>
          <div className="side-link-content"><IconSun /> <span>{darkMode ? "Light mode" : "Dark mode"}</span></div>
          <div className={`custom-toggle ${darkMode ? "active" : ""}`}><div className="toggle-thumb" /></div>
        </div>
      </section>
    </div>
  );

  const SubView = ({ title, onBack, children }) => (
    <div className="menu-page">
      <button className="back-bar" onClick={onBack}>
        <IconBack /> <span>Back</span>
      </button>
      <div className="sub-header-title">{title}</div>
      <section className="side-group">{children}</section>
    </div>
  );

  return (
    <div className={`side-shell ${isOpen ? "is-open" : ""}`}>
      <aside className={`side-panel ${isOpen ? "open" : ""}`}>
        <div className="side-header">
          <h3 className="side-title">{currentView === "main" ? "Menu" : ""}</h3>
          <button onClick={onClose} className="side-close">×</button>
        </div>

        <div className="side-scroll">
          <div className={`view-slider view-at-${currentView}`}>
            {/* Page 1: Main */}
            <div className="view-slide"><MainView /></div>

            {/* Page 2: Categories */}
            <div className="view-slide">
              <SubView title="Categories" onBack={() => setCurrentView("main")}>
                <button className="menu-item-text" onClick={() => go("/shop?q=tech")}>Tech</button>
                <button className="menu-item-text" onClick={() => go("/shop?q=fashion")}>Fashion</button>
                <button className="menu-item-text" onClick={() => go("/shop?q=accessories")}>Accessories</button>
              </SubView>
            </div>

            {/* Page 3: Departments */}
            <div className="view-slide">
              <SubView title="Departments" onBack={() => setCurrentView("main")}>
                {["men", "women", "unisex", "kids", "accessories"].map(d => (
                   <button key={d} className="menu-item-text" onClick={() => go(`/shop?dept=${d}`)}>{titleize(d)}</button>
                ))}
              </SubView>
            </div>

            {/* Page 4: More */}
            <div className="view-slide">
              <SubView title="More" onBack={() => setCurrentView("main")}>
                {["about", "support", "contact", "faq", "shipping&returns"].map(m => (
                   <button key={m} className="menu-item-text" onClick={() => go(`/${m}`)}>{titleize(m)}</button>
                ))}
              </SubView>
            </div>
          </div>
        </div>

        {confirmLogout && (
          <div className="logout-overlay">
            <div className="logout-card">
              <p>Are you sure you want to log out?</p>
              <button onClick={onLogout} className="btn-confirm-danger">Log out</button>
              <button onClick={() => setConfirmLogout(false)}>Cancel</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
