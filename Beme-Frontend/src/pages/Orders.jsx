// src/pages/Orders.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import "./Orders.css";

/* ── Default status steps (fallback when no seller progressStages) ── */
const DEFAULT_STEPS = ["pending", "paid", "processing", "shipped", "delivered"];

const DEFAULT_STEP_LABELS = {
  pending:         "Pending",
  pending_payment: "Payment",
  paid:            "Paid",
  processing:      "Processing",
  shipped:         "Shipped",
  delivered:       "Delivered",
};

/* ── BEME DELIVERY: Beme-courier status labels (distinct from the
   default order-status track above — these describe delivery.status,
   a separate state machine that only exists on Beme-courier orders) ── */
const BEME_DELIVERY_STAGES = ["pending_dispatch", "dispatched", "picked_up", "in_transit", "delivered"];
const BEME_STAGE_LABELS = {
  pending_dispatch: "Order Confirmed",
  dispatched:        "Courier Assigned",
  picked_up:         "Picked Up",
  in_transit:        "On the Way",
  delivered:         "Delivered",
};
// Pay Now is only valid once the courier has picked up / is en route —
// never before, never after delivered. Matches the backend gate exactly
// (paystack.js PAY_AT_DOOR_ELIGIBLE_STATUSES).
const PAY_AT_DOOR_ELIGIBLE_STATUSES = ["picked_up", "in_transit"];

/* ── Helpers ── */
function normalizeStatus(value) {
  return String(value || "pending").trim().toLowerCase();
}

function getVisualStatus(status, paymentStatus, paid) {
  const s  = normalizeStatus(status);
  const ps = normalizeStatus(paymentStatus);
  if (paid === true || ps === "paid") {
    if (["processing","shipped","delivered"].includes(s)) return s;
    return "paid";
  }
  const failed = ["payment_failed","failed","verify_error","cancelled","canceled","abandoned","reversed","amount_mismatch","invalid_metadata_type","invalid_user","user_mismatch","not_found"];
  if (failed.includes(s)) return "pending_payment";
  if (DEFAULT_STEPS.includes(s)) return s;
  return "pending";
}

function getDefaultStepIndex(status) {
  const i = DEFAULT_STEPS.indexOf(status);
  return i === -1 ? 0 : i;
}

function fmtMoney(v) { return `GHS ${Number(v || 0).toFixed(2)}`; }

function fmtDate(value) {
  if (!value) return "—";
  try {
    const d = typeof value?.toDate === "function" ? value.toDate()
      : typeof value?.seconds === "number" ? new Date(value.seconds * 1000)
      : typeof value?._seconds === "number" ? new Date(value._seconds * 1000)
      : new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-GH", { year:"numeric", month:"short", day:"2-digit" }).format(d);
  } catch { return "—"; }
}

function getSortableTime(value) {
  if (!value) return 0;
  try {
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?.seconds === "number") return value.seconds * 1000;
    if (typeof value?._seconds === "number") return value._seconds * 1000;
    return new Date(value).getTime() || 0;
  } catch { return 0; }
}

function titleize(value) {
  return String(value || "").replace(/[-_]+/g," ").replace(/\s+/g," ").trim().replace(/\b\w/g, m => m.toUpperCase());
}

function formatOptionPair(key, value) {
  const k = String(key || "").trim();
  const v = String(value || "").trim();
  if (!v) return "";
  return k ? `${titleize(k)}: ${v}` : v;
}

