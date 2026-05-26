/* ============================================================
   FILE: Beme-Frontend/src/pages/Login.jsx
   AUTH: Email/password + Google sign-in
   EMAIL: Forgot password now uses branded backend email
============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { verifyTOTP } from "../services/twoFactorService";
import "./Auth.css";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

const RESET_COOLDOWN_MS   = 60_000;
const MAX_FAILED_ATTEMPTS = 5;
const WARN_AFTER_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 30_000;
const MFA_CODE_LENGTH     = 6;

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim()); }
function normalizeEmail(v) { return String(v || "").trim().toLowerCase(); }
function formatSecs(ms) { return Math.ceil(ms / 1000); }

function EyeIcon({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
      <circle cx="12" cy="12" r="3"/>
      {!open && <line x1="4" y1="20" x2="20" y2="4"/>}
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5"/>
    </svg>
  );
}
function Spinner({ dark }) { return <span className={`auth-spinner${dark ? " auth-spinner--dark" : ""}`} aria-hidden="true"/>; }
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
function LoginIllustration() {
  return (
    <svg viewBox="0 0 460 500" fill="none" xmlns="http://www.w3.org/2000/svg"
         className="auth-visual-svg" aria-hidden="true">
      <defs>
        <radialGradient id="lg-orb1" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#046EF2" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#046EF2" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="lg-orb2" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0.14"/>
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0"/>
        </radialGradient>
        <filter id="lg-glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="lg-btn" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#046EF2"/>
          <stop offset="100%" stopColor="#6366F1"/>
        </linearGradient>
        <linearGradient id="lg-card" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#ffffff"/>
          <stop offset="100%" stopColor="#f8faff"/>
        </linearGradient>
      </defs>

      <style>{`
        @keyframes lg-float    { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-10px)} }
        @keyframes lg-float2   { 0%,100%{transform:translateY(-4px)} 50%{transform:translateY(6px)}  }
        @keyframes lg-float3   { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-7px)}  }
        @keyframes lg-pulse    { 0%,100%{opacity:0.12;r:200px}  50%{opacity:0.22;r:215px} }
        @keyframes lg-pulse2   { 0%,100%{opacity:0.08;r:140px}  50%{opacity:0.16;r:155px} }
        @keyframes lg-spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes lg-twinkle  { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes lg-twinkle2 { 0%,100%{opacity:0.6;transform:scale(1)}   50%{opacity:0.1;transform:scale(0.6)} }
        @keyframes lg-bar      { 0%{width:0} 100%{width:124px} }
        @keyframes lg-glow-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes lg-badge    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes lg-shimmer  {
          0%{background-position:-200% 0}
          100%{background-position:200% 0}
        }
        .lg-browser    { animation: lg-float 5s ease-in-out infinite; transform-origin: 230px 250px; }
        .lg-card1      { animation: lg-float2 4s ease-in-out infinite; transform-origin: 58px 258px; }
        .lg-card2      { animation: lg-float3 6s ease-in-out infinite; transform-origin: 404px 244px; }
        .lg-orb-big    { animation: lg-pulse 7s ease-in-out infinite; }
        .lg-orb-med    { animation: lg-pulse2 5s ease-in-out infinite; }
        .lg-star1      { animation: lg-twinkle 2.2s ease-in-out infinite; transform-origin: 440px 240px; }
        .lg-star2      { animation: lg-twinkle2 3s ease-in-out infinite; transform-origin: 48px 158px; }
        .lg-star3      { animation: lg-twinkle 4s ease-in-out 0.8s infinite; transform-origin: 400px 410px; }
        .lg-badge      { animation: lg-badge 2.5s ease-in-out infinite; transform-origin: 388px 148px; }
        .lg-glow       { animation: lg-glow-pulse 3s ease-in-out infinite; }
      `}</style>

      {/* Background orbs */}
      <circle className="lg-orb-big" cx="230" cy="250" r="200" fill="url(#lg-orb1)"/>
      <circle className="lg-orb-med" cx="230" cy="250" r="140" fill="url(#lg-orb2)"/>
      <circle cx="60" cy="390" r="55" fill="#046EF2" opacity="0.05"/>
      <circle cx="400" cy="110" r="40" fill="#7C3AED" opacity="0.06"/>

      {/* Sparkle stars */}
      <g className="lg-star1">
        <path d="M440 240 L442 247 L450 247 L444 252 L446 260 L440 256 L434 260 L436 252 L430 247 L438 247 Z"
          fill="#046EF2" opacity="0.5"/>
      </g>
      <g className="lg-star2">
        <path d="M48 158 L50 164 L56 164 L51 168 L53 175 L48 172 L43 175 L45 168 L40 164 L46 164 Z"
          fill="#7C3AED" opacity="0.55"/>
      </g>
      <g className="lg-star3">
        <path d="M400 408 L401 412 L406 412 L402 415 L404 420 L400 418 L396 420 L398 415 L394 412 L399 412 Z"
          fill="#046EF2" opacity="0.4"/>
      </g>

      {/* Ground shadow */}
      <ellipse cx="230" cy="364" rx="128" ry="7" fill="#CBD5E1" opacity="0.5"/>

      {/* ── BROWSER WINDOW (main) ── */}
      <g className="lg-browser">
        {/* Shell */}
        <rect x="90" y="128" width="280" height="226" rx="16" fill="#1a1a2e"/>
        <rect x="96" y="134" width="268" height="214" rx="12" fill="url(#lg-card)"/>
        {/* Titlebar */}
        <rect x="96" y="134" width="268" height="34" rx="12" fill="#F0F4FF"/>
        <rect x="96" y="152" width="268" height="16" fill="#F0F4FF"/>
        {/* Traffic lights */}
        <circle cx="118" cy="151" r="5.5" fill="#FF5F57"/>
        <circle cx="132" cy="151" r="5.5" fill="#FEBC2E"/>
        <circle cx="146" cy="151" r="5.5" fill="#28C840"/>
        {/* URL bar */}
        <rect x="160" y="142" width="164" height="18" rx="9" fill="white"/>
        <rect x="168" y="148" width="8"   height="6" rx="2" fill="#046EF2" opacity="0.6"/>
        <rect x="180" y="149" width="80"  height="4" rx="2" fill="#CBD5E1"/>

        {/* Login form inside browser */}
        {/* Avatar */}
        <circle cx="230" cy="200" r="18" fill="#EBF2FF"/>
        <circle cx="230" cy="197" r="7"  fill="#046EF2" opacity="0.5"/>
        <ellipse cx="230" cy="212" rx="12" ry="6" fill="#046EF2" opacity="0.25"/>

        {/* "Sign in" label */}
        <rect x="200" y="224" width="60" height="6" rx="3" fill="#EBF2FF"/>
        <rect x="210" y="234" width="40" height="4" rx="2" fill="#F0F4FF"/>

        {/* Email input */}
        <rect x="134" y="244" width="192" height="18" rx="6" fill="#F8FAFF" stroke="#E2E8F0" strokeWidth="1"/>
        <rect x="140" y="249" width="55"  height="4"  rx="2" fill="#CBD5E1"/>

        {/* Password input — glowing border */}
        <rect x="134" y="268" width="192" height="18" rx="6" fill="#F8FAFF" stroke="#046EF2" strokeWidth="1.5" className="lg-glow"/>
        <rect x="140" y="273" width="45"  height="4"  rx="2" fill="#CBD5E1"/>
        {/* Dots */}
        <circle cx="260" cy="277" r="2.5" fill="#CBD5E1"/>
        <circle cx="268" cy="277" r="2.5" fill="#CBD5E1"/>
        <circle cx="276" cy="277" r="2.5" fill="#CBD5E1"/>

        {/* Sign in button — gradient */}
        <rect x="134" y="292" width="192" height="22" rx="7" fill="url(#lg-btn)"/>
        <rect x="180" y="299" width="80"  height="7"  rx="3.5" fill="white" opacity="0.4"/>
      </g>

      {/* ── SECURITY CARD (left floating) ── */}
      <g className="lg-card1">
        <rect x="18" y="218" width="74" height="80" rx="14" fill="white" filter="url(#lg-glow)"
          style={{filter:"drop-shadow(0 8px 24px rgba(4,110,242,0.18))"}}/>
        <rect x="18" y="218" width="74" height="5"  rx="2" fill="#046EF2" opacity="0.7"/>
        {/* Shield icon */}
        <path d="M55 234 L41 239 L41 251 Q41 261 55 266 Q69 261 69 251 L69 239 Z"
          fill="#EBF2FF" stroke="#046EF2" strokeWidth="1.5" strokeLinejoin="round"/>
        <polyline points="47,251 52,257 63,244" stroke="#046EF2" strokeWidth="2"
          fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Labels */}
        <rect x="27" y="272" width="50" height="6" rx="3" fill="#EBF2FF"/>
        <rect x="32" y="282" width="38" height="4" rx="2" fill="#F0F4FF"/>
      </g>

      {/* ── CHECKOUT CARD (right floating) ── */}
      <g className="lg-card2">
        <rect x="366" y="190" width="76" height="94" rx="14" fill="white"
          style={{filter:"drop-shadow(0 8px 24px rgba(4,110,242,0.14))"}}>
        </rect>
        <rect x="366" y="190" width="76" height="5" rx="2" fill="#7C3AED" opacity="0.7"/>
        {/* Cart icon area */}
        <rect x="374" y="204" width="60" height="34" rx="8" fill="#F5F3FF"/>
        <circle cx="381" cy="229" r="4" fill="#7C3AED" opacity="0.5"/>
        <circle cx="393" cy="229" r="4" fill="#7C3AED" opacity="0.5"/>
        <path d="M376 212 L379 222 L397 222" stroke="#7C3AED" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* Price */}
        <rect x="374" y="244" width="34" height="6" rx="3" fill="#EDE9FE"/>
        <rect x="374" y="254" width="52" height="20" rx="6" fill="#7C3AED"/>
        <rect x="382" y="260" width="28" height="6"  rx="3" fill="white" opacity="0.55"/>
      </g>

      {/* ── VERIFIED BADGE (top right) ── */}
      <g className="lg-badge">
        <circle cx="388" cy="148" r="28" fill="#EBF2FF"
          style={{filter:"drop-shadow(0 4px 12px rgba(4,110,242,0.2))"}}/>
        <circle cx="388" cy="148" r="20" fill="#046EF2"/>
        <polyline points="379,148 385,154 397,140" stroke="white" strokeWidth="2.5"
          fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}

