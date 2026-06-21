// src/routes/deliveryRoutes.js
import express from "express";
import { adminDb, firebaseAdmin } from "../firebaseAdmin.js";

const router = express.Router();

/* ══════════════════════════════════════
   CONSTANTS — mirror the data model from
   the Beme Delivery architecture spec
══════════════════════════════════════ */
const DELIVERY_STATUS = {
  PENDING_DISPATCH: "pending_dispatch",
  DISPATCHED:       "dispatched",
  PICKED_UP:        "picked_up",
  IN_TRANSIT:       "in_transit",
  DELIVERED:        "delivered",
  FAILED:           "failed",
};

const PAY_AT_DOOR_STATUS = {
  AWAITING_PAYMENT: "awaiting_payment",
  PAID:             "paid",
  FAILED:           "failed",
};

const COURIER_PROVIDERS = ["kwikdelivery", "cheetah", "glovo", "dhl"];

// What Beme pays the courier (GHS) — used to compute margin at dispatch time.
const COURIER_COST_TABLE = {
  kwikdelivery: { within_accra: 18, accra_to_kumasi: 30, accra_to_regions: 38, nationwide: 35 },
  cheetah:      { within_accra: 20, accra_to_kumasi: 32, accra_to_regions: 40, nationwide: 38 },
  glovo:        { within_accra: 25, accra_to_kumasi: null, accra_to_regions: null, nationwide: null },
  dhl:          { within_accra: 50, accra_to_kumasi: 65, accra_to_regions: 70, nationwide: 68 },
};

const VALID_ZONES = ["within_accra", "accra_to_kumasi", "accra_to_regions", "nationwide"];

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function safeTrim(v) { return String(v ?? "").trim(); }
function sanitizeText(v, max = 200) { return safeTrim(v).slice(0, max); }
function toNumber(v, fb = 0) { const n = Number(v); return Number.isFinite(n) ? n : fb; }

/**
 * Inline auth — no middleware/auth.js exists in this codebase.
 * Every route in this file requires the caller to be admin or super_admin.
 */
async function requireAdmin(req) {
  const authHeader = String(req.headers.authorization || "");
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error("Missing authorization token.");
    error.statusCode = 401;
    throw error;
  }
  const decoded = await firebaseAdmin.auth().verifyIdToken(match[1], true);
  if (!decoded?.uid) {
    const error = new Error("Invalid authorization token.");
    error.statusCode = 401;
    throw error;
  }

  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const role = userSnap.exists ? userSnap.data()?.role : null;
  if (role !== "admin" && role !== "super_admin") {
    const error = new Error("Admin access required.");
    error.statusCode = 403;
    throw error;
  }

  return decoded;
}

function computeCourierCost(provider, zone) {
  const p = sanitizeText(provider, 40).toLowerCase();
  const z = sanitizeText(zone, 40).toLowerCase();
  if (!COURIER_PROVIDERS.includes(p) || !VALID_ZONES.includes(z)) return null;
  const cost = COURIER_COST_TABLE[p]?.[z];
  return typeof cost === "number" ? cost : null;
}

function serializeOrder(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    userId: data.userId || "",
    status: data.status || "",
    paymentMethod: data.paymentMethod || "",
    paymentStatus: data.paymentStatus || "",
    customer: data.customer || null,
    items: Array.isArray(data.items) ? data.items : [],
    pricing: data.pricing || null,
    delivery: data.delivery || null,
    shopOwnerId: data.shopOwnerId || data.storeId || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

function serializeDispatch(docSnap) {
  const data = docSnap.data() || {};
  return { id: docSnap.id, ...data };
}

async function getOrderOrThrow(orderId) {
  const ref = adminDb.collection("orders").doc(sanitizeText(orderId, 200));
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Order not found.");
    error.statusCode = 404;
    throw error;
  }
  return { ref, snap, data: snap.data() || {} };
}

