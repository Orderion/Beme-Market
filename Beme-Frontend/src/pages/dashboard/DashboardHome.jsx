import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useStoreAnalytics } from "../../hooks/useStoreAnalytics";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useSubscription } from "../../hooks/useSubscription";

/* ── Helpers ── */
function fmtMoney(n) {
  const v = Number(n || 0);
  if (v >= 1000) return `GHS ${(v / 1000).toFixed(1)}k`;
  return `GHS ${v.toFixed(0)}`;
}

function TrendArrow({ up }) {
  return up
    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
}

/* ── Stat Card ── */
function StatCard({ label, value, trend, trendLabel, icon, color = "#046EF2", loading }) {
  const up = Number(trend) >= 0;
  return (
    <div className="sd-stat-card">
      <div className="sd-stat-top">
        <div className="sd-stat-label">{label}</div>
        <div className="sd-stat-icon" style={{ background: `${color}15` }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </div>
      </div>
      {loading
        ? <div className="sd-skeleton" style={{ height: 28, width: "70%", marginBottom: 8 }} />
        : <div className="sd-stat-value">{value}</div>
      }
      {!loading && (
        <div className={`sd-stat-trend ${up ? "up" : "down"}`}>
          <TrendArrow up={up} />
          {Math.abs(trend)}%
          <span className="sd-stat-trend-sub">&nbsp;since last month</span>
        </div>
      )}
    </div>
  );
}

/* ── Custom tooltip ── */
function CustomTooltip({ active, payload, label, prefix = "GHS " }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--sd-card,#fff)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 600 }}>
      <div style={{ color: "#8B8FA8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#046EF2" }}>{prefix}{Number(p.value).toLocaleString()}</div>
      ))}
    </div>
  );
}

const ORDER_STATUS_COLORS = {
  delivered: "#22C55E",
  processing: "#046EF2",
  pending: "#F59E0B",
  cancelled: "#EF4444",
};

