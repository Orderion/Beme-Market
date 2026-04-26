// src/services/notificationService.js
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── COLLECTION NAMES ────────────────────────────────────────────────────────
const ADMIN_NOTIF_COL = "admin_notifications";
const USER_NOTIF_COL  = "user_notifications";

// ─── REAL-TIME: ADMIN NOTIFICATIONS ─────────────────────────────────────────
/**
 * Subscribes to all admin notifications in real time, ordered by createdAt desc.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * @param {(notifications: Array) => void} onUpdate  - called on every change
 * @param {(error: Error) => void}         onError   - called on Firestore error
 * @param {number}                         maxItems  - max docs to listen to (default 50)
 * @returns {() => void} unsubscribe
 */
export function subscribeToAdminNotifications(onUpdate, onError, maxItems = 50) {
  const q = query(
    collection(db, ADMIN_NOTIF_COL),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const notifications = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? null,
      }));
      onUpdate(notifications);
    },
    (error) => {
      console.error("[notificationService] admin listener error:", error);
      if (onError) onError(error);
    }
  );

  return unsub;
}

// ─── REAL-TIME: UNREAD ADMIN NOTIFICATION COUNT ──────────────────────────────
/**
 * Subscribes to the count of unread admin notifications only.
 * Lightweight — used for badge in header / sidebar.
 *
 * @param {(count: number) => void} onUpdate
 * @returns {() => void} unsubscribe
 */
export function subscribeToAdminUnreadCount(onUpdate) {
  const q = query(
    collection(db, ADMIN_NOTIF_COL),
    where("isRead", "==", false)
  );

  const unsub = onSnapshot(
    q,
    (snap) => onUpdate(snap.size),
    (error) => {
      console.error("[notificationService] admin unread count error:", error);
      onUpdate(0);
    }
  );

  return unsub;
}

// ─── REAL-TIME: USER NOTIFICATIONS ──────────────────────────────────────────
/**
 * Subscribes to all notifications for a specific user in real time.
 * Returns an unsubscribe function.
 *
 * @param {string}                         userId
 * @param {(notifications: Array) => void} onUpdate
 * @param {(error: Error) => void}         onError
 * @param {number}                         maxItems
 * @returns {() => void} unsubscribe
 */
export function subscribeToUserNotifications(userId, onUpdate, onError, maxItems = 30) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, USER_NOTIF_COL),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const notifications = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? null,
      }));
      onUpdate(notifications);
    },
    (error) => {
      console.error("[notificationService] user listener error:", error);
      if (onError) onError(error);
    }
  );

  return unsub;
}

// ─── REAL-TIME: UNREAD USER NOTIFICATION COUNT ───────────────────────────────
/**
 * Subscribes to the count of unread notifications for a user.
 * Used for badge display in account page / bottom nav.
 *
 * @param {string}                   userId
 * @param {(count: number) => void}  onUpdate
 * @returns {() => void} unsubscribe
 */
export function subscribeToUserUnreadCount(userId, onUpdate) {
  if (!userId) {
    onUpdate(0);
    return () => {};
  }

  const q = query(
    collection(db, USER_NOTIF_COL),
    where("userId", "==", userId),
    where("isRead", "==", false)
  );

  const unsub = onSnapshot(
    q,
    (snap) => onUpdate(snap.size),
    (error) => {
      console.error("[notificationService] user unread count error:", error);
      onUpdate(0);
    }
  );

  return unsub;
}

// ─── MARK SINGLE ADMIN NOTIFICATION READ ────────────────────────────────────
/**
 * @param {string} notifId
 */
export async function markAdminNotifRead(notifId) {
  await updateDoc(doc(db, ADMIN_NOTIF_COL, notifId), { isRead: true });
}

// ─── MARK ALL ADMIN NOTIFICATIONS READ ──────────────────────────────────────
export async function markAllAdminNotifsRead() {
  const q    = query(collection(db, ADMIN_NOTIF_COL), where("isRead", "==", false));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { isRead: true })));
}

// ─── MARK SINGLE USER NOTIFICATION READ ─────────────────────────────────────
/**
 * Only updates `isRead` — matches Firestore security rule restriction.
 * @param {string} notifId
 */
export async function markUserNotifRead(notifId) {
  await updateDoc(doc(db, USER_NOTIF_COL, notifId), { isRead: true });
}

// ─── MARK ALL USER NOTIFICATIONS READ ───────────────────────────────────────
/**
 * @param {string} userId
 */
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

// ─── FORMAT TIMESTAMP ────────────────────────────────────────────────────────
/**
 * Converts a Firestore Timestamp or JS Date to a human-readable relative string.
 * e.g. "2 minutes ago", "3 hours ago", "Yesterday"
 * @param {Date|null} date
 * @returns {string}
 */
export function formatNotifTime(date) {
  if (!date) return "";

  const now   = Date.now();
  const ms    = now - date.getTime();
  const secs  = Math.floor(ms / 1000);
  const mins  = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);

  if (secs < 60)  return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7)   return `${days} days ago`;

  return date.toLocaleDateString("en-GH", {
    day:   "numeric",
    month: "short",
  });
}