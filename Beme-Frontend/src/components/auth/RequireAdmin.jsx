// src/components/auth/RequireAdmin.jsx
// Accepts role === "admin" OR role === "super_admin" from Firestore.
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireAdmin({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/admin-login" replace />;

  // Accept both "admin" and "super_admin" — isSuperAdmin in AuthContext
  // normalises "admin" → "super_admin", so checking either covers both.
  const isAdmin = role === "super_admin" || role === "admin";

  if (!isAdmin) return <Navigate to="/admin-login" replace />;

  return children;
}