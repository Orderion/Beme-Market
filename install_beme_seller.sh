#!/usr/bin/env bash
# ============================================================
# Beme Market Seller System — Install Script
# Run from your project root: bash install_beme_seller.sh
# ============================================================
set -e

GREEN="\033[0;32m"; BLUE="\033[0;34m"; NC="\033[0m"
echo -e "${BLUE}🚀 Installing Beme Market Seller System...${NC}"

# Create directories
mkdir -p functions src/components src/components/admin src/components/auth src/components/getStore src/components/payout src/hooks src/pages src/pages/admin src/pages/dashboard src/services

echo -e "  Writing functions/createSellerStore.js..."
cat > 'functions/createSellerStore.js' << 'BEME_FILE_END'
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

BEME_FILE_END

echo -e "  Writing functions/handleSubscriptionRenewal.js..."
cat > 'functions/handleSubscriptionRenewal.js' << 'BEME_FILE_END'
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

BEME_FILE_END

echo -e "  Writing functions/sellerFunctions.js..."
cat > 'functions/sellerFunctions.js' << 'BEME_FILE_END'
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

BEME_FILE_END

echo -e "  Writing src/components/SellerRoute.jsx..."
cat > 'src/components/SellerRoute.jsx' << 'BEME_FILE_END'
// src/components/SellerRoute.jsx
// Protects routes that require an active seller account.
// - Not logged in → /login
// - Logged in but not seller → /get-a-store
// - Seller but suspended/grace → /seller-dashboard (dashboard shows its own status UI)
// - Active seller → render children

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SellerRoute({ children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#F0F2FF",
        fontFamily: "Manrope, system-ui, sans-serif",
        fontSize: 14, color: "#8B8FA8",
      }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  if (role !== "seller") {
    return <Navigate to="/get-a-store" replace />;
  }

  return children;
}

BEME_FILE_END

echo -e "  Writing src/components/admin/StoreApprovalCard.jsx..."
cat > 'src/components/admin/StoreApprovalCard.jsx' << 'BEME_FILE_END'
// src/components/admin/StoreApprovalCard.jsx
// Card used by admin to review and moderate stores

