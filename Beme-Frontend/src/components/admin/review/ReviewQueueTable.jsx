import "./ReviewQueueTable.css";

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

export default function ReviewQueueTable({
  orders = [],
  activeOrderId = "",
  onSelectOrder,
  emptyText = "No orders found.",
}) {
  return (
    <div className="review-queue-table">
      {!orders.length ? (
        <div className="review-queue-table__empty">{emptyText}</div>
      ) : (
        <div className="review-queue-table__list">
          {orders.map((order) => {
            const isActive = activeOrderId === order.id;
            const total = getOrderTotal(order);
            const itemCount = Array.isArray(order?.items) ? order.items.length : 0;
            const customerName = [
              order?.customer?.firstName || "",
              order?.customer?.lastName || "",
            ]
              .join(" ")
              .trim();

            return (
              <button
                key={order.id}
                type="button"
                className={`review-queue-table__card ${
                  isActive ? "is-active" : ""
                }`}
                onClick={() => onSelectOrder?.(order)}
              >
                <div className="review-queue-table__top">
                  <strong>#{String(order.id || "").slice(0, 8)}</strong>
                  <span className="review-queue-table__badge">
                    {titleize(getReviewBucket(order))}
                  </span>
                </div>

                <div className="review-queue-table__body">
                  <div className="review-queue-table__name">
                    {customerName || "Customer"}
                  </div>
                  <div className="review-queue-table__meta">
                    <span>{order?.customer?.phone || "No phone"}</span>
                    <span>{formatDateTime(order?.createdAt)}</span>
                  </div>
                </div>

                <div className="review-queue-table__bottom">
                  <span>
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                  </span>
                  <strong>GHS {Number(total).toFixed(2)}</strong>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}