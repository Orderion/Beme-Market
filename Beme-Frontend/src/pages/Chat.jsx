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
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", height:"100%", padding:40, textAlign:"center" }}>
      <div style={{ width:56, height:56, borderRadius:"50%", background:"#f5f5f5",
        display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
        <Ico d={IC.chat} size={24} color="rgba(0,0,0,0.2)" />
      </div>
      <div style={{ fontSize:16, fontWeight:800, color:"var(--text,#111)", marginBottom:6 }}>{title}</div>
      {sub && <div style={{ fontSize:13, color:"#9ca3af", lineHeight:1.6 }}>{sub}</div>}
    </div>
  );
}

export default function Chat() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const shopParam   = params.get("shop");

  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [chats,       setChats]       = useState([]);
  const [activeChat,  setActiveChat]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [search,      setSearch]      = useState("");
  const [mobileView,  setMobileView]  = useState("list");

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const unsubMsgs  = useRef(null);
  const unsubChats = useRef(null);

  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);
    const unsub = auth.onAuthStateChanged(u => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    unsubChats.current?.();
    unsubChats.current = subscribeToUserChats(user.uid, "customer", chats => {
      setChats(chats);
      if (shopParam) {
        const target = chats.find(c => c.shopId === shopParam || c.sellerId === shopParam);
        if (target) openChat(target);
      }
    });
    return () => unsubChats.current?.();
  }, [user?.uid, shopParam]);

  const openChat = useCallback((chat) => {
    setActiveChat(chat);
    setMobileView("chat");
    setMessages([]);
    unsubMsgs.current?.();
    unsubMsgs.current = subscribeToMessages(chat.id, msgs => setMessages(msgs));
    markChatRead(chat.id, "customer").catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  useEffect(() => () => {
    unsubMsgs.current?.();
    unsubChats.current?.();
  }, []);

  const triggerAutoReply = useCallback(async (chatId, sellerId, shopId, shopName, planId, text) => {
    try {
      await fetch(`${API_URL}/api/chat/auto-reply`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ chatId, sellerId, shopId, shopName, planId, message:text }),
      });
    } catch {}
  }, []);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending || !activeChat || !user) return;
    setInput(""); setSending(true);
    try {
      await sendMessage({ chatId:activeChat.id, senderId:user.uid, text:msg, senderRole:"customer" });
      triggerAutoReply(activeChat.id, activeChat.sellerId, activeChat.shopId,
        activeChat.shopName, activeChat.planId||"basic", msg);
    } catch (e) { console.error("[Chat] send:", e); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleKey = (e) => {
    if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filteredChats = chats.filter(c =>
    !search || (c.shopName||"").toLowerCase().includes(search.toLowerCase())
  );

  if (!authLoading && !user) {
    return (
      <div style={{ minHeight:"70vh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:32,
        fontFamily:"var(--font-main,'Nunito',sans-serif)" }}>
        <Ico d={IC.chat} size={48} color="rgba(0,0,0,0.12)" />
        <div style={{ fontSize:20, fontWeight:800, color:"var(--text,#111)", margin:"16px 0 8px" }}>
          Sign in to view messages
        </div>
        <div style={{ fontSize:14, color:"#9ca3af", marginBottom:24 }}>
          Your conversations with sellers will appear here.
        </div>
        <button onClick={() => navigate("/login?redirect=/messages")} style={{
          padding:"12px 28px", borderRadius:10, border:"none",
          background:"#046EF2", color:"#fff", fontSize:14, fontWeight:800,
          cursor:"pointer", fontFamily:"inherit",
        }}>Sign In</button>
      </div>
    );
  }

  const initials = (name) => (name||"?").charAt(0).toUpperCase();

  return (
    <>
      {/* Hide bottom nav on this page only */}
      <style>{`
        .bottom-nav, .bnav, [class*="bottom-nav"], [class*="BottomNav"],
        nav.fixed-bottom, .mobile-nav-bar, .tab-bar {
          display: none !important;
        }

        @keyframes chat-spin { to { transform: rotate(360deg); } }

        .ch-root {
          max-width: 1080px;
          margin: 0 auto;
          height: calc(100vh - 64px);
          display: flex;
          font-family: var(--font-main,'Nunito',sans-serif);
          border: 1px solid rgba(0,0,0,0.07);
          border-top: none;
          background: var(--card, #fff);
          position: relative;
          overflow: hidden;
        }

        /* ── Conversation list ── */
        .ch-list {
          width: min(320px, 100%);
          flex-shrink: 0;
          border-right: 1px solid rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          background: var(--card, #fff);
          transition: background 0.25s;
        }
        .ch-list-head {
          padding: 18px 16px 12px;
          border-bottom: 1px solid rgba(0,0,0,0.07);
          flex-shrink: 0;
        }
        .ch-list-title {
          font-size: 18px; font-weight: 900;
          color: var(--text, #111);
          letter-spacing: -0.02em; margin-bottom: 10px;
        }
        .ch-search-wrap { position: relative; }
        .ch-search-ico  { position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none; }
        .ch-search {
          width: 100%; height: 38px;
          background: var(--soft, #f5f5f5);
          border: 1px solid transparent; border-radius: 10px;
          color: var(--text, #111); font-size: 13px; font-weight: 600;
          padding: 0 12px 0 32px; outline: none;
          font-family: Nunito,sans-serif; box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .ch-search:focus { border-color: #046EF2; }
        .ch-list-body { flex:1; overflow-y:auto; scrollbar-width:thin; }

        /* Convo item */
        .ch-convo {
          width: 100%; padding: 12px 16px;
          display: flex; align-items: center; gap: 10px;
          border: none; cursor: pointer; text-align: left;
          background: transparent;
          border-left: 3px solid transparent;
          transition: background 0.13s;
        }
        .ch-convo:hover   { background: var(--soft, #f8f9fb); }
        .ch-convo--active {
          background: rgba(4,110,242,0.06);
          border-left-color: #046EF2;
        }
        .ch-avatar {
          width:42px; height:42px; border-radius:50%; flex-shrink:0;
          background:#046EF2;
          display:flex; align-items:center; justify-content:center;
          font-size:16px; font-weight:900; color:#fff;
        }
        .ch-convo-info    { flex:1; min-width:0; }
        .ch-convo-row     { display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; }
        .ch-convo-name    { font-size:13px; font-weight:800; color:var(--text,#111); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ch-convo-time    { font-size:11px; color:#9ca3af; font-weight:500; flex-shrink:0; margin-left:6px; }
        .ch-convo-row2    { display:flex; justify-content:space-between; align-items:center; }
        .ch-convo-preview { font-size:12px; color:#9ca3af; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
        .ch-unread {
          background:#046EF2; color:#fff; border-radius:50%;
          width:18px; height:18px; display:flex; align-items:center;
          justify-content:center; font-size:10px; font-weight:800;
          flex-shrink:0; margin-left:6px;
        }

        /* ── Chat area ── */
        .ch-main {
          flex: 1; display: flex; flex-direction: column;
          background: var(--card, #fff);
          transition: background 0.25s;
          min-width: 0;
        }
        .ch-chat-head {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.07);
          display: flex; align-items: center; gap: 10px;
          flex-shrink: 0;
          background: var(--card, #fff);
        }
        .ch-back {
          display: none; border: none; background: none;
          cursor: pointer; color: var(--text, #111);
          padding: 4px; border-radius: 8px;
          transition: background 0.12s;
        }
        .ch-back:hover { background: rgba(0,0,0,0.06); }
        .ch-head-name   { font-size:14px; font-weight:800; color:var(--text,#111); }
        .ch-head-online { font-size:11px; color:#22C55E; display:flex; align-items:center; gap:4px; }
        .ch-online-dot  { width:6px; height:6px; border-radius:50%; background:#22C55E; }

        /* ── Messages ── */
        .ch-messages {
          flex: 1; overflow-y: auto;
          padding: 16px 14px;
          display: flex; flex-direction: column; gap: 2px;
          scrollbar-width: thin;
          background: var(--card, #fff);
        }

        /* ── Bubble row ── */
        .ch-row {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          margin-bottom: 4px;
        }
        .ch-row--me  { flex-direction: row-reverse; }
        .ch-row--them { flex-direction: row; }

        /* ── Bubbles ── */
        .ch-bubble {
          max-width: 68%;
          padding: 10px 14px;
          font-size: 14px; font-weight: 500; line-height: 1.55;
          word-break: break-word;
          position: relative;
        }

        /* Customer (me) — right, blue */
        .ch-bubble--me {
          background: #046EF2;
          color: #fff;
          border-radius: 18px 18px 4px 18px;
          align-self: flex-end;
        }

        /* Seller/AI — left, light grey */
        .ch-bubble--them {
          background: #f0f0f0;
          color: #111;
          border-radius: 18px 18px 18px 4px;
          align-self: flex-start;
        }

        /* Dark mode */
        body.dark .ch-bubble--them {
          background: #2a2d32;
          color: #e8eaed;
        }
        body.dark .ch-bubble--me {
          background: #046EF2;
          color: #fff;
        }

        .ch-ai-tag { font-size:9px; opacity:0.65; margin-left:6px; }
        .ch-time   { font-size:10px; color:#9ca3af; margin-bottom:4px; flex-shrink:0; }

        /* ── Date separator ── */
        .ch-date-sep {
          display: flex; align-items: center; gap: 10px;
          margin: 12px 0 8px;
          font-size: 11px; font-weight: 700; color: #9ca3af;
        }
        .ch-date-sep::before, .ch-date-sep::after {
          content: ""; flex: 1; height: 1px; background: rgba(0,0,0,0.08);
        }

        /* ── Input ── */
        .ch-input-row {
          display: flex; gap: 8px; align-items: center;
          padding: 10px 14px;
          border-top: 1px solid rgba(0,0,0,0.07);
          flex-shrink: 0;
          background: var(--card, #fff);
        }
        .ch-input {
          flex: 1; height: 44px;
          background: var(--soft, #f8f9fb);
          border: 1.5px solid rgba(0,0,0,0.1);
          border-radius: 100px;
          color: var(--text, #111); font-size: 14px; font-weight: 500;
          padding: 0 16px; outline: none;
          font-family: Nunito,sans-serif;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ch-input:focus {
          border-color: #046EF2;
          box-shadow: 0 0 0 3px rgba(4,110,242,0.10);
        }
        .ch-input::placeholder { color: #9ca3af; }
        .ch-send {
          width:44px; height:44px; border-radius:50%; border:none;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0; cursor:pointer; transition:all 0.15s;
        }
        .ch-send--active   { background:#046EF2; }
        .ch-send--inactive { background:#f0f0f0; cursor:not-allowed; }
        .ch-spinner {
          width:14px; height:14px; border:2px solid currentColor;
          border-top-color:transparent; border-radius:50%;
          animation: chat-spin 0.8s linear infinite;
        }

        /* ── Skeleton ── */
        .ch-skel {
          padding: 12px 16px; display:flex; gap:10px;
        }
        .ch-skel-av { width:42px; height:42px; border-radius:50%; background:#f0f0f0; flex-shrink:0; }
        .ch-skel-ln { height:12px; background:#f0f0f0; border-radius:6px; margin-bottom:6px; }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .ch-root { height: calc(100vh - 0px); border: none; }

          .ch-list {
            width: 100%;
            position: absolute; inset: 0; z-index: 1;
            transform: translateX(0);
            transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          }
          .ch-list--hidden {
            transform: translateX(-100%);
            pointer-events: none;
          }

          .ch-main {
            position: absolute; inset: 0; z-index: 2;
            transform: translateX(100%);
            transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          }
          .ch-main--visible {
            transform: translateX(0);
          }

          .ch-back { display: flex; }
          .ch-bubble { max-width: 80%; font-size: 13px; }
        }

        @media (min-width: 641px) {
          .ch-list, .ch-list--hidden { transform: none !important; position: static !important; }
          .ch-main, .ch-main--visible { transform: none !important; position: static !important; }
          .ch-back { display: none !important; }
        }
      `}</style>

      <div className="ch-root">

        {/* ── Conversation list ── */}
        <div className={`ch-list${mobileView === "chat" ? " ch-list--hidden" : ""}`}>
          <div className="ch-list-head">
            <div className="ch-list-title">Messages</div>
            <div className="ch-search-wrap">
              <div className="ch-search-ico">
                <Ico d={IC.search} size={14} color="#9ca3af"/>
              </div>
              <input className="ch-search" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…"/>
            </div>
          </div>

          <div className="ch-list-body">
            {authLoading
              ? [1,2,3].map(i => (
                  <div key={i} className="ch-skel">
                    <div className="ch-skel-av"/>
                    <div style={{ flex:1 }}>
                      <div className="ch-skel-ln" style={{ width:"60%" }}/>
                      <div className="ch-skel-ln" style={{ width:"80%" }}/>
                    </div>
                  </div>
                ))
              : filteredChats.length === 0
                ? <EmptyState
                    title={search ? "No results" : "No conversations yet"}
                    sub={search ? "Try a different search" : "Start a conversation by visiting a seller's store."}
                  />
                : filteredChats.map(chat => {
                    const isActive = activeChat?.id === chat.id;
                    const unread   = chat.unreadByCustomer || 0;
                    return (
                      <button key={chat.id} type="button"
                        className={`ch-convo${isActive ? " ch-convo--active" : ""}`}
                        onClick={() => openChat(chat)}>
                        <div className="ch-avatar">{initials(chat.shopName)}</div>
                        <div className="ch-convo-info">
                          <div className="ch-convo-row">
                            <span className="ch-convo-name">{chat.shopName || "Store"}</span>
                            <span className="ch-convo-time">{fmtTime(chat.lastMessageAt)}</span>
                          </div>
                          <div className="ch-convo-row2">
                            <span className="ch-convo-preview">{chat.lastMessage || "No messages yet"}</span>
                            {unread > 0 && (
                              <div className="ch-unread">{unread > 9 ? "9+" : unread}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
            }
          </div>
        </div>

        {/* ── Chat area ── */}
        <div className={`ch-main${mobileView === "chat" ? " ch-main--visible" : ""}`}>
          {!activeChat ? (
            <EmptyState title="Select a conversation"
              sub="Choose a conversation from the list to start messaging."/>
          ) : (
            <>
              {/* Header */}
              <div className="ch-chat-head">
                <button className="ch-back" onClick={() => setMobileView("list")}>
                  <Ico d={IC.back} size={20} color="var(--text,#111)"/>
                </button>
                <div className="ch-avatar" style={{ width:36, height:36, fontSize:14 }}>
                  {initials(activeChat.shopName)}
                </div>
                <div>
                  <div className="ch-head-name">{activeChat.shopName || "Store"}</div>
                  <div className="ch-head-online">
                    <div className="ch-online-dot"/> Online
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="ch-messages">
                {messages.map((m, idx) => {
                  const isMe = m.senderId === user?.uid;

                  /* Date separator */
                  const msgDate = m.createdAt?.toMillis
                    ? new Date(m.createdAt.toMillis()).toDateString()
                    : m.createdAt?.seconds
                      ? new Date(m.createdAt.seconds * 1000).toDateString()
                      : null;
                  const prevDate = idx > 0
                    ? (messages[idx-1].createdAt?.toMillis
                        ? new Date(messages[idx-1].createdAt.toMillis()).toDateString()
                        : messages[idx-1].createdAt?.seconds
                          ? new Date(messages[idx-1].createdAt.seconds * 1000).toDateString()
                          : null)
                    : null;
                  const showDate = msgDate && msgDate !== prevDate;

                  return (
                    <div key={m.id}>
                      {showDate && (
                        <div className="ch-date-sep">
                          {new Date(msgDate).toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" })}
                        </div>
                      )}
                      <div className={`ch-row${isMe ? " ch-row--me" : " ch-row--them"}`}>
                        <div className={`ch-bubble${isMe ? " ch-bubble--me" : " ch-bubble--them"}`}>
                          {m.text}
                          {m.isAiReply && <span className="ch-ai-tag">✨ AI</span>}
                        </div>
                        <div className="ch-time">{fmtTime(m.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef}/>
              </div>

              {/* Input */}
              <div className="ch-input-row">
                <input ref={inputRef} className="ch-input"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey} placeholder="Type a message…"
                  disabled={sending}/>
                <button onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className={`ch-send${input.trim() && !sending ? " ch-send--active" : " ch-send--inactive"}`}>
                  {sending
                    ? <div className="ch-spinner" style={{ color: input.trim() ? "#fff" : "#9ca3af" }}/>
                    : <Ico d={IC.send} size={15} color={input.trim() && !sending ? "#fff" : "#9ca3af"}/>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}