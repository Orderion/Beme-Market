const functions  = require("firebase-functions");
const admin      = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// ─────────────────────────────────────────────────────────────────────────────
// TRANSPORTER
// Lazy-initialised so we only build it after functions.config() is available.
// Credentials are stored via:
//   firebase functions:config:set
//     brevo.smtp_user="your-brevo-login@email.com"
//     brevo.smtp_key="your-brevo-smtp-key"
//     brevo.from_email="noreply@yourdomain.com"
//     brevo.from_name="Beme Market"
// ─────────────────────────────────────────────────────────────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const cfg = functions.config().brevo;
  _transporter = nodemailer.createTransport({
    host:   "smtp-relay.brevo.com",
    port:   587,
    secure: false,          // STARTTLS on port 587
    auth: {
      user: cfg.smtp_user,
      pass: cfg.smtp_key,
    },
  });
  return _transporter;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATE
// Matches Beme Market's neo-brutalist identity.
// Table-based layout for maximum email-client compatibility.
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
             font-family:'Arial',Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#FCFAF2;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Outer card — max 480 px -->
        <table width="480" cellpadding="0" cellspacing="0" border="0"
               style="max-width:480px;width:100%;
                      background:#ffffff;
                      border:2px solid #111111;
                      box-shadow:5px 5px 0 0 #111111;">

          <!-- ── Top banner ── -->
          <tr>
            <td style="background:#111111;padding:14px 24px;text-align:center;">
              <span style="color:#FCFAF2;font-size:10px;font-weight:900;
                           letter-spacing:0.12em;text-transform:uppercase;">
                Welcome to Beme Market &mdash; Ghana&rsquo;s favourite shop &#127468;&#127469;
              </span>
            </td>
          </tr>

          <!-- ── Brand heading ── -->
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

          <!-- ── Body copy ── -->
          <tr>
            <td style="padding:24px 32px 0;">
              <h2 style="margin:0 0 14px;font-size:20px;font-weight:900;
                         color:#111111;letter-spacing:-0.02em;">
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

          <!-- ── CTA button ── -->
          <tr>
            <td style="padding:0 32px 28px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${link}"
                       style="display:inline-block;
                              background:#111111;
                              color:#FCFAF2;
                              padding:16px 36px;
                              font-size:13px;font-weight:900;
                              letter-spacing:0.1em;
                              text-transform:uppercase;
                              text-decoration:none;
                              border:2px solid #111111;
                              box-shadow:4px 4px 0 0 #0066FF;">
                      Verify my email address &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Expiry notice ── -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background:#E0EEFF;border:1.5px solid #111111;
                            border-radius:2px;padding:12px 16px;">
                <tr>
                  <td style="font-size:12px;color:#111111;font-weight:700;line-height:1.6;">
                    &#9432;&nbsp; This link expires in <strong>24&nbsp;hours</strong>.
                    If it&rsquo;s expired, log in and request a new one from the
                    verification page.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Fallback link ── -->
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:11px;color:#888888;line-height:1.7;">
                Button not working? Paste this into your browser:<br />
                <a href="${link}"
                   style="color:#0066FF;word-break:break-all;font-size:11px;">
                  ${link}
                </a>
              </p>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#FCFAF2;border-top:2px solid #111111;
                       padding:16px 32px;">
              <p style="margin:0;font-size:11px;color:#888888;line-height:1.7;">
                If you didn&rsquo;t create a Beme Market account you can safely
                ignore this email.<br />
                &copy; ${new Date().getFullYear()} Beme Market &middot; Ghana &#127468;&#127469;
              </p>
            </td>
          </tr>

        </table>
        <!-- /card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SEND HELPER
// Used by both the onCreate trigger and the resend callable below.
// ─────────────────────────────────────────────────────────────────────────────
async function dispatchVerificationEmail(email, displayName) {
  const cfg  = functions.config().brevo;
  const link = await admin.auth().generateEmailVerificationLink(email);
  const html = buildVerificationEmail(link, displayName);

  await getTransporter().sendMail({
    from:    `"${cfg.from_name || "Beme Market"}" <${cfg.from_email}>`,
    to:      email,
    subject: "Verify your Beme Market account",
    html,
    // Plain-text fallback for clients that strip HTML
    text: [
      `Hi ${displayName || "there"},`,
      "",
      "Please verify your Beme Market account by visiting the link below.",
      "",
      link,
      "",
      "The link expires in 24 hours.",
      "",
      "If you didn't create a Beme Market account, ignore this email.",
      "",
      `© ${new Date().getFullYear()} Beme Market · Ghana`,
    ].join("\n"),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER: fires automatically every time a new user is created.
// This replaces the client-side sendEmailVerification() call entirely.
// ─────────────────────────────────────────────────────────────────────────────
exports.sendVerificationOnSignup = functions.auth.user().onCreate(async (user) => {
  // Skip if no email (phone-only) or already verified (e.g. Google OAuth)
  if (!user.email || user.emailVerified) return null;

  try {
    await dispatchVerificationEmail(user.email, user.displayName);
    functions.logger.info(`[verify] Sent to ${user.email}`);
  } catch (err) {
    // Log but don't throw — a failed email must not fail account creation.
    functions.logger.error(`[verify] Failed for ${user.email}:`, err);
  }

  return null;
});

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: resend verification email on demand.
// Called from VerifyEmail.jsx when the user clicks "Resend".
// Rate-limiting is handled on the client (60 s cooldown) but we also check
// server-side that the email isn't already verified.
// ─────────────────────────────────────────────────────────────────────────────
exports.resendVerificationEmail = functions.https.onCall(async (data, context) => {
  // Must be signed in
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in to request a new verification email."
    );
  }

  const uid = context.auth.uid;

  // Fetch the latest user record from Auth (not from Firestore)
  let userRecord;
  try {
    userRecord = await admin.auth().getUser(uid);
  } catch (err) {
    functions.logger.error(`[resend] getUser failed for ${uid}:`, err);
    throw new functions.https.HttpsError("internal", "Could not fetch user record.");
  }

  // Already verified — nothing to do
  if (userRecord.emailVerified) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "This email address is already verified."
    );
  }

  if (!userRecord.email) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "No email address is associated with this account."
    );
  }

  try {
    await dispatchVerificationEmail(userRecord.email, userRecord.displayName);
    functions.logger.info(`[resend] Sent to ${userRecord.email}`);
    return { success: true };
  } catch (err) {
    functions.logger.error(`[resend] Failed for ${userRecord.email}:`, err);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send the verification email. Please try again."
    );
  }
});