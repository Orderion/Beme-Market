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

function formatMoney(value) {
  const amount = Number(value || 0);
  return `GHS ${amount.toFixed(2)}`;
}

function getFromConfig() {
  const fromEmail = getRequiredEnv("SMTP_FROM_EMAIL");
  const fromName = process.env.SMTP_FROM_NAME || "Beme Market";

  return {
    fromEmail,
    fromName,
  };
}

async function sendMail({ to, subject, text, html }) {
  const transporter = createTransport();
  const { fromEmail, fromName } = getFromConfig();

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  });
}

export async function sendPasswordResetEmail({ email, resetLink }) {
  const safeLink = escapeHtml(resetLink);

  const subject = "Reset your Beme Market password";

  const text = [
    "You requested a password reset for your Beme Market account.",
    "",
    "Use the link below to reset your password:",
    resetLink,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="margin:0;padding:32px;background:#0b0b0b;font-family:Arial,sans-serif;color:#ffffff;">
      <div style="max-width:560px;margin:0 auto;background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:32px;">
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.7;margin-bottom:14px;">
          Beme Market
        </div>

        <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;color:#ffffff;">
          Reset your password
        </h1>

        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.82);">
          We received a request to reset the password for <strong>${escapeHtml(
            email
          )}</strong>.
        </p>

        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.82);">
          Click the button below to choose a new password.
        </p>

        <a
          href="${safeLink}"
          style="display:inline-block;padding:14px 22px;border-radius:999px;background:#ffffff;color:#111111;text-decoration:none;font-weight:700;"
        >
          Reset password
        </a>

        <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.62);">
          If the button does not work, copy and paste this link into your browser:
        </p>

        <p style="margin:10px 0 0;font-size:13px;line-height:1.7;word-break:break-all;color:rgba(255,255,255,0.78);">
          ${safeLink}
        </p>

        <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.62);">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  await sendMail({
    to: email,
    subject,
    text,
    html,
  });
}

export async function sendOrderPaidEmails(payload = {}) {
  const {
    customerEmail,
    email,
    customerName,
    name,
    orderId,
    reference,
    total,
    amount,
    items = [],
    adminEmail,
    shopEmail,
  } = payload || {};

  const buyerEmail = String(customerEmail || email || "").trim();
  const buyerName = String(customerName || name || "Customer").trim();
  const safeBuyerName = escapeHtml(buyerName);
  const safeOrderId = escapeHtml(orderId || reference || "your order");
  const totalAmount = total ?? amount ?? 0;

  const itemLines = Array.isArray(items)
    ? items
        .map((item) => {
          const itemName = escapeHtml(item?.name || "Item");
          const qty = Number(item?.qty || 1);
          const price = Number(item?.price || 0);
          return `<li style="margin-bottom:8px;">${itemName} × ${qty} — ${formatMoney(
            price * qty
          )}</li>`;
        })
        .join("")
    : "";

  if (buyerEmail) {
    const subject = `Payment received for ${orderId || reference || "your order"}`;

    const text = [
      `Hi ${buyerName},`,
      "",
      "Your payment has been received successfully.",
      `Order: ${orderId || reference || "your order"}`,
      `Total: ${formatMoney(totalAmount)}`,
      "",
      "Thank you for shopping on Beme Market.",
    ].join("\n");

    const html = `
      <div style="margin:0;padding:32px;background:#0b0b0b;font-family:Arial,sans-serif;color:#ffffff;">
        <div style="max-width:560px;margin:0 auto;background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:32px;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.7;margin-bottom:14px;">
            Beme Market
          </div>

          <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;color:#ffffff;">
            Payment confirmed
          </h1>

          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.82);">
            Hi <strong>${safeBuyerName}</strong>, your payment has been received successfully.
          </p>

          <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.82);">
            <strong>Order:</strong> ${safeOrderId}
          </p>

          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.82);">
            <strong>Total:</strong> ${formatMoney(totalAmount)}
          </p>

          ${
            itemLines
              ? `
            <div style="margin:20px 0;">
              <div style="font-size:14px;font-weight:700;margin-bottom:10px;">Items</div>
              <ul style="padding-left:18px;margin:0;color:rgba(255,255,255,0.82);">
                ${itemLines}
              </ul>
            </div>
          `
              : ""
          }

          <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.62);">
            Thank you for shopping on Beme Market.
          </p>
        </div>
      </div>
    `;

    await sendMail({
      to: buyerEmail,
      subject,
      text,
      html,
    });
  }

  const internalEmail = String(adminEmail || shopEmail || "").trim();

  if (internalEmail) {
    const subject = `Order paid: ${orderId || reference || "New paid order"}`;

    const text = [
      "A customer payment has been confirmed.",
      `Order: ${orderId || reference || "N/A"}`,
      `Customer: ${buyerName}`,
      `Email: ${buyerEmail || "N/A"}`,
      `Total: ${formatMoney(totalAmount)}`,
    ].join("\n");

    const html = `
      <div style="margin:0;padding:24px;background:#0b0b0b;font-family:Arial,sans-serif;color:#ffffff;">
        <div style="max-width:560px;margin:0 auto;background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:28px;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.7;margin-bottom:14px;">
            Beme Market
          </div>

          <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;color:#ffffff;">
            Order payment received
          </h1>

          <p style="margin:0 0 8px;font-size:15px;color:rgba(255,255,255,0.82);">
            <strong>Order:</strong> ${safeOrderId}
          </p>
          <p style="margin:0 0 8px;font-size:15px;color:rgba(255,255,255,0.82);">
            <strong>Customer:</strong> ${safeBuyerName}
          </p>
          <p style="margin:0 0 8px;font-size:15px;color:rgba(255,255,255,0.82);">
            <strong>Email:</strong> ${escapeHtml(buyerEmail || "N/A")}
          </p>
          <p style="margin:0 0 8px;font-size:15px;color:rgba(255,255,255,0.82);">
            <strong>Total:</strong> ${formatMoney(totalAmount)}
          </p>
        </div>
      </div>
    `;

    await sendMail({
      to: internalEmail,
      subject,
      text,
      html,
    });
  }
}