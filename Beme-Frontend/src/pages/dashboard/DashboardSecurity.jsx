/* ================================================================
   FILE: Beme-Frontend/src/pages/dashboard/DashboardSecurity.jsx
   Seller security settings:
     - Enable/disable Google Authenticator (TOTP)
     - QR code display for setup
     - 6-digit confirmation step before activating
     - Disable requires one last valid code
================================================================ */
import { useEffect, useRef, useState } from "react";
// qrcode package renders QR codes to canvas without any external API calls
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import {
  setupTOTP,
  enableTOTP,
  disableTOTP,
} from "../../services/twoFactorService";

/* ── constants ── */
const CODE_LENGTH = 6;

/* ── QR code rendered inline via qrcode library (no external API) ── */
function QRCode({ value, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    // Dynamically import qrcode to avoid SSR issues
    import("qrcode").then((QRLib) => {
      const QR = QRLib.default || QRLib;
      QR.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: "#111111", light: "#ffffff" },
      }).catch(console.error);
    }).catch(() => {
      // Fallback: try the API approach
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#f0f4ff";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#666";
        ctx.font = "12px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Use manual entry below", size / 2, size / 2);
      }
    });
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: 12, border: "2px solid var(--soft, #f0f4ff)", display: "block" }}
      aria-label="Scan this QR code with your authenticator app"
    />
  );
}

