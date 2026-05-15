import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { reload } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

const cloudResend = httpsCallable(getFunctions(), "resendVerificationEmail");
const RESEND_COOLDOWN_S = 60;

function MailIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

  useEffect(() => {
    if (!currentUser) navigate("/signup", { replace: true });
  }, [currentUser, navigate]);

  useEffect(() => {
    if (currentUser?.emailVerified) navigate("/onboarding", { replace: true });
  }, [currentUser, navigate]);

  /* Auto-poll every 5s */
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!auth.currentUser) return;
      try {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) navigate("/onboarding", { replace: true });
      } catch (_) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  /* Cooldown countdown */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleCheck = async () => {
    if (!auth.currentUser) return;
    setCheckErr(""); setResendMsg(""); setResendErr("");
    setChecking(true);
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) navigate("/onboarding", { replace: true });
      else setCheckErr("Email not verified yet — click the link in your inbox first.");
    } catch {
      setCheckErr("Could not check verification status. Try again.");
    } finally { setChecking(false); }
  };

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
      else
        setResendErr("Could not resend the email. Try again in a moment.");
    } finally { setResending(false); }
  };

  return (
    <div className="auth-page auth-page--centered">

      <div className="auth-banner">
        Welcome to Beme Market — Ghana's favourite shop 🇬🇭
      </div>

      <div className="auth-centered-wrap">

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link to="/" className="auth-logo" style={{ justifyContent: "center" }}>
            <div className="auth-logo-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <span className="auth-logo-name">Beme Market</span>
          </Link>
        </div>

        <div className="verify-card">

          <div className="verify-icon-wrap">
            <div className="verify-icon">
              <MailIcon />
            </div>
          </div>

          <h2 className="verify-title">Check your email</h2>

          <p className="verify-subtitle">We sent a verification link to</p>

          <div className="verify-email-pill">
            {displayEmail || "your email address"}
          </div>

          <p className="verify-instructions">
            Open the email and click <strong>"Verify email address"</strong>.
            Once verified, come back and press the button below —
            or this page will redirect you automatically.
          </p>

          {checkErr  && <div className="auth-alert auth-alert--error" role="alert">{checkErr}</div>}
          {resendErr && <div className="auth-alert auth-alert--error" role="alert">{resendErr}</div>}
          {resendMsg && <div className="auth-alert auth-alert--ok"    role="status">{resendMsg}</div>}

          <button className="auth-btn-primary verify-cta" onClick={handleCheck}
            disabled={checking} type="button">
            {checking
              ? <><Spinner /> Checking…</>
              : <><CheckCircleIcon /> I&rsquo;ve verified my email</>}
          </button>

          <div className="auth-divider">or</div>

          <button className="auth-btn-ghost" onClick={handleResend}
            disabled={resending || cooldown > 0} type="button"
            style={{ marginTop: 0 }}>
            {resending
              ? <><Spinner style={{ borderTopColor: "var(--text)" }} /> Sending…</>
              : cooldown > 0 ? `Resend in ${cooldown}s`
              : "Resend verification email"}
          </button>

          <div className="verify-auto-row">
            <span className="verify-pulse" aria-hidden="true" />
            <span className="verify-auto-label">Checking automatically every 5 seconds</span>
          </div>

          <details className="verify-tips">
            <summary className="verify-tips-toggle">Didn't get the email?</summary>
            <ul className="verify-tips-list">
              <li>Check your <strong>spam</strong> or <strong>junk</strong> folder.</li>
              <li>Make sure <strong>{displayEmail}</strong> is correct.</li>
              <li>Wait a minute — sometimes delivery is slightly delayed.</li>
              <li>Press <strong>Resend</strong> above if it's been over 5 minutes.</li>
            </ul>
          </details>

          <div className="verify-back">
            <Link className="auth-link" to="/login">← Back to login</Link>
          </div>

        </div>
      </div>
    </div>
  );
}