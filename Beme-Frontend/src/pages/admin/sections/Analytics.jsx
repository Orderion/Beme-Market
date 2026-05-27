import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../../firebase";

/* ── helpers ── */
function toMs(v) { if (!v) return 0; if (typeof v?.toMillis === "function") return v.toMillis(); if (typeof v?.seconds === "number") return v.seconds * 1000; return 0; }
function fmt(n) { n = Number(n || 0); if (n >= 1e6) return `GHS ${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `GHS ${(n/1e3).toFixed(1)}k`; return `GHS ${n.toFixed(2)}`; }
function orderTotal(o) { const d = o?.pricing?.total ?? o?.total ?? o?.amount ?? o?.grandTotal ?? o?.subtotal; if (Number.isFinite(Number(d))) return Number(d); return (o?.items||[]).reduce((s,i) => s+Number(i?.price||0)*Number(i?.qty||0), 0); }
function dayKey(ts) { const d = ts ? new Date(toMs(ts)) : new Date(); return d.toISOString().slice(0,10); }

function buildDailySeries(orders, days = 14) {
  const today = new Date();
  const map = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const k = d.toISOString().slice(0,10);
    const label = d.toLocaleDateString(undefined, { month:"short", day:"numeric" });
    map.set(k, { key:k, label, orders:0, revenue:0 });
  }
  for (const o of orders) {
    const k = dayKey(o.createdAt || o.timestamp);
    if (map.has(k)) { const r = map.get(k); r.orders++; r.revenue += orderTotal(o); }
  }
  return Array.from(map.values());
}

function build84DaySeries(orders) {
  const today = new Date();
  const map = new Map();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const k = d.toISOString().slice(0,10);
    map.set(k, { key:k, count:0 });
  }
  for (const o of orders) {
    const k = dayKey(o.createdAt || o.timestamp);
    if (map.has(k)) map.get(k).count++;
  }
  return Array.from(map.values());
}

/* ── SVG Line Chart ── */
function LineChart({ data, valueKey, colorStroke = "#8b5cf6", colorFill = "rgba(139,92,246,0.12)", formatVal, height = 160 }) {
  const [tooltip, setTooltip] = useState(null);
  const W = 700; const H = height;
  const PAD = { top:12, right:12, bottom:28, left:52 };
  const vals = data.map(d => d[valueKey]);
  const maxV = Math.max(...vals, 1);
  const minV = 0;
  const range = maxV - minV || 1;
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;
  const px = (i) => PAD.left + (i / (data.length - 1)) * cw;
  const py = (v) => PAD.top + ch - ((v - minV) / range) * ch;

  if (data.length < 2) return null;

  // Smooth cubic bezier path
  const pts = data.map((d, i) => [px(i), py(d[valueKey])]);
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp1x = pts[i][0] + (pts[i+1][0] - pts[i][0]) * 0.4;
    const cp1y = pts[i][1];
    const cp2x = pts[i+1][0] - (pts[i+1][0] - pts[i][0]) * 0.4;
    const cp2y = pts[i+1][1];
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${pts[i+1][0]},${pts[i+1][1]}`;
  }
  const areaD = d + ` L ${pts[pts.length-1][0]},${PAD.top+ch} L ${PAD.left},${PAD.top+ch} Z`;

  // Y axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: minV + t * range, y: PAD.top + ch - t * ch }));

  // X axis labels — show every N points
  const step = Math.ceil(data.length / 7);
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <div style={{ position:"relative", width:"100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", display:"block" }}>
        <defs>
          <linearGradient id={`fill-${valueKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorStroke} stopOpacity="0.22"/>
            <stop offset="100%" stopColor={colorStroke} stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <text x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.3)">
              {formatVal ? formatVal(t.v) : t.v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaD} fill={`url(#fill-${valueKey})`}/>

        {/* Line */}
        <path d={d} fill="none" stroke={colorStroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>

        {/* X labels */}
        {xLabels.map((item, i) => {
          const idx = data.indexOf(item);
          return (
            <text key={i} x={px(idx)} y={H - 6} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.3)">
              {item.label}
            </text>
          );
        })}

        {/* Hover dots */}
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="14" fill="transparent"
            onMouseEnter={() => setTooltip({ i, x, y, item: data[i] })}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor:"crosshair" }}
          />
        ))}

        {/* Active dot */}
        {tooltip && (
          <circle cx={pts[tooltip.i][0]} cy={pts[tooltip.i][1]} r="5"
            fill={colorStroke} stroke="rgba(255,255,255,0.9)" strokeWidth="2"/>
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position:"absolute", top:tooltip.y - 40,
          left:`${(pts[tooltip.i][0] / W) * 100}%`,
          transform:"translateX(-50%)",
          background:"var(--ap-card2)", border:"1px solid var(--ap-border)",
          borderRadius:7, padding:"5px 10px", fontSize:12, whiteSpace:"nowrap",
          color:"var(--ap-text)", pointerEvents:"none", zIndex:10,
          boxShadow:"0 4px 16px rgba(0,0,0,0.4)",
        }}>
          <div style={{ fontWeight:700 }}>{formatVal ? formatVal(tooltip.item[valueKey]) : tooltip.item[valueKey]}</div>
          <div style={{ color:"var(--ap-muted)", fontSize:11 }}>{tooltip.item.label}</div>
        </div>
      )}
    </div>
  );
}

