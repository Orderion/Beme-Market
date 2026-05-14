/**
 * functions/index.js
 * Beme Market — Firebase Cloud Functions entry point
 *
 * EXISTING functions preserved (sendVerificationOnSignup, resendVerificationEmail).
 * NEW seller functions added below from separate module files.
 */

const functions  = require("firebase-functions");
const admin      = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialise Admin SDK once
if (!admin.apps.length) admin.initializeApp();

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING: Email verification (Brevo SMTP via nodemailer)
// ─────────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   "smtp-relay.brevo.com",
  port:   587,
  secure: false,
  auth: {
    user: functions.config().brevo?.user || process.env.BREVO_USER || "",
    pass: functions.config().brevo?.pass || process.env.BREVO_PASS || "",
  },
});

const FROM_EMAIL  = functions.config().brevo?.from  || "noreply@beme.market";
const SITE_URL    = functions.config().site?.url    || "https://beme.market";
const SITE_NAME   = "Beme Market";

/** Sends a verification email when a new user registers. */
exports.sendVerificationOnSignup = functions.auth.user().onCreate(async (user) => {
  if (!user.email) return null;
  try {
    const link = await admin.auth().generateEmailVerificationLink(user.email, {
      url: `${SITE_URL}/verify-email`,
    });
    await transporter.sendMail({
      from:    `"${SITE_NAME}" <${FROM_EMAIL}>`,
      to:      user.email,
      subject: `Verify your ${SITE_NAME} account`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#046EF2">Welcome to ${SITE_NAME}!</h2>
          <p>Please verify your email address to get started:</p>
          <a href="${link}" style="display:inline-block;padding:12px 24px;background:#046EF2;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">
            Verify Email
          </a>
          <p style="color:#888;font-size:13px;margin-top:24px">
            If you didn't create this account, you can ignore this email.
          </p>
        </div>
      `,
    });
    return null;
  } catch (err) {
    console.error("[sendVerificationOnSignup]", err);
    return null;
  }
});

/** Callable — resend verification email to the currently signed-in user. */
exports.resendVerificationEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  const user = await admin.auth().getUser(context.auth.uid);
  if (user.emailVerified) {
    throw new functions.https.HttpsError("already-exists", "Email is already verified.");
  }
  const link = await admin.auth().generateEmailVerificationLink(user.email, {
    url: `${SITE_URL}/verify-email`,
  });
  await transporter.sendMail({
    from:    `"${SITE_NAME}" <${FROM_EMAIL}>`,
    to:      user.email,
    subject: `Verify your ${SITE_NAME} email`,
    html: `<a href="${link}">Click here to verify your email</a>`,
  });
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Seller system functions
// Each function lives in its own file for maintainability.
// ─────────────────────────────────────────────────────────────────────────────

// ── createSellerStore — callable ─────────────────────────────────────────────
// Verifies Paystack payment, creates shop doc, sets user role to "seller".
// Called from SubscriptionSuccess.jsx after payment redirect.
const { createSellerStore } = require("./createSellerStore");
exports.createSellerStore = createSellerStore;

// ── handleSubscriptionRenewal — scheduled daily ───────────────────────────────
// Checks subscription expiry → grace period → suspension.
const { handleSubscriptionRenewal } = require("./handleSubscriptionRenewal");
exports.handleSubscriptionRenewal = handleSubscriptionRenewal;

// ── sellerFunctions — misc seller triggers and callables ─────────────────────
// Contains: sendSellerNotifications, verifySellerPlan, processWithdrawal,
//           reviewSellerStore, generateAnalytics
const sellerFunctions = require("./sellerFunctions");
exports.sendSellerNotifications = sellerFunctions.sendSellerNotifications;
exports.verifySellerPlan        = sellerFunctions.verifySellerPlan;
exports.processWithdrawal       = sellerFunctions.processWithdrawal;
exports.reviewSellerStore       = sellerFunctions.reviewSellerStore;
exports.generateAnalytics       = sellerFunctions.generateAnalytics;

// ─────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT NOTE
// ─────────────────────────────────────────────────────────────────────────────
// Before deploying, set these environment variables in Firebase:
//   firebase functions:config:set \
//     brevo.user="your-brevo-smtp-user" \
//     brevo.pass="your-brevo-smtp-password" \
//     brevo.from="noreply@beme.market" \
//     paystack.secret_key="sk_live_your_paystack_secret" \
//     site.url="https://beme.market"
//
// Then deploy:
//   firebase deploy --only functions

