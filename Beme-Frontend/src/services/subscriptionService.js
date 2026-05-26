const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

/**
 * Initialize a subscription payment via Paystack
 * Returns { authorization_url, reference } or { isFree: true }
 */
export async function initSubscriptionPayment({ planId, uid, email, shopId, billing = "monthly", amount }) {
  const res = await fetch(`${API_URL}/api/subscriptions/initialize`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId, uid, email, shopId, billing, amount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Payment initialization failed.");
  return data;
}

/**
 * Verify a payment after Paystack redirects back
 */
export async function verifySubscriptionPayment(reference) {
  const res = await fetch(`${API_URL}/api/subscriptions/verify?reference=${encodeURIComponent(reference)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Verification failed.");
  return data;
}

/**
 * Redirect browser to Paystack checkout
 */
export function redirectToPaystack(url) {
  window.location.href = url;
}

/**
 * Get subscription status for a user
 */
export async function getSubscriptionStatus(uid) {
  const res  = await fetch(`${API_URL}/api/subscriptions/status?uid=${uid}`);
  const data = await res.json();
  return data;
}