export default function DashboardHome() {
  const { weekSeries, weekRevenue, weekOrders, weekVisitors, loading } = useStoreAnalytics();
  const { shop, subscriptionPlan } = useSellerAuth();
  const { subscription, daysUntilRenewal } = useSubscription();

  // Mock order status donut (replace with real data from orders query)
  const orderStatusData = [
    { name: "Delivered",  value: 58, color: "#22C55E" },
    { name: "Processing", value: 28, color: "#046EF2" },
    { name: "Pending",    value: 10, color: "#F59E0B" },
    { name: "Cancelled",  value: 4,  color: "#EF4444" },
  ];

  // Subscription donut
  const planData = [
    { name: "Paid",  value: 70, color: "#046EF2" },
    { name: "Trial", value: 30, color: "#E8EFFF" },
  ];

  const today = new Date().toLocaleDateString("en-GH", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <div>
      {/* Welcome */}
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Analytics</div>
          <div className="sd-page-sub">{today}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#8B8FA8" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />
          Store Active
        </div>
      </div>

      {/* Stats grid */}
      <div className="sd-stats-grid">
        <StatCard
          label="Orders (Week)" value={weekOrders}
          trend={8.2} icon="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0"
          color="#046EF2" loading={loading}
        />
        <StatCard
          label="Approved Orders" value={Math.round(weekOrders * 0.85)}
          trend={3.4} icon="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
          color="#22C55E" loading={loading}
        />
        <StatCard
          label="Revenue (Week)" value={fmtMoney(weekRevenue)}
          trend={-1.2} icon="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
          color="#7C3AED" loading={loading}
        />
        <StatCard
          label="Visitors (Week)" value={weekVisitors}
          trend={12.5} icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"
          color="#F59E0B" loading={loading}
        />
      </div>

      {/* Second row — Month total + Revenue + Donut charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Month total */}
        <div className="sd-stat-card" style={{ gridColumn: "span 1" }}>
          <div className="sd-stat-top">
            <div className="sd-stat-label">Month Total</div>
            <div className="sd-stat-icon" style={{ background: "#046EF215" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#046EF2" strokeWidth="1.8" strokeLinecap="round"><path d="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="sd-stat-value" style={{ fontSize: 22 }}>{fmtMoney((weekRevenue || 0) * 4.3)}</div>
          <div className="sd-stat-trend down"><TrendArrow up={false} /> 0.2% <span className="sd-stat-trend-sub">&nbsp;since last month</span></div>
        </div>

        {/* Revenue */}
        <div className="sd-stat-card">
          <div className="sd-stat-top">
            <div className="sd-stat-label">Avg Order Value</div>
            <div className="sd-stat-icon" style={{ background: "#7C3AED15" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
          </div>
          <div className="sd-stat-value" style={{ fontSize: 22 }}>
            {weekOrders > 0 ? fmtMoney(weekRevenue / weekOrders) : "GHS 0"}
          </div>
          <div className="sd-stat-trend down"><TrendArrow up={false} /> 1.2% <span className="sd-stat-trend-sub">&nbsp;since last month</span></div>
        </div>

        {/* Order status donut */}
        <div className="sd-stat-card">
          <div className="sd-stat-label" style={{ marginBottom: 8 }}>Order Status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PieChart width={80} height={80}>
              <Pie data={orderStatusData} cx={35} cy={35} innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
                {orderStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
            <div className="sd-donut-legend">
              {orderStatusData.map((d) => (
                <div key={d.name} className="sd-donut-legend-item">
                  <div className="sd-donut-dot" style={{ background: d.color }} />
                  {d.value}% {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subscription donut */}
        <div className="sd-stat-card">
          <div className="sd-stat-label" style={{ marginBottom: 8 }}>Subscription</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PieChart width={80} height={80}>
              <Pie data={planData} cx={35} cy={35} innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
                {planData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
            <div className="sd-donut-legend">
              {planData.map((d) => (
                <div key={d.name} className="sd-donut-legend-item">
                  <div className="sd-donut-dot" style={{ background: d.color }} />
                  {d.value}% {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Sales bar chart */}
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title">Sales Dynamics</span>
            <span className="sd-panel-sub">
              {new Date().getFullYear()} ↓
            </span>
          </div>
          {loading
            ? <div className="sd-skeleton" style={{ height: 180 }} />
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekSeries} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={18}>
                  <XAxis dataKey="label" stroke="transparent" tick={{ fontSize: 11, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                  <YAxis stroke="transparent" tick={{ fontSize: 11, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(4,110,242,0.05)" }} />
                  <Bar dataKey="revenue" fill="#046EF2" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="orders" fill="#E8EFFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Paid/Received cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="sd-panel" style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#22C55E", background: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: 100 }}>+15%</span>
            </div>
            <div style={{ fontSize: 11, color: "#8B8FA8", marginBottom: 4 }}>Total Earnings</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1D3B", letterSpacing: "-0.03em", fontFamily: "'Space Grotesk', sans-serif" }}>
              {fmtMoney((weekRevenue || 0) * 4.3)}
            </div>
            <div style={{ fontSize: 11, color: "#8B8FA8", marginTop: 4 }}>Current Month</div>
          </div>

          <div className="sd-panel" style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(4,110,242,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#046EF2" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#046EF2", background: "rgba(4,110,242,0.1)", padding: "2px 8px", borderRadius: 100 }}>+59%</span>
            </div>
            <div style={{ fontSize: 11, color: "#8B8FA8", marginBottom: 4 }}>Pending Payouts</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1D3B", letterSpacing: "-0.03em", fontFamily: "'Space Grotesk', sans-serif" }}>GHS 0</div>
            <div style={{ fontSize: 11, color: "#8B8FA8", marginTop: 4 }}>Awaiting Review</div>
          </div>
        </div>
      </div>

      {/* Activity chart + Recent orders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Visitor activity line chart */}
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title">Overall Visitor Activity</span>
            <span className="sd-panel-sub">{new Date().getFullYear()} ↓</span>
          </div>
          {loading
            ? <div className="sd-skeleton" style={{ height: 150 }} />
            : (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={weekSeries} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                  <YAxis stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip prefix="" />} />
                  <Area type="monotone" dataKey="visitors" stroke="#7C3AED" strokeWidth={2} fill="url(#visitorGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Recent orders */}
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title">Customer Orders</span>
            <button className="sd-btn sd-btn-ghost sd-btn-sm" style={{ fontSize: 11 }}>Refresh ↺</button>
          </div>
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Kofi M.", date: "22.05.2025", status: "delivered", amt: 1200 },
                  { name: "Akosua B.", date: "24.05.2025", status: "processing", amt: 450 },
                  { name: "Yaw D.", date: "25.05.2025", status: "cancelled", amt: 380 },
                  { name: "Ama S.", date: "26.05.2025", status: "delivered", amt: 2400 },
                ].map((o, i) => {
                  const sc = { delivered: "sd-badge-green", processing: "sd-badge-blue", cancelled: "sd-badge-red", pending: "sd-badge-yellow" };
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{o.name}</td>
                      <td style={{ color: "#8B8FA8", fontSize: 12 }}>{o.date}</td>
                      <td><span className={`sd-badge ${sc[o.status] || "sd-badge-gray"}`}>{o.status}</span></td>
                      <td style={{ fontWeight: 700 }}>GHS {o.amt.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

