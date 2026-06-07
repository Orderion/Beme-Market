// src/pages/dashboard/DashboardOrders.jsx
import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getSellerOrders } from "../../services/storeService";
import TutorialOverlay from "../../components/ai/TutorialOverlay";
import { TUTORIAL_STEPS } from "../../components/ai/tutorialSteps";
import { useTutorial } from "../../hooks/useTutorial";

/* ── Status config ── */
const STATUS_TABS = ["all", "pending", "processing", "delivered", "cancelled"];

const BADGE_CLASS = {
  delivered:       "do-badge do-badge--green",
  processing:      "do-badge do-badge--blue",
  pending:         "do-badge do-badge--yellow",
  cancelled:       "do-badge do-badge--red",
  pending_payment: "do-badge do-badge--gray",
  paid:            "do-badge do-badge--green",
  payment_failed:  "do-badge do-badge--red",
};

/* ── Default progress stages by template ── */
const STAGE_TEMPLATES = {
  standard: ["Order Confirmed", "Packed", "Out for Delivery", "Delivered"],
  pickup:   ["Order Confirmed", "Ready for Pickup", "Collected"],
};

function getStages(order) {
  if (Array.isArray(order.progressStages) && order.progressStages.length > 0) {
    return order.progressStages;
  }
  return STAGE_TEMPLATES.standard;
}

function getCurrentStep(order) {
  return typeof order.progressStep === "number" ? order.progressStep : -1;
}

/* ── Helpers ── */
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}
function fmtMoney(n) { return `GHS ${Number(n || 0).toFixed(2)}`; }

