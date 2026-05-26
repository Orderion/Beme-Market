/* ─────────────────────────────────────────────────────────────
   Beme Market — Branded Email Templates
   Minimal style · White background · Blue #1a6ef5 accent
   Table-based layout for maximum email client compatibility
───────────────────────────────────────────────────────────── */

const B = {
  blue:   "#1a6ef5",
  purple: "#7C3AED",
  green:  "#22C55E",
  red:    "#EF4444",
  orange: "#F59E0B",
  text:   "#111111",
  muted:  "#6B7280",
  light:  "#f5f7fa",
  border: "#e8eaed",
  white:  "#ffffff",
  url:    "https://bememarket.store",
  sup:    "support@bememarket.store",
};

/* ── Base layout (minimal white) ── */
function base(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${title}</title>
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  img{border:0;outline:none;text-decoration:none;}
  body{margin:0;padding:0;background:${B.light};font-family:'Segoe UI',Arial,sans-serif;}
  @media only screen and (max-width:600px){
    .em-wrap{width:100%!important;}
    .em-pad{padding:28px 20px!important;}
    .em-btn a{display:block!important;text-align:center!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${B.light};">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${B.light};">
<tr><td align="center" style="padding:32px 16px;">

  <table class="em-wrap" width="580" cellpadding="0" cellspacing="0" border="0" style="width:580px;max-width:580px;">

    <!-- HEADER -->
    <tr><td style="background:${B.white};border-radius:16px 16px 0 0;border:1px solid ${B.border};
      border-bottom:none;padding:28px 40px 24px;" class="em-pad">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:linear-gradient(135deg,${B.blue},${B.purple});border-radius:10px;
            width:40px;height:40px;text-align:center;vertical-align:middle;">
            <span style="color:#fff;font-size:20px;font-weight:900;line-height:40px;display:block;">B</span>
          </td>
          <td style="padding-left:10px;vertical-align:middle;">
            <span style="font-size:18px;font-weight:900;color:${B.text};letter-spacing:-0.02em;">Beme Market</span>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- BODY -->
    <tr><td class="em-pad" style="background:${B.white};padding:32px 40px;
      border-left:1px solid ${B.border};border-right:1px solid ${B.border};">
      ${body}
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:#f8f9fb;border-radius:0 0 16px 16px;
      border:1px solid ${B.border};border-top:none;
      padding:20px 40px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;color:${B.muted};line-height:1.6;">
        <strong>Beme Market</strong> · Ghana's marketplace · Accra, Ghana
      </p>
      <p style="margin:0 0 10px;">
        <a href="${B.url}" style="color:${B.blue};font-size:11px;text-decoration:none;margin:0 6px;">Visit</a>
        <a href="${B.url}/support" style="color:${B.blue};font-size:11px;text-decoration:none;margin:0 6px;">Support</a>
        <a href="${B.url}/privacy-policy" style="color:${B.blue};font-size:11px;text-decoration:none;margin:0 6px;">Privacy</a>
      </p>
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        © ${new Date().getFullYear()} Beme Market · <a href="mailto:${B.sup}" style="color:${B.muted};text-decoration:none;">${B.sup}</a>
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;
}

/* ── Helpers ── */
const h1 = (t) =>
  `<h1 style="font-size:24px;font-weight:900;color:${B.text};letter-spacing:-0.03em;margin:0 0 12px;line-height:1.2;">${t}</h1>`;

const p = (t, extra = "") =>
  `<p style="font-size:15px;color:${B.muted};line-height:1.7;margin:0 0 16px;${extra}">${t}</p>`;

const btn = (label, url) =>
  `<table class="em-btn" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr><td style="background:${B.blue};border-radius:10px;">
      <a href="${url}" style="display:inline-block;padding:13px 32px;color:#fff;
        font-size:15px;font-weight:800;text-decoration:none;border-radius:10px;
        background:${B.blue};">${label}</a>
    </td></tr>
  </table>`;

const badge = (text, color = B.blue) =>
  `<div style="display:inline-block;padding:4px 14px;border-radius:20px;
    font-size:12px;font-weight:800;color:#fff;background:${color};margin-bottom:16px;">${text}</div>`;

const hr = () =>
  `<hr style="border:none;border-top:1px solid ${B.border};margin:24px 0;"/>`;

const row = (label, value, accent = false) =>
  `<tr>
    <td style="padding:11px 0;border-bottom:1px solid ${B.border};font-size:13px;font-weight:600;color:${B.muted};">${label}</td>
    <td style="padding:11px 0;border-bottom:1px solid ${B.border};font-size:13px;font-weight:800;
      color:${accent ? B.blue : B.text};text-align:right;">${value}</td>
  </tr>`;

const table = (rows) =>
  `<table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="margin:20px 0;border:1px solid ${B.border};border-radius:10px;overflow:hidden;">
    <tbody>${rows.map(([l,v,a])=>row(l,v,a)).join("")}</tbody>
  </table>`;

const check = (text) =>
  `<tr><td style="padding:6px 0;font-size:14px;color:#374151;font-weight:600;">
    <span style="color:${B.green};margin-right:8px;">✓</span>${text}
  </td></tr>`;

const infoBox = (content, color = B.blue) =>
  `<div style="background:${color}0d;border-left:3px solid ${color};border-radius:8px;
    padding:14px 16px;margin:16px 0;">${content}</div>`;

/* ═══════════════════════════════════════════════════════
   TEMPLATES
═══════════════════════════════════════════════════════ */

/* 1. Email Verification */
export function verifyEmailTemplate({ verifyLink, name }) {
  const body = `
    ${badge("Verify your email")}
    ${h1("Confirm your email address")}
    ${p(`Hi${name ? ` ${name}` : ""},<br/>Thanks for joining Beme Market! Please verify your email address to activate your account and start shopping.`)}
    ${btn("Verify Email Address →", verifyLink)}
    ${hr()}
    ${p(`If the button doesn't work, copy this link:<br/><a href="${verifyLink}" style="color:${B.blue};word-break:break-all;font-size:13px;">${verifyLink}</a>`, "font-size:13px;")}
    ${p("Didn't create an account? You can safely ignore this email.", "font-size:13px;color:#9ca3af;")}
  `;
  return base("Verify your Beme Market email", body);
}

/* 2. Welcome */
export function welcomeTemplate({ name, isSeller = false }) {
  const body = `
    ${badge("Welcome! 🎉", B.green)}
    ${h1(`Welcome to Beme Market${name ? `, ${name}` : ""}!`)}
    ${p("Your account is verified and ready. Browse thousands of products from sellers across Ghana — or start your own store today.")}
    ${btn(isSeller ? "Go to Dashboard →" : "Start Shopping →",
      isSeller ? `${B.url}/seller-dashboard` : B.url)}
    <table cellpadding="0" cellspacing="0" border="0">
      ${check("Browse verified sellers")}
      ${check("Secure Paystack checkout")}
      ${check("Chat directly with sellers")}
      ${check("Track orders in real time")}
    </table>
  `;
  return base("Welcome to Beme Market!", body);
}

/* 3. Password Reset */
export function passwordResetTemplate({ resetLink, email }) {
  const body = `
    ${h1("Reset your password")}
    ${p(`We received a request to reset the password for <strong>${email || "your account"}</strong>. This link expires in 1 hour.`)}
    ${btn("Reset Password →", resetLink)}
    ${hr()}
    ${p(`If the button doesn't work:<br/><a href="${resetLink}" style="color:${B.blue};word-break:break-all;font-size:13px;">${resetLink}</a>`, "font-size:13px;")}
    ${p("If you didn't request this, you can safely ignore this email.", "font-size:13px;color:#9ca3af;")}
  `;
  return base("Reset your Beme Market password", body);
}

/* 4. Order Confirmed (Buyer) */
export function orderConfirmationTemplate({ order }) {
  const items   = Array.isArray(order.items) ? order.items : [];
  const orderId = (order.id || "").slice(0, 8).toUpperCase() || "—";
  const rows    = items.map(i =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid ${B.border};font-size:14px;font-weight:600;color:${B.text};">${i.name||"Product"}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${B.border};font-size:13px;color:${B.muted};text-align:center;">${i.qty}×</td>
      <td style="padding:10px 0;border-bottom:1px solid ${B.border};font-size:14px;font-weight:800;color:${B.text};text-align:right;">GHS ${Number(i.price*i.qty).toFixed(2)}</td>
    </tr>`).join("");
  const body = `
    ${badge("Order Confirmed ✓", B.green)}
    ${h1(`Order #${orderId} confirmed`)}
    ${p("Thank you! Your order has been received and the seller has been notified.")}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid ${B.border};border-radius:10px;overflow:hidden;margin:16px 0;">
      <thead><tr style="background:#f8f9fb;">
        <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:${B.muted};text-transform:uppercase;">Item</th>
        <th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:700;color:${B.muted};text-transform:uppercase;">Qty</th>
        <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:${B.muted};text-transform:uppercase;">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${table([
      ["Subtotal",    `GHS ${Number(order.pricing?.subtotal||0).toFixed(2)}`],
      ["Delivery",    `GHS ${Number(order.pricing?.deliveryFee||0).toFixed(2)}`],
      ["Total",       `GHS ${Number(order.pricing?.total||0).toFixed(2)}`, true],
      ["Payment",     "Cash on Delivery (COD)"],
      ["Deliver to",  order.customer?.address||"—"],
    ])}
    ${btn("View Order →", `${B.url}/orders`)}
  `;
  return base(`Order #${orderId} Confirmed — Beme Market`, body);
}

