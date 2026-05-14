// src/components/auth/RequireSeller.jsx
// Alias of SellerRoute — used inside nested route wrappers.
// Guards any page that requires role === "seller".

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireSeller({ children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (role !== "seller") {
    return <Navigate to="/get-a-store" replace />;
  }

  return children;
}

