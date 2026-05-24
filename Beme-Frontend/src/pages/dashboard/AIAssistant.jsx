import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth }         from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { useAIUsage }      from "../../hooks/useAIUsage";
import { useAIChat }       from "../../hooks/useAIChat";
import { useAISettings }   from "../../hooks/useAISettings";
import { useAIContext }    from "../../hooks/useAIContext";
import AIMessage, { TypingIndicator } from "../../components/ai/AIMessage";

function Ico({ d, size=16, color="currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}
const I = {
  sparkle:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  send:"M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7Z",
  lock:"M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Z M7 11V7a5 5 0 0 1 10 0v4",
  star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z",
  chat:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z",
  check:"M20 6L9 17l-5-5",
};

const AUTOS = [
  { key:"aiCustomerReplies",    label:"Customer Auto-Replies",  desc:"AI handles common buyer questions" },
  { key:"aiProductDescriptions",label:"Product Descriptions",   desc:"Generate optimised product copy" },
  { key:"aiSeoOptimization",    label:"SEO Optimization",       desc:"Improve titles for search visibility" },
  { key:"aiSalesSuggestions",   label:"Sales Suggestions",      desc:"Personalised tips to boost conversion" },
  { key:"aiMarketingAssistant", label:"Marketing Assistant",    desc:"Instagram, TikTok & WhatsApp captions" },
  { key:"aiAnalyticsExplainer", label:"Analytics Explainer",    desc:"Understand metrics in plain English" },
  { key:"aiFollowUpSuggestions",label:"Follow-Up Suggestions",  desc:"Re-engage past buyers" },
  { key:"aiStoreHealthAnalysis",label:"Store Health Analysis",  desc:"Weekly store performance diagnosis" },
];

const PACKS = [
  { id:"small",          msgs:"50 messages",     price:"$1", ghs:"GHS 15" },
  { id:"medium",         msgs:"200 messages",    price:"$3", ghs:"GHS 45" },
  { id:"unlimited_week", msgs:"7-day unlimited", price:"$5", ghs:"GHS 75" },
];

function TopupModal({ onClose }) {
  const { user }=useAuth(); const [bought,setBought]=useState(null); const [busy,setBusy]=useState(null);
  const buy=async(id)=>{ setBusy(id); try{ const {addExtraCredits}=await import("../../services/aiUsageService"); if(user?.uid) await addExtraCredits(user.uid,id); setBought(id); setTimeout(()=>{onClose();setBought(null);},1800); }catch(e){console.error(e);}finally{setBusy(null);} };
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}}>
      <div style={{background:"#fff",borderRadius:16,padding:"28px 28px 24px",width:"100%",maxWidth:360,border:"1px solid #e5e7eb",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <div style={{fontSize:17,fontWeight:800,color:"#111",letterSpacing:"-0.02em"}}>Get more AI messages</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:"#9ca3af",cursor:"pointer",lineHeight:1,padding:0}}>×</button>
        </div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:20,fontWeight:600}}>Your 15 free messages reset at midnight.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {PACKS.map(p=>(
            <button key={p.id} onClick={()=>buy(p.id)} disabled={!!busy||!!bought} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",background:bought===p.id?"#f0fdf4":"#f8f9fb",border:`1px solid ${bought===p.id?"#86efac":"#e5e7eb"}`,borderRadius:10,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#111",marginBottom:2}}>{bought===p.id?"✓ Credits added!":busy===p.id?"Processing…":p.msgs}</div>
                <div style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{p.ghs}</div>
              </div>
              <div style={{fontSize:14,fontWeight:800,color:"#046EF2",background:"#eff6ff",padding:"5px 12px",borderRadius:8}}>{p.price}</div>
            </button>
          ))}
        </div>
        <div style={{fontSize:11,color:"#9ca3af",textAlign:"center",marginTop:16,fontWeight:600}}>Payments via Paystack · Credits added instantly</div>
      </div>
    </div>
  );
}

