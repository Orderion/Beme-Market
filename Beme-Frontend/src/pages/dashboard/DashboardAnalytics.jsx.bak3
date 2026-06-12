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

/* ── Brand colours ── */
const C = {
  blue:   "#7c3aed",
  green:  "#22C55E",
  purple: "#7C3AED",
  orange: "#F59E0B",
  red:    "#EF4444",
  muted:  "#9ca3af",
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

function ChartTip({ active, payload, label, prefix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--sd-white)", border: "1px solid var(--sd-border)",
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
    }}>
      <div style={{ color: "var(--sd-muted)", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.blue, fontWeight: 800, fontSize: 14 }}>
          {prefix}{typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
}

function Empty({ msg = "No data available for this period" }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: 160, gap: 10, padding: 24,
    }}>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
        stroke="var(--sd-border)" strokeWidth="1.3" strokeLinecap="round">
        <path d="M18 20V10 M12 20V4 M6 20v-6"/>
      </svg>
      <div style={{ fontSize: 13, color: "var(--sd-muted)", fontWeight: 600, textAlign: "center" }}>{msg}</div>
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "var(--sd-white)",
      borderRadius: 16,
      border: "1px solid var(--sd-border)",
      boxShadow: "var(--sd-shadow)",
      padding: "20px 22px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color, icon, trend, loading }) {
  const up = trend >= 0;
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {label}
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico d={icon} size={15} color={color}/>
        </div>
      </div>
      {loading
        ? <div className="an-skel" style={{ height: 32, width: "55%", borderRadius: 8, marginBottom: 8 }}/>
        : <div style={{ fontSize: 30, fontWeight: 900, color: "var(--sd-text)", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 8 }}>{value}</div>
      }
      {!loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
          {trend !== undefined && (
            <span style={{ display: "flex", alignItems: "center", gap: 2, color: up ? C.green : C.red, fontSize: 11, fontWeight: 700 }}>
              <Ico d={up ? IC.up : IC.down} size={12} color={up ? C.green : C.red}/>
              {Math.abs(trend)}%
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--sd-muted)", fontWeight: 500 }}>{sub}</span>
        </div>
      )}
    </Card>
  );
}

