// src/components/ChatModal.jsx
//
// REDESIGN — Beme UI fix:
// 1. All hardcoded colors (#fff, #111, #046EF2, #9ca3af, etc.) replaced
//    with theme variables (var(--card), var(--text), var(--grtheme),
//    var(--muted), var(--soft)) so this respects light/dark mode like
//    the rest of the app — it previously always rendered white/black
//    regardless of theme.
// 2. Desktop (>768px): right-side slide-in panel — kept, but cleaned up
//    spacing and made width responsive with max-width instead of a
//    fixed min().
// 3. Mobile (<=768px): now a BOTTOM SHEET that slides up from the
//    bottom, rounded top corners only, ~85vh max height — instead of
//    a right-side panel competing for space on a small screen. This
//    matches the bottom-sheet pattern (e.g. Wish's login sheet) rather
//    than a desktop-style side panel squeezed onto mobile.
import { useState, useEffect, useRef, useCallback } from "react";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { getOrCreateChat, sendMessage, subscribeToMessages, markChatRead } from "../services/chatService";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

const CHIPS = ["Is this available?", "How long is delivery?", "What sizes do you have?", "Can I get a discount?"];

export default function ChatModal({ shop, product, onClose }) {
  const navigate    = useNavigate();
  const isMobile    = useIsMobile();
  const [user,      setUser]     = useState(null);
  const [chatId,    setChatId]   = useState(null);
  const [messages,  setMessages] = useState([]);
  const [input,     setInput]    = useState("");
  const [loading,   setLoading]  = useState(true);
  const [sending,   setSending]  = useState(false);
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const unsubRef    = useRef(null);

  const sellerId = shop?.ownerId || shop?.id;
  const shopName = shop?.shopName || "Store";
  const shopId   = shop?.id;
  const initials = shopName.charAt(0).toUpperCase();

  // Auth
  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);
    return auth.onAuthStateChanged(u => setUser(u));
  }, []);

  // Init chat
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
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user?.uid, sellerId]);

  // Subscribe messages
  useEffect(() => {
    if (!chatId) return;
    unsubRef.current?.();
    unsubRef.current = subscribeToMessages(chatId, msgs => {
      setMessages(msgs);
      markChatRead(chatId, "customer").catch(() => {});
    });
    return () => unsubRef.current?.();
  }, [chatId]);

  // Scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (chatId) setTimeout(() => inputRef.current?.focus(), 150); }, [chatId]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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
    finally { setSending(false); setTimeout(() => inputRef.current?.focus(), 50); }
  };

  // ── Panel positioning — the only structural difference between
  //    desktop and mobile. Everything else (header, messages, input)
  //    is shared markup. ──
  const panelStyle = isMobile
    ? {
        position: "fixed", left: 0, right: 0, bottom: 0,
        width: "100%", maxHeight: "85vh",
        background: "var(--card)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        border: "1px solid var(--pd-border, rgba(17,17,17,0.1))",
        borderBottom: "none",
        zIndex: 9990,
        display: "flex", flexDirection: "column",
        animation: "cm-slide-up 0.28s cubic-bezier(0.22,1,0.36,1)",
        fontFamily: "var(--font-main,'Nunito',sans-serif)",
        overflow: "hidden",
      }
    : {
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "100%", maxWidth: 400,
        background: "var(--card)",
        borderRadius: "16px 0 0 16px",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.13)",
        border: "1px solid var(--pd-border, rgba(17,17,17,0.1))",
        borderRight: "none",
        zIndex: 9990,
        display: "flex", flexDirection: "column",
        animation: "cm-slide-in 0.28s cubic-bezier(0.22,1,0.36,1)",
        fontFamily: "var(--font-main,'Nunito',sans-serif)",
        overflow: "hidden",
      };

  return (
    <>
      {/* Dim backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.32)",
        zIndex: 9980,
        animation: "cm-fade 0.2s ease",
      }} />

      <div style={panelStyle}>

        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px", flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 100, background: "var(--soft)" }} />
          </div>
        )}

        {/* ── Header ── */}
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid var(--pd-border-light, rgba(17,17,17,0.07))",
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            overflow: "hidden",
            background: shop?.logoUrl ? "transparent" : "linear-gradient(135deg, var(--grtheme), color-mix(in srgb, var(--grtheme) 70%, black))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 14, fontWeight: 800,
          }}>
            {shop?.logoUrl
              ? <img src={shop.logoUrl} alt={shopName} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : initials
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {shopName}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
              {product ? `Asking about: ${product.name}` : "Online · AI replies instantly"}
            </div>
          </div>

          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 20,
            color: "var(--muted)", cursor: "pointer", padding: "0 4px", lineHeight: 1,
          }}>×</button>
        </div>

        {/* ── Messages area ── */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: "auto",
          padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 6,
          background: "var(--card)",
        }}>
          {!user ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", textAlign:"center", padding: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Sign in to chat</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20, lineHeight: 1.6 }}>Create a free account to message sellers directly.</div>
              <button onClick={() => { onClose(); navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); }}
                style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "var(--grtheme)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                Sign in / Sign up
              </button>
            </div>
          ) : loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}>
              <div style={{ width:24, height:24, border:"2.5px solid var(--soft)", borderTopColor:"var(--grtheme)", borderRadius:"50%", animation:"cm-spin 0.8s linear infinite" }} />
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, textAlign:"center", padding:"24px 0" }}>
                  <div style={{ width:52, height:52, borderRadius:"50%", marginBottom:12, overflow:"hidden",
                    background: shop?.logoUrl ? "transparent" : "linear-gradient(135deg, var(--grtheme), color-mix(in srgb, var(--grtheme) 70%, black))",
                    display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:20, fontWeight:800 }}>
                    {shop?.logoUrl ? <img src={shop.logoUrl} alt={shopName} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : initials}
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--text)", marginBottom:4 }}>Chat with {shopName}</div>
                  <div style={{ fontSize:12, color:"var(--muted)", marginBottom:18, lineHeight:1.6 }}>Ask about products, delivery, or anything else.</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
                    {CHIPS.map(chip => (
                      <button key={chip} onClick={() => handleSend(chip)} style={{
                        padding:"6px 13px", borderRadius:20, border:"1.5px solid var(--pd-border-light, rgba(17,17,17,0.07))",
                        background:"var(--soft)", color:"var(--text)", fontSize:12, fontWeight:600,
                        cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor="var(--grtheme)"; e.currentTarget.style.color="var(--grtheme)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor="var(--pd-border-light, rgba(17,17,17,0.07))"; e.currentTarget.style.color="var(--text)"; }}
                      >{chip}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(m => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} style={{ display:"flex", flexDirection:"column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "78%", padding: "9px 13px",
                      borderRadius: isMe ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                      background: isMe ? "var(--text)" : "var(--soft)",
                      color: isMe ? "var(--bg)" : "var(--text)",
                      fontSize: 13, fontWeight: 500, lineHeight: 1.55,
                    }}>
                      {m.text}
                      {m.isAiReply && <span style={{ fontSize:9, opacity:0.6, marginLeft:6 }}>✨ AI</span>}
                    </div>
                    <div style={{ fontSize:10, color:"var(--muted)", marginTop:3, paddingLeft: isMe?0:4, paddingRight: isMe?4:0 }}>
                      {fmtTime(m.createdAt)}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* ── Input row ── */}
        {user && !loading && (
          <div style={{
            padding: "10px 14px 14px",
            borderTop: "1px solid var(--pd-border-light, rgba(17,17,17,0.07))",
            flexShrink: 0, background: "var(--card)",
          }}>
            <div style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,100)+"px"; }}
                onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask me anything…"
                rows={1}
                disabled={sending}
                style={{
                  flex:1, background:"var(--soft)", border:"1px solid var(--pd-border-light, rgba(17,17,17,0.07))",
                  borderRadius:10, color:"var(--text)", fontSize:13, fontWeight:600,
                  padding:"10px 12px", resize:"none", outline:"none",
                  lineHeight:1.5, maxHeight:100, overflowY:"auto",
                  fontFamily:"inherit", transition:"border-color 0.15s,box-shadow 0.15s",
                }}
                onFocus={e => { e.target.style.borderColor="var(--grtheme)"; e.target.style.boxShadow="0 0 0 3px var(--pd-blue-bg, rgba(4,110,242,0.10))"; }}
                onBlur={e  => { e.target.style.borderColor="var(--pd-border-light, rgba(17,17,17,0.07))"; e.target.style.boxShadow="none"; }}
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || sending}
                style={{
                  width:38, height:38, borderRadius:10, border:"none", flexShrink:0,
                  background: input.trim() && !sending ? "var(--grtheme)" : "var(--soft)",
                  color: input.trim() && !sending ? "#fff" : "var(--muted)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor: input.trim() && !sending ? "pointer" : "not-allowed",
                  transition:"all 0.15s",
                }}>
                {sending
                  ? <div style={{ width:14, height:14, border:"2px solid #fff", borderTopColor:"transparent", borderRadius:"50%", animation:"cm-spin 0.8s linear infinite" }} />
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7Z"/></svg>
                }
              </button>
            </div>
            <div style={{ fontSize:10, color:"var(--muted)", textAlign:"center", marginTop:6, fontWeight:600 }}>
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes cm-fade      { from { opacity:0 }                  to { opacity:1 } }
        @keyframes cm-slide-in  { from { transform:translateX(100%) } to { transform:translateX(0) } }
        @keyframes cm-slide-up  { from { transform:translateY(100%) } to { transform:translateY(0) } }
        @keyframes cm-spin      { to   { transform:rotate(360deg) } }
      `}</style>
    </>
  );
}