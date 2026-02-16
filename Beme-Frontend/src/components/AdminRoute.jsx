import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, isAdmin } = useContext(AuthContext);

  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;

  return children;
}
