import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./AdminDashboard.css";

/* ═══════════════════════════════════════
   ANALYTICS HELPERS  (mirrors Analytics.jsx)
═══════════════════════════════════════ */
function getOrderTotal(order) {
  const direct =
    order.total ??
    order.amount ??
    order.orderTotal ??
    order.subtotal ??
    order.grandTotal ??
    order.pricing?.total;
  if (Number.isFinite(Number(direct))) return Number(direct);
  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((sum, item) => {
    return sum + Number(item?.price || 0) * Number(item?.qty || 0);
  }, 0);
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  return 0;
}

function normalizeShop(value) {
  return String(value || "").trim().toLowerCase();
}

function sortByCreatedAtDesc(rows) {
  return [...rows].sort((a, b) => toMillis(b.createdAt || b.timestamp) - toMillis(a.createdAt || a.timestamp));
}

function orderMatchesShop(order, adminShop) {
  const norm = normalizeShop(adminShop);
  if (normalizeShop(order?.primaryShop) === norm) return true;
  const shops = Array.isArray(order?.shops) ? order.shops.map(normalizeShop) : [];
  if (shops.includes(norm)) return true;
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.some((item) => normalizeShop(item?.shop) === norm);
}

function formatMoney(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `GHS ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `GHS ${(n / 1_000).toFixed(1)}k`;
  return `GHS ${n.toFixed(2)}`;
}

function buildUniqueShopCount(products, orders) {
  const shops = new Set();
  for (const p of products) {
    const s = normalizeShop(p.shop);
    if (s) shops.add(s);
  }
  for (const o of orders) {
    const arr = Array.isArray(o.shops) ? o.shops : [];
    for (const s of arr) { const n = normalizeShop(s); if (n) shops.add(n); }
    const items = Array.isArray(o.items) ? o.items : [];
    for (const item of items) { const n = normalizeShop(item?.shop); if (n) shops.add(n); }
  }
  return shops.size;
}

function getDayKeyFromTimestamp(ts) {
  const date = ts ? new Date(toMillis(ts)) : new Date();
  return date.toISOString().slice(0, 10);
}

function labelFromDayKey(dayKey) {
  return new Date(`${dayKey}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildDailySeries(orders, days = 7) {
  const today = new Date();
  const map = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { key, label: labelFromDayKey(key), orders: 0, revenue: 0 });
  }
  for (const order of orders) {
    const key = getDayKeyFromTimestamp(order.createdAt || order.timestamp);
    if (!map.has(key)) continue;
    const row = map.get(key);
    row.orders += 1;
    row.revenue += getOrderTotal(order);
  }
  return Array.from(map.values());
}

/* ═══════════════════════════════════════
   ICON HELPER
═══════════════════════════════════════ */
const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  orders:    "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  review:    "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  analytics: "M18 20V10 M12 20V4 M6 20v-6",
  payouts:   "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  shops:     "M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9",
  accounts:  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  homepage:  "M4 5h16 M4 10h16 M4 15h7 M14 15l2 2 4-4",
  products:  "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
  media:     "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7",
  support:   "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  logout:    "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  menu:      "M3 12h18 M3 6h18 M3 18h18",
  close:     "M18 6L6 18 M6 6l12 12",
  refresh:   "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
};

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard",         path: "/admin" },
  { key: "orders",    label: "Orders",            path: "/admin-orders" },
  { key: "review",    label: "Review Queue",      path: "/admin-review-queue" },
  { key: "analytics", label: "Analytics",         path: "/analytics" },
  { key: "payouts",   label: "Payout Requests",   path: "/payout-requests" },
  { key: "shops",     label: "Shop Applications", path: "/shop-applications" },
  { key: "accounts",  label: "Account Mgmt",      path: "/account-management" },
  { key: "homepage",  label: "Homepage Editor",   path: "/admin/homepage" },
  { key: "products",  label: "Product Requests",  path: "/admin/product-requests" },
  { key: "media",     label: "Media Manager",     path: "/admin/media" },
  { key: "support",   label: "Support Inbox",     path: "/admin/support" },
];

const STATUS = {
  Completed: { bg: "#0d2e1a", color: "#22c55e" },
  Pending:   { bg: "#2a2000", color: "#f59e0b" },
  Refunded:  { bg: "#2a0d0d", color: "#ef4444" },
  completed: { bg: "#0d2e1a", color: "#22c55e" },
  pending:   { bg: "#2a2000", color: "#f59e0b" },
  refunded:  { bg: "#2a0d0d", color: "#ef4444" },
  cancelled: { bg: "#2a0d0d", color: "#ef4444" },
};

