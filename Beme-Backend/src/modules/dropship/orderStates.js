export const PAYMENT_STATUSES = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
});

export const FULFILLMENT_STATUSES = Object.freeze({
  AWAITING_PAYMENT: "awaiting_payment",
  PAID: "paid",
  AWAITING_ADMIN_REVIEW: "awaiting_admin_review",
  APPROVED_FOR_SUPPLIER: "approved_for_supplier",
  HELD: "held",
  REJECTED: "rejected",
  SENT_TO_SUPPLIER: "sent_to_supplier",
  SUPPLIER_CONFIRMED: "supplier_confirmed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  FAILED: "failed",
});

export const SUPPLIER_PUSH_STATUSES = Object.freeze({
  NOT_SENT: "not_sent",
  QUEUED: "queued",
  SENT: "sent",
  CONFIRMED: "confirmed",
  FAILED: "failed",
});

export function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

export function createInitialCodState() {
  return {
    paymentStatus: PAYMENT_STATUSES.PENDING,
    fulfillmentStatus: FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW,
    supplierPushStatus: SUPPLIER_PUSH_STATUSES.NOT_SENT,
    adminReviewed: false,
    adminApproved: false,
  };
}

export function createInitialPaystackPendingState() {
  return {
    paymentStatus: PAYMENT_STATUSES.PENDING,
    fulfillmentStatus: FULFILLMENT_STATUSES.AWAITING_PAYMENT,
    supplierPushStatus: SUPPLIER_PUSH_STATUSES.NOT_SENT,
    adminReviewed: false,
    adminApproved: false,
  };
}

export function createInitialPaidState() {
  return {
    paymentStatus: PAYMENT_STATUSES.PAID,
    fulfillmentStatus: FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW,
    supplierPushStatus: SUPPLIER_PUSH_STATUSES.NOT_SENT,
    adminReviewed: false,
    adminApproved: false,
  };
}

export function createHeldState({ heldBy = "", heldAt = null, reviewNotes = "" } = {}) {
  return {
    fulfillmentStatus: FULFILLMENT_STATUSES.HELD,
    supplierPushStatus: SUPPLIER_PUSH_STATUSES.NOT_SENT,
    adminReviewed: true,
    adminApproved: false,
    heldBy,
    heldAt,
    reviewNotes,
  };
}

export function createRejectedState({
  rejectedBy = "",
  rejectedAt = null,
  reviewNotes = "",
} = {}) {
  return {
    fulfillmentStatus: FULFILLMENT_STATUSES.REJECTED,
    supplierPushStatus: SUPPLIER_PUSH_STATUSES.NOT_SENT,
    adminReviewed: true,
    adminApproved: false,
    rejectedBy,
    rejectedAt,
    reviewNotes,
  };
}

export function createApprovedForSupplierState({
  approvedBy = "",
  approvedAt = null,
  reviewNotes = "",
} = {}) {
  return {
    fulfillmentStatus: FULFILLMENT_STATUSES.APPROVED_FOR_SUPPLIER,
    supplierPushStatus: SUPPLIER_PUSH_STATUSES.QUEUED,
    adminReviewed: true,
    adminApproved: true,
    approvedBy,
    approvedAt,
    reviewNotes,
  };
}

export function createSupplierSentState({
  supplierOrderId = "",
  supplierStatus = "",
  lastSupplierPushAt = null,
} = {}) {
  return {
    fulfillmentStatus: FULFILLMENT_STATUSES.SENT_TO_SUPPLIER,
    supplierPushStatus: SUPPLIER_PUSH_STATUSES.SENT,
    supplierOrderId,
    supplierStatus,
    lastSupplierPushAt,
  };
}

export function createSupplierConfirmedState({
  supplierOrderId = "",
  supplierStatus = "",
  supplierTrackingNumber = "",
  supplierTrackingUrl = "",
  lastSupplierSyncAt = null,
} = {}) {
  return {
    fulfillmentStatus: FULFILLMENT_STATUSES.SUPPLIER_CONFIRMED,
    supplierPushStatus: SUPPLIER_PUSH_STATUSES.CONFIRMED,
    supplierOrderId,
    supplierStatus,
    supplierTrackingNumber,
    supplierTrackingUrl,
    lastSupplierSyncAt,
  };
}

