import express from "express";
import { adminDb, firebaseAdmin } from "../firebaseAdmin.js";
import {
  validateAdminActionStatus,
  validateAdminReviewEligibility,
  validateApproveAndSendEligibility,
  validateReviewNotes,
} from "../modules/dropship/orderValidators.js";
import {
  buildReviewPricing,
  summarizeReviewFlags,
  summarizeStockState,
} from "../modules/dropship/orderCalculations.js";
import {
  getAllOrders,
  getOrderById,
  updateOrder,
  appendAdminActionLog,
  appendFulfillmentLog,
} from "../modules/dropship/orderRepository.js";
import {
  createHeldState,
  createRejectedState,
  createApprovedForSupplierState,
  createSupplierSentState,
  createSupplierFailedState,
  canTransitionFulfillment,
  normalizeStatus,
} from "../modules/dropship/orderStates.js";
import {
  logAdminReviewAction,
  logSupplierPushQueued,
  logSupplierPushAttempt,
  logSupplierPushSuccess,
  logSupplierPushFailure,
} from "../modules/dropship/orderAudit.js";
import {
  createSupplierPushKey,
  assertSupplierPushNotDuplicated,
} from "../modules/dropship/idempotency.js";
import { getSupplierAdapterForOrder } from "../modules/suppliers/supplierRegistry.js";

const router = express.Router();

function safeTrim(value) {
  return String(value ?? "").trim();
}

