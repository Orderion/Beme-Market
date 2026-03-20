import "./ProfitBreakdownCard.css";

function formatMoney(value) {
  return `GHS ${Number(value || 0).toFixed(2)}`;
}

export default function ProfitBreakdownCard({ order }) {
  if (!order) return null;

  const subtotal = order?.pricing?.subtotal || 0;
  const delivery = order?.pricing?.deliveryFee || 0;
  const total = order?.pricing?.total || 0;

  const costEstimate =
    (order?.items || []).reduce(
      (sum, item) => sum + (item?.basePrice || item?.price || 0) * (item?.qty || 1),
      0
    ) || 0;

  const grossProfit = total - costEstimate;

  return (
    <div className="profit-card">
      <div className="profit-card__head">
        <h3>Profit Breakdown</h3>
        <span className="profit-card__tag">Estimate</span>
      </div>

      <div className="profit-card__grid">
        <div className="profit-card__row">
          <span>Subtotal</span>
          <strong>{formatMoney(subtotal)}</strong>
        </div>

        <div className="profit-card__row">
          <span>Delivery Fee</span>
          <strong>{formatMoney(delivery)}</strong>
        </div>

        <div className="profit-card__row profit-card__row--highlight">
          <span>Total Paid</span>
          <strong>{formatMoney(total)}</strong>
        </div>

        <div className="profit-card__divider" />

        <div className="profit-card__row">
          <span>Estimated Cost</span>
          <strong>{formatMoney(costEstimate)}</strong>
        </div>

        <div className="profit-card__row profit-card__row--profit">
          <span>Gross Profit</span>
          <strong>{formatMoney(grossProfit)}</strong>
        </div>
      </div>

      <p className="profit-card__note">
        Profit is estimated using base prices. Final supplier cost may vary.
      </p>
    </div>
  );
}