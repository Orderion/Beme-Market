import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "../hooks/useSellerAuth";
import { useChat } from "../hooks/useChat";
import "./SellerDashboard.css";

// Sub-pages
import DashboardHome         from "./dashboard/DashboardHome";
import DashboardProducts     from "./dashboard/DashboardProducts";
import DashboardOrders       from "./dashboard/DashboardOrders";
import DashboardCustomers    from "./dashboard/DashboardCustomers";
import DashboardChat         from "./dashboard/DashboardChat";
import DashboardMarketing    from "./dashboard/DashboardMarketing";
import DashboardAnalytics    from "./dashboard/DashboardAnalytics";
import DashboardSubscription from "./dashboard/DashboardSubscription";
import DashboardVerification from "./dashboard/DashboardVerification";
import DashboardAppearance   from "./dashboard/DashboardAppearance";
import DashboardWithdrawals  from "./dashboard/DashboardWithdrawals";
import DashboardDelivery    from "./dashboard/DashboardDelivery";

/* ── Icons ── */
function Icon({ path, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {path.split(" M").map((seg, i) => (
        <path key={i} d={(i === 0 ? "" : "M") + seg} />
      ))}
    </svg>
  );
}

const ICONS = {
  home:     "M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z M9 21V12h6v9",
  products: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
  orders:   "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  customers:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  chat:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  marketing:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  analytics:"M18 20V10 M12 20V4 M6 20v-6",
  wallet:   "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12h.01",
  paint:    "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z M13.5 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z M8.5 7.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z M17.5 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z M6.5 12.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  logout:   "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  delivery: "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3 M9 17H7 M17 21H9 M3 9h11 M13 17h2l1-1V9h-3 M16 9l3 3 M19 12v5a2 2 0 0 1-2 2 M17 21a2 2 0 1 0 4 0 2 2 0 0 0-4 0 M7 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0",
  menu:     "M3 12h18 M3 6h18 M3 18h18",
  close:    "M18 6L6 18 M6 6l12 12",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3",
  bell:     "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
};

/* ── Nav config ── */
const NAV = [
  { id: "home",         icon: "home",      label: "Analytics"    },
  { id: "products",     icon: "products",  label: "Products"     },
  { id: "orders",       icon: "orders",    label: "Orders"       },
  { id: "customers",    icon: "customers", label: "Customers"    },
  { id: "chat",         icon: "chat",      label: "Messages"     },
  { id: "marketing",    icon: "marketing", label: "Marketing"    },
  { id: "analytics",    icon: "analytics", label: "Analytics Pro" },
  { id: "withdrawals",  icon: "wallet",    label: "Withdrawals"  },
  { id: "appearance",   icon: "paint",     label: "Store Design" },
  { id: "delivery",     icon: "delivery",  label: "Delivery"     },
  { id: "verification", icon: "shield",    label: "Verification" },
  { id: "subscription", icon: "star",      label: "Subscription" },
];

const PLAN_COLORS = { basic: "#6B7280", standard: "#046EF2", pro: "#7C3AED" };

/* ── Sidebar ── */
function Sidebar({ activeTab, onNav, shop, plan, chatUnread, onClose, isMobile, storeUid }) {
  const { logout }  = useAuth();
  const navigate    = useNavigate();
  const planColor   = PLAN_COLORS[plan] || "#046EF2";
  const planInitial = (shop?.shopName || "S")[0].toUpperCase();

  const handleLogout = async () => {
    await logout().catch(console.error);
    navigate("/");
  };

  return (
    <>
      {/* Brand */}
      <div className="sd-brand">
        <div className="sd-brand-icon">{planInitial}</div>
        <div className="sd-brand-info">
          <div className="sd-brand-name">{shop?.shopName || "My Store"}</div>
          <div className="sd-brand-plan">
            <div className="sd-plan-dot" style={{ background: planColor }} />
            {plan?.charAt(0).toUpperCase() + plan?.slice(1)} Plan
          </div>
        </div>
        {isMobile && (
          <button className="sd-hamburger" onClick={onClose} style={{ marginLeft: "auto" }}>
            <Icon path={ICONS.close} size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="sd-nav">
        {NAV.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`sd-nav-btn ${activeTab === id ? "active" : ""}`}
            onClick={() => { onNav(id); if (isMobile) onClose(); }}
          >
            <span className="sd-nav-icon">
              <Icon path={ICONS[icon]} size={16} />
            </span>
            <span className="sd-nav-label">{label}</span>
            {id === "chat" && chatUnread > 0 && (
              <span className="sd-nav-badge">{chatUnread > 99 ? "99+" : chatUnread}</span>
            )}
          </button>
        ))}

        <div className="sd-nav-divider" />
        <button className="sd-nav-btn" onClick={() => {
          const slug = shop?.slug
            || (shop?.shopName ? shop.shopName.toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-") : null)
            || shop?.id
            || storeUid
            || "my-store";
          navigate(`/store/${slug}`);
        }}>
          <span className="sd-nav-icon"><Icon path={ICONS.external} size={16} /></span>
          <span className="sd-nav-label">View Store</span>
        </button>
        <button className="sd-nav-btn" onClick={handleLogout}>
          <span className="sd-nav-icon"><Icon path={ICONS.logout} size={16} /></span>
          <span className="sd-nav-label">Sign Out</span>
        </button>
      </nav>

      {/* Support card */}
      <div className="sd-support">
        <div className="sd-support-title">Need help?</div>
        <div className="sd-support-text">Feel free to contact our support team anytime.</div>
        <button className="sd-support-btn" onClick={() => navigate("/support")}>
          Get support
        </button>
      </div>
    </>
  );
}

