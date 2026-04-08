import ProfitBreakdownCard from "./ProfitBreakdownCard";
import ReviewFlagsCard from "./ReviewFlagsCard";
import SupplierPushHistory from "./SupplierPushHistory";
import "./ReviewOrderPanel.css";

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

function extractOptionLines(item) {
  const lines = [];

  if (item?.selectedOptionsLabel) {
    lines.push(String(item.selectedOptionsLabel).trim());
  }

  if (Array.isArray(item?.selectedOptionDetails)) {
    item.selectedOptionDetails.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;

      const groupName = String(
        entry?.groupName || entry?.group || entry?.name || entry?.key || ""
      ).trim();
      const label = String(
        entry?.label || entry?.value || entry?.title || ""
      ).trim();

      if (groupName && label) {
        lines.push(`${groupName}: ${label}`);
      } else if (label) {
        lines.push(label);
      }
    });
  }

  if (item?.selectedOptions && typeof item.selectedOptions === "object") {
    Object.entries(item.selectedOptions).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const joined = value.map((part) => String(part || "").trim()).filter(Boolean).join(", ");
        if (joined) lines.push(`${key}: ${joined}`);
        return;
      }

      const cleanValue = String(value || "").trim();
      if (cleanValue) lines.push(`${key}: ${cleanValue}`);
    });
  }

  return Array.from(new Set(lines.filter(Boolean)));
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

function buildFlags(order) {
  const flags = [];
  const items = Array.isArray(order?.items) ? order.items : [];

  if (!order?.customer?.phone) flags.push("Missing phone");
  if (!order?.customer?.address) flags.push("Missing address");
  if (!order?.customer?.city || !order?.customer?.region) {
    flags.push("Incomplete location");
  }

  if (items.some((item) => item?.shipsFromAbroad === true)) {
    flags.push("Ships from abroad");
  }

  if (items.some((item) => item?.inStock === false)) {
    flags.push("Stock mismatch");
  }

  if (
    items.some((item) => {
      const stock = Number(item?.stock);
      const qty = Number(item?.qty || 0);
      return Number.isFinite(stock) && stock >= 0 && qty > stock;
    })
  ) {
    flags.push("Quantity exceeds stock");
  }

  return flags;
}

