import { useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth }         from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { useAIUsage }      from "../../hooks/useAIUsage";
import { useAIChat }       from "../../hooks/useAIChat";
import { useAIContext }    from "../../hooks/useAIContext";

/* ─── Icon helper ─── */
function Ico({ d, size = 16, color = "currentColor", sw = 1.8, fill = "none" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  sparkle:  "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  send:     "M22 2L11 13|M22 2L15 22l-4-9-9-4 22-7z",
  paperclip:"M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
  image:    "M21 15l-5-5L5 21|M3 3h18v18H3z|M8.5 8.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0",
  copy:     "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z|M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 0 2 2v1",
  check:    "M20 6L9 17l-5-5",
  plus:     "M12 5v14|M5 12h14",
  x:        "M18 6L6 18|M6 6l12 12",
  lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z|M7 11V7a5 5 0 0 1 10 0v4",
  zap:      "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  bar:      "M18 20V10|M12 20V4|M6 20v-6",
  package:  "M16.5 9.4l-9-5.19|M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z|M3.27 6.96L12 12.01l8.73-5.05|M12 22.08V12",
  chat:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  file:     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6",
};

/* ─── Purple orb ─── */
function PurpleOrb() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" style={{ filter:"drop-shadow(0 8px 24px rgba(124,58,237,0.45))" }}>
      <defs>
        <radialGradient id="orbG" cx="38%" cy="32%" r="70%">
          <stop offset="0%"   stopColor="#d8b4fe"/>
          <stop offset="40%"  stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#3b0764"/>
        </radialGradient>
        <radialGradient id="orbSheen" cx="30%" cy="25%" r="45%">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.35)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      <circle cx="45" cy="45" r="42" fill="url(#orbG)"/>
      <ellipse cx="33" cy="29" rx="12" ry="8" fill="url(#orbSheen)"/>
    </svg>
  );
}

/* ─── Time greeting ─── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

/* ─── Example prompt cards ─── */
const EXAMPLES = [
  { icon: IC.zap,     label: "Boost sales",    text: "How can I increase my store sales this week?" },
  { icon: IC.package, label: "Products",       text: "Write a compelling product description for me" },
  { icon: IC.bar,     label: "Analytics",      text: "Explain my store performance in plain English" },
  { icon: IC.chat,    label: "Marketing",      text: "Generate an Instagram caption for my new product" },
];

/* ─── How Beme AI works cards ─── */
const HOW_IT_WORKS = [
  { icon: IC.sparkle, title: "Knows your store",   desc: "Beme AI reads your products, orders and analytics in real time." },
  { icon: IC.zap,     title: "Instant answers",    desc: "Ask anything — pricing, delivery, customers — and get a direct answer." },
  { icon: IC.package, title: "Writes for you",     desc: "Generate product descriptions, captions, and email copy in seconds." },
  { icon: IC.bar,     title: "Spots trends",       desc: "Understand what is selling, what is not, and what to do about it." },
];

/* ─── Topup modal ─── */
const PACKS = [
  { id:"small",          msgs:"50 messages",     price:"$1", ghs:"GHS 15" },
  { id:"medium",         msgs:"200 messages",    price:"$3", ghs:"GHS 45" },
  { id:"unlimited_week", msgs:"7-day unlimited", price:"$5", ghs:"GHS 75" },
];
function TopupModal({ onClose }) {
  const { user } = useAuth();
  const [bought, setBought] = useState(null);
  const [busy,   setBusy]   = useState(null);
  const buy = async (id) => {
    setBusy(id);
    try {
      const { addExtraCredits } = await import("../../services/aiUsageService");
      if (user?.uid) await addExtraCredits(user.uid, id);
      setBought(id);
      setTimeout(() => { onClose(); setBought(null); }, 1800);
    } catch(e) { console.error(e); } finally { setBusy(null); }
  };
  return (
    <div onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(6px)" }}>
      <div style={{ background:"var(--sd-white)",borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:360,border:"1px solid var(--sd-border)",boxShadow:"0 24px 64px rgba(0,0,0,0.18)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
          <div style={{ fontSize:17,fontWeight:800,color:"var(--sd-text)",letterSpacing:"-0.02em" }}>Top up messages</div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:22,color:"var(--sd-muted)",cursor:"pointer",lineHeight:1,padding:0 }}>×</button>
        </div>
        <div style={{ fontSize:13,color:"var(--sd-muted)",marginBottom:20 }}>Free messages reset at midnight.</div>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {PACKS.map(p=>(
            <button key={p.id} onClick={()=>buy(p.id)} disabled={!!busy||!!bought}
              style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",background:bought===p.id?"rgba(21,128,61,0.06)":"var(--sd-bg)",border:`1px solid ${bought===p.id?"rgba(21,128,61,0.2)":"var(--sd-border)"}`,borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:"var(--sd-font)" }}>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:"var(--sd-text)",marginBottom:2 }}>
                  {bought===p.id?"Credits added!":busy===p.id?"Processing…":p.msgs}
                </div>
                <div style={{ fontSize:12,color:"var(--sd-muted)" }}>{p.ghs}</div>
              </div>
              <div style={{ fontSize:14,fontWeight:800,color:"var(--sd-accent)",background:"var(--sd-accent-dim)",padding:"5px 12px",borderRadius:8 }}>{p.price}</div>
            </button>
          ))}
        </div>
        <div style={{ fontSize:11,color:"var(--sd-muted)",textAlign:"center",marginTop:16 }}>Secured by Paystack · Credits added instantly</div>
      </div>
    </div>
  );
}

