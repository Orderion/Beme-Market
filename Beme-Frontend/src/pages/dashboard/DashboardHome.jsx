import { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";
import TutorialOverlay from "../../components/ai/TutorialOverlay";
import { TUTORIAL_STEPS } from "../../components/ai/tutorialSteps";
import { useTutorial } from "../../hooks/useTutorial";

function fmtMoney(n) {
  const v = Number(n || 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(2);
}
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}
function startOfWeek()      { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return Timestamp.fromDate(d); }
function startOfMonth()     { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return Timestamp.fromDate(d); }
function startOfLastMonth() { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); d.setMonth(d.getMonth() - 1); return Timestamp.fromDate(d); }
function pct(c, p)          { if (!p) return c > 0 ? 100 : 0; return Math.round(((c - p) / p) * 100); }
function initials(name)     { if (!name) return "?"; const p = name.trim().split(" "); return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase(); }

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUS_COLOR = { paid: "#22C55E", delivered: "#22C55E", processing: "#7c3aed", shipped: "#7C3AED", pending: "#F59E0B", cancelled: "#EF4444" };
const AVATAR_PAL   = ["#7c3aed", "#6d28d9", "#0891B2", "#d97706", "#EF4444", "#22C55E"];

function Ico({ d, size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  rev:  "M12 1v22|M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  ord:  "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  chk:  "M22 11.08V12a10 10 0 11-5.93-9.14|M22 4L12 14.01l-3-3",
  usr:  "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|M9 7a4 4 0 108 0 4 4 0 00-8 0",
  up:   "M18 15l-6-6-6 6",
  dn:   "M6 9l6 6 6-6",
  grid: "M3 3h7v7H3z|M14 3h7v7h-7z|M3 14h7v7H3z|M14 14h7v7h-7z",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9|M13.73 21a2 2 0 01-3.46 0",
  arr:  "M5 12h14|M12 5l7 7-7 7",
  plus: "M12 5v14|M5 12h14",
  pkg:  "M16.5 9.4l-9-5.19|M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z|M3.27 6.96L12 12.01l8.73-5.05|M12 22.08V12",
  chart:"M18 20V10|M12 20V4|M6 20v-6",
};

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const k = payload[0]?.dataKey;
  const v = payload[0]?.value;
  return (
    <div className="dh-tip">
      <div className="dh-tip-label">{label}</div>
      <div className="dh-tip-val">{k === "revenue" ? `GHS ${Number(v).toFixed(2)}` : `${v} orders`}</div>
    </div>
  );
}