/* ── Main export ── */
export default function SellerDashboard() {
  const navigate    = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, loading: authLoading, role, profile } = useAuth();
  const { isSeller, isSellerActive, shop, subscriptionPlan, loading: sellerLoading } = useSellerAuth();
  const { totalUnread } = useChat();

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [accessGranted, setAccessGranted] = useState(false); // firestore fallback check

  const activeTab = params.get("tab") || "home";

  const goTab = useCallback((tab) => {
    setParams({ tab }, { replace: true });
    window.scrollTo({ top: 0 });
  }, [setParams]);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || sellerLoading) return;

    // 1. Not logged in → send to login
    if (!user) {
      navigate("/login?redirect=/seller-dashboard", { replace: true });
      return;
    }

    // 2. Fast-pass checks (synchronous)
    const appliedUid  = localStorage.getItem("beme_seller_applied");
    const justApplied = appliedUid && appliedUid === user.uid;
    const isAdminUser = role === "super_admin" || role === "admin";
    const hasStoreId  = !!(profile?.storeId);
    const hasSellerStatus = !!(profile?.sellerStatus && profile.sellerStatus !== "none");

    if (isSeller || justApplied || isAdminUser || hasStoreId || hasSellerStatus) {
      setAccessGranted(true);
      return;
    }

    // 3. Last-resort: check Firestore storeApplications doc
    //    If user went through onboarding but localStorage was cleared,
    //    this lets them back in and re-sets the flag.
    getDoc(doc(db, "storeApplications", user.uid))
      .then((snap) => {
        if (snap.exists()) {
          // They started onboarding — grant access and restore flag
          localStorage.setItem("beme_seller_applied", user.uid);
          setAccessGranted(true);
        } else {
          // Truly never started onboarding
          navigate("/get-a-store", { replace: true });
        }
      })
      .catch(() => {
        // On error, don't lock them out — let them in with limited state
        setAccessGranted(true);
      });

  }, [user, isSeller, role, profile, authLoading, sellerLoading, navigate]);

  if (authLoading || sellerLoading) {
    return (
      <div className="sd-root" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 14, color: "#8B8FA8" }}>Loading your dashboard…</div>
      </div>
    );
  }

  // Still running the storeApplications check — show loader
  const appliedUid  = localStorage.getItem("beme_seller_applied");
  const justApplied = appliedUid && user && appliedUid === user.uid;
  const isAdminUser = role === "super_admin" || role === "admin";
  const hasStoreId  = !!(profile?.storeId);
  const hasSellerStatus = !!(profile?.sellerStatus && profile.sellerStatus !== "none");
  const hasImmediateAccess = isSeller || justApplied || isAdminUser || hasStoreId || hasSellerStatus;

  if (!user) return null;
  if (!hasImmediateAccess && !accessGranted) {
    return (
      <div className="sd-root" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 14, color: "#8B8FA8" }}>Checking access…</div>
      </div>
    );
  }

  const TAB_TITLES = {
    home: "Analytics", products: "Products", orders: "Orders",
    customers: "Customers", chat: "Messages", marketing: "Marketing",
    analytics: "Analytics Pro", withdrawals: "Withdrawals",
    appearance: "Store Design", verification: "Verification",
    delivery: "Delivery Settings",
    subscription: "Subscription",
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
    verification: <DashboardVerification />,
    delivery:     <DashboardDelivery />,
    subscription: <DashboardSubscription />,
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GH", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="sd-root">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sd-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sd-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <Sidebar
          activeTab={activeTab}
          onNav={goTab}
          shop={shop}
          storeUid={storeId || user?.uid}
          plan={subscriptionPlan}
          chatUnread={totalUnread}
          onClose={() => setMobileOpen(false)}
          isMobile={mobileOpen}
        />
      </aside>

      {/* Main */}
      <div className="sd-main">
        {/* Topbar */}
        <header className="sd-topbar">
          <div className="sd-topbar-left">
            <button className="sd-hamburger" onClick={() => setMobileOpen(true)}>
              <Icon path={ICONS.menu} size={22} color="#8B8FA8" />
            </button>
            <div className="sd-topbar-title">{TAB_TITLES[activeTab] || "Dashboard"}</div>
          </div>
          <div className="sd-topbar-right">
            <span className="sd-topbar-date">
              <Icon path="M8 2v3 M16 2v3 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" size={13} color="#8B8FA8" />
              {dateStr}
            </span>
            <button className="sd-avatar-btn" title={user?.displayName || user?.email}>
              {(user?.displayName || user?.email || "S")[0].toUpperCase()}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="sd-content">
          {PAGE_MAP[activeTab] || <DashboardHome />}
        </div>
      </div>
    </div>
  );
}