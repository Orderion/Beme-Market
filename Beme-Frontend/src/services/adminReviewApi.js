// src/services/adminReviewApi.js

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

/* =========================
   HELPERS
========================= */

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Missing auth token. Please login again.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}

/* =========================
   ADMIN REVIEW API
========================= */

// 🔥 GET ALL ORDERS FOR REVIEW
export async function getAdminOrders() {
  const res = await fetch(`${BASE_URL}/api/admin/orders`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse(res);

  return data.orders || [];
}

// 🔥 UPDATE ORDER STATUS
export async function updateAdminOrderStatus(orderId, payload) {
  const res = await fetch(
    `${BASE_URL}/api/admin/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  const data = await handleResponse(res);

  return data.order;
}

/* =========================
   OPTIONAL HELPERS
========================= */

// Approve
export async function approveOrder(orderId, reviewNotes = "") {
  return updateAdminOrderStatus(orderId, {
    status: "approved",
    reviewNotes,
  });
}

// Hold
export async function holdOrder(orderId, reviewNotes = "") {
  return updateAdminOrderStatus(orderId, {
    status: "held",
    reviewNotes,
  });
}

// Reject
export async function rejectOrder(orderId, reviewNotes = "") {
  return updateAdminOrderStatus(orderId, {
    status: "rejected",
    reviewNotes,
  });
}