function sanitizeText(value, max = 500) {
  return safeTrim(value).slice(0, max);
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

function mapSupplierFieldsFromItems(items = []) {
  const list = Array.isArray(items) ? items : [];
  const firstMapped = list.find(
    (item) =>
      safeTrim(item?.supplierApiType) ||
      safeTrim(item?.supplierId) ||
      safeTrim(item?.supplierProductId) ||
      safeTrim(item?.supplierSku) ||
      safeTrim(item?.supplierVariantId)
  );

  if (!firstMapped) {
    return {
      supplierId: "",
      supplierApiType: "",
    };
  }

  return {
    supplierId: safeTrim(firstMapped?.supplierId),
    supplierApiType: safeTrim(firstMapped?.supplierApiType).toLowerCase(),
  };
}

function sanitizeOrderForResponse(record) {
  const data = record?.data || record || {};

  return {
    id: record?.id || data?.id || "",
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
    reviewFlags: Array.isArray(data.reviewFlags) ? data.reviewFlags : [],
    stockCheckSummary: data.stockCheckSummary || null,
    supplierPushKey: data.supplierPushKey || "",
    supplierPushResponseSummary: data.supplierPushResponseSummary || null,
  };
}

function ensureShopAdminCanAccessOrder(profile, order) {
  if (!profile?.isShopAdmin) return true;
  if (!profile?.shop) {
    const error = new Error("No assigned shop found for this shop admin.");
    error.statusCode = 403;
    throw error;
  }

  if (!orderMatchesShop(order, profile.shop)) {
    const error = new Error("You can only access orders belonging to your shop.");
    error.statusCode = 403;
    throw error;
  }

  return true;
}

function buildBaseReviewPatch(order, reviewNotes) {
  const pricing = buildReviewPricing(order?.pricing || {}, order?.items || []);
  const reviewFlags = summarizeReviewFlags({
    ...order,
    pricing,
  });
  const stockCheckSummary = summarizeStockState(order?.items || []);
  const supplierFields = mapSupplierFieldsFromItems(order?.items || []);

  return {
    pricing,
    reviewFlags,
    stockCheckSummary,
    reviewNotes,
    ...supplierFields,
  };
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

    const rows = await getAllOrders();

    let orders = rows
      .map((row) => sanitizeOrderForResponse(row))
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
    const nextStatus = validateAdminActionStatus(req.body?.status);
    const reviewNotes = validateReviewNotes(req.body?.reviewNotes);

    const record = await getOrderById(orderId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: "Order not found.",
      });
    }

    const order = record.data || {};
    ensureShopAdminCanAccessOrder(profile, order);
    validateAdminReviewEligibility(order);

    const before = {
      status: order?.status || "",
      fulfillmentStatus: order?.fulfillmentStatus || "",
      supplierPushStatus: order?.supplierPushStatus || "",
      adminReviewed: order?.adminReviewed === true,
      adminApproved: order?.adminApproved === true,
    };

    const basePatch = buildBaseReviewPatch(order, reviewNotes);
    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    let patch = {};
    let action = "";

    if (nextStatus === "held") {
      if (
        !canTransitionFulfillment(
          order?.fulfillmentStatus || "awaiting_admin_review",
          "held"
        )
      ) {
        return res.status(409).json({
          success: false,
          error: "Order cannot be moved to held from its current state.",
        });
      }

      patch = {
        ...basePatch,
        status: "held",
        ...createHeldState({
          heldBy: authUser.uid,
          heldAt: now,
          reviewNotes,
        }),
      };
      action = "review_held";
    } else if (nextStatus === "rejected") {
      if (
        !canTransitionFulfillment(
          order?.fulfillmentStatus || "awaiting_admin_review",
          "rejected"
        )
      ) {
        return res.status(409).json({
          success: false,
          error: "Order cannot be rejected from its current state.",
        });
      }

      patch = {
        ...basePatch,
        status: "rejected",
        ...createRejectedState({
          rejectedBy: authUser.uid,
          rejectedAt: now,
          reviewNotes,
        }),
      };
      action = "review_rejected";
    } else if (
      nextStatus === "approved" ||
      nextStatus === "approved_for_supplier"
    ) {
      validateApproveAndSendEligibility(order);
      assertSupplierPushNotDuplicated(order);

      if (
        !canTransitionFulfillment(
          order?.fulfillmentStatus || "awaiting_admin_review",
          "approved_for_supplier"
        )
      ) {
        return res.status(409).json({
          success: false,
          error: "Order cannot be approved from its current state.",
        });
      }

      const supplierPushKey = createSupplierPushKey({
        id: record.id,
        ...order,
      });

      patch = {
        ...basePatch,
        status: "approved",
        supplierPushKey,
        ...createApprovedForSupplierState({
          approvedBy: authUser.uid,
          approvedAt: now,
          reviewNotes,
        }),
      };
      action = "review_approved";
    } else {
      patch = {
        ...basePatch,
        status: "awaiting_admin_review",
        fulfillmentStatus: "awaiting_admin_review",
        supplierPushStatus: "not_sent",
        adminReviewed: true,
        adminApproved: false,
      };
      action = "review_reset";
    }

    const updatedRecord = await updateOrder(orderId, patch);
    const updatedOrder = updatedRecord.data || {};

    const after = {
      status: updatedOrder?.status || "",
      fulfillmentStatus: updatedOrder?.fulfillmentStatus || "",
      supplierPushStatus: updatedOrder?.supplierPushStatus || "",
      adminReviewed: updatedOrder?.adminReviewed === true,
      adminApproved: updatedOrder?.adminApproved === true,
    };

    await logAdminReviewAction({
      orderId,
      adminUid: authUser.uid,
      action,
      notes: reviewNotes,
      before,
      after,
    });

    if (
      nextStatus === "approved" ||
      nextStatus === "approved_for_supplier"
    ) {
      await logSupplierPushQueued({
        orderId,
        actorId: authUser.uid,
        supplier: updatedOrder?.supplierApiType || "cj",
        reviewNotes,
      });

      const adapter = getSupplierAdapterForOrder({
        id: updatedRecord.id,
        ...updatedOrder,
      });

      await logSupplierPushAttempt({
        orderId,
        actorId: authUser.uid,
        supplier: adapter?.key || updatedOrder?.supplierApiType || "cj",
        payloadSummary:
          typeof adapter?.summarizePayload === "function"
            ? adapter.summarizePayload(
                adapter.buildOrderPayload({
                  id: updatedRecord.id,
                  ...updatedOrder,
                })
              )
            : null,
      });

      try {
        const supplierResult = await adapter.createSupplierOrder({
          id: updatedRecord.id,
          ...updatedOrder,
        });

        const sentPatch = {
          status: "approved",
          supplierPushResponseSummary: supplierResult?.raw || null,
          lastSyncError: "",
          syncAttempts: Number(updatedOrder?.syncAttempts || 0) + 1,
          ...createSupplierSentState({
            supplierOrderId: supplierResult?.supplierOrderId || "",
            supplierStatus: supplierResult?.supplierStatus || "submitted",
            lastSupplierPushAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          }),
        };

        const sentRecord = await updateOrder(orderId, sentPatch);

        await logSupplierPushSuccess({
          orderId,
          actorId: authUser.uid,
          supplier: adapter?.key || "cj",
          supplierOrderId: supplierResult?.supplierOrderId || "",
          supplierStatus: supplierResult?.supplierStatus || "",
          responseSummary: supplierResult?.raw || null,
        });

        return res.json({
          success: true,
          message: "Order approved and sent to supplier successfully.",
          order: sanitizeOrderForResponse(sentRecord),
        });
      } catch (supplierError) {
        const failedPatch = {
          status: "approved",
          syncAttempts: Number(updatedOrder?.syncAttempts || 0) + 1,
          supplierPushResponseSummary: supplierError?.meta || null,
          ...createSupplierFailedState({
            lastSyncError: supplierError?.message || "Supplier push failed.",
            syncAttempts: Number(updatedOrder?.syncAttempts || 0) + 1,
            lastSupplierSyncAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          }),
        };

        const failedRecord = await updateOrder(orderId, failedPatch);

        await logSupplierPushFailure({
          orderId,
          actorId: authUser.uid,
          supplier:
            updatedOrder?.supplierApiType ||
            adapter?.key ||
            "cj",
          errorMessage: supplierError?.message || "Supplier push failed.",
          responseSummary: supplierError?.meta || null,
        });

        return res.status(supplierError?.statusCode || 502).json({
          success: false,
          error: supplierError?.message || "Supplier push failed.",
          order: sanitizeOrderForResponse(failedRecord),
        });
      }
    }

    return res.json({
      success: true,
      message: "Order review status updated successfully.",
      order: sanitizeOrderForResponse(updatedRecord),
    });
  } catch (error) {
    console.error("Admin review PATCH order status error:", error);
    return res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.message || "Failed to update order status.",
    });
  }
});

