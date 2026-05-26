import express from "express";
import { firebaseAdmin } from "../firebaseAdmin.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/email.js";

const router = express.Router();
const EMAIL_SEND_TIMEOUT_MS = 12000;

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim()); }
function normalizeEmail(v) { return String(v||"").trim().toLowerCase(); }
function getFrontendBaseUrl() { return String(process.env.FRONTEND_URL||"http://localhost:5173").replace(/\/+$/,""); }
function withTimeout(p,ms,label="Op") {
  return Promise.race([p, new Promise((_,r)=>setTimeout(()=>r(new Error(`${label} timed out`)),ms))]);
}

router.get("/", (_req, res) => res.json({ message: "Auth route working" }));

/* ── Test reset email ── */
router.get("/test-email", async (req, res) => {
  const to = req.query.to || process.env.ADMIN_EMAIL;
  if (!to) return res.status(400).json({ error: "Pass ?to=youremail@gmail.com" });
  try {
    await sendPasswordResetEmail({
      email: to,
      resetLink: "https://bememarket.store/reset-password?oobCode=TEST_CODE",
    });
    res.json({ success: true, message: `Test reset email sent to ${to}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Test verification email ── */
router.get("/test-verify", async (req, res) => {
  const to = req.query.to;
  if (!to) return res.status(400).json({ error: "Pass ?to=youremail@gmail.com" });
  try {
    await sendVerificationEmail({
      email: to,
      verifyLink: `${getFrontendBaseUrl()}/login?verified=1`,
      name: "Test User",
    });
    res.json({ success: true, message: `Verification test email sent to ${to}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Forgot password ── */
router.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }
    try {
      const rawLink = await firebaseAdmin.auth().generatePasswordResetLink(email, {
        url: `${getFrontendBaseUrl()}/login?reset=done`, handleCodeInApp: false,
      });
      const parsed   = new URL(rawLink);
      const oobCode  = parsed.searchParams.get("oobCode") || "";
      const resetLink = oobCode
        ? `${getFrontendBaseUrl()}/reset-password?oobCode=${encodeURIComponent(oobCode)}`
        : rawLink;
      await withTimeout(sendPasswordResetEmail({ email, resetLink }), EMAIL_SEND_TIMEOUT_MS, "Password reset email");
      return res.json({ success: true, message: "If an account exists, a reset link has been sent." });
    } catch (inner) {
      const code = inner?.code || "";
      console.error("[forgot-password]", inner.message);
      if (code.includes("auth/user-not-found") || code.includes("auth/invalid-email")) {
        return res.json({ success: true, message: "If an account exists, a reset link has been sent." });
      }
      if (inner.message?.includes("timed out")) {
        return res.status(504).json({ success: false, message: "Email timed out. Try again." });
      }
      return res.status(500).json({ success: false, message: "Could not send reset email." });
    }
  } catch (err) {
    console.error("[forgot-password] route:", err.message);
    return res.status(500).json({ success: false, message: "Could not send reset email." });
  }
});

/* ── Send verification email after signup ── */
router.post("/send-verification", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Valid email required." });
    }
    try {
      const verifyLink = await firebaseAdmin.auth().generateEmailVerificationLink(
        normalizeEmail(email),
        { url: `${getFrontendBaseUrl()}/login?verified=1`, handleCodeInApp: false }
      );
      await withTimeout(
        sendVerificationEmail({ email: normalizeEmail(email), verifyLink, name: name || "" }),
        EMAIL_SEND_TIMEOUT_MS, "Verification email"
      );
      return res.json({ success: true, message: "Verification email sent." });
    } catch (inner) {
      const code = inner?.code || "";
      console.error("[send-verification]", inner.message);
      if (code.includes("auth/user-not-found") || code.includes("auth/invalid-email") || code.includes("TOO_MANY")) {
        return res.json({ success: true });
      }
      return res.status(500).json({ success: false, message: "Could not send verification email." });
    }
  } catch (err) {
    console.error("[send-verification] route:", err.message);
    return res.status(500).json({ success: false, message: "Could not send verification email." });
  }
});

export default router;
