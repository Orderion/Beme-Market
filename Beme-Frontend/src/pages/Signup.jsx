import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

/* Send branded verification email via backend — never blocks signup */
async function sendBrandedVerification(email, name) {
  try {
    await fetch(`${API_URL}/api/auth/send-verification`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, name: name || "" }),
    });
  } catch (_) {
    // Silent fail — never block the signup flow
  }
}

/* ── Password strength ── */
const REQUIREMENTS = [
  { key: "length", label: "At least 8 characters",      test: (p) => p.length >= 8           },
  { key: "upper",  label: "One uppercase letter (A-Z)",  test: (p) => /[A-Z]/.test(p)         },
  { key: "number", label: "One number (0-9)",             test: (p) => /[0-9]/.test(p)         },
  { key: "symbol", label: "One symbol (!@#$...)",         test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "", reqs: [] };
  const reqs  = REQUIREMENTS.map((r) => ({ ...r, passed: r.test(password) }));
  const score = reqs.filter((r) => r.passed).length;
  const levels = [
    { label: "",       color: ""        },
    { label: "Weak",   color: "#EF4444" },
    { label: "Fair",   color: "#F97316" },
    { label: "Good",   color: "#EAB308" },
    { label: "Strong", color: "#22C55E" },
  ];
  return { score, reqs, ...levels[score] };
}

