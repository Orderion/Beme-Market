import "./InfoPages.css";

export default function FAQ() {
  return (
    <div className="info-page">
      <h1>FAQ</h1>

      <div className="info-card">
        <h3>Do I need an account to order?</h3>
        <p>No. You can checkout as a guest.</p>
      </div>

      <div className="info-card">
        <h3>How do I pay?</h3>
        <p>Paystack or Pay on Delivery (where available).</p>
      </div>

      <div className="info-card">
        <h3>How long does delivery take?</h3>
        <p>Usually 1–3 days depending on your location.</p>
      </div>
    </div>
  );
}