/* ══════════════════════════════════════
   GET /api/delivery/queue
   Orders needing dispatch attention — isBemeDelivery=true,
   status in pending_dispatch/dispatched/picked_up/in_transit.
   Used by the admin Dispatch dashboard.
══════════════════════════════════════ */
router.get("/queue", async (req, res) => {
  try {
    await requireAdmin(req);

    const statusFilter = sanitizeText(req.query?.status, 40);
    const snap = await adminDb
      .collection("orders")
      .where("delivery.isBemeDelivery", "==", true)
      .get();

    let orders = snap.docs.map(serializeOrder).filter((o) => o.delivery);

    if (statusFilter) {
      orders = orders.filter((o) => o.delivery?.status === statusFilter);
    } else {
      // Default: only show orders not yet delivered/failed (the active queue)
      orders = orders.filter((o) =>
        ![DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.FAILED].includes(o.delivery?.status)
      );
    }

    orders.sort((a, b) => {
      const at = a.createdAt?._seconds || a.createdAt?.seconds || 0;
      const bt = b.createdAt?._seconds || b.createdAt?.seconds || 0;
      return bt - at;
    });

    return res.json({ success: true, orders, total: orders.length });
  } catch (error) {
    console.error("[deliveryRoutes] GET /queue error:", error);
    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Failed to load dispatch queue." });
  }
});

/* ══════════════════════════════════════
   POST /api/delivery/:orderId/dispatch
   Admin books a courier — enters provider, tracking number, zone.
   Computes courier cost + margin server-side from the cost table.
══════════════════════════════════════ */
router.post("/:orderId/dispatch", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const { orderId } = req.params;
    const { ref, data } = await getOrderOrThrow(orderId);

    if (!data?.delivery?.isBemeDelivery) {
      return res.status(400).json({ success: false, error: "This order is not a Beme-courier delivery." });
    }
    const currentStatus = data?.delivery?.status;
    if (currentStatus && currentStatus !== DELIVERY_STATUS.PENDING_DISPATCH) {
      return res.status(400).json({ success: false, error: `Order is already ${currentStatus}, cannot dispatch again.` });
    }

    const courierProvider = sanitizeText(req.body?.courierProvider, 40).toLowerCase();
    const trackingNumber  = sanitizeText(req.body?.trackingNumber, 120);
    const zone             = sanitizeText(req.body?.zone, 40).toLowerCase();
    const estimatedPickup  = sanitizeText(req.body?.estimatedPickup, 120);
    const notes            = sanitizeText(req.body?.notes, 500);

    if (!COURIER_PROVIDERS.includes(courierProvider)) {
      return res.status(400).json({ success: false, error: "Invalid courier provider." });
    }
    if (!trackingNumber) {
      return res.status(400).json({ success: false, error: "Tracking number is required." });
    }
    if (!VALID_ZONES.includes(zone)) {
      return res.status(400).json({ success: false, error: "Invalid delivery zone." });
    }

    const courierCost = computeCourierCost(courierProvider, zone);
    if (courierCost === null) {
      return res.status(400).json({ success: false, error: `${courierProvider} does not service this zone.` });
    }

    const deliveryFee = toNumber(data?.delivery?.fee, 0);
    const margin       = Math.round((deliveryFee - courierCost) * 100) / 100;

    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    await ref.update({
      "delivery.status":         DELIVERY_STATUS.DISPATCHED,
      "delivery.courierProvider": courierProvider,
      "delivery.trackingNumber":  trackingNumber,
      "delivery.zone":             zone,
      "delivery.courierCost":      courierCost,
      "delivery.margin":           margin,
      "delivery.estimatedPickup":  estimatedPickup,
      "delivery.notes":            notes,
      "delivery.dispatchedAt":     now,
      "delivery.dispatchedBy":     admin.uid,
      updatedAt: now,
    });

    // Log a dispatch record for accounting/audit trail
    await adminDb.collection("dispatches").add({
      orderId, sellerId: data?.shopOwnerId || data?.storeId || null,
      sellerAddress:  "", // Phase 1: not populated, no seller address lookup yet
      customerName:   `${data?.customer?.firstName || ""} ${data?.customer?.lastName || ""}`.trim(),
      customerAddress: data?.customer?.address || "",
      customerPhone:   data?.customer?.phone || "",
      courierProvider, trackingNumber, estimatedPickup, zone,
      courierCost, deliveryFee, margin,
      status: DELIVERY_STATUS.DISPATCHED,
      paymentMethod: data?.paymentMethod || "",
      paymentTiming: data?.delivery?.paymentTiming || "",
      notes,
      bookedAt: now, bookedBy: admin.uid,
    });

    return res.json({ success: true, message: "Courier dispatched.", courierCost, margin });
  } catch (error) {
    console.error("[deliveryRoutes] POST /dispatch error:", error);
    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Failed to dispatch courier." });
  }
});

