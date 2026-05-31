import { useState, useRef, useEffect } from "react";
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}

/* ── Icons ── */
function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {String(d).split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  back:    "M19 12H5|M12 19l-7-7 7-7",
  chat:    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  send:    "M22 2L11 13|M22 2L15 22l-4-9-9-4 20-7z",
  sparkle: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
};

function EmptyConversations() {
  return (
    <div className="dc-empty-convos">
      <Ico d={IC.chat} size={32} color="var(--sd-border)"/>
      <span>No conversations yet</span>
    </div>
  );
}

export default function DashboardChat() {
  const { user }     = useAuth();
  const { planLimits, shop } = useSellerAuth();
  const {
    conversations, activeChat, setActiveChat,
    messages, loading, sending, totalUnread,
    sendMessage, markRead,
  } = useChat();

  const [text,         setText]         = useState("");
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [copiedId,     setCopiedId]     = useState(null);
  /* Mobile: "list" | "chat" */
  const [mobileView,   setMobileView]   = useState("list");

  const inputRef   = useRef(null);
  const bottomRef  = useRef(null);

  const activeChatData  = conversations.find(c => c.id === activeChat);
  const aiPaused        = activeChatData?.aiPaused || false;
  const lastCustomerMsg = messages.filter(m => m.senderRole !== "seller").slice(-1)[0];

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const togglePauseAI = async () => {
    if (!activeChat) return;
    try { await updateDoc(doc(db, "sellerChats", activeChat), { aiPaused: !aiPaused }); }
    catch (e) { console.error("[DashboardChat] togglePauseAI:", e); }
  };

  const handleCopy = (msgText, msgId) => {
    navigator.clipboard.writeText(msgText || "").then(() => {
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    try { await sendMessage(text); setText(""); setAiSuggestion(null); }
    catch { alert("Failed to send message."); }
  };

  const handleSelectChat = (chatId) => {
    setActiveChat(chatId);
    markRead(chatId);
    setAiSuggestion(null);
    setText("");
    setMobileView("chat"); /* slide to chat on mobile */
  };

  const handleBack = () => {
    setMobileView("list");
    setActiveChat(null);
  };

  const handleAISuggest = async () => {
    if (!lastCustomerMsg?.text) return;
    setAiLoading(true); setAiSuggestion(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `A customer sent this message to my store on Beme Market: "${lastCustomerMsg.text}"\n\nWrite a short, professional, friendly reply I can send as the seller. My store name is "${shop?.shopName || "my store"}". Keep it under 3 sentences. Reply only with the message text, no explanation.` }],
          context: { currentPage: "chat", shopName: shop?.shopName || "Store" },
        }),
      });
      const data = await res.json();
      if (data.content) { setAiSuggestion(data.content); setText(data.content); inputRef.current?.focus(); }
    } catch (e) { console.error("[AI suggest]", e); }
    finally { setAiLoading(false); }
  };

  /* ── Plan gate ── */
  if (!planLimits?.hasChat) {
    return (
      <div className="dc-locked">
        <Ico d={IC.chat} size={44} color="var(--sd-border)"/>
        <div className="dc-locked-title">Live Chat requires Standard or Pro</div>
        <div className="dc-locked-sub">Upgrade your plan to chat with customers in real time.</div>
      </div>
    );
  }

  /* ── Conversation list panel ── */
  const ConvoList = (
    <div className={`dc-list-panel${mobileView === "chat" ? " dc-list-panel--hidden" : ""}`}>
      <div className="dc-list-header">Conversations</div>
      {loading
        ? [1,2,3].map(i => <div key={i} className="dc-skel" style={{ height:58, margin:"8px", borderRadius:8 }}/>)
        : conversations.length === 0
          ? <EmptyConversations/>
          : conversations.map(c => (
              <div key={c.id}
                className={`dc-convo-item${activeChat === c.id ? " dc-convo-item--active" : ""}`}
                onClick={() => handleSelectChat(c.id)}>
                <div className="dc-avatar">{(c.customerName||"?")[0].toUpperCase()}</div>
                <div className="dc-convo-info">
                  <div className="dc-convo-name">{c.customerName || "Customer"}</div>
                  <div className="dc-convo-preview">{c.lastMessage || "No messages yet"}</div>
                </div>
                {c.unreadBySeller > 0 && (
                  <div className="dc-unread-badge">{c.unreadBySeller}</div>
                )}
              </div>
            ))
      }
    </div>
  );

  /* ── Chat area panel ── */
  const ChatArea = (
    <div className={`dc-chat-panel${mobileView === "list" ? " dc-chat-panel--hidden" : ""}`}>
      {!activeChat ? (
        /* Desktop empty state */
        <div className="dc-no-chat">
          <Ico d={IC.chat} size={40} color="var(--sd-border)"/>
          <div className="dc-no-chat-label">Select a conversation</div>
        </div>
      ) : (
        <>
          {/* Chat header */}
          <div className="dc-chat-header">
            {/* Back arrow — mobile only */}
            <button type="button" onClick={handleBack} className="dc-back-btn" aria-label="Back to conversations">
              <Ico d={IC.back} size={18} color="var(--sd-text)"/>
            </button>

            <div className="dc-avatar dc-avatar--sm">{(activeChatData?.customerName||"?")[0].toUpperCase()}</div>
            <div className="dc-chat-header-info">
              <div className="dc-chat-name">{activeChatData?.customerName || "Customer"}</div>
              <div className="dc-online-row">
                <div className="dc-online-dot"/>Online
              </div>
            </div>
            <button onClick={togglePauseAI} className={`dc-ai-toggle${aiPaused ? " dc-ai-toggle--paused" : ""}`}>
              {aiPaused ? "⏸ AI Paused" : "✨ AI Active"}
            </button>
          </div>

          {/* Messages */}
          <div className="dc-messages">
            {messages.map(m => {
              const isSeller = m.senderRole === "seller";
              return (
                <div key={m.id} className="dc-msg-wrap">
                  <div className={`dc-bubble${isSeller ? " dc-bubble--seller" : " dc-bubble--customer"}`}>
                    {m.text}
                    {(m.isAiGenerated || m.isAiReply) && (
                      <span className="dc-ai-tag">✨ AI</span>
                    )}
                    {m.imageUrl && (
                      <img src={m.imageUrl} alt="" className="dc-bubble-img"/>
                    )}
                  </div>
                  <div className={`dc-msg-meta${isSeller ? " dc-msg-meta--right" : ""}`}>
                    <span className="dc-msg-time">{fmtTime(m.createdAt)}</span>
                    <button onClick={() => handleCopy(m.text, m.id)} className="dc-copy-btn"
                      style={{ color: copiedId === m.id ? "#22C55E" : "var(--sd-border)" }}>
                      {copiedId === m.id ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </div>

          {/* AI suggestion banner */}
          {aiSuggestion && (
            <div className="dc-ai-suggestion">
              <div className="dc-ai-suggestion-label">✨ AI Suggestion — edit or send as is</div>
              {aiSuggestion}
            </div>
          )}

          {/* Input row */}
          <div className="dc-input-row">
            {lastCustomerMsg && (
              <button onClick={handleAISuggest} disabled={aiLoading}
                className="dc-ai-btn" title="Generate AI reply">
                {aiLoading
                  ? <div className="dc-spinner"/>
                  : <Ico d={IC.sparkle} size={15} color="var(--sd-accent)"/>
                }
              </button>
            )}
            <input
              ref={inputRef}
              value={text}
              onChange={e => { setText(e.target.value); if (aiSuggestion) setAiSuggestion(null); }}
              placeholder="Type a message or tap ✨ for AI reply…"
              className="dc-input"
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            />
            <button onClick={handleSend} disabled={sending || !text.trim()} className="dc-send-btn"
              title="Send message">
              <Ico d={IC.send} size={16} color="#fff" sw={1.8}/>
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="dc-root">
      {/* Page header */}
      <div className="dc-page-head">
        <div className="dc-page-title">Messages</div>
        <div className="dc-page-sub">
          {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          {totalUnread > 0 ? ` · ${totalUnread} unread` : ""}
        </div>
      </div>

      {/* Main chat shell */}
      <div className="dc-shell">
        {ConvoList}
        {ChatArea}
      </div>

      <style>{`
        @keyframes dc-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dc-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: calc(600px + 100%) 0; }
        }

        /* ── Root ── */
        .dc-root {
          font-family: var(--sd-font, 'DM Sans', system-ui, sans-serif);
          background: var(--sd-white);
          color: var(--sd-text);
          min-height: 100%;
          display: flex;
          flex-direction: column;
        }

        /* Page header */
        .dc-page-head  { margin-bottom: 14px; }
        .dc-page-title { font-size: 11px; font-weight: 700; color: var(--sd-muted); text-transform: uppercase; letter-spacing: 0.07em; }
        .dc-page-sub   { font-size: 12px; color: var(--sd-muted); margin-top: 2px; }

        /* Shell */
        .dc-shell {
          display: flex;
          border: 1px solid var(--sd-border);
          border-radius: 14px;
          overflow: hidden;
          height: calc(100vh - 180px);
          min-height: 480px;
          background: var(--sd-white);
          transition: background 0.25s, border-color 0.25s;
        }

        /* ── Conversation list ── */
        .dc-list-panel {
          width: 260px;
          flex-shrink: 0;
          border-right: 1px solid var(--sd-border);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          background: var(--sd-white);
          transition: background 0.25s, border-color 0.25s;
        }
        .dc-list-header {
          font-weight: 800; font-size: 13px; color: var(--sd-text);
          padding: 14px 16px;
          border-bottom: 1px solid var(--sd-border);
          flex-shrink: 0;
        }

        .dc-convo-item {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; cursor: pointer;
          border-left: 3px solid transparent;
          transition: background 0.12s;
        }
        .dc-convo-item:hover { background: var(--sd-border-light); }
        .dc-convo-item--active {
          background: var(--sd-accent-dim);
          border-left-color: var(--sd-accent);
        }

        .dc-avatar {
          width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
          background: var(--sd-accent-dim);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 13px; color: var(--sd-accent);
        }
        .dc-avatar--sm { width: 32px; height: 32px; font-size: 12px; }

        .dc-convo-info    { flex: 1; min-width: 0; }
        .dc-convo-name    { font-weight: 700; font-size: 13px; color: var(--sd-text); }
        .dc-convo-preview { font-size: 12px; color: var(--sd-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }

        .dc-unread-badge {
          background: var(--sd-accent); color: #fff;
          border-radius: 50%; width: 18px; height: 18px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; flex-shrink: 0;
        }

        /* ── Chat panel ── */
        .dc-chat-panel {
          flex: 1; display: flex; flex-direction: column;
          min-width: 0; background: var(--sd-white);
          transition: background 0.25s;
        }

        /* Chat header */
        .dc-chat-header {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--sd-border);
          flex-shrink: 0;
        }
        .dc-back-btn {
          display: none; /* hidden on desktop */
          background: none; border: none; cursor: pointer;
          padding: 4px; border-radius: 8px; line-height: 0;
          flex-shrink: 0;
          transition: background 0.12s;
        }
        .dc-back-btn:hover { background: var(--sd-border-light); }

        .dc-chat-header-info { flex: 1; }
        .dc-chat-name  { font-size: 13px; font-weight: 700; color: var(--sd-text); }
        .dc-online-row { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #22C55E; }
        .dc-online-dot { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; }

        .dc-ai-toggle {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 20px;
          border: 1px solid var(--sd-accent-border, rgba(124,58,237,0.2));
          background: var(--sd-accent-dim); color: var(--sd-accent);
          font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
          white-space: nowrap; flex-shrink: 0;
          transition: all 0.15s;
        }
        .dc-ai-toggle--paused {
          border-color: rgba(245,158,11,0.3);
          background: rgba(245,158,11,0.08);
          color: #d97706;
        }

        /* Messages */
        .dc-messages {
          flex: 1; overflow-y: auto; padding: 16px;
          display: flex; flex-direction: column; gap: 6px;
          background: var(--sd-white);
        }
        .dc-msg-wrap { display: flex; flex-direction: column; }

        /* ── Bubbles ── */
        .dc-bubble {
          max-width: 70%; padding: 10px 14px;
          border-radius: 14px; font-size: 13px; line-height: 1.55;
          word-break: break-word;
        }
        /* Customer bubble — neutral */
        .dc-bubble--customer {
          align-self: flex-start;
          background: var(--sd-border-light);
          color: var(--sd-text);
          border-bottom-left-radius: 4px;
        }
        /* Seller bubble — translucent purple */
        .dc-bubble--seller {
          align-self: flex-end;
          background: rgba(124, 58, 237, 0.14);
          color: var(--sd-accent);
          border-bottom-right-radius: 4px;
          border: 1px solid rgba(124, 58, 237, 0.18);
        }
        /* Dark mode: deeper purple tint */
        .sd-dark .dc-bubble--seller {
          background: rgba(124, 58, 237, 0.28);
          color: #c4b5fd;
          border-color: rgba(124, 58, 237, 0.35);
        }

        .dc-ai-tag { font-size: 10px; opacity: 0.65; margin-left: 6px; }
        .dc-bubble-img { max-width: 100%; border-radius: 6px; margin-top: 6px; display: block; }

        .dc-msg-meta {
          display: flex; align-items: center; gap: 6px;
          margin-top: 3px; padding: 0 2px;
        }
        .dc-msg-meta--right { justify-content: flex-end; }
        .dc-msg-time  { font-size: 10px; color: var(--sd-muted); }
        .dc-copy-btn  {
          background: none; border: none; cursor: pointer;
          padding: 0 4px; font-size: 10px; font-weight: 700;
          font-family: inherit; transition: color 0.15s;
        }

        /* AI suggestion */
        .dc-ai-suggestion {
          margin: 0 16px 8px;
          padding: 10px 14px;
          background: var(--sd-accent-dim);
          border-radius: 10px;
          border: 1px solid var(--sd-accent-border, rgba(124,58,237,0.2));
          font-size: 12px; color: var(--sd-accent); font-weight: 600;
        }
        .dc-ai-suggestion-label {
          font-size: 10px; font-weight: 700;
          color: var(--sd-accent); margin-bottom: 4px;
        }

        /* Input row */
        .dc-input-row {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid var(--sd-border);
          background: var(--sd-white);
          flex-shrink: 0;
        }

        .dc-ai-btn {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          border: 1px solid var(--sd-border);
          background: var(--sd-accent-dim);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s;
        }
        .dc-ai-btn:hover:not(:disabled) { background: var(--sd-accent-dim); }
        .dc-ai-btn:disabled { opacity: 0.5; cursor: wait; }

        .dc-input {
          flex: 1; height: 42px; padding: 0 14px;
          border: 1.5px solid var(--sd-border); border-radius: 100px;
          background: var(--sd-white); color: var(--sd-text);
          font-size: 14px; outline: none; font-family: inherit;
          transition: border-color 0.15s;
        }
        .dc-input:focus { border-color: var(--sd-accent); }
        .dc-input::placeholder { color: var(--sd-muted); }

        /* ── Airplane send button ── */
        .dc-send-btn {
          width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
          border: none;
          background: var(--sd-accent);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.15s, opacity 0.15s;
          padding: 0;
        }
        .dc-send-btn:hover:not(:disabled) { background: var(--sd-accent2, #6d28d9); }
        .dc-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Spinner */
        .dc-spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid var(--sd-accent); border-top-color: transparent;
          animation: dc-spin 0.8s linear infinite;
        }

        /* Skeleton */
        .dc-skel {
          background: var(--sd-border-light);
          background-image: linear-gradient(90deg, var(--sd-border-light) 25%, var(--sd-border) 50%, var(--sd-border-light) 75%);
          background-size: 600px 100%;
          animation: dc-shimmer 1.4s ease infinite;
        }

        /* Empty states */
        .dc-empty-convos {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 32px 16px; text-align: center;
          font-size: 12px; color: var(--sd-muted);
        }
        .dc-no-chat {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; height: 100%; gap: 10px;
        }
        .dc-no-chat-label { font-size: 14px; font-weight: 700; color: var(--sd-muted); }

        /* Locked */
        .dc-locked {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 64px 24px; text-align: center;
        }
        .dc-locked-title { font-size: 16px; font-weight: 800; color: var(--sd-text); }
        .dc-locked-sub   { font-size: 13px; color: var(--sd-muted); max-width: 280px; line-height: 1.6; }

        /* ════════════════════════════════════════
           MOBILE  ≤ 768px
           Show list OR chat, not both at once.
        ════════════════════════════════════════ */
        @media (max-width: 768px) {
          .dc-shell {
            border-radius: 12px;
            height: calc(100vh - 160px);
            position: relative;
            overflow: hidden;
          }

          /* List panel — full width on mobile */
          .dc-list-panel {
            width: 100%;
            border-right: none;
            position: absolute; inset: 0;
            z-index: 1;
            transform: translateX(0);
            transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          }
          /* Slide list out when chat is open */
          .dc-list-panel--hidden {
            transform: translateX(-100%);
            pointer-events: none;
          }

          /* Chat panel — full width, slides in from right */
          .dc-chat-panel {
            width: 100%;
            position: absolute; inset: 0;
            z-index: 2;
            transform: translateX(100%);
            transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          }
          /* Slide chat in when active */
          .dc-chat-panel:not(.dc-chat-panel--hidden) {
            transform: translateX(0);
          }
          .dc-chat-panel--hidden {
            transform: translateX(100%);
            pointer-events: none;
          }

          /* Show back button on mobile */
          .dc-back-btn { display: flex; }

          .dc-bubble { max-width: 82%; }
        }

        @media (min-width: 769px) {
          /* Desktop: always show both panels, no slide */
          .dc-list-panel,
          .dc-list-panel--hidden { transform: none !important; position: static !important; width: 260px; }
          .dc-chat-panel,
          .dc-chat-panel--hidden { transform: none !important; position: static !important; }
        }
      `}</style>
    </div>
  );
}