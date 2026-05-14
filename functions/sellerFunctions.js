// functions/sendSellerNotifications.js
const functions = require("firebase-functions");
const admin     = require("firebase-admin");

/**
 * Sends renewal reminder notifications to sellers whose subscriptions
 * expire in 5 days.
 */
exports.sendSellerNotifications = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const db = admin.firestore();
    const now = Date.now();
    const fiveDays = 5 * 24 * 60 * 60 * 1000;

    const subs = await db.collection("subscriptions")
      .where("status", "==", "active")
      .where("planId", "!=", "basic")
      .get();

    const batch = db.batch();
    let notifCount = 0;

    for (const snap of subs.docs) {
      const sub  = snap.data();
      const end  = sub.currentPeriodEnd?.toMillis?.() || 0;
      const diff = end - now;

      if (diff > 0 && diff <= fiveDays) {
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        const notifRef = db.collection("notifications").doc();
        batch.set(notifRef, {
          uid:   sub.uid,
          type:  "renewal_reminder",
          title: `⏰ Your subscription renews in ${days} day${days !== 1 ? "s" : ""}`,
          body:  `Your ${sub.planId} plan will expire on ${new Date(end).toLocaleDateString("en-GH")}. Renew from your seller dashboard.`,
          read:  false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        notifCount++;
      }
    }

    await batch.commit();
    console.log(`[sendSellerNotifications] Sent ${notifCount} renewal reminders.`);
    return null;
  });


// functions/verifySellerPlan.js
/**
 * Callable: verifies a seller has permission to perform a plan-gated action.
 * Returns { allowed: boolean, limit: number, current: number, planId: string }
 */
exports.verifySellerPlan = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");

  const uid = context.auth.uid;
  const { action } = data; // "add_product" | "use_chat" | "use_boost" | "use_ai"

  const db    = admin.firestore();
  const [userSnap, subSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("subscriptions").doc(uid).get(),
  ]);

  const userData = userSnap.data() || {};
  const sub      = subSnap.data() || {};
  const planId   = userData.subscriptionPlan || "basic";

  const LIMITS = {
    basic:    { maxProducts: 25,   hasChat: false, hasBoosts: false, hasAI: false },
    standard: { maxProducts: 500,  hasChat: true,  hasBoosts: true,  hasAI: false },
    pro:      { maxProducts: 99999, hasChat: true,  hasBoosts: true,  hasAI: true  },
  };

  const limits = LIMITS[planId] || LIMITS.basic;

  if (action === "add_product") {
    const products = await db.collection("Products")
      .where("sellerId", "==", uid).get();
    const current = products.size;
    return { allowed: current < limits.maxProducts, current, limit: limits.maxProducts, planId };
  }
  if (action === "use_chat") return { allowed: limits.hasChat, planId };
  if (action === "use_boost") return { allowed: limits.hasBoosts, planId };
  if (action === "use_ai")   return { allowed: limits.hasAI, planId };

  return { allowed: true, planId };
});


// functions/processWithdrawal.js
/**
 * Firestore trigger: when a withdrawalRequest is approved, send a notification.
 */
exports.processWithdrawal = functions.firestore
  .document("withdrawalRequests/{requestId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();

    // Only act when status changes to "approved"
    if (before.status !== "pending" || after.status !== "approved") return null;

    const db = admin.firestore();
    await db.collection("notifications").add({
      uid:   after.sellerId,
      type:  "withdrawal_approved",
      title: "💰 Withdrawal Approved!",
      body:  `Your withdrawal of GHS ${Number(after.amount || 0).toFixed(2)} has been approved and is being processed.`,
      read:  false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return null;
  });


// functions/reviewSellerStore.js
/**
 * Callable: admin reviews a shop and sends a notification to the seller.
 */
exports.reviewSellerStore = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");

  const admin_uid = context.auth.uid;
  const adminSnap = await admin.firestore().collection("users").doc(admin_uid).get();
  if (adminSnap.data()?.role !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin access required.");
  }

  const { shopId, action, reason } = data;
  if (!shopId || !action) throw new functions.https.HttpsError("invalid-argument", "shopId and action are required.");

  const db = admin.firestore();
  const shopSnap = await db.collection("shops").doc(shopId).get();
  if (!shopSnap.exists) throw new functions.https.HttpsError("not-found", "Shop not found.");

  const shop    = shopSnap.data();
  const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  if (action === "approve")  updates.status = "active";
  if (action === "suspend")  { updates.status = "suspended"; updates.suspensionReason = reason || null; }
  if (action === "verify")   { updates.verified = true; updates.verifiedBadge = "verified"; }
  if (action === "unverify") { updates.verified = false; updates.verifiedBadge = "none"; }

  await shopSnap.ref.update(updates);

  // Notify seller
  await db.collection("notifications").add({
    uid:  shop.ownerId,
    type: `store_${action}`,
    title: action === "approve" ? "✅ Your store has been approved!" : action === "suspend" ? "🚫 Store suspended" : action === "verify" ? "✅ Store verified!" : "Store status updated",
    body: reason || `Your store has been ${action}ed by admin.`,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Log
  await db.collection("adminLogs").add({
    adminId: admin_uid, action, target: "shop", targetId: shopId,
    reason: reason || null, timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});


// functions/generateAnalytics.js
/**
 * Scheduled: Generates daily analytics snapshots for each active shop.
 * Runs at midnight Ghana time (UTC+0).
 */
exports.generateAnalytics = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone("Africa/Accra")
  .onRun(async () => {
    const db = admin.firestore();

    // Get all active shops
    const shops = await db.collection("shops")
      .where("status", "==", "active").get();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().slice(0, 10);

    const batch = db.batch();

    for (const shopSnap of shops.docs) {
      const shopId = shopSnap.id;

      // Count orders from yesterday
      const start = new Date(dateKey);
      const end   = new Date(dateKey);
      end.setDate(end.getDate() + 1);

      const orders = await db.collection("orders")
        .where("shops", "array-contains", shopId)
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
        .where("createdAt", "<", admin.firestore.Timestamp.fromDate(end))
        .get();

      let revenue = 0;
      orders.docs.forEach((o) => {
        const orderData = o.data();
        // Sum only items from this shop
        const items = (orderData.items || []).filter((item) => item.shopId === shopId);
        revenue += items.reduce((s, item) => s + (item.price || 0) * (item.quantity || 1), 0);
      });

      const dayRef = db.collection("sellerAnalytics").doc(shopId)
        .collection("daily").doc(dateKey);

      batch.set(dayRef, {
        date: dateKey,
        shopId,
        revenue,
        orders:  orders.size,
        visitors: 0, // populated client-side via recordProductView()
        productViews: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    await batch.commit();
    console.log(`[generateAnalytics] Processed ${shops.size} shops for ${dateKey}.`);
    return null;
  });