router.post("/orders/:orderId/retry-push", async (req, res) => {
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
    const record = await getOrderById(orderId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: "Order not found.",
      });
    }

    ensureShopAdminCanAccessOrder(profile, record.data || {});
    validateApproveAndSendEligibility(record.data || {});
    assertSupplierPushNotDuplicated(record.data || {});

    const adapter = getSupplierAdapterForOrder({
      id: record.id,
      ...record.data,
    });

    await logSupplierPushAttempt({
      orderId,
      actorId: authUser.uid,
      supplier: adapter?.key || record?.data?.supplierApiType || "cj",
      payloadSummary:
        typeof adapter?.summarizePayload === "function"
          ? adapter.summarizePayload(
              adapter.buildOrderPayload({
                id: record.id,
                ...record.data,
              })
            )
          : null,
    });

    try {
      const supplierResult = await adapter.createSupplierOrder({
        id: record.id,
        ...record.data,
      });

      const sentRecord = await updateOrder(orderId, {
        status: "approved",
        supplierPushResponseSummary: supplierResult?.raw || null,
        lastSyncError: "",
        syncAttempts: Number(record?.data?.syncAttempts || 0) + 1,
        ...createSupplierSentState({
          supplierOrderId: supplierResult?.supplierOrderId || "",
          supplierStatus: supplierResult?.supplierStatus || "submitted",
          lastSupplierPushAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        }),
      });

      await logSupplierPushSuccess({
        orderId,
        actorId: authUser.uid,
        supplier: adapter?.key || "cj",
        supplierOrderId: supplierResult?.supplierOrderId || "",
        supplierStatus: supplierResult?.supplierStatus || "",
        responseSummary: supplierResult?.raw || null,
      });

      return res.json({
        success: true,
        message: "Supplier push retried successfully.",
        order: sanitizeOrderForResponse(sentRecord),
      });
    } catch (supplierError) {
      const failedRecord = await updateOrder(orderId, {
        syncAttempts: Number(record?.data?.syncAttempts || 0) + 1,
        supplierPushResponseSummary: supplierError?.meta || null,
        ...createSupplierFailedState({
          lastSyncError: supplierError?.message || "Supplier push retry failed.",
          syncAttempts: Number(record?.data?.syncAttempts || 0) + 1,
          lastSupplierSyncAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        }),
      });

      await logSupplierPushFailure({
        orderId,
        actorId: authUser.uid,
        supplier: adapter?.key || record?.data?.supplierApiType || "cj",
        errorMessage: supplierError?.message || "Supplier push retry failed.",
        responseSummary: supplierError?.meta || null,
      });

      return res.status(supplierError?.statusCode || 502).json({
        success: false,
        error: supplierError?.message || "Supplier push retry failed.",
        order: sanitizeOrderForResponse(failedRecord),
      });
    }
  } catch (error) {
    console.error("Admin review retry push error:", error);
    return res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.message || "Failed to retry supplier push.",
    });
  }
});

export default router;