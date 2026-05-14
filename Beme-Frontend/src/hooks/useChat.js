import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, onSnapshot, orderBy, query,
  addDoc, updateDoc, serverTimestamp, where, getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";

/**
 * useChat — manages seller chat conversations and messages.
 * Reads from sellerChats/{chatId} and sellerChats/{chatId}/messages/{msgId}
 */
export function useChat() {
  const { user }    = useAuth();
  const { storeId } = useSellerAuth();

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);

  // Subscribe to all conversations for this seller
  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    const q = query(
      collection(db, "sellerChats"),
      where("shopId", "==", storeId),
      orderBy("lastMessageTime", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("[useChat] conversations error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  // Subscribe to messages for the active chat
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

  // Send a message
  const sendMessage = useCallback(async (text, imageUrl = null) => {
    if (!activeChat || !user?.uid || !text?.trim()) return;
    setSending(true);
    try {
      const msgData = {
        senderId: user.uid,
        senderRole: "seller",
        text: String(text).trim().slice(0, 2000),
        createdAt: serverTimestamp(),
        isRead: false,
      };
      if (imageUrl) msgData.imageUrl = imageUrl;

      await addDoc(collection(db, "sellerChats", activeChat, "messages"), msgData);

      // Update conversation last message
      await updateDoc(doc(db, "sellerChats", activeChat), {
        lastMessage: msgData.text,
        lastMessageTime: serverTimestamp(),
        unreadByCustomer: 1,
        unreadBySeller: 0,
      });
    } catch (err) {
      console.error("[useChat] sendMessage error:", err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [activeChat, user?.uid]);

  // Mark conversation as read by seller
  const markRead = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      await updateDoc(doc(db, "sellerChats", chatId), { unreadBySeller: 0 });
    } catch (err) {
      console.error("[useChat] markRead error:", err);
    }
  }, []);

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadBySeller || 0), 0);

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

