import "./ReviewFlagsCard.css";

export default function ReviewFlagsCard({ order }) {
  if (!order) return null;

  const flags = [];

  // 🚨 Payment check
  if (order.paymentMethod === "paystack" && order.paymentStatus !== "paid") {
    flags.push({
      type: "warning",
      label: "Payment not confirmed",
      desc: "This Paystack order is not marked as paid.",
    });
  }

  // 🚨 Stock issues
  const outOfStockItems = (order.items || []).filter(
    (item) => item.inStock === false || (item.stock ?? 1) <= 0
  );

  if (outOfStockItems.length > 0) {
    flags.push({
      type: "danger",
      label: "Out of stock items",
      desc: `${outOfStockItems.length} item(s) are unavailable.`,
    });
  }

  // 🚨 Abroad shipping
  const abroadItems = (order.items || []).filter(
    (item) => item.shipsFromAbroad === true
  );

  if (abroadItems.length > 0) {
    flags.push({
      type: "info",
      label: "International shipping",
      desc: `${abroadItems.length} item(s) ship from abroad.`,
    });
  }

  // 🚨 High value order
  if ((order.pricing?.total || 0) > 5000) {
    flags.push({
      type: "warning",
      label: "High value order",
      desc: "This order exceeds GHS 5000.",
    });
  }

  return (
    <div className="review-flags">
      <div className="review-flags__head">
        <h3>Review Flags</h3>
      </div>

      {!flags.length ? (
        <div className="review-flags__empty">
          No issues detected. This order looks safe to approve.
        </div>
      ) : (
        <div className="review-flags__list">
          {flags.map((flag, index) => (
            <div
              key={index}
              className={`review-flags__item review-flags__item--${flag.type}`}
            >
              <div className="review-flags__label">{flag.label}</div>
              <div className="review-flags__desc">{flag.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}