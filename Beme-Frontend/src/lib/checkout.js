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

async function parseJsonSafely(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeCheckoutItem(item) {
  const qty = Math.max(1, Number(item?.qty) || 1);
  const price = Number(item?.price) || 0;
  const basePrice = Number(item?.basePrice) || 0;
  const optionPriceTotal = Number(item?.optionPriceTotal) || 0;
  const stock = getNumericStock(item);

  return {
    id: item?.id || "",
    productId: item?.productId || item?.id || "",
    name: item?.name || "",
    image: item?.image || "",
    qty,
    price,
    basePrice,
    optionPriceTotal,
    stock,
    inStock: item?.inStock !== false,
    shop: item?.shop || "",
    homeSlot: item?.homeSlot || "",
    selectedOptions: item?.selectedOptions || {},
    selectedOptionsLabel: item?.selectedOptionsLabel || "",
    selectedOptionDetails: Array.isArray(item?.selectedOptionDetails)
      ? item.selectedOptionDetails.map((opt) => ({
          groupName: opt?.groupName || "",
          label: opt?.label || "",
          priceBump: Number(opt?.priceBump) || 0,
        }))
      : [],
    customizations: Array.isArray(item?.customizations) ? item.customizations : [],
    shippingSource: item?.shippingSource || "",
    shipsFromAbroad: item?.shipsFromAbroad === true,
    abroadDeliveryFee: Number(item?.abroadDeliveryFee) || 0,
    oldPrice:
      item?.oldPrice !== undefined && item?.oldPrice !== null && item?.oldPrice !== ""
        ? Number(item.oldPrice) || 0
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
    currency: pricing?.currency || "GHS",
  };

  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  if (!baseUrl) throw new Error("Missing VITE_BACKEND_URL in frontend env");

  const res = await fetch(`${baseUrl}/api/paystack/checkout/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      items,
      pricing: normalizedPricing,
      customer,
    }),
  });

  const data = await parseJsonSafely(res);

  if (!res.ok) {
    throw new Error(data?.error || "Checkout failed");
  }

  if (!data?.authorization_url) {
    throw new Error("Missing Paystack authorization_url from backend");
  }

  window.location.assign(data.authorization_url);
}

export async function startShopOwnerCheckout(application) {
  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  if (!baseUrl) throw new Error("Missing VITE_BACKEND_URL in frontend env");

  const res = await fetch(`${baseUrl}/api/paystack/shop-owner/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(application),
  });

  const data = await parseJsonSafely(res);

  if (!res.ok) {
    throw new Error(data?.error || "Shop owner payment init failed");
  }

  if (!data?.authorization_url) {
    throw new Error("Missing Paystack authorization_url from backend");
  }

  window.location.assign(data.authorization_url);
}

export async function verifyShopOwnerPayment(reference) {
  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  if (!baseUrl) throw new Error("Missing VITE_BACKEND_URL in frontend env");

  const res = await fetch(
    `${baseUrl}/api/paystack/shop-owner/verify?reference=${encodeURIComponent(reference)}`
  );

  const data = await parseJsonSafely(res);

  if (!res.ok) {
    throw new Error(data?.error || "Verification failed");
  }

  return data;
}