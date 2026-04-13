import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import "./Orders.css";

const STATUS_STEPS = [
  "pending",
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
];

function normalizeStatus(value) {
  return String(value || "pending").trim().toLowerCase();
}

function getVisualStatus(status, paymentStatus, paid) {
  const normalizedStatus = normalizeStatus(status);
  const normalizedPaymentStatus = normalizeStatus(paymentStatus);

  if (paid === true || normalizedPaymentStatus === "paid") {
    if (["processing", "shipped", "delivered"].includes(normalizedStatus)) {
      return normalizedStatus;
    }
    return "paid";
  }

  if (
    [
      "payment_failed", "failed", "verify_error", "cancelled", "canceled",
      "abandoned", "reversed", "amount_mismatch", "invalid_metadata_type",
      "invalid_user", "user_mismatch", "not_found",
    ].includes(normalizedStatus)
  ) {
    return "pending_payment";
  }

  if (STATUS_STEPS.includes(normalizedStatus)) return normalizedStatus;
  return "pending";
}

function getStepIndex(status) {
  const index = STATUS_STEPS.indexOf(status);
  return index === -1 ? 0 : index;
}

function formatMoney(value) {
  return `GHS ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : typeof value?.seconds === "number"
          ? new Date(value.seconds * 1000)
          : typeof value?._seconds === "number"
            ? new Date(value._seconds * 1000)
            : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-GH", {
      year: "numeric", month: "short", day: "2-digit",
    }).format(date);
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
  return String(value || "")
    .replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatOptionPair(key, value) {
  const cleanKey = String(key || "").trim();
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return "";
  return cleanKey ? `${titleize(cleanKey)}: ${cleanValue}` : cleanValue;
}

function extractItemOptions(item) {
  if (!item || typeof item !== "object") return [];
  const collected = [];
  const pushEntry = (text) => {
    const clean = String(text || "").trim();
    if (!clean || collected.includes(clean)) return;
    collected.push(clean);
  };

  pushEntry(item?.selectedOptionsLabel);

  if (Array.isArray(item?.selectedOptionDetails)) {
    item.selectedOptionDetails.forEach((entry) => {
      if (typeof entry === "string") { pushEntry(entry); return; }
      if (entry && typeof entry === "object") {
        pushEntry(formatOptionPair(
          entry?.groupName || entry?.label || entry?.name || entry?.key,
          entry?.label || entry?.value || entry?.title
        ));
      }
    });
  }

  const objectSources = [
    item?.selectedOptions, item?.customizations, item?.customizationOptions,
    item?.options, item?.variant, item?.variantOptions,
  ];

  objectSources.forEach((source) => {
    if (!source || typeof source !== "object" || Array.isArray(source)) return;
    Object.entries(source).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        pushEntry(formatOptionPair(key, value.map((v) => String(v || "").trim()).filter(Boolean).join(", ")));
        return;
      }
      if (value && typeof value === "object") {
        pushEntry(formatOptionPair(key, value?.value ?? value?.label ?? value?.name ?? value?.title ?? ""));
        return;
      }
      pushEntry(formatOptionPair(key, value));
    });
  });

  if (Array.isArray(item?.customizations)) {
    item.customizations.forEach((entry) => {
      if (typeof entry === "string") { pushEntry(entry); return; }
      if (entry && typeof entry === "object") {
        pushEntry(formatOptionPair(
          entry?.label || entry?.name || entry?.key || entry?.title,
          entry?.value || entry?.selected || entry?.option || entry?.label
        ));
      }
    });
  }

  return collected;
}

function getDeliverySummary(delivery) {
  if (!delivery || typeof delivery !== "object") return null;
  const method = String(delivery.method || "").trim().toLowerCase();
  const label = String(delivery.label || "").trim();
  const fee = Number(delivery.fee || 0) || 0;

  if (method === "mall_pickup") {
    const mallLabel = String(delivery?.mallPickup?.label || "").trim();
    const mallArea = String(delivery?.mallPickup?.area || "").trim();
    const pickupFee = Number(delivery?.mallPickup?.fee || 0) || 0;
    return { title: "Mall Pickup", label: mallLabel || label || "Mall Pickup", note: mallArea || "Pickup at selected mall", fee: pickupFee || fee };
  }
  if (method === "home_delivery") {
    const homeLabel = String(delivery?.homeDelivery?.label || "").trim();
    return { title: "Home Delivery", label: homeLabel || label || "Home Delivery", note: "Delivered to your address", fee };
  }
  if (label) return { title: "Delivery", label, note: "", fee };
  return null;
}

async function getAuthHeaders() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("You must be signed in to continue.");
  const token = await currentUser.getIdToken(true);
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

async function fetchOwnOrders() {
  const apiBase = String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/+$/, "");
  if (!apiBase) throw new Error("Missing backend URL. Set VITE_BACKEND_URL.");
  const headers = await getAuthHeaders();
  const res = await fetch(`${apiBase}/api/orders`, { method: "GET", headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Failed to load orders.");
  return Array.isArray(data?.orders) ? data.orders : [];
}

const STEP_LABELS = {
  pending: "Pending",
  pending_payment: "Payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

function getStatusClass(raw) {
  if (["paid", "processing", "shipped", "delivered"].includes(raw)) return "ord-badge--success";
  if (["pending_payment", "payment_failed", "failed"].includes(raw)) return "ord-badge--warn";
  return "ord-badge--neutral";
}

function OrderSkeleton() {
  return (
    <div className="ord-card ord-card--skeleton" aria-hidden="true">
      <div className="ord-skel ord-skel--title" />
      <div className="ord-skel ord-skel--track" />
      <div className="ord-skel ord-skel--row" />
      <div className="ord-skel ord-skel--row ord-skel--short" />
    </div>
  );
}

export default function Orders() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadOrders() {
      if (loading) return;
      if (!user) {
        if (!cancelled) { setOrders([]); setPageError(""); setLoadingOrders(false); }
        return;
      }
      setLoadingOrders(true);
      try {
        const rows = await fetchOwnOrders();
        if (cancelled) return;
        rows.sort((a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt));
        setOrders(rows);
        setPageError("");
      } catch (error) {
        console.error("Orders fetch error:", error);
        if (cancelled) return;
        setOrders([]);
        setPageError(error?.message || "Failed to load orders.");
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    }
    loadOrders();
    return () => { cancelled = true; };
  }, [user, loading]);

  const hasOrders = useMemo(() => orders.length > 0, [orders]);

  if (loading || loadingOrders) {
    return (
      <div className="ord-page">
        <div className="ord-wrap">
          <div className="ord-head">
            <div>
              <p className="ord-eyebrow">Account</p>
              <h1 className="ord-title">Your Orders</h1>
            </div>
          </div>
          <div className="ord-list">
            <OrderSkeleton />
            <OrderSkeleton />
          </div>
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

        {/* PAGE HEADER */}
        <div className="ord-head">
          <div>
            <p className="ord-eyebrow">Account</p>
            <h1 className="ord-title">Your Orders</h1>
          </div>
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
                <circle cx="12" cy="12" r="9"/>
                <line x1="12" y1="8" x2="12" y2="13"/>
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
            <p className="ord-empty-text">
              When you place an order, it will show up here with live tracking.
            </p>
            <Link to="/shop" className="ord-action-btn">Start shopping</Link>
          </div>

        ) : (
          <div className="ord-list">
            {orders.map((order) => {
              const rawStatus = normalizeStatus(order.status || "pending");
              const visualStatus = getVisualStatus(order.status, order.paymentStatus, order.paid);
              const stepIndex = getStepIndex(visualStatus);

              const total    = order.pricing?.total    ?? order.amounts?.total    ?? 0;
              const subtotal = order.pricing?.subtotal ?? order.amounts?.subtotal ?? total;
              const discount = order.pricing?.discount ?? order.amounts?.discount ?? 0;
              const shipping = order.pricing?.shipping ?? order.amounts?.shipping
                ?? order.delivery?.fee ?? order.delivery?.mallPickup?.fee ?? 0;

              const createdAt  = formatDate(order.createdAt);
              const deliveryAt = formatDate(order.estimatedDelivery ?? order.deliveryDate ?? null);
              const items = Array.isArray(order.items) ? order.items : [];
              const deliverySummary = getDeliverySummary(order.delivery);
              const badgeText  = rawStatus === "payment_failed" ? "Payment Failed" : titleize(rawStatus);
              const statusClass = getStatusClass(rawStatus);
              const courier = String(order.delivery?.courier || order.courier || "").trim();
              const address = String(
                order.delivery?.address ||
                order.delivery?.homeDelivery?.address ||
                order.address || ""
              ).trim();

              return (
                <article className="ord-card" key={order.id}>

                  {/* CARD HEADER */}
                  <div className="ord-card-header">
                    <div className="ord-card-header-left">
                      <div className="ord-box-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                          <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                      </div>
                      <div>
                        <p className="ord-card-label">Order ID</p>
                        <h2 className="ord-card-id">#{String(order.id || "").slice(0, 8).toUpperCase()}</h2>
                      </div>
                    </div>
                    <div className="ord-card-header-right">
                      <span className={`ord-badge ${statusClass}`}>{badgeText}</span>
                    </div>
                  </div>

                  {/* TRACKING */}
                  <div className="ord-section">
                    <div className="ord-section-head">
                      <span className="ord-section-title">Order Tracking</span>
                      {deliveryAt !== "—" && (
                        <span className="ord-section-sub">EST: {deliveryAt}</span>
                      )}
                    </div>

                    <div className="ord-track-wrap">
                      <div className="ord-track">
                        {STATUS_STEPS.map((step, index) => {
                          const done    = index < stepIndex;
                          const current = index === stepIndex;
                          return (
                            <div className="ord-track-step" key={step}>
                              <div className="ord-track-node">
                                {index > 0 && (
                                  <div className={`ord-track-line ord-track-line--left ${done || current ? "ord-track-line--filled" : ""}`} />
                                )}
                                <div className={`ord-track-dot ${done ? "ord-track-dot--done" : current ? "ord-track-dot--current" : "ord-track-dot--future"}`}>
                                  {done && (
                                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                                {index < STATUS_STEPS.length - 1 && (
                                  <div className={`ord-track-line ord-track-line--right ${done ? "ord-track-line--filled" : ""}`} />
                                )}
                              </div>
                              <span className={`ord-track-label ${!done && !current ? "ord-track-label--faint" : ""}`}>
                                {STEP_LABELS[step] || titleize(step)}
                              </span>
                              {(done || current) && (
                                <span className="ord-track-time">
                                  {current ? "In progress…" : "Done"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* META ROW */}
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

                  {/* ORDER SUMMARY */}
                  <div className="ord-section">
                    <div className="ord-section-head">
                      <span className="ord-section-title">Order Summary</span>
                    </div>
                    <div className="ord-summary">
                      <div className="ord-summary-row">
                        <span>Sub total</span>
                        <span>{formatMoney(subtotal)}</span>
                      </div>
                      <div className="ord-summary-row">
                        <span>Discount</span>
                        <span className={discount > 0 ? "ord-summary-save" : ""}>{discount > 0 ? `−${formatMoney(discount)}` : formatMoney(0)}</span>
                      </div>
                      <div className="ord-summary-row">
                        <span>Shipping</span>
                        <span>{formatMoney(shipping)}</span>
                      </div>
                      {order.delivery?.breakdown && (
                        <>
                          <div className="ord-summary-row ord-summary-row--sub">
                            <span>· Regional base</span>
                            <span>{formatMoney(order.delivery.breakdown.regionalBaseFee)}</span>
                          </div>
                          <div className="ord-summary-row ord-summary-row--sub">
                            <span>· Method fee</span>
                            <span>{formatMoney(order.delivery.breakdown.methodFee)}</span>
                          </div>
                          <div className="ord-summary-row ord-summary-row--sub">
                            <span>· Abroad fee</span>
                            <span>{formatMoney(order.delivery.breakdown.abroadFee)}</span>
                          </div>
                        </>
                      )}
                      <div className="ord-summary-divider" />
                      <div className="ord-summary-row ord-summary-row--total">
                        <span>Total Amount</span>
                        <span>{formatMoney(total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ITEMS */}
                  <div className="ord-section">
                    <div className="ord-section-head">
                      <span className="ord-section-title">Order Info</span>
                      <span className="ord-section-sub">{items.length} item{items.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="ord-items">
                      {items.slice(0, 3).map((item, index) => {
                        const optionLines = extractItemOptions(item);
                        return (
                          <div className="ord-item" key={item.id || `${order.id}-${index}`}>
                            <div className="ord-item-img">
                              {item.image ? (
                                <img src={item.image} alt={item.name || "Product"} className="ord-item-img-tag" />
                              ) : (
                                <div className="ord-item-img-empty">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <path d="m21 15-5-5L5 21"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="ord-item-info">
                              <span className="ord-item-name">{item.name || "Product"}</span>
                              {optionLines.length > 0 && (
                                <div className="ord-item-chips">
                                  {optionLines.map((line, i) => (
                                    <span className="ord-item-chip" key={`${item.id || index}-opt-${i}`}>{line}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="ord-item-right">
                              <span className="ord-item-price">{formatMoney(item.price || 0)}</span>
                              <span className="ord-item-qty">Qty: {item.qty || 1}</span>
                            </div>
                          </div>
                        );
                      })}
                      {items.length > 3 && (
                        <p className="ord-more-items">+{items.length - 3} more item{items.length - 3 === 1 ? "" : "s"}</p>
                      )}
                    </div>
                  </div>

                  {/* FOOTER */}
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
