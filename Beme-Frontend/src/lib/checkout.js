export async function startPaystackCheckout({ email, cartItems, customer }) {
  const items = cartItems.map((i) => ({ id: i.id, qty: i.qty || 1 }));

  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  if (!baseUrl) throw new Error("Missing VITE_BACKEND_URL in frontend env");

  const res = await fetch(`${baseUrl}/api/paystack/checkout/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, items, customer }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Checkout failed");

  if (!data?.authorization_url) {
    throw new Error("Missing Paystack authorization_url from backend");
  }

  window.location.href = data.authorization_url;
}

export async function startShopOwnerCheckout(application) {
  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  if (!baseUrl) throw new Error("Missing VITE_BACKEND_URL in frontend env");

  const res = await fetch(`${baseUrl}/api/paystack/shop-owner/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(application),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Shop owner payment init failed");

  if (!data?.authorization_url) {
    throw new Error("Missing Paystack authorization_url from backend");
  }

  window.location.href = data.authorization_url;
}

export async function verifyShopOwnerPayment(reference) {
  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  if (!baseUrl) throw new Error("Missing VITE_BACKEND_URL in frontend env");

  const res = await fetch(
    `${baseUrl}/api/paystack/shop-owner/verify?reference=${encodeURIComponent(reference)}`
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Verification failed");

  return data;
}