import { useStoreAnalytics } from "../../hooks/useStoreAnalytics";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import TutorialOverlay from "../../components/ai/TutorialOverlay";
import { TUTORIAL_STEPS } from "../../components/ai/tutorialSteps";
import { useTutorial } from "../../hooks/useTutorial";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "#8B8FA8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name === "revenue" ? "GHS " : ""}{Number(p.value).toLocaleString()} {p.name !== "revenue" ? p.name : ""}
        </div>
      ))}
    </div>
  );
}

export default function DashboardAnalytics() {
  const { showTutorial, markSeen } = useTutorial("analytics");
  const { weekSeries, weekRevenue, weekOrders, weekVisitors, loading } = useStoreAnalytics();

  const totals = [
    { label: "Revenue (7d)", value: `GHS ${Number(weekRevenue || 0).toFixed(0)}`, color: "#046EF2" },
    { label: "Orders (7d)",  value: weekOrders,   color: "#22C55E" },
    { label: "Visitors (7d)", value: weekVisitors, color: "#7C3AED" },
    { label: "Conversion",   value: weekVisitors > 0 ? `${((weekOrders / weekVisitors) * 100).toFixed(1)}%` : "0%", color: "#F59E0B" },
  ];

  return (
    <div style={{ background: "#fff" }}>
      <div className="sd-page-head">
        <div className="sd-page-title">Analytics</div>
        <div className="sd-page-sub">Last 7 days performance</div>
      </div>

      {/* Summary */}
      <div className="sd-stats-grid" style={{ marginBottom: 14 }}>
        {totals.map((t) => (
          <div key={t.label} className="sd-stat-card" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}>
            <div className="sd-stat-label">{t.label}</div>
            {loading
              ? <div className="sd-skeleton" style={{ height: 28, width: "60%", marginTop: 8 }} />
              : <div className="sd-stat-value" style={{ color: t.color }}>{t.value}</div>
            }
          </div>
        ))}
      </div>

      {/* Revenue area chart */}
      <div className="sd-panel" style={{ marginBottom: 14, background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}>
        <div className="sd-panel-head">
          <span className="sd-panel-title">Revenue Trend</span>
          <span className="sd-panel-sub">Daily revenue this week</span>
        </div>
        {loading
          ? <div className="sd-skeleton" style={{ height: 220 }} />
          : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weekSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#046EF2" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#046EF2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="label" stroke="transparent" tick={{ fontSize: 11, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fontSize: 11, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#046EF2" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 4, fill: "#046EF2" }} name="revenue" />
              </AreaChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* Orders + Visitors side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="sd-panel" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}>
          <div className="sd-panel-head"><span className="sd-panel-title">Daily Orders</span></div>
          {loading ? <div className="sd-skeleton" style={{ height: 160 }} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekSeries} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barSize={20}>
                <XAxis dataKey="label" stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(34,197,94,0.05)" }} />
                <Bar dataKey="orders" fill="#22C55E" radius={[4, 4, 0, 0]} name="orders" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="sd-panel" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}>
          <div className="sd-panel-head"><span className="sd-panel-title">Daily Visitors</span></div>
          {loading ? <div className="sd-skeleton" style={{ height: 160 }} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={weekSeries} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="visitors" stroke="#7C3AED" strokeWidth={2} fill="url(#visGrad)" dot={false} name="visitors" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    {showTutorial && (
      <TutorialOverlay
        steps={TUTORIAL_STEPS.analytics}
        onFinish={markSeen}
        pageTitle="Analytics"
      />
    )}
    </div>
  );
}