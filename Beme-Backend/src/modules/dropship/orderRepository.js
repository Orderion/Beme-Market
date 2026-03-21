import { adminDb, firebaseAdmin } from "../../firebaseAdmin.js";

function safeTrim(value) {
  return String(value ?? "").trim();
}

function sanitizeText(value, max = 500) {
  return safeTrim(value).slice(0, max);
}

export function getServerTimestamp() {
  return firebaseAdmin.firestore.FieldValue.serverTimestamp();
}

export async function getOrderById(orderId) {
  const id = sanitizeText(orderId, 200);
  if (!id) return null;

  const snap = await adminDb.collection("orders").doc(id).get();
  if (!snap.exists) return null;

  return {
    id: snap.id,
    ref: snap.ref,
    data: snap.data() || {},
    snap,
  };
}

export async function createOrder(payload = {}) {
  const now = getServerTimestamp();

  const safePayload = {
    ...payload,
    createdAt: payload?.createdAt || now,
    updatedAt: now,
  };

  const ref = await adminDb.collection("orders").add(safePayload);
  const snap = await ref.get();

  return {
    id: snap.id,
    ref,
    data: snap.data() || {},
    snap,
  };
}

export async function updateOrder(orderId, patch = {}) {
  const id = sanitizeText(orderId, 200);
  if (!id) {
    const error = new Error("Missing order ID.");
    error.statusCode = 400;
    throw error;
  }

  const ref = adminDb.collection("orders").doc(id);

  await ref.update({
    ...patch,
    updatedAt: getServerTimestamp(),
  });

  const snap = await ref.get();

  return {
    id: snap.id,
    ref,
    data: snap.data() || {},
    snap,
  };
}

export async function setOrder(orderId, payload = {}, options = { merge: true }) {
  const id = sanitizeText(orderId, 200);
  if (!id) {
    const error = new Error("Missing order ID.");
    error.statusCode = 400;
    throw error;
  }

  const ref = adminDb.collection("orders").doc(id);

  await ref.set(
    {
      ...payload,
      updatedAt: getServerTimestamp(),
    },
    options
  );

  const snap = await ref.get();

  return {
    id: snap.id,
    ref,
    data: snap.data() || {},
    snap,
  };
}

export async function getOrdersByUserId(userId) {
  const uid = sanitizeText(userId, 200);
  if (!uid) return [];

  const snap = await adminDb
    .collection("orders")
    .where("userId", "==", uid)
    .get();

  return snap.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ref: docSnap.ref,
      data: docSnap.data() || {},
      snap: docSnap,
    }))
    .sort((a, b) => {
      const aMillis =
        typeof a?.data?.createdAt?.toMillis === "function"
          ? a.data.createdAt.toMillis()
          : 0;
      const bMillis =
        typeof b?.data?.createdAt?.toMillis === "function"
          ? b.data.createdAt.toMillis()
          : 0;

      return bMillis - aMillis;
    });
}

export async function getAllOrders() {
  const snap = await adminDb.collection("orders").get();

  return snap.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ref: docSnap.ref,
      data: docSnap.data() || {},
      snap: docSnap,
    }))
    .sort((a, b) => {
      const aMillis =
        typeof a?.data?.createdAt?.toMillis === "function"
          ? a.data.createdAt.toMillis()
          : 0;
      const bMillis =
        typeof b?.data?.createdAt?.toMillis === "function"
          ? b.data.createdAt.toMillis()
          : 0;

      return bMillis - aMillis;
    });
}

export async function findOrderByReference(reference) {
  const refValue = sanitizeText(reference, 200);
  if (!refValue) return null;

  const snap = await adminDb
    .collection("orders")
    .where("reference", "==", refValue)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const docSnap = snap.docs[0];

  return {
    id: docSnap.id,
    ref: docSnap.ref,
    data: docSnap.data() || {},
    snap: docSnap,
  };
}

export async function appendAdminActionLog({
  orderId,
  adminUid,
  action,
  notes = "",
  before = null,
  after = null,
}) {
  await adminDb.collection("adminActions").add({
    orderId: sanitizeText(orderId, 200),
    adminUid: sanitizeText(adminUid, 200),
    action: sanitizeText(action, 120),
    notes: sanitizeText(notes, 2000),
    before,
    after,
    createdAt: getServerTimestamp(),
  });
}

export async function appendFulfillmentLog({
  orderId,
  actorType = "system",
  actorId = "",
  action,
  message = "",
  meta = null,
}) {
  await adminDb.collection("fulfillmentLogs").add({
    orderId: sanitizeText(orderId, 200),
    actorType: sanitizeText(actorType, 80) || "system",
    actorId: sanitizeText(actorId, 200),
    action: sanitizeText(action, 120),
    message: sanitizeText(message, 2000),
    meta,
    createdAt: getServerTimestamp(),
  });
}

export async function createWebhookEvent(payload = {}) {
  const ref = await adminDb.collection("webhookEvents").add({
    ...payload,
    createdAt: getServerTimestamp(),
  });

  const snap = await ref.get();

  return {
    id: snap.id,
    ref,
    data: snap.data() || {},
    snap,
  };
}

export async function runOrderTransaction(orderId, handler) {
  const id = sanitizeText(orderId, 200);
  if (!id) {
    const error = new Error("Missing order ID.");
    error.statusCode = 400;
    throw error;
  }

  const orderRef = adminDb.collection("orders").doc(id);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);

    if (!snap.exists) {
      const error = new Error("Order not found.");
      error.statusCode = 404;
      throw error;
    }

    const current = {
      id: snap.id,
      ref: orderRef,
      data: snap.data() || {},
      snap,
    };

    const result = await handler({ tx, current, orderRef });

    return result;
  });
}