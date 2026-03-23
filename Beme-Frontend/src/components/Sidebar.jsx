import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

// --- Icons ---
const IconHome = () => (
  <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const IconShop = () => (
  <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
    <path d="M5 8h14l-1 11H6L5 8z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const IconGrid = () => (
  <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
    <rect x="4" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);
const IconLayers = () => (
  <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
    <path d="m12 4 8 4-8 4-8-4 8-4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="m4 12 8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
    <path d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M4 12h10m-3-3-3 3 3 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconSun = () => (
  <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4l1.4-1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

function SidebarRow({ icon, label, onClick, danger, hasSubmenu, active }) {
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
        <span className="side-chevron">
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
  const { user, logout } = useAuth();

  const [view, setView] = useState("main"); 
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setView("main");
        setActiveSubmenu(null);
        setConfirmLogout(false);
      }, 300);
    }
  }, [isOpen]);

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  const openSub = (id) => {
    setActiveSubmenu(id);
    setView("sub");
  };

  return (
    <div className={`side-shell ${isOpen ? "is-open" : ""}`}>
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
          <button onClick={onClose} className="side-close">×</button>
        </div>

        <div className="side-scroll">
          {/* MAIN VIEW */}
          <div className={`side-view-container ${view === "main" ? "active" : "inactive-left"}`}>
            <section className="side-group">
              <div className="side-group-label">PLATFORM</div>
              <div className="side-group-list">
                <SidebarRow icon={<IconHome />} label="Home" onClick={() => go("/")} active={location.pathname === "/"} />
                <SidebarRow icon={<IconShop />} label="Shop" onClick={() => go("/shop")} active={location.pathname === "/shop"} />
              </div>
            </section>

            <section className="side-group">
              <div className="side-group-label">BROWSE</div>
              <div className="side-group-list">
                <SidebarRow icon={<IconGrid />} label="Categories" onClick={() => openSub("categories")} hasSubmenu />
                <SidebarRow icon={<IconLayers />} label="Departments" onClick={() => openSub("departments")} hasSubmenu />
              </div>
            </section>

            <section className="side-group">
              <div className="side-group-label">ACCOUNT</div>
              <div className="side-group-list">
                {user && !confirmLogout ? (
                  <SidebarRow icon={<IconLogout />} label="Logout" onClick={() => setConfirmLogout(true)} danger />
                ) : user && confirmLogout ? (
                  <div className="side-confirm">
                    <p className="side-confirm-text">Sign out of your account?</p>
                    <div className="side-confirm-actions">
                      <button onClick={logout} className="side-confirm-btn side-confirm-btn--danger">Logout</button>
                      <button onClick={() => setConfirmLogout(false)} className="side-confirm-btn">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <SidebarRow icon={<IconHome />} label="Login" onClick={() => go("/login")} />
                )}
              </div>
            </section>

            <section className="side-group side-group--toggle">
              <div className="sidebar-toggle-row">
                <div className="side-link-content">
                  <IconSun />
                  <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
                </div>
                <button className={`theme-toggle ${darkMode ? "active" : ""}`} onClick={toggleTheme}>
                  <span className="theme-toggle-track"><span className="theme-toggle-thumb" /></span>
                </button>
              </div>
            </section>
          </div>

          {/* SUB VIEW */}
          <div className={`side-view-container ${view === "sub" ? "active" : "inactive-right"}`}>
            {activeSubmenu === "categories" && (
              <section className="side-group">
                <div className="side-group-label">ALL CATEGORIES</div>
                {["Tech", "Fashion", "Accessories"].map(item => (
                  <button key={item} className="side-sub-link" onClick={() => go(`/shop?q=${item.toLowerCase()}`)}>{item}</button>
                ))}
              </section>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
