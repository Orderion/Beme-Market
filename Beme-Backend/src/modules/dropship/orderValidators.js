import {
  PAYMENT_STATUSES,
  FULFILLMENT_STATUSES,
  SUPPLIER_PUSH_STATUSES,
  normalizeStatus,
} from "./orderStates.js";

function safeTrim(value) {
  return String(value ?? "").trim();
}

function sanitizeText(value, max = 300) {
  return safeTrim(value).slice(0, max);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeEmail(value) {
  return sanitizeText(value, 160).toLowerCase();
}

function normalizePhone(value) {
  return safeTrim(value).replace(/[^\d+]/g, "").slice(0, 30);
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

export function assert(condition, message, statusCode = 400) {
  if (condition) return;
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

export function validateCustomer(customer = {}) {
  const email = normalizeEmail(customer.email);
  const firstName = sanitizeText(customer.firstName, 80);
  const lastName = sanitizeText(customer.lastName, 80);
  const phone = normalizePhone(customer.phone);
  const address = sanitizeText(customer.address, 300);
  const region = sanitizeText(customer.region, 80);
  const city = sanitizeText(customer.city, 80);
  const area = sanitizeText(customer.area, 120);
  const country = sanitizeText(customer.country || "Ghana", 80) || "Ghana";

  assert(!!email && email.includes("@"), "A valid customer email is required.");
  assert(!!firstName, "Customer first name is required.");
  assert(!!lastName, "Customer last name is required.");
  assert(!!phone && phone.length >= 7, "A valid customer phone is required.");
  assert(!!address, "Customer address is required.");
  assert(!!region, "Customer region is required.");
  assert(!!city, "Customer city is required.");

  return {
    ...customer,
    email,
    firstName,
    lastName,
    phone,
    address,
    region,
    city,
    area,
    country,
  };
}

export function validateOrderItems(items = []) {
  assert(Array.isArray(items) && items.length > 0, "Order must contain at least one item.");

  items.forEach((item, index) => {
    const row = index + 1;
    const productId = sanitizeText(item?.productId || item?.id, 120);
    const qty = Math.max(1, toNumber(item?.qty, 0));
    const price = toNumber(item?.price, NaN);
    const shop = normalizeShop(item?.shop || "main");

    assert(!!productId, `Item ${row} is missing productId.`);
    assert(Number.isFinite(qty) && qty > 0, `Item ${row} has invalid quantity.`);
    assert(Number.isFinite(price) && price >= 0, `Item ${row} has invalid price.`);
    assert(!!shop, `Item ${row} is missing shop.`);
  });

  return true;
}

export function validatePricing(pricing = {}) {
  const subtotal = toNumber(pricing?.subtotal, NaN);
  const deliveryFee = toNumber(pricing?.deliveryFee, NaN);
  const total = toNumber(pricing?.total, NaN);
  const currency = sanitizeText(pricing?.currency || "GHS", 10) || "GHS";

  assert(Number.isFinite(subtotal) && subtotal >= 0, "Invalid pricing subtotal.");
  assert(Number.isFinite(deliveryFee) && deliveryFee >= 0, "Invalid pricing delivery fee.");
  assert(Number.isFinite(total) && total >= 0, "Invalid pricing total.");
  assert(!!currency, "Invalid pricing currency.");

  return {
    subtotal,
    deliveryFee,
    total,
    currency,
  };
}

export function validateOrderCore(order = {}) {
  assert(order && typeof order === "object", "Order is required.");
  validateCustomer(order.customer || {});
  validateOrderItems(order.items || []);
  validatePricing(order.pricing || {});

  return true;
}

export function validatePaymentState(order = {}) {
  const paymentStatus = normalizeStatus(order?.paymentStatus);
  const paymentMethod = normalizeStatus(order?.paymentMethod);
  const paid = order?.paid === true;

  assert(
    [PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.PAID, PAYMENT_STATUSES.FAILED, PAYMENT_STATUSES.REFUNDED].includes(
      paymentStatus
    ),
    "Invalid payment status."
  );

  assert(
    ["cod", "paystack"].includes(paymentMethod),
    "Invalid payment method."
  );

  if (paymentMethod === "paystack") {
    assert(
      paid || paymentStatus === PAYMENT_STATUSES.PENDING || paymentStatus === PAYMENT_STATUSES.FAILED,
      "Invalid Paystack payment state."
    );
  }

  return true;
}

export function validateAdminReviewEligibility(order = {}) {
  validateOrderCore(order);
  validatePaymentState(order);

  const paymentMethod = normalizeStatus(order?.paymentMethod);
  const paymentStatus = normalizeStatus(order?.paymentStatus);
  const fulfillmentStatus = normalizeStatus(order?.fulfillmentStatus);
  const supplierPushStatus = normalizeStatus(order?.supplierPushStatus);

  if (paymentMethod === "paystack") {
    assert(
      paymentStatus === PAYMENT_STATUSES.PAID,
      "Paystack order must be paid before admin review."
    );
  }

  if (paymentMethod === "cod") {
    assert(
      [PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.PAID].includes(paymentStatus),
      "COD order has invalid payment state for admin review."
    );
  }

  if (supplierPushStatus) {
    assert(
      [
        SUPPLIER_PUSH_STATUSES.NOT_SENT,
        SUPPLIER_PUSH_STATUSES.QUEUED,
        SUPPLIER_PUSH_STATUSES.SENT,
        SUPPLIER_PUSH_STATUSES.CONFIRMED,
        SUPPLIER_PUSH_STATUSES.FAILED,
      ].includes(supplierPushStatus),
      "Invalid supplier push status."
    );
  }

  if (fulfillmentStatus) {
    assert(
      [
        FULFILLMENT_STATUSES.AWAITING_PAYMENT,
        FULFILLMENT_STATUSES.PAID,
        FULFILLMENT_STATUSES.AWAITING_ADMIN_REVIEW,
        FULFILLMENT_STATUSES.APPROVED_FOR_SUPPLIER,
        FULFILLMENT_STATUSES.HELD,
        FULFILLMENT_STATUSES.REJECTED,
        FULFILLMENT_STATUSES.SENT_TO_SUPPLIER,
        FULFILLMENT_STATUSES.SUPPLIER_CONFIRMED,
        FULFILLMENT_STATUSES.SHIPPED,
        FULFILLMENT_STATUSES.DELIVERED,
        FULFILLMENT_STATUSES.FAILED,
      ].includes(fulfillmentStatus),
      "Invalid fulfillment status."
    );
  }

  return true;
}

export function validateSupplierMappedItems(items = []) {
  validateOrderItems(items);

  items.forEach((item, index) => {
    const row = index + 1;
    const supplierApiType = sanitizeText(item?.supplierApiType, 40).toLowerCase();
    const supplierProductId = sanitizeText(item?.supplierProductId, 120);
    const supplierSku = sanitizeText(item?.supplierSku, 120);
    const supplierVariantId = sanitizeText(item?.supplierVariantId, 120);
    const supplierId = sanitizeText(item?.supplierId, 120);

    assert(!!supplierApiType, `Item ${row} is missing supplierApiType.`);
    assert(!!supplierId || !!supplierApiType, `Item ${row} is missing supplierId.`);
    assert(
      !!supplierProductId || !!supplierSku || !!supplierVariantId,
      `Item ${row} is missing supplier mapping identifiers.`
    );
  });

  return true;
}

export function validateApproveAndSendEligibility(order = {}) {
  validateAdminReviewEligibility(order);
  validateSupplierMappedItems(order.items || []);

  const fulfillmentStatus = normalizeStatus(order?.fulfillmentStatus);
  const supplierPushStatus = normalizeStatus(order?.supplierPushStatus);

  assert(
    ![
      FULFILLMENT_STATUSES.REJECTED,
      FULFILLMENT_STATUSES.DELIVERED,
      FULFILLMENT_STATUSES.FAILED,
    ].includes(fulfillmentStatus),
    "Order cannot be approved from its current fulfillment state."
  );

  assert(
    ![
      SUPPLIER_PUSH_STATUSES.SENT,
      SUPPLIER_PUSH_STATUSES.CONFIRMED,
    ].includes(supplierPushStatus),
    "Order has already been pushed to a supplier."
  );

  return true;
}

export function validateSupplierWebhookPayload(payload = {}) {
  assert(payload && typeof payload === "object", "Webhook payload is required.");

  const supplierOrderId = sanitizeText(payload?.supplierOrderId, 120);
  const status = sanitizeText(payload?.status, 80);

  assert(!!supplierOrderId, "Webhook payload missing supplierOrderId.");
  assert(!!status, "Webhook payload missing status.");

  return {
    supplierOrderId,
    status: status.toLowerCase(),
  };
}

export function validateReviewNotes(value) {
  return sanitizeText(value, 2000);
}

export function validateAdminActionStatus(value) {
  const status = normalizeStatus(value);

  assert(
    [
      "approved",
      "approved_for_supplier",
      "held",
      "rejected",
      "awaiting_admin_review",
    ].includes(status),
    "Invalid admin review action status."
  );

  return status;
}