import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../../firebase";

function toMs(v) { if (!v) return 0; if (typeof v?.toMillis === "function") return v.toMillis(); if (typeof v?.seconds === "number") return v.seconds * 1000; return 0; }
function orderTotal(o) { const d = o?.pricing?.total ?? o?.total ?? o?.amount ?? o?.grandTotal ?? o?.subtotal; if (Number.isFinite(Number(d))) return Number(d); return (o?.items||[]).reduce((s,i)=>s+Number(i?.price||0)*Number(i?.qty||0),0); }
function dayKey(ts) { const d = ts ? new Date(toMs(ts)) : new Date(); return d.toISOString().slice(0,10); }
function fmtMoney(n) { n=Number(n||0); if(n>=1e6) return `GHS ${(n/1e6).toFixed(1)}M`; if(n>=1e3) return `GHS ${(n/1e3).toFixed(1)}k`; return `GHS ${n.toFixed(0)}`; }
function fmtAxis(n) { if(n>=1e6) return `${(n/1e6).toFixed(1)}M`; if(n>=1e3) return `${(n/1e3).toFixed(1)}k`; return String(Math.round(n)); }

function buildSeries(orders, days) {
  const today = new Date();
  const map = new Map();
  for (let i = days-1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    const k = d.toISOString().slice(0,10);
    map.set(k, { key:k, label:d.toLocaleDateString(undefined,{month:"short",day:"numeric"}), orders:0, revenue:0 });
  }
  for (const o of orders) {
    const k = dayKey(o.createdAt||o.timestamp);
    if (map.has(k)) { const r=map.get(k); r.orders++; r.revenue+=orderTotal(o); }
  }
  return Array.from(map.values());
}

function build84(orders) {
  const today = new Date();
  const map = new Map();
  for (let i=83; i>=0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    const k = d.toISOString().slice(0,10);
    map.set(k, { key:k, date:d, count:0 });
  }
  for (const o of orders) {
    const k = dayKey(o.createdAt||o.timestamp);
    if (map.has(k)) map.get(k).count++;
  }
  return Array.from(map.values());
}