/* ══════════════════════════════════════
   POST /api/delivery/:orderId/pickup
   Admin marks courier has collected the package from the seller.
══════════════════════════════════════ */
router.post("/:orderId/pickup", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const { orderId } = req.params;
    const { ref, data } = await getOrderOrThrow(orderId);

    if (!data?.delivery?.isBemeDelivery) {
      return res.status(400).json({ success: false, error: "This order is not a Beme-courier delivery." });
    }
    const currentStatus = data?.delivery?.status;
    if (currentStatus !== DELIVERY_STATUS.DISPATCHED) {
      return res.status(400).json({ success: false, error: `Order must be "dispatched" before pickup. Currently: ${currentStatus || "unknown"}.` });
    }

    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();
    await ref.update({
      "delivery.status":    DELIVERY_STATUS.PICKED_UP,
      "delivery.pickedUpAt": now,
      updatedAt: now,
    });

    return res.json({ success: true, message: "Marked as picked up." });
  } catch (error) {
    console.error("[deliveryRoutes] POST /pickup error:", error);
    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Failed to mark pickup." });
  }
});

/* ══════════════════════════════════════
   POST /api/delivery/:orderId/in-transit
   Optional intermediate step — courier is en route to customer.
   Required before the customer's "Pay Now" button can appear for
   pay_at_door orders (per spec: picked_up OR in_transit).
══════════════════════════════════════ */
router.post("/:orderId/in-transit", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const { orderId } = req.params;
    const { ref, data } = await getOrderOrThrow(orderId);

    if (!data?.delivery?.isBemeDelivery) {
      return res.status(400).json({ success: false, error: "This order is not a Beme-courier delivery." });
    }
    const currentStatus = data?.delivery?.status;
    if (currentStatus !== DELIVERY_STATUS.PICKED_UP) {
      return res.status(400).json({ success: false, error: `Order must be "picked_up" before in-transit. Currently: ${currentStatus || "unknown"}.` });
    }

    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();
    await ref.update({
      "delivery.status": DELIVERY_STATUS.IN_TRANSIT,
      updatedAt: now,
    });

    return res.json({ success: true, message: "Marked as in transit." });
  } catch (error) {
    console.error("[deliveryRoutes] POST /in-transit error:", error);
    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Failed to mark in transit." });
  }
});

/* ══════════════════════════════════════
   POST /api/delivery/:orderId/deliver
   Admin confirms delivery completed.
   BLOCKED for pay_at_door orders until payAtDoorStatus === "paid" —
   this is the safety rail: admin cannot mark delivered (and unlock
   seller payout) on an unpaid pay-at-door order.
══════════════════════════════════════ */
router.post("/:orderId/deliver", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const { orderId } = req.params;
    const { ref, data } = await getOrderOrThrow(orderId);

    if (!data?.delivery?.isBemeDelivery) {
      return res.status(400).json({ success: false, error: "This order is not a Beme-courier delivery." });
    }

    const currentStatus = data?.delivery?.status;
    if (![DELIVERY_STATUS.PICKED_UP, DELIVERY_STATUS.IN_TRANSIT].includes(currentStatus)) {
      return res.status(400).json({ success: false, error: `Order must be picked up or in transit before delivery. Currently: ${currentStatus || "unknown"}.` });
    }

    const paymentTiming = data?.delivery?.paymentTiming;
    if (paymentTiming === "pay_at_door") {
      const payAtDoorStatus = data?.delivery?.payAtDoorStatus;
      if (payAtDoorStatus !== PAY_AT_DOOR_STATUS.PAID) {
        return res.status(400).json({
          success: false,
          error: "Cannot mark delivered — Pay at Door payment has not been confirmed for this order yet.",
        });
      }
    }

    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();
    await ref.update({
      "delivery.status":      DELIVERY_STATUS.DELIVERED,
      "delivery.deliveredAt":  now,
      "delivery.deliveredBy":  admin.uid,
      "delivery.confirmBy":    null, // Phase 1: 48h auto-confirm window is computed client-side from deliveredAt
      "delivery.payoutLocked": false,
      updatedAt: now,
    });

    return res.json({ success: true, message: "Marked as delivered. Seller payout unlocked." });
  } catch (error) {
    console.error("[deliveryRoutes] POST /deliver error:", error);
    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Failed to mark delivered." });
  }
});

