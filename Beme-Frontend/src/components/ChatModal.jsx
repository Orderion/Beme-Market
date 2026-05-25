import { useState, useEffect, useRef, useCallback } from "react";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  getOrCreateChat,
  sendMessage,
  subscribeToMessages,
  markChatRead,
} from "../services/chatService";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}

const QUICK_CHIPS = [
  "Is this available?",
  "What sizes do you have?",
  "How long is delivery?",
  "Can I get a discount?",
];

/**
 * ChatModal — clean panel modal matching the seller dashboard Messages style.
 * Opens from Chat Seller button on product page.
 *
 * Props:
 *   shop     — { id, shopName, logoUrl, ownerId, planId, whatsapp }
 *   product  — optional { id, name }
 *   onClose  — close callback
 */
export default function ChatModal({ shop, product, onClose }) {
  const navigate  = useNavigate();
  const [user,     setUser]     = useState(null);
  const [chatId,   setChatId]   = useState(null);
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState("");
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const unsubRef   = useRef(null);

  const sellerId = shop?.ownerId || shop?.id;
  const shopName = shop?.shopName || "Store";
  const shopId   = shop?.id;

  /* Auth */
  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);
    const unsub = auth.onAuthStateChanged(u => setUser(u));
    return unsub;
  }, []);

  /* Init chat */
  useEffect(() => {
    if (!user || !sellerId) { setLoading(false); return; }
    const init = async () => {
      setLoading(true);
      try {
        const chat = await getOrCreateChat({
          customerId:   user.uid,
          sellerId,
          shopId,
          customerName: user.displayName || user.email?.split("@")[0] || "Customer",
          shopName,
        });
        setChatId(chat.id);
        await markChatRead(chat.id, "customer");
      } catch (e) {
        setError("Could not connect. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user?.uid, sellerId]);

  /* Subscribe to messages */
  useEffect(() => {
    if (!chatId) return;
    unsubRef.current?.();
    unsubRef.current = subscribeToMessages(chatId, msgs => {
      setMessages(msgs);
      markChatRead(chatId, "customer").catch(() => {});
    });
    return () => unsubRef.current?.();
  }, [chatId]);

  /* Scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Focus input */
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [chatId]);

  /* Trigger AI auto-reply */
  const triggerAutoReply = useCallback(async (cId, msg) => {
    try {
      await fetch(`${API_URL}/api/chat/auto-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: cId, sellerId, shopId, shopName, planId: shop?.planId || "basic", message: msg, productName: product?.name || null }),
      });
    } catch {}
  }, [sellerId, shopId, shopName, shop?.planId, product]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending || !chatId) return;
    setInput("");
    setSending(true);
    setError("");
    try {
      await sendMessage({ chatId, senderId: user.uid, text: msg, senderRole: "customer" });
      triggerAutoReply(chatId, msg);
    } catch {
      setError("Failed to send. Try again.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const initials = shopName.charAt(0).toUpperCase();

  /* Prevent body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(3px)",
        zIndex: 2000,
        animation: "cm-fade 0.2s ease",
      }} />

      {/* Modal panel */}
      <div style={{
        position:      "fixed",
        top:           "50%",
        left:          "50%",
        transform:     "translate(-50%, -50%)",
        width:         "min(520px, calc(100vw - 32px))",
        height:        "min(640px, calc(100vh - 48px))",
        background:    "#fff",
        borderRadius:  16,
        zIndex:        2001,
        display:       "flex",
        flexDirection: "column",
        boxShadow:     "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
        animation:     "cm-scale 0.22s cubic-bezier(0.22,1,0.36,1)",
        fontFamily:    "var(--font-main,'Nunito',sans-serif)",
        overflow:      "hidden",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:      "14px 18px",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display:      "flex",
          alignItems:   "center",
          gap:          12,
          flexShrink:   0,
          background:   "#fff",
        }}>
          {/* Avatar */}
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            overflow: "hidden",
            background: shop?.logoUrl ? "transparent" : "rgba(4,110,242,0.10)",
            border: "1.5px solid rgba(4,110,242,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {shop?.logoUrl
              ? <img src={shop.logoUrl} alt={shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 16, fontWeight: 900, color: "#046EF2" }}>{initials}</span>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", letterSpacing: "-0.01em" }}>
              {shopName}
            </div>
            {product && (
              <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Re: {product.name}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#22C55E", display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
              Online
            </div>
          </div>

          {/* Close */}
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "none", background: "rgba(0,0,0,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#9CA3AF", flexShrink: 0, fontSize: 18, lineHeight: 1,
            transition: "background 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        {!user ? (
          /* Not logged in */
          <div style={{ flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 8 }}>
              Sign in to chat
            </div>
            <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20, lineHeight: 1.6 }}>
              Create a free account to message sellers directly.
            </div>
            <button onClick={() => { onClose(); navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); }}
              style={{ padding: "11px 28px", borderRadius: 10, border: "none",
                background: "#046EF2", color: "#fff", fontSize: 14, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit" }}>
              Sign in / Sign up
            </button>
            {shop?.whatsapp && (
              <button onClick={() => { const n = shop.whatsapp.replace(/\D/g,""); window.open(`https://wa.me/${n}`, "_blank"); }}
                style={{ marginTop: 10, padding: "11px 28px", borderRadius: 10,
                  border: "1.5px solid #e5e7eb", background: "#fff",
                  color: "#111", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                WhatsApp instead
              </button>
            )}
          </div>
        ) : loading ? (
          /* Loading */
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, border: "3px solid rgba(4,110,242,0.2)",
              borderTopColor: "#046EF2", borderRadius: "50%",
              animation: "cm-spin 0.8s linear infinite" }} />
          </div>
        ) : (
          <>
            {/* Messages area */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "16px 18px",
              display: "flex", flexDirection: "column", gap: 6,
              scrollbarWidth: "thin", scrollbarColor: "rgba(0,0,0,0.1) transparent",
            }}>

              {/* Empty state with chips */}
              {messages.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  flex: 1, padding: "20px 0", textAlign: "center" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", marginBottom: 12,
                    overflow: "hidden",
                    background: shop?.logoUrl ? "transparent" : "rgba(4,110,242,0.08)",
                    border: "2px solid rgba(4,110,242,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {shop?.logoUrl
                      ? <img src={shop.logoUrl} alt={shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 20, fontWeight: 900, color: "#046EF2" }}>{initials}</span>
                    }
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>
                    Chat with {shopName}
                  </div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 18, lineHeight: 1.6 }}>
                    Ask about availability, delivery, sizing or anything else.
                  </div>
                  {/* Quick chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {QUICK_CHIPS.map(chip => (
                      <button key={chip} onClick={() => handleSend(chip)} style={{
                        padding: "7px 14px", borderRadius: 20,
                        border: "1.5px solid rgba(0,0,0,0.10)", background: "#f8f9fb",
                        color: "#374151", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor="#046EF2"; e.currentTarget.style.color="#046EF2"; e.currentTarget.style.background="#eff6ff"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(0,0,0,0.10)"; e.currentTarget.style.color="#374151"; e.currentTarget.style.background="#f8f9fb"; }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message list */}
              {messages.map(m => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id}>
                    <div style={{
                      display:       "flex",
                      justifyContent: isMe ? "flex-end" : "flex-start",
                    }}>
                      <div style={{
                        maxWidth:     "72%",
                        padding:      "10px 14px",
                        borderRadius: isMe ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                        background:   isMe ? "#111" : "#f4f4f4",
                        color:        isMe ? "#fff" : "#111",
                        fontSize:     13,
                        fontWeight:   500,
                        lineHeight:   1.55,
                      }}>
                        {m.text}
                        {m.isAiReply && (
                          <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 6 }}>✨ AI</span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 10, color: "#C0C0C0", fontWeight: 500,
                      textAlign: isMe ? "right" : "left",
                      marginTop: 3, paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0,
                    }}>
                      {fmtTime(m.createdAt)}
                    </div>
                  </div>
                );
              })}

              {error && (
                <div style={{ fontSize: 11, color: "#ef4444", textAlign: "center",
                  padding: "6px 10px", background: "#fef2f2", borderRadius: 8 }}>
                  {error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input row */}
            <div style={{
              padding:    "12px 18px",
              borderTop:  "1px solid rgba(0,0,0,0.08)",
              flexShrink: 0,
              background: "#fff",
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a message…"
                  disabled={sending}
                  style={{
                    flex: 1, height: 44, background: "#f8f9fb",
                    border: "1.5px solid rgba(0,0,0,0.10)", borderRadius: 10,
                    color: "#111", fontSize: 13, fontWeight: 600,
                    padding: "0 14px", outline: "none",
                    fontFamily: "Nunito,sans-serif", transition: "border-color 0.15s",
                  }}
                  onFocus={e  => { e.target.style.borderColor = "#046EF2"; e.target.style.boxShadow = "0 0 0 3px rgba(4,110,242,0.10)"; }}
                  onBlur={e   => { e.target.style.borderColor = "rgba(0,0,0,0.10)"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending}
                  style={{
                    padding:      "0 20px",
                    height:       44,
                    borderRadius: 10,
                    border:       "none",
                    background:   input.trim() && !sending ? "#111" : "#f0f0f0",
                    color:        input.trim() && !sending ? "#fff" : "#9CA3AF",
                    fontSize:     13,
                    fontWeight:   800,
                    cursor:       input.trim() && !sending ? "pointer" : "not-allowed",
                    fontFamily:   "inherit",
                    transition:   "all 0.15s",
                    flexShrink:   0,
                  }}
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes cm-fade  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cm-scale { from { opacity: 0; transform: translate(-50%,-50%) scale(0.94) } to { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
        @keyframes cm-spin  { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
