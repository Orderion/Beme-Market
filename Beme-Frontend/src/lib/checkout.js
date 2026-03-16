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

export async function startPaystackCheckout({ email, cartItems, customer }) {
  validateCheckoutItems(cartItems);

  const items = cartItems.map((i) => ({
    id: i.id,
    qty: Math.max(1, Number(i.qty) || 1),
  }));

  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  if (!baseUrl) throw new Error("Missing VITE_BACKEND_URL in frontend env");

  const res = await fetch(`${baseUrl}/api/paystack/checkout/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, items, customer }),
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