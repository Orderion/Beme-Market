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

function Ico({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const IC = {
  close:  "M18 6L6 18|M6 6l12 12",
  send:   "M22 2L11 13|M22 2L15 22l-4-9-9-4 22-7z",
  chat:   "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  check:  "M20 6L9 17l-5-5",
};

const QUICK_CHIPS = [
  "Is this available?",
  "What sizes do you have?",
  "How long is delivery?",
  "Can I get a discount?",
];

/**
 * ChatModal
 * A floating drawer that lets customers chat with a seller.
 *
 * Props:
 *   shop        — { id, shopName, logoUrl, ownerId, planId, chatPreference, whatsapp }
 *   product     — optional { id, name } for context
 *   onClose     — callback to close the modal
 */
export default function ChatModal({ shop, product, onClose }) {
  const navigate   = useNavigate();
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

  const sellerId  = shop?.ownerId || shop?.id;
  const shopId    = shop?.id;
  const shopName  = shop?.shopName || "Store";
  const planId    = shop?.planId || "basic";
  const hasChat   = ["starter", "growth", "pro"].includes(planId);

  /* Auth */
  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);
    const unsub = auth.onAuthStateChanged(u => setUser(u));
    return unsub;
  }, []);

  /* Init chat once we have a user */
  useEffect(() => {
    if (!user || !sellerId) { setLoading(false); return; }
    if (!hasChat) { setLoading(false); return; }

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
        console.error("[ChatModal] init:", e);
        setError("Could not connect to chat. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user?.uid, sellerId, hasChat]);

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

  /* Focus input on open */
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [chatId]);

  /* Trigger AI auto-reply on the backend */
  const triggerAutoReply = useCallback(async (chatIdVal, customerMsg) => {
    try {
      await fetch(`${API_URL}/api/chat/auto-reply`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          chatId:    chatIdVal,
          sellerId,
          shopId,
          shopName,
          planId,
          message:   customerMsg,
          productName: product?.name || null,
        }),
      });
    } catch (e) {
      console.error("[ChatModal] auto-reply trigger:", e);
    }
  }, [sellerId, shopId, shopName, planId, product]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending || !chatId) return;
    setInput("");
    setSending(true);
    setError("");
    try {
      await sendMessage({ chatId, senderId: user.uid, text: msg, senderRole: "customer" });
      // Trigger AI auto-reply (non-blocking)
      triggerAutoReply(chatId, msg);
    } catch (e) {
      console.error("[ChatModal] send:", e);
      setError("Failed to send. Please try again.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* Redirect to login */
  const handleLoginPrompt = () => {
    onClose();
    navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
  };

  /* WhatsApp fallback */
  const handleWhatsApp = () => {
    if (shop?.whatsapp) {
      const num = shop.whatsapp.replace(/\D/g, "");
      const text = product ? `Hi! I'm interested in your product: ${product.name}` : `Hi! I found your store on Beme Market.`;
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const initials = shopName.charAt(0).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   "fixed", inset: 0,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
          zIndex:     1000,
          animation:  "cm-fade-in 0.2s ease",
        }}
      />

      {/* Drawer */}
      <div style={{
        position:      "fixed",
        bottom:        0, right: 0,
        width:         "min(420px, 100vw)",
        height:        "min(600px, 100vh)",
        background:    "#fff",
        borderRadius:  "16px 0 0 0",
        zIndex:        1001,
        display:       "flex",
        flexDirection: "column",
        boxShadow:     "-8px 0 40px rgba(0,0,0,0.15)",
        animation:     "cm-slide-up 0.25s cubic-bezier(0.22,1,0.36,1)",
        fontFamily:    "var(--font-main,'Nunito',sans-serif)",
      }}>

        {/* Header */}
        <div style={{
          padding:      "14px 16px",
          borderBottom: "1px solid #f0f0f0",
          display:      "flex",
          alignItems:   "center",
          gap:          10,
          flexShrink:   0,
        }}>
          {/* Store avatar */}
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            overflow: "hidden", flexShrink: 0,
            background: shop?.logoUrl ? "transparent" : "#046EF2",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {shop?.logoUrl
              ? <img src={shop.logoUrl} alt={shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "#fff", fontSize: 16, fontWeight: 900 }}>{initials}</span>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#111", letterSpacing: "-0.01em" }}>
              {shopName}
            </div>
            {product && (
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Re: {product.name}
              </div>
            )}
          </div>

          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "none", background: "#f5f5f5",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#9ca3af", flexShrink: 0,
          }}>
            <Ico d={IC.close} size={14} />
          </button>
        </div>

        {/* Content */}
        {!user ? (
          /* Not logged in */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              <Ico d={IC.chat} size={40} color="rgba(0,0,0,0.12)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 8 }}>
              Sign in to chat
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20, lineHeight: 1.6 }}>
              Create a free account to message sellers and track your orders.
            </div>
            <button onClick={handleLoginPrompt} style={{
              padding: "11px 28px", borderRadius: 10, border: "none",
              background: "#046EF2", color: "#fff", fontSize: 14, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Sign in / Sign up
            </button>
            {shop?.whatsapp && (
              <button onClick={handleWhatsApp} style={{
                marginTop: 10, padding: "11px 28px", borderRadius: 10,
                border: "1.5px solid #e5e7eb", background: "#fff",
                color: "#111", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>
                Message via WhatsApp instead
              </button>
            )}
          </div>
        ) : !hasChat ? (
          /* Plan doesn't support chat */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 8 }}>
              Beme Market Chat not available
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20, lineHeight: 1.6 }}>
              This seller hasn't enabled Beme Market Chat yet.
            </div>
            {shop?.whatsapp && (
              <button onClick={handleWhatsApp} style={{
                padding: "11px 28px", borderRadius: 10, border: "none",
                background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Message on WhatsApp
              </button>
            )}
          </div>
        ) : loading ? (
          /* Loading */
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 24, height: 24, border: "2.5px solid #046EF2",
              borderTopColor: "transparent", borderRadius: "50%",
              animation: "cm-spin 0.8s linear infinite" }} />
          </div>
        ) : (
          /* Chat UI */
          <>
            {/* Messages */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 4,
              scrollbarWidth: "thin",
            }}>
              {/* Intro message */}
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", margin: "0 auto 10px",
                    overflow: "hidden", background: shop?.logoUrl ? "transparent" : "#046EF2",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {shop?.logoUrl
                      ? <img src={shop.logoUrl} alt={shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>{initials}</span>
                    }
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 4 }}>
                    Chat with {shopName}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14, lineHeight: 1.5 }}>
                    Ask about products, delivery, or anything else.
                  </div>
                  {/* Quick chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                    {QUICK_CHIPS.map(chip => (
                      <button key={chip} onClick={() => handleSend(chip)} style={{
                        padding: "6px 12px", borderRadius: 20,
                        border: "1px solid #e5e7eb", background: "#f8f9fb",
                        color: "#374151", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor="#046EF2"; e.currentTarget.style.color="#046EF2"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor="#e5e7eb"; e.currentTarget.style.color="#374151"; }}
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
                  <div key={m.id} style={{
                    display:       "flex",
                    flexDirection: isMe ? "row-reverse" : "row",
                    alignItems:    "flex-end",
                    gap:           6,
                    marginBottom:  2,
                  }}>
                    <div style={{
                      maxWidth:     "75%",
                      padding:      "9px 13px",
                      borderRadius: isMe ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                      background:   isMe ? "#046EF2" : "#f4f4f4",
                      color:        isMe ? "#fff" : "#111",
                      fontSize:     13, fontWeight: 500, lineHeight: 1.5,
                      position:     "relative",
                    }}>
                      {m.text}
                      {m.isAiReply && (
                        <span style={{
                          display: "inline-block", marginLeft: 6,
                          fontSize: 9, opacity: 0.7,
                          verticalAlign: "middle",
                        }}>✨ AI</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "#d1d5db", fontWeight: 500, flexShrink: 0, marginBottom: 2 }}>
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

            {/* Input */}
            <div style={{
              padding:    "10px 12px",
              borderTop:  "1px solid #f0f0f0",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a message…"
                  disabled={sending}
                  style={{
                    flex:        1,
                    height:      40,
                    background:  "#f8f9fb",
                    border:      "1.5px solid #e5e7eb",
                    borderRadius: 10,
                    color:       "#111",
                    fontSize:    13,
                    fontWeight:  600,
                    padding:     "0 12px",
                    outline:     "none",
                    fontFamily:  "Nunito,sans-serif",
                    transition:  "border-color 0.15s",
                  }}
                  onFocus={e => { e.target.style.borderColor = "#046EF2"; e.target.style.boxShadow = "0 0 0 3px rgba(4,110,242,0.10)"; }}
                  onBlur={e =>  { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending}
                  style={{
                    width:        38, height: 38,
                    borderRadius: 10, border: "none",
                    background:   input.trim() && !sending ? "#046EF2" : "#f0f0f0",
                    color:        input.trim() && !sending ? "#fff" : "#9ca3af",
                    display:      "flex", alignItems: "center", justifyContent: "center",
                    cursor:       input.trim() && !sending ? "pointer" : "not-allowed",
                    flexShrink:   0, transition: "all 0.15s",
                  }}
                >
                  {sending
                    ? <div style={{ width: 14, height: 14, border: "2px solid currentColor",
                        borderTopColor: "transparent", borderRadius: "50%",
                        animation: "cm-spin 0.8s linear infinite" }} />
                    : <Ico d={IC.send} size={14} />
                  }
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes cm-fade-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cm-slide-up { from { transform: translateY(24px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes cm-spin     { to { transform: rotate(360deg) } }
        @media (max-width: 480px) {
          /* Full screen on mobile */
        }
      `}</style>
    </>
  );
}
