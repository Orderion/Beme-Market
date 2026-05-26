import express from "express";
import { firebaseAdmin } from "../firebaseAdmin.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/email.js";

const router = express.Router();
const EMAIL_SEND_TIMEOUT_MS = 12000;

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}
function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}
function getFrontendBaseUrl() {
  return String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
}
function withTimeout(promise, ms, label = "Operation") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

router.get("/", (_req, res) => res.json({ message: "Auth route working" }));

/* ── Forgot password → custom branded email with custom reset URL ── */
router.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    try {
      // Generate Firebase reset link (raw — contains oobCode)
      const rawLink = await firebaseAdmin.auth().generatePasswordResetLink(email, {
        url: `${getFrontendBaseUrl()}/login?reset=done`,
        handleCodeInApp: false,
      });

      // Extract oobCode and build OUR custom reset page URL
      const parsed  = new URL(rawLink);
      const oobCode = parsed.searchParams.get("oobCode") || "";
      const resetLink = oobCode
        ? `${getFrontendBaseUrl()}/reset-password?oobCode=${encodeURIComponent(oobCode)}`
        : rawLink; // fallback to Firebase URL if parse fails

      await withTimeout(
        sendPasswordResetEmail({ email, resetLink }),
        EMAIL_SEND_TIMEOUT_MS,
        "Password reset email"
      );

      return res.json({
        success: true,
        message: "If an account exists for this email, a password reset link has been sent.",
      });
    } catch (inner) {
      const code = inner?.code || "";
      console.error("[forgot-password]", inner.message);
      if (code.includes("auth/user-not-found") || code.includes("auth/invalid-email")) {
        return res.json({ success: true, message: "If an account exists for this email, a reset link has been sent." });
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
        EMAIL_SEND_TIMEOUT_MS,
        "Verification email"
      );
      return res.json({ success: true, message: "Verification email sent." });
    } catch (inner) {
      const code = inner?.code || "";
      console.error("[send-verification]", inner.message);
      if (code.includes("auth/user-not-found") || code.includes("auth/invalid-email")) {
        return res.json({ success: true });
      }
      return res.status(500).json({ success: false, message: "Could not send verification email." });
    }
  } catch (err) {
    console.error("[send-verification] route:", err.message);
    return res.status(500).json({ success: false, message: "Could not send verification email." });
  }
});

/* ── Test email — remove after confirming emails work ── */
router.get("/test-email", async (req, res) => {
  const to = req.query.to || process.env.ADMIN_EMAIL;
  if (!to) return res.status(400).json({ error: "Pass ?to=youremail@gmail.com" });
  try {
    const { sendPasswordResetEmail } = await import("../services/email.js");
    await sendPasswordResetEmail({
      email: to,
      resetLink: "https://bememarket.store/reset-password?oobCode=TEST_CODE",
    });
    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
