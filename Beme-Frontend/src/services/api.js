import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const BASE = String(import.meta.env.VITE_BACKEND_URL || "")
  .trim()
  .replace(/\/+$/, "");

console.log("API BASE URL:", BASE);

if (!BASE) {
  console.warn("⚠️ Missing VITE_BACKEND_URL. Set it in Vercel.");
}

function assertBaseUrl() {
  if (!BASE) {
    throw new Error("Missing backend URL. Set VITE_BACKEND_URL.");
  }
}

// ✅ FIX: Rewritten to handle three cases correctly:
//   1. auth.currentUser already set → resolve immediately
//   2. Firebase emits null first (hydration), then the real user → wait for real user
//   3. Firebase confirms user is genuinely signed out → reject immediately instead
//      of hanging for the full 10-second timeout (which caused the stale-token
//      / "An error occurred" path to be hit on slow connections)
function waitForAuthReady(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    let settled = false;
    let unsubscribe = () => {};
    let firstEmission = true;

    const done = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsubscribe();
      fn();
    };

    const timeout = setTimeout(() => {
      done(() =>
        reject(
          new Error(
            "Authentication session timed out. Please refresh and log in again."
          )
        )
      );
    }, timeoutMs);

    unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Got a real user — resolve.
        done(() => resolve(user));
        return;
      }

      if (firstEmission) {
        // Firebase routinely fires null on its very first tick while it
        // re-hydrates the persisted session.  Give it a chance to fire again
        // with the real user before giving up.
        firstEmission = false;
        return;
      }

      // A second null means the user is genuinely signed out.
      done(() =>
        reject(new Error("You are not logged in. Please sign in and try again."))
      );
    });
  });
}

// ✅ FIX: Added forceRefresh parameter.  Paystack checkout always passes
//   true so the backend always receives a fresh, non-expired ID token.
//   A stale token was the root cause of the backend returning the generic
//   "An error occurred" response instead of a proper 401.
async function getAuthHeaders(required = false, forceRefresh = false) {
  let currentUser = auth.currentUser;

  if (!currentUser && required) {
    currentUser = await waitForAuthReady();
  }

  if (!currentUser) {
    if (required) {
      throw new Error("User not authenticated.");
    }
    return {};
  }

  try {
    const token = await currentUser.getIdToken(forceRefresh);
    return {
      Authorization: `Bearer ${token}`,
    };
  } catch (err) {
    console.error("❌ Token error:", err);

    // If normal fetch failed, try force-refreshing once before giving up.
    if (!forceRefresh) {
      try {
        const freshToken = await currentUser.getIdToken(true);
        return { Authorization: `Bearer ${freshToken}` };
      } catch (retryErr) {
        console.error("❌ Token refresh also failed:", retryErr);
      }
    }

    throw new Error("Failed to get auth token. Please log in again.");
  }
}

// ✅ FIX: toJson now includes the HTTP status code in the thrown error so
//   the debug banner shows something actionable like "An error occurred
//   (HTTP 401)" rather than the bare backend string.
async function toJson(res) {
  const text = await res.text();

  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    // Response wasn't JSON (e.g. an HTML error page).
  }

  if (!res.ok) {
    console.error("❌ BACKEND ERROR:", {
      status: res.status,
      data,
      raw: text,
    });

    const message =
      data?.error ||
      data?.message ||
      `Request failed with status ${res.status}`;

    throw new Error(`${message} (HTTP ${res.status})`);
  }

  return data;
}

// ✅ FIX: Added forceRefresh option so callers that need a guaranteed-fresh
//   token (like paystackInit) can pass it through.
async function request(path, options = {}, authRequired = false, forceRefresh = false) {
  assertBaseUrl();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const authHeaders = await getAuthHeaders(authRequired, forceRefresh);

    console.log("➡️ API Request:", `${BASE}${path}`);

    const res = await fetch(`${BASE}${path}`, {
      method: "GET",
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...authHeaders,
        ...(options.headers || {}),
      },
    });

    return await toJson(res);
  } catch (err) {
    console.error("❌ REQUEST FAILED:", err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeDelivery(payload) {
  return {
    method: String(payload?.method || "").trim().toLowerCase(),
    label: String(payload?.label || "").trim(),
    fee: Number(payload?.fee || 0) || 0,
    breakdown: {
      regionalBaseFee:
        Number(payload?.breakdown?.regionalBaseFee || 0) || 0,
      methodFee: Number(payload?.breakdown?.methodFee || 0) || 0,
      abroadFee: Number(payload?.breakdown?.abroadFee || 0) || 0,
    },
    mallPickup: payload?.mallPickup
      ? {
          id: String(payload.mallPickup.id || "").trim(),
          label: String(payload.mallPickup.label || "").trim(),
          area: String(payload.mallPickup.area || "").trim(),
          fee: Number(payload.mallPickup.fee || 0) || 0,
        }
      : null,
    homeDelivery: payload?.homeDelivery
      ? {
          label: String(payload.homeDelivery.label || "").trim(),
          fee: Number(payload.homeDelivery.fee || 0) || 0,
        }
      : null,
  };
}

// =========================
// ORDERS
// =========================

export async function getMyOrders() {
  return request("/api/orders", {}, true);
}

export async function createCodOrder(payload) {
  return request(
    "/api/orders",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    true
  );
}

// =========================
// PAYSTACK
// =========================

export async function paystackInit(payload) {
  console.log("💳 Paystack Init Payload:", payload);

  // ✅ FIX: Pass forceRefresh=true so the backend always receives a fresh
  //   Firebase ID token.  A cached / expired token was causing the backend
  //   Paystack route to respond with the generic "An error occurred" message.
  return request(
    "/api/paystack/checkout/init",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: String(payload?.email || "").trim().toLowerCase(),
        items: payload?.cartItems || [],
        delivery: sanitizeDelivery(payload?.delivery),
        pricing: payload?.pricing || {},
        customer: payload?.customer || {},
      }),
    },
    true,
    true // forceRefresh — always send a fresh token for payment requests
  );
}

export async function paystackVerify(reference) {
  if (!reference) {
    throw new Error("Missing payment reference");
  }

  return request(
    `/api/paystack/checkout/verify?reference=${encodeURIComponent(
      reference
    )}`,
    {},
    true,
    true // forceRefresh — verify also needs a guaranteed-fresh token
  );
}

// =========================
// ADMIN
// =========================

export async function getAdminOrders() {
  return request("/api/admin/orders", {}, true);
}

export async function updateAdminOrderStatus(orderId, payload) {
  if (!orderId) {
    throw new Error("Missing order ID.");
  }

  return request(
    `/api/admin/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: String(payload?.status || "").toLowerCase(),
        reviewNotes: String(payload?.reviewNotes || ""),
      }),
    },
    true
  );
}