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

/* ── Theme ── */
const C = {
  blue:   "#1a6ef5",
  green:  "#22C55E",
  purple: "#7C3AED",
  orange: "#F59E0B",
  red:    "#EF4444",
  bg:     "#f5f7fa",
  card:   "#ffffff",
  border: "rgba(0,0,0,0.07)",
  text:   "#111111",
  muted:  "#9ca3af",
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
  lock:      "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  sparkle:   "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  up:        "M5 15l7-7 7 7",
  down:      "M19 9l-7 7-7-7",
  product:   "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  wallet:    "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12h.01",
  repeat:    "M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3",
  trend:     "M22 12h-4l-3 9L9 3l-3 9H2",
};

/* ── Tooltip ── */
function ChartTip({ active, payload, label, prefix = "", suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #e8eaed", borderRadius:10,
      padding:"10px 14px", fontSize:12, boxShadow:"0 8px 24px rgba(0,0,0,0.1)" }}>
      <div style={{ color:C.muted, marginBottom:4, fontWeight:600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.blue, fontWeight:800, fontSize:14 }}>
          {prefix}{typeof p.value === "number" ? p.value.toLocaleString() : p.value}{suffix}
        </div>
      ))}
    </div>
  );
}

/* ── No data state ── */
function Empty({ msg = "No data available for this period" }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", minHeight:160, gap:10, padding:24 }}>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
        stroke="#D1D5DB" strokeWidth="1.3" strokeLinecap="round">
        <path d="M18 20V10 M12 20V4 M6 20v-6"/>
      </svg>
      <div style={{ fontSize:13, color:"#D1D5DB", fontWeight:600, textAlign:"center" }}>{msg}</div>
    </div>
  );
}

/* ── Card wrapper ── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, borderRadius: 16,
      border: `1px solid ${C.border}`,
      boxShadow: "0 2px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)",
      padding: "20px 22px",
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ label, value, sub, color, icon, trend, loading }) {
  const up = trend >= 0;
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted,
          textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</div>
        <div style={{ width:34, height:34, borderRadius:10, background:`${color}14`,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Ico d={icon} size={15} color={color}/>
        </div>
      </div>
      {loading
        ? <div style={{ height:32, width:"55%", borderRadius:8, background:"#f0f0f0",
            animation:"an-shimmer 1.4s ease infinite",
            backgroundImage:"linear-gradient(90deg,#f0f0f0 25%,#f9f9f9 50%,#f0f0f0 75%)",
            backgroundSize:"600px 100%" }}/>
        : <div style={{ fontSize:30, fontWeight:900, color:C.text,
            letterSpacing:"-0.04em", lineHeight:1.1, marginBottom:8 }}>{value}</div>
      }
      {!loading && (
        <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4 }}>
          {trend !== undefined && (
            <span style={{ display:"flex", alignItems:"center", gap:2,
              color: up ? C.green : C.red, fontSize:11, fontWeight:700 }}>
              <Ico d={up ? IC.up : IC.down} size={12} color={up ? C.green : C.red}/>
              {Math.abs(trend)}%
            </span>
          )}
          <span style={{ fontSize:11, color:C.muted, fontWeight:500 }}>{sub}</span>
        </div>
      )}
    </Card>
  );
}

/* ── Plan gate ── */
function LockedState() {
  const nav = useNavigate();
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", minHeight:500, textAlign:"center", padding:"48px 24px" }}>
      <div style={{ width:68, height:68, borderRadius:"50%", background:"#eff6ff",
        display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
        <Ico d={IC.lock} size={28} color={C.blue}/>
      </div>
      <div style={{ fontSize:24, fontWeight:900, color:C.text, marginBottom:8 }}>Analytics Pro</div>
      <div style={{ fontSize:14, color:C.muted, lineHeight:1.7, maxWidth:320, marginBottom:28 }}>
        Advanced analytics are available on the <strong style={{color:C.text}}>Growth</strong> and{" "}
        <strong style={{color:C.text}}>Pro</strong> plans.
      </div>
      <button onClick={() => nav("/seller-dashboard?tab=subscription")}
        style={{ padding:"12px 32px", background:C.blue, color:"#fff", border:"none",
          borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer",
          boxShadow:`0 4px 16px ${C.blue}44` }}>
        Upgrade Plan →
      </button>
      <div style={{ marginTop:32, background:"#f8f9fb", border:"1px solid #e8eaed",
        borderRadius:14, padding:"20px 24px", maxWidth:320, width:"100%", textAlign:"left" }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
          letterSpacing:"0.06em", marginBottom:12 }}>What you unlock</div>
        {["Revenue & orders over time","Visitor & product view tracking",
          "Customer funnel & conversion","Repeat buyer rate","Product performance table",
          "Top customers by spend","Revenue by day of week","Live store visitors",
          "Payout forecast","AI weekly summary"].map((f,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
            marginBottom:8, fontSize:13, color:"#374151", fontWeight:600 }}>
            <Ico d="M20 6L9 17l-5-5" size={12} color={C.blue}/>{f}
          </div>
        ))}
      </div>
    </div>
  );
}

