import { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
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
const AVATAR_PAL   = ["#7c3aed", "#6d28d9", "#22C55E", "#F59E0B", "#EF4444", "#0891B2"];

function Ico({ d, size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  rev: "M12 1v22|M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  ord: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  chk: "M22 11.08V12a10 10 0 11-5.93-9.14|M22 4L12 14.01l-3-3",
  usr: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|M9 7a4 4 0 108 0 4 4 0 00-8 0|M23 21v-2a4 4 0 00-3-3.87|M16 3.13a4 4 0 010 7.75",
  arr: "M23 6L13.5 15.5 8.5 10.5 1 18|M17 6h6v6",
  up:  "M18 15l-6-6-6 6",
  dn:  "M6 9l6 6 6-6",
};

/* ── Metric card — fully theme-aware ── */
function MetricCard({ label, value, pctVal, icon, iconColor = "#7c3aed", loading }) {
  const up   = pctVal >= 0;
  const barW = Math.min(Math.abs(pctVal), 100);
  return (
    <div className="dh-metric-card">
      <div className="dh-metric-top">
        <span className="dh-metric-label">{label}</span>
        <div className="dh-metric-icon" style={{ background: `${iconColor}18`, color: iconColor }}>
          <Ico d={icon} size={14} color={iconColor} />
        </div>
      </div>

      {loading
        ? <div className="dh-skeleton" style={{ height: 34, width: "55%", marginBottom: 10 }} />
        : <div className="dh-metric-value">{value}</div>
      }

      <div className="dh-metric-bar-track">
        {!loading && (
          <div className="dh-metric-bar-fill"
            style={{ width: `${barW}%`, background: iconColor }} />
        )}
      </div>

      {!loading && (
        <div className="dh-metric-trend">
          <span className="dh-trend-pct" style={{ color: up ? "#22C55E" : "#EF4444" }}>
            <Ico d={up ? IC.up : IC.dn} size={10} color={up ? "#22C55E" : "#EF4444"} />
            {Math.abs(pctVal)}%
          </span>
          <span className="dh-trend-sub">vs last month</span>
        </div>
      )}
    </div>
  );
}

/* ── Segmented tabs ── */
function Tabs({ value, options, onChange }) {
  return (
    <div className="dh-tabs">
      {options.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`dh-tab${value === o.v ? " dh-tab--active" : ""}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

/* ── Chart tooltip ── */
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const k = payload[0]?.dataKey;
  const v = payload[0]?.value;
  return (
    <div className="dh-tooltip">
      <div className="dh-tooltip-label">{label}</div>
      <div className="dh-tooltip-val">
        {k === "revenue" ? `GHS ${Number(v).toFixed(2)}` : `${v} orders`}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export default function DashboardHome() {
  const { showTutorial, markSeen }          = useTutorial("home");
  const { user }                            = useAuth();
  const { shop, storeId, subscriptionPlan } = useSellerAuth();
  const [orders,    setOrders]    = useState([]);
  const [lastOrds,  setLastOrds]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [chartMode, setChartMode] = useState("orders");

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
    return { wkO: wkO.length, pwO: pwO.length, rev, pRev, apr: apr.length, pApr: pApr.length,
      custs, pCusts, total: orders.length, avg: orders.length ? rev / orders.length : 0, bar, recent };
  }, [orders, lastOrds]);

  const dateStr = new Date().toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="dh-root">

      {/* ── Header ── */}
      <div className="dh-header">
        <div>
          <div className="dh-title">Analytics</div>
          <div className="dh-date">{dateStr}</div>
        </div>
        <div className="dh-live-badge">
          <div className="dh-live-dot" />
          Store Active
        </div>
      </div>

      {/* ── 4 metric cards ── */}
      <div className="dh-metrics-grid">
        <MetricCard label="Revenue (Month)" value={`GHS ${fmtMoney(m.rev)}`}  pctVal={pct(m.rev,   m.pRev)}   icon={IC.rev} iconColor="#7c3aed" loading={loading} />
        <MetricCard label="Orders (Week)"   value={m.wkO}                     pctVal={pct(m.wkO,   m.pwO)}    icon={IC.ord} iconColor="#7c3aed" loading={loading} />
        <MetricCard label="Approved"        value={m.apr}                     pctVal={pct(m.apr,   m.pApr)}   icon={IC.chk} iconColor="#22C55E" loading={loading} />
        <MetricCard label="Customers"       value={m.custs}                   pctVal={pct(m.custs, m.pCusts)} icon={IC.usr} iconColor="#F59E0B" loading={loading} />
      </div>

      {/* ── 2 mini strips ── */}
      <div className="dh-mini-grid">
        {[
          { label: "Total Orders",     val: m.total,                  color: "#7c3aed", icon: IC.arr },
          { label: "Avg. Order Value", val: `GHS ${fmtMoney(m.avg)}`, color: "#7c3aed", icon: IC.rev },
        ].map(s => (
          <div key={s.label} className="dh-mini-card">
            <div className="dh-mini-icon" style={{ background: `${s.color}15`, color: s.color }}>
              <Ico d={s.icon} size={15} color={s.color} />
            </div>
            <div>
              <div className="dh-mini-label">{s.label}</div>
              {loading
                ? <div className="dh-skeleton" style={{ height: 16, width: 50, marginTop: 4 }} />
                : <div className="dh-mini-value">{s.val}</div>
              }
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div className="dh-panel">
        <div className="dh-panel-head">
          <span className="dh-panel-title">
            {chartMode === "orders" ? "Orders" : "Revenue"} — Last 7 Days
          </span>
          <Tabs
            value={chartMode}
            options={[{ v: "orders", l: "Orders" }, { v: "revenue", l: "Revenue" }]}
            onChange={setChartMode}
          />
        </div>

        {loading
          ? <div className="dh-skeleton" style={{ height: 150 }} />
          : m.bar.every(d => (chartMode === "orders" ? d.orders : d.revenue) === 0)
            ? <div className="dh-empty-chart">
                <span>No data this week yet</span>
              </div>
            : <ResponsiveContainer width="100%" height={150}>
                <BarChart data={m.bar} barSize={26}>
                  <XAxis dataKey="day"
                    tick={{ fontSize: 11, fill: "var(--sd-muted)", fontFamily: "inherit" }}
                    axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--sd-muted)", fontFamily: "inherit" }}
                    axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} cursor={{ fill: "var(--sd-accent-dim)" }} />
                  <Bar dataKey={chartMode} radius={[6, 6, 0, 0]} fill="var(--sd-accent)" />
                </BarChart>
              </ResponsiveContainer>
        }
      </div>

      {/* ── Order list ── */}
      <div className="dh-panel">
        <div className="dh-panel-head">
          <span className="dh-panel-title">Order List</span>
          <span className="dh-panel-sub">{m.total} orders this month</span>
        </div>

        {loading
          ? [1, 2, 3].map(i => (
              <div key={i} className="dh-order-row">
                <div className="dh-skeleton" style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="dh-skeleton" style={{ height: 11, width: "55%", marginBottom: 5 }} />
                  <div className="dh-skeleton" style={{ height: 9,  width: "35%" }} />
                </div>
              </div>
            ))
          : m.recent.length === 0
            ? <div className="dh-empty-orders">
                <div className="dh-empty-title">No orders yet</div>
                <div className="dh-empty-sub">Your first order will appear here.</div>
              </div>
            : m.recent.map((o, i) => {
                const cust = o.customer;
                const name = [cust?.firstName, cust?.lastName].filter(Boolean).join(" ") || "Customer";
                const ini  = initials(name);
                const av   = AVATAR_PAL[i % AVATAR_PAL.length];
                const st   = o.status || "pending";
                const badge = st === "paid" || st === "delivered" ? "Completed"
                            : st === "pending" ? "New Order"
                            : st.charAt(0).toUpperCase() + st.slice(1);
                return (
                  <div key={o.id} className="dh-order-row"
                    style={{ borderBottom: i < m.recent.length - 1 ? "1px solid var(--sd-border-light)" : "none" }}>
                    <div className="dh-order-avatar" style={{ background: av }}>
                      {ini}
                    </div>
                    <div className="dh-order-info">
                      <div className="dh-order-name">{name}</div>
                      <div className="dh-order-date">{fmtDate(o.createdAt)}</div>
                    </div>
                    <div className="dh-order-amount">
                      +GHS {Number(o.pricing?.total || 0).toFixed(2)}
                    </div>
                    <div className="dh-order-badge"
                      style={{ background: `${STATUS_COLOR[st] || "#9CA3AF"}18`, color: STATUS_COLOR[st] || "var(--sd-muted)" }}>
                      {badge}
                    </div>
                  </div>
                );
              })
        }
      </div>

      {/* ── New store hint ── */}
      {!loading && m.total === 0 && (
        <div className="dh-hint">
          <div className="dh-hint-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8"  x2="12.01" y2="8"/>
            </svg>
          </div>
          <div>
            <div className="dh-hint-title">Your store is live — start listing products!</div>
            <div className="dh-hint-sub">Go to <strong>Products</strong> to add your first product.</div>
          </div>
        </div>
      )}

      {showTutorial && (
        <TutorialOverlay
          steps={TUTORIAL_STEPS.home}
          onFinish={markSeen}
          pageTitle="Dashboard Home"
        />
      )}

      {/* ══════════════════════════════════════
          STYLES — all colours via CSS vars
          inherited from .sd-root / .sd-dark
      ══════════════════════════════════════ */}
      <style>{`
        @keyframes dh-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: calc(600px + 100%) 0; }
        }
        @keyframes dh-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }

        /* Root — white in light mode, deep purple-dark in dark mode */
        .dh-root {
          font-family: var(--sd-font, 'DM Sans', system-ui, sans-serif);
          background: var(--sd-white);
          color: var(--sd-text);
          min-height: 100%;
        }

        /* ── Header ── */
        .dh-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 22px;
        }
        .dh-title {
          font-size: 22px; font-weight: 900; color: var(--sd-text);
          letter-spacing: -0.03em; line-height: 1.1;
        }
        .dh-date { font-size: 13px; color: var(--sd-muted); font-weight: 500; margin-top: 3px; }

        /* Live badge */
        .dh-live-badge {
          display: flex; align-items: center; gap: 7px;
          font-size: 12px; font-weight: 700; color: #22C55E;
          background: rgba(34,197,94,0.08);
          padding: 6px 12px; border-radius: 100px;
          border: 1px solid rgba(34,197,94,0.2);
        }
        .dh-live-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #22C55E;
          animation: dh-pulse 1.8s ease infinite;
        }

        /* ── Metric cards ── */
        .dh-metrics-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 10px; margin-bottom: 10px;
        }
        .dh-metric-card {
          background: var(--sd-white);
          border-radius: 16px;
          padding: 20px 20px 16px;
          border: 1px solid var(--sd-border);
          box-shadow: var(--sd-shadow);
          transition: background 0.25s, border-color 0.25s;
        }
        .dh-metric-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .dh-metric-label {
          font-size: 11px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: var(--sd-muted);
        }
        .dh-metric-icon {
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dh-metric-value {
          font-size: 28px; font-weight: 900; color: var(--sd-text);
          letter-spacing: -0.04em; line-height: 1; margin-bottom: 10px;
        }
        .dh-metric-bar-track {
          height: 4px; background: var(--sd-border);
          border-radius: 2px; overflow: hidden; margin-bottom: 8px;
        }
        .dh-metric-bar-fill {
          height: 100%; border-radius: 2px;
          transition: width 0.7s ease;
        }
        .dh-metric-trend {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 700;
        }
        .dh-trend-pct {
          display: flex; align-items: center; gap: 2px;
        }
        .dh-trend-sub { color: var(--sd-muted); font-weight: 500; }

        /* ── Mini strips ── */
        .dh-mini-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; margin-bottom: 18px;
        }
        .dh-mini-card {
          background: var(--sd-white);
          border-radius: 12px;
          border: 1px solid var(--sd-border);
          padding: 12px 14px;
          display: flex; align-items: center; gap: 10px;
          box-shadow: var(--sd-shadow);
          transition: background 0.25s, border-color 0.25s;
        }
        .dh-mini-icon {
          width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .dh-mini-label {
          font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--sd-muted);
        }
        .dh-mini-value {
          font-size: 16px; font-weight: 900; color: var(--sd-text);
          letter-spacing: -0.03em; line-height: 1.2; margin-top: 2px;
        }

        /* ── Panels (chart + orders) ── */
        .dh-panel {
          background: var(--sd-white);
          border-radius: 16px;
          border: 1px solid var(--sd-border);
          padding: 18px 20px 14px;
          margin-bottom: 14px;
          box-shadow: var(--sd-shadow);
          transition: background 0.25s, border-color 0.25s;
        }
        .dh-panel-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }
        .dh-panel-title {
          font-size: 14px; font-weight: 800; color: var(--sd-text);
        }
        .dh-panel-sub {
          font-size: 11px; font-weight: 600; color: var(--sd-muted);
        }

        /* ── Tabs ── */
        .dh-tabs {
          display: flex;
          background: var(--sd-border-light);
          border-radius: 100px; padding: 3px;
          border: 1px solid var(--sd-border);
        }
        .dh-tab {
          padding: 5px 12px; border-radius: 100px; border: none;
          background: transparent; color: var(--sd-muted);
          font-size: 12px; font-weight: 700; cursor: pointer;
          transition: all 0.15s; font-family: inherit;
        }
        .dh-tab--active {
          background: var(--sd-white);
          color: var(--sd-text);
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }

        /* ── Chart empty ── */
        .dh-empty-chart {
          height: 150px; display: flex; align-items: center; justify-content: center;
        }
        .dh-empty-chart span { font-size: 13px; color: var(--sd-muted); font-weight: 600; }

        /* ── Tooltip ── */
        .dh-tooltip {
          background: var(--sd-white);
          border: 1px solid var(--sd-border);
          border-radius: 10px; padding: 10px 14px;
          font-size: 12px; font-weight: 600;
          box-shadow: var(--sd-shadow-lg, 0 4px 20px rgba(0,0,0,0.1));
        }
        .dh-tooltip-label { color: var(--sd-muted); margin-bottom: 4px; }
        .dh-tooltip-val   { color: var(--sd-text); }

        /* ── Order rows ── */
        .dh-order-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 0;
        }
        .dh-order-avatar {
          width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: #fff;
        }
        .dh-order-info  { flex: 1; min-width: 0; }
        .dh-order-name  {
          font-size: 13px; font-weight: 700; color: var(--sd-text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dh-order-date  { font-size: 11px; color: var(--sd-muted); font-weight: 500; }
        .dh-order-amount{
          font-size: 13px; font-weight: 800; color: var(--sd-text); flex-shrink: 0;
        }
        .dh-order-badge {
          padding: 4px 10px; border-radius: 100px; flex-shrink: 0;
          font-size: 11px; font-weight: 700;
        }

        /* ── Empty orders ── */
        .dh-empty-orders { text-align: center; padding: 28px 0; }
        .dh-empty-title  { font-size: 13px; color: var(--sd-muted); font-weight: 600; }
        .dh-empty-sub    { font-size: 12px; color: var(--sd-muted); margin-top: 3px; }

        /* ── New store hint ── */
        .dh-hint {
          margin-top: 14px; padding: 14px 18px; border-radius: 12px;
          background: var(--sd-accent-dim);
          border: 1px solid var(--sd-accent-border);
          display: flex; align-items: center; gap: 12px;
        }
        .dh-hint-icon {
          width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
          background: var(--sd-border-light);
          display: flex; align-items: center; justify-content: center;
          color: var(--sd-text);
        }
        .dh-hint-title { font-size: 13px; font-weight: 800; color: var(--sd-text); }
        .dh-hint-sub   { font-size: 12px; color: var(--sd-muted); font-weight: 500; margin-top: 2px; }
        .dh-hint-sub strong { color: var(--sd-text); }

        /* ── Skeleton shimmer ── */
        .dh-skeleton {
          border-radius: 6px;
          background: var(--sd-border-light);
          background-image: linear-gradient(
            90deg,
            var(--sd-border-light) 25%,
            var(--sd-border)       50%,
            var(--sd-border-light) 75%
          );
          background-size: 600px 100%;
          animation: dh-shimmer 1.4s ease infinite;
        }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .dh-metrics-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          .dh-mini-grid    { grid-template-columns: 1fr 1fr; gap: 8px; }
          .dh-metric-value { font-size: 22px; }
          .dh-order-badge  { display: none; }
        }
      `}</style>
    </div>
  );
}