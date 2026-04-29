// src/components/productRequest/ChatPanel.jsx
import { useState, useEffect, useRef } from "react";
import {
  subscribeToMessages,
  sendMessage,
  markMessagesRead,
} from "../../services/productRequestService";
import "./ChatPanel.css";

// ─── ICONS ────────────────────────────────────────────────────────────────────
function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

/**
 * Inline chat panel for a product request thread.
 *
 * Props:
 *   requestId      {string}  – Firestore product_request document ID
 *   currentUser    {object}  – { uid, email, displayName? }
 *   currentUserRole {string} – "customer" | "super_admin"
 */
export default function ChatPanel({ requestId, currentUser, currentUserRole }) {
  const [messages, setMessages]   = useState([]);
  const [text, setText]           = useState("");
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState(null);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);
  const isFirstRender             = useRef(true);

  // ── Subscribe to messages ──
  useEffect(() => {
    if (!requestId || !currentUser?.uid) return;

    const unsub = subscribeToMessages(
      requestId,
      (msgs) => {
        setMessages(msgs);
        // Mark incoming messages as read whenever the panel is open
        markMessagesRead(requestId, currentUser.uid).catch(() => {});
      },
      (err) => {
        console.error("[ChatPanel] subscription error:", err);
        setError("Could not load messages. Please try again.");
      }
    );

    return unsub;
  }, [requestId, currentUser?.uid]);

  // ── Auto-scroll to bottom on new messages ──
  useEffect(() => {
    if (isFirstRender.current) {
      // Instant scroll on first mount (no animation flash)
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      isFirstRender.current = false;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── Send ──
  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(requestId, trimmed, currentUser, currentUserRole);
      setText("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("[ChatPanel] send error:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Helpers ──
  function formatTime(date) {
    if (!date) return "";
    const now = new Date();
    const isToday =
      date.getDate()     === now.getDate() &&
      date.getMonth()    === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("en-GH", {
      day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  }

  // ── Render ──
  return (
    <div className="cp-panel">

      {/* ── Header ── */}
      <div className="cp-header">
        <span className="cp-header-dot" />
        <span className="cp-header-label">
          {currentUserRole === "super_admin" ? "Chat with customer" : "Chat with support"}
        </span>
        <span className="cp-header-sub">Messages are private to this request</span>
      </div>

      {/* ── Messages ── */}
      <div className="cp-messages">
        {messages.length === 0 && (
          <div className="cp-empty-msg">
            <span className="cp-empty-icon">💬</span>
            <p>
              {currentUserRole === "super_admin"
                ? "No messages yet. You can reply to the customer here."
                : "No messages yet. Ask us anything about your request!"}
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn       = msg.senderId === currentUser?.uid;
          const prevMsg     = messages[idx - 1];
          const showDivider =
            idx === 0 ||
            (prevMsg &&
              msg.createdAt &&
              prevMsg.createdAt &&
              msg.createdAt - prevMsg.createdAt > 5 * 60 * 1000); // 5 min gap

          return (
            <div key={msg.id}>
              {showDivider && msg.createdAt && (
                <div className="cp-divider">
                  <span>{formatTime(msg.createdAt)}</span>
                </div>
              )}
              <div className={`cp-msg-row${isOwn ? " cp-msg-row--own" : ""}`}>
                {!isOwn && (
                  <div className="cp-avatar">
                    {(msg.senderName || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="cp-msg-content">
                  {!isOwn && (
                    <span className="cp-msg-name">
                      {msg.senderRole === "super_admin" ? "Support" : msg.senderName}
                    </span>
                  )}
                  <div className={`cp-bubble${isOwn ? " cp-bubble--own" : ""}`}>
                    {msg.text}
                  </div>
                  {!msg.isRead && isOwn && (
                    <span className="cp-sent-indicator">Sent</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="cp-error">{error}</div>
      )}

      {/* ── Input row ── */}
      <div className="cp-input-row">
        <textarea
          ref={inputRef}
          className="cp-input"
          placeholder="Type a message… (Enter to send)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={1000}
        />
        <button
          type="button"
          className="cp-send-btn"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          aria-label="Send message"
        >
          {sending ? <span className="cp-send-spinner" /> : <IconSend />}
        </button>
      </div>
    </div>
  );
}