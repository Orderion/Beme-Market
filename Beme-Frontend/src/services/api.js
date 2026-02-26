// src/services/api.js

const BASE = import.meta.env.VITE_BACKEND_URL;

if (!BASE) {
  // Don’t throw at import time in production; fail when used
  console.warn("Missing VITE_BACKEND_URL. Set it in Vercel/your .env");
}

async function toJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }
  return data;
}

export async function paystackInit({ email, amountGHS, orderId }) {
  const res = await fetch(`${BASE}/api/paystack/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, amountGHS, orderId }),
  });

  // backend returns: { authorizationUrl, reference }
  const data = await toJson(res);
  return { data };
}

export async function paystackVerify(reference) {
  const res = await fetch(`${BASE}/api/paystack/verify/${reference}`);
  const data = await toJson(res);
  return { data };
}