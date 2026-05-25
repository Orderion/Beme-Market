import { useState, useEffect, useRef, useCallback } from "react";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  getOrCreateChat, sendMessage, subscribeToMessages, markChatRead,
} from "../services/chatService";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}

const CHIPS = ["Is this available?", "What sizes do you have?", "How long is delivery?", "Can I get a discount?"];

export default function ChatModal({ shop, product, onClose }) {
  const navigate   = useNavigate();
  const [user,     setUser]     = useState(null);
  const [chatId,   setChatId]   = useState(null);
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const unsubRef   = useRef(null);

  const sellerId = shop?.ownerId || shop?.id;
  const shopName = shop?.shopName || "Store";
  const shopId   = shop?.id;
  const initials = shopName.charAt(0).toUpperCase();

  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);
    return auth.onAuthStateChanged(u => setUser(u));
  }, []);

  useEffect(() => {
    if (!user || !sellerId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const chat = await getOrCreateChat({
          customerId: user.uid, sellerId, shopId,
          customerName: user.displayName || user.email?.split("@")[0] || "Customer",
          shopName,
        });
        setChatId(chat.id);
        await markChatRead(chat.id, "customer");
      } catch { }
      finally { setLoading(false); }
    })();
  }, [user?.uid, sellerId]);

  useEffect(() => {
    if (!chatId) return;
    unsubRef.current?.();
    unsubRef.current = subscribeToMessages(chatId, msgs => {
      setMessages(msgs);
      markChatRead(chatId, "customer").catch(() => {});
    });
    return () => unsubRef.current?.();
  }, [chatId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 200); }, [chatId]);

  const triggerAutoReply = useCallback(async (cId, msg) => {
    try {
      await fetch(`${API_URL}/api/chat/auto-reply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: cId, sellerId, shopId, shopName, planId: shop?.planId || "pro", message: msg, productName: product?.name || null }),
      });
    } catch {}
  }, [sellerId, shopId, shopName, shop?.planId, product]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending || !chatId) return;
    setInput(""); setSending(true);
    try {
      await sendMessage({ chatId, senderId: user.uid, text: msg, senderRole: "customer" });
      triggerAutoReply(chatId, msg);
    } catch {}
    finally { setSending(false); inputRef.current?.focus(); }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.15)", zIndex: 2000,
      }} />

      {/* Panel slides from right */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(420px,100vw)",
        background: "#fff",
        borderRadius: "16px 0 0 16px",
        zIndex: 2001,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-8px 0 48px rgba(0,0,0,0.12)",
        animation: "cm-slide 0.3s cubic-bezier(0.22,1,0.36,1)",
        fontFamily: "var(--font-main,'Nunito',sans-serif)",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          padding: "14px 16px", borderBottom: "1px solid #f0f0f0",
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            overflow: "hidden",
            background: shop?.logoUrl ? "transparent" : "rgba(4,110,242,0.1)",
            border: "1.5px solid rgba(4,110,242,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {shop?.logoUrl
              ? <img src={shop.logoUrl} alt={shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 16, fontWeight: 900, color: "#046EF2" }}>{initials}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{shopName}</div>
            {product && <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Re: {product.name}</div>}
            <div style={{ fontSize: 11, color: "#22C55E", display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />Online
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%", border: "none",
            background: "rgba(0,0,0,0.06)", cursor: "pointer", fontSize: 18, color: "#9ca3af",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>×</button>
        </div>

        {/* Messages — flex:1 with overflow scroll */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 4,
          minHeight: 0,
        }}>
          {!user ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 8 }}>Sign in to chat</div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20, lineHeight: 1.6 }}>Create a free account to message sellers directly.</div>
              <button onClick={() => { onClose(); navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); }}
                style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: "#046EF2", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                Sign in / Sign up
              </button>
            </div>
          ) : loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ width: 28, height: 28, border: "3px solid rgba(4,110,242,0.2)", borderTopColor: "#046EF2", borderRadius: "50%", animation: "cm-spin 0.8s linear infinite" }} />
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", padding: "20px 0" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", marginBottom: 12, overflow: "hidden", background: shop?.logoUrl ? "transparent" : "rgba(4,110,242,0.08)", border: "2px solid rgba(4,110,242,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {shop?.logoUrl ? <img src={shop.logoUrl} alt={shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 20, fontWeight: 900, color: "#046EF2" }}>{initials}</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>Chat with {shopName}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 18, lineHeight: 1.6 }}>Ask about products, delivery, sizing or anything else.</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {CHIPS.map(chip => (
                      <button key={chip} onClick={() => handleSend(chip)} style={{
                        padding: "7px 14px", borderRadius: 20, border: "1.5px solid rgba(0,0,0,0.10)",
                        background: "#f8f9fb", color: "#374151", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                      }}>{chip}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(m => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id}>
                    <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "75%", padding: "9px 13px",
                        borderRadius: isMe ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                        background: isMe ? "#111" : "#f4f4f4",
                        color: isMe ? "#fff" : "#111", fontSize: 13, fontWeight: 500, lineHeight: 1.55,
                      }}>
                        {m.text}
                        {m.isAiReply && <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 6 }}>✨ AI</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "#d1d5db", textAlign: isMe ? "right" : "left", marginTop: 3 }}>{fmtTime(m.createdAt)}</div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input — always at bottom, flexShrink:0 */}
        {user && !loading && (
          <div style={{
            padding: "12px 14px", borderTop: "1px solid #f0f0f0",
            flexShrink: 0, background: "#fff",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message…"
                disabled={sending}
                style={{
                  flex: 1, height: 42, background: "#f8f9fb",
                  border: "1.5px solid rgba(0,0,0,0.10)", borderRadius: 10,
                  color: "#111", fontSize: 13, fontWeight: 600,
                  padding: "0 12px", outline: "none", fontFamily: "Nunito,sans-serif",
                }}
                onFocus={e => { e.target.style.borderColor = "#046EF2"; e.target.style.boxShadow = "0 0 0 3px rgba(4,110,242,0.10)"; }}
                onBlur={e  => { e.target.style.borderColor = "rgba(0,0,0,0.10)"; e.target.style.boxShadow = "none"; }}
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || sending}
                style={{
                  padding: "0 18px", height: 42, borderRadius: 10, border: "none",
                  background: input.trim() && !sending ? "#111" : "#f0f0f0",
                  color: input.trim() && !sending ? "#fff" : "#9ca3af",
                  fontSize: 13, fontWeight: 800, cursor: input.trim() && !sending ? "pointer" : "not-allowed",
                  fontFamily: "inherit", flexShrink: 0,
                }}>
                {sending ? "…" : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes cm-slide { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes cm-spin  { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
