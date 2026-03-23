import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_KIND_BY_DEPT } from "../constants/catalog";
import "./Sidebar.css";

// --- Icons ---
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function IconShop() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path d="M5 8h14l-1 11H6L5 8z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path d="m12 4 8 4-8 4-8-4 8-4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m4 12 8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m4 16 8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
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
      <path d="M20 13 11 22l-9-9V4h9l9 9Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}
function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path d="M7 4.5h10a2 2 0 0 1 2 2V19a1 1 0 0 1-1.6.8L12 16l-5.4 3.8A1 1 0 0 1 5 19V6.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 8.5h6M9 11.5h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconReviewQueue() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path d="M6 5.5h9a2 2 0 0 1 2 2V18a1 1 0 0 1-1.6.8L12 16.5l-3.4 2.3A1 1 0 0 1 7 18V6.5a1 1 0 0 0-1-1Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 9.2h5.5M9 12.2h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="18" cy="17.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m19.8 19.3 1.7 1.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconLogin() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path d="M10 17v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 12h10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="m11 9 3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUserPlus() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 20a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M19 8V4M17 6h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 12h10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="m7 9-3 3 3 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSun() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path d="M12 3 19 6v5c0 5-2.8 8.5-7 10-4.2-1.5-7-5-7-10V6l7-3Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function IconAccount() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 19a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M18.5 5.5h2M19.5 4.5v2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconTools() {
  return (
    <svg viewBox="0 0 24 24" className="side-svg" aria-hidden="true">
      <path d="M14.5 6.5a4 4 0 0 0 4.9 4.9l-7.6 7.6a2 2 0 1 1-2.8-2.8l7.6-7.6a4 4 0 0 0-4.9-4.9l2.4 2.4-1.8 1.8-2.4-2.4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <span className="side-chevron" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="side-chevron-svg">
        <path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" className="side-back-icon" aria-hidden="true">
      <path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function SidebarRow({
  icon,
  label,
  onClick,
  danger = false,
  hasSubmenu = false,
  active = false,
}) {
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
      {hasSubmenu && <ChevronRight />}
    </button>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout, isSuperAdmin, isShopAdmin, adminShop } = useAuth();

  // 'main' or 'sub' (based on MongoDB logic)
  const [view, setView] = useState("main"); 
  const [activeSubmenu, setActiveSubmenu] = useState(null);
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
      setView("main");
      setActiveSubmenu(null);
    }
  }, [isOpen]);

  const go = (path) => {
    setConfirmLogout(false);
    navigate(path);
    onClose?.();
  };

  const openSubmenu = (menuId) => {
    setActiveSubmenu(menuId);
    setView("sub");
  };

  const goBack = () => {
    setView("main");
    setActiveSubmenu(null);
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

  return (
    <div className={`side-shell ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
      <div className={`overlay ${isOpen ? "is-open" : ""}`} onClick={onClose} />

      <aside className={`side-panel ${isOpen ? "open" : ""}`} aria-label="Sidebar menu">
        
        {/* Dynamic Header based on View */}
        <div className="side-header">
          {view === "sub" ? (
            <button className="side-back-btn" onClick={goBack}>
              <IconBack />
              <span>Back</span>
            </button>
          ) : (
            <div className="side-header-copy">
              <h3 className="side-title">Menu</h3>
            </div>
          )}
          <button onClick={onClose} aria-label="Close menu" className="side-close" type="button">×</button>
        </div>

        <div className="side-scroll">
          {/* VIEW 1: MAIN MENU */}
          <div className={`side-view-container ${view === "main" ? "active" : "inactive-left"}`}>
            
            <section className="side-group">
              <div className="side-group-label">PLATFORM</div>
              <div className="side-group-list">
                <SidebarRow icon={<IconHome />} label="Home" onClick={() => go("/")} active={isRouteActive("/")} />
                <SidebarRow icon={<IconShop />} label="Shop" onClick={() => go("/shop")} active={isRouteActive("/shop")} />
                {user && <SidebarRow icon={<IconOrders />} label="Orders" onClick={() => go("/orders")} active={isRouteActive("/orders")} />}
              </div>
            </section>

            <section className="side-group">
              <div className="side-group-label">BROWSE</div>
              <div className="side-group-list">
                <SidebarRow icon={<IconGrid />} label="Categories" onClick={() => openSubmenu("categories")} hasSubmenu />
                <SidebarRow icon={<IconLayers />} label="Departments" onClick={() => openSubmenu("departments")} hasSubmenu />
                <SidebarRow icon={<IconMore />} label="More" onClick={() => openSubmenu("more")} hasSubmenu />
                <SidebarRow icon={<IconTag />} label="Offers" onClick={() => !offers.length ? alert("No offers yet.") : onClose()} />
              </div>
            </section>

            {(isSuperAdmin || isShopAdmin) && (
              <section className="side-group">
                <div className="side-group-label">ADMINISTRATION {shopLabel && `• ${shopLabel}`}</div>
                <div className="side-group-list">
                  <SidebarRow icon={<IconShield />} label="Product Manager" onClick={() => go("/admin")} active={isRouteActive("/admin")} />
                  <SidebarRow icon={<IconReviewQueue />} label="Review Queue" onClick={() => go("/admin-review-queue")} active={isRouteActive("/admin-review-queue")} />
                  <SidebarRow icon={<IconOrders />} label="Management Orders" onClick={() => go("/admin-orders")} active={isRouteActive("/admin-orders")} />
                  <SidebarRow icon={<IconGrid />} label="Analytics" onClick={() => go("/analytics")} active={isRouteActive("/analytics")} />
                </div>
              </section>
            )}

            <section className="side-group">
               <div className="side-group-label">ACCOUNT</div>
               <div className="side-group-list">
                {!user ? (
                  <>
                    <SidebarRow icon={<IconLogin />} label="Login" onClick={() => go("/login")} />
                    <SidebarRow icon={<IconUserPlus />} label="Sign up" onClick={() => go("/signup")} />
                  </>
                ) : (
                  !confirmLogout ? (
                    <SidebarRow icon={<IconLogout />} label="Logout" onClick={() => setConfirmLogout(true)} danger />
                  ) : (
                    <div className="side-confirm">
                      <p>Logout?</p>
                      <button onClick={onLogout} className="side-confirm-btn--danger">Yes</button>
                      <button onClick={() => setConfirmLogout(false)}>No</button>
                    </div>
                  )
                )}
               </div>
            </section>

            <section className="side-group side-group--toggle">
              <div className="sidebar-toggle-row">
                <div className="side-link-content"><IconSun /><span>{darkMode ? "Light mode" : "Dark mode"}</span></div>
                <button type="button" className={`theme-toggle ${darkMode ? "active" : ""}`} onClick={toggleTheme}>
                  <span className="theme-toggle-track"><span className="theme-toggle-thumb" /></span>
                </button>
              </div>
            </section>
          </div>

          {/* VIEW 2: SUBMENU (SLIDES IN) */}
          <div className={`side-view-container ${view === "sub" ? "active" : "inactive-right"}`}>
            
            {activeSubmenu === "categories" && (
              <section className="side-group">
                <div className="side-group-label">ALL CATEGORIES</div>
                <div className="side-group-list">
                  {["Tech", "Fashion", "Accessories"].map(cat => (
                    <button key={cat} className="side-sub-link" onClick={() => go(`/shop?q=${cat.toLowerCase()}`)}>{cat}</button>
                  ))}
                </div>
              </section>
            )}

            {activeSubmenu === "departments" && (
              <section className="side-group">
                <div className="side-group-label">STORE DEPARTMENTS</div>
                <div className="side-group-list">
                  {["Men", "Women", "Unisex", "Kids", "Accessories"].map(dept => (
                    <button key={dept} className="side-sub-link" onClick={() => go(`/shop?dept=${dept.toLowerCase()}`)}>{dept}</button>
                  ))}
                </div>
              </section>
            )}

            {activeSubmenu === "more" && (
              <section className="side-group">
                <div className="side-group-label">RESOURCES</div>
                <div className="side-group-list">
                  {["About", "Support", "Contact", "FAQ", "Shipping & Returns"].map(link => (
                    <button key={link} className="side-sub-link" onClick={() => go(`/${link.toLowerCase().replace(/ /g, '')}`)}>{link}</button>
                  ))}
                </div>
              </section>
            )}
          </div>

        </div>
      </aside>
    </div>
  );
}
