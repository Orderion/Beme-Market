import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const redirectTo = location.state?.from || "/admin/orders";

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.role !== "admin") {
        setErr("This account is not an admin.");
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch {
      setErr("Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-banner">Admin Access</div>

      <div className="auth-wrap">
        <div className="auth-mark" aria-hidden="true">
          <div className="auth-logo-box" />
        </div>

        <h1 className="auth-title">ADMIN SIGN IN</h1>

        <form className="auth-card" onSubmit={onSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {err && <div className="auth-alert auth-alert--error">{err}</div>}

          <button className="auth-cta" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}