export const PAYMENT_STATUSES = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

export const FULFILLMENT_STATUSES = {
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
};

export const SUPPLIER_PUSH_STATUSES = {
  NOT_SENT: "not_sent",
  QUEUED: "queued",
  SENT: "sent",
  CONFIRMED: "confirmed",
  FAILED: "failed",
};

export function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

export function titleizeStatus(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function isPaymentPaid(order) {
  const paymentStatus = normalizeStatus(order?.paymentStatus);
  const status = normalizeStatus(order?.status);

  return (
    order?.paid === true ||
    paymentStatus === PAYMENT_STATUSES.PAID ||
    status === PAYMENT_STATUSES.PAID
  );
}

export function getFulfillmentStatus(order) {
  const fulfillmentStatus = normalizeStatus(order?.fulfillmentStatus);
  if (fulfillmentStatus) return fulfillmentStatus;

  const status = normalizeStatus(order?.status);
  const paymentStatus = normalizeStatus(order?.paymentStatus);

  if (status === FULFILLMENT_STATUSES.HELD) {
    return FULFILLMENT_STATUSES.HELD;
  }

  if (status === FULFILLMENT_STATUSES.REJECTED) {
    return FULFILLMENT_STATUSES.REJECTED;
  }

  if (
    status === FULFILLMENT_STATUSES.APPROVED_FOR_SUPPLIER ||
    status === "approved"
  ) {
    return FULFILLMENT_STATUSES.APPROVED_FOR_SUPPLIER;
  }

  if (status === FULFILLMENT_STATUSES.SENT_TO_SUPPLIER) {
    return FULFILLMENT_STATUSES.SENT_TO_SUPPLIER;
  }

  if (status === FULFILLMENT_STATUSES.SUPPLIER_CONFIRMED) {
    return FULFILLMENT_STATUSES.SUPPLIER_CONFIRMED;
  }

  if (status === FULFILLMENT_STATUSES.SHIPPED) {
    return FULFILLMENT_STATUSES.SHIPPED;
  }

  if (status === FULFILLMENT_STATUSES.DELIVERED) {
    return FULFILLMENT_STATUSES.DELIVERED;
  }

  if (paymentStatus === PAYMENT_STATUSES.PAID || status === "paid") {
    return FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW;
  }

  if (status === "pending" && order?.paymentMethod === "cod") {
    return FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW;
  }

  if (status === "pending_payment" || paymentStatus === PAYMENT_STATUSES.PENDING) {
    return FULFILLMENT_STATUSES.AWAITING_PAYMENT;
  }

  return status || FULFILLMENT_STATUSES.AWAITING_PAYMENT;
}

export function getSupplierPushStatus(order) {
  const supplierPushStatus = normalizeStatus(order?.supplierPushStatus);
  if (supplierPushStatus) return supplierPushStatus;

  const fulfillmentStatus = getFulfillmentStatus(order);

  if (
    fulfillmentStatus === FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW ||
    fulfillmentStatus === FULFILLMENT_STATUSES.HELD ||
    fulfillmentStatus === FULFILLMENT_STATUSES.REJECTED ||
    fulfillmentStatus === FULFILLMENT_STATUSES.AWAITING_PAYMENT
  ) {
    return SUPPLIER_PUSH_STATUSES.NOT_SENT;
  }

  if (fulfillmentStatus === FULFILLMENT_STATUSES.APPROVED_FOR_SUPPLIER) {
    return SUPPLIER_PUSH_STATUSES.QUEUED;
  }

  if (fulfillmentStatus === FULFILLMENT_STATUSES.SENT_TO_SUPPLIER) {
    return SUPPLIER_PUSH_STATUSES.SENT;
  }

  if (
    fulfillmentStatus === FULFILLMENT_STATUSES.SUPPLIER_CONFIRMED ||
    fulfillmentStatus === FULFILLMENT_STATUSES.SHIPPED ||
    fulfillmentStatus === FULFILLMENT_STATUSES.DELIVERED
  ) {
    return SUPPLIER_PUSH_STATUSES.CONFIRMED;
  }

  if (fulfillmentStatus === FULFILLMENT_STATUSES.FAILED) {
    return SUPPLIER_PUSH_STATUSES.FAILED;
  }

  return SUPPLIER_PUSH_STATUSES.NOT_SENT;
}

export function getReviewBucket(order) {
  const fulfillmentStatus = getFulfillmentStatus(order);

  if (fulfillmentStatus === FULFILLMENT_STATUSES.HELD) return "held";
  if (fulfillmentStatus === FULFILLMENT_STATUSES.REJECTED) return "rejected";

  if (
    fulfillmentStatus === FULFILLMENT_STATUSES.APPROVED_FOR_SUPPLIER ||
    fulfillmentStatus === FULFILLMENT_STATUSES.SENT_TO_SUPPLIER ||
    fulfillmentStatus === FULFILLMENT_STATUSES.SUPPLIER_CONFIRMED ||
    fulfillmentStatus === FULFILLMENT_STATUSES.SHIPPED ||
    fulfillmentStatus === FULFILLMENT_STATUSES.DELIVERED
  ) {
    return "approved";
  }

  if (
    fulfillmentStatus === FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW ||
    fulfillmentStatus === FULFILLMENT_STATUSES.PAID
  ) {
    return "awaiting_review";
  }

  return "other";
}

export function canAdminApprove(order) {
  const fulfillmentStatus = getFulfillmentStatus(order);
  return [
    FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW,
    FULFILLMENT_STATUSES.HELD,
  ].includes(fulfillmentStatus);
}

export function canAdminHold(order) {
  const fulfillmentStatus = getFulfillmentStatus(order);
  return [
    FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW,
    FULFILLMENT_STATUSES.APPROVED_FOR_SUPPLIER,
  ].includes(fulfillmentStatus);
}

export function canAdminReject(order) {
  const fulfillmentStatus = getFulfillmentStatus(order);
  return [
    FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW,
    FULFILLMENT_STATUSES.HELD,
  ].includes(fulfillmentStatus);
}