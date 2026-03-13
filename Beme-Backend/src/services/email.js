// Beme-Backend/src/services/email.js
import nodemailer from "nodemailer";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required email env: ${name}`);
  }
  return value;
}

function createTransport() {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT || 587);
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPasswordResetEmail({ email, resetLink }) {
  const transporter = createTransport();

  const fromEmail = getRequiredEnv("SMTP_FROM_EMAIL");
  const fromName = process.env.SMTP_FROM_NAME || "Beme Market";

  const safeLink = escapeHtml(resetLink);

  const subject = "Reset your Beme Market password";

  const text = `
You requested a password reset for your Beme Market account.

Use the link below to reset your password:

${resetLink}

If you did not request this, you can ignore this email.
`;

  const html = `
  <div style="margin:0;padding:32px;background:#0b0b0b;font-family:Arial,sans-serif;color:#ffffff;">
    <div style="max-width:560px;margin:0 auto;background:#111111;border-radius:18px;padding:32px;border:1px solid rgba(255,255,255,0.08);">

      <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.7;margin-bottom:14px;">
        Beme Market
      </div>

      <h1 style="margin:0 0 14px;font-size:28px;">
        Reset your password
      </h1>

      <p style="font-size:15px;line-height:1.7;">
        We received a request to reset the password for
        <strong>${escapeHtml(email)}</strong>.
      </p>

      <p style="font-size:15px;line-height:1.7;">
        Click the button below to choose a new password.
      </p>

      <a
        href="${safeLink}"
        style="display:inline-block;padding:14px 22px;border-radius:999px;background:#ffffff;color:#111111;text-decoration:none;font-weight:700;margin-top:12px;"
      >
        Reset password
      </a>

      <p style="margin-top:24px;font-size:13px;opacity:0.7;">
        If the button does not work, copy and paste this link:
      </p>

      <p style="font-size:13px;word-break:break-all;">
        ${safeLink}
      </p>

      <p style="margin-top:24px;font-size:13px;opacity:0.7;">
        If you did not request this, you can safely ignore this email.
      </p>

    </div>
  </div>
  `;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject,
    text,
    html,
  });
}