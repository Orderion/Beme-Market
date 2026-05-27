/* ================================================================
   AdminPanel.jsx — Beme Market Unified Admin
   Dark purple shell · All sections in one route
   Access: /admin, /admin/analytics, /admin/users, etc.
================================================================ */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  collection, getDocs, query, orderBy, limit,
  where, doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useAdminUnreadCount } from "../../hooks/useNotifications";
import { useTheme } from "../../context/ThemeContext";
import "./AdminPanel.css";

/* ── Lazy section imports ── */
import AnalyticsSection    from "./sections/Analytics";
import UsersSection        from "./sections/Users";
import StoresSection       from "./sections/Stores";
import OrdersSection       from "./sections/Orders";
import ProductsSection     from "./sections/Products";
import PayoutsSection      from "./sections/Payouts";
import SupportSection      from "./sections/Support";
import MediaSection        from "./sections/Media";
import NotificationsSection from "./sections/Notifications";
import HomepageSection     from "./sections/Homepage";
import AdminsSection       from "./sections/Admins";
import SettingsSection     from "./sections/Settings";

/* ── Icon helper ── */
function Ico({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {d.split(" | ").map((seg, i) => <path key={i} d={seg}/>)}
    </svg>
  );
}

const I = {
  overview:   "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z | M9 22V12h6v10",
  analytics:  "M18 20V10 | M12 20V4 | M6 20v-6",
  users:      "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 | M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  stores:     "M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z | M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9",
  orders:     "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z | M3 6h18 | M16 10a4 4 0 0 1-8 0",
  products:   "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z | M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
  payouts:    "M12 2v20 | M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  support:    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  media:      "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z | M4 22v-7",
  notif:      "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 | M13.73 21a2 2 0 0 1-3.46 0",
  homepage:   "M4 5h16 | M4 10h16 | M4 15h7 | M14 15l2 2 4-4",
  admins:     "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 | M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 | M23 21v-2a4 4 0 0 0-3-3.87 | M16 3.13a4 4 0 0 1 0 7.75",
  settings:   "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z | M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  logout:     "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 | M16 17l5-5-5-5 | M21 12H9",
  menu:       "M3 12h18 | M3 6h18 | M3 18h18",
  close:      "M18 6L6 18 | M6 6l12 12",
  collapse:   "M11 19l-7-7 7-7 | M19 19l-7-7 7-7",
  expand:     "M13 5l7 7-7 7 | M5 5l7 7-7 7",
  send:       "M22 2L11 13 | M22 2L15 22 9 13 2 9l20-7z",
  refresh:    "M23 4v6h-6 | M1 20v-6h6 | M3.51 9a9 9 0 0 1 14.85-3.36L23 10 | M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  preview:    "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 | M15 3h6v6 | M10 14L21 3",
};

/* ── Nav config ── */
const NAV = [
  { key: "overview",   label: "Overview",       path: "/admin",               icon: I.overview  },
  { key: "analytics",  label: "Analytics",      path: "/admin/analytics",     icon: I.analytics },
  { key: "users",      label: "Users",          path: "/admin/users",         icon: I.users     },
  { key: "stores",     label: "Stores",         path: "/admin/stores",        icon: I.stores    },
  { key: "orders",     label: "Orders",         path: "/admin/orders",        icon: I.orders    },
  { key: "products",   label: "Products",       path: "/admin/products",      icon: I.products  },
  { key: "payouts",    label: "Payouts",        path: "/admin/payouts",       icon: I.payouts   },
  { key: "support",    label: "Support",        path: "/admin/support",       icon: I.support   },
  { key: "media",      label: "Media",          path: "/admin/media",         icon: I.media     },
  { key: "notif",      label: "Notifications",  path: "/admin/notifications", icon: I.notif     },
  { key: "homepage",   label: "Homepage",       path: "/admin/homepage",      icon: I.homepage  },
  { key: "admins",     label: "Admins",         path: "/admin/admins",        icon: I.admins    },
  { key: "settings",   label: "Settings",       path: "/admin/settings",      icon: I.settings  },
];

