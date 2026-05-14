// functions index.js
const { setGlobalOptions }  = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { auth }               = require("firebase-functions/v1");   // auth.user().onCreate is v1 only
const admin                  = require("firebase-admin");
const nodemailer             = require("nodemailer");

admin.initializeApp();

// Apply max instances to all v2 functions
setGlobalOptions({ maxInstances: 10 });

// ─────────────────────────────────────────────────────────────────────────────
// TRANSPORTER
// Credentials come from functions/.env (loaded automatically by Firebase CLI).
// Never hardcode secrets here.
// ─────────────────────────────────────────────────────────────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   "smtp-relay.brevo.com",
    port:   587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });
  return _transporter;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATE
// Branded neo-brutalist email matching Beme Market's design.
// ─────────────────────────────────────────────────────────────────────────────
function buildVerificationEmail(link, name) {
  const safeName = name || "there";

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Verify your Beme Market account</title>
</head>
<body style="margin:0;padding:0;background:#FCFAF2;
             font-family:'Arial',Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#FCFAF2;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" border="0"
               style="max-width:480px;width:100%;background:#ffffff;
                      border:2px solid #111111;
                      box-shadow:5px 5px 0 0 #111111;">

          <!-- Banner -->
          <tr>
            <td style="background:#111111;padding:14px 24px;text-align:center;">
              <span style="color:#FCFAF2;font-size:10px;font-weight:900;
                           letter-spacing:0.12em;text-transform:uppercase;">
                Welcome to Beme Market &mdash; Ghana&rsquo;s favourite shop &#127468;&#127469;
              </span>
            </td>
          </tr>

          <!-- Brand -->
          <tr>
            <td style="padding:36px 32px 0;text-align:center;">
              <h1 style="margin:0;font-size:34px;font-weight:900;
                         letter-spacing:-0.04em;color:#111111;
                         border-bottom:3px solid #111111;
                         display:inline-block;padding-bottom:4px;">
                Beme Market
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 32px 0;">
              <h2 style="margin:0 0 14px;font-size:20px;font-weight:900;color:#111111;">
                Verify your email address
              </h2>
              <p style="margin:0 0 8px;font-size:14px;color:#555555;line-height:1.7;">
                Hi ${safeName},
              </p>
              <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.7;">
                Thanks for signing up! Click the button below to verify your
                email and fully activate your account &mdash; including your
                <strong style="color:#111111;">10&nbsp;% first-order discount</strong>.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 28px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${link}"
                       style="display:inline-block;background:#111111;
                              color:#FCFAF2;padding:16px 36px;
                              font-size:13px;font-weight:900;
                              letter-spacing:0.1em;text-transform:uppercase;
                              text-decoration:none;border:2px solid #111111;
                              box-shadow:4px 4px 0 0 #0066FF;">
                      Verify my email address &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry notice -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background:#E0EEFF;border:1.5px solid #111111;
                            border-radius:2px;padding:12px 16px;">
                <tr>
                  <td style="font-size:12px;color:#111111;font-weight:700;line-height:1.6;">
                    &#9432;&nbsp; This link expires in <strong>24&nbsp;hours</strong>.
                    If expired, log in and request a new one from the verification page.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:11px;color:#888888;line-height:1.7;">
                Button not working? Paste this into your browser:<br />
                <a href="${link}" style="color:#0066FF;word-break:break-all;">
                  ${link}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FCFAF2;border-top:2px solid #111111;padding:16px 32px;">
              <p style="margin:0;font-size:11px;color:#888888;line-height:1.7;">
                If you didn&rsquo;t create a Beme Market account, ignore this email.<br />
                &copy; ${new Date().getFullYear()} Beme Market &middot; Ghana &#127468;&#127469;
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SEND HELPER
// ─────────────────────────────────────────────────────────────────────────────
async function dispatchVerificationEmail(email, displayName) {
  const link = await admin.auth().generateEmailVerificationLink(email);
  const html = buildVerificationEmail(link, displayName);

  await getTransporter().sendMail({
    from:    `"${process.env.BREVO_FROM_NAME || "Beme Market"}" <${process.env.BREVO_FROM_EMAIL}>`,
    to:      email,
    subject: "Verify your Beme Market account",
    html,
    text: [
      `Hi ${displayName || "there"},`,
      "",
      "Verify your Beme Market account:",
      "",
      link,
      "",
      "Link expires in 24 hours.",
      "",
      "If you didn't sign up, ignore this email.",
      `© ${new Date().getFullYear()} Beme Market · Ghana`,
    ].join("\n"),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER — fires on every new user signup (v1 auth trigger)
// Sends the branded Brevo verification email automatically.
// ─────────────────────────────────────────────────────────────────────────────
exports.sendVerificationOnSignup = auth.user().onCreate(async (user) => {
  if (!user.email || user.emailVerified) return null;

  try {
    await dispatchVerificationEmail(user.email, user.displayName);
    console.log(`[verify] Sent to ${user.email}`);
  } catch (err) {
    console.error(`[verify] Failed for ${user.email}:`, err);
  }

  return null;
});

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE — resend verification email on demand (v2 callable)
// Called from VerifyEmail.jsx when the user clicks "Resend".
// ─────────────────────────────────────────────────────────────────────────────
exports.resendVerificationEmail = onCall(async (request) => {
  // Must be signed in
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to request a new verification email."
    );
  }

  const uid = request.auth.uid;

  let userRecord;
  try {
    userRecord = await admin.auth().getUser(uid);
  } catch (err) {
    console.error(`[resend] getUser failed for ${uid}:`, err);
    throw new HttpsError("internal", "Could not fetch user record.");
  }

  if (userRecord.emailVerified) {
    throw new HttpsError(
      "already-exists",
      "This email address is already verified."
    );
  }

  if (!userRecord.email) {
    throw new HttpsError(
      "failed-precondition",
      "No email address is associated with this account."
    );
  }

  try {
    await dispatchVerificationEmail(userRecord.email, userRecord.displayName);
    console.log(`[resend] Sent to ${userRecord.email}`);
    return { success: true };
  } catch (err) {
    console.error(`[resend] Failed for ${userRecord.email}:`, err);
    throw new HttpsError(
      "internal",
      "Failed to send the verification email. Please try again."
    );
  }
});