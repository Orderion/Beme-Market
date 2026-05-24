import React from "react";

export default function AIMessage({ message, isLight=true }) {
  const { role, content, createdAt } = message;
  const isUser = role==="user";
  const isAI   = role==="assistant";
  const time   = createdAt ? new Date(createdAt?.toMillis?.() || createdAt).toLocaleTimeString("en-GH",{hour:"2-digit",minute:"2-digit"}) : "";

  function render(text) {
    return text.split("\n").map((line,i)=>{
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return <span key={i} style={{display:"block",minHeight:line?undefined:"0.5em"}}>{parts.map((p,j)=>j%2===1?<strong key={j}>{p}</strong>:p)}</span>;
    });
  }

  if (isUser) return (
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
      <div style={{maxWidth:"78%"}}>
        <div style={{background:"#046EF2",color:"#fff",borderRadius:"14px 14px 3px 14px",padding:"10px 14px",fontSize:13,lineHeight:1.6,fontWeight:600,fontFamily:"Nunito,sans-serif"}}>{render(content)}</div>
        {time&&<div style={{fontSize:10,color:"#9ca3af",textAlign:"right",marginTop:3,fontWeight:600}}>{time}</div>}
      </div>
    </div>
  );

  if (isAI) return (
    <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
      </div>
      <div style={{maxWidth:"82%"}}>
        <div style={{background:isLight?"#f8f9fb":"#1E2235",color:isLight?"#111":"#E2E8F0",border:`1px solid ${isLight?"#e5e7eb":"transparent"}`,borderRadius:"3px 14px 14px 14px",padding:"10px 14px",fontSize:13,lineHeight:1.7,fontWeight:600,fontFamily:"Nunito,sans-serif"}}>{render(content)}</div>
        {time&&<div style={{fontSize:10,color:"#9ca3af",marginTop:3,fontWeight:600}}>Beme AI · {time}</div>}
      </div>
    </div>
  );
  return null;
}

export function TypingIndicator({ isLight=true }) {
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
      </div>
      <div style={{background:isLight?"#f8f9fb":"#1E2235",border:`1px solid ${isLight?"#e5e7eb":"transparent"}`,borderRadius:"3px 14px 14px 14px",padding:"12px 16px",display:"flex",alignItems:"center",gap:5}}>
        {[0,1,2].map(i=><span key={i} style={{width:7,height:7,borderRadius:"50%",background:isLight?"#9ca3af":"#4B5563",display:"inline-block",animation:`bai-bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
        <style>{`@keyframes bai-bounce{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-5px);opacity:1}}`}</style>
      </div>
    </div>
  );
}
