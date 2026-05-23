/* ================================================================
   FILE: Beme-Frontend/src/services/twoFactorService.js
   Thin wrappers around Firebase callable functions.
   Import these in your components — never call getFunctions() directly.
================================================================ */
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

/* ── Lazy callable refs (created once, reused) ── */
const _setup   = httpsCallable(functions, "setupTOTP");
const _enable  = httpsCallable(functions, "enableTOTP");
const _verify  = httpsCallable(functions, "verifyTOTP");
const _disable = httpsCallable(functions, "disableTOTP");

/* ════════════════════════════════════════════════════════════
   setupTOTP()
   Call when seller opens the "Set up Authenticator" screen.
   Returns: { otpauth: string, secret: string }
     - otpauth  → feed into QR code renderer
     - secret   → show as fallback text for manual entry
════════════════════════════════════════════════════════════ */
export async function setupTOTP() {
  const result = await _setup();
  return result.data; // { otpauth, secret }
}

/* ════════════════════════════════════════════════════════════
   enableTOTP(code)
   Seller scanned QR and typed their first 6-digit code.
   Verifies the code then activates MFA on their account.
   Throws a Firebase HttpsError if the code is wrong.
════════════════════════════════════════════════════════════ */
export async function enableTOTP(code) {
  const result = await _enable({ code });
  return result.data; // { success: true }
}

/* ════════════════════════════════════════════════════════════
   verifyTOTP(code)
   Called during login after password auth.
   Returns: { valid: boolean, error?: string }
   Does NOT throw — always returns an object so Login.jsx
   can show inline errors without try/catch complexity.
════════════════════════════════════════════════════════════ */
export async function verifyTOTP(code) {
  try {
    const result = await _verify({ code });
    return result.data; // { valid: true } or { valid: false, error: "..." }
  } catch (err) {
    return {
      valid: false,
      error: err?.message || "Verification failed. Check your connection.",
    };
  }
}

/* ════════════════════════════════════════════════════════════
   disableTOTP(code)
   Seller confirms with one last code before disabling MFA.
   Throws a Firebase HttpsError if the code is wrong.
════════════════════════════════════════════════════════════ */
export async function disableTOTP(code) {
  const result = await _disable({ code });
  return result.data; // { success: true }
}