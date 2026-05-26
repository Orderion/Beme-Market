import { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { useEffect } from "react";
import { auth } from "../firebase";
import "./Auth.css";

/* ── Password strength (same as Signup) ── */
const REQUIREMENTS = [
  { key:"length", label:"At least 8 characters",     test:(p)=>p.length>=8           },
  { key:"upper",  label:"One uppercase letter (A-Z)", test:(p)=>/[A-Z]/.test(p)       },
  { key:"number", label:"One number (0-9)",            test:(p)=>/[0-9]/.test(p)       },
  { key:"symbol", label:"One symbol (!@#$...)",        test:(p)=>/[^a-zA-Z0-9]/.test(p)},
];
function getStrength(password) {
  if (!password) return { score:0, label:"", color:"", reqs:[] };
  const reqs  = REQUIREMENTS.map(r=>({...r, passed:r.test(password)}));
  const score = reqs.filter(r=>r.passed).length;
  const levels = [
    {label:"",color:""},
    {label:"Weak",  color:"#EF4444"},
    {label:"Fair",  color:"#F97316"},
    {label:"Good",  color:"#EAB308"},
    {label:"Strong",color:"#22C55E"},
  ];
  return { score, reqs, ...levels[score] };
}

/* ── Icons ── */
function EyeIcon({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
      <circle cx="12" cy="12" r="3"/>
      {!open && <line x1="4" y1="20" x2="20" y2="4"/>}
    </svg>
  );
}
function Spinner() {
  return <span className="auth-spinner" aria-hidden="true"/>;
}

function StrengthBar({ password }) {
  const { score, label, color, reqs } = useMemo(()=>getStrength(password),[password]);
  if (!password) return null;
  return (
    <div className="auth-strength">
      <div className="auth-strength-bar" aria-hidden="true">
        {[1,2,3,4].map(seg=>(
          <div key={seg} className="auth-strength-seg"
            style={{ background:score>=seg?color:undefined, opacity:score>=seg?1:undefined }}/>
        ))}
      </div>
      {label && (
        <div className="auth-strength-meta">
          <span className="auth-strength-label" style={{color}}>{label}</span>
          {score<4
            ? <span className="auth-strength-tip">{4-score} requirement{4-score!==1?"s":""} remaining</span>
            : <span className="auth-strength-tip" style={{color:"#22C55E"}}>Great password!</span>}
        </div>
      )}
      <ul className="auth-req-list" aria-label="Password requirements">
        {reqs.map(r=>(
          <li key={r.key} className={`auth-req-item${r.passed?" auth-req-item--ok":""}`}>
            <span className="auth-req-icon" aria-hidden="true">{r.passed?"✓":"○"}</span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Illustration ── */
function ResetIllustration() {
  return (
    <svg viewBox="0 0 460 500" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="auth-visual-svg" aria-hidden="true">
      <defs>
        <radialGradient id="rp-orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#046EF2" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#046EF2" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="rp-btn" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#046EF2"/>
          <stop offset="100%" stopColor="#6366F1"/>
        </linearGradient>
      </defs>
      <style>{`
        @keyframes rp-float  { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-12px)} }
        @keyframes rp-float2 { 0%,100%{transform:translateY(-5px)} 50%{transform:translateY(8px)} }
        @keyframes rp-pulse  { 0%,100%{r:200px;opacity:0.12} 50%{r:216px;opacity:0.22} }
        @keyframes rp-shield { 0%,100%{transform:scale(1)}   50%{transform:scale(1.06)} }
        @keyframes rp-star   { 0%,100%{opacity:0.2;transform:scale(0.7)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes rp-star2  { 0%,100%{opacity:0.7;transform:scale(1)}   50%{opacity:0.1;transform:scale(0.5)} }
        @keyframes rp-lock-glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .rp-card    { animation: rp-float 5s ease-in-out infinite; transform-origin:230px 250px; }
        .rp-key     { animation: rp-float2 4s ease-in-out infinite; transform-origin:60px 258px; }
        .rp-shield  { animation: rp-shield 2.8s ease-in-out infinite; transform-origin:385px 148px; }
        .rp-orb     { animation: rp-pulse 7s ease-in-out infinite; }
        .rp-star1   { animation: rp-star  2.2s ease-in-out infinite; transform-origin:440px 232px; }
        .rp-star2   { animation: rp-star2 3.1s ease-in-out infinite; transform-origin:46px 162px; }
        .rp-star3   { animation: rp-star  4s ease-in-out 1s infinite; transform-origin:396px 406px; }
        .rp-glow    { animation: rp-lock-glow 2.5s ease-in-out infinite; }
      `}</style>

      {/* Orb */}
      <circle className="rp-orb" cx="230" cy="250" r="200" fill="url(#rp-orb)"/>
      <circle cx="400" cy="390" r="55" fill="#7C3AED" opacity="0.05"/>

      {/* Stars */}
      <g className="rp-star1">
        <path d="M440 232 L442 239 L450 239 L444 244 L446 252 L440 248 L434 252 L436 244 L430 239 L438 239 Z" fill="#046EF2" opacity="0.5"/>
      </g>
      <g className="rp-star2">
        <path d="M46 162 L48 168 L54 168 L49 172 L51 179 L46 176 L41 179 L43 172 L38 168 L44 168 Z" fill="#7C3AED" opacity="0.5"/>
      </g>
      <g className="rp-star3">
        <path d="M396 404 L397 408 L402 408 L398.5 411 L400 416 L396 414 L392 416 L393.5 411 L390 408 L395 408 Z" fill="#046EF2" opacity="0.4"/>
      </g>

      {/* Shadow */}
      <ellipse cx="230" cy="364" rx="125" ry="7" fill="#CBD5E1" opacity="0.5"/>

      {/* ── MAIN CARD ── */}
      <g className="rp-card">
        <rect x="92" y="132" width="276" height="228" rx="20" fill="white"
          style={{filter:"drop-shadow(0 12px 40px rgba(4,110,242,0.15))"}}>
        </rect>
        {/* Gradient top bar */}
        <rect x="92" y="132" width="276" height="8" rx="4" fill="url(#rp-btn)"/>

        {/* Lock icon centre */}
        <circle cx="230" cy="186" r="32" fill="#EBF2FF"/>
        <rect x="218" y="186" width="24" height="18" rx="4" fill="#046EF2"/>
        <path d="M222 186 v-5 a8 8 0 0 1 16 0 v5" stroke="#046EF2" strokeWidth="2.5" fill="none" strokeLinecap="round" className="rp-glow"/>
        <circle cx="230" cy="196" r="3" fill="white"/>

        {/* "Reset password" label */}
        <rect x="176" y="228" width="108" height="7" rx="3.5" fill="#EBF2FF"/>
        <rect x="196" y="240" width="68"  height="5" rx="2.5" fill="#F0F4FF"/>

        {/* New password input */}
        <rect x="130" y="253" width="200" height="18" rx="6" fill="#F8FAFF" stroke="#046EF2" strokeWidth="1.5" className="rp-glow"/>
        <rect x="138" y="258" width="50"  height="4"  rx="2" fill="#CBD5E1"/>
        <circle cx="302" cy="262" r="2.5" fill="#CBD5E1"/>
        <circle cx="310" cy="262" r="2.5" fill="#CBD5E1"/>
        <circle cx="318" cy="262" r="2.5" fill="#CBD5E1"/>

        {/* Confirm password input */}
        <rect x="130" y="277" width="200" height="18" rx="6" fill="#F8FAFF" stroke="#E2E8F0" strokeWidth="1"/>
        <rect x="138" y="282" width="60"  height="4"  rx="2" fill="#CBD5E1"/>

        {/* Strength bar */}
        <rect x="130" y="301" width="200" height="4"  rx="2" fill="#EBF2FF"/>
        <rect x="130" y="301" width="150" height="4"  rx="2" fill="#22C55E" opacity="0.7"/>

        {/* Submit button */}
        <rect x="130" y="311" width="200" height="22" rx="8" fill="url(#rp-btn)"/>
        <rect x="168" y="318" width="124" height="7"  rx="3.5" fill="white" opacity="0.4"/>
      </g>

      {/* ── KEY CARD (left) ── */}
      <g className="rp-key">
        <rect x="18" y="220" width="74" height="78" rx="14" fill="white"
          style={{filter:"drop-shadow(0 6px 20px rgba(4,110,242,0.14))"}}>
        </rect>
        <rect x="18" y="220" width="74" height="5" rx="3" fill="#046EF2" opacity="0.7"/>
        <circle cx="42" cy="250" r="12" fill="#EBF2FF" stroke="#046EF2" strokeWidth="1.5"/>
        <circle cx="42" cy="250" r="5"  fill="#046EF2"/>
        <rect   x="50" y="248" width="20" height="4" rx="2" fill="#046EF2" opacity="0.6"/>
        <rect   x="62" y="244" width="4"  height="4" rx="1" fill="#046EF2" opacity="0.4"/>
        <rect   x="68" y="248" width="4"  height="8" rx="1" fill="#046EF2" opacity="0.4"/>
        <rect x="26" y="270" width="52" height="6" rx="3" fill="#EBF2FF"/>
        <rect x="32" y="281" width="40" height="4" rx="2" fill="#F0F4FF"/>
      </g>

      {/* ── SHIELD BADGE (top right) ── */}
      <g className="rp-shield">
        <circle cx="385" cy="148" r="28" fill="#EBF2FF"
          style={{filter:"drop-shadow(0 4px 14px rgba(4,110,242,0.2))"}}>
        </circle>
        <path d="M385 134 L371 140 L371 151 Q371 161 385 166 Q399 161 399 151 L399 140 Z"
          fill="#EBF2FF" stroke="#046EF2" strokeWidth="1.8" strokeLinejoin="round"/>
        <polyline points="378,150 383,156 393,143" stroke="#046EF2" strokeWidth="2.5"
          fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}

/* ══════════════════════════════════════
   STATES
══════════════════════════════════════ */

function InvalidLink() {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ width:64, height:64, borderRadius:"50%", background:"#fef2f2",
        display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h2 className="auth-heading" style={{ fontSize:22 }}>Link expired or invalid</h2>
      <p className="auth-subheading">
        This password reset link has expired or already been used.
        Request a new one from the login page.
      </p>
      <Link to="/login" className="auth-btn-primary"
        style={{ display:"flex", alignItems:"center", justifyContent:"center",
          gap:8, textDecoration:"none", marginTop:8, height:50, borderRadius:12,
          background:"#046EF2", color:"#fff", fontWeight:800, fontSize:15 }}>
        Back to Login
      </Link>
    </div>
  );
}

function SuccessState() {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ width:64, height:64, borderRadius:"50%",
        background:"linear-gradient(135deg,#046EF2,#7C3AED)",
        display:"flex", alignItems:"center", justifyContent:"center",
        margin:"0 auto 20px",
        boxShadow:"0 8px 24px rgba(4,110,242,0.35)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2 className="auth-heading" style={{ fontSize:22 }}>Password updated!</h2>
      <p className="auth-subheading">
        Your password has been reset successfully.
        Sign in with your new password.
      </p>
      <Link to="/login" className="auth-btn-primary"
        style={{ display:"flex", alignItems:"center", justifyContent:"center",
          gap:8, textDecoration:"none", marginTop:8, height:50, borderRadius:12,
          background:"#046EF2", color:"#fff", fontWeight:800, fontSize:15 }}>
        Sign in →
      </Link>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function ResetPassword() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const oobCode       = params.get("oobCode") || "";

  const [verifying,   setVerifying]   = useState(true);
  const [linkValid,   setLinkValid]   = useState(false);
  const [userEmail,   setUserEmail]   = useState("");

  const [password,    setPassword]    = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState(false);
  const [err,         setErr]         = useState("");

  const strength       = useMemo(()=>getStrength(password),[password]);
  const isStrong       = strength.score === 4;
  const passwordsMatch = !confirmPass || password === confirmPass;
  const canSubmit      = isStrong && passwordsMatch && password === confirmPass && !loading;

  /* Verify the oobCode is valid before showing the form */
  useEffect(()=>{
    if (!oobCode) { setVerifying(false); setLinkValid(false); return; }
    verifyPasswordResetCode(auth, oobCode)
      .then(email => { setUserEmail(email); setLinkValid(true); })
      .catch(()  => { setLinkValid(false); })
      .finally(()=> { setVerifying(false); });
  },[oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!password)               { setErr("Enter a new password.");              return; }
    if (!isStrong)               { setErr("Meet all password requirements first."); return; }
    if (password !== confirmPass){ setErr("Passwords don't match.");              return; }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setDone(true);
    } catch(e) {
      const code = e?.code || "";
      if      (code.includes("auth/expired-action-code"))   setErr("This reset link has expired. Please request a new one.");
      else if (code.includes("auth/invalid-action-code"))   setErr("Invalid reset link. Please request a new one.");
      else if (code.includes("auth/weak-password"))         setErr("Password too weak. Use at least 8 characters.");
      else                                                   setErr("Reset failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <Link to="/" className="auth-logo">
          <div className="auth-logo-mark">
            <img src="/Favicon-white.PNG" alt="" width="22" height="22" style={{ objectFit:"contain" }}/>
          </div>
          <span className="auth-logo-name">Beme Market</span>
        </Link>

        {verifying ? (
          <div style={{ display:"flex", alignItems:"center", gap:12, color:"#9ca3af", fontSize:14 }}>
            <span className="auth-spinner auth-spinner--dark"/>
            Verifying reset link…
          </div>
        ) : done ? (
          <SuccessState/>
        ) : !linkValid ? (
          <InvalidLink/>
        ) : (
          <>
            <h1 className="auth-heading">Set new password</h1>
            <p className="auth-subheading">
              {userEmail
                ? <>Resetting password for <strong>{userEmail}</strong></>
                : "Choose a strong new password for your account."}
            </p>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>

              <div className="auth-field">
                <label className="auth-label" htmlFor="rp-pass">New password</label>
                <div className="auth-input-wrap">
                  <input id="rp-pass" className="auth-input"
                    type={showPass?"text":"password"}
                    placeholder="Create a strong password"
                    value={password} onChange={e=>setPassword(e.target.value)}
                    autoComplete="new-password" disabled={loading}/>
                  <button type="button" className="auth-eye"
                    onClick={()=>setShowPass(v=>!v)}
                    aria-label={showPass?"Hide":"Show"}>
                    <EyeIcon open={showPass}/>
                  </button>
                </div>
                <StrengthBar password={password}/>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="rp-confirm">Confirm new password</label>
                <div className="auth-input-wrap">
                  <input id="rp-confirm"
                    className={`auth-input${confirmPass&&!passwordsMatch?" auth-input--error":""}`}
                    type={showConfirm?"text":"password"}
                    placeholder="Re-enter your new password"
                    value={confirmPass} onChange={e=>setConfirmPass(e.target.value)}
                    autoComplete="new-password" disabled={loading}/>
                  <button type="button" className="auth-eye"
                    onClick={()=>setShowConfirm(v=>!v)}
                    aria-label={showConfirm?"Hide":"Show"}>
                    <EyeIcon open={showConfirm}/>
                  </button>
                </div>
                {confirmPass && !passwordsMatch && (
                  <span className="auth-field-hint auth-field-hint--error">Passwords don't match</span>
                )}
                {confirmPass && passwordsMatch && password && (
                  <span className="auth-field-hint auth-field-hint--ok">Passwords match ✓</span>
                )}
              </div>

              {err && <div className="auth-alert auth-alert--error" role="alert">{err}</div>}

              <button className="auth-btn-primary" type="submit" disabled={!canSubmit}>
                {loading ? <><Spinner/> Resetting…</> : "Set new password"}
              </button>
            </form>

            <div className="auth-footer" style={{ marginTop:20 }}>
              <Link className="auth-link" to="/login">← Back to login</Link>
            </div>
          </>
        )}
      </div>

      <div className="auth-visual">
        <ResetIllustration/>
        <div className="auth-visual-caption">
          <h2>Secure your account</h2>
          <p>Choose a strong password to keep your store and orders protected.</p>
        </div>
      </div>
    </div>
  );
}