/* ── 6-digit OTP input ── */
function OtpInput({ onComplete, disabled, label }) {
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const refs = useRef([]);

  // reset when disabled flips back to false (new setup started)
  useEffect(() => {
    if (!disabled) setDigits(Array(CODE_LENGTH).fill(""));
  }, [disabled]);

  const handleDigit = (i, val) => {
    const cleaned = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = cleaned;
    setDigits(next);
    if (cleaned && i < CODE_LENGTH - 1) refs.current[i + 1]?.focus();
    if (next.every(d => d !== "")) onComplete(next.join(""));
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    refs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    if (pasted.length === CODE_LENGTH) onComplete(pasted);
  };

  return (
    <div>
      {label && <p style={styles.otpLabel}>{label}</p>}
      <div style={styles.otpRow} onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => refs.current[i] = el}
            style={{
              ...styles.otpDigit,
              borderColor: d ? "var(--grtheme, #7c3aed)" : "rgba(17,17,17,0.15)",
              background: d ? "rgba(124,58,237,0.04)" : "var(--bg, #fff)",
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)}
            autoComplete="one-time-code"
            autoFocus={i === 0}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function DashboardSecurity() {
  /* ── MFA status from Firestore ── */
  const [mfaEnabled,  setMfaEnabled]  = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  /* ── Setup flow state ── */
  const [setupStep,  setSetupStep]  = useState("idle"); // idle | qr | verify | done
  const [otpauth,    setOtpauth]    = useState("");
  const [secret,     setSecret]     = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError,   setSetupError]   = useState("");

  /* ── Disable flow state ── */
  const [disableStep,    setDisableStep]    = useState("idle"); // idle | confirm
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError,   setDisableError]   = useState("");

  /* ── Notifications ── */
  const [successMsg, setSuccessMsg] = useState("");

  /* ── Load current MFA status ── */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setStatusLoading(false); return; }

    getDoc(doc(db, "users", user.uid))
      .then(snap => {
        setMfaEnabled(snap.data()?.mfa?.enabled === true);
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, []);

  /* ── Step 1: generate secret + QR ── */
  const handleStartSetup = async () => {
    setSetupLoading(true);
    setSetupError("");
    setSuccessMsg("");
    try {
      const data = await setupTOTP();
      setOtpauth(data.otpauth);
      setSecret(data.secret);
      setSetupStep("qr");
    } catch (e) {
      setSetupError(e?.message || "Could not start setup. Try again.");
    } finally {
      setSetupLoading(false);
    }
  };

  /* ── Step 2: seller types first code to confirm ── */
  const handleEnableConfirm = async (code) => {
    if (setupLoading) return;
    setSetupLoading(true);
    setSetupError("");
    try {
      await enableTOTP(code);
      setMfaEnabled(true);
      setSetupStep("done");
      setSuccessMsg("Two-step verification is now active on your account.");
    } catch (e) {
      setSetupError(e?.message || "Incorrect code. Try again.");
      setSetupLoading(false);
    }
  };

  /* ── Disable: seller confirms with current code ── */
  const handleDisableConfirm = async (code) => {
    if (disableLoading) return;
    setDisableLoading(true);
    setDisableError("");
    try {
      await disableTOTP(code);
      setMfaEnabled(false);
      setDisableStep("idle");
      setSetupStep("idle");
      setSuccessMsg("Two-step verification has been turned off.");
    } catch (e) {
      setDisableError(e?.message || "Incorrect code. Two-step verification was not disabled.");
      setDisableLoading(false);
    }
  };

  /* ── Reset setup flow ── */
  const resetSetup = () => {
    setSetupStep("idle");
    setOtpauth("");
    setSecret("");
    setSetupError("");
  };

  if (statusLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingWrap}>
          <span style={styles.spinner} />
          <span style={styles.loadingText}>Loading security settings…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Security</h1>
        <p style={styles.subheading}>
          Protect your store and earnings with two-step verification.
        </p>
      </div>

      {successMsg && (
        <div style={styles.successBanner} role="status">
          <CheckCircleIcon /> {successMsg}
        </div>
      )}

      {/* ── MFA Card ── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardIconWrap}>
            <ShieldIcon />
          </div>
          <div style={styles.cardHeaderText}>
            <h2 style={styles.cardTitle}>Two-step verification</h2>
            <p style={styles.cardDesc}>
              Require a 6-digit code from your authenticator app every time you sign in.
              Works with Google Authenticator, Authy, and any TOTP app.
            </p>
          </div>
          <div style={styles.statusBadge(mfaEnabled)}>
            {mfaEnabled ? "Active" : "Off"}
          </div>
        </div>

        {/* ── NOT enabled: show setup flow ── */}
        {!mfaEnabled && (
          <>
            {setupStep === "idle" && (
              <div style={styles.cardBody}>
                <div style={styles.stepsRow}>
                  {["Install an authenticator app", "Scan the QR code", "Enter your first code"].map((s, i) => (
                    <div key={i} style={styles.stepItem}>
                      <div style={styles.stepNum}>{i + 1}</div>
                      <span style={styles.stepText}>{s}</span>
                    </div>
                  ))}
                </div>
                <button
                  style={styles.btnPrimary}
                  onClick={handleStartSetup}
                  disabled={setupLoading}
                >
                  {setupLoading ? <><Spinner /> Setting up…</> : "Set up authenticator"}
                </button>
                {setupError && <p style={styles.errorText}>{setupError}</p>}
              </div>
            )}

            {setupStep === "qr" && (
              <div style={styles.cardBody}>
                <p style={styles.instructionText}>
                  <strong>Step 1:</strong> Open your authenticator app and scan this QR code.
                </p>
                <div style={styles.qrWrap}>
                  <QRCode value={otpauth} size={200} />
                </div>

                <details style={styles.manualDetails}>
                  <summary style={styles.manualSummary}>Can't scan? Enter code manually</summary>
                  <div style={styles.manualCodeWrap}>
                    <code style={styles.manualCode}>{secret}</code>
                    <button
                      style={styles.copyBtn}
                      onClick={() => navigator.clipboard?.writeText(secret)}
                      type="button"
                    >
                      Copy
                    </button>
                  </div>
                  <p style={styles.manualHint}>
                    In your authenticator app, choose "Enter setup key" and paste the code above.
                    Account name: Beme Market.
                  </p>
                </details>

                <p style={{ ...styles.instructionText, marginTop: 24 }}>
                  <strong>Step 2:</strong> Enter the 6-digit code your app shows now.
                </p>

                <OtpInput
                  onComplete={handleEnableConfirm}
                  disabled={setupLoading}
                  label="6-digit code from your app"
                />

                {setupError && <p style={styles.errorText}>{setupError}</p>}
                {setupLoading && (
                  <p style={styles.loadingText}><Spinner /> Verifying…</p>
                )}

                <button style={styles.btnGhost} onClick={resetSetup} disabled={setupLoading}>
                  Cancel
                </button>
              </div>
            )}

            {setupStep === "done" && (
              <div style={styles.cardBody}>
                <div style={styles.doneWrap}>
                  <div style={styles.doneIcon}><CheckCircleIcon size={40} /></div>
                  <p style={styles.doneText}>
                    Two-step verification is active. You'll be asked for a code every time you sign in.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── IS enabled: show status + disable option ── */}
        {mfaEnabled && (
          <div style={styles.cardBody}>
            <div style={styles.enabledRow}>
              <div style={styles.enabledInfo}>
                <CheckCircleIcon />
                <span style={styles.enabledText}>
                  Your account is protected. You'll need your authenticator app to sign in.
                </span>
              </div>
            </div>

            {disableStep === "idle" && (
              <button
                style={styles.btnDanger}
                onClick={() => { setDisableStep("confirm"); setDisableError(""); }}
              >
                Turn off two-step verification
              </button>
            )}

            {disableStep === "confirm" && (
              <div style={styles.disableConfirmBox}>
                <p style={styles.disableWarning}>
                  <strong>Are you sure?</strong> Turning this off makes your account less secure.
                  Enter your current authenticator code to confirm.
                </p>

                <OtpInput
                  onComplete={handleDisableConfirm}
                  disabled={disableLoading}
                  label="Enter your current 6-digit code to confirm"
                />

                {disableError && <p style={styles.errorText}>{disableError}</p>}
                {disableLoading && (
                  <p style={styles.loadingText}><Spinner /> Disabling…</p>
                )}

                <button
                  style={styles.btnGhost}
                  onClick={() => { setDisableStep("idle"); setDisableError(""); }}
                  disabled={disableLoading}
                >
                  Keep two-step verification on
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tips card ── */}
      <div style={{ ...styles.card, marginTop: 16 }}>
        <div style={styles.tipsHeader}>
          <InfoIcon />
          <h3 style={styles.tipsTitle}>Recommended authenticator apps</h3>
        </div>
        <ul style={styles.tipsList}>
          <li><strong>Google Authenticator</strong> — iOS &amp; Android, simple and free</li>
          <li><strong>Authy</strong> — iOS &amp; Android &amp; desktop, supports cloud backup</li>
          <li><strong>Microsoft Authenticator</strong> — iOS &amp; Android, works with personal accounts too</li>
        </ul>
        <p style={styles.tipsNote}>
          Lost access to your authenticator app? Contact Beme Market support to recover your account.
        </p>
      </div>
    </div>
  );
}

/* ── Icons ── */
function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="var(--grtheme,#7c3aed)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function CheckCircleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="var(--muted,#888)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  );
}
function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14, borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white",
      animation: "sec-spin 0.7s linear infinite", marginRight: 6, verticalAlign: "middle",
    }} />
  );
}

/* ── Styles ── */
const styles = {
  page: {
    padding: "28px 24px 60px",
    maxWidth: 640,
    fontFamily: "var(--font-main, system-ui, sans-serif)",
    color: "var(--text, #111)",
  },
  header: { marginBottom: 24 },
  heading: {
    fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em",
    color: "var(--text, #111)", margin: "0 0 4px",
  },
  subheading: {
    fontSize: 14, color: "var(--muted, #666)", fontWeight: 500,
    margin: 0, lineHeight: 1.55,
  },
  loadingWrap: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "40px 0", color: "var(--muted, #888)",
  },
  loadingText: {
    fontSize: 14, color: "var(--muted, #888)", display: "flex",
    alignItems: "center", gap: 6, margin: "8px 0 0",
  },
  spinner: {
    display: "inline-block", width: 18, height: 18, borderRadius: "50%",
    border: "2px solid rgba(17,17,17,0.15)", borderTopColor: "var(--text,#111)",
  },
  card: {
    background: "var(--card, #fff)",
    border: "1.5px solid rgba(17,17,17,0.08)",
    borderRadius: 16,
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex", alignItems: "flex-start", gap: 14,
    padding: "20px 22px", borderBottom: "1px solid rgba(17,17,17,0.07)",
  },
  cardIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    background: "rgba(124,58,237,0.08)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardHeaderText: { flex: 1 },
  cardTitle: {
    fontSize: 16, fontWeight: 800, margin: "0 0 4px",
    color: "var(--text, #111)", letterSpacing: "-0.02em",
  },
  cardDesc: {
    fontSize: 13, color: "var(--muted, #666)", margin: 0,
    lineHeight: 1.6, fontWeight: 500,
  },
  statusBadge: (active) => ({
    padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
    background: active ? "rgba(22,163,74,0.1)" : "rgba(17,17,17,0.07)",
    color: active ? "#15803d" : "var(--muted, #666)", flexShrink: 0,
    alignSelf: "center",
  }),
  cardBody: { padding: "20px 22px" },
  stepsRow: {
    display: "flex", flexDirection: "column", gap: 10, marginBottom: 20,
  },
  stepItem: { display: "flex", alignItems: "center", gap: 12 },
  stepNum: {
    width: 26, height: 26, borderRadius: "50%",
    background: "rgba(124,58,237,0.1)", color: "var(--grtheme, #7c3aed)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 800, flexShrink: 0,
  },
  stepText: { fontSize: 14, fontWeight: 600, color: "var(--text, #111)" },
  btnPrimary: {
    display: "inline-flex", alignItems: "center", gap: 6,
    height: 46, padding: "0 20px", borderRadius: 10,
    background: "var(--grtheme, #7c3aed)", color: "white",
    border: "none", fontSize: 14, fontWeight: 700,
    cursor: "pointer", transition: "opacity 0.15s",
  },
  btnGhost: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    height: 40, padding: "0 16px", borderRadius: 10, marginTop: 12,
    border: "1.5px solid rgba(17,17,17,0.12)", background: "transparent",
    color: "var(--muted, #666)", fontSize: 13, fontWeight: 600, cursor: "pointer",
    width: "100%",
  },
  btnDanger: {
    display: "inline-flex", alignItems: "center", gap: 6,
    height: 40, padding: "0 16px", borderRadius: 10,
    background: "rgba(220,38,38,0.07)", color: "#dc2626",
    border: "1px solid rgba(220,38,38,0.2)", fontSize: 13, fontWeight: 700,
    cursor: "pointer",
  },
  errorText: {
    fontSize: 13, color: "#dc2626", fontWeight: 600,
    margin: "10px 0 0", lineHeight: 1.5,
  },
  successBanner: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 16px", borderRadius: 10, marginBottom: 16,
    background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)",
    color: "#15803d", fontSize: 13, fontWeight: 600,
  },
  instructionText: {
    fontSize: 14, color: "var(--text, #111)", margin: "0 0 16px",
    lineHeight: 1.6,
  },
  qrWrap: {
    display: "flex", justifyContent: "center",
    margin: "0 0 20px", padding: 16,
    background: "var(--soft, #f8faff)", borderRadius: 12,
  },
  manualDetails: {
    border: "1px solid rgba(17,17,17,0.1)", borderRadius: 10,
    padding: "10px 14px", marginBottom: 8,
  },
  manualSummary: {
    fontSize: 13, fontWeight: 600, color: "var(--muted, #666)",
    cursor: "pointer", userSelect: "none",
  },
  manualCodeWrap: {
    display: "flex", alignItems: "center", gap: 10, marginTop: 10,
    background: "var(--soft, #f0f4ff)", borderRadius: 8, padding: "10px 12px",
  },
  manualCode: {
    flex: 1, fontSize: 13, fontFamily: "monospace", letterSpacing: "0.08em",
    color: "var(--text, #111)", wordBreak: "break-all",
  },
  copyBtn: {
    padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(17,17,17,0.12)",
    background: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
    color: "var(--text, #111)", flexShrink: 0,
  },
  manualHint: {
    fontSize: 12, color: "var(--muted, #888)", margin: "8px 0 0", lineHeight: 1.6,
  },
  otpLabel: {
    fontSize: 13, fontWeight: 700, color: "var(--text, #111)",
    margin: "0 0 10px",
  },
  otpRow: {
    display: "flex", gap: 8, justifyContent: "center", margin: "0 0 4px",
  },
  otpDigit: {
    width: 48, height: 58, borderRadius: 10,
    border: "2px solid rgba(17,17,17,0.14)",
    fontSize: 22, fontWeight: 800, textAlign: "center",
    fontFamily: "var(--font-main, system-ui)",
    outline: "none", cursor: "text",
    transition: "border-color 0.15s, background 0.15s",
  },
  enabledRow: {
    display: "flex", flexDirection: "column", gap: 16, marginBottom: 16,
  },
  enabledInfo: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 14px", borderRadius: 10,
    background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)",
  },
  enabledText: {
    fontSize: 13, fontWeight: 600, color: "#15803d", lineHeight: 1.5,
  },
  disableConfirmBox: {
    marginTop: 16, padding: "16px",
    background: "rgba(220,38,38,0.04)", borderRadius: 10,
    border: "1px solid rgba(220,38,38,0.12)",
  },
  disableWarning: {
    fontSize: 13, color: "#dc2626", margin: "0 0 16px", lineHeight: 1.6,
  },
  doneWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 12, textAlign: "center", padding: "12px 0",
  },
  doneIcon: { color: "#16a34a" },
  doneText: {
    fontSize: 14, color: "var(--text, #111)", fontWeight: 500,
    lineHeight: 1.6, maxWidth: 340,
  },
  tipsHeader: {
    display: "flex", alignItems: "center", gap: 8, padding: "16px 22px 0",
  },
  tipsTitle: {
    fontSize: 14, fontWeight: 700, color: "var(--text, #111)", margin: 0,
  },
  tipsList: {
    fontSize: 13, color: "var(--muted, #666)", lineHeight: 1.8,
    margin: "8px 0 8px", paddingLeft: 36,
  },
  tipsNote: {
    fontSize: 12, color: "var(--muted, #888)", margin: "0 0 16px",
    paddingLeft: 22, paddingRight: 22, lineHeight: 1.6,
  },
};