function ItemCard({ item }) {
  const optionLines = extractOptionLines(item);
  const qty = Number(item?.qty || 1);
  const price = Number(item?.price || 0);
  const supplierCost = Number(item?.supplierCost || 0);
  const abroadFee = Number(item?.abroadDeliveryFee || 0);

  return (
    <div className="review-order-panel__item">
      <div className="review-order-panel__item-main">
        <div className="review-order-panel__item-head">
          <strong>{item?.name || "Item"}</strong>
          <span className="review-order-panel__pill">
            Qty {qty}
          </span>
        </div>

        <div className="review-order-panel__item-meta">
          <span>Sell Price: GHS {price.toFixed(2)}</span>
          {supplierCost > 0 ? (
            <span>Supplier Cost: GHS {supplierCost.toFixed(2)}</span>
          ) : null}
          {abroadFee > 0 ? (
            <span>Abroad Fee: GHS {abroadFee.toFixed(2)}</span>
          ) : null}
        </div>

        {optionLines.length ? (
          <div className="review-order-panel__item-options">
            {optionLines.map((line) => (
              <span key={line} className="review-order-panel__tag">
                {line}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="review-order-panel__item-side">
        {item?.supplierApiType ? (
          <span className="review-order-panel__pill">
            {titleize(item.supplierApiType)}
          </span>
        ) : null}
        {item?.supplierSku ? (
          <span className="review-order-panel__pill">
            SKU: {item.supplierSku}
          </span>
        ) : null}
        {item?.supplierVariantId ? (
          <span className="review-order-panel__pill">
            Variant: {item.supplierVariantId}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function ReviewOrderPanel({
  order,
  reviewNotes = "",
  onReviewNotesChange,
  onApprove,
  onHold,
  onReject,
  busy = false,
}) {
  if (!order) {
    return (
      <div className="review-order-panel">
        <div className="review-order-panel__empty">
          Select an order to review.
        </div>
      </div>
    );
  }

  const items = Array.isArray(order?.items) ? order.items : [];
  const flags = buildFlags(order);
  const total = getOrderTotal(order);

  return (
    <div className="review-order-panel">
      <div className="review-order-panel__card">
        <div className="review-order-panel__head">
          <div>
            <p className="review-order-panel__eyebrow">Order Review</p>
            <h2>#{order.id}</h2>
          </div>

          <div className="review-order-panel__badges">
            <span className="review-order-panel__pill">
              Payment: {titleize(order?.paymentStatus || "pending")}
            </span>
            <span className="review-order-panel__pill">
              Status: {titleize(order?.status || "pending")}
            </span>
            {order?.fulfillmentStatus ? (
              <span className="review-order-panel__pill">
                Fulfillment: {titleize(order.fulfillmentStatus)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="review-order-panel__grid">
          <div className="review-order-panel__info">
            <h3>Customer</h3>
            <p>
              <strong>
                {order?.customer?.firstName || ""} {order?.customer?.lastName || ""}
              </strong>
            </p>
            <p>{order?.customer?.email || "—"}</p>
            <p>{order?.customer?.phone || "—"}</p>
          </div>

          <div className="review-order-panel__info">
            <h3>Delivery</h3>
            <p>{order?.customer?.address || "—"}</p>
            <p>
              {order?.customer?.city || "—"}, {order?.customer?.region || "—"}
            </p>
            <p>{order?.customer?.area || "—"}</p>
          </div>

          <div className="review-order-panel__info">
            <h3>Summary</h3>
            <p>Items: {items.length}</p>
            <p>
              Total: <strong>GHS {Number(total).toFixed(2)}</strong>
            </p>
            <p>Created: {formatDateTime(order?.createdAt)}</p>
          </div>

          <div className="review-order-panel__info">
            <h3>Supplier</h3>
            <p>{order?.supplierStatus ? titleize(order.supplierStatus) : "Not pushed yet"}</p>
            <p>{order?.supplierOrderId || "No supplier order id"}</p>
            <p>{order?.supplierTrackingNumber || "No tracking yet"}</p>
          </div>
        </div>
      </div>

      <div className="review-order-panel__content-grid">
        <div className="review-order-panel__stack">
          <div className="review-order-panel__card">
            <div className="review-order-panel__section-head">
              <div>
                <p className="review-order-panel__eyebrow">Items</p>
                <h2>Order Items</h2>
              </div>
            </div>

            <div className="review-order-panel__items">
              {items.length ? (
                items.map((item, index) => (
                  <ItemCard key={item?.id || `${order.id}-${index}`} item={item} />
                ))
              ) : (
                <div className="review-order-panel__empty">
                  No items found for this order.
                </div>
              )}
            </div>
          </div>

          <div className="review-order-panel__card">
            <div className="review-order-panel__section-head">
              <div>
                <p className="review-order-panel__eyebrow">Decision</p>
                <h2>Review Notes & Action</h2>
              </div>
            </div>

            <textarea
              className="review-order-panel__notes"
              placeholder="Add admin notes, fraud warnings, stock notes, supplier notes..."
              value={reviewNotes}
              onChange={(e) => onReviewNotesChange?.(e.target.value)}
            />

            <div className="review-order-panel__actions">
              <button
                type="button"
                className="review-order-panel__btn review-order-panel__btn--ghost"
                onClick={onHold}
                disabled={busy}
              >
                {busy ? "Please wait..." : "Hold"}
              </button>

              <button
                type="button"
                className="review-order-panel__btn review-order-panel__btn--danger"
                onClick={onReject}
                disabled={busy}
              >
                {busy ? "Please wait..." : "Reject"}
              </button>

              <button
                type="button"
                className="review-order-panel__btn review-order-panel__btn--primary"
                onClick={onApprove}
                disabled={busy}
              >
                {busy ? "Please wait..." : "Approve & Send"}
              </button>
            </div>
          </div>
        </div>

        <div className="review-order-panel__side">
          <ProfitBreakdownCard order={order} />
          <ReviewFlagsCard
            flags={flags}
            reviewNotes={order?.reviewNotes || ""}
            order={order}
          />
          <SupplierPushHistory order={order} />
        </div>
      </div>
    </div>
  );
}