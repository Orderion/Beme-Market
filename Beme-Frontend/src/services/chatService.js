/**
 * chatService.js
 * Handles all Firestore operations for customer ↔ seller messaging.
 * Collection: sellerChats/{chatId}/messages/{msgId}
 */

import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";

const CHATS_COL = "sellerChats";

/**
 * Get or create a chat between a customer and a seller.
 * Prevents duplicate chats for the same pair.
 */
export async function getOrCreateChat({ customerId, sellerId, shopId, customerName = "Customer", shopName = "Store" }) {
  if (!customerId || !sellerId) throw new Error("Missing customerId or sellerId");

  // Check for existing chat
  try {
    const snap = await getDocs(query(
      collection(db, CHATS_COL),
      where("customerId", "==", customerId),
      where("sellerId",   "==", sellerId),
      limit(1),
    ));
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
  } catch (e) {
    console.error("[chatService] getOrCreateChat query:", e);
  }

  // Create new chat
  const chatData = {
    customerId,
    sellerId,
    shopId:       shopId || sellerId,
    customerName,
    shopName,
    lastMessage:  "",
    lastMessageAt: serverTimestamp(),
    createdAt:    serverTimestamp(),
    unreadBySeller:   0,
    unreadByCustomer: 0,
  };

  const ref = await addDoc(collection(db, CHATS_COL), chatData);
  return { id: ref.id, ...chatData };
}

/**
 * Send a message in a chat.
 */
export async function sendMessage({ chatId, senderId, text, senderRole = "customer", isAiReply = false }) {
  if (!chatId || !senderId || !text?.trim()) throw new Error("Missing required fields");

  const msgRef = await addDoc(collection(db, CHATS_COL, chatId, "messages"), {
    text:       text.trim(),
    senderId,
    senderRole,  // "customer" | "seller" | "ai"
    isAiReply,
    createdAt:  serverTimestamp(),
    read:       false,
  });

  // Update chat metadata
  const unreadField = senderRole === "customer" ? "unreadBySeller" : "unreadByCustomer";
  await updateDoc(doc(db, CHATS_COL, chatId), {
    lastMessage:   text.trim().slice(0, 100),
    lastMessageAt: serverTimestamp(),
    [unreadField]: increment(1),
  });

  return msgRef.id;
}

/**
 * Subscribe to messages in a chat (real-time).
 * Returns unsubscribe function.
 */
export function subscribeToMessages(chatId, callback) {
  if (!chatId) return () => {};
  return onSnapshot(
    query(
      collection(db, CHATS_COL, chatId, "messages"),
      orderBy("createdAt", "asc"),
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => console.error("[chatService] messages listener:", err),
  );
}

/**
 * Subscribe to all chats for a user (customer or seller).
 * Returns unsubscribe function.
 */
export function subscribeToUserChats(userId, role, callback) {
  if (!userId) return () => {};
  const field = role === "seller" ? "sellerId" : "customerId";
  return onSnapshot(
    query(
      collection(db, CHATS_COL),
      where(field, "==", userId),
      orderBy("lastMessageAt", "desc"),
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => console.error("[chatService] chats listener:", err),
  );
}

/**
 * Mark all messages in a chat as read for a given role.
 */
export async function markChatRead(chatId, role) {
  if (!chatId) return;
  const field = role === "seller" ? "unreadBySeller" : "unreadByCustomer";
  try {
    await updateDoc(doc(db, CHATS_COL, chatId), { [field]: 0 });
  } catch (e) {
    console.error("[chatService] markChatRead:", e);
  }
}

/**
 * Get a single chat by ID.
 */
export async function getChat(chatId) {
  if (!chatId) return null;
  const snap = await getDoc(doc(db, CHATS_COL, chatId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Plan-based auto-reply limits.
 */
export const AUTO_REPLY_LIMITS = {
  basic:   0,
  starter: 1000,
  growth:  20000,
  pro:     Infinity,
};

export function canAutoReply(plan) {
  return AUTO_REPLY_LIMITS[plan] > 0;
}
