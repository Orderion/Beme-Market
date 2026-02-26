import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireAdmin({ children }) {
  const { role, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (role !== "admin") {
    return <Navigate to="/admin-login" replace state={{ from: location.pathname }} />;
  }

  return children;
}