import express from "express";
import { adminDb, firebaseAdmin } from "../firebaseAdmin.js";

const router = express.Router();

const ADMIN_UPDATE_STATUSES = new Set([
  "approved",
  "held",
  "rejected",
  "awaiting_admin_review",
  "approved_for_supplier",
]);

function safeTrim(value) {
  return String(value ?? "").trim();
}

function sanitizeText(value, max = 500) {
  return safeTrim(value).slice(0, max);
}

function normalizeStatus(value) {
  return sanitizeText(value, 60).toLowerCase();
}

function getSortableTime(value) {
  if (!value) return 0;

  try {
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?._seconds === "number") return value._seconds * 1000;
    if (typeof value?.seconds === "number") return value.seconds * 1000;
    return new Date(value).getTime() || 0;
  } catch {
    return 0;
  }
}

async function requireAuthUser(req) {
  const authHeader = String(req.headers.authorization || "");
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    const error = new Error("Missing authorization token.");
    error.statusCode = 401;
    throw error;
  }

  const decoded = await firebaseAdmin.auth().verifyIdToken(match[1]);

  if (!decoded?.uid) {
    const error = new Error("Invalid authorization token.");
    error.statusCode = 401;
    throw error;
  }

  return decoded;
}

async function getUserRoleProfile(uid) {
  if (!uid) return null;

  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) return null;

  const data = snap.data() || {};
  const role = String(data?.role || "").trim().toLowerCase();
  const shop = String(data?.shop || "").trim().toLowerCase();

  return {
    id: snap.id,
    ...data,
    role,
    shop: shop || null,
    isSuperAdmin: role === "super_admin" || role === "admin",
    isShopAdmin: role === "shop_admin",
    isAdmin: ["super_admin", "admin", "shop_admin"].includes(role),
  };
}

function normalizeShop(value) {
  return (
    String(value || "main")
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "main"
  );
}

function orderMatchesShop(order, adminShop) {
  if (!adminShop) return false;

  const normalizedAdminShop = normalizeShop(adminShop);

  const shops = Array.isArray(order?.shops)
    ? order.shops.map((shop) => normalizeShop(shop))
    : [];

  if (shops.includes(normalizedAdminShop)) return true;

  const primaryShop = normalizeShop(order?.primaryShop);
  if (primaryShop === normalizedAdminShop) return true;

  const items = Array.isArray(order?.items) ? order.items : [];
  return items.some((item) => normalizeShop(item?.shop) === normalizedAdminShop);
}

function sanitizeOrderForResponse(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    userId: data.userId || "",
    status: data.status || "pending",
    paymentMethod: data.paymentMethod || "",
    paymentStatus: data.paymentStatus || "",
    paid: data.paid === true,
    emailSent: data.emailSent === true,
    reference: data.reference || "",
    source: data.source || "web",
    shops: Array.isArray(data.shops) ? data.shops : [],
    primaryShop: data.primaryShop || "main",
    pricing: data.pricing || null,
    customer: data.customer || null,
    items: Array.isArray(data.items) ? data.items : [],
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,

    fulfillmentStatus: data.fulfillmentStatus || "",
    supplierPushStatus: data.supplierPushStatus || "",
    adminReviewed: data.adminReviewed === true,
    adminApproved: data.adminApproved === true,
    approvedBy: data.approvedBy || "",
    approvedAt: data.approvedAt || null,
    rejectedBy: data.rejectedBy || "",
    rejectedAt: data.rejectedAt || null,
    heldBy: data.heldBy || "",
    heldAt: data.heldAt || null,
    reviewNotes: data.reviewNotes || "",
    supplierOrderId: data.supplierOrderId || "",
    supplierStatus: data.supplierStatus || "",
    supplierTrackingNumber: data.supplierTrackingNumber || "",
    supplierTrackingUrl: data.supplierTrackingUrl || "",
    syncAttempts: Number(data.syncAttempts || 0) || 0,
    lastSyncError: data.lastSyncError || "",
  };
}

