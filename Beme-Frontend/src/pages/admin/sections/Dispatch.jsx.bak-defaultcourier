// src/pages/admin/sections/Dispatch.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuth } from "firebase/auth";

/* ══════════════════════════════════════
   This is a functional control surface for admin to operate the Beme
   Delivery pipeline — it is not meant to be a flagship UI. The actual
   product experience lives on the seller's order detail (BemeDeliveryPanel)
   and the customer's Orders page (BemeDeliveryTracker). Admin just needs
   to see the queue and take the right action at each stage.
══════════════════════════════════════ */

const COURIER_OPTIONS = [
  { id: "kwikdelivery", label: "KwikDelivery" },
  { id: "cheetah",       label: "Cheetah Express" },
  { id: "glovo",         label: "Glovo" },
  { id: "dhl",           label: "DHL eCommerce" },
];

const ZONE_OPTIONS = [
  { id: "within_accra",      label: "Within Accra" },
  { id: "accra_to_kumasi",   label: "Accra → Kumasi" },
  { id: "accra_to_regions",  label: "Accra → Regions" },
  { id: "nationwide",        label: "Nationwide" },
];

const STATUS_LABELS = {
  pending_dispatch: "Needs Dispatch",
  dispatched:        "Dispatched",
  picked_up:         "Picked Up",
  in_transit:        "In Transit",
  delivered:         "Delivered",
  failed:            "Failed",
};

const STATUS_COLOR_VAR = {
  pending_dispatch: "var(--ap-warn, #f59e0b)",
  dispatched:        "var(--ap-purple, #8b5cf6)",
  picked_up:         "var(--ap-purple-lt, #a78bfa)",
  in_transit:        "var(--ap-purple-lt, #a78bfa)",
  delivered:         "var(--ap-success, #22c55e)",
  failed:            "var(--ap-danger, #ef4444)",
};

const FILTER_TABS = [
  { key: "active",  label: "Active Queue" },
  { key: "pending_dispatch", label: "Needs Dispatch" },
  { key: "dispatched",       label: "Dispatched" },
  { key: "picked_up",        label: "Picked Up" },
  { key: "in_transit",       label: "In Transit" },
  { key: "delivered",        label: "Delivered" },
  { key: "failed",           label: "Failed" },
];

function fmtMoney(n) { return `GHS ${Number(n || 0).toFixed(2)}`; }

function fmtDate(ts) {
  if (!ts) return "—";
  try {
    const ms = typeof ts?.toMillis === "function" ? ts.toMillis()
      : typeof ts?._seconds === "number" ? ts._seconds * 1000
      : typeof ts?.seconds === "number" ? ts.seconds * 1000
      : new Date(ts).getTime();
    if (!Number.isFinite(ms)) return "—";
    return new Date(ms).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

async function getAuthHeaders() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not signed in.");
  const token = await currentUser.getIdToken(true);
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function getApiBase() {
  return String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/+$/, "");
}

/* ── Status pill ── */
function StatusPill({ status }) {
  const color = STATUS_COLOR_VAR[status] || "var(--ap-muted)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
      background: "rgba(255,255,255,0.06)", color,
      border: `1px solid ${color}`, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {STATUS_LABELS[status] || status || "Unknown"}
    </span>
  );
}

/* ── Payment timing badge ── */
function PaymentTimingBadge({ delivery }) {
  if (delivery?.paymentTiming === "pay_at_door") {
    const padStatus = delivery?.payAtDoorStatus;
    const color = padStatus === "paid" ? "var(--ap-success,#22c55e)"
      : padStatus === "failed" ? "var(--ap-danger,#ef4444)"
      : "var(--ap-warn,#f59e0b)";
    return (
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color, background: "rgba(255,255,255,0.05)", border: `1px solid ${color}`, whiteSpace: "nowrap" }}>
        Pay at Door · {padStatus === "paid" ? "Paid" : padStatus === "failed" ? "Payment failed" : "Awaiting payment"}
      </span>
    );
  }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: "var(--ap-muted)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--ap-border)", whiteSpace: "nowrap" }}>
      Prepaid
    </span>
  );
}

