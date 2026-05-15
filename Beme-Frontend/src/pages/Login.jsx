import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Auth.css";

const RESET_COOLDOWN_MS = 45000;
const RESET_TIMEOUT_MS  = 20000;

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}
function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}
function getApiBaseUrl() {
  const raw = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:5000";
  return String(raw).replace(/\/+$/, "");
}
async function fetchWithTimeout(url, opts = {}, ms = RESET_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { window.clearTimeout(t); }
}

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

function Spinner({ dark }) {
  return <span className={`auth-spinner${dark ? " auth-spinner--dark" : ""}`} aria-hidden="true" />;
}

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
      <circle cx="230" cy="250" r="200" fill="#046EF2" opacity="0.04"/>
      <circle cx="230" cy="250" r="140" fill="#046EF2" opacity="0.04"/>
      <circle cx="70"  cy="90"  r="35"  fill="#046EF2" opacity="0.08"/>
      <circle cx="390" cy="110" r="22"  fill="#046EF2" opacity="0.1"/>
      <circle cx="400" cy="400" r="50"  fill="#046EF2" opacity="0.06"/>
      <circle cx="60"  cy="390" r="30"  fill="#046EF2" opacity="0.06"/>
      <ellipse cx="230" cy="358" rx="135" ry="8" fill="#E2E8F0" opacity="0.7"/>
      <rect x="185" y="350" width="90" height="8" rx="3" fill="#CBD5E1"/>
      <ellipse cx="230" cy="358" rx="60" ry="5" fill="#B8C4D4" opacity="0.8"/>
      <rect x="90" y="128" width="280" height="222" rx="14" fill="#1E293B"/>
      <rect x="96" y="134" width="268" height="208" rx="10" fill="white"/>
      <rect x="96" y="134" width="268" height="32" rx="10" fill="#F8FAFF"/>
      <rect x="96" y="150" width="268" height="16" fill="#F8FAFF"/>
      <circle cx="116" cy="150" r="5" fill="#FF5F57"/>
      <circle cx="130" cy="150" r="5" fill="#FEBC2E"/>
      <circle cx="144" cy="150" r="5" fill="#28C840"/>
      <rect x="158" y="142" width="160" height="16" rx="8" fill="white"/>
      <path d="M164 150 a3 3 0 0 1 6 0" stroke="#22AA66" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <rect x="162" y="150" width="10" height="6" rx="1.5" fill="#22AA66" opacity="0.8"/>
      <text x="176" y="153" fontSize="7" fill="#94A3B8" fontFamily="system-ui" fontWeight="500">bememarket.store</text>
      <rect x="120" y="178" width="220" height="152" rx="12" fill="white"/>
      <rect x="120" y="178" width="220" height="152" rx="12" stroke="#EBF2FF" strokeWidth="1"/>
      <circle cx="230" cy="200" r="16" fill="#EBF2FF"/>
      <path d="M223 200 a7 7 0 0 1 14 0" stroke="#046EF2" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <rect x="221" y="200" width="18" height="11" rx="3" fill="#046EF2"/>
      <circle cx="230" cy="204" r="2" fill="white"/>
      <line x1="230" y1="206" x2="230" y2="209" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="134" y="224" width="152" height="7" rx="3.5" fill="#EBF2FF"/>
      <rect x="148" y="235" width="124" height="5" rx="2.5" fill="#F0F4FF"/>
      <rect x="134" y="248" width="192" height="18" rx="5" fill="#F8FAFF" stroke="#E2E8F0" strokeWidth="1"/>
      <rect x="139" y="252" width="60" height="5" rx="2.5" fill="#CBD5E1"/>
      <rect x="314" y="253" width="8" height="8" rx="2" fill="#E2E8F0"/>
      <rect x="134" y="272" width="192" height="18" rx="5" fill="#F8FAFF" stroke="#046EF2" strokeWidth="1.2"/>
      <rect x="139" y="276" width="50" height="5" rx="2.5" fill="#CBD5E1"/>
      <circle cx="316" cy="281" r="4" stroke="#94A3B8" strokeWidth="1" fill="none"/>
      <circle cx="316" cy="281" r="1.5" fill="#94A3B8"/>
      <rect x="134" y="296" width="192" height="20" rx="6" fill="#046EF2"/>
      <rect x="188" y="302" width="84" height="7" rx="3.5" fill="white" opacity="0.5"/>
      <rect x="24" y="220" width="68" height="76" rx="14" fill="white">
        <animate attributeName="y" values="220;214;220" dur="3.5s" repeatCount="indefinite"/>
      </rect>
      <path d="M58 240 L40 246 L40 260 Q40 272 58 278 Q76 272 76 260 L76 246 Z"
            fill="#EBF2FF" stroke="#046EF2" strokeWidth="1.5" strokeLinejoin="round"
            transform="translate(-16 -6) scale(0.85)"/>
      <polyline points="43,259 48,264 58,252" stroke="#046EF2" strokeWidth="2"
                fill="none" strokeLinecap="round" strokeLinejoin="round"
                transform="translate(15 5)"/>
      <rect x="32" y="272" width="44" height="6" rx="3" fill="#F0F4FF"/>
      <rect x="38" y="281" width="32" height="4" rx="2" fill="#F0F4FF"/>
      <rect x="368" y="188" width="72" height="88" rx="14" fill="white">
        <animate attributeName="y" values="188;182;188" dur="4s" repeatCount="indefinite"/>
      </rect>
      <path d="M392 215 a12 12 0 0 1 24 0" stroke="#046EF2" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <rect x="387" y="215" width="34" height="28" rx="6" fill="#EBF2FF"/>
      <rect x="393" y="222" width="22" height="3" rx="1.5" fill="#046EF2" opacity="0.5"/>
      <rect x="393" y="228" width="14" height="3" rx="1.5" fill="#046EF2" opacity="0.3"/>
      <rect x="393" y="234" width="18" height="3" rx="1.5" fill="#046EF2" opacity="0.4"/>
      <rect x="375" y="250" width="58" height="16" rx="4" fill="#046EF2"/>
      <rect x="382" y="255" width="30" height="5" rx="2.5" fill="white" opacity="0.6"/>
      <circle cx="388" cy="148" r="26" fill="#EBF2FF">
        <animate attributeName="r" values="26;27.5;26" dur="4.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="388" cy="141" r="9" fill="#046EF2" opacity="0.25"/>
      <ellipse cx="388" cy="160" rx="12" ry="7" fill="#046EF2" opacity="0.2"/>
      <circle cx="406" cy="136" r="9" fill="#046EF2"/>
      <circle cx="406" cy="136" r="8" stroke="white" strokeWidth="1.5" fill="none"/>
      <polyline points="401,136 404.5,139.5 411,132" stroke="white" strokeWidth="1.5"
                fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <g opacity="0.3">
        <path d="M440 230 L442 237 L450 237 L444 242 L446 250 L440 246 L434 250 L436 242 L430 237 L438 237 Z" fill="#046EF2">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
        </path>
        <path d="M48 158 L50 164 L56 164 L51 168 L53 175 L48 172 L43 175 L45 168 L40 164 L46 164 Z" fill="#046EF2">
          <animate attributeName="opacity" values="0.25;0.55;0.25" dur="3.8s" repeatCount="indefinite"/>
        </path>
      </g>
      <circle cx="76"  cy="350" r="5" fill="#046EF2" opacity="0.2"/>
      <circle cx="88"  cy="338" r="3" fill="#046EF2" opacity="0.15"/>
      <circle cx="390" cy="308" r="5" fill="#046EF2" opacity="0.18"/>
      <circle cx="402" cy="318" r="3" fill="#046EF2" opacity="0.12"/>
      <circle cx="44"  cy="196" r="4" fill="#046EF2" opacity="0.18"/>
      <circle cx="416" cy="370" r="4" fill="#046EF2" opacity="0.15"/>
    </svg>
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

  const [loading,      setLoading]      = useState(false);
  const [googleLoading,setGoogleLoading]= useState(false);
  const [err,          setErr]          = useState("");
  const [msg,          setMsg]          = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [lastResetAt,  setLastResetAt]  = useState(0);

  const resetCooldownLeft = useMemo(() => {
    const rem = RESET_COOLDOWN_MS - (Date.now() - lastResetAt);
    return rem > 0 ? Math.ceil(rem / 1000) : 0;
  }, [lastResetAt]);

  const anyLoading = loading || googleLoading || resetLoading;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    const emailTrim = normalizeEmail(email);
    const passTrim  = String(password || "").trim();
    if (!emailTrim || !passTrim)  { setErr("Enter your email and password."); return; }
    if (!isValidEmail(emailTrim)) { setErr("Enter a valid email address.");   return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, emailTrim, passTrim);
      if (!cred.user.emailVerified) { navigate("/verify-email", { replace: true }); return; }
      try {
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        if (!snap.exists() || !snap.data()?.onboardingComplete) {
          navigate("/onboarding", { replace: true }); return;
        }
      } catch (_) {}
      navigate(redirectTo, { replace: true });
    } catch (e) {
      const code = e?.code || "";
      if (code.includes("auth/invalid-credential") || code.includes("auth/user-not-found") || code.includes("auth/wrong-password"))
        setErr("Invalid email or password.");
      else if (code.includes("auth/invalid-email"))  setErr("Invalid email address.");
      else if (code.includes("auth/too-many-requests")) setErr("Too many attempts. Please wait.");
      else setErr("Login failed. Try again.");
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setErr(""); setMsg("");
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
      try {
        const snap = await getDoc(doc(db, "users", result.user.uid));
        if (!snap.exists() || !snap.data()?.onboardingComplete) {
          navigate("/onboarding", { replace: true }); return;
        }
      } catch (_) {}
      navigate(redirectTo, { replace: true });
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      setErr("Google sign-in failed. Try again.");
    } finally { setGoogleLoading(false); }
  };

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
      const res  = await fetchWithTimeout(`${getApiBaseUrl()}/api/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrim }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Could not send reset email.");
      setLastResetAt(Date.now());
      setMsg(data?.message || "If an account exists, a reset link has been sent.");
    } catch (e) {
      if (e?.name === "AbortError") setErr("Reset request timed out.");
      else setErr(e?.message || "Could not send reset email. Try again.");
    } finally { setResetLoading(false); }
  };

  return (
    <div className="auth-page">

      {/* ── Left — form ── */}
      <div className="auth-panel">

        <Link to="/" className="auth-logo">
          <div className="auth-logo-mark">
            <img src="/Favicon-white.PNG" alt="" width="22" height="22"
            style={{ objectFit: "contain" }} />
          </div>
          <span className="auth-logo-name">Beme Market</span>
        </Link>

        <h1 className="auth-heading">Welcome back 👋</h1>
        <p className="auth-subheading">Sign in to your account to continue shopping.</p>

        {/* Google */}
        <div style={{ marginBottom: 16 }}>
          <button className="auth-btn-social" onClick={handleGoogle}
            disabled={anyLoading} type="button">
            {googleLoading ? <Spinner dark /> : <GoogleLogo />}
            Continue with Google
          </button>
        </div>

        <div className="auth-divider">or</div>

        <form className="auth-form" onSubmit={onSubmit} noValidate>

          <div className="auth-field">
            <label className="auth-label" htmlFor="l-email">Email address</label>
            <div className="auth-input-wrap">
              <input id="l-email" className="auth-input auth-input--plain" type="email"
                placeholder="your@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" disabled={anyLoading} />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="l-pass">Password</label>
            <div className="auth-input-wrap">
              <input id="l-pass" className="auth-input"
                type={showPass ? "text" : "password"}
                placeholder="Enter your password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" disabled={anyLoading} />
              <button type="button" className="auth-eye"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? "Hide password" : "Show password"}>
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          <div className="auth-row">
            <div className="auth-check-row">
              <button type="button"
                className={`auth-checkbox${rememberMe ? " auth-checkbox--on" : ""}`}
                onClick={() => setRememberMe(v => !v)}
                aria-pressed={rememberMe} aria-label="Remember me">
                {rememberMe && <CheckIcon />}
              </button>
              <span className="auth-check-label">Remember me</span>
            </div>
            <button type="button" className="auth-forgot" onClick={onForgot} disabled={anyLoading}>
              {resetLoading ? "Sending…" : resetCooldownLeft > 0 ? `Retry in ${resetCooldownLeft}s` : "Forgot password?"}
            </button>
          </div>

          {err && <div className="auth-alert auth-alert--error" role="alert">{err}</div>}
          {msg && <div className="auth-alert auth-alert--ok"    role="status">{msg}</div>}

          <button className="auth-btn-primary" type="submit" disabled={anyLoading}>
            {loading ? <><Spinner /> Signing in…</> : "Sign in"}
          </button>

          <button type="button" className="auth-btn-ghost"
            onClick={() => navigate("/checkout")} disabled={anyLoading}>
            Continue as guest
          </button>

        </form>

        <div className="auth-footer">
          <span className="auth-footer-text">
            Don't have an account?{" "}
            <Link className="auth-link" to="/signup">Create one</Link>
          </span>
        </div>

        <p className="auth-terms-note">
          By continuing you agree to our{" "}
          <Link className="auth-link" to="/terms">Terms</Link> and{" "}
          <Link className="auth-link" to="/privacy">Privacy Policy</Link>.
        </p>
      </div>

      {/* ── Right — illustration ── */}
      <div className="auth-visual">
        <LoginIllustration />
        <div className="auth-visual-caption">
          <h2>Your favourite shop 🇬🇭</h2>
          <p>Sign in to unlock exclusive deals, track your orders, and save your favourite items.</p>
        </div>
      </div>

    </div>
  );
}