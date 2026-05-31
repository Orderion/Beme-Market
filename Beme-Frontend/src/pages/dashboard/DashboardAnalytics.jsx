import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAnalyticsData } from "../../hooks/useAnalyticsData";
import { incrementUsage } from "../../services/aiUsageService";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

/* ── Brand accent colours — never change with theme ── */
const A = {
  blue:   "#7c3aed",
  blue2:  "#6d28d9",
  green:  "#22C55E",
  orange: "#F59E0B",
  red:    "#EF4444",
};

function Ico({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split(" M").map((seg, i) => <path key={i} d={(i === 0 ? "" : "M") + seg}/>)}
    </svg>
  );
}

const IC = {
  revenue:   "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  orders:    "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  customers: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  visitors:  "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  conv:      "M22 7l-8.5 8.5-5-5L1 18",
  lock:      "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  sparkle:   "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  up:        "M5 15l7-7 7 7",
  down:      "M19 9l-7 7-7-7",
  product:   "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  wallet:    "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12h.01",
  repeat:    "M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3",
};

/* ── Tooltip ── */
function ChartTip({ active, payload, label, prefix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="an-tip">
      <div className="an-tip-lbl">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || A.blue, fontWeight: 800, fontSize: 13 }}>
          {prefix}{typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
}

/* ── Empty state ── */
function Empty({ msg }) {
  return (
    <div className="an-empty">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="an-empty-ico">
        <path d="M18 20V10 M12 20V4 M6 20v-6"/>
      </svg>
      <span className="an-empty-msg">{msg || "No data for this period"}</span>
    </div>
  );
}

/* ── Card ── */
function Card({ children, className = "", style = {} }) {
  return <div className={`an-card ${className}`} style={style}>{children}</div>;
}

