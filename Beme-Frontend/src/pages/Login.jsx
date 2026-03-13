// Beme-Frontend/src/pages/Login.jsx
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Login.css";

const RESET_COOLDOWN_MS = 45000;

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getApiBaseUrl() {
  const raw =
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";

  return String(raw).replace(/\/+$/, "");
}

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

  const [resetLoading, setResetLoading] = useState(false);
  const [lastResetAt, setLastResetAt] = useState(0);

  const redirectTo = location.state?.from || "/";

  const resetCooldownLeft = useMemo(() => {
    const remaining = RESET_COOLDOWN_MS - (Date.now() - lastResetAt);
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }, [lastResetAt]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    const emailTrim = normalizeEmail(email);
    const passwordTrim = String(password || "").trim();

    if (!emailTrim || !passwordTrim) {
      setErr("Enter your email and password.");
      return;
    }

    if (!isValidEmail(emailTrim)) {
      setErr("Enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, emailTrim, passwordTrim);
      navigate(redirectTo, { replace: true });
    } catch (e) {
      const code = e?.code || "";

      if (
        code.includes("auth/invalid-credential") ||
        code.includes("auth/user-not-found") ||
        code.includes("auth/wrong-password")
      ) {
        setErr("Invalid email or password.");
      } else if (code.includes("auth/invalid-email")) {
        setErr("Invalid email address.");
      } else if (code.includes("auth/too-many-requests")) {
        setErr("Too many attempts. Please wait and try again.");
      } else {
        setErr("Login failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    if (loading || resetLoading) return;

    setErr("");
    setMsg("");

    const emailTrim = normalizeEmail(email);

    if (!emailTrim) {
      setErr("Enter your email address first.");
      return;
    }

    if (!isValidEmail(emailTrim)) {
      setErr("Enter a valid email address first.");
      return;
    }

    const cooldownRemaining = RESET_COOLDOWN_MS - (Date.now() - lastResetAt);
    if (cooldownRemaining > 0) {
      setErr(
        `Please wait ${Math.ceil(
          cooldownRemaining / 1000
        )} seconds before trying again.`
      );
      return;
    }

    setResetLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailTrim,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Could not send reset email.");
      }

      setLastResetAt(Date.now());
      setMsg(
        "If an account exists for this email, a password reset link has been sent."
      );
    } catch (e) {
      setErr(e?.message || "Could not send reset email. Try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const onSubscribe = async () => {
    setNewsErr("");
    setNewsMsg("");

    const emailTrim = normalizeEmail(newsEmail);

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
        🎉 Get 10% discount on any product above 1000$ 🎉
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

          <button
            className="auth-cta"
            type="submit"
            disabled={loading || resetLoading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="auth-links">
            <button
              type="button"
              className="auth-link auth-forgot"
              onClick={onForgot}
              disabled={loading || resetLoading}
            >
              {resetLoading
                ? "Sending..."
                : resetCooldownLeft > 0
                  ? `Try again in ${resetCooldownLeft}s`
                  : "Forgot password"}
            </button>

            <Link className="auth-link" to="/signup">
              Sign up
            </Link>
          </div>

          <button
            type="button"
            className="auth-ghost"
            onClick={() => navigate("/checkout")}
            disabled={loading || resetLoading}
          >
            Continue as guest
          </button>
        </form>

        <section className="auth-news">
          <h2 className="auth-news-title">Sign up and save</h2>
          <p className="auth-news-text">
            Subscribe to get special offers, free giveaways, and once-in-a-lifetime
            deals.
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