function LockedState() {
  const nav = useNavigate();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 500, textAlign: "center", padding: "48px 24px" }}>
      <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--sd-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Ico d={IC.lock} size={28} color={C.blue}/>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: "var(--sd-text)", marginBottom: 8 }}>Analytics Pro</div>
      <div style={{ fontSize: 14, color: "var(--sd-muted)", lineHeight: 1.7, maxWidth: 320, marginBottom: 28 }}>
        Advanced analytics are available on the <strong style={{ color: "var(--sd-text)" }}>Growth</strong> and{" "}
        <strong style={{ color: "var(--sd-text)" }}>Pro</strong> plans.
      </div>
      <button onClick={() => nav("/seller-dashboard?tab=subscription")}
        style={{ padding: "12px 32px", background: C.blue, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 16px ${C.blue}44` }}>
        Upgrade Plan →
      </button>
      <div style={{ marginTop: 32, background: "var(--sd-white)", border: "1px solid var(--sd-border)", borderRadius: 14, padding: "20px 24px", maxWidth: 320, width: "100%", textAlign: "left" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>What you unlock</div>
        {["Revenue & orders over time","Visitor & product view tracking","Customer funnel & conversion",
          "Repeat buyer rate","Product performance table","Top customers by spend",
          "Revenue by day of week","Live store visitors","Payout forecast","AI weekly summary"].map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13, color: "var(--sd-text2)", fontWeight: 600 }}>
            <Ico d="M20 6L9 17l-5-5" size={12} color={C.blue}/>{f}
          </div>
        ))}
      </div>
    </div>
  );
}

const PERIODS = [{ key:7, label:"7 Days" }, { key:30, label:"30 Days" }, { key:90, label:"90 Days" }];
const METRICS = [
  { key:"revenue",  label:"Revenue",  color: C.blue,   prefix:"GHS " },
  { key:"orders",   label:"Orders",   color: C.green,  prefix:""     },
  { key:"visitors", label:"Visitors", color: C.purple, prefix:""     },
];

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
    { weekday: "long", day: "numeric", month: "long", year: "numeric" });

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
    /* ── ONLY CHANGE: background transparent instead of var(--sd-white) ── */
    <div style={{ fontFamily: "var(--sd-font,'DM Sans',system-ui,sans-serif)", minHeight: "100%", color: "var(--sd-text)", background: "transparent" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "var(--sd-text)", letterSpacing: "-0.03em", marginBottom: 3 }}>
            Analytics Overview
          </div>
          <div style={{ fontSize: 13, color: "var(--sd-muted)", fontWeight: 500 }}>{dateStr}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {data.liveVisitors > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, animation: "an-pulse 1.5s ease infinite" }}/>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>
                {data.liveVisitors} live {data.liveVisitors === 1 ? "visitor" : "visitors"}
              </span>
            </div>
          )}
          <div style={{ display: "flex", background: "var(--sd-white)", border: "1px solid var(--sd-border)", borderRadius: 10, overflow: "hidden", boxShadow: "var(--sd-shadow)" }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                style={{
                  padding: "8px 16px", border: "none", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  background: period === p.key ? C.blue : "transparent",
                  color: period === p.key ? "#fff" : "var(--sd-muted)",
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Summary ── */}
      {(aiLoading || aiSummary) && (
        <div className="an-ai-card">
          <span className="an-bubble an-bubble--a"/>
          <span className="an-bubble an-bubble--b"/>
          <span className="an-bubble an-bubble--c"/>
          <div className="an-ai-inner">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ico d={IC.sparkle} size={14} color="#fff"/>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>AI Performance Summary</span>
            </div>
            {aiLoading
              ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                  <div className="an-spinner"/>
                  Analysing your store…
                </div>
              : aiSummary && (
                <>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.93)", margin: "0 0 10px" }}>{aiSummary.summary}</p>
                  {aiSummary.tip && (
                    <div className="an-ai-tip">💡 {aiSummary.tip}</div>
                  )}
                  <button onClick={() => setAI(null)} className="an-ai-dismiss">Dismiss</button>
                </>
              )
            }
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      {/* ── Revenue split banner ── */}
      <div style={{ display:"flex", gap:10, padding:"12px 16px", background:"rgba(34,197,94,0.05)", borderRadius:12, border:"1px solid rgba(34,197,94,0.15)", marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ flex:1, minWidth:160 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#15803d", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Total Revenue (all-time)</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#15803d", letterSpacing:"-0.03em" }}>
            {data.loading ? "—" : "GHS " + Number(data.totalRevenueAllTime||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
          </div>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <div style={{ padding:"10px 16px", background:"rgba(255,255,255,0.7)", borderRadius:10, border:"1px solid rgba(34,197,94,0.15)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#15803d", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>Paystack (online)</div>
            <div style={{ fontSize:16, fontWeight:900, color:"#15803d" }}>{data.loading ? "—" : "GHS " + Number(data.paystackRevenue||0).toFixed(2)}</div>
            <div style={{ fontSize:10, color:"#16a34a", marginTop:2 }}>Eligible for payout</div>
          </div>
          <div style={{ padding:"10px 16px", background:"rgba(255,255,255,0.7)", borderRadius:10, border:"1px solid rgba(34,197,94,0.15)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>Cash on Delivery</div>
            <div style={{ fontSize:16, fontWeight:900, color:"var(--sd-text)" }}>{data.loading ? "—" : "GHS " + Number(data.codRevenue||0).toFixed(2)}</div>
            <div style={{ fontSize:10, color:"var(--sd-muted)", marginTop:2 }}>Collected by you</div>
          </div>
        </div>
      </div>

      <div className="an-stat-row">
        <StatCard label={"Orders (" + period + "d)"} icon={IC.orders} color={C.green}
          loading={data.loading} trend={0} sub="completed"
          value={data.totalOrders || 0}/>
        <StatCard label="Visitors" icon={IC.visitors} color={C.purple}
          loading={data.loading} sub="store page visits"
          value={data.totalVisitors || 0}/>
        <StatCard label="Conversion" icon={IC.conv} color={C.orange}
          loading={data.loading} sub="orders / visitors"
          value={(data.conversionRate || 0) + "%"}/>
        <StatCard label="Avg Order" icon={IC.revenue} color={C.blue}
          loading={data.loading} sub="average order value"
          value={"GHS " + (data.avgOrderValue || "0.00")}/>
      </div>


      {/* ── Main chart + quick stats ── */}
      <div className="an-body-row">
        <Card style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--sd-text)", marginBottom: 2 }}>
                {metricCfg.label} Trend
              </div>
              <div style={{ fontSize: 12, color: "var(--sd-muted)" }}>
                Daily breakdown · Last {period} days
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {METRICS.map(m => (
                <button key={m.key} onClick={() => setMetric(m.key)}
                  style={{
                    padding: "6px 14px", borderRadius: 20,
                    border: `1.5px solid ${metric === m.key ? m.color : "var(--sd-border)"}`,
                    background: metric === m.key ? m.color : "transparent",
                    color: metric === m.key ? "#fff" : "var(--sd-muted)",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {data.loading
            ? <div className="an-skel" style={{ height: 220, borderRadius: 10 }}/>
            : !hasData
              ? <Empty msg={`No ${metricCfg.label.toLowerCase()} data for this period`}/>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.series} margin={{ top:5, right:5, left:-10, bottom:0 }}>
                    <defs>
                      <linearGradient id="mGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={metricCfg.color} stopOpacity={0.35}/>
                        <stop offset="60%"  stopColor={metricCfg.color} stopOpacity={0.18}/>
                        <stop offset="100%" stopColor={metricCfg.color} stopOpacity={0.04}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--sd-border-light)" vertical={false}/>
                    <XAxis dataKey="label" stroke="transparent"
                      tick={{ fontSize:11, fill:"var(--sd-muted)", fontWeight:600 }} axisLine={false} tickLine={false}/>
                    <YAxis stroke="transparent"
                      tick={{ fontSize:11, fill:"var(--sd-muted)" }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<ChartTip prefix={metricCfg.prefix}/>}/>
                    <Area type="monotone" dataKey={metric}
                      stroke={metricCfg.color} strokeWidth={2.5} fill="url(#mGrad)"
                      dot={{ r:3, fill:metricCfg.color, strokeWidth:2, stroke:"var(--sd-white)" }}
                      activeDot={{ r:5, fill:metricCfg.color }}/>
                  </AreaChart>
                </ResponsiveContainer>
              )
          }
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
              Customer Insights
            </div>
            {[
              { label:"Unique Customers", value: data.uniqueCustomers||0,             icon: IC.customers, color: C.blue   },
              { label:"Repeat Buyers",    value: `${data.repeatRate||0}%`,            icon: IC.repeat,    color: C.green  },
              { label:"Avg Order Value",  value: `GHS ${data.avgOrderValue||"0.00"}`, icon: IC.wallet,    color: C.orange },
            ].map(item => (
              <div key={item.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid var(--sd-border-light)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Ico d={item.icon} size={13} color={item.color}/>
                  <span style={{ fontSize:12, color:"var(--sd-text2)", fontWeight:600 }}>{item.label}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:800, color:"var(--sd-text)" }}>
                  {data.loading ? "—" : item.value}
                </span>
              </div>
            ))}
          </Card>

          <Card style={{ background:"rgba(34,197,94,0.07)", border:"1px solid rgba(34,197,94,0.2)" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#15803d", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
              Payout Forecast
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:"#15803d", letterSpacing:"-0.03em" }}>
              {data.loading ? "—" : "GHS " + Number(data.availableBalance||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
            </div>
            <div style={{ fontSize:11, color:"#16a34a", marginTop:4, fontWeight:600 }}>Est. payout from paid orders</div>
          </Card>
        </div>
      </div>

      {/* ── Daily orders + best days ── */}
      <div className="an-grid2">
        <Card>
          <div style={{ fontSize:14, fontWeight:800, color:"var(--sd-text)", marginBottom:2 }}>Daily Orders</div>
          <div style={{ fontSize:12, color:"var(--sd-muted)", marginBottom:14 }}>Order volume per day</div>
          {data.loading
            ? <div className="an-skel" style={{ height:150, borderRadius:8 }}/>
            : !data.series?.some(d => (d.orders||0) > 0) ? <Empty msg="No orders this period"/>
            : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={data.series} margin={{ top:0,right:0,left:-25,bottom:0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--sd-border-light)" vertical={false}/>
                  <XAxis dataKey="label" stroke="transparent"
                    tick={{ fontSize:10, fill:"var(--sd-muted)", fontWeight:600 }} axisLine={false} tickLine={false}/>
                  <YAxis stroke="transparent"
                    tick={{ fontSize:10, fill:"var(--sd-muted)" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>} cursor={{ fill:`${C.green}08` }}/>
                  <Bar dataKey="orders" fill={C.green} radius={[5,5,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </Card>

        <Card>
          <div style={{ fontSize:14, fontWeight:800, color:"var(--sd-text)", marginBottom:2 }}>Best Days</div>
          <div style={{ fontSize:12, color:"var(--sd-muted)", marginBottom:14 }}>Revenue by day of week</div>
          {data.loading
            ? <div className="an-skel" style={{ height:150, borderRadius:8 }}/>
            : !data.byDayOfWeek?.some(d => (d.revenue||0) > 0) ? <Empty msg="No revenue data yet"/>
            : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={data.byDayOfWeek} margin={{ top:0,right:0,left:-25,bottom:0 }} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--sd-border-light)" vertical={false}/>
                  <XAxis dataKey="day" stroke="transparent"
                    tick={{ fontSize:10, fill:"var(--sd-muted)", fontWeight:600 }} axisLine={false} tickLine={false}/>
                  <YAxis stroke="transparent"
                    tick={{ fontSize:10, fill:"var(--sd-muted)" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip prefix="GHS "/>} cursor={{ fill:`${C.blue}08` }}/>
                  <Bar dataKey="revenue" fill={C.blue} radius={[5,5,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </Card>
      </div>

      {/* ── Product performance ── */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:800, color:"var(--sd-text)" }}>Product Performance</div>
          <div style={{ fontSize:12, color:"var(--sd-muted)" }}>Revenue, orders and views per product</div>
        </div>
        {data.loading
          ? <div className="an-skel" style={{ height:120, borderRadius:8 }}/>
          : !hasProducts ? <Empty msg="No product sales data yet"/>
          : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    {["Product","Revenue","Orders","Views","Conv. Rate"].map(h => (
                      <th key={h} style={{ fontSize:10, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.07em", padding:"8px 12px", textAlign:"left", borderBottom:"1px solid var(--sd-border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: i < data.topProducts.length-1 ? "1px solid var(--sd-border-light)" : "none" }}>
                      <td style={{ padding:"11px 12px", fontSize:13, fontWeight:600, color:"var(--sd-text)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:28, height:28, borderRadius:6, background:`${C.blue}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Ico d={IC.product} size={12} color={C.blue}/>
                          </div>
                          <span style={{ maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ padding:"11px 12px", fontSize:13, fontWeight:700, color:"var(--sd-text)" }}>
                        GHS {Number(p.revenue).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                      </td>
                      <td style={{ padding:"11px 12px", fontSize:13, color:"var(--sd-text2)" }}>{p.orders}</td>
                      <td style={{ padding:"11px 12px", fontSize:13, color:"var(--sd-text2)" }}>{p.views||"—"}</td>
                      <td style={{ padding:"11px 12px" }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20,
                          background: p.convRate!=="—" ? `${C.green}14` : "var(--sd-border-light)",
                          color: p.convRate!=="—" ? C.green : "var(--sd-muted)" }}>
                          {p.convRate}
                        </span>
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
        <div style={{ fontSize:15, fontWeight:800, color:"var(--sd-text)", marginBottom:4 }}>Top Customers</div>
        <div style={{ fontSize:12, color:"var(--sd-muted)", marginBottom:16 }}>Highest spenders this period</div>
        {data.loading
          ? <div className="an-skel" style={{ height:100, borderRadius:8 }}/>
          : !data.topCustomers?.length ? <Empty msg="No customer data yet"/>
          : data.topCustomers.map((c, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: i < data.topCustomers.length-1 ? "1px solid var(--sd-border-light)" : "none" }}>
                <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, background:`${C.blue}14`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, color:C.blue }}>
                  {(c.name||"C")[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--sd-text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize:11, color:"var(--sd-muted)" }}>{c.count} order{c.count!==1?"s":""}</div>
                </div>
                <div style={{ fontSize:14, fontWeight:900, color:"var(--sd-text)", flexShrink:0 }}>
                  GHS {Number(c.total).toLocaleString(undefined,{minimumFractionDigits:2})}
                </div>
              </div>
            ))
        }
      </Card>

      <style>{`
        @keyframes an-spin    { to { transform: rotate(360deg); } }
        @keyframes an-shimmer { 0%{background-position:-600px 0} 100%{background-position:calc(600px + 100%) 0} }
        @keyframes an-pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes an-float-a { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(18px,-24px) scale(1.12)} }
        @keyframes an-float-b { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-14px,18px) scale(.88)} }
        @keyframes an-float-c { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(10px,12px) scale(1.06)} }

        .an-skel {
          background: var(--sd-border-light);
          background-image: linear-gradient(90deg, var(--sd-border-light) 25%, var(--sd-border) 50%, var(--sd-border-light) 75%);
          background-size: 600px 100%;
          animation: an-shimmer 1.4s ease infinite;
        }

        .an-ai-card {
          position: relative; overflow: hidden;
          border-radius: 18px; margin-bottom: 16px;
          background: linear-gradient(135deg, #3730a3 0%, #7c3aed 38%, #a78bfa 70%, #ede9fe 100%);
        }
        .sd-dark .an-ai-card {
          background: linear-gradient(135deg, #1e1b4b 0%, #2e1065 32%, #3b0764 65%, #1e1b4b 100%);
        }
        .an-bubble {
          position: absolute; border-radius: 50%; pointer-events: none;
          background: rgba(255,255,255,0.12);
        }
        .sd-dark .an-bubble { background: rgba(167,139,250,0.18); }
        .an-bubble--a { width:140px; height:140px; top:-50px; right:-40px; animation: an-float-a 7s ease-in-out infinite; }
        .an-bubble--b { width:90px;  height:90px;  bottom:-25px; left:10px; animation: an-float-b 9s ease-in-out infinite; }
        .an-bubble--c { width:58px;  height:58px;  top:20px; right:120px;  animation: an-float-c 5.5s ease-in-out infinite; }
        .an-ai-inner  { position: relative; z-index: 1; padding: 20px 22px; }
        .an-spinner   { width:14px; height:14px; border-radius:50%; border:2px solid rgba(255,255,255,.5); border-top-color:#fff; animation:an-spin .8s linear infinite; flex-shrink:0; }
        .an-ai-tip    {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          border-radius: 8px; padding: 8px 12px;
          font-size: 12px; font-weight: 700; color: #fff; line-height: 1.5;
        }
        .sd-dark .an-ai-tip { background: rgba(167,139,250,0.2); }
        .an-ai-dismiss { margin-top:8px; background:none; border:none; color:rgba(255,255,255,.5); font-size:11px; cursor:pointer; padding:0; display:block; }

        .an-stat-row { display:flex; gap:14px; margin-bottom:16px; flex-wrap:nowrap; }
        .an-body-row { display:grid; grid-template-columns:1fr 280px; gap:16px; margin-bottom:16px; align-items:start; }
        .an-grid2    { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }

        @media (max-width: 768px) {
          .an-stat-row { display:grid !important; grid-template-columns:1fr 1fr !important; gap:10px !important; flex-wrap:unset !important; }
          .an-stat-row > div { flex:unset !important; min-width:0 !important; }
          .an-body-row { grid-template-columns:1fr !important; gap:12px !important; }
          .an-grid2    { grid-template-columns:1fr !important; gap:12px !important; }
        }
        @media (max-width: 400px) { .an-stat-row { gap:8px !important; } }
      `}</style>
    </div>
  );
}