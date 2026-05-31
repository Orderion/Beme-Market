import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth }       from "../context/AuthContext";
import { useTheme }      from "../context/ThemeContext";
import { useSellerAuth } from "../hooks/useSellerAuth";
import TopbarDropdown    from "./dashboard/TopbarDropdown";
import "../pages/SellerDashboard.css";

// ── Lazy-load all pages ──
const DashboardHome         = lazy(() => import("./dashboard/DashboardHome"));
const DashboardProducts     = lazy(() => import("./dashboard/DashboardProducts"));
const DashboardOrders       = lazy(() => import("./dashboard/DashboardOrders"));
const DashboardCustomers    = lazy(() => import("./dashboard/DashboardCustomers"));
const DashboardChat         = lazy(() => import("./dashboard/DashboardChat"));
const DashboardMarketing    = lazy(() => import("./dashboard/DashboardMarketing"));
const DashboardAnalytics    = lazy(() => import("./dashboard/DashboardAnalytics"));
const DashboardWithdrawals  = lazy(() => import("./dashboard/DashboardWithdrawals"));
const DashboardAppearance   = lazy(() => import("./dashboard/DashboardAppearance"));
const DashboardSubscription = lazy(() => import("./dashboard/DashboardSubscription"));
const AIAssistant           = lazy(() => import("./dashboard/AIAssistant"));
const DashboardSettings     = lazy(() => import("./dashboard/DashboardSettings"));
const LearnMore             = lazy(() => import("./dashboard/LearnMore"));
const DashboardHelp         = lazy(() => import("./dashboard/DashboardHelp"));
const DashboardGift         = lazy(() => import("./dashboard/DashboardGift"));

function Ico({ d, size = 18, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const D = {
  home:         "M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z|M9 21V12h6v9",
  products:     "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z|M3.27 6.96L12 12.01l8.73-5.05|M12 22.08V12",
  orders:       "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z|M3 6h18|M16 10a4 4 0 0 1-8 0",
  customers:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75",
  chat:         "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  marketing:    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  analytics:    "M18 20V10|M12 20V4|M6 20v-6",
  withdrawals:  "M21 12V7H5a2 2 0 0 1 0-4h14v4|M3 5v14a2 2 0 0 0 2 2h16v-5|M18 12h.01",
  appearance:   "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",
  ai:           "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  subscription: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  settings:     "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  menu:         "M3 12h18|M3 6h18|M3 18h18",
  sun:          "M12 1v2|M12 21v2|M4.22 4.22l1.42 1.42|M18.36 18.36l1.42 1.42|M1 12h2|M21 12h2|M4.22 19.78l1.42-1.42|M18.36 5.64l1.42-1.42|M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  moon:         "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  chevronLeft:  "M15 18l-6-6 6-6",
  chevronRight: "M9 18l6-6-6-6",
};

const NAV = [
  { id: "home",         label: "Home",          icon: D.home },
  { id: "products",     label: "Products",      icon: D.products },
  { id: "orders",       label: "Orders",        icon: D.orders },
  { id: "customers",    label: "Customers",     icon: D.customers },
  { id: "chat",         label: "Messages",      icon: D.chat },
  { id: "marketing",    label: "Marketing",     icon: D.marketing },
  { id: "analytics",    label: "Analytics Pro", icon: D.analytics },
  { id: "withdrawals",  label: "Withdrawals",   icon: D.withdrawals },
  { id: "appearance",   label: "Store Design",  icon: D.appearance },
  { id: "ai",           label: "Beme AI",       icon: D.ai },
  { id: "subscription", label: "Subscription",  icon: D.subscription },
  { id: "settings",     label: "Settings",      icon: D.settings },
];

const TAB_TITLES = {
  home:"Home", products:"Products", orders:"Orders", customers:"Customers",
  chat:"Messages", marketing:"Marketing", analytics:"Analytics Pro",
  withdrawals:"Withdrawals", appearance:"Store Design", ai:"Beme AI",
  subscription:"Subscription", settings:"Settings",
  help:"Get Help", learn:"Learn More", gift:"Gift Beme",
};

const PAGE_MAP = {
  home:         <DashboardHome />,
  products:     <DashboardProducts />,
  orders:       <DashboardOrders />,
  customers:    <DashboardCustomers />,
  chat:         <DashboardChat />,
  marketing:    <DashboardMarketing />,
  analytics:    <DashboardAnalytics />,
  withdrawals:  <DashboardWithdrawals />,
  appearance:   <DashboardAppearance />,
  ai:           <AIAssistant />,
  subscription: <DashboardSubscription />,
  settings:     <DashboardSettings />,
  help:         <DashboardHelp />,
  learn:        <LearnMore />,
  gift:         <DashboardGift />,
};

const BADGE = { orders: 0, chat: 0 };

function PageSpinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh" }}>
      <div className="sd-page-spinner" />
    </div>
  );
}

