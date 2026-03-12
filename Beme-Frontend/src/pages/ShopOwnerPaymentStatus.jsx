// src/pages/ShopOwnerPaymentStatus.jsx
import { Link } from "react-router-dom";
import "./AdminLogin.css";

export default function ShopOwnerPaymentStatus() {
  return (
    <div className="admin-login-page">
      <div className="admin-login-card" style={{ maxWidth: 760 }}>
        <p className="admin-login-eyebrow">Beme Market Marketplace</p>
        <h1 className="admin-login-title">Shop Registration Maintenance</h1>
        <p className="admin-login-subtitle">
          Shop registration and onboarding are currently under maintenance.
        </p>

        <div
          className="admin-login-error"
          style={{
            color: "inherit",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          New shop activation and payment status checks are temporarily
          unavailable. Existing shop admins and super admins can continue using
          their dashboards normally.
        </div>

        <div className="admin-login-footer" style={{ marginTop: 20 }}>
          <Link to="/" className="admin-login-link">
            Go Home
          </Link>
          <Link to="/shop" className="admin-login-link">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}