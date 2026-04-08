import crypto from "crypto";

function safeTrim(value) {
  return String(value ?? "").trim();
}

function sanitizeText(value, max = 500) {
  return safeTrim(value).slice(0, max);
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    productId: sanitizeText(item?.productId || item?.id, 120),
    qty: Number(item?.qty || 0) || 0,
    price: Number(item?.price || 0) || 0,
    supplierId: sanitizeText(item?.supplierId, 120),
    supplierApiType: sanitizeText(item?.supplierApiType, 80).toLowerCase(),
    supplierProductId: sanitizeText(item?.supplierProductId, 120),
    supplierSku: sanitizeText(item?.supplierSku, 120),
    supplierVariantId: sanitizeText(item?.supplierVariantId, 120),
  }));
}

export function createSupplierPushKey(order = {}) {
  const payload = {
    orderId: sanitizeText(order?.id, 200),
    userId: sanitizeText(order?.userId, 200),
    paymentMethod: sanitizeText(order?.paymentMethod, 40).toLowerCase(),
    paymentStatus: sanitizeText(order?.paymentStatus, 40).toLowerCase(),
    fulfillmentStatus: sanitizeText(order?.fulfillmentStatus, 80).toLowerCase(),
    total: Number(order?.pricing?.total || 0) || 0,
    currency: sanitizeText(order?.pricing?.currency || "GHS", 10),
    items: normalizeItems(order?.items || []),
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

export function createWebhookIdempotencyKey({
  supplier = "",
  eventType = "",
  eventId = "",
  supplierOrderId = "",
  payload = null,
} = {}) {
  const basis = {
    supplier: sanitizeText(supplier, 120).toLowerCase(),
    eventType: sanitizeText(eventType, 120).toLowerCase(),
    eventId: sanitizeText(eventId, 200),
    supplierOrderId: sanitizeText(supplierOrderId, 200),
    payload: payload || null,
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(basis))
    .digest("hex");
}

export function isSameSupplierPushKey(existingKey, order) {
  const currentKey = createSupplierPushKey(order);
  return safeTrim(existingKey) && safeTrim(existingKey) === currentKey;
}

export function assertSupplierPushNotDuplicated(order = {}) {
  const supplierPushStatus = sanitizeText(
    order?.supplierPushStatus,
    80
  ).toLowerCase();

  if (["sent", "confirmed"].includes(supplierPushStatus)) {
    const error = new Error("Supplier order has already been pushed.");
    error.statusCode = 409;
    throw error;
  }

  if (order?.supplierOrderId) {
    const error = new Error("Order already has a supplier order ID.");
    error.statusCode = 409;
    throw error;
  }

  return true;
}