function extractItemOptions(item) {
  if (!item || typeof item !== "object") return [];
  const collected = [];
  const push = (text) => {
    const clean = String(text || "").trim();
    if (!clean || collected.includes(clean)) return;
    collected.push(clean);
  };
  push(item?.selectedOptionsLabel);
  if (Array.isArray(item?.selectedOptionDetails)) {
    item.selectedOptionDetails.forEach(e => {
      if (typeof e === "string") { push(e); return; }
      if (e && typeof e === "object") push(formatOptionPair(e?.groupName||e?.label||e?.name||e?.key, e?.label||e?.value||e?.title));
    });
  }
  [item?.selectedOptions, item?.customizations, item?.customizationOptions, item?.options, item?.variant, item?.variantOptions].forEach(src => {
    if (!src || typeof src !== "object" || Array.isArray(src)) return;
    Object.entries(src).forEach(([k, v]) => {
      if (Array.isArray(v)) { push(formatOptionPair(k, v.map(x => String(x||"").trim()).filter(Boolean).join(", "))); return; }
      if (v && typeof v === "object") { push(formatOptionPair(k, v?.value??v?.label??v?.name??v?.title??"")); return; }
      push(formatOptionPair(k, v));
    });
  });
  if (Array.isArray(item?.customizations)) {
    item.customizations.forEach(e => {
      if (typeof e === "string") { push(e); return; }
      if (e && typeof e === "object") push(formatOptionPair(e?.label||e?.name||e?.key||e?.title, e?.value||e?.selected||e?.option||e?.label));
    });
  }
  return collected;
}

function getDeliverySummary(delivery) {
  if (!delivery || typeof delivery !== "object") return null;
  const method = String(delivery.method || "").trim().toLowerCase();
  const label  = String(delivery.label  || "").trim();
  const fee    = Number(delivery.fee    || 0) || 0;
  if (method === "mall_pickup") {
    const mallLabel = String(delivery?.mallPickup?.label || "").trim();
    const mallArea  = String(delivery?.mallPickup?.area  || "").trim();
    const pickupFee = Number(delivery?.mallPickup?.fee   || 0) || 0;
    return { title:"Mall Pickup", label:mallLabel||label||"Mall Pickup", note:mallArea||"Pickup at selected mall", fee:pickupFee||fee };
  }
  if (method === "home_delivery") {
    const homeLabel = String(delivery?.homeDelivery?.label || "").trim();
    return { title:"Home Delivery", label:homeLabel||label||"Home Delivery", note:"Delivered to your address", fee };
  }
  if (label) return { title:"Delivery", label, note:"", fee };
  return null;
}

async function getAuthHeaders() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("You must be signed in to continue.");
  const token = await currentUser.getIdToken(true);
  return { Authorization:`Bearer ${token}`, Accept:"application/json" };
}

function getApiBase() {
  const apiBase = String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/+$/, "");
  if (!apiBase) throw new Error("Missing backend URL. Set VITE_BACKEND_URL.");
  return apiBase;
}

