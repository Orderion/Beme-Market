import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [newsEmail, setNewsEmail] = useState("");
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsMsg, setNewsMsg] = useState("");
  const [newsErr, setNewsErr] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const redirectTo = location.state?.from || "/";

  const isValidEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    const emailTrim = email.trim();
    const passwordTrim = password.trim();

    if (!emailTrim || !passwordTrim) {
      setErr("Enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, emailTrim, passwordTrim);
      navigate(redirectTo, { replace: true });
    } catch (e) {
      const code = e?.code || "";

      if (code.includes("auth/invalid-credential")) {
        setErr("Invalid email or password.");
      } else if (code.includes("auth/user-not-found")) {
        setErr("Account not found.");
      } else if (code.includes("auth/wrong-password")) {
        setErr("Wrong password.");
      } else if (code.includes("auth/invalid-email")) {
        setErr("Invalid email address.");
      } else {
        setErr("Login failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    if (loading) return;

    setErr("");
    setMsg("");

    const emailTrim = email.trim();

    if (!emailTrim) {
      setErr("Enter your email address first.");
      return;
    }

    if (!isValidEmail(emailTrim)) {
      setErr("Enter a valid email address first.");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, emailTrim);
      setMsg("Password reset email sent. Check your inbox.");
    } catch (e) {
      const code = e?.code || "";

      if (code.includes("auth/user-not-found")) {
        setErr("No account found with that email.");
      } else if (code.includes("auth/invalid-email")) {
        setErr("Invalid email address.");
      } else {
        setErr("Could not send reset email. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubscribe = async () => {
    setNewsErr("");
    setNewsMsg("");

    const emailTrim = newsEmail.trim().toLowerCase();

    if (!emailTrim) {
      setNewsErr("Enter your email to subscribe.");
      return;
    }

    if (!isValidEmail(emailTrim)) {
      setNewsErr("Enter a valid email address.");
      return;
    }

    setNewsLoading(true);

    try {
      await addDoc(collection(db, "subscriptions"), {
        email: emailTrim,
        source: "login-page",
        active: true,
        createdAt: serverTimestamp(),
      });

      setNewsMsg("You’re subscribed for updates and offers.");
      setNewsEmail("");
    } catch (e) {
      console.error("Subscription error:", e);
      setNewsErr("Could not subscribe right now. Try again.");
    } finally {
      setNewsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-banner">
        🎉 Free shipping on two pairs of shoes (The more you buy, the cheaper it is!) 🎉
      </div>

      <div className="auth-wrap">
        <div className="auth-mark" aria-hidden="true">
          <div className="auth-logo-box">
            <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3 4 7v5c0 4.8 3.2 7.8 8 9 4.8-1.2 8-4.2 8-9V7l-8-4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M9.2 12.2 11 14l3.8-3.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
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
            <button
              type="button"
              className="auth-link auth-forgot"
              onClick={onForgot}
              disabled={loading}
            >
              Forgot password
            </button>

            <Link className="auth-link" to="/signup">
              Sign up
            </Link>
          </div>

          <button
            type="button"
            className="auth-ghost"
            onClick={() => navigate("/checkout")}
            disabled={loading}
          >
            Continue as guest
          </button>
        </form>

        <section className="auth-news">
          <h2 className="auth-news-title">Sign up and save</h2>
          <p className="auth-news-text">
            Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
          </p>

          <div className="auth-news-input">
            <input
              className="auth-input auth-input--dark"
              placeholder="Enter your email"
              type="email"
              value={newsEmail}
              onChange={(e) => setNewsEmail(e.target.value)}
            />

            <button
              className="auth-news-btn"
              type="button"
              aria-label="Subscribe"
              onClick={onSubscribe}
              disabled={newsLoading}
            >
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

          {newsErr && <div className="auth-alert auth-alert--error">{newsErr}</div>}
          {newsMsg && <div className="auth-alert auth-alert--ok">{newsMsg}</div>}

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