/* ── Calendar Heatmap ── */
function CalendarHeatmap({ series }) {
  const maxCount = Math.max(...series.map(s => s.count), 1);
  const weeks = [];
  for (let i = 0; i < series.length; i += 7) weeks.push(series.slice(i, i + 7));
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const cellSize = 13; const gap = 3;

  const getColor = (count) => {
    if (count === 0) return "rgba(255,255,255,0.05)";
    const intensity = count / maxCount;
    const opacity = 0.2 + intensity * 0.8;
    return `rgba(139,92,246,${opacity.toFixed(2)})`;
  };

  return (
    <div style={{ overflowX:"auto" }}>
      <div style={{ display:"flex", gap:4, alignItems:"flex-start", minWidth:"fit-content" }}>
        {/* Day labels */}
        <div style={{ display:"flex", flexDirection:"column", gap:gap }}>
          <div style={{ height:cellSize }}/>
          {DAYS.map((d, i) => (
            <div key={d} style={{ height:cellSize, fontSize:9, color:"var(--ap-muted)", display:"flex", alignItems:"center", paddingRight:4, opacity: i % 2 === 0 ? 1 : 0 }}>
              {d}
            </div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => {
          const monthLabel = week[0] ? new Date(week[0].key).toLocaleDateString(undefined, { month:"short" }) : "";
          const showMonth = wi === 0 || (week[0] && new Date(week[0].key).getDate() <= 7);
          return (
            <div key={wi} style={{ display:"flex", flexDirection:"column", gap:gap }}>
              <div style={{ height:cellSize, fontSize:9, color:"var(--ap-muted)", textAlign:"center", whiteSpace:"nowrap" }}>
                {showMonth ? monthLabel : ""}
              </div>
              {DAYS.map((_, di) => {
                const cell = week[di];
                return (
                  <div key={di} title={cell ? `${cell.key}: ${cell.count} orders` : ""}
                    style={{
                      width:cellSize, height:cellSize, borderRadius:3,
                      background: cell ? getColor(cell.count) : "rgba(255,255,255,0.03)",
                      cursor: cell?.count > 0 ? "pointer" : "default",
                      transition:"background 0.15s",
                    }}
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
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <div key={t} style={{ width:11, height:11, borderRadius:2, background: t === 0 ? "rgba(255,255,255,0.05)" : `rgba(139,92,246,${(0.2+t*0.8).toFixed(2)})` }}/>
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/* ── Horizontal Bar ── */
function HBar({ label, value, total, display }) {
  const pct = total > 0 ? Math.max((value / total) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:12 }}>
        <span style={{ color:"var(--ap-text)", fontWeight:500 }}>{label}</span>
        <span style={{ color:"var(--ap-purple-lt)", fontWeight:700 }}>{display || value}</span>
      </div>
      <div style={{ height:8, background:"rgba(255,255,255,0.05)", borderRadius:100, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:"var(--ap-purple)", borderRadius:100, transition:"width 0.5s ease" }}/>
      </div>
    </div>
  );
}

export default function AnalyticsSection() {
  const [loading,  setLoading]  = useState(true);
  const [orders,   setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [users,    setUsers]    = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pS, oS, uS] = await Promise.allSettled([
          getDocs(collection(db,"Products")),
          getDocs(query(collection(db,"orders"), orderBy("createdAt","desc"), limit(400))),
          getDocs(collection(db,"users")),
        ]);
        if (!alive) return;
        setProducts(pS.status==="fulfilled" ? pS.value.docs.map(d=>({id:d.id,...d.data()})) : []);
        setOrders(oS.status==="fulfilled"   ? oS.value.docs.map(d=>({id:d.id,...d.data()}))   : []);
        setUsers(uS.status==="fulfilled"    ? uS.value.docs.map(d=>({id:d.id,...d.data()}))    : []);
      } catch(e) { console.error(e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const daily14   = useMemo(() => buildDailySeries(orders, 14), [orders]);
  const heatmap84 = useMemo(() => build84DaySeries(orders), [orders]);

  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((s,o) => s+orderTotal(o), 0);
    const totalUnits   = orders.reduce((s,o) => s+(o.items||[]).reduce((ss,i)=>ss+Number(i?.qty||0),0), 0);
    const sellers      = users.filter(u => ["shop_admin","seller"].includes(String(u.role||"").toLowerCase()));
    const customers    = users.filter(u => !["admin","super_admin","shop_admin","seller"].includes(String(u.role||"").toLowerCase()));
    const inStock      = products.filter(p => p.inStock !== false).length;
    return {
      totalRevenue, totalOrders:orders.length, totalUnits,
      avgOrder: orders.length ? totalRevenue / orders.length : 0,
      totalProducts:products.length, inStock,
      sellers:sellers.length, customers:customers.length,
    };
  }, [orders, products, users]);

  const topProducts = useMemo(() => {
    const map = new Map();
    for (const o of orders) for (const item of (o.items||[])) {
      const id = item?.id || item?.name || "";
      if (!id) continue;
      if (!map.has(id)) map.set(id, { name:item?.name||"Item", revenue:0, units:0 });
      const r = map.get(id); r.units += Number(item?.qty||0); r.revenue += Number(item?.price||0)*Number(item?.qty||0);
    }
    return Array.from(map.values()).sort((a,b)=>b.revenue-a.revenue).slice(0,6);
  }, [orders]);

  const shopPerf = useMemo(() => {
    const map = new Map();
    for (const o of orders) for (const item of (o.items||[])) {
      const s = String(item?.shop||"unknown").toLowerCase();
      if (!map.has(s)) map.set(s, { label:s.replace(/[-_]/g," ").replace(/\b\w/g,c=>c.toUpperCase()), revenue:0 });
      map.get(s).revenue += Number(item?.price||0)*Number(item?.qty||0);
    }
    return Array.from(map.values()).sort((a,b)=>b.revenue-a.revenue).slice(0,6);
  }, [orders]);

  const topProdMax = Math.max(...topProducts.map(p=>p.revenue), 1);
  const shopRevMax = Math.max(...shopPerf.map(s=>s.revenue), 1);

  const STATS = [
    { label:"Total Revenue",   value:fmt(metrics.totalRevenue),    sub:`Avg ${fmt(metrics.avgOrder)} per order` },
    { label:"Total Orders",    value:metrics.totalOrders,          sub:`${metrics.totalUnits} units` },
    { label:"Products",        value:metrics.totalProducts,        sub:`${metrics.inStock} in stock` },
    { label:"Customers",       value:metrics.customers,            sub:`${metrics.sellers} sellers` },
  ];

  return (
    <div>
      <div className="ap-page-header">
        <div className="ap-page-title">Analytics</div>
        <div className="ap-page-sub">Revenue, orders, activity, and catalog performance</div>
      </div>

      {/* Stats */}
      <div className="ap-stats-grid" style={{ marginBottom:20 }}>
        {STATS.map(s => (
          <div key={s.label} className={`ap-stat${loading?" ap-stat--skeleton":""}`}>
            <div className="ap-stat-label">{s.label}</div>
            {!loading && <><div className="ap-stat-value">{typeof s.value==="number"?s.value.toLocaleString():s.value}</div><div className="ap-stat-sub">{s.sub}</div></>}
          </div>
        ))}
      </div>

      {/* Line charts */}
      <div className="ap-body-grid" style={{ marginBottom:16 }}>
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Revenue — 14 days</span><span className="ap-card-sub">{fmt(metrics.totalRevenue)} total</span></div>
          <div className="ap-card-body">
            {loading ? <div className="ap-skeleton" style={{height:160}}/> : (
              <LineChart data={daily14} valueKey="revenue" formatVal={v => `GHS ${Number(v).toFixed(0)}`}/>
            )}
          </div>
        </div>
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Orders — 14 days</span><span className="ap-card-sub">{metrics.totalOrders} total</span></div>
          <div className="ap-card-body">
            {loading ? <div className="ap-skeleton" style={{height:160}}/> : (
              <LineChart data={daily14} valueKey="orders" colorStroke="#6366f1" colorFill="rgba(99,102,241,0.12)" formatVal={v => `${v} orders`}/>
            )}
          </div>
        </div>
      </div>

      {/* Calendar heatmap */}
      <div className="ap-card" style={{ marginBottom:16 }}>
        <div className="ap-card-head"><span className="ap-card-title">Order Activity — 84 days</span><span className="ap-card-sub">Daily heatmap</span></div>
        <div className="ap-card-body">
          {loading ? <div className="ap-skeleton" style={{height:120}}/> : <CalendarHeatmap series={heatmap84}/>}
        </div>
      </div>

      {/* Performance bars */}
      <div className="ap-body-grid">
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Top Products</span><span className="ap-card-sub">By revenue</span></div>
          <div className="ap-card-body">
            {loading ? <div className="ap-skeleton" style={{height:180}}/> :
            topProducts.length === 0 ? <div className="ap-empty"><div className="ap-empty-title">No data yet</div></div> :
            topProducts.map((p,i) => (
              <HBar key={i} label={p.name} value={p.revenue} total={topProdMax} display={fmt(p.revenue)}/>
            ))}
          </div>
        </div>
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Store Performance</span><span className="ap-card-sub">Revenue by store</span></div>
          <div className="ap-card-body">
            {loading ? <div className="ap-skeleton" style={{height:180}}/> :
            shopPerf.length === 0 ? <div className="ap-empty"><div className="ap-empty-title">No data yet</div></div> :
            shopPerf.map((s,i) => (
              <HBar key={i} label={s.label} value={s.revenue} total={shopRevMax} display={fmt(s.revenue)}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
