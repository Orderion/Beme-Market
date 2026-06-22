// src/components/SellerRoute.jsx
//
// Two modes:
//
//  1. <SellerRoute requireOnly="auth">
//     Used on: /store-onboarding, /store-survey, /store-plans, /subscription-success
//     → Only checks the user is logged in. Customers pass through (they're becoming sellers).
//
//  2. <SellerRoute>
//     Used on: /seller-dashboard
//     → Checks logged in AND (role==="seller" OR onboarding just completed).
//     → "onboarding just completed" is tracked via localStorage until Cloud Functions
//       deploy and set role="seller" in Firestore automatically.
//
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Key used by SubscriptionSuccess to signal onboarding completion
export const SELLER_APPLIED_KEY = "beme_seller_applied";

export default function SellerRoute({ children, requireOnly }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // Wait for auth to resolve
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Nunito, system-ui, sans-serif",
        fontSize: 14,
        color: "#8B8FA8",
        background: "#F8F9FF",
      }}>
        Loading…
      </div>
    );
  }

  // Not logged in → send to login, preserve destination
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  // ── Mode 1: auth-only ─────────────────────────────────────────────────────
  // Onboarding pages only need a logged-in user — any role passes.
  if (requireOnly === "auth") {
    return children;
  }

  // ── Mode 2: seller-only ───────────────────────────────────────────────────
  // Check 1: Firestore role is "seller" (set by Cloud Function after payment)
  if (role === "seller") {
    return children;
  }

  // Check 2: User just completed onboarding on this device.
  // SubscriptionSuccess sets localStorage[SELLER_APPLIED_KEY] = uid.
  // This allows dashboard access until Cloud Functions are deployed and
  // Firestore role is updated to "seller".
  const appliedUid = localStorage.getItem(SELLER_APPLIED_KEY);
  if (appliedUid && appliedUid === user.uid) {
    return children;
  }

  // Not a seller and hasn't completed onboarding → back to Get a Store
  return <Navigate to="/get-a-store" replace />;
}