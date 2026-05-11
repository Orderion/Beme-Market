import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { reload } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Login.css";
import "./VerifyEmail.css";

// Callable reference — created once outside the component so it isn't
// re-instantiated on every render.
const cloudResend = httpsCallable(getFunctions(), "resendVerificationEmail");

const RESEND_COOLDOWN_S = 60;

function MailIcon() {
  return (
    <svg
      width="40" height="40" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function Spinner() {
  return <span className="auth-spinner" aria-hidden="true" />;
}

export default function VerifyEmail() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [checking,  setChecking]  = useState(false);
  const [resending, setResending] = useState(false);
  const [checkErr,  setCheckErr]  = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [resendErr, setResendErr] = useState("");
  const [cooldown,  setCooldown]  = useState(0);

  const currentUser  = auth.currentUser;
  const displayEmail = currentUser?.email || user?.email || "";

  // ── Guard: not logged in ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) navigate("/signup", { replace: true });
  }, [currentUser, navigate]);

  // ── Guard: already verified → skip to onboarding ──────────────────────
  useEffect(() => {
    if (currentUser?.emailVerified) navigate("/onboarding", { replace: true });
  }, [currentUser, navigate]);

  // ── Auto-poll every 5 s ───────────────────────────────────────────────
  // Silently reloads the Firebase Auth token. If the user clicked the link
  // in another tab, this catches it and redirects automatically.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!auth.currentUser) return;
      try {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) {
          navigate("/onboarding", { replace: true });
        }
      } catch (_) { /* network blip — retry next tick */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  // ── Cooldown countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(t); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // ── Manual check ─────────────────────────────────────────────────────
  const handleCheck = async () => {
    if (!auth.currentUser) return;
    setCheckErr(""); setResendMsg(""); setResendErr("");
    setChecking(true);
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        navigate("/onboarding", { replace: true });
      } else {
        setCheckErr("Email not verified yet — click the link in your inbox first.");
      }
    } catch {
      setCheckErr("Could not check verification status. Try again.");
    } finally {
      setChecking(false);
    }
  };

  // ── Resend via Cloud Function (Brevo SMTP) ────────────────────────────
  // We call the `resendVerificationEmail` callable which uses the same
  // Brevo transporter as the initial signup — so it lands in the inbox,
  // not spam.
  const handleResend = async () => {
    if (!auth.currentUser || cooldown > 0 || resending) return;
    setResendErr(""); setResendMsg(""); setCheckErr("");
    setResending(true);
    try {
      await cloudResend();
      setResendMsg("Verification email resent — check your inbox (and spam just in case).");
      setCooldown(RESEND_COOLDOWN_S);
    } catch (e) {
      const code = e?.code || "";
      if (code === "functions/already-exists")
        setResendErr("Your email is already verified — try logging in.");
      else if (code === "functions/unauthenticated")
        setResendErr("Session expired. Please log in again.");
      else if (code === "functions/resource-exhausted")
        setResendErr("Too many requests. Wait a moment before resending.");
      else
        setResendErr("Could not resend the email. Try again in a moment.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-banner">
        Welcome to Beme Market — Ghana's favourite shop 🇬🇭
      </div>

      <div className="auth-wrap">

        <div className="auth-brand">
          <h1 className="auth-brand-name">Beme Market</h1>
        </div>

        <div className="verify-container">
          <div className="verify-card">

            {/* Icon stamp */}
            <div className="verify-icon-wrap">
              <div className="verify-icon">
                <MailIcon />
              </div>
            </div>

            <h2 className="verify-title">Check your email</h2>

            <p className="verify-subtitle">
              We sent a verification link to
            </p>

            <div className="verify-email-pill">
              {displayEmail || "your email address"}
            </div>

            <p className="verify-instructions">
              Open the email and click{" "}
              <strong>&ldquo;Verify email address&rdquo;</strong>.
              Once verified, come back and press the button below —
              or the page will redirect you automatically.
            </p>

            {/* Alerts */}
            {checkErr  && <div className="auth-alert auth-alert--error" role="alert">{checkErr}</div>}
            {resendErr && <div className="auth-alert auth-alert--error" role="alert">{resendErr}</div>}
            {resendMsg && <div className="auth-alert auth-alert--ok"    role="status">{resendMsg}</div>}

            {/* Primary CTA */}
            <button
              className="auth-cta verify-cta"
              onClick={handleCheck}
              disabled={checking}
              type="button"
            >
              {checking
                ? <><Spinner /> Checking...</>
                : <><CheckCircleIcon /> I&rsquo;ve verified my email</>}
            </button>

            <div className="auth-divider"><span>or</span></div>

            {/* Resend */}
            <button
              className="auth-ghost"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              type="button"
            >
              {resending
                ? <><Spinner /> Sending...</>
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend verification email"}
            </button>

            {/* Auto-check pulse */}
            <div className="verify-auto-row" aria-live="polite" aria-atomic="true">
              <span className="verify-pulse" aria-hidden="true" />
              <span className="verify-auto-label">Checking automatically every 5 seconds</span>
            </div>

            {/* Tips accordion */}
            <details className="verify-tips">
              <summary className="verify-tips-toggle">Didn't get the email?</summary>
              <ul className="verify-tips-list">
                <li>Check your <strong>spam</strong> or <strong>junk</strong> folder.</li>
                <li>Make sure <strong>{displayEmail}</strong> is correct.</li>
                <li>Wait a minute — sometimes delivery is slightly delayed.</li>
                <li>Press <strong>Resend</strong> above if it&rsquo;s been over 5 minutes.</li>
              </ul>
            </details>

            <div className="verify-back">
              <Link className="auth-link" to="/login">← Back to login</Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}