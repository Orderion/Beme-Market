// src/pages/ShopOwnerApply.jsx
import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AdminLogin.css";

export default function ShopOwnerApply() {
  const { user, loading, isAdmin, adminShop, profile } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: "/own-a-shop" }} />;
  }

  const existingShop = adminShop || profile?.shop || "";
  const alreadyOwnsShop = !!existingShop || isAdmin;

  if (alreadyOwnsShop) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card" style={{ maxWidth: 760 }}>
          <p className="admin-login-eyebrow">Beme Market Marketplace</p>
          <h1 className="admin-login-title">Shop Registration Maintenance</h1>
          <p className="admin-login-subtitle">
            New shop registrations are currently under maintenance.
          </p>

          <div
            className="admin-login-error"
            style={{
              color: "inherit",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Your current account already has marketplace shop access
            {existingShop ? ` for ${existingShop}` : ""}. Existing admin access
            is not affected.
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

  return (
    <div className="admin-login-page">
      <div className="admin-login-card" style={{ maxWidth: 760 }}>
        <p className="admin-login-eyebrow">Beme Market Marketplace</p>
        <h1 className="admin-login-title">Own a Shop</h1>
        <p className="admin-login-subtitle">
          This page is currently under maintenance.
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
          marketplace onboarding experience. Please check back later.
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