// src/pages/ShopOwnerApply.jsx
import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AdminLogin.css";

export default function ShopOwnerApply() {
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (loading) return null;

  // New customers and guests should not access this page at all.
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card" style={{ maxWidth: 760 }}>
        <p className="admin-login-eyebrow">Beme Market Marketplace</p>
        <h1 className="admin-login-title">Shop Registration Maintenance</h1>
        <p className="admin-login-subtitle">
          Shop onboarding is currently under maintenance.
        </p>

        <div
          className="admin-login-error"
          style={{
            color: "inherit",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          New shop registrations are temporarily unavailable while we improve the
          marketplace onboarding flow.
        </div>

        <div className="admin-login-footer" style={{ marginTop: 20 }}>
          <Link to="/admin" className="admin-login-link">
            Go to Admin
          </Link>
          <Link to="/" className="admin-login-link">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}