function buildStatusPatch({
  status,
  reviewNotes,
  adminUid,
}) {
  const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

  if (status === "held") {
    return {
      status: "held",
      fulfillmentStatus: "held",
      supplierPushStatus: "not_sent",
      adminReviewed: true,
      adminApproved: false,
      heldBy: adminUid,
      heldAt: now,
      reviewNotes,
      updatedAt: now,
    };
  }

  if (status === "rejected") {
    return {
      status: "rejected",
      fulfillmentStatus: "rejected",
      supplierPushStatus: "not_sent",
      adminReviewed: true,
      adminApproved: false,
      rejectedBy: adminUid,
      rejectedAt: now,
      reviewNotes,
      updatedAt: now,
    };
  }

  if (status === "approved" || status === "approved_for_supplier") {
    return {
      status: "approved",
      fulfillmentStatus: "approved_for_supplier",
      supplierPushStatus: "queued",
      adminReviewed: true,
      adminApproved: true,
      approvedBy: adminUid,
      approvedAt: now,
      reviewNotes,
      updatedAt: now,
    };
  }

  return {
    status: "awaiting_admin_review",
    fulfillmentStatus: "awaiting_admin_review",
    supplierPushStatus: "not_sent",
    adminReviewed: true,
    adminApproved: false,
    reviewNotes,
    updatedAt: now,
  };
}

async function createAdminActionLog({
  orderId,
  adminUid,
  action,
  notes,
  before,
  after,
}) {
  try {
    await adminDb.collection("adminActions").add({
      orderId: String(orderId || ""),
      adminUid: String(adminUid || ""),
      action: String(action || ""),
      notes: String(notes || ""),
      before: before || null,
      after: after || null,
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to write admin action log:", error);
  }
}

async function createFulfillmentLog({
  orderId,
  actorId,
  action,
  message,
  meta,
}) {
  try {
    await adminDb.collection("fulfillmentLogs").add({
      orderId: String(orderId || ""),
      actorType: "admin",
      actorId: String(actorId || ""),
      action: String(action || ""),
      message: String(message || ""),
      meta: meta || null,
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to write fulfillment log:", error);
  }
}

router.get("/orders", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);
    const profile = await getUserRoleProfile(authUser.uid);

    if (!profile?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Admin access required.",
      });
    }

    const snap = await adminDb.collection("orders").get();

    let orders = snap.docs
      .map(sanitizeOrderForResponse)
      .sort((a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt));

    if (profile.isShopAdmin && profile.shop) {
      orders = orders.filter((order) => orderMatchesShop(order, profile.shop));
    }

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Admin review GET orders error:", error);
    return res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.message || "Failed to load admin orders.",
    });
  }
});

router.patch("/orders/:orderId/status", async (req, res) => {
  try {
    const authUser = await requireAuthUser(req);
    const profile = await getUserRoleProfile(authUser.uid);

    if (!profile?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Admin access required.",
      });
    }

    const orderId = sanitizeText(req.params?.orderId, 200);
    const nextStatus = normalizeStatus(req.body?.status);
    const reviewNotes = sanitizeText(req.body?.reviewNotes, 2000);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "Missing order ID.",
      });
    }

    if (!ADMIN_UPDATE_STATUSES.has(nextStatus)) {
      return res.status(400).json({
        success: false,
        error: "Invalid admin review status.",
      });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const snap = await orderRef.get();

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        error: "Order not found.",
      });
    }

    const existing = snap.data() || {};

    if (profile.isShopAdmin && profile.shop && !orderMatchesShop(existing, profile.shop)) {
      return res.status(403).json({
        success: false,
        error: "You can only review orders belonging to your shop.",
      });
    }

    const patch = buildStatusPatch({
      status: nextStatus,
      reviewNotes,
      adminUid: authUser.uid,
    });

    await orderRef.update(patch);

    const updatedSnap = await orderRef.get();
    const updated = updatedSnap.data() || {};

    await createAdminActionLog({
      orderId,
      adminUid: authUser.uid,
      action: `review_${nextStatus}`,
      notes: reviewNotes,
      before: {
        status: existing?.status || "",
        fulfillmentStatus: existing?.fulfillmentStatus || "",
        supplierPushStatus: existing?.supplierPushStatus || "",
        adminReviewed: existing?.adminReviewed === true,
        adminApproved: existing?.adminApproved === true,
      },
      after: {
        status: updated?.status || "",
        fulfillmentStatus: updated?.fulfillmentStatus || "",
        supplierPushStatus: updated?.supplierPushStatus || "",
        adminReviewed: updated?.adminReviewed === true,
        adminApproved: updated?.adminApproved === true,
      },
    });

    await createFulfillmentLog({
      orderId,
      actorId: authUser.uid,
      action: `review_${nextStatus}`,
      message: `Order moved to ${nextStatus} by admin.`,
      meta: {
        reviewNotes,
      },
    });

    return res.json({
      success: true,
      message: "Order review status updated successfully.",
      order: sanitizeOrderForResponse(updatedSnap),
    });
  } catch (error) {
    console.error("Admin review PATCH order status error:", error);
    return res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.message || "Failed to update order status.",
    });
  }
});

export default router;