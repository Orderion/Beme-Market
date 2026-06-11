import { useState, useCallback, useEffect, useRef } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";
import { sendAIMessage } from "../services/aiService";
import { incrementUsage } from "../services/aiUsageService";

export function useAIChat({ aiContext={}, onLimitReached }={}) {
  const { user } = useAuth();
  const { subscriptionPlan } = useSellerAuth();
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [isTyping,    setIsTyping]    = useState(false);
  const [error,       setError]       = useState(null);
  const [histLoading, setHistLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(()=>{
    if (!user?.uid) { setHistLoading(false); return; }
    const q    = query(collection(db,"aiChats",user.uid,"messages"),orderBy("createdAt","asc"),limit(50));
    const unsub= onSnapshot(q,(snap)=>{ setMessages(snap.docs.map(d=>({id:d.id,...d.data()}))); setHistLoading(false); },(e)=>{ console.error(e); setHistLoading(false); });
    return ()=>unsub();
  },[user?.uid]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); },[messages,isTyping]);

  const saveMessage = useCallback(async(role,content)=>{
    if (!user?.uid) return;
    try { await addDoc(collection(db,"aiChats",user.uid,"messages"),{ role, content, createdAt:serverTimestamp(), page:aiContext?.currentPage||"home" }); }
    catch(e){ console.error(e); }
  },[user?.uid,aiContext?.currentPage]);

  const sendMessage = useCallback(async(text)=>{
    const trimmed=(text||input).trim();
    if (!trimmed||isTyping||!user?.uid) return;
    setError(null);
    const result = await incrementUsage(user.uid, subscriptionPlan || "basic");
    if (!result.success) { if (result.reason==="limit_reached"&&onLimitReached) onLimitReached(); return; }
    setInput("");
    setMessages(prev=>[...prev,{ role:"user",content:trimmed,createdAt:new Date(),id:`tmp_${Date.now()}` }]);
    await saveMessage("user",trimmed);
    setIsTyping(true);
    try {
      const history = messages.slice(-10).map(m=>({ role:m.role,content:m.content }));
      history.push({ role:"user",content:trimmed });
      const res = await sendAIMessage(history,aiContext,user.uid);
      await saveMessage("assistant",res);
    } catch(e) {
      console.error(e); setError("Something went wrong. Please try again.");
      await saveMessage("assistant","I'm having trouble responding right now. Please try again in a moment.");
    } finally { setIsTyping(false); }
  },[input,isTyping,user?.uid,messages,aiContext,saveMessage,onLimitReached]);

  return { messages, input, setInput, isTyping, error, histLoading, bottomRef, sendMessage };
}
