import { useStoreAnalytics } from "../../hooks/useStoreAnalytics";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { useEffect, useState, useMemo } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useSubscription } from "../../hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { incrementUsage } from "../../services/aiUsageService";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";
const BLUE    = "#1a6ef5";
const GREEN   = "#22C55E";
const PURPLE  = "#7C3AED";
const ORANGE  = "#F59E0B";

/* ── Icons ── */
function Ico({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split(" M").map((seg, i) => <path key={i} d={(i === 0 ? "" : "M") + seg} />)}
    </svg>
  );
}
const IC = {
  revenue:  "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  orders:   "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  customers:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  visitors: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  trend_up: "M22 7l-8.5 8.5-5-5L1 18",
  arrow_up: "M18 15l-6-6-6 6",
  lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  sparkle:  "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
};

/* ── Tooltip ── */
function ChartTip({ active, payload, label, prefix = "", suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #e8eaed", borderRadius:10,
      padding:"10px 14px", fontSize:12, boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
      <div style={{ color:"#8B8FA8", marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || BLUE, fontWeight:800, fontSize:13 }}>
          {prefix}{typeof p.value === "number" ? p.value.toLocaleString() : p.value}{suffix}
        </div>
      ))}
    </div>
  );
}

/* ── Empty chart state ── */
function NoMetric({ label = "No metric available" }) {
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:10, padding:32, minHeight:180 }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB"
        strokeWidth="1.3" strokeLinecap="round">
        <path d="M18 20V10 M12 20V4 M6 20v-6"/>
      </svg>
      <div style={{ fontSize:13, color:"#C0C0C0", fontWeight:600, textAlign:"center" }}>{label}</div>
    </div>
  );
}

/* ── Plan gate ── */
function LockedState() {
  const navigate = useNavigate();
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", minHeight:500, textAlign:"center", padding:"48px 24px" }}>
      <div style={{ width:64, height:64, borderRadius:"50%", background:"#eff6ff",
        display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20, color:BLUE }}>
        <Ico d={IC.lock} size={26}/>
      </div>
      <div style={{ fontSize:22, fontWeight:800, color:"#111", marginBottom:8, letterSpacing:"-0.02em" }}>
        Analytics Pro
      </div>
      <div style={{ fontSize:14, color:"#9ca3af", lineHeight:1.7, maxWidth:320, marginBottom:28 }}>
        Advanced analytics are available on the <strong style={{color:"#111"}}>Growth</strong> and{" "}
        <strong style={{color:"#111"}}>Pro</strong> plans. Upgrade to unlock detailed insights.
      </div>
      <button onClick={() => navigate("/seller-dashboard?tab=subscription")}
        style={{ padding:"12px 28px", background:BLUE, color:"#fff", border:"none",
          borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer",
          boxShadow:`0 4px 14px ${BLUE}44` }}>
        Upgrade Plan →
      </button>
      <div style={{ marginTop:32, background:"#f8f9fb", border:"1px solid #e8eaed",
        borderRadius:12, padding:"20px 24px", maxWidth:320, width:"100%", textAlign:"left" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase",
          letterSpacing:"0.06em", marginBottom:12 }}>What you unlock</div>
        {["Revenue & orders over time","Visitor tracking & conversion","Customer growth trends",
          "Sales by day/week/month","AI weekly performance summary","Export reports"].map((f, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8,
            fontSize:13, color:"#374151", fontWeight:600 }}>
            <span style={{ color:BLUE }}><Ico d="M20 6L9 17l-5-5" size={13}/></span>{f}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ label, value, sub, color, icon, loading }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, padding:"20px 22px",
      border:"1px solid rgba(0,0,0,0.07)", flex:1, minWidth:0 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af",
          textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</div>
        <div style={{ width:32, height:32, borderRadius:8, background:`${color}12`,
          display:"flex", alignItems:"center", justifyContent:"center", color }}>
          <Ico d={icon} size={15}/>
        </div>
      </div>
      {loading
        ? <div style={{ height:28, width:"55%", background:"#f0f0f0", borderRadius:6,
            animation:"an-shimmer 1.4s ease infinite", backgroundSize:"800px 100%",
            backgroundImage:"linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%)" }}/>
        : <div style={{ fontSize:28, fontWeight:900, color:"#111",
            letterSpacing:"-0.04em", lineHeight:1, marginBottom:8 }}>{value}</div>
      }
      {sub && !loading && (
        <div style={{ fontSize:12, color:"#9ca3af", fontWeight:600 }}>{sub}</div>
      )}
    </div>
  );
}

