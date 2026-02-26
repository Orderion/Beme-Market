import "./InfoPages.css";

export default function Contact() {
  return (
    <div className="info-page">
      <h1>Contact</h1>
      <p className="muted">We reply fast during working hours.</p>

      <div className="info-card">
        <h3>Email</h3>
        <p>support@bememarket.com</p>
      </div>

      <div className="info-card">
        <h3>Phone / WhatsApp</h3>
        <p>+233 XX XXX XXXX</p>
      </div>
    </div>
  );
}