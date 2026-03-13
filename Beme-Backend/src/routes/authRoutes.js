// Beme-Backend/src/routes/authRoutes.js
import express from "express";
import { firebaseAdmin } from "../firebaseAdmin.js";
import { sendPasswordResetEmail } from "../services/email.js";

const router = express.Router();
const EMAIL_SEND_TIMEOUT_MS = 12000;

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getFrontendBaseUrl() {
  return String(
    process.env.FRONTEND_URL || "http://localhost:5173"
  ).replace(/\/+$/, "");
}

function withTimeout(promise, timeoutMs, label = "Operation") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

router.get("/", (_req, res) => {
  res.json({ message: "Auth route working" });
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    const actionCodeSettings = {
      url: `${getFrontendBaseUrl()}/login?reset=1`,
      handleCodeInApp: false,
    };

    try {
      const resetLink = await firebaseAdmin
        .auth()
        .generatePasswordResetLink(email, actionCodeSettings);

      await withTimeout(
        sendPasswordResetEmail({
          email,
          resetLink,
        }),
        EMAIL_SEND_TIMEOUT_MS,
        "Password reset email send"
      );
    } catch (innerError) {
      const code = innerError?.code || "";
      const message = innerError?.message || "";

      console.error("Forgot password inner error:", innerError);

      if (
        code.includes("auth/user-not-found") ||
        code.includes("auth/invalid-email")
      ) {
        return res.status(200).json({
          success: true,
          message:
            "If an account exists for this email, a password reset link has been sent.",
        });
      }

      if (message.includes("timed out")) {
        return res.status(504).json({
          success: false,
          message:
            "Reset email service timed out. Check SMTP settings in Render.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Could not send reset email. Check backend email settings.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "If an account exists for this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not send reset email. Try again.",
    });
  }
});

export default router;