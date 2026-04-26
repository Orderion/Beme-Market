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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

// ─── COLLECTION NAMES ────────────────────────────────────────────────────────
const REQUESTS_COL       = "product_requests";
const ADMIN_NOTIF_COL    = "admin_notifications";
const USER_NOTIF_COL     = "user_notifications";

// ─── UPLOAD REFERENCE IMAGE ──────────────────────────────────────────────────
/**
 * Uploads an optional reference image to Firebase Storage.
 * @param {File|null} file
 * @param {string} userId
 * @returns {Promise<string|null>} download URL or null
 */
async function uploadReferenceImage(file, userId) {
  if (!file) return null;
  const path = `product_requests/${userId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// ─── ADD PRODUCT REQUEST ─────────────────────────────────────────────────────
/**
 * Creates a new product request in Firestore and notifies super_admin.
 * @param {{ productName, description, preferredBudget, category }} data
 * @param {File|null} imageFile
 * @param {{ uid: string, email: string }} user
 * @returns {Promise<string>} new request document ID
 */
export async function addProductRequest(data, imageFile, user) {
  const referenceImageUrl = await uploadReferenceImage(imageFile, user.uid);

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

  // Fire-and-forget admin notification
  await notifyAdmin(docRef.id, data.productName.trim(), user.email);

  return docRef.id;
}

// ─── UPDATE REQUEST STATUS (super_admin only) ────────────────────────────────
/**
 * Updates the status of a product request.
 * When status → "available", automatically notifies the requesting user.
 *
 * @param {string} requestId
 * @param {"pending"|"sourcing"|"available"|"rejected"} status
 * @param {{ adminResponse?: string, offeredProductId?: string }} extras
 */
export async function updateRequestStatus(requestId, status, extras = {}) {
  const requestRef = doc(db, REQUESTS_COL, requestId);
  const snapshot   = await getDoc(requestRef);

  if (!snapshot.exists()) throw new Error("Product request not found.");

  const updatePayload = {
    status,
    updatedAt: serverTimestamp(),
    ...(extras.adminResponse   !== undefined && { adminResponse:    extras.adminResponse }),
    ...(extras.offeredProductId !== undefined && { offeredProductId: extras.offeredProductId }),
  };

  await updateDoc(requestRef, updatePayload);

  // Notify the user when the product becomes available
  if (status === "available" && extras.offeredProductId) {
    const requestData = snapshot.data();
    await notifyUser(
      requestData.userId,
      requestId,
      extras.offeredProductId,
      requestData.productName
    );
  }
}

// ─── NOTIFY SUPER ADMIN ──────────────────────────────────────────────────────
/**
 * Creates a notification document in admin_notifications.
 * @param {string} requestId
 * @param {string} productName
 * @param {string} userEmail
 */
export async function notifyAdmin(requestId, productName, userEmail) {
  await addDoc(collection(db, ADMIN_NOTIF_COL), {
    type:        "product_request",
    message:     `New product request: "${productName}"`,
    subMessage:  `From ${userEmail}`,
    requestId,
    isRead:      false,
    createdAt:   serverTimestamp(),
  });
}

// ─── NOTIFY USER ─────────────────────────────────────────────────────────────
/**
 * Creates a notification document in user_notifications for the requesting user.
 * @param {string} userId
 * @param {string} requestId
 * @param {string} productId
 * @param {string} productName
 */
export async function notifyUser(userId, requestId, productId, productName) {
  await addDoc(collection(db, USER_NOTIF_COL), {
    userId,
    type:        "product_available",
    message:     `Your requested product is now available!`,
    subMessage:  `"${productName}" has been sourced for you`,
    productId,
    requestId,
    isRead:      false,
    createdAt:   serverTimestamp(),
  });
}

// ─── FETCH ALL REQUESTS (super_admin) ────────────────────────────────────────
/**
 * Returns all product requests ordered by createdAt desc.
 * Optionally filter by status.
 * @param {string|null} statusFilter
 * @returns {Promise<Array>}
 */
export async function getAllRequests(statusFilter = null) {
  let q;

  if (statusFilter && statusFilter !== "all") {
    q = query(
      collection(db, REQUESTS_COL),
      where("status", "==", statusFilter),
      orderBy("createdAt", "desc")
    );
  } else {
    q = query(
      collection(db, REQUESTS_COL),
      orderBy("createdAt", "desc")
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── FETCH USER'S OWN REQUESTS ───────────────────────────────────────────────
/**
 * Returns all requests submitted by a specific user.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getUserRequests(userId) {
  const q = query(
    collection(db, REQUESTS_COL),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── FETCH SINGLE REQUEST ────────────────────────────────────────────────────
/**
 * Returns a single product request by ID.
 * @param {string} requestId
 * @returns {Promise<Object|null>}
 */
export async function getRequestById(requestId) {
  const requestRef = doc(db, REQUESTS_COL, requestId);
  const snapshot   = await getDoc(requestRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

// ─── FETCH ADMIN NOTIFICATIONS ───────────────────────────────────────────────
/**
 * Returns all admin notifications ordered by createdAt desc.
 * @returns {Promise<Array>}
 */
export async function getAdminNotifications() {
  const q = query(
    collection(db, ADMIN_NOTIF_COL),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── MARK ADMIN NOTIFICATION AS READ ────────────────────────────────────────
/**
 * Marks a single admin notification as read.
 * @param {string} notifId
 */
export async function markAdminNotifRead(notifId) {
  await updateDoc(doc(db, ADMIN_NOTIF_COL, notifId), { isRead: true });
}

// ─── MARK ALL ADMIN NOTIFICATIONS AS READ ───────────────────────────────────
/**
 * Marks all unread admin notifications as read.
 */
export async function markAllAdminNotifsRead() {
  const q    = query(collection(db, ADMIN_NOTIF_COL), where("isRead", "==", false));
  const snap = await getDocs(q);
  const updates = snap.docs.map((d) => updateDoc(d.ref, { isRead: true }));
  await Promise.all(updates);
}

// ─── FETCH USER NOTIFICATIONS ────────────────────────────────────────────────
/**
 * Returns all notifications for a specific user ordered by createdAt desc.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getUserNotifications(userId) {
  const q = query(
    collection(db, USER_NOTIF_COL),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── MARK USER NOTIFICATION AS READ ─────────────────────────────────────────
/**
 * Marks a single user notification as read.
 * Only the isRead field is updated (matches Firestore rules).
 * @param {string} notifId
 */
export async function markUserNotifRead(notifId) {
  await updateDoc(doc(db, USER_NOTIF_COL, notifId), { isRead: true });
}

// ─── MARK ALL USER NOTIFICATIONS AS READ ────────────────────────────────────
/**
 * Marks all unread notifications for a user as read.
 * @param {string} userId
 */
export async function markAllUserNotifsRead(userId) {
  const q = query(
    collection(db, USER_NOTIF_COL),
    where("userId", "==", userId),
    where("isRead", "==", false)
  );
  const snap   = await getDocs(q);
  const updates = snap.docs.map((d) => updateDoc(d.ref, { isRead: true }));
  await Promise.all(updates);
}