/* ═══════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════ */
function StatCard({ label, value, sub, loading }) {
  return (
    <div className="adash-stat-card">
      <div className="adash-stat-label">{label}</div>
      {loading
        ? <div className="adash-stat-skeleton" />
        : <div className="adash-stat-value">{value}</div>
      }
      {sub && !loading && <div className="adash-stat-sub">{sub}</div>}
    </div>
  );
}

function MiniBarChart({ series, valueKey, formatVal }) {
  const max = Math.max(...series.map((s) => s[valueKey]), 1);
  return (
    <div className="adash-minichart">
      {series.map((item) => {
        const pct = Math.max((item[valueKey] / max) * 100, item[valueKey] > 0 ? 4 : 0);
        return (
          <div key={item.key} className="adash-minibar-col" title={`${item.label}: ${formatVal(item[valueKey])}`}>
            <div className="adash-minibar-track">
              <div className="adash-minibar-fill" style={{ height: `${pct}%` }} />
            </div>
            <span className="adash-minibar-label">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function NavItem({ item, isActive, collapsed, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onClick(item.path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? item.label : undefined}
      className={[
        "adash-nav-btn",
        isActive  ? "adash-nav-btn--active"    : "",
        hovered   ? "adash-nav-btn--hover"     : "",
        collapsed ? "adash-nav-btn--collapsed" : "",
      ].join(" ")}
    >
      <span className="adash-nav-icon"><Icon d={ICONS[item.key]} size={17} /></span>
      {!collapsed && <span className="adash-nav-label">{item.label}</span>}
      {isActive && !collapsed && <span className="adash-nav-dot" />}
    </button>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function AdminDashboard() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isSuperAdmin, isShopAdmin, adminShop } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);

  /* ── data state ── */
  const [products,      setProducts]      = useState([]);
  const [orders,        setOrders]        = useState([]);
  const [users,         setUsers]         = useState([]);
  const [pendingReviews,setPendingReviews]= useState(0);
  const [openTickets,   setOpenTickets]   = useState(0);
  const [dataLoading,   setDataLoading]   = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const active = location.pathname;

  /* ── Firebase fetch (same logic as Analytics.jsx) ── */
  async function fetchData() {
    setDataLoading(true);
    const normShop = normalizeShop(adminShop);
    let loadedProducts = [], loadedOrders = [], loadedUsers = [];

    /* products */
    try {
      if (isShopAdmin && normShop) {
        const snap = await getDocs(query(collection(db, "Products"), where("shop", "==", normShop)));
        loadedProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        const snap = await getDocs(collection(db, "Products"));
        loadedProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (e) { console.error("products:", e); }

    /* orders */
    try {
      if (isShopAdmin && normShop) {
        try {
          const snap = await getDocs(query(
            collection(db, "orders"),
            where("shops", "array-contains", normShop),
            orderBy("createdAt", "desc"), limit(300)
          ));
          loadedOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {
          const snap = await getDocs(query(collection(db, "orders"), where("shops", "array-contains", normShop)));
          loadedOrders = sortByCreatedAtDesc(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }))
              .filter((o) => orderMatchesShop(o, normShop))
          );
        }
      } else {
        try {
          const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(300)));
          loadedOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {
          const snap = await getDocs(collection(db, "orders"));
          loadedOrders = sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      }
    } catch (e) { console.error("orders:", e); }

    /* users (super admin only) */
    try {
      if (isSuperAdmin) {
        const snap = await getDocs(collection(db, "users"));
        loadedUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (e) { console.error("users:", e); }

    /* review queue count */
    try {
      const snap = await getDocs(query(collection(db, "reviewQueue"), where("status", "==", "pending")));
      setPendingReviews(snap.size);
    } catch {
      /* collection may not exist yet — keep 0 */
    }

    /* support tickets count */
    try {
      const snap = await getDocs(query(collection(db, "supportTickets"), where("status", "==", "open")));
      setOpenTickets(snap.size);
    } catch {
      /* keep 0 */
    }

    setProducts(loadedProducts);
    setOrders(loadedOrders);
    setUsers(loadedUsers);
    setLastRefreshed(new Date());
    setDataLoading(false);
  }

  useEffect(() => { fetchData(); }, [isShopAdmin, adminShop, isSuperAdmin]);

  /* ── computed metrics (same as Analytics.jsx) ── */
  const metrics = useMemo(() => {
    const totalProducts    = products.length;
    const inStockProducts  = products.filter((p) => p.inStock !== false).length;
    const featuredProducts = products.filter((p) => !!p.featured).length;
    const totalOrders      = orders.length;
    const totalRevenue     = orders.reduce((sum, o) => sum + getOrderTotal(o), 0);
    const avgOrderValue    = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalUnitsSold   = orders.reduce((sum, o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      return sum + items.reduce((s, i) => s + Number(i?.qty || 0), 0);
    }, 0);
    const activeCustomers  = isSuperAdmin
      ? users.filter((u) => !["super_admin", "shop_admin", "admin"].includes(String(u.role || "").toLowerCase())).length
      : new Set(orders.map((o) => String(o.userId || "").trim()).filter(Boolean)).size;
    const activeShops      = buildUniqueShopCount(products, orders);
    const stockHealth      = totalProducts > 0 ? Math.round((inStockProducts / totalProducts) * 100) : 0;

    return {
      totalOrders, totalRevenue, avgOrderValue, totalUnitsSold,
      totalProducts, inStockProducts, featuredProducts,
      activeCustomers, activeShops, stockHealth,
    };
  }, [products, orders, users, isSuperAdmin]);

  /* ── daily series for mini chart ── */
  const dailySeries = useMemo(() => buildDailySeries(orders, 7), [orders]);

  /* ── recent 5 orders ── */
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  /* ── Logo ── */
  const Logo = () => (
    <svg width={26} height={26} viewBox="0 0 32 32">
      <path d="M6 8 L16 4 L26 8 L26 24 L16 28 L6 24 Z" fill="#e67e22" opacity=".9" />
      <path d="M6 8 L16 12 L16 28 L6 24 Z"             fill="#c0580c" />
      <path d="M26 8 L16 12 L16 28 L26 24 Z"           fill="#f0a050" opacity=".7" />
    </svg>
  );

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <>
      <div className="adash-root">

        {/* ── Desktop Sidebar ── */}
        <aside className={`adash-sidebar ${collapsed ? "adash-sidebar--collapsed" : "adash-sidebar--expanded"}`}>
          <div className={`adash-logo-row ${collapsed ? "adash-logo-row--collapsed" : ""}`}>
            <Logo />
            {!collapsed && <span className="adash-logo-text">BEME MARKET</span>}
          </div>

          <nav className="adash-nav">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.key} item={item} isActive={active === item.path}
                collapsed={collapsed} onClick={navigate} />
            ))}
          </nav>

          <div className="adash-sidebar-footer">
            <button className={`adash-footer-btn ${collapsed ? "adash-footer-btn--collapsed" : ""}`}
              onClick={() => setCollapsed((c) => !c)}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7M19 19l-7-7 7-7"} />
              </svg>
              {!collapsed && <span>Collapse</span>}
            </button>
            <button className={`adash-footer-btn ${collapsed ? "adash-footer-btn--collapsed" : ""}`}
              onClick={() => navigate("/")}>
              <Icon d={ICONS.logout} size={17} />
              {!collapsed && <span>Exit Admin</span>}
            </button>
          </div>
        </aside>

        {/* ── Mobile Drawer Overlay ── */}
        {sidebarOpen && (
          <>
            <div className="adash-drawer-overlay" onClick={() => setSidebarOpen(false)} />
            <div className="adash-drawer adash-drawer--open">
              <div className="adash-logo-row" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Logo /><span className="adash-logo-text">BEME MARKET</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="adash-icon-btn">
                  <Icon d={ICONS.close} size={18} />
                </button>
              </div>
              <nav className="adash-nav" style={{ overflowY: "auto" }}>
                {NAV_ITEMS.map((item) => (
                  <NavItem key={item.key} item={item} isActive={active === item.path}
                    collapsed={false} onClick={(path) => { navigate(path); setSidebarOpen(false); }} />
                ))}
              </nav>
              <div className="adash-sidebar-footer">
                <button className="adash-footer-btn" onClick={() => navigate("/")}>
                  <Icon d={ICONS.logout} size={17} /><span>Exit Admin</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Main ── */}
        <div className="adash-main">

          {/* Top bar */}
          <header className="adash-topbar">
            <div className="adash-topbar-left">
              <button className="adash-hamburger adash-icon-btn" onClick={() => setSidebarOpen(true)}>
                <Icon d={ICONS.menu} size={22} />
              </button>
              <div>
                <div className="adash-topbar-eyebrow">Admin</div>
                <div className="adash-topbar-title">Dashboard</div>
              </div>
            </div>

            <div className="adash-topbar-right">
              {lastRefreshed && (
                <span className="adash-last-updated">
                  Updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button onClick={fetchData} className="adash-refresh-btn" title="Refresh data" disabled={dataLoading}>
                <Icon d={ICONS.refresh} size={15} />
              </button>
              <button onClick={() => window.open("/", "_blank")} className="adash-preview-btn">
                Preview ↗
              </button>
              <div className="adash-avatar">A</div>
            </div>
          </header>

          {/* Content */}
          <div className="adash-content">

            {/* ── Stats row (live from Firebase) ── */}
            <div className="adash-stats-grid">
              <StatCard
                label="Total Orders"
                value={metrics.totalOrders.toLocaleString()}
                sub={`${metrics.totalUnitsSold} units sold`}
                loading={dataLoading}
              />
              <StatCard
                label="Revenue"
                value={formatMoney(metrics.totalRevenue)}
                sub={`Avg order: ${formatMoney(metrics.avgOrderValue)}`}
                loading={dataLoading}
              />
              <StatCard
                label="Products"
                value={metrics.totalProducts.toLocaleString()}
                sub={`${metrics.inStockProducts} in stock · ${metrics.stockHealth}% health`}
                loading={dataLoading}
              />
              <StatCard
                label="Active Shops"
                value={metrics.activeShops.toLocaleString()}
                sub={`${metrics.featuredProducts} featured products`}
                loading={dataLoading}
              />
              <StatCard
                label="Customers"
                value={metrics.activeCustomers.toLocaleString()}
                sub={isSuperAdmin ? "Registered non-admin users" : "Unique buyers"}
                loading={dataLoading}
              />
              <StatCard
                label="Pending Reviews"
                value={pendingReviews.toLocaleString()}
                sub="Awaiting approval"
                loading={dataLoading}
              />
              <StatCard
                label="Open Tickets"
                value={openTickets.toLocaleString()}
                sub="Support inbox"
                loading={dataLoading}
              />
            </div>

            {/* ── Charts + quick nav + orders ── */}
            <div className="adash-body-grid">

              {/* 7-day revenue chart */}
              <div className="adash-panel adash-panel--chart">
                <div className="adash-panel-head">
                  <span className="adash-panel-title">7-day Revenue</span>
                  <span className="adash-panel-sub">Daily trend</span>
                </div>
                {dataLoading
                  ? <div className="adash-chart-skeleton" />
                  : <MiniBarChart series={dailySeries} valueKey="revenue" formatVal={formatMoney} />
                }
              </div>

              {/* 7-day orders chart */}
              <div className="adash-panel adash-panel--chart">
                <div className="adash-panel-head">
                  <span className="adash-panel-title">7-day Orders</span>
                  <span className="adash-panel-sub">Order volume</span>
                </div>
                {dataLoading
                  ? <div className="adash-chart-skeleton" />
                  : <MiniBarChart series={dailySeries} valueKey="orders" formatVal={(v) => `${v} orders`} />
                }
              </div>

              {/* Quick nav */}
              <div className="adash-panel">
                <div className="adash-panel-head">
                  <span className="adash-panel-title">Admin Sections</span>
                </div>
                {NAV_ITEMS.filter((i) => i.key !== "dashboard").map((item) => (
                  <div key={item.key} className="adash-qcard" onClick={() => navigate(item.path)}>
                    <span className="adash-qcard-icon"><Icon d={ICONS[item.key]} size={16} /></span>
                    <span className="adash-qcard-label">{item.label}</span>
                    <span className="adash-qcard-arrow">→</span>
                  </div>
                ))}
              </div>

              {/* Recent orders */}
              <div className="adash-panel">
                <div className="adash-panel-head">
                  <span className="adash-panel-title">Recent Orders</span>
                  <button className="adash-see-all" onClick={() => navigate("/admin-orders")}>
                    View all →
                  </button>
                </div>

                {dataLoading ? (
                  <div className="adash-orders-skeleton">
                    {[1, 2, 3, 4].map((n) => <div key={n} className="adash-order-skeleton-row" />)}
                  </div>
                ) : recentOrders.length === 0 ? (
                  <p className="adash-empty">No orders yet.</p>
                ) : (
                  recentOrders.map((order) => {
                    const status = order.status || "pending";
                    const statusStyle = STATUS[status] || { bg: "#1f1f1f", color: "#888" };
                    const total = getOrderTotal(order);
                    const ts = toMillis(order.createdAt || order.timestamp);
                    const dateStr = ts
                      ? new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                      : "—";
                    const buyer = order.customerName || order.userName || order.userId?.slice(0, 8) || "Customer";
                    return (
                      <div key={order.id} className="adash-order-row">
                        <div className="adash-order-info">
                          <div className="adash-order-id">#{order.id?.slice(0, 8)?.toUpperCase()}</div>
                          <div className="adash-order-meta">{buyer} · {dateStr}</div>
                          <div className="adash-order-total">{formatMoney(total)}</div>
                        </div>
                        <div className="adash-order-badge"
                          style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          {String(status).charAt(0).toUpperCase() + String(status).slice(1)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}