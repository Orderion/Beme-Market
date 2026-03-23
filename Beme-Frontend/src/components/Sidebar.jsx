import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

// --- Icons (Existing SVG logic remains same) ---
/* ... (IconHome, IconShop, etc. from your original code) ... */

function SidebarRow({ icon, label, onClick, danger = false, hasSubmenu = false, active = false }) {
  return (
    <button
      className={`sidebar-link ${danger ? "sidebar-link--danger" : ""} ${active ? "is-active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span className="side-link-content">
        {icon}
        <span className="side-label">{label}</span>
      </span>
      {hasSubmenu && (
        <span className="side-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="side-chevron-svg">
            <path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout, isSuperAdmin, isShopAdmin, adminShop } = useAuth();

  const [view, setView] = useState("main"); 
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmLogout(false);
      setView("main");
      setActiveSubmenu(null);
    }
  }, [isOpen]);

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  const onLogout = async () => {
    try { await logout(); } finally {
      setConfirmLogout(false);
      onClose?.();
      navigate("/", { replace: true });
    }
  };

  return (
    <div className={`side-shell ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
      <div className={`overlay ${isOpen ? "is-open" : ""}`} onClick={onClose} />

      <aside className={`side-panel ${isOpen ? "open" : ""}`}>
        <div className="side-header">
          {view === "sub" ? (
            <button className="side-back-btn" onClick={() => setView("main")}>
              <svg viewBox="0 0 24 24" className="side-back-icon"><path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>Back</span>
            </button>
          ) : (
            <h3 className="side-title">Menu</h3>
          )}
          <button onClick={onClose} className="side-close" type="button">×</button>
        </div>

        <div className="side-scroll">
          {/* MAIN VIEW */}
          <div className={`side-view-container ${view === "main" ? "active" : "inactive-left"}`}>
            <section className="side-group">
              <div className="side-group-label">PLATFORM</div>
              <div className="side-group-list">
                <SidebarRow icon={<IconHome />} label="Home" onClick={() => go("/")} active={location.pathname === "/"} />
                <SidebarRow icon={<IconShop />} label="Shop" onClick={() => go("/shop")} active={location.pathname === "/shop"} />
                {user && <SidebarRow icon={<IconOrders />} label="Orders" onClick={() => go("/orders")} active={location.pathname === "/orders"} />}
              </div>
            </section>

            <section className="side-group">
              <div className="side-group-label">BROWSE</div>
              <div className="side-group-list">
                <SidebarRow icon={<IconGrid />} label="Categories" onClick={() => { setActiveSubmenu("categories"); setView("sub"); }} hasSubmenu />
                <SidebarRow icon={<IconLayers />} label="Departments" onClick={() => { setActiveSubmenu("departments"); setView("sub"); }} hasSubmenu />
              </div>
            </section>

            <section className="side-group">
              <div className="side-group-label">ACCOUNT</div>
              <div className="side-group-list">
                {!user ? (
                  <SidebarRow icon={<IconLogin />} label="Login" onClick={() => go("/login")} />
                ) : !confirmLogout ? (
                  <SidebarRow icon={<IconLogout />} label="Logout" onClick={() => setConfirmLogout(true)} danger />
                ) : (
                  <div className="side-confirm">
                    <p className="side-confirm-text">Are you sure you want to logout?</p>
                    <div className="side-confirm-actions">
                      <button onClick={onLogout} className="side-confirm-btn side-confirm-btn--danger">Yes</button>
                      <button onClick={() => setConfirmLogout(false)} className="side-confirm-btn">No</button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* THEME TOGGLE AT THE BOTTOM */}
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
                >
                  <span className="theme-toggle-track">
                    <span className="theme-toggle-thumb" />
                  </span>
                </button>
              </div>
            </section>
          </div>

          {/* SUBMENU VIEW */}
          <div className={`side-view-container ${view === "sub" ? "active" : "inactive-right"}`}>
            {activeSubmenu === "categories" && (
              <section className="side-group">
                <div className="side-group-label">ALL CATEGORIES</div>
                {["Tech", "Fashion", "Accessories"].map(cat => (
                  <button key={cat} className="side-sub-link" onClick={() => go(`/shop?q=${cat.toLowerCase()}`)}>{cat}</button>
                ))}
              </section>
            )}
            {/* Add other submenus here... */}
          </div>
        </div>
      </aside>
    </div>
  );
}
