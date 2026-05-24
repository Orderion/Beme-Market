import React, { useState, useEffect } from "react";

export default function TutorialOverlay({ steps=[], onFinish, pageTitle="this page" }) {
  const [step, setStep] = useState(-1);
  const [rect, setRect] = useState(null);
  const current   = steps[step] || null;
  const isWelcome = step === -1;
  const isLast    = step === steps.length - 1;

  useEffect(() => {
    if (isWelcome || !current?.selector) { setRect(null); return; }
    const el = document.querySelector(current.selector);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior:"smooth", block:"center" });
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect({ top:r.top, left:r.left, width:r.width, height:r.height });
    }, 300);
  }, [step, current, isWelcome]);

  const next = () => { if (isLast) { onFinish(); return; } setStep(s=>s+1); };
  const skip = () => onFinish();
  const PAD  = 12;

  const getTooltipStyle = () => {
    if (!rect) return { top:"50%", left:"50%", transform:"translate(-50%,-50%)" };
    const winH=window.innerHeight, winW=window.innerWidth;
    const tW=Math.min(300,winW-32), tH=180;
    if (rect.bottom+tH+20<winH) return { top:rect.bottom+PAD+10, left:Math.max(16,Math.min(rect.left,winW-tW-16)), width:tW };
    if (rect.top-tH-20>0)       return { top:rect.top-tH-PAD-10, left:Math.max(16,Math.min(rect.left,winW-tW-16)), width:tW };
    return { top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:tW };
  };

  const sT=rect?rect.top-PAD:0, sL=rect?rect.left-PAD:0;
  const sW=rect?rect.width+PAD*2:0, sH=rect?rect.height+PAD*2:0;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:99999, pointerEvents:"none" }}>
      {!isWelcome && rect ? (
        <>
          <div style={{ position:"absolute",top:0,left:0,right:0,height:sT,background:"rgba(0,0,0,0.65)",pointerEvents:"auto" }} onClick={skip}/>
          <div style={{ position:"absolute",top:sT+sH,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.65)",pointerEvents:"auto" }} onClick={skip}/>
          <div style={{ position:"absolute",top:sT,left:0,width:sL,height:sH,background:"rgba(0,0,0,0.65)",pointerEvents:"auto" }} onClick={skip}/>
          <div style={{ position:"absolute",top:sT,left:sL+sW,right:0,height:sH,background:"rgba(0,0,0,0.65)",pointerEvents:"auto" }} onClick={skip}/>
          <div style={{ position:"absolute",top:sT,left:sL,width:sW,height:sH,borderRadius:12,border:"2.5px solid #046EF2",boxShadow:"0 0 0 4px rgba(4,110,242,0.2)",pointerEvents:"none",animation:"tut-pulse 2s ease-in-out infinite" }}/>
        </>
      ) : !isWelcome ? (
        <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",pointerEvents:"auto" }} onClick={skip}/>
      ) : (
        <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(4px)",pointerEvents:"auto" }}/>
      )}

      {isWelcome && (
        <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#fff",borderRadius:20,padding:"32px 28px",width:"min(380px,calc(100vw - 32px))",boxShadow:"0 24px 80px rgba(0,0,0,0.3)",pointerEvents:"auto",textAlign:"center" }}>
          <div style={{ width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:26 }}>👋</div>
          <div style={{ fontSize:20,fontWeight:900,color:"#111",marginBottom:8,letterSpacing:"-0.02em" }}>Welcome to {pageTitle}!</div>
          <div style={{ fontSize:14,color:"#6b7280",lineHeight:1.7,marginBottom:24,fontWeight:600 }}>Let me show you around. I'll highlight the most important features so you can get the most out of this page.</div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={skip} style={{ flex:1,height:44,borderRadius:10,border:"1.5px solid #e5e7eb",background:"transparent",color:"#6b7280",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Skip tour</button>
            <button onClick={()=>setStep(0)} style={{ flex:2,height:44,borderRadius:10,border:"none",background:"#046EF2",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(4,110,242,0.35)" }}>Show me around →</button>
          </div>
        </div>
      )}

      {!isWelcome && (
        <div style={{ position:"absolute",...getTooltipStyle(),background:"#fff",borderRadius:16,padding:"18px 20px",boxShadow:"0 16px 60px rgba(0,0,0,0.25)",pointerEvents:"auto",zIndex:100000,animation:"tut-fadein 0.2s ease" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
            <div style={{ fontSize:11,fontWeight:700,color:"#046EF2",background:"#eff6ff",padding:"3px 8px",borderRadius:20,border:"1px solid #bfdbfe" }}>Step {step+1} of {steps.length}</div>
            <button onClick={skip} style={{ background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:18,lineHeight:1,padding:0 }}>×</button>
          </div>
          <div style={{ fontSize:15,fontWeight:800,color:"#111",marginBottom:6,letterSpacing:"-0.01em" }}>{current?.title}</div>
          <div style={{ fontSize:13,color:"#6b7280",lineHeight:1.6,fontWeight:600,marginBottom:16 }}>{current?.description}</div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <button onClick={skip} style={{ background:"none",border:"none",color:"#9ca3af",fontSize:13,fontWeight:600,cursor:"pointer",padding:0 }}>Skip tour</button>
            <button onClick={next} style={{ padding:"9px 20px",borderRadius:10,border:"none",background:"#046EF2",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit" }}>{isLast?"Finish ✓":"Next →"}</button>
          </div>
          <div style={{ display:"flex",gap:5,justifyContent:"center",marginTop:12 }}>
            {steps.map((_,i)=><div key={i} style={{ width:i===step?16:6,height:6,borderRadius:3,background:i===step?"#046EF2":"#e5e7eb",transition:"all 0.3s" }}/>)}
          </div>
        </div>
      )}
      <style>{`@keyframes tut-pulse{0%,100%{box-shadow:0 0 0 4px rgba(4,110,242,0.2)}50%{box-shadow:0 0 0 8px rgba(4,110,242,0.1)}}@keyframes tut-fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
