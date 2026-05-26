/* ─────────────────────────────────────────────────────────────
   Beme Market — Email Service
   Transport: Brevo HTTP API (works on Render free tier)
   SMTP is blocked on Render free — use API instead
───────────────────────────────────────────────────────────── */
import * as T from "../templates/emailTemplates.js";

const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_PASS || "";
const FROM_NAME     = process.env.EMAIL_FROM_NAME    || "Beme Market";
const FROM_ADDRESS  = process.env.EMAIL_FROM_ADDRESS || "noreply@bememarket.store";
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL || "";

/* ── Core send via Brevo HTTP API — never throws ── */
async function sendMail({ to, subject, html }) {
  if (!to || !BREVO_API_KEY) {
    console.error("[email] Missing recipient or BREVO_API_KEY");
    return;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept":       "application/json",
        "api-key":      BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender:  { name: FROM_NAME, email: FROM_ADDRESS },
        to:      [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[email] ✗ "${subject}" → ${to}:`, data?.message || res.status);
      return;
    }
    console.log(`[email] ✓ "${subject}" → ${to} (messageId: ${data.messageId})`);
    return data;
  } catch (err) {
    console.error(`[email] ✗ "${subject}" → ${to}:`, err.message);
  }
}

async function sendToAdmin(subject, html) {
  if (!ADMIN_EMAIL) return;
  return sendMail({ to: ADMIN_EMAIL, subject, html });
}

/* ═══════════════════════════════════════════════════════════
   AUTH EMAILS
═══════════════════════════════════════════════════════════ */

export async function sendVerificationEmail({ email, verifyLink, name }) {
  return sendMail({
    to:      email,
    subject: "Verify your Beme Market email address",
    html:    T.verifyEmailTemplate({ verifyLink, name }),
  });
}

export async function sendPasswordResetEmail({ email, resetLink }) {
  return sendMail({
    to:      email,
    subject: "Reset your Beme Market password",
    html:    T.passwordResetTemplate({ resetLink, email }),
  });
}

export async function sendWelcomeEmail({ email, name, isSeller = false }) {
  return sendMail({
    to:      email,
    subject: "Welcome to Beme Market! 🎉",
    html:    T.welcomeTemplate({ name, isSeller }),
  });
}

/* ═══════════════════════════════════════════════════════════
   ORDER EMAILS
═══════════════════════════════════════════════════════════ */

export async function sendOrderConfirmation({ order, buyerEmail }) {
  const email = buyerEmail || order?.customer?.email;
  if (!email) return;
  return sendMail({
    to:      email,
    subject: `Order Confirmed #${(order.id||"").slice(0,8).toUpperCase()} — Beme Market`,
    html:    T.orderConfirmationTemplate({ order }),
  });
}

export async function sendNewOrderAlert({ order, sellerEmail, sellerName }) {
  if (!sellerEmail) return;
  return sendMail({
    to:      sellerEmail,
    subject: `New Order #${(order.id||"").slice(0,8).toUpperCase()} — Beme Market`,
    html:    T.newOrderAlertTemplate({ order, sellerName }),
  });
}

export async function sendOrderShipped({ order, buyerEmail, trackingInfo }) {
  const email = buyerEmail || order?.customer?.email;
  if (!email) return;
  return sendMail({
    to:      email,
    subject: "Your order is on its way! — Beme Market",
    html:    T.orderShippedTemplate({ order, trackingInfo }),
  });
}

export async function sendOrderDelivered({ order, buyerEmail }) {
  const email = buyerEmail || order?.customer?.email;
  if (!email) return;
  return sendMail({
    to:      email,
    subject: "Order Delivered ✓ — Beme Market",
    html:    T.orderDeliveredTemplate({ order }),
  });
}

export async function sendOrderCancelled({ order, buyerEmail, reason }) {
  const email = buyerEmail || order?.customer?.email;
  if (!email) return;
  return sendMail({
    to:      email,
    subject: "Order Cancelled — Beme Market",
    html:    T.orderCancelledTemplate({ order, reason }),
  });
}

export async function sendOrderPaidEmails(payload = {}) {
  const {
    customerEmail, email: payloadEmail, customerName, name,
    orderId, reference, total, amount, items = [],
    adminEmail, shopEmail,
  } = payload || {};
  const buyerEmail = String(customerEmail || payloadEmail || "").trim();
  const totalAmt   = total ?? amount ?? 0;
  const order = {
    id: orderId || reference || "",
    items: items.map(i=>({name:i?.name||"Item",qty:Number(i?.qty||1),price:Number(i?.price||0)})),
    pricing: { subtotal:totalAmt, deliveryFee:0, total:totalAmt },
    customer: { email:buyerEmail, firstName:String(customerName||name||"Customer"), address:"—", region:"—" },
    delivery: { label:"—" },
  };
  if (buyerEmail) await sendOrderConfirmation({ order, buyerEmail });
  const internalEmail = String(adminEmail || shopEmail || "").trim();
  if (internalEmail) await sendMail({ to:internalEmail, subject:`Order paid: ${orderId||reference}`, html:T.adminNewOrderTemplate({ order }) });
}

