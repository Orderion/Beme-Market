import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import "./Login.css";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function EyeIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <line x1="4" y1="20" x2="20" y2="4" />}
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function WaveText({ text, className = "", baseDelay = 0, step = 0.056 }) {
  return (
    <span className={className} aria-hidden="true">
      {text.split("").map((ch, i) => (
        <span
          key={i}
          className="auth-letter"
          style={{ animationDelay: `${(baseDelay + i * step).toFixed(3)}s` }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

function Spinner() {
  return <span className="auth-spinner" aria-hidden="true" />;
}

export default function Signup() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { signup }    = useAuth();

  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [showPass,      setShowPass]      = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [newsEmail,   setNewsEmail]   = useState("");
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsMsg,     setNewsMsg]     = useState("");
  const [newsErr,     setNewsErr]     = useState("");

  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  const redirectTo = location.state?.from || "/";

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const emailTrim    = email.trim();
    const passwordTrim = password.trim();
    if (!emailTrim || !passwordTrim)  { setErr("Enter email and password."); return; }
    if (!isValidEmail(emailTrim))     { setErr("Enter a valid email address."); return; }
    if (!agreedToTerms)               { setErr("Please agree to the terms of use to continue."); return; }
    setLoading(true);
    try {
      await signup(emailTrim, passwordTrim);
      navigate(redirectTo, { replace: true });
    } catch (e) {
      const code = e?.code || "";
      if (code.includes("auth/email-already-in-use"))
        setErr("Email already in use.");
      else if (code.includes("auth/weak-password"))
        setErr("Password too weak. Use at least 6 characters.");
      else if (code.includes("auth/invalid-email"))
        setErr("Invalid email address.");
      else
        setErr("Signup failed. Try again.");
    } finally { setLoading(false); }
  };

  const onSubscribe = async () => {
    setNewsErr(""); setNewsMsg("");
    const emailTrim = newsEmail.trim().toLowerCase();
    if (!emailTrim)               { setNewsErr("Enter your email to subscribe."); return; }
    if (!isValidEmail(emailTrim)) { setNewsErr("Enter a valid email address.");   return; }
    setNewsLoading(true);
    try {
      await addDoc(collection(db, "subscriptions"), {
        email: emailTrim, source: "signup-page", active: true,
        createdAt: serverTimestamp(),
      });
      setNewsMsg("You're subscribed for updates and offers.");
      setNewsEmail("");
    } catch (e) {
      console.error("Subscription error:", e);
      setNewsErr("Could not subscribe right now. Try again.");
    } finally { setNewsLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-banner">Welcome to Beme Market</div>

      <div className="auth-wrap">

        {/* ══ HERO — beam · flare · wave text ══ */}
        <div className="auth-grad">
          <div className="auth-grad-bg" />

          <svg className="auth-dot-grid" aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="auth-dots-s" width="22" height="22"
                patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.2"
                  fill="var(--grtheme,#FF6600)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-dots-s)" />
          </svg>

          <div className="auth-beam" aria-hidden="true">
            <div className="auth-beam-core" />
            <div className="auth-beam-glow" />
          </div>

          <div className="auth-flare" aria-hidden="true">
            <div className="auth-flare-ring auth-flare-ring--1" />
            <div className="auth-flare-ring auth-flare-ring--2" />
            <div className="auth-flare-ring auth-flare-ring--3" />
            <div className="auth-flare-core" />
            <div className="auth-flare-outer" />
            <div className="auth-streak auth-streak--hr" />
            <div className="auth-streak auth-streak--hl" />
            <div className="auth-streak auth-streak--vt" />
            <div className="auth-streak auth-streak--vb" />
            <div className="auth-streak auth-streak--d1" />
            <div className="auth-streak auth-streak--d2" />
            <div className="auth-streak auth-streak--d3" />
            <div className="auth-streak auth-streak--d4" />
          </div>

          <div className="auth-orb auth-orb--1" aria-hidden="true" />
          <div className="auth-orb auth-orb--2" aria-hidden="true" />
          <div className="auth-orb auth-orb--3" aria-hidden="true" />

          <div className="auth-hero-text">
            <p className="sr-only">Welcome to Beme Market</p>
            <span className="auth-hero-eyebrow" aria-hidden="true">
              Create your account
            </span>

            <div className="auth-hero-line" role="presentation">
              <WaveText text="Welcome" className="auth-word-plain"  baseDelay={0.78} />
            </div>
            <div className="auth-hero-line" role="presentation">
              <WaveText text="to Beme" className="auth-word-grad1" baseDelay={1.22} />
            </div>
            <div className="auth-hero-line" role="presentation">
              <WaveText text="Market"  className="auth-word-grad2" baseDelay={1.65} />
            </div>
            <span className="auth-hero-underline" aria-hidden="true" />
          </div>
        </div>

        {/* ══ Form body ══ */}
        <div className="auth-body">
          <form className="auth-card" onSubmit={onSubmit} noValidate>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="su-email">
                Your Email Address
              </label>
              <input id="su-email" className="auth-input" type="email"
                placeholder="your@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" disabled={loading} />
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="su-pass">
                Choose a Password
              </label>
              <div className="auth-pass-wrap">
                <input id="su-pass" className="auth-input"
                  type={showPass ? "text" : "password"}
                  placeholder="min. 6 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password" disabled={loading} />
                <button type="button" className="auth-eye"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}>
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            <div className="auth-check-row">
              <button type="button"
                className={`auth-checkbox ${agreedToTerms ? "auth-checkbox--on" : ""}`}
                onClick={() => setAgreedToTerms((v) => !v)}
                aria-pressed={agreedToTerms}
                aria-label="I agree with terms of use">
                {agreedToTerms && <CheckIcon />}
              </button>
              <span className="auth-check-label">I agree with terms of use</span>
            </div>

            {err && <div className="auth-alert auth-alert--error" role="alert">{err}</div>}

            <button className="auth-cta" type="submit" disabled={loading}>
              {loading ? <><Spinner /> Creating account...</> : "Create account"}
            </button>

            <div className="auth-links">
              <span className="auth-link-text">
                Already have an account?{" "}
                <Link className="auth-link" to="/login">Log in</Link>
              </span>
            </div>

            <div className="auth-divider"><span>or</span></div>

            <button type="button" className="auth-ghost"
              onClick={() => navigate("/checkout")} disabled={loading}>
              Continue as guest
            </button>
          </form>

          <section className="auth-news">
            <span className="auth-news-eyebrow">Offers and deals</span>
            <h2 className="auth-news-title">Sign up and save</h2>
            <p className="auth-news-text">
              Subscribe to get special offers, free giveaways, and
              once-in-a-lifetime deals.
            </p>
            <div className="auth-news-row">
              <input className="auth-news-input" placeholder="Enter your email"
                type="email" value={newsEmail}
                onChange={(e) => setNewsEmail(e.target.value)}
                disabled={newsLoading} />
              <button className="auth-news-btn" type="button"
                aria-label="Subscribe" onClick={onSubscribe}
                disabled={newsLoading}>
                {newsLoading ? <Spinner /> : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>
            </div>
            {newsErr && <div className="auth-alert auth-alert--error-dark" role="alert">{newsErr}</div>}
            {newsMsg && <div className="auth-alert auth-alert--ok-dark"    role="status">{newsMsg}</div>}
            <div className="auth-pay-row" aria-hidden="true">
              {["VISA","MC","AMEX","APPLE PAY","PAYSTACK"].map((t,i) => (
                <div className="auth-pay" key={i}>{t}</div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}