/* ── Dispatch modal — book a courier ── */
function DispatchModal({ order, onClose, onSuccess }) {
  const [courierProvider, setCourierProvider] = useState("");
  const [zone, setZone]                       = useState("");
  const [trackingNumber, setTrackingNumber]   = useState("");
  const [estimatedPickup, setEstimatedPickup] = useState("");
  const [notes, setNotes]                     = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState("");

  const handleSubmit = async () => {
    if (!courierProvider) { setError("Select a courier provider."); return; }
    if (!zone)            { setError("Select a delivery zone."); return; }
    if (!trackingNumber.trim()) { setError("Enter a tracking number."); return; }
    setSubmitting(true); setError("");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBase()}/api/delivery/${order.id}/dispatch`, {
        method: "POST", headers,
        body: JSON.stringify({ courierProvider, zone, trackingNumber: trackingNumber.trim(), estimatedPickup: estimatedPickup.trim(), notes: notes.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to dispatch.");
      onSuccess();
    } catch (e) {
      setError(e?.message || "Failed to dispatch courier.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--ap-card2)", border: "1px solid var(--ap-border)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, fontFamily: "var(--ap-font)" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ap-text)", marginBottom: 4 }}>Dispatch Courier</div>
        <div style={{ fontSize: 12, color: "var(--ap-muted)", marginBottom: 18 }}>Order #{String(order.id).slice(0, 8).toUpperCase()}</div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--ap-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Courier Provider</label>
          <select value={courierProvider} onChange={e => setCourierProvider(e.target.value)} style={selectStyle}>
            <option value="">Select provider…</option>
            {COURIER_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--ap-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Delivery Zone</label>
          <select value={zone} onChange={e => setZone(e.target.value)} style={selectStyle}>
            <option value="">Select zone…</option>
            {ZONE_OPTIONS.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--ap-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tracking Number</label>
          <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="e.g. KWK-2026-00184" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--ap-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Estimated Pickup <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
          <input value={estimatedPickup} onChange={e => setEstimatedPickup(e.target.value)} placeholder="e.g. Today, 3–5pm" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--ap-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        {error && <div style={{ fontSize: 12, color: "var(--ap-danger,#ef4444)", marginBottom: 12, fontWeight: 600 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} disabled={submitting} style={ghostBtnStyle}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={primaryBtnStyle}>
            {submitting ? "Dispatching…" : "Dispatch"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Fail modal — genuine delivery failure ── */
function FailModal({ order, onClose, onSuccess }) {
  const [reason, setReason]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");

  const handleSubmit = async () => {
    if (!reason.trim()) { setError("Enter a failure reason."); return; }
    setSubmitting(true); setError("");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBase()}/api/delivery/${order.id}/fail`, {
        method: "POST", headers, body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to mark delivery failure.");
      onSuccess();
    } catch (e) {
      setError(e?.message || "Failed to mark delivery failure.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--ap-card2)", border: "1px solid var(--ap-border)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 380, fontFamily: "var(--ap-font)" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ap-text)", marginBottom: 4 }}>Mark Delivery Failed</div>
        <div style={{ fontSize: 12, color: "var(--ap-muted)", marginBottom: 16 }}>
          Order #{String(order.id).slice(0, 8).toUpperCase()} — payout will remain locked until retried.
        </div>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          placeholder="e.g. Customer unreachable after 3 attempts"
          style={{ ...inputStyle, resize: "vertical", marginBottom: 12 }} />
        {error && <div style={{ fontSize: 12, color: "var(--ap-danger,#ef4444)", marginBottom: 12, fontWeight: 600 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} disabled={submitting} style={ghostBtnStyle}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ ...primaryBtnStyle, background: "var(--ap-danger,#ef4444)" }}>
            {submitting ? "Saving…" : "Mark Failed"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Order row ── */
function OrderRow({ order, onAction, busy }) {
  const del = order.delivery || {};
  const cust = order.customer || {};
  const status = del.status || "pending_dispatch";
  const isPayAtDoor = del.paymentTiming === "pay_at_door";
  const isBusy = busy === order.id;

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12,
      padding: "14px 16px", borderBottom: "1px solid var(--ap-border)",
    }}>
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ap-text)", fontFamily: "monospace" }}>
            #{String(order.id).slice(0, 8).toUpperCase()}
          </span>
          <StatusPill status={status} />
          <PaymentTimingBadge delivery={del} />
        </div>
        <div style={{ fontSize: 13, color: "var(--ap-text2)", fontWeight: 600 }}>
          {cust.firstName} {cust.lastName}
        </div>
        <div style={{ fontSize: 11, color: "var(--ap-muted)", marginTop: 2 }}>
          {[cust.address, cust.area, cust.city, cust.region].filter(Boolean).join(", ")}
        </div>
        {cust.phone && <div style={{ fontSize: 11, color: "var(--ap-muted)" }}>{cust.phone}</div>}
      </div>

      <div style={{ flex: "0 0 140px" }}>
        <div style={{ fontSize: 11, color: "var(--ap-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Total</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ap-text)" }}>{fmtMoney(order?.pricing?.total)}</div>
        <div style={{ fontSize: 11, color: "var(--ap-muted)" }}>Delivery {fmtMoney(del.fee)}</div>
      </div>

      <div style={{ flex: "0 0 140px" }}>
        <div style={{ fontSize: 11, color: "var(--ap-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Courier</div>
        <div style={{ fontSize: 13, color: "var(--ap-text)" }}>{del.courierProvider || "—"}</div>
        {del.trackingNumber && <div style={{ fontSize: 11, color: "var(--ap-muted)", fontFamily: "monospace" }}>{del.trackingNumber}</div>}
      </div>

      <div style={{ flex: "0 0 130px" }}>
        <div style={{ fontSize: 11, color: "var(--ap-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Placed</div>
        <div style={{ fontSize: 12, color: "var(--ap-text2)" }}>{fmtDate(order.createdAt)}</div>
      </div>

      {/* ── Actions — vary by status ── */}
      <div style={{ flex: "1 1 200px", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "flex-start" }}>
        {status === "pending_dispatch" && (
          <button onClick={() => onAction("openDispatch", order)} disabled={isBusy} style={primaryBtnStyleSm}>Dispatch</button>
        )}
        {status === "dispatched" && (
          <button onClick={() => onAction("pickup", order)} disabled={isBusy} style={primaryBtnStyleSm}>{isBusy ? "…" : "Mark Picked Up"}</button>
        )}
        {status === "picked_up" && (
          <button onClick={() => onAction("inTransit", order)} disabled={isBusy} style={ghostBtnStyleSm}>{isBusy ? "…" : "Mark In Transit"}</button>
        )}
        {(status === "picked_up" || status === "in_transit") && (
          <>
            {(!isPayAtDoor || del.payAtDoorStatus === "paid") && (
              <button onClick={() => onAction("deliver", order)} disabled={isBusy} style={primaryBtnStyleSm}>{isBusy ? "…" : "Mark Delivered"}</button>
            )}
            {isPayAtDoor && del.payAtDoorStatus === "awaiting_payment" && (
              <button onClick={() => onAction("paymentFailed", order)} disabled={isBusy} style={warnBtnStyleSm}>Payment Failed at Door</button>
            )}
            {isPayAtDoor && del.payAtDoorStatus === "failed" && (
              <button onClick={() => onAction("reschedulePayment", order)} disabled={isBusy} style={ghostBtnStyleSm}>{isBusy ? "…" : "Reschedule Payment"}</button>
            )}
          </>
        )}
        {!["delivered", "failed"].includes(status) && status !== "pending_dispatch" && (
          <button onClick={() => onAction("openFail", order)} disabled={isBusy} style={dangerBtnStyleSm}>Mark Failed</button>
        )}
        {status === "failed" && (
          <button onClick={() => onAction("retry", order)} disabled={isBusy} style={ghostBtnStyleSm}>{isBusy ? "…" : "Retry — Re-dispatch"}</button>
        )}
      </div>

      {del.failReason && status === "failed" && (
        <div style={{ flex: "1 1 100%", fontSize: 12, color: "var(--ap-danger,#ef4444)", marginTop: 6 }}>
          Reason: {del.failReason}
        </div>
      )}
    </div>
  );
}

/* ── Shared inline styles, matching the ap-* CSS-variable system ── */
const selectStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--ap-border)", background: "var(--ap-card)",
  color: "var(--ap-text)", fontSize: 13, fontFamily: "var(--ap-font)", outline: "none",
};
const inputStyle = { ...selectStyle };
const primaryBtnStyle = {
  flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
  background: "var(--ap-purple,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700,
  cursor: "pointer", fontFamily: "var(--ap-font)",
};
const ghostBtnStyle = {
  flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid var(--ap-border)",
  background: "transparent", color: "var(--ap-text2)", fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "var(--ap-font)",
};
const primaryBtnStyleSm = {
  padding: "6px 12px", borderRadius: 7, border: "none",
  background: "var(--ap-purple,#8b5cf6)", color: "#fff", fontSize: 12, fontWeight: 700,
  cursor: "pointer", fontFamily: "var(--ap-font)", whiteSpace: "nowrap",
};
const ghostBtnStyleSm = {
  padding: "6px 12px", borderRadius: 7, border: "1px solid var(--ap-border)",
  background: "transparent", color: "var(--ap-text2)", fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "var(--ap-font)", whiteSpace: "nowrap",
};
const warnBtnStyleSm = {
  padding: "6px 12px", borderRadius: 7, border: "1px solid var(--ap-warn,#f59e0b)",
  background: "rgba(245,158,11,0.1)", color: "var(--ap-warn,#f59e0b)", fontSize: 12, fontWeight: 700,
  cursor: "pointer", fontFamily: "var(--ap-font)", whiteSpace: "nowrap",
};
const dangerBtnStyleSm = {
  padding: "6px 12px", borderRadius: 7, border: "1px solid var(--ap-danger,#ef4444)",
  background: "transparent", color: "var(--ap-danger,#ef4444)", fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "var(--ap-font)", whiteSpace: "nowrap",
};

