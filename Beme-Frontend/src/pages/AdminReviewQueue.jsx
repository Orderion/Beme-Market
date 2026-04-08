import { useEffect, useMemo, useState } from "react";
import { getAdminOrders, updateAdminOrderStatus } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./AdminReviewQueue.css";

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getSortableTime(value) {
  if (!value) return 0;

  try {
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?.seconds === "number") return value.seconds * 1000;
    return new Date(value).getTime() || 0;
  } catch {
    return 0;
  }
}

function formatDateTime(value) {
  const time = getSortableTime(value);
  if (!time) return "—";

  try {
    return new Intl.DateTimeFormat("en-GH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(time));
  } catch {
    return "—";
  }
}

function getOrderTotal(order) {
  const direct =
    order?.pricing?.total ??
    order?.total ??
    order?.amount ??
    order?.grandTotal ??
    order?.subtotal;

  if (Number.isFinite(Number(direct))) return Number(direct);

  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((sum, item) => {
    const price = Number(item?.price || 0);
    const qty = Number(item?.qty || 0);
    return sum + price * qty;
  }, 0);
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getReviewBucket(order) {
  const fulfillmentStatus = normalizeStatus(order?.fulfillmentStatus);
  const status = normalizeStatus(order?.status);
  const paymentStatus = normalizeStatus(order?.paymentStatus);

  if (fulfillmentStatus === "held" || status === "held") return "held";
  if (fulfillmentStatus === "rejected" || status === "rejected") return "rejected";

  if (
    fulfillmentStatus === "approved_for_supplier" ||
    fulfillmentStatus === "sent_to_supplier" ||
    fulfillmentStatus === "supplier_confirmed" ||
    fulfillmentStatus === "shipped" ||
    fulfillmentStatus === "delivered" ||
    status === "approved"
  ) {
    return "approved";
  }

  if (
    fulfillmentStatus === "awaiting_admin_review" ||
    status === "awaiting_admin_review" ||
    paymentStatus === "paid" ||
    status === "paid" ||
    status === "pending"
  ) {
    return "awaiting_review";
  }

  return "other";
}

function summarizeFlags(order) {
  const flags = [];

  const items = Array.isArray(order?.items) ? order.items : [];
  const hasAbroadItem = items.some((item) => item?.shipsFromAbroad === true);

  if (hasAbroadItem) flags.push("Ships from abroad");
  if (!order?.customer?.phone) flags.push("Missing phone");
  if (!order?.customer?.address) flags.push("Missing address");
  if (!order?.customer?.city || !order?.customer?.region) {
    flags.push("Incomplete location");
  }

  return flags;
}

function buildProfitEstimate(order) {
  const pricing = order?.pricing || {};
  const total = Number(pricing.total || 0);
  const supplierItemsCostTotal = Number(pricing.supplierItemsCostTotal || 0);
  const supplierShippingTotal = Number(pricing.supplierShippingTotal || 0);

  if (supplierItemsCostTotal <= 0 && supplierShippingTotal <= 0) {
    return null;
  }

  const expectedProfit = total - supplierItemsCostTotal - supplierShippingTotal;
  return Number.isFinite(expectedProfit) ? expectedProfit : null;
}

function ItemRow({ item }) {
  return (
    <div className="admin-review-item">
      <div className="admin-review-item__left">
        <strong>{item?.name || "Item"}</strong>
        <span>
          Qty: {Number(item?.qty || 1)} • Price: GHS{" "}
          {Number(item?.price || 0).toFixed(2)}
        </span>
        {item?.selectedOptionsLabel ? (
          <small>{item.selectedOptionsLabel}</small>
        ) : null}
      </div>

      <div className="admin-review-item__right">
        {item?.supplierApiType ? (
          <span className="admin-review-pill">
            {titleize(item.supplierApiType)}
          </span>
        ) : null}
        {item?.supplierSku ? (
          <span className="admin-review-pill">{item.supplierSku}</span>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminReviewQueue() {
  const { isAdmin, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [filter, setFilter] = useState("awaiting_review");
  const [activeOrderId, setActiveOrderId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [error, setError] = useState("");

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminOrders();
      const rows = Array.isArray(data?.orders) ? data.orders : [];

      const sorted = [...rows].sort(
        (a, b) => getSortableTime(b?.createdAt) - getSortableTime(a?.createdAt)
      );

      setOrders(sorted);

      if (!activeOrderId && sorted.length) {
        setActiveOrderId(sorted[0].id);
      }
    } catch (err) {
      console.error("Failed to load admin review queue:", err);
      setError(err?.message || "Failed to load review queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((order) => getReviewBucket(order) === filter);
  }, [orders, filter]);

  const activeOrder = useMemo(() => {
    return (
      filteredOrders.find((order) => order.id === activeOrderId) ||
      filteredOrders[0] ||
      null
    );
  }, [filteredOrders, activeOrderId]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setActiveOrderId("");
      return;
    }

    const exists = filteredOrders.some((order) => order.id === activeOrderId);
    if (!exists) {
      setActiveOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, activeOrderId]);

  const runAction = async (nextStatus) => {
    if (!activeOrder?.id || busyId) return;

    try {
      setBusyId(activeOrder.id);

      await updateAdminOrderStatus(activeOrder.id, {
        status: nextStatus,
        reviewNotes: reviewNotes.trim(),
      });

      setReviewNotes("");
      await loadOrders();
    } catch (err) {
      console.error(`Failed to update order to ${nextStatus}:`, err);
      alert(err?.message || "Failed to update order.");
    } finally {
      setBusyId("");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="admin-review-page">
        <div className="admin-review-shell">
          <div className="admin-review-loading">Loading review queue...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-review-page">
        <div className="admin-review-shell">
          <div className="admin-review-empty">
            You do not have permission to view this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-review-page">
      <div className="admin-review-shell">
        <div className="admin-review-head">
          <div>
            <p className="admin-review-eyebrow">Beme Market</p>
            <h1 className="admin-review-title">Admin Review Queue</h1>
            <p className="admin-review-sub">
              Review paid and pending orders before any supplier action.
            </p>
          </div>

          <div className="admin-review-filter-group">
            {[
              ["awaiting_review", "Awaiting Review"],
              ["held", "Held"],
              ["approved", "Approved"],
              ["rejected", "Rejected"],
              ["all", "All"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`admin-review-chip ${
                  filter === key ? "is-active" : ""
                }`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!!error ? <div className="admin-review-error">{error}</div> : null}

        <div className="admin-review-layout">
          <aside className="admin-review-sidebar">
            <div className="admin-review-sidebar__head">
              <h2>Queue</h2>
              <span>{filteredOrders.length}</span>
            </div>

            {!filteredOrders.length ? (
              <div className="admin-review-empty">No orders in this bucket.</div>
            ) : (
              <div className="admin-review-list">
                {filteredOrders.map((order) => {
                  const isActive = activeOrder?.id === order.id;
                  const total = getOrderTotal(order);

                  return (
                    <button
                      key={order.id}
                      type="button"
                      className={`admin-review-list-card ${
                        isActive ? "is-active" : ""
                      }`}
                      onClick={() => setActiveOrderId(order.id)}
                    >
                      <div className="admin-review-list-card__top">
                        <strong>#{String(order.id || "").slice(0, 8)}</strong>
                        <span className="admin-review-status-badge">
                          {titleize(getReviewBucket(order))}
                        </span>
                      </div>

                      <div className="admin-review-list-card__meta">
                        <span>
                          {order?.customer?.firstName || ""}{" "}
                          {order?.customer?.lastName || ""}
                        </span>
                        <span>{order?.customer?.phone || "No phone"}</span>
                        <span>{formatDateTime(order?.createdAt)}</span>
                      </div>

                      <div className="admin-review-list-card__bottom">
                        <span>
                          {Array.isArray(order?.items) ? order.items.length : 0} items
                        </span>
                        <strong>GHS {Number(total).toFixed(2)}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="admin-review-panel">
            {!activeOrder ? (
              <div className="admin-review-empty">
                Select an order to review.
              </div>
            ) : (
              <>
                <div className="admin-review-card">
                  <div className="admin-review-card__head">
                    <div>
                      <p className="admin-review-card__eyebrow">Order</p>
                      <h2>#{activeOrder.id}</h2>
                    </div>

                    <div className="admin-review-badges">
                      <span className="admin-review-pill">
                        Payment: {titleize(activeOrder?.paymentStatus || "pending")}
                      </span>
                      <span className="admin-review-pill">
                        Status: {titleize(activeOrder?.status || "pending")}
                      </span>
                      {activeOrder?.fulfillmentStatus ? (
                        <span className="admin-review-pill">
                          Fulfillment: {titleize(activeOrder.fulfillmentStatus)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="admin-review-grid">
                    <div className="admin-review-detail-card">
                      <h3>Customer</h3>
                      <p>
                        <strong>
                          {activeOrder?.customer?.firstName || ""}{" "}
                          {activeOrder?.customer?.lastName || ""}
                        </strong>
                      </p>
                      <p>{activeOrder?.customer?.email || "—"}</p>
                      <p>{activeOrder?.customer?.phone || "—"}</p>
                    </div>

                    <div className="admin-review-detail-card">
                      <h3>Delivery</h3>
                      <p>{activeOrder?.customer?.address || "—"}</p>
                      <p>
                        {activeOrder?.customer?.city || "—"},{" "}
                        {activeOrder?.customer?.region || "—"}
                      </p>
                      <p>{activeOrder?.customer?.area || "—"}</p>
                    </div>

                    <div className="admin-review-detail-card">
                      <h3>Financials</h3>
                      <p>
                        Subtotal:{" "}
                        <strong>
                          GHS {Number(activeOrder?.pricing?.subtotal || 0).toFixed(2)}
                        </strong>
                      </p>
                      <p>
                        Delivery:{" "}
                        <strong>
                          GHS {Number(activeOrder?.pricing?.deliveryFee || 0).toFixed(2)}
                        </strong>
                      </p>
                      <p>
                        Total:{" "}
                        <strong>
                          GHS {Number(activeOrder?.pricing?.total || 0).toFixed(2)}
                        </strong>
                      </p>
                      {buildProfitEstimate(activeOrder) !== null ? (
                        <p>
                          Est. Profit:{" "}
                          <strong>
                            GHS {Number(buildProfitEstimate(activeOrder)).toFixed(2)}
                          </strong>
                        </p>
                      ) : null}
                    </div>

                    <div className="admin-review-detail-card">
                      <h3>Flags</h3>
                      <div className="admin-review-flag-list">
                        {summarizeFlags(activeOrder).length ? (
                          summarizeFlags(activeOrder).map((flag) => (
                            <span key={flag} className="admin-review-flag">
                              {flag}
                            </span>
                          ))
                        ) : (
                          <span className="admin-review-muted">
                            No basic flags detected.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="admin-review-card">
                  <div className="admin-review-card__head">
                    <div>
                      <p className="admin-review-card__eyebrow">Items</p>
                      <h2>Order Items</h2>
                    </div>
                  </div>

                  <div className="admin-review-items">
                    {(Array.isArray(activeOrder?.items) ? activeOrder.items : []).map(
                      (item, index) => (
                        <ItemRow key={item?.id || `${activeOrder.id}-${index}`} item={item} />
                      )
                    )}
                  </div>
                </div>

                <div className="admin-review-card">
                  <div className="admin-review-card__head">
                    <div>
                      <p className="admin-review-card__eyebrow">Decision</p>
                      <h2>Review Action</h2>
                    </div>
                  </div>

                  <textarea
                    className="admin-review-notes"
                    placeholder="Add review notes, fraud notes, supplier notes, stock observations..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />

                  <div className="admin-review-actions">
                    <button
                      type="button"
                      className="admin-review-btn admin-review-btn--ghost"
                      onClick={() => runAction("held")}
                      disabled={busyId === activeOrder.id}
                    >
                      {busyId === activeOrder.id ? "Please wait..." : "Hold"}
                    </button>

                    <button
                      type="button"
                      className="admin-review-btn admin-review-btn--danger"
                      onClick={() => runAction("rejected")}
                      disabled={busyId === activeOrder.id}
                    >
                      {busyId === activeOrder.id ? "Please wait..." : "Reject"}
                    </button>

                    <button
                      type="button"
                      className="admin-review-btn admin-review-btn--primary"
                      onClick={() => runAction("approved")}
                      disabled={busyId === activeOrder.id}
                    >
                      {busyId === activeOrder.id
                        ? "Please wait..."
                        : "Approve & Send"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}