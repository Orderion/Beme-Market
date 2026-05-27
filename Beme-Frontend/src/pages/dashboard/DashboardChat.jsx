import { useState, useRef } from "react";
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleTimeString("en-GH", { hour:"2-digit", minute:"2-digit" });
}

function EmptyConversations() {
  return (
    <div style={{ padding:24, textAlign:"center", color:"#8B8FA8", fontSize:12 }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.4" strokeLinecap="round" style={{ display:"block", margin:"0 auto 8px" }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      No conversations yet
    </div>
  );
}

export default function DashboardChat() {
  const { user }     = useAuth();
  const { planLimits, shop } = useSellerAuth();
  const { conversations, activeChat, setActiveChat, messages, loading, sending, totalUnread, sendMessage, markRead } = useChat();

  const [text,         setText]         = useState("");
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [copiedId,     setCopiedId]     = useState(null);
  const inputRef = useRef(null);

  const activeChatData  = conversations.find((c) => c.id === activeChat);
  const aiPaused        = activeChatData?.aiPaused || false;
  const lastCustomerMsg = messages.filter(m => m.senderRole !== "seller").slice(-1)[0];

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
    setActiveChat(chatId); markRead(chatId); setAiSuggestion(null); setText("");
  };

  const handleAISuggest = async () => {
    if (!lastCustomerMsg?.text) return;
    setAiLoading(true); setAiSuggestion(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          messages:[{ role:"user", content:`A customer sent this message to my store on Beme Market: "${lastCustomerMsg.text}"\n\nWrite a short, professional, friendly reply I can send as the seller. My store name is "${shop?.shopName || "my store"}". Keep it under 3 sentences. Reply only with the message text, no explanation.` }],
          context:{ currentPage:"chat", shopName: shop?.shopName || "Store" },
        }),
      });
      const data = await res.json();
      if (data.content) { setAiSuggestion(data.content); setText(data.content); inputRef.current?.focus(); }
    } catch (e) { console.error("[AI suggest]", e); }
    finally { setAiLoading(false); }
  };

  if (!planLimits?.hasChat) {
    return (
      <div className="sd-empty" style={{ padding:64, textAlign:"center" }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.3" strokeLinecap="round" style={{ marginBottom:12 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <div className="sd-empty-title">Live Chat requires Standard or Pro</div>
        <div className="sd-empty-text">Upgrade your plan to chat with customers in real time.</div>
      </div>
    );
  }

  return (
    <div style={{ background:"#fff" }}>
      <div className="sd-page-head" style={{ marginBottom:14 }}>
        <div className="sd-page-title">Messages</div>
        <div className="sd-page-sub">{conversations.length} conversations{totalUnread > 0 ? ` · ${totalUnread} unread` : ""}</div>
      </div>

      <div style={{ height:"calc(100vh - 180px)", minHeight:480 }}>
        <div className="sd-chat-root" style={{ height:"100%" }}>

          {/* Conversation list */}
          <div className="sd-chat-list" style={{ background:"#fff", borderRight:"1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#111", padding:"14px 16px", borderBottom:"1px solid rgba(0,0,0,0.08)" }}>Conversations</div>
            {loading
              ? [1,2,3].map(i => <div key={i} className="sd-skeleton" style={{ height:58, margin:8, borderRadius:8 }}/>)
              : conversations.length === 0
                ? <EmptyConversations/>
                : conversations.map(c => (
                    <div key={c.id} className={`sd-chat-item ${activeChat===c.id?"active":""}`}
                      onClick={() => handleSelectChat(c.id)}
                      style={{ borderLeft:activeChat===c.id?"3px solid #7c3aed":"3px solid transparent", cursor:"pointer", padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(124,58,237,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, color:"#7c3aed", flexShrink:0 }}>
                        {(c.customerName||"?")[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:"#111" }}>{c.customerName||"Customer"}</div>
                        <div style={{ fontSize:12, color:"#9CA3AF", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.lastMessage||"No messages yet"}</div>
                      </div>
                      {c.unreadBySeller > 0 && (
                        <div style={{ background:"#7c3aed", color:"#fff", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0 }}>
                          {c.unreadBySeller}
                        </div>
                      )}
                    </div>
                  ))
            }
          </div>

          {/* Chat area */}
          <div className="sd-chat-main" style={{ background:"#fff", display:"flex", flexDirection:"column" }}>
            {!activeChat ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.3" strokeLinecap="round" style={{ marginBottom:10 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <div className="sd-empty-title">Select a conversation</div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(0,0,0,0.08)", display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(124,58,237,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, color:"#7c3aed", flexShrink:0 }}>
                    {(activeChatData?.customerName||"?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#111" }}>{activeChatData?.customerName||"Customer"}</div>
                    <div style={{ fontSize:11, color:"#22C55E", display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:"#22C55E" }}/>Online
                    </div>
                  </div>
                  <button onClick={togglePauseAI}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20,
                      border:`1px solid ${aiPaused?"#f59e0b":"rgba(124,58,237,0.2)"}`,
                      background:aiPaused?"#fffbeb":"#f5f3ff",
                      color:aiPaused?"#d97706":"#7c3aed",
                      fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    {aiPaused ? "⏸ AI Paused" : "✨ AI Active"}
                  </button>
                </div>

                {/* Messages */}
                <div className="sd-chat-messages" style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:4 }}>
                  {messages.map(m => {
                    const isSeller = m.senderRole === "seller";
                    return (
                      <div key={m.id}>
                        <div style={{ display:"flex", justifyContent:isSeller?"flex-end":"flex-start" }}>
                          <div style={{ maxWidth:"70%", padding:"10px 14px", borderRadius:12, fontSize:13, lineHeight:1.5,
                            background:isSeller?"#111":"#f4f4f4", color:isSeller?"#fff":"#111" }}>
                            {m.text}
                            {(m.isAiGenerated||m.isAiReply) && <span style={{ fontSize:10, opacity:0.7, marginLeft:6 }}>✨ AI</span>}
                            {m.imageUrl && <img src={m.imageUrl} alt="" style={{ maxWidth:"100%", borderRadius:6, marginTop:6 }}/>}
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:isSeller?"flex-end":"flex-start", marginTop:2 }}>
                          <span style={{ fontSize:10, color:"#8B8FA8" }}>{fmtTime(m.createdAt)}</span>
                          <button onClick={() => handleCopy(m.text, m.id)}
                            style={{ background:"none", border:"none", cursor:"pointer", padding:"0 4px",
                              fontSize:10, fontWeight:700, fontFamily:"inherit",
                              color: copiedId===m.id ? "#22C55E" : "#D1D5DB", transition:"color 0.15s" }}>
                            {copiedId===m.id ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI suggestion */}
                {aiSuggestion && (
                  <div style={{ margin:"0 16px 8px", padding:"10px 14px", background:"#f5f3ff", borderRadius:10, border:"1px solid #ddd6fe", fontSize:12, color:"#3b0764", fontWeight:600 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#7c3aed", marginBottom:4 }}>✨ AI Suggestion — edit or send as is</div>
                    {aiSuggestion}
                  </div>
                )}

                {/* Input */}
                <div style={{ padding:"12px 16px", borderTop:"1px solid rgba(0,0,0,0.08)", display:"flex", gap:8, alignItems:"flex-end" }}>
                  {lastCustomerMsg && (
                    <button onClick={handleAISuggest} disabled={aiLoading} title="Generate AI reply"
                      style={{ height:42, width:42, borderRadius:10, border:"1px solid #e5e7eb",
                        background:aiLoading?"#f0f0f0":"#f5f3ff", color:"#7c3aed",
                        cursor:aiLoading?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:16 }}>
                      {aiLoading
                        ? <div style={{ width:14, height:14, border:"2px solid #7c3aed", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
                        : "✨"}
                    </button>
                  )}
                  <input ref={inputRef} className="sd-input" value={text}
                    onChange={e => { setText(e.target.value); if (aiSuggestion) setAiSuggestion(null); }}
                    placeholder="Type a message or tap ✨ for AI reply…"
                    style={{ flex:1, height:42, padding:"0 14px", border:"1.5px solid rgba(0,0,0,0.1)", borderRadius:10, fontSize:14, outline:"none", fontFamily:"inherit" }}
                    onKeyDown={e => e.key==="Enter" && !e.shiftKey && handleSend()}
                  />
                  <button onClick={handleSend} disabled={sending || !text.trim()}
                    style={{ padding:"0 20px", height:42, borderRadius:10, border:"none", background:"#111", color:"#fff", fontSize:13, fontWeight:800,
                      cursor:sending||!text.trim()?"not-allowed":"pointer", opacity:sending||!text.trim()?0.5:1, fontFamily:"inherit" }}>
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
