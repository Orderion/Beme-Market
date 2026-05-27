import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "../../../firebase";

function Ico({ d, size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{d.split(" | ").map((seg, i) => <path key={i} d={seg}/>)}</svg>;
}

function toMs(v) { if (!v) return 0; if (typeof v?.toMillis === "function") return v.toMillis(); if (typeof v?.seconds === "number") return v.seconds * 1000; return 0; }
function fmt(n) { n = Number(n || 0); if (n >= 1e6) return `GHS ${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `GHS ${(n/1e3).toFixed(1)}k`; return `GHS ${n.toFixed(2)}`; }
function orderTotal(o) { const d = o.total ?? o.amount ?? o.orderTotal ?? o.subtotal ?? o.grandTotal ?? o.pricing?.total; if (Number.isFinite(Number(d))) return Number(d); return (o.items||[]).reduce((s,i) => s + Number(i?.price||0)*Number(i?.qty||0), 0); }

function buildDailySeries(orders, days = 14) {
  const today = new Date(); const map = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    map.set(k, { key: k, label: d.toLocaleDateString(undefined, { month:"short", day:"numeric" }), orders: 0, revenue: 0 });
  }
  for (const o of orders) {
    const k = (toMs(o.createdAt||o.timestamp) ? new Date(toMs(o.createdAt||o.timestamp)) : new Date()).toISOString().slice(0,10);
    if (map.has(k)) { const r = map.get(k); r.orders++; r.revenue += orderTotal(o); }
  }
  return Array.from(map.values());
}

function MiniBar({ series, valueKey, formatVal, color = "var(--ap-purple)" }) {
  const max = Math.max(...series.map(s => s[valueKey]), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:80 }}>
      {series.map(s => (
        <div key={s.key} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, height:"100%" }} title={`${s.label}: ${formatVal(s[valueKey])}`}>
          <div style={{ flex:1, width:"100%", background:"rgba(255,255,255,0.05)", borderRadius:"3px 3px 0 0", display:"flex", alignItems:"flex-end", overflow:"hidden" }}>
            <div style={{ width:"100%", background:color, height:`${Math.max((s[valueKey]/max)*100, s[valueKey]>0?3:0)}%`, borderRadius:"3px 3px 0 0", minHeight:2, opacity:0.85, transition:"height 0.4s" }}/>
          </div>
          <span style={{ fontSize:9, color:"var(--ap-muted)", whiteSpace:"nowrap" }}>{s.label.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsSection() {
  const [loading, setLoading] = useState(true);
  const [orders,   setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [users,    setUsers]    = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pSnap, oSnap, uSnap] = await Promise.allSettled([
          getDocs(collection(db, "Products")),
          getDocs(query(collection(db, "orders"), orderBy("createdAt","desc"), limit(300))),
          getDocs(collection(db, "users")),
        ]);
        if (!alive) return;
        setProducts(pSnap.status==="fulfilled" ? pSnap.value.docs.map(d=>({id:d.id,...d.data()})) : []);
        setOrders(oSnap.status==="fulfilled"   ? oSnap.value.docs.map(d=>({id:d.id,...d.data()}))   : []);
        setUsers(uSnap.status==="fulfilled"    ? uSnap.value.docs.map(d=>({id:d.id,...d.data()}))    : []);
      } catch(e) { console.error(e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const daily14 = useMemo(() => buildDailySeries(orders, 14), [orders]);
  const daily7  = useMemo(() => buildDailySeries(orders, 7),  [orders]);

  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((s,o) => s+orderTotal(o), 0);
    const totalUnits   = orders.reduce((s,o) => s+(o.items||[]).reduce((ss,i) => ss+Number(i?.qty||0),0), 0);
    const sellers   = users.filter(u => ["shop_admin","seller"].includes(String(u.role||"").toLowerCase()));
    const customers = users.filter(u => !["admin","super_admin","shop_admin","seller"].includes(String(u.role||"").toLowerCase()));
    const inStock   = products.filter(p => p.inStock !== false).length;
    const featured  = products.filter(p => !!p.featured).length;
    return { totalRevenue, totalOrders:orders.length, totalUnits, avgOrder:orders.length?totalRevenue/orders.length:0,
             totalProducts:products.length, inStock, featured, sellers:sellers.length, customers:customers.length,
             stockHealth: products.length ? Math.round((inStock/products.length)*100) : 0 };
  }, [orders, products, users]);

  const topProducts = useMemo(() => {
    const map = new Map();
    for (const o of orders) for (const item of (o.items||[])) {
      const id = item?.id || item?.productId || item?.name || "";
      if (!id) continue;
      if (!map.has(id)) map.set(id, { id, name:item?.name||"Item", units:0, revenue:0 });
      const r = map.get(id); r.units += Number(item?.qty||0); r.revenue += Number(item?.price||0)*Number(item?.qty||0);
    }
    return Array.from(map.values()).sort((a,b)=>b.revenue-a.revenue).slice(0,8);
  }, [orders]);

  const shopPerf = useMemo(() => {
    const map = new Map();
    for (const p of products) { const s = String(p.shop||"unknown").toLowerCase(); if (!map.has(s)) map.set(s,{key:s,label:s.replace(/[-_]/g," ").replace(/\b\w/g,c=>c.toUpperCase()),products:0,revenue:0}); map.get(s).products++; }
    for (const o of orders) for (const item of (o.items||[])) { const s = String(item?.shop||"unknown").toLowerCase(); if (!map.has(s)) map.set(s,{key:s,label:s.replace(/[-_]/g," ").replace(/\b\w/g,c=>c.toUpperCase()),products:0,revenue:0}); map.get(s).revenue += Number(item?.price||0)*Number(item?.qty||0); }
    return Array.from(map.values()).sort((a,b)=>b.revenue-a.revenue).slice(0,6);
  }, [products, orders]);

  const shopRevMax = Math.max(...shopPerf.map(s=>s.revenue), 1);
  const topProdMax = Math.max(...topProducts.map(p=>p.revenue), 1);

  const STAT_CARDS = [
    { label:"Total Revenue",    value:fmt(metrics.totalRevenue),    sub:`Avg order: ${fmt(metrics.avgOrder)}` },
    { label:"Total Orders",     value:metrics.totalOrders,          sub:`${metrics.totalUnits} units sold` },
    { label:"Total Products",   value:metrics.totalProducts,        sub:`${metrics.inStock} in stock · ${metrics.stockHealth}% health` },
    { label:"Customers",        value:metrics.customers,            sub:`${metrics.sellers} active sellers` },
    { label:"Featured Products",value:metrics.featured,             sub:"Highlighted in homepage" },
    { label:"Stock Health",     value:`${metrics.stockHealth}%`,    sub:"Products available" },
  ];

  return (
    <div>
      <div className="ap-page-header">
        <div className="ap-page-title">Analytics</div>
        <div className="ap-page-sub">Platform performance · Revenue, orders, users, stores</div>
      </div>

      <div className="ap-stats-grid">
        {STAT_CARDS.map(s => (
          <div className={`ap-stat${loading?" ap-stat--skeleton":""}`} key={s.label}>
            <div className="ap-stat-label">{s.label}</div>
            {!loading && <><div className="ap-stat-value">{typeof s.value==="number"?s.value.toLocaleString():s.value}</div><div className="ap-stat-sub">{s.sub}</div></>}
          </div>
        ))}
      </div>

      <div className="ap-body-grid" style={{ marginBottom:16 }}>
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">14-Day Revenue</span><span className="ap-card-sub">Trend</span></div>
          <div className="ap-card-body">
            {loading ? <div className="ap-skeleton" style={{height:80}}/> : <MiniBar series={daily14} valueKey="revenue" formatVal={fmt}/>}
          </div>
        </div>
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">14-Day Orders</span><span className="ap-card-sub">Volume</span></div>
          <div className="ap-card-body">
            {loading ? <div className="ap-skeleton" style={{height:80}}/> : <MiniBar series={daily14} valueKey="orders" formatVal={v=>`${v} orders`} color="var(--ap-purple-lt)"/>}
          </div>
        </div>

        {/* Store performance */}
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Store Performance</span><span className="ap-card-sub">Revenue by store</span></div>
          <div className="ap-card-body" style={{padding:"6px 0"}}>
            {loading ? [1,2,3].map(i=><div key={i} className="ap-skeleton" style={{height:38,margin:"8px 18px"}}/>) :
            shopPerf.map(s => (
              <div key={s.key} style={{padding:"10px 18px",borderBottom:"1px solid var(--ap-border2)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:600,color:"var(--ap-text)"}}>{s.label}</span>
                  <span style={{fontSize:13,color:"var(--ap-purple-lt)",fontWeight:700}}>{fmt(s.revenue)}</span>
                </div>
                <div style={{height:5,background:"rgba(255,255,255,0.05)",borderRadius:100,overflow:"hidden"}}>
                  <div style={{height:"100%",background:"var(--ap-purple)",borderRadius:100,width:`${Math.max((s.revenue/shopRevMax)*100,s.revenue>0?4:0)}%`,transition:"width 0.4s"}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="ap-card">
          <div className="ap-card-head"><span className="ap-card-title">Top Products</span><span className="ap-card-sub">By revenue</span></div>
          <div className="ap-card-body" style={{padding:"6px 0"}}>
            {loading ? [1,2,3].map(i=><div key={i} className="ap-skeleton" style={{height:38,margin:"8px 18px"}}/>) :
            topProducts.map((p,i) => (
              <div key={p.id} style={{padding:"10px 18px",borderBottom:"1px solid var(--ap-border2)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,gap:10}}>
                  <span style={{fontSize:13,fontWeight:500,color:"var(--ap-text)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i+1}. {p.name}</span>
                  <span style={{fontSize:12,color:"var(--ap-purple-lt)",fontWeight:700,flexShrink:0}}>{fmt(p.revenue)}</span>
                </div>
                <div style={{height:4,background:"rgba(255,255,255,0.05)",borderRadius:100,overflow:"hidden"}}>
                  <div style={{height:"100%",background:"var(--ap-purple-lt)",borderRadius:100,width:`${Math.max((p.revenue/topProdMax)*100,4)}%`,opacity:0.75}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
        {[
          {label:"Stock Health",value:`${metrics.stockHealth}%`,text:"Share of listed products available for purchase."},
          {label:"Catalog Depth",value:metrics.totalProducts,text:"Total products in your platform catalog."},
          {label:"Customer Activity",value:metrics.customers,text:"Registered non-admin users in your database."},
          {label:"Seller Activity",value:metrics.sellers,text:"Active store operators on the platform."},
        ].map(s=>(
          <div key={s.label} className="ap-card ap-card--p">
            <div style={{fontSize:10,fontWeight:700,color:"var(--ap-muted)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>{s.label}</div>
            <div style={{fontSize:28,fontWeight:800,color:"var(--ap-text)",letterSpacing:"-0.04em",lineHeight:1}}>{typeof s.value==="number"?s.value.toLocaleString():s.value}</div>
            <div style={{fontSize:12,color:"var(--ap-muted)",marginTop:8,lineHeight:1.5}}>{s.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