/* ── Icons ── */
function EyeIcon({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <line x1="4" y1="20" x2="20" y2="4" />}
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
function Spinner({ dark }) { return <span className={`auth-spinner${dark ? " auth-spinner--dark" : ""}`} aria-hidden="true" />; }
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
function SignupIllustration() {
  return (
    <svg viewBox="0 0 460 500" fill="none" xmlns="http://www.w3.org/2000/svg"
         className="auth-visual-svg" aria-hidden="true">
      <defs>
        <radialGradient id="sg-orb1" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#046EF2" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#046EF2" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="sg-orb2" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0.13"/>
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="sg-btn" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#046EF2"/>
          <stop offset="100%" stopColor="#6366F1"/>
        </linearGradient>
        <linearGradient id="sg-header" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#046EF2"/>
          <stop offset="50%"  stopColor="#6366F1"/>
          <stop offset="100%" stopColor="#7C3AED"/>
        </linearGradient>
        <filter id="sg-shadow">
          <feDropShadow dx="0" dy="12" stdDeviation="20" floodColor="#046EF2" floodOpacity="0.15"/>
        </filter>
      </defs>

      <style>{`
        @keyframes sg-float    { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-12px)} }
        @keyframes sg-float2   { 0%,100%{transform:translateY(-5px)} 50%{transform:translateY(7px)}  }
        @keyframes sg-float3   { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-8px)}  }
        @keyframes sg-pulse    { 0%,100%{opacity:0.13;r:200px} 50%{opacity:0.23;r:218px} }
        @keyframes sg-pulse2   { 0%,100%{opacity:0.08;r:135px} 50%{opacity:0.18;r:150px} }
        @keyframes sg-twinkle  { 0%,100%{opacity:0.2;transform:scale(0.7)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes sg-twinkle2 { 0%,100%{opacity:0.7;transform:scale(1)}   50%{opacity:0.1;transform:scale(0.5)} }
        @keyframes sg-add-btn  { 0%,100%{transform:scale(1)}   50%{transform:scale(1.12)} }
        @keyframes sg-check    { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.15);opacity:0.8} }
        @keyframes sg-bar-grow {
          0%  { stroke-dashoffset: 200 }
          60% { stroke-dashoffset: 0   }
          100%{ stroke-dashoffset: 0   }
        }
        @keyframes sg-progress {
          0%  { width: 20px  }
          60% { width: 140px }
          100%{ width: 140px }
        }
        @keyframes sg-orbit {
          from { transform: rotate(0deg)   translateX(115px) rotate(0deg);   }
          to   { transform: rotate(360deg) translateX(115px) rotate(-360deg); }
        }
        @keyframes sg-orbit2 {
          from { transform: rotate(180deg) translateX(90px) rotate(-180deg); }
          to   { transform: rotate(540deg) translateX(90px) rotate(-540deg); }
        }
        .sg-card      { animation: sg-float 5.5s ease-in-out infinite; transform-origin: 230px 250px; }
        .sg-panel-l   { animation: sg-float2 4s ease-in-out infinite; transform-origin: 56px 254px; }
        .sg-panel-r   { animation: sg-float3 6.5s ease-in-out infinite; transform-origin: 404px 228px; }
        .sg-orb-big   { animation: sg-pulse 7s ease-in-out infinite; }
        .sg-orb-med   { animation: sg-pulse2 5s ease-in-out infinite; }
        .sg-star1     { animation: sg-twinkle 2.4s ease-in-out infinite; transform-origin: 432px 232px; }
        .sg-star2     { animation: sg-twinkle2 3.2s ease-in-out infinite; transform-origin: 46px 164px; }
        .sg-star3     { animation: sg-twinkle 4.2s ease-in-out 1s infinite; transform-origin: 395px 405px; }
        .sg-add-btn   { animation: sg-add-btn 2.2s ease-in-out infinite; transform-origin: 256px 168px; }
        .sg-check-ok  { animation: sg-check 2.8s ease-in-out infinite; transform-origin: 385px 106px; }
        .sg-progress  { animation: sg-progress 3s ease-out 0.5s infinite; }
      `}</style>

      {/* Background orbs */}
      <circle className="sg-orb-big" cx="230" cy="250" r="200" fill="url(#sg-orb1)"/>
      <circle className="sg-orb-med" cx="230" cy="250" r="135" fill="url(#sg-orb2)"/>
      <circle cx="80"  cy="400" r="55" fill="#046EF2" opacity="0.05"/>
      <circle cx="390" cy="100" r="40" fill="#7C3AED" opacity="0.06"/>

      {/* Sparkles */}
      <g className="sg-star1">
        <path d="M432 232 L434 239 L442 239 L436 244 L438 252 L432 248 L426 252 L428 244 L422 239 L430 239 Z"
          fill="#046EF2" opacity="0.55"/>
      </g>
      <g className="sg-star2">
        <path d="M46 164 L48 170 L54 170 L49 174 L51 181 L46 178 L41 181 L43 174 L38 170 L44 170 Z"
          fill="#7C3AED" opacity="0.5"/>
      </g>
      <g className="sg-star3">
        <path d="M395 403 L396 407 L401 407 L397.5 410 L399 415 L395 413 L391 415 L392.5 410 L389 407 L394 407 Z"
          fill="#6366F1" opacity="0.45"/>
      </g>

      {/* Ground shadow */}
      <ellipse cx="230" cy="370" rx="122" ry="7" fill="#CBD5E1" opacity="0.5"/>

      {/* ── MAIN SIGNUP CARD ── */}
      <g className="sg-card">
        {/* Card shadow + body */}
        <rect x="100" y="138" width="260" height="224" rx="20" fill="white" filter="url(#sg-shadow)"/>
        {/* Gradient header bar */}
        <rect x="100" y="138" width="260" height="8"   rx="4"  fill="url(#sg-header)"/>
        <rect x="100" y="142" width="260" height="8"   fill="white" opacity="0.1"/>

        {/* Avatar circle */}
        <circle cx="230" cy="188" r="34" fill="#EBF2FF"/>
        <circle cx="230" cy="182" r="13" fill="#046EF2" opacity="0.35"/>
        <ellipse cx="230" cy="200" rx="19" ry="11" fill="#046EF2" opacity="0.2"/>

        {/* Name label */}
        <rect x="175" y="230" width="110" height="7" rx="3.5" fill="#EBF2FF"/>
        <rect x="195" y="241" width="70"  height="5" rx="2.5" fill="#F0F4FF"/>

        {/* Email input */}
        <rect x="120" y="254" width="220" height="17" rx="6" fill="#F8FAFF" stroke="#E2E8F0" strokeWidth="1"/>
        <rect x="128" y="259" width="60"  height="4"  rx="2" fill="#CBD5E1"/>

        {/* Password input */}
        <rect x="120" y="276" width="220" height="17" rx="6" fill="#F8FAFF" stroke="#046EF2" strokeWidth="1.5"/>
        <rect x="128" y="281" width="50"  height="4"  rx="2" fill="#CBD5E1"/>
        <circle cx="290" cy="285" r="2.5" fill="#CBD5E1"/>
        <circle cx="298" cy="285" r="2.5" fill="#CBD5E1"/>
        <circle cx="306" cy="285" r="2.5" fill="#CBD5E1"/>

        {/* Progress bar */}
        <rect x="120" y="298" width="220" height="5" rx="2.5" fill="#EBF2FF"/>
        <rect x="120" y="298" rx="2.5" height="5" fill="url(#sg-btn)" className="sg-progress"/>

        {/* CTA button */}
        <rect x="120" y="310" width="220" height="22" rx="8" fill="url(#sg-btn)"/>
        <rect x="166" y="317" width="128" height="7"  rx="3.5" fill="white" opacity="0.35"/>
      </g>

      {/* ── LEFT PANEL — discount badge ── */}
      <g className="sg-panel-l">
        <rect x="18" y="214" width="78" height="80" rx="14" fill="white"
          style={{filter:"drop-shadow(0 6px 20px rgba(4,110,242,0.14))"}}>
        </rect>
        <rect x="18" y="214" width="78" height="5" rx="3" fill="#046EF2" opacity="0.7"/>
        <circle cx="57" cy="238" r="14" fill="#EBF2FF"/>
        <text x="51" y="243" fontSize="11" fill="#046EF2" fontFamily="system-ui" fontWeight="800">%</text>
        <rect x="27" y="258" width="52" height="7" rx="3.5" fill="#046EF2" opacity="0.7"/>
        <rect x="32" y="269" width="42" height="5" rx="2.5" fill="#EBF2FF"/>
        <rect x="27" y="279" width="52" height="13" rx="6" fill="#046EF2" opacity="0.1"/>
        <rect x="35" y="283" width="36" height="5"  rx="2.5" fill="#046EF2" opacity="0.5"/>
      </g>

      {/* ── RIGHT PANEL — new product card ── */}
      <g className="sg-panel-r">
        <rect x="364" y="182" width="78" height="96" rx="14" fill="white"
          style={{filter:"drop-shadow(0 6px 20px rgba(4,110,242,0.12))"}}>
        </rect>
        <rect x="364" y="182" width="78" height="5" rx="3" fill="#7C3AED" opacity="0.7"/>
        {/* Product image placeholder */}
        <rect x="372" y="194" width="62" height="38" rx="8" fill="#F5F3FF"/>
        <circle cx="390" cy="206" r="8" fill="#EDE9FE"/>
        <path d="M386 206 a4 4 0 0 1 8 0" stroke="#7C3AED" strokeWidth="1.2" fill="none"/>
        <rect x="384" y="206" width="12" height="8" rx="2" fill="#7C3AED" opacity="0.7"/>
        {/* Price */}
        <rect x="372" y="237" width="38" height="6" rx="3" fill="#EDE9FE"/>
        <rect x="372" y="247" width="62" height="6" rx="3" fill="#EDE9FE" opacity="0.5"/>
        {/* Add button */}
        <g className="sg-add-btn">
          <rect x="372" y="258" width="62" height="16" rx="8" fill="#7C3AED"/>
          <line x1="403" y1="262" x2="403" y2="270" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <line x1="399" y1="266" x2="407" y2="266" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </g>
      </g>

      {/* ── CHECK BADGE (top right) ── */}
      <g className="sg-check-ok">
        <circle cx="385" cy="106" r="28" fill="#EBF2FF"
          style={{filter:"drop-shadow(0 4px 14px rgba(4,110,242,0.22))"}}>
        </circle>
        <circle cx="385" cy="106" r="20" fill="#046EF2"/>
        <polyline points="376,106 382,113 394,98" stroke="white" strokeWidth="2.8"
          fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}

function PasswordStrengthBar({ password }) {
  const { score, label, color, reqs } = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) return null;
  return (
    <div className="auth-strength">
      <div className="auth-strength-bar" aria-hidden="true">
        {[1, 2, 3, 4].map((seg) => (
          <div key={seg} className="auth-strength-seg"
            style={{ background: score >= seg ? color : undefined, opacity: score >= seg ? 1 : undefined }}/>
        ))}
      </div>
      {label && (
        <div className="auth-strength-meta">
          <span className="auth-strength-label" style={{ color }}>{label}</span>
          {score < 4
            ? <span className="auth-strength-tip">{4 - score} requirement{4 - score !== 1 ? "s" : ""} remaining</span>
            : <span className="auth-strength-tip" style={{ color: "#22C55E" }}>Great password!</span>}
        </div>
      )}
      <ul className="auth-req-list" aria-label="Password requirements">
        {reqs.map((r) => (
          <li key={r.key} className={`auth-req-item${r.passed ? " auth-req-item--ok" : ""}`}>
            <span className="auth-req-icon" aria-hidden="true">{r.passed ? "✓" : "○"}</span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Signup() {
  const navigate   = useNavigate();
  const { signup } = useAuth();

  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [confirmPass,   setConfirmPass]   = useState("");
  const [showPass,      setShowPass]      = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [err,           setErr]           = useState("");

  const strength       = useMemo(() => getPasswordStrength(password), [password]);
  const isStrong       = strength.score === 4;
  const anyLoading     = loading || googleLoading;
  const passwordsMatch = !confirmPass || password === confirmPass;
  const canSubmit      = isStrong && passwordsMatch && !anyLoading;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const emailTrim = email.trim();
    const passTrim  = password.trim();
    const confTrim  = confirmPass.trim();

    if (!emailTrim || !passTrim)  { setErr("Enter your email and password.");                   return; }
    if (!isValidEmail(emailTrim)) { setErr("Enter a valid email address.");                     return; }
    if (!isStrong)                { setErr("Please meet all password requirements first.");      return; }
    if (passTrim !== confTrim)    { setErr("Passwords don't match. Please check and retry.");   return; }
    if (!agreedToTerms)           { setErr("Please agree to the terms to continue.");           return; }

    setLoading(true);
    try {
      await signup(emailTrim, passTrim);

      // Send our branded verification email (non-blocking)
      // Firebase also sends its default one — ours is the branded version
      sendBrandedVerification(emailTrim, "");

      navigate("/verify-email", { replace: true });
    } catch (e) {
      if (auth.currentUser) {
        sendBrandedVerification(auth.currentUser.email || emailTrim, "");
        navigate("/verify-email", { replace: true });
        return;
      }
      const code = e?.code || "";
      if (code.includes("auth/email-already-in-use")) setErr("An account with this email already exists. Log in instead.");
      else if (code.includes("auth/weak-password"))   setErr("Password too weak. Use at least 8 characters.");
      else if (code.includes("auth/invalid-email"))   setErr("Invalid email address.");
      else setErr("Signup failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setErr("");
    setGoogleLoading(true);
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
      navigate("/", { replace: true });
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      setErr("Google sign-in failed. Try again.");
    } finally { setGoogleLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <SignupIllustration />
        <div className="auth-visual-caption">
          <h2>Join Beme Market 🇬🇭</h2>
          <p>Create your account and get 10% off your first order. Ghana's best deals, all in one place.</p>
        </div>
      </div>

      <div className="auth-panel">
        <Link to="/" className="auth-logo">
          <div className="auth-logo-mark">
            <img src="/Favicon-white.PNG" alt="" width="22" height="22" style={{ objectFit: "contain" }} />
          </div>
          <span className="auth-logo-name">Beme Market</span>
        </Link>

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-subheading">Join thousands of shoppers across Ghana.</p>

        <div style={{ marginBottom: 16 }}>
          <button className="auth-btn-social" onClick={handleGoogle} disabled={anyLoading} type="button">
            {googleLoading ? <Spinner dark /> : <GoogleLogo />}
            Continue with Google
          </button>
        </div>

        <div className="auth-divider">or</div>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="su-email">Email address</label>
            <div className="auth-input-wrap">
              <input id="su-email" className="auth-input auth-input--plain" type="email"
                placeholder="your@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" disabled={anyLoading} />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="su-pass">Password</label>
            <div className="auth-input-wrap">
              <input id="su-pass" className="auth-input"
                type={showPass ? "text" : "password"}
                placeholder="Create a strong password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password" disabled={anyLoading} />
              <button type="button" className="auth-eye"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? "Hide password" : "Show password"}>
                <EyeIcon open={showPass} />
              </button>
            </div>
            <PasswordStrengthBar password={password} />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="su-confirm">Confirm password</label>
            <div className="auth-input-wrap">
              <input id="su-confirm"
                className={`auth-input${confirmPass && !passwordsMatch ? " auth-input--error" : ""}`}
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter your password" value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                autoComplete="new-password" disabled={anyLoading} />
              <button type="button" className="auth-eye"
                onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? "Hide" : "Show"}>
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {confirmPass && !passwordsMatch && <span className="auth-field-hint auth-field-hint--error">Passwords don't match</span>}
            {confirmPass && passwordsMatch  && <span className="auth-field-hint auth-field-hint--ok">Passwords match ✓</span>}
          </div>

          <div className="auth-check-row">
            <button type="button"
              className={`auth-checkbox${agreedToTerms ? " auth-checkbox--on" : ""}`}
              onClick={() => setAgreedToTerms(v => !v)}
              aria-pressed={agreedToTerms} aria-label="I agree to the terms">
              {agreedToTerms && <CheckIcon />}
            </button>
            <span className="auth-check-label">
              I agree to the{" "}
              <Link className="auth-link" to="/terms">Terms of Use</Link>
            </span>
          </div>

          {err && <div className="auth-alert auth-alert--error" role="alert">{err}</div>}

          <button className="auth-btn-primary" type="submit" disabled={!canSubmit}>
            {loading ? <><Spinner /> Creating account…</> : "Create account"}
          </button>

          <button type="button" className="auth-btn-ghost"
            onClick={() => navigate("/checkout")} disabled={anyLoading}>
            Continue as guest
          </button>
        </form>

        <div className="auth-footer">
          <span className="auth-footer-text">
            Already have an account?{" "}
            <Link className="auth-link" to="/login">Sign in</Link>
          </span>
        </div>

        <p className="auth-terms-note">
          By continuing you agree to our{" "}
          <Link className="auth-link" to="/terms">Terms</Link> and{" "}
          <Link className="auth-link" to="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
