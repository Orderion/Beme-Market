import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAnalyticsData } from "../../hooks/useAnalyticsData";
import { incrementUsage } from "../../services/aiUsageService";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

/* ── Accent colours (brand only — not bg/text/border) ── */
const A = {
  blue:   "#7c3aed",
  green:  "#22C55E",
  purple: "#7C3AED",
  orange: "#F59E0B",
  red:    "#EF4444",
};

/* ── Icons ── */
function Ico({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split(" M").map((seg, i) => <path key={i} d={(i === 0 ? "" : "M") + seg} />)}
    </svg>
  );
}

const IC = {
  revenue:   "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  orders:    "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  customers: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  visitors:  "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  conv:      "M22 7l-8.5 8.5-5-5L1 18",
  lock:      "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  sparkle:   "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  up:        "M5 15l7-7 7 7",
  down:      "M19 9l-7 7-7-7",
  product:   "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  wallet:    "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12h.01",
  repeat:    "M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3",
  trend:     "M22 12h-4l-3 9L9 3l-3 9H2",
};

/* ── Chart Tooltip ── */
function ChartTip({ active, payload, label, prefix = "", suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="an-tooltip">
      <div className="an-tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || A.blue, fontWeight: 800, fontSize: 14 }}>
          {prefix}{typeof p.value === "number" ? p.value.toLocaleString() : p.value}{suffix}
        </div>
      ))}
    </div>
  );
}

/* ── No data ── */
function Empty({ msg = "No data available for this period" }) {
  return (
    <div className="an-empty">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="an-empty-icon">
        <path d="M18 20V10 M12 20V4 M6 20v-6"/>
      </svg>
      <div className="an-empty-msg">{msg}</div>
    </div>
  );
}