/* 5. New Order Alert (Seller) */
export function newOrderAlertTemplate({ order, sellerName }) {
  const orderId = (order.id||"").slice(0,8).toUpperCase()||"—";
  const items   = (order.items||[]).map(i=>`<li style="font-size:14px;color:#374151;padding:4px 0;">${i.qty}× <strong>${i.name}</strong> — GHS ${Number(i.price*i.qty).toFixed(2)}</li>`).join("");
  const body = `
    ${badge("New Order! 🛍️", B.purple)}
    ${h1(`New order, ${sellerName||""}!`)}
    ${p(`Order <strong>#${orderId}</strong> was just placed on your store.`)}
    <ul style="padding-left:18px;margin:12px 0;">${items}</ul>
    ${table([
      ["Total",         `GHS ${Number(order.pricing?.total||0).toFixed(2)}`, true],
      ["Delivery",      order.delivery?.label||"—"],
      ["Customer",      `${order.customer?.firstName||""} ${order.customer?.lastName||""}`.trim()||"—"],
      ["Phone",         order.customer?.phone||"—"],
      ["Region",        order.customer?.region||"—"],
    ])}
    ${btn("View in Dashboard →", `${B.url}/seller-dashboard?tab=orders`)}
  `;
  return base(`New Order #${orderId} — Beme Market`, body);
}

