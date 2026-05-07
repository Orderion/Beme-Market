// src/services/notificationService.js
// Handles all Firestore reads/writes for the notification system.
// Collections:
//   adminNotifications  — notifications received by super_admin
//   userNotifications   — sub-collection per user: users/{uid}/notifications

import {
  collection,
  doc,
  query,
  orderBy,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  getDocs,
  getDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../config/firebase";

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

/**
 * Formats a Firestore Timestamp / Date / seconds-object into a
 * human-readable relative string like "2 hours ago".
 */
export function formatNotifTime(ts) {
  if (!ts) return "";

  let ms;
  if (typeof ts?.toMillis === "function") ms = ts.toMillis();
  else if (ts instanceof Date)            ms = ts.getTime();
  else if (typeof ts?.seconds === "number") ms = ts.seconds * 1000;
  else return "";

  const diff = Date.now() - ms;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;

  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day:   "numeric",
  });
}

/* ═══════════════════════════════════════════════════════════════
   IMAGE UPLOAD
═══════════════════════════════════════════════════════════════ */

/**
 * Uploads a notification image to Firebase Storage and returns the URL.
 * @param {File} file
 * @returns {Promise<string>} download URL
 */
export async function uploadNotificationImage(file) {
  const ext      = file.name.split(".").pop();
  const fileName = `notifications/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storageRef = ref(storage, fileName);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/* ═══════════════════════════════════════════════════════════════
   SEND NOTIFICATIONS  (admin → users)
═══════════════════════════════════════════════════════════════ */

/**
 * Sends a notification to every user in the `users` collection.
 *
 * @param {{ title: string, body: string, imageUrl?: string, type?: string }} payload
 */
export async function sendNotificationToAllUsers(payload) {
  const usersSnap = await getDocs(collection(db, "users"));
  const batch = writeBatch(db);

  usersSnap.forEach((userDoc) => {
    const role = String(userDoc.data()?.role || "").toLowerCase();
    // Skip admin accounts
    if (["super_admin", "shop_admin", "admin"].includes(role)) return;

    const notifRef = doc(
      collection(db, "users", userDoc.id, "notifications")
    );
    batch.set(notifRef, {
      title:     payload.title     || "",
      body:      payload.body      || "",
      imageUrl:  payload.imageUrl  || null,
      type:      payload.type      || "general",
      read:      false,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

/**
 * Sends a notification to a specific user by uid.
 *
 * @param {string} uid
 * @param {{ title: string, body: string, imageUrl?: string, type?: string }} payload
 */
export async function sendNotificationToUser(uid, payload) {
  await addDoc(collection(db, "users", uid, "notifications"), {
    title:     payload.title     || "",
    body:      payload.body      || "",
    imageUrl:  payload.imageUrl  || null,
    type:      payload.type      || "general",
    read:      false,
    createdAt: serverTimestamp(),
  });
}

/**
 * Sends a notification to multiple users by uid array.
 *
 * @param {string[]} uids
 * @param {{ title: string, body: string, imageUrl?: string, type?: string }} payload
 */
export async function sendNotificationToSelectedUsers(uids, payload) {
  const batch = writeBatch(db);

  uids.forEach((uid) => {
    const notifRef = doc(collection(db, "users", uid, "notifications"));
    batch.set(notifRef, {
      title:     payload.title     || "",
      body:      payload.body      || "",
      imageUrl:  payload.imageUrl  || null,
      type:      payload.type      || "general",
      read:      false,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

/* ═══════════════════════════════════════════════════════════════
   USER NOTIFICATIONS  (real-time subscriptions)
═══════════════════════════════════════════════════════════════ */

/**
 * Subscribes to all notifications for a user, ordered newest-first.
 *
 * @param {string}   uid
 * @param {Function} onData  - called with Array of notification objects
 * @param {Function} onError - called with Error
 * @returns unsubscribe function
 */
export function subscribeToUserNotifications(uid, onData, onError) {
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(data);
    },
    onError
  );
}

/**
 * Subscribes only to the unread count for a user.
 * Lightweight — used in Header badge / BottomNav badge.
 *
 * @param {string}   uid
 * @param {Function} callback - called with number
 * @returns unsubscribe function
 */
export function subscribeToUserUnreadCount(uid, callback) {
  const q = query(
    collection(db, "users", uid, "notifications"),
    where("read", "==", false)
  );

  return onSnapshot(q, (snap) => callback(snap.size));
}

/**
 * Marks a single user notification as read.
 *
 * @param {string} uid
 * @param {string} notifId
 */
export async function markUserNotifRead(notifId, uid) {
  if (!uid || !notifId) return;
  await updateDoc(
    doc(db, "users", uid, "notifications", notifId),
    { read: true }
  );
}

/**
 * Marks ALL user notifications as read in one batch.
 *
 * @param {string} uid
 */
export async function markAllUserNotifsRead(uid) {
  if (!uid) return;
  const q    = query(
    collection(db, "users", uid, "notifications"),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN NOTIFICATIONS  (notifications sent TO super_admin)
   e.g. system alerts, new order spikes, etc.
   Stored in top-level `adminNotifications` collection.
═══════════════════════════════════════════════════════════════ */

/**
 * Subscribes to all admin notifications, newest-first.
 */
export function subscribeToAdminNotifications(onData, onError) {
  const q = query(
    collection(db, "adminNotifications"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(data);
    },
    onError
  );
}

/**
 * Subscribes only to unread count for the admin badge.
 */
export function subscribeToAdminUnreadCount(callback) {
  const q = query(
    collection(db, "adminNotifications"),
    where("read", "==", false)
  );

  return onSnapshot(q, (snap) => callback(snap.size));
}

/**
 * Marks a single admin notification as read.
 */
export async function markAdminNotifRead(notifId) {
  if (!notifId) return;
  await updateDoc(doc(db, "adminNotifications", notifId), { read: true });
}

/**
 * Marks ALL admin notifications as read.
 */
export async function markAllAdminNotifsRead() {
  const q    = query(
    collection(db, "adminNotifications"),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

/* ═══════════════════════════════════════════════════════════════
   FETCH ALL USERS  (for admin user-picker)
═══════════════════════════════════════════════════════════════ */

/**
 * Returns all non-admin users for the user picker in AdminNotifications.
 * @returns {Promise<Array<{ uid, displayName, email }>>}
 */
export async function fetchAllCustomers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((u) => {
      const role = String(u.role || "").toLowerCase();
      return !["super_admin", "shop_admin", "admin"].includes(role);
    });
}

/**
 * Fetches a sent notification history log from top-level `sentNotifications`.
 * Used in admin panel to show what was sent & when.
 */
export function subscribeToSentNotifications(onData, onError) {
  const q = query(
    collection(db, "sentNotifications"),
    orderBy("sentAt", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(data);
    },
    onError
  );
}

/**
 * Logs a sent notification to `sentNotifications` for admin audit trail.
 */
export async function logSentNotification(payload) {
  await addDoc(collection(db, "sentNotifications"), {
    ...payload,
    sentAt: serverTimestamp(),
  });
}