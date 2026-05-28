import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth }       from "../context/AuthContext";
import { useTheme }      from "../context/ThemeContext";
import { useSellerAuth } from "../hooks/useSellerAuth";
import TopbarDropdown    from "./dashboard/TopbarDropdown";
import "../pages/SellerDashboard.css";

// ── Lazy-load all dashboard pages ──
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
// New / moved pages
const AIAssistant           = lazy(() => import("./dashboard/AIAssistant"));
const DashboardSettings     = lazy(() => import("./dashboard/DashboardSettings"));
const LearnMore             = lazy(() => import("./dashboard/LearnMore"));
const DashboardHelp         = lazy(() => import("./dashboard/DashboardHelp"));
const DashboardGift         = lazy(() => import("./dashboard/DashboardGift"));

// ── SVG icon helper ──
function Ico({ d, size = 18, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

// ── Nav icon paths ──
const D = {
  home:     "M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z|M9 21V12h6v9",
  products: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z|M3.27 6.96L12 12.01l8.73-5.05|M12 22.08V12",
  orders:   "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z|M3 6h18|M16 10a4 4 0 0 1-8 0",
  customers:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75",
  chat:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  marketing:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  analytics:"M18 20V10|M12 20V4|M6 20v-6",
  withdrawals:"M21 12V7H5a2 2 0 0 1 0-4h14v4|M3 5v14a2 2 0 0 0 2 2h16v-5|M18 12h.01",
  appearance:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",
  ai:       "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  subscription:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  menu:     "M3 12h18|M3 6h18|M3 18h18",
  sun:      "M12 1v2|M12 21v2|M4.22 4.22l1.42 1.42|M18.36 18.36l1.42 1.42|M1 12h2|M21 12h2|M4.22 19.78l1.42-1.42|M18.36 5.64l1.42-1.42|M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  moon:     "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  logo:     "M12 2L2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5",
};

// ── Sidebar nav items (visible in sidebar) ──
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

// ── Tab titles (including hidden dropdown-only tabs) ──
const TAB_TITLES = {
  home:         "Home",
  products:     "Products",
  orders:       "Orders",
  customers:    "Customers",
  chat:         "Messages",
  marketing:    "Marketing",
  analytics:    "Analytics Pro",
  withdrawals:  "Withdrawals",
  appearance:   "Store Design",
  ai:           "Beme AI",
  subscription: "Subscription",
  settings:     "Settings",
  help:         "Get Help",
  learn:        "Learn More",
  gift:         "Gift Beme",
};

// ── Page map (all tabs including hidden) ──
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

// ── Notification badge placeholder ──
const BADGE = { orders: 0, chat: 0 };

// ── Page spinner ──
function PageSpinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", border: "3px solid var(--sd-accent-dim)", borderTopColor: "var(--sd-accent)", animation: "sd-spin 0.7s linear infinite" }} />
      <style>{`@keyframes sd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function SellerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate        = useNavigate();
  const { user, isSuperAdmin, isAdmin, isSeller, isSellerActive, subscriptionPlan, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { shop, loading: shopLoading } = useSellerAuth();

  // ── Active tab from URL param ──
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam && TAB_TITLES[tabParam] ? tabParam : "home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (tabParam && TAB_TITLES[tabParam] && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const goTab = useCallback((id) => {
    if (!TAB_TITLES[id]) return;
    setActiveTab(id);
    setSearchParams({ tab: id });
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setSearchParams]);

  const isDark = theme === "dark";

  // ── Guard: must be a seller ──
  if (shopLoading) return <PageSpinner />;
  if (!isSeller) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "var(--sd-font)", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🏪</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--sd-text)" }}>Seller access only</div>
        <div style={{ fontSize: 14, color: "var(--sd-muted)" }}>You need a seller account to access this dashboard.</div>
        <button onClick={() => navigate("/")} className="sd-btn sd-btn-primary" style={{ marginTop: 8 }}>Go Home</button>
      </div>
    );
  }

  const shopName = shop?.shopName || profile?.shopName || "Your Store";
  const initial  = (shopName[0] || "S").toUpperCase();

  return (
    <div className={`sd-root${isDark ? " dark" : ""}`}>

      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside className={`sd-sidebar${sidebarOpen ? " sd-sidebar--open" : ""}`}>
        {/* Logo */}
        <div className="sd-sidebar-logo">
          <div className="sd-logo-mark">
            <Ico d={D.logo} size={18} color="var(--sd-accent)" />
          </div>
          <span className="sd-logo-text">Beme</span>
        </div>

        {/* Store identity pill */}
        <div className="sd-store-pill">
          <div className="sd-store-avatar">{initial}</div>
          <div className="sd-store-info">
            <div className="sd-store-name">{shopName}</div>
            <div className="sd-store-plan">{subscriptionPlan || "Basic"} plan</div>
          </div>
          {isSellerActive && (
            <div className="sd-store-dot" title="Store is live" />
          )}
        </div>

        {/* Nav items */}
        <nav className="sd-nav" aria-label="Seller dashboard navigation">
          {NAV.map(item => {
            const isActive = activeTab === item.id;
            const badge = BADGE[item.id];
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
                {badge > 0 && (
                  <span className="sd-nav-badge">{badge > 99 ? "99+" : badge}</span>
                )}
                {item.id === "ai" && (
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 100, background: "var(--sd-accent-dim)", color: "var(--sd-accent)", marginLeft: "auto", letterSpacing: "0.04em" }}>AI</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer: theme toggle */}
        <div className="sd-sidebar-footer">
          <button className="sd-theme-toggle" onClick={toggleTheme} title={`Switch to ${isDark ? "light" : "dark"} mode`}>
            <Ico d={isDark ? D.sun : D.moon} size={16} color="var(--sd-muted)" />
            <span style={{ fontSize: 12, color: "var(--sd-muted)", fontWeight: 600 }}>{isDark ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="sd-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══════════ MAIN ═══════════ */}
      <div className="sd-main">

        {/* ── Topbar ── */}
        <header className="sd-topbar">
          {/* Mobile hamburger */}
          <button className="sd-hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle sidebar">
            <Ico d={D.menu} size={20} color="var(--sd-text)" />
          </button>

          {/* Page title */}
          <div className="sd-topbar-title">
            {TAB_TITLES[activeTab] || "Dashboard"}
          </div>

          {/* Right side */}
          <div className="sd-topbar-right">
            {/* Store status badge */}
            {isSellerActive && (
              <div className="sd-live-badge">
                <span className="sd-live-dot" />
                Live
              </div>
            )}

            {/* Admin link */}
            {(isSuperAdmin || isAdmin) && (
              <button className="sd-admin-btn" onClick={() => navigate("/admin-dashboard")} title="Admin panel">
                <Ico d={D.settings} size={15} color="var(--sd-muted)" />
              </button>
            )}

            {/* Avatar dropdown */}
            <TopbarDropdown
              user={user}
              subscriptionPlan={subscriptionPlan}
              onTabChange={goTab}
            />
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="sd-content" id="sd-main-content">
          {/* Inactive store warning */}
          {!isSellerActive && activeTab !== "subscription" && activeTab !== "settings" && (
            <div className="sd-inactive-banner">
              <Ico d={D.ai} size={16} color="var(--sd-warning)" />
              <span>Your store is currently inactive.</span>
              <button onClick={() => goTab("subscription")} style={{ marginLeft: 4, color: "var(--sd-accent)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--sd-font)", fontSize: 13 }}>
                Activate now →
              </button>
            </div>
          )}

          {/* Page */}
          <Suspense fallback={<PageSpinner />}>
            {PAGE_MAP[activeTab] ?? <DashboardHome />}
          </Suspense>
        </main>
      </div>

      {/* ── Global animation keyframes ── */}
      <style>{`
        @keyframes sd-fade-in    { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes sd-sheet-up   { from { transform:translateY(100%); } to { transform:none; } }
        @keyframes sd-dd-in      { from { opacity:0; transform:translateY(-6px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes sd-spin        { to   { transform:rotate(360deg); } }

        /* ── CSS variable bridge for ThemeContext ── */
        :root {
          --sd-font: 'DM Sans', 'Nunito', system-ui, sans-serif;
          --sd-accent:        #7c3aed;
          --sd-accent2:       #6d28d9;
          --sd-accent-dim:    rgba(124,58,237,0.10);
          --sd-accent-border: rgba(124,58,237,0.20);
          --sd-bg:            #f7f5ff;
          --sd-white:         #ffffff;
          --sd-border:        #e8e4f5;
          --sd-border-light:  #f0ecff;
          --sd-text:          #111111;
          --sd-text2:         #374151;
          --sd-muted:         #8b7faa;
          --sd-nav-icon:      #9ca3af;
          --sd-radius:        10px;
          --sd-shadow:        0 4px 24px rgba(0,0,0,0.08);
          --sd-danger:        #dc2626;
          --sd-danger-bg:     rgba(220,38,38,0.07);
          --sd-warning:       #f59e0b;
          --sd-warning-bg:    rgba(245,158,11,0.07);
        }
        body.dark {
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
          --sd-shadow:        0 4px 24px rgba(0,0,0,0.30);
        }

        /* ── Root layout ── */
        .sd-root {
          display: flex;
          min-height: 100vh;
          background: var(--sd-bg);
          font-family: var(--sd-font);
          color: var(--sd-text);
          position: relative;
        }

        /* ── Sidebar ── */
        .sd-sidebar {
          width: 220px;
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
          transition: transform 0.26s cubic-bezier(0.22,1,0.36,1);
        }
        .sd-sidebar-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 20px 16px 14px;
          border-bottom: 1px solid var(--sd-border-light);
        }
        .sd-logo-mark {
          width: 32px; height: 32px; border-radius: 9px;
          background: var(--sd-accent-dim);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sd-logo-text {
          font-size: 18px; font-weight: 900; color: var(--sd-text);
          letter-spacing: -0.04em;
        }
        .sd-store-pill {
          display: flex; align-items: center; gap: 9px;
          margin: 10px 10px 4px; padding: 10px 11px;
          background: var(--sd-bg); border-radius: 10px;
          border: 1px solid var(--sd-border-light);
          position: relative;
        }
        .sd-store-avatar {
          width: 30px; height: 30px; border-radius: "50%"; 
          border-radius: 50%;
          background: var(--sd-accent); color: #fff;
          font-size: 13px; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sd-store-name  { font-size: 12px; font-weight: 800; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
        .sd-store-plan  { font-size: 10px; color: var(--sd-muted); font-weight: 600; }
        .sd-store-dot   { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; position: absolute; top: 8px; right: 10px; }
        .sd-nav         { flex: 1; padding: 8px 8px; display: flex; flex-direction: column; gap: 2px; }
        .sd-nav-item {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 9px 10px; border-radius: 9px;
          border: none; background: transparent; cursor: pointer;
          font-family: var(--sd-font); font-size: 13px; font-weight: 500;
          color: var(--sd-text2); text-align: left;
          transition: background 0.12s, color 0.12s;
          position: relative;
        }
        .sd-nav-item:hover:not(.sd-nav-item--active) {
          background: var(--sd-accent-dim);
          color: var(--sd-text);
        }
        .sd-nav-item--active {
          background: var(--sd-accent-dim);
          color: var(--sd-accent);
          font-weight: 700;
        }
        .sd-nav-icon  { display: flex; align-items: center; justify-content: center; width: 18px; flex-shrink: 0; }
        .sd-nav-label { flex: 1; }
        .sd-nav-badge {
          min-width: 18px; height: 18px; border-radius: 9px;
          background: var(--sd-accent); color: #fff;
          font-size: 9px; font-weight: 800; display: flex;
          align-items: center; justify-content: center; padding: 0 4px;
        }
        .sd-sidebar-footer {
          padding: 12px 10px;
          border-top: 1px solid var(--sd-border-light);
        }
        .sd-theme-toggle {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 9px 10px; border-radius: 9px;
          border: none; background: transparent; cursor: pointer;
          font-family: var(--sd-font); transition: background 0.12s;
        }
        .sd-theme-toggle:hover { background: var(--sd-bg); }
        .sd-sidebar-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4);
          z-index: 99; display: none;
        }

        /* ── Main area ── */
        .sd-main {
          flex: 1; display: flex; flex-direction: column;
          min-width: 0; overflow-x: hidden;
        }
        .sd-topbar {
          position: sticky; top: 0; z-index: 90;
          display: flex; align-items: center; gap: 12px;
          padding: 0 24px; height: 60px;
          background: var(--sd-white); border-bottom: 1px solid var(--sd-border);
          box-shadow: 0 1px 0 var(--sd-border);
        }
        .sd-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 6px; border-radius: 8px; }
        .sd-topbar-title {
          font-size: 16px; font-weight: 800; color: var(--sd-text);
          letter-spacing: -0.02em; flex: 1;
        }
        .sd-topbar-right { display: flex; align-items: center; gap: 10px; }
        .sd-live-badge {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 100px;
          background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25);
          font-size: 11px; font-weight: 800; color: #16a34a;
        }
        .sd-live-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
          animation: sd-pulse 1.8s ease infinite;
        }
        @keyframes sd-pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        .sd-admin-btn {
          width: 34px; height: 34px; border-radius: 9px; display: flex;
          align-items: center; justify-content: center;
          background: var(--sd-bg); border: 1px solid var(--sd-border);
          cursor: pointer; transition: background 0.12s;
        }
        .sd-admin-btn:hover { background: var(--sd-accent-dim); }
        .sd-avatar-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--sd-accent); color: #fff;
          border: 2px solid var(--sd-accent-dim);
          font-size: 14px; font-weight: 900; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--sd-font); transition: box-shadow 0.15s;
        }
        .sd-avatar-btn:hover, .sd-avatar-btn--open {
          box-shadow: 0 0 0 4px var(--sd-accent-dim);
        }
        .sd-content {
          flex: 1; padding: 28px 28px 60px;
          max-width: 100%; overflow-x: hidden;
        }
        .sd-inactive-banner {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; margin-bottom: 18px;
          background: var(--sd-warning-bg); border: 1px solid rgba(245,158,11,0.25);
          border-radius: 10px; font-size: 13px; font-weight: 600;
          color: var(--sd-warning);
        }

        /* ── Shared component classes ── */
        .sd-panel {
          background: var(--sd-white);
          border: 1px solid var(--sd-border);
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .sd-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 18px; border-radius: 10px; border: none;
          font-family: var(--sd-font); font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
        }
        .sd-btn-primary {
          background: var(--sd-accent); color: #fff;
          box-shadow: 0 2px 10px rgba(124,58,237,0.25);
        }
        .sd-btn-primary:hover:not(:disabled) { background: var(--sd-accent2); box-shadow: 0 4px 16px rgba(124,58,237,0.35); }
        .sd-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
        .sd-btn-ghost { background: transparent; color: var(--sd-text); border: 1px solid var(--sd-border) !important; }
        .sd-btn-ghost:hover { background: var(--sd-accent-dim); border-color: var(--sd-accent-border) !important; color: var(--sd-accent); }
        .sd-btn-danger { background: var(--sd-danger-bg); color: var(--sd-danger); border: 1px solid rgba(220,38,38,0.2) !important; }
        .sd-btn-danger:hover { background: rgba(220,38,38,0.12); }
        .sd-input, .sd-select, .sd-textarea {
          width: 100%; padding: 10px 13px; border-radius: 9px;
          border: 1.5px solid var(--sd-border);
          background: var(--sd-bg); color: var(--sd-text);
          font-size: 13.5px; font-weight: 500; outline: none;
          font-family: var(--sd-font); transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .sd-input:focus, .sd-select:focus, .sd-textarea:focus {
          border-color: var(--sd-accent);
          box-shadow: 0 0 0 3px var(--sd-accent-dim);
        }
        .sd-textarea { resize: vertical; min-height: 90px; }
        .sd-label {
          display: block; font-size: 11px; font-weight: 700;
          color: var(--sd-muted); text-transform: uppercase;
          letter-spacing: 0.08em; margin-bottom: 7px;
        }
        .sd-form-group { margin-bottom: 16px; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .sd-sidebar {
            position: fixed; left: 0; top: 0; bottom: 0;
            transform: translateX(-100%); z-index: 200;
            box-shadow: 4px 0 24px rgba(0,0,0,0.2);
          }
          .sd-sidebar--open { transform: none; }
          .sd-sidebar-overlay { display: block; }
          .sd-hamburger { display: flex; align-items: center; justify-content: center; }
          .sd-content { padding: 16px 16px 60px; }
          .sd-topbar { padding: 0 16px; }
        }
      `}</style>
    </div>
  );
}