// src/lib/checkout.js
export async function startPaystackCheckout({ email, cartItems, customer }) {
  const items = cartItems.map((i) => ({ id: i.id, qty: i.qty || 1 }));

  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  if (!baseUrl) throw new Error("Missing VITE_BACKEND_URL in frontend env");

  const res = await fetch(`${baseUrl}/api/paystack/checkout/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // IMPORTANT: no amount, no price from client
    body: JSON.stringify({ email, items, customer }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Checkout failed");

  if (!data?.authorization_url) {
    throw new Error("Missing Paystack authorization_url from backend");
  }

  // Redirect to Paystack checkout
  window.location.href = data.authorization_url;
}