import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  collection, query, where, getDocs, orderBy, limit, Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";

/* ─── Helpers ─────────────────────────────────────────────── */
function fmtMoney(n) {
  const v = Number(n || 0);
  if (v >= 1000000) return `GHS ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `GHS ${(v / 1000).toFixed(1)}k`;
  return `GHS ${v.toFixed(2)}`;
}
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}
function startOfWeek() {
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay());
  return Timestamp.fromDate(d);
}
function startOfMonth() {
  const d = new Date();
  d.setDate(1); d.setHours(0,0,0,0);
  return Timestamp.fromDate(d);
}
function startOfLastMonth() {
  const d = new Date();
  d.setDate(1); d.setHours(0,0,0,0);
  d.setMonth(d.getMonth() - 1);
  return Timestamp.fromDate(d);
}
function pctChange(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/* ─── SVG icons ───────────────────────────────────────────── */
function IconBox()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>; }
function IconCheck()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }
function IconDollar()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function IconUsers()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconCart()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>; }
function IconTrend()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>; }
function UpArrow()     { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>; }
function DownArrow()   { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>; }

/* ─── Stat Card ───────────────────────────────────────────── */
function StatCard({ label, value, pct, icon, color = "#046EF2", loading }) {
  const up = pct >= 0;
  return (
    <div className="sd-stat-card">
      <div className="sd-stat-top">
        <div className="sd-stat-label">{label}</div>
        <div className="sd-stat-icon" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
      </div>
      {loading
        ? <div className="sd-skeleton" style={{ height: 28, width: "60%", margin: "8px 0" }}/>
        : <div className="sd-stat-value">{value}</div>
      }
      {!loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: up ? "#22C55E" : "#EF4444" }}>
          {up ? <UpArrow/> : <DownArrow/>}
          {Math.abs(pct)}%
          <span style={{ color: "#9CA3AF", fontWeight: 500 }}>vs last month</span>
        </div>
      )}
    </div>
  );
}

/* ─── Tooltip ─────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 600 }}>
      <div style={{ color: "#8B8FA8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#046EF2" }}>GHS {Number(p.value).toFixed(2)}</div>
      ))}
    </div>
  );
}

const STATUS_COLOR = {
  delivered:  "#22C55E",
  processing: "#046EF2",
  pending:    "#F59E0B",
  cancelled:  "#EF4444",
  paid:       "#22C55E",
  shipped:    "#7C3AED",
};

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ─── Main ─────────────────────────────────────────────────── */
export default function DashboardHome() {
  const { user } = useAuth();
  const { shop, storeId, subscriptionPlan } = useSellerAuth();

  const [orders,      setOrders]      = useState([]);
  const [lastOrders,  setLastOrders]  = useState([]);
  const [loading,     setLoading]     = useState(true);

  /* Fetch this store's orders (current + last month) */
  useEffect(() => {
    const sid = storeId || shop?.id;
    if (!sid && !user?.uid) return;

    setLoading(true);

    const fetchOrders = async () => {
      try {
        const base = collection(db, "orders");

        /* Query by sellerId or shops array */
        const field = "sellerId";
        const idVal = sid || user.uid;

        const [curSnap, prevSnap] = await Promise.all([
          getDocs(query(base, where(field, "==", idVal),
            where("createdAt", ">=", startOfLastMonth()),
            orderBy("createdAt", "desc"), limit(200))),
          getDocs(query(base, where(field, "==", idVal),
            where("createdAt", ">=", startOfLastMonth()),
            orderBy("createdAt", "asc"), limit(200))),
        ]);

        const all = curSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const monthStart = startOfMonth().toMillis();
        const lastMonthStart = startOfLastMonth().toMillis();

        const thisMonth = all.filter(o => {
          const t = o.createdAt?.toMillis?.() || 0;
          return t >= monthStart;
        });
        const lastMonth = all.filter(o => {
          const t = o.createdAt?.toMillis?.() || 0;
          return t >= lastMonthStart && t < monthStart;
        });

        setOrders(thisMonth);
        setLastOrders(lastMonth);
      } catch (err) {
        console.error("[DashboardHome] orders fetch:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [storeId, shop?.id, user?.uid]);

  /* ── Computed metrics ── */
  const metrics = useMemo(() => {
    const weekStart = startOfWeek().toMillis();

    const weekOrders   = orders.filter(o => (o.createdAt?.toMillis?.() || 0) >= weekStart);
    const lastWeekEnd  = weekStart;
    const lastWeekStart = weekStart - 7 * 24 * 60 * 60 * 1000;
    const prevWeekOrders = lastOrders.filter(o => {
      const t = o.createdAt?.toMillis?.() || 0;
      return t >= lastWeekStart && t < lastWeekEnd;
    });

    const revenue      = orders.reduce((s, o) => s + Number(o.pricing?.total || 0), 0);
    const prevRevenue  = lastOrders.reduce((s, o) => s + Number(o.pricing?.total || 0), 0);

    const approved     = orders.filter(o => ["paid","delivered","processing","shipped"].includes(o.status));
    const prevApproved = lastOrders.filter(o => ["paid","delivered","processing","shipped"].includes(o.status));

    const uniqueCustomers = new Set(orders.map(o => o.userId || o.customer?.email)).size;
    const prevCustomers   = new Set(lastOrders.map(o => o.userId || o.customer?.email)).size;

    const avgOrder = orders.length > 0 ? revenue / orders.length : 0;

    /* Status breakdown for donut */
    const statusMap = {};
    orders.forEach(o => {
      const s = o.status || "pending";
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    const statusData = Object.entries(statusMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: STATUS_COLOR[name] || "#9CA3AF",
    }));

    /* Daily revenue for bar chart (last 7 days) */
    const today = new Date();
    const barData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const rev = orders
        .filter(o => {
          const t = o.createdAt?.toMillis?.() || 0;
          return t >= d.getTime() && t < next.getTime();
        })
        .reduce((s, o) => s + Number(o.pricing?.total || 0), 0);
      return { day: DAY_LABELS[d.getDay()], revenue: rev };
    });

    /* Recent 5 orders */
    const recent = [...orders]
      .sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .slice(0, 5);

    return {
      weekOrderCount:  weekOrders.length,
      prevWeekCount:   prevWeekOrders.length,
      revenue,         prevRevenue,
      approvedCount:   approved.length,
      prevApproved:    prevApproved.length,
      uniqueCustomers, prevCustomers,
      avgOrder,
      statusData,      barData, recent,
      totalOrders:     orders.length,
    };
  }, [orders, lastOrders]);

  const today = new Date().toLocaleDateString("en-GH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const STATUS_BADGE = {
    paid: "sd-badge-green", delivered: "sd-badge-green",
    processing: "sd-badge-blue", shipped: "sd-badge-blue",
    pending: "sd-badge-yellow", cancelled: "sd-badge-red",
  };

  return (
    <div>
      {/* Page header */}
      <div className="sd-page-head" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="sd-page-title">Analytics</div>
          <div className="sd-page-sub">{today}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#22C55E" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }}/>
          Store Active
        </div>
      </div>

      {/* ── 4 stat cards ── */}
      <div className="sd-stats-row">
        <StatCard
          label="Orders (Week)" icon={<IconBox/>}    color="#046EF2"
          value={metrics.weekOrderCount}
          pct={pctChange(metrics.weekOrderCount, metrics.prevWeekCount)}
          loading={loading}
        />
        <StatCard
          label="Approved Orders" icon={<IconCheck/>}  color="#22C55E"
          value={metrics.approvedCount}
          pct={pctChange(metrics.approvedCount, metrics.prevApproved)}
          loading={loading}
        />
        <StatCard
          label="Revenue (Month)" icon={<IconDollar/>} color="#7C3AED"
          value={fmtMoney(metrics.revenue)}
          pct={pctChange(metrics.revenue, metrics.prevRevenue)}
          loading={loading}
        />
        <StatCard
          label="Customers" icon={<IconUsers/>}  color="#F59E0B"
          value={metrics.uniqueCustomers}
          pct={pctChange(metrics.uniqueCustomers, metrics.prevCustomers)}
          loading={loading}
        />
      </div>

      {/* ── 2 more stat cards ── */}
      <div className="sd-stats-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", marginBottom: 20 }}>
        <StatCard
          label="Avg Order Value" icon={<IconCart/>}  color="#046EF2"
          value={fmtMoney(metrics.avgOrder)}
          pct={0} loading={loading}
        />
        <StatCard
          label="Total Orders" icon={<IconTrend/>} color="#22C55E"
          value={metrics.totalOrders}
          pct={pctChange(metrics.totalOrders, lastOrders.length)}
          loading={loading}
        />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, marginBottom: 20 }}>

        {/* Bar chart — daily revenue */}
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title">Daily Revenue (Last 7 Days)</span>
          </div>
          {loading
            ? <div className="sd-skeleton" style={{ height: 180, borderRadius: 8 }}/>
            : metrics.barData.every(d => d.revenue === 0)
              ? <div className="sd-empty" style={{ height: 180 }}>
                  <div className="sd-empty-title">No sales yet this week</div>
                  <div className="sd-empty-text">Revenue will appear here once you receive orders.</div>
                </div>
              : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={metrics.barData} barSize={22}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}`}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Bar dataKey="revenue" fill="#046EF2" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )
          }
        </div>

        {/* Order status donut */}
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title">Order Status</span>
          </div>
          {loading
            ? <div className="sd-skeleton" style={{ height: 180, borderRadius: 8 }}/>
            : metrics.statusData.length === 0
              ? <div className="sd-empty" style={{ height: 180 }}>
                  <div className="sd-empty-title">No orders yet</div>
                </div>
              : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={metrics.statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                        {metrics.statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.color}/>
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} orders`, n]}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {metrics.statusData.map((s) => (
                      <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }}/>
                          <span style={{ color: "#374151", fontWeight: 600 }}>{s.name}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: "#111" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
          }
        </div>
      </div>

      {/* ── Recent orders ── */}
      <div className="sd-panel">
        <div className="sd-panel-head">
          <span className="sd-panel-title">Recent Orders</span>
          <span style={{ fontSize: 12, color: "#8B8FA8" }}>{metrics.totalOrders} total</span>
        </div>

        {loading
          ? [1,2,3].map(i => <div key={i} className="sd-skeleton" style={{ height: 48, marginBottom: 10, borderRadius: 8 }}/>)
          : metrics.recent.length === 0
            ? (
              <div className="sd-empty">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.4" strokeLinecap="round" style={{ marginBottom: 10 }}>
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <div className="sd-empty-title">No orders yet</div>
                <div className="sd-empty-text">Your first order will appear here.</div>
              </div>
            )
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recent.map(o => {
                      const cust = o.customer;
                      const name = [cust?.firstName, cust?.lastName].filter(Boolean).join(" ") || "Customer";
                      return (
                        <tr key={o.id}>
                          <td style={{ fontSize: 12, color: "#8B8FA8", fontFamily: "monospace" }}>
                            #{o.id?.slice(0,8).toUpperCase()}
                          </td>
                          <td style={{ fontWeight: 600 }}>{name}</td>
                          <td style={{ fontWeight: 700 }}>GHS {Number(o.pricing?.total || 0).toFixed(2)}</td>
                          <td style={{ fontSize: 12, color: "#8B8FA8" }}>{fmtDate(o.createdAt)}</td>
                          <td>
                            <span className={`sd-badge ${STATUS_BADGE[o.status] || "sd-badge-gray"}`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Empty state hint for new stores */}
      {!loading && metrics.totalOrders === 0 && (
        <div style={{
          marginTop: 16, padding: "20px 24px",
          background: "rgba(4,110,242,0.05)",
          borderRadius: 14, border: "1px solid rgba(4,110,242,0.1)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#046EF2" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#046EF2" }}>Your store is live — start listing products!</div>
            <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
              Go to <strong>Products</strong> to add your first product, then share your store link on WhatsApp and TikTok.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}