const METRICS = [
  { key:"revenue",  label:"Revenue",    color:BLUE,   prefix:"GHS " },
  { key:"orders",   label:"Orders",     color:GREEN,  prefix:""     },
  { key:"visitors", label:"Visitors",   color:PURPLE, prefix:""     },
];

const PERIODS = [
  { key:"7d",  label:"7 Days"  },
  { key:"30d", label:"30 Days" },
  { key:"90d", label:"90 Days" },
];

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function DashboardAnalytics() {
  const { user }              = useAuth();
  const { subscriptionPlan }  = useSellerAuth();
  const { plan }              = useSubscription();
  const { weekSeries, weekRevenue, weekOrders, weekVisitors, loading } = useStoreAnalytics();

  const [metric,     setMetric]     = useState("revenue");
  const [period,     setPeriod]     = useState("7d");
  const [aiSummary,  setAiSummary]  = useState(null);
  const [aiLoading,  setAiLoading]  = useState(false);

  // Plan check — Growth or Pro only
  const activePlan = plan || subscriptionPlan || "basic";
  const hasAccess  = ["growth", "pro"].includes(activePlan);

  const dateStr = new Date().toLocaleDateString("en-GH", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  // Active metric config
  const metricCfg = METRICS.find(m => m.key === metric) || METRICS[0];

  // Chart data
  const chartData = useMemo(() => {
    if (!weekSeries?.length) return [];
    return weekSeries;
  }, [weekSeries]);

  const hasChartData = chartData.some(d => (d[metric] || 0) > 0);

  // AI Summary
  useEffect(() => {
    if (loading || !hasAccess || weekRevenue === undefined || aiSummary) return;
    (async () => {
      setAiLoading(true);
      try {
        const conv = weekVisitors > 0 ? ((weekOrders / weekVisitors) * 100).toFixed(1) : "0";
        const res  = await fetch(`${API_URL}/api/ai/chat`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role:"user", content:
              `Analyse this Beme Market seller's weekly analytics. No asterisks, no markdown, no bullet points. Plain conversational English only.\n\nWeekly data:\n- Revenue: GHS ${Number(weekRevenue||0).toFixed(2)}\n- Orders: ${weekOrders||0}\n- Visitors: ${weekVisitors||0}\n- Conversion: ${conv}%\n\nFormat:\nSUMMARY: [2 sentences]\nTIP: [1 specific action]`
            }],
            context: { currentPage:"analytics" }
          })
        });
        const data = await res.json();
        const text = data.content || "";
        const sm   = text.match(/SUMMARY:\s*([\s\S]*?)(?=TIP:|$)/i);
        const tip  = text.match(/TIP:\s*([\s\S]*?)$/i);
        if (user?.uid) incrementUsage(user.uid).catch(() => {});
        setAiSummary({ summary: sm?.[1]?.trim() || text, tip: tip?.[1]?.trim() || null });
      } catch(e) { console.error("[AI Analytics]", e); }
      finally { setAiLoading(false); }
    })();
  }, [loading, hasAccess, weekRevenue]);

  if (!hasAccess) return <LockedState />;

  const convRate = weekVisitors > 0 ? `${((weekOrders / weekVisitors) * 100).toFixed(1)}%` : "0%";

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background:"#f5f7fa",
      minHeight:"100%", padding:0 }}>

      {/* ── Page Header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:900, color:"#111", letterSpacing:"-0.03em", marginBottom:3 }}>
            Analytics Overview
          </div>
          <div style={{ fontSize:13, color:"#9ca3af", fontWeight:500 }}>{dateStr}</div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Period selector */}
          <div style={{ display:"flex", background:"#fff", border:"1px solid #e8eaed",
            borderRadius:8, overflow:"hidden" }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                style={{ padding:"7px 14px", border:"none", fontSize:12, fontWeight:700,
                  cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                  background: period===p.key ? BLUE : "transparent",
                  color: period===p.key ? "#fff" : "#9ca3af" }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Summary ── */}
      {(aiLoading || aiSummary) && (
        <div style={{ background:`linear-gradient(135deg,${BLUE},${PURPLE})`, borderRadius:14,
          padding:"16px 20px", marginBottom:16, color:"#fff" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <Ico d={IC.sparkle} size={14}/>
            <span style={{ fontSize:13, fontWeight:800 }}>AI Weekly Summary</span>
          </div>
          {aiLoading ? (
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, opacity:0.85 }}>
              <div style={{ width:14, height:14, border:"2px solid #fff", borderTopColor:"transparent",
                borderRadius:"50%", animation:"an-spin 0.8s linear infinite", flexShrink:0 }}/>
              Analysing your week…
            </div>
          ) : aiSummary && (
            <>
              <div style={{ fontSize:13, lineHeight:1.7, opacity:0.95, marginBottom: aiSummary.tip?10:0 }}>
                {aiSummary.summary}
              </div>
              {aiSummary.tip && (
                <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:8,
                  padding:"8px 12px", fontSize:12, fontWeight:700, lineHeight:1.5 }}>
                  💡 {aiSummary.tip}
                </div>
              )}
              <button onClick={() => setAiSummary(null)}
                style={{ marginTop:8, background:"none", border:"none",
                  color:"rgba(255,255,255,0.6)", fontSize:11, cursor:"pointer", padding:0 }}>
                Dismiss
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display:"flex", gap:14, marginBottom:16, flexWrap:"wrap" }}>
        <StatCard label="Revenue (7d)" icon={IC.revenue} color={BLUE} loading={loading}
          value={`GHS ${Number(weekRevenue||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}
          sub="Total earnings this week" />
        <StatCard label="Orders (7d)" icon={IC.orders} color={GREEN} loading={loading}
          value={weekOrders||0} sub="Completed orders" />
        <StatCard label="Visitors (7d)" icon={IC.visitors} color={PURPLE} loading={loading}
          value={weekVisitors||0} sub="Store page visits" />
        <StatCard label="Conversion" icon={IC.trend_up} color={ORANGE} loading={loading}
          value={convRate} sub="Orders / Visitors" />
      </div>

      {/* ── Main Chart ── */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid rgba(0,0,0,0.07)",
        padding:"20px 22px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          marginBottom:20, flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:"#111", marginBottom:2 }}>
              {metricCfg.label} Trend
            </div>
            <div style={{ fontSize:12, color:"#9ca3af", fontWeight:500 }}>
              Daily breakdown · Last {period === "7d" ? "7" : period === "30d" ? "30" : "90"} days
            </div>
          </div>
          {/* Metric selector */}
          <div style={{ display:"flex", gap:6 }}>
            {METRICS.map(m => (
              <button key={m.key} onClick={() => setMetric(m.key)}
                style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${metric===m.key ? m.color : "#e8eaed"}`,
                  background: metric===m.key ? `${m.color}12` : "transparent",
                  color: metric===m.key ? m.color : "#9ca3af",
                  fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ height:240, background:"#f8f9fb", borderRadius:10,
            animation:"an-shimmer 1.4s ease infinite",
            backgroundImage:"linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%)",
            backgroundSize:"800px 100%" }}/>
        ) : !hasChartData ? (
          <NoMetric label={`No ${metricCfg.label.toLowerCase()} data available for this period`} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top:5, right:10, left:-15, bottom:0 }}>
              <defs>
                <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={metricCfg.color} stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={metricCfg.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false}/>
              <XAxis dataKey="label" stroke="transparent"
                tick={{ fontSize:11, fill:"#C0C0C0", fontWeight:600 }}
                axisLine={false} tickLine={false}/>
              <YAxis stroke="transparent"
                tick={{ fontSize:11, fill:"#C0C0C0", fontWeight:600 }}
                axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTip prefix={metricCfg.prefix}/>}/>
              <Area type="monotone" dataKey={metric}
                stroke={metricCfg.color} strokeWidth={2.5}
                fill="url(#mainGrad)"
                dot={{ r:4, fill:metricCfg.color, strokeWidth:2, stroke:"#fff" }}
                activeDot={{ r:6, fill:metricCfg.color }}/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Bottom Row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        {/* Orders bar chart */}
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid rgba(0,0,0,0.07)", padding:"20px 22px" }}>
          <div style={{ fontSize:14, fontWeight:800, color:"#111", marginBottom:4 }}>Orders by Day</div>
          <div style={{ fontSize:12, color:"#9ca3af", fontWeight:500, marginBottom:16 }}>Daily order volume</div>
          {loading ? (
            <div style={{ height:160, background:"#f8f9fb", borderRadius:8,
              animation:"an-shimmer 1.4s ease infinite",
              backgroundImage:"linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%)",
              backgroundSize:"800px 100%" }}/>
          ) : !chartData.some(d => (d.orders||0) > 0) ? (
            <NoMetric label="No orders this period" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top:0, right:0, left:-25, bottom:0 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false}/>
                <XAxis dataKey="label" stroke="transparent"
                  tick={{ fontSize:10, fill:"#C0C0C0", fontWeight:600 }}
                  axisLine={false} tickLine={false}/>
                <YAxis stroke="transparent"
                  tick={{ fontSize:10, fill:"#C0C0C0" }}
                  axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>} cursor={{ fill:"rgba(34,197,94,0.05)" }}/>
                <Bar dataKey="orders" fill={GREEN} radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Visitors area chart */}
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid rgba(0,0,0,0.07)", padding:"20px 22px" }}>
          <div style={{ fontSize:14, fontWeight:800, color:"#111", marginBottom:4 }}>Daily Visitors</div>
          <div style={{ fontSize:12, color:"#9ca3af", fontWeight:500, marginBottom:16 }}>Store page views over time</div>
          {loading ? (
            <div style={{ height:160, background:"#f8f9fb", borderRadius:8,
              animation:"an-shimmer 1.4s ease infinite",
              backgroundImage:"linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%)",
              backgroundSize:"800px 100%" }}/>
          ) : !chartData.some(d => (d.visitors||0) > 0) ? (
            <NoMetric label="No visitor data this period" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                <defs>
                  <linearGradient id="visGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PURPLE} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={PURPLE} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false}/>
                <XAxis dataKey="label" stroke="transparent"
                  tick={{ fontSize:10, fill:"#C0C0C0", fontWeight:600 }}
                  axisLine={false} tickLine={false}/>
                <YAxis stroke="transparent"
                  tick={{ fontSize:10, fill:"#C0C0C0" }}
                  axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Area type="monotone" dataKey="visitors"
                  stroke={PURPLE} strokeWidth={2.5}
                  fill="url(#visGrad2)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <style>{`
        @keyframes an-spin    { to { transform: rotate(360deg); } }
        @keyframes an-shimmer { 0% { background-position: -600px 0; } 100% { background-position: calc(600px + 100%) 0; } }
        @media (max-width: 768px) {
          .an-bottom-grid { grid-template-columns: 1fr !important; }
          .an-stat-row    { flex-direction: column !important; }
        }
      `}</style>
    </div>
  );
}