export default function DashboardHome({ onNav }) {
  const { showTutorial, markSeen }          = useTutorial("home");
  const { user }                            = useAuth();
  const { shop, storeId, subscriptionPlan } = useSellerAuth();
  // Lightweight unread count — direct query, no hook dependency
  const [totalUnread, setTotalUnread] = useState(0);
  useEffect(() => {
    const sid = storeId || shop?.id;
    if (!sid) return;
    let alive = true;
    import("firebase/firestore").then(({ collection, query, where, getDocs }) => {
      getDocs(query(
        collection(db, "chats"),
        where("storeId",        "==",    sid),
        where("sellerUnread",   ">",     0)
      ))
      .then(snap => { if (alive) setTotalUnread(snap.size); })
      .catch(() => {});
    });
    return () => { alive = false; };
  }, [storeId, shop?.id]);
  const [orders,    setOrders]    = useState([]);
  const [lastOrds,  setLastOrds]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [chartMode, setChartMode] = useState("orders");
  const [showLauncher, setShowLauncher] = useState(false);
  const [tabVisits,    setTabVisits]    = useState(() => { try { return JSON.parse(localStorage.getItem("beme_tab_visits") || "{}"); } catch { return {}; } });

  useEffect(() => {
    const sid = storeId || shop?.id;
    if (!sid && !user?.uid) return;
    setLoading(true);
    const run = async () => {
      try {
        const snap = await getDocs(query(
          collection(db, "orders"),
          where("sellerId", "==", sid || user.uid),
          where("createdAt", ">=", startOfLastMonth()),
          orderBy("createdAt", "desc"),
          limit(200)
        ));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const ms  = startOfMonth().toMillis();
        const lms = startOfLastMonth().toMillis();
        setOrders(all.filter(o => (o.createdAt?.toMillis?.() || 0) >= ms));
        setLastOrds(all.filter(o => { const t = o.createdAt?.toMillis?.() || 0; return t >= lms && t < ms; }));
      } catch (e) { console.error("[DH]", e); }
      finally { setLoading(false); }
    };
    run();
  }, [storeId, shop?.id, user?.uid]);

  const m = useMemo(() => {
    const ws  = startOfWeek().toMillis();
    const lws = ws - 7 * 86400000;
    const wkO  = orders.filter(o => (o.createdAt?.toMillis?.() || 0) >= ws);
    const pwO  = lastOrds.filter(o => { const t = o.createdAt?.toMillis?.() || 0; return t >= lws && t < ws; });
    const rev  = orders.reduce((s, o) => s + Number(o.pricing?.total || 0), 0);
    const pRev = lastOrds.reduce((s, o) => s + Number(o.pricing?.total || 0), 0);
    const apr  = orders.filter(o => ["paid","delivered","processing","shipped"].includes(o.status));
    const pApr = lastOrds.filter(o => ["paid","delivered","processing","shipped"].includes(o.status));
    const custs  = new Set(orders.map(o => o.userId || o.customer?.email)).size;
    const pCusts = new Set(lastOrds.map(o => o.userId || o.customer?.email)).size;
    const today  = new Date();
    const bar    = Array.from({ length: 7 }, (_, i) => {
      const d  = new Date(today); d.setDate(today.getDate() - (6 - i)); d.setHours(0,0,0,0);
      const nx = new Date(d); nx.setDate(d.getDate() + 1);
      const slice = orders.filter(o => { const t = o.createdAt?.toMillis?.() || 0; return t >= d.getTime() && t < nx.getTime(); });
      return { day: DAY[d.getDay()], orders: slice.length, revenue: slice.reduce((s, o) => s + Number(o.pricing?.total || 0), 0) };
    });
    const recent = [...orders].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).slice(0, 5);
    const recentBuyers = [...new Map(recent.map(o => {
      const name = [o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(" ") || "Customer";
      return [name, { name, avatar: AVATAR_PAL[Math.abs(name.charCodeAt(0)) % AVATAR_PAL.length] }];
    })).values()].slice(0, 3);
    return { wkO: wkO.length, pwO: pwO.length, rev, pRev, apr: apr.length, pApr: pApr.length,
      custs, pCusts, total: orders.length, avg: orders.length ? rev / orders.length : 0, bar, recent, recentBuyers };
  }, [orders, lastOrds]);


  const goTo = (tab) => {
    const updated = { ...tabVisits, [tab]: (tabVisits[tab] || 0) + 1 };
    setTabVisits(updated);
    try { localStorage.setItem("beme_tab_visits", JSON.stringify(updated)); } catch {}
    setShowLauncher(false);
    if (onNav) onNav(tab);
  };

  const shopName = shop?.shopName || shop?.storeName || "Your Store";
  const firstName = shopName.split(" ")[0];
  const revUp = pct(m.rev, m.pRev);

  return (
    <div className="dh-root">

      {/* ══ HERO CARD ══ */}
      <div className="dh-hero">
        <div className="dh-hero-top">
          <div>
            <div className="dh-greeting">Hi {firstName}! Welcome</div>
            <div className="dh-subgreet">to your store</div>
          </div>
          <div className="dh-hero-icons">
            {/* ── Grid launcher ── */}
            <div className="dh-hero-icon dh-launcher-btn" onClick={() => setShowLauncher(v => !v)}
              title="All pages">
              <Ico d={IC.grid} size={15} color="var(--sd-muted)"/>
            </div>
            {/* ── Bell (messages only, no click action) ── */}
            <div className="dh-hero-icon dh-bell-wrap" style={{ position:"relative" }}>
              <Ico d={IC.bell} size={15} color="var(--sd-muted)"/>
              {totalUnread > 0 && (
                <span className="dh-bell-badge">{totalUnread > 9 ? "9+" : totalUnread}</span>
              )}
              <div className="dh-bell-tooltip">
                {totalUnread > 0
                  ? `${totalUnread} message${totalUnread !== 1 ? "s" : ""} received`
                  : "No new messages"}
              </div>
            </div>
          </div>
        </div>

        <div className="dh-currency-pill">
          <div className="dh-currency-dot"/>
          GHS
        </div>

        {loading
          ? <div className="dh-skel" style={{ height:44, width:"60%", marginBottom:10 }}/>
          : (
            <div className="dh-hero-amount">
              GHS {fmtMoney(m.rev)}
              <span className="dh-hero-cents">.00</span>
            </div>
          )
        }

        {!loading && (
          <div className="dh-trend-pill" style={{ color: revUp >= 0 ? "#15803d" : "#dc2626", background: revUp >= 0 ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)" }}>
            <Ico d={revUp >= 0 ? IC.up : IC.dn} size={11} color={revUp >= 0 ? "#15803d" : "#dc2626"}/>
            {revUp >= 0 ? "+" : ""}{revUp}% this month
          </div>
        )}

        <div className="dh-hero-actions">
          <button className="dh-action-btn" onClick={() => goTo("products")}>
            <Ico d={IC.pkg} size={14} color="var(--sd-text)"/> Products
          </button>
          <button className="dh-action-center" onClick={() => goTo("analytics")}>
            <Ico d={IC.chart} size={17} color="#fff"/>
          </button>
          <button className="dh-action-btn" onClick={() => goTo("orders")}>
            <Ico d={IC.ord} size={14} color="var(--sd-text)"/> Orders
          </button>
        </div>
      </div>

      {/* ══ 2-col lower row ══ */}
      <div className="dh-lower-row">

        <div className="dh-card">
          <div className="dh-card-label">Recent buyers</div>
          <div className="dh-buyers-grid">
            {loading
              ? [0,1,2].map(i => <div key={i} className="dh-buyer-cell"><div className="dh-skel" style={{ width:42,height:42,borderRadius:12 }}/><div className="dh-skel" style={{ height:9,width:32,marginTop:4 }}/></div>)
              : m.recentBuyers.length === 0
                ? [{ name:"—", avatar:"#9ca3af" },{ name:"—", avatar:"#9ca3af" }].map((b,i) => (
                    <div key={i} className="dh-buyer-cell">
                      <div className="dh-buyer-av" style={{ background: b.avatar }}>{b.name[0]}</div>
                      <div className="dh-buyer-name">{b.name}</div>
                    </div>
                  ))
                : m.recentBuyers.map((b, i) => (
                    <div key={i} className="dh-buyer-cell">
                      <div className="dh-buyer-av" style={{ background: b.avatar }}>{initials(b.name)}</div>
                      <div className="dh-buyer-name">{b.name.split(" ")[0]}</div>
                    </div>
                  ))
            }
            <div className="dh-buyer-cell">
              <div className="dh-buyer-add"><Ico d={IC.plus} size={14} color="var(--sd-muted)"/></div>
              <div className="dh-buyer-name">More</div>
            </div>
          </div>
        </div>

        <div className="dh-card dh-income-card">
          <div className="dh-card-label">This month</div>
          {loading
            ? <div className="dh-skel" style={{ height:60, marginBottom:8 }}/>
            : (
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={m.bar} margin={{ top:2, right:0, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2}
                    fill="url(#incGrad)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            )
          }
          <div className="dh-income-bottom">
            <span className="dh-income-amount">GHS {fmtMoney(m.rev)}</span>
            <span className="dh-income-pill" style={{ color: revUp >= 0 ? "#15803d" : "#dc2626", background: revUp >= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)" }}>
              <Ico d={revUp >= 0 ? IC.up : IC.dn} size={9} color={revUp >= 0 ? "#15803d" : "#dc2626"}/>
              {revUp >= 0 ? "+" : ""}{revUp}%
            </span>
          </div>
          <div className="dh-income-sub">Revenue</div>
        </div>
      </div>

      {/* ══ Metric strips row ══ */}
      <div className="dh-strips">
        {[
          { label:"Orders (week)",  val: m.wkO,                    color:"#7c3aed" },
          { label:"Approved",       val: m.apr,                     color:"#22C55E" },
          { label:"Customers",      val: m.custs,                   color:"#F59E0B" },
          { label:"Avg. order",     val: `GHS ${fmtMoney(m.avg)}`,  color:"#7c3aed" },
        ].map(s => (
          <div key={s.label} className="dh-strip">
            <div className="dh-strip-label">{s.label}</div>
            {loading
              ? <div className="dh-skel" style={{ height:18, width:"60%", marginTop:4 }}/>
              : <div className="dh-strip-val" style={{ color: s.color }}>{s.val}</div>
            }
          </div>
        ))}
      </div>

      {/* ══ Bar chart panel ══ */}
      <div className="dh-panel">
        <div className="dh-panel-head">
          <span className="dh-panel-title">{chartMode === "orders" ? "Orders" : "Revenue"} — last 7 days</span>
          <div className="dh-tabs">
            {[{v:"orders",l:"Orders"},{v:"revenue",l:"Revenue"}].map(o => (
              <button key={o.v} type="button" onClick={() => setChartMode(o.v)}
                className={`dh-tab${chartMode === o.v ? " dh-tab--active" : ""}`}>{o.l}</button>
            ))}
          </div>
        </div>
        {loading
          ? <div className="dh-skel" style={{ height:140 }}/>
          : m.bar.every(d => (chartMode === "orders" ? d.orders : d.revenue) === 0)
            ? <div className="dh-empty-chart">No data this week yet</div>
            : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={m.bar} barSize={22}>
                  <XAxis dataKey="day" tick={{ fontSize:11, fill:"var(--sd-muted)", fontFamily:"inherit" }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:11, fill:"var(--sd-muted)" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>} cursor={{ fill:"var(--sd-accent-dim)" }}/>
                  <Bar dataKey={chartMode} radius={[6,6,0,0]} fill="var(--sd-accent)"/>
                </BarChart>
              </ResponsiveContainer>
            )
        }
      </div>

      {/* ══ Recent activity panel ══ */}
      <div className="dh-panel">
        <div className="dh-panel-head">
          <span className="dh-panel-title">Recent Activity</span>
          <div className="dh-panel-arrow"><Ico d={IC.arr} size={13} color="var(--sd-muted)"/></div>
        </div>

        {loading
          ? [1,2,3].map(i => (
              <div key={i} className="dh-order-row">
                <div className="dh-skel" style={{ width:36,height:36,borderRadius:10,flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div className="dh-skel" style={{ height:11,width:"55%",marginBottom:5 }}/>
                  <div className="dh-skel" style={{ height:9,width:"35%" }}/>
                </div>
              </div>
            ))
          : m.recent.length === 0
            ? (
              <div className="dh-empty-orders">
                <div className="dh-empty-title">No orders yet</div>
                <div className="dh-empty-sub">Your first order will appear here.</div>
              </div>
            )
            : m.recent.map((o, i) => {
                const cust = o.customer;
                const name = [cust?.firstName, cust?.lastName].filter(Boolean).join(" ") || "Customer";
                const ini  = initials(name);
                const av   = AVATAR_PAL[i % AVATAR_PAL.length];
                const st   = o.status || "pending";
                const badge = st === "paid" || st === "delivered" ? "Completed"
                            : st === "pending" ? "New Order"
                            : st.charAt(0).toUpperCase() + st.slice(1);
                const isPos = ["paid","delivered","processing","shipped"].includes(st);
                return (
                  <div key={o.id} className="dh-order-row"
                    style={{ borderBottom: i < m.recent.length - 1 ? "1px solid var(--sd-border-light)" : "none" }}>
                    <div className="dh-order-av" style={{ background: av }}>{ini}</div>
                    <div className="dh-order-info">
                      <div className="dh-order-name">{name}</div>
                      <div className="dh-order-date">{fmtDate(o.createdAt)}</div>
                    </div>
                    <div className="dh-order-right">
                      <div className="dh-order-amt" style={{ color: isPos ? "#15803d" : "#dc2626" }}>
                        {isPos ? "+" : ""}GHS {Number(o.pricing?.total || 0).toFixed(2)}
                      </div>
                      <div className="dh-order-badge"
                        style={{ background:`${STATUS_COLOR[st]||"#9CA3AF"}18`, color:STATUS_COLOR[st]||"var(--sd-muted)" }}>
                        {badge}
                      </div>
                    </div>
                  </div>
                );
              })
        }
      </div>

      {!loading && m.total === 0 && (
        <div className="dh-hint">
          <div className="dh-hint-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <div>
            <div className="dh-hint-title">Your store is live — start listing products!</div>
            <div className="dh-hint-sub">Go to <strong>Products</strong> to add your first product.</div>
          </div>
        </div>
      )}

      {showTutorial && (
        <TutorialOverlay steps={TUTORIAL_STEPS.home} onFinish={markSeen} pageTitle="Dashboard Home"/>
      )}


      {/* ══ APP LAUNCHER OVERLAY ══ */}
      {showLauncher && (
        <div className="dh-launcher-overlay" onClick={() => setShowLauncher(false)}/>
      )}
      {showLauncher && (
        <div className="dh-launcher">
          <div className="dh-launcher-title">Your favorites</div>
          <div className="dh-launcher-grid">
            {(() => {
              const ALL_PAGES = [
                { tab:"home",         label:"Home",        ic:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z|M9 22V12h6v10",                   color:"#7c3aed" },
                { tab:"products",     label:"Products",    ic:"M16.5 9.4l-9-5.19|M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z|M3.27 6.96L12 12.01l8.73-5.05|M12 22.08V12", color:"#0891B2" },
                { tab:"orders",       label:"Orders",      ic:"M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z", color:"#F59E0B" },
                { tab:"analytics",    label:"Analytics",   ic:"M18 20V10|M12 20V4|M6 20v-6",                                                    color:"#7c3aed" },
                { tab:"customers",    label:"Customers",   ic:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|M9 7a4 4 0 108 0 4 4 0 00-8 0|M23 21v-2a4 4 0 00-3-3.87|M16 3.13a4 4 0 010 7.75", color:"#22C55E" },
                { tab:"marketing",    label:"Marketing",   ic:"M22 12h-4l-3 9L9 3l-3 9H2",                                                      color:"#EF4444" },
                { tab:"chat",         label:"Messages",    ic:"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",                      color:"#0891B2", badge: totalUnread },
                { tab:"withdrawals",  label:"Withdrawals", ic:"M12 1v22|M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",                        color:"#22C55E" },
                { tab:"settings",     label:"Settings",    ic:"M12 20a8 8 0 100-16 8 8 0 000 16z|M12 14a2 2 0 100-4 2 2 0 000 4z",             color:"#6B7280" },
                { tab:"subscription", label:"Subscription",ic:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", color:"#F59E0B" },
                { tab:"delivery",     label:"Delivery",    ic:"M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3m-4 12a2 2 0 104 0 2 2 0 00-4 0|M13 11l9 2-2 2-2 4-5-8z", color:"#7c3aed" },
                { tab:"appearance",   label:"Store Design",ic:"M12 20h9|M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",               color:"#0891B2" },
              ];
              // Sort by most visited — stable sort keeps original order for ties
              const sorted = [...ALL_PAGES].sort((a, b) =>
                (tabVisits[b.tab] || 0) - (tabVisits[a.tab] || 0)
              );
              return sorted.map(pg => (
                <button key={pg.tab} className="dh-launcher-item" onClick={() => goTo(pg.tab)}>
                  <div className="dh-launcher-ic" style={{ background: `${pg.color}18`, color: pg.color }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {pg.ic.split("|").map((seg, i) => <path key={i} d={seg}/>)}
                    </svg>
                    {pg.badge > 0 && <span className="dh-launcher-badge">{pg.badge > 9 ? "9+" : pg.badge}</span>}
                  </div>
                  <span className="dh-launcher-label">{pg.label}</span>
                </button>
              ));
            })()}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dh-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: calc(600px + 100%) 0; }
        }
        @keyframes dh-pulse {
          0%,100% { opacity:1; } 50% { opacity:0.4; }
        }

        .dh-root {
          font-family: var(--sd-font,'DM Sans',system-ui,sans-serif);
          background: var(--sd-bg);
          color: var(--sd-text);
          min-height: 100%;
          padding-bottom: 24px;
        }

        /* ── Hero card ── */
        .dh-hero {
          background: var(--sd-white);
          border-radius: 22px;
          border: 1px solid var(--sd-border);
          box-shadow: var(--sd-shadow);
          padding: 22px 22px 18px;
          margin-bottom: 12px;
          transition: background 0.25s, border-color 0.25s;
        }
        .dh-hero-top {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 18px;
        }
        .dh-greeting    { font-size: 14px; color: var(--sd-muted); font-weight: 500; }
        .dh-subgreet    { font-size: 17px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; margin-top: 2px; }
        .dh-hero-icons  { display: flex; gap: 8px; }
        .dh-hero-icon   {
          width: 34px; height: 34px; border-radius: 50%;
          border: 1px solid var(--sd-border);
          background: var(--sd-bg);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s;
        }
        .dh-hero-icon:hover { background: var(--sd-border-light); }

        .dh-currency-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--sd-bg);
          border: 1px solid var(--sd-border);
          border-radius: 100px; padding: 4px 12px;
          font-size: 12px; font-weight: 700; color: var(--sd-muted);
          margin-bottom: 10px;
        }
        .dh-currency-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--sd-accent);
        }

        .dh-hero-amount {
          font-size: 40px; font-weight: 900; color: var(--sd-text);
          letter-spacing: -0.05em; line-height: 1;
        }
        .dh-hero-cents {
          font-size: 22px; font-weight: 500; color: var(--sd-muted); margin-left: 2px;
        }

        .dh-trend-pill {
          display: inline-flex; align-items: center; gap: 5px;
          border-radius: 100px; padding: 5px 12px;
          font-size: 12px; font-weight: 700; margin-top: 10px;
        }

        .dh-hero-actions {
          display: grid; grid-template-columns: 1fr 44px 1fr;
          gap: 8px; margin-top: 18px; align-items: center;
        }
        .dh-action-btn {
          height: 42px; border-radius: 100px;
          border: 1px solid var(--sd-border);
          background: var(--sd-bg);
          color: var(--sd-text);
          font-size: 13px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          cursor: pointer; font-family: inherit;
          transition: background 0.15s;
        }
        .dh-action-btn:hover { background: var(--sd-border-light); }
        .dh-action-center {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--sd-accent);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(124,58,237,0.35);
        }

        /* ── Lower 2-col row ── */
        .dh-lower-row {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; margin-bottom: 10px;
        }
        .dh-card {
          background: var(--sd-white);
          border-radius: 16px;
          border: 1px solid var(--sd-border);
          box-shadow: var(--sd-shadow);
          padding: 16px;
          transition: background 0.25s, border-color 0.25s;
        }
        .dh-card-label {
          font-size: 11px; font-weight: 700; color: var(--sd-muted);
          text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 12px;
        }

        /* Buyers grid */
        .dh-buyers-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        }
        .dh-buyer-cell  { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .dh-buyer-av    {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: #fff;
        }
        .dh-buyer-name  { font-size: 10px; color: var(--sd-muted); text-align: center; line-height: 1.2; }
        .dh-buyer-add   {
          width: 42px; height: 42px; border-radius: 12px;
          border: 1px solid var(--sd-border);
          background: var(--sd-bg);
          display: flex; align-items: center; justify-content: center;
        }

        /* Income card */
        .dh-income-card { display: flex; flex-direction: column; }
        .dh-income-bottom {
          display: flex; align-items: center; gap: 6px; margin-top: 6px;
        }
        .dh-income-amount {
          font-size: 16px; font-weight: 900; color: var(--sd-text); letter-spacing: -0.03em;
        }
        .dh-income-pill {
          display: inline-flex; align-items: center; gap: 3px;
          border-radius: 100px; padding: 2px 7px;
          font-size: 10px; font-weight: 700;
        }
        .dh-income-sub { font-size: 11px; color: var(--sd-muted); margin-top: 2px; }

        /* ── Metric strips ── */
        .dh-strips {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 8px; margin-bottom: 12px;
        }
        .dh-strip {
          background: var(--sd-white);
          border-radius: 12px;
          border: 1px solid var(--sd-border);
          box-shadow: var(--sd-shadow);
          padding: 12px 14px;
          transition: background 0.25s, border-color 0.25s;
        }
        .dh-strip-label {
          font-size: 10px; font-weight: 700; color: var(--sd-muted);
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .dh-strip-val {
          font-size: 20px; font-weight: 900; letter-spacing: -0.03em;
          line-height: 1.2; margin-top: 4px;
        }

        /* ── Panel (chart + orders) ── */
        .dh-panel {
          background: var(--sd-white);
          border-radius: 16px;
          border: 1px solid var(--sd-border);
          box-shadow: var(--sd-shadow);
          padding: 18px 18px 14px;
          margin-bottom: 12px;
          transition: background 0.25s, border-color 0.25s;
        }
        .dh-panel-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }
        .dh-panel-title {
          font-size: 14px; font-weight: 800; color: var(--sd-text);
        }
        .dh-panel-arrow { cursor: pointer; }

        /* Tabs */
        .dh-tabs {
          display: flex; background: var(--sd-border-light);
          border-radius: 100px; padding: 3px;
          border: 1px solid var(--sd-border);
        }
        .dh-tab {
          padding: 4px 11px; border-radius: 100px; border: none;
          background: transparent; color: var(--sd-muted);
          font-size: 11px; font-weight: 700; cursor: pointer;
          transition: all 0.15s; font-family: inherit;
        }
        .dh-tab--active {
          background: var(--sd-accent);
          color: #fff;
          box-shadow: 0 1px 3px rgba(124,58,237,0.35);
        }

        .dh-empty-chart {
          height: 140px; display: flex; align-items: center; justify-content: center;
          font-size: 13px; color: var(--sd-muted); font-weight: 600;
        }

        /* Chart tooltip */
        .dh-tip {
          background: var(--sd-white); border: 1px solid var(--sd-border);
          border-radius: 10px; padding: 9px 13px; font-size: 12px; font-weight: 600;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        .dh-tip-label { color: var(--sd-muted); margin-bottom: 3px; }
        .dh-tip-val   { color: var(--sd-text); }

        /* Order rows */
        .dh-order-row {
          display: flex; align-items: center; gap: 11px; padding: 10px 0;
        }
        .dh-order-av {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: #fff;
        }
        .dh-order-info  { flex: 1; min-width: 0; }
        .dh-order-name  {
          font-size: 13px; font-weight: 700; color: var(--sd-text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dh-order-date  { font-size: 11px; color: var(--sd-muted); margin-top: 1px; }
        .dh-order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .dh-order-amt   { font-size: 13px; font-weight: 800; }
        .dh-order-badge {
          padding: 3px 9px; border-radius: 100px;
          font-size: 10px; font-weight: 700; white-space: nowrap;
        }

        .dh-empty-orders { text-align: center; padding: 24px 0; }
        .dh-empty-title  { font-size: 13px; color: var(--sd-muted); font-weight: 600; }
        .dh-empty-sub    { font-size: 12px; color: var(--sd-muted); margin-top: 3px; }

        /* Hint */
        .dh-hint {
          padding: 14px 16px; border-radius: 12px;
          background: var(--sd-accent-dim); border: 1px solid var(--sd-accent-border);
          display: flex; align-items: center; gap: 12px;
        }
        .dh-hint-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          background: var(--sd-border-light);
          display: flex; align-items: center; justify-content: center;
          color: var(--sd-text);
        }
        .dh-hint-title { font-size: 13px; font-weight: 800; color: var(--sd-text); }
        .dh-hint-sub   { font-size: 12px; color: var(--sd-muted); margin-top: 2px; }
        .dh-hint-sub strong { color: var(--sd-text); }

        /* Skeleton */
        .dh-skel {
          border-radius: 6px; background: var(--sd-border-light);
          background-image: linear-gradient(90deg, var(--sd-border-light) 25%, var(--sd-border) 50%, var(--sd-border-light) 75%);
          background-size: 600px 100%;
          animation: dh-shimmer 1.4s ease infinite;
        }


        /* ══ App Launcher ══ */
        .dh-launcher-overlay {
          position: fixed; inset: 0; z-index: 98;
        }
        .dh-launcher {
          position: absolute; top: 48px; right: 0;
          z-index: 99;
          background: var(--sd-white);
          border: 1px solid var(--sd-border);
          border-radius: 18px;
          padding: 18px 16px 16px;
          width: 260px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.14);
          animation: dh-launcher-in 0.18s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes dh-launcher-in {
          from { opacity:0; transform:scale(0.88) translateY(-8px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        .dh-launcher-title {
          font-size: 13px; font-weight: 800; color: var(--sd-text);
          margin-bottom: 14px; letter-spacing: -0.01em;
        }
        .dh-launcher-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .dh-launcher-item {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; padding: 10px 4px; border-radius: 12px;
          border: none; background: transparent; cursor: pointer;
          transition: background 0.13s;
          font-family: inherit;
        }
        .dh-launcher-item:hover { background: var(--sd-bg); }
        .dh-launcher-ic {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          position: relative; flex-shrink: 0;
          transition: transform 0.13s;
        }
        .dh-launcher-item:hover .dh-launcher-ic { transform: scale(1.08); }
        .dh-launcher-label {
          font-size: 10px; font-weight: 700; color: var(--sd-muted);
          text-align: center; line-height: 1.2; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; max-width: 64px;
        }
        .dh-launcher-badge {
          position: absolute; top: -4px; right: -4px;
          background: #EF4444; color: #fff;
          font-size: 9px; font-weight: 900; min-width: 16px; height: 16px;
          border-radius: 100px; padding: 0 4px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid var(--sd-white);
        }
        .dh-launcher-btn { position: relative; }

        /* ══ Bell notification ══ */
        .dh-bell-wrap {
          cursor: default !important;
          position: relative;
        }
        .dh-bell-badge {
          position: absolute; top: -4px; right: -4px;
          background: #EF4444; color: #fff;
          font-size: 9px; font-weight: 900; min-width: 16px; height: 16px;
          border-radius: 100px; padding: 0 4px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid var(--sd-white);
          animation: dh-pulse 2s ease-in-out infinite;
          pointer-events: none;
        }
        .dh-bell-tooltip {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: var(--sd-text); color: var(--sd-bg);
          font-size: 11px; font-weight: 700;
          padding: 6px 11px; border-radius: 8px;
          white-space: nowrap; pointer-events: none;
          opacity: 0; transform: translateY(-4px);
          transition: opacity 0.15s, transform 0.15s;
          z-index: 100;
        }
        .dh-bell-tooltip::before {
          content: "";
          position: absolute; bottom: 100%; right: 10px;
          border: 5px solid transparent;
          border-bottom-color: var(--sd-text);
        }
        .dh-bell-wrap:hover .dh-bell-tooltip {
          opacity: 1; transform: translateY(0);
        }
        .dh-bell-wrap:hover { background: var(--sd-bg); }

        /* hero-icons container needs relative for launcher positioning */
        .dh-hero-icons { position: relative; }

        /* Make action center a button */
        button.dh-action-center {
          border: none; cursor: pointer;
          font-family: inherit;
          transition: opacity 0.15s, transform 0.12s;
        }
        button.dh-action-center:hover { opacity: 0.88; transform: scale(1.06); }
        button.dh-action-center:active { transform: scale(0.96); }
        .dh-action-btn:active { transform: scale(0.97); }

        /* Mobile */
        @media (max-width: 480px) {
          .dh-hero-amount { font-size: 32px; }
          .dh-hero-cents  { font-size: 18px; }
          .dh-strip-val   { font-size: 17px; }
        }
      `}</style>
    </div>
  );
}