/* ── Stat card ── */
function StatCard({ label, value, sub, color, icon, trend, loading }) {
  const up = trend >= 0;
  return (
    <Card className="an-stat">
      <div className="an-stat-top">
        <div className="an-stat-lbl">{label}</div>
        <div className="an-stat-ico" style={{ background: `${color}18` }}>
          <Ico d={icon} size={13} color={color}/>
        </div>
      </div>
      {loading
        ? <div className="an-skel" style={{ height:26, width:"60%", marginBottom:6 }}/>
        : <div className="an-stat-val">{value}</div>
      }
      {!loading && (
        <div className="an-stat-trend">
          {trend !== undefined && (
            <span style={{ display:"flex", alignItems:"center", gap:2, color: up ? A.green : A.red, fontSize:10, fontWeight:700 }}>
              <Ico d={up ? IC.up : IC.down} size={10} color={up ? A.green : A.red}/>
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
      <div className="an-locked-ico"><Ico d={IC.lock} size={26} color={A.blue}/></div>
      <div className="an-locked-title">Analytics Pro</div>
      <div className="an-locked-sub">Available on <strong>Growth</strong> and <strong>Pro</strong> plans.</div>
      <button className="an-locked-btn" onClick={() => nav("/seller-dashboard?tab=subscription")}>Upgrade Plan →</button>
      <div className="an-locked-feats">
        <div className="an-locked-feats-lbl">What you unlock</div>
        {["Revenue & orders over time","Visitor & product view tracking","Customer funnel & conversion",
          "Repeat buyer rate","Product performance table","Top customers by spend",
          "Revenue by day of week","Live store visitors","Payout forecast","AI weekly summary"].map((f,i) => (
          <div key={i} className="an-locked-feat"><Ico d="M20 6L9 17l-5-5" size={11} color={A.blue}/>{f}</div>
        ))}
      </div>
    </div>
  );
}

const PERIODS = [
  { key:7,  label:"7D"  },
  { key:30, label:"30D" },
  { key:90, label:"90D" },
];
const METRICS = [
  { key:"revenue",  label:"Revenue",  color: A.blue,   prefix:"GHS " },
  { key:"orders",   label:"Orders",   color: A.green,  prefix:""     },
  { key:"visitors", label:"Visitors", color: A.blue,   prefix:""     },
];

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function DashboardAnalytics() {
  const { user } = useAuth();
  const { subscriptionPlan, loading: sellerLoading } = useSellerAuth();
  const [period, setPeriod] = useState(7);
  const [metric, setMetric] = useState("revenue");
  const [aiSummary, setAI]  = useState(null);
  const [aiLoading, setAIL] = useState(false);

  const data = useAnalyticsData(period);

  const rawPlan   = (subscriptionPlan || "").toLowerCase().replace(/\s*plan\s*/gi, "").trim();
  const hasAccess = sellerLoading ? true : rawPlan !== "basic" && rawPlan !== "";

  const dateStr = new Date().toLocaleDateString("en-GH",
    { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  const metricCfg   = METRICS.find(m => m.key === metric) || METRICS[0];
  const hasData     = data.series?.some(d => (d[metric] || 0) > 0);
  const hasProducts = data.topProducts?.length > 0;

  useEffect(() => {
    if (data.loading || !hasAccess || data.totalRevenue === undefined || aiSummary) return;
    (async () => {
      setAIL(true);
      try {
        const conv = data.totalVisitors > 0
          ? ((data.totalOrders / data.totalVisitors) * 100).toFixed(1) : "0";
        const res = await fetch(`${API_URL}/api/ai/chat`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content:
              `Analyse this Beme Market seller's ${period}-day analytics. No markdown, no asterisks, plain English.\n\n- Revenue: GHS ${data.totalRevenue.toFixed(2)}\n- Orders: ${data.totalOrders}\n- Visitors: ${data.totalVisitors}\n- Unique customers: ${data.uniqueCustomers}\n- Conversion: ${conv}%\n- Repeat buyer rate: ${data.repeatRate}%\n\nFormat:\nSUMMARY: [2 sentences]\nTIP: [1 specific action]`
            }],
            context: { currentPage: "analytics" },
          }),
        });
        const d   = await res.json();
        const txt = d.content || "";
        const sm  = txt.match(/SUMMARY:\s*([\s\S]*?)(?=TIP:|$)/i);
        const tip = txt.match(/TIP:\s*([\s\S]*?)$/i);
        if (user?.uid) incrementUsage(user.uid).catch(() => {});
        setAI({ summary: sm?.[1]?.trim() || txt, tip: tip?.[1]?.trim() || null });
      } catch (e) { console.error(e); }
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
        <div className="an-header-r">
          {data.liveVisitors > 0 && (
            <div className="an-live">
              <div className="an-live-dot"/>
              <span>{data.liveVisitors} live</span>
            </div>
          )}
          <div className="an-periods">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`an-period-btn${period === p.key ? " an-period-btn--on" : ""}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI card — gradient + floating bubbles ── */}
      {(aiLoading || aiSummary) && (
        <div className="an-ai">
          {/* decorative bubbles */}
          <span className="an-bubble an-bubble--a"/>
          <span className="an-bubble an-bubble--b"/>
          <span className="an-bubble an-bubble--c"/>
          <div className="an-ai-body">
            <div className="an-ai-hd">
              <Ico d={IC.sparkle} size={14} color="#fff"/>
              <span>AI Performance Summary</span>
            </div>
            {aiLoading
              ? <div className="an-ai-loading"><div className="an-ai-spin"/>Analysing your store…</div>
              : aiSummary && (
                <>
                  <p className="an-ai-text">{aiSummary.summary}</p>
                  {aiSummary.tip && <div className="an-ai-tip">💡 {aiSummary.tip}</div>}
                  <button className="an-ai-dismiss" onClick={() => setAI(null)}>Dismiss</button>
                </>
              )
            }
          </div>
        </div>
      )}

      {/* ── Stat grid: 2×2 on mobile → 4 across on desktop ── */}
      <div className="an-stats">
        <StatCard label={`Revenue (${period}d)`} icon={IC.revenue} color={A.blue}
          loading={data.loading} trend={0} sub="vs prev period"
          value={`GHS ${Number(data.totalRevenue||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}/>
        <StatCard label={`Orders (${period}d)`} icon={IC.orders} color={A.green}
          loading={data.loading} trend={0} sub="completed"
          value={data.totalOrders || 0}/>
        <StatCard label="Visitors" icon={IC.visitors} color={A.blue}
          loading={data.loading} sub="page visits"
          value={data.totalVisitors || 0}/>
        <StatCard label="Conversion" icon={IC.conv} color={A.orange}
          loading={data.loading} sub="orders/visitors"
          value={`${data.conversionRate || 0}%`}/>
      </div>

      {/* ── Main chart + quick sidebar ── */}
      <div className="an-main-row">
        {/* Area chart */}
        <Card className="an-chart-card">
          <div className="an-chart-hd">
            <div>
              <div className="an-chart-title">{metricCfg.label} Trend</div>
              <div className="an-chart-sub">Daily · Last {period} days</div>
            </div>
            <div className="an-metrics">
              {METRICS.map(m => (
                <button key={m.key} onClick={() => setMetric(m.key)}
                  className={`an-metric-btn${metric === m.key ? " an-metric-btn--on" : ""}`}
                  style={metric === m.key ? { borderColor:m.color, color:m.color, background:`${m.color}12` } : {}}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {data.loading
            ? <div className="an-skel" style={{ height:180 }}/>
            : !hasData
              ? <Empty msg={`No ${metricCfg.label.toLowerCase()} data yet`}/>
              : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data.series} margin={{ top:4, right:0, left:-22, bottom:0 }}>
                    <defs>
                      <linearGradient id="anG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={metricCfg.color} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={metricCfg.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--an-grid)" vertical={false}/>
                    <XAxis dataKey="label" stroke="transparent"
                      tick={{ fontSize:9, fill:"var(--an-axis)", fontWeight:600 }} axisLine={false} tickLine={false}/>
                    <YAxis stroke="transparent"
                      tick={{ fontSize:9, fill:"var(--an-axis)" }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<ChartTip prefix={metricCfg.prefix}/>}/>
                    <Area type="monotone" dataKey={metric}
                      stroke={metricCfg.color} strokeWidth={2.5} fill="url(#anG)"
                      dot={{ r:3, fill:metricCfg.color, strokeWidth:2, stroke:"var(--sd-white)" }}
                      activeDot={{ r:5, fill:metricCfg.color }}/>
                  </AreaChart>
                </ResponsiveContainer>
              )
          }
        </Card>

        {/* Quick stats sidebar */}
        <div className="an-sidebar">
          <Card style={{ flex:1 }}>
            <div className="an-sec-lbl" style={{ marginBottom:10 }}>Customer Insights</div>
            {[
              { label:"Unique Customers", value: data.uniqueCustomers || 0,             icon: IC.customers, color: A.blue   },
              { label:"Repeat Buyers",    value: `${data.repeatRate || 0}%`,            icon: IC.repeat,    color: A.green  },
              { label:"Avg Order Value",  value: `GHS ${data.avgOrderValue || "0.00"}`, icon: IC.wallet,    color: A.orange },
            ].map(item => (
              <div key={item.label} className="an-insight-row">
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <Ico d={item.icon} size={12} color={item.color}/>
                  <span className="an-insight-lbl">{item.label}</span>
                </div>
                <span className="an-insight-val">{data.loading ? "—" : item.value}</span>
              </div>
            ))}
          </Card>

          <Card className="an-forecast">
            <div className="an-sec-lbl an-forecast-lbl">Payout Forecast</div>
            <div className="an-forecast-val">
              GHS {data.loading ? "—" : Number(data.forecastRevenue||0).toLocaleString(undefined,{minimumFractionDigits:2})}
            </div>
            <div className="an-forecast-sub">Est. from paid orders</div>
          </Card>
        </div>
      </div>

      {/* ── Daily orders + best days ── */}
      <div className="an-grid2">
        <Card>
          <div className="an-chart-title">Daily Orders</div>
          <div className="an-chart-sub" style={{ marginBottom:12 }}>Volume per day</div>
          {data.loading
            ? <div className="an-skel" style={{ height:130 }}/>
            : !data.series?.some(d => (d.orders || 0) > 0) ? <Empty msg="No orders this period"/>
            : (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={data.series} margin={{ top:0,right:0,left:-24,bottom:0 }} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--an-grid)" vertical={false}/>
                  <XAxis dataKey="label" stroke="transparent"
                    tick={{ fontSize:9, fill:"var(--an-axis)", fontWeight:600 }} axisLine={false} tickLine={false}/>
                  <YAxis stroke="transparent"
                    tick={{ fontSize:9, fill:"var(--an-axis)" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>} cursor={{ fill:`${A.green}08` }}/>
                  <Bar dataKey="orders" fill={A.green} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </Card>
        <Card>
          <div className="an-chart-title">Best Days</div>
          <div className="an-chart-sub" style={{ marginBottom:12 }}>Revenue by weekday</div>
          {data.loading
            ? <div className="an-skel" style={{ height:130 }}/>
            : !data.byDayOfWeek?.some(d => (d.revenue || 0) > 0) ? <Empty msg="No revenue data yet"/>
            : (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={data.byDayOfWeek} margin={{ top:0,right:0,left:-24,bottom:0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--an-grid)" vertical={false}/>
                  <XAxis dataKey="day" stroke="transparent"
                    tick={{ fontSize:9, fill:"var(--an-axis)", fontWeight:600 }} axisLine={false} tickLine={false}/>
                  <YAxis stroke="transparent"
                    tick={{ fontSize:9, fill:"var(--an-axis)" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip prefix="GHS "/>} cursor={{ fill:`${A.blue}08` }}/>
                  <Bar dataKey="revenue" fill={A.blue} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </Card>
      </div>

      {/* ── Product performance ── */}
      <Card style={{ marginBottom:12 }}>
        <div style={{ marginBottom:12 }}>
          <div className="an-chart-title">Product Performance</div>
          <div className="an-chart-sub">Revenue, orders & views</div>
        </div>
        {data.loading ? <div className="an-skel" style={{ height:100 }}/>
          : !hasProducts ? <Empty msg="No product sales yet"/>
          : (
            <div style={{ overflowX:"auto" }}>
              <table className="an-table">
                <thead>
                  <tr>{["Product","Revenue","Orders","Conv."].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: i < data.topProducts.length-1 ? "1px solid var(--sd-border-light)" : "none" }}>
                      <td>
                        <div className="an-prod-row">
                          <div className="an-prod-ico"><Ico d={IC.product} size={11} color={A.blue}/></div>
                          <span className="an-prod-name">{p.name}</span>
                        </div>
                      </td>
                      <td className="an-td-b">GHS {Number(p.revenue).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td className="an-td-m">{p.orders}</td>
                      <td>
                        <span className="an-conv" style={{
                          background: p.convRate !== "—" ? `${A.green}14` : "var(--sd-border-light)",
                          color: p.convRate !== "—" ? A.green : "var(--sd-muted)",
                        }}>{p.convRate}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Card>

      {/* ── Top customers ── */}
      <Card>
        <div className="an-chart-title" style={{ marginBottom:3 }}>Top Customers</div>
        <div className="an-chart-sub" style={{ marginBottom:14 }}>Highest spenders this period</div>
        {data.loading ? <div className="an-skel" style={{ height:90 }}/>
          : !data.topCustomers?.length ? <Empty msg="No customer data yet"/>
          : data.topCustomers.map((c, i) => (
              <div key={i} className="an-cust" style={{ borderBottom: i < data.topCustomers.length-1 ? "1px solid var(--sd-border-light)" : "none" }}>
                <div className="an-cust-av" style={{ background:`${A.blue}14`, color:A.blue }}>
                  {(c.name || "C")[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="an-cust-name">{c.name}</div>
                  <div className="an-cust-sub">{c.count} order{c.count !== 1 ? "s" : ""}</div>
                </div>
                <div className="an-cust-total">GHS {Number(c.total).toLocaleString(undefined,{minimumFractionDigits:2})}</div>
              </div>
            ))
        }
      </Card>

      {/* ════════════════════════════════════════════
          ALL STYLES
      ════════════════════════════════════════════ */}
      <style>{`
        /* ── Keyframes ── */
        @keyframes an-spin    { to { transform:rotate(360deg); } }
        @keyframes an-pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes an-shimmer { 0%{background-position:-600px 0} 100%{background-position:calc(600px + 100%) 0} }
        @keyframes an-float-a { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(16px,-22px) scale(1.12)} }
        @keyframes an-float-b { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-14px,18px) scale(.88)} }
        @keyframes an-float-c { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(10px,12px) scale(1.06)} }

        /* ── Root ── */
        .an-root {
          font-family: var(--sd-font,'DM Sans',system-ui,sans-serif);
          color: var(--sd-text);
          background: var(--sd-white);
          min-height: 100%;
          --an-grid: var(--sd-border-light);
          --an-axis: var(--sd-muted);
        }

        /* ── Card ── */
        .an-card {
          background: var(--sd-white);
          border-radius: 14px;
          border: 1px solid var(--sd-border);
          box-shadow: var(--sd-shadow);
          padding: 14px 16px;
          transition: background .25s, border-color .25s;
        }

        /* ── Skeleton ── */
        .an-skel {
          border-radius: 8px;
          background: var(--sd-border-light);
          background-image: linear-gradient(90deg,var(--sd-border-light) 25%,var(--sd-border) 50%,var(--sd-border-light) 75%);
          background-size: 600px 100%;
          animation: an-shimmer 1.4s ease infinite;
        }

        /* ── Header ── */
        .an-header   { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; gap:10px; flex-wrap:wrap; }
        .an-title    { font-size:20px; font-weight:900; color:var(--sd-text); letter-spacing:-.03em; line-height:1.15; }
        .an-date     { font-size:12px; color:var(--sd-muted); margin-top:3px; font-weight:500; }
        .an-header-r { display:flex; align-items:center; gap:8px; flex-shrink:0; flex-wrap:wrap; }

        /* Live pill */
        .an-live     { display:flex; align-items:center; gap:5px; padding:4px 10px; border-radius:100px; background:rgba(34,197,94,.08); border:1px solid rgba(34,197,94,.2); font-size:11px; font-weight:700; color:#15803d; }
        .an-live-dot { width:6px; height:6px; border-radius:50%; background:#22C55E; animation:an-pulse 1.5s ease infinite; }

        /* Period tabs */
        .an-periods    { display:flex; background:var(--sd-white); border:1px solid var(--sd-border); border-radius:8px; overflow:hidden; }
        .an-period-btn { padding:6px 12px; border:none; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; background:transparent; color:var(--sd-muted); transition:all .15s; }
        .an-period-btn--on { background:${A.blue}; color:#fff; }

        /* ════════════════════════════════════════
           AI SUMMARY CARD
        ════════════════════════════════════════ */
        .an-ai {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          margin-bottom: 16px;
          /* Light mode: blue-purple → lavender → near-white */
          background: linear-gradient(135deg, #3730a3 0%, #7c3aed 40%, #a78bfa 72%, #ede9fe 100%);
        }
        /* Dark mode override */
        .sd-dark .an-ai {
          background: linear-gradient(135deg, #0f0e2e 0%, #1e1b4b 30%, #312e81 62%, #0a0a18 100%);
        }

        /* Floating decorative bubbles */
        .an-bubble {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          background: rgba(255,255,255,0.13);
        }
        .sd-dark .an-bubble { background: rgba(129,140,248,0.15); }

        .an-bubble--a { width:140px; height:140px; top:-50px; right:-40px; animation:an-float-a 7s ease-in-out infinite; }
        .an-bubble--b { width:95px;  height:95px;  bottom:-28px; left:10px;  animation:an-float-b 9s ease-in-out infinite; }
        .an-bubble--c { width:60px;  height:60px;  top:22px; right:120px;   animation:an-float-c 5.5s ease-in-out infinite; }

        .an-ai-body   { position:relative; z-index:1; padding:18px 20px; }
        .an-ai-hd     { display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:13px; font-weight:800; color:#fff; }
        .an-ai-loading{ display:flex; align-items:center; gap:8px; font-size:13px; color:rgba(255,255,255,.85); }
        .an-ai-spin   { width:13px; height:13px; border-radius:50%; border:2px solid rgba(255,255,255,.5); border-top-color:#fff; animation:an-spin .8s linear infinite; flex-shrink:0; }
        .an-ai-text   { font-size:13px; line-height:1.7; color:rgba(255,255,255,.92); margin:0 0 10px; }
        .an-ai-tip    {
          background: rgba(255,255,255,0.14);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border-radius: 10px; padding:9px 13px;
          font-size:12px; font-weight:700; color:#fff; line-height:1.55;
        }
        .sd-dark .an-ai-tip { background:rgba(255,255,255,0.08); }
        .an-ai-dismiss { margin-top:10px; background:none; border:none; color:rgba(255,255,255,.45); font-size:11px; cursor:pointer; padding:0; }

        /* ════════════════════════════════════════
           STAT GRID — 2×2 mobile, 4 across desktop
        ════════════════════════════════════════ */
        .an-stats    { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
        .an-stat     { padding:12px 13px 10px; }
        .an-stat-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:8px; }
        .an-stat-lbl { font-size:9px; font-weight:700; color:var(--sd-muted); text-transform:uppercase; letter-spacing:.07em; line-height:1.4; }
        .an-stat-ico { width:26px; height:26px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .an-stat-val { font-size:20px; font-weight:900; color:var(--sd-text); letter-spacing:-.04em; line-height:1; margin-bottom:5px; word-break:break-all; }
        .an-stat-trend { display:flex; align-items:center; gap:4px; }
        .an-stat-sub   { font-size:9px; color:var(--sd-muted); font-weight:500; }

        /* ── Main chart + sidebar ── */
        .an-main-row  { display:grid; grid-template-columns:1fr; gap:10px; margin-bottom:10px; }
        .an-chart-card{ padding:14px 16px; }
        .an-chart-hd  { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px; gap:8px; flex-wrap:wrap; }
        .an-chart-title { font-size:13px; font-weight:800; color:var(--sd-text); }
        .an-chart-sub   { font-size:11px; color:var(--sd-muted); margin-top:1px; }
        .an-metrics     { display:flex; gap:4px; flex-wrap:wrap; }
        .an-metric-btn  { padding:4px 10px; border-radius:100px; border:1.5px solid var(--sd-border); background:transparent; color:var(--sd-muted); font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .15s; }

        /* Sidebar */
        .an-sidebar    { display:flex; flex-direction:column; gap:10px; }
        .an-sec-lbl    { font-size:10px; font-weight:700; color:var(--sd-muted); text-transform:uppercase; letter-spacing:.07em; }
        .an-insight-row{ display:flex; align-items:center; justify-content:space-between; padding:7px 0; border-bottom:1px solid var(--sd-border-light); }
        .an-insight-row:last-child{ border-bottom:none; }
        .an-insight-lbl { font-size:11px; color:var(--sd-text2); font-weight:600; }
        .an-insight-val { font-size:12px; font-weight:800; color:var(--sd-text); }

        /* Payout */
        .an-forecast     { background:rgba(34,197,94,0.07)!important; border-color:rgba(34,197,94,0.2)!important; }
        .an-forecast-lbl { color:#15803d!important; }
        .an-forecast-val { font-size:18px; font-weight:900; color:#15803d; letter-spacing:-.03em; margin-top:5px; }
        .an-forecast-sub { font-size:10px; color:#16a34a; margin-top:3px; font-weight:600; }

        /* 2-col grid */
        .an-grid2 { display:grid; grid-template-columns:1fr; gap:10px; margin-bottom:10px; }

        /* Tooltip */
        .an-tip     { background:var(--sd-white); border:1px solid var(--sd-border); border-radius:10px; padding:8px 12px; font-size:12px; box-shadow:var(--sd-shadow-lg,0 8px 24px rgba(0,0,0,.1)); }
        .an-tip-lbl { color:var(--sd-muted); margin-bottom:3px; font-weight:600; }

        /* Table */
        .an-table    { width:100%; border-collapse:collapse; }
        .an-table th { font-size:9px; font-weight:700; color:var(--sd-muted); text-transform:uppercase; letter-spacing:.06em; padding:6px 8px; text-align:left; border-bottom:1px solid var(--sd-border); }
        .an-table td { padding:8px 8px; }
        .an-td-b     { font-size:12px; font-weight:700; color:var(--sd-text); }
        .an-td-m     { font-size:12px; color:var(--sd-text2); }
        .an-prod-row { display:flex; align-items:center; gap:7px; }
        .an-prod-ico { width:22px; height:22px; border-radius:5px; background:${A.blue}12; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .an-prod-name{ font-size:11px; font-weight:600; color:var(--sd-text); max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .an-conv     { font-size:10px; font-weight:700; padding:2px 6px; border-radius:20px; white-space:nowrap; }

        /* Customers */
        .an-cust      { display:flex; align-items:center; gap:10px; padding:8px 0; }
        .an-cust-av   { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:11px; flex-shrink:0; }
        .an-cust-name { font-size:12px; font-weight:700; color:var(--sd-text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .an-cust-sub  { font-size:10px; color:var(--sd-muted); }
        .an-cust-total{ font-size:12px; font-weight:900; color:var(--sd-text); flex-shrink:0; }

        /* Empty */
        .an-empty     { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:110px; gap:7px; }
        .an-empty-ico { color:var(--sd-border); }
        .an-empty-msg { font-size:12px; color:var(--sd-muted); font-weight:600; text-align:center; }

        /* Locked */
        .an-locked         { display:flex; flex-direction:column; align-items:center; text-align:center; padding:48px 16px; gap:7px; }
        .an-locked-ico     { width:58px; height:58px; border-radius:50%; background:var(--sd-accent-dim); display:flex; align-items:center; justify-content:center; margin-bottom:6px; }
        .an-locked-title   { font-size:20px; font-weight:900; color:var(--sd-text); }
        .an-locked-sub     { font-size:13px; color:var(--sd-muted); line-height:1.7; max-width:280px; }
        .an-locked-btn     { padding:10px 24px; background:${A.blue}; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; margin-top:6px; }
        .an-locked-feats   { margin-top:16px; background:var(--sd-white); border:1px solid var(--sd-border); border-radius:12px; padding:14px 16px; max-width:280px; width:100%; text-align:left; }
        .an-locked-feats-lbl { font-size:10px; font-weight:700; color:var(--sd-muted); text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px; }
        .an-locked-feat    { display:flex; align-items:center; gap:7px; margin-bottom:6px; font-size:12px; color:var(--sd-text2); font-weight:600; }

        /* ══════════════════
           TABLET  ≥ 600px
        ══════════════════ */
        @media (min-width: 600px) {
          .an-title  { font-size:22px; }
          .an-stats  { grid-template-columns:repeat(2,1fr); gap:12px; }
          .an-stat-val { font-size:22px; }
          .an-grid2  { grid-template-columns:1fr 1fr; gap:12px; }
        }

        /* ══════════════════
           DESKTOP  ≥ 1024px
        ══════════════════ */
        @media (min-width: 1024px) {
          .an-title     { font-size:26px; }
          .an-stats     { grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:16px; }
          .an-stat-val  { font-size:26px; word-break:normal; }
          .an-stat-lbl  { font-size:10px; }
          .an-main-row  { grid-template-columns:1fr 260px; gap:16px; margin-bottom:16px; }
          .an-sidebar   { flex-direction:column; }
          .an-grid2     { gap:16px; margin-bottom:16px; }
          .an-card      { padding:18px 20px; }
          .an-chart-card{ padding:18px 20px; }
        }
      `}</style>
    </div>
  );
}