/* ═══════════════════════════════════════════════════════════
   SUBSCRIPTION EMAILS
═══════════════════════════════════════════════════════════ */

export async function sendSubscriptionConfirmation({ email, planId, billing, amount, reference, expiresAt, sellerName }) {
  if (!email) return;
  const planName = (planId||"starter").charAt(0).toUpperCase()+(planId||"starter").slice(1);
  await sendMail({
    to:      email,
    subject: `Your ${planName} Plan is Active 🎉 — Beme Market`,
    html:    T.subscriptionConfirmationTemplate({ planId, billing, amount, reference, expiresAt, sellerName }),
  });
  await sendToAdmin(`New subscription: ${planName} — GHS ${Number(amount||0).toFixed(2)}`,
    T.subscriptionConfirmationTemplate({ planId, billing, amount, reference, expiresAt, sellerName }));
}

export async function sendRenewalReminder({ email, planId, expiresAt, daysLeft, sellerName }) {
  if (!email) return;
  const planName = (planId||"starter").charAt(0).toUpperCase()+(planId||"starter").slice(1);
  return sendMail({ to:email, subject:`Your ${planName} Plan renews in ${daysLeft||7} days — Beme Market`,
    html: T.renewalReminderTemplate({ planId, expiresAt, daysLeft, sellerName }) });
}

export async function sendPlanExpired({ email, planId, sellerName }) {
  if (!email) return;
  const planName = (planId||"starter").charAt(0).toUpperCase()+(planId||"starter").slice(1);
  return sendMail({ to:email, subject:`Your ${planName} Plan has expired — Beme Market`,
    html: T.planExpiredTemplate({ planId, sellerName }) });
}

/* ═══════════════════════════════════════════════════════════
   STORE EMAILS
═══════════════════════════════════════════════════════════ */

export async function sendStoreApplicationReceived({ email, storeName, sellerName }) {
  if (!email) return;
  await sendMail({ to:email, subject:"We received your store application — Beme Market",
    html: T.storeApplicationReceivedTemplate({ storeName, sellerName }) });
  await sendToAdmin(`New store application: ${storeName}`,
    T.adminNewApplicationTemplate({ storeName, sellerName, sellerEmail:email }));
}

export async function sendStoreApproved({ email, storeName, sellerName, storeUrl }) {
  if (!email) return;
  return sendMail({ to:email, subject:"Your store is approved — Beme Market 🎉",
    html: T.storeApprovedTemplate({ storeName, sellerName, storeUrl }) });
}

export async function sendStoreRejected({ email, storeName, sellerName, reason }) {
  if (!email) return;
  return sendMail({ to:email, subject:"Store application update — Beme Market",
    html: T.storeRejectedTemplate({ storeName, sellerName, reason }) });
}

/* ═══════════════════════════════════════════════════════════
   PAYOUT EMAILS
═══════════════════════════════════════════════════════════ */

export async function sendPayoutProcessed({ email, sellerName, amount, reference, method }) {
  if (!email) return;
  return sendMail({ to:email, subject:`Payout of GHS ${Number(amount||0).toFixed(2)} sent — Beme Market`,
    html: T.payoutProcessedTemplate({ sellerName, amount, reference, method }) });
}

export async function sendAdminPayoutAlert({ sellerName, sellerEmail, amount }) {
  return sendToAdmin(`New payout request: GHS ${Number(amount||0).toFixed(2)} from ${sellerName}`,
    T.adminNewPayoutTemplate({ sellerName, sellerEmail, amount }));
}

/* ═══════════════════════════════════════════════════════════
   CHAT + ADMIN
═══════════════════════════════════════════════════════════ */

export async function sendNewMessageAlert({ sellerEmail, sellerName, customerName, messagePreview, chatLink }) {
  if (!sellerEmail) return;
  return sendMail({ to:sellerEmail, subject:`New message from ${customerName||"a customer"} — Beme Market`,
    html: T.newMessageAlertTemplate({ sellerName, customerName, messagePreview, chatLink }) });
}

export async function sendAdminOrderAlert({ order }) {
  return sendToAdmin(
    `New order #${(order.id||"").slice(0,8).toUpperCase()} — GHS ${Number(order.pricing?.total||0).toFixed(2)}`,
    T.adminNewOrderTemplate({ order })
  );
}
