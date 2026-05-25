import { useStoreAnalytics } from "../../hooks/useStoreAnalytics";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";
import { incrementUsage } from "../../services/aiUsageService";

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
  const { weekSeries, weekRevenue, weekOrders, weekVisitors, loading } = useStoreAnalytics();
  const [aiSummary,   setAiSummary]   = useState(null);
  const [aiLoading,   setAiLoading]   = useState(false);

  // Auto-fetch AI summary when data loads
  useEffect(() => {
    if (loading || weekRevenue === undefined) return;
    if (aiSummary) return; // already fetched
    const fetchSummary = async () => {
      setAiLoading(true);
      try {
        const conversion = weekVisitors > 0 ? ((weekOrders / weekVisitors) * 100).toFixed(1) : "0";
        const prompt = `Analyse this Beme Market seller's weekly analytics. No asterisks, no markdown, no bullet points. Plain conversational English only. Give a 2-sentence summary then 1 specific actionable tip.

Weekly data:
- Revenue: GHS ${Number(weekRevenue || 0).toFixed(2)}
- Orders: ${weekOrders || 0}
- Visitors: ${weekVisitors || 0}
- Conversion rate: ${conversion}%

Format:
SUMMARY: [2 sentences explaining performance]
TIP: [1 specific action they can take today]`;

        const res = await fetch(`${API_URL}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            context: { currentPage: "analytics" }
          })
        });
        const data = await res.json();
        const text = data.content || "";
        const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)(?=TIP:|$)/i);
        const tipMatch     = text.match(/TIP:\s*([\s\S]*?)$/i);
        const uid = auth?.currentUser?.uid;
        if (uid) incrementUsage(uid).catch(() => {});
        setAiSummary({
          summary: summaryMatch?.[1]?.trim() || text,
          tip:     tipMatch?.[1]?.trim() || null,
        });
      } catch (e) {
        console.error("[AI Analytics]", e);
      } finally {
        setAiLoading(false);
      }
    };
    fetchSummary();
  }, [loading, weekRevenue, weekOrders, weekVisitors]);


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

      {/* AI Weekly Summary */}
      {(aiLoading || aiSummary) && (
        <div style={{ background:"linear-gradient(135deg,#046EF2,#7C3AED)", borderRadius:14, padding:"16px 20px", marginBottom:14, color:"#fff" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:16 }}>✨</span>
            <span style={{ fontSize:13, fontWeight:800 }}>AI Weekly Summary</span>
          </div>
          {aiLoading ? (
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, opacity:0.85 }}>
              <div style={{ width:14,height:14,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0 }}/>
              Analysing your week…
            </div>
          ) : aiSummary && (
            <>
              <div style={{ fontSize:13, lineHeight:1.7, opacity:0.95, marginBottom: aiSummary.tip ? 10 : 0 }}>
                {aiSummary.summary}
              </div>
              {aiSummary.tip && (
                <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:8, padding:"8px 12px", fontSize:12, fontWeight:700, lineHeight:1.5 }}>
                  💡 {aiSummary.tip}
                </div>
              )}
              <button onClick={() => setAiSummary(null)} style={{ marginTop:8, background:"none", border:"none", color:"rgba(255,255,255,0.6)", fontSize:11, cursor:"pointer", padding:0 }}>
                Dismiss
              </button>
            </>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

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
    </div>
  );
}