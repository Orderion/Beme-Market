import { paystackInit } from "../services/api";

function getNumericStock(item) {
  const parsed = Number(item?.stock);
  return Number.isFinite(parsed) ? parsed : null;
}

function isOutOfStock(item) {
  if (!item) return true;
  if (item.inStock === false) return true;

  const stock = getNumericStock(item);
  if (stock !== null && stock <= 0) return true;

  return false;
}

function sanitizeText(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function sanitizeSelectedOptions(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};

  const out = {};

  Object.entries(source).forEach(([rawKey, rawValue]) => {
    const key = sanitizeText(rawKey, 60);
    if (!key) return;

    if (Array.isArray(rawValue)) {
      const cleanValues = rawValue
        .map((entry) => sanitizeText(entry, 80))
        .filter(Boolean)
        .slice(0, 20);

      if (cleanValues.length) out[key] = cleanValues;
      return;
    }

    if (rawValue && typeof rawValue === "object") {
      const nested =
        sanitizeText(rawValue?.value, 80) ||
        sanitizeText(rawValue?.label, 80) ||
        sanitizeText(rawValue?.name, 80) ||
        sanitizeText(rawValue?.title, 80);

      if (nested) out[key] = nested;
      return;
    }

    const clean = sanitizeText(rawValue, 80);
    if (clean) out[key] = clean;
  });

  return out;
}

function sanitizeSelectedOptionDetails(source) {
  if (!Array.isArray(source)) return [];

  return source
    .map((opt) => {
      const groupName = sanitizeText(
        opt?.groupName || opt?.group || opt?.name || opt?.key,
        60
      );
      const label = sanitizeText(opt?.label || opt?.value || opt?.title, 80);
      const priceBump = Number(opt?.priceBump);
      const safePriceBump =
        Number.isFinite(priceBump) && priceBump > 0 ? priceBump : 0;

      if (!groupName && !label) return null;

      return {
        groupName,
        label,
        priceBump: safePriceBump,
      };
    })
    .filter(Boolean)
    .slice(0, 40);
}

function sanitizeCustomizations(source) {
  if (!Array.isArray(source)) return [];

  return source
    .map((entry) => {
      if (typeof entry === "string") {
        const value = sanitizeText(entry, 120);
        return value || null;
      }

      if (entry && typeof entry === "object") {
        const label = sanitizeText(
          entry?.label || entry?.name || entry?.key || entry?.title,
          60
        );
        const value = sanitizeText(
          entry?.value || entry?.selected || entry?.option || entry?.label,
          120
        );

        if (!label && !value) return null;
        return { label, value };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 40);
}

function validateCheckoutItems(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error("Your cart is empty.");
  }

  for (const item of cartItems) {
    if (!item?.id) {
      throw new Error("A cart item is missing its product ID.");
    }

    if (isOutOfStock(item)) {
      throw new Error(
        `${item?.name || "A product"} is out of stock and cannot be checked out.`
      );
    }

    const qty = Math.max(1, Number(item?.qty) || 1);
    const stock = getNumericStock(item);

    if (stock !== null && qty > stock) {
      throw new Error(
        `${item?.name || "A product"} only has ${stock} item${
          stock === 1 ? "" : "s"
        } available.`
      );
    }
  }
}

function normalizeCheckoutItem(item) {
  const qty = Math.max(1, Number(item?.qty) || 1);
  const price = Number(item?.price) || 0;
  const basePrice = Number(item?.basePrice ?? item?.price ?? 0) || 0;
  const optionPriceTotal = Number(item?.optionPriceTotal) || 0;
  const stock = getNumericStock(item);

  return {
    id: sanitizeText(item?.id || "", 120),
    productId: sanitizeText(item?.productId || item?.id || "", 120),
    name: sanitizeText(item?.name || "", 160),
    image: sanitizeText(item?.image || "", 500),
    qty,
    price,
    basePrice,
    optionPriceTotal,
    stock,
    inStock: item?.inStock !== false,
    shop: sanitizeText(item?.shop || "main", 60).toLowerCase(),
    homeSlot: sanitizeText(item?.homeSlot || "", 60),
    selectedOptions: sanitizeSelectedOptions(item?.selectedOptions),
    selectedOptionsLabel: sanitizeText(item?.selectedOptionsLabel || "", 240),
    selectedOptionDetails: sanitizeSelectedOptionDetails(
      item?.selectedOptionDetails
    ),
    customizations: sanitizeCustomizations(item?.customizations),
    shippingSource: sanitizeText(item?.shippingSource || "", 60),
    shipsFromAbroad: item?.shipsFromAbroad === true,
    abroadDeliveryFee: Math.max(0, Number(item?.abroadDeliveryFee) || 0),
    oldPrice:
      item?.oldPrice !== undefined &&
      item?.oldPrice !== null &&
      item?.oldPrice !== ""
        ? Math.max(0, Number(item.oldPrice) || 0)
        : null,
  };
}

export async function startPaystackCheckout({
  email,
  cartItems,
  customer,
  pricing,
}) {
  validateCheckoutItems(cartItems);

  const items = cartItems.map(normalizeCheckoutItem);

  const computedSubtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1),
    0
  );

  const normalizedPricing = {
    subtotal: Number(pricing?.subtotal) || computedSubtotal,
    deliveryFee: Number(pricing?.deliveryFee) || 0,
    total:
      Number(pricing?.total) ||
      (Number(pricing?.subtotal) || computedSubtotal) +
        (Number(pricing?.deliveryFee) || 0),
    currency: sanitizeText(pricing?.currency || "GHS", 10) || "GHS",
  };

  const data = await paystackInit({
    email: sanitizeText(email || customer?.email || "", 160).toLowerCase(),
    cartItems: items,
    pricing: normalizedPricing,
    customer: {
      userId: sanitizeText(customer?.userId || "", 128),
      firstName: sanitizeText(customer?.firstName || "", 80),
      lastName: sanitizeText(customer?.lastName || "", 80),
      phone: sanitizeText(customer?.phone || "", 30),
      network: sanitizeText(customer?.network || "", 40),
      address: sanitizeText(customer?.address || "", 300),
      region: sanitizeText(customer?.region || "", 80),
      city: sanitizeText(customer?.city || "", 80),
      area: sanitizeText(customer?.area || "", 120),
      notes: sanitizeText(customer?.notes || "", 500),
      country: sanitizeText(customer?.country || "Ghana", 40) || "Ghana",
    },
  });

  if (data?.reuseExisting && data?.reference) {
    window.location.assign(data.authorization_url || `/order-success?reference=${encodeURIComponent(data.reference)}&status=verifying`);
    return;
  }

  if (!data?.authorization_url) {
    throw new Error("Missing Paystack authorization_url from backend");
  }

  window.location.assign(data.authorization_url);
}

export async function startShopOwnerCheckout() {
  throw new Error("Shop owner applications are temporarily disabled.");
}

export async function verifyShopOwnerPayment() {
  throw new Error("Shop owner applications are temporarily disabled.");
}