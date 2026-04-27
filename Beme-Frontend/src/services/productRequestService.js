// src/services/productRequestService.js
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── CLOUDINARY CONFIG ────────────────────────────────────────────────────────
const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// ─── COLLECTION NAMES ────────────────────────────────────────────────────────
const REQUESTS_COL    = "product_requests";
const ADMIN_NOTIF_COL = "admin_notifications";
const USER_NOTIF_COL  = "user_notifications";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function toDate(ts) {
  if (!ts) return new Date(0);
  if (typeof ts.toDate === "function") return ts.toDate();
  return new Date(ts);
}

function sortByCreatedAtDesc(docs) {
  return [...docs].sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
}

// ─── UPLOAD REFERENCE IMAGE (Cloudinary) ─────────────────────────────────────
/**
 * Uploads image to Cloudinary using unsigned upload preset.
 * Always returns null on failure — never blocks request submission.
 */
async function uploadReferenceImage(file) {
  if (!file) return null;

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.warn("[uploadReferenceImage] Cloudinary env vars missing — skipping image.");
    return null;
  }

  try {
    const formData = new FormData();
    formData.append("file",           file);
    formData.append("upload_preset",  UPLOAD_PRESET);
    formData.append("folder",         "product_requests");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!res.ok) {
      console.warn("[uploadReferenceImage] Cloudinary error:", res.statusText);
      return null;
    }

    const data = await res.json();
    return data.secure_url || null;
  } catch (err) {
    console.warn("[uploadReferenceImage] Upload failed (non-critical):", err.message);
    return null;
  }
}

// ─── ADD PRODUCT REQUEST ─────────────────────────────────────────────────────
/**
 * Creates a product request in Firestore and notifies super_admin.
 * Image upload is best-effort — request submits even without it.
 */
export async function addProductRequest(data, imageFile, user) {
  // Upload image to Cloudinary first (non-blocking)
  const referenceImageUrl = await uploadReferenceImage(imageFile);

  const payload = {
    productName:       data.productName.trim(),
    description:       data.description.trim(),
    preferredBudget:   data.preferredBudget ? Number(data.preferredBudget) : null,
    category:          data.category?.trim() || null,
    referenceImageUrl: referenceImageUrl || null,
    userId:            user.uid,
    userEmail:         user.email,
    status:            "pending",
    adminResponse:     null,
    offeredProductId:  null,
    createdAt:         serverTimestamp(),
    updatedAt:         serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, REQUESTS_COL), payload);

  try {
    await notifyAdmin(docRef.id, data.productName.trim(), user.email);
  } catch (err) {
    console.warn("[productRequestService] notifyAdmin failed (non-critical):", err);
  }

  return docRef.id;
}

// ─── UPDATE REQUEST STATUS ───────────────────────────────────────────────────
export async function updateRequestStatus(requestId, status, extras = {}) {
  const requestRef = doc(db, REQUESTS_COL, requestId);
  const snapshot   = await getDoc(requestRef);

  if (!snapshot.exists()) throw new Error("Product request not found.");

  const updatePayload = {
    status,
    updatedAt: serverTimestamp(),
    ...(extras.adminResponse    !== undefined && { adminResponse:    extras.adminResponse }),
    ...(extras.offeredProductId !== undefined && { offeredProductId: extras.offeredProductId }),
  };

  await updateDoc(requestRef, updatePayload);

  if (status === "available" && extras.offeredProductId) {
    const requestData = snapshot.data();
    try {
      await notifyUser(
        requestData.userId,
        requestId,
        extras.offeredProductId,
        requestData.productName
      );
    } catch (err) {
      console.warn("[productRequestService] notifyUser failed (non-critical):", err);
    }
  }
}

// ─── NOTIFY SUPER ADMIN ──────────────────────────────────────────────────────
export async function notifyAdmin(requestId, productName, userEmail) {
  await addDoc(collection(db, ADMIN_NOTIF_COL), {
    type:       "product_request",
    message:    `New product request: "${productName}"`,
    subMessage: `From ${userEmail}`,
    requestId,
    isRead:     false,
    createdAt:  serverTimestamp(),
  });
}

// ─── NOTIFY USER ─────────────────────────────────────────────────────────────
export async function notifyUser(userId, requestId, productId, productName) {
  await addDoc(collection(db, USER_NOTIF_COL), {
    userId,
    type:       "product_available",
    message:    "Your requested product is now available!",
    subMessage: `"${productName}" has been sourced for you`,
    productId,
    requestId,
    isRead:     false,
    createdAt:  serverTimestamp(),
  });
}

// ─── FETCH ALL REQUESTS (super_admin) ────────────────────────────────────────
export async function getAllRequests(statusFilter = null) {
  try {
    let q;
    if (statusFilter && statusFilter !== "all") {
      q = query(
        collection(db, REQUESTS_COL),
        where("status", "==", statusFilter),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(collection(db, REQUESTS_COL), orderBy("createdAt", "desc"));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[getAllRequests] index fallback:", err.message);
    let q;
    if (statusFilter && statusFilter !== "all") {
      q = query(collection(db, REQUESTS_COL), where("status", "==", statusFilter));
    } else {
      q = query(collection(db, REQUESTS_COL));
    }
    const snap = await getDocs(q);
    return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
}

// ─── FETCH USER'S OWN REQUESTS ───────────────────────────────────────────────
export async function getUserRequests(userId) {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, REQUESTS_COL),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[getUserRequests] index fallback:", err.message);
    const q    = query(collection(db, REQUESTS_COL), where("userId", "==", userId));
    const snap = await getDocs(q);
    return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
}

// ─── FETCH SINGLE REQUEST ────────────────────────────────────────────────────
export async function getRequestById(requestId) {
  const requestRef = doc(db, REQUESTS_COL, requestId);
  const snapshot   = await getDoc(requestRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

// ─── FETCH ADMIN NOTIFICATIONS ───────────────────────────────────────────────
export async function getAdminNotifications() {
  try {
    const q    = query(collection(db, ADMIN_NOTIF_COL), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[getAdminNotifications] fallback:", err.message);
    const snap = await getDocs(collection(db, ADMIN_NOTIF_COL));
    return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
}

// ─── MARK ADMIN NOTIFICATION READ ───────────────────────────────────────────
export async function markAdminNotifRead(notifId) {
  await updateDoc(doc(db, ADMIN_NOTIF_COL, notifId), { isRead: true });
}

export async function markAllAdminNotifsRead() {
  const q    = query(collection(db, ADMIN_NOTIF_COL), where("isRead", "==", false));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { isRead: true })));
}

// ─── FETCH USER NOTIFICATIONS ────────────────────────────────────────────────
export async function getUserNotifications(userId) {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, USER_NOTIF_COL),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[getUserNotifications] fallback:", err.message);
    const q    = query(collection(db, USER_NOTIF_COL), where("userId", "==", userId));
    const snap = await getDocs(q);
    return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
}

// ─── MARK USER NOTIFICATION READ ────────────────────────────────────────────
export async function markUserNotifRead(notifId) {
  await updateDoc(doc(db, USER_NOTIF_COL, notifId), { isRead: true });
}

export async function markAllUserNotifsRead(userId) {
  if (!userId) return;
  const q = query(
    collection(db, USER_NOTIF_COL),
    where("userId", "==", userId),
    where("isRead", "==", false)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { isRead: true })));
}