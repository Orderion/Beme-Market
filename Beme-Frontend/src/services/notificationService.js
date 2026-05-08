// src/services/notificationService.js
// Handles all Firestore reads/writes for the notification system.
// Collections:
//   adminNotifications          — notifications received by super_admin
//   users/{uid}/notifications   — per-user notification sub-collection
//   sentNotifications           — audit log of every send action
//
// IMAGE UPLOADS → Cloudinary (unsigned upload preset)
// Set in your .env:
//   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
//   VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset

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
} from "firebase/firestore";
import { db } from "../firebase";

/* ═══════════════════════════════════════════════════════════════
   CLOUDINARY IMAGE UPLOAD
═══════════════════════════════════════════════════════════════ */

const CLOUDINARY_CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Uploads an image to Cloudinary using the unsigned upload API.
 * No Firebase Storage needed — uses XHR so upload progress is trackable.
 *
 * @param {File}      file        — image file chosen by admin
 * @param {Function}  onProgress  — optional callback(percent: number)
 * @returns {Promise<string>}     secure Cloudinary URL
 */
export async function uploadNotificationImage(file, onProgress) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary env vars missing. Add VITE_CLOUDINARY_CLOUD_NAME and " +
      "VITE_CLOUDINARY_UPLOAD_PRESET to your .env file."
    );
  }

  const formData = new FormData();
  formData.append("file",          file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder",        "notifications");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.secure_url) {
            resolve(data.secure_url);
          } else {
            reject(new Error("Cloudinary response missing secure_url"));
          }
        } catch {
          reject(new Error("Failed to parse Cloudinary response"));
        }
      } else {
        let msg = `Cloudinary upload failed (${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          if (err?.error?.message) msg = err.error.message;
        } catch { /* ignore */ }
        reject(new Error(msg));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Network error during image upload"))
    );
    xhr.addEventListener("abort", () =>
      reject(new Error("Image upload was aborted"))
    );

    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
    );
    xhr.send(formData);
  });
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

/**
 * Formats a Firestore Timestamp into a relative string like "2h ago".
 */
export function formatNotifTime(ts) {
  if (!ts) return "";

  let ms;
  if (typeof ts?.toMillis === "function")   ms = ts.toMillis();
  else if (ts instanceof Date)              ms = ts.getTime();
  else if (typeof ts?.seconds === "number") ms = ts.seconds * 1000;
  else return "";

  const diff  = Date.now() - ms;
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
   NOTIFICATION DOCUMENT BUILDER
   Payload shape:
     {
       title      : string   required
       body       : string   required
       imageUrl   : string?  Cloudinary URL
       linkUrl    : string?  any URL — product, page, external site
       linkLabel  : string?  button label e.g. "Shop Now", "View Order"
       type       : string?  "general" | "admin" | "order" | "promo"
     }
═══════════════════════════════════════════════════════════════ */

function buildNotifDoc(payload) {
  return {
    title:     payload.title      || "",
    body:      payload.body       || "",
    imageUrl:  payload.imageUrl   || null,
    linkUrl:   payload.linkUrl    || null,
    linkLabel: payload.linkLabel  || null,
    type:      payload.type       || "general",
    read:      false,
    createdAt: serverTimestamp(),
  };
}

/* ═══════════════════════════════════════════════════════════════
   SEND NOTIFICATIONS  (admin → users)
═══════════════════════════════════════════════════════════════ */

/**
 * Broadcasts to every non-admin user.
 */
export async function sendNotificationToAllUsers(payload) {
  const usersSnap = await getDocs(collection(db, "users"));
  const batch     = writeBatch(db);

  usersSnap.forEach((userDoc) => {
    const role = String(userDoc.data()?.role || "").toLowerCase();
    if (["super_admin", "shop_admin", "admin"].includes(role)) return;
    const notifRef = doc(collection(db, "users", userDoc.id, "notifications"));
    batch.set(notifRef, buildNotifDoc(payload));
  });

  await batch.commit();
}

/**
 * Sends to a single user by uid.
 */
export async function sendNotificationToUser(uid, payload) {
  await addDoc(
    collection(db, "users", uid, "notifications"),
    buildNotifDoc(payload)
  );
}

/**
 * Sends to multiple users by uid array.
 */
export async function sendNotificationToSelectedUsers(uids, payload) {
  const batch = writeBatch(db);
  uids.forEach((uid) => {
    const notifRef = doc(collection(db, "users", uid, "notifications"));
    batch.set(notifRef, buildNotifDoc(payload));
  });
  await batch.commit();
}

/* ═══════════════════════════════════════════════════════════════
   USER NOTIFICATIONS  (real-time)
═══════════════════════════════════════════════════════════════ */

export function subscribeToUserNotifications(uid, onData, onError) {
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export function subscribeToUserUnreadCount(uid, callback) {
  const q = query(
    collection(db, "users", uid, "notifications"),
    where("read", "==", false)
  );
  return onSnapshot(q, (snap) => callback(snap.size));
}

export async function markUserNotifRead(notifId, uid) {
  if (!uid || !notifId) return;
  await updateDoc(
    doc(db, "users", uid, "notifications", notifId),
    { read: true }
  );
}

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
   ADMIN NOTIFICATIONS  (real-time)
═══════════════════════════════════════════════════════════════ */

export function subscribeToAdminNotifications(onData, onError) {
  const q = query(
    collection(db, "adminNotifications"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export function subscribeToAdminUnreadCount(callback) {
  const q = query(
    collection(db, "adminNotifications"),
    where("read", "==", false)
  );
  return onSnapshot(q, (snap) => callback(snap.size));
}

export async function markAdminNotifRead(notifId) {
  if (!notifId) return;
  await updateDoc(doc(db, "adminNotifications", notifId), { read: true });
}

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
   FETCH ALL CUSTOMERS  (for user-picker)
═══════════════════════════════════════════════════════════════ */

export async function fetchAllCustomers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((u) => {
      const role = String(u.role || "").toLowerCase();
      return !["super_admin", "shop_admin", "admin"].includes(role);
    });
}

/* ═══════════════════════════════════════════════════════════════
   SENT NOTIFICATIONS LOG
═══════════════════════════════════════════════════════════════ */

export function subscribeToSentNotifications(onData, onError) {
  const q = query(
    collection(db, "sentNotifications"),
    orderBy("sentAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function logSentNotification(payload) {
  await addDoc(collection(db, "sentNotifications"), {
    ...payload,
    sentAt: serverTimestamp(),
  });
}