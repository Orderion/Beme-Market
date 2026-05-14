// src/components/SellerRoute.jsx
//
// Two modes:
//
//  1. <SellerRoute requireOnly="auth">   — used on /store-onboarding, /store-survey,
//                                          /store-plans, /subscription-success
//     → Only checks the user is logged in.
//     → A regular customer (not yet a seller) can pass through — they're in the
//        process of BECOMING a seller.
//
//  2. <SellerRoute>                      — used on /seller-dashboard
//     → Checks the user is logged in AND has role === "seller".
//     → Redirects non-sellers back to /get-a-store.
//
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SellerRoute({ children, requireOnly }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // Show nothing while auth resolves
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Exo, system-ui, sans-serif",
        fontSize: 14,
        color: "#8B8FA8",
        background: "#F8F9FF",
      }}>
        Loading…
      </div>
    );
  }

  // Not logged in → send to login, preserve intended destination
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  // ── Mode 1: auth-only ─────────────────────────────────────────────────────
  // Onboarding pages only need a logged-in user.
  // Anyone (customer, seller, admin) can proceed.
  if (requireOnly === "auth") {
    return children;
  }

  // ── Mode 2: seller-only ───────────────────────────────────────────────────
  // Dashboard requires an active seller account.
  if (role !== "seller") {
    return <Navigate to="/get-a-store" replace />;
  }

  return children;
}