/* ─── Single message bubble ─── */
function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copyText = () => {
    navigator.clipboard?.writeText(message.content || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:isUser?"flex-end":"flex-start", marginBottom:12, gap:4 }}>
      {/* Label */}
      <div style={{ fontSize:11,fontWeight:600,color:"var(--sd-muted)",paddingLeft:isUser?0:4,paddingRight:isUser?4:0 }}>
        {isUser ? "You" : "Beme AI"}
      </div>
      {/* Bubble — outline only, no fill */}
      <div style={{
        maxWidth:"82%",
        padding:"11px 14px",
        borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
        background: "transparent",
        border: `1px solid ${isUser ? "var(--sd-accent-border)" : "var(--sd-border)"}`,
        fontSize:13.5, lineHeight:1.75, color:"var(--sd-text)",
        fontFamily:"var(--sd-font)", whiteSpace:"pre-wrap", wordBreak:"break-word",
        position:"relative",
      }}>
        {message.content}
      </div>
      {/* Copy button — AI messages only */}
      {!isUser && (
        <button onClick={copyText}
          style={{ display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",color:copied?"#16a34a":"var(--sd-muted)",fontSize:11,fontWeight:500,padding:"2px 4px",borderRadius:6,fontFamily:"var(--sd-font)",transition:"color 0.15s" }}>
          {copied
            ? <><Ico d={IC.check} size={12} color="#16a34a" sw={2.5}/> Copied</>
            : <><Ico d={IC.copy}  size={12} color="var(--sd-muted)"/> Copy</>
          }
        </button>
      )}
    </div>
  );
}

