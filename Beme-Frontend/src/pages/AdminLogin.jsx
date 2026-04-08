import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();

  const from = useMemo(() => {
    return location.state?.from || "/admin";
  }, [location.state]);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setField = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const email = form.email.trim();
    const password = form.password;

    if (!email || !password) {
      setError("Enter your admin email and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result || !["super_admin", "shop_admin"].includes(result.role)) {
        await logout();
        setError("This account is not authorized for admin access.");
        setLoading(false);
        return;
      }

      await result.user.getIdToken(true);
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Admin login failed:", err);
      setError(err?.message || "Admin login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <p className="admin-login-eyebrow">Beme Market</p>
        <h1 className="admin-login-title">Admin Login</h1>
        <p className="admin-login-subtitle">
          Sign in with your authorized shop admin or super admin account.
        </p>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label className="admin-login-label">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={setField("email")}
              placeholder="admin@email.com"
              autoComplete="email"
              disabled={loading}
            />
          </label>

          <label className="admin-login-label">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={setField("password")}
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          {error ? <div className="admin-login-error">{error}</div> : null}

          <button type="submit" className="admin-login-btn" disabled={loading}>
            {loading ? "Signing in..." : "Login as Admin"}
          </button>
        </form>

        <div className="admin-login-footer">
          <Link to="/login" className="admin-login-link">
            Customer login
          </Link>
          <Link to="/" className="admin-login-link">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}