const PERIODS = [{ key:7,label:"7 Days" },{ key:30,label:"30 Days" },{ key:90,label:"90 Days" }];
const METRICS = [
  { key:"revenue",  label:"Revenue",  color:C.blue,   prefix:"GHS " },
  { key:"orders",   label:"Orders",   color:C.green,  prefix:""     },
  { key:"visitors", label:"Visitors", color:C.purple, prefix:""     },
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

  // Plan check
  const rawPlan   = (subscriptionPlan || "").toLowerCase().replace(/\s*plan\s*/gi,"").trim();
  const hasAccess = sellerLoading ? true : rawPlan !== "basic" && rawPlan !== "";

  const dateStr = new Date().toLocaleDateString("en-GH",
    { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  const metricCfg   = METRICS.find(m => m.key === metric) || METRICS[0];
  const hasData     = data.series?.some(d => (d[metric]||0) > 0);
  const hasProducts = data.topProducts?.length > 0;

  // AI summary
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

  // Reset AI on period change
  useEffect(() => { setAI(null); }, [period]);

  if (!hasAccess && !sellerLoading) return <LockedState/>;

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", minHeight:"100%" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        marginBottom:22, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:26, fontWeight:900, color:C.text, letterSpacing:"-0.03em", marginBottom:3 }}>
            Analytics Overview
          </div>
          <div style={{ fontSize:13, color:C.muted, fontWeight:500 }}>{dateStr}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Live visitors pill */}
          {data.liveVisitors > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px",
              background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:20 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:C.green,
                animation:"an-pulse 1.5s ease infinite" }}/>
              <span style={{ fontSize:12, fontWeight:700, color:"#15803d" }}>
                {data.liveVisitors} live {data.liveVisitors === 1 ? "visitor" : "visitors"}
              </span>
            </div>
          )}
          {/* Period selector */}
          <div style={{ display:"flex", background:"#fff", border:`1px solid ${C.border}`,
            borderRadius:10, overflow:"hidden",
            boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                style={{ padding:"8px 16px", border:"none", fontSize:12, fontWeight:700,
                  cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                  background: period===p.key ? C.blue : "transparent",
                  color: period===p.key ? "#fff" : C.muted }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Summary ── */}
      {(aiLoading || aiSummary) && (
        <Card style={{ background:`linear-gradient(135deg,${C.blue},${C.purple})`,
          border:"none", marginBottom:16, color:"#fff" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <Ico d={IC.sparkle} size={14} color="#fff"/>
            <span style={{ fontSize:13, fontWeight:800 }}>AI Performance Summary</span>
          </div>
          {aiLoading
            ? <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, opacity:0.85 }}>
                <div style={{ width:14,height:14,border:"2px solid #fff",borderTopColor:"transparent",
                  borderRadius:"50%",animation:"an-spin 0.8s linear infinite",flexShrink:0 }}/>
                Analysing your store…
              </div>
            : aiSummary && (
              <>
                <p style={{ fontSize:13, lineHeight:1.7, opacity:0.95, margin:"0 0 10px" }}>{aiSummary.summary}</p>
                {aiSummary.tip && (
                  <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:8,
                    padding:"8px 12px", fontSize:12, fontWeight:700, lineHeight:1.5 }}>
                    💡 {aiSummary.tip}
                  </div>
                )}
                <button onClick={() => setAI(null)}
                  style={{ marginTop:8,background:"none",border:"none",
                    color:"rgba(255,255,255,0.55)",fontSize:11,cursor:"pointer",padding:0 }}>
                  Dismiss
                </button>
              </>
            )
          }
        </Card>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display:"flex", gap:14, marginBottom:16, flexWrap:"wrap" }}>
        <StatCard label={`Revenue (${period}d)`} icon={IC.revenue} color={C.blue}
          loading={data.loading} trend={0} sub="vs prev period"
          value={`GHS ${Number(data.totalRevenue||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}/>
        <StatCard label={`Orders (${period}d)`} icon={IC.orders} color={C.green}
          loading={data.loading} trend={0} sub="completed"
          value={data.totalOrders||0}/>
        <StatCard label="Visitors" icon={IC.visitors} color={C.purple}
          loading={data.loading} sub="store page visits"
          value={data.totalVisitors||0}/>
        <StatCard label="Conversion" icon={IC.conv} color={C.orange}
          loading={data.loading} sub="orders / visitors"
          value={`${data.conversionRate||0}%`}/>
      </div>

      {/* ── Main Chart + Quick Stats ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16, marginBottom:16 }}>
        {/* Main chart */}
        <Card>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:18, flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:2 }}>
                {metricCfg.label} Trend
              </div>
              <div style={{ fontSize:12, color:C.muted }}>
                Daily breakdown · Last {period} days
              </div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {METRICS.map(m => (
                <button key={m.key} onClick={() => setMetric(m.key)}
                  style={{ padding:"6px 14px", borderRadius:20,
                    border:`1.5px solid ${metric===m.key ? m.color : "#e8eaed"}`,
                    background: metric===m.key ? `${m.color}12` : "transparent",
                    color: metric===m.key ? m.color : C.muted,
                    fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {data.loading ? (
            <div style={{ height:220, borderRadius:10, background:"#f8f9fb",
              animation:"an-shimmer 1.4s ease infinite",
              backgroundImage:"linear-gradient(90deg,#f0f0f0 25%,#f9f9f9 50%,#f0f0f0 75%)",
              backgroundSize:"600px 100%" }}/>
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false}/>
                <XAxis dataKey="label" stroke="transparent"
                  tick={{ fontSize:11, fill:"#C0C0C0", fontWeight:600 }} axisLine={false} tickLine={false}/>
                <YAxis stroke="transparent"
                  tick={{ fontSize:11, fill:"#C0C0C0" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip prefix={metricCfg.prefix}/>}/>
                <Area type="monotone" dataKey={metric}
                  stroke={metricCfg.color} strokeWidth={2.5}
                  fill="url(#mGrad)"
                  dot={{ r:3, fill:metricCfg.color, strokeWidth:2, stroke:"#fff" }}
                  activeDot={{ r:5, fill:metricCfg.color }}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Quick stats column */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Customers */}
          <Card style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted,
              textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>
              Customer Insights
            </div>
            {[
              { label:"Unique Customers", value: data.uniqueCustomers||0, icon: IC.customers, color: C.blue },
              { label:"Repeat Buyers",    value: `${data.repeatRate||0}%`, icon: IC.repeat,    color: C.green },
              { label:"Avg Order Value",  value: `GHS ${data.avgOrderValue||"0.00"}`, icon: IC.wallet, color: C.orange },
            ].map(item => (
              <div key={item.label} style={{ display:"flex", alignItems:"center",
                justifyContent:"space-between", padding:"9px 0",
                borderBottom:"1px solid #f5f5f5" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Ico d={item.icon} size={13} color={item.color}/>
                  <span style={{ fontSize:12, color:"#555", fontWeight:600 }}>{item.label}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:800, color:C.text }}>
                  {data.loading ? "—" : item.value}
                </span>
              </div>
            ))}
          </Card>

          {/* Payout forecast */}
          <Card style={{ background:`linear-gradient(135deg,#f0fdf4,#dcfce7)`, border:"1px solid #bbf7d0" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#15803d",
              textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
              Payout Forecast
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:"#15803d", letterSpacing:"-0.03em" }}>
              GHS {data.loading ? "—" : Number(data.forecastRevenue||0).toLocaleString(undefined,{minimumFractionDigits:2})}
            </div>
            <div style={{ fontSize:11, color:"#16a34a", marginTop:4, fontWeight:600 }}>
              Est. payout from paid orders
            </div>
          </Card>
        </div>
      </div>

      {/* ── Orders + Visitors charts ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <Card>
          <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:2 }}>Daily Orders</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>Order volume per day</div>
          {data.loading ? (
            <div style={{ height:150, borderRadius:8, background:"#f8f9fb",
              animation:"an-shimmer 1.4s ease infinite",
              backgroundImage:"linear-gradient(90deg,#f0f0f0 25%,#f9f9f9 50%,#f0f0f0 75%)",
              backgroundSize:"600px 100%" }}/>
          ) : !data.series?.some(d=>(d.orders||0)>0) ? (
            <Empty msg="No orders this period"/>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={data.series} margin={{ top:0, right:0, left:-25, bottom:0 }} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false}/>
                <XAxis dataKey="label" stroke="transparent"
                  tick={{ fontSize:10, fill:"#C0C0C0", fontWeight:600 }} axisLine={false} tickLine={false}/>
                <YAxis stroke="transparent"
                  tick={{ fontSize:10, fill:"#C0C0C0" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>} cursor={{ fill:"rgba(34,197,94,0.05)" }}/>
                <Bar dataKey="orders" fill={C.green} radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Revenue by day of week */}
        <Card>
          <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:2 }}>Best Days</div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>Revenue by day of week</div>
          {data.loading ? (
            <div style={{ height:150, borderRadius:8, background:"#f8f9fb",
              animation:"an-shimmer 1.4s ease infinite",
              backgroundImage:"linear-gradient(90deg,#f0f0f0 25%,#f9f9f9 50%,#f0f0f0 75%)",
              backgroundSize:"600px 100%" }}/>
          ) : !data.byDayOfWeek?.some(d=>(d.revenue||0)>0) ? (
            <Empty msg="No revenue data yet"/>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={data.byDayOfWeek} margin={{ top:0, right:0, left:-25, bottom:0 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false}/>
                <XAxis dataKey="day" stroke="transparent"
                  tick={{ fontSize:10, fill:"#C0C0C0", fontWeight:600 }} axisLine={false} tickLine={false}/>
                <YAxis stroke="transparent"
                  tick={{ fontSize:10, fill:"#C0C0C0" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip prefix="GHS "/>} cursor={{ fill:`${C.blue}08` }}/>
                <Bar dataKey="revenue" fill={C.blue} radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Product Performance ── */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:C.text }}>Product Performance</div>
            <div style={{ fontSize:12, color:C.muted }}>Revenue, orders and views per product</div>
          </div>
        </div>
        {data.loading ? (
          <div style={{ height:120, borderRadius:8, background:"#f8f9fb",
            animation:"an-shimmer 1.4s ease infinite",
            backgroundImage:"linear-gradient(90deg,#f0f0f0 25%,#f9f9f9 50%,#f0f0f0 75%)",
            backgroundSize:"600px 100%" }}/>
        ) : !hasProducts ? (
          <Empty msg="No product sales data yet"/>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  {["Product","Revenue","Orders","Views","Conv. Rate"].map(h => (
                    <th key={h} style={{ fontSize:10, fontWeight:700, color:C.muted,
                      textTransform:"uppercase", letterSpacing:"0.07em",
                      padding:"8px 12px", textAlign:"left",
                      borderBottom:`1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((p, i) => (
                  <tr key={p.id}
                    style={{ borderBottom: i < data.topProducts.length-1 ? `1px solid ${C.border}` : "none" }}>
                    <td style={{ padding:"11px 12px", fontSize:13, fontWeight:600, color:C.text }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:6,
                          background:`${C.blue}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <Ico d={IC.product} size={12} color={C.blue}/>
                        </div>
                        <span style={{ maxWidth:180, overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:"11px 12px", fontSize:13, fontWeight:700, color:C.text }}>
                      GHS {Number(p.revenue).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </td>
                    <td style={{ padding:"11px 12px", fontSize:13, color:"#555" }}>{p.orders}</td>
                    <td style={{ padding:"11px 12px", fontSize:13, color:"#555" }}>{p.views||"—"}</td>
                    <td style={{ padding:"11px 12px" }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:"3px 8px",
                        borderRadius:20,
                        background: p.convRate !== "—" ? `${C.green}14` : "#f5f5f5",
                        color: p.convRate !== "—" ? C.green : C.muted }}>
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
        <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:4 }}>Top Customers</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>Highest spenders this period</div>
        {data.loading ? (
          <div style={{ height:100, borderRadius:8, background:"#f8f9fb",
            animation:"an-shimmer 1.4s ease infinite",
            backgroundImage:"linear-gradient(90deg,#f0f0f0 25%,#f9f9f9 50%,#f0f0f0 75%)",
            backgroundSize:"600px 100%" }}/>
        ) : !data.topCustomers?.length ? (
          <Empty msg="No customer data yet"/>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {data.topCustomers.map((c, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
                padding:"10px 0",
                borderBottom: i < data.topCustomers.length-1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
                  background:`${C.blue}14`, display:"flex", alignItems:"center",
                  justifyContent:"center", fontWeight:800, fontSize:13, color:C.blue }}>
                  {(c.name||"C")[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{c.count} order{c.count!==1?"s":""}</div>
                </div>
                <div style={{ fontSize:14, fontWeight:900, color:C.text, flexShrink:0 }}>
                  GHS {Number(c.total).toLocaleString(undefined,{minimumFractionDigits:2})}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <style>{`
        @keyframes an-spin    { to { transform:rotate(360deg); } }
        @keyframes an-shimmer {
          0%   { background-position:-600px 0; }
          100% { background-position:calc(600px + 100%) 0; }
        }
        @keyframes an-pulse {
          0%,100% { opacity:1; }
          50%     { opacity:0.4; }
        }
        @media(max-width:900px){
          .an-grid-2 { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}
