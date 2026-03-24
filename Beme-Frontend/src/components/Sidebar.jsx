import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_KIND_BY_DEPT } from "../constants/catalog";
import "./Sidebar.css";

// Helper for the "Back" arrow icon
function IconBack() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Helper for the "Forward" chevron (MongoDB style)
function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg-small" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout, isSuperAdmin, isShopAdmin } = useAuth();

  // 'main', 'categories', 'departments', or 'more'
  const [currentView, setCurrentView] = useState("main");

  // Reset view when sidebar closes
  useEffect(() => {
    if (!isOpen) setCurrentView("main");
  }, [isOpen]);

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  const renderMainView = () => (
    <div className="menu-page">
      <div className="side-group-list">
        <button className="menu-item" onClick={() => go("/")}>Home</button>
        <button className="menu-item" onClick={() => go("/shop")}>Shop</button>
        
        {/* Drill-down triggers */}
        <button className="menu-item" onClick={() => setCurrentView("categories")}>
          Categories <IconChevronRight />
        </button>
        <button className="menu-item" onClick={() => setCurrentView("departments")}>
          Departments <IconChevronRight />
        </button>

        {user && <button className="menu-item" onClick={() => go("/orders")}>Orders</button>}
        
        <button className="menu-item" onClick={() => setCurrentView("more")}>
          More <IconChevronRight />
        </button>

        {(isSuperAdmin || isShopAdmin) && (
          <button className="menu-item admin-highlight" onClick={() => go("/admin")}>
            Admin Controls <IconChevronRight />
          </button>
        )}
      </div>

      <div className="side-footer">
        {!user ? (
          <button className="btn-get-started" onClick={() => go("/signup")}>Get Started</button>
        ) : (
          <button className="menu-item danger" onClick={logout}>Logout</button>
        )}
        <button className="theme-toggle-row" onClick={toggleTheme}>
           {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
    </div>
  );

  const renderSubView = (title, options, onBack) => (
    <div className="menu-page">
      <button className="back-button" onClick={onBack}>
        <IconBack /> Back
      </button>
      <h2 className="sub-view-title">{title}</h2>
      <div className="side-group-list">
        {options.map((opt) => (
          <button key={opt.label} className="menu-item" onClick={opt.onClick}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`side-shell ${isOpen ? "is-open" : ""}`}>
      <aside className="side-panel">
        <div className="side-header">
          <div className="logo-placeholder">MARKET</div>
          <button onClick={onClose} className="side-close">×</button>
        </div>

        <div className={`view-container view-${currentView}`}>
          {currentView === "main" && renderMainView()}
          
          {currentView === "categories" && renderSubView("Categories", [
            { label: "Tech", onClick: () => go("/shop?q=tech") },
            { label: "Fashion", onClick: () => go("/shop?q=fashion") },
            { label: "Accessories", onClick: () => go("/shop?q=accessories") },
          ], () => setCurrentView("main"))}

          {currentView === "departments" && renderSubView("Departments", [
            { label: "Men", onClick: () => go("/shop?dept=men") },
            { label: "Women", onClick: () => go("/shop?dept=women") },
          ], () => setCurrentView("main"))}
          
          {/* Add 'More' subview similarly */}
        </div>
      </aside>
    </div>
  );
}