/* ── Big Line Chart with metric toggle ── */
function BigLineChart({ data, metric, onMetricChange }) {
  const [tooltip, setTooltip] = useState(null);
  const W = 900; const H = 280;
  const PAD = { top:24, right:24, bottom:40, left:68 };

  const isRev = metric === "revenue";
  const colorStroke = isRev ? "#8b5cf6" : "#22c55e";
  const colorFill   = isRev ? "rgba(139,92,246,0.13)" : "rgba(34,197,94,0.1)";

  const vals = data.map(d => d[metric]);
  const maxV = Math.max(...vals, 1);
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;
  const px = (i) => PAD.left + (i / Math.max(data.length-1,1)) * cw;
  const py = (v) => PAD.top + ch - (v / maxV) * ch;

  // Smooth cubic bezier
  const pts = data.map((d,i) => [px(i), py(d[metric])]);
  let pathD = `M ${pts[0]?.[0]||0},${pts[0]?.[1]||0}`;
  for (let i=0; i<pts.length-1; i++) {
    const cp1x = pts[i][0] + (pts[i+1][0]-pts[i][0])*0.4;
    const cp2x = pts[i+1][0] - (pts[i+1][0]-pts[i][0])*0.4;
    pathD += ` C ${cp1x},${pts[i][1]} ${cp2x},${pts[i+1][1]} ${pts[i+1][0]},${pts[i+1][1]}`;
  }
  const areaD = pts.length > 1 ? pathD + ` L ${pts[pts.length-1][0]},${PAD.top+ch} L ${PAD.left},${PAD.top+ch} Z` : "";

  const yTicks = [0,0.25,0.5,0.75,1].map(t=>({ v:t*maxV, y:PAD.top+ch-t*ch }));
  const step = Math.max(1, Math.ceil(data.length/8));
  const xLabels = data.filter((_,i)=>i%step===0||i===data.length-1);

  return (
    <div>
      {/* Metric toggle */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[
          { key:"revenue", label:"Revenue" },
          { key:"orders",  label:"Orders"  },
        ].map(m => (
          <button key={m.key} onClick={()=>onMetricChange(m.key)} style={{
            padding:"7px 18px", borderRadius:8, border:"none",
            background: metric===m.key ? colorStroke : "rgba(255,255,255,0.06)",
            color: metric===m.key ? "#fff" : "var(--ap-text2)",
            fontFamily:"var(--ap-font)", fontSize:13, fontWeight:700,
            cursor:"pointer", transition:"all 0.15s",
          }}>
            {m.label}
          </button>
        ))}
        <span style={{ marginLeft:"auto", fontSize:13, color:"var(--ap-muted)", alignSelf:"center" }}>
          {isRev ? fmtMoney(vals.reduce((a,b)=>a+b,0)) + " total" : vals.reduce((a,b)=>a+b,0) + " total orders"}
        </span>
      </div>

      {/* SVG chart */}
      <div style={{ position:"relative", width:"100%" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", display:"block" }}>
          <defs>
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorStroke} stopOpacity="0.28"/>
              <stop offset="100%" stopColor={colorStroke} stopOpacity="0"/>
            </linearGradient>
          </defs>

          {/* Y grid + labels */}
          {yTicks.map((t,i)=>(
            <g key={i}>
              <line x1={PAD.left} y1={t.y} x2={W-PAD.right} y2={t.y}
                stroke="rgba(255,255,255,0.055)" strokeWidth="1" strokeDasharray="4 4"/>
              <text x={PAD.left-8} y={t.y+4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.32)">
                {isRev ? fmtAxis(t.v) : Math.round(t.v)}
              </text>
            </g>
          ))}

          {/* Area */}
          {areaD && <path d={areaD} fill="url(#area-grad)"/>}
          {/* Line */}
          {pts.length>1 && <path d={pathD} fill="none" stroke={colorStroke} strokeWidth="2.8" strokeLinecap="round"/>}

          {/* Dots on data points */}
          {pts.map(([x,y],i)=>(
            <g key={i}>
              <circle cx={x} cy={y} r="16" fill="transparent"
                onMouseEnter={()=>setTooltip({i,x,y,item:data[i]})}
                onMouseLeave={()=>setTooltip(null)} style={{cursor:"crosshair"}}/>
              {tooltip?.i===i && <circle cx={x} cy={y} r="5" fill={colorStroke} stroke="rgba(255,255,255,0.9)" strokeWidth="2"/>}
            </g>
          ))}

          {/* X labels */}
          {xLabels.map((item,i)=>{
            const idx = data.indexOf(item);
            return (
              <text key={i} x={px(idx)} y={H-8} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.28)">
                {item.label}
              </text>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position:"absolute",
            top: Math.max(0, (tooltip.y/H)*100) + "%",
            left: (tooltip.x/W*100) + "%",
            transform:"translate(-50%, -120%)",
            background:"var(--ap-card2)", border:"1px solid var(--ap-border)",
            borderRadius:8, padding:"7px 12px", fontSize:12,
            color:"var(--ap-text)", pointerEvents:"none", zIndex:10,
            boxShadow:"0 4px 16px rgba(0,0,0,0.5)", whiteSpace:"nowrap",
          }}>
            <div style={{fontWeight:700,color:colorStroke}}>
              {isRev ? fmtMoney(tooltip.item.revenue) : tooltip.item.orders + " orders"}
            </div>
            <div style={{color:"var(--ap-muted)",fontSize:11,marginTop:2}}>{tooltip.item.label}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Calendar Heatmap — green/red scheme ── */
function CalHeatmap({ series }) {
  const maxCount = Math.max(...series.map(s=>s.count), 1);
  // Build 12 weeks x 7 days grid
  const weeks = [];
  for (let i=0; i<series.length; i+=7) weeks.push(series.slice(i,i+7));
  const DAY_LABELS = ["","Mon","","Wed","","Fri",""];
  const cellSize = 14; const gap = 3;

  const cellColor = (count) => {
    if (count === 0) return "rgba(255,255,255,0.04)";
    const t = count / maxCount;
    if (t < 0.25) return "#bbf7d0";   // light green
    if (t < 0.5)  return "#4ade80";   // medium green
    if (t < 0.75) return "#16a34a";   // dark green
    return "#15803d";                  // deep green (high activity)
  };

  let shownMonths = new Set();

  return (
    <div style={{ overflowX:"auto" }}>
      <div style={{ display:"flex", gap:gap, alignItems:"flex-start", minWidth:"fit-content", padding:"4px 0" }}>
        {/* Day labels */}
        <div style={{ display:"flex", flexDirection:"column", gap:gap, marginTop:cellSize+gap }}>
          {DAY_LABELS.map((l,i)=>(
            <div key={i} style={{ height:cellSize, fontSize:10, color:"var(--ap-muted)", display:"flex", alignItems:"center", paddingRight:6, minWidth:28 }}>
              {l}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => {
          const firstDay = week[0]?.date;
          let monthLabel = "";
          if (firstDay) {
            const m = firstDay.toLocaleDateString(undefined,{month:"short"});
            if (!shownMonths.has(m) && firstDay.getDate() <= 7) { shownMonths.add(m); monthLabel = m; }
          }
          return (
            <div key={wi} style={{ display:"flex", flexDirection:"column", gap:gap }}>
              <div style={{ height:cellSize, fontSize:10, color:"var(--ap-muted)", textAlign:"center", whiteSpace:"nowrap", lineHeight:`${cellSize}px` }}>
                {monthLabel}
              </div>
              {Array.from({length:7}).map((_,di)=>{
                const cell = week[di];
                return (
                  <div key={di}
                    title={cell ? `${cell.key}: ${cell.count} order${cell.count!==1?"s":""}` : ""}
                    style={{
                      width:cellSize, height:cellSize, borderRadius:3,
                      background: cell ? cellColor(cell.count) : "rgba(255,255,255,0.03)",
                      cursor: cell?.count>0 ? "pointer" : "default",
                      transition:"transform 0.1s",
                    }}
                    onMouseEnter={e=>{ if(cell?.count>0) e.target.style.transform="scale(1.3)"; }}
                    onMouseLeave={e=>{ e.target.style.transform="scale(1)"; }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:10, fontSize:11, color:"var(--ap-muted)" }}>
        <span>Less</span>
        {["rgba(255,255,255,0.06)","#bbf7d0","#4ade80","#16a34a","#15803d"].map((c,i)=>(
          <div key={i} style={{ width:12, height:12, borderRadius:3, background:c }}/>
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/* ── Horizontal Bar ── */
function HBar({ label, value, total, display }) {
  const pct = total>0 ? Math.max((value/total)*100, value>0?2:0) : 0;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:13 }}>
        <span style={{ color:"var(--ap-text)", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"65%" }}>{label}</span>
        <span style={{ color:"var(--ap-purple-lt)", fontWeight:700, flexShrink:0 }}>{display||value}</span>
      </div>
      <div style={{ height:8, background:"rgba(255,255,255,0.05)", borderRadius:100, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:"var(--ap-purple)", borderRadius:100, transition:"width 0.6s ease" }}/>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function AnalyticsSection() {
  const [loading,  setLoading]  = useState(true);
  const [orders,   setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [metric,   setMetric]   = useState("revenue");

  useEffect(()=>{
    let alive = true;
    (async()=>{
      try {
        const [pS, oS, uS] = await Promise.allSettled([
          getDocs(collection(db,"Products")),
          getDocs(query(collection(db,"orders"), orderBy("createdAt","desc"), limit(600))),
          getDocs(collection(db,"users")),
        ]);
        if (!alive) return;
        setProducts(pS.status==="fulfilled"?pS.value.docs.map(d=>({id:d.id,...d.data()})):[]);
        setOrders(oS.status==="fulfilled"?oS.value.docs.map(d=>({id:d.id,...d.data()})):[]);
        setUsers(uS.status==="fulfilled"?uS.value.docs.map(d=>({id:d.id,...d.data()})):[]);
      } catch(e){console.error(e);}
      finally{if(alive)setLoading(false);}
    })();
    return()=>{alive=false;};
  },[]);

  // Find meaningful date range — use 90 days
  const series90  = useMemo(()=>buildSeries(orders,90),[orders]);
  const heatmap84 = useMemo(()=>build84(orders),[orders]);

  const metrics = useMemo(()=>{
    const totalRevenue = orders.reduce((s,o)=>s+orderTotal(o),0);
    const totalUnits   = orders.reduce((s,o)=>s+(o.items||[]).reduce((ss,i)=>ss+Number(i?.qty||0),0),0);
    const sellers   = users.filter(u=>["shop_admin","seller"].includes(String(u.role||"").toLowerCase()));
    const customers = users.filter(u=>!["admin","super_admin","shop_admin","seller"].includes(String(u.role||"").toLowerCase()));
    const inStock   = products.filter(p=>p.inStock!==false).length;
    return { totalRevenue, totalOrders:orders.length, totalUnits, avgOrder:orders.length?totalRevenue/orders.length:0, totalProducts:products.length, inStock, sellers:sellers.length, customers:customers.length };
  },[orders,products,users]);

  const topProducts = useMemo(()=>{
    const map=new Map();
    for(const o of orders) for(const item of (o.items||[])){
      const id=item?.id||item?.name||""; if(!id) continue;
      if(!map.has(id))map.set(id,{name:item?.name||"Item",revenue:0,units:0});
      const r=map.get(id); r.units+=Number(item?.qty||0); r.revenue+=Number(item?.price||0)*Number(item?.qty||0);
    }
    return Array.from(map.values()).sort((a,b)=>b.revenue-a.revenue).slice(0,7);
  },[orders]);

  const shopPerf = useMemo(()=>{
    const map=new Map();
    for(const o of orders) for(const item of (o.items||[])){
      const s=String(item?.shop||"unknown").toLowerCase();
      if(!map.has(s))map.set(s,{label:s.replace(/[-_]/g," ").replace(/\b\w/g,c=>c.toUpperCase()),revenue:0});
      map.get(s).revenue+=Number(item?.price||0)*Number(item?.qty||0);
    }
    return Array.from(map.values()).sort((a,b)=>b.revenue-a.revenue).slice(0,7);
  },[orders]);

  const topProdMax = Math.max(...topProducts.map(p=>p.revenue),1);
  const shopRevMax = Math.max(...shopPerf.map(s=>s.revenue),1);

  const STATS = [
    {label:"Total Revenue",  value:fmtMoney(metrics.totalRevenue),  sub:`Avg ${fmtMoney(metrics.avgOrder)} per order`},
    {label:"Total Orders",   value:metrics.totalOrders,             sub:`${metrics.totalUnits} units sold`},
    {label:"Products",       value:metrics.totalProducts,           sub:`${metrics.inStock} in stock`},
    {label:"Customers",      value:metrics.customers,               sub:`${metrics.sellers} sellers`},
  ];

  return (
    <div>
      <div className="ap-page-header">
        <div className="ap-page-title">Analytics</div>
        <div className="ap-page-sub">Revenue, orders, activity and catalog performance</div>
      </div>

      {/* Stat cards */}
      <div className="ap-stats-grid" style={{marginBottom:24}}>
        {STATS.map(s=>(
          <div key={s.label} className={`ap-stat${loading?" ap-stat--skeleton":""}`}>
            <div className="ap-stat-label">{s.label}</div>
            {!loading&&<><div className="ap-stat-value">{typeof s.value==="number"?s.value.toLocaleString():s.value}</div><div className="ap-stat-sub">{s.sub}</div></>}
          </div>
        ))}
      </div>

      {/* BIG line chart — full width */}
      <div className="ap-card" style={{marginBottom:20}}>
        <div className="ap-card-body" style={{padding:"22px 24px"}}>
          {loading
            ? <div className="ap-skeleton" style={{height:280, borderRadius:10}}/>
            : <BigLineChart data={series90} metric={metric} onMetricChange={setMetric}/>
          }
        </div>
      </div>

      {/* Calendar heatmap — full width */}
      <div className="ap-card" style={{marginBottom:20}}>
        <div className="ap-card-head">
          <span className="ap-card-title">Order Activity — 84 days</span>
          <span className="ap-card-sub">Daily order count</span>
        </div>
        <div className="ap-card-body">
          {loading
            ? <div className="ap-skeleton" style={{height:130}}/>
            : <CalHeatmap series={heatmap84}/>
          }
        </div>
      </div>

      {/* Bars — 2 col */}
      <div className="ap-body-grid">
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Top Products</span><span className="ap-card-sub">By revenue</span></div>
          <div className="ap-card-body">
            {loading?<div className="ap-skeleton" style={{height:200}}/>:
            topProducts.length===0?<div className="ap-empty"><div className="ap-empty-title">No data yet</div></div>:
            topProducts.map((p,i)=><HBar key={i} label={p.name} value={p.revenue} total={topProdMax} display={fmtMoney(p.revenue)}/>)}
          </div>
        </div>
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Store Performance</span><span className="ap-card-sub">Revenue by store</span></div>
          <div className="ap-card-body">
            {loading?<div className="ap-skeleton" style={{height:200}}/>:
            shopPerf.length===0?<div className="ap-empty"><div className="ap-empty-title">No data yet</div></div>:
            shopPerf.map((s,i)=><HBar key={i} label={s.label} value={s.revenue} total={shopRevMax} display={fmtMoney(s.revenue)}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}
