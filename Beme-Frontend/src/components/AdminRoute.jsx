// src/components/AdminRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/admin-login" replace />;

  // Accept both "admin" (stored in Firestore) and
  // "super_admin" (normalised by AuthContext)
  const isAdmin = role === "super_admin" || role === "admin";

  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
}