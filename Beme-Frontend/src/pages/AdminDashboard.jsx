import { useState } from "react";
import "./AdminDashboard.css";
import { useNavigate, useLocation } from "react-router-dom";

/* ─── Inline SVG icon helper ─── */
const Icon = ({ d, size = 18 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
  >
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

const RECENT_ORDERS = [
  { id: "#ORD-2841", customer: "Ama Owusu",     total: "GH₵ 320.00", status: "Completed", date: "May 4" },
  { id: "#ORD-2840", customer: "Kwame Asante",   total: "GH₵ 89.50",  status: "Pending",   date: "May 4" },
  { id: "#ORD-2839", customer: "Efua Mensah",    total: "GH₵ 540.00", status: "Completed", date: "May 3" },
  { id: "#ORD-2838", customer: "Kofi Boateng",   total: "GH₵ 175.00", status: "Refunded",  date: "May 3" },
  { id: "#ORD-2837", customer: "Abena Frimpong", total: "GH₵ 62.00",  status: "Pending",   date: "May 2" },
];

const STATUS = {
  Completed: { bg: "#0d2e1a", color: "#22c55e" },
  Pending:   { bg: "#2a2000", color: "#f59e0b" },
  Refunded:  { bg: "#2a0d0d", color: "#ef4444" },
};

/* ─── Stat card ─── */
function StatCard({ label, value, delta }) {
  return (
    <div style={{
      background: "#1a1a1a", borderRadius: 10, padding: "16px 18px",
      border: "1px solid #2a2a2a",
    }}>
      <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {delta !== undefined && (
        <div style={{ fontSize: 11, marginTop: 4, color: delta >= 0 ? "#22c55e" : "#ef4444" }}>
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs last week
        </div>
      )}
    </div>
  );
}

/* ─── Sidebar nav item ─── */
function NavItem({ item, isActive, collapsed, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onClick(item.path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? item.label : undefined}
      style={{
        display: "flex", alignItems: "center",
        gap: collapsed ? 0 : 10,
        justifyContent: collapsed ? "center" : "flex-start",
        padding: collapsed ? "10px 0" : "10px 13px",
        borderRadius: 8, border: "none", cursor: "pointer", width: "100%",
        background: isActive ? "#1e1208" : hovered ? "#181818" : "transparent",
        color: isActive ? "#e67e22" : hovered ? "#bbb" : "#777",
        transition: "background 0.15s, color 0.15s",
        fontFamily: "inherit",
      }}
    >
      <span style={{ flexShrink: 0 }}>
        <Icon d={ICONS[item.key]} size={17} />
      </span>
      {!collapsed && (
        <span style={{ fontSize: 13.5, fontWeight: isActive ? 500 : 400, whiteSpace: "nowrap" }}>
          {item.label}
        </span>
      )}
      {isActive && !collapsed && (
        <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#e67e22" }} />
      )}
    </button>
  );
}

/* ═══════════ MAIN PAGE ═══════════ */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(false);

  const active = location.pathname;

  const Logo = () => (
    <svg width={26} height={26} viewBox="0 0 32 32">
      <path d="M6 8 L16 4 L26 8 L26 24 L16 28 L6 24 Z" fill="#e67e22" opacity=".9" />
      <path d="M6 8 L16 12 L16 28 L6 24 Z" fill="#c0580c" />
      <path d="M26 8 L16 12 L16 28 L26 24 Z" fill="#f0a050" opacity=".7" />
    </svg>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        .admin-root { display:flex; min-height:100vh; background:#0d0d0d; font-family:'DM Sans',sans-serif; }
        .admin-sidebar { width:${collapsed ? 60 : 216}px; min-height:100vh; background:#111; border-right:1px solid #1f1f1f; display:flex; flex-direction:column; padding-bottom:14px; transition:width 0.2s ease; flex-shrink:0; position:sticky; top:0; align-self:flex-start; }
        .admin-drawer-overlay { display:none; }
        .admin-drawer { display:none; }
        .admin-hamburger { display:none; }
        .qcard { transition:border-color .15s, background .15s; }
        .qcard:hover { border-color:#e67e22 !important; background:#1a1a1a !important; }
        @media (max-width: 767px) {
          .admin-sidebar { display:none !important; }
          .admin-hamburger { display:block !important; }
          .admin-drawer-overlay { display:block; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:40; }
          .admin-drawer { display:flex; position:fixed; top:0; left:0; bottom:0; width:240px; background:#111; border-right:1px solid #1f1f1f; flex-direction:column; padding-bottom:14px; z-index:50; transition:transform 0.25s ease; }
        }
      `}</style>

      <div className="admin-root">

        {/* ── Desktop Sidebar ── */}
        <aside className="admin-sidebar">
          <div style={{ height: 60, display: "flex", alignItems: "center", padding: `0 ${collapsed ? 16 : 16}px`, gap: 9, borderBottom: "1px solid #1f1f1f", justifyContent: collapsed ? "center" : "flex-start" }}>
            <Logo />
            {!collapsed && <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", letterSpacing: "0.03em" }}>BEME MARKET</span>}
          </div>
          <nav style={{ flex: 1, padding: "10px 6px", display: "flex", flexDirection: "column", gap: 1 }}>
            {NAV_ITEMS.map(item => (
              <NavItem key={item.key} item={item} isActive={active === item.path} collapsed={collapsed} onClick={navigate} />
            ))}
          </nav>
          <div style={{ padding: "0 6px", borderTop: "1px solid #1f1f1f", paddingTop: 8 }}>
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10, padding: collapsed ? "10px 0" : "9px 13px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#444", fontFamily: "inherit", width: "100%" }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7M19 19l-7-7 7-7"} />
              </svg>
              {!collapsed && <span style={{ fontSize: 13, color: "#555" }}>Collapse</span>}
            </button>
            <button
              onClick={() => navigate("/")}
              style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: collapsed ? 0 : 10, padding: collapsed ? "10px 0" : "9px 13px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#555", fontFamily: "inherit", width: "100%" }}
            >
              <Icon d={ICONS.logout} size={17} />
              {!collapsed && <span style={{ fontSize: 13 }}>Exit Admin</span>}
            </button>
          </div>
        </aside>

        {/* ── Mobile Drawer ── */}
        {sidebarOpen && (
          <>
            <div className="admin-drawer-overlay" onClick={() => setSidebarOpen(false)} />
            <div className="admin-drawer" style={{ transform: "translateX(0)" }}>
              <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 16px", gap: 9, borderBottom: "1px solid #1f1f1f", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Logo />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", letterSpacing: "0.03em" }}>BEME MARKET</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer" }}>
                  <Icon d={ICONS.close} size={18} />
                </button>
              </div>
              <nav style={{ flex: 1, padding: "10px 6px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
                {NAV_ITEMS.map(item => (
                  <NavItem key={item.key} item={item} isActive={active === item.path} collapsed={false} onClick={(path) => { navigate(path); setSidebarOpen(false); }} />
                ))}
              </nav>
              <div style={{ padding: "8px 6px", borderTop: "1px solid #1f1f1f" }}>
                <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#555", fontFamily: "inherit", width: "100%" }}>
                  <Icon d={ICONS.logout} size={17} />
                  <span style={{ fontSize: 13 }}>Exit Admin</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Main ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Top bar */}
          <header style={{ height: 60, borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", padding: "0 20px", justifyContent: "space-between", background: "#111", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className="admin-hamburger"
                onClick={() => setSidebarOpen(true)}
                style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", padding: 4, display: "none" }}
              >
                <Icon d={ICONS.menu} size={22} />
              </button>
              <div>
                <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>Dashboard</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => window.open("/", "_blank")}
                style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#888", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                Preview ↗
              </button>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e67e22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff", flexShrink: 0 }}>
                A
              </div>
            </div>
          </header>

          {/* Content */}
          <div style={{ flex: 1, padding: "20px 16px 40px", overflowX: "hidden" }}>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 22 }}>
              <StatCard label="Total Orders"    value="2,841" delta={12} />
              <StatCard label="Revenue"         value="₵184k" delta={8}  />
              <StatCard label="Active Shops"    value="47"    delta={3}  />
              <StatCard label="Pending Reviews" value="14"    delta={-5} />
              <StatCard label="Open Tickets"    value="6"     delta={-2} />
            </div>

            {/* Two-col → stacked on mobile */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, alignItems: "start" }}>

              {/* Quick nav */}
              <div>
                <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, fontWeight: 500 }}>
                  Admin Sections
                </div>
                {NAV_ITEMS.filter(i => i.key !== "dashboard").map(item => (
                  <div
                    key={item.key}
                    className="qcard"
                    onClick={() => navigate(item.path)}
                    style={{ background: "#141414", border: "1px solid #252525", borderRadius: 9, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}
                  >
                    <span style={{ color: "#e67e22" }}><Icon d={ICONS[item.key]} size={16} /></span>
                    <span style={{ fontSize: 13.5, color: "#ccc" }}>{item.label}</span>
                    <span style={{ marginLeft: "auto", color: "#444", fontSize: 13 }}>→</span>
                  </div>
                ))}
              </div>

              {/* Recent orders */}
              <div>
                <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, fontWeight: 500 }}>
                  Recent Orders
                </div>
                <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 10, overflow: "hidden" }}>
                  {RECENT_ORDERS.map((order, i) => (
                    <div
                      key={order.id}
                      style={{ padding: "12px 14px", borderBottom: i < RECENT_ORDERS.length - 1 ? "1px solid #1f1f1f" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#ccc", fontWeight: 500 }}>{order.id}</div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{order.customer} · {order.date}</div>
                        <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{order.total}</div>
                      </div>
                      <div style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: STATUS[order.status].bg, color: STATUS[order.status].color, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {order.status}
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: "10px 14px", borderTop: "1px solid #1f1f1f" }}>
                    <button onClick={() => navigate("/admin-orders")} style={{ background: "transparent", border: "none", color: "#e67e22", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                      View all orders →
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}