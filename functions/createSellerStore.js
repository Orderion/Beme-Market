// functions/createSellerStore.js
// Callable Cloud Function — called from SubscriptionSuccess.jsx
// Verifies Paystack payment, creates shop doc, sets user role to "seller"
const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const axios     = require("axios");

const PLAN_PRICES = { basic: 0, standard: 99, pro: 249 };
const PLAN_LIMITS = {
  basic:    { maxProducts: 25,   hasChat: false },
  standard: { maxProducts: 500,  hasChat: true  },
  pro:      { maxProducts: 99999, hasChat: true  },
};

const db = admin.firestore;

exports.createSellerStore = functions.https.onCall(async (data, context) => {
  // Auth check
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");

  const uid = context.auth.uid;
  const { reference, planId: directPlanId, shopName, description, category, whatsapp, instagram, city, region } = data;

  let planId = directPlanId || "basic";
  let paystackReference = null;

  // If reference provided — verify with Paystack (paid plan)
  if (reference) {
    try {
      const verifyRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY || functions.config().paystack.secret_key}` },
      });
      const txn = verifyRes.data?.data;

      if (!txn || txn.status !== "success") {
        throw new functions.https.HttpsError("failed-precondition", "Payment was not successful.");
      }

      // Extract plan from transaction metadata
      planId = txn.metadata?.planId || "standard";
      paystackReference = reference;

      const expectedAmountKobo = PLAN_PRICES[planId] * 100;
      if (txn.amount < expectedAmountKobo) {
        throw new functions.https.HttpsError("failed-precondition", `Payment amount (GHS ${txn.amount / 100}) does not match plan price (GHS ${PLAN_PRICES[planId]}).`);
      }
    } catch (err) {
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", `Paystack verification failed: ${err.message}`);
    }
  }

  // Check if user already has a store
  const userSnap = await admin.firestore().collection("users").doc(uid).get();
  const userData = userSnap.data() || {};
  if (userData.storeId) {
    return { success: true, shopId: userData.storeId, shopName: userData.shopName, alreadyExists: true };
  }

  // Get application draft for store details
  const draftSnap = await admin.firestore().collection("storeApplications").doc(uid).get();
  const draft = draftSnap.exists ? draftSnap.data() : {};

  const finalShopName   = draft.step2?.shopName   || shopName   || `${userData.displayName || "My"}'s Store`;
  const finalDesc       = draft.step2?.description || description || "";
  const finalCategory   = draft.step1?.businessType || category  || "other";
  const finalWhatsapp   = draft.step3?.whatsapp    || whatsapp   || "";
  const finalInstagram  = draft.step3?.instagram   || instagram  || "";
  const finalCity       = draft.step4?.city        || city       || "";
  const finalRegion     = draft.step4?.region      || region     || "";

  const shopId = admin.firestore().collection("shops").doc().id;
  const now    = admin.firestore.FieldValue.serverTimestamp();

  const batch  = admin.firestore().batch();

  // 1. Create shop document
  batch.set(admin.firestore().collection("shops").doc(shopId), {
    shopId,
    ownerId:     uid,
    ownerEmail:  context.auth.token.email || "",
    shopName:    finalShopName,
    description: finalDesc,
    category:    finalCategory,
    whatsapp:    finalWhatsapp,
    instagram:   finalInstagram,
    city:        finalCity,
    region:      finalRegion,
    planId,
    status:      "active",
    verified:    false,
    verifiedBadge: "none",
    withdrawalsFrozen: false,
    logoUrl:     null,
    bannerUrl:   null,
    primaryColor: "#046EF2",
    earnings:    0,
    totalOrders: 0,
    totalProducts: 0,
    createdAt:   now,
    updatedAt:   now,
  });

  // 2. Update user document → role: "seller"
  batch.update(admin.firestore().collection("users").doc(uid), {
    role:               "seller",
    sellerStatus:       "active",
    storeId:            shopId,
    shopName:           finalShopName,
    subscriptionPlan:   planId,
    subscriptionStatus: planId === "basic" ? "active" : "active",
    updatedAt:          now,
  });

  // 3. Create subscription document
  const periodStart = new Date();
  const periodEnd   = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  batch.set(admin.firestore().collection("subscriptions").doc(uid), {
    uid,
    shopId,
    planId,
    status:             "active",
    currentPeriodStart: admin.firestore.Timestamp.fromDate(periodStart),
    currentPeriodEnd:   admin.firestore.Timestamp.fromDate(periodEnd),
    paystackReference,
    amount:             PLAN_PRICES[planId],
    currency:           "GHS",
    renewalCount:       0,
    autoRenew:          false,
    createdAt:          now,
    updatedAt:          now,
  });

  // 4. Log transaction (if paid)
  if (paystackReference && PLAN_PRICES[planId] > 0) {
    const txId = admin.firestore().collection("transactions").doc().id;
    batch.set(admin.firestore().collection("transactions").doc(txId), {
      uid, shopId,
      type:              "subscription",
      planId,
      amount:            PLAN_PRICES[planId],
      currency:          "GHS",
      paystackReference,
      status:            "success",
      createdAt:         now,
    });
  }

  // 5. Initialize analytics doc
  batch.set(admin.firestore().collection("sellerAnalytics").doc(shopId), {
    shopId, totalRevenue: 0, totalOrders: 0, totalVisitors: 0, createdAt: now,
  });

  // 6. Mark application as complete
  if (draftSnap.exists) {
    batch.update(admin.firestore().collection("storeApplications").doc(uid), {
      status: "complete", completedAt: now, planId, shopId,
    });
  }

  // 7. Create welcome notification
  const notifId = admin.firestore().collection("notifications").doc().id;
  batch.set(admin.firestore().collection("notifications").doc(notifId), {
    uid, type: "welcome_seller", title: "Welcome to Beme Market Sellers! 🎉",
    body: `Your store "${finalShopName}" is now live. Start adding products!`,
    read: false, createdAt: now,
  });

  await batch.commit();

  // Send welcome email (non-blocking)
  admin.firestore().collection("mail").add({
    to: context.auth.token.email,
    message: {
      subject: `🎉 ${finalShopName} is now live on Beme Market!`,
      html: `<h2>Your store is ready!</h2><p>Welcome to Beme Market Sellers. Your store <strong>${finalShopName}</strong> is live and ready to receive orders. <a href="https://beme.market/seller-dashboard">Go to your dashboard</a></p>`,
    },
  }).catch(console.error);

  return { success: true, shopId, shopName: finalShopName, planId };
});