export function createShippedState({
  supplierStatus = "shipped",
  supplierTrackingNumber = "",
  supplierTrackingUrl = "",
  lastSupplierSyncAt = null,
} = {}) {
  return {
    fulfillmentStatus: FULFILLMENT_STATUSES.SHIPPED,
    supplierPushStatus: SUPPLIER_PUSH_STATUSES.CONFIRMED,
    supplierStatus,
    supplierTrackingNumber,
    supplierTrackingUrl,
    lastSupplierSyncAt,
  };
}

export function createDeliveredState({
  supplierStatus = "delivered",
  lastSupplierSyncAt = null,
} = {}) {
  return {
    fulfillmentStatus: FULFILLMENT_STATUSES.DELIVERED,
    supplierPushStatus: SUPPLIER_PUSH_STATUSES.CONFIRMED,
    supplierStatus,
    lastSupplierSyncAt,
  };
}

export function createSupplierFailedState({
  lastSyncError = "",
  syncAttempts = 0,
  lastSupplierSyncAt = null,
} = {}) {
  return {
    fulfillmentStatus: FULFILLMENT_STATUSES.FAILED,
    supplierPushStatus: SUPPLIER_PUSH_STATUSES.FAILED,
    lastSyncError,
    syncAttempts,
    lastSupplierSyncAt,
  };
}

export function canTransitionFulfillment(fromStatus, toStatus) {
  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus);

  if (!to) return false;
  if (!from) return true;
  if (from === to) return true;

  const allowed = {
    [FULFILLMENT_STATUSES.AWAITING_PAYMENT]: [
      FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW,
      FULFILLMENT_STATUSES.FAILED,
    ],
    [FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW]: [
      FULFILLMENT_STATUSES.HELD,
      FULFILLMENT_STATUSES.REJECTED,
      FULFILLMENT_STATUSES.APPROVED_FOR_SUPPLIER,
      FULFILLMENT_STATUSES.FAILED,
    ],
    [FULFILLMENT_STATUSES.HELD]: [
      FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW,
      FULFILLMENT_STATUSES.REJECTED,
      FULFILLMENT_STATUSES.APPROVED_FOR_SUPPLIER,
      FULFILLMENT_STATUSES.FAILED,
    ],
    [FULFILLMENT_STATUSES.REJECTED]: [],
    [FULFILLMENT_STATUSES.APPROVED_FOR_SUPPLIER]: [
      FULFILLMENT_STATUSES.SENT_TO_SUPPLIER,
      FULFILLMENT_STATUSES.HELD,
      FULFILLMENT_STATUSES.FAILED,
    ],
    [FULFILLMENT_STATUSES.SENT_TO_SUPPLIER]: [
      FULFILLMENT_STATUSES.SUPPLIER_CONFIRMED,
      FULFILLMENT_STATUSES.SHIPPED,
      FULFILLMENT_STATUSES.FAILED,
    ],
    [FULFILLMENT_STATUSES.SUPPLIER_CONFIRMED]: [
      FULFILLMENT_STATUSES.SHIPPED,
      FULFILLMENT_STATUSES.DELIVERED,
      FULFILLMENT_STATUSES.FAILED,
    ],
    [FULFILLMENT_STATUSES.SHIPPED]: [
      FULFILLMENT_STATUSES.DELIVERED,
      FULFILLMENT_STATUSES.FAILED,
    ],
    [FULFILLMENT_STATUSES.DELIVERED]: [],
    [FULFILLMENT_STATUSES.FAILED]: [],
    [FULFILLMENT_STATUSES.PAID]: [
      FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW,
      FULFILLMENT_STATUSES.FAILED,
    ],
  };

  return Array.isArray(allowed[from]) ? allowed[from].includes(to) : false;
}

export function isTerminalFulfillmentStatus(status) {
  const normalized = normalizeStatus(status);
  return [
    FULFILLMENT_STATUSES.REJECTED,
    FULFILLMENT_STATUSES.DELIVERED,
    FULFILLMENT_STATUSES.FAILED,
  ].includes(normalized);
}