/* ── Card ── */
function Card({ children, style = {}, className = "" }) {
  return (
    <div className={`an-card ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ label, value, sub, color, icon, trend, loading }) {
  const up = trend >= 0;
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div className="an-stat-top">
        <div className="an-stat-label">{label}</div>
        <div className="an-stat-icon" style={{ background: `${color}14` }}>
          <Ico d={icon} size={15} color={color}/>
        </div>
      </div>
      {loading
        ? <div className="an-skeleton" style={{ height: 32, width: "55%" }}/>
        : <div className="an-stat-value">{value}</div>
      }
      {!loading && (
        <div className="an-stat-trend">
          {trend !== undefined && (
            <span className="an-stat-trend-pct" style={{ color: up ? A.green : A.red }}>
              <Ico d={up ? IC.up : IC.down} size={12} color={up ? A.green : A.red}/>
              {Math.abs(trend)}%
            </span>
          )}
          <span className="an-stat-sub">{sub}</span>
        </div>
      )}
    </Card>
  );
}

/* ── Plan gate ── */
function LockedState() {
  const nav = useNavigate();
  return (
    <div className="an-locked">
      <div className="an-locked-icon">
        <Ico d={IC.lock} size={28} color={A.blue}/>
      </div>
      <div className="an-locked-title">Analytics Pro</div>
      <div className="an-locked-sub">
        Advanced analytics are available on the <strong>Growth</strong> and{" "}
        <strong>Pro</strong> plans.
      </div>
      <button className="an-locked-btn" onClick={() => nav("/seller-dashboard?tab=subscription")}>
        Upgrade Plan →
      </button>
      <div className="an-locked-features">
        <div className="an-locked-features-label">What you unlock</div>
        {["Revenue & orders over time","Visitor & product view tracking",
          "Customer funnel & conversion","Repeat buyer rate","Product performance table",
          "Top customers by spend","Revenue by day of week","Live store visitors",
          "Payout forecast","AI weekly summary"].map((f,i) => (
          <div key={i} className="an-locked-feature-row">
            <Ico d="M20 6L9 17l-5-5" size={12} color={A.blue}/>{f}
          </div>
        ))}
      </div>
    </div>
  );
}

const PERIODS = [{ key:7,label:"7 Days" },{ key:30,label:"30 Days" },{ key:90,label:"90 Days" }];
const METRICS = [
  { key:"revenue",  label:"Revenue",  color:A.blue,   prefix:"GHS " },
  { key:"orders",   label:"Orders",   color:A.green,  prefix:""     },
  { key:"visitors", label:"Visitors", color:A.purple, prefix:""     },
];

/* ══════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════ */
export default function DashboardAnalytics() {
  const { user }             = useAuth();
  const { subscriptionPlan, loading: sellerLoading } = useSellerAuth();
  const [period, setPeriod]  = useState(7);
  const [metric, setMetric]  = useState("revenue");
  const [aiSummary, setAI]   = useState(null);
  const [aiLoading, setAIL]  = useState(false);

  const data = useAnalyticsData(period);

  const rawPlan   = (subscriptionPlan || "").toLowerCase().replace(/\s*plan\s*/gi,"").trim();
  const hasAccess = sellerLoading ? true : rawPlan !== "basic" && rawPlan !== "";

  const dateStr = new Date().toLocaleDateString("en-GH",
    { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  const metricCfg   = METRICS.find(m => m.key === metric) || METRICS[0];
  const hasData     = data.series?.some(d => (d[metric]||0) > 0);
  const hasProducts = data.topProducts?.length > 0;

  useEffect(() => {
    if (data.loading || !hasAccess || data.totalRevenue === undefined || aiSummary) return;
    (async () => {
      setAIL(true);
      try {
        const conv = data.totalVisitors > 0
          ? ((data.totalOrders / data.totalVisitors) * 100).toFixed(1) : "0";
        const res = await fetch(`${API_URL}/api/ai/chat`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            messages:[{ role:"user", content:
              `Analyse this Beme Market seller's ${period}-day analytics. No markdown, no asterisks, plain English.\n\n- Revenue: GHS ${data.totalRevenue.toFixed(2)}\n- Orders: ${data.totalOrders}\n- Visitors: ${data.totalVisitors}\n- Unique customers: ${data.uniqueCustomers}\n- Conversion: ${conv}%\n- Repeat buyer rate: ${data.repeatRate}%\n\nFormat:\nSUMMARY: [2 sentences]\nTIP: [1 specific action]`
            }],
            context:{ currentPage:"analytics" }
          })
        });
        const d = await res.json();
        const txt = d.content || "";
        const sm  = txt.match(/SUMMARY:\s*([\s\S]*?)(?=TIP:|$)/i);
        const tip = txt.match(/TIP:\s*([\s\S]*?)$/i);
        if (user?.uid) incrementUsage(user.uid).catch(()=>{});
        setAI({ summary: sm?.[1]?.trim()||txt, tip: tip?.[1]?.trim()||null });
      } catch(e) { console.error(e); }
      finally { setAIL(false); }
    })();
  }, [data.loading, hasAccess, data.totalRevenue, period]);

  useEffect(() => { setAI(null); }, [period]);

  if (!hasAccess && !sellerLoading) return <LockedState/>;

  return (
    <div className="an-root">

      {/* ── Header ── */}
      <div className="an-header">
        <div>
          <div className="an-title">Analytics Overview</div>
          <div className="an-date">{dateStr}</div>
        </div>
        <div className="an-header-right">
          {data.liveVisitors > 0 && (
            <div className="an-live-pill">
              <div className="an-live-dot"/>
              <span>{data.liveVisitors} live {data.liveVisitors === 1 ? "visitor" : "visitors"}</span>
            </div>
          )}
          <div className="an-period-tabs">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`an-period-btn${period===p.key?" an-period-btn--active":""}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Summary ── */}
      {(aiLoading || aiSummary) && (
        <div className="an-ai-card">
          <div className="an-ai-header">
            <Ico d={IC.sparkle} size={14} color="#fff"/>
            <span>AI Performance Summary</span>
          </div>
          {aiLoading
            ? <div className="an-ai-loading">
                <div className="an-ai-spinner"/>
                Analysing your store…
              </div>
            : aiSummary && (
              <>
                <p className="an-ai-summary">{aiSummary.summary}</p>
                {aiSummary.tip && (
                  <div className="an-ai-tip">💡 {aiSummary.tip}</div>
                )}
                <button className="an-ai-dismiss" onClick={() => setAI(null)}>Dismiss</button>
              </>
            )
          }
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="an-stat-row">
        <StatCard label={`Revenue (${period}d)`} icon={IC.revenue} color={A.blue}
          loading={data.loading} trend={0} sub="vs prev period"
          value={`GHS ${Number(data.totalRevenue||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}/>
        <StatCard label={`Orders (${period}d)`} icon={IC.orders} color={A.green}
          loading={data.loading} trend={0} sub="completed"
          value={data.totalOrders||0}/>
        <StatCard label="Visitors" icon={IC.visitors} color={A.purple}
          loading={data.loading} sub="store page visits"
          value={data.totalVisitors||0}/>
        <StatCard label="Conversion" icon={IC.conv} color={A.orange}
          loading={data.loading} sub="orders / visitors"
          value={`${data.conversionRate||0}%`}/>
      </div>

      {/* ── Main Chart + Quick Stats ── */}
      <div className="an-chart-row">
        {/* Main chart */}
        <Card>
          <div className="an-chart-head">
            <div>
              <div className="an-chart-title">{metricCfg.label} Trend</div>
              <div className="an-chart-sub">Daily breakdown · Last {period} days</div>
            </div>
            <div className="an-metric-tabs">
              {METRICS.map(m => (
                <button key={m.key} onClick={() => setMetric(m.key)}
                  className={`an-metric-btn${metric===m.key?" an-metric-btn--active":""}`}
                  style={metric===m.key ? { borderColor:m.color, color:m.color, background:`${m.color}12` } : {}}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {data.loading ? (
            <div className="an-skeleton" style={{ height:220 }}/>
          ) : !hasData ? (
            <Empty msg={`No ${metricCfg.label.toLowerCase()} data for this period`}/>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.series} margin={{ top:5, right:5, left:-10, bottom:0 }}>
                <defs>
                  <linearGradient id="mGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={metricCfg.color} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={metricCfg.color} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--an-grid)" vertical={false}/>
                <XAxis dataKey="label" stroke="transparent"
                  tick={{ fontSize:11, fill:"var(--an-axis)", fontWeight:600 }} axisLine={false} tickLine={false}/>
                <YAxis stroke="transparent"
                  tick={{ fontSize:11, fill:"var(--an-axis)" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip prefix={metricCfg.prefix}/>}/>
                <Area type="monotone" dataKey={metric}
                  stroke={metricCfg.color} strokeWidth={2.5}
                  fill="url(#mGrad)"
                  dot={{ r:3, fill:metricCfg.color, strokeWidth:2, stroke:"var(--sd-white)" }}
                  activeDot={{ r:5, fill:metricCfg.color }}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Quick stats column */}
        <div className="an-quick-col">
          {/* Customer Insights */}
          <Card style={{ flex:1 }}>
            <div className="an-section-label" style={{ marginBottom:12 }}>Customer Insights</div>
            {[
              { label:"Unique Customers", value: data.uniqueCustomers||0, icon: IC.customers, color: A.blue },
              { label:"Repeat Buyers",    value: `${data.repeatRate||0}%`, icon: IC.repeat,    color: A.green },
              { label:"Avg Order Value",  value: `GHS ${data.avgOrderValue||"0.00"}`, icon: IC.wallet, color: A.orange },
            ].map(item => (
              <div key={item.label} className="an-insight-row">
                <div className="an-insight-left">
                  <Ico d={item.icon} size={13} color={item.color}/>
                  <span className="an-insight-label">{item.label}</span>
                </div>
                <span className="an-insight-value">
                  {data.loading ? "—" : item.value}
                </span>
              </div>
            ))}
          </Card>

          {/* Payout forecast */}
          <Card className="an-forecast-card">
            <div className="an-section-label an-forecast-label">Payout Forecast</div>
            <div className="an-forecast-value">
              GHS {data.loading ? "—" : Number(data.forecastRevenue||0).toLocaleString(undefined,{minimumFractionDigits:2})}
            </div>
            <div className="an-forecast-sub">Est. payout from paid orders</div>
          </Card>
        </div>
      </div>

      {/* ── Orders + Best Days charts ── */}
      <div className="an-chart-grid-2">
        <Card>
          <div className="an-chart-title">Daily Orders</div>
          <div className="an-chart-sub" style={{ marginBottom:14 }}>Order volume per day</div>
          {data.loading ? (
            <div className="an-skeleton" style={{ height:150 }}/>
          ) : !data.series?.some(d=>(d.orders||0)>0) ? (
            <Empty msg="No orders this period"/>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={data.series} margin={{ top:0, right:0, left:-25, bottom:0 }} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--an-grid)" vertical={false}/>
                <XAxis dataKey="label" stroke="transparent"
                  tick={{ fontSize:10, fill:"var(--an-axis)", fontWeight:600 }} axisLine={false} tickLine={false}/>
                <YAxis stroke="transparent"
                  tick={{ fontSize:10, fill:"var(--an-axis)" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>} cursor={{ fill:`${A.green}08` }}/>
                <Bar dataKey="orders" fill={A.green} radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <div className="an-chart-title">Best Days</div>
          <div className="an-chart-sub" style={{ marginBottom:14 }}>Revenue by day of week</div>
          {data.loading ? (
            <div className="an-skeleton" style={{ height:150 }}/>
          ) : !data.byDayOfWeek?.some(d=>(d.revenue||0)>0) ? (
            <Empty msg="No revenue data yet"/>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={data.byDayOfWeek} margin={{ top:0, right:0, left:-25, bottom:0 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--an-grid)" vertical={false}/>
                <XAxis dataKey="day" stroke="transparent"
                  tick={{ fontSize:10, fill:"var(--an-axis)", fontWeight:600 }} axisLine={false} tickLine={false}/>
                <YAxis stroke="transparent"
                  tick={{ fontSize:10, fill:"var(--an-axis)" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip prefix="GHS "/>} cursor={{ fill:`${A.blue}08` }}/>
                <Bar dataKey="revenue" fill={A.blue} radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Product Performance ── */}
      <Card style={{ marginBottom:16 }}>
        <div className="an-card-head">
          <div>
            <div className="an-chart-title">Product Performance</div>
            <div className="an-chart-sub">Revenue, orders and views per product</div>
          </div>
        </div>
        {data.loading ? (
          <div className="an-skeleton" style={{ height:120 }}/>
        ) : !hasProducts ? (
          <Empty msg="No product sales data yet"/>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table className="an-table">
              <thead>
                <tr>
                  {["Product","Revenue","Orders","Views","Conv. Rate"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((p, i) => (
                  <tr key={p.id}>
                    <td>
                      <div className="an-product-cell">
                        <div className="an-product-icon">
                          <Ico d={IC.product} size={12} color={A.blue}/>
                        </div>
                        <span className="an-product-name">{p.name}</span>
                      </div>
                    </td>
                    <td className="an-td-bold">
                      GHS {Number(p.revenue).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </td>
                    <td className="an-td-muted">{p.orders}</td>
                    <td className="an-td-muted">{p.views||"—"}</td>
                    <td>
                      <span className="an-conv-badge" style={{
                        background: p.convRate !== "—" ? `${A.green}14` : "var(--sd-border-light)",
                        color: p.convRate !== "—" ? A.green : "var(--sd-muted)",
                      }}>
                        {p.convRate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Top Customers ── */}
      <Card>
        <div className="an-chart-title">Top Customers</div>
        <div className="an-chart-sub" style={{ marginBottom:16 }}>Highest spenders this period</div>
        {data.loading ? (
          <div className="an-skeleton" style={{ height:100 }}/>
        ) : !data.topCustomers?.length ? (
          <Empty msg="No customer data yet"/>
        ) : (
          <div>
            {data.topCustomers.map((c, i) => (
              <div key={i} className="an-customer-row"
                style={{ borderBottom: i < data.topCustomers.length-1 ? "1px solid var(--sd-border-light)" : "none" }}>
                <div className="an-customer-avatar" style={{ background:`${A.blue}14`, color:A.blue }}>
                  {(c.name||"C")[0].toUpperCase()}
                </div>
                <div className="an-customer-info">
                  <div className="an-customer-name">{c.name}</div>
                  <div className="an-customer-sub">{c.count} order{c.count!==1?"s":""}</div>
                </div>
                <div className="an-customer-total">
                  GHS {Number(c.total).toLocaleString(undefined,{minimumFractionDigits:2})}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <style>{`
        /* ── Analytics-scoped variables ── */
        .an-root {
          /* These inherit from .sd-root / .sd-dark via the CSS variable cascade */
          --an-grid: var(--sd-border-light, rgba(0,0,0,0.04));
          --an-axis: var(--sd-muted, #9ca3af);
          font-family: var(--sd-font, 'DM Sans', system-ui, sans-serif);
          min-height: 100%;
          color: var(--sd-text);
        }

        @keyframes an-spin    { to { transform:rotate(360deg); } }
        @keyframes an-shimmer {
          0%   { background-position:-600px 0; }
          100% { background-position:calc(600px + 100%) 0; }
        }
        @keyframes an-pulse {
          0%,100% { opacity:1; }
          50%     { opacity:0.4; }
        }

        /* Card */
        .an-card {
          background: var(--sd-white);
          border-radius: 16px;
          border: 1px solid var(--sd-border);
          box-shadow: var(--sd-shadow);
          padding: 20px 22px;
        }

        /* Skeleton shimmer */
        .an-skeleton {
          border-radius: 10px;
          background: var(--sd-border-light);
          background-image: linear-gradient(
            90deg,
            var(--sd-border-light) 25%,
            var(--sd-border) 50%,
            var(--sd-border-light) 75%
          );
          background-size: 600px 100%;
          animation: an-shimmer 1.4s ease infinite;
        }

        /* Header */
        .an-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 22px; flex-wrap: wrap; gap: 12px;
        }
        .an-title { font-size: 26px; font-weight: 900; color: var(--sd-text); letter-spacing: -0.03em; margin-bottom: 3px; }
        .an-date  { font-size: 13px; color: var(--sd-muted); font-weight: 500; }
        .an-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        /* Live pill */
        .an-live-pill {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px;
          background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2);
          border-radius: 20px;
        }
        .an-live-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #22c55e;
          animation: an-pulse 1.5s ease infinite;
        }
        .an-live-pill span { font-size: 12px; font-weight: 700; color: #15803d; }

        /* Period tabs */
        .an-period-tabs {
          display: flex;
          background: var(--sd-white);
          border: 1px solid var(--sd-border);
          border-radius: 10px; overflow: hidden;
          box-shadow: var(--sd-shadow);
        }
        .an-period-btn {
          padding: 8px 16px; border: none; font-size: 12px; font-weight: 700;
          cursor: pointer; font-family: inherit; transition: all 0.15s;
          background: transparent; color: var(--sd-muted);
        }
        .an-period-btn--active { background: ${A.blue}; color: #fff; }

        /* AI card */
        .an-ai-card {
          background: linear-gradient(135deg, ${A.blue}, ${A.purple});
          border-radius: 16px; padding: 20px 22px;
          margin-bottom: 16px; color: #fff;
          border: none;
        }
        .an-ai-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; font-weight: 800; }
        .an-ai-loading { display: flex; align-items: center; gap: 8px; font-size: 13px; opacity: 0.85; }
        .an-ai-spinner {
          width: 14px; height: 14px; border: 2px solid #fff; border-top-color: transparent;
          border-radius: 50%; animation: an-spin 0.8s linear infinite; flex-shrink: 0;
        }
        .an-ai-summary { font-size: 13px; line-height: 1.7; opacity: 0.95; margin: 0 0 10px; }
        .an-ai-tip {
          background: rgba(255,255,255,0.15); border-radius: 8px;
          padding: 8px 12px; font-size: 12px; font-weight: 700; line-height: 1.5;
        }
        .an-ai-dismiss {
          margin-top: 8px; background: none; border: none;
          color: rgba(255,255,255,0.55); font-size: 11px; cursor: pointer; padding: 0;
        }

        /* Stat row */
        .an-stat-row { display: flex; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
        .an-stat-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
        .an-stat-label { font-size: 11px; font-weight: 700; color: var(--sd-muted); text-transform: uppercase; letter-spacing: 0.07em; }
        .an-stat-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .an-stat-value { font-size: 30px; font-weight: 900; color: var(--sd-text); letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 8px; }
        .an-stat-trend { display: flex; align-items: center; gap: 5px; margin-top: 4px; }
        .an-stat-trend-pct { display: flex; align-items: center; gap: 2px; font-size: 11px; font-weight: 700; }
        .an-stat-sub { font-size: 11px; color: var(--sd-muted); font-weight: 500; }

        /* Chart row */
        .an-chart-row { display: grid; grid-template-columns: 1fr 280px; gap: 16px; margin-bottom: 16px; }
        .an-chart-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 10px; }
        .an-chart-title { font-size: 15px; font-weight: 800; color: var(--sd-text); margin-bottom: 2px; }
        .an-chart-sub   { font-size: 12px; color: var(--sd-muted); }
        .an-metric-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .an-metric-btn {
          padding: 6px 14px; border-radius: 20px;
          border: 1.5px solid var(--sd-border);
          background: transparent; color: var(--sd-muted);
          font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
          transition: all 0.15s;
        }

        /* Quick stats column */
        .an-quick-col { display: flex; flex-direction: column; gap: 14px; }
        .an-section-label { font-size: 11px; font-weight: 700; color: var(--sd-muted); text-transform: uppercase; letter-spacing: 0.07em; }
        .an-insight-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 0; border-bottom: 1px solid var(--sd-border-light);
        }
        .an-insight-row:last-child { border-bottom: none; }
        .an-insight-left { display: flex; align-items: center; gap: 8px; }
        .an-insight-label { font-size: 12px; color: var(--sd-text2); font-weight: 600; }
        .an-insight-value { font-size: 13px; font-weight: 800; color: var(--sd-text); }

        /* Forecast card */
        .an-forecast-card {
          background: rgba(34,197,94,0.08) !important;
          border: 1px solid rgba(34,197,94,0.2) !important;
        }
        .an-forecast-label { color: #15803d !important; }
        .an-forecast-value { font-size: 22px; font-weight: 900; color: #15803d; letter-spacing: -0.03em; }
        .an-forecast-sub   { font-size: 11px; color: #16a34a; margin-top: 4px; font-weight: 600; }

        /* Chart tooltip */
        .an-tooltip {
          background: var(--sd-white);
          border: 1px solid var(--sd-border);
          border-radius: 10px; padding: 10px 14px;
          font-size: 12px;
          box-shadow: var(--sd-shadow-lg, 0 8px 24px rgba(0,0,0,0.1));
        }
        .an-tooltip-label { color: var(--sd-muted); margin-bottom: 4px; font-weight: 600; }

        /* 2-col chart grid */
        .an-chart-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

        /* Table */
        .an-table { width: 100%; border-collapse: collapse; }
        .an-table th {
          font-size: 10px; font-weight: 700; color: var(--sd-muted);
          text-transform: uppercase; letter-spacing: 0.07em;
          padding: 8px 12px; text-align: left;
          border-bottom: 1px solid var(--sd-border);
        }
        .an-table td { padding: 11px 12px; border-bottom: 1px solid var(--sd-border-light); }
        .an-table tr:last-child td { border-bottom: none; }
        .an-td-bold  { font-size: 13px; font-weight: 700; color: var(--sd-text); }
        .an-td-muted { font-size: 13px; color: var(--sd-text2); }
        .an-product-cell { display: flex; align-items: center; gap: 8px; }
        .an-product-icon {
          width: 28px; height: 28px; border-radius: 6px;
          background: ${A.blue}12; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .an-product-name { font-size: 13px; font-weight: 600; color: var(--sd-text); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .an-conv-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 20px; }

        /* Customer rows */
        .an-customer-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
        .an-customer-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; flex-shrink: 0; }
        .an-customer-info { flex: 1; min-width: 0; }
        .an-customer-name { font-size: 13px; font-weight: 700; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .an-customer-sub  { font-size: 11px; color: var(--sd-muted); }
        .an-customer-total { font-size: 14px; font-weight: 900; color: var(--sd-text); flex-shrink: 0; }

        /* Empty */
        .an-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 160px; gap: 10px; padding: 24px; }
        .an-empty-icon { color: var(--sd-border); }
        .an-empty-msg  { font-size: 13px; color: var(--sd-muted); font-weight: 600; text-align: center; }

        /* Card head */
        .an-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }

        /* Locked */
        .an-locked { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 500px; text-align: center; padding: 48px 24px; }
        .an-locked-icon { width: 68px; height: 68px; border-radius: 50%; background: var(--sd-accent-dim, #f5f3ff); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        .an-locked-title { font-size: 24px; font-weight: 900; color: var(--sd-text); margin-bottom: 8px; }
        .an-locked-sub { font-size: 14px; color: var(--sd-muted); line-height: 1.7; max-width: 320px; margin-bottom: 28px; }
        .an-locked-btn { padding: 12px 32px; background: ${A.blue}; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px ${A.blue}44; }
        .an-locked-features { margin-top: 32px; background: var(--sd-bg); border: 1px solid var(--sd-border); border-radius: 14px; padding: 20px 24px; max-width: 320px; width: 100%; text-align: left; }
        .an-locked-features-label { font-size: 11px; font-weight: 700; color: var(--sd-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
        .an-locked-feature-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; color: var(--sd-text2); font-weight: 600; }

        /* Responsive */
        @media (max-width: 900px) {
          .an-chart-row   { grid-template-columns: 1fr; }
          .an-quick-col   { flex-direction: row; }
          .an-chart-grid-2{ grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .an-stat-row    { flex-direction: column; }
          .an-quick-col   { flex-direction: column; }
          .an-title       { font-size: 20px; }
          .an-metric-tabs { display: none; }
        }
      `}</style>
    </div>
  );
}