/* ══════════════════════════════════════
   POST /api/delivery/:orderId/fail
   Admin marks a genuine delivery failure (wrong address, customer
   unreachable, etc) — distinct from a pay_at_door payment failure.
   Payout stays locked; admin can retry by re-dispatching.
══════════════════════════════════════ */
router.post("/:orderId/fail", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const { orderId } = req.params;
    const { ref, data } = await getOrderOrThrow(orderId);

    if (!data?.delivery?.isBemeDelivery) {
      return res.status(400).json({ success: false, error: "This order is not a Beme-courier delivery." });
    }

    const failReason = sanitizeText(req.body?.reason, 500);
    if (!failReason) {
      return res.status(400).json({ success: false, error: "A failure reason is required." });
    }

    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();
    await ref.update({
      "delivery.status":      DELIVERY_STATUS.FAILED,
      "delivery.failedAt":     now,
      "delivery.failReason":   failReason,
      "delivery.payoutLocked": true,
      updatedAt: now,
    });

    return res.json({ success: true, message: "Marked as failed. Payout remains locked." });
  } catch (error) {
    console.error("[deliveryRoutes] POST /fail error:", error);
    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Failed to mark delivery failure." });
  }
});

/* ══════════════════════════════════════
   POST /api/delivery/:orderId/retry
   Admin resets a failed delivery back to pending_dispatch for
   re-booking with a courier. Clears failure fields.
══════════════════════════════════════ */
router.post("/:orderId/retry", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const { orderId } = req.params;
    const { ref, data } = await getOrderOrThrow(orderId);

    if (!data?.delivery?.isBemeDelivery) {
      return res.status(400).json({ success: false, error: "This order is not a Beme-courier delivery." });
    }
    const currentStatus = data?.delivery?.status;
    if (currentStatus !== DELIVERY_STATUS.FAILED) {
      return res.status(400).json({ success: false, error: "Only failed deliveries can be retried." });
    }

    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();
    await ref.update({
      "delivery.status":         DELIVERY_STATUS.PENDING_DISPATCH,
      "delivery.failedAt":        null,
      "delivery.failReason":      null,
      "delivery.courierProvider": null,
      "delivery.trackingNumber":  null,
      "delivery.zone":            null,
      "delivery.courierCost":     null,
      "delivery.margin":          null,
      "delivery.dispatchedAt":    null,
      "delivery.dispatchedBy":    null,
      "delivery.pickedUpAt":      null,
      updatedAt: now,
    });

    return res.json({ success: true, message: "Order reset to pending dispatch for re-booking." });
  } catch (error) {
    console.error("[deliveryRoutes] POST /retry error:", error);
    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Failed to retry delivery." });
  }
});

