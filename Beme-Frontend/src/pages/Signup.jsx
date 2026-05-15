import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
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

function SignupIllustration() {
  return (
    <svg viewBox="0 0 460 500" fill="none" xmlns="http://www.w3.org/2000/svg"
         className="auth-visual-svg" aria-hidden="true">
      <circle cx="230" cy="250" r="200" fill="#046EF2" opacity="0.04"/>
      <circle cx="230" cy="250" r="140" fill="#046EF2" opacity="0.04"/>
      <circle cx="80"  cy="400" r="40"  fill="#046EF2" opacity="0.07"/>
      <circle cx="390" cy="100" r="30"  fill="#046EF2" opacity="0.07"/>
      <circle cx="60"  cy="110" r="20"  fill="#046EF2" opacity="0.08"/>
      <circle cx="400" cy="390" r="28"  fill="#046EF2" opacity="0.07"/>
      <rect x="100" y="140" width="260" height="220" rx="20" fill="white"
            style={{filter: 'drop-shadow(0 12px 40px rgba(4,110,242,0.14))'}}>
      </rect>
      <rect x="100" y="140" width="260" height="220" rx="20" stroke="#EBF2FF" strokeWidth="1"/>
      <rect x="100" y="140" width="260" height="8" rx="4" fill="#046EF2"/>
      <rect x="100" y="144" width="260" height="4" fill="#046EF2"/>
      <circle cx="230" cy="188" r="32" fill="#EBF2FF"/>
      <circle cx="230" cy="180" r="12" fill="#046EF2" opacity="0.3"/>
      <ellipse cx="230" cy="204" rx="18" ry="10" fill="#046EF2" opacity="0.2"/>
      <circle cx="254" cy="166" r="13" fill="#046EF2">
        <animate attributeName="r" values="13;14;13" dur="2s" repeatCount="indefinite"/>
      </circle>
      <line x1="254" y1="160" x2="254" y2="172" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="248" y1="166" x2="260" y2="166" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="130" y="230" width="200" height="10" rx="5" fill="#EBF2FF"/>
      <rect x="148" y="246" width="164" height="7" rx="3.5" fill="#F0F4FF"/>
      <rect x="120" y="264" width="220" height="18" rx="6" fill="#F8FAFF" stroke="#E2E8F0" strokeWidth="1"/>
      <rect x="126" y="269" width="80" height="7" rx="3.5" fill="#CBD5E1"/>
      <rect x="120" y="288" width="220" height="18" rx="6" fill="#F8FAFF" stroke="#046EF2" strokeWidth="1.2"/>
      <rect x="126" y="293" width="60" height="7" rx="3.5" fill="#CBD5E1"/>
      <rect x="120" y="312" width="220" height="22" rx="8" fill="#046EF2"/>
      <rect x="162" y="318" width="136" height="9" rx="4.5" fill="white" opacity="0.4"/>
      <rect x="20" y="180" width="78" height="56" rx="12" fill="white"
            style={{filter: 'drop-shadow(0 6px 20px rgba(4,110,242,0.13))'}}>
        <animate attributeName="y" values="180;174;180" dur="3.2s" repeatCount="indefinite"/>
      </rect>
      <circle cx="42" cy="197" r="10" fill="#EBF2FF"/>
      <text x="38" y="201" fontSize="9" fill="#046EF2" fontFamily="system-ui" fontWeight="700">%</text>
      <rect x="30" y="211" width="52" height="7" rx="3.5" fill="#046EF2" opacity="0.7"/>
      <rect x="36" y="222" width="40" height="5" rx="2.5" fill="#EBF2FF"/>
      <rect x="362" y="200" width="78" height="56" rx="12" fill="white"
            style={{filter: 'drop-shadow(0 6px 20px rgba(4,110,242,0.13))'}}>
        <animate attributeName="y" values="200;194;200" dur="4s" repeatCount="indefinite"/>
      </rect>
      <circle cx="384" cy="217" r="10" fill="#EBF2FF"/>
      <rect x="379" y="213" width="10" height="7" rx="1" fill="#046EF2" opacity="0.6"/>
      <path d="M389 215 l5 0 l3 4 l0 3 l-8 0 Z" fill="#046EF2" opacity="0.4"/>
      <circle cx="381" cy="222" r="2" fill="#046EF2"/>
      <circle cx="393" cy="222" r="2" fill="#046EF2"/>
      <rect x="370" y="231" width="52" height="7" rx="3.5" fill="#046EF2" opacity="0.7"/>
      <rect x="376" y="242" width="40" height="5" rx="2.5" fill="#EBF2FF"/>
      <rect x="20" y="308" width="78" height="56" rx="12" fill="white"
            style={{filter: 'drop-shadow(0 6px 20px rgba(4,110,242,0.13))'}}>
        <animate attributeName="y" values="308;302;308" dur="3.8s" repeatCount="indefinite"/>
      </rect>
      <circle cx="42" cy="325" r="10" fill="#EBF2FF"/>
      <path d="M38 322 L38 326 Q38 330 42 332 Q46 330 46 326 L46 322 L38 322Z" fill="#046EF2" opacity="0.5"/>
      <polyline points="39.5,326.5 41.5,328.5 44.5,324" stroke="white" strokeWidth="1.2"
                fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="30" y="339" width="52" height="7" rx="3.5" fill="#046EF2" opacity="0.7"/>
      <rect x="36" y="350" width="40" height="5" rx="2.5" fill="#EBF2FF"/>
      <rect x="362" y="310" width="78" height="56" rx="12" fill="white"
            style={{filter: 'drop-shadow(0 6px 20px rgba(4,110,242,0.13))'}}>
        <animate attributeName="y" values="310;304;310" dur="4.4s" repeatCount="indefinite"/>
      </rect>
      <circle cx="384" cy="327" r="10" fill="#EBF2FF"/>
      <path d="M384 319 L385.5 323 L390 323 L386.5 325.5 L388 330 L384 327.5 L380 330 L381.5 325.5 L378 323 L382.5 323 Z"
            fill="#046EF2" opacity="0.5"/>
      <rect x="370" y="341" width="52" height="7" rx="3.5" fill="#046EF2" opacity="0.7"/>
      <rect x="376" y="352" width="40" height="5" rx="2.5" fill="#EBF2FF"/>
      <g opacity="0.35">
        <path d="M432 240 L434 247 L442 247 L436 252 L438 260 L432 256 L426 260 L428 252 L422 247 L430 247 Z" fill="#046EF2">
          <animate attributeName="opacity" values="0.35;0.65;0.35" dur="3.4s" repeatCount="indefinite"/>
        </path>
        <path d="M42 254 L44 260 L50 260 L45.5 264 L47 270 L42 267 L37 270 L38.5 264 L34 260 L40 260 Z" fill="#046EF2">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4.2s" repeatCount="indefinite"/>
        </path>
      </g>
      <circle cx="84"  cy="160" r="5" fill="#046EF2" opacity="0.18"/>
      <circle cx="96"  cy="150" r="3" fill="#046EF2" opacity="0.13"/>
      <circle cx="376" cy="168" r="5" fill="#046EF2" opacity="0.18"/>
      <circle cx="388" cy="158" r="3" fill="#046EF2" opacity="0.13"/>
      <circle cx="76"  cy="378" r="4" fill="#046EF2" opacity="0.15"/>
      <circle cx="386" cy="382" r="5" fill="#046EF2" opacity="0.15"/>
    </svg>
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

  const anyLoading = loading || googleLoading;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const emailTrim = email.trim();
    const passTrim  = password.trim();
    const confTrim  = confirmPass.trim();
    if (!emailTrim || !passTrim)  { setErr("Enter your email and password.");                  return; }
    if (!isValidEmail(emailTrim)) { setErr("Enter a valid email address.");                    return; }
    if (passTrim.length < 6)      { setErr("Password must be at least 6 characters.");         return; }
    if (passTrim !== confTrim)    { setErr("Passwords don't match. Please check and retry."); return; }
    if (!agreedToTerms)           { setErr("Please agree to the terms to continue.");          return; }
    setLoading(true);
    try {
      await signup(emailTrim, passTrim);
      navigate("/verify-email", { replace: true });
    } catch (e) {
      if (auth.currentUser) { navigate("/verify-email", { replace: true }); return; }
      const code = e?.code || "";
      if (code.includes("auth/email-already-in-use")) setErr("An account with this email already exists. Log in instead.");
      else if (code.includes("auth/weak-password"))   setErr("Password too weak. Use at least 6 characters.");
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

      {/* ── Left — illustration ── */}
      <div className="auth-visual">
        <SignupIllustration />
        <div className="auth-visual-caption">
          <h2>Join Beme Market 🇬🇭</h2>
          <p>Create your account and get 10% off your first order. Ghana's best deals, all in one place.</p>
        </div>
      </div>

      {/* ── Right — form ── */}
      <div className="auth-panel">

        <Link to="/" className="auth-logo">
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

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-subheading">Join thousands of shoppers across Ghana.</p>

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
                placeholder="Min. 6 characters" value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password" disabled={anyLoading} />
              <button type="button" className="auth-eye"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? "Hide password" : "Show password"}>
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="su-confirm">Confirm password</label>
            <div className="auth-input-wrap">
              <input id="su-confirm" className="auth-input"
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

          <button className="auth-btn-primary" type="submit" disabled={anyLoading}>
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