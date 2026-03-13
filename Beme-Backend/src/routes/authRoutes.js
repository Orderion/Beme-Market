import express from "express";
import { firebaseAdmin } from "../firebaseAdmin.js";
import { sendPasswordResetEmail } from "../services/email.js";

const router = express.Router();

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

      await sendPasswordResetEmail({
        email,
        resetLink,
      });
    } catch (innerError) {
      const code = innerError?.code || "";

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

      throw innerError;
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