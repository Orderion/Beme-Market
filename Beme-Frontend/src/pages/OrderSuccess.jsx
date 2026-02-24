import { Link } from "react-router-dom";

export default function OrderSuccess() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Order received</h1>
      <p>Thanks — we’ll contact you shortly.</p>
      <Link to="/shop">Back to shop</Link>
    </div>
  );
}