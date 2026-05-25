import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, onSnapshot, orderBy, query,
  addDoc, updateDoc, serverTimestamp, where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";

/**
 * useChat — seller dashboard chat hook.
 * Reads from sellerChats collection.
 * Field: lastMessageAt (not lastMessageTime)
 */
export function useChat() {
  const { user }             = useAuth();
  const { storeId, shop }    = useSellerAuth();
  const sellerId             = user?.uid;

  const [conversations, setConversations] = useState([]);
  const [activeChat,    setActiveChat]    = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);

  /* Subscribe to all conversations for this seller
     Queries by sellerId (always set) — avoids needing shopId index */
  useEffect(() => {
    if (!sellerId) { setLoading(false); return; }

    const q = query(
      collection(db, "sellerChats"),
      where("sellerId", "==", sellerId),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("[useChat] conversations error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [sellerId]);

  /* Subscribe to messages for the active chat */
  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }

    const q = query(
      collection(db, "sellerChats", activeChat, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("[useChat] messages error:", err);
    });

    return () => unsub();
  }, [activeChat]);

  /* Send a message as seller */
  const sendMessage = useCallback(async (text, imageUrl = null) => {
    if (!activeChat || !user?.uid || !text?.trim()) return;
    setSending(true);
    try {
      const msgData = {
        senderId:   user.uid,
        senderRole: "seller",
        text:       String(text).trim().slice(0, 2000),
        createdAt:  serverTimestamp(),
        isRead:     false,
        isAiReply:  false,
      };
      if (imageUrl) msgData.imageUrl = imageUrl;

      await addDoc(
        collection(db, "sellerChats", activeChat, "messages"),
        msgData
      );

      await updateDoc(doc(db, "sellerChats", activeChat), {
        lastMessage:     msgData.text,
        lastMessageAt:   serverTimestamp(),   // ← was lastMessageTime (wrong)
        unreadByCustomer: 1,
        unreadBySeller:   0,
      });
    } catch (err) {
      console.error("[useChat] sendMessage error:", err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [activeChat, user?.uid]);

  /* Mark conversation as read by seller */
  const markRead = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      await updateDoc(doc(db, "sellerChats", chatId), { unreadBySeller: 0 });
    } catch (err) {
      console.error("[useChat] markRead error:", err);
    }
  }, []);

  const totalUnread = conversations.reduce(
    (s, c) => s + (c.unreadBySeller || 0), 0
  );

  return {
    conversations,
    activeChat,
    setActiveChat,
    messages,
    loading,
    sending,
    totalUnread,
    sendMessage,
    markRead,
  };
}