function LockedState({ onUpgrade }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:480,padding:"48px 24px",textAlign:"center"}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,color:"#046EF2"}}><Ico d={I.lock} size={28}/></div>
      <div style={{fontSize:22,fontWeight:800,color:"#111",marginBottom:8,letterSpacing:"-0.03em"}}>AI Copilot is Pro only</div>
      <div style={{fontSize:14,color:"#6b7280",lineHeight:1.7,maxWidth:320,marginBottom:28,fontWeight:600}}>Upgrade to Pro to unlock your personal AI business assistant.</div>
      <button onClick={onUpgrade} style={{padding:"12px 28px",background:"#046EF2",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:8,boxShadow:"0 4px 14px rgba(4,110,242,0.3)"}}>Upgrade to Pro — $10/mo</button>
      <div style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>Cancel anytime · 14-day free trial</div>
      <div style={{marginTop:32,background:"#f8f9fb",border:"1px solid #e5e7eb",borderRadius:12,padding:"20px 24px",maxWidth:320,width:"100%",textAlign:"left"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>What you unlock</div>
        {["AI chat — 15 messages/day free","Product description generator","Analytics explainer in plain English","Instagram & TikTok caption generator","Customer reply assistant","Store health analysis","AI sales suggestions"].map((f,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:13,color:"#374151",fontWeight:600}}>
            <span style={{color:"#046EF2",flexShrink:0}}><Ico d={I.check} size={13}/></span>{f}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPanel({ aiContext, suggestions, pageLabel, shopName }) {
  const [showTopup,setShowTopup]=useState(false);
  const { messagesUsed,dailyLimit,messagesRemaining,isAtLimit,isNearLimit,usagePercent }=useAIUsage();
  const { messages,input,setInput,isTyping,error,histLoading,bottomRef,sendMessage }=useAIChat({ aiContext, onLimitReached:()=>setShowTopup(true) });
  const bar = usagePercent>=100?"#ef4444":usagePercent>=80?"#f59e0b":"#046EF2";
  const handleKey=e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendMessage(); } };
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
      {/* Usage bar */}
      <div style={{padding:"10px 18px",borderBottom:"1px solid #f5f5f5",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
          <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{isAtLimit?"Daily limit reached":`${messagesUsed} / ${dailyLimit} messages today`}</span>
          <button onClick={()=>setShowTopup(true)} style={{fontSize:12,color:"#046EF2",background:"none",border:"none",cursor:"pointer",fontWeight:700,padding:0}}>Get more →</button>
        </div>
        <div style={{height:4,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${usagePercent}%`,background:bar,borderRadius:4,transition:"width 0.4s ease,background 0.3s"}}/>
        </div>
        {isNearLimit&&!isAtLimit&&<div style={{fontSize:11,color:"#f59e0b",marginTop:4,fontWeight:600}}>{messagesRemaining} message{messagesRemaining!==1?"s":""} left today</div>}
      </div>
      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:2}}>
        {histLoading?(
          <div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:32,fontWeight:600}}>Loading…</div>
        ):messages.length===0?(
          <div style={{padding:"8px 0"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",color:"#fff"}}><Ico d={I.sparkle} size={22}/></div>
              <div style={{fontSize:16,fontWeight:800,color:"#111",marginBottom:6,letterSpacing:"-0.02em"}}>Hi! I'm your Beme AI Copilot</div>
              <div style={{fontSize:13,color:"#6b7280",lineHeight:1.7,maxWidth:280,margin:"0 auto",fontWeight:600}}>I'm here to help <strong style={{color:"#111"}}>{shopName}</strong> grow. Ask me anything about products, orders, analytics, or marketing.</div>
            </div>
            <div style={{fontSize:11,color:"#9ca3af",textAlign:"center",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,fontWeight:700}}>Try asking</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {suggestions.slice(0,4).map((s,i)=>(
                <button key={i} onClick={()=>sendMessage(s)} style={{background:"#f8f9fb",border:"1px solid #e5e7eb",borderRadius:9,color:"#374151",fontSize:13,padding:"10px 14px",cursor:"pointer",textAlign:"left",fontWeight:600,fontFamily:"Nunito,sans-serif",transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff";e.currentTarget.style.borderColor="#bfdbfe";e.currentTarget.style.color="#046EF2";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#f8f9fb";e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.color="#374151";}}
                >{s}</button>
              ))}
            </div>
          </div>
        ):messages.map(m=><AIMessage key={m.id} message={m} isLight/>)}
        {isTyping&&<TypingIndicator isLight/>}
        {error&&<div style={{fontSize:12,color:"#ef4444",textAlign:"center",padding:"8px 12px",background:"#fef2f2",borderRadius:8,fontWeight:600}}>{error}</div>}
        <div ref={bottomRef}/>
      </div>
      {/* Input */}
      <div style={{padding:"12px 16px 14px",borderTop:"1px solid #f5f5f5",flexShrink:0,background:"#fff"}}>
        {isAtLimit?(
          <div style={{textAlign:"center",fontSize:13,color:"#6b7280",padding:"8px 0",fontWeight:600}}>
            Daily limit reached.{" "}
            <button onClick={()=>setShowTopup(true)} style={{color:"#046EF2",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:700}}>Top up →</button>
          </div>
        ):(
          <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
              placeholder={`Ask me anything about ${pageLabel}…`} rows={1} disabled={isTyping}
              style={{flex:1,background:"#f8f9fb",border:"1px solid #e5e7eb",borderRadius:10,color:"#111",fontSize:13,padding:"10px 13px",resize:"none",outline:"none",lineHeight:1.5,maxHeight:120,overflowY:"auto",fontFamily:"Nunito,sans-serif",fontWeight:600,transition:"border-color 0.15s,box-shadow 0.15s"}}
              onFocus={e=>{e.target.style.borderColor="#046EF2";e.target.style.boxShadow="0 0 0 3px rgba(4,110,242,0.10)";}}
              onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";}}
              onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}
            />
            <button onClick={()=>sendMessage()} disabled={!input.trim()||isTyping}
              style={{width:40,height:40,borderRadius:10,flexShrink:0,border:"none",background:input.trim()&&!isTyping?"#046EF2":"#f0f0f0",cursor:input.trim()&&!isTyping?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",color:input.trim()&&!isTyping?"#fff":"#9ca3af",transition:"all 0.15s"}}>
              <Ico d={I.send} size={15}/>
            </button>
          </div>
        )}
        <div style={{fontSize:10,color:"#d1d5db",textAlign:"center",marginTop:6,fontWeight:600}}>Enter to send · Shift+Enter for new line</div>
      </div>
      {showTopup&&<TopupModal onClose={()=>setShowTopup(false)}/>}
    </div>
  );
}

function SettingsPanel({ messagesUsed, dailyLimit, messagesRemaining, usagePercent }) {
  const { settings, loading, saving, updateSetting } = useAISettings();
  const bar = usagePercent>=100?"#ef4444":usagePercent>=80?"#f59e0b":"#046EF2";
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 20px",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:14}}>Today's Usage</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
          <div><div style={{fontSize:30,fontWeight:900,color:"#111",letterSpacing:"-0.04em",lineHeight:1}}>{messagesUsed}</div><div style={{fontSize:12,color:"#9ca3af",fontWeight:600,marginTop:2}}>of {dailyLimit} used</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:24,fontWeight:900,color:"#046EF2",letterSpacing:"-0.03em",lineHeight:1}}>{messagesRemaining}</div><div style={{fontSize:12,color:"#9ca3af",fontWeight:600,marginTop:2}}>remaining</div></div>
        </div>
        <div style={{height:6,background:"#f0f0f0",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:`${usagePercent}%`,background:bar,borderRadius:6,transition:"width 0.4s ease"}}/></div>
        <div style={{fontSize:11,color:"#9ca3af",marginTop:8,fontWeight:600}}>Resets at midnight</div>
      </div>
      <div style={{background:"linear-gradient(135deg,#046EF2 0%,#7C3AED 100%)",borderRadius:12,padding:"16px 20px",color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><Ico d={I.star} size={13}/><span style={{fontSize:13,fontWeight:800}}>Pro Plan Active</span></div>
        <div style={{fontSize:12,opacity:0.85,lineHeight:1.6,fontWeight:600}}>15 free messages/day + pay-as-you-go top-ups</div>
      </div>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 20px",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>AI Automations</div>
        <div style={{fontSize:12,color:"#9ca3af",marginBottom:14,fontWeight:600}}>Control which features are active</div>
        {loading?<div style={{fontSize:13,color:"#9ca3af",padding:"8px 0",fontWeight:600}}>Loading…</div>:
          AUTOS.map((a,idx)=>(
            <div key={a.key} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,padding:"11px 0",borderBottom:idx<AUTOS.length-1?"1px solid #f5f5f5":"none"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"#111",marginBottom:2}}>{a.label}</div>
                <div style={{fontSize:11,color:"#9ca3af",lineHeight:1.5,fontWeight:600}}>{a.desc}</div>
              </div>
              <button onClick={()=>updateSetting(a.key,!settings[a.key])} disabled={saving} aria-label={`Toggle ${a.label}`}
                style={{width:38,height:22,borderRadius:11,flexShrink:0,background:settings[a.key]?"#046EF2":"#e5e7eb",border:"none",cursor:saving?"not-allowed":"pointer",position:"relative",transition:"background 0.2s",marginTop:3}}>
                <span style={{position:"absolute",top:2,left:settings[a.key]?18:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.15)"}}/>
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const [,setParams]       = useSearchParams();
  const { profile }        = useAuth();
  const { plan, isActive } = useSubscription();
  const { messagesUsed, dailyLimit, messagesRemaining, usagePercent } = useAIUsage();
  const { aiContext, suggestions, pageLabel } = useAIContext();
  const isPro    = plan==="pro"&&isActive;
  const shopName = profile?.shopName||profile?.storeName||"Your Store";
  if (!isPro) return <LockedState onUpgrade={()=>setParams({tab:"subscription"})}/>;
  return (
    <div style={{padding:"24px 24px 40px",maxWidth:1080,margin:"0 auto"}}>
      <div style={{marginBottom:22}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0}}><Ico d={I.sparkle} size={15}/></div>
          <div style={{fontSize:22,fontWeight:900,color:"#111",letterSpacing:"-0.03em"}}>AI Copilot</div>
          <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"#eff6ff",color:"#046EF2",border:"1px solid #bfdbfe"}}>PRO</span>
        </div>
        <div style={{fontSize:13,color:"#9ca3af",fontWeight:600,paddingLeft:44}}>Your AI business assistant — helping with <strong style={{color:"#374151"}}>{pageLabel}</strong></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:18,alignItems:"start"}}>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden",display:"flex",flexDirection:"column",height:"calc(100vh - 210px)",minHeight:500}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#046EF2,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><Ico d={I.chat} size={14}/></div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#111"}}>Beme AI Copilot</div>
              <div style={{fontSize:11,color:"#9ca3af",fontWeight:600}}>Helping {shopName} grow</div>
            </div>
            <div style={{marginLeft:"auto"}}><span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0"}}>Online</span></div>
          </div>
          <ChatPanel aiContext={aiContext} suggestions={suggestions} pageLabel={pageLabel} shopName={shopName}/>
        </div>
        <SettingsPanel messagesUsed={messagesUsed} dailyLimit={dailyLimit} messagesRemaining={messagesRemaining} usagePercent={usagePercent}/>
      </div>
      <style>{`@media(max-width:768px){.ai-layout{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
