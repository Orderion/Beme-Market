import { useState, useRef } from "react";
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleTimeString("en-GH", { hour:"2-digit", minute:"2-digit" });
}

export default function DashboardChat() {
  const { user }       = useAuth();
  const { planLimits, shop } = useSellerAuth();
  const { conversations, activeChat, setActiveChat, messages, loading, sending, totalUnread, sendMessage, markRead } = useChat();
  const [text, setText]             = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiSuggestion, setAiSug]    = useState(null);
  const inputRef = useRef(null);

  const handleSend = async () => {
    if (!text.trim()||sending) return;
    try { await sendMessage(text); setText(""); setAiSug(null); }
    catch { alert("Failed to send."); }
  };

  const handleSelect = (id) => { setActiveChat(id); markRead(id); setAiSug(null); setText(""); };
  const active = conversations.find(c=>c.id===activeChat);
  const lastCustMsg = messages.filter(m=>m.senderRole!=="seller").slice(-1)[0];

  const handleAISuggest = async () => {
    if (!lastCustMsg?.text) return;
    setAiLoading(true); setAiSug(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/chat`,{ method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ messages:[{ role:"user", content:`A customer sent this to my Beme Market store: "${lastCustMsg.text}"\nWrite a short professional friendly reply as the seller. Store: "${shop?.shopName||"my store"}". Under 3 sentences. Reply text only.` }], context:{ currentPage:"chat", shopName:shop?.shopName||"Store" } }) });
      const data = await res.json();
      if (data.content) { setAiSug(data.content); setText(data.content); inputRef.current?.focus(); }
    } catch(e){ console.error(e); } finally { setAiLoading(false); }
  };

  if (!planLimits?.hasChat) return (
    <div className="sd-empty" style={{ padding:64, textAlign:"center" }}>
      <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:8 }}>Live Chat requires Standard or Pro</div>
      <div style={{ fontSize:13, color:"#6b7280" }}>Upgrade your plan to chat with customers in real time.</div>
    </div>
  );

  return (
    <div style={{ background:"#fff" }}>
      <div className="sd-page-head" style={{ marginBottom:14 }}>
        <div>
          <div className="sd-page-title">Messages</div>
          <div className="sd-page-sub">{conversations.length} conversations{totalUnread>0?` · ${totalUnread} unread`:""}</div>
        </div>
      </div>
      <div style={{ height:"calc(100vh - 180px)", minHeight:480 }}>
        <div className="sd-chat-root" style={{ height:"100%" }}>
          <div className="sd-chat-list" style={{ background:"#fff", borderRight:"1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ fontWeight:800,fontSize:13,color:"#111",padding:"14px 16px",borderBottom:"1px solid rgba(0,0,0,0.08)" }}>Conversations</div>
            {loading?[1,2,3].map(i=><div key={i} className="sd-skeleton" style={{ height:58,margin:8,borderRadius:8 }}/>):
              conversations.length===0?<div style={{ padding:24,textAlign:"center",color:"#8B8FA8",fontSize:12 }}>No conversations yet</div>:
              conversations.map(c=>(
                <div key={c.id} onClick={()=>handleSelect(c.id)} style={{ borderLeft:activeChat===c.id?"3px solid #046EF2":"3px solid transparent",cursor:"pointer",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,background:activeChat===c.id?"rgba(4,110,242,0.03)":"transparent" }}>
                  <div style={{ width:34,height:34,borderRadius:"50%",background:"rgba(4,110,242,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#046EF2",flexShrink:0 }}>{(c.customerName||"?")[0].toUpperCase()}</div>
                  <div style={{ minWidth:0,flex:1 }}>
                    <div style={{ fontWeight:700,fontSize:13,color:"#111" }}>{c.customerName||"Customer"}</div>
                    <div style={{ fontSize:12,color:"#9CA3AF",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.lastMessage||"No messages yet"}</div>
                  </div>
                  {c.unreadBySeller>0&&<div style={{ background:"#046EF2",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>{c.unreadBySeller}</div>}
                </div>
              ))
            }
          </div>
          <div className="sd-chat-main" style={{ background:"#fff",display:"flex",flexDirection:"column" }}>
            {!activeChat?(
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.3" strokeLinecap="round" style={{ marginBottom:10 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <div style={{ fontSize:13,color:"#9ca3af",fontWeight:600 }}>Select a conversation</div>
              </div>
            ):(
              <>
                <div style={{ padding:"14px 16px",borderBottom:"1px solid rgba(0,0,0,0.08)",display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:34,height:34,borderRadius:"50%",background:"rgba(4,110,242,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#046EF2" }}>{(active?.customerName||"?")[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize:13,fontWeight:700,color:"#111" }}>{active?.customerName||"Customer"}</div>
                    <div style={{ fontSize:11,color:"#22C55E",display:"flex",alignItems:"center",gap:4 }}><div style={{ width:6,height:6,borderRadius:"50%",background:"#22C55E" }}/>Online</div>
                  </div>
                </div>
                <div className="sd-chat-messages" style={{ flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:8 }}>
                  {messages.map(m=>(
                    <div key={m.id}>
                      <div style={{ maxWidth:"70%",padding:"10px 14px",borderRadius:12,fontSize:13,lineHeight:1.5,background:m.senderRole==="seller"?"#111":"#f4f4f4",color:m.senderRole==="seller"?"#fff":"#111",marginLeft:m.senderRole==="seller"?"auto":0 }}>
                        {m.text}
                        {m.isAiGenerated&&<span style={{ fontSize:10,opacity:0.7,marginLeft:6 }}>✨ AI</span>}
                        {m.imageUrl&&<img src={m.imageUrl} alt="" style={{ maxWidth:"100%",borderRadius:6,marginTop:6 }}/>}
                      </div>
                      <div style={{ fontSize:10,color:"#8B8FA8",textAlign:m.senderRole==="seller"?"right":"left",marginTop:2 }}>{fmtTime(m.createdAt)}</div>
                    </div>
                  ))}
                </div>
                {aiSuggestion&&(
                  <div style={{ margin:"0 16px 8px",padding:"10px 14px",background:"#eff6ff",borderRadius:10,border:"1px solid #bfdbfe",fontSize:12,color:"#1e3a5f",fontWeight:600,lineHeight:1.5 }}>
                    <div style={{ fontSize:10,fontWeight:700,color:"#046EF2",marginBottom:4 }}>✨ AI Suggestion — edit or send as is</div>
                    {aiSuggestion}
                  </div>
                )}
                <div style={{ padding:"12px 16px",borderTop:"1px solid rgba(0,0,0,0.08)",display:"flex",gap:8,alignItems:"flex-end" }}>
                  {lastCustMsg&&(
                    <button onClick={handleAISuggest} disabled={aiLoading} title="AI reply suggestion"
                      style={{ height:42,width:42,borderRadius:10,border:"1px solid #e5e7eb",background:aiLoading?"#f0f0f0":"#eff6ff",color:"#046EF2",cursor:aiLoading?"wait":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16,transition:"all 0.15s" }}>
                      {aiLoading?<div style={{ width:14,height:14,border:"2px solid #046EF2",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>:"✨"}
                    </button>
                  )}
                  <input ref={inputRef} value={text} onChange={e=>{setText(e.target.value);if(aiSuggestion)setAiSug(null);}}
                    placeholder="Type a message or tap ✨ for AI reply…"
                    style={{ flex:1,height:42,padding:"0 14px",border:"1.5px solid rgba(0,0,0,0.1)",borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit" }}
                    onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&handleSend()}/>
                  <button onClick={handleSend} disabled={sending||!text.trim()}
                    style={{ padding:"0 20px",height:42,borderRadius:10,border:"none",background:"#111",color:"#fff",fontSize:13,fontWeight:800,cursor:sending||!text.trim()?"not-allowed":"pointer",opacity:sending||!text.trim()?0.5:1,fontFamily:"inherit" }}>
                    {sending?"…":"Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