/* 6. Order Shipped */
export function orderShippedTemplate({ order, trackingInfo }) {
  const orderId = (order.id||"").slice(0,8).toUpperCase()||"—";
  const body = `
    ${badge("On its way! 🚚", B.blue)}
    ${h1(`Your order is coming, ${order.customer?.firstName||""}!`)}
    ${p(`Order <strong>#${orderId}</strong> has been dispatched.`)}
    ${table([
      ["Deliver to",  order.customer?.address||"—"],
      ["Estimated",   trackingInfo?.eta||"1–3 business days"],
      ...(trackingInfo?.trackingNumber ? [["Tracking #", trackingInfo.trackingNumber]] : []),
    ])}
    ${btn("Track Order →", `${B.url}/orders`)}
  `;
  return base(`Order #${orderId} Shipped — Beme Market`, body);
}

/* 7. Order Delivered */
export function orderDeliveredTemplate({ order }) {
  const orderId = (order.id||"").slice(0,8).toUpperCase()||"—";
  const body = `
    ${badge("Delivered! ✓", B.green)}
    ${h1("Your order has arrived!")}
    ${p(`Order <strong>#${orderId}</strong> has been delivered. We hope you love it!`)}
    ${btn("View Order →", `${B.url}/orders`)}
  `;
  return base(`Order #${orderId} Delivered — Beme Market`, body);
}

/* 8. Order Cancelled */
export function orderCancelledTemplate({ order, reason }) {
  const orderId = (order.id||"").slice(0,8).toUpperCase()||"—";
  const body = `
    ${badge("Order Cancelled", B.red)}
    ${h1(`Order #${orderId} cancelled`)}
    ${reason ? infoBox(`<p style="margin:0;font-size:13px;font-weight:600;color:${B.red};">Reason: ${reason}</p>`, B.red) : ""}
    ${p("If you were charged, a refund will be processed within 3–5 business days.")}
    ${btn("Shop Again →", B.url)}
  `;
  return base(`Order #${orderId} Cancelled — Beme Market`, body);
}

