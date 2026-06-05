/* ================================================================
   FILE: functions/index.js
   — All existing logic unchanged —
   — Marketing Cloud Functions added at the bottom —
================================================================ */
const { setGlobalOptions }    = require("firebase-functions/v2");
const { onCall, HttpsError }  = require("firebase-functions/v2/https");
const { onDocumentWritten }   = require("firebase-functions/v2/firestore");
const { onSchedule }          = require("firebase-functions/v2/scheduler");
const { auth }                = require("firebase-functions/v1");
const admin                   = require("firebase-admin");
const nodemailer              = require("nodemailer");

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });

// ─────────────────────────────────────────────────────────────────────────────
// TRANSPORTER — unchanged
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
// EMAIL TEMPLATE — unchanged
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

          <tr>
            <td style="background:#111111;padding:14px 24px;text-align:center;">
              <span style="color:#FCFAF2;font-size:10px;font-weight:900;
                           letter-spacing:0.12em;text-transform:uppercase;">
                Welcome to Beme Market &mdash; Ghana&rsquo;s favourite shop &#127468;&#127469;
              </span>
            </td>
          </tr>

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
// SHARED SEND HELPER — unchanged
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
// TRIGGER — fires on every new user signup — unchanged
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
// CALLABLE — resend verification email on demand — unchanged
// ─────────────────────────────────────────────────────────────────────────────
exports.resendVerificationEmail = onCall(async (request) => {
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
    throw new HttpsError("already-exists", "This email address is already verified.");
  }

  if (!userRecord.email) {
    throw new HttpsError("failed-precondition", "No email address is associated with this account.");
  }

  try {
    await dispatchVerificationEmail(userRecord.email, userRecord.displayName);
    console.log(`[resend] Sent to ${userRecord.email}`);
    return { success: true };
  } catch (err) {
    console.error(`[resend] Failed for ${userRecord.email}:`, err);
    throw new HttpsError("internal", "Failed to send the verification email. Please try again.");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TOTP / MFA — unchanged
// ─────────────────────────────────────────────────────────────────────────────
const {
  setupTOTP,
  enableTOTP,
  verifyTOTP,
  disableTOTP,
} = require("./src/auth/twoFactor");

exports.setupTOTP   = setupTOTP;
exports.enableTOTP  = enableTOTP;
exports.verifyTOTP  = verifyTOTP;
exports.disableTOTP = disableTOTP;

// ─────────────────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
//
//  MARKETING CLOUD FUNCTIONS — NEW
//  All functions below are additive. Nothing above is touched.
//
// ═════════════════════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────────

const db = admin.firestore();

// ─────────────────────────────────────────────────────────────────────────────
// onOrderComplete_marketing
// ─────────────────────────────────────────────────────────────────────────────
// Triggered whenever an order document is created or updated.
// Does two things:
//   1. Awards loyalty points to the customer for the selling store.
//   2. Activates a pending referral if this is the referred seller's first sale.
//
// Fires on: orders/{orderId}
// ─────────────────────────────────────────────────────────────────────────────
exports.onOrderComplete_marketing = onDocumentWritten(
  "orders/{orderId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();

    // Guard: document must exist after write
    if (!after) return null;

    // Only run when the order reaches a completed state for the first time.
    // "delivered" covers physical delivery; "paid" covers digital/instant orders.
    const isNowComplete =
      after.status === "delivered" ||
      after.paymentStatus === "paid";

    const wasAlreadyComplete =
      before?.status === "delivered" ||
      before?.paymentStatus === "paid";

    // Skip if already completed before this write (prevents double awards)
    if (!isNowComplete || wasAlreadyComplete) return null;

    const storeId    = after.primaryShop || after.shops?.[0] || null;
    const customerId = after.userId || null;
    const orderTotal = Number(after.pricing?.total || 0);

    // ── 1. AWARD LOYALTY POINTS ──────────────────────────────────────────
    if (storeId && customerId) {
      try {
        const configSnap = await db.doc(`loyaltyConfig/${storeId}`).get();

        if (configSnap.exists && configSnap.data().enabled === true) {
          const { earnRate, redeemRate } = configSnap.data();
          const pointsEarned = Math.floor(orderTotal * Number(earnRate || 1));

          if (pointsEarned > 0) {
            // Composite key: storeId_customerId — one doc per customer per store
            const pointsDocId = `${storeId}_${customerId}`;

            await db.doc(`loyaltyPoints/${pointsDocId}`).set(
              {
                storeId,
                customerId,
                pointsBalance: admin.firestore.FieldValue.increment(pointsEarned),
                totalEarned:   admin.firestore.FieldValue.increment(pointsEarned),
                // totalRedeemed stays unchanged on earn — only updated at checkout
                totalRedeemed: admin.firestore.FieldValue.increment(0),
                earnRate:      Number(earnRate),
                redeemRate:    Number(redeemRate),
                updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true } // merge so we don't wipe existing balance on first write
            );

            console.log(
              `[loyalty] Awarded ${pointsEarned} pts to customer ${customerId} ` +
              `for store ${storeId} (order total GHS ${orderTotal})`
            );
          }
        }
      } catch (err) {
        // Non-fatal — log and continue so referral logic still runs
        console.error(`[loyalty] error for order ${event.params.orderId}:`, err);
      }
    }

    // ── 2. ACTIVATE REFERRAL ─────────────────────────────────────────────
    // A referral activates when the REFERRED SELLER completes their first sale,
    // not when a customer buys. We check if the selling shop's owner was referred.
    if (storeId) {
      try {
        const shopSnap = await db.doc(`shops/${storeId}`).get();
        if (!shopSnap.exists) return null;

        const ownerUid = shopSnap.data()?.ownerId;
        if (!ownerUid) return null;

        // Look for a pending referral where this seller is the referred party
        const refQuery = await db.collection("referrals")
          .where("referredUid", "==", ownerUid)
          .where("status", "==", "pending")
          .limit(1)
          .get();

        if (!refQuery.empty) {
          const refDoc  = refQuery.docs[0];
          const refData = refDoc.data();

          // GHS 10 wallet credit per activated referral
          // Beme earns: 10% of referred seller's first month subscription
          // before paying out — handled manually or via subscription webhook.
          const rewardAmount = 10;

          // Mark referral as activated
          await refDoc.ref.update({
            status:       "activated",
            rewardAmount,
            activatedAt:  admin.firestore.FieldValue.serverTimestamp(),
            referredShopName: shopSnap.data()?.shopName || "",
          });

          // Credit the referring seller's wallet on their shop doc
          await db.doc(`shops/${refData.referrerId}`).update({
            walletBalance: admin.firestore.FieldValue.increment(rewardAmount),
          });

          console.log(
            `[referral] Activated referral ${refDoc.id}. ` +
            `Credited GHS ${rewardAmount} to shop ${refData.referrerId}`
          );
        }
      } catch (err) {
        console.error(`[referral] error for order ${event.params.orderId}:`, err);
      }
    }

    return null;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// expireFlashSales
// ─────────────────────────────────────────────────────────────────────────────
// Scheduled every 10 minutes.
// Finds all flash sales where endAt has passed and status is still "active",
// then batch-updates them to status: "ended".
//
// This is the server-side safety net. The frontend already filters by endAt
// for display purposes, but this keeps Firestore clean so marketplace queries
// using where("status","==","active") stay accurate.
// ─────────────────────────────────────────────────────────────────────────────
exports.expireFlashSales = onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "Africa/Accra",
  },
  async () => {
    const now = admin.firestore.Timestamp.now();

    let snap;
    try {
      snap = await db.collection("flashSales")
        .where("status", "==", "active")
        .where("endAt", "<=", now)
        .get();
    } catch (err) {
      console.error("[expireFlashSales] query error:", err);
      return null;
    }

    if (snap.empty) {
      console.log("[expireFlashSales] No sales to expire.");
      return null;
    }

    // Firestore batch limit is 500 writes — split if needed
    const BATCH_SIZE = 400;
    const docs = snap.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const chunk = docs.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      chunk.forEach((doc) => {
        batch.update(doc.ref, {
          status:  "ended",
          endedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    console.log(`[expireFlashSales] Expired ${docs.length} sale(s).`);
    return null;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Product Boost webhook
// ─────────────────────────────────────────────────────────────────────────────
// Product Boosts are paid via Paystack. The webhook already lives on your
// Express server at beme-market-1.onrender.com.
//
// In your existing webhook handler (after HMAC-SHA512 verification), add:
//
//   if (event.data.metadata?.type === "boost") {
//     const {
//       storeId, sellerId, productId, productName, durationDays, amountGHS,
//     } = event.data.metadata;
//
//     const expiresAt = new Date();
//     expiresAt.setDate(expiresAt.getDate() + Number(durationDays));
//
//     await admin.firestore().collection("boosts").add({
//       storeId,
//       sellerId,
//       productId,
//       productName:  productName || "",
//       durationDays: Number(durationDays),
//       amountPaid:   Number(amountGHS),
//       paystackRef:  event.data.reference,
//       boostedAt:    admin.firestore.FieldValue.serverTimestamp(),
//       expiresAt,
//       status:       "active",
//     });
//   }
//
// The boosts collection already has rules (allow read: if true; create by seller).
// Admin SDK bypasses rules, so this write works without any rule change.
// ─────────────────────────────────────────────────────────────────────────────