export default function SellerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isSuperAdmin, isAdmin, isSeller, isSellerActive, subscriptionPlan, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { shop, loading: shopLoading } = useSellerAuth();

  const tabParam = searchParams.get("tab");
  const [activeTab,   setActiveTab]   = useState(tabParam && TAB_TITLES[tabParam] ? tabParam : "home");
  const [sidebarOpen, setSidebarOpen] = useState(false);   // mobile/tablet overlay
  const [collapsed,   setCollapsed]   = useState(false);   // desktop collapse only

  useEffect(() => {
    if (tabParam && TAB_TITLES[tabParam] && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam]);

  const goTab = useCallback((id) => {
    if (!TAB_TITLES[id]) return;
    setActiveTab(id);
    setSearchParams({ tab: id });
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setSearchParams]);

  if (shopLoading) return <PageSpinner />;

  const isDark   = theme === "dark";
  const shopName = shop?.shopName || profile?.shopName || "Your Store";
  const initial  = (shopName[0] || "S").toUpperCase();

  return (
    <div className={`sd-root${isDark ? " sd-dark" : ""}`}>

      {/* ══════ SIDEBAR ══════ */}
      <aside className={`sd-sidebar${collapsed ? " sd-sidebar--collapsed" : ""}${sidebarOpen ? " sd-sidebar--mobile-open" : ""}`}>

        {/* Store identity */}
        <div className="sd-store-header">
          <div className="sd-store-avatar">{initial}</div>
          <div className="sd-store-info">
            <div className="sd-store-name">{shopName}</div>
            <div className="sd-store-plan">{subscriptionPlan || "Basic"} plan</div>
          </div>
          {isSellerActive && <div className="sd-store-dot" title="Store is live" />}
        </div>

        {/* Nav */}
        <nav className="sd-nav">
          {NAV.map(item => {
            const isActive = activeTab === item.id;
            const badge    = BADGE[item.id];
            return (
              <button key={item.id}
                className={`sd-nav-item${isActive ? " sd-nav-item--active" : ""}`}
                onClick={() => goTab(item.id)}
                aria-current={isActive ? "page" : undefined}
                title={item.label}>
                <span className="sd-nav-icon">
                  <Ico d={item.icon} size={17} color={isActive ? "var(--sd-accent)" : "var(--sd-nav-icon)"} />
                </span>
                <span className="sd-nav-label">{item.label}</span>
                {badge > 0 && <span className="sd-nav-badge">{badge > 99 ? "99+" : badge}</span>}
                {item.id === "ai" && (
                  <span className="sd-ai-chip">AI</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sd-sidebar-footer">
          <button className="sd-footer-btn" onClick={toggleTheme} title={`Switch to ${isDark ? "light" : "dark"} mode`}>
            <span className="sd-nav-icon"><Ico d={isDark ? D.sun : D.moon} size={16} color="var(--sd-muted)" /></span>
            <span className="sd-nav-label sd-footer-label">{isDark ? "Light mode" : "Dark mode"}</span>
          </button>
          {/* Collapse toggle — desktop ONLY, hidden on mobile/tablet via CSS */}
          <button className="sd-footer-btn sd-collapse-btn" onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <span className="sd-nav-icon">
              <Ico d={collapsed ? D.chevronRight : D.chevronLeft} size={16} color="var(--sd-muted)" />
            </span>
            <span className="sd-nav-label sd-footer-label">Collapse</span>
          </button>
        </div>
      </aside>

      {/* Mobile/tablet overlay backdrop — closes sidebar on outside tap */}
      {sidebarOpen && <div className="sd-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ══════ MAIN ══════ */}
      <div className={`sd-main${collapsed ? " sd-main--collapsed" : ""}`}>

        {/* Topbar */}
        <header className="sd-topbar">
          {/* Hamburger — visible on mobile AND tablet (≤1024px) */}
          <button className="sd-hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle sidebar">
            <Ico d={D.menu} size={20} color="var(--sd-text)" />
          </button>
          <div className="sd-topbar-title">{TAB_TITLES[activeTab] || "Dashboard"}</div>
          <div className="sd-topbar-right">
            {isSellerActive && (
              <div className="sd-live-badge">
                <span className="sd-live-dot" />Live
              </div>
            )}
            {(isSuperAdmin || isAdmin) && (
              <button className="sd-admin-btn" onClick={() => navigate("/admin")} title="Admin panel">
                <Ico d={D.settings} size={15} color="var(--sd-muted)" />
              </button>
            )}
            <TopbarDropdown user={user} subscriptionPlan={subscriptionPlan} onTabChange={goTab} />
          </div>
        </header>

        {/* Page content */}
        <main className="sd-content">
          {!isSellerActive && activeTab !== "subscription" && activeTab !== "settings" && (
            <div className="sd-inactive-banner">
              <span>Your store is currently inactive.</span>
              <button onClick={() => goTab("subscription")}>Activate now →</button>
            </div>
          )}
          <Suspense fallback={<PageSpinner />}>
            {PAGE_MAP[activeTab] ?? <DashboardHome />}
          </Suspense>
        </main>
      </div>

      {/* ══════ STYLES ══════ */}
      <style>{`
        @keyframes sd-spin  { to { transform: rotate(360deg); } }
        @keyframes sd-sheet-up { from { transform: translateY(100%); } to { transform: none; } }
        @keyframes sd-dd-in { from { opacity:0; transform: translateY(-6px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes sd-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

        /* ════ CSS VARIABLES ════ */
        :root {
          --sd-font:         'DM Sans', 'Nunito', system-ui, sans-serif;
          --sd-accent:        #7c3aed;
          --sd-accent2:       #6d28d9;
          --sd-accent-dim:    rgba(124,58,237,0.08);
          --sd-accent-border: rgba(124,58,237,0.18);
          --sd-bg:            #f9fafb;
          --sd-white:         #ffffff;
          --sd-border:        #e5e7eb;
          --sd-border-light:  #f3f4f6;
          --sd-text:          #111827;
          --sd-text2:         #374151;
          --sd-muted:         #6b7280;
          --sd-nav-icon:      #9ca3af;
          --sd-shadow:        0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --sd-shadow-lg:     0 4px 24px rgba(0,0,0,0.08);
          --sd-danger:        #dc2626;
          --sd-danger-bg:     rgba(220,38,38,0.06);
          --sd-warning:       #f59e0b;
          --sd-warning-bg:    rgba(245,158,11,0.07);
          --sd-sidebar-w:     232px;
          --sd-sidebar-collapsed-w: 64px;
          --sd-topbar-h:      56px;
        }

        /* ── Dark mode ── */
        .sd-dark {
          --sd-bg:            #0e0b1a;
          --sd-white:         #18152a;
          --sd-border:        #2d2547;
          --sd-border-light:  #231d38;
          --sd-text:          #ede9fa;
          --sd-text2:         #c4b5fd;
          --sd-muted:         #7c6fab;
          --sd-nav-icon:      #6b5f8a;
          --sd-accent-dim:    rgba(124,58,237,0.15);
          --sd-accent-border: rgba(124,58,237,0.30);
          --sd-danger-bg:     rgba(220,38,38,0.12);
          --sd-warning-bg:    rgba(245,158,11,0.12);
          --sd-shadow:        0 1px 3px rgba(0,0,0,0.3);
          --sd-shadow-lg:     0 4px 24px rgba(0,0,0,0.30);
        }

        /* ════ ROOT ════ */
        .sd-root {
          display: flex;
          min-height: 100vh;
          background: var(--sd-bg);
          font-family: var(--sd-font);
          color: var(--sd-text);
        }

        /* ════ SIDEBAR ════ */
        .sd-sidebar {
          width: var(--sd-sidebar-w);
          flex-shrink: 0;
          background: var(--sd-white);
          border-right: 1px solid var(--sd-border);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          overflow-y: auto;
          overflow-x: hidden;
          z-index: 100;
          transition: width 0.22s cubic-bezier(0.4,0,0.2,1);
        }

        /* ── Store header ── */
        .sd-store-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 14px 12px;
          border-bottom: 1px solid var(--sd-border-light);
          position: relative;
          flex-shrink: 0;
          overflow: hidden;
        }
        .sd-store-avatar {
          width: 34px; height: 34px; border-radius: 10px;
          background: var(--sd-accent); color: #fff;
          font-size: 14px; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          letter-spacing: -0.02em;
        }
        .sd-store-info { flex: 1; min-width: 0; overflow: hidden; }
        .sd-store-name {
          font-size: 13px; font-weight: 700; color: var(--sd-text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .sd-store-plan { font-size: 11px; color: var(--sd-muted); font-weight: 500; margin-top: 1px; }
        .sd-store-dot  {
          width: 7px; height: 7px; border-radius: 50%; background: #22c55e;
          position: absolute; top: 14px; right: 12px; flex-shrink: 0;
        }

        /* ── Nav ── */
        .sd-nav { flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 1px; overflow-y: auto; }
        .sd-nav-item {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 9px 8px; border-radius: 8px;
          border: none; background: transparent; cursor: pointer;
          font-family: var(--sd-font); font-size: 13px; font-weight: 500;
          color: var(--sd-text2); text-align: left;
          transition: background 0.1s, color 0.1s;
          white-space: nowrap; overflow: hidden;
        }
        .sd-nav-item:hover:not(.sd-nav-item--active) {
          background: var(--sd-border-light);
          color: var(--sd-text);
        }
        .sd-nav-item--active {
          background: var(--sd-accent-dim);
          color: var(--sd-accent);
          font-weight: 700;
        }
        .sd-nav-icon  { display: flex; align-items: center; justify-content: center; width: 20px; min-width: 20px; }
        .sd-nav-label { flex: 1; overflow: hidden; text-overflow: ellipsis; transition: opacity 0.15s; }
        .sd-nav-badge {
          min-width: 18px; height: 18px; border-radius: 9px;
          background: var(--sd-accent); color: #fff;
          font-size: 9px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; padding: 0 4px;
        }
        .sd-ai-chip {
          font-size: 9px; font-weight: 800; padding: 2px 6px;
          border-radius: 100px; background: var(--sd-accent-dim);
          color: var(--sd-accent); letter-spacing: 0.04em;
          flex-shrink: 0;
          margin-left: auto;
        }

        /* ── Sidebar footer ── */
        .sd-sidebar-footer {
          padding: 8px;
          border-top: 1px solid var(--sd-border-light);
          display: flex; flex-direction: column; gap: 1px;
          flex-shrink: 0;
        }
        .sd-footer-btn {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 9px 8px; border-radius: 8px;
          border: none; background: transparent; cursor: pointer;
          font-family: var(--sd-font); font-size: 13px; font-weight: 500;
          color: var(--sd-muted); text-align: left;
          white-space: nowrap; overflow: hidden;
          transition: background 0.1s;
        }
        .sd-footer-btn:hover { background: var(--sd-border-light); }
        .sd-footer-label { color: var(--sd-muted); font-size: 13px; }

        /* ── DESKTOP COLLAPSED STATE ── */
        .sd-sidebar--collapsed {
          width: var(--sd-sidebar-collapsed-w);
          position: fixed;
          top: 0; left: 0; bottom: 0;
          overflow: hidden;
        }
        .sd-sidebar--collapsed:hover {
          width: var(--sd-sidebar-w);
          overflow-y: auto;
          box-shadow: 4px 0 20px rgba(0,0,0,0.12);
        }
        .sd-sidebar--collapsed:not(:hover) .sd-nav { padding-left: 0; padding-right: 0; }
        .sd-sidebar--collapsed:not(:hover) .sd-sidebar-footer { padding-left: 0; padding-right: 0; }
        .sd-sidebar--collapsed:not(:hover) .sd-store-header {
          padding-left: 0; padding-right: 0;
          justify-content: center; gap: 0;
        }
        .sd-sidebar--collapsed:not(:hover) .sd-nav-item {
          justify-content: center;
          padding-left: 0; padding-right: 0;
          gap: 0;
        }
        .sd-sidebar--collapsed:not(:hover) .sd-footer-btn {
          justify-content: center;
          padding-left: 0; padding-right: 0;
          gap: 0;
        }
        .sd-sidebar--collapsed:not(:hover) .sd-nav-icon {
          width: 100%;
          justify-content: center;
          min-width: unset;
        }
        .sd-sidebar--collapsed:not(:hover) .sd-nav-label,
        .sd-sidebar--collapsed:not(:hover) .sd-store-info,
        .sd-sidebar--collapsed:not(:hover) .sd-store-dot,
        .sd-sidebar--collapsed:not(:hover) .sd-footer-label,
        .sd-sidebar--collapsed:not(:hover) .sd-ai-chip,
        .sd-sidebar--collapsed:not(:hover) .sd-nav-badge { display: none; }
        .sd-main--collapsed { margin-left: var(--sd-sidebar-collapsed-w); }


        /* ════ MAIN AREA ════ */
        .sd-main {
          flex: 1; display: flex; flex-direction: column;
          min-width: 0; overflow-x: hidden;
        }
        .sd-topbar {
          position: sticky; top: 0; z-index: 90;
          display: flex; align-items: center; gap: 12px;
          padding: 0 20px; height: var(--sd-topbar-h);
          background: var(--sd-white);
          border-bottom: 1px solid var(--sd-border);
        }

        /* Hamburger hidden on desktop, shown on mobile+tablet */
        .sd-hamburger {
          display: none; background: none; border: none;
          cursor: pointer; padding: 6px; border-radius: 8px;
        }
        .sd-hamburger:hover { background: var(--sd-border-light); }

        .sd-topbar-title {
          font-size: 15px; font-weight: 700; color: var(--sd-text);
          letter-spacing: -0.01em; flex: 1;
        }
        .sd-topbar-right { display: flex; align-items: center; gap: 8px; }
        .sd-live-badge {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 100px;
          background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2);
          font-size: 11px; font-weight: 700; color: #16a34a;
        }
        .sd-live-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
          animation: sd-pulse 1.8s ease infinite;
        }
        .sd-admin-btn {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: 1px solid var(--sd-border);
          cursor: pointer; transition: background 0.1s;
        }
        .sd-admin-btn:hover { background: var(--sd-border-light); }
        .sd-avatar-btn {
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--sd-accent); color: #fff;
          border: 2px solid transparent;
          font-size: 13px; font-weight: 900; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--sd-font); transition: box-shadow 0.15s;
        }
        .sd-avatar-btn:hover, .sd-avatar-btn--open {
          box-shadow: 0 0 0 3px var(--sd-accent-dim);
        }
        .sd-content {
          flex: 1; padding: 24px 24px 60px;
          max-width: 100%; overflow-x: hidden;
        }
        .sd-inactive-banner {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; margin-bottom: 16px;
          background: var(--sd-warning-bg);
          border: 1px solid rgba(245,158,11,0.2);
          border-radius: 10px; font-size: 13px; font-weight: 500;
          color: #92400e;
        }
        .sd-inactive-banner button {
          margin-left: 4px; color: var(--sd-accent); font-weight: 700;
          background: none; border: none; cursor: pointer;
          font-family: var(--sd-font); font-size: 13px; padding: 0;
        }
        .sd-page-spinner {
          width: 32px; height: 32px; border-radius: 50%;
          border: 2.5px solid var(--sd-border);
          border-top-color: var(--sd-accent);
          animation: sd-spin 0.7s linear infinite;
        }

        /* ── Sidebar overlay backdrop ── */
        .sd-sidebar-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.36); z-index: 99;
          display: none;
        }

        /* ── Shared component classes ── */
        .sd-panel {
          background: var(--sd-white);
          border: 1px solid var(--sd-border);
          border-radius: 12px; padding: 20px;
        }
        .sd-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 8px; border: none;
          font-family: var(--sd-font); font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .sd-btn-primary  { background: var(--sd-accent); color: #fff; }
        .sd-btn-primary:hover:not(:disabled) { background: var(--sd-accent2); }
        .sd-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .sd-btn-ghost    { background: transparent; color: var(--sd-text); border: 1px solid var(--sd-border) !important; }
        .sd-btn-ghost:hover { background: var(--sd-border-light); }
        .sd-btn-danger   { background: var(--sd-danger-bg); color: var(--sd-danger); border: 1px solid rgba(220,38,38,0.15) !important; }
        .sd-input, .sd-select, .sd-textarea {
          width: 100%; padding: 9px 12px; border-radius: 8px;
          border: 1px solid var(--sd-border);
          background: var(--sd-bg); color: var(--sd-text);
          font-size: 13.5px; font-weight: 400; outline: none;
          font-family: var(--sd-font); transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .sd-input:focus, .sd-select:focus, .sd-textarea:focus {
          border-color: var(--sd-accent);
          box-shadow: 0 0 0 3px var(--sd-accent-dim);
        }
        .sd-textarea { resize: vertical; min-height: 90px; }
        .sd-label {
          display: block; font-size: 11px; font-weight: 600;
          color: var(--sd-muted); text-transform: uppercase;
          letter-spacing: 0.07em; margin-bottom: 6px;
        }
        .sd-form-group { margin-bottom: 16px; }

        /* ══════════════════════════════════════
           RESPONSIVE
           ≤ 1024px  →  hamburger + overlay sidebar (mobile & tablet)
           > 1024px  →  always-visible sidebar with collapse toggle
        ══════════════════════════════════════ */

        /* Tablet + Mobile */
        @media (max-width: 1024px) {
          /* Sidebar slides in from left as overlay */
          .sd-sidebar {
            position: fixed; left: 0; top: 0; bottom: 0;
            transform: translateX(-100%);
            z-index: 200;
            width: var(--sd-sidebar-w) !important;
            box-shadow: none;
            /* Override any collapsed state on small screens */
          }
          .sd-sidebar--mobile-open {
            transform: translateX(0) !important;
            box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          }
          /* Show overlay backdrop when sidebar is open */
          .sd-sidebar-overlay { display: block; }

          /* Show hamburger */
          .sd-hamburger { display: flex; align-items: center; justify-content: center; }

          /* Remove desktop collapsed margin */
          .sd-main--collapsed { margin-left: 0 !important; }

          /* Ensure full labels are visible inside the overlay sidebar */
          .sd-nav-label, .sd-store-info, .sd-store-dot, .sd-footer-label {
            opacity: 1 !important;
            width: auto !important;
            display: block !important;
          }
          .sd-nav-item, .sd-footer-btn {
            justify-content: flex-start !important;
            padding: 9px 8px !important;
            gap: 9px !important;
          }
          .sd-store-header {
            justify-content: flex-start !important;
            padding: 16px 14px 12px !important;
          }
          .sd-nav-icon {
            width: 20px !important;
            min-width: 20px !important;
            justify-content: flex-start !important;
          }
          .sd-ai-chip { display: inline-flex !important; }

          /* Hide the collapse button — only useful on desktop */
          .sd-collapse-btn { display: none !important; }

          .sd-content { padding: 16px 16px 60px; }
        }

        @media (max-width: 480px) {
          .sd-live-badge { display: none; }
        }
      `}</style>
    </div>
  );
}