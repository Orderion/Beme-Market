import { useState } from "react";
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardChat() {
  const { user }        = useAuth();
  const { planLimits }  = useSellerAuth();
  const { conversations, activeChat, setActiveChat, messages, loading, sending, totalUnread, sendMessage, markRead } = useChat();

  const [text, setText] = useState("");

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    try {
      await sendMessage(text);
      setText("");
    } catch (err) { alert("Failed to send message."); }
  };

  const handleSelectChat = (chatId) => {
    setActiveChat(chatId);
    markRead(chatId);
  };

  if (!planLimits?.hasChat) {
    return (
      <div className="sd-empty" style={{ padding: 64 }}>
        <div className="sd-empty-icon">💬</div>
        <div className="sd-empty-title">Live Chat requires Standard or Pro</div>
        <div className="sd-empty-text">Upgrade your plan to chat with customers in real time, send images, and set auto-replies.</div>
        <button className="sd-btn sd-btn-primary" onClick={() => window.dispatchEvent(new CustomEvent("seller-nav", { detail: "subscription" }))}>
          Upgrade Plan
        </button>
      </div>
    );
  }

  const activeChatData = conversations.find((c) => c.id === activeChat);

  return (
    <div>
      <div className="sd-page-head" style={{ marginBottom: 14 }}>
        <div>
          <div className="sd-page-title">Messages</div>
          <div className="sd-page-sub">{conversations.length} conversations {totalUnread > 0 && `• ${totalUnread} unread`}</div>
        </div>
      </div>

      <div style={{ height: "calc(100vh - 180px)", minHeight: 480 }}>
        <div className="sd-chat-root" style={{ height: "100%" }}>
          {/* Conversation list */}
          <div className="sd-chat-list">
            <div className="sd-chat-list-head">Conversations</div>
            {loading
              ? [1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height: 58, margin: 8, borderRadius: 8 }} />)
              : conversations.length === 0
                ? <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#8B8FA8" }}>No conversations yet</div>
                : conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`sd-chat-item ${activeChat === c.id ? "active" : ""}`}
                    onClick={() => handleSelectChat(c.id)}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#046EF215", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#046EF2", flexShrink: 0 }}>
                      {(c.customerName || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="sd-chat-item-name">{c.customerName || "Customer"}</div>
                      <div className="sd-chat-item-preview">{c.lastMessage || "No messages yet"}</div>
                    </div>
                    {c.unreadBySeller > 0 && (
                      <div style={{ background: "#046EF2", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {c.unreadBySeller}
                      </div>
                    )}
                  </div>
                ))
            }
          </div>

          {/* Chat area */}
          <div className="sd-chat-main">
            {!activeChat
              ? <div className="sd-empty" style={{ margin: "auto", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div><div className="sd-empty-icon">💬</div><div className="sd-empty-title">Select a conversation</div></div>
                </div>
              : (
                <>
                  {/* Header */}
                  <div className="sd-chat-header">
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#046EF215", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#046EF2" }}>
                      {(activeChatData?.customerName || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1D3B" }}>{activeChatData?.customerName || "Customer"}</div>
                      <div style={{ fontSize: 11, color: "#22C55E" }}>● Online</div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="sd-chat-messages">
                    {messages.map((m) => (
                      <div key={m.id}>
                        <div className={`sd-msg ${m.senderRole === "seller" ? "sd-msg-seller" : "sd-msg-customer"}`}>
                          {m.text}
                          {m.imageUrl && <img src={m.imageUrl} alt="attachment" style={{ maxWidth: "100%", borderRadius: 6, marginTop: 6 }} />}
                        </div>
                        <div style={{ fontSize: 10, color: "#8B8FA8", textAlign: m.senderRole === "seller" ? "right" : "left", marginTop: 2 }}>
                          {fmtTime(m.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="sd-chat-input-row">
                    <input
                      className="sd-input"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Type a message…"
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    />
                    <button className="sd-btn sd-btn-primary" onClick={handleSend} disabled={sending || !text.trim()}>
                      {sending ? "…" : "Send"}
                    </button>
                  </div>
                </>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}

