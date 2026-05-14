// functions/handleSubscriptionRenewal.js
// Scheduled Cloud Function — runs daily, checks subscription expiry
const functions = require("firebase-functions");
const admin     = require("firebase-admin");

const GRACE_DAYS = 7;

exports.handleSubscriptionRenewal = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const now   = admin.firestore.Timestamp.now();
    const db    = admin.firestore();
    const batch = db.batch();

    // Find subscriptions that have expired (not basic/free)
    const subs = await db.collection("subscriptions")
      .where("status", "in", ["active", "grace"])
      .where("planId", "!=", "basic")
      .get();

    const promises = [];

    subs.docs.forEach((snap) => {
      const sub = snap.data();
      const end = sub.currentPeriodEnd?.toMillis?.() || 0;
      const daysPast = Math.floor((Date.now() - end) / (1000 * 60 * 60 * 24));

      if (daysPast <= 0) return; // Not expired yet

      if (sub.status === "active" && daysPast > 0) {
        // Move to grace period
        batch.update(snap.ref, { status: "grace", updatedAt: now });
        batch.update(db.collection("users").doc(sub.uid), { sellerStatus: "grace" });
      } else if (sub.status === "grace" && daysPast > GRACE_DAYS) {
        // Grace period expired — suspend
        batch.update(snap.ref, { status: "suspended", updatedAt: now });
        batch.update(db.collection("users").doc(sub.uid), { sellerStatus: "suspended" });
        batch.update(db.collection("shops").doc(sub.shopId), { status: "suspended" });
      }
    });

    await batch.commit();
    console.log(`[handleSubscriptionRenewal] Processed ${subs.size} subscriptions.`);
    return null;
  });

