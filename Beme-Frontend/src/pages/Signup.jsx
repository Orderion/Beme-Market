import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const redirectTo = location.state?.from || "/";

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!email || !password) return setErr("Enter email and password.");

    setLoading(true);
    try {
      await signup(email, password);
      navigate(redirectTo, { replace: true });
    } catch (e) {
      const code = e?.code || "";
      if (code.includes("auth/email-already-in-use")) setErr("Email already in use.");
      else if (code.includes("auth/weak-password")) setErr("Password too weak.");
      else setErr("Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-banner">Welcome to Beme Market</div>

      <div className="auth-wrap">
        <div className="auth-mark" aria-hidden="true">
          <div className="auth-logo-box" />
        </div>

        <h1 className="auth-title">SIGN UP</h1>

        <form className="auth-card" onSubmit={onSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email address"
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
            {loading ? "Creating..." : "Create account"}
          </button>

          <div className="auth-links">
            <Link className="auth-link" to="/login">
              Sign in
            </Link>
            <button type="button" className="auth-link" onClick={() => navigate("/checkout")}>
              Continue as guest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}