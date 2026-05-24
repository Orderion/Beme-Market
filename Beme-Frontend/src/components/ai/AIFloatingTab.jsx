import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAIUsage } from "../../hooks/useAIUsage";
import { useAIChat } from "../../hooks/useAIChat";
import { useAIContext } from "../../hooks/useAIContext";
import AIMessage, { TypingIndicator } from "./AIMessage";

export default function AIFloatingTab() {
  const { profile, subscriptionPlan } = useAuth();  // ← use auth, not useSubscription
  const { messagesUsed, dailyLimit, isAtLimit } = useAIUsage();
  const { aiContext, suggestions, pageLabel }   = useAIContext();
  const [, setParams] = useSearchParams();
  const [open,  setOpen]  = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  // Use auth context plan — already loaded, no extra Firestore call
  const isPro = subscriptionPlan === "pro";

  const { messages, isTyping, error, sendMessage, setInput: setChatInput } = useAIChat({ aiContext, onLimitReached:()=>{} });
  useEffect(()=>{ setChatInput(input); },[input,setChatInput]);
  useEffect(()=>{ if(open) bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,isTyping,open]);

  if (!isPro) return null;

  const shopName = profile?.shopName || profile?.storeName || "Your Store";
  const PAGE_MSG = {
    home:`How is ${shopName} doing? I can explain your numbers in plain English.`,
    products:"Need help writing a product description or improving your listings?",
    orders:"I can help you reply to customers or explain any order status.",
    analytics:"I can explain what any of these charts mean for your business.",
    customers:"Want tips on keeping your best customers coming back?",
    chat:"I can help you reply to customers professionally — just ask me.",
    marketing:"Need a caption for Instagram, TikTok or WhatsApp? I'll write it.",
    withdrawals:"I can explain how payouts work and tips to increase your balance.",
    appearance:"Want tips on making your store look more professional?",
    subscription:"Not sure which plan is right for you? I can help you decide.",
    verification:"Want me to write your verification note? Just say the word.",
    delivery:"I can help you set up the right delivery options for your buyers.",
    security:"Any questions about keeping your account secure?",
  };
  const openingMsg = PAGE_MSG[aiContext.currentPage] || "How can I help you grow your store today?";

  const handleSend = () => { if (!input.trim()||isTyping) return; sendMessage(input); setInput(""); };
  const handleKey  = (e) => { if (e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); handleSend(); } };
  const goFullChat = () => { setOpen(false); setParams({tab:"ai-assistant"}); };

  return (
    <>
      {open && (
        <div style={{ position:"fixed",bottom:56,right:16,width:"min(380px,calc(100vw - 32px))",height:480,background:"#fff",borderRadius:"16px 16px 0 0",boxShadow:"0 -8px 40px rgba(0,0,0,0.15)",border:"1px solid #e5e7eb",zIndex:9990,display:"flex",flexDirection:"column",animation:"ai-slide-up 0.25s ease" }}>
          <div style={{ padding:"12px 16px",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
            <div style={{ width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,flexShrink:0 }}>✨</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:800,color:"#111" }}>Beme AI Copilot</div>
              <div style={{ fontSize:11,color:"#9ca3af",fontWeight:600 }}>Helping with {pageLabel}</div>
            </div>
            <button onClick={goFullChat} style={{ fontSize:11,color:"#046EF2",background:"none",border:"none",cursor:"pointer",fontWeight:700,padding:0 }}>Full view →</button>
            <button onClick={()=>setOpen(false)} style={{ background:"none",border:"none",fontSize:20,color:"#9ca3af",cursor:"pointer",lineHeight:1,padding:0 }}>×</button>
          </div>
          <div style={{ flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:2 }}>
            {messages.length===0?(
              <div style={{ padding:"8px 0" }}>
                <div style={{ display:"flex",alignItems:"flex-start",gap:8,marginBottom:12 }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12 }}>✨</div>
                  <div style={{ background:"#f8f9fb",border:"1px solid #e5e7eb",borderRadius:"3px 14px 14px 14px",padding:"10px 14px",fontSize:13,lineHeight:1.6,fontWeight:600,maxWidth:"82%",color:"#111" }}>{openingMsg}</div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  {suggestions.slice(0,3).map((s,i)=>(
                    <button key={i} onClick={()=>{ sendMessage(s); setInput(""); }} style={{ background:"#f8f9fb",border:"1px solid #e5e7eb",borderRadius:8,color:"#374151",fontSize:12,padding:"8px 12px",cursor:"pointer",textAlign:"left",fontWeight:600,fontFamily:"Nunito,sans-serif",transition:"all 0.15s" }}
                      onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff";e.currentTarget.style.borderColor="#bfdbfe";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="#f8f9fb";e.currentTarget.style.borderColor="#e5e7eb";}}
                    >{s}</button>
                  ))}
                </div>
              </div>
            ):messages.map(m=><AIMessage key={m.id} message={m} isLight/>)}
            {isTyping&&<TypingIndicator isLight/>}
            {error&&<div style={{ fontSize:11,color:"#ef4444",textAlign:"center",padding:"6px 10px",background:"#fef2f2",borderRadius:8,fontWeight:600 }}>{error}</div>}
            <div ref={bottomRef}/>
          </div>
          <div style={{ padding:"4px 14px",borderTop:"1px solid #f5f5f5",flexShrink:0 }}>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#d1d5db",fontWeight:600,marginBottom:3 }}>
              <span>{messagesUsed}/{dailyLimit} messages today</span>
            </div>
            <div style={{ height:2,background:"#f0f0f0",borderRadius:2,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${Math.min(100,(messagesUsed/dailyLimit)*100)}%`,background:isAtLimit?"#ef4444":"#046EF2",borderRadius:2,transition:"width 0.4s" }}/>
            </div>
          </div>
          <div style={{ padding:"10px 12px",borderTop:"1px solid #f5f5f5",flexShrink:0 }}>
            {isAtLimit?(
              <div style={{ textAlign:"center",fontSize:12,color:"#9ca3af",fontWeight:600 }}>
                Limit reached. <button onClick={goFullChat} style={{ color:"#046EF2",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:700 }}>Top up →</button>
              </div>
            ):(
              <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask me anything…" disabled={isTyping}
                  style={{ flex:1,height:38,background:"#f8f9fb",border:"1px solid #e5e7eb",borderRadius:9,color:"#111",fontSize:13,padding:"0 12px",outline:"none",fontFamily:"Nunito,sans-serif",fontWeight:600 }}
                  onFocus={e=>{e.target.style.borderColor="#046EF2";e.target.style.boxShadow="0 0 0 3px rgba(4,110,242,0.10)";}}
                  onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";}}
                />
                <button onClick={handleSend} disabled={!input.trim()||isTyping} style={{ width:36,height:36,borderRadius:9,border:"none",background:input.trim()&&!isTyping?"#046EF2":"#f0f0f0",cursor:input.trim()&&!isTyping?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",color:input.trim()&&!isTyping?"#fff":"#9ca3af",flexShrink:0,transition:"all 0.15s" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(o=>!o)} style={{ position:"fixed",bottom:0,right:24,height:48,paddingLeft:14,paddingRight:18,background:open?"#f0f0f0":"linear-gradient(135deg,#046EF2,#7C3AED)",border:"none",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8,cursor:"pointer",zIndex:9991,boxShadow:"0 -4px 20px rgba(4,110,242,0.25)",transition:"all 0.2s" }}>
        <span style={{ fontSize:18,animation:open?"none":"ai-wave 2s ease-in-out infinite",display:"inline-block",transformOrigin:"70% 70%" }}>{open?"×":"✨"}</span>
        <span style={{ fontSize:12,fontWeight:700,color:open?"#6b7280":"#fff",fontFamily:"Nunito,sans-serif" }}>{open?"Close":"Ask AI"}</span>
        {!open&&messages.length>0&&<div style={{ width:8,height:8,borderRadius:"50%",background:"#22C55E",border:"2px solid #fff",position:"absolute",top:10,right:10 }}/>}
      </button>
      <style>{`@keyframes ai-wave{0%,100%{transform:rotate(0deg)}15%{transform:rotate(14deg)}30%{transform:rotate(-8deg)}45%{transform:rotate(14deg)}60%{transform:rotate(-4deg)}75%{transform:rotate(10deg)}}@keyframes ai-slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  );
}