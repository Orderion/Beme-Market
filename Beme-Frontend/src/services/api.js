import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const BASE = String(import.meta.env.VITE_BACKEND_URL || "")
  .trim()
  .replace(/\/+$/, "");

if (!BASE) {
  console.warn("Missing VITE_BACKEND_URL. Set it in Vercel/.env");
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
      reject(new Error("Authentication session not ready. Please try again."));
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
      throw new Error("You must be signed in to continue.");
    }
    return {};
  }

  const token = await currentUser.getIdToken(true);

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function toJson(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}

async function request(path, options = {}, authRequired = false) {
  assertBaseUrl();

  const authHeaders = await getAuthHeaders(authRequired);

  const res = await fetch(`${BASE}${path}`, {
    method: "GET",
    ...options,
    headers: {
      Accept: "application/json",
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  return toJson(res);
}

export async function getMyOrders() {
  return request("/api/orders", {}, true);
}

export async function createCodOrder(payload) {
  const safePayload = {
    customer: {
      userId: String(payload?.customer?.userId || "").trim(),
      firstName: String(payload?.customer?.firstName || "").trim(),
      lastName: String(payload?.customer?.lastName || "").trim(),
      email: String(payload?.customer?.email || "").trim().toLowerCase(),
      phone: String(payload?.customer?.phone || "").trim(),
      network: String(payload?.customer?.network || "").trim(),
      address: String(payload?.customer?.address || "").trim(),
      region: String(payload?.customer?.region || "").trim(),
      city: String(payload?.customer?.city || "").trim(),
      area: String(payload?.customer?.area || "").trim(),
      notes: String(payload?.customer?.notes || "").trim(),
      country:
        String(payload?.customer?.country || "Ghana").trim() || "Ghana",
    },
    items: Array.isArray(payload?.items)
      ? payload.items.map((item) => ({
          id: String(item?.id || item?.productId || "").trim(),
          productId: String(item?.productId || item?.id || "").trim(),
          qty: Math.max(1, Number(item?.qty) || 1),
          price: Number(item?.price) || 0,
          basePrice: Number(item?.basePrice ?? item?.price ?? 0) || 0,
          optionPriceTotal: Number(item?.optionPriceTotal || 0) || 0,
          name: String(item?.name || "").trim(),
          image: String(item?.image || "").trim(),
          shop: String(item?.shop || "main").trim().toLowerCase(),
          selectedOptions:
            item?.selectedOptions && typeof item.selectedOptions === "object"
              ? item.selectedOptions
              : {},
          selectedOptionsLabel: String(
            item?.selectedOptionsLabel || ""
          ).trim(),
          selectedOptionDetails: Array.isArray(item?.selectedOptionDetails)
            ? item.selectedOptionDetails
            : [],
          customizations: Array.isArray(item?.customizations)
            ? item.customizations
            : [],
          shipsFromAbroad: item?.shipsFromAbroad === true,
          abroadDeliveryFee: Number(item?.abroadDeliveryFee || 0) || 0,
          inStock: item?.inStock !== false,
          stock:
            Number.isFinite(Number(item?.stock)) ? Number(item.stock) : null,
        }))
      : [],
    shops: Array.isArray(payload?.shops)
      ? payload.shops.map((shop) =>
          String(shop || "main").trim().toLowerCase()
        )
      : [],
    primaryShop: String(payload?.primaryShop || "main").trim().toLowerCase(),
    pricing: {
      subtotal: Number(payload?.pricing?.subtotal || 0) || 0,
      deliveryFee: Number(payload?.pricing?.deliveryFee || 0) || 0,
      total: Number(payload?.pricing?.total || 0) || 0,
      currency: String(payload?.pricing?.currency || "GHS").trim() || "GHS",
    },
    paymentMethod: "cod",
    paymentStatus: "pending",
    status: "pending",
    source: String(payload?.source || "web").trim() || "web",
  };

  return request(
    "/api/orders",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(safePayload),
    },
    true
  );
}

export async function paystackInit(payload) {
  const safePayload = {
    email: String(payload?.email || "").trim().toLowerCase(),
    items: Array.isArray(payload?.cartItems)
      ? payload.cartItems.map((item) => ({
          id: String(item?.id || item?.productId || "").trim(),
          qty: Math.max(1, Number(item?.qty) || 1),
          price: Number(item?.price) || 0,
          basePrice: Number(item?.basePrice ?? item?.price ?? 0) || 0,
          optionPriceTotal: Number(item?.optionPriceTotal || 0) || 0,
          name: String(item?.name || "").trim(),
          image: String(item?.image || "").trim(),
          shop: String(item?.shop || "main").trim().toLowerCase(),
          selectedOptions:
            item?.selectedOptions && typeof item.selectedOptions === "object"
              ? item.selectedOptions
              : {},
          selectedOptionsLabel: String(
            item?.selectedOptionsLabel || ""
          ).trim(),
          selectedOptionDetails: Array.isArray(item?.selectedOptionDetails)
            ? item.selectedOptionDetails
            : [],
          customizations: Array.isArray(item?.customizations)
            ? item.customizations
            : [],
          shipsFromAbroad: item?.shipsFromAbroad === true,
          abroadDeliveryFee: Number(item?.abroadDeliveryFee || 0) || 0,
          inStock: item?.inStock !== false,
          stock:
            Number.isFinite(Number(item?.stock)) ? Number(item.stock) : null,
        }))
      : [],
    pricing: {
      subtotal: Number(payload?.pricing?.subtotal || 0) || 0,
      deliveryFee: Number(payload?.pricing?.deliveryFee || 0) || 0,
      total: Number(payload?.pricing?.total || 0) || 0,
      currency: String(payload?.pricing?.currency || "GHS").trim() || "GHS",
    },
    customer: {
      userId: String(payload?.customer?.userId || "").trim(),
      firstName: String(payload?.customer?.firstName || "").trim(),
      lastName: String(payload?.customer?.lastName || "").trim(),
      phone: String(payload?.customer?.phone || "").trim(),
      network: String(payload?.customer?.network || "").trim(),
      address: String(payload?.customer?.address || "").trim(),
      region: String(payload?.customer?.region || "").trim(),
      city: String(payload?.customer?.city || "").trim(),
      area: String(payload?.customer?.area || "").trim(),
      notes: String(payload?.customer?.notes || "").trim(),
      country:
        String(payload?.customer?.country || "Ghana").trim() || "Ghana",
    },
  };

  return request(
    "/api/paystack/checkout/init",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(safePayload),
    },
    true
  );
}

export async function paystackVerify(reference) {
  const safeReference = String(reference || "").trim();

  if (!safeReference) {
    throw new Error("Missing payment reference");
  }

  return request(
    `/api/paystack/checkout/verify?reference=${encodeURIComponent(
      safeReference
    )}`,
    {},
    true
  );
}

export async function getAdminOrders() {
  return request("/api/admin/orders", {}, true);
}

export async function updateAdminOrderStatus(orderId, payload) {
  const safeOrderId = String(orderId || "").trim();
  if (!safeOrderId) {
    throw new Error("Missing order ID.");
  }

  return request(
    `/api/admin/orders/${encodeURIComponent(safeOrderId)}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: String(payload?.status || "").trim().toLowerCase(),
        reviewNotes: String(payload?.reviewNotes || "").trim(),
      }),
    },
    true
  );
}