import "./InfoPages.css";

export default function ShippingReturns() {
  return (
    <div className="info-page">
      <h1>Shipping & Returns</h1>

      <div className="info-card">
        <h3>Shipping</h3>
        <p>
          Delivery times depend on your region. You’ll receive a confirmation after order.
        </p>
      </div>

      <div className="info-card">
        <h3>Returns</h3>
        <p>
          If there’s an issue with your order, contact support within 48 hours.
        </p>
      </div>
    </div>
  );
}