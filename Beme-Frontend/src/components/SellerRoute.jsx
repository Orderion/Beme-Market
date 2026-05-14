// src/components/SellerRoute.jsx
// Protects routes that require an active seller account.
// - Not logged in → /login
// - Logged in but not seller → /get-a-store
// - Seller but suspended/grace → /seller-dashboard (dashboard shows its own status UI)
// - Active seller → render children

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SellerRoute({ children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#F0F2FF",
        fontFamily: "Manrope, system-ui, sans-serif",
        fontSize: 14, color: "#8B8FA8",
      }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  if (role !== "seller") {
    return <Navigate to="/get-a-store" replace />;
  }

  return children;
}

