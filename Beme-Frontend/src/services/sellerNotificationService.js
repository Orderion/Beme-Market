// src/services/sellerNotificationService.js
// Seller-specific notification system.
// Collection: sellerNotifications/{sellerId}/items/{notifId}

import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, onSnapshot, writeBatch,
  serverTimestamp, limit,
} from "firebase/firestore";
import { db } from "../firebase";

/* ── Notification types ── */
export const NOTIF_TYPES = {
  NEW_ORDER:           "new_order",
  ORDER_PAID:          "order_paid",
  ORDER_STATUS:        "order_status",
  WITHDRAWAL_APPROVED: "withdrawal_approved",
  WITHDRAWAL_REJECTED: "withdrawal_rejected",
  NEW_FOLLOWER:        "new_follower",
  NEW_REVIEW:          "new_review",
  DISCOUNT_USED:       "discount_used",
  REFERRAL_ACTIVATED:  "referral_activated",
  SUBSCRIPTION_EXPIRY: "subscription_expiry",
  STORE_VERIFIED:      "store_verified",
  STORE_SUSPENDED:     "store_suspended",
  ANNOUNCEMENT:        "announcement",
  SYSTEM:              "system",
};

/* ── Icon + color per type ── */
export const NOTIF_META = {
  new_order:           { icon: "🛍️",  color: "#046EF2", label: "New Order"           },
  order_paid:          { icon: "💳",  color: "#22C55E", label: "Payment Received"     },
  order_status:        { icon: "📦",  color: "#7c3aed", label: "Order Update"         },
  withdrawal_approved: { icon: "✅",  color: "#22C55E", label: "Withdrawal Approved"  },
  withdrawal_rejected: { icon: "❌",  color: "#EF4444", label: "Withdrawal Rejected"  },
  new_follower:        { icon: "👤",  color: "#046EF2", label: "New Follower"         },
  new_review:          { icon: "⭐",  color: "#F59E0B", label: "New Review"           },
  discount_used:       { icon: "🏷️", color: "#7c3aed", label: "Discount Code Used"   },
  referral_activated:  { icon: "🎁",  color: "#22C55E", label: "Referral Activated"   },
  subscription_expiry: { icon: "⏰",  color: "#F59E0B", label: "Subscription Expiring"},
  store_verified:      { icon: "🛡️", color: "#22C55E", label: "Store Verified"       },
  store_suspended:     { icon: "🚫",  color: "#EF4444", label: "Store Suspended"      },
  announcement:        { icon: "📢",  color: "#046EF2", label: "Announcement"         },
  system:              { icon: "⚙️",  color: "#6B7280", label: "System"               },
};

/* ── Create a notification for a seller ── */
export async function createSellerNotification(sellerId, {
  type, title, body, linkTab = null, data = {},
}) {
  if (!sellerId || !title) return;
  await addDoc(collection(db, "sellerNotifications", sellerId, "items"), {
    type:    type || NOTIF_TYPES.SYSTEM,
    title,
    body:    body || "",
    linkTab,
    data,
    read:    false,
    createdAt: serverTimestamp(),
  });
}

/* ── Batch notify multiple sellers ── */
export async function notifyMultipleSellers(sellerIds, payload) {
  const batch = writeBatch(db);
  sellerIds.forEach(sid => {
    const ref = doc(collection(db, "sellerNotifications", sid, "items"));
    batch.set(ref, {
      type:    payload.type    || NOTIF_TYPES.ANNOUNCEMENT,
      title:   payload.title  || "",
      body:    payload.body   || "",
      linkTab: payload.linkTab || null,
      data:    payload.data   || {},
      read:    false,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/* ── Notify all sellers ── */
export async function notifyAllSellers(payload) {
  // Fetch all seller UIDs from storeApplications
  const snap = await getDocs(query(
    collection(db, "storeApplications"),
    limit(500),
  ));
  const ids = snap.docs.map(d => d.id);
  if (!ids.length) return;
  // Batch in chunks of 500 (Firestore limit)
  for (let i = 0; i < ids.length; i += 400) {
    const chunk = ids.slice(i, i + 400);
    await notifyMultipleSellers(chunk, payload);
  }
}

/* ── Real-time subscription to seller notifications ── */
export function subscribeToSellerNotifications(sellerId, onData, onError) {
  if (!sellerId) return () => {};
  const q = query(
    collection(db, "sellerNotifications", sellerId, "items"),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  return onSnapshot(q,
    snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    onError || (() => {}),
  );
}

/* ── Real-time unread count ── */
export function subscribeToSellerUnreadCount(sellerId, callback) {
  if (!sellerId) return () => {};
  const q = query(
    collection(db, "sellerNotifications", sellerId, "items"),
    where("read", "==", false),
  );
  return onSnapshot(q, snap => callback(snap.size), () => callback(0));
}

/* ── Mark one read ── */
export async function markSellerNotifRead(sellerId, notifId) {
  if (!sellerId || !notifId) return;
  await updateDoc(
    doc(db, "sellerNotifications", sellerId, "items", notifId),
    { read: true },
  );
}

/* ── Mark all read ── */
export async function markAllSellerNotifsRead(sellerId) {
  if (!sellerId) return;
  const q    = query(
    collection(db, "sellerNotifications", sellerId, "items"),
    where("read", "==", false),
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
}

/* ── Format timestamp ── */
export function fmtNotifTime(ts) {
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
  return new Date(ms).toLocaleDateString("en-GH", { month:"short", day:"numeric" });
}