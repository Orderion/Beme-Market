import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import "./Login.css";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [newsEmail, setNewsEmail] = useState("");
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsMsg, setNewsMsg] = useState("");
  const [newsErr, setNewsErr] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const redirectTo = location.state?.from || "/";

  const isValidEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    const emailTrim = email.trim();
    const passwordTrim = password.trim();

    if (!emailTrim || !passwordTrim) {
      setErr("Enter email and password.");
      return;
    }

    setLoading(true);

    try {
      await signup(emailTrim, passwordTrim);
      navigate(redirectTo, { replace: true });
    } catch (e) {
      const code = e?.code || "";

      if (code.includes("auth/email-already-in-use")) {
        setErr("Email already in use.");
      } else if (code.includes("auth/weak-password")) {
        setErr("Password too weak.");
      } else if (code.includes("auth/invalid-email")) {
        setErr("Invalid email address.");
      } else {
        setErr("Signup failed.");
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
        source: "signup-page",
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
      <div className="auth-banner">Welcome to Beme Market</div>

      <div className="auth-wrap">
        <div className="auth-mark" aria-hidden="true">
          <div className="auth-logo-box">
            <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M4 20a8 8 0 0 1 16 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M19 8v4M17 10h4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <h1 className="auth-title">SIGN UP</h1>

        <form className="auth-card" onSubmit={onSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          {err && <div className="auth-alert auth-alert--error">{err}</div>}

          <button className="auth-cta" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>

          <div className="auth-links">
            <Link className="auth-link" to="/login">
              Sign in
            </Link>

            <button
              type="button"
              className="auth-link"
              onClick={() => navigate("/checkout")}
            >
              Continue as guest
            </button>
          </div>
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