/* 9. Subscription Confirmed + Receipt */
export function subscriptionConfirmationTemplate({ planId, billing, amount, reference, expiresAt, sellerName }) {
  const planName = (planId||"starter").charAt(0).toUpperCase()+(planId||"starter").slice(1);
  const billingStr = billing==="yearly" ? "Yearly" : "Monthly";
  const expStr  = expiresAt ? new Date(expiresAt).toLocaleDateString("en-GH",{day:"numeric",month:"long",year:"numeric"}) : "—";
  const FEAT = {
    starter: ["10 product listings","Customer messaging","WhatsApp & social links","1,000 AI auto-replies/day"],
    growth:  ["25 listings","Beme Delivery Support","Analytics Pro","Flash sales","20,000 AI auto-replies/day"],
    pro:     ["500 listings","Beme Delivery (discounted)","Unlimited AI","20 boosts/month","Priority support"],
  };
  const features = FEAT[planId?.toLowerCase()] || FEAT.starter;
  const body = `
    ${badge(`${planName} Plan Active 🎉`)}
    ${h1(`You're on ${planName}, ${sellerName||""}!`)}
    ${p("Your subscription is active. Start using your new features right away.")}
    ${table([
      ["Plan",        `${planName} Plan`],
      ["Billing",     billingStr],
      ["Amount Paid", `GHS ${Number(amount||0).toFixed(2)}`, true],
      ["Reference",   reference||"—"],
      ["Valid Until", expStr],
      ["Payment",     "Paystack — Successful ✓"],
    ])}
    ${infoBox(`<p style="margin:0 0 10px;font-size:11px;font-weight:700;color:${B.blue};text-transform:uppercase;letter-spacing:0.06em;">Unlocked for you</p>
      <table cellpadding="0" cellspacing="0" border="0">${features.map(f=>check(f)).join("")}</table>`, B.blue)}
    ${btn("Go to Dashboard →", `${B.url}/seller-dashboard`)}
    ${hr()}
    ${p(`Keep this as your receipt. Reference: <strong>${reference||"—"}</strong><br/>
      <a href="${B.url}/invoice/${reference}" style="color:${B.blue};font-weight:700;">View & Print Invoice →</a>`, "font-size:13px;")}
  `;
  return base(`${planName} Plan Activated — Beme Market`, body);
}

/* 10. Renewal Reminder */
export function renewalReminderTemplate({ planId, expiresAt, daysLeft, sellerName }) {
  const planName = (planId||"starter").charAt(0).toUpperCase()+(planId||"starter").slice(1);
  const expStr   = expiresAt ? new Date(expiresAt).toLocaleDateString("en-GH",{day:"numeric",month:"long",year:"numeric"}) : "—";
  const body = `
    ${badge(`Renews in ${daysLeft||7} days`, B.orange)}
    ${h1(`Your ${planName} Plan renews soon`)}
    ${p(`Hi ${sellerName||""}, your plan expires on <strong>${expStr}</strong>. Keep your store running at full capacity.`)}
    ${table([["Plan",planName],["Expires",expStr],["Days Left",`${daysLeft||7} days`]])}
    ${btn("Manage Subscription →", `${B.url}/seller-dashboard?tab=subscription`)}
    ${p("Switch to yearly billing and save 17% — upgrade in your dashboard.", "font-size:13px;")}
  `;
  return base(`Your ${planName} Plan renews in ${daysLeft||7} days`, body);
}

/* 11. Plan Expired */
export function planExpiredTemplate({ planId, sellerName }) {
  const planName = (planId||"starter").charAt(0).toUpperCase()+(planId||"starter").slice(1);
  const body = `
    ${badge("Plan Expired", B.red)}
    ${h1(`Your ${planName} Plan has expired`)}
    ${p(`Hi ${sellerName||""}, your plan has expired and your store is now on Basic. Renew to restore all features.`)}
    ${btn("Renew Now →", `${B.url}/seller-dashboard?tab=subscription`)}
    ${p("Your products and orders are safe — only premium features are paused.", "font-size:13px;")}
  `;
  return base(`Your ${planName} Plan has expired — Beme Market`, body);
}

/* 12. Store Application Received */
export function storeApplicationReceivedTemplate({ storeName, sellerName }) {
  const body = `
    ${badge("Application Received ✓", B.green)}
    ${h1(`We got your application, ${sellerName||""}!`)}
    ${p("Our team will review it and get back to you within 24–48 hours.")}
    ${table([["Store Name",storeName||"—"],["Status","Under Review"],["Timeline","24–48 hours"]])}
    ${p(`Questions? <a href="mailto:${B.sup}" style="color:${B.blue};">${B.sup}</a>`, "font-size:13px;")}
  `;
  return base("Store Application Received — Beme Market", body);
}

/* 13. Store Approved */
export function storeApprovedTemplate({ storeName, sellerName, storeUrl }) {
  const body = `
    ${badge("Store Approved! 🎉", B.green)}
    ${h1(`Congratulations, ${sellerName||""}!`)}
    ${p(`Your store <strong>${storeName||""}</strong> is now live on Beme Market. Start adding products!`)}
    ${storeUrl ? infoBox(`<p style="margin:0;font-size:13px;"><strong>Your store:</strong> <a href="${storeUrl}" style="color:${B.blue};">${storeUrl}</a></p>`) : ""}
    ${btn("Open Dashboard →", `${B.url}/seller-dashboard`)}
    <table cellpadding="0" cellspacing="0" border="0">
      ${check("Add your first products")}
      ${check("Share your store link")}
      ${check("Upgrade to unlock more features")}
    </table>
  `;
  return base("Your Store is Live — Beme Market", body);
}

/* 14. Store Rejected */
export function storeRejectedTemplate({ storeName, sellerName, reason }) {
  const body = `
    ${badge("Application Update", "#6B7280")}
    ${h1(`Application update, ${sellerName||""}`)}
    ${p(`Your application for <strong>${storeName||"your store"}</strong> was not approved at this time.`)}
    ${reason ? infoBox(`<p style="margin:0;font-size:13px;font-weight:600;color:${B.red};">Reason: ${reason}</p>`, B.red) : ""}
    ${p("You're welcome to reapply after addressing the issue.")}
    ${btn("Contact Support →", `mailto:${B.sup}`)}
  `;
  return base("Store Application Update — Beme Market", body);
}

/* 15. Payout Processed */
export function payoutProcessedTemplate({ sellerName, amount, reference, method }) {
  const body = `
    ${badge("Payout Sent! 💰", B.green)}
    ${h1(`Your payout is on the way, ${sellerName||""}!`)}
    ${table([
      ["Amount",   `GHS ${Number(amount||0).toFixed(2)}`, true],
      ["Reference", reference||"—"],
      ["Method",    method||"Mobile Money / Bank"],
      ["Status",    "Processed ✓"],
      ["Timeline",  "1–2 business days"],
    ])}
    ${btn("View Withdrawals →", `${B.url}/seller-dashboard?tab=withdrawals`)}
  `;
  return base("Payout Processed — Beme Market", body);
}

/* 16. New Message Alert (Seller) */
export function newMessageAlertTemplate({ sellerName, customerName, messagePreview, chatLink }) {
  const body = `
    ${badge("New Message 💬")}
    ${h1(`Message from ${customerName||"a customer"}`)}
    ${p(`Hi ${sellerName||""}, you have a new message.`)}
    ${infoBox(`<p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${B.muted};">${customerName||"Customer"} says:</p>
      <p style="margin:0;font-size:14px;color:${B.text};font-style:italic;">"${(messagePreview||"").slice(0,200)}${(messagePreview||"").length>200?"…":""}"</p>`)}
    ${btn("Reply Now →", chatLink||`${B.url}/seller-dashboard?tab=messages`)}
    ${p("Responding within 1 hour boosts your store rating.", "font-size:13px;color:"+B.blue+";font-weight:700;")}
  `;
  return base(`New message from ${customerName||"a customer"} — Beme Market`, body);
}

/* 17. Admin — New Order */
export function adminNewOrderTemplate({ order }) {
  const orderId = (order.id||"").slice(0,8).toUpperCase()||"—";
  const body = `
    ${badge("New Order", B.purple)}
    ${h1(`Order #${orderId} placed`)}
    ${table([
      ["Total",    `GHS ${Number(order.pricing?.total||0).toFixed(2)}`, true],
      ["Customer", `${order.customer?.firstName||""} ${order.customer?.lastName||""}`.trim()||"—"],
      ["Region",   order.customer?.region||"—"],
      ["Items",    `${(order.items||[]).length} item(s)`],
    ])}
    <a href="${B.url}/admin-orders" style="color:${B.blue};font-weight:700;font-size:13px;">View in Admin →</a>
  `;
  return base(`New Order #${orderId} — Admin Alert`, body);
}

/* 18. Admin — New Application */
export function adminNewApplicationTemplate({ storeName, sellerName, sellerEmail }) {
  const body = `
    ${badge("New Application", B.purple)}
    ${h1("New store application")}
    ${table([["Store",storeName||"—"],["Seller",sellerName||"—"],["Email",sellerEmail||"—"],["Status","Pending"]])}
    <a href="${B.url}/shop-applications" style="color:${B.blue};font-weight:700;font-size:13px;">Review →</a>
  `;
  return base("New Store Application — Admin Alert", body);
}

/* 19. Admin — Payout Request */
export function adminNewPayoutTemplate({ sellerName, sellerEmail, amount }) {
  const body = `
    ${badge("Payout Request", B.purple)}
    ${h1("New payout request")}
    ${table([
      ["Seller", sellerName||"—"],
      ["Email",  sellerEmail||"—"],
      ["Amount", `GHS ${Number(amount||0).toFixed(2)}`, true],
    ])}
    <a href="${B.url}/payout-requests" style="color:${B.blue};font-weight:700;font-size:13px;">Review →</a>
  `;
  return base("New Payout Request — Admin Alert", body);
}
