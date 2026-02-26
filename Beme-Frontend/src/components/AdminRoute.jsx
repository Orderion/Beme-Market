// src/components/AdminRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // or a loader component

  // not logged in
  if (!user) {
    return <Navigate to="/admin-login" replace state={{ from: location.pathname }} />;
  }

  // logged in but not admin
  if (role !== "admin") {
    return <Navigate to="/admin-login" replace state={{ from: location.pathname }} />;
  }

  return children;
}