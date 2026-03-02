// src/services/api.js

const BASE = import.meta.env.VITE_BACKEND_URL;

if (!BASE) {
  console.warn("Missing VITE_BACKEND_URL. Set it in Vercel/.env");
}

async function toJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }
  return data;
}

/**
 * Initialize Paystack checkout
 * body: { email, items:[{id,qty}], customer }
 */
export async function paystackInit(payload) {
  const res = await fetch(`${BASE}/api/paystack/checkout/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return toJson(res);
}

/**
 * Verify payment
 * returns: { ok, status, orderId, reference }
 */
export async function paystackVerify(reference) {
  const res = await fetch(
    `${BASE}/api/paystack/checkout/verify?reference=${encodeURIComponent(reference)}`
  );

  return toJson(res);
}