function MfaScreen({ onVerify, onCancel, loading, error }) {
  const [digits, setDigits] = useState(Array(MFA_CODE_LENGTH).fill(""));
  const refs = useRef([]);
  const handleDigit = (i, val) => {
    const cleaned = val.replace(/\D/g, "").slice(-1);
    const next    = [...digits]; next[i] = cleaned; setDigits(next);
    if (cleaned && i < MFA_CODE_LENGTH - 1) refs.current[i + 1]?.focus();
    if (next.every(d => d !== "")) onVerify(next.join(""));
  };
  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft"  && i > 0)               refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < MFA_CODE_LENGTH - 1) refs.current[i + 1]?.focus();
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, MFA_CODE_LENGTH);
    const next   = Array(MFA_CODE_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    refs.current[Math.min(pasted.length, MFA_CODE_LENGTH - 1)]?.focus();
    if (pasted.length === MFA_CODE_LENGTH) onVerify(pasted);
  };
  return (
    <div className="auth-mfa">
      <div className="auth-mfa__icon"><PhoneIcon /></div>
      <h2 className="auth-mfa__title">Two-step verification</h2>
      <p className="auth-mfa__sub">Open your authenticator app and enter the 6-digit code for <strong> Beme Market</strong>.</p>
      <div className="auth-otp-row" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input key={i} ref={el => refs.current[i] = el}
            className={`auth-otp-digit${d ? " auth-otp-digit--filled" : ""}`}
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1}
            value={d} onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)} autoComplete="one-time-code"
            autoFocus={i === 0} disabled={loading} aria-label={`Digit ${i + 1}`}/>
        ))}
      </div>
      {error && <div className="auth-alert auth-alert--error" role="alert" style={{ marginTop: 12, width: "100%" }}>{error}</div>}
      <p className="auth-mfa__hint">The code refreshes every 30 seconds.</p>
      <button type="button" className="auth-btn-ghost" onClick={onCancel} disabled={loading} style={{ marginTop: 8 }}>
        {loading ? <><Spinner dark /> Verifying…</> : "Use a different account"}
      </button>
    </div>
  );
}