/* ─── Typing indicator ─── */
function TypingDots() {
  return (
    <div style={{ display:"flex",alignItems:"flex-start",flexDirection:"column",gap:4,marginBottom:12 }}>
      <div style={{ fontSize:11,fontWeight:600,color:"var(--sd-muted)",paddingLeft:4 }}>Beme AI</div>
      <div style={{ padding:"11px 16px",border:"1px solid var(--sd-border)",borderRadius:"14px 14px 14px 4px",display:"flex",gap:5,alignItems:"center" }}>
        {[0,1,2].map(i=>(
          <span key={i} style={{ width:6,height:6,borderRadius:"50%",background:"var(--sd-muted)",display:"inline-block",animation:`beme-dot 1.2s ease ${i*0.2}s infinite` }}/>
        ))}
      </div>
      <style>{`@keyframes beme-dot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

/* ─── Attachment chip ─── */
function AttachChip({ name, onRemove }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  return (
    <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:100,border:"1px solid var(--sd-border)",background:"var(--sd-bg)",fontSize:12,fontWeight:600,color:"var(--sd-text)" }}>
      <Ico d={isImage ? IC.image : IC.file} size={12} color="var(--sd-muted)" />
      <span style={{ maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</span>
      <button onClick={onRemove} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--sd-muted)",padding:0,display:"flex",lineHeight:1 }}>
        <Ico d={IC.x} size={11} color="var(--sd-muted)" />
      </button>
    </div>
  );
}

/* ─── Shared input bar (used in both empty + chat states) ─── */
function InputBar({ input, setInput, onSend, isTyping, isAtLimit, onTopup, attachments, onAttach, onRemoveAttach, pageLabel }) {
  const fileRef  = useRef(null);
  const imageRef = useRef(null);

  const handleFile = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => onAttach(f));
    e.target.value = "";
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  return (
    <div style={{ width:"100%", maxWidth:680, margin:"0 auto" }}>
      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:8,paddingLeft:4 }}>
          {attachments.map((f,i) => (
            <AttachChip key={i} name={f.name} onRemove={() => onRemoveAttach(i)} />
          ))}
        </div>
      )}

      {/* Input box */}
      <div style={{
        background:"var(--sd-white)",
        border:"1px solid var(--sd-border)",
        borderRadius:16,
        boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
        overflow:"hidden",
        transition:"box-shadow 0.15s, border-color 0.15s",
      }}
        onFocusCapture={e => { e.currentTarget.style.boxShadow="0 0 0 3px rgba(124,58,237,0.10)"; e.currentTarget.style.borderColor="var(--sd-accent)"; }}
        onBlurCapture={e  => { e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor="var(--sd-border)"; }}>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={isAtLimit ? "Daily limit reached. Top up to continue." : `Ask me anything about ${pageLabel}…`}
          rows={1} disabled={isTyping || isAtLimit}
          style={{ display:"block",width:"100%",padding:"14px 16px 10px",border:"none",background:"transparent",color:"var(--sd-text)",fontSize:14,outline:"none",resize:"none",lineHeight:1.6,maxHeight:160,overflowY:"auto",fontFamily:"var(--sd-font)",boxSizing:"border-box" }}
          onInput={e => { e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,160)+"px"; }} />

        {/* Bottom action row */}
        <div style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderTop:"1px solid var(--sd-border-light)" }}>
          {/* Attach file */}
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx" style={{ display:"none" }} onChange={handleFile} />
          <button onClick={() => fileRef.current?.click()}
            style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,border:"1px solid var(--sd-border)",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--sd-muted)",fontFamily:"var(--sd-font)",transition:"background 0.1s,color 0.1s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="var(--sd-border-light)";e.currentTarget.style.color="var(--sd-text)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--sd-muted)";}}>
            <Ico d={IC.paperclip} size={13} color="currentColor"/>
            Attach
          </button>

          {/* Attach image */}
          <input ref={imageRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile} />
          <button onClick={() => imageRef.current?.click()}
            style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,border:"1px solid var(--sd-border)",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--sd-muted)",fontFamily:"var(--sd-font)",transition:"background 0.1s,color 0.1s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="var(--sd-border-light)";e.currentTarget.style.color="var(--sd-text)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--sd-muted)";}}>
            <Ico d={IC.image} size={13} color="currentColor"/>
            Image
          </button>

          <div style={{ flex:1 }}/>

          {/* Messages left pill */}
          {isAtLimit ? (
            <button onClick={onTopup}
              style={{ padding:"5px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.06)",color:"#dc2626",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--sd-font)" }}>
              Top up →
            </button>
          ) : null}

          {/* Send */}
          <button onClick={onSend} disabled={(!input.trim() && attachments.length===0) || isTyping || isAtLimit}
            style={{ width:36,height:36,borderRadius:10,border:"none",flexShrink:0,
              background:(input.trim()||attachments.length>0)&&!isTyping&&!isAtLimit?"var(--sd-accent)":"var(--sd-border)",
              cursor:(input.trim()||attachments.length>0)&&!isTyping&&!isAtLimit?"pointer":"not-allowed",
              display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s" }}>
            <Ico d={IC.send} size={14} color={(input.trim()||attachments.length>0)&&!isTyping&&!isAtLimit?"#fff":"var(--sd-muted)"} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
export default function AIAssistant() {
  const [, setParams]    = useSearchParams();
  const { profile, user } = useAuth();
  const { plan }          = useSubscription();
  const { messagesUsed, dailyLimit, messagesRemaining, isAtLimit, isNearLimit, usagePercent } = useAIUsage();
  const { aiContext, suggestions, pageLabel } = useAIContext();

  const [showTopup,    setShowTopup]    = useState(false);
  const [attachments,  setAttachments]  = useState([]);
  const [chatKey,      setChatKey]      = useState(0); // increment to reset chat

  const { messages, input, setInput, isTyping, error, histLoading, bottomRef, sendMessage } =
    useAIChat({ aiContext, onLimitReached: () => setShowTopup(true), key: chatKey });

  const shopName   = profile?.shopName || profile?.storeName || "Your Store";
  const firstName  = shopName.split(" ")[0];
  const isEmpty    = !histLoading && messages.length === 0;
  const barColor   = usagePercent >= 100 ? "#ef4444" : usagePercent >= 80 ? "#f59e0b" : "var(--sd-accent)";

  const addAttachment  = (f) => setAttachments(a => [...a, f]);
  const removeAttachment = (i) => setAttachments(a => a.filter((_,j) => j!==i));

  const handleSend = useCallback((override) => {
    const text = override || input;
    if (!text.trim() && attachments.length === 0) return;
    const withAttach = attachments.length > 0
      ? `${text}\n\n[Attachments: ${attachments.map(f=>f.name).join(", ")}]`
      : text;
    sendMessage(withAttach);
    setAttachments([]);
  }, [input, attachments, sendMessage]);

  const newChat = () => {
    setChatKey(k => k + 1);
    setInput("");
    setAttachments([]);
  };

  return (
    <div style={{ fontFamily:"var(--sd-font)", display:"flex", flexDirection:"column", height:"calc(100vh - 112px)", minHeight:0 }}>

      {/* ── Top bar ── */}
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16,flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,var(--sd-accent),#9333ea)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff" }}>
            <Ico d={IC.sparkle} size={15}/>
          </div>
          <span style={{ fontSize:18,fontWeight:800,color:"var(--sd-text)",letterSpacing:"-0.03em" }}>Beme AI</span>
          <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:100,background:"var(--sd-accent-dim)",color:"var(--sd-accent)",border:"1px solid var(--sd-accent-border)" }}>PRO</span>
        </div>
        <div style={{ flex:1 }}/>
        {/* Messages left indicator */}
        <div style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:100,border:"1px solid var(--sd-border)",background:"var(--sd-white)",fontSize:12,fontWeight:600,color:"var(--sd-muted)" }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:barColor }}/>
          {isAtLimit ? "Limit reached" : `${messagesRemaining} / ${dailyLimit} left`}
        </div>
        {/* New chat */}
        {!isEmpty && (
          <button onClick={newChat}
            style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:9,border:"1px solid var(--sd-border)",background:"var(--sd-white)",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--sd-text)",fontFamily:"var(--sd-font)",transition:"background 0.1s" }}
            onMouseEnter={e=>e.currentTarget.style.background="var(--sd-border-light)"}
            onMouseLeave={e=>e.currentTarget.style.background="var(--sd-white)"}>
            <Ico d={IC.plus} size={13} color="var(--sd-muted)"/>
            New chat
          </button>
        )}
      </div>

      {/* ══════════════════════ EMPTY STATE ══════════════════════ */}
      {isEmpty ? (
        <div style={{ flex:1,overflowY:"auto",display:"flex",flexDirection:"column",alignItems:"center",paddingBottom:24 }}>

          {/* Orb + greeting */}
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",paddingTop:16,paddingBottom:32 }}>
            <div style={{ marginBottom:20 }}><PurpleOrb/></div>
            <div style={{ fontSize:28,fontWeight:900,color:"var(--sd-text)",letterSpacing:"-0.04em",lineHeight:1.2,marginBottom:6 }}>
              {greeting()}, {firstName}
            </div>
            <div style={{ fontSize:18,fontWeight:700,color:"var(--sd-text)",letterSpacing:"-0.02em",marginBottom:4 }}>
              What's on{" "}
              <span style={{ color:"var(--sd-accent)" }}>your mind?</span>
            </div>
            <div style={{ fontSize:13,color:"var(--sd-muted)",maxWidth:300,lineHeight:1.6 }}>
              Ask me anything about your store, products, orders, or marketing.
            </div>
          </div>

          {/* Central input */}
          <div style={{ width:"100%",maxWidth:680,marginBottom:16,padding:"0 4px" }}>
            <InputBar
              input={input} setInput={setInput}
              onSend={handleSend} isTyping={isTyping}
              isAtLimit={isAtLimit} onTopup={() => setShowTopup(true)}
              attachments={attachments} onAttach={addAttachment}
              onRemoveAttach={removeAttachment} pageLabel={pageLabel}/>
          </div>

          {/* Usage bar below input */}
          <div style={{ width:"100%",maxWidth:680,marginBottom:28,padding:"0 4px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5,fontSize:11,color:"var(--sd-muted)" }}>
              <span>{isAtLimit ? "Daily limit reached" : `${messagesUsed} of ${dailyLimit} messages used today`}</span>
              <button onClick={() => setShowTopup(true)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--sd-accent)",fontWeight:700,fontFamily:"var(--sd-font)",padding:0 }}>
                Get more →
              </button>
            </div>
            <div style={{ height:3,background:"var(--sd-border)",borderRadius:4,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${usagePercent}%`,background:barColor,borderRadius:4,transition:"width 0.4s ease" }}/>
            </div>
          </div>

          {/* Example prompts */}
          <div style={{ width:"100%",maxWidth:680,padding:"0 4px",marginBottom:32 }}>
            <div style={{ fontSize:10,fontWeight:700,color:"var(--sd-muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12 }}>
              Get started with an example
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10 }}>
              {EXAMPLES.map((ex,i) => (
                <button key={i} onClick={() => handleSend(ex.text)}
                  style={{ display:"flex",flexDirection:"column",alignItems:"flex-start",gap:10,padding:"16px",borderRadius:12,border:"1px solid var(--sd-border)",background:"var(--sd-white)",cursor:"pointer",textAlign:"left",fontFamily:"var(--sd-font)",transition:"border-color 0.15s,box-shadow 0.15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--sd-accent-border)";e.currentTarget.style.boxShadow="0 0 0 3px var(--sd-accent-dim)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--sd-border)";e.currentTarget.style.boxShadow="none";}}>
                  <div style={{ width:32,height:32,borderRadius:8,background:"var(--sd-bg)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <Ico d={ex.icon} size={15} color="var(--sd-accent)"/>
                  </div>
                  <div>
                    <div style={{ fontSize:11,fontWeight:700,color:"var(--sd-muted)",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.06em" }}>{ex.label}</div>
                    <div style={{ fontSize:13,fontWeight:500,color:"var(--sd-text2)",lineHeight:1.5 }}>{ex.text}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ width:"100%",maxWidth:680,padding:"0 4px" }}>
            <div style={{ fontSize:10,fontWeight:700,color:"var(--sd-muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12 }}>
              How Beme AI works
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10 }}>
              {HOW_IT_WORKS.map((h,i) => (
                <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"14px",borderRadius:12,background:"var(--sd-white)",border:"1px solid var(--sd-border)" }}>
                  <div style={{ width:28,height:28,borderRadius:7,background:"var(--sd-accent-dim)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <Ico d={h.icon} size={13} color="var(--sd-accent)"/>
                  </div>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:"var(--sd-text)",marginBottom:2 }}>{h.title}</div>
                    <div style={{ fontSize:11,color:"var(--sd-muted)",lineHeight:1.55 }}>{h.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      ) : (
      /* ══════════════════════ CHAT STATE ══════════════════════ */
        <div style={{ flex:1,display:"flex",flexDirection:"column",minHeight:0 }}>

          {/* Messages */}
          <div style={{ flex:1,overflowY:"auto",padding:"4px 0 16px" }}>
            {histLoading ? (
              <div style={{ textAlign:"center",color:"var(--sd-muted)",fontSize:13,padding:32 }}>Loading…</div>
            ) : (
              messages.map((m,i) => <MessageBubble key={m.id||i} message={m}/>)
            )}
            {isTyping && <TypingDots/>}
            {error && (
              <div style={{ fontSize:12,color:"#ef4444",textAlign:"center",padding:"8px 12px",background:"rgba(239,68,68,0.06)",borderRadius:8,margin:"8px 0" }}>{error}</div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Usage bar */}
          <div style={{ marginBottom:10,flexShrink:0 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5,fontSize:11,color:"var(--sd-muted)" }}>
              <span>{isAtLimit ? "Daily limit reached" : `${messagesUsed} / ${dailyLimit} messages used today · Resets at midnight`}</span>
              {isNearLimit && !isAtLimit && <span style={{ color:"#f59e0b",fontWeight:600 }}>{messagesRemaining} left</span>}
              <button onClick={() => setShowTopup(true)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--sd-accent)",fontWeight:700,fontFamily:"var(--sd-font)",padding:0,marginLeft:8 }}>
                Top up →
              </button>
            </div>
            <div style={{ height:2,background:"var(--sd-border)",borderRadius:4,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${usagePercent}%`,background:barColor,borderRadius:4,transition:"width 0.4s ease" }}/>
            </div>
          </div>

          {/* Input */}
          <div style={{ flexShrink:0 }}>
            <InputBar
              input={input} setInput={setInput}
              onSend={handleSend} isTyping={isTyping}
              isAtLimit={isAtLimit} onTopup={() => setShowTopup(true)}
              attachments={attachments} onAttach={addAttachment}
              onRemoveAttach={removeAttachment} pageLabel={pageLabel}/>
          </div>
        </div>
      )}

      {showTopup && <TopupModal onClose={() => setShowTopup(false)}/>}
    </div>
  );
}