/* ══════════════════════════════════════
   POST /api/delivery/:orderId/payment-failed-at-door
   Marks a Pay-at-Door PAYMENT failure (card declined, no MoMo
   balance, etc) at the moment of delivery. This is explicitly NOT
   a delivery failure — delivery.status is untouched, courier is not
   penalized. Order returns to the dispatch queue for reschedule via
   payAtDoorStatus, which the admin queue should filter on.
══════════════════════════════════════ */
router.post("/:orderId/payment-failed-at-door", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const { orderId } = req.params;
    const { ref, data } = await getOrderOrThrow(orderId);

    if (data?.delivery?.paymentTiming !== "pay_at_door") {
      return res.status(400).json({ success: false, error: "This order is not a Pay-at-Door order." });
    }

    const note = sanitizeText(req.body?.note, 500);
    const now  = firebaseAdmin.firestore.FieldValue.serverTimestamp();

    await ref.update({
      "delivery.payAtDoorStatus": PAY_AT_DOOR_STATUS.FAILED,
      "delivery.notes":           note || data?.delivery?.notes || "",
      updatedAt: now,
    });

    return res.json({ success: true, message: "Payment failure at door recorded. Delivery status unaffected — order queued for reschedule." });
  } catch (error) {
    console.error("[deliveryRoutes] POST /payment-failed-at-door error:", error);
    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Failed to record payment failure." });
  }
});

/* ══════════════════════════════════════
   POST /api/delivery/:orderId/reschedule-payment
   Admin resets a failed pay-at-door payment back to awaiting_payment
   so the customer's "Pay Now" button reappears on their next visit
   (gated on delivery.status already being picked_up/in_transit).
══════════════════════════════════════ */
router.post("/:orderId/reschedule-payment", async (req, res) => {
  try {
    await requireAdmin(req);
    const { orderId } = req.params;
    const { ref, data } = await getOrderOrThrow(orderId);

    if (data?.delivery?.paymentTiming !== "pay_at_door") {
      return res.status(400).json({ success: false, error: "This order is not a Pay-at-Door order." });
    }
    if (data?.delivery?.payAtDoorStatus !== PAY_AT_DOOR_STATUS.FAILED) {
      return res.status(400).json({ success: false, error: "Only a failed Pay-at-Door payment can be rescheduled." });
    }

    const now = firebaseAdmin.firestore.FieldValue.serverTimestamp();
    await ref.update({
      "delivery.payAtDoorStatus":   PAY_AT_DOOR_STATUS.AWAITING_PAYMENT,
      "delivery.payAtDoorReference": null,
      updatedAt: now,
    });

    return res.json({ success: true, message: "Payment rescheduled. Customer can try Pay Now again." });
  } catch (error) {
    console.error("[deliveryRoutes] POST /reschedule-payment error:", error);
    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Failed to reschedule payment." });
  }
});

/* ══════════════════════════════════════
   GET /api/delivery/stats
   Lightweight counts for the admin dispatch dashboard header.
══════════════════════════════════════ */
router.get("/stats", async (req, res) => {
  try {
    await requireAdmin(req);

    const snap = await adminDb
      .collection("orders")
      .where("delivery.isBemeDelivery", "==", true)
      .get();

    const counts = {
      pending_dispatch: 0,
      dispatched:       0,
      picked_up:        0,
      in_transit:       0,
      delivered:        0,
      failed:           0,
      awaiting_payment_at_door: 0,
      payment_failed_at_door:   0,
    };

    let totalMargin = 0;

    snap.docs.forEach((docSnap) => {
      const d = docSnap.data() || {};
      const status = d?.delivery?.status;
      if (status && counts[status] !== undefined) counts[status] += 1;

      if (d?.delivery?.paymentTiming === "pay_at_door") {
        if (d?.delivery?.payAtDoorStatus === PAY_AT_DOOR_STATUS.AWAITING_PAYMENT) counts.awaiting_payment_at_door += 1;
        if (d?.delivery?.payAtDoorStatus === PAY_AT_DOOR_STATUS.FAILED) counts.payment_failed_at_door += 1;
      }

      if (status === DELIVERY_STATUS.DELIVERED && typeof d?.delivery?.margin === "number") {
        totalMargin += d.delivery.margin;
      }
    });

    return res.json({
      success: true,
      counts,
      totalMargin: Math.round(totalMargin * 100) / 100,
      totalOrders: snap.size,
    });
  } catch (error) {
    console.error("[deliveryRoutes] GET /stats error:", error);
    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Failed to load stats." });
  }
});

export default router;