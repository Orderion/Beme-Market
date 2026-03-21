import {
  appendAdminActionLog,
  appendFulfillmentLog,
} from "./orderRepository.js";

function safeTrim(value) {
  return String(value ?? "").trim();
}

function sanitizeText(value, max = 2000) {
  return safeTrim(value).slice(0, max);
}

export async function logAdminReviewAction({
  orderId,
  adminUid,
  action,
  notes = "",
  before = null,
  after = null,
}) {
  await appendAdminActionLog({
    orderId,
    adminUid,
    action,
    notes,
    before,
    after,
  });

  await appendFulfillmentLog({
    orderId,
    actorType: "admin",
    actorId: adminUid,
    action,
    message: sanitizeText(notes || `Admin action: ${action}`, 2000),
    meta: {
      before,
      after,
    },
  });
}

export async function logSupplierPushQueued({
  orderId,
  actorId = "system",
  supplier = "",
  reviewNotes = "",
}) {
  await appendFulfillmentLog({
    orderId,
    actorType: "admin",
    actorId,
    action: "supplier_push_queued",
    message:
      sanitizeText(reviewNotes, 2000) ||
      `Order approved and queued for ${sanitizeText(supplier, 120) || "supplier"} push.`,
    meta: {
      supplier: sanitizeText(supplier, 120),
    },
  });
}

export async function logSupplierPushAttempt({
  orderId,
  actorId = "system",
  supplier = "",
  payloadSummary = null,
}) {
  await appendFulfillmentLog({
    orderId,
    actorType: "system",
    actorId,
    action: "supplier_push_attempt",
    message: `Attempting supplier push to ${
      sanitizeText(supplier, 120) || "supplier"
    }.`,
    meta: {
      supplier: sanitizeText(supplier, 120),
      payloadSummary,
    },
  });
}

export async function logSupplierPushSuccess({
  orderId,
  actorId = "system",
  supplier = "",
  supplierOrderId = "",
  supplierStatus = "",
  responseSummary = null,
}) {
  await appendFulfillmentLog({
    orderId,
    actorType: "system",
    actorId,
    action: "supplier_push_success",
    message: `Supplier push succeeded for ${
      sanitizeText(supplier, 120) || "supplier"
    }.`,
    meta: {
      supplier: sanitizeText(supplier, 120),
      supplierOrderId: sanitizeText(supplierOrderId, 200),
      supplierStatus: sanitizeText(supplierStatus, 120),
      responseSummary,
    },
  });
}

export async function logSupplierPushFailure({
  orderId,
  actorId = "system",
  supplier = "",
  errorMessage = "",
  responseSummary = null,
}) {
  await appendFulfillmentLog({
    orderId,
    actorType: "system",
    actorId,
    action: "supplier_push_failure",
    message:
      sanitizeText(errorMessage, 2000) ||
      `Supplier push failed for ${sanitizeText(supplier, 120) || "supplier"}.`,
    meta: {
      supplier: sanitizeText(supplier, 120),
      responseSummary,
    },
  });
}

export async function logSupplierStatusSync({
  orderId,
  actorId = "system",
  supplier = "",
  previousStatus = "",
  nextStatus = "",
  meta = null,
}) {
  await appendFulfillmentLog({
    orderId,
    actorType: "system",
    actorId,
    action: "supplier_status_sync",
    message: `Supplier status changed from ${
      sanitizeText(previousStatus, 120) || "unknown"
    } to ${sanitizeText(nextStatus, 120) || "unknown"}.`,
    meta: {
      supplier: sanitizeText(supplier, 120),
      previousStatus: sanitizeText(previousStatus, 120),
      nextStatus: sanitizeText(nextStatus, 120),
      ...(meta || {}),
    },
  });
}

export async function logWebhookProcessed({
  orderId,
  actorId = "webhook",
  supplier = "",
  eventType = "",
  meta = null,
}) {
  await appendFulfillmentLog({
    orderId,
    actorType: "webhook",
    actorId,
    action: "supplier_webhook_processed",
    message: `Processed ${
      sanitizeText(eventType, 120) || "supplier webhook"
    } for ${sanitizeText(supplier, 120) || "supplier"}.`,
    meta: {
      supplier: sanitizeText(supplier, 120),
      eventType: sanitizeText(eventType, 120),
      ...(meta || {}),
    },
  });
}