async function fetchOwnOrders() {
  const apiBase = getApiBase();
  const headers = await getAuthHeaders();
  const res = await fetch(`${apiBase}/api/orders`, { method:"GET", headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Failed to load orders.");
  return Array.isArray(data?.orders) ? data.orders : [];
}

/* ── BEME DELIVERY: confirm receipt — works for any order type ── */
async function confirmOrderReceived(orderId) {
  const apiBase = getApiBase();
  const headers = await getAuthHeaders();
  const res = await fetch(`${apiBase}/api/orders/${encodeURIComponent(orderId)}/confirm-received`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to confirm receipt.");
  return data;
}

/* ── BEME DELIVERY: Pay at Door — init payment when courier has arrived ── */
async function initPayAtDoor(orderId) {
  const apiBase = getApiBase();
  const headers = await getAuthHeaders();
  const res = await fetch(`${apiBase}/api/paystack/pay-at-door/init`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.authorization_url) throw new Error(data?.error || "Failed to start payment.");
  return data;
}

/* ── Skeleton ── */
function OrderSkeleton() {
  return (
    <div className="ord-card" aria-hidden="true" style={{ padding:24 }}>
      <div className="ord-skel" style={{ height:18, width:"40%", marginBottom:14, borderRadius:6 }} />
      <div className="ord-skel" style={{ height:56, width:"100%", marginBottom:14, borderRadius:8 }} />
      <div className="ord-skel" style={{ height:14, width:"60%", marginBottom:8, borderRadius:6 }} />
      <div className="ord-skel" style={{ height:14, width:"40%", borderRadius:6 }} />
    </div>
  );
}

/* ══════════════════════════════════════════════
   SELLER PROGRESS STEPPER
   Reads progressStages + progressStep from order
══════════════════════════════════════════════ */
function SellerProgressStepper({ order }) {
  const stages      = Array.isArray(order.progressStages) && order.progressStages.length > 0
    ? order.progressStages
    : ["Order Confirmed", "Packed", "Out for Delivery", "Delivered"];
  const currentStep = typeof order.progressStep === "number" ? order.progressStep : -1;

  return (
    <div className="ord-progress">
      {/* Order placed — always done */}
      <div className="ord-p-step ord-p-step--done">
        <div className="ord-p-col">
          <div className="ord-p-dot ord-p-dot--done">
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="ord-p-line ord-p-line--done" />
        </div>
        <div className="ord-p-body">
          <div className="ord-p-name">Order Placed</div>
          <div className="ord-p-sub">{fmtDate(order.createdAt)}</div>
        </div>
      </div>

      {stages.map((stage, i) => {
        const done   = i <= currentStep;
        const active = i === currentStep + 1;
        const isLast = i === stages.length - 1;
        return (
          <div key={i} className={`ord-p-step${done ? " ord-p-step--done" : active ? " ord-p-step--active" : ""}`}>
            <div className="ord-p-col">
              <div className={`ord-p-dot${done ? " ord-p-dot--done" : active ? " ord-p-dot--active" : ""}`}>
                {done && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              {!isLast && <div className={`ord-p-line${done ? " ord-p-line--done" : ""}`} />}
            </div>
            <div className="ord-p-body">
              <div className="ord-p-name">{stage}</div>
              {done   && <div className="ord-p-sub ord-p-sub--done">Completed</div>}
              {active && <div className="ord-p-sub ord-p-sub--active">In progress…</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   DEFAULT STATUS STEPPER (fallback)
══════════════════════════════════════════════ */
function DefaultStepper({ order }) {
  const visualStatus = getVisualStatus(order.status, order.paymentStatus, order.paid);
  const stepIndex    = getDefaultStepIndex(visualStatus);

  return (
    <div className="ord-default-track">
      {DEFAULT_STEPS.map((step, i) => {
        const done    = i < stepIndex;
        const current = i === stepIndex;
        return (
          <div className="ord-dt-step" key={step}>
            <div className="ord-dt-node">
              {i > 0 && <div className={`ord-dt-line ord-dt-line--left${done||current?" ord-dt-line--filled":""}`} />}
              <div className={`ord-dt-dot${done?" ord-dt-dot--done":current?" ord-dt-dot--active":" ord-dt-dot--future"}`}>
                {done && (
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              {i < DEFAULT_STEPS.length-1 && <div className={`ord-dt-line ord-dt-line--right${done?" ord-dt-line--filled":""}`} />}
            </div>
            <span className={`ord-dt-label${!done&&!current?" ord-dt-label--faint":""}`}>
              {DEFAULT_STEP_LABELS[step] || titleize(step)}
            </span>
            {(done||current) && (
              <span className="ord-dt-time">{current ? "In progress…" : "Done"}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   BEME DELIVERY TRACKER
   Shown only when order.delivery?.isBemeDelivery === true.
   Tracks delivery.status (a separate state machine from the
   order's own status/progressStages above) and surfaces the
   Pay Now button at exactly the right moment for pay_at_door
   orders. This component owns its own Pay Now loading/error
   state, separate from the page-level confirm-received state.
══════════════════════════════════════════════ */
function BemeDeliveryTracker({ order, onPayNow, payingNow, payNowError }) {
  const delivery = order.delivery || {};
  const status = delivery.status || "pending_dispatch";
  const stepIndex = Math.max(0, BEME_DELIVERY_STAGES.indexOf(status));
  const isPayAtDoor = delivery.paymentTiming === "pay_at_door";
  const payAtDoorStatus = delivery.payAtDoorStatus;

  const showPayNow = isPayAtDoor
    && payAtDoorStatus === "awaiting_payment"
    && PAY_AT_DOOR_ELIGIBLE_STATUSES.includes(status);

  const payAtDoorPaid = isPayAtDoor && payAtDoorStatus === "paid";
  const payAtDoorFailed = isPayAtDoor && payAtDoorStatus === "failed";

  return (
    <div className="ord-section">
      <div className="ord-section-head">
        <span className="ord-section-title">Courier Delivery</span>
        {isPayAtDoor && (
          <span className={`ord-pad-badge${payAtDoorPaid ? " ord-pad-badge--paid" : payAtDoorFailed ? " ord-pad-badge--failed" : ""}`}>
            {payAtDoorPaid ? "Payment confirmed" : payAtDoorFailed ? "Payment failed" : "Pay at Door"}
          </span>
        )}
      </div>

      <div className="ord-beme-track">
        {BEME_DELIVERY_STAGES.map((stage, i) => {
          const done = i <= stepIndex && status !== "failed";
          const isFailed = status === "failed";
          return (
            <div key={stage} className="ord-dt-step">
              <div className="ord-dt-node">
                {i > 0 && <div className={`ord-dt-line ord-dt-line--left${done ? " ord-dt-line--filled" : ""}`} />}
                <div className={`ord-dt-dot${done ? " ord-dt-dot--done" : i === stepIndex + 1 && !isFailed ? " ord-dt-dot--active" : " ord-dt-dot--future"}`}>
                  {done && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                {i < BEME_DELIVERY_STAGES.length - 1 && <div className={`ord-dt-line ord-dt-line--right${done ? " ord-dt-line--filled" : ""}`} />}
              </div>
              <span className={`ord-dt-label${!done ? " ord-dt-label--faint" : ""}`}>{BEME_STAGE_LABELS[stage]}</span>
            </div>
          );
        })}
      </div>

      {status === "failed" && (
        <div className="ord-beme-failed-note">
          Delivery attempt unsuccessful{delivery.failReason ? ` — ${delivery.failReason}` : ""}. Our team will be in touch to reschedule.
        </div>
      )}

      {delivery.courierProvider && status !== "failed" && (
        <div className="ord-beme-meta">
          <span>Courier: <strong>{delivery.courierProvider}</strong></span>
          {delivery.trackingNumber && <span>Tracking: <strong>{delivery.trackingNumber}</strong></span>}
        </div>
      )}

      {isPayAtDoor && !showPayNow && !payAtDoorPaid && status !== "delivered" && status !== "failed" && (
        <div className="ord-pad-note">
          You'll pay when the courier arrives with your order — no need to do anything yet.
        </div>
      )}

      {showPayNow && (
        <div className="ord-paynow-block">
          <p className="ord-paynow-text">Your courier has arrived. Complete payment to receive your order.</p>
          <button type="button" className="ord-paynow-btn" onClick={() => onPayNow(order.id)} disabled={payingNow === order.id}>
            {payingNow === order.id ? "Redirecting…" : `Pay Now — ${fmtMoney(order?.pricing?.total)}`}
          </button>
          {payNowError && <div className="ord-paynow-error">{payNowError}</div>}
        </div>
      )}

      {payAtDoorFailed && (
        <div className="ord-paynow-block">
          <p className="ord-paynow-text ord-paynow-text--warn">
            Your last payment attempt didn't go through. Our team will reschedule the courier — you'll see a Pay Now button again when they arrive.
          </p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function Orders() {
  const { user, loading } = useAuth();
  const [orders,        setOrders]        = useState([]);
  const [pageError,     setPageError]     = useState("");
  const [loadingOrders, setLoadingOrders] = useState(true);

  // BEME DELIVERY: per-action state, keyed by orderId so multiple
  // cards can be in-flight independently without fighting each other.
  const [confirmingId,  setConfirmingId]  = useState(null);
  const [confirmError,  setConfirmError]  = useState({});
  const [payingNowId,   setPayingNowId]   = useState(null);
  const [payNowErrors,  setPayNowErrors]  = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (loading) return;
      if (!user) { if (!cancelled) { setOrders([]); setPageError(""); setLoadingOrders(false); } return; }
      setLoadingOrders(true);
      try {
        const rows = await fetchOwnOrders();
        if (cancelled) return;
        rows.sort((a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt));
        setOrders(rows); setPageError("");
      } catch (error) {
        if (cancelled) return;
        setOrders([]); setPageError(error?.message || "Failed to load orders.");
      } finally { if (!cancelled) setLoadingOrders(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [user, loading]);

  const hasOrders = useMemo(() => orders.length > 0, [orders]);

  /* ── BEME DELIVERY: handlers ── */
  const handleConfirmReceived = async (orderId) => {
    setConfirmingId(orderId);
    setConfirmError(prev => ({ ...prev, [orderId]: "" }));
    try {
      await confirmOrderReceived(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, customerConfirmed: true } : o));
    } catch (e) {
      setConfirmError(prev => ({ ...prev, [orderId]: e?.message || "Failed to confirm receipt." }));
    } finally {
      setConfirmingId(null);
    }
  };

  const handlePayNow = async (orderId) => {
    setPayingNowId(orderId);
    setPayNowErrors(prev => ({ ...prev, [orderId]: "" }));
    try {
      const result = await initPayAtDoor(orderId);
      window.location.href = result.authorization_url;
    } catch (e) {
      setPayNowErrors(prev => ({ ...prev, [orderId]: e?.message || "Failed to start payment." }));
      setPayingNowId(null);
    }
  };

  if (loading || loadingOrders) {
    return (
      <div className="ord-page">
        <div className="ord-wrap">
          <div className="ord-head">
            <div><p className="ord-eyebrow">Account</p><h1 className="ord-title">Your Orders</h1></div>
          </div>
          <div className="ord-list"><OrderSkeleton /><OrderSkeleton /></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="ord-page">
        <div className="ord-wrap">
          <div className="ord-empty-card">
            <div className="ord-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h2 className="ord-empty-title">Sign in to see your orders</h2>
            <p className="ord-empty-text">Your order history will appear here once you're logged in.</p>
            <Link to="/login" className="ord-action-btn">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ord-page">
      <div className="ord-wrap">

        <div className="ord-head">
          <div><p className="ord-eyebrow">Account</p><h1 className="ord-title">Your Orders</h1></div>
          <Link to="/shop" className="ord-link-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Continue shopping
          </Link>
        </div>

        {pageError ? (
          <div className="ord-empty-card">
            <div className="ord-empty-icon ord-empty-icon--warn">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/>
                <circle cx="12" cy="16.5" r=".75" fill="currentColor"/>
              </svg>
            </div>
            <p className="ord-empty-text">{pageError}</p>
          </div>

        ) : !hasOrders ? (
          <div className="ord-empty-card">
            <div className="ord-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <h2 className="ord-empty-title">No orders yet</h2>
            <p className="ord-empty-text">When you place an order, it will show up here with live tracking.</p>
            <Link to="/shop" className="ord-action-btn">Start shopping</Link>
          </div>

        ) : (
          <div className="ord-list">
            {orders.map(order => {
              const rawStatus = normalizeStatus(order.status || "pending");
              const hasSellerProgress = (Array.isArray(order.progressStages) && order.progressStages.length > 0) || (typeof order.progressStep === "number" && order.progressStep >= 0);
              const isBemeDelivery = order.delivery?.isBemeDelivery === true;

              const total    = order.pricing?.total    ?? order.amounts?.total    ?? 0;
              const subtotal = order.pricing?.subtotal ?? order.amounts?.subtotal ?? total;
              const discount     = order.pricing?.discount ?? order.amounts?.discount ?? 0;
              const discountCode = order.pricing?.discountCode ?? order.amounts?.discountCode ?? null;
              const shipping = order.pricing?.shipping ?? order.amounts?.shipping ?? order.delivery?.fee ?? order.delivery?.mallPickup?.fee ?? 0;

              const createdAt      = fmtDate(order.createdAt);
              const deliveryAt     = fmtDate(order.estimatedDelivery ?? order.deliveryDate ?? null);
              const items          = Array.isArray(order.items) ? order.items : [];
              const deliverySummary = getDeliverySummary(order.delivery);
              const courier        = String(order.delivery?.courier || order.courier || "").trim();
              const address        = String(order.delivery?.address || order.delivery?.homeDelivery?.address || order.address || "").trim();

              const badgeClass = ["paid","processing","shipped","delivered"].includes(rawStatus) ? "ord-badge--green"
                : ["payment_failed","failed"].includes(rawStatus) ? "ord-badge--red"
                : "ord-badge--gray";

              // BEME DELIVERY: confirm-received eligibility — mirrors the
              // backend's isFulfillable check (orderRoutes.js), works for
              // any order type, not just Beme courier.
              const deliveryStatus = order.delivery?.status || null;
              const fulfillableOrderStatuses = ["delivered","shipped","processing","paid"];
              const isFulfillable = deliveryStatus === "delivered" || (!deliveryStatus && fulfillableOrderStatuses.includes(rawStatus));
              const showConfirmButton = isFulfillable && !order.customerConfirmed;

              return (
                <article className="ord-card" key={order.id}>

                  {/* ── Header ── */}
                  <div className="ord-card-header">
                    <div className="ord-card-header-left">
                      <div className="ord-card-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                          <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                      </div>
                      <div>
                        <p className="ord-card-label">Order ID</p>
                        <h2 className="ord-card-id">#{String(order.id || "").slice(0,8).toUpperCase()}</h2>
                      </div>
                    </div>
                    <span className={`ord-badge ${badgeClass}`}>{titleize(rawStatus)}</span>
                  </div>

                  {/* ── BEME DELIVERY: courier tracker, shown only for Beme-courier orders ── */}
                  {isBemeDelivery && (
                    <BemeDeliveryTracker
                      order={order}
                      onPayNow={handlePayNow}
                      payingNow={payingNowId}
                      payNowError={payNowErrors[order.id]}
                    />
                  )}

                  {/* ── Progress tracker (existing order-status track, unchanged) ── */}
                  <div className="ord-section">
                    <div className="ord-section-head">
                      <span className="ord-section-title">
                        {hasSellerProgress ? "Delivery Progress" : "Order Tracking"}
                      </span>
                      {deliveryAt !== "—" && (
                        <span className="ord-section-sub">EST: {deliveryAt}</span>
                      )}
                    </div>
                    {hasSellerProgress
                      ? <SellerProgressStepper order={order} />
                      : <DefaultStepper order={order} />
                    }
                  </div>

                  {/* ── Meta row ── */}
                  <div className="ord-meta-row">
                    <div className="ord-meta-item">
                      <span className="ord-meta-label">Order Date</span>
                      <strong className="ord-meta-value">{createdAt}</strong>
                    </div>
                    {deliveryAt !== "—" && (
                      <div className="ord-meta-item">
                        <span className="ord-meta-label">Delivery Date</span>
                        <strong className="ord-meta-value">{deliveryAt}</strong>
                      </div>
                    )}
                    {courier && (
                      <div className="ord-meta-item">
                        <span className="ord-meta-label">Courier</span>
                        <strong className="ord-meta-value ord-meta-truncate">{courier}</strong>
                      </div>
                    )}
                    {address && (
                      <div className="ord-meta-item">
                        <span className="ord-meta-label">Address</span>
                        <strong className="ord-meta-value ord-meta-truncate">{address}</strong>
                      </div>
                    )}
                    {deliverySummary && !courier && !address && (
                      <div className="ord-meta-item">
                        <span className="ord-meta-label">Delivery</span>
                        <strong className="ord-meta-value">{deliverySummary.label}</strong>
                      </div>
                    )}
                  </div>

                  {/* ── Summary ── */}
                  <div className="ord-section">
                    <div className="ord-section-head">
                      <span className="ord-section-title">Order Summary</span>
                    </div>
                    <div className="ord-summary">
                      <div className="ord-summary-row"><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
                      {discount > 0 && (
                        <div className="ord-summary-row ord-summary-row--discount">
                          <span>Discount{discountCode ? <small style={{marginLeft:5,opacity:0.75}}>{discountCode}</small> : ""}</span>
                          <span>-{fmtMoney(discount)}</span>
                        </div>
                      )}
                      <div className="ord-summary-row"><span>Delivery</span><span>{fmtMoney(shipping)}</span></div>
                      {order.delivery?.breakdown && (
                        <>
                          <div className="ord-summary-row ord-summary-row--sub"><span>· Regional base</span><span>{fmtMoney(order.delivery.breakdown.regionalBaseFee)}</span></div>
                          <div className="ord-summary-row ord-summary-row--sub"><span>· Method fee</span><span>{fmtMoney(order.delivery.breakdown.methodFee)}</span></div>
                          <div className="ord-summary-row ord-summary-row--sub"><span>· Abroad fee</span><span>{fmtMoney(order.delivery.breakdown.abroadFee)}</span></div>
                        </>
                      )}
                      <div className="ord-summary-divider"/>
                      <div className="ord-summary-row ord-summary-row--total"><span>Total</span><span>{fmtMoney(total)}</span></div>
                    </div>
                  </div>

                  {/* ── Items ── */}
                  <div className="ord-section">
                    <div className="ord-section-head">
                      <span className="ord-section-title">Items</span>
                      <span className="ord-section-sub">{items.length} item{items.length===1?"":"s"}</span>
                    </div>
                    <div className="ord-items">
                      {items.slice(0, 3).map((item, index) => {
                        const opts = extractItemOptions(item);
                        return (
                          <div className="ord-item" key={item.id || `${order.id}-${index}`}>
                            <div className="ord-item-img">
                              {item.image
                                ? <img src={item.image} alt={item.name || "Product"} className="ord-item-img-tag" />
                                : <div className="ord-item-img-empty">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                      <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                                    </svg>
                                  </div>
                              }
                            </div>
                            <div className="ord-item-info">
                              <span className="ord-item-name">{item.name || "Product"}</span>
                              {opts.length > 0 && (
                                <div className="ord-item-chips">
                                  {opts.map((line, i) => <span className="ord-item-chip" key={`${item.id||index}-opt-${i}`}>{line}</span>)}
                                </div>
                              )}
                            </div>
                            <div className="ord-item-right">
                              <span className="ord-item-price">{fmtMoney(item.price || 0)}</span>
                              <span className="ord-item-qty">Qty: {item.qty || 1}</span>
                            </div>
                          </div>
                        );
                      })}
                      {items.length > 3 && (
                        <p className="ord-more-items">+{items.length - 3} more item{items.length-3===1?"":"s"}</p>
                      )}
                    </div>
                  </div>

                  {/* ── BEME DELIVERY: Confirm Received — works for ANY order type ── */}
                  {showConfirmButton && (
                    <div className="ord-section ord-confirm-section">
                      <p className="ord-confirm-text">Have you received this order?</p>
                      <button type="button" className="ord-confirm-btn" onClick={() => handleConfirmReceived(order.id)} disabled={confirmingId === order.id}>
                        {confirmingId === order.id ? "Confirming…" : "Confirm Received"}
                      </button>
                      {confirmError[order.id] && <div className="ord-confirm-error">{confirmError[order.id]}</div>}
                    </div>
                  )}
                  {order.customerConfirmed === true && (
                    <div className="ord-section ord-confirm-section ord-confirm-section--done">
                      <span className="ord-confirm-done-badge">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        You confirmed receiving this order
                      </span>
                    </div>
                  )}

                  {/* ── Footer ── */}
                  <div className="ord-card-footer">
                    <Link to={`/orders/${order.id}`} className="ord-view-btn">
                      View details
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </Link>
                  </div>

                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}