/* ══════════════════════════════════════
   MAIN
══════════════════════════════════════ */
export default function DispatchSection() {
  const [loading, setLoading]   = useState(true);
  const [orders, setOrders]     = useState([]);
  const [stats, setStats]       = useState(null);
  const [filter, setFilter]     = useState("active");
  const [busy, setBusy]         = useState(null);
  const [dispatchModalOrder, setDispatchModalOrder] = useState(null);
  const [failModalOrder, setFailModalOrder]         = useState(null);
  const [actionError, setActionError]               = useState("");

  const loadQueue = useCallback(async (statusFilter) => {
    try {
      const headers = await getAuthHeaders();
      const qs = statusFilter && statusFilter !== "active" ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await fetch(`${getApiBase()}/api/delivery/queue${qs}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) setOrders(data.orders || []);
    } catch (e) {
      console.error("[Dispatch] queue load failed:", e);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBase()}/api/delivery/stats`, { headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) setStats(data);
    } catch (e) {
      console.error("[Dispatch] stats load failed:", e);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadQueue(filter), loadStats()]);
    setLoading(false);
  }, [filter, loadQueue, loadStats]);

  useEffect(() => { refresh(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAction = async (action, order) => {
    setActionError("");
    if (action === "openDispatch")       { setDispatchModalOrder(order); return; }
    if (action === "openFail")           { setFailModalOrder(order); return; }

    const ENDPOINTS = {
      pickup:             `/${order.id}/pickup`,
      inTransit:          `/${order.id}/in-transit`,
      deliver:            `/${order.id}/deliver`,
      retry:              `/${order.id}/retry`,
      paymentFailed:      `/${order.id}/payment-failed-at-door`,
      reschedulePayment:  `/${order.id}/reschedule-payment`,
    };
    const path = ENDPOINTS[action];
    if (!path) return;

    setBusy(order.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBase()}/api/delivery${path}`, { method: "POST", headers, body: JSON.stringify({}) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || "Action failed.");
      await refresh();
    } catch (e) {
      setActionError(e?.message || "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  const STATS_CARDS = useMemo(() => {
    if (!stats) return [];
    const c = stats.counts || {};
    return [
      { label: "Needs Dispatch", value: c.pending_dispatch || 0 },
      { label: "In Progress",    value: (c.dispatched || 0) + (c.picked_up || 0) + (c.in_transit || 0) },
      { label: "Delivered",      value: c.delivered || 0 },
      { label: "Awaiting Door Payment", value: c.awaiting_payment_at_door || 0 },
      { label: "Margin (Delivered)", value: `GHS ${Number(stats.totalMargin || 0).toFixed(0)}` },
    ];
  }, [stats]);

  return (
    <div>
      <div className="ap-page-header">
        <div className="ap-page-title">Beme Delivery — Dispatch</div>
        <div className="ap-page-sub">Manage courier assignment and delivery status for Beme-courier orders</div>
      </div>

      {/* Stat cards */}
      <div className="ap-stats-grid" style={{ marginBottom: 20 }}>
        {(loading || !stats) ? (
          [1, 2, 3, 4, 5].map(i => <div key={i} className="ap-stat ap-stat--skeleton" />)
        ) : (
          STATS_CARDS.map(s => (
            <div key={s.label} className="ap-stat">
              <div className="ap-stat-label">{s.label}</div>
              <div className="ap-stat-value">{s.value}</div>
            </div>
          ))
        )}
      </div>

      {actionError && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid var(--ap-danger,#ef4444)", color: "var(--ap-danger,#ef4444)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {FILTER_TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
            padding: "7px 14px", borderRadius: 8, border: "none", whiteSpace: "nowrap",
            background: filter === tab.key ? "var(--ap-purple,#8b5cf6)" : "rgba(255,255,255,0.06)",
            color: filter === tab.key ? "#fff" : "var(--ap-text2)",
            fontFamily: "var(--ap-font)", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue */}
      <div className="ap-card">
        <div className="ap-card-head">
          <span className="ap-card-title">Dispatch Queue</span>
          <span className="ap-card-sub">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="ap-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="ap-skeleton" style={{ height: 200 }} />
          ) : orders.length === 0 ? (
            <div className="ap-empty"><div className="ap-empty-title">No orders in this view</div></div>
          ) : (
            orders.map(order => (
              <OrderRow key={order.id} order={order} onAction={runAction} busy={busy} />
            ))
          )}
        </div>
      </div>

      {dispatchModalOrder && (
        <DispatchModal
          order={dispatchModalOrder}
          onClose={() => setDispatchModalOrder(null)}
          onSuccess={() => { setDispatchModalOrder(null); refresh(); }}
        />
      )}
      {failModalOrder && (
        <FailModal
          order={failModalOrder}
          onClose={() => setFailModalOrder(null)}
          onSuccess={() => { setFailModalOrder(null); refresh(); }}
        />
      )}
    </div>
  );
}