// src/services/chatService.js
import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc,
  query, where, orderBy, serverTimestamp, setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export async function getOrCreateChat({ shopId, sellerId, customerId, customerName }) {
  // Check if chat already exists
  const snap = await getDocs(
    query(
      collection(db, "sellerChats"),
      where("shopId", "==", shopId),
      where("customerId", "==", customerId)
    )
  );
  if (!snap.empty) return snap.docs[0].id;

  // Create new chat
  const chatRef = await addDoc(collection(db, "sellerChats"), {
    shopId, sellerId, customerId, customerName,
    lastMessage: "",
    lastMessageTime: serverTimestamp(),
    unreadBySeller: 0,
    unreadByCustomer: 0,
    createdAt: serverTimestamp(),
  });
  return chatRef.id;
}

export async function sendChatMessage(chatId, senderId, senderRole, text, imageUrl = null) {
  const msg = {
    senderId, senderRole,
    text: String(text || "").trim().slice(0, 2000),
    isRead: false,
    createdAt: serverTimestamp(),
  };
  if (imageUrl) msg.imageUrl = imageUrl;

  await addDoc(collection(db, "sellerChats", chatId, "messages"), msg);
  await updateDoc(doc(db, "sellerChats", chatId), {
    lastMessage: msg.text,
    lastMessageTime: serverTimestamp(),
    [senderRole === "seller" ? "unreadByCustomer" : "unreadBySeller"]: 1,
  });
}