/* ── Helpers ── */
function toMillis(v) {
  if (!v) return 0;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  return 0;
}
function formatMoney(n) {
  n = Number(n || 0);
  if (n >= 1e6) return `GHS ${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `GHS ${(n / 1e3).toFixed(1)}k`;
  return `GHS ${n.toFixed(2)}`;
}
function orderTotal(o) {
  const d = o.total ?? o.amount ?? o.orderTotal ?? o.subtotal ?? o.grandTotal ?? o.pricing?.total;
  if (Number.isFinite(Number(d))) return Number(d);
  return (o.items || []).reduce((s, i) => s + Number(i?.price || 0) * Number(i?.qty || 0), 0);
}
function dayKey(ts) {
  const d = ts ? new Date(toMillis(ts)) : new Date();
  return d.toISOString().slice(0, 10);
}
function buildDailySeries(orders, days = 7) {
  const today = new Date();
  const map = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    map.set(k, { key: k, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), orders: 0, revenue: 0 });
  }
  for (const o of orders) {
    const k = dayKey(o.createdAt || o.timestamp);
    if (map.has(k)) { const r = map.get(k); r.orders++; r.revenue += orderTotal(o); }
  }
  return Array.from(map.values());
}

/* ── Logo ── */
function Logo() {
  return (
    <div className="ap-logo-icon">
      <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <path d="M6 8L16 4L26 8L26 24L16 28L6 24Z" fill="rgba(255,255,255,0.9)"/>
        <path d="M6 8L16 12L16 28L6 24Z" fill="rgba(255,255,255,0.4)"/>
        <path d="M26 8L16 12L16 28L26 24Z" fill="rgba(255,255,255,0.65)"/>
      </svg>
    </div>
  );
}

/* ── Nav item ── */
function NavItem({ item, active, collapsed, onClick, badge }) {
  return (
    <button
      className={`ap-nav-item${active ? " ap-nav-item--active" : ""}${collapsed ? " ap-nav-item--collapsed" : ""}`}
      onClick={() => onClick(item.path)}
      title={collapsed ? item.label : undefined}
    >
      <span className="ap-nav-icon"><Ico d={item.icon} size={16}/></span>
      {!collapsed && <span className="ap-nav-label">{item.label}</span>}
      {!collapsed && badge > 0 && <span className="ap-nav-badge">{badge > 99 ? "99+" : badge}</span>}
    </button>
  );
}

/* ================================================================
   OVERVIEW SECTION (embedded — most critical section)
================================================================ */
function OverviewSection({ metrics, dailySeries, recentOrders, loading, onRefresh }) {
  const navigate = useNavigate();
  const [aiMessages, setAiMessages] = useState([
    { role: "ai", text: "Hi! I'm your Beme Market AI assistant. Ask me about your platform metrics, orders, users, or anything admin-related." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef(null);

  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);

  const sendAiMessage = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiInput("");
    const userMsg = { role: "user", text };
    setAiMessages(prev => [...prev, userMsg]);
    setAiLoading(true);

    const context = `You are the AI assistant for Beme Market admin panel.
Current metrics:
- Total orders: ${metrics.totalOrders}
- Total revenue: GHS ${metrics.totalRevenue.toFixed(2)}
- Total products: ${metrics.totalProducts}
- Active users: ${metrics.totalUsers}
- Active sellers: ${metrics.totalSellers}
- Pending payouts: ${metrics.pendingPayouts}
- Open support tickets: ${metrics.openTickets}
Answer the admin's question concisely and helpfully.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: context,
          messages: [
            ...aiMessages.filter(m => m.role !== "ai" || aiMessages.indexOf(m) > 0)
              .map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })),
            { role: "user", content: text }
          ],
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "I couldn't process that. Try again.";
      setAiMessages(prev => [...prev, { role: "ai", text: reply }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "ai", text: "Connection error. Please try again." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const maxRev = Math.max(...dailySeries.map(s => s.revenue), 1);
  const maxOrd = Math.max(...dailySeries.map(s => s.orders), 1);

  const STATUS_COLORS = {
    pending:   "amber", processing: "blue", paid: "green",
    delivered: "green", cancelled: "red", shipped: "blue",
  };

  return (
    <div>
      <div className="ap-page-header-row" style={{ marginBottom: 22 }}>
        <div>
          <div className="ap-page-title">Overview</div>
          <div className="ap-page-sub">Platform summary · Real-time data</div>
        </div>
        <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={onRefresh} disabled={loading}>
          <Ico d={I.refresh} size={13}/> {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="ap-stats-grid">
        {[
          { label: "Revenue",     value: formatMoney(metrics.totalRevenue),     sub: `Avg: ${formatMoney(metrics.avgOrder)}` },
          { label: "Orders",      value: metrics.totalOrders,                   sub: `${metrics.totalUnits} units sold` },
          { label: "Products",    value: metrics.totalProducts,                 sub: `${metrics.inStock} in stock` },
          { label: "Users",       value: metrics.totalUsers,                    sub: `${metrics.totalSellers} sellers` },
          { label: "Pending Payouts", value: metrics.pendingPayouts,            sub: "Awaiting review" },
          { label: "Open Tickets",    value: metrics.openTickets,               sub: "Support inbox" },
        ].map(stat => (
          <div className={`ap-stat${loading ? " ap-stat--skeleton" : ""}`} key={stat.label}>
            <div className="ap-stat-label">{stat.label}</div>
            {!loading && <>
              <div className="ap-stat-value">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</div>
              <div className="ap-stat-sub">{stat.sub}</div>
            </>}
          </div>
        ))}
      </div>

      {/* Body grid */}
      <div className="ap-body-grid" style={{ marginBottom: 16 }}>

        {/* 7-day revenue chart */}
        <div className="ap-card">
          <div className="ap-card-head">
            <span className="ap-card-title">7-Day Revenue</span>
            <span className="ap-card-sub">Daily trend</span>
          </div>
          <div className="ap-card-body">
            {loading ? <div className="ap-skeleton" style={{ height: 80 }}/> : (
              <div className="ap-minichart">
                {dailySeries.map(d => (
                  <div className="ap-minibar-col" key={d.key} title={`${d.label}: ${formatMoney(d.revenue)}`}>
                    <div className="ap-minibar-track">
                      <div className="ap-minibar-fill" style={{ height: `${Math.max((d.revenue / maxRev) * 100, d.revenue > 0 ? 4 : 0)}%` }}/>
                    </div>
                    <span className="ap-minibar-label">{d.label.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 7-day orders chart */}
        <div className="ap-card">
          <div className="ap-card-head">
            <span className="ap-card-title">7-Day Orders</span>
            <span className="ap-card-sub">Volume</span>
          </div>
          <div className="ap-card-body">
            {loading ? <div className="ap-skeleton" style={{ height: 80 }}/> : (
              <div className="ap-minichart">
                {dailySeries.map(d => (
                  <div className="ap-minibar-col" key={d.key} title={`${d.label}: ${d.orders} orders`}>
                    <div className="ap-minibar-track">
                      <div className="ap-minibar-fill ap-minibar-fill--alt" style={{ height: `${Math.max((d.orders / maxOrd) * 100, d.orders > 0 ? 4 : 0)}%` }}/>
                    </div>
                    <span className="ap-minibar-label">{d.label.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent orders */}
        <div className="ap-card">
          <div className="ap-card-head">
            <span className="ap-card-title">Recent Orders</span>
            <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => navigate("/admin/orders")}>View all →</button>
          </div>
          <div className="ap-card-body" style={{ padding: "6px 0" }}>
            {loading ? [1,2,3,4].map(i => (
              <div key={i} className="ap-skeleton" style={{ height: 44, margin: "6px 18px", borderRadius: 8 }}/>
            )) : recentOrders.length === 0 ? (
              <div className="ap-empty"><div className="ap-empty-title">No orders yet</div></div>
            ) : recentOrders.map(o => {
              const s = o.status || "pending";
              const buyer = o.customerName || o.userName || (o.userId?.slice(0,8)) || "Customer";
              const ts = toMillis(o.createdAt || o.timestamp);
              const date = ts ? new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
              return (
                <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderBottom: "1px solid var(--ap-border2)", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ap-text)" }}>#{o.id?.slice(0,8).toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: "var(--ap-muted)", marginTop: 2 }}>{buyer} · {date}</div>
                    <div style={{ fontSize: 12, color: "var(--ap-text2)", marginTop: 1 }}>{formatMoney(orderTotal(o))}</div>
                  </div>
                  <span className={`ap-badge ap-badge--${STATUS_COLORS[s] || "gray"}`}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Assistant */}
        <div className="ap-card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="ap-card-head">
            <span className="ap-card-title">AI Assistant</span>
            <span className="ap-badge ap-badge--purple" style={{ fontSize: 10 }}>Claude</span>
          </div>
          <div className="ap-ai-chat" style={{ flex: 1 }}>
            <div className="ap-ai-messages">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`ap-ai-msg ap-ai-msg--${msg.role}`}>
                  <div className="ap-ai-msg-avatar">
                    {msg.role === "ai" ? "AI" : "Me"}
                  </div>
                  <div className="ap-ai-bubble">
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="ap-ai-msg ap-ai-msg--ai">
                  <div className="ap-ai-msg-avatar">AI</div>
                  <div className="ap-ai-bubble">
                    <div className="ap-ai-thinking">
                      <div className="ap-ai-dot"/><div className="ap-ai-dot"/><div className="ap-ai-dot"/>
                    </div>
                  </div>
                </div>
              )}
              <div ref={aiEndRef}/>
            </div>
            <div className="ap-ai-input-row">
              <input
                className="ap-ai-input"
                placeholder="Ask about orders, revenue, users…"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendAiMessage()}
                disabled={aiLoading}
              />
              <button className="ap-ai-send" onClick={sendAiMessage} disabled={!aiInput.trim() || aiLoading}>
                <Ico d={I.send} size={15}/>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Quick nav */}
      <div className="ap-card">
        <div className="ap-card-head"><span className="ap-card-title">Quick Navigation</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, padding: 14 }}>
          {NAV.filter(n => n.key !== "overview").map(n => (
            <button key={n.key}
              onClick={() => navigate(n.path)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "11px 14px", borderRadius: 9,
                border: "1px solid var(--ap-border2)",
                background: "rgba(255,255,255,0.02)",
                color: "var(--ap-text2)", cursor: "pointer",
                fontSize: 13, fontWeight: 500, fontFamily: "var(--ap-font)",
                transition: "all 0.13s", textAlign: "left",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--ap-purple-dim)"; e.currentTarget.style.borderColor = "var(--ap-border)"; e.currentTarget.style.color = "var(--ap-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "var(--ap-border2)"; e.currentTarget.style.color = "var(--ap-text2)"; }}
            >
              <Ico d={n.icon} size={15}/> {n.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN ADMIN PANEL
================================================================ */
export default function AdminPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperAdmin, isShopAdmin, adminShop } = useAuth();
  const { unreadCount } = useAdminUnreadCount();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("beme_admin_theme") || "dark";
    return "dark";
  });

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
    localStorage.setItem("beme_admin_theme", theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  /* ── Overview data ── */
  const [metrics, setMetrics] = useState({
    totalOrders: 0, totalRevenue: 0, avgOrder: 0, totalUnits: 0,
    totalProducts: 0, inStock: 0, totalUsers: 0, totalSellers: 0,
    pendingPayouts: 0, openTickets: 0,
  });
  const [dailySeries, setDailySeries] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Determine active section from path ── */
  const active = useMemo(() => {
    const p = location.pathname;
    if (p === "/admin") return "overview";
    const match = NAV.find(n => n.path !== "/admin" && p.startsWith(n.path));
    return match?.key || "overview";
  }, [location.pathname]);

  const activeNav = NAV.find(n => n.key === active);

  /* ── Fetch overview data ── */
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [prodSnap, ordSnap, userSnap, payoutSnap, ticketSnap] = await Promise.allSettled([
        getDocs(collection(db, "Products")),
        getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(200))),
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "payoutRequests"), where("status", "==", "pending"))),
        getDocs(query(collection(db, "support_tickets"), where("status", "==", "open"))),
      ]);

      const products = prodSnap.status === "fulfilled" ? prodSnap.value.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      const orders   = ordSnap.status  === "fulfilled" ? ordSnap.value.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      const users    = userSnap.status === "fulfilled" ? userSnap.value.docs.map(d => ({ id: d.id, ...d.data() })) : [];

      const totalRevenue = orders.reduce((s, o) => s + orderTotal(o), 0);
      const totalUnits   = orders.reduce((s, o) => s + (o.items || []).reduce((ss, i) => ss + Number(i?.qty || 0), 0), 0);
      const sellers      = users.filter(u => ["shop_admin", "seller"].includes(String(u.role || u.sellerStatus || "").toLowerCase()));
      const inStock      = products.filter(p => p.inStock !== false).length;

      setMetrics({
        totalOrders: orders.length,
        totalRevenue,
        avgOrder: orders.length ? totalRevenue / orders.length : 0,
        totalUnits,
        totalProducts: products.length,
        inStock,
        totalUsers: users.length,
        totalSellers: sellers.length,
        pendingPayouts: payoutSnap.status === "fulfilled" ? payoutSnap.value.size : 0,
        openTickets:   ticketSnap.status  === "fulfilled" ? ticketSnap.value.size : 0,
      });
      setDailySeries(buildDailySeries(orders, 7));
      setRecentOrders(orders.slice(0, 5));
    } catch (e) { console.error("AdminPanel overview fetch:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  /* ── Section render ── */
  function renderSection() {
    switch (active) {
      case "overview":      return <OverviewSection metrics={metrics} dailySeries={dailySeries} recentOrders={recentOrders} loading={loading} onRefresh={fetchOverview}/>;
      case "analytics":     return <AnalyticsSection/>;
      case "users":         return <UsersSection/>;
      case "stores":        return <StoresSection/>;
      case "orders":        return <OrdersSection/>;
      case "products":      return <ProductsSection/>;
      case "payouts":       return <PayoutsSection/>;
      case "support":       return <SupportSection/>;
      case "media":         return <MediaSection/>;
      case "notif":         return <NotificationsSection/>;
      case "homepage":      return <HomepageSection/>;
      case "admins":        return <AdminsSection/>;
      case "settings":      return <SettingsSection/>;
      default:              return <OverviewSection metrics={metrics} dailySeries={dailySeries} recentOrders={recentOrders} loading={loading} onRefresh={fetchOverview}/>;
    }
  }

  return (
    <div className="ap-root">

      {/* Mobile overlay */}
      {sidebarOpen && <div className="ap-overlay ap-overlay--show" onClick={() => setSidebarOpen(false)}/>}

      {/* ── SIDEBAR ── */}
      <aside className={`ap-sidebar${collapsed ? " ap-sidebar--collapsed" : ""}${sidebarOpen ? " ap-sidebar--open" : ""}`}>

        <div className={`ap-logo${collapsed ? " ap-logo--collapsed" : ""}`}>
          <Logo/>
          {!collapsed && <span className="ap-logo-text">Beme Market</span>}
        </div>

        <nav className="ap-nav">
          <div className="ap-nav-section-label" style={{ display: collapsed ? "none" : undefined }}>Menu</div>
          {NAV.map(item => (
            <NavItem
              key={item.key} item={item}
              active={active === item.key}
              collapsed={collapsed}
              onClick={p => { navigate(p); setSidebarOpen(false); }}
              badge={item.key === "notif" ? unreadCount : 0}
            />
          ))}
        </nav>

        <div className="ap-sidebar-footer">

        <button
          className={"ap-sidebar-footer-btn" + (collapsed ? " ap-sidebar-footer-btn--collapsed" : "")}
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
          {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>
        <button className={"ap-sidebar-footer-btn" + (collapsed ? " ap-sidebar-footer-btn--collapsed" : "")}
          onClick={() => setCollapsed(c => !c)}>
            <Ico d={collapsed ? I.expand : I.collapse} size={15}/>
            {!collapsed && <span>Collapse</span>}
          </button>
          <button className={`ap-sidebar-footer-btn${collapsed ? " ap-sidebar-footer-btn--collapsed" : ""}`}
            onClick={() => navigate("/")}>
            <Ico d={I.logout} size={15}/>
            {!collapsed && <span>Exit Admin</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="ap-main">

        {/* Topbar */}
        <header className="ap-topbar">
          <div className="ap-topbar-left">
            <button className="ap-hamburger" onClick={() => setSidebarOpen(o => !o)}>
              <Ico d={I.menu} size={18}/>
            </button>
            <div className="ap-breadcrumb">
              <span className="ap-breadcrumb-sub">Admin</span>
              <span className="ap-breadcrumb-title">{activeNav?.label || "Dashboard"}</span>
            </div>
          </div>
          <div className="ap-topbar-right">
            <button className="ap-topbar-btn" onClick={() => window.open("/", "_blank")}>
              <Ico d={I.preview} size={12}/> Preview
            </button>
            <button className="ap-topbar-btn ap-topbar-btn--icon" onClick={() => navigate("/admin/notifications")}>
              <Ico d={I.notif} size={15}/>
              {unreadCount > 0 && <span className="ap-notif-badge">{unreadCount}</span>}
            </button>
            <button className="ap-topbar-btn ap-topbar-btn--icon" onClick={fetchOverview} disabled={loading}>
              <Ico d={I.refresh} size={14}/>
            </button>
            <div className="ap-topbar-avatar">A</div>
          </div>
        </header>

        {/* Content */}
        <div className="ap-content">
          {renderSection()}
        </div>

      </div>
    </div>
  );
}