/* ── Icons ── */
function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {String(d).split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const IC = {
  back:  "M19 12H5|M12 19l-7-7 7-7",
  box:   "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  user:  "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  truck: "M1 3h15v13H1z|M16 8h4l3 3v5h-7V8z|M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z|M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  card:  "M1 4h22v16H1z|M1 10h22",
  check: "M20 6L9 17l-5-5",
  empty: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z|M3 6h18|M16 10a4 4 0 0 1-8 0",
  image: "M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4 3 3 3-3 4 4z",
};

/* ── Product thumb ── */
function Thumb({ src, alt, size = 40, radius = "50%" }) {
  const [err, setErr] = useState(false);
  const base = {
    width: size, height: size, borderRadius: radius, flexShrink: 0,
    border: "1.5px solid var(--sd-border)", background: "var(--sd-border-light)",
  };
  if (!src || err) {
    return (
      <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ico d={IC.image} size={size * 0.38} color="var(--sd-border)" sw={1.4} />
      </div>
    );
  }
  return <img src={src} alt={alt || ""} style={{ ...base, objectFit: "cover", display: "block" }} onError={() => setErr(true)} />;
}

function EmptyOrders() {
  return (
    <div className="do-empty">
      <Ico d={IC.empty} size={40} color="var(--sd-border)" sw={1.2} />
      <div className="do-empty-title">No orders yet</div>
      <div className="do-empty-sub">Orders from customers will appear here.</div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="do-no-order">
      <Ico d={IC.box} size={40} color="var(--sd-border)" sw={1.2} />
      <div className="do-no-order-label">Select an order</div>
    </div>
  );
}

/* ══════════════════════════
   PROGRESS STEPPER
══════════════════════════ */
function ProgressStepper({ order, onUpdate }) {
  const stages      = getStages(order);
  const currentStep = getCurrentStep(order);
  const [updating, setUpdating] = useState(false);

  const advance = async (stepIndex) => {
    if (updating) return;
    setUpdating(true);
    try {
      const newStatus =
        stepIndex >= stages.length - 1 ? "delivered"
        : stepIndex >= 0               ? "processing"
        : "pending";
      await updateDoc(doc(db, "orders", order.id), {
        progressStep:   stepIndex,
        progressStages: stages,
        status:         newStatus,
        updatedAt:      serverTimestamp(),
      });
      if (onUpdate) onUpdate(order.id, { progressStep: stepIndex, progressStages: stages, status: newStatus });
    } catch (e) { console.error("[DashboardOrders] advance:", e); }
    finally { setUpdating(false); }
  };

  const reset = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        progressStep: -1,
        status:       "pending",
        updatedAt:    serverTimestamp(),
      });
      if (onUpdate) onUpdate(order.id, { progressStep: -1, status: "pending" });
    } catch (e) { console.error("[DashboardOrders] reset:", e); }
    finally { setUpdating(false); }
  };

  return (
    <div>
      <div className="do-progress-head">
        <span className="do-section-label"><Ico d={IC.truck} size={12} /> Delivery Progress</span>
        {currentStep >= 0 && (
          <button className="do-reset-btn" onClick={reset} disabled={updating}>Reset</button>
        )}
      </div>

      <div className="do-steps">
        {/* Order placed — always done */}
        <div className="do-step do-step--done">
          <div className="do-step-col">
            <div className="do-step-dot do-step-dot--done">
              <Ico d={IC.check} size={10} color="#fff" sw={2.5} />
            </div>
            <div className="do-step-line do-step-line--done" />
          </div>
          <div className="do-step-body">
            <div className="do-step-name">Order Placed</div>
            <div className="do-step-date">{fmtDate(order.createdAt)} · {fmtTime(order.createdAt)}</div>
          </div>
        </div>

        {stages.map((stage, i) => {
          const done   = i <= currentStep;
          const active = i === currentStep + 1;
          const isLast = i === stages.length - 1;
          return (
            <div key={i} className={`do-step${done ? " do-step--done" : active ? " do-step--active" : ""}`}>
              <div className="do-step-col">
                <div className={`do-step-dot${done ? " do-step-dot--done" : active ? " do-step-dot--active" : ""}`}>
                  {done && <Ico d={IC.check} size={10} color="#fff" sw={2.5} />}
                </div>
                {!isLast && <div className={`do-step-line${done ? " do-step-line--done" : ""}`} />}
              </div>
              <div className="do-step-body">
                <div className="do-step-name">{stage}</div>
                {active && (
                  <button className="do-step-btn" onClick={() => advance(i)} disabled={updating}>
                    {updating ? "Updating…" : `Mark as ${stage}`}
                  </button>
                )}
                {done && <div className="do-step-done-label">Completed</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════
   ORDER DETAIL (right panel)
══════════════════════════ */
function OrderDetail({ order, onBack, onUpdate, isMobile }) {
  if (!order) return <EmptyDetail />;
  const cust  = order.customer || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const del   = order.delivery || {};
  const price = order.pricing  || {};

  return (
    <div className="do-detail-panel">
      <div className="do-detail-header">
        {isMobile && (
          <button className="do-back-btn" onClick={onBack}>
            <Ico d={IC.back} size={18} color="var(--sd-text)" />
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div className="do-detail-id">#{order.id?.slice(0, 8).toUpperCase()}</div>
          <div className="do-detail-meta">{fmtDate(order.createdAt)} · {fmtTime(order.createdAt)}</div>
        </div>
        <span className={BADGE_CLASS[order.status] || "do-badge do-badge--gray"}>
          {(order.status || "").replace(/_/g, " ")}
        </span>
      </div>

      <div className="do-detail-body">

        {/* Progress */}
        <div className="do-detail-section">
          <ProgressStepper order={order} onUpdate={onUpdate} />
        </div>

        {/* Items */}
        <div className="do-detail-section">
          <div className="do-section-label" style={{ marginBottom: 12 }}>
            <Ico d={IC.box} size={12} /> Items ordered
          </div>
          {items.map((item, i) => {
            const img  = item.image || (Array.isArray(item.images) ? item.images[0] : "");
            const opts = item.selectedOptionsLabel || Object.entries(item.selectedOptions || {}).map(([k, v]) => `${k}: ${v}`).join(" · ");
            return (
              <div key={i} className="do-item-row">
                <Thumb src={img} alt={item.name} size={48} radius="10px" />
                <div className="do-item-info">
                  <div className="do-item-name">{item.name || "Product"}</div>
                  {opts && <div className="do-item-opts">{opts}</div>}
                  <div className="do-item-meta">Qty: {item.qty} · {fmtMoney(item.price)} each</div>
                </div>
                <div className="do-item-total">{fmtMoney(Number(item.price || 0) * Number(item.qty || 1))}</div>
              </div>
            );
          })}
        </div>

        {/* Customer */}
        <div className="do-detail-section">
          <div className="do-section-label" style={{ marginBottom: 12 }}>
            <Ico d={IC.user} size={12} /> Customer
          </div>
          <div className="do-info-grid">
            <div className="do-info-field"><span className="do-info-label">Name</span><span className="do-info-value">{cust.firstName} {cust.lastName}</span></div>
            <div className="do-info-field"><span className="do-info-label">Phone</span><span className="do-info-value">{cust.phone || "—"}</span></div>
            <div className="do-info-field"><span className="do-info-label">Email</span><span className="do-info-value">{cust.email || "—"}</span></div>
            <div className="do-info-field"><span className="do-info-label">Network</span><span className="do-info-value">{cust.network || "—"}</span></div>
            <div className="do-info-field do-info-field--full">
              <span className="do-info-label">Address</span>
              <span className="do-info-value">{[cust.address, cust.area, cust.city, cust.region].filter(Boolean).join(", ")}</span>
            </div>
            {cust.notes && <div className="do-info-field do-info-field--full"><span className="do-info-label">Notes</span><span className="do-info-value">{cust.notes}</span></div>}
          </div>
        </div>

        {/* Delivery */}
        <div className="do-detail-section">
          <div className="do-section-label" style={{ marginBottom: 12 }}>
            <Ico d={IC.truck} size={12} /> Delivery
          </div>
          <div className="do-info-grid">
            <div className="do-info-field"><span className="do-info-label">Method</span><span className="do-info-value">{del.label || del.method || "—"}</span></div>
            <div className="do-info-field"><span className="do-info-label">Fee</span><span className="do-info-value">{fmtMoney(del.fee)}</span></div>
          </div>
        </div>

        {/* Payment */}
        <div className="do-detail-section">
          <div className="do-section-label" style={{ marginBottom: 12 }}>
            <Ico d={IC.card} size={12} /> Payment
          </div>
          <div className="do-info-grid">
            <div className="do-info-field"><span className="do-info-label">Method</span><span className="do-info-value">{order.paymentMethod === "cod" ? "Pay on Delivery" : "Paystack"}</span></div>
            <div className="do-info-field"><span className="do-info-label">Status</span><span className="do-info-value">{order.paymentStatus || "—"}</span></div>
          </div>
          <div className="do-totals">
            <div className="do-total-row"><span>Subtotal</span><span>{fmtMoney(price.subtotal)}</span></div>
            <div className="do-total-row"><span>Delivery</span><span>{fmtMoney(price.deliveryFee)}</span></div>
            {price.discount > 0 && <div className="do-total-row do-total-row--discount"><span>Discount</span><span>-{fmtMoney(price.discount)}</span></div>}
            <div className="do-total-row do-total-row--total"><span>Total</span><span>{fmtMoney(price.total)}</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════
   MAIN
══════════════════════════ */
export default function DashboardOrders() {
  const { showTutorial, markSeen } = useTutorial("orders");
  const { storeId, shop }          = useSellerAuth();
  const queryId                    = shop?.id || storeId;

  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState("all");
  const [selected,   setSelected]   = useState(null);
  const [mobileView, setMobileView] = useState("list");

  useEffect(() => {
    if (!queryId) return;
    getSellerOrders(queryId)
      .then(d => { setOrders(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [queryId]);

  const filtered = tab === "all"
    ? orders
    : orders.filter(o => o.status === tab || o.fulfillmentStatus === tab);

  const handleSelect = (order) => { setSelected(order); setMobileView("detail"); };
  const handleBack   = ()      => setMobileView("list");

  const handleOrderUpdate = (orderId, patch) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o));
    setSelected(prev => prev?.id === orderId ? { ...prev, ...patch } : prev);
  };

  return (
    <div className="do-root">
      <div className="do-page-head">
        <div className="do-page-title">Orders</div>
        <div className="do-page-sub">{orders.length} order{orders.length !== 1 ? "s" : ""}</div>
      </div>

      <div className="do-shell">

        {/* ── List panel ── */}
        <div className={`do-list-panel${mobileView === "detail" ? " do-list-panel--hidden" : ""}`}>
          <div className="do-list-header">
            <span className="do-list-title">Orders</span>
            <span className="do-list-count">{orders.length}</span>
          </div>
          <div className="do-list-tabs">
            {STATUS_TABS.map(t => (
              <button key={t}
                className={`do-list-tab${tab === t ? " do-list-tab--active" : ""}`}
                onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="do-list-scroll">
            {loading
              ? [1,2,3,4].map(i => <div key={i} className="do-skel" style={{ height:72, margin:"8px 12px", borderRadius:10 }} />)
              : filtered.length === 0
                ? <EmptyOrders />
                : filtered.map(o => {
                    const cust     = o.customer || {};
                    const items    = Array.isArray(o.items) ? o.items : [];
                    const firstImg = items[0]?.image || "";
                    const isActive = selected?.id === o.id;
                    return (
                      <div key={o.id}
                        className={`do-list-item${isActive ? " do-list-item--active" : ""}`}
                        onClick={() => handleSelect(o)}>
                        <Thumb src={firstImg} alt={items[0]?.name} size={42} radius="50%" />
                        <div className="do-list-item-info">
                          <div className="do-list-item-name">{cust.firstName} {cust.lastName}</div>
                          <div className="do-list-item-sub">#{o.id?.slice(0,8).toUpperCase()} · {fmtDate(o.createdAt)}</div>
                        </div>
                        <div className="do-list-item-right">
                          <div className="do-list-item-amount">{fmtMoney(o.pricing?.total)}</div>
                          <span className={BADGE_CLASS[o.status] || "do-badge do-badge--gray"} style={{ fontSize:10, padding:"2px 7px" }}>
                            {(o.status || "").replace(/_/g," ")}
                          </span>
                        </div>
                      </div>
                    );
                  })
            }
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div className={`do-detail-wrap${mobileView === "list" ? " do-detail-wrap--hidden" : ""}`}>
          <OrderDetail
            order={selected}
            onBack={handleBack}
            onUpdate={handleOrderUpdate}
            isMobile={mobileView === "detail"}
          />
        </div>

      </div>

      {showTutorial && (
        <TutorialOverlay steps={TUTORIAL_STEPS.orders} onFinish={markSeen} pageTitle="Orders" />
      )}

      <style>{`
        @keyframes do-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: calc(600px + 100%) 0; }
        }

        .do-root {
          font-family: var(--sd-font,'DM Sans',system-ui,sans-serif);
          background: transparent; color: var(--sd-text);
          min-height: 100%; display: flex; flex-direction: column;
        }
        .do-page-head  { margin-bottom: 14px; }
        .do-page-title { font-size: 11px; font-weight: 700; color: var(--sd-muted); text-transform: uppercase; letter-spacing: 0.07em; }
        .do-page-sub   { font-size: 12px; color: var(--sd-muted); margin-top: 2px; }

        /* Shell */
        .do-shell {
          display: flex; border: 1px solid var(--sd-border);
          border-radius: 14px; overflow: hidden;
          height: calc(100vh - 180px); min-height: 480px;
          background: var(--sd-white); transition: background 0.25s, border-color 0.25s;
        }

        /* List panel */
        .do-list-panel {
          width: 280px; flex-shrink: 0;
          border-right: 1px solid var(--sd-border);
          display: flex; flex-direction: column;
          background: transparent; overflow: hidden;
        }
        .do-list-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px 10px; border-bottom: 1px solid var(--sd-border); flex-shrink: 0;
        }
        .do-list-title { font-size: 13px; font-weight: 800; color: var(--sd-text); }
        .do-list-count { font-size: 11px; font-weight: 700; background: var(--sd-accent); color: #fff; padding: 2px 8px; border-radius: 20px; }

        .do-list-tabs {
          display: flex; overflow-x: auto; gap: 2px;
          padding: 8px 10px; border-bottom: 1px solid var(--sd-border);
          flex-shrink: 0; scrollbar-width: none;
        }
        .do-list-tabs::-webkit-scrollbar { display: none; }
        .do-list-tab {
          flex-shrink: 0; padding: 4px 10px; border-radius: 20px; border: none;
          background: transparent; font-size: 11px; font-weight: 600;
          color: var(--sd-muted); cursor: pointer; font-family: inherit;
          transition: all 0.12s; white-space: nowrap;
        }
        .do-list-tab--active { background: var(--sd-accent); color: #fff; }

        .do-list-scroll { flex: 1; overflow-y: auto; }
        .do-list-scroll::-webkit-scrollbar { width: 3px; }
        .do-list-scroll::-webkit-scrollbar-thumb { background: var(--sd-border); border-radius: 3px; }

        .do-list-item {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; cursor: pointer;
          border-left: 3px solid transparent;
          border-bottom: 1px solid var(--sd-border-light);
          transition: background 0.12s;
        }
        .do-list-item:hover { background: var(--sd-border-light); }
        .do-list-item--active { background: var(--sd-accent-dim); border-left-color: var(--sd-accent); }

        .do-list-item-info { flex: 1; min-width: 0; }
        .do-list-item-name { font-size: 13px; font-weight: 700; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .do-list-item-sub  { font-size: 11px; color: var(--sd-muted); margin-top: 2px; }
        .do-list-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .do-list-item-amount { font-size: 12px; font-weight: 800; color: var(--sd-text); }

        /* Detail wrap */
        .do-detail-wrap { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }

        /* Detail panel */
        .do-detail-panel { display: flex; flex-direction: column; height: 100%; }
        .do-detail-header {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 18px; border-bottom: 1px solid var(--sd-border); flex-shrink: 0;
        }
        .do-back-btn {
          display: none; background: none; border: none; cursor: pointer;
          padding: 4px; border-radius: 8px; line-height: 0; flex-shrink: 0; transition: background 0.12s;
        }
        .do-back-btn:hover { background: var(--sd-border-light); }
        .do-detail-id   { font-size: 14px; font-weight: 900; color: var(--sd-text); font-family: monospace; }
        .do-detail-meta { font-size: 11px; color: var(--sd-muted); margin-top: 2px; }

        .do-detail-body { flex: 1; overflow-y: auto; padding-bottom: 32px; }
        .do-detail-body::-webkit-scrollbar { width: 4px; }
        .do-detail-body::-webkit-scrollbar-thumb { background: var(--sd-border); border-radius: 4px; }

        .do-detail-section { padding: 16px 18px; border-bottom: 1px solid var(--sd-border-light); }
        .do-detail-section:last-child { border-bottom: none; }

        .do-section-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 800; color: var(--sd-muted);
          text-transform: uppercase; letter-spacing: 0.08em;
        }

        /* Progress stepper */
        .do-progress-head {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
        }
        .do-reset-btn {
          font-size: 11px; font-weight: 700; color: var(--sd-muted);
          background: none; border: 1px solid var(--sd-border); cursor: pointer;
          font-family: inherit; padding: 3px 8px; border-radius: 6px; transition: all 0.12s;
        }
        .do-reset-btn:hover:not(:disabled) { color: var(--sd-text); border-color: var(--sd-text); }
        .do-reset-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .do-steps { display: flex; flex-direction: column; }
        .do-step  { display: flex; align-items: flex-start; gap: 12px; }

        .do-step-col {
          display: flex; flex-direction: column; align-items: center;
          flex-shrink: 0; width: 22px;
        }
        .do-step-dot {
          width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
          border: 2px solid var(--sd-border); background: var(--sd-white);
          display: flex; align-items: center; justify-content: center;
          position: relative; z-index: 1; transition: all 0.2s;
        }
        .do-step-dot--done   { background: #22C55E; border-color: #22C55E; }
        .do-step-dot--active { border-color: var(--sd-accent); border-width: 2.5px; }
        .do-step-line {
          width: 2px; flex: 1; min-height: 24px;
          background: var(--sd-border-light); margin: 3px 0;
        }
        .do-step-line--done { background: #22C55E; }

        .do-step-body { flex: 1; min-width: 0; padding: 2px 0 20px; }
        .do-step:last-child .do-step-body { padding-bottom: 0; }
        .do-step-name { font-size: 13px; font-weight: 700; color: var(--sd-text); margin-bottom: 4px; }
        .do-step--active .do-step-name { color: var(--sd-accent); }
        .do-step-date       { font-size: 11px; color: var(--sd-muted); }
        .do-step-done-label { font-size: 11px; color: #16A34A; font-weight: 600; }
        .do-step-btn {
          display: inline-flex; align-items: center;
          padding: 5px 14px; border-radius: 20px;
          background: var(--sd-accent); color: #fff;
          border: none; cursor: pointer; font-family: inherit;
          font-size: 11px; font-weight: 700; transition: opacity 0.15s;
        }
        .do-step-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .do-step-btn:not(:disabled):hover { opacity: 0.85; }

        /* Items */
        .do-item-row  { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
        .do-item-row:last-child { margin-bottom: 0; }
        .do-item-info { flex: 1; min-width: 0; }
        .do-item-name { font-size: 13px; font-weight: 700; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
        .do-item-opts { font-size: 11px; color: var(--sd-accent); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
        .do-item-meta { font-size: 11px; color: var(--sd-muted); }
        .do-item-total { font-size: 13px; font-weight: 800; color: var(--sd-text); white-space: nowrap; flex-shrink: 0; padding-top: 2px; }

        /* Info grid */
        .do-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .do-info-field { display: flex; flex-direction: column; gap: 3px; }
        .do-info-field--full { grid-column: 1 / -1; }
        .do-info-label { font-size: 10px; font-weight: 700; color: var(--sd-muted); text-transform: uppercase; letter-spacing: 0.07em; }
        .do-info-value { font-size: 13px; font-weight: 600; color: var(--sd-text); line-height: 1.4; }

        /* Totals */
        .do-totals { margin-top: 12px; border-top: 1px solid var(--sd-border-light); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
        .do-total-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--sd-muted); }
        .do-total-row--discount { color: #16A34A; }
        .do-total-row--total { font-size: 14px; font-weight: 900; color: var(--sd-text); margin-top: 4px; padding-top: 8px; border-top: 1.5px solid var(--sd-border); }

        /* Badges */
        .do-badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: capitalize; white-space: nowrap; font-family: var(--sd-font,system-ui); }
        .do-badge--green  { background: rgba(34,197,94,0.1);  color: #15803d; }
        .do-badge--blue   { background: rgba(59,130,246,0.1); color: #1d4ed8; }
        .do-badge--yellow { background: rgba(245,158,11,0.1); color: #b45309; }
        .do-badge--red    { background: rgba(239,68,68,0.1);  color: #b91c1c; }
        .do-badge--gray   { background: var(--sd-border-light); color: var(--sd-muted); }

        /* Empty */
        .do-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; gap: 8px; }
        .do-empty-title { font-size: 14px; font-weight: 700; color: var(--sd-text); }
        .do-empty-sub   { font-size: 12px; color: var(--sd-muted); }
        .do-no-order { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 10px; }
        .do-no-order-label { font-size: 14px; font-weight: 700; color: var(--sd-muted); }

        /* Skeleton */
        .do-skel {
          background: var(--sd-border-light);
          background-image: linear-gradient(90deg, var(--sd-border-light) 25%, var(--sd-border) 50%, var(--sd-border-light) 75%);
          background-size: 600px 100%; animation: do-shimmer 1.4s ease infinite;
        }

        /* Mobile */
        @media (max-width: 768px) {
          .do-shell { border-radius: 12px; height: calc(100vh - 160px); position: relative; overflow: hidden; }
          .do-list-panel { width: 100%; border-right: none; position: absolute; inset: 0; z-index: 1; transform: translateX(0); transition: transform 0.28s cubic-bezier(0.4,0,0.2,1); }
          .do-list-panel--hidden { transform: translateX(-100%); pointer-events: none; }
          .do-detail-wrap { width: 100%; position: absolute; inset: 0; z-index: 2; transform: translateX(100%); transition: transform 0.28s cubic-bezier(0.4,0,0.2,1); }
          .do-detail-wrap:not(.do-detail-wrap--hidden) { transform: translateX(0); }
          .do-detail-wrap--hidden { transform: translateX(100%); pointer-events: none; }
          .do-back-btn { display: flex; }
          .do-info-grid { grid-template-columns: 1fr; }
        }
        @media (min-width: 769px) {
          .do-list-panel, .do-list-panel--hidden { transform: none !important; position: static !important; width: 280px; }
          .do-detail-wrap, .do-detail-wrap--hidden { transform: none !important; position: static !important; }
        }
      `}</style>
    </div>
  );
}