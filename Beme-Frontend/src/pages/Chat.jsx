import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  subscribeToUserChats,
  subscribeToMessages,
  sendMessage,
  markChatRead,
  getOrCreateChat,
} from "../services/chatService";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}

function Ico({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const IC = {
  chat:   "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  send:   "M22 2L11 13|M22 2L15 22l-4-9-9-4 22-7z",
  back:   "M19 12H5|M12 19l-7-7 7-7",
  search: "M21 21l-4.35-4.35|M17 11A6 6 0 105 11a6 6 0 0012 0z",
};

function EmptyState({ title, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", padding: 40, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f5f5f5",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Ico d={IC.chat} size={24} color="rgba(0,0,0,0.2)" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>{sub}</div>}
    </div>
  );
}

export default function Chat() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const shopParam  = params.get("shop");

  const [user,       setUser]       = useState(null);
  const [authLoading,setAuthLoading]= useState(true);
  const [chats,      setChats]      = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [sending,    setSending]    = useState(false);
  const [search,     setSearch]     = useState("");
  const [mobileView, setMobileView] = useState("list"); // "list" | "chat"

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const unsubMsgs = useRef(null);
  const unsubChats= useRef(null);

  /* Auth */
  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);
    const unsub = auth.onAuthStateChanged(u => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  /* Subscribe to user's chats */
  useEffect(() => {
    if (!user) return;
    unsubChats.current?.();
    unsubChats.current = subscribeToUserChats(user.uid, "customer", chats => {
      setChats(chats);
      // If shopParam provided, auto-open that chat
      if (shopParam) {
        const target = chats.find(c => c.shopId === shopParam || c.sellerId === shopParam);
        if (target) openChat(target);
      }
    });
    return () => unsubChats.current?.();
  }, [user?.uid, shopParam]);

  /* Open a chat */
  const openChat = useCallback((chat) => {
    setActiveChat(chat);
    setMobileView("chat");
    setMessages([]);
    unsubMsgs.current?.();
    unsubMsgs.current = subscribeToMessages(chat.id, msgs => {
      setMessages(msgs);
    });
    markChatRead(chat.id, "customer").catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  /* Scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Cleanup */
  useEffect(() => () => {
    unsubMsgs.current?.();
    unsubChats.current?.();
  }, []);

  const triggerAutoReply = useCallback(async (chatId, sellerId, shopId, shopName, planId, text) => {
    try {
      await fetch(`${API_URL}/api/chat/auto-reply`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ chatId, sellerId, shopId, shopName, planId, message: text }),
      });
    } catch {}
  }, []);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending || !activeChat || !user) return;
    setInput("");
    setSending(true);
    try {
      await sendMessage({ chatId: activeChat.id, senderId: user.uid, text: msg, senderRole: "customer" });
      triggerAutoReply(
        activeChat.id, activeChat.sellerId, activeChat.shopId,
        activeChat.shopName, activeChat.planId || "basic", msg,
      );
    } catch (e) {
      console.error("[Chat] send:", e);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filteredChats = chats.filter(c =>
    !search || (c.shopName || "").toLowerCase().includes(search.toLowerCase())
  );

  /* ── Not logged in ── */
  if (!authLoading && !user) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 32,
        fontFamily: "var(--font-main,'Nunito',sans-serif)" }}>
        <Ico d={IC.chat} size={48} color="rgba(0,0,0,0.12)" />
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "16px 0 8px" }}>
          Sign in to view messages
        </div>
        <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 24 }}>
          Your conversations with sellers will appear here.
        </div>
        <button onClick={() => navigate("/login?redirect=/messages")} style={{
          padding: "12px 28px", borderRadius: 10, border: "none",
          background: "#046EF2", color: "#fff", fontSize: 14, fontWeight: 800,
          cursor: "pointer", fontFamily: "inherit",
        }}>
          Sign In
        </button>
      </div>
    );
  }

  const initials = (name) => (name || "?").charAt(0).toUpperCase();

  return (
    <div style={{
      maxWidth:   1080,
      margin:     "0 auto",
      height:     "calc(100vh - 64px)",
      display:    "flex",
      fontFamily: "var(--font-main,'Nunito',sans-serif)",
      border:     "1px solid rgba(0,0,0,0.07)",
      borderTop:  "none",
    }}>

      {/* ── CONVERSATION LIST ── */}
      <div style={{
        width:        "min(340px, 100%)",
        flexShrink:   0,
        borderRight:  "1px solid rgba(0,0,0,0.07)",
        display:      "flex",
        flexDirection:"column",
        background:   "#fff",
        ...(mobileView === "chat" ? { display: "none" } : {}),
      }}
        className="chat-list-col"
      >
        {/* Header */}
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#111",
            letterSpacing: "-0.02em", marginBottom: 10 }}>
            Messages
          </div>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <Ico d={IC.search} size={14} color="#9ca3af" />
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              style={{
                width: "100%", height: 38, background: "#f5f5f5",
                border: "1px solid transparent", borderRadius: 10,
                color: "#111", fontSize: 13, fontWeight: 600,
                padding: "0 12px 0 32px", outline: "none",
                fontFamily: "Nunito,sans-serif", boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "#046EF2"}
              onBlur={e  => e.target.style.borderColor = "transparent"}
            />
          </div>
        </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin" }}>
          {authLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} style={{ padding: "12px 16px", display: "flex", gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#f0f0f0", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, width: "60%", background: "#f0f0f0", borderRadius: 6, marginBottom: 6 }} />
                  <div style={{ height: 10, width: "80%", background: "#f0f0f0", borderRadius: 6 }} />
                </div>
              </div>
            ))
          ) : filteredChats.length === 0 ? (
            <EmptyState
              title={search ? "No results" : "No conversations yet"}
              sub={search ? "Try a different search" : "Start a conversation by visiting a seller's store."}
            />
          ) : (
            filteredChats.map(chat => {
              const isActive  = activeChat?.id === chat.id;
              const unread    = chat.unreadByCustomer || 0;
              return (
                <button key={chat.id} type="button" onClick={() => openChat(chat)}
                  style={{
                    width: "100%", padding: "12px 16px",
                    display: "flex", alignItems: "center", gap: 10,
                    border: "none", cursor: "pointer", textAlign: "left",
                    background: isActive ? "rgba(4,110,242,0.06)" : "transparent",
                    borderLeft: `3px solid ${isActive ? "#046EF2" : "transparent"}`,
                    transition: "background 0.13s",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f8f9fb"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                    background: "#046EF2",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 900, color: "#fff",
                  }}>
                    {initials(chat.shopName)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#111",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {chat.shopName || "Store"}
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, flexShrink: 0, marginLeft: 6 }}>
                        {fmtTime(chat.lastMessageAt)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {chat.lastMessage || "No messages yet"}
                      </span>
                      {unread > 0 && (
                        <div style={{
                          background: "#046EF2", color: "#fff", borderRadius: "50%",
                          width: 18, height: 18, display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, marginLeft: 6,
                        }}>
                          {unread > 9 ? "9+" : unread}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      <div style={{
        flex:          1,
        display:       "flex",
        flexDirection: "column",
        background:    "#fff",
        ...(mobileView === "list" ? { display: "none" } : {}),
      }}
        className="chat-main-col"
      >
        {!activeChat ? (
          <EmptyState title="Select a conversation" sub="Choose a conversation from the list to start messaging." />
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.07)",
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {/* Mobile back button */}
              <button onClick={() => setMobileView("list")} className="chat-back-btn"
                style={{ display: "none", border: "none", background: "none",
                  cursor: "pointer", color: "#111", padding: 0 }}>
                <Ico d={IC.back} size={20} />
              </button>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#046EF2",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                {initials(activeChat.shopName)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>
                  {activeChat.shopName || "Store"}
                </div>
                <div style={{ fontSize: 11, color: "#22C55E", display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
                  Online
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 4, scrollbarWidth: "thin" }}>
              {messages.map(m => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} style={{ display: "flex",
                    flexDirection: isMe ? "row-reverse" : "row",
                    alignItems: "flex-end", gap: 6, marginBottom: 2 }}>
                    <div style={{
                      maxWidth:     "70%",
                      padding:      "9px 13px",
                      borderRadius: isMe ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                      background:   isMe ? "#046EF2" : "#f4f4f4",
                      color:        isMe ? "#fff" : "#111",
                      fontSize: 13, fontWeight: 500, lineHeight: 1.5,
                    }}>
                      {m.text}
                      {m.isAiReply && (
                        <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.7 }}>✨ AI</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "#d1d5db", marginBottom: 2 }}>
                      {fmtTime(m.createdAt)}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input ref={inputRef} value={input}
                  onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder="Type a message…" disabled={sending}
                  style={{
                    flex: 1, height: 42, background: "#f8f9fb",
                    border: "1.5px solid #e5e7eb", borderRadius: 10,
                    color: "#111", fontSize: 13, fontWeight: 600,
                    padding: "0 12px", outline: "none", fontFamily: "Nunito,sans-serif",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={e => { e.target.style.borderColor="#046EF2"; e.target.style.boxShadow="0 0 0 3px rgba(4,110,242,0.10)"; }}
                  onBlur={e  => { e.target.style.borderColor="#e5e7eb"; e.target.style.boxShadow="none"; }}
                />
                <button onClick={handleSend} disabled={!input.trim() || sending}
                  style={{
                    width: 42, height: 42, borderRadius: 10, border: "none",
                    background: input.trim() && !sending ? "#046EF2" : "#f0f0f0",
                    color:      input.trim() && !sending ? "#fff"    : "#9ca3af",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor:  input.trim() && !sending ? "pointer" : "not-allowed",
                    flexShrink: 0, transition: "all 0.15s",
                  }}>
                  {sending
                    ? <div style={{ width:14,height:14,border:"2px solid currentColor",
                        borderTopColor:"transparent",borderRadius:"50%",
                        animation:"chat-spin 0.8s linear infinite" }}/>
                    : <Ico d={IC.send} size={14} />
                  }
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes chat-spin { to { transform: rotate(360deg) } }
        @media (max-width: 640px) {
          .chat-list-col { width: 100% !important; display: flex !important; }
          .chat-main-col { width: 100% !important; position: absolute !important; inset: 0; }
          .chat-back-btn { display: flex !important; }
        }
        @media (min-width: 641px) {
          .chat-list-col { display: flex !important; }
          .chat-main-col { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
