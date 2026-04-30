import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Login.css";

const RESET_COOLDOWN_MS = 45000;
const RESET_TIMEOUT_MS  = 20000;

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
async function fetchWithTimeout(url, options = {}, timeoutMs = RESET_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
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

function Spinner() {
  return <span className="auth-spinner" aria-hidden="true" />;
}

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [newsEmail,   setNewsEmail]   = useState("");
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsMsg,     setNewsMsg]     = useState("");
  const [newsErr,     setNewsErr]     = useState("");

  const [loading,      setLoading]      = useState(false);
  const [msg,          setMsg]          = useState("");
  const [err,          setErr]          = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [lastResetAt,  setLastResetAt]  = useState(0);

  const redirectTo = location.state?.from || "/";

  const resetCooldownLeft = useMemo(() => {
    const rem = RESET_COOLDOWN_MS - (Date.now() - lastResetAt);
    return rem > 0 ? Math.ceil(rem / 1000) : 0;
  }, [lastResetAt]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    const emailTrim    = normalizeEmail(email);
    const passwordTrim = String(password || "").trim();
    if (!emailTrim || !passwordTrim) { setErr("Enter your email and password."); return; }
    if (!isValidEmail(emailTrim))    { setErr("Enter a valid email address.");   return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, emailTrim, passwordTrim);
      try {
        const userSnap = await getDoc(doc(db, "users", cred.user.uid));
        if (!userSnap.exists() || !userSnap.data()?.onboardingComplete) {
          navigate("/onboarding", { replace: true });
          return;
        }
      } catch (_) { /* safe to continue */ }
      navigate(redirectTo, { replace: true });
    } catch (e) {
      const code = e?.code || "";
      if (
        code.includes("auth/invalid-credential") ||
        code.includes("auth/user-not-found") ||
        code.includes("auth/wrong-password")
      )
        setErr("Invalid email or password.");
      else if (code.includes("auth/invalid-email"))
        setErr("Invalid email address.");
      else if (code.includes("auth/too-many-requests"))
        setErr("Too many attempts. Please wait and try again.");
      else
        setErr("Login failed. Try again.");
    } finally { setLoading(false); }
  };

  const onForgot = async () => {
    if (loading || resetLoading) return;
    setErr(""); setMsg("");
    const emailTrim = normalizeEmail(email);
    if (!emailTrim)               { setErr("Enter your email address first.");    return; }
    if (!isValidEmail(emailTrim)) { setErr("Enter a valid email address first."); return; }
    const cooldownRem = RESET_COOLDOWN_MS - (Date.now() - lastResetAt);
    if (cooldownRem > 0) {
      setErr(`Please wait ${Math.ceil(cooldownRem / 1000)} seconds before trying again.`);
      return;
    }
    setResetLoading(true);
    try {
      const response = await fetchWithTimeout(
        `${getApiBaseUrl()}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailTrim }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Could not send reset email.");
      setLastResetAt(Date.now());
      setMsg(
        data?.message ||
        "If an account exists for this email, a password reset link has been sent."
      );
    } catch (e) {
      if (e?.name === "AbortError")
        setErr("Reset request timed out.");
      else
        setErr(e?.message || "Could not send reset email. Try again.");
    } finally { setResetLoading(false); }
  };

  const onSubscribe = async () => {
    setNewsErr(""); setNewsMsg("");
    const emailTrim = normalizeEmail(newsEmail);
    if (!emailTrim)               { setNewsErr("Enter your email to subscribe."); return; }
    if (!isValidEmail(emailTrim)) { setNewsErr("Enter a valid email address.");   return; }
    setNewsLoading(true);
    try {
      await addDoc(collection(db, "subscriptions"), {
        email: emailTrim, source: "login-page", active: true,
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

      {/* ── Promo banner ── */}
      <div className="auth-banner">
        Get 10% discount on any product above GHS 1,000
      </div>

      <div className="auth-wrap">

        {/* ── Brand ── */}
        <div className="auth-brand">
          <h1 className="auth-brand-name">Beme Market</h1>
          <p className="auth-brand-tagline">
            Want 10% off your first purchase? Sign in to unlock!
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="auth-tabs">
          <button type="button" className="auth-tab auth-tab--active">
            Log In
          </button>
          <Link to="/signup" className="auth-tab">
            Sign Up
          </Link>
        </div>

        {/* ── Form + newsletter ── */}
        <div className="auth-body">
          <form className="auth-card" onSubmit={onSubmit} noValidate>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="auth-email">
                Email Address
              </label>
              <input
                id="auth-email"
                className="auth-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading || resetLoading}
              />
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="auth-pass">
                Password
              </label>
              <div className="auth-pass-wrap">
                <input
                  id="auth-pass"
                  className="auth-input"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading || resetLoading}
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            {/* Remember me + forgot password on same row */}
            <div className="auth-row-between">
              <div className="auth-check-row">
                <button
                  type="button"
                  className={`auth-checkbox ${rememberMe ? "auth-checkbox--on" : ""}`}
                  onClick={() => setRememberMe((v) => !v)}
                  aria-pressed={rememberMe}
                  aria-label="Remember me"
                >
                  {rememberMe && <CheckIcon />}
                </button>
                <span className="auth-check-label">Remember me</span>
              </div>
              <button
                type="button"
                className="auth-forgot-inline"
                onClick={onForgot}
                disabled={loading || resetLoading}
              >
                {resetLoading
                  ? "Sending..."
                  : resetCooldownLeft > 0
                  ? `Retry in ${resetCooldownLeft}s`
                  : "Forgot password?"}
              </button>
            </div>

            {err && <div className="auth-alert auth-alert--error" role="alert">{err}</div>}
            {msg && <div className="auth-alert auth-alert--ok"    role="status">{msg}</div>}

            <button
              className="auth-cta"
              type="submit"
              disabled={loading || resetLoading}
            >
              {loading ? <><Spinner /> Signing in...</> : "Log in"}
            </button>

            <div className="auth-links">
              <span className="auth-link-text">
                Don't have an account?{" "}
                <Link className="auth-link" to="/signup">Sign up</Link>
              </span>
            </div>

            <div className="auth-divider"><span>or</span></div>

            <button
              type="button"
              className="auth-ghost"
              onClick={() => navigate("/checkout")}
              disabled={loading || resetLoading}
            >
              Continue as guest
            </button>

            <p className="auth-terms-note">
              By continuing, you agree to the Beme Market{" "}
              <Link className="auth-link" to="/terms">Terms of Use</Link> and{" "}
              <Link className="auth-link" to="/privacy">Privacy Policy</Link>.
            </p>
          </form>

          {/* ── Newsletter ── */}
          <section className="auth-news">
            <span className="auth-news-eyebrow">Offers and deals</span>
            <h2 className="auth-news-title">Sign up and save</h2>
            <p className="auth-news-text">
              Subscribe to get special offers, free giveaways, and
              once-in-a-lifetime deals.
            </p>
            <div className="auth-news-row">
              <input
                className="auth-news-input"
                placeholder="Enter your email"
                type="email"
                value={newsEmail}
                onChange={(e) => setNewsEmail(e.target.value)}
                disabled={newsLoading}
              />
              <button
                className="auth-news-btn"
                type="button"
                aria-label="Subscribe"
                onClick={onSubscribe}
                disabled={newsLoading}
              >
                {newsLoading ? <Spinner /> : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>
            </div>
            {newsErr && <div className="auth-alert auth-alert--error-dark" role="alert">{newsErr}</div>}
            {newsMsg && <div className="auth-alert auth-alert--ok-dark"    role="status">{newsMsg}</div>}
            <div className="auth-pay-row" aria-hidden="true">
              {["VISA", "MC", "AMEX", "APPLE PAY", "PAYSTACK"].map((t, i) => (
                <div className="auth-pay" key={i}>{t}</div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}