import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const BASE = String(import.meta.env.VITE_BACKEND_URL || "")
  .trim()
  .replace(/\/+$/, "");

// 🔍 DEBUG
console.log("API BASE URL:", BASE);

if (!BASE) {
  console.warn("⚠️ Missing VITE_BACKEND_URL. Set it in Vercel.");
}

function assertBaseUrl() {
  if (!BASE) {
    throw new Error("Missing backend URL. Set VITE_BACKEND_URL.");
  }
}

function waitForAuthReady(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    let unsubscribe = () => {};

    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Authentication session not ready."));
    }, timeoutMs);

    unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

async function getAuthHeaders(required = false) {
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
    const token = await currentUser.getIdToken();

    return {
      Authorization: `Bearer ${token}`,
    };
  } catch (err) {
    console.error("❌ Token error:", err);
    throw new Error("Failed to get auth token.");
  }
}

// 🔥 FIXED: Proper error visibility
async function toJson(res) {
  const text = await res.text();

  let data = {};
  try {
    data = JSON.parse(text);
  } catch {}

  if (!res.ok) {
    console.error("❌ BACKEND ERROR:", {
      status: res.status,
      data,
      raw: text,
    });

    throw new Error(
      data?.error ||
        data?.message ||
        `Request failed with status ${res.status}`
    );
  }

  return data;
}

// 🔥 FIXED: Timeout + better debugging
async function request(path, options = {}, authRequired = false) {
  assertBaseUrl();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const authHeaders = await getAuthHeaders(authRequired);

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
    true
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
    true
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