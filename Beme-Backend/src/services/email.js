// src/services/email.js
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  ADMIN_EMAIL,
} = process.env;

function canSendEmail() {
  return SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && EMAIL_FROM;
}

export function getEmailEnabled() {
  return !!canSendEmail();
}

export async function sendOrderPaidEmails({ orderId, reference, customer, amounts }) {
  if (!canSendEmail()) return;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const toCustomer = customer?.email;
  const adminEmail = ADMIN_EMAIL;

  const subjectCustomer = `Payment confirmed — Order ${orderId}`;
  const subjectAdmin = `New paid order — ${orderId}`;

  const summaryLines = [
    `Order: ${orderId}`,
    `Reference: ${reference}`,
    `Total: GHS ${Number(amounts?.total || 0).toFixed(2)}`,
    `Delivery: GHS ${Number(amounts?.deliveryFee || 0).toFixed(2)}`,
    `Name: ${customer?.firstName || ""} ${customer?.lastName || ""}`.trim(),
    `Phone: ${customer?.phone || ""} (${customer?.network || ""})`.trim(),
    `Address: ${customer?.address || ""}, ${customer?.area || ""}, ${customer?.city || ""}, ${customer?.region || ""}`.trim(),
  ].filter(Boolean);

  const text = summaryLines.join("\n");

  // Customer email
  if (toCustomer) {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: toCustomer,
      subject: subjectCustomer,
      text: `Thanks for your order!\n\n${text}\n\nBeme Market`,
    });
  }

  // Admin email
  if (adminEmail) {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: adminEmail,
      subject: subjectAdmin,
      text: `A customer has paid successfully.\n\n${text}\n\nBeme Market Admin`,
    });
  }
}