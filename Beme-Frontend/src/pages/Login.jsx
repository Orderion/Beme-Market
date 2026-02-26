import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const redirectTo = location.state?.from || "/";

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!email || !password) {
      setErr("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(redirectTo, { replace: true });
    } catch (e) {
      const code = e?.code || "";
      if (code.includes("auth/invalid-credential")) setErr("Invalid email or password.");
      else if (code.includes("auth/user-not-found")) setErr("Account not found.");
      else if (code.includes("auth/wrong-password")) setErr("Wrong password.");
      else setErr("Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    setErr("");
    setMsg("");

    if (!email) {
      setErr("Enter your email first, then tap 'Forgot password'.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg("Password reset email sent. Check your inbox.");
    } catch {
      setErr("Could not send reset email. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Top promo banner (like screenshot) */}
      <div className="auth-banner">
        🎉 Free shipping on two pairs of shoes (The more you buy, the cheaper it is!) 🎉
      </div>

      <div className="auth-wrap">
        {/* Center mark / logo spot */}
        <div className="auth-mark" aria-hidden="true">
          {/* Replace with your monochrome logo if you want */}
          <div className="auth-logo-box" />
        </div>

        <h1 className="auth-title">SIGN IN</h1>

        <form className="auth-card" onSubmit={onSubmit}>
          <label className="auth-label">
            <span className="sr-only">Email</span>
            <input
              className="auth-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="auth-label auth-pass">
            <span className="sr-only">Password</span>
            <input
              className="auth-input"
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? "Hide password" : "Show password"}
              title={showPass ? "Hide password" : "Show password"}
            >
              {/* Minimal monochrome eye icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                {showPass && (
                  <path
                    d="M4 20L20 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </label>

          {err && <div className="auth-alert auth-alert--error">{err}</div>}
          {msg && <div className="auth-alert auth-alert--ok">{msg}</div>}

          <button className="auth-cta" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="auth-links">
            <button type="button" className="auth-link" onClick={onForgot} disabled={loading}>
              Forgot password
            </button>

            {/* If you don't have signup yet, keep it but point later */}
            <Link className="auth-link" to="/signup">
              Sign up
            </Link>
          </div>

          {/* Guest checkout path */}
          <button
            type="button"
            className="auth-ghost"
            onClick={() => navigate("/checkout")}
            disabled={loading}
          >
            Continue as guest
          </button>
        </form>

        {/* Newsletter block like screenshot */}
        <section className="auth-news">
          <h2 className="auth-news-title">Sign up and save</h2>
          <p className="auth-news-text">
            Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
          </p>

          <div className="auth-news-input">
            <input className="auth-input auth-input--dark" placeholder="Enter your email" />
            <button className="auth-news-btn" type="button" aria-label="Subscribe">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 4h16v16H4V4Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M4 7l8 6 8-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="auth-pay-row" aria-hidden="true">
            {["VISA", "VISA", "MC", "AMEX", "APPLE", "PAY"].map((t, i) => (
              <div className="auth-pay" key={i}>
                {t}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}