export default function StoreApprovalCard({ shop, onAction, loading }) {
  const { shopName, category, city, region, planId, status, verified, verifiedBadge, createdAt, logoUrl, ownerId, totalProducts = 0, totalOrders = 0 } = shop;

  const PLAN_COLORS = { basic: "#6B7280", standard: "#046EF2", pro: "#7C3AED" };
  const STATUS_COLORS = { active: "#22C55E", suspended: "#EF4444", pending: "#F59E0B" };

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
    return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "#F0F2FF", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {logoUrl ? <img src={logoUrl} alt={shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🏪"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1D3B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shopName || "Unnamed Store"}</div>
          <div style={{ fontSize: 11, color: "#8B8FA8" }}>{city}{region ? `, ${region}` : ""} · {category}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <span style={{ padding: "2px 10px", borderRadius: 100, fontSize: 10, fontWeight: 700, background: `${STATUS_COLORS[status] || "#6B7280"}15`, color: STATUS_COLORS[status] || "#6B7280" }}>
            {status}
          </span>
          <span style={{ padding: "2px 10px", borderRadius: 100, fontSize: 10, fontWeight: 700, background: `${PLAN_COLORS[planId] || "#6B7280"}15`, color: PLAN_COLORS[planId] || "#6B7280" }}>
            {planId}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        {[
          { l: "Products",  v: totalProducts },
          { l: "Orders",    v: totalOrders   },
          { l: "Verified",  v: verified ? (verifiedBadge || "✓") : "No" },
        ].map((s, i) => (
          <div key={s.l} style={{ padding: "12px 14px", borderRight: i < 2 ? "1px solid rgba(0,0,0,0.06)" : "none", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1D3B", fontFamily: "'Space Grotesk', sans-serif" }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "#8B8FA8", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, color: "#8B8FA8" }}>Joined {fmtDate(createdAt)}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {status === "active"
            ? <button onClick={() => onAction?.("suspend", shop)} disabled={loading} style={{ padding: "6px 12px", background: "rgba(239,68,68,0.1)", color: "#DC2626", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope,sans-serif" }}>Suspend</button>
            : <button onClick={() => onAction?.("activate", shop)} disabled={loading} style={{ padding: "6px 12px", background: "rgba(34,197,94,0.1)", color: "#16A34A", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope,sans-serif" }}>Activate</button>
          }
          {!verified && <button onClick={() => onAction?.("verify", shop)} disabled={loading} style={{ padding: "6px 12px", background: "rgba(4,110,242,0.1)", color: "#046EF2", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope,sans-serif" }}>Verify</button>}
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/components/auth/RequireSeller.jsx..."
cat > 'src/components/auth/RequireSeller.jsx' << 'BEME_FILE_END'
// src/components/auth/RequireSeller.jsx
// Alias of SellerRoute — used inside nested route wrappers.
// Guards any page that requires role === "seller".

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireSeller({ children }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (role !== "seller") {
    return <Navigate to="/get-a-store" replace />;
  }

  return children;
}

BEME_FILE_END

echo -e "  Writing src/components/getStore/BusinessTypeCard.jsx..."
cat > 'src/components/getStore/BusinessTypeCard.jsx' << 'BEME_FILE_END'
// src/components/getStore/BusinessTypeCard.jsx
export default function BusinessTypeCard({ id, icon, label, desc, selected, onSelect }) {
  return (
    <button onClick={() => onSelect(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 12px 14px", borderRadius: 12, textAlign: "center", border: `2px solid ${selected ? "#046EF2" : "rgba(0,0,0,0.08)"}`, background: selected ? "rgba(4,110,242,0.05)" : "#fff", boxShadow: selected ? "0 0 0 4px rgba(4,110,242,0.12)" : "none", cursor: "pointer", transition: "all 0.14s", position: "relative", width: "100%" }}>
      {selected && <div style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%", background: "#046EF2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>✓</div>}
      <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1D3B", marginBottom: 3, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 10, color: "#8B8FA8", lineHeight: 1.4 }}>{desc}</div>
    </button>
  );
}

BEME_FILE_END

echo -e "  Writing src/components/getStore/FeatureList.jsx..."
cat > 'src/components/getStore/FeatureList.jsx' << 'BEME_FILE_END'
// src/components/getStore/FeatureList.jsx
// Renders a list of plan features with check / cross icons

export function FeatureList({ features = [], color = "#046EF2", showAll = false }) {
  const visible = showAll ? features : features.slice(0, 6);

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
      {visible.map((f, i) => {
        const enabled = typeof f === "string" ? true : f.ok !== false;
        const label   = typeof f === "string" ? f : f.label || f.text || f;
        return (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: enabled ? "#374151" : "#C4C9D4" }}>
            {enabled
              ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              )
            }
            {label}
          </li>
        );
      })}
    </ul>
  );
}

BEME_FILE_END

echo -e "  Writing src/components/getStore/PlanComparison.jsx..."
cat > 'src/components/getStore/PlanComparison.jsx' << 'BEME_FILE_END'
// src/components/getStore/PlanComparison.jsx
// Full feature comparison table across all 3 plans

const ROWS = [
  { label: "Products",          basic: "25",   standard: "500",  pro: "Unlimited" },
  { label: "Store Themes",      basic: "Basic",standard: "Premium", pro: "Premium+" },
  { label: "Live Chat",         basic: false,  standard: true,   pro: true },
  { label: "Discount Codes",    basic: false,  standard: true,   pro: true },
  { label: "Product Boosts",    basic: false,  standard: "5/mo", pro: "20/mo" },
  { label: "Verified Badge",    basic: false,  standard: true,   pro: "Pro Badge" },
  { label: "Analytics",         basic: "Basic",standard: "Advanced", pro: "Advanced" },
  { label: "AI Captions",       basic: false,  standard: false,  pro: true },
  { label: "Custom Domain",     basic: false,  standard: false,  pro: true },
  { label: "Loyalty Rewards",   basic: false,  standard: false,  pro: true },
  { label: "Priority Support",  basic: false,  standard: false,  pro: true },
  { label: "Homepage Ranking",  basic: false,  standard: false,  pro: true },
];

function Cell({ value }) {
  if (value === true) return <span style={{ color: "#22C55E", fontWeight: 700, fontSize: 16 }}>✓</span>;
  if (value === false) return <span style={{ color: "#D1D5DB", fontSize: 16 }}>—</span>;
  return <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{value}</span>;
}

export function PlanComparison() {
  const th = { padding: "10px 16px", fontSize: 12, fontWeight: 800, textAlign: "center", color: "#fff", letterSpacing: "0.04em" };
  const td = { padding: "12px 16px", fontSize: 13, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.05)" };

  return (
    <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left", background: "#1A1D3B", borderRadius: "14px 0 0 0" }}>Feature</th>
            <th style={{ ...th, background: "#6B7280" }}>Basic</th>
            <th style={{ ...th, background: "#046EF2" }}>Standard</th>
            <th style={{ ...th, background: "#7C3AED", borderRadius: "0 14px 0 0" }}>Pro</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.label} style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFF" }}>
              <td style={{ ...td, textAlign: "left", fontWeight: 600, color: "#1A1D3B" }}>{row.label}</td>
              <td style={td}><Cell value={row.basic} /></td>
              <td style={td}><Cell value={row.standard} /></td>
              <td style={td}><Cell value={row.pro} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/components/getStore/PricingCard.jsx..."
cat > 'src/components/getStore/PricingCard.jsx' << 'BEME_FILE_END'
// src/components/getStore/PricingCard.jsx
export function PricingCard({ plan, selected, onSelect, onAction }) {
  const colors = { basic: "#6B7280", standard: "#046EF2", pro: "#7C3AED" };
  const color  = colors[plan.id] || "#046EF2";
  const isSelected = selected === plan.id;

  return (
    <div
      onClick={() => onSelect?.(plan.id)}
      style={{
        border: `2px solid ${isSelected ? color : "rgba(0,0,0,0.08)"}`,
        borderRadius: 14, padding: "24px 20px", background: "#fff",
        cursor: "pointer", position: "relative", transition: "all 0.15s",
        boxShadow: isSelected ? `0 0 0 4px ${color}22` : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {plan.popular && (
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#111", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 100, whiteSpace: "nowrap" }}>
          Most Popular
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{plan.name}</div>
      <div style={{ marginBottom: 16 }}>
        {plan.price === 0
          ? <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#111", letterSpacing: "-0.04em" }}>Free</span>
          : <><span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#111", letterSpacing: "-0.04em" }}>GHS {plan.price}</span><span style={{ fontSize: 13, color: "#6B7280" }}>/mo</span></>
        }
      </div>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>{plan.tagline}</div>
      {onAction && (
        <button
          onClick={(e) => { e.stopPropagation(); onAction(plan.id); }}
          style={{ width: "100%", padding: "10px 0", background: isSelected ? color : "transparent", color: isSelected ? "#fff" : color, border: `2px solid ${color}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.12s", fontFamily: "Manrope, sans-serif" }}
        >
          {plan.cta}
        </button>
      )}
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/components/getStore/ProgressBar.jsx..."
cat > 'src/components/getStore/ProgressBar.jsx' << 'BEME_FILE_END'
// src/components/getStore/ProgressBar.jsx
export default function ProgressBar({ current = 0, total = 100, label, color = "#046EF2", showPercent = false }) {
  const pct      = Math.min(100, total > 0 ? Math.round((current / total) * 100) : 0);
  const barColor = pct >= 90 ? "#EF4444" : pct >= 70 ? "#F59E0B" : color;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
        {label && <span style={{ color: "#6B7280", fontWeight: 600 }}>{label}</span>}
        <span style={{ fontWeight: 700, color: pct >= 90 ? "#EF4444" : "#1A1D3B" }}>
          {showPercent ? `${pct}%` : `${current} / ${total === 99999 ? "∞" : total}`}
        </span>
      </div>
      <div style={{ height: 7, background: "rgba(0,0,0,0.08)", borderRadius: 100, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 100, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/components/getStore/SurveyStep.jsx..."
cat > 'src/components/getStore/SurveyStep.jsx' << 'BEME_FILE_END'
// src/components/getStore/SurveyStep.jsx
export function SurveyStep({ step, totalSteps, title, subtitle, children, onNext, onBack, nextLabel = "Continue →", disabled = false, loading = false }) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", paddingBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28 }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 100, background: i < step ? "#046EF2" : "rgba(0,0,0,0.1)", transition: "background 0.3s" }} />
        ))}
      </div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8B8FA8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Step {step} of {totalSteps}</div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(22px,3vw,28px)", fontWeight: 800, color: "#111", letterSpacing: "-0.04em", marginBottom: 6 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>{subtitle}</p>}
      </div>
      <div style={{ marginBottom: 32 }}>{children}</div>
      <div style={{ display: "flex", gap: 12 }}>
        {onBack && <button onClick={onBack} style={{ flex: 1, padding: "13px 0", background: "transparent", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#374151", fontFamily: "Manrope,sans-serif" }}>← Back</button>}
        <button onClick={onNext} disabled={disabled || loading} style={{ flex: onBack ? 2 : 1, padding: "13px 0", background: disabled ? "#E5E7EB" : "#046EF2", color: disabled ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.12s", fontFamily: "Manrope,sans-serif" }}>
          {loading ? "Saving…" : nextLabel}
        </button>
      </div>
    </div>
  );
}
export default SurveyStep;

BEME_FILE_END

echo -e "  Writing src/components/payout/PayoutRequestCard.jsx..."
cat > 'src/components/payout/PayoutRequestCard.jsx' << 'BEME_FILE_END'
// src/components/payout/PayoutRequestCard.jsx
// Card used by admin to review payout requests
export default function PayoutRequestCard({ request, onApprove, onReject, loading }) {
  const { accountName, amount, method, momoNumber, momoNetwork, bankName, bankAccount, status, createdAt, adminNote } = request;

  const STATUS_COLORS = { pending: "#F59E0B", approved: "#22C55E", rejected: "#EF4444", completed: "#22C55E", processing: "#046EF2" };
  const color = STATUS_COLORS[status] || "#6B7280";

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
    return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "18px 20px", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1D3B", marginBottom: 2 }}>{accountName}</div>
          <div style={{ fontSize: 11, color: "#8B8FA8" }}>{fmtDate(createdAt)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800, color: "#1A1D3B", letterSpacing: "-0.03em" }}>GHS {Number(amount || 0).toFixed(2)}</div>
          <div style={{ display: "inline-flex", padding: "2px 10px", borderRadius: 100, background: `${color}18`, color, fontSize: 11, fontWeight: 700, marginTop: 4 }}>{status}</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
        {method === "momo"
          ? `📱 ${momoNetwork} MoMo · ${momoNumber}`
          : `🏦 ${bankName} · ${bankAccount}`
        }
      </div>

      {adminNote && (
        <div style={{ padding: "8px 12px", background: "rgba(0,0,0,0.04)", borderRadius: 6, fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
          Admin Note: {adminNote}
        </div>
      )}

      {status === "pending" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onReject?.(request)}
            disabled={loading}
            style={{ flex: 1, padding: "8px 0", background: "rgba(239,68,68,0.08)", color: "#DC2626", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope,sans-serif" }}
          >
            Reject
          </button>
          <button
            onClick={() => onApprove?.(request)}
            disabled={loading}
            style={{ flex: 2, padding: "8px 0", background: "#046EF2", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Manrope,sans-serif" }}
          >
            {loading ? "Processing…" : "Approve & Send"}
          </button>
        </div>
      )}
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/hooks/useChat.js..."
cat > 'src/hooks/useChat.js' << 'BEME_FILE_END'
import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, onSnapshot, orderBy, query,
  addDoc, updateDoc, serverTimestamp, where, getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";

/**
 * useChat — manages seller chat conversations and messages.
 * Reads from sellerChats/{chatId} and sellerChats/{chatId}/messages/{msgId}
 */
export function useChat() {
  const { user }    = useAuth();
  const { storeId } = useSellerAuth();

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);

  // Subscribe to all conversations for this seller
  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    const q = query(
      collection(db, "sellerChats"),
      where("shopId", "==", storeId),
      orderBy("lastMessageTime", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("[useChat] conversations error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  // Subscribe to messages for the active chat
  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }
    const q = query(
      collection(db, "sellerChats", activeChat, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("[useChat] messages error:", err);
    });
    return () => unsub();
  }, [activeChat]);

  // Send a message
  const sendMessage = useCallback(async (text, imageUrl = null) => {
    if (!activeChat || !user?.uid || !text?.trim()) return;
    setSending(true);
    try {
      const msgData = {
        senderId: user.uid,
        senderRole: "seller",
        text: String(text).trim().slice(0, 2000),
        createdAt: serverTimestamp(),
        isRead: false,
      };
      if (imageUrl) msgData.imageUrl = imageUrl;

      await addDoc(collection(db, "sellerChats", activeChat, "messages"), msgData);

      // Update conversation last message
      await updateDoc(doc(db, "sellerChats", activeChat), {
        lastMessage: msgData.text,
        lastMessageTime: serverTimestamp(),
        unreadByCustomer: 1,
        unreadBySeller: 0,
      });
    } catch (err) {
      console.error("[useChat] sendMessage error:", err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [activeChat, user?.uid]);

  // Mark conversation as read by seller
  const markRead = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      await updateDoc(doc(db, "sellerChats", chatId), { unreadBySeller: 0 });
    } catch (err) {
      console.error("[useChat] markRead error:", err);
    }
  }, []);

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadBySeller || 0), 0);

  return {
    conversations,
    activeChat,
    setActiveChat,
    messages,
    loading,
    sending,
    totalUnread,
    sendMessage,
    markRead,
  };
}

BEME_FILE_END

echo -e "  Writing src/hooks/useSellerAuth.js..."
cat > 'src/hooks/useSellerAuth.js' << 'BEME_FILE_END'
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

/**
 * useSellerAuth — subscribes to the seller's user document in real-time.
 * Provides isSeller, sellerStatus, storeId, plan info.
 * The seller role and sellerStatus are ONLY set by Cloud Functions
 * after successful Paystack payment verification.
 */
export function useSellerAuth() {
  const { user, role } = useAuth();
  const [sellerData, setSellerData] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSeller = role === "seller";

  // Subscribe to user doc for real-time seller status
  useEffect(() => {
    if (!user?.uid) {
      setSellerData(null);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setSellerData(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      (err) => {
        console.error("[useSellerAuth] user doc error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to shop doc if seller has a storeId
  useEffect(() => {
    const storeId = sellerData?.storeId;
    if (!storeId) { setShop(null); return; }
    const unsub = onSnapshot(
      doc(db, "shops", storeId),
      (snap) => setShop(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err) => console.error("[useSellerAuth] shop doc error:", err)
    );
    return () => unsub();
  }, [sellerData?.storeId]);

  const sellerStatus     = sellerData?.sellerStatus     || "none";
  const storeId          = sellerData?.storeId          || null;
  const subscriptionPlan = sellerData?.subscriptionPlan || "basic";
  const subscriptionStatus = sellerData?.subscriptionStatus || null;

  const isSellerActive  = isSeller && sellerStatus === "active";
  const isSellerGrace   = isSeller && sellerStatus === "grace";
  const isSellerPending = isSeller && sellerStatus === "pending";

  // Plan limits lookup
  const PLAN_LIMITS = {
    basic:    { maxProducts: 25,   hasChat: false, hasAI: false, hasBoosts: false, boostsPerMonth: 0  },
    standard: { maxProducts: 500,  hasChat: true,  hasAI: false, hasBoosts: true,  boostsPerMonth: 5  },
    pro:      { maxProducts: 99999, hasChat: true,  hasAI: true,  hasBoosts: true,  boostsPerMonth: 20 },
  };

  const planLimits = PLAN_LIMITS[subscriptionPlan] || PLAN_LIMITS.basic;

  return {
    isSeller,
    isSellerActive,
    isSellerGrace,
    isSellerPending,
    sellerStatus,
    storeId,
    shop,
    subscriptionPlan,
    subscriptionStatus,
    planLimits,
    sellerData,
    loading,
  };
}

BEME_FILE_END

echo -e "  Writing src/hooks/useStoreAnalytics.js..."
cat > 'src/hooks/useStoreAnalytics.js' << 'BEME_FILE_END'
import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, getDocs, onSnapshot,
  orderBy, query, where, limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";

function toMillis(val) {
  if (!val) return 0;
  if (typeof val?.toMillis === "function") return val.toMillis();
  if (val instanceof Date) return val.getTime();
  if (typeof val?.seconds === "number") return val.seconds * 1000;
  return 0;
}

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function buildWeekSeries(dailyMap) {
  const today = new Date();
  const days  = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key   = getDayKey(d);
    const label = d.toLocaleDateString("en-GH", { weekday: "short" });
    const data  = dailyMap[key] || {};
    days.push({ key, label, revenue: data.revenue || 0, orders: data.orders || 0, visitors: data.visitors || 0 });
  }
  return days;
}

/**
 * useStoreAnalytics — provides 7-day analytics for the seller's store.
 * Reads from sellerAnalytics/{shopId}/daily/{date}
 */
export function useStoreAnalytics() {
  const { user }  = useAuth();
  const { storeId } = useSellerAuth();

  const [analytics, setAnalytics] = useState({ weekSeries: [], totals: { revenue: 0, orders: 0, visitors: 0, products: 0 } });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchAnalytics = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch last 30 days of daily analytics
      const snap = await getDocs(
        query(collection(db, "sellerAnalytics", storeId, "daily"), orderBy("__name__", "desc"), limit(30))
      );
      const dailyMap = {};
      snap.docs.forEach((d) => { dailyMap[d.id] = d.data(); });

      const weekSeries = buildWeekSeries(dailyMap);
      const totals = {
        revenue:  snap.docs.reduce((s, d) => s + (d.data().revenue || 0), 0),
        orders:   snap.docs.reduce((s, d) => s + (d.data().orders || 0), 0),
        visitors: snap.docs.reduce((s, d) => s + (d.data().visitors || 0), 0),
      };

      // Weekly totals (last 7 days)
      const weekRevenue  = weekSeries.reduce((s, d) => s + d.revenue, 0);
      const weekOrders   = weekSeries.reduce((s, d) => s + d.orders, 0);
      const weekVisitors = weekSeries.reduce((s, d) => s + d.visitors, 0);

      setAnalytics({ weekSeries, totals, weekRevenue, weekOrders, weekVisitors });
      setError(null);
    } catch (err) {
      console.error("[useStoreAnalytics] error:", err);
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  return { ...analytics, loading, error, refresh: fetchAnalytics };
}

BEME_FILE_END

echo -e "  Writing src/hooks/useSubscription.js..."
cat > 'src/hooks/useSubscription.js' << 'BEME_FILE_END'
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

/**
 * useSubscription — subscribes to subscriptions/{uid} in real-time.
 * Returns plan status, renewal info, and billing summary.
 */
export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "subscriptions", user.uid),
      (snap) => {
        setSubscription(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[useSubscription] error:", err);
        setError("Failed to load subscription.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // Derived state
  const isActive  = subscription?.status === "active";
  const isGrace   = subscription?.status === "grace";
  const isExpired = ["suspended", "cancelled"].includes(subscription?.status);
  const plan      = subscription?.planId || "basic";

  const daysUntilRenewal = (() => {
    if (!subscription?.currentPeriodEnd) return null;
    const end = subscription.currentPeriodEnd?.toMillis?.() ?? 0;
    return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
  })();

  const renewalDateStr = (() => {
    if (!subscription?.currentPeriodEnd) return null;
    const d = new Date(subscription.currentPeriodEnd?.toMillis?.() ?? 0);
    return d.toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" });
  })();

  const PLAN_PRICES = { basic: 0, standard: 99, pro: 249 };
  const planPrice   = PLAN_PRICES[plan] || 0;

  return {
    subscription,
    isActive,
    isGrace,
    isExpired,
    plan,
    planPrice,
    daysUntilRenewal,
    renewalDateStr,
    loading,
    error,
  };
}

BEME_FILE_END

echo -e "  Writing src/hooks/useWithdrawals.js..."
cat > 'src/hooks/useWithdrawals.js' << 'BEME_FILE_END'
import { useState, useEffect, useCallback } from "react";
import {
  collection, onSnapshot, orderBy, query, where,
  addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";

/**
 * useWithdrawals — manages seller withdrawal requests and wallet balance.
 * Reads from withdrawalRequests where sellerId == user.uid
 */
export function useWithdrawals() {
  const { user }    = useAuth();
  const { storeId } = useSellerAuth();

  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const q = query(
      collection(db, "withdrawalRequests"),
      where("sellerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setWithdrawals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("[useWithdrawals] error:", err);
      setError("Failed to load withdrawal history.");
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  // Calculate pending and completed amounts
  const pendingTotal = withdrawals
    .filter((w) => w.status === "pending" || w.status === "processing")
    .reduce((s, w) => s + (w.amount || 0), 0);

  const completedTotal = withdrawals
    .filter((w) => w.status === "completed")
    .reduce((s, w) => s + (w.amount || 0), 0);

  // Request a withdrawal
  const requestWithdrawal = useCallback(async (payload) => {
    if (!user?.uid || !storeId) throw new Error("Not authenticated.");
    const { amount, method, momoNumber, momoNetwork, accountName, bankName, bankAccount } = payload;

    if (!amount || Number(amount) < 50) throw new Error("Minimum withdrawal is GHS 50.");
    if (method === "momo" && !momoNumber) throw new Error("MoMo number is required.");
    if (!accountName?.trim()) throw new Error("Account name is required.");

    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, "withdrawalRequests"), {
        sellerId:      user.uid,
        shopId:        storeId,
        amount:        Number(amount),
        currency:      "GHS",
        method:        method || "momo",
        momoNumber:    momoNumber || null,
        momoNetwork:   momoNetwork || null,
        accountName:   String(accountName).trim(),
        bankName:      bankName || null,
        bankAccount:   bankAccount || null,
        status:        "pending",
        adminNote:     null,
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
      });
    } catch (err) {
      console.error("[useWithdrawals] request error:", err);
      setError("Failed to submit withdrawal request.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [user?.uid, storeId]);

  return {
    withdrawals,
    loading,
    submitting,
    error,
    pendingTotal,
    completedTotal,
    requestWithdrawal,
  };
}

BEME_FILE_END

echo -e "  Writing src/pages/CommunityGuidelines.jsx..."
cat > 'src/pages/CommunityGuidelines.jsx' << 'BEME_FILE_END'
// src/pages/CommunityGuidelines.jsx
import "./LegalPage.css";

export default function CommunityGuidelines() {
  return (
    <div className="legal-root">
      <div className="legal-container">
        <div className="legal-header">
          <div className="legal-badge">Community</div>
          <h1 className="legal-title">Community Guidelines</h1>
          <p className="legal-meta">Effective: January 1, 2025 · Beme Market Ghana</p>
        </div>
        <div className="legal-intro">
          Beme Market is a community of buyers, sellers, and creators across Ghana. These guidelines exist to keep our marketplace safe, respectful, and thriving for everyone. By using Beme Market, you agree to uphold these standards.
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Be Honest</h2>
          <div className="legal-section-body">
            <p>Honesty is the foundation of trust on Beme Market. This means:</p>
            <ul>
              <li>Representing yourself and your products accurately</li>
              <li>Not making false claims about product quality, origin, or effectiveness</li>
              <li>Not creating fake profiles, reviews, or engagement</li>
              <li>Disclosing any material facts that might affect a buyer's decision</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Be Respectful</h2>
          <div className="legal-section-body">
            <p>Every person on Beme Market deserves to be treated with dignity. We do not tolerate:</p>
            <ul>
              <li>Harassment, threats, or intimidation of any kind</li>
              <li>Hate speech based on ethnicity, religion, gender, disability, or sexual orientation</li>
              <li>Abusive language in messages, reviews, or public content</li>
              <li>Discrimination against buyers or sellers</li>
              <li>Doxxing — sharing private information about other users without consent</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Be Safe</h2>
          <div className="legal-section-body">
            <ul>
              <li>Never share your Beme Market account credentials with anyone</li>
              <li>Be cautious of phishing attempts — Beme Market will never ask for your password via message</li>
              <li>Report suspicious seller activity or listings to our trust and safety team</li>
              <li>Do not meet strangers in unsafe locations for product pickup — use public places</li>
              <li>Protect your financial information — only pay through Beme Market's secure checkout</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Protect Ghana's Marketplace</h2>
          <div className="legal-section-body">
            <p>Beme Market is built to empower Ghanaian businesses. Help us keep it great:</p>
            <ul>
              <li>Buy and sell within the spirit of fair trade</li>
              <li>Support local sellers and Ghanaian-made products</li>
              <li>Leave honest, helpful reviews to guide other shoppers</li>
              <li>Report counterfeit goods to protect authentic Ghanaian businesses</li>
              <li>Encourage other sellers to follow platform standards</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Reporting Violations</h2>
          <div className="legal-section-body">
            <p>If you encounter content, listings, or behavior that violates these guidelines:</p>
            <ul>
              <li>Use the "Report" button on any product, seller, or message</li>
              <li>Email our trust and safety team at <a href="mailto:safety@beme.market">safety@beme.market</a></li>
              <li>For urgent matters (fraud, threats), contact us immediately</li>
            </ul>
            <p>All reports are reviewed within 24–48 hours. We take every report seriously.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Consequences</h2>
          <div className="legal-section-body">
            <p>Violations of these guidelines may result in:</p>
            <ul>
              <li>Warning issued to your account</li>
              <li>Temporary restriction of features</li>
              <li>Listing or content removal</li>
              <li>Account suspension</li>
              <li>Permanent ban and legal action for serious violations</li>
            </ul>
          </div>
        </div>

        <div className="legal-footer-note">
          Questions about our community? <a href="mailto:community@beme.market">community@beme.market</a>
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/GetAStore.css..."
cat > 'src/pages/GetAStore.css' << 'BEME_FILE_END'
/* ============================================================
   GetAStore.css — SDMN + grtheme editorial style
   Ghana marketplace SaaS landing page
============================================================ */

.gsa-root {
  --gsa-blue: #046EF2;
  --gsa-text: #111111;
  --gsa-muted: #6B7280;
  --gsa-border: rgba(0,0,0,0.08);
  font-family: 'Manrope', system-ui, sans-serif;
  color: var(--gsa-text);
}

/* ── Hero ── */
.gsa-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  padding: 72px clamp(20px, 5vw, 80px);
  max-width: 1200px;
  margin: 0 auto;
}
@media (max-width: 900px) {
  .gsa-hero { grid-template-columns: 1fr; gap: 40px; text-align: center; }
  .gsa-hero-actions { justify-content: center; }
  .gsa-hero-social-proof { justify-content: center; }
}

.gsa-hero-badge {
  display: inline-flex; align-items: center;
  gap: 6px; padding: 5px 14px; border-radius: 100px;
  background: rgba(4,110,242,0.08); color: #046EF2;
  font-size: 12px; font-weight: 700; margin-bottom: 18px;
  border: 1px solid rgba(4,110,242,0.2);
}

.gsa-hero-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(32px, 4vw, 52px);
  font-weight: 800; letter-spacing: -0.04em;
  line-height: 1.05; color: #111111; margin-bottom: 18px;
}

.gsa-hero-sub {
  font-size: 16px; color: #6B7280; line-height: 1.7;
  max-width: 480px; margin-bottom: 28px;
}

.gsa-hero-actions {
  display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;
}

.gsa-hero-social-proof {
  display: flex; align-items: center; gap: 12px;
}
.gsa-avatars { display: flex; }
.gsa-avatar-dot {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid #fff; margin-left: -8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff;
}
.gsa-avatars .gsa-avatar-dot:first-child { margin-left: 0; }
.gsa-proof-text { font-size: 13px; color: #6B7280; }

/* Mockup */
.gsa-hero-visual { display: flex; align-items: center; justify-content: center; }
.gsa-dashboard-mockup {
  width: 100%; max-width: 400px;
  background: #fff; border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 20px 60px rgba(4,110,242,0.15);
  overflow: hidden;
}
.gsa-mockup-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px; background: #F8F9FF;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.gsa-dot { width: 10px; height: 10px; border-radius: 50%; }
.gsa-mockup-body {
  padding: 16px;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.gsa-mockup-card {
  background: #F8F9FF; border-radius: 10px; padding: 12px;
}
.gsa-mockup-chart {
  grid-column: span 2;
  display: flex; gap: 4px; align-items: flex-end;
  height: 80px; background: #F8F9FF; border-radius: 10px;
  padding: 12px 12px 8px;
}

/* ── Buttons ── */
.gsa-btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 13px 26px; background: #046EF2; color: #fff;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: background 0.15s, transform 0.1s;
  font-family: 'Manrope', sans-serif;
}
.gsa-btn-primary:hover { background: #0357C7; transform: translateY(-1px); }
.gsa-btn-lg { padding: 16px 36px; font-size: 16px; }

.gsa-btn-ghost {
  display: inline-flex; align-items: center;
  padding: 13px 26px; background: transparent;
  color: #111111; border: 1px solid rgba(0,0,0,0.12);
  border-radius: 8px; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: all 0.15s;
  font-family: 'Manrope', sans-serif;
}
.gsa-btn-ghost:hover { background: rgba(0,0,0,0.04); }

.gsa-btn-outline {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 12px 24px; background: transparent;
  border: 2px solid currentColor; border-radius: 8px;
  font-size: 14px; font-weight: 700; cursor: pointer;
  transition: all 0.15s; font-family: 'Manrope', sans-serif;
}
.gsa-btn-outline:hover { opacity: 0.8; }

/* ── Stats bar ── */
.gsa-stats-bar {
  display: flex; justify-content: center; gap: 0;
  border-top: 1px solid rgba(0,0,0,0.06);
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: #FAFAFA;
}
.gsa-stat {
  flex: 1; max-width: 240px; text-align: center;
  padding: 28px 20px;
  border-right: 1px solid rgba(0,0,0,0.06);
}
.gsa-stat:last-child { border-right: none; }
.gsa-stat-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px; font-weight: 800; color: #046EF2;
  letter-spacing: -0.04em; line-height: 1; margin-bottom: 4px;
}
.gsa-stat-label { font-size: 12px; color: #6B7280; font-weight: 600; }

/* ── Sections ── */
.gsa-section {
  padding: 72px clamp(20px, 5vw, 80px);
  max-width: 1200px; margin: 0 auto;
}
.gsa-section-dark {
  background: #111111; max-width: 100%; margin: 0;
  padding: 72px clamp(20px, 5vw, 80px);
}
.gsa-section-soft {
  background: #F8F9FF; max-width: 100%; margin: 0;
  padding: 72px clamp(20px, 5vw, 80px);
}

.gsa-section-head { text-align: center; margin-bottom: 48px; }
.gsa-section-badge {
  display: inline-flex; align-items: center;
  padding: 5px 14px; border-radius: 100px;
  background: rgba(4,110,242,0.08); color: #046EF2;
  font-size: 12px; font-weight: 700; margin-bottom: 14px;
}
.gsa-section-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(26px, 3vw, 38px); font-weight: 800;
  letter-spacing: -0.04em; color: #111111; margin-bottom: 14px;
}
.gsa-section-sub { font-size: 16px; color: #6B7280; max-width: 520px; margin: 0 auto; line-height: 1.6; }

/* ── Features ── */
.gsa-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}
.gsa-feature-card {
  padding: 24px; border: 1px solid rgba(0,0,0,0.08);
  border-radius: 14px; transition: box-shadow 0.2s, transform 0.2s;
  background: #fff;
}
.gsa-feature-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-3px);
}
.gsa-feature-icon { font-size: 28px; margin-bottom: 12px; }
.gsa-feature-title {
  font-size: 15px; font-weight: 700; color: #111111;
  margin-bottom: 8px; letter-spacing: -0.02em;
}
.gsa-feature-desc { font-size: 13px; color: #6B7280; line-height: 1.6; }

/* ── How it works ── */
.gsa-steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px; max-width: 900px; margin: 0 auto;
}
.gsa-step { text-align: center; }
.gsa-step-num {
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(4,110,242,0.15); color: #60A5FA;
  font-size: 18px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 14px; font-family: 'Space Grotesk', sans-serif;
}
.gsa-step-title { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.gsa-step-desc { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6; }

/* ── Pricing ── */
.gsa-pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px; max-width: 900px; margin: 0 auto;
}
.gsa-plan-card {
  padding: 28px; border: 1px solid rgba(0,0,0,0.08);
  border-radius: 16px; background: #fff; position: relative;
  transition: box-shadow 0.2s;
}
.gsa-plan-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.gsa-plan-highlight {
  background: #046EF2; border-color: transparent;
  box-shadow: 0 8px 32px rgba(4,110,242,0.4);
}
.gsa-plan-highlight .gsa-plan-name,
.gsa-plan-highlight .gsa-plan-price,
.gsa-plan-highlight .gsa-plan-amt,
.gsa-plan-highlight .gsa-plan-unit,
.gsa-plan-highlight .gsa-plan-features li { color: #fff !important; }
.gsa-plan-popular {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  background: #111111; color: #fff; font-size: 11px; font-weight: 700;
  padding: 4px 14px; border-radius: 100px; white-space: nowrap;
}
.gsa-plan-name {
  font-size: 14px; font-weight: 700; margin-bottom: 10px; letter-spacing: 0.04em; text-transform: uppercase;
}
.gsa-plan-price { margin-bottom: 20px; }
.gsa-plan-amt {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 32px; font-weight: 800; letter-spacing: -0.04em; color: #111111;
}
.gsa-plan-unit { font-size: 14px; color: #6B7280; margin-left: 4px; }
.gsa-plan-features {
  list-style: none; padding: 0; margin: 0 0 24px;
  display: flex; flex-direction: column; gap: 10px;
}
.gsa-plan-features li {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #6B7280;
}

/* ── Testimonials ── */
.gsa-testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px; max-width: 960px; margin: 0 auto;
}
.gsa-testimonial {
  background: #fff; border-radius: 14px; padding: 24px;
  border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.gsa-testimonial-text {
  font-size: 14px; color: #374151; line-height: 1.7;
  margin-bottom: 16px; font-style: italic;
}
.gsa-testimonial-author { display: flex; align-items: center; gap: 10px; }
.gsa-testimonial-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: #046EF2; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; flex-shrink: 0;
}

/* ── FAQ ── */
.gsa-faq-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 20px; max-width: 960px; margin: 0 auto;
}
.gsa-faq-item {
  padding: 20px; border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px; background: #fff;
}
.gsa-faq-q {
  font-size: 14px; font-weight: 700; color: #111111; margin-bottom: 8px;
}
.gsa-faq-a { font-size: 13px; color: #6B7280; line-height: 1.6; }

/* ── CTA ── */
.gsa-cta {
  background: linear-gradient(135deg, #046EF2 0%, #0357C7 100%);
  text-align: center; padding: 80px clamp(20px, 5vw, 80px);
}
.gsa-cta-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(28px, 4vw, 42px); font-weight: 800;
  color: #fff; letter-spacing: -0.04em; margin-bottom: 14px;
}
.gsa-cta-sub {
  font-size: 16px; color: rgba(255,255,255,0.8);
  max-width: 480px; margin: 0 auto 32px; line-height: 1.6;
}
.gsa-cta .gsa-btn-primary { background: #fff; color: #046EF2; }
.gsa-cta .gsa-btn-primary:hover { background: rgba(255,255,255,0.9); }

@media (max-width: 640px) {
  .gsa-stats-bar { flex-wrap: wrap; }
  .gsa-stat { flex: 1 1 50%; border-bottom: 1px solid rgba(0,0,0,0.06); }
  .gsa-hero-actions { flex-direction: column; align-items: stretch; }
}

BEME_FILE_END

echo -e "  Writing src/pages/GetAStore.jsx..."
cat > 'src/pages/GetAStore.jsx' << 'BEME_FILE_END'
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./GetAStore.css";

const FEATURES = [
  { icon: "🏪", title: "Your Own Storefront",  desc: "Get a beautiful, shareable store page in minutes. Customise your logo, banner, and brand colors." },
  { icon: "📦", title: "Easy Product Listing",  desc: "List products with photos, prices, and descriptions. Manage stock and featured items effortlessly." },
  { icon: "💬", title: "WhatsApp Integration",  desc: "Let customers reach you on WhatsApp directly from your store. Ghana's favourite way to close deals." },
  { icon: "📊", title: "Sales Analytics",        desc: "Track revenue, orders, visitors, and customer trends in real time with a beautiful dashboard." },
  { icon: "🚀", title: "Marketplace Boosts",    desc: "Feature your products on the Beme Market homepage and trending sections for maximum visibility." },
  { icon: "✅", title: "Verified Seller Badge", desc: "Get verified to build customer trust and unlock higher withdrawal limits." },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Create Your Account",   desc: "Sign up or log in to Beme Market. Your buyer account doubles as your seller account."   },
  { step: "2", title: "Set Up Your Store",      desc: "Choose your business type, fill in your store details, pick a theme, and upload your logo." },
  { step: "3", title: "Choose a Plan",          desc: "Start free with Basic or unlock premium features with Standard or Pro. Powered by Paystack." },
  { step: "4", title: "Start Selling",          desc: "Go live instantly! Add products, share your store link, and accept orders from anywhere in Ghana." },
];

const TESTIMONIALS = [
  { name: "Abena K.",    role: "Fashion Seller, Kumasi",  text: "I went from selling on Instagram to having a proper storefront. My sales doubled in the first month!", avatar: "A" },
  { name: "Kwame A.",    role: "Electronics Dealer, Accra", text: "The WhatsApp integration alone is worth it. Customers can chat me immediately — conversion is way up.", avatar: "K" },
  { name: "Efua M.",     role: "Cosmetics & Hair, Takoradi", text: "The dashboard is so clean and easy to use. I check my sales analytics every morning like it's my news.", avatar: "E" },
];

const PLANS = [
  { id: "basic",    name: "Basic",    price: 0,   unit: "Free forever", highlight: false, color: "#6B7280", features: ["25 products",  "Basic storefront",  "MoMo checkout",   "Order management", "Basic analytics"]   },
  { id: "standard", name: "Standard", price: 99,  unit: "/ month",      highlight: true,  color: "#046EF2", features: ["500 products", "Premium themes",   "Live customer chat","Discount codes",  "Featured boosts",  "Verified badge eligible"] },
  { id: "pro",      name: "Pro",      price: 249, unit: "/ month",      highlight: false, color: "#7C3AED", features: ["Unlimited products", "Custom domain", "AI captions", "Live selling", "Loyalty rewards", "Priority support", "Homepage boosts", "Pro verified badge"] },
];

const FAQ = [
  { q: "Do I need a Ghana Card to sell?",          a: "No, you can start selling immediately. Ghana Card is only needed for store verification to unlock the verified badge and higher payout limits." },
  { q: "How do I get paid?",                        a: "We pay directly to your MTN, Telecel, or AirtelTigo Mobile Money account, or to your Ghanaian bank account. Minimum payout is GHS 50." },
  { q: "Can I sell used or second-hand items?",     a: "Yes! Used and second-hand items are allowed as long as they're legal and accurately described. No counterfeit or stolen goods." },
  { q: "What happens if a customer disputes an order?", a: "Our support team reviews both sides. Sellers with clear product descriptions and photos are usually protected. We encourage honest listings." },
  { q: "Is Basic really free forever?",             a: "Yes. The Basic plan is permanently free. You only pay for Standard (GHS 99/mo) or Pro (GHS 249/mo) if you want premium features." },
  { q: "Can I upgrade or downgrade my plan?",       a: "Yes, at any time from your Seller Dashboard. Upgrades take effect immediately. Downgrades apply at the next billing cycle." },
];

export default function GetAStore() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const handleStart = () => {
    if (!user) navigate("/login?redirect=/store-onboarding");
    else navigate("/store-onboarding");
  };

  return (
    <div className="gsa-root">
      {/* ── HERO ── */}
      <section className="gsa-hero">
        <div className="gsa-hero-inner">
          <div className="gsa-hero-badge">🇬🇭 Ghana's Premier Seller Platform</div>
          <h1 className="gsa-hero-title">
            Turn What You Love<br />Into a Thriving Business
          </h1>
          <p className="gsa-hero-sub">
            Get your own Beme Market storefront in minutes. List products, accept orders, chat with customers on WhatsApp, and get paid to your MoMo account. Simple, fast, built for Ghana.
          </p>
          <div className="gsa-hero-actions">
            <button className="gsa-btn-primary" onClick={handleStart}>
              Get Your Free Store →
            </button>
            <button className="gsa-btn-ghost" onClick={() => document.getElementById("gsa-pricing").scrollIntoView({ behavior: "smooth" })}>
              View Pricing
            </button>
          </div>
          <div className="gsa-hero-social-proof">
            <div className="gsa-avatars">
              {["K","A","E","M","D"].map((l, i) => (
                <div key={i} className="gsa-avatar-dot" style={{ zIndex: 5 - i, background: ["#046EF2","#22C55E","#7C3AED","#F59E0B","#EF4444"][i] }}>{l}</div>
              ))}
            </div>
            <span className="gsa-proof-text">Joined by <strong>2,400+</strong> sellers across Ghana</span>
          </div>
        </div>

        {/* Hero visual */}
        <div className="gsa-hero-visual">
          <div className="gsa-dashboard-mockup">
            <div className="gsa-mockup-bar">
              <div className="gsa-dot" style={{ background: "#EF4444" }} />
              <div className="gsa-dot" style={{ background: "#F59E0B" }} />
              <div className="gsa-dot" style={{ background: "#22C55E" }} />
              <span style={{ fontSize: 11, color: "#8B8FA8", flex: 1, textAlign: "center" }}>Beme Seller Dashboard</span>
            </div>
            <div className="gsa-mockup-body">
              {[{ l: "Revenue",   v: "GHS 4,280", up: true  },
                { l: "Orders",    v: "38",         up: true  },
                { l: "Visitors",  v: "1,204",      up: true  },
                { l: "Products",  v: "52",         up: false }].map((c) => (
                <div key={c.l} className="gsa-mockup-card">
                  <div style={{ fontSize: 10, color: "#8B8FA8", marginBottom: 4 }}>{c.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1D3B", fontFamily: "'Space Grotesk', sans-serif" }}>{c.v}</div>
                  <div style={{ fontSize: 10, color: c.up ? "#22C55E" : "#EF4444" }}>{c.up ? "↑" : "↓"} this week</div>
                </div>
              ))}
              <div className="gsa-mockup-chart">
                {[40,65,45,80,60,90,75,95].map((h, i) => (
                  <div key={i} style={{ flex: 1, background: i === 7 ? "#046EF2" : "#E8EFFF", borderRadius: "3px 3px 0 0", height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="gsa-stats-bar">
        {[
          { value: "2,400+",  label: "Active Sellers"   },
          { value: "GHS 1M+", label: "Processed Monthly" },
          { value: "160+",    label: "Cities in Ghana"   },
          { value: "4.9★",    label: "Seller Rating"     },
        ].map((s) => (
          <div key={s.label} className="gsa-stat">
            <div className="gsa-stat-value">{s.value}</div>
            <div className="gsa-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── FEATURES ── */}
      <section className="gsa-section">
        <div className="gsa-section-head">
          <div className="gsa-section-badge">Everything You Need</div>
          <h2 className="gsa-section-title">Built for Ghana's Digital Economy</h2>
          <p className="gsa-section-sub">From Kumasi to Accra, Takoradi to Tamale — sell to customers across the country and get paid to your phone.</p>
        </div>
        <div className="gsa-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="gsa-feature-card">
              <div className="gsa-feature-icon">{f.icon}</div>
              <h3 className="gsa-feature-title">{f.title}</h3>
              <p className="gsa-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="gsa-section gsa-section-dark">
        <div className="gsa-section-head">
          <div className="gsa-section-badge" style={{ background: "rgba(4,110,242,0.15)", color: "#60A5FA" }}>Simple Process</div>
          <h2 className="gsa-section-title" style={{ color: "#fff" }}>Get Selling in 4 Steps</h2>
        </div>
        <div className="gsa-steps-grid">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="gsa-step">
              <div className="gsa-step-num">{s.step}</div>
              <h3 className="gsa-step-title">{s.title}</h3>
              <p className="gsa-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button className="gsa-btn-primary" onClick={handleStart}>Start Now — It's Free →</button>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="gsa-section" id="gsa-pricing">
        <div className="gsa-section-head">
          <div className="gsa-section-badge">Pricing</div>
          <h2 className="gsa-section-title">Choose Your Plan</h2>
          <p className="gsa-section-sub">Start free. Scale when you're ready. No hidden fees, no contracts.</p>
        </div>
        <div className="gsa-pricing-grid">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`gsa-plan-card ${plan.highlight ? "gsa-plan-highlight" : ""}`}>
              {plan.highlight && <div className="gsa-plan-popular">Most Popular</div>}
              <div className="gsa-plan-name" style={{ color: plan.color }}>{plan.name}</div>
              <div className="gsa-plan-price">
                {plan.price === 0 ? <span className="gsa-plan-amt">Free</span>
                  : <><span className="gsa-plan-amt">GHS {plan.price}</span><span className="gsa-plan-unit">{plan.unit}</span></>
                }
              </div>
              <ul className="gsa-plan-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.highlight ? "#fff" : plan.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={plan.highlight ? "gsa-btn-primary" : "gsa-btn-outline"}
                style={{ width: "100%", borderColor: plan.color, color: plan.highlight ? "#fff" : plan.color }}
                onClick={() => navigate(`/store-plans?plan=${plan.id}`)}
              >
                {plan.price === 0 ? "Start Free" : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="gsa-section gsa-section-soft">
        <div className="gsa-section-head">
          <div className="gsa-section-badge">Seller Stories</div>
          <h2 className="gsa-section-title">Real Sellers, Real Results</h2>
        </div>
        <div className="gsa-testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="gsa-testimonial">
              <p className="gsa-testimonial-text">"{t.text}"</p>
              <div className="gsa-testimonial-author">
                <div className="gsa-testimonial-avatar">{t.avatar}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                  <div style={{ color: "#8B8FA8", fontSize: 12 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="gsa-section">
        <div className="gsa-section-head">
          <div className="gsa-section-badge">FAQ</div>
          <h2 className="gsa-section-title">Common Questions</h2>
        </div>
        <div className="gsa-faq-grid">
          {FAQ.map((f) => (
            <div key={f.q} className="gsa-faq-item">
              <h4 className="gsa-faq-q">{f.q}</h4>
              <p className="gsa-faq-a">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="gsa-cta">
        <h2 className="gsa-cta-title">Ready to Start Selling?</h2>
        <p className="gsa-cta-sub">Join over 2,400 Ghanaian sellers already growing on Beme Market. Your store is one click away.</p>
        <button className="gsa-btn-primary gsa-btn-lg" onClick={handleStart}>
          Get Your Free Store Today →
        </button>
        <div style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>No credit card required • Free plan available • Setup in minutes</div>
      </section>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/LegalPage.css..."
cat > 'src/pages/LegalPage.css' << 'BEME_FILE_END'
/* LegalPage.css — shared styles for all legal/policy pages */
.legal-root {
  background: #FAFAFA;
  min-height: 100vh;
  padding: 48px clamp(16px, 5vw, 80px);
  font-family: 'Manrope', system-ui, sans-serif;
}
body.dark .legal-root { background: #0F0F0F; }

.legal-container {
  max-width: 760px; margin: 0 auto;
}

.legal-header { margin-bottom: 36px; }
.legal-badge {
  display: inline-flex; padding: 4px 12px; border-radius: 100px;
  background: rgba(4,110,242,0.08); color: #046EF2;
  font-size: 12px; font-weight: 700; margin-bottom: 12px;
}
.legal-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(26px, 3vw, 36px); font-weight: 800;
  color: #111111; letter-spacing: -0.04em; margin-bottom: 8px;
}
body.dark .legal-title { color: #F5F5F5; }
.legal-meta { font-size: 13px; color: #8B8FA8; }

.legal-intro {
  padding: 18px 20px; background: rgba(4,110,242,0.06);
  border-left: 4px solid #046EF2; border-radius: 0 8px 8px 0;
  font-size: 14px; color: #374151; line-height: 1.7;
  margin-bottom: 36px;
}
body.dark .legal-intro { color: #D1D5DB; }

.legal-section { margin-bottom: 36px; }
.legal-section-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px; font-weight: 700; color: #111111;
  letter-spacing: -0.02em; margin-bottom: 14px;
  padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.06);
}
body.dark .legal-section-title { color: #F5F5F5; border-bottom-color: rgba(255,255,255,0.06); }

.legal-section-body p {
  font-size: 14px; color: #374151; line-height: 1.8; margin-bottom: 12px;
}
body.dark .legal-section-body p { color: #9CA3AF; }
.legal-section-body ul {
  font-size: 14px; color: #374151; line-height: 1.8;
  padding-left: 20px; margin-bottom: 12px;
}
body.dark .legal-section-body ul { color: #9CA3AF; }
.legal-section-body li { margin-bottom: 6px; }
.legal-section-body a { color: #046EF2; }
.legal-section-body strong { color: #111111; font-weight: 700; }
body.dark .legal-section-body strong { color: #F5F5F5; }

.legal-warning {
  padding: 12px 16px; background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2); border-radius: 8px;
  font-size: 13px; font-weight: 600; color: #DC2626; margin-bottom: 16px;
}

.legal-footer-note {
  margin-top: 48px; padding: 20px; background: rgba(0,0,0,0.04);
  border-radius: 10px; font-size: 13px; color: #6B7280; text-align: center;
}
body.dark .legal-footer-note { background: rgba(255,255,255,0.04); }
.legal-footer-note a { color: #046EF2; }

.legal-toc {
  padding: 16px 20px; background: #F8F9FF; border-radius: 10px;
  margin-bottom: 36px; border: 1px solid rgba(0,0,0,0.06);
}
body.dark .legal-toc { background: #1A1A2E; border-color: rgba(255,255,255,0.06); }
.legal-toc-title { font-size: 12px; font-weight: 700; color: #8B8FA8; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.legal-toc ol { padding-left: 18px; margin: 0; }
.legal-toc li { font-size: 13px; color: #046EF2; margin-bottom: 4px; }

BEME_FILE_END

echo -e "  Writing src/pages/PrivacyPolicy.jsx..."
cat > 'src/pages/PrivacyPolicy.jsx' << 'BEME_FILE_END'
// src/pages/PrivacyPolicy.jsx
import "./LegalPage.css";

export default function PrivacyPolicy() {
  return (
    <div className="legal-root">
      <div className="legal-container">
        <div className="legal-header">
          <div className="legal-badge">Privacy</div>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-meta">Effective: January 1, 2025 · Beme Market Ghana</p>
        </div>
        <div className="legal-intro">
          Beme Market ("we", "us", "our") is committed to protecting your personal data. This policy explains what data we collect, how we use it, and your rights regarding your information.
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">1. Data We Collect</h2>
          <div className="legal-section-body">
            <p><strong>Account Data:</strong> Name, email address, phone number, and profile photo when you register.</p>
            <p><strong>Seller Data:</strong> Business name, store details, product listings, bank/MoMo account details for payouts, and identity documents submitted for verification.</p>
            <p><strong>Transaction Data:</strong> Orders placed or received, payment amounts, references, and transaction history.</p>
            <p><strong>Usage Data:</strong> Pages visited, search queries, products viewed, and time spent on the platform. Collected via cookies and analytics tools.</p>
            <p><strong>Communication Data:</strong> Messages sent through our platform, including seller-buyer chat.</p>
            <p><strong>Device Data:</strong> IP address, browser type, operating system, and device identifiers.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">2. How We Use Your Data</h2>
          <div className="legal-section-body">
            <ul>
              <li>To provide, maintain, and improve our marketplace services</li>
              <li>To process payments and facilitate transactions between buyers and sellers</li>
              <li>To verify seller identities and prevent fraud</li>
              <li>To send transactional notifications (order updates, payment confirmations)</li>
              <li>To send marketing communications (only with your consent)</li>
              <li>To comply with legal obligations and regulatory requirements</li>
              <li>To resolve disputes and enforce our terms</li>
              <li>To generate anonymized analytics for platform improvement</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">3. Data Sharing</h2>
          <div className="legal-section-body">
            <p>We do not sell your personal data. We share data only in these circumstances:</p>
            <ul>
              <li><strong>With Sellers:</strong> Your name and delivery address are shared with sellers to fulfill your orders.</li>
              <li><strong>With Paystack:</strong> Payment processing requires sharing transaction data with Paystack in accordance with their <a href="https://paystack.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</li>
              <li><strong>With Firebase/Google:</strong> Our platform is built on Firebase. Data is stored in Google's secure data centers.</li>
              <li><strong>With Law Enforcement:</strong> When required by Ghanaian law, court order, or to prevent harm.</li>
              <li><strong>With Auditors:</strong> In cases of fraud investigation or financial audit.</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">4. Data Retention</h2>
          <div className="legal-section-body">
            <p>We retain your data for as long as your account is active. After account deletion: transaction records are kept for 7 years for tax/legal compliance; identity documents are retained for 3 years; chat messages are deleted within 90 days; analytics data is anonymized and retained indefinitely.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">5. Your Rights</h2>
          <div className="legal-section-body">
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update inaccurate or incomplete data in your account settings</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails at any time</li>
            </ul>
            <p>To exercise these rights, email <a href="mailto:privacy@beme.market">privacy@beme.market</a>.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">6. Cookies</h2>
          <div className="legal-section-body">
            <p>We use essential cookies for authentication and session management, and optional analytics cookies (which you can decline). We do not use third-party advertising cookies.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">7. Security</h2>
          <div className="legal-section-body">
            <p>We protect your data with: Firebase Authentication with encrypted credentials, HTTPS-only data transmission, Firestore security rules restricting data access, and Firebase Storage with authenticated access controls. Despite these measures, no system is 100% secure. Report security vulnerabilities to <a href="mailto:security@beme.market">security@beme.market</a>.</p>
          </div>
        </div>

        <div className="legal-footer-note">
          Privacy questions? Email <a href="mailto:privacy@beme.market">privacy@beme.market</a>
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/RefundPolicy.jsx..."
cat > 'src/pages/RefundPolicy.jsx' << 'BEME_FILE_END'
// src/pages/RefundPolicy.jsx
import "./LegalPage.css";

export default function RefundPolicy() {
  return (
    <div className="legal-root">
      <div className="legal-container">
        <div className="legal-header">
          <div className="legal-badge">Policy</div>
          <h1 className="legal-title">Refund & Return Policy</h1>
          <p className="legal-meta">Effective: January 1, 2025 · Beme Market Ghana</p>
        </div>
        <div className="legal-intro">
          Beme Market is a marketplace connecting buyers with independent sellers. Each seller manages their own return policy. This document outlines our platform-level buyer protections and refund process.
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Buyer Protection</h2>
          <div className="legal-section-body">
            <p>You are eligible for a refund if:</p>
            <ul>
              <li>The item you received is significantly different from what was described or pictured</li>
              <li>The item was damaged in transit (you must provide photo evidence within 48 hours of delivery)</li>
              <li>Your order was never delivered and the seller cannot provide proof of delivery</li>
              <li>You were charged but the seller cancelled your order</li>
              <li>The product is counterfeit or fake (verified by our team)</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">How to Request a Refund</h2>
          <div className="legal-section-body">
            <ol>
              <li>First, contact the seller directly through your order page within 5 days of receiving your item</li>
              <li>If the seller does not respond within 48 hours or refuses a legitimate refund, open a dispute through our platform</li>
              <li>Provide evidence: photos, screenshots of communications, and a description of the issue</li>
              <li>Our team will review the dispute within 3–5 business days</li>
              <li>If resolved in your favor, refunds are processed to your original payment method within 5–7 business days</li>
            </ol>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Non-Refundable Items</h2>
          <div className="legal-section-body">
            <p>The following are generally <strong>not eligible for refunds</strong>:</p>
            <ul>
              <li>Digital products (ebooks, templates, downloadable files) once downloaded</li>
              <li>Perishable food items</li>
              <li>Custom or personalized products made to order</li>
              <li>Items explicitly marked as "no returns" by the seller — provided the item matches the description</li>
              <li>Change-of-mind returns (unless the seller accepts them)</li>
              <li>Subscription fees for seller plans</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Seller Refund Responsibilities</h2>
          <div className="legal-section-body">
            <p>Sellers must clearly state their return policy on their store page. Sellers are required to:</p>
            <ul>
              <li>Honor any return/refund policy they advertise on their store</li>
              <li>Process approved refunds within 5 business days</li>
              <li>Not delay or deny legitimate refunds out of bad faith</li>
            </ul>
            <p>Sellers who consistently refuse legitimate refunds may have their accounts suspended and outstanding refunds deducted from their payouts.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Chargebacks</h2>
          <div className="legal-section-body">
            <p>If you initiate a chargeback with your bank without first attempting resolution through Beme Market, we reserve the right to: suspend your account pending investigation, share transaction evidence with your bank, and restrict future purchases. We encourage resolving disputes through our platform first, as chargebacks harm honest sellers.</p>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Subscription Refunds</h2>
          <div className="legal-section-body">
            <p>Seller subscription fees (Basic, Standard, Pro) are <strong>non-refundable</strong>. Once a subscription payment is made, the plan is activated for the full 30-day billing period regardless of usage. Upgrading or downgrading plans does not generate a refund for the current billing period.</p>
          </div>
        </div>

        <div className="legal-footer-note">
          Refund disputes? Email <a href="mailto:support@beme.market">support@beme.market</a> or open a dispute from your order page.
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/SellerDashboard.css..."
cat > 'src/pages/SellerDashboard.css' << 'BEME_FILE_END'
/* ============================================================
   SELLER DASHBOARD — Finance Dashboard UI
   Primary: #046EF2 | Inspired by Finance Analytics UI
   Light + Dark theme, clean cards, recharts integration
============================================================ */

/* ── Layout Root ── */
.sd-root {
  display: flex;
  height: 100vh;
  background: #F0F2FF;
  overflow: hidden;
  font-family: 'Manrope', system-ui, sans-serif;
}
body.dark .sd-root { background: #0D0D1F; }

/* ── Sidebar ── */
.sd-sidebar {
  width: 220px;
  background: #fff;
  border-right: 1px solid rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100vh;
  overflow: hidden;
  transition: width 0.3s ease, left 0.3s ease;
  z-index: 50;
}
body.dark .sd-sidebar {
  background: #141428;
  border-right-color: rgba(255,255,255,0.06);
}

/* Brand */
.sd-brand {
  padding: 18px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
body.dark .sd-brand { border-bottom-color: rgba(255,255,255,0.06); }

.sd-brand-icon {
  width: 34px; height: 34px;
  border-radius: 9px;
  background: #046EF2;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 800; font-size: 15px;
  flex-shrink: 0;
  font-family: 'Space Grotesk', sans-serif;
}
.sd-brand-info { min-width: 0; }
.sd-brand-name {
  font-size: 13px; font-weight: 700; color: #1A1D3B;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  letter-spacing: -0.02em;
}
body.dark .sd-brand-name { color: #E8E8FF; }
.sd-brand-plan {
  font-size: 10px; font-weight: 600; color: #8B8FA8;
  display: flex; align-items: center; gap: 4px;
}
.sd-plan-dot {
  width: 5px; height: 5px; border-radius: 50%;
}
.sd-plan-dot.basic { background: #6B7280; }
.sd-plan-dot.standard { background: #046EF2; }
.sd-plan-dot.pro { background: #7C3AED; }

/* Nav */
.sd-nav {
  flex: 1; padding: 10px 8px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 1px;
}
.sd-nav-btn {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 11px; border-radius: 8px;
  width: 100%; background: transparent; border: none;
  cursor: pointer; transition: background 0.12s, color 0.12s;
  color: #8B8FA8; font-size: 13px; font-weight: 600;
  text-align: left; position: relative;
}
body.dark .sd-nav-btn { color: #6B6B8A; }
.sd-nav-btn:hover { background: rgba(4,110,242,0.07); color: #046EF2; }
.sd-nav-btn.active { background: rgba(4,110,242,0.1); color: #046EF2; }
.sd-nav-icon { display: flex; align-items: center; flex-shrink: 0; }
.sd-nav-label { flex: 1; }
.sd-nav-badge {
  margin-left: auto; background: #EF4444; color: #fff;
  border-radius: 100px; padding: 1px 6px; font-size: 10px; font-weight: 700;
}
.sd-nav-divider {
  height: 1px; background: rgba(0,0,0,0.05); margin: 6px 8px;
}
body.dark .sd-nav-divider { background: rgba(255,255,255,0.05); }

/* Support card */
.sd-support {
  margin: 10px;
  padding: 14px;
  background: rgba(4,110,242,0.07);
  border-radius: 12px;
  text-align: center;
  flex-shrink: 0;
}
.sd-support-title {
  font-size: 11px; font-weight: 700; color: #1A1D3B; margin-bottom: 2px;
}
body.dark .sd-support-title { color: #E8E8FF; }
.sd-support-text {
  font-size: 10px; color: #8B8FA8; margin-bottom: 8px; line-height: 1.5;
}
.sd-support-btn {
  width: 100%; padding: 7px; border-radius: 7px;
  background: #046EF2; color: #fff; border: none;
  font-size: 11px; font-weight: 700; cursor: pointer;
  transition: background 0.12s;
}
.sd-support-btn:hover { background: #0357C7; }

/* ── Main Area ── */
.sd-main {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
}

/* Topbar */
.sd-topbar {
  height: 62px;
  background: #fff;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 0 24px; flex-shrink: 0;
}
body.dark .sd-topbar {
  background: #141428;
  border-bottom-color: rgba(255,255,255,0.06);
}
.sd-topbar-left { display: flex; align-items: center; gap: 12px; }
.sd-topbar-title {
  font-size: 18px; font-weight: 700; color: #1A1D3B; letter-spacing: -0.03em;
  font-family: 'Space Grotesk', sans-serif;
}
body.dark .sd-topbar-title { color: #E8E8FF; }
.sd-topbar-right { display: flex; align-items: center; gap: 12px; }
.sd-topbar-date {
  font-size: 12px; color: #8B8FA8; font-weight: 500;
  display: flex; align-items: center; gap: 5px;
}
.sd-hamburger {
  display: none; background: none; border: none;
  cursor: pointer; color: #8B8FA8; padding: 4px;
}
.sd-avatar-btn {
  width: 34px; height: 34px; border-radius: 50%;
  background: #046EF2; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
  border: none; cursor: pointer;
}

/* ── Content ── */
.sd-content {
  flex: 1; overflow-y: auto; padding: 22px 24px;
}

/* ── Stat Cards ── */
.sd-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px; margin-bottom: 18px;
}
.sd-stat-card {
  background: #fff; border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s, transform 0.2s;
}
.sd-stat-card:hover {
  box-shadow: 0 6px 20px rgba(0,0,0,0.08); transform: translateY(-2px);
}
body.dark .sd-stat-card { background: #1A1A2E; }
.sd-stat-top {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 8px;
}
.sd-stat-label {
  font-size: 12px; font-weight: 600; color: #8B8FA8;
}
.sd-stat-icon {
  width: 30px; height: 30px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.sd-stat-value {
  font-size: 28px; font-weight: 800; color: #1A1D3B;
  letter-spacing: -0.04em; line-height: 1; margin-bottom: 8px;
  font-family: 'Space Grotesk', sans-serif;
}
body.dark .sd-stat-value { color: #E8E8FF; }
.sd-stat-trend {
  font-size: 11px; font-weight: 600;
  display: flex; align-items: center; gap: 4px;
}
.sd-stat-trend.up { color: #16A34A; }
.sd-stat-trend.down { color: #DC2626; }
.sd-stat-trend-sub { color: #8B8FA8; font-weight: 500; }

/* ── Body Grid ── */
.sd-body-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 14px;
}
@media (max-width: 1100px) {
  .sd-body-grid { grid-template-columns: 1fr; }
}

/* ── Panels ── */
.sd-panel {
  background: #fff; border-radius: 14px;
  padding: 20px 22px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  margin-bottom: 14px;
}
body.dark .sd-panel { background: #1A1A2E; }
.sd-panel:last-child { margin-bottom: 0; }

.sd-panel-head {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 16px;
}
.sd-panel-title {
  font-size: 15px; font-weight: 700; color: #1A1D3B;
  letter-spacing: -0.02em;
  font-family: 'Space Grotesk', sans-serif;
}
body.dark .sd-panel-title { color: #E8E8FF; }
.sd-panel-sub { font-size: 12px; color: #8B8FA8; }

/* ── Table ── */
.sd-table-wrap { overflow-x: auto; }
.sd-table { width: 100%; border-collapse: collapse; }
.sd-table th {
  font-size: 10px; font-weight: 700; color: #8B8FA8;
  text-transform: uppercase; letter-spacing: 0.08em;
  padding: 8px 12px; text-align: left;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
body.dark .sd-table th { border-bottom-color: rgba(255,255,255,0.06); }
.sd-table td {
  padding: 11px 12px; font-size: 13px; font-weight: 500; color: #1A1D3B;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
body.dark .sd-table td {
  color: #E8E8FF; border-bottom-color: rgba(255,255,255,0.04);
}
.sd-table tr:last-child td { border-bottom: none; }
.sd-table tbody tr:hover td { background: rgba(0,0,0,0.01); }
body.dark .sd-table tbody tr:hover td { background: rgba(255,255,255,0.01); }

/* ── Badges ── */
.sd-badge {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 700; white-space: nowrap;
}
.sd-badge-green { background: rgba(34,197,94,0.1); color: #16A34A; }
.sd-badge-yellow { background: rgba(245,158,11,0.1); color: #D97706; }
.sd-badge-red { background: rgba(239,68,68,0.1); color: #DC2626; }
.sd-badge-blue { background: rgba(4,110,242,0.1); color: #046EF2; }
.sd-badge-gray { background: rgba(0,0,0,0.06); color: #6B7280; }
.sd-badge-purple { background: rgba(124,58,237,0.1); color: #7C3AED; }

/* ── Buttons ── */
.sd-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 8px; font-size: 13px;
  font-weight: 600; cursor: pointer; transition: all 0.12s; border: none;
  font-family: 'Manrope', sans-serif;
}
.sd-btn-primary { background: #046EF2; color: #fff; }
.sd-btn-primary:hover { background: #0357C7; }
.sd-btn-secondary {
  background: transparent; color: #046EF2;
  border: 1px solid rgba(4,110,242,0.3);
}
.sd-btn-secondary:hover { background: rgba(4,110,242,0.08); }
.sd-btn-ghost {
  background: transparent; color: #8B8FA8;
  border: 1px solid rgba(0,0,0,0.1);
}
body.dark .sd-btn-ghost { border-color: rgba(255,255,255,0.1); }
.sd-btn-ghost:hover { background: rgba(0,0,0,0.04); color: #1A1D3B; }
body.dark .sd-btn-ghost:hover { background: rgba(255,255,255,0.04); color: #E8E8FF; }
.sd-btn-danger { background: rgba(239,68,68,0.1); color: #DC2626; }
.sd-btn-danger:hover { background: rgba(239,68,68,0.2); }
.sd-btn-sm { padding: 6px 12px; font-size: 12px; }
.sd-btn-lg { padding: 12px 24px; font-size: 15px; }
.sd-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Form elements ── */
.sd-form-group { margin-bottom: 16px; }
.sd-label {
  display: block; font-size: 12px; font-weight: 600;
  color: #8B8FA8; margin-bottom: 6px; letter-spacing: 0.02em;
}
.sd-input, .sd-select, .sd-textarea {
  width: 100%; padding: 10px 13px;
  border: 1px solid rgba(0,0,0,0.1); border-radius: 8px;
  font-size: 14px; font-weight: 500; color: #1A1D3B;
  background: #fff; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: 'Manrope', sans-serif;
}
body.dark .sd-input, body.dark .sd-select, body.dark .sd-textarea {
  background: #0D0D1F; color: #E8E8FF;
  border-color: rgba(255,255,255,0.1);
}
.sd-input:focus, .sd-select:focus, .sd-textarea:focus {
  border-color: #046EF2; box-shadow: 0 0 0 3px rgba(4,110,242,0.15);
}
.sd-input::placeholder, .sd-textarea::placeholder { color: #8B8FA8; }
.sd-textarea { resize: vertical; min-height: 100px; }

/* ── Donut chart labels ── */
.sd-donut-legend { display: flex; flex-direction: column; gap: 6px; }
.sd-donut-legend-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 500; color: #8B8FA8;
}
.sd-donut-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* ── Empty state ── */
.sd-empty {
  text-align: center; padding: 48px 24px;
  display: flex; flex-direction: column; align-items: center;
}
.sd-empty-icon { font-size: 40px; margin-bottom: 12px; }
.sd-empty-title {
  font-size: 15px; font-weight: 700; color: #1A1D3B; margin-bottom: 6px;
}
body.dark .sd-empty-title { color: #E8E8FF; }
.sd-empty-text { font-size: 13px; color: #8B8FA8; margin-bottom: 20px; max-width: 280px; line-height: 1.6; }

/* ── Loading skeleton ── */
@keyframes sd-shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: calc(400px + 100%) 0; }
}
.sd-skeleton {
  background: linear-gradient(90deg,rgba(0,0,0,0.06) 25%,rgba(0,0,0,0.02) 50%,rgba(0,0,0,0.06) 75%);
  background-size: 800px 100%;
  animation: sd-shimmer 1.4s ease infinite;
  border-radius: 6px;
}
body.dark .sd-skeleton {
  background: linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.02) 50%,rgba(255,255,255,0.06) 75%);
  background-size: 800px 100%;
}

/* ── Progress bars ── */
.sd-progress-bar {
  height: 6px; background: rgba(0,0,0,0.08); border-radius: 100px; overflow: hidden;
}
body.dark .sd-progress-bar { background: rgba(255,255,255,0.08); }
.sd-progress-fill {
  height: 100%; border-radius: 100px;
  transition: width 0.5s ease;
  background: #046EF2;
}
.sd-progress-fill.warning { background: #F59E0B; }
.sd-progress-fill.danger { background: #EF4444; }
.sd-progress-fill.success { background: #22C55E; }

/* ── Tabs ── */
.sd-tabs {
  display: flex; gap: 2px; background: rgba(0,0,0,0.05);
  padding: 3px; border-radius: 8px; margin-bottom: 16px;
}
body.dark .sd-tabs { background: rgba(255,255,255,0.05); }
.sd-tab {
  flex: 1; padding: 7px 12px; border-radius: 6px;
  font-size: 12px; font-weight: 600; color: #8B8FA8;
  background: transparent; border: none; cursor: pointer;
  transition: all 0.12s; text-align: center;
}
.sd-tab.active {
  background: #fff; color: #1A1D3B;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
body.dark .sd-tab.active { background: #1A1A2E; color: #E8E8FF; }

/* ── Overlay (mobile sidebar) ── */
.sd-overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,0.5); z-index: 49;
}

/* ── Upload zone ── */
.sd-upload-zone {
  border: 2px dashed rgba(4,110,242,0.3); border-radius: 10px;
  padding: 32px; text-align: center; cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.sd-upload-zone:hover {
  border-color: #046EF2; background: rgba(4,110,242,0.04);
}

/* ── Color picker ── */
.sd-color-swatches { display: flex; gap: 8px; flex-wrap: wrap; }
.sd-color-swatch {
  width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
  border: 3px solid transparent; transition: border-color 0.12s;
}
.sd-color-swatch.selected { border-color: #1A1D3B; }
body.dark .sd-color-swatch.selected { border-color: #E8E8FF; }

/* ── Chat UI ── */
.sd-chat-root {
  display: flex; height: 100%; gap: 0;
  background: #fff; border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden;
}
body.dark .sd-chat-root { background: #1A1A2E; }
.sd-chat-list {
  width: 260px; border-right: 1px solid rgba(0,0,0,0.06);
  overflow-y: auto; flex-shrink: 0;
}
body.dark .sd-chat-list { border-right-color: rgba(255,255,255,0.06); }
.sd-chat-list-head {
  padding: 14px 14px 10px; font-size: 14px; font-weight: 700;
  color: #1A1D3B; border-bottom: 1px solid rgba(0,0,0,0.06);
}
body.dark .sd-chat-list-head {
  color: #E8E8FF; border-bottom-color: rgba(255,255,255,0.06);
}
.sd-chat-item {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; cursor: pointer;
  transition: background 0.12s; border-bottom: 1px solid rgba(0,0,0,0.04);
}
body.dark .sd-chat-item { border-bottom-color: rgba(255,255,255,0.04); }
.sd-chat-item:hover, .sd-chat-item.active { background: rgba(4,110,242,0.06); }
.sd-chat-item-name {
  font-size: 13px; font-weight: 600; color: #1A1D3B; margin-bottom: 2px;
}
body.dark .sd-chat-item-name { color: #E8E8FF; }
.sd-chat-item-preview {
  font-size: 11px; color: #8B8FA8;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sd-chat-main { flex: 1; display: flex; flex-direction: column; }
.sd-chat-header {
  padding: 14px 16px; border-bottom: 1px solid rgba(0,0,0,0.06);
  display: flex; align-items: center; gap: 10px;
}
body.dark .sd-chat-header { border-bottom-color: rgba(255,255,255,0.06); }
.sd-chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.sd-msg {
  max-width: 70%; padding: 10px 14px; border-radius: 12px;
  font-size: 13px; line-height: 1.5; font-weight: 500;
}
.sd-msg-seller {
  align-self: flex-end; background: #046EF2; color: #fff;
  border-bottom-right-radius: 4px;
}
.sd-msg-customer {
  align-self: flex-start; background: rgba(0,0,0,0.06); color: #1A1D3B;
  border-bottom-left-radius: 4px;
}
body.dark .sd-msg-customer { background: rgba(255,255,255,0.08); color: #E8E8FF; }
.sd-chat-input-row {
  padding: 12px 14px; border-top: 1px solid rgba(0,0,0,0.06);
  display: flex; gap: 8px;
}
body.dark .sd-chat-input-row { border-top-color: rgba(255,255,255,0.06); }

/* ── Page header ── */
.sd-page-head {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 18px;
}
.sd-page-title {
  font-size: 18px; font-weight: 700; color: #1A1D3B;
  letter-spacing: -0.03em; font-family: 'Space Grotesk', sans-serif;
}
body.dark .sd-page-title { color: #E8E8FF; }
.sd-page-sub { font-size: 12px; color: #8B8FA8; margin-top: 2px; }

/* ── Info panel ── */
.sd-info-panel {
  padding: 14px 16px; border-radius: 10px;
  display: flex; gap: 12px; align-items: flex-start;
  margin-bottom: 16px;
}
.sd-info-panel.info {
  background: rgba(4,110,242,0.08); border: 1px solid rgba(4,110,242,0.2);
}
.sd-info-panel.warning {
  background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);
}
.sd-info-panel.success {
  background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2);
}
.sd-info-panel.danger {
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
}
.sd-info-text { font-size: 13px; color: #1A1D3B; font-weight: 500; line-height: 1.5; }
body.dark .sd-info-text { color: #E8E8FF; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .sd-sidebar {
    position: fixed; left: -220px; top: 0; bottom: 0;
  }
  .sd-sidebar.mobile-open { left: 0; box-shadow: 0 0 0 100vw rgba(0,0,0,0.4); }
  .sd-overlay { display: block; }
  .sd-hamburger { display: flex; }
  .sd-content { padding: 14px 16px; }
  .sd-topbar { padding: 0 16px; }
  .sd-stats-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .sd-stats-grid { grid-template-columns: 1fr; }
  .sd-chat-list { display: none; }
}

BEME_FILE_END

echo -e "  Writing src/pages/SellerDashboard.jsx..."
cat > 'src/pages/SellerDashboard.jsx' << 'BEME_FILE_END'
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "../hooks/useSellerAuth";
import { useChat } from "../hooks/useChat";
import "./SellerDashboard.css";

// Sub-pages
import DashboardHome         from "./dashboard/DashboardHome";
import DashboardProducts     from "./dashboard/DashboardProducts";
import DashboardOrders       from "./dashboard/DashboardOrders";
import DashboardCustomers    from "./dashboard/DashboardCustomers";
import DashboardChat         from "./dashboard/DashboardChat";
import DashboardMarketing    from "./dashboard/DashboardMarketing";
import DashboardAnalytics    from "./dashboard/DashboardAnalytics";
import DashboardSubscription from "./dashboard/DashboardSubscription";
import DashboardVerification from "./dashboard/DashboardVerification";
import DashboardAppearance   from "./dashboard/DashboardAppearance";
import DashboardWithdrawals  from "./dashboard/DashboardWithdrawals";

/* ── Icons ── */
function Icon({ path, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {path.split(" M").map((seg, i) => (
        <path key={i} d={(i === 0 ? "" : "M") + seg} />
      ))}
    </svg>
  );
}

const ICONS = {
  home:     "M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z M9 21V12h6v9",
  products: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
  orders:   "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  customers:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  chat:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  marketing:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  analytics:"M18 20V10 M12 20V4 M6 20v-6",
  wallet:   "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12h.01",
  paint:    "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z M13.5 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z M8.5 7.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z M17.5 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z M6.5 12.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  logout:   "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  menu:     "M3 12h18 M3 6h18 M3 18h18",
  close:    "M18 6L6 18 M6 6l12 12",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3",
  bell:     "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
};

/* ── Nav config ── */
const NAV = [
  { id: "home",         icon: "home",      label: "Analytics"    },
  { id: "products",     icon: "products",  label: "Products"     },
  { id: "orders",       icon: "orders",    label: "Orders"       },
  { id: "customers",    icon: "customers", label: "Customers"    },
  { id: "chat",         icon: "chat",      label: "Messages"     },
  { id: "marketing",    icon: "marketing", label: "Marketing"    },
  { id: "analytics",    icon: "analytics", label: "Analytics Pro" },
  { id: "withdrawals",  icon: "wallet",    label: "Withdrawals"  },
  { id: "appearance",   icon: "paint",     label: "Store Design" },
  { id: "verification", icon: "shield",    label: "Verification" },
  { id: "subscription", icon: "star",      label: "Subscription" },
];

const PLAN_COLORS = { basic: "#6B7280", standard: "#046EF2", pro: "#7C3AED" };

/* ── Sidebar ── */
function Sidebar({ activeTab, onNav, shop, plan, chatUnread, onClose, isMobile }) {
  const { logout }  = useAuth();
  const navigate    = useNavigate();
  const planColor   = PLAN_COLORS[plan] || "#046EF2";
  const planInitial = (shop?.shopName || "S")[0].toUpperCase();

  const handleLogout = async () => {
    await logout().catch(console.error);
    navigate("/");
  };

  return (
    <>
      {/* Brand */}
      <div className="sd-brand">
        <div className="sd-brand-icon">{planInitial}</div>
        <div className="sd-brand-info">
          <div className="sd-brand-name">{shop?.shopName || "My Store"}</div>
          <div className="sd-brand-plan">
            <div className="sd-plan-dot" style={{ background: planColor }} />
            {plan?.charAt(0).toUpperCase() + plan?.slice(1)} Plan
          </div>
        </div>
        {isMobile && (
          <button className="sd-hamburger" onClick={onClose} style={{ marginLeft: "auto" }}>
            <Icon path={ICONS.close} size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="sd-nav">
        {NAV.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`sd-nav-btn ${activeTab === id ? "active" : ""}`}
            onClick={() => { onNav(id); if (isMobile) onClose(); }}
          >
            <span className="sd-nav-icon">
              <Icon path={ICONS[icon]} size={16} />
            </span>
            <span className="sd-nav-label">{label}</span>
            {id === "chat" && chatUnread > 0 && (
              <span className="sd-nav-badge">{chatUnread > 99 ? "99+" : chatUnread}</span>
            )}
          </button>
        ))}

        <div className="sd-nav-divider" />
        <button className="sd-nav-btn" onClick={() => navigate("/")}>
          <span className="sd-nav-icon"><Icon path={ICONS.external} size={16} /></span>
          <span className="sd-nav-label">View Store</span>
        </button>
        <button className="sd-nav-btn" onClick={handleLogout}>
          <span className="sd-nav-icon"><Icon path={ICONS.logout} size={16} /></span>
          <span className="sd-nav-label">Sign Out</span>
        </button>
      </nav>

      {/* Support card */}
      <div className="sd-support">
        <div className="sd-support-title">Need help?</div>
        <div className="sd-support-text">Feel free to contact our support team anytime.</div>
        <button className="sd-support-btn" onClick={() => navigate("/support")}>
          Get support
        </button>
      </div>
    </>
  );
}

/* ── Main export ── */
export default function SellerDashboard() {
  const navigate    = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { isSeller, isSellerActive, shop, subscriptionPlan, loading: sellerLoading } = useSellerAuth();
  const { totalUnread } = useChat();

  const [mobileOpen, setMobileOpen] = useState(false);

  const activeTab = params.get("tab") || "home";

  const goTab = useCallback((tab) => {
    setParams({ tab }, { replace: true });
    window.scrollTo({ top: 0 });
  }, [setParams]);

  // Auth guards
  useEffect(() => {
    if (authLoading || sellerLoading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    if (!isSeller) { navigate("/get-a-store", { replace: true }); return; }
    if (!isSellerActive) { navigate("/subscription-success?status=pending", { replace: true }); return; }
  }, [user, isSeller, isSellerActive, authLoading, sellerLoading, navigate]);

  if (authLoading || sellerLoading) {
    return (
      <div className="sd-root" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 14, color: "#8B8FA8" }}>Loading your dashboard…</div>
      </div>
    );
  }

  if (!user || !isSeller || !isSellerActive) return null;

  const TAB_TITLES = {
    home: "Analytics", products: "Products", orders: "Orders",
    customers: "Customers", chat: "Messages", marketing: "Marketing",
    analytics: "Analytics Pro", withdrawals: "Withdrawals",
    appearance: "Store Design", verification: "Verification",
    subscription: "Subscription",
  };

  const PAGE_MAP = {
    home:         <DashboardHome />,
    products:     <DashboardProducts />,
    orders:       <DashboardOrders />,
    customers:    <DashboardCustomers />,
    chat:         <DashboardChat />,
    marketing:    <DashboardMarketing />,
    analytics:    <DashboardAnalytics />,
    withdrawals:  <DashboardWithdrawals />,
    appearance:   <DashboardAppearance />,
    verification: <DashboardVerification />,
    subscription: <DashboardSubscription />,
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GH", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="sd-root">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sd-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sd-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <Sidebar
          activeTab={activeTab}
          onNav={goTab}
          shop={shop}
          plan={subscriptionPlan}
          chatUnread={totalUnread}
          onClose={() => setMobileOpen(false)}
          isMobile={mobileOpen}
        />
      </aside>

      {/* Main */}
      <div className="sd-main">
        {/* Topbar */}
        <header className="sd-topbar">
          <div className="sd-topbar-left">
            <button className="sd-hamburger" onClick={() => setMobileOpen(true)}>
              <Icon path={ICONS.menu} size={22} color="#8B8FA8" />
            </button>
            <div className="sd-topbar-title">{TAB_TITLES[activeTab] || "Dashboard"}</div>
          </div>
          <div className="sd-topbar-right">
            <span className="sd-topbar-date">
              <Icon path="M8 2v3 M16 2v3 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" size={13} color="#8B8FA8" />
              {dateStr}
            </span>
            <button className="sd-avatar-btn" title={user?.displayName || user?.email}>
              {(user?.displayName || user?.email || "S")[0].toUpperCase()}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="sd-content">
          {PAGE_MAP[activeTab] || <DashboardHome />}
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/SellerPolicy.jsx..."
cat > 'src/pages/SellerPolicy.jsx' << 'BEME_FILE_END'
// src/pages/SellerPolicy.jsx
import "./LegalPage.css";

export default function SellerPolicy() {
  return (
    <div className="legal-root">
      <div className="legal-container">
        <div className="legal-header">
          <div className="legal-badge">Policy</div>
          <h1 className="legal-title">Seller Policy</h1>
          <p className="legal-meta">Effective: January 1, 2025 · Beme Market Ghana</p>
        </div>
        <div className="legal-intro">
          This Seller Policy outlines the specific rules, standards, and expectations for all sellers on Beme Market. These rules exist to protect buyers, sellers, and the integrity of the platform.
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Product Standards</h2>
          <div className="legal-section-body">
            <p>All products listed on Beme Market must meet the following standards:</p>
            <ul>
              <li><strong>Authenticity:</strong> Only sell genuine products. Counterfeit, replica, or fake branded goods are strictly prohibited and will result in immediate suspension.</li>
              <li><strong>Accurate Descriptions:</strong> Product titles, descriptions, and photos must accurately represent the item. Do not exaggerate quality, size, or features.</li>
              <li><strong>Original Photos:</strong> Use your own product photos wherever possible. If using stock images, they must accurately represent the actual product you are selling.</li>
              <li><strong>Condition:</strong> Clearly state whether products are new, used, refurbished, or second-hand. Any defects must be disclosed in the product description.</li>
              <li><strong>Pricing:</strong> Prices must be fair and consistent. Price gouging during high-demand periods may result in listing removal.</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Order Fulfillment Standards</h2>
          <div className="legal-section-body">
            <ul>
              <li>Process orders within your stated processing time (default: 2 business days)</li>
              <li>Communicate promptly with customers regarding order status</li>
              <li>Package items securely to prevent damage during delivery</li>
              <li>Provide tracking information where available</li>
              <li>Honor your return and refund policies as stated on your store</li>
              <li>Resolve disputes professionally and in good faith</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Customer Service Standards</h2>
          <div className="legal-section-body">
            <ul>
              <li>Respond to customer messages within 24 hours during business days</li>
              <li>Communicate professionally and respectfully at all times</li>
              <li>Do not harass, threaten, or pressure customers</li>
              <li>Do not request personal financial information from customers</li>
              <li>Honor commitments made to customers (delivery dates, refunds, replacements)</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Prohibited Seller Activities</h2>
          <div className="legal-section-body">
            <div className="legal-warning">⚠️ Any of the following will result in immediate permanent ban:</div>
            <ul>
              <li>Accepting payment without delivering products (scamming customers)</li>
              <li>Delivering products significantly different from what was advertised</li>
              <li>Using multiple accounts to circumvent bans</li>
              <li>Manipulating or purchasing fake reviews</li>
              <li>Directing customers to transact off-platform after initial contact</li>
              <li>Sharing or selling customer data</li>
              <li>Operating a store on behalf of a banned seller</li>
              <li>Engaging in any form of discrimination against customers</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <h2 className="legal-section-title">Performance Metrics</h2>
          <div className="legal-section-body">
            <p>Beme Market monitors seller performance. Accounts may be restricted or suspended if:</p>
            <ul>
              <li>Order cancellation rate exceeds 10%</li>
              <li>Customer complaint rate exceeds 5%</li>
              <li>Average response time exceeds 48 hours over 30 days</li>
              <li>Chargeback rate exceeds 2% of monthly transactions</li>
              <li>Multiple verified reports of undelivered items</li>
            </ul>
          </div>
        </div>

        <div className="legal-footer-note">
          Policy questions? Email <a href="mailto:sellers@beme.market">sellers@beme.market</a>
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/SellerTerms.jsx..."
cat > 'src/pages/SellerTerms.jsx' << 'BEME_FILE_END'
import "./LegalPage.css";

export default function SellerTerms() {
  return (
    <div className="legal-root">
      <div className="legal-container">
        <div className="legal-header">
          <div className="legal-badge">Legal</div>
          <h1 className="legal-title">Seller Terms & Conditions</h1>
          <p className="legal-meta">Effective: January 1, 2025 · Beme Market Ghana</p>
        </div>

        <div className="legal-intro">
          By creating a seller account, listing products, or accepting orders on Beme Market, you agree to be legally bound by these Seller Terms & Conditions. Read them carefully. If you do not agree, do not proceed with seller registration.
        </div>

        <Section title="1. Eligibility & Account Requirements">
          <p>To sell on Beme Market, you must: (a) be at least 18 years old or have parental consent; (b) be a resident of Ghana or legally authorized to conduct business in Ghana; (c) provide accurate registration information; (d) have a valid Mobile Money account or Ghanaian bank account for receiving payments.</p>
          <p>You are responsible for maintaining the security of your seller account. Any activity conducted through your account is your responsibility. Report unauthorized access immediately to <a href="mailto:support@beme.market">support@beme.market</a>.</p>
        </Section>

        <Section title="2. Subscription Plans & Fees">
          <p>Beme Market offers three subscription tiers:</p>
          <ul>
            <li><strong>Basic (Free):</strong> 25 products maximum. No monthly fee. Basic features only.</li>
            <li><strong>Standard (GHS 99/month):</strong> 500 products. Live chat, boosts, discount codes, verified badge eligibility.</li>
            <li><strong>Pro (GHS 249/month):</strong> Unlimited products. All Standard features plus AI tools, custom domain, loyalty system, Pro verified badge.</li>
          </ul>
          <p><strong>Payment:</strong> Subscription fees are charged monthly via Paystack. Accepted methods: MTN Mobile Money, Telecel, AirtelTigo, Visa, Mastercard.</p>
          <p><strong>Non-refundable:</strong> Subscription fees are non-refundable. Once payment is made, your plan is activated for 30 days regardless of usage.</p>
          <p><strong>Grace Period:</strong> If renewal payment fails, a 7-day grace period applies during which your store remains visible. After 7 days without renewal, your store is suspended and product listings are hidden.</p>
          <p><strong>Reactivation:</strong> Suspended stores can be reactivated by renewing the subscription payment.</p>
        </Section>

        <Section title="3. Prohibited Products & Listings">
          <div className="legal-warning">⚠️ Violation of these rules results in immediate store suspension and possible legal referral.</div>
          <p>The following are <strong>strictly prohibited</strong> on Beme Market:</p>
          <ul>
            <li>Counterfeit, replica, or fake branded goods (fake Nike, Louis Vuitton, iPhone, etc.)</li>
            <li>Stolen property or goods obtained through theft or fraud</li>
            <li>Illegal drugs, controlled substances, or drug paraphernalia</li>
            <li>Weapons, ammunition, or explosive materials</li>
            <li>Pornographic or sexually explicit content</li>
            <li>Human organs, body parts, or any form of human trafficking</li>
            <li>Pirated software, movies, music, or digital content</li>
            <li>Products that violate intellectual property rights</li>
            <li>Alcohol sold to minors or without proper licensing</li>
            <li>Prescription medications without valid pharmacy licensing</li>
            <li>Animals traded illegally under wildlife laws</li>
            <li>Gambling services or lottery products</li>
            <li>Products making false health claims or miracle cures</li>
            <li>Any product whose sale is prohibited under Ghanaian law</li>
          </ul>
        </Section>

        <Section title="4. Seller Conduct & Responsibilities">
          <p>As a seller on Beme Market, you agree to:</p>
          <ul>
            <li>Accurately describe all products including condition, size, material, and any defects</li>
            <li>Use only your own product photos or properly licensed images</li>
            <li>Fulfill orders within the stated processing time</li>
            <li>Communicate professionally with all customers</li>
            <li>Honor your stated return and refund policies</li>
            <li>Not engage in price manipulation or artificial inflation</li>
            <li>Not use fake reviews, review manipulation, or incentivized reviews without disclosure</li>
            <li>Not create multiple seller accounts to evade bans or gain unfair advantage</li>
            <li>Not misrepresent your location, credentials, or business identity</li>
            <li>Not conduct transactions off-platform to avoid fees after initial contact through Beme Market</li>
          </ul>
        </Section>

        <Section title="5. Fraud & Scam Prevention">
          <p>Beme Market employs multiple fraud detection systems. The following activities constitute fraud and will result in immediate suspension and possible criminal referral:</p>
          <ul>
            <li>Receiving payment and not delivering products</li>
            <li>Sending significantly different products from what was advertised</li>
            <li>Using forged or stolen identity documents for verification</li>
            <li>Creating fake orders to inflate your own ratings</li>
            <li>Chargebacks fraud or unauthorized payment reversals</li>
            <li>Phishing customers for personal or financial information</li>
            <li>Impersonating Beme Market staff</li>
            <li>Money laundering or using the platform for illegal fund transfers</li>
          </ul>
          <p>Beme Market cooperates fully with Ghana Police Service, Ghana Revenue Authority, and other regulatory bodies in fraud investigations.</p>
        </Section>

        <Section title="6. Payouts & Withdrawals">
          <p><strong>Minimum payout:</strong> GHS 50.00</p>
          <p><strong>Processing time:</strong> 1–3 business days after admin approval.</p>
          <p><strong>Methods:</strong> MTN Mobile Money, Telecel Cash, AirtelTigo Money, or Ghanaian bank transfer.</p>
          <p><strong>Accuracy:</strong> You are solely responsible for providing correct payment account details. Beme Market is not liable for payments sent to incorrect accounts based on details you provided.</p>
          <p><strong>Holds:</strong> Beme Market may hold payouts in the following circumstances: active disputes on your orders, suspected fraud, policy violations under investigation, or regulatory compliance requirements.</p>
          <p><strong>Fees:</strong> Beme Market reserves the right to deduct applicable platform fees, chargeback costs, or refund amounts from pending payouts.</p>
          <p><strong>Taxes:</strong> You are responsible for declaring and paying all applicable taxes on your income from Beme Market sales.</p>
        </Section>

        <Section title="7. Chargebacks & Disputes">
          <p>A chargeback occurs when a customer's bank reverses a payment. When a chargeback is filed against your store:</p>
          <ul>
            <li>The disputed amount is temporarily held from your balance</li>
            <li>You will be notified and asked to provide evidence (delivery proof, chat records, photos)</li>
            <li>Beme Market reviews the evidence and responds to the bank within required timeframes</li>
            <li>If the chargeback is found valid, the amount is refunded to the customer from your balance</li>
            <li>Excessive chargebacks (more than 2% of transactions) may result in store suspension</li>
          </ul>
          <p>Maintain delivery records, customer communications, and clear product descriptions to protect yourself in disputes.</p>
        </Section>

        <Section title="8. Store Verification">
          <p>Verification is optional but provides a trust badge on your store. To apply:</p>
          <ul>
            <li>Submit valid government-issued ID (Ghana Card, Passport, or Driver's License)</li>
            <li>Business registration documents (if applicable)</li>
            <li>A recent utility bill or bank statement (not older than 3 months)</li>
          </ul>
          <p><strong>Important:</strong> Submitting forged, altered, or fraudulent documents constitutes criminal fraud. All submitted documents are stored securely and reviewed by our trust & safety team. Verified status may be revoked if your conduct violates platform policies.</p>
        </Section>

        <Section title="9. Platform Rights & Enforcement">
          <p>Beme Market reserves the absolute right, without notice or liability, to:</p>
          <ul>
            <li><strong>Suspend or terminate</strong> any seller account for policy violations</li>
            <li><strong>Remove product listings</strong> that violate our prohibited items policy or contain inaccurate information</li>
            <li><strong>Freeze withdrawal requests</strong> pending fraud investigations</li>
            <li><strong>Reject or revoke</strong> verification applications</li>
            <li><strong>Limit</strong> selling privileges, payout amounts, or product quantities</li>
            <li><strong>Share seller information</strong> with law enforcement as required by law</li>
            <li><strong>Modify or remove</strong> product listings, pricing, or content that violates guidelines</li>
          </ul>
          <p>Beme Market's decisions on account actions are final. Appeals may be submitted to <a href="mailto:appeals@beme.market">appeals@beme.market</a> within 14 days of action.</p>
        </Section>

        <Section title="10. Intellectual Property">
          <p>You confirm that all product images, descriptions, and content you upload are owned by you or properly licensed. You grant Beme Market a non-exclusive, royalty-free license to use your product content for marketing and platform operations.</p>
          <p>Beme Market respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA). Copyright infringement claims can be filed at <a href="mailto:legal@beme.market">legal@beme.market</a>.</p>
        </Section>

        <Section title="11. Amendments">
          <p>Beme Market may update these terms at any time. Continued use of seller features after updates constitutes acceptance. Material changes will be communicated via email and in-platform notifications at least 14 days before taking effect.</p>
        </Section>

        <Section title="12. Governing Law">
          <p>These terms are governed by the laws of the Republic of Ghana. Disputes shall be resolved in Ghanaian courts. By agreeing to these terms, you consent to the exclusive jurisdiction of Ghanaian courts for any disputes arising from your use of Beme Market seller services.</p>
        </Section>

        <div className="legal-footer-note">
          Questions about these terms? Contact us at <a href="mailto:legal@beme.market">legal@beme.market</a> or visit our Help Center.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="legal-section">
      <h2 className="legal-section-title">{title}</h2>
      <div className="legal-section-body">{children}</div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/StoreOnboarding.css..."
cat > 'src/pages/StoreOnboarding.css' << 'BEME_FILE_END'
.so-root {
  min-height: 100vh;
  background: #F8F9FF;
  display: flex;
  flex-direction: column;
  font-family: 'Manrope', system-ui, sans-serif;
}

.so-header {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 24px;
  background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06);
  position: sticky; top: 0; z-index: 10;
}

.so-back {
  background: none; border: none; cursor: pointer;
  font-size: 14px; font-weight: 600; color: #8B8FA8;
  padding: 6px 10px; border-radius: 6px; transition: color 0.12s, background 0.12s;
  flex-shrink: 0;
}
.so-back:hover { color: #1A1D3B; background: rgba(0,0,0,0.04); }

.so-progress-bar {
  flex: 1; height: 6px; background: rgba(0,0,0,0.08); border-radius: 100px; overflow: hidden;
}
.so-progress-fill {
  height: 100%; background: #046EF2; border-radius: 100px; transition: width 0.3s ease;
}

.so-step-label {
  font-size: 12px; font-weight: 600; color: #8B8FA8; flex-shrink: 0;
}

.so-content {
  flex: 1; padding: 40px clamp(20px, 5vw, 80px);
  max-width: 960px; margin: 0 auto; width: 100%;
}

.so-intro { text-align: center; margin-bottom: 36px; }
.so-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(24px, 3vw, 36px); font-weight: 800;
  color: #111111; letter-spacing: -0.04em; margin-bottom: 10px;
}
.so-sub { font-size: 15px; color: #6B7280; max-width: 440px; margin: 0 auto; line-height: 1.6; }

.so-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 36px;
}

.so-card {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  padding: 20px 12px 16px; border-radius: 12px;
  border: 2px solid rgba(0,0,0,0.08); background: #fff;
  cursor: pointer; transition: all 0.15s; text-align: center;
}
.so-card:hover {
  border-color: rgba(4,110,242,0.3); background: rgba(4,110,242,0.03);
  transform: translateY(-2px); box-shadow: 0 4px 16px rgba(4,110,242,0.1);
}
.so-card-selected {
  border-color: #046EF2; background: rgba(4,110,242,0.06);
  box-shadow: 0 0 0 4px rgba(4,110,242,0.15);
}
.so-card-icon { font-size: 28px; margin-bottom: 10px; }
.so-card-label { font-size: 12px; font-weight: 700; color: #1A1D3B; margin-bottom: 4px; line-height: 1.3; }
.so-card-desc { font-size: 10px; color: #8B8FA8; line-height: 1.4; }
.so-card-check {
  position: absolute; top: 8px; right: 8px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #046EF2; color: #fff; font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}

.so-footer { text-align: center; }
.so-continue-btn {
  padding: 14px 40px; background: #046EF2; color: #fff;
  border: none; border-radius: 8px; font-size: 15px; font-weight: 700;
  cursor: pointer; transition: all 0.15s;
  font-family: 'Manrope', sans-serif;
}
.so-continue-btn:hover:not(:disabled) { background: #0357C7; transform: translateY(-1px); }
.so-continue-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.so-selected-label { margin-top: 12px; font-size: 13px; color: #046EF2; font-weight: 600; }

BEME_FILE_END

echo -e "  Writing src/pages/StoreOnboarding.jsx..."
cat > 'src/pages/StoreOnboarding.jsx' << 'BEME_FILE_END'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveApplicationStep } from "../services/storeService";
import "./StoreOnboarding.css";

const BUSINESS_TYPES = [
  { id: "fashion",     icon: "👗", label: "Fashion & Clothing",  desc: "Clothes, outfits, accessories"  },
  { id: "sneakers",    icon: "👟", label: "Sneakers & Footwear",  desc: "Shoes, boots, sandals"          },
  { id: "jewelry",     icon: "💍", label: "Jewelry & Accessories", desc: "Rings, necklaces, bracelets"   },
  { id: "cosmetics",   icon: "💄", label: "Perfumes & Cosmetics",  desc: "Makeup, fragrance, skincare"   },
  { id: "hair",        icon: "💇", label: "Hair & Beauty",          desc: "Wigs, extensions, salons"      },
  { id: "food",        icon: "🍔", label: "Food & Bakery",          desc: "Meals, snacks, pastries, drinks" },
  { id: "electronics", icon: "📱", label: "Phones & Electronics",  desc: "Gadgets, accessories, tech"    },
  { id: "home",        icon: "🏠", label: "Home & Living",          desc: "Furniture, decor, kitchenware" },
  { id: "arts",        icon: "🎨", label: "Creative Arts",          desc: "Paintings, crafts, photography" },
  { id: "digital",     icon: "💻", label: "Digital Products",       desc: "Templates, ebooks, courses"    },
  { id: "services",    icon: "🔧", label: "Services",               desc: "Repairs, cleaning, consulting" },
  { id: "health",      icon: "💪", label: "Health & Fitness",       desc: "Supplements, equipment, wellness" },
  { id: "handmade",    icon: "🧶", label: "Handmade Goods",         desc: "Kente, weaving, artisan crafts" },
  { id: "other",       icon: "📦", label: "Other",                   desc: "Anything else you sell"        },
];

export default function StoreOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selected, setSelected] = useState(null);
  const [saving, setSaving]     = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    if (!user) { navigate("/login?redirect=/store-onboarding"); return; }

    setSaving(true);
    try {
      await saveApplicationStep(user.uid, 1, { businessType: selected });
      navigate("/store-survey");
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="so-root">
      {/* Header */}
      <div className="so-header">
        <button className="so-back" onClick={() => navigate("/get-a-store")}>
          ← Back
        </button>
        <div className="so-progress-bar">
          <div className="so-progress-fill" style={{ width: "25%" }} />
        </div>
        <div className="so-step-label">Step 1 of 4</div>
      </div>

      {/* Content */}
      <div className="so-content">
        <div className="so-intro">
          <h1 className="so-title">What do you sell?</h1>
          <p className="so-sub">Choose the category that best describes your business. You can sell across multiple categories after setup.</p>
        </div>

        <div className="so-grid">
          {BUSINESS_TYPES.map((bt) => (
            <button
              key={bt.id}
              className={`so-card ${selected === bt.id ? "so-card-selected" : ""}`}
              onClick={() => setSelected(bt.id)}
            >
              <div className="so-card-icon">{bt.icon}</div>
              <div className="so-card-label">{bt.label}</div>
              <div className="so-card-desc">{bt.desc}</div>
              {selected === bt.id && <div className="so-card-check">✓</div>}
            </button>
          ))}
        </div>

        <div className="so-footer">
          <button
            className="so-continue-btn"
            disabled={!selected || saving}
            onClick={handleContinue}
          >
            {saving ? "Saving…" : "Continue →"}
          </button>
          {selected && (
            <div className="so-selected-label">
              Selected: {BUSINESS_TYPES.find((b) => b.id === selected)?.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/StorePlans.css..."
cat > 'src/pages/StorePlans.css' << 'BEME_FILE_END'
/* StorePlans.css */
.sp-root { min-height: 100vh; background: #F8F9FF; font-family: 'Manrope', system-ui, sans-serif; }
.sp-header { display: flex; align-items: center; gap: 16px; padding: 16px 24px; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); position: sticky; top: 0; z-index: 10; }
.sp-back { background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #8B8FA8; padding: 6px 10px; border-radius: 6px; transition: all 0.12s; }
.sp-back:hover { color: #1A1D3B; background: rgba(0,0,0,0.04); }
.sp-progress-bar { flex: 1; height: 6px; background: rgba(0,0,0,0.08); border-radius: 100px; overflow: hidden; }
.sp-progress-fill { height: 100%; background: #046EF2; border-radius: 100px; transition: width 0.4s ease; }
.sp-step-label { font-size: 12px; font-weight: 600; color: #8B8FA8; }
.sp-content { max-width: 900px; margin: 0 auto; padding: 48px 24px; }
.sp-intro { text-align: center; margin-bottom: 36px; }
.sp-title { font-family: 'Space Grotesk', sans-serif; font-size: clamp(24px, 3vw, 34px); font-weight: 800; color: #111111; letter-spacing: -0.04em; margin-bottom: 8px; }
.sp-sub { font-size: 15px; color: #6B7280; }
.sp-plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 28px; }
.sp-plan {
  padding: 24px; border: 2px solid rgba(0,0,0,0.08); border-radius: 16px;
  background: #fff; cursor: pointer; transition: all 0.15s; position: relative;
}
.sp-plan:hover { border-color: rgba(4,110,242,0.3); transform: translateY(-2px); }
.sp-plan-selected { border-color: #046EF2; box-shadow: 0 0 0 4px rgba(4,110,242,0.12); }
.sp-popular { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #111111; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 100px; white-space: nowrap; }
.sp-plan-name { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.sp-plan-price { margin-bottom: 18px; }
.sp-price-main { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 800; color: #111111; letter-spacing: -0.04em; }
.sp-price-unit { font-size: 13px; color: #6B7280; margin-left: 4px; }
.sp-features { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-direction: column; gap: 8px; }
.sp-features li { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.sp-selected-check { font-size: 12px; font-weight: 700; color: #046EF2; margin-top: 8px; }
.sp-terms-box { padding: 16px; background: #F8F9FF; border-radius: 10px; border: 1px solid rgba(0,0,0,0.08); margin-bottom: 20px; }
.sp-terms-check { display: flex; gap: 12px; align-items: flex-start; cursor: pointer; font-size: 13px; color: #374151; line-height: 1.6; }
.sp-terms-check a { color: #046EF2; }
.sp-error { color: #DC2626; font-size: 13px; margin-bottom: 16px; padding: 10px 14px; background: rgba(239,68,68,0.08); border-radius: 8px; }
.sp-cta { text-align: center; }
.sp-start-btn { width: 100%; max-width: 480px; padding: 16px; background: #046EF2; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: 'Manrope', sans-serif; }
.sp-start-btn:hover:not(:disabled) { background: #0357C7; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(4,110,242,0.3); }
.sp-start-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sp-secure-note { margin-top: 12px; font-size: 12px; color: #9CA3AF; }

BEME_FILE_END

echo -e "  Writing src/pages/StorePlans.jsx..."
cat > 'src/pages/StorePlans.jsx' << 'BEME_FILE_END'
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { initSubscriptionPayment, redirectToPaystack, activateFreeStore, PLAN_PRICES } from "../services/subscriptionService";
import { getApplicationDraft } from "../services/storeService";
import "./StorePlans.css";

const PLANS = [
  {
    id: "basic", name: "Basic", price: 0, label: "Free forever",
    color: "#6B7280", highlight: false,
    features: [
      { t: "25 products",          ok: true  },
      { t: "Basic storefront",     ok: true  },
      { t: "MoMo checkout",        ok: true  },
      { t: "Order management",     ok: true  },
      { t: "Basic analytics",      ok: true  },
      { t: "Live customer chat",   ok: false },
      { t: "Discount codes",       ok: false },
      { t: "Product boosts",       ok: false },
      { t: "Verified badge",       ok: false },
    ],
  },
  {
    id: "standard", name: "Standard", price: 99, label: "/month",
    color: "#046EF2", highlight: true,
    features: [
      { t: "500 products",         ok: true },
      { t: "Premium themes",       ok: true },
      { t: "Live customer chat",   ok: true },
      { t: "Discount codes",       ok: true },
      { t: "Featured boosts (5/mo)", ok: true },
      { t: "Verified badge eligible", ok: true },
      { t: "Advanced analytics",   ok: true },
      { t: "AI captions",          ok: false },
      { t: "Custom domain",        ok: false },
    ],
  },
  {
    id: "pro", name: "Pro", price: 249, label: "/month",
    color: "#7C3AED", highlight: false,
    features: [
      { t: "Unlimited products",   ok: true },
      { t: "Custom domain",        ok: true },
      { t: "AI captions & replies",ok: true },
      { t: "Live selling",         ok: true },
      { t: "20 boosts/month",      ok: true },
      { t: "Pro verified badge",   ok: true },
      { t: "Priority support",     ok: true },
      { t: "Loyalty & referrals",  ok: true },
      { t: "Homepage ranking",     ok: true },
    ],
  },
];

export default function StorePlans() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const { user }      = useAuth();

  const [selected, setSelected] = useState(params.get("plan") || "standard");
  const [agreed, setAgreed]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [appDraft, setAppDraft] = useState(null);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (user?.uid) {
      getApplicationDraft(user.uid).then(setAppDraft).catch(() => {});
    }
  }, [user?.uid]);

  const handleStart = async () => {
    if (!agreed) { setError("Please agree to the terms to continue."); return; }
    if (!user) { navigate("/login?redirect=/store-plans"); return; }
    setError(null);
    setLoading(true);
    try {
      const plan = PLANS.find((p) => p.id === selected);
      if (plan.price === 0) {
        // Free plan — activate directly
        await activateFreeStore({
          shopName:    appDraft?.step2?.shopName || "My Store",
          description: appDraft?.step2?.description || "",
          category:    appDraft?.step1?.businessType || "other",
          whatsapp:    appDraft?.step3?.whatsapp || "",
          instagram:   appDraft?.step3?.instagram || "",
          city:        appDraft?.step4?.city || "",
          region:      appDraft?.step4?.region || "",
          planId:      "basic",
        });
        navigate("/subscription-success?status=free");
      } else {
        const result = await initSubscriptionPayment({
          planId: selected,
          uid: user.uid,
          email: user.email,
          shopId: null,
        });
        if (result?.authorization_url) {
          redirectToPaystack(result.authorization_url);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to start subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const plan = PLANS.find((p) => p.id === selected);

  return (
    <div className="sp-root">
      <div className="sp-header">
        <button className="sp-back" onClick={() => navigate("/store-survey")}>← Back</button>
        <div className="sp-progress-bar"><div className="sp-progress-fill" style={{ width: "100%" }} /></div>
        <div className="sp-step-label">Step 4 of 4</div>
      </div>

      <div className="sp-content">
        <div className="sp-intro">
          <h1 className="sp-title">Choose Your Plan</h1>
          <p className="sp-sub">Start free, scale when ready. All plans include Ghana MoMo checkout.</p>
        </div>

        {/* Plan cards */}
        <div className="sp-plans-grid">
          {PLANS.map((p) => (
            <div key={p.id} className={`sp-plan ${selected === p.id ? "sp-plan-selected" : ""} ${p.highlight ? "sp-plan-highlight" : ""}`} onClick={() => setSelected(p.id)}>
              {p.highlight && <div className="sp-popular">Most Popular</div>}
              <div className="sp-plan-name" style={{ color: selected === p.id ? p.color : "#6B7280" }}>{p.name}</div>
              <div className="sp-plan-price">
                {p.price === 0
                  ? <span className="sp-price-main">Free</span>
                  : <><span className="sp-price-main">GHS {p.price}</span><span className="sp-price-unit">{p.label}</span></>
                }
              </div>
              <ul className="sp-features">
                {p.features.map((f) => (
                  <li key={f.t} style={{ color: f.ok ? "#1A1D3B" : "#C4C9D4" }}>
                    {f.ok
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    }
                    {f.t}
                  </li>
                ))}
              </ul>
              {selected === p.id && <div className="sp-selected-check">✓ Selected</div>}
            </div>
          ))}
        </div>

        {/* Terms agreement */}
        <div className="sp-terms-box">
          <label className="sp-terms-check">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <div>
              I agree to Beme Market's <a href="/seller-terms" target="_blank">Seller Terms & Conditions</a>, <a href="/seller-policy" target="_blank">Seller Policy</a>, and <a href="/privacy-policy" target="_blank">Privacy Policy</a>. I understand that subscriptions are non-refundable and that my store can be suspended for policy violations.
            </div>
          </label>
        </div>

        {error && <div className="sp-error">{error}</div>}

        {/* CTA */}
        <div className="sp-cta">
          <button className="sp-start-btn" onClick={handleStart} disabled={loading || !agreed}>
            {loading ? "Processing…"
              : plan?.price === 0 ? "Activate Free Store →"
              : `Pay GHS ${plan?.price}/mo with Paystack →`
            }
          </button>
          <div className="sp-secure-note">
            🔒 Secured by Paystack • MoMo, Visa, Mastercard accepted
          </div>
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/StoreSurvey.css..."
cat > 'src/pages/StoreSurvey.css' << 'BEME_FILE_END'
/* StoreSurvey.css */
.ss-root { min-height: 100vh; background: #F8F9FF; display: flex; flex-direction: column; font-family: 'Manrope', system-ui, sans-serif; }
.ss-header { display: flex; align-items: center; gap: 16px; padding: 16px 24px; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); position: sticky; top: 0; z-index: 10; }
.ss-back { background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #8B8FA8; padding: 6px 10px; border-radius: 6px; transition: all 0.12s; flex-shrink: 0; }
.ss-back:hover { color: #1A1D3B; background: rgba(0,0,0,0.04); }
.ss-progress-bar { flex: 1; height: 6px; background: rgba(0,0,0,0.08); border-radius: 100px; overflow: hidden; }
.ss-progress-fill { height: 100%; background: #046EF2; border-radius: 100px; transition: width 0.4s ease; }
.ss-step-label { font-size: 12px; font-weight: 600; color: #8B8FA8; flex-shrink: 0; }
.ss-content { max-width: 560px; margin: 0 auto; padding: 48px 24px; width: 100%; }
.ss-intro { margin-bottom: 32px; }
.ss-title { font-family: 'Space Grotesk', sans-serif; font-size: clamp(22px, 3vw, 30px); font-weight: 800; color: #111111; letter-spacing: -0.04em; margin-bottom: 8px; }
.ss-sub { font-size: 15px; color: #6B7280; line-height: 1.6; }
.ss-form { display: flex; flex-direction: column; gap: 4px; }
.ss-form-group { margin-bottom: 18px; }
.ss-label { display: block; font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 7px; letter-spacing: 0.02em; }
.ss-input, .ss-select, .ss-textarea {
  width: 100%; padding: 12px 14px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 8px;
  font-size: 14px; font-weight: 500; color: #111111; background: #fff; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s; font-family: 'Manrope', sans-serif; box-sizing: border-box;
}
.ss-input:focus, .ss-select:focus, .ss-textarea:focus { border-color: #046EF2; box-shadow: 0 0 0 3px rgba(4,110,242,0.15); }
.ss-textarea { resize: vertical; min-height: 100px; }
.ss-hint { font-size: 11px; color: #9CA3AF; margin-top: 5px; }
.ss-input-prefix-wrap { display: flex; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
.ss-prefix { padding: 12px 12px; background: #F8F9FF; color: #8B8FA8; font-size: 13px; font-weight: 600; border-right: 1px solid rgba(0,0,0,0.08); white-space: nowrap; }
.ss-input-prefix { border: none; border-radius: 0; box-shadow: none; flex: 1; }
.ss-input-prefix:focus { box-shadow: none; }
.ss-input-icon-wrap { position: relative; }
.ss-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 16px; }
.ss-input-icon { padding-left: 40px; }
.ss-radio-group { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.ss-radio { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: #111111; cursor: pointer; padding: 12px 14px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 8px; transition: all 0.12s; }
.ss-radio:has(input:checked) { border-color: #046EF2; background: rgba(4,110,242,0.06); }
.ss-checkbox { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #374151; cursor: pointer; line-height: 1.6; }
.ss-footer { margin-top: 32px; }
.ss-next-btn { width: 100%; padding: 14px; background: #046EF2; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: 'Manrope', sans-serif; }
.ss-next-btn:hover:not(:disabled) { background: #0357C7; }
.ss-next-btn:disabled { opacity: 0.4; cursor: not-allowed; }

BEME_FILE_END

echo -e "  Writing src/pages/StoreSurvey.jsx..."
cat > 'src/pages/StoreSurvey.jsx' << 'BEME_FILE_END'
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveApplicationStep, getApplicationDraft } from "../services/storeService";
import "./StoreSurvey.css";

const STEPS = [
  { id: 2, title: "Name Your Store",    sub: "Choose a name customers will remember." },
  { id: 3, title: "Connect Your Brand", sub: "Add your WhatsApp and social links."    },
  { id: 4, title: "Location & Hours",   sub: "Tell customers where you're based."     },
];

const REGIONS = ["Greater Accra","Ashanti","Western","Eastern","Central","Volta","Northern","Upper East","Upper West","Brong-Ahafo","Savannah","Ahafo","Bono East","North East","Oti","Western North"];

function Step2({ data, onChange }) {
  return (
    <div className="ss-form">
      <div className="ss-form-group">
        <label className="ss-label">Store Name *</label>
        <input className="ss-input" value={data.shopName || ""} onChange={(e) => onChange("shopName", e.target.value)} placeholder="e.g. Kente Kicks GH" maxLength={60} required />
        <div className="ss-hint">This is how customers will find you. Make it memorable.</div>
      </div>
      <div className="ss-form-group">
        <label className="ss-label">What makes your store unique? *</label>
        <textarea className="ss-textarea" value={data.description || ""} onChange={(e) => onChange("description", e.target.value)} placeholder="Tell potential customers why they should shop with you. Mention your specialties, quality guarantee, or what makes your products special…" rows={4} maxLength={500} />
        <div className="ss-hint">{(data.description || "").length}/500 characters</div>
      </div>
      <div className="ss-form-group">
        <label className="ss-label">Store Slug (URL)</label>
        <div className="ss-input-prefix-wrap">
          <span className="ss-prefix">beme.market/</span>
          <input className="ss-input ss-input-prefix" value={(data.shopName || "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")} readOnly placeholder="auto-generated" />
        </div>
        <div className="ss-hint">Your store URL — auto-generated from your store name.</div>
      </div>
    </div>
  );
}

function Step3({ data, onChange }) {
  return (
    <div className="ss-form">
      <div className="ss-form-group">
        <label className="ss-label">WhatsApp Business Number</label>
        <div className="ss-input-icon-wrap">
          <span className="ss-icon">📱</span>
          <input className="ss-input ss-input-icon" value={data.whatsapp || ""} onChange={(e) => onChange("whatsapp", e.target.value)} placeholder="+233 XX XXX XXXX" type="tel" />
        </div>
        <div className="ss-hint">Customers will contact you directly on WhatsApp for orders.</div>
      </div>
      <div className="ss-form-group">
        <label className="ss-label">Instagram Handle</label>
        <div className="ss-input-icon-wrap">
          <span className="ss-icon">📸</span>
          <input className="ss-input ss-input-icon" value={data.instagram || ""} onChange={(e) => onChange("instagram", e.target.value)} placeholder="@yourstorename" />
        </div>
      </div>
      <div className="ss-form-group">
        <label className="ss-label">TikTok Handle</label>
        <div className="ss-input-icon-wrap">
          <span className="ss-icon">🎵</span>
          <input className="ss-input ss-input-icon" value={data.tiktok || ""} onChange={(e) => onChange("tiktok", e.target.value)} placeholder="@yourstorename" />
        </div>
      </div>
      <div className="ss-form-group">
        <label className="ss-label">Website / Other Link</label>
        <input className="ss-input" value={data.website || ""} onChange={(e) => onChange("website", e.target.value)} placeholder="https://yourwebsite.com" type="url" />
      </div>
    </div>
  );
}

function Step4({ data, onChange }) {
  return (
    <div className="ss-form">
      <div className="ss-form-group">
        <label className="ss-label">City *</label>
        <input className="ss-input" value={data.city || ""} onChange={(e) => onChange("city", e.target.value)} placeholder="e.g. Accra, Kumasi, Takoradi" required />
      </div>
      <div className="ss-form-group">
        <label className="ss-label">Region *</label>
        <select className="ss-select" value={data.region || ""} onChange={(e) => onChange("region", e.target.value)} required>
          <option value="">Select your region</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="ss-form-group">
        <label className="ss-label">Do you offer delivery?</label>
        <div className="ss-radio-group">
          {[
            { v: "yes",    l: "Yes — I deliver to customers" },
            { v: "pickup", l: "Pickup only"                  },
            { v: "both",   l: "Both delivery & pickup"       },
          ].map(({ v, l }) => (
            <label key={v} className="ss-radio">
              <input type="radio" name="delivery" value={v} checked={data.delivery === v} onChange={() => onChange("delivery", v)} />
              {l}
            </label>
          ))}
        </div>
      </div>
      <div className="ss-form-group">
        <label className="ss-label">I agree to Beme Market's Seller Terms & Community Guidelines *</label>
        <label className="ss-checkbox">
          <input type="checkbox" checked={data.agreedToTerms || false} onChange={(e) => onChange("agreedToTerms", e.target.checked)} required />
          I have read and agree to the <a href="/seller-terms" target="_blank" style={{ color: "#046EF2" }}>Seller Terms</a>, <a href="/seller-policy" target="_blank" style={{ color: "#046EF2" }}>Seller Policy</a>, and <a href="/community-guidelines" target="_blank" style={{ color: "#046EF2" }}>Community Guidelines</a>. I confirm I will not sell counterfeit, illegal, or fraudulent products.
        </label>
      </div>
    </div>
  );
}

export default function StoreSurvey() {
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [currentStep, setCurrentStep] = useState(0); // 0 = step 2, 1 = step 3, 2 = step 4
  const [data, setData]   = useState({ shopName: "", description: "", whatsapp: "", instagram: "", tiktok: "", website: "", city: "", region: "", delivery: "both", agreedToTerms: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getApplicationDraft(user.uid).then((draft) => {
      if (draft?.step1) {}
      if (draft?.step2) setData((d) => ({ ...d, ...draft.step2 }));
      if (draft?.step3) setData((d) => ({ ...d, ...draft.step3 }));
      if (draft?.step4) setData((d) => ({ ...d, ...draft.step4 }));
    }).catch(console.error);
  }, [user?.uid]);

  const upd = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const step = STEPS[currentStep];
  const progress = ((currentStep + 2) / 5) * 100;

  const validate = () => {
    if (currentStep === 0 && !data.shopName.trim()) { alert("Store name is required."); return false; }
    if (currentStep === 0 && !data.description.trim()) { alert("Store description is required."); return false; }
    if (currentStep === 2 && !data.city.trim()) { alert("City is required."); return false; }
    if (currentStep === 2 && !data.region) { alert("Region is required."); return false; }
    if (currentStep === 2 && !data.agreedToTerms) { alert("You must agree to the Seller Terms to continue."); return false; }
    return true;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const stepNum = STEPS[currentStep].id;
      const stepData = currentStep === 0
        ? { shopName: data.shopName, description: data.description }
        : currentStep === 1
          ? { whatsapp: data.whatsapp, instagram: data.instagram, tiktok: data.tiktok, website: data.website }
          : { city: data.city, region: data.region, delivery: data.delivery, agreedToTerms: data.agreedToTerms };
      await saveApplicationStep(user.uid, stepNum, stepData);
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        navigate("/store-plans");
      }
    } catch (err) { alert("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  const STEP_COMPONENTS = [
    <Step2 data={data} onChange={upd} />,
    <Step3 data={data} onChange={upd} />,
    <Step4 data={data} onChange={upd} />,
  ];

  return (
    <div className="ss-root">
      <div className="ss-header">
        <button className="ss-back" onClick={() => currentStep === 0 ? navigate("/store-onboarding") : setCurrentStep((s) => s - 1)}>
          ← Back
        </button>
        <div className="ss-progress-bar">
          <div className="ss-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="ss-step-label">Step {step.id} of 4</div>
      </div>

      <div className="ss-content">
        <div className="ss-intro">
          <h1 className="ss-title">{step.title}</h1>
          <p className="ss-sub">{step.sub}</p>
        </div>

        {STEP_COMPONENTS[currentStep]}

        <div className="ss-footer">
          <button className="ss-next-btn" onClick={handleNext} disabled={saving}>
            {saving ? "Saving…" : currentStep < STEPS.length - 1 ? "Continue →" : "Choose Your Plan →"}
          </button>
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/SubscriptionSuccess.css..."
cat > 'src/pages/SubscriptionSuccess.css' << 'BEME_FILE_END'
/* SubscriptionSuccess.css */
.succ-root { min-height: 100vh; background: #F0F2FF; display: flex; align-items: center; justify-content: center; padding: 24px; font-family: 'Manrope', system-ui, sans-serif; position: relative; overflow: hidden; }
.succ-card { background: #fff; border-radius: 20px; padding: 48px 40px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.1); position: relative; z-index: 1; }
.succ-spinner { width: 48px; height: 48px; border: 3px solid rgba(4,110,242,0.2); border-top-color: #046EF2; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 24px; }
@keyframes spin { to { transform: rotate(360deg); } }
.succ-icon-wrap { margin-bottom: 24px; }
.succ-icon-circle { width: 72px; height: 72px; border-radius: 50%; background: #046EF2; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 8px 24px rgba(4,110,242,0.4); animation: pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes pop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.succ-title { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 800; color: #111111; letter-spacing: -0.04em; margin-bottom: 10px; }
.succ-sub { font-size: 15px; color: #6B7280; line-height: 1.6; margin-bottom: 24px; }
.succ-steps { display: flex; flex-direction: column; gap: 12px; text-align: left; margin-bottom: 24px; }
.succ-step-item { display: flex; align-items: center; gap: 12px; font-size: 14px; color: #374151; }
.succ-step-dot { width: 10px; height: 10px; border-radius: 50%; background: #046EF2; animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.succ-checklist { display: flex; flex-direction: column; gap: 10px; text-align: left; margin-bottom: 28px; }
.succ-check-item { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #374151; }
.succ-cta-btn { padding: 14px 32px; background: #046EF2; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: 'Manrope', sans-serif; }
.succ-cta-btn:hover { background: #0357C7; transform: translateY(-1px); }
.succ-support { margin-top: 16px; font-size: 13px; color: #9CA3AF; }
.succ-confetti { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
.succ-confetti-piece { position: absolute; width: 8px; height: 8px; border-radius: 2px; top: -10px; animation: fall 3s ease-in forwards; }
@keyframes fall { to { transform: translateY(100vh) rotate(720deg); opacity: 0; } }

BEME_FILE_END

echo -e "  Writing src/pages/SubscriptionSuccess.jsx..."
cat > 'src/pages/SubscriptionSuccess.jsx' << 'BEME_FILE_END'
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verifySubscriptionPayment } from "../services/subscriptionService";
import "./SubscriptionSuccess.css";

export default function SubscriptionSuccess() {
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const { user, refreshProfile } = useAuth();

  const reference = params.get("reference") || params.get("trxref");
  const status    = params.get("status"); // "free" | "pending" | null

  const [phase, setPhase]     = useState("verifying"); // "verifying" | "success" | "error"
  const [message, setMessage] = useState("Verifying your payment…");
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    let isMounted = true;
    const process = async () => {
      if (status === "free") {
        setPhase("success");
        setMessage("Your free store is ready!");
        await refreshProfile?.();
        return;
      }
      if (!reference) {
        setPhase("error");
        setMessage("No payment reference found. Please contact support.");
        return;
      }
      setMessage("Confirming payment with Paystack…");
      try {
        const result = await verifySubscriptionPayment(reference);
        if (!isMounted) return;
        if (result?.success) {
          setStoreName(result.shopName || "Your Store");
          setPhase("success");
          setMessage("Payment confirmed! Setting up your store…");
          await refreshProfile?.();
        } else {
          throw new Error(result?.error || "Verification failed.");
        }
      } catch (err) {
        if (!isMounted) return;
        setPhase("error");
        setMessage(err.message || "Something went wrong. Please contact support.");
      }
    };
    process();
    return () => { isMounted = false; };
  }, [reference, status]);

  const handleGoToDashboard = () => navigate("/seller-dashboard", { replace: true });

  return (
    <div className="succ-root">
      {/* Confetti effect (CSS only) */}
      {phase === "success" && (
        <div className="succ-confetti">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="succ-confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              background: ["#046EF2","#22C55E","#F59E0B","#7C3AED","#EF4444"][i % 5],
            }} />
          ))}
        </div>
      )}

      <div className="succ-card">
        {/* Phase: verifying */}
        {phase === "verifying" && (
          <>
            <div className="succ-spinner" />
            <h2 className="succ-title">Setting Up Your Store</h2>
            <p className="succ-sub">{message}</p>
            <div className="succ-steps">
              {["Confirming payment", "Creating your storefront", "Activating your account"].map((s, i) => (
                <div key={s} className="succ-step-item">
                  <div className="succ-step-dot succ-step-loading" style={{ animationDelay: `${i * 0.3}s` }} />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Phase: success */}
        {phase === "success" && (
          <>
            <div className="succ-icon-wrap">
              <div className="succ-icon-circle">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
            <h2 className="succ-title">Welcome to Beme Market! 🎉</h2>
            <p className="succ-sub">
              {storeName ? `${storeName} is now live!` : "Your store is live!"} Start adding products and sharing your store link with customers.
            </p>
            <div className="succ-checklist">
              {["Store created and activated","Payment confirmed","Seller dashboard ready","Products can be listed now"].map((c) => (
                <div key={c} className="succ-check-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {c}
                </div>
              ))}
            </div>
            <button className="succ-cta-btn" onClick={handleGoToDashboard}>
              Go to My Dashboard →
            </button>
            <div className="succ-support">
              Need help? <a href="/support" style={{ color: "#046EF2" }}>Contact support</a>
            </div>
          </>
        )}

        {/* Phase: error */}
        {phase === "error" && (
          <>
            <div className="succ-icon-wrap">
              <div className="succ-icon-circle" style={{ background: "#EF4444" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            </div>
            <h2 className="succ-title">Something Went Wrong</h2>
            <p className="succ-sub">{message}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button className="succ-cta-btn" style={{ background: "#EF4444" }} onClick={() => navigate("/store-plans")}>Try Again</button>
              <button className="succ-cta-btn" style={{ background: "rgba(0,0,0,0.08)", color: "#111" }} onClick={() => navigate("/support")}>Contact Support</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/admin/AdminSeller.css..."
cat > 'src/pages/admin/AdminSeller.css' << 'BEME_FILE_END'
/* AdminSeller.css — shared styles for PayoutRequests, VerificationRequests, StoreModeration */
.as-root { padding: 28px; font-family: 'Manrope', system-ui, sans-serif; min-height: 100vh; background: var(--bg, #F0F2FF); }
body.dark .as-root { background: #0D0D1F; }

.as-topbar {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
}
.as-title {
  font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 800;
  color: var(--text, #111111); letter-spacing: -0.03em;
}
body.dark .as-title { color: #E8E8FF; }
.as-sub { font-size: 13px; color: #8B8FA8; margin-top: 2px; }

.as-refresh-btn {
  padding: 8px 16px; border-radius: 8px; background: #fff; border: 1px solid rgba(0,0,0,0.1);
  font-size: 13px; font-weight: 600; cursor: pointer; color: #374151; transition: all 0.12s;
}
body.dark .as-refresh-btn { background: #1A1A2E; color: #E8E8FF; border-color: rgba(255,255,255,0.1); }
.as-refresh-btn:hover { background: #F8F9FF; }

.as-tabs {
  display: flex; gap: 4px; background: rgba(0,0,0,0.05); padding: 4px;
  border-radius: 10px; margin-bottom: 18px; flex-wrap: wrap;
}
body.dark .as-tabs { background: rgba(255,255,255,0.05); }
.as-tab {
  padding: 7px 14px; border-radius: 7px; border: none; cursor: pointer;
  font-size: 12px; font-weight: 600; color: #8B8FA8; background: transparent; transition: all 0.12s;
}
.as-tab.active { background: #fff; color: #046EF2; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
body.dark .as-tab.active { background: #1A1A2E; }

.as-panel {
  background: var(--card, #fff); border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;
  border: 1px solid rgba(0,0,0,0.06);
}
body.dark .as-panel { background: #1A1A2E; border-color: rgba(255,255,255,0.06); }

.as-table-wrap { overflow-x: auto; }
.as-table { width: 100%; border-collapse: collapse; }
.as-table th {
  font-size: 10px; font-weight: 700; color: #8B8FA8; text-transform: uppercase;
  letter-spacing: 0.08em; padding: 12px 16px; text-align: left;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
body.dark .as-table th { border-bottom-color: rgba(255,255,255,0.06); }
.as-table td {
  padding: 14px 16px; font-size: 13px; color: var(--text, #111111);
  border-bottom: 1px solid rgba(0,0,0,0.04); vertical-align: middle;
}
body.dark .as-table td { color: #E8E8FF; border-bottom-color: rgba(255,255,255,0.04); }
.as-table tr:last-child td { border-bottom: none; }

.as-badge {
  display: inline-flex; align-items: center; padding: 3px 10px;
  border-radius: 100px; font-size: 11px; font-weight: 700;
}
.as-badge-yellow { background: rgba(245,158,11,0.1); color: #D97706; }
.as-badge-green  { background: rgba(34,197,94,0.1);  color: #16A34A; }
.as-badge-red    { background: rgba(239,68,68,0.1);  color: #DC2626; }
.as-badge-blue   { background: rgba(4,110,242,0.1);  color: #046EF2; }
.as-badge-gray   { background: rgba(0,0,0,0.06);     color: #6B7280; }
.as-badge-purple { background: rgba(124,58,237,0.1); color: #7C3AED; }

.as-btn {
  padding: 7px 14px; border-radius: 7px; font-size: 12px; font-weight: 700;
  cursor: pointer; border: 1px solid rgba(0,0,0,0.1); background: #fff;
  color: #374151; transition: all 0.12s; font-family: 'Manrope', sans-serif;
}
body.dark .as-btn { background: #1A1A2E; color: #E8E8FF; border-color: rgba(255,255,255,0.1); }
.as-btn:hover { background: #F8F9FF; }
.as-btn-green { background: rgba(34,197,94,0.1); color: #16A34A; border-color: transparent; }
.as-btn-green:hover { background: rgba(34,197,94,0.2); }
.as-btn-red { background: rgba(239,68,68,0.1); color: #DC2626; border-color: transparent; }
.as-btn-red:hover { background: rgba(239,68,68,0.2); }
.as-btn-blue { background: rgba(4,110,242,0.1); color: #046EF2; border-color: transparent; }
.as-btn-blue:hover { background: rgba(4,110,242,0.2); }
.as-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.as-muted { color: #8B8FA8; font-size: 12px; }
.as-muted-sm { color: #8B8FA8; font-size: 11px; margin-top: 2px; }
.as-empty { padding: 48px; text-align: center; color: #8B8FA8; font-size: 14px; }
.as-skeleton { background: linear-gradient(90deg,rgba(0,0,0,0.05) 25%,rgba(0,0,0,0.02) 50%,rgba(0,0,0,0.05) 75%); background-size: 800px 100%; animation: as-shimmer 1.4s ease infinite; border-radius: 8px; margin: 0 16px; }
@keyframes as-shimmer { 0% { background-position: -400px 0; } 100% { background-position: calc(400px + 100%) 0; } }

.as-textarea {
  width: 100%; padding: 10px 12px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 8px;
  font-size: 13px; color: #111111; font-family: 'Manrope', sans-serif;
  outline: none; resize: vertical; box-sizing: border-box;
}
.as-textarea:focus { border-color: #046EF2; box-shadow: 0 0 0 3px rgba(4,110,242,0.1); }

.as-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 16px; }
.as-modal { background: #fff; border-radius: 16px; padding: 28px; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
body.dark .as-modal { background: #1A1A2E; }
.as-modal h3 { font-family: 'Space Grotesk', sans-serif; font-size: 17px; font-weight: 700; color: #111111; margin-bottom: 12px; }
body.dark .as-modal h3 { color: #E8E8FF; }

.as-stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 18px; }
.as-stat-card { background: var(--card, #fff); border-radius: 12px; padding: 16px 18px; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
body.dark .as-stat-card { background: #1A1A2E; border-color: rgba(255,255,255,0.06); }
.as-stat-label { font-size: 11px; color: #8B8FA8; font-weight: 600; margin-bottom: 4px; }
.as-stat-val { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 800; color: #046EF2; letter-spacing: -0.04em; }

/* Search bar */
.as-search-row { display: flex; gap: 10px; margin-bottom: 16px; }
.as-search { flex: 1; padding: 10px 14px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 8px; font-size: 13px; font-family: 'Manrope', sans-serif; outline: none; color: #111111; }
body.dark .as-search { background: #0D0D1F; color: #E8E8FF; border-color: rgba(255,255,255,0.1); }
.as-search:focus { border-color: #046EF2; }

BEME_FILE_END

echo -e "  Writing src/pages/admin/PayoutRequests.jsx..."
cat > 'src/pages/admin/PayoutRequests.jsx' << 'BEME_FILE_END'
// ============================================================
// src/pages/admin/PayoutRequests.jsx
// Admin payout management — separate from existing AdminDashboard
// ============================================================
import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { approveWithdrawal, rejectWithdrawal } from "../../services/payoutService";
import "./AdminSeller.css";

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_BADGE = { pending: "as-badge-yellow", processing: "as-badge-blue", approved: "as-badge-blue", completed: "as-badge-green", rejected: "as-badge-red" };

export default function PayoutRequests() {
  const { user } = useAuth();
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("pending");
  const [processing, setProcessing] = useState(null);
  const [noteModal, setNoteModal]  = useState(null);
  const [note, setNote]            = useState("");

  const load = () => {
    setLoading(true);
    getDocs(query(collection(db, "withdrawalRequests"), orderBy("createdAt", "desc")))
      .then((snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const handleApprove = async (req) => {
    setProcessing(req.id);
    try {
      await approveWithdrawal(req.id, user.uid, note);
      load();
      setNoteModal(null);
      setNote("");
    } catch (err) { alert(err.message); }
    finally { setProcessing(null); }
  };

  const handleReject = async (req, reason) => {
    if (!reason?.trim()) { alert("Please provide a rejection reason."); return; }
    setProcessing(req.id);
    try {
      await rejectWithdrawal(req.id, user.uid, reason);
      load();
      setNoteModal(null);
      setNote("");
    } catch (err) { alert(err.message); }
    finally { setProcessing(null); }
  };

  const totals = { pending: requests.filter((r) => r.status === "pending").length, total: requests.reduce((s, r) => s + (r.amount || 0), 0) };

  return (
    <div className="as-root">
      <div className="as-topbar">
        <div>
          <div className="as-title">Payout Requests</div>
          <div className="as-sub">{totals.pending} pending • GHS {totals.total.toFixed(2)} all-time</div>
        </div>
        <button className="as-refresh-btn" onClick={load}>↺ Refresh</button>
      </div>

      {/* Tabs */}
      <div className="as-tabs">
        {["all","pending","approved","completed","rejected"].map((t) => (
          <button key={t} className={`as-tab ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} {t !== "all" && `(${requests.filter((r) => r.status === t).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="as-panel">
        {loading
          ? [1,2,3].map((i) => <div key={i} className="as-skeleton" style={{ height: 52, marginBottom: 10 }} />)
          : filtered.length === 0
            ? <div className="as-empty">No {filter === "all" ? "" : filter} payout requests</div>
            : (
              <div className="as-table-wrap">
                <table className="as-table">
                  <thead>
                    <tr><th>Date</th><th>Seller</th><th>Amount</th><th>Method</th><th>Account</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id}>
                        <td className="as-muted">{fmtDate(r.createdAt)}</td>
                        <td><div style={{ fontWeight: 600 }}>{r.accountName || "—"}</div><div className="as-muted-sm">{r.shopId}</div></td>
                        <td><strong>GHS {Number(r.amount || 0).toFixed(2)}</strong></td>
                        <td className="as-muted">{r.method === "momo" ? `MoMo · ${r.momoNetwork}` : `Bank · ${r.bankName}`}</td>
                        <td className="as-muted">{r.method === "momo" ? r.momoNumber : r.bankAccount}</td>
                        <td><span className={`as-badge ${STATUS_BADGE[r.status] || "as-badge-gray"}`}>{r.status}</span></td>
                        <td>
                          {r.status === "pending" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="as-btn as-btn-green" onClick={() => { setNoteModal({ req: r, action: "approve" }); setNote(""); }} disabled={processing === r.id}>Approve</button>
                              <button className="as-btn as-btn-red" onClick={() => { setNoteModal({ req: r, action: "reject" }); setNote(""); }} disabled={processing === r.id}>Reject</button>
                            </div>
                          )}
                          {r.adminNote && <div className="as-muted-sm" style={{ marginTop: 4 }}>Note: {r.adminNote}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Note modal */}
      {noteModal && (
        <div className="as-modal-backdrop">
          <div className="as-modal">
            <h3>{noteModal.action === "approve" ? "Approve" : "Reject"} Payout Request</h3>
            <div style={{ marginBottom: 14, fontSize: 14, color: "#374151" }}>
              <strong>GHS {Number(noteModal.req.amount || 0).toFixed(2)}</strong> → {noteModal.req.accountName}
              <br />{noteModal.req.method === "momo" ? `${noteModal.req.momoNetwork} · ${noteModal.req.momoNumber}` : `${noteModal.req.bankName} · ${noteModal.req.bankAccount}`}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>
                {noteModal.action === "approve" ? "Admin Note (optional)" : "Rejection Reason *"}
              </label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className="as-textarea" rows={3} placeholder={noteModal.action === "approve" ? "e.g. Payment sent via MoMo" : "e.g. Bank account details incorrect"} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="as-btn" onClick={() => setNoteModal(null)} style={{ flex: 1 }}>Cancel</button>
              <button className={`as-btn ${noteModal.action === "approve" ? "as-btn-green" : "as-btn-red"}`} style={{ flex: 2 }}
                onClick={() => noteModal.action === "approve" ? handleApprove(noteModal.req) : handleReject(noteModal.req, note)}>
                {processing ? "Processing…" : noteModal.action === "approve" ? "✓ Approve & Mark Sent" : "✗ Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/admin/StoreModeration.jsx..."
cat > 'src/pages/admin/StoreModeration.jsx' << 'BEME_FILE_END'
import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import "./AdminSeller.css";

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric" });
}

export default function StoreModeration() {
  const { user }  = useAuth();
  const [shops, setShops]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [modal, setModal]     = useState(null);
  const [reason, setReason]   = useState("");
  const [processing, setProcessing] = useState(false);

  const load = () => {
    setLoading(true);
    getDocs(query(collection(db, "shops"), orderBy("createdAt", "desc")))
      .then((snap) => setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = shops
    .filter((s) => filter === "all" || s.status === filter)
    .filter((s) => !search || s.shopName?.toLowerCase().includes(search.toLowerCase()) || s.ownerId?.includes(search));

  const handleAction = async (action) => {
    if (!modal) return;
    const needReason = ["suspend", "freeze"].includes(action);
    if (needReason && !reason.trim()) { alert("Please provide a reason."); return; }

    setProcessing(true);
    try {
      const updates = { updatedAt: serverTimestamp() };
      if (action === "suspend")   { updates.status = "suspended"; updates.suspensionReason = reason; updates.suspendedBy = user.uid; updates.suspendedAt = serverTimestamp(); }
      if (action === "activate")  { updates.status = "active"; updates.suspensionReason = null; }
      if (action === "freeze")    { updates.withdrawalsFrozen = true; updates.freezeReason = reason; updates.frozenBy = user.uid; }
      if (action === "unfreeze")  { updates.withdrawalsFrozen = false; updates.freezeReason = null; }
      if (action === "verify")    { updates.verified = true; updates.verifiedBadge = "verified"; }
      if (action === "unverify")  { updates.verified = false; updates.verifiedBadge = "none"; }

      await updateDoc(doc(db, "shops", modal.id), updates);

      // Also update user sellerStatus if suspending
      if (action === "suspend" && modal.ownerId) {
        await updateDoc(doc(db, "users", modal.ownerId), { sellerStatus: "suspended" });
      }
      if (action === "activate" && modal.ownerId) {
        await updateDoc(doc(db, "users", modal.ownerId), { sellerStatus: "active" });
      }

      // Log admin action
      const { addDoc } = await import("firebase/firestore");
      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid, action, target: "shop", targetId: modal.id,
        reason: reason || null, timestamp: serverTimestamp(),
      });

      load();
      setModal(null);
      setReason("");
    } catch (err) { alert(err.message); }
    finally { setProcessing(false); }
  };

  const stats = {
    total: shops.length,
    active: shops.filter((s) => s.status === "active").length,
    suspended: shops.filter((s) => s.status === "suspended").length,
    pending: shops.filter((s) => s.status === "pending").length,
  };

  return (
    <div className="as-root">
      <div className="as-topbar">
        <div>
          <div className="as-title">Store Moderation</div>
          <div className="as-sub">Manage all seller stores on the platform</div>
        </div>
        <button className="as-refresh-btn" onClick={load}>↺ Refresh</button>
      </div>

      {/* Stats */}
      <div className="as-stats-row">
        {[
          { l: "Total Stores",     v: stats.total,     c: "#046EF2" },
          { l: "Active",           v: stats.active,    c: "#22C55E" },
          { l: "Suspended",        v: stats.suspended, c: "#EF4444" },
          { l: "Pending Review",   v: stats.pending,   c: "#F59E0B" },
        ].map((s) => (
          <div key={s.l} className="as-stat-card">
            <div className="as-stat-label">{s.l}</div>
            <div className="as-stat-val" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="as-tabs">
        {["all","active","suspended","pending"].map((t) => (
          <button key={t} className={`as-tab ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === "all" ? shops.length : shops.filter((s) => s.status === t).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="as-search-row">
        <input className="as-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by store name or seller ID…" />
      </div>

      <div className="as-panel">
        {loading
          ? [1,2,3,4].map((i) => <div key={i} className="as-skeleton" style={{ height: 52, marginBottom: 10 }} />)
          : filtered.length === 0
            ? <div className="as-empty">No stores found</div>
            : (
              <div className="as-table-wrap">
                <table className="as-table">
                  <thead>
                    <tr><th>Store</th><th>Owner</th><th>Plan</th><th>Status</th><th>Verified</th><th>Created</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#F0F2FF", overflow: "hidden", flexShrink: 0 }}>
                              {s.logoUrl ? <img src={s.logoUrl} alt={s.shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏪</div>}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{s.shopName || "Unnamed Store"}</div>
                              <div className="as-muted-sm">{s.city || ""}{s.region ? `, ${s.region}` : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="as-muted">{s.ownerId?.slice(0, 8) || "—"}…</td>
                        <td>
                          <span className={`as-badge ${s.planId === "pro" ? "as-badge-purple" : s.planId === "standard" ? "as-badge-blue" : "as-badge-gray"}`}>
                            {s.planId || "basic"}
                          </span>
                        </td>
                        <td>
                          <span className={`as-badge ${s.status === "active" ? "as-badge-green" : s.status === "suspended" ? "as-badge-red" : "as-badge-yellow"}`}>
                            {s.status || "active"}
                          </span>
                          {s.withdrawalsFrozen && <span className="as-badge as-badge-red" style={{ marginLeft: 4 }}>Frozen</span>}
                        </td>
                        <td>
                          <span className={`as-badge ${s.verified ? "as-badge-green" : "as-badge-gray"}`}>
                            {s.verified ? `✓ ${s.verifiedBadge || "verified"}` : "Unverified"}
                          </span>
                        </td>
                        <td className="as-muted">{fmtDate(s.createdAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <button className="as-btn as-btn-blue" style={{ fontSize: 11 }} onClick={() => { setModal(s); setReason(""); }}>Manage</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Management modal */}
      {modal && (
        <div className="as-modal-backdrop">
          <div className="as-modal" style={{ maxWidth: 480 }}>
            <h3>Manage: {modal.shopName}</h3>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
              Status: <strong style={{ color: modal.status === "active" ? "#22C55E" : "#EF4444" }}>{modal.status}</strong>
              {" | "}Plan: <strong style={{ color: "#046EF2" }}>{modal.planId || "basic"}</strong>
              {" | "}Verified: <strong>{modal.verified ? "Yes" : "No"}</strong>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Action Reason</label>
              <textarea className="as-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for this action (required for suspend/freeze)…" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {modal.status !== "suspended"
                ? <button className="as-btn as-btn-red" onClick={() => handleAction("suspend")} disabled={processing || !reason.trim()}>🚫 Suspend Store</button>
                : <button className="as-btn as-btn-green" onClick={() => handleAction("activate")} disabled={processing}>✓ Reactivate</button>
              }
              {!modal.withdrawalsFrozen
                ? <button className="as-btn as-btn-red" onClick={() => handleAction("freeze")} disabled={processing || !reason.trim()}>❄️ Freeze Payouts</button>
                : <button className="as-btn as-btn-green" onClick={() => handleAction("unfreeze")} disabled={processing}>🔓 Unfreeze Payouts</button>
              }
              {!modal.verified
                ? <button className="as-btn as-btn-green" onClick={() => handleAction("verify")} disabled={processing}>✅ Grant Verification</button>
                : <button className="as-btn as-btn-red" onClick={() => handleAction("unverify")} disabled={processing}>❌ Remove Badge</button>
              }
            </div>
            <button className="as-btn" onClick={() => { setModal(null); setReason(""); }} style={{ width: "100%" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/admin/VerificationRequests.jsx..."
cat > 'src/pages/admin/VerificationRequests.jsx' << 'BEME_FILE_END'
// ============================================================
// src/pages/admin/VerificationRequests.jsx
// ============================================================
import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import "./AdminSeller.css";

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

export function VerificationRequests() {
  const { user } = useAuth();
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("pending");
  const [modal, setModal]           = useState(null);
  const [note, setNote]             = useState("");
  const [processing, setProcessing] = useState(false);

  const load = () => {
    setLoading(true);
    getDocs(query(collection(db, "verificationRequests"), orderBy("createdAt", "desc")))
      .then((snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const handleReview = async (action) => {
    if (!modal) return;
    if (action === "reject" && !note.trim()) { alert("Rejection reason is required."); return; }
    setProcessing(true);
    try {
      await updateDoc(doc(db, "verificationRequests", modal.id), {
        status: action === "approve" ? "approved" : "rejected",
        adminNote: note.trim() || null,
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
      });
      // Also update shop document if approving
      if (action === "approve" && modal.shopId) {
        await updateDoc(doc(db, "shops", modal.shopId), { verified: true, verifiedBadge: "verified" });
        await updateDoc(doc(db, "users", modal.sellerId), { sellerVerified: true });
      }
      load();
      setModal(null);
      setNote("");
    } catch (err) { alert(err.message); }
    finally { setProcessing(false); }
  };

  return (
    <div className="as-root">
      <div className="as-topbar">
        <div>
          <div className="as-title">Verification Requests</div>
          <div className="as-sub">{requests.filter((r) => r.status === "pending").length} pending reviews</div>
        </div>
        <button className="as-refresh-btn" onClick={load}>↺ Refresh</button>
      </div>

      <div className="as-tabs">
        {["all","pending","approved","rejected"].map((t) => (
          <button key={t} className={`as-tab ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === "all" ? requests.length : requests.filter((r) => r.status === t).length})
          </button>
        ))}
      </div>

      <div className="as-panel">
        {loading
          ? [1,2,3].map((i) => <div key={i} className="as-skeleton" style={{ height: 52, marginBottom: 10 }} />)
          : filtered.length === 0
            ? <div className="as-empty">No {filter === "all" ? "" : filter} verification requests</div>
            : (
              <div className="as-table-wrap">
                <table className="as-table">
                  <thead><tr><th>Date</th><th>Store</th><th>Business Type</th><th>Documents</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id}>
                        <td className="as-muted">{fmtDate(r.createdAt)}</td>
                        <td><div style={{ fontWeight: 600 }}>{r.shopName || "—"}</div><div className="as-muted-sm">{r.shopId}</div></td>
                        <td className="as-muted">{r.businessType || "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            {(r.documents || []).map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 6, background: "rgba(4,110,242,0.1)", color: "#046EF2", fontSize: 11, fontWeight: 700 }}>
                                Doc {i + 1} ↗
                              </a>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`as-badge ${r.status === "approved" ? "as-badge-green" : r.status === "rejected" ? "as-badge-red" : "as-badge-yellow"}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          {r.status === "pending" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="as-btn as-btn-green" onClick={() => { setModal(r); setNote(""); }}>Review</button>
                            </div>
                          )}
                          {r.adminNote && <div className="as-muted-sm">Note: {r.adminNote}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {modal && (
        <div className="as-modal-backdrop">
          <div className="as-modal" style={{ maxWidth: 500 }}>
            <h3>Review Verification — {modal.shopName}</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#8B8FA8", marginBottom: 8 }}>Documents submitted:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(modal.documents || []).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 8, background: "#F8F9FF", color: "#046EF2", fontSize: 13, fontWeight: 600, border: "1px solid rgba(4,110,242,0.2)" }}>
                    📄 Document {i + 1} ↗
                  </a>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Admin Note</label>
              <textarea className="as-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for approval or rejection…" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="as-btn" onClick={() => { setModal(null); setNote(""); }} style={{ flex: 1 }}>Cancel</button>
              <button className="as-btn as-btn-red" onClick={() => handleReview("reject")} disabled={processing} style={{ flex: 1 }}>✗ Reject</button>
              <button className="as-btn as-btn-green" onClick={() => handleReview("approve")} disabled={processing} style={{ flex: 1 }}>✓ Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerificationRequests;

BEME_FILE_END

echo -e "  Writing src/pages/dashboard/DashboardAnalytics.jsx..."
cat > 'src/pages/dashboard/DashboardAnalytics.jsx' << 'BEME_FILE_END'
import { useStoreAnalytics } from "../../hooks/useStoreAnalytics";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--card,#fff)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "#8B8FA8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name === "revenue" ? "GHS " : ""}{Number(p.value).toLocaleString()} {p.name !== "revenue" ? p.name : ""}
        </div>
      ))}
    </div>
  );
}

export default function DashboardAnalytics() {
  const { weekSeries, weekRevenue, weekOrders, weekVisitors, loading } = useStoreAnalytics();

  const totals = [
    { label: "Revenue (7d)", value: `GHS ${Number(weekRevenue || 0).toFixed(0)}`, color: "#046EF2" },
    { label: "Orders (7d)",  value: weekOrders,   color: "#22C55E" },
    { label: "Visitors (7d)", value: weekVisitors, color: "#7C3AED" },
    { label: "Conversion",   value: weekVisitors > 0 ? `${((weekOrders / weekVisitors) * 100).toFixed(1)}%` : "0%", color: "#F59E0B" },
  ];

  return (
    <div>
      <div className="sd-page-head">
        <div className="sd-page-title">Analytics</div>
        <div className="sd-page-sub">Last 7 days performance</div>
      </div>

      {/* Summary */}
      <div className="sd-stats-grid" style={{ marginBottom: 14 }}>
        {totals.map((t) => (
          <div key={t.label} className="sd-stat-card">
            <div className="sd-stat-label">{t.label}</div>
            {loading
              ? <div className="sd-skeleton" style={{ height: 28, width: "60%", marginTop: 8 }} />
              : <div className="sd-stat-value" style={{ color: t.color }}>{t.value}</div>
            }
          </div>
        ))}
      </div>

      {/* Revenue area chart */}
      <div className="sd-panel" style={{ marginBottom: 14 }}>
        <div className="sd-panel-head">
          <span className="sd-panel-title">Revenue Trend</span>
          <span className="sd-panel-sub">Daily revenue this week</span>
        </div>
        {loading
          ? <div className="sd-skeleton" style={{ height: 220 }} />
          : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weekSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#046EF2" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#046EF2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="label" stroke="transparent" tick={{ fontSize: 11, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fontSize: 11, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#046EF2" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 4, fill: "#046EF2" }} name="revenue" />
              </AreaChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* Orders + Visitors side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="sd-panel">
          <div className="sd-panel-head"><span className="sd-panel-title">Daily Orders</span></div>
          {loading ? <div className="sd-skeleton" style={{ height: 160 }} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekSeries} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barSize={20}>
                <XAxis dataKey="label" stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(34,197,94,0.05)" }} />
                <Bar dataKey="orders" fill="#22C55E" radius={[4, 4, 0, 0]} name="orders" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="sd-panel">
          <div className="sd-panel-head"><span className="sd-panel-title">Daily Visitors</span></div>
          {loading ? <div className="sd-skeleton" style={{ height: 160 }} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={weekSeries} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="visitors" stroke="#7C3AED" strokeWidth={2} fill="url(#visGrad)" dot={false} name="visitors" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/dashboard/DashboardAppearance.jsx..."
cat > 'src/pages/dashboard/DashboardAppearance.jsx' << 'BEME_FILE_END'
import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";
import { updateShop, uploadStoreImage } from "../../services/storeService";

const BRAND_COLORS = ["#046EF2","#7C3AED","#EF4444","#F59E0B","#22C55E","#EC4899","#06B6D4","#111111","#6B7280","#F97316"];

export default function DashboardAppearance() {
  const { user }          = useAuth();
  const { storeId, shop } = useSellerAuth();

  const [form, setForm]         = useState({ shopName: "", description: "", category: "", whatsapp: "", instagram: "", tiktok: "", primaryColor: "#046EF2", city: "", region: "" });
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [logoPreview, setLogoPreview]   = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    if (shop) {
      setForm({
        shopName:     shop.shopName     || "",
        description:  shop.description  || "",
        category:     shop.category     || "",
        whatsapp:     shop.whatsapp     || "",
        instagram:    shop.instagram    || "",
        tiktok:       shop.tiktok       || "",
        primaryColor: shop.primaryColor || "#046EF2",
        city:         shop.city         || "",
        region:       shop.region       || "",
      });
      if (shop.logoUrl)   setLogoPreview(shop.logoUrl);
      if (shop.bannerUrl) setBannerPreview(shop.bannerUrl);
    }
  }, [shop]);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (file) { setBannerFile(file); setBannerPreview(URL.createObjectURL(file)); }
  };

  const handleSave = async () => {
    if (!storeId || !user?.uid) return;
    setSaving(true);
    try {
      const updates = { ...form };
      if (logoFile)   updates.logoUrl   = await uploadStoreImage(user.uid, logoFile,   "logo");
      if (bannerFile) updates.bannerUrl = await uploadStoreImage(user.uid, bannerFile, "banner");
      await updateShop(storeId, updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const REGIONS = ["Greater Accra","Ashanti","Western","Eastern","Central","Volta","Northern","Upper East","Upper West","Brong-Ahafo","Savannah","Ahafo","Bono East","North East","Oti","Western North"];

  return (
    <div>
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Store Design</div>
          <div className="sd-page-sub">Customise your storefront look and contact info</div>
        </div>
        <button className="sd-btn sd-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14 }}>
        {/* Left — Main form */}
        <div>
          {/* Logo & Banner */}
          <div className="sd-panel" style={{ marginBottom: 14 }}>
            <div className="sd-panel-title" style={{ marginBottom: 14 }}>Store Media</div>

            {/* Banner */}
            <div style={{ marginBottom: 16 }}>
              <label className="sd-label">Store Banner</label>
              <div style={{ position: "relative", height: 140, borderRadius: 10, overflow: "hidden", background: "#F0F2FF", cursor: "pointer", border: "1px dashed rgba(4,110,242,0.3)" }} onClick={() => document.getElementById("banner-file").click()}>
                {bannerPreview
                  ? <img src={bannerPreview} alt="banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#8B8FA8" }}>
                      <span style={{ fontSize: 24, marginBottom: 6 }}>🖼️</span>
                      <span style={{ fontSize: 12 }}>Click to upload banner (16:9 recommended)</span>
                    </div>
                }
              </div>
              <input type="file" id="banner-file" accept="image/*" style={{ display: "none" }} onChange={handleBannerChange} />
            </div>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", background: "#F0F2FF", border: "1px dashed rgba(4,110,242,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} onClick={() => document.getElementById("logo-file").click()}>
                {logoPreview
                  ? <img src={logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 28 }}>🏪</span>
                }
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1D3B", marginBottom: 4 }}>Store Logo</div>
                <div style={{ fontSize: 12, color: "#8B8FA8", marginBottom: 8 }}>Square image, at least 200×200px</div>
                <button className="sd-btn sd-btn-ghost sd-btn-sm" onClick={() => document.getElementById("logo-file").click()}>Upload Logo</button>
              </div>
              <input type="file" id="logo-file" accept="image/*" style={{ display: "none" }} onChange={handleLogoChange} />
            </div>
          </div>

          {/* Store info */}
          <div className="sd-panel" style={{ marginBottom: 14 }}>
            <div className="sd-panel-title" style={{ marginBottom: 14 }}>Store Information</div>
            <div className="sd-form-group">
              <label className="sd-label">Store Name</label>
              <input className="sd-input" value={form.shopName} onChange={upd("shopName")} placeholder="e.g. Kente Kicks GH" maxLength={60} />
            </div>
            <div className="sd-form-group">
              <label className="sd-label">Store Description</label>
              <textarea className="sd-textarea sd-input" value={form.description} onChange={upd("description")} placeholder="Tell customers what you sell and why they should shop with you…" rows={3} maxLength={500} />
              <div style={{ fontSize: 11, color: "#8B8FA8", marginTop: 4 }}>{form.description.length}/500</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="sd-form-group">
                <label className="sd-label">City</label>
                <input className="sd-input" value={form.city} onChange={upd("city")} placeholder="e.g. Accra" />
              </div>
              <div className="sd-form-group">
                <label className="sd-label">Region</label>
                <select className="sd-select sd-input" value={form.region} onChange={upd("region")}>
                  <option value="">Select region</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Social/Contact */}
          <div className="sd-panel">
            <div className="sd-panel-title" style={{ marginBottom: 14 }}>Contact & Social Links</div>
            {[
              { key: "whatsapp", label: "WhatsApp Number", placeholder: "+233 XX XXX XXXX", icon: "📱" },
              { key: "instagram", label: "Instagram Handle", placeholder: "@yourstorename", icon: "📸" },
              { key: "tiktok", label: "TikTok Handle", placeholder: "@yourstorename", icon: "🎵" },
            ].map(({ key, label, placeholder, icon }) => (
              <div className="sd-form-group" key={key}>
                <label className="sd-label">{label}</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>{icon}</span>
                  <input className="sd-input" style={{ paddingLeft: 36 }} value={form[key]} onChange={upd(key)} placeholder={placeholder} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Brand color + preview */}
        <div>
          <div className="sd-panel" style={{ marginBottom: 14 }}>
            <div className="sd-panel-title" style={{ marginBottom: 14 }}>Brand Color</div>
            <div className="sd-color-swatches" style={{ marginBottom: 12 }}>
              {BRAND_COLORS.map((c) => (
                <div key={c} className={`sd-color-swatch ${form.primaryColor === c ? "selected" : ""}`}
                  style={{ background: c }} onClick={() => setForm((f) => ({ ...f, primaryColor: c }))} title={c}
                />
              ))}
            </div>
            <div className="sd-form-group" style={{ marginBottom: 0 }}>
              <label className="sd-label">Custom Hex</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: form.primaryColor, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                <input className="sd-input" value={form.primaryColor} onChange={upd("primaryColor")} placeholder="#046EF2" maxLength={7} style={{ fontFamily: "monospace" }} />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="sd-panel">
            <div className="sd-panel-title" style={{ marginBottom: 14 }}>Store Preview</div>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", background: "#F8F9FF" }}>
              {/* Mini banner */}
              <div style={{ height: 80, background: bannerPreview ? `url(${bannerPreview}) center/cover` : form.primaryColor, position: "relative" }}>
                {!bannerPreview && <div style={{ position: "absolute", inset: 0, background: form.primaryColor, opacity: 0.9 }} />}
              </div>
              {/* Store info */}
              <div style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fff", border: "2px solid rgba(0,0,0,0.06)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", marginTop: -28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {logoPreview
                      ? <img src={logoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 20 }}>🏪</span>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1D3B" }}>{form.shopName || "Your Store Name"}</div>
                    {form.city && <div style={{ fontSize: 11, color: "#8B8FA8" }}>📍 {form.city}{form.region ? `, ${form.region}` : ""}</div>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#8B8FA8", lineHeight: 1.5 }}>
                  {form.description || "Your store description will appear here."}
                </div>
                {(form.whatsapp || form.instagram) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {form.whatsapp && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 100, background: "rgba(34,197,94,0.1)", color: "#16A34A", fontWeight: 700 }}>📱 WhatsApp</span>}
                    {form.instagram && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 100, background: "rgba(236,72,153,0.1)", color: "#EC4899", fontWeight: 700 }}>📸 Instagram</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/dashboard/DashboardChat.jsx..."
cat > 'src/pages/dashboard/DashboardChat.jsx' << 'BEME_FILE_END'
import { useState } from "react";
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardChat() {
  const { user }        = useAuth();
  const { planLimits }  = useSellerAuth();
  const { conversations, activeChat, setActiveChat, messages, loading, sending, totalUnread, sendMessage, markRead } = useChat();

  const [text, setText] = useState("");

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    try {
      await sendMessage(text);
      setText("");
    } catch (err) { alert("Failed to send message."); }
  };

  const handleSelectChat = (chatId) => {
    setActiveChat(chatId);
    markRead(chatId);
  };

  if (!planLimits?.hasChat) {
    return (
      <div className="sd-empty" style={{ padding: 64 }}>
        <div className="sd-empty-icon">💬</div>
        <div className="sd-empty-title">Live Chat requires Standard or Pro</div>
        <div className="sd-empty-text">Upgrade your plan to chat with customers in real time, send images, and set auto-replies.</div>
        <button className="sd-btn sd-btn-primary" onClick={() => window.dispatchEvent(new CustomEvent("seller-nav", { detail: "subscription" }))}>
          Upgrade Plan
        </button>
      </div>
    );
  }

  const activeChatData = conversations.find((c) => c.id === activeChat);

  return (
    <div>
      <div className="sd-page-head" style={{ marginBottom: 14 }}>
        <div>
          <div className="sd-page-title">Messages</div>
          <div className="sd-page-sub">{conversations.length} conversations {totalUnread > 0 && `• ${totalUnread} unread`}</div>
        </div>
      </div>

      <div style={{ height: "calc(100vh - 180px)", minHeight: 480 }}>
        <div className="sd-chat-root" style={{ height: "100%" }}>
          {/* Conversation list */}
          <div className="sd-chat-list">
            <div className="sd-chat-list-head">Conversations</div>
            {loading
              ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height: 58, margin: 8, borderRadius: 8 }} />)
              : conversations.length === 0
                ? <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#8B8FA8" }}>No conversations yet</div>
                : conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`sd-chat-item ${activeChat === c.id ? "active" : ""}`}
                    onClick={() => handleSelectChat(c.id)}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#046EF215", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#046EF2", flexShrink: 0 }}>
                      {(c.customerName || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="sd-chat-item-name">{c.customerName || "Customer"}</div>
                      <div className="sd-chat-item-preview">{c.lastMessage || "No messages yet"}</div>
                    </div>
                    {c.unreadBySeller > 0 && (
                      <div style={{ background: "#046EF2", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {c.unreadBySeller}
                      </div>
                    )}
                  </div>
                ))
            }
          </div>

          {/* Chat area */}
          <div className="sd-chat-main">
            {!activeChat
              ? <div className="sd-empty" style={{ margin: "auto", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div><div className="sd-empty-icon">💬</div><div className="sd-empty-title">Select a conversation</div></div>
                </div>
              : (
                <>
                  {/* Header */}
                  <div className="sd-chat-header">
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#046EF215", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#046EF2" }}>
                      {(activeChatData?.customerName || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1D3B" }}>{activeChatData?.customerName || "Customer"}</div>
                      <div style={{ fontSize: 11, color: "#22C55E" }}>● Online</div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="sd-chat-messages">
                    {messages.map((m) => (
                      <div key={m.id}>
                        <div className={`sd-msg ${m.senderRole === "seller" ? "sd-msg-seller" : "sd-msg-customer"}`}>
                          {m.text}
                          {m.imageUrl && <img src={m.imageUrl} alt="attachment" style={{ maxWidth: "100%", borderRadius: 6, marginTop: 6 }} />}
                        </div>
                        <div style={{ fontSize: 10, color: "#8B8FA8", textAlign: m.senderRole === "seller" ? "right" : "left", marginTop: 2 }}>
                          {fmtTime(m.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="sd-chat-input-row">
                    <input
                      className="sd-input"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Type a message…"
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    />
                    <button className="sd-btn sd-btn-primary" onClick={handleSend} disabled={sending || !text.trim()}>
                      {sending ? "…" : "Send"}
                    </button>
                  </div>
                </>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/dashboard/DashboardCustomers.jsx..."
cat > 'src/pages/dashboard/DashboardCustomers.jsx' << 'BEME_FILE_END'
import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getSellerOrders } from "../../services/storeService";

export default function DashboardCustomers() {
  const { storeId }           = useSellerAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!storeId) return;
    getSellerOrders(storeId, 200).then((orders) => {
      // Aggregate unique customers
      const map = {};
      orders.forEach((o) => {
        const id = o.userId || o.customer?.email || "anon";
        if (!map[id]) {
          map[id] = {
            id, name: `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.trim(),
            phone: o.customer?.phone || "—",
            orders: 0, spent: 0, lastOrder: o.createdAt,
          };
        }
        map[id].orders++;
        map[id].spent += Number(o.pricing?.total || 0);
        const ts = o.createdAt?.toMillis ? o.createdAt.toMillis() : 0;
        const lt = map[id].lastOrder?.toMillis ? map[id].lastOrder.toMillis() : 0;
        if (ts > lt) map[id].lastOrder = o.createdAt;
      });
      setCustomers(Object.values(map).sort((a, b) => b.spent - a.spent));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [storeId]);

  return (
    <div>
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Customers</div>
          <div className="sd-page-sub">{customers.length} unique customers</div>
        </div>
      </div>

      <div className="sd-panel">
        {loading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height: 52, marginBottom: 10, borderRadius: 8 }} />)
          : customers.length === 0
            ? <div className="sd-empty"><div className="sd-empty-icon">👥</div><div className="sd-empty-title">No customers yet</div><div className="sd-empty-text">Customers who purchase from your store will appear here.</div></div>
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Orders</th>
                      <th>Total Spent</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#046EF215", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#046EF2", flexShrink: 0 }}>
                              {(c.name || "?")[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600 }}>{c.name || "Anonymous"}</span>
                          </div>
                        </td>
                        <td style={{ color: "#8B8FA8", fontSize: 12 }}>{c.phone}</td>
                        <td style={{ fontWeight: 600 }}>{c.orders}</td>
                        <td style={{ fontWeight: 700 }}>GHS {Number(c.spent).toFixed(2)}</td>
                        <td>
                          <span className={`sd-badge ${c.orders > 1 ? "sd-badge-blue" : "sd-badge-gray"}`}>
                            {c.orders > 1 ? "Repeat" : "New"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/dashboard/DashboardHome.jsx..."
cat > 'src/pages/dashboard/DashboardHome.jsx' << 'BEME_FILE_END'
import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useStoreAnalytics } from "../../hooks/useStoreAnalytics";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useSubscription } from "../../hooks/useSubscription";

/* ── Helpers ── */
function fmtMoney(n) {
  const v = Number(n || 0);
  if (v >= 1000) return `GHS ${(v / 1000).toFixed(1)}k`;
  return `GHS ${v.toFixed(0)}`;
}

function TrendArrow({ up }) {
  return up
    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
}

/* ── Stat Card ── */
function StatCard({ label, value, trend, trendLabel, icon, color = "#046EF2", loading }) {
  const up = Number(trend) >= 0;
  return (
    <div className="sd-stat-card">
      <div className="sd-stat-top">
        <div className="sd-stat-label">{label}</div>
        <div className="sd-stat-icon" style={{ background: `${color}15` }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </div>
      </div>
      {loading
        ? <div className="sd-skeleton" style={{ height: 28, width: "70%", marginBottom: 8 }} />
        : <div className="sd-stat-value">{value}</div>
      }
      {!loading && (
        <div className={`sd-stat-trend ${up ? "up" : "down"}`}>
          <TrendArrow up={up} />
          {Math.abs(trend)}%
          <span className="sd-stat-trend-sub">&nbsp;since last month</span>
        </div>
      )}
    </div>
  );
}

/* ── Custom tooltip ── */
function CustomTooltip({ active, payload, label, prefix = "GHS " }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--sd-card,#fff)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 600 }}>
      <div style={{ color: "#8B8FA8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#046EF2" }}>{prefix}{Number(p.value).toLocaleString()}</div>
      ))}
    </div>
  );
}

const ORDER_STATUS_COLORS = {
  delivered: "#22C55E",
  processing: "#046EF2",
  pending: "#F59E0B",
  cancelled: "#EF4444",
};

export default function DashboardHome() {
  const { weekSeries, weekRevenue, weekOrders, weekVisitors, loading } = useStoreAnalytics();
  const { shop, subscriptionPlan } = useSellerAuth();
  const { subscription, daysUntilRenewal } = useSubscription();

  // Mock order status donut (replace with real data from orders query)
  const orderStatusData = [
    { name: "Delivered",  value: 58, color: "#22C55E" },
    { name: "Processing", value: 28, color: "#046EF2" },
    { name: "Pending",    value: 10, color: "#F59E0B" },
    { name: "Cancelled",  value: 4,  color: "#EF4444" },
  ];

  // Subscription donut
  const planData = [
    { name: "Paid",  value: 70, color: "#046EF2" },
    { name: "Trial", value: 30, color: "#E8EFFF" },
  ];

  const today = new Date().toLocaleDateString("en-GH", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <div>
      {/* Welcome */}
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Analytics</div>
          <div className="sd-page-sub">{today}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#8B8FA8" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />
          Store Active
        </div>
      </div>

      {/* Stats grid */}
      <div className="sd-stats-grid">
        <StatCard
          label="Orders (Week)" value={weekOrders}
          trend={8.2} icon="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0"
          color="#046EF2" loading={loading}
        />
        <StatCard
          label="Approved Orders" value={Math.round(weekOrders * 0.85)}
          trend={3.4} icon="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
          color="#22C55E" loading={loading}
        />
        <StatCard
          label="Revenue (Week)" value={fmtMoney(weekRevenue)}
          trend={-1.2} icon="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
          color="#7C3AED" loading={loading}
        />
        <StatCard
          label="Visitors (Week)" value={weekVisitors}
          trend={12.5} icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"
          color="#F59E0B" loading={loading}
        />
      </div>

      {/* Second row — Month total + Revenue + Donut charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Month total */}
        <div className="sd-stat-card" style={{ gridColumn: "span 1" }}>
          <div className="sd-stat-top">
            <div className="sd-stat-label">Month Total</div>
            <div className="sd-stat-icon" style={{ background: "#046EF215" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#046EF2" strokeWidth="1.8" strokeLinecap="round"><path d="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="sd-stat-value" style={{ fontSize: 22 }}>{fmtMoney((weekRevenue || 0) * 4.3)}</div>
          <div className="sd-stat-trend down"><TrendArrow up={false} /> 0.2% <span className="sd-stat-trend-sub">&nbsp;since last month</span></div>
        </div>

        {/* Revenue */}
        <div className="sd-stat-card">
          <div className="sd-stat-top">
            <div className="sd-stat-label">Avg Order Value</div>
            <div className="sd-stat-icon" style={{ background: "#7C3AED15" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
          </div>
          <div className="sd-stat-value" style={{ fontSize: 22 }}>
            {weekOrders > 0 ? fmtMoney(weekRevenue / weekOrders) : "GHS 0"}
          </div>
          <div className="sd-stat-trend down"><TrendArrow up={false} /> 1.2% <span className="sd-stat-trend-sub">&nbsp;since last month</span></div>
        </div>

        {/* Order status donut */}
        <div className="sd-stat-card">
          <div className="sd-stat-label" style={{ marginBottom: 8 }}>Order Status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PieChart width={80} height={80}>
              <Pie data={orderStatusData} cx={35} cy={35} innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
                {orderStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
            <div className="sd-donut-legend">
              {orderStatusData.map((d) => (
                <div key={d.name} className="sd-donut-legend-item">
                  <div className="sd-donut-dot" style={{ background: d.color }} />
                  {d.value}% {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subscription donut */}
        <div className="sd-stat-card">
          <div className="sd-stat-label" style={{ marginBottom: 8 }}>Subscription</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PieChart width={80} height={80}>
              <Pie data={planData} cx={35} cy={35} innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
                {planData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
            <div className="sd-donut-legend">
              {planData.map((d) => (
                <div key={d.name} className="sd-donut-legend-item">
                  <div className="sd-donut-dot" style={{ background: d.color }} />
                  {d.value}% {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Sales bar chart */}
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title">Sales Dynamics</span>
            <span className="sd-panel-sub">
              {new Date().getFullYear()} ↓
            </span>
          </div>
          {loading
            ? <div className="sd-skeleton" style={{ height: 180 }} />
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekSeries} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={18}>
                  <XAxis dataKey="label" stroke="transparent" tick={{ fontSize: 11, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                  <YAxis stroke="transparent" tick={{ fontSize: 11, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(4,110,242,0.05)" }} />
                  <Bar dataKey="revenue" fill="#046EF2" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="orders" fill="#E8EFFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Paid/Received cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="sd-panel" style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#22C55E", background: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: 100 }}>+15%</span>
            </div>
            <div style={{ fontSize: 11, color: "#8B8FA8", marginBottom: 4 }}>Total Earnings</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1D3B", letterSpacing: "-0.03em", fontFamily: "'Space Grotesk', sans-serif" }}>
              {fmtMoney((weekRevenue || 0) * 4.3)}
            </div>
            <div style={{ fontSize: 11, color: "#8B8FA8", marginTop: 4 }}>Current Month</div>
          </div>

          <div className="sd-panel" style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(4,110,242,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#046EF2" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#046EF2", background: "rgba(4,110,242,0.1)", padding: "2px 8px", borderRadius: 100 }}>+59%</span>
            </div>
            <div style={{ fontSize: 11, color: "#8B8FA8", marginBottom: 4 }}>Pending Payouts</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1D3B", letterSpacing: "-0.03em", fontFamily: "'Space Grotesk', sans-serif" }}>GHS 0</div>
            <div style={{ fontSize: 11, color: "#8B8FA8", marginTop: 4 }}>Awaiting Review</div>
          </div>
        </div>
      </div>

      {/* Activity chart + Recent orders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Visitor activity line chart */}
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title">Overall Visitor Activity</span>
            <span className="sd-panel-sub">{new Date().getFullYear()} ↓</span>
          </div>
          {loading
            ? <div className="sd-skeleton" style={{ height: 150 }} />
            : (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={weekSeries} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                  <YAxis stroke="transparent" tick={{ fontSize: 10, fill: "#8B8FA8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip prefix="" />} />
                  <Area type="monotone" dataKey="visitors" stroke="#7C3AED" strokeWidth={2} fill="url(#visitorGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Recent orders */}
        <div className="sd-panel">
          <div className="sd-panel-head">
            <span className="sd-panel-title">Customer Orders</span>
            <button className="sd-btn sd-btn-ghost sd-btn-sm" style={{ fontSize: 11 }}>Refresh ↺</button>
          </div>
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Kofi M.", date: "22.05.2025", status: "delivered", amt: 1200 },
                  { name: "Akosua B.", date: "24.05.2025", status: "processing", amt: 450 },
                  { name: "Yaw D.", date: "25.05.2025", status: "cancelled", amt: 380 },
                  { name: "Ama S.", date: "26.05.2025", status: "delivered", amt: 2400 },
                ].map((o, i) => {
                  const sc = { delivered: "sd-badge-green", processing: "sd-badge-blue", cancelled: "sd-badge-red", pending: "sd-badge-yellow" };
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{o.name}</td>
                      <td style={{ color: "#8B8FA8", fontSize: 12 }}>{o.date}</td>
                      <td><span className={`sd-badge ${sc[o.status] || "sd-badge-gray"}`}>{o.status}</span></td>
                      <td style={{ fontWeight: 700 }}>GHS {o.amt.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/dashboard/DashboardMarketing.jsx..."
cat > 'src/pages/dashboard/DashboardMarketing.jsx' << 'BEME_FILE_END'
// ============================================================
// DashboardMarketing.jsx
// ============================================================
import { useState } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";

export function DashboardMarketing() {
  const { subscriptionPlan, planLimits } = useSellerAuth();
  const [activeSection, setActiveSection] = useState("flash");

  const tools = [
    { id: "flash",    icon: "⚡", label: "Flash Sales",    desc: "Create time-limited sales with a countdown timer.",     plan: "standard" },
    { id: "discount", icon: "🏷️", label: "Discount Codes",  desc: "Generate discount codes for promotions.",                plan: "standard" },
    { id: "boost",    icon: "🚀", label: "Product Boosts",  desc: "Feature your products on the marketplace homepage.",     plan: "standard" },
    { id: "ai",       icon: "🤖", label: "AI Captions",     desc: "Generate marketing captions for your products with AI.", plan: "pro" },
    { id: "referral", icon: "👥", label: "Referral System", desc: "Earn rewards for every new seller you refer.",           plan: "pro" },
    { id: "loyalty",  icon: "⭐", label: "Loyalty Rewards", desc: "Reward repeat customers with points.",                   plan: "pro" },
  ];

  const canAccess = (plan) => {
    const tiers = { basic: 0, standard: 1, pro: 2 };
    return (tiers[subscriptionPlan] || 0) >= (tiers[plan] || 0);
  };

  return (
    <div>
      <div className="sd-page-head">
        <div className="sd-page-title">Marketing</div>
        <div className="sd-page-sub">Grow your store with promotional tools</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {tools.map((t) => {
          const locked = !canAccess(t.plan);
          return (
            <div key={t.id} className="sd-panel" style={{ opacity: locked ? 0.6 : 1, cursor: locked ? "not-allowed" : "pointer", position: "relative" }}>
              {locked && (
                <div style={{ position: "absolute", top: 12, right: 12 }}>
                  <span className="sd-badge sd-badge-purple" style={{ fontSize: 10 }}>
                    {t.plan.charAt(0).toUpperCase() + t.plan.slice(1)}+
                  </span>
                </div>
              )}
              <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
              <div className="sd-panel-title" style={{ marginBottom: 6 }}>{t.label}</div>
              <div style={{ fontSize: 13, color: "#8B8FA8", lineHeight: 1.5, marginBottom: 14 }}>{t.desc}</div>
              <button className={`sd-btn ${locked ? "sd-btn-ghost" : "sd-btn-primary"} sd-btn-sm`}
                onClick={() => locked && alert(`This feature requires the ${t.plan} plan. Upgrade in the Subscription section.`)}>
                {locked ? "🔒 Upgrade to Access" : "Configure →"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DashboardMarketing;

BEME_FILE_END

echo -e "  Writing src/pages/dashboard/DashboardOrders.jsx..."
cat > 'src/pages/dashboard/DashboardOrders.jsx' << 'BEME_FILE_END'
// ============================================================
// DashboardOrders.jsx
// ============================================================
import { useState, useEffect } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getSellerOrders } from "../../services/storeService";

const STATUS_TABS = ["all", "pending", "processing", "delivered", "cancelled"];
const BADGE = { delivered: "sd-badge-green", processing: "sd-badge-blue", pending: "sd-badge-yellow", cancelled: "sd-badge-red" };

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

export function DashboardOrders() {
  const { storeId, shop }  = useSellerAuth();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("all");

  useEffect(() => {
    if (!storeId) return;
    getSellerOrders(storeId).then((data) => { setOrders(data); setLoading(false); }).catch(() => setLoading(false));
  }, [storeId]);

  const filtered = tab === "all" ? orders : orders.filter((o) => o.status === tab || o.fulfillmentStatus === tab);

  return (
    <div>
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Orders</div>
          <div className="sd-page-sub">{orders.length} total orders</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sd-tabs">
        {STATUS_TABS.map((t) => (
          <button key={t} className={`sd-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="sd-panel">
        {loading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height: 52, marginBottom: 10, borderRadius: 8 }} />)
          : filtered.length === 0
            ? <div className="sd-empty"><div className="sd-empty-icon">🛍️</div><div className="sd-empty-title">No {tab === "all" ? "" : tab} orders yet</div><div className="sd-empty-text">Orders from customers will appear here.</div></div>
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {filtered.map((o) => {
                      const total = o.pricing?.total || 0;
                      const cust  = o.customer;
                      const items = Array.isArray(o.items) ? o.items.length : 0;
                      return (
                        <tr key={o.id}>
                          <td style={{ fontSize: 12, color: "#8B8FA8", fontFamily: "monospace" }}>#{o.id?.slice(0,8).toUpperCase()}</td>
                          <td style={{ fontWeight: 600 }}>{cust?.firstName || ""} {cust?.lastName || ""}</td>
                          <td style={{ color: "#8B8FA8" }}>{items} item{items !== 1 ? "s" : ""}</td>
                          <td style={{ fontWeight: 700 }}>GHS {Number(total).toFixed(2)}</td>
                          <td style={{ color: "#8B8FA8", fontSize: 12 }}>{fmtDate(o.createdAt)}</td>
                          <td><span className={`sd-badge ${BADGE[o.status] || "sd-badge-gray"}`}>{o.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
}

export default DashboardOrders;

BEME_FILE_END

echo -e "  Writing src/pages/dashboard/DashboardProducts.jsx..."
cat > 'src/pages/dashboard/DashboardProducts.jsx' << 'BEME_FILE_END'
import { useState, useEffect, useCallback } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";
import {
  getSellerProducts, addSellerProduct, updateSellerProduct,
  deleteSellerProduct, uploadProductImage,
} from "../../services/storeService";

function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split(" M").map((seg, i) => <path key={i} d={(i === 0 ? "" : "M") + seg} />)}
    </svg>
  );
}

const CATEGORIES = ["Fashion & Clothing", "Sneakers & Footwear", "Jewelry & Accessories", "Perfumes & Cosmetics", "Hair & Beauty", "Food & Bakery", "Phones & Electronics", "Home Products", "Creative Arts", "Digital Products", "Services", "Health & Fitness", "Handmade Goods", "Other"];
const EMPTY_FORM = { name: "", description: "", price: "", comparePrice: "", stock: "", category: "", imageUrl: "", inStock: true, featured: false };

function ProductModal({ product, onSave, onClose, saving }) {
  const [form, setForm] = useState(product ? { ...EMPTY_FORM, ...product, price: product.price || "", stock: product.stock ?? "" } : { ...EMPTY_FORM });
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { storeId } = useSellerAuth();

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(user.uid, file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) { alert("Image upload failed. Try again."); }
    finally { setUploading(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("Product name is required."); return; }
    if (!form.price || Number(form.price) <= 0) { alert("Please enter a valid price."); return; }
    onSave({ ...form, price: Number(form.price), comparePrice: Number(form.comparePrice) || 0, stock: Number(form.stock) || null });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card,#fff)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: "#1A1D3B", letterSpacing: "-0.02em" }}>
            {product ? "Edit Product" : "Add Product"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8FA8", padding: 4 }}>
            <Icon d="M18 6L6 18 M6 6l12 12" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Image */}
          <div className="sd-form-group">
            <label className="sd-label">Product Image</label>
            {form.imageUrl
              ? <div style={{ position: "relative", marginBottom: 8 }}>
                  <img src={form.imageUrl} alt="product" style={{ width: "100%", height: 160, objectFit: "contain", borderRadius: 8, background: "#F8F8F8" }} />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              : <div className="sd-upload-zone" onClick={() => document.getElementById("prod-img").click()}>
                  <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" size={24} color="#8B8FA8" />
                  <div style={{ marginTop: 8, fontSize: 13, color: "#8B8FA8" }}>{uploading ? "Uploading…" : "Click to upload image"}</div>
                </div>
            }
            <input type="file" id="prod-img" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Product Name *</label>
            <input className="sd-input" value={form.name} onChange={upd("name")} placeholder="e.g. Air Force 1 Sneakers" required />
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Description</label>
            <textarea className="sd-textarea sd-input" value={form.description} onChange={upd("description")} placeholder="Describe your product…" rows={3} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="sd-form-group">
              <label className="sd-label">Price (GHS) *</label>
              <input className="sd-input" type="number" min="0" step="0.01" value={form.price} onChange={upd("price")} placeholder="0.00" required />
            </div>
            <div className="sd-form-group">
              <label className="sd-label">Compare at Price</label>
              <input className="sd-input" type="number" min="0" step="0.01" value={form.comparePrice} onChange={upd("comparePrice")} placeholder="0.00" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="sd-form-group">
              <label className="sd-label">Stock Quantity</label>
              <input className="sd-input" type="number" min="0" value={form.stock} onChange={upd("stock")} placeholder="Leave blank for unlimited" />
            </div>
            <div className="sd-form-group">
              <label className="sd-label">Category</label>
              <select className="sd-select sd-input" value={form.category} onChange={upd("category")}>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#1A1D3B", cursor: "pointer" }}>
              <input type="checkbox" checked={form.inStock} onChange={upd("inStock")} />
              In Stock
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#1A1D3B", cursor: "pointer" }}>
              <input type="checkbox" checked={form.featured} onChange={upd("featured")} />
              Featured Product
            </label>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="sd-btn sd-btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={saving} style={{ flex: 2 }}>
              {saving ? "Saving…" : product ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardProducts() {
  const { user }   = useAuth();
  const { storeId, shop, subscriptionPlan, planLimits } = useSellerAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | "add" | product object
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch]     = useState("");

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getSellerProducts(user.uid, storeId);
      setProducts(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user?.uid, storeId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (formData) => {
    if (!user?.uid || !storeId) return;
    setSaving(true);
    try {
      if (modal && modal !== "add") {
        await updateSellerProduct(modal.id, user.uid, formData);
      } else {
        await addSellerProduct(user.uid, storeId, shop?.shopName || "", subscriptionPlan, formData);
      }
      setModal(null);
      await load();
    } catch (err) {
      alert(err.message || "Failed to save product.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (productId) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(productId);
    try {
      await deleteSellerProduct(productId, user.uid);
      setProducts((p) => p.filter((x) => x.id !== productId));
    } catch (err) { alert(err.message); }
    finally { setDeleting(null); }
  };

  const filtered = products.filter((p) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const atLimit  = products.length >= (planLimits?.maxProducts || 25);
  const pct      = Math.min(100, Math.round((products.length / (planLimits?.maxProducts || 25)) * 100));

  return (
    <div>
      {/* Header */}
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Products</div>
          <div className="sd-page-sub">{products.length} / {planLimits?.maxProducts === 99999 ? "∞" : planLimits?.maxProducts} products used</div>
        </div>
        <button
          className="sd-btn sd-btn-primary"
          onClick={() => atLimit ? alert(`You've reached the ${products.length}-product limit on your ${subscriptionPlan} plan. Upgrade to add more.`) : setModal("add")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>

      {/* Plan usage bar */}
      {planLimits?.maxProducts !== 99999 && (
        <div className="sd-panel" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: "#8B8FA8" }}>Product Usage</span>
            <span style={{ fontWeight: 700, color: pct >= 90 ? "#EF4444" : "#1A1D3B" }}>{products.length} / {planLimits?.maxProducts}</span>
          </div>
          <div className="sd-progress-bar">
            <div className={`sd-progress-fill ${pct >= 90 ? "danger" : pct >= 70 ? "warning" : ""}`} style={{ width: `${pct}%` }} />
          </div>
          {atLimit && <div className="sd-info-panel warning" style={{ marginTop: 12, marginBottom: 0 }}><div className="sd-info-text">You've reached your product limit. <strong>Upgrade your plan</strong> to add more products.</div></div>}
        </div>
      )}

      {/* Search */}
      <div className="sd-panel" style={{ padding: "12px 16px", marginBottom: 14 }}>
        <input className="sd-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" style={{ border: "none", padding: 0, fontSize: 14, background: "transparent", outline: "none" }} />
      </div>

      {/* Products table */}
      <div className="sd-panel">
        {loading
          ? <div style={{ padding: 32 }}>
              {[1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height: 52, marginBottom: 10, borderRadius: 8 }} />)}
            </div>
          : filtered.length === 0
            ? <div className="sd-empty">
                <div className="sd-empty-icon">📦</div>
                <div className="sd-empty-title">{search ? "No products found" : "No products yet"}</div>
                <div className="sd-empty-text">{search ? "Try a different search term." : "Add your first product to start selling."}</div>
                {!search && <button className="sd-btn sd-btn-primary" onClick={() => setModal("add")}>Add First Product</button>}
              </div>
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: "#F8F8F8", flexShrink: 0, overflow: "hidden" }}>
                              {p.imageUrl
                                ? <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>
                              }
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                              {p.featured && <span className="sd-badge sd-badge-blue" style={{ fontSize: 10, padding: "1px 6px" }}>Featured</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "#8B8FA8", fontSize: 12 }}>{p.category || "—"}</td>
                        <td style={{ fontWeight: 700 }}>GHS {Number(p.price || 0).toLocaleString()}</td>
                        <td style={{ fontSize: 12 }}>{p.stock != null ? p.stock : "∞"}</td>
                        <td>
                          <span className={`sd-badge ${p.inStock === false ? "sd-badge-red" : "sd-badge-green"}`}>
                            {p.inStock === false ? "Out of Stock" : "In Stock"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="sd-btn sd-btn-ghost sd-btn-sm" onClick={() => setModal(p)}>Edit</button>
                            <button className="sd-btn sd-btn-danger sd-btn-sm" onClick={() => handleDelete(p.id)} disabled={deleting === p.id}>
                              {deleting === p.id ? "…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Modal */}
      {modal !== null && (
        <ProductModal
          product={modal === "add" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/dashboard/DashboardSubscription.jsx..."
cat > 'src/pages/dashboard/DashboardSubscription.jsx' << 'BEME_FILE_END'
import { useState, useEffect } from "react";
import { useSubscription } from "../../hooks/useSubscription";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getTransactionHistory, initSubscriptionPayment, redirectToPaystack, PLAN_PRICES, PLAN_NAMES } from "../../services/subscriptionService";
import { useAuth } from "../../context/AuthContext";

const PLAN_FEATURES = {
  basic:    ["1 store", "25 products", "Basic storefront", "MoMo & card checkout", "Basic analytics"],
  standard: ["500 products", "Premium themes", "Live customer chat", "Discount codes & flash sales", "Customer analytics", "Featured boosts", "Verified badge eligible"],
  pro:      ["Unlimited products", "Custom domain", "AI captions & auto-replies", "Live selling", "Loyalty & referral system", "Priority support", "Homepage ranking boosts", "Verified Pro badge"],
};

function PlanCard({ planId, currentPlan, price, onUpgrade, loading }) {
  const isActive = planId === currentPlan;
  const isFree   = price === 0;
  const isHigher = ["basic","standard","pro"].indexOf(planId) > ["basic","standard","pro"].indexOf(currentPlan);

  return (
    <div className="sd-panel" style={{
      border: isActive ? "2px solid #046EF2" : "1px solid rgba(0,0,0,0.08)",
      position: "relative",
    }}>
      {isActive && (
        <div style={{ position: "absolute", top: -12, left: 16, background: "#046EF2", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 100 }}>
          Current Plan
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1D3B", marginBottom: 4, fontFamily: "'Space Grotesk', sans-serif" }}>
            {PLAN_NAMES[planId]}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#046EF2", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.04em" }}>
            {isFree ? "Free" : `GHS ${price}`}
            {!isFree && <span style={{ fontSize: 13, fontWeight: 500, color: "#8B8FA8" }}>/month</span>}
          </div>
        </div>
        <span className={`sd-badge ${isActive ? "sd-badge-blue" : "sd-badge-gray"}`}>
          {planId.charAt(0).toUpperCase() + planId.slice(1)}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {(PLAN_FEATURES[planId] || []).map((f) => (
          <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#1A1D3B" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12"/></svg>
            {f}
          </div>
        ))}
      </div>

      {!isActive && isHigher && (
        <button className="sd-btn sd-btn-primary" style={{ width: "100%" }} onClick={() => onUpgrade(planId)} disabled={loading}>
          {loading ? "Processing…" : `Upgrade to ${PLAN_NAMES[planId]}`}
        </button>
      )}
      {isActive && (
        <div style={{ fontSize: 12, color: "#8B8FA8", textAlign: "center" }}>✓ Your current plan</div>
      )}
    </div>
  );
}

export default function DashboardSubscription() {
  const { user }  = useAuth();
  const { subscription, isActive, isGrace, plan, daysUntilRenewal, renewalDateStr, loading } = useSubscription();
  const { subscriptionPlan } = useSellerAuth();
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading]       = useState(true);
  const [upgrading, setUpgrading]       = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getTransactionHistory(user.uid)
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setTxLoading(false));
  }, [user?.uid]);

  const handleUpgrade = async (planId) => {
    if (!user?.email) return;
    setUpgrading(true);
    try {
      const result = await initSubscriptionPayment({ planId, uid: user.uid, email: user.email, shopId: subscription?.shopId });
      if (result?.authorization_url) redirectToPaystack(result.authorization_url);
    } catch (err) {
      alert(err.message || "Failed to start payment.");
    } finally {
      setUpgrading(false);
    }
  };

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
    return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div>
      <div className="sd-page-head">
        <div className="sd-page-title">Subscription</div>
        <div className="sd-page-sub">Manage your plan and billing</div>
      </div>

      {/* Status banner */}
      {isGrace && (
        <div className="sd-info-panel warning" style={{ marginBottom: 14 }}>
          <div className="sd-info-text">⚠️ Your subscription has expired and is in a grace period. Renew now to avoid store suspension.</div>
        </div>
      )}
      {isActive && daysUntilRenewal !== null && daysUntilRenewal <= 5 && (
        <div className="sd-info-panel info" style={{ marginBottom: 14 }}>
          <div className="sd-info-text">🔔 Your subscription renews in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? "s" : ""} on {renewalDateStr}.</div>
        </div>
      )}

      {/* Subscription status card */}
      {subscription && (
        <div className="sd-panel" style={{ marginBottom: 14 }}>
          <div className="sd-panel-head">
            <span className="sd-panel-title">Current Status</span>
            <span className={`sd-badge ${isActive ? "sd-badge-green" : isGrace ? "sd-badge-yellow" : "sd-badge-red"}`}>
              {subscription.status?.charAt(0).toUpperCase() + subscription.status?.slice(1)}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            {[
              { l: "Current Plan", v: PLAN_NAMES[plan] || plan },
              { l: "Renewal Date", v: renewalDateStr || "—" },
              { l: "Days Remaining", v: daysUntilRenewal !== null ? `${daysUntilRenewal} days` : "—" },
              { l: "Plan Price", v: `GHS ${PLAN_PRICES[plan] || 0}/mo` },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ fontSize: 11, color: "#8B8FA8", marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1D3B", fontFamily: "'Space Grotesk', sans-serif" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 24 }}>
        {["basic", "standard", "pro"].map((p) => (
          <PlanCard key={p} planId={p} currentPlan={subscriptionPlan} price={PLAN_PRICES[p]} onUpgrade={handleUpgrade} loading={upgrading} />
        ))}
      </div>

      {/* Transaction history */}
      <div className="sd-panel">
        <div className="sd-panel-head">
          <span className="sd-panel-title">Billing History</span>
        </div>
        {txLoading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height: 42, marginBottom: 8, borderRadius: 6 }} />)
          : transactions.length === 0
            ? <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#8B8FA8" }}>No billing history yet.</div>
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td style={{ color: "#8B8FA8", fontSize: 12 }}>{fmtDate(t.createdAt)}</td>
                        <td>{PLAN_NAMES[t.planId] || t.planId} Plan — {t.type}</td>
                        <td style={{ fontWeight: 700 }}>GHS {Number(t.amount || 0).toFixed(2)}</td>
                        <td><span className={`sd-badge ${t.status === "success" ? "sd-badge-green" : t.status === "pending" ? "sd-badge-yellow" : "sd-badge-red"}`}>{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/dashboard/DashboardVerification.jsx..."
cat > 'src/pages/dashboard/DashboardVerification.jsx' << 'BEME_FILE_END'
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";

const BADGE_INFO = {
  none:     { label: "Unverified", color: "#8B8FA8", bg: "rgba(107,114,128,0.1)", icon: "🔓" },
  verified: { label: "Verified",   color: "#22C55E", bg: "rgba(34,197,94,0.1)",   icon: "✓" },
  pro:      { label: "Pro Seller", color: "#7C3AED", bg: "rgba(124,58,237,0.1)",  icon: "⭐" },
};

export default function DashboardVerification() {
  const { user }  = useAuth();
  const { storeId, shop } = useSellerAuth();

  const [existing, setExisting]       = useState(null);
  const [files, setFiles]             = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [agreed, setAgreed]           = useState(false);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(collection(db, "verificationRequests"), where("sellerId", "==", user.uid), orderBy("createdAt", "desc")))
      .then((snap) => {
        if (!snap.empty) setExisting({ id: snap.docs[0].id, ...snap.docs[0].data() });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const badge = BADGE_INFO[shop?.verifiedBadge || "none"];

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected].slice(0, 5));
  };

  const handleSubmit = async () => {
    if (!agreed) { alert("Please agree to the verification terms."); return; }
    if (files.length === 0) { alert("Please upload at least one document."); return; }
    if (!storeId) return;

    setSubmitting(true);
    try {
      // Upload all docs to storage
      const uploadedUrls = [];
      for (const file of files) {
        setUploading(true);
        const fileRef = ref(storage, `verification/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadedUrls.push(url);
      }
      setUploading(false);

      // Create verification request
      const ref2 = await addDoc(collection(db, "verificationRequests"), {
        shopId: storeId,
        sellerId: user.uid,
        shopName: shop?.shopName || "",
        businessType: shop?.category || "",
        documents: uploadedUrls,
        status: "pending",
        adminNote: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: serverTimestamp(),
      });
      setExisting({ id: ref2.id, status: "pending", documents: uploadedUrls });
      setFiles([]);
    } catch (err) {
      console.error(err);
      alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#8B8FA8" }}>Loading…</div>;

  return (
    <div>
      <div className="sd-page-head">
        <div className="sd-page-title">Store Verification</div>
        <div className="sd-page-sub">Earn a verified badge and build customer trust</div>
      </div>

      {/* Current badge */}
      <div className="sd-panel" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: badge.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {badge.icon}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#8B8FA8", marginBottom: 4 }}>Current Badge</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: badge.color, fontFamily: "'Space Grotesk', sans-serif" }}>{badge.label}</div>
            {shop?.verifiedBadge === "none" && <div style={{ fontSize: 12, color: "#8B8FA8", marginTop: 2 }}>Submit your documents to get verified.</div>}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="sd-panel" style={{ marginBottom: 14 }}>
        <div className="sd-panel-title" style={{ marginBottom: 14 }}>Why Get Verified?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { icon: "🛡️", title: "Build Trust",      desc: "Verified badge appears on your store and all products." },
            { icon: "📈", title: "More Sales",        desc: "Verified sellers rank higher in search results." },
            { icon: "💰", title: "Higher Limits",     desc: "Access higher withdrawal limits per week." },
            { icon: "🎯", title: "Boost Eligibility", desc: "Only verified sellers can use premium boosts." },
          ].map((b) => (
            <div key={b.title} style={{ padding: 14, borderRadius: 10, background: "rgba(4,110,242,0.05)", border: "1px solid rgba(4,110,242,0.1)" }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{b.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1D3B", marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: "#8B8FA8", lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Application */}
      {existing ? (
        <div className="sd-panel">
          <div className="sd-panel-title" style={{ marginBottom: 14 }}>Application Status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span className={`sd-badge ${existing.status === "approved" ? "sd-badge-green" : existing.status === "rejected" ? "sd-badge-red" : "sd-badge-yellow"}`}>
              {existing.status === "pending" ? "Under Review" : existing.status === "approved" ? "Approved" : "Rejected"}
            </span>
            <span style={{ fontSize: 12, color: "#8B8FA8" }}>
              {existing.status === "pending" && "Your application is being reviewed. This usually takes 1–3 business days."}
              {existing.status === "approved" && "Congratulations! Your store is now verified."}
              {existing.status === "rejected" && `Reason: ${existing.adminNote || "Please resubmit with clearer documents."}`}
            </span>
          </div>
          {existing.documents?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "#8B8FA8", marginBottom: 8 }}>Submitted Documents</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {existing.documents.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.05)", fontSize: 12, color: "#046EF2", fontWeight: 600 }}>
                    📄 Document {i + 1} ↗
                  </a>
                ))}
              </div>
            </div>
          )}
          {existing.status === "rejected" && (
            <button className="sd-btn sd-btn-primary" style={{ marginTop: 16 }} onClick={() => setExisting(null)}>
              Resubmit Application
            </button>
          )}
        </div>
      ) : (
        <div className="sd-panel">
          <div className="sd-panel-title" style={{ marginBottom: 6 }}>Apply for Verification</div>
          <div style={{ fontSize: 13, color: "#8B8FA8", marginBottom: 20, lineHeight: 1.6 }}>
            Upload any 2 of the following: Ghana Card / Passport / Driver's License, Business Registration Certificate, Utility Bill (not older than 3 months), Bank Statement.
          </div>

          {/* Document upload */}
          <div className="sd-form-group">
            <label className="sd-label">Upload Documents (max 5 files)</label>
            <div className="sd-upload-zone" onClick={() => document.getElementById("verif-docs").click()}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
              <div style={{ fontSize: 13, color: "#8B8FA8", marginBottom: 4 }}>Click to upload documents</div>
              <div style={{ fontSize: 11, color: "#8B8FA8" }}>PNG, JPG, PDF — max 5MB each</div>
            </div>
            <input type="file" id="verif-docs" multiple accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFileChange} />
            {files.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: "rgba(4,110,242,0.08)", fontSize: 12, color: "#046EF2" }}>
                    📄 {f.name}
                    <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontWeight: 700, fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agreement */}
          <div style={{ padding: "14px 16px", background: "rgba(0,0,0,0.03)", borderRadius: 10, marginBottom: 16, fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
            <strong style={{ color: "#1A1D3B" }}>Verification Agreement</strong>
            <br />
            By submitting, I confirm that all documents provided are genuine and belong to me or my business. I understand that submitting false or forged documents may result in immediate account termination and legal action. Beme Market reserves the right to reject any application without explanation.
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20, cursor: "pointer" }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
            <span style={{ fontSize: 13, color: "#1A1D3B" }}>I agree to the verification terms and confirm all documents are authentic.</span>
          </label>

          <button className="sd-btn sd-btn-primary" onClick={handleSubmit} disabled={submitting || uploading || files.length === 0 || !agreed} style={{ minWidth: 200 }}>
            {uploading ? "Uploading…" : submitting ? "Submitting…" : "Submit for Verification"}
          </button>
        </div>
      )}
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/pages/dashboard/DashboardWithdrawals.jsx..."
cat > 'src/pages/dashboard/DashboardWithdrawals.jsx' << 'BEME_FILE_END'
import { useState } from "react";
import { useWithdrawals } from "../../hooks/useWithdrawals";
import { PAYOUT_METHODS, MIN_WITHDRAWAL } from "../../services/payoutService";

const STATUS_BADGE = {
  pending:    "sd-badge-yellow",
  processing: "sd-badge-blue",
  approved:   "sd-badge-blue",
  completed:  "sd-badge-green",
  rejected:   "sd-badge-red",
};

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

export default function DashboardWithdrawals() {
  const { withdrawals, loading, submitting, error, pendingTotal, completedTotal, requestWithdrawal } = useWithdrawals();

  const [showForm, setShowForm] = useState(false);
  const [agreed, setAgreed]     = useState(false);
  const [form, setForm]         = useState({
    amount: "", method: "momo",
    momoNumber: "", momoNetwork: "MTN", accountName: "",
    bankName: "", bankAccount: "",
  });
  const [formError, setFormError] = useState(null);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) { setFormError("Please agree to the payout terms."); return; }
    setFormError(null);
    try {
      await requestWithdrawal(form);
      setShowForm(false);
      setForm({ amount: "", method: "momo", momoNumber: "", momoNetwork: "MTN", accountName: "", bankName: "", bankAccount: "" });
      setAgreed(false);
    } catch (err) {
      setFormError(err.message || "Failed to submit request.");
    }
  };

  return (
    <div>
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Withdrawals</div>
          <div className="sd-page-sub">Request payouts to your MoMo or bank account</div>
        </div>
        <button className="sd-btn sd-btn-primary" onClick={() => setShowForm(true)}>
          + Request Withdrawal
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 14 }}>
        {[
          { label: "Available Balance", value: "GHS 0.00", note: "Contact support to check", color: "#22C55E" },
          { label: "Pending Payouts",   value: `GHS ${pendingTotal.toFixed(2)}`,   note: "Awaiting admin review", color: "#F59E0B" },
          { label: "Total Withdrawn",   value: `GHS ${completedTotal.toFixed(2)}`, note: "All time completed",    color: "#046EF2" },
        ].map((c) => (
          <div key={c.label} className="sd-stat-card">
            <div className="sd-stat-label">{c.label}</div>
            <div className="sd-stat-value" style={{ fontSize: 22, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "#8B8FA8", marginTop: 4 }}>{c.note}</div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="sd-info-panel info" style={{ marginBottom: 14 }}>
        <div className="sd-info-text">
          📋 <strong>Payout Policy:</strong> Minimum withdrawal is GHS {MIN_WITHDRAWAL}. Payouts are processed within 1–3 business days. MoMo transfers are instant after approval. Ensure your details are accurate — Beme Market is not responsible for payments to wrong accounts.
        </div>
      </div>

      {/* Withdrawal history */}
      <div className="sd-panel">
        <div className="sd-panel-head">
          <span className="sd-panel-title">Withdrawal History</span>
        </div>
        {loading
          ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height: 52, marginBottom: 10, borderRadius: 8 }} />)
          : withdrawals.length === 0
            ? <div className="sd-empty"><div className="sd-empty-icon">💸</div><div className="sd-empty-title">No withdrawals yet</div><div className="sd-empty-text">Your payout requests will appear here once submitted.</div></div>
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Account</th><th>Status</th><th>Note</th></tr></thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td style={{ color: "#8B8FA8", fontSize: 12 }}>{fmtDate(w.createdAt)}</td>
                        <td style={{ fontWeight: 700 }}>GHS {Number(w.amount || 0).toFixed(2)}</td>
                        <td style={{ fontSize: 12 }}>{w.method === "momo" ? `MoMo (${w.momoNetwork})` : `Bank (${w.bankName})`}</td>
                        <td style={{ fontSize: 12, color: "#8B8FA8" }}>{w.method === "momo" ? w.momoNumber : w.bankAccount}</td>
                        <td><span className={`sd-badge ${STATUS_BADGE[w.status] || "sd-badge-gray"}`}>{w.status}</span></td>
                        <td style={{ fontSize: 12, color: "#8B8FA8", maxWidth: 160 }}>{w.adminNote || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Withdrawal form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--card,#fff)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: "#1A1D3B" }}>Request Withdrawal</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8FA8", fontSize: 20 }}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Amount */}
              <div className="sd-form-group">
                <label className="sd-label">Amount (GHS)</label>
                <input className="sd-input" type="number" min={MIN_WITHDRAWAL} step="0.01" value={form.amount} onChange={upd("amount")} placeholder={`Minimum GHS ${MIN_WITHDRAWAL}`} required />
              </div>

              {/* Method */}
              <div className="sd-form-group">
                <label className="sd-label">Payout Method</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {Object.entries(PAYOUT_METHODS).map(([key, m]) => (
                    <label key={key} style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `2px solid ${form.method === key ? "#046EF2" : "rgba(0,0,0,0.1)"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: form.method === key ? "rgba(4,110,242,0.05)" : "transparent" }}>
                      <input type="radio" name="method" value={key} checked={form.method === key} onChange={upd("method")} style={{ display: "none" }} />
                      <span style={{ fontSize: 16 }}>{key === "momo" ? "📱" : "🏦"}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: form.method === key ? "#046EF2" : "#1A1D3B" }}>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {form.method === "momo" ? (
                <>
                  <div className="sd-form-group">
                    <label className="sd-label">MoMo Network</label>
                    <select className="sd-select sd-input" value={form.momoNetwork} onChange={upd("momoNetwork")}>
                      {PAYOUT_METHODS.momo.networks.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="sd-form-group">
                    <label className="sd-label">MoMo Number</label>
                    <input className="sd-input" value={form.momoNumber} onChange={upd("momoNumber")} placeholder="0XX XXX XXXX" required={form.method === "momo"} />
                  </div>
                </>
              ) : (
                <>
                  <div className="sd-form-group">
                    <label className="sd-label">Bank Name</label>
                    <select className="sd-select sd-input" value={form.bankName} onChange={upd("bankName")}>
                      <option value="">Select bank</option>
                      {PAYOUT_METHODS.bank.banks.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="sd-form-group">
                    <label className="sd-label">Account Number</label>
                    <input className="sd-input" value={form.bankAccount} onChange={upd("bankAccount")} placeholder="Account number" required={form.method === "bank"} />
                  </div>
                </>
              )}

              <div className="sd-form-group">
                <label className="sd-label">Account Name *</label>
                <input className="sd-input" value={form.accountName} onChange={upd("accountName")} placeholder="Name registered to the account" required />
              </div>

              {/* Payout T&C */}
              <div style={{ padding: "12px 14px", background: "rgba(245,158,11,0.07)", borderRadius: 8, marginBottom: 14, fontSize: 12, color: "#6B7280", lineHeight: 1.6, border: "1px solid rgba(245,158,11,0.2)" }}>
                By submitting, I confirm that: (1) The account details I provided are accurate. (2) I understand that Beme Market is not liable for payments to incorrect accounts. (3) Withdrawals may be held if there are pending disputes or policy violations. (4) Beme Market reserves the right to deduct any applicable fees.
              </div>

              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18, cursor: "pointer" }}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13 }}>I agree to the payout terms and confirm my account details are correct.</span>
              </label>

              {(formError || error) && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 14 }}>{formError || error}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="sd-btn sd-btn-ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="sd-btn sd-btn-primary" disabled={submitting} style={{ flex: 2 }}>
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

BEME_FILE_END

echo -e "  Writing src/services/analyticsService.js..."
cat > 'src/services/analyticsService.js' << 'BEME_FILE_END'
// src/services/analyticsService.js
import {
  doc, collection, getDocs, setDoc, updateDoc, increment,
  query, orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * recordProductView — increments the daily visitor count for a shop.
 * Call this when a user views a seller's product.
 */
export async function recordProductView(shopId) {
  if (!shopId) return;
  const key     = todayKey();
  const dayRef  = doc(db, "sellerAnalytics", shopId, "daily", key);
  try {
    await updateDoc(dayRef, {
      visitors: increment(1),
      productViews: increment(1),
    });
  } catch {
    await setDoc(dayRef, {
      date: key, visitors: 1, productViews: 1,
      revenue: 0, orders: 0, createdAt: serverTimestamp(),
    }, { merge: true });
  }
}

/**
 * recordSale — called after a successful order that includes seller products.
 */
export async function recordSale(shopId, amount, orderCount = 1) {
  if (!shopId) return;
  const key    = todayKey();
  const dayRef = doc(db, "sellerAnalytics", shopId, "daily", key);
  try {
    await updateDoc(dayRef, {
      revenue: increment(amount),
      orders:  increment(orderCount),
    });
  } catch {
    await setDoc(dayRef, {
      date: key, revenue: amount, orders: orderCount,
      visitors: 0, productViews: 0, createdAt: serverTimestamp(),
    }, { merge: true });
  }
}

/**
 * getAnalyticsSummary — fetches last N days of analytics for a shop.
 */
export async function getAnalyticsSummary(shopId, days = 30) {
  const snap = await getDocs(
    query(
      collection(db, "sellerAnalytics", shopId, "daily"),
      orderBy("__name__", "desc"),
      limit(days)
    )
  );
  return snap.docs.map((d) => ({ date: d.id, ...d.data() }));
}

BEME_FILE_END

echo -e "  Writing src/services/boostService.js..."
cat > 'src/services/boostService.js' << 'BEME_FILE_END'
// src/services/boostService.js
import {
  collection, addDoc, getDocs, query, where, orderBy,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export const BOOST_TYPES = {
  homepage:  { label: "Homepage Feature",  description: "Your store featured on the homepage", price: 50,  duration: 7  },
  featured:  { label: "Featured Product",  description: "Product pinned to top of category",   price: 30,  duration: 7  },
  trending:  { label: "Trending Boost",    description: "Listed in trending section",          price: 40,  duration: 3  },
};

/**
 * createBoost — creates a boost request. Payment handled separately.
 */
export async function createBoost({ shopId, sellerId, type, productId = null, paystackReference }) {
  const boostInfo = BOOST_TYPES[type];
  if (!boostInfo) throw new Error(`Unknown boost type: ${type}`);

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + boostInfo.duration);

  return await addDoc(collection(db, "boosts"), {
    shopId, sellerId, type, productId,
    amount:    boostInfo.price,
    duration:  boostInfo.duration,
    status:    "active",
    startDate: Timestamp.fromDate(now),
    endDate:   Timestamp.fromDate(end),
    paystackReference: paystackReference || null,
    createdAt: serverTimestamp(),
  });
}

/**
 * getSellerBoosts — gets all boosts for a seller's shop.
 */
export async function getSellerBoosts(shopId) {
  const snap = await getDocs(
    query(
      collection(db, "boosts"),
      where("shopId", "==", shopId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * getActiveBoosts — gets currently active boosts (for homepage rendering).
 */
export async function getActiveBoosts(type) {
  const now  = Timestamp.now();
  const snap = await getDocs(
    query(
      collection(db, "boosts"),
      where("status", "==", "active"),
      where("type", "==", type)
    )
  );
  // Filter client-side for endDate > now
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((b) => b.endDate?.toMillis() > now.toMillis());
}

BEME_FILE_END

echo -e "  Writing src/services/chatService.js..."
cat > 'src/services/chatService.js' << 'BEME_FILE_END'
// src/services/chatService.js
import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc,
  query, where, orderBy, serverTimestamp, setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export async function getOrCreateChat({ shopId, sellerId, customerId, customerName }) {
  // Check if chat already exists
  const snap = await getDocs(
    query(
      collection(db, "sellerChats"),
      where("shopId", "==", shopId),
      where("customerId", "==", customerId)
    )
  );
  if (!snap.empty) return snap.docs[0].id;

  // Create new chat
  const chatRef = await addDoc(collection(db, "sellerChats"), {
    shopId, sellerId, customerId, customerName,
    lastMessage: "",
    lastMessageTime: serverTimestamp(),
    unreadBySeller: 0,
    unreadByCustomer: 0,
    createdAt: serverTimestamp(),
  });
  return chatRef.id;
}

export async function sendChatMessage(chatId, senderId, senderRole, text, imageUrl = null) {
  const msg = {
    senderId, senderRole,
    text: String(text || "").trim().slice(0, 2000),
    isRead: false,
    createdAt: serverTimestamp(),
  };
  if (imageUrl) msg.imageUrl = imageUrl;

  await addDoc(collection(db, "sellerChats", chatId, "messages"), msg);
  await updateDoc(doc(db, "sellerChats", chatId), {
    lastMessage: msg.text,
    lastMessageTime: serverTimestamp(),
    [senderRole === "seller" ? "unreadByCustomer" : "unreadBySeller"]: 1,
  });
}

BEME_FILE_END

echo -e "  Writing src/services/payoutService.js..."
cat > 'src/services/payoutService.js' << 'BEME_FILE_END'
// src/services/payoutService.js
import {
  collection, addDoc, getDocs, query, where,
  orderBy, serverTimestamp, doc, updateDoc, getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export const PAYOUT_METHODS = {
  momo: { label: "Mobile Money", networks: ["MTN", "Telecel", "AirtelTigo"] },
  bank: { label: "Bank Transfer", banks: ["GCB Bank", "Ecobank", "Absa", "Standard Chartered", "Fidelity Bank", "Cal Bank", "Zenith Bank", "UBA Ghana", "Access Bank", "GTBank", "Other"] },
};

export const MIN_WITHDRAWAL = 50;

/**
 * submitWithdrawalRequest — creates a new payout request.
 * Status starts as "pending" — super_admin must approve.
 */
export async function submitWithdrawalRequest({ sellerId, shopId, amount, method, momoNumber, momoNetwork, accountName, bankName, bankAccount }) {
  if (Number(amount) < MIN_WITHDRAWAL) {
    throw new Error(`Minimum withdrawal is GHS ${MIN_WITHDRAWAL}.`);
  }
  return await addDoc(collection(db, "withdrawalRequests"), {
    sellerId, shopId,
    amount:      Number(amount),
    currency:    "GHS",
    method:      method || "momo",
    momoNumber:  momoNumber || null,
    momoNetwork: momoNetwork || null,
    accountName: String(accountName || "").trim(),
    bankName:    bankName || null,
    bankAccount: bankAccount || null,
    status:      "pending",
    adminNote:   null,
    reviewedBy:  null,
    reviewedAt:  null,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });
}

/**
 * getWithdrawalRequests — for sellers, gets their own requests.
 */
export async function getSellerWithdrawals(sellerId) {
  const snap = await getDocs(
    query(
      collection(db, "withdrawalRequests"),
      where("sellerId", "==", sellerId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * getAllWithdrawalRequests — for super_admin, gets all pending requests.
 */
export async function getAllWithdrawalRequests(statusFilter = null) {
  let q = query(collection(db, "withdrawalRequests"), orderBy("createdAt", "desc"));
  if (statusFilter) {
    q = query(collection(db, "withdrawalRequests"), where("status", "==", statusFilter), orderBy("createdAt", "desc"));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * approveWithdrawal — super_admin approves a payout request.
 */
export async function approveWithdrawal(requestId, adminId, note = "") {
  await updateDoc(doc(db, "withdrawalRequests", requestId), {
    status:     "approved",
    adminNote:  note || null,
    reviewedBy: adminId,
    reviewedAt: serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });
}

/**
 * rejectWithdrawal — super_admin rejects a payout request.
 */
export async function rejectWithdrawal(requestId, adminId, reason) {
  await updateDoc(doc(db, "withdrawalRequests", requestId), {
    status:     "rejected",
    adminNote:  String(reason || "").trim(),
    reviewedBy: adminId,
    reviewedAt: serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });
}

BEME_FILE_END

echo -e "  Writing src/services/storeService.js..."
cat > 'src/services/storeService.js' << 'BEME_FILE_END'
import {
  doc, collection, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { auth } from "../firebase";

// ─── PLAN LIMITS (server-side mirror — Cloud Function enforces these) ─────────
const PLAN_LIMITS = {
  basic:    { maxProducts: 25,   hasChat: false, hasCustomDomain: false, hasBranding: false },
  standard: { maxProducts: 500,  hasChat: true,  hasCustomDomain: false, hasBranding: false },
  pro:      { maxProducts: 99999, hasChat: true,  hasCustomDomain: true,  hasBranding: true  },
};

export function getPlanLimits(planId) {
  return PLAN_LIMITS[planId] || PLAN_LIMITS.basic;
}

// ─── SHOP ────────────────────────────────────────────────────────────────────

export async function getShop(shopId) {
  const snap = await getDoc(doc(db, "shops", shopId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateShop(shopId, updates) {
  await updateDoc(doc(db, "shops", shopId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export async function getSellerProducts(uid, shopId) {
  const snap = await getDocs(
    query(
      collection(db, "Products"),
      where("sellerId", "==", uid),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addSellerProduct(uid, shopId, shopName, planId, data) {
  // Client-side plan limit check (enforced by Cloud Function too)
  const existing = await getDocs(
    query(collection(db, "Products"), where("sellerId", "==", uid))
  );
  const limits = getPlanLimits(planId);
  if (existing.size >= limits.maxProducts) {
    throw new Error(`Your ${planId} plan allows a maximum of ${limits.maxProducts} products. Please upgrade to add more.`);
  }

  return await addDoc(collection(db, "Products"), {
    ...data,
    sellerId:  uid,
    shopId,
    shopName,
    sellerPlan: planId,
    source:    "seller",
    status:    "active",
    inStock:   data.inStock !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSellerProduct(productId, uid, updates) {
  const snap = await getDoc(doc(db, "Products", productId));
  if (!snap.exists() || snap.data().sellerId !== uid) {
    throw new Error("You do not have permission to edit this product.");
  }
  await updateDoc(doc(db, "Products", productId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSellerProduct(productId, uid) {
  const snap = await getDoc(doc(db, "Products", productId));
  if (!snap.exists() || snap.data().sellerId !== uid) {
    throw new Error("You do not have permission to delete this product.");
  }
  await deleteDoc(doc(db, "Products", productId));
}

// ─── UPLOAD MEDIA ────────────────────────────────────────────────────────────

export async function uploadStoreImage(uid, file, type = "logo") {
  const ext  = file.name.split(".").pop();
  const path = `stores/${uid}/${type}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export async function uploadProductImage(uid, file) {
  const ext  = file.name.split(".").pop();
  const path = `products/${uid}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// ─── ORDERS (seller view) ───────────────────────────────────────────────────

export async function getSellerOrders(shopId, limitCount = 100) {
  try {
    const snap = await getDocs(
      query(
        collection(db, "orders"),
        where("shops", "array-contains", shopId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    // Fallback without orderBy if index not built
    const snap = await getDocs(
      query(collection(db, "orders"), where("shops", "array-contains", shopId), limit(limitCount))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

// ─── STORE APPLICATION ──────────────────────────────────────────────────────

export async function saveApplicationStep(uid, step, data) {
  const ref = doc(db, "storeApplications", uid);
  await updateDoc(ref, {
    [`step${step}`]: data,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    // Document may not exist yet — create it
    const { setDoc } = await import("firebase/firestore");
    await setDoc(ref, {
      [`step${step}`]: data,
      status: "draft",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

export async function getApplicationDraft(uid) {
  const snap = await getDoc(doc(db, "storeApplications", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

BEME_FILE_END

echo -e "  Writing src/services/subscriptionService.js..."
cat > 'src/services/subscriptionService.js' << 'BEME_FILE_END'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db, auth } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

const BASE = String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/+$/, "");

// Plan pricing in GHS
export const PLAN_PRICES = {
  basic:    0,
  standard: 99,
  pro:      249,
};

export const PLAN_NAMES = {
  basic:    "Basic",
  standard: "Standard",
  pro:      "Pro",
};

/**
 * initSubscriptionPayment — creates a Paystack one-time charge for plan subscription.
 * Works with Paystack Starter plan (no Subscriptions API needed).
 * The backend creates the transaction with plan metadata.
 */
export async function initSubscriptionPayment({ planId, uid, email, shopId }) {
  if (!planId || !uid || !email) throw new Error("Missing required fields.");
  const price = PLAN_PRICES[planId];
  if (price === 0) {
    // Basic is free — skip payment and call cloud function directly
    return { isFree: true, planId };
  }

  const token = await auth.currentUser.getIdToken(true);
  const res = await fetch(`${BASE}/api/seller/subscription/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ planId, shopId, email }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Subscription init failed (HTTP ${res.status})`);
  if (!data?.authorization_url) throw new Error("Missing Paystack authorization URL.");

  // Save pending subscription record
  await setDoc(doc(db, "storeApplications", uid), {
    pendingPlanId: planId,
    pendingReference: data.reference,
    status: "pending_payment",
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return data;
}

/**
 * verifySubscriptionPayment — callable cloud function that verifies payment
 * and activates the seller account. Called from SubscriptionSuccess.jsx.
 */
export async function verifySubscriptionPayment(reference) {
  const functions = getFunctions();
  const verify    = httpsCallable(functions, "createSellerStore");
  const result    = await verify({ reference });
  return result.data;
}

/**
 * activateFreeStore — for Basic plan, calls createSellerStore directly
 * since no payment is needed.
 */
export async function activateFreeStore(applicationData) {
  const functions = getFunctions();
  const activate  = httpsCallable(functions, "createSellerStore");
  const result    = await activate({ planId: "basic", ...applicationData });
  return result.data;
}

/**
 * getSubscription — reads current subscription for a user.
 */
export async function getSubscription(uid) {
  const snap = await getDoc(doc(db, "subscriptions", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * getTransactionHistory — reads transaction history for a seller.
 */
export async function getTransactionHistory(uid) {
  const { getDocs, query, where, orderBy } = await import("firebase/firestore");
  const snap = await getDocs(
    query(
      collection(db, "transactions"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Redirect to Paystack for subscription payment.
 */
export function redirectToPaystack(authorizationUrl) {
  window.location.assign(authorizationUrl);
}

BEME_FILE_END

echo -e "${GREEN}✅ Done! ${NC}All Beme Market seller files installed."
echo ""
echo "📋 Next steps:"
echo "  1. Update src/App.jsx  — add new seller routes"
echo "  2. Update src/context/AuthContext.jsx  — add seller role"
echo "  3. Update firestore.rules  — add seller collections"
echo "  4. Update src/components/navigation/BottomNav.jsx"
echo "  5. Run: npm install recharts"
echo "  6. Deploy cloud functions: firebase deploy --only functions"
echo ""
echo "📁 Files installed:"
echo "  ✓ functions/createSellerStore.js"
echo "  ✓ functions/handleSubscriptionRenewal.js"
echo "  ✓ functions/sellerFunctions.js"
echo "  ✓ src/components/SellerRoute.jsx"
echo "  ✓ src/components/admin/StoreApprovalCard.jsx"
echo "  ✓ src/components/auth/RequireSeller.jsx"
echo "  ✓ src/components/getStore/BusinessTypeCard.jsx"
echo "  ✓ src/components/getStore/FeatureList.jsx"
echo "  ✓ src/components/getStore/PlanComparison.jsx"
echo "  ✓ src/components/getStore/PricingCard.jsx"
echo "  ✓ src/components/getStore/ProgressBar.jsx"
echo "  ✓ src/components/getStore/SurveyStep.jsx"
echo "  ✓ src/components/payout/PayoutRequestCard.jsx"
echo "  ✓ src/hooks/useChat.js"
echo "  ✓ src/hooks/useSellerAuth.js"
echo "  ✓ src/hooks/useStoreAnalytics.js"
echo "  ✓ src/hooks/useSubscription.js"
echo "  ✓ src/hooks/useWithdrawals.js"
echo "  ✓ src/pages/CommunityGuidelines.jsx"
echo "  ✓ src/pages/GetAStore.css"
echo "  ✓ src/pages/GetAStore.jsx"
echo "  ✓ src/pages/LegalPage.css"
echo "  ✓ src/pages/PrivacyPolicy.jsx"
echo "  ✓ src/pages/RefundPolicy.jsx"
echo "  ✓ src/pages/SellerDashboard.css"
echo "  ✓ src/pages/SellerDashboard.jsx"
echo "  ✓ src/pages/SellerPolicy.jsx"
echo "  ✓ src/pages/SellerTerms.jsx"
echo "  ✓ src/pages/StoreOnboarding.css"
echo "  ✓ src/pages/StoreOnboarding.jsx"
echo "  ✓ src/pages/StorePlans.css"
echo "  ✓ src/pages/StorePlans.jsx"
echo "  ✓ src/pages/StoreSurvey.css"
echo "  ✓ src/pages/StoreSurvey.jsx"
echo "  ✓ src/pages/SubscriptionSuccess.css"
echo "  ✓ src/pages/SubscriptionSuccess.jsx"
echo "  ✓ src/pages/admin/AdminSeller.css"
echo "  ✓ src/pages/admin/PayoutRequests.jsx"
echo "  ✓ src/pages/admin/StoreModeration.jsx"
echo "  ✓ src/pages/admin/VerificationRequests.jsx"
echo "  ✓ src/pages/dashboard/DashboardAnalytics.jsx"
echo "  ✓ src/pages/dashboard/DashboardAppearance.jsx"
echo "  ✓ src/pages/dashboard/DashboardChat.jsx"
echo "  ✓ src/pages/dashboard/DashboardCustomers.jsx"
echo "  ✓ src/pages/dashboard/DashboardHome.jsx"
echo "  ✓ src/pages/dashboard/DashboardMarketing.jsx"
echo "  ✓ src/pages/dashboard/DashboardOrders.jsx"
echo "  ✓ src/pages/dashboard/DashboardProducts.jsx"
echo "  ✓ src/pages/dashboard/DashboardSubscription.jsx"
echo "  ✓ src/pages/dashboard/DashboardVerification.jsx"
echo "  ✓ src/pages/dashboard/DashboardWithdrawals.jsx"
echo "  ✓ src/services/analyticsService.js"
echo "  ✓ src/services/boostService.js"
echo "  ✓ src/services/chatService.js"
echo "  ✓ src/services/payoutService.js"
echo "  ✓ src/services/storeService.js"
echo "  ✓ src/services/subscriptionService.js"