export default function Login() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const redirectTo = location.state?.from || "/";

  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading,  setResetLoading]  = useState(false);
  const [lastResetAt,   setLastResetAt]   = useState(0);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil,    setLockedUntil]    = useState(0);
  const [lockCountdown,  setLockCountdown]  = useState(0);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaUser,     setMfaUser]     = useState(null);
  const [mfaLoading,  setMfaLoading]  = useState(false);
  const [mfaError,    setMfaError]    = useState("");

  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const tick = setInterval(() => {
      const rem = lockedUntil - Date.now();
      if (rem <= 0) { setLockCountdown(0); clearInterval(tick); }
      else          { setLockCountdown(formatSecs(rem)); }
    }, 250);
    return () => clearInterval(tick);
  }, [lockedUntil]);

  const isLocked = Date.now() < lockedUntil;

  const resetCooldownLeft = useMemo(() => {
    const rem = RESET_COOLDOWN_MS - (Date.now() - lastResetAt);
    return rem > 0 ? Math.ceil(rem / 1000) : 0;
  }, [lastResetAt]);

  const anyLoading = loading || googleLoading || resetLoading || mfaLoading;

  const completeLogin = useCallback(async (user) => {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) { navigate("/onboarding", { replace: true }); return; }
    } catch (_) {}
    setFailedAttempts(0);
    navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo]);

  const handleMfaVerify = useCallback(async (code) => {
    if (!mfaUser || mfaLoading) return;
    setMfaLoading(true); setMfaError("");
    try {
      const result = await verifyTOTP(code);
      if (!result.valid) { setMfaError(result.error || "Incorrect code. Try again."); setMfaLoading(false); return; }
      await completeLogin(mfaUser);
    } catch (e) {
      setMfaError("Verification failed. Check your connection and try again.");
    } finally { setMfaLoading(false); }
  }, [mfaUser, mfaLoading, completeLogin]);

  const cancelMfa = useCallback(() => {
    auth.signOut().catch(() => {});
    setMfaRequired(false); setMfaUser(null); setMfaError("");
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (isLocked) { setErr(`Account temporarily locked. Try again in ${lockCountdown}s.`); return; }
    const emailTrim = normalizeEmail(email);
    const passTrim  = String(password || "").trim();
    if (!emailTrim || !passTrim)  { setErr("Enter your email and password."); return; }
    if (!isValidEmail(emailTrim)) { setErr("Enter a valid email address.");   return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, emailTrim, passTrim);
      if (!cred.user.emailVerified) { navigate("/verify-email", { replace: true }); return; }
      setFailedAttempts(0); setLockedUntil(0); setLockCountdown(0);
      let mfaEnabled = false;
      try {
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        mfaEnabled  = snap.data()?.mfa?.enabled === true;
      } catch (_) {}
      if (mfaEnabled) { setMfaUser(cred.user); setMfaRequired(true); setLoading(false); return; }
      await completeLogin(cred.user);
    } catch (e) {
      const code = e?.code || "";
      let message = "Sign in failed. Try again.";
      if (code.includes("auth/invalid-credential") || code.includes("auth/user-not-found") || code.includes("auth/wrong-password")) {
        const next = failedAttempts + 1; setFailedAttempts(next);
        if (next >= MAX_FAILED_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_DURATION_MS;
          setLockedUntil(until); setLockCountdown(formatSecs(LOCKOUT_DURATION_MS));
          message = `Too many failed attempts. Account locked for ${formatSecs(LOCKOUT_DURATION_MS)} seconds.`;
        } else {
          const remaining = MAX_FAILED_ATTEMPTS - next;
          message = next >= WARN_AFTER_ATTEMPTS
            ? `Incorrect credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before temporary lock.`
            : "Invalid email or password.";
        }
      } else if (code.includes("auth/too-many-requests")) { message = "Too many attempts detected. Please wait before trying again."; }
        else if (code.includes("auth/invalid-email"))     { message = "Invalid email address."; }
      setErr(message);
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setErr(""); setMsg(""); setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const isNew  = result.additionalUserInfo?.isNewUser;
      if (isNew) {
        try {
          await setDoc(doc(db, "users", result.user.uid), {
            role: "customer", shop: null, capabilities: [],
            email: result.user.email?.toLowerCase() || "",
            emailVerified: true,
            displayName: result.user.displayName || "",
            photoURL: result.user.photoURL || null,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (_) {}
        navigate("/onboarding", { replace: true }); return;
      }
      await completeLogin(result.user);
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      setErr("Google sign-in failed. Try again.");
    } finally { setGoogleLoading(false); }
  };

  /* ── Forgot password — now uses branded backend email ── */
  const onForgot = async () => {
    if (anyLoading) return;
    setErr(""); setMsg("");
    const emailTrim = normalizeEmail(email);
    if (!emailTrim)               { setErr("Enter your email address first.");    return; }
    if (!isValidEmail(emailTrim)) { setErr("Enter a valid email address first."); return; }
    const cooldownRem = RESET_COOLDOWN_MS - (Date.now() - lastResetAt);
    if (cooldownRem > 0) { setErr(`Wait ${Math.ceil(cooldownRem / 1000)}s before trying again.`); return; }
    setResetLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: emailTrim }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setLastResetAt(Date.now());
        setMsg("Password reset email sent — check your inbox.");
      } else if (res.status === 504) {
        setErr("Reset email timed out. Please try again.");
      } else {
        setLastResetAt(Date.now());
        // Always show success to prevent email enumeration
        setMsg("If an account exists for this email, a reset link has been sent.");
      }
    } catch (_) {
      setErr("Could not send reset email. Check your connection and try again.");
    } finally { setResetLoading(false); }
  };

  if (mfaRequired) {
    return (
      <div className="auth-page">
        <div className="auth-panel auth-panel--centered">
          <Link to="/" className="auth-logo">
            <div className="auth-logo-mark"><img src="/Favicon-white.PNG" alt="" width="22" height="22" style={{ objectFit: "contain" }}/></div>
            <span className="auth-logo-name">Beme Market</span>
          </Link>
          <MfaScreen onVerify={handleMfaVerify} onCancel={cancelMfa} loading={mfaLoading} error={mfaError}/>
        </div>
        <div className="auth-visual">
          <LoginIllustration />
          <div className="auth-visual-caption">
            <h2>Your account is protected</h2>
            <p>Two-step verification keeps your store and earnings safe.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <Link to="/" className="auth-logo">
          <div className="auth-logo-mark"><img src="/Favicon-white.PNG" alt="" width="22" height="22" style={{ objectFit: "contain" }}/></div>
          <span className="auth-logo-name">Beme Market</span>
        </Link>

        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-subheading">Sign in to your account to continue.</p>

        {isLocked && (
          <div className="auth-lock-banner" role="alert">
            <LockIcon />
            <div>
              <strong>Account temporarily locked</strong>
              <p>Too many failed attempts. Try again in <strong>{lockCountdown}s</strong>.</p>
            </div>
          </div>
        )}

        {!isLocked && failedAttempts >= WARN_AFTER_ATTEMPTS && failedAttempts < MAX_FAILED_ATTEMPTS && (
          <div className="auth-attempts-warn" role="alert">
            <ShieldIcon />
            <span>{MAX_FAILED_ATTEMPTS - failedAttempts} attempt{MAX_FAILED_ATTEMPTS - failedAttempts !== 1 ? "s" : ""} remaining before temporary lock.</span>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <button className="auth-btn-social" onClick={handleGoogle} disabled={anyLoading || isLocked} type="button">
            {googleLoading ? <Spinner dark/> : <GoogleLogo/>}
            {googleLoading ? "Signing in…" : "Continue with Google"}
          </button>
        </div>

        <div className="auth-divider">or</div>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="l-email">Email address</label>
            <div className="auth-input-wrap">
              <input id="l-email" className="auth-input auth-input--plain" type="email"
                placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email" disabled={anyLoading || isLocked}/>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="l-pass">Password</label>
            <div className="auth-input-wrap">
              <input id="l-pass" className="auth-input"
                type={showPass ? "text" : "password"}
                placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password" disabled={anyLoading || isLocked}/>
              <button type="button" className="auth-eye" onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? "Hide password" : "Show password"}>
                <EyeIcon open={showPass}/>
              </button>
            </div>
          </div>

          <div className="auth-row">
            <div className="auth-check-row">
              <button type="button" className={`auth-checkbox${rememberMe ? " auth-checkbox--on" : ""}`}
                onClick={() => setRememberMe(v => !v)} aria-pressed={rememberMe} aria-label="Remember me">
                {rememberMe && <CheckIcon/>}
              </button>
              <span className="auth-check-label">Remember me</span>
            </div>
            <button type="button" className="auth-forgot" onClick={onForgot} disabled={anyLoading || isLocked}>
              {resetLoading ? "Sending…" : resetCooldownLeft > 0 ? `Retry in ${resetCooldownLeft}s` : "Forgot password?"}
            </button>
          </div>

          {err && <div className="auth-alert auth-alert--error" role="alert">{err}</div>}
          {msg && <div className="auth-alert auth-alert--ok"    role="status">{msg}</div>}

          <button className="auth-btn-primary" type="submit" disabled={anyLoading || isLocked}>
            {loading ? <><Spinner/> Signing in…</> : isLocked ? `Locked · ${lockCountdown}s` : "Sign in"}
          </button>

          <button type="button" className="auth-btn-ghost" onClick={() => navigate("/checkout")} disabled={anyLoading || isLocked}>
            Continue as guest
          </button>
        </form>

        <div className="auth-footer">
          <span className="auth-footer-text">Don't have an account?{" "}<Link className="auth-link" to="/signup">Create one</Link></span>
        </div>
        <p className="auth-terms-note">
          By continuing you agree to our{" "}
          <Link className="auth-link" to="/terms">Terms</Link> and{" "}
          <Link className="auth-link" to="/privacy">Privacy Policy</Link>.
        </p>
      </div>

      <div className="auth-visual">
        <LoginIllustration/>
        <div className="auth-visual-caption">
          <h2>Your favourite shop</h2>
          <p>Sign in to unlock exclusive deals, track your orders, and save your favourite items.</p>
        </div>
      </div>
    </div>
  );
}
