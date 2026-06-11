import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth }         from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { useSellerAuth } from "../../hooks/useSellerAuth";
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
  sparkle:   "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  send:      "M22 2L11 13|M22 2L15 22l-4-9-9-4 22-7z",
  paperclip: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
  image:     "M21 15l-5-5L5 21|M3 3h18v18H3z|M8.5 8.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0",
  copy:      "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z|M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 0 2 2v1",
  check:     "M20 6L9 17l-5-5",
  plus:      "M12 5v14|M5 12h14",
  x:         "M18 6L6 18|M6 6l12 12",
  retry:     "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8|M3 3v5h5",
  edit:      "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7|M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  file:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6",
  zap:       "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  bar:       "M18 20V10|M12 20V4|M6 20v-6",
  package:   "M16.5 9.4l-9-5.19|M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z|M3.27 6.96L12 12.01l8.73-5.05|M12 22.08V12",
  chat:      "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
};

/* ══════════════════════════════════════
   ANIMATED ORB  — rotating gradient
   waves behind it, orb spins slowly
══════════════════════════════════════ */
function AnimatedOrb({ size = 72 }) {
  const s = size;
  return (
    <div style={{ position:"relative", width:s, height:s, flexShrink:0 }}>
      {/* Wave ring 3 — outermost, slowest */}
      <div style={{
        position:"absolute",
        inset: -s * 0.42,
        borderRadius:"50%",
        background:"conic-gradient(from 0deg,#7c3aed18,#a78bfa44,#7c3aed18,#6d28d944,#7c3aed18)",
        animation:"orb-spin-r 9s linear infinite",
        zIndex:0,
      }}/>
      {/* Wave ring 2 */}
      <div style={{
        position:"absolute",
        inset: -s * 0.22,
        borderRadius:"50%",
        background:"conic-gradient(from 120deg,#9333ea33,#c4b5fd66,#9333ea33,#7c3aed55,#9333ea33)",
        animation:"orb-spin 6s linear infinite",
        zIndex:0,
      }}/>
      {/* Wave ring 1 — innermost */}
      <div style={{
        position:"absolute",
        inset: -s * 0.08,
        borderRadius:"50%",
        background:"conic-gradient(from 240deg,#7c3aed55,#ddd6fe88,#7c3aed55)",
        animation:"orb-spin-r 4s linear infinite",
        zIndex:0,
      }}/>
      {/* Main orb */}
      <div style={{
        position:"relative", zIndex:1,
        width:"100%", height:"100%",
        borderRadius:"50%",
        background:"linear-gradient(135deg,#c4b5fd 0%,#7c3aed 45%,#3b0764 100%)",
        boxShadow:"0 6px 28px rgba(124,58,237,0.5)",
        display:"flex", alignItems:"center", justifyContent:"center",
        animation:"orb-spin 8s linear infinite",
      }}>
        {/* Inner sheen */}
        <div style={{
          position:"absolute", top:"12%", left:"14%",
          width:"38%", height:"30%",
          borderRadius:"50%",
          background:"radial-gradient(circle,rgba(255,255,255,0.45),rgba(255,255,255,0))",
          pointerEvents:"none",
        }}/>
        <svg width={s * 0.42} height={s * 0.42} viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
        </svg>
      </div>
    </div>
  );
}

/* ─── Mini orb for header / bubble avatar ─── */
function MiniOrb({ size = 28 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:"linear-gradient(135deg,#c4b5fd,#7c3aed,#4f46e5)",
      display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow:"0 2px 10px rgba(124,58,237,0.4)",
      animation:"orb-spin 8s linear infinite",
    }}>
      <svg width={size*0.52} height={size*0.52} viewBox="0 0 24 24" fill="none"
        stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
      </svg>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const EXAMPLES = [
  { icon: IC.zap,     label: "Boost sales",  text: "How can I increase my store sales this week?" },
  { icon: IC.package, label: "Products",     text: "Write a compelling product description for me" },
  { icon: IC.bar,     label: "Analytics",    text: "Explain my store performance in plain English" },
  { icon: IC.chat,    label: "Marketing",    text: "Generate an Instagram caption for my new product" },
];

const HOW_IT_WORKS = [
  { icon: IC.sparkle, title: "Knows your store",  desc: "Reads your products, orders and analytics in real time." },
  { icon: IC.zap,     title: "Instant answers",   desc: "Ask anything — pricing, delivery, customers." },
  { icon: IC.package, title: "Writes for you",    desc: "Product descriptions, captions, emails in seconds." },
  { icon: IC.bar,     title: "Spots trends",      desc: "Understand what's selling and what to do about it." },
];

/* ─── Markdown-lite renderer ─── */
function Markdown({ text, isUser }) {
  if (!text) return null;
  const boldify = (s) =>
    s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
     .replace(/\*(.*?)\*/g, "<em>$1</em>");

  const lines = text.split("\n");
  const out   = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, "")); i++; }
      out.push(<ol key={i} style={{ margin:"6px 0", paddingLeft:20, lineHeight:1.8 }}>
        {items.map((it,j) => <li key={j} dangerouslySetInnerHTML={{ __html: boldify(it) }}/>)}
      </ol>);
      continue;
    }
    if (/^[-•*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i])) { items.push(lines[i].replace(/^[-•*]\s/, "")); i++; }
      out.push(<ul key={i} style={{ margin:"6px 0", paddingLeft:20, lineHeight:1.8 }}>
        {items.map((it,j) => <li key={j} dangerouslySetInnerHTML={{ __html: boldify(it) }}/>)}
      </ul>);
      continue;
    }
    if (line.trim() === "") { out.push(<div key={i} style={{ height:6 }}/>); }
    else { out.push(<div key={i} style={{ lineHeight:1.75 }} dangerouslySetInnerHTML={{ __html: boldify(line) }}/>); }
    i++;
  }
  return <>{out}</>;
}

/* ─── Message bubble ─── */
function MessageBubble({ message, onRetry }) {
  const [copied,  setCopied]  = useState(false);
  const [hovered, setHovered] = useState(false);
  const isUser = message.role === "user";

  const copy = () => {
    navigator.clipboard?.writeText(message.content || "").then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`ai-row${isUser ? " ai-row--user" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {!isUser && <div style={{ flexShrink:0, marginTop:2 }}><MiniOrb size={28}/></div>}

      <div className={`ai-bubble${isUser ? " ai-bubble--user" : " ai-bubble--ai"}`}>
        <Markdown text={message.content} isUser={isUser}/>

        {/* Hover actions — pinned bottom-right inside bubble */}
        <div className="ai-bubble-acts" style={{ opacity: hovered ? 1 : 0 }}>
          {!isUser && onRetry && (
            <button className="ai-act-btn" onClick={onRetry} title="Regenerate">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          )}
          {isUser && (
            <button className="ai-act-btn" title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          )}
          <button className="ai-act-btn" onClick={copy} title={copied ? "Copied!" : "Copy"}
            style={{ color: copied ? "#16a34a" : undefined }}>
            {copied
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 0 2 2v1"/></svg>
            }
          </button>
        </div>
      </div>

      {isUser && <div style={{ flexShrink:0, width:28 }}/>}
    </div>
  );
}

/* ─── Typing dots ─── */
function TypingDots() {
  return (
    <div className="ai-row">
      <div style={{ flexShrink:0, marginTop:2 }}><MiniOrb size={28}/></div>
      <div className="ai-bubble ai-bubble--ai ai-bubble--typing">
        {[0,1,2].map(i => (
          <span key={i} style={{ width:7,height:7,borderRadius:"50%",background:"var(--sd-muted)",display:"inline-block",animation:`ai-dot 1.2s ease ${i*0.2}s infinite` }}/>
        ))}
      </div>
    </div>
  );
}

/* ─── Attach chip ─── */
function AttachChip({ name, onRemove }) {
  const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  return (
    <div style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:100,border:"1px solid var(--sd-border)",background:"var(--sd-white)",fontSize:11,fontWeight:600,color:"var(--sd-text)" }}>
      <Ico d={isImg ? IC.image : IC.file} size={11} color="var(--sd-muted)"/>
      <span style={{ maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</span>
      <button onClick={onRemove} style={{ background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",lineHeight:1 }}>
        <Ico d={IC.x} size={10} color="var(--sd-muted)"/>
      </button>
    </div>
  );
}

/* ─── Input bar ─── */
function InputBar({ input, setInput, onSend, isTyping, isAtLimit, onTopup, attachments, onAttach, onRemoveAttach, pageLabel }) {
  const fileRef    = useRef(null);
  const imageRef   = useRef(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleFile = (e) => {
    Array.from(e.target.files || []).forEach(f => onAttach(f));
    e.target.value = "";
    setShowMenu(false);
  };

  const canSend = (input.trim() || attachments.length > 0) && !isTyping && !isAtLimit;

  return (
    <div className="ai-input-shell">
      {attachments.length > 0 && (
        <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:8 }}>
          {attachments.map((f,i) => <AttachChip key={i} name={f.name} onRemove={() => onRemoveAttach(i)}/>)}
        </div>
      )}

      <div className="ai-input-box">
        {/* Hidden file inputs */}
        <input ref={fileRef}  type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx" style={{ display:"none" }} onChange={handleFile}/>
        <input ref={imageRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFile}/>

        {/* + button with popup */}
        <div style={{ position:"relative", flexShrink:0 }}>
          <button
            className={`ai-plus-btn${showMenu ? " ai-plus-btn--open" : ""}`}
            onClick={() => setShowMenu(m => !m)}
            title="Add attachment">
            <Ico d={IC.plus} size={15} color={showMenu ? "var(--sd-accent)" : "var(--sd-muted)"}/>
          </button>

          {showMenu && (
            <>
              {/* invisible backdrop */}
              <div style={{ position:"fixed", inset:0, zIndex:999 }} onClick={() => setShowMenu(false)}/>
              {/* popup card */}
              <div className="ai-attach-menu">
                <button className="ai-attach-option" onClick={() => { setShowMenu(false); fileRef.current?.click(); }}>
                  <div className="ai-attach-opt-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <path d="M14 2v6h6"/>
                      <path d="M12 18v-6M9 15l3-3 3 3"/>
                    </svg>
                  </div>
                  <div>
                    <div className="ai-attach-opt-title">Upload file</div>
                    <div className="ai-attach-opt-sub">PDF, DOC, TXT, CSV, XLSX</div>
                  </div>
                </button>
                <button className="ai-attach-option" onClick={() => { setShowMenu(false); imageRef.current?.click(); }}>
                  <div className="ai-attach-opt-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                  </div>
                  <div>
                    <div className="ai-attach-opt-title">Upload image</div>
                    <div className="ai-attach-opt-sub">JPG, PNG, WEBP, GIF, SVG</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Textarea */}
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder={isAtLimit ? "Daily limit reached — top up to continue" : "Ask anything…"}
          rows={1} disabled={isTyping || isAtLimit}
          className="ai-textarea"
          onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px"; }}
        />

        {/* Send / top-up */}
        {isAtLimit
          ? <button className="ai-topup-inline" onClick={onTopup}>Top up</button>
          : <button className="ai-send-btn" onClick={onSend} disabled={!canSend}
              style={{ background: canSend ? "var(--sd-accent)" : "var(--sd-border)" }}>
              <Ico d={IC.send} size={14} color={canSend ? "#fff" : "var(--sd-muted)"}/>
            </button>
        }
      </div>

      <div className="ai-input-hint">Beme AI can make mistakes. Verify important info.</div>
    </div>
  );
}

/* ─── Topup modal ─── */
const PACKS = [
  { id:"small",          msgs:"50 messages",     price:"GHS 15", desc:"One-time top up" },
  { id:"medium",         msgs:"200 messages",    price:"GHS 45", desc:"Best value"      },
  { id:"unlimited_week", msgs:"7-day unlimited", price:"GHS 75", desc:"Power user"      },
];

function TopupModal({ onClose, plan }) {
  const { user }  = useAuth();
  const [busy,    setBusy]    = useState(null);
  const [error,   setError]   = useState("");
  const API = import.meta.env.VITE_BACKEND_URL || "https://beme-market-1.onrender.com";

  const canTopup = plan && plan !== "basic" && plan !== "free";

  const buy = async (id) => {
    if (!canTopup) return;
    setBusy(id); setError("");
    try {
      const token = await (await import("firebase/auth")).getAuth().currentUser.getIdToken(true);
      const res   = await fetch(`${API}/api/paystack/topup/init`, {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body:    JSON.stringify({ pack: id }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        // Redirect to Paystack
        window.location.href = data.authorization_url;
      } else {
        setError(data.error || "Failed to initialize payment.");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(6px)" }}>
      <div style={{ background:"var(--sd-white)",borderRadius:20,padding:"26px 22px",width:"100%",maxWidth:360,border:"1px solid var(--sd-border)",boxShadow:"0 24px 64px rgba(0,0,0,0.18)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
          <div style={{ fontSize:16,fontWeight:800,color:"var(--sd-text)" }}>Top up messages</div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:22,color:"var(--sd-muted)",cursor:"pointer",lineHeight:1,padding:0 }}>×</button>
        </div>
        <div style={{ fontSize:12,color:"var(--sd-muted)",marginBottom:18 }}>Free messages reset daily. Purchase extra credits below.</div>

        {!canTopup ? (
          <div style={{ padding:"16px",borderRadius:12,background:"var(--sd-accent-dim)",border:"1px solid rgba(124,58,237,0.2)",textAlign:"center" }}>
            <div style={{ fontSize:14,fontWeight:700,color:"var(--sd-accent)",marginBottom:6 }}>Upgrade your plan</div>
            <div style={{ fontSize:13,color:"var(--sd-muted)",marginBottom:12 }}>AI features are available on Starter, Growth, and Pro plans.</div>
            <button onClick={onClose} style={{ padding:"8px 20px",borderRadius:9,background:"var(--sd-accent)",color:"#fff",border:"none",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
              View Plans
            </button>
          </div>
        ) : (
          <>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {PACKS.map(p => (
                <button key={p.id} onClick={() => buy(p.id)} disabled={!!busy}
                  style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"var(--sd-bg,var(--sd-white))",border:"1px solid var(--sd-border)",borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:"var(--sd-font)",opacity:busy?0.6:1 }}>
                  <div>
                    <div style={{ fontSize:14,fontWeight:700,color:"var(--sd-text)",marginBottom:2 }}>
                      {busy===p.id ? "Redirecting to payment…" : p.msgs}
                    </div>
                    <div style={{ fontSize:11,color:"var(--sd-muted)" }}>{p.desc}</div>
                  </div>
                  <div style={{ fontSize:13,fontWeight:800,color:"var(--sd-accent)",background:"var(--sd-accent-dim)",padding:"4px 10px",borderRadius:7,flexShrink:0 }}>{p.price}</div>
                </button>
              ))}
            </div>
            {error && <div style={{ marginTop:10,fontSize:12,color:"#ef4444",fontWeight:600 }}>{error}</div>}
            <div style={{ fontSize:11,color:"var(--sd-muted)",textAlign:"center",marginTop:14 }}>Secured by Paystack · Credits added after payment</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN
════════════════════════════════════════ */
export default function AIAssistant() {
  const [, setParams]     = useSearchParams();
  const { profile, user } = useAuth();
  const { plan }          = useSubscription();
  const { subscriptionPlan, planLimits } = useSellerAuth();
  const { messagesUsed, dailyLimit, messagesRemaining, isAtLimit, isNearLimit, usagePercent } = useAIUsage();
  const { aiContext, suggestions, pageLabel } = useAIContext();

  const [showTopup,   setShowTopup]   = useState(false);
  const [topupMsg,    setTopupMsg]    = useState("");

  // Handle return from Paystack topup payment
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const topupRef = params.get("topup_ref");
    if (!topupRef || !topupRef.startsWith("topup_")) return;

    const API = import.meta.env.VITE_BACKEND_URL || "https://beme-market-1.onrender.com";
    // Remove param from URL without reload
    const newUrl = window.location.pathname + "?tab=ai";
    window.history.replaceState({}, "", newUrl);

    (async () => {
      try {
        const res  = await fetch(`${API}/api/paystack/topup/verify?reference=${encodeURIComponent(topupRef)}`);
        const data = await res.json();
        if (data.success) {
          setTopupMsg(`✅ ${data.credits} messages added to your account!`);
          setTimeout(() => setTopupMsg(""), 5000);
        }
      } catch {}
    })();
  }, []);
  const [attachments, setAttachments] = useState([]);
  const [chatKey,     setChatKey]     = useState(0);

  const { messages, input, setInput, isTyping, error, histLoading, bottomRef, sendMessage } =
    useAIChat({ aiContext, onLimitReached: () => setShowTopup(true), key: chatKey });

  const shopName  = profile?.shopName || profile?.storeName || "Your Store";
  const firstName = shopName.split(" ")[0];
  const isEmpty   = !histLoading && messages.length === 0;
  const noAccess  = !planLimits?.hasAI && subscriptionPlan;
  const barColor  = usagePercent >= 100 ? "#ef4444" : usagePercent >= 80 ? "#f59e0b" : "var(--sd-accent)";

  const addAttachment    = (f) => setAttachments(a => [...a, f]);
  const removeAttachment = (i) => setAttachments(a => a.filter((_, j) => j !== i));

  const handleSend = useCallback((override) => {
    const text = override || input;
    if (!text.trim() && attachments.length === 0) return;
    sendMessage(attachments.length > 0 ? `${text}\n\n[Attachments: ${attachments.map(f=>f.name).join(", ")}]` : text);
    setAttachments([]);
  }, [input, attachments, sendMessage]);

  const newChat = () => { setChatKey(k => k + 1); setInput(""); setAttachments([]); };

  return (
    <div className="ai-root">

      {/* ══ HEADER ══ */}
      <div className="ai-header">
        <div className="ai-hdr-left">
          <MiniOrb size={30}/>
          <span className="ai-hdr-title">Beme AI</span>
          <span className="ai-pro-badge">PRO</span>
        </div>
        <div className="ai-hdr-right">
          {topupMsg && <div style={{ fontSize:11,color:"#16a34a",fontWeight:700,padding:"3px 10px",background:"rgba(21,128,61,0.08)",borderRadius:100,border:"1px solid rgba(21,128,61,0.2)" }}>{topupMsg}</div>}
          {/* Usage pill — hidden on mobile */}
          <div className="ai-usage-pill">
            <div style={{ width:6,height:6,borderRadius:"50%",background:barColor,flexShrink:0 }}/>
            <span>{isAtLimit ? "Limit reached" : `${messagesRemaining} / ${dailyLimit} left`}</span>
          </div>
          {/* New chat — desktop text, mobile icon */}
          {!isEmpty && <>
            <button onClick={newChat} className="ai-newchat-text">
              <Ico d={IC.plus} size={13} color="var(--sd-muted)"/> New chat
            </button>
            <button onClick={newChat} className="ai-newchat-icon" title="New chat">
              <Ico d={IC.plus} size={16} color="var(--sd-text)"/>
            </button>
          </>}
        </div>
      </div>

      {/* ══ SCROLL AREA ══ */}
      <div className="ai-scroll">
        {noAccess ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"40px 24px" }}>
            <div style={{ fontSize:56, marginBottom:20 }}>🔒</div>
            <div style={{ fontSize:20, fontWeight:900, color:"var(--sd-text)", marginBottom:10, letterSpacing:"-0.02em" }}>Beme AI is not available on your plan</div>
            <div style={{ fontSize:14, color:"var(--sd-muted)", maxWidth:320, lineHeight:1.7, marginBottom:28 }}>Upgrade to Starter, Growth, or Pro to access AI features including product descriptions, marketing copy, and store analytics.</div>
            <button style={{ padding:"12px 28px", borderRadius:12, background:"var(--sd-accent)", color:"#fff", border:"none", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit", letterSpacing:"-0.01em" }}
              onClick={() => { window.dispatchEvent(new CustomEvent("beme:nav", { detail:"subscription" })); }}>
              Upgrade Plan →
            </button>
          </div>
        ) : isEmpty ? (
          /* ── Empty state ── */
          <div className="ai-empty">
            <AnimatedOrb size={72}/>
            <div className="ai-empty-greeting">{greeting()}, {firstName}</div>
            <div className="ai-empty-tagline">What's on <span style={{ color:"var(--sd-accent)" }}>your mind?</span></div>
            <div className="ai-empty-hint">Ask me anything about your store, products, orders, or marketing.</div>

            <div className="ai-section-lbl">Get started</div>
            <div className="ai-examples-grid">
              {EXAMPLES.map((ex,i) => (
                <button key={i} className="ai-example-card" onClick={() => handleSend(ex.text)}>
                  <div className="ai-example-icon"><Ico d={ex.icon} size={14} color="var(--sd-accent)"/></div>
                  <div className="ai-example-txt">{ex.text}</div>
                </button>
              ))}
            </div>

            <div className="ai-section-lbl" style={{ marginTop:24 }}>How Beme AI works</div>
            <div className="ai-how-grid">
              {HOW_IT_WORKS.map((h,i) => (
                <div key={i} className="ai-how-card">
                  <div className="ai-how-icon"><Ico d={h.icon} size={13} color="var(--sd-accent)"/></div>
                  <div>
                    <div className="ai-how-title">{h.title}</div>
                    <div className="ai-how-desc">{h.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Messages ── */
          <div className="ai-messages">
            {histLoading
              ? <div className="ai-loading">Loading…</div>
              : messages.map((m,i) => (
                  <MessageBubble key={m.id||i} message={m}
                    onRetry={m.role!=="user"
                      ? () => sendMessage(messages.filter(x=>x.role==="user").slice(-1)[0]?.content||"")
                      : null}/>
                ))
            }
            {isTyping && <TypingDots/>}
            {error && <div className="ai-error">{error}</div>}
            <div ref={bottomRef}/>
          </div>
        )}
      </div>

      {/* ══ PINNED INPUT ══ */}
      {!noAccess && <div className="ai-bottom">
        {/* Thin usage bar */}
        <div className="ai-bar-row">
          <div style={{ flex:1,height:2,background:"var(--sd-border)",borderRadius:2,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${usagePercent}%`,background:barColor,borderRadius:2,transition:"width .4s" }}/>
          </div>
          <span className="ai-bar-lbl">
            {isAtLimit ? "Limit reached" : `${messagesUsed}/${dailyLimit} used`}
          </span>
          <button onClick={() => setShowTopup(true)} className="ai-bar-topup">Top up</button>
        </div>

        <InputBar
          input={input} setInput={setInput}
          onSend={handleSend} isTyping={isTyping}
          isAtLimit={isAtLimit} onTopup={() => setShowTopup(true)}
          attachments={attachments} onAttach={addAttachment}
          onRemoveAttach={removeAttachment} pageLabel={pageLabel}/>
      </div>

      }
      {showTopup && <TopupModal onClose={() => setShowTopup(false)} plan={subscriptionPlan}/>}

      {/* ══ STYLES ══ */}
      <style>{`
        /* ── Keyframes ── */
        @keyframes orb-spin   { from{transform:rotate(0)}   to{transform:rotate(360deg)} }
        @keyframes orb-spin-r { from{transform:rotate(0)}   to{transform:rotate(-360deg)} }
        @keyframes ai-dot     { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
        @keyframes ai-shimmer { 0%{background-position:-600px 0} 100%{background-position:calc(600px+100%) 0} }

        /* ── Root: fills sd-content, flex column, no overflow ── */
        .ai-root {
          display: flex; flex-direction: column;
          height: calc(100vh - var(--sd-topbar-h,56px) - 48px);
          min-height: 0;
          font-family: var(--sd-font,'DM Sans',system-ui,sans-serif);
          color: var(--sd-text);
          background: var(--sd-white);
        }

        /* ── Header ── */
        .ai-header {
          display: flex; align-items: center; justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--sd-border-light);
          flex-shrink: 0;
        }
        .ai-hdr-left  { display:flex; align-items:center; gap:8px; }
        .ai-hdr-right { display:flex; align-items:center; gap:8px; }
        .ai-hdr-title { font-size:17px; font-weight:800; color:var(--sd-text); letter-spacing:-.03em; }
        .ai-pro-badge {
          font-size:9px; font-weight:800; padding:2px 7px; border-radius:100px;
          background:var(--sd-accent-dim); color:var(--sd-accent);
          border:1px solid var(--sd-accent-border); letter-spacing:.04em;
        }

        /* Usage pill: hidden on mobile, visible on desktop */
        .ai-usage-pill {
          display: none;
          align-items:center; gap:5px; padding:4px 10px; border-radius:100px;
          border:1px solid var(--sd-border); background:var(--sd-white);
          font-size:11px; font-weight:600; color:var(--sd-muted);
        }
        @media(min-width:640px){ .ai-usage-pill{ display:flex; } }

        /* New chat: text on desktop, icon on mobile */
        .ai-newchat-text {
          display:none; align-items:center; gap:6px;
          padding:5px 12px; border-radius:8px;
          border:1px solid var(--sd-border); background:var(--sd-white);
          cursor:pointer; font-size:12px; font-weight:600;
          color:var(--sd-text); font-family:inherit; transition:background .1s;
        }
        .ai-newchat-text:hover{ background:var(--sd-border-light); }
        @media(min-width:640px){ .ai-newchat-text{ display:flex; } }

        .ai-newchat-icon {
          display:flex; align-items:center; justify-content:center;
          width:32px; height:32px; border-radius:8px;
          border:1px solid var(--sd-border); background:var(--sd-white);
          cursor:pointer; transition:background .1s;
        }
        .ai-newchat-icon:hover{ background:var(--sd-border-light); }
        @media(min-width:640px){ .ai-newchat-icon{ display:none; } }

        /* ── Scroll area ── */
        .ai-scroll {
          flex:1; overflow-y:auto; min-height:0;
          padding:16px 0;
        }

        /* ── Empty state ── */
        .ai-empty {
          display:flex; flex-direction:column; align-items:center;
          text-align:center; padding:8px 0 24px;
        }
        .ai-empty > .ai-orb-wrap { margin-bottom:18px; }
        .ai-empty-greeting { font-size:22px; font-weight:900; color:var(--sd-text); letter-spacing:-.04em; margin:18px 0 4px; }
        .ai-empty-tagline  { font-size:16px; font-weight:700; color:var(--sd-text); margin-bottom:8px; }
        .ai-empty-hint     { font-size:13px; color:var(--sd-muted); max-width:280px; line-height:1.6; margin-bottom:24px; }

        .ai-section-lbl {
          font-size:10px; font-weight:700; color:var(--sd-muted);
          text-transform:uppercase; letter-spacing:.1em;
          align-self:flex-start; margin-bottom:10px; width:100%;
        }

        .ai-examples-grid {
          display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%;
        }
        .ai-example-card {
          display:flex; align-items:flex-start; gap:9px; padding:13px;
          border-radius:12px; border:1px solid var(--sd-border);
          background:var(--sd-white); cursor:pointer; text-align:left;
          font-family:inherit; transition:border-color .15s, box-shadow .15s;
        }
        .ai-example-card:hover{
          border-color:var(--sd-accent-border);
          box-shadow:0 0 0 3px var(--sd-accent-dim);
        }
        .ai-example-icon {
          width:26px; height:26px; border-radius:7px;
          background:var(--sd-accent-dim);
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .ai-example-txt { font-size:12px; font-weight:500; color:var(--sd-text2); line-height:1.5; }

        .ai-how-grid {
          display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%;
        }
        .ai-how-card {
          display:flex; align-items:flex-start; gap:9px; padding:12px;
          border-radius:12px; background:var(--sd-white); border:1px solid var(--sd-border);
        }
        .ai-how-icon  { width:26px; height:26px; border-radius:7px; background:var(--sd-accent-dim); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ai-how-title { font-size:12px; font-weight:700; color:var(--sd-text); margin-bottom:2px; }
        .ai-how-desc  { font-size:11px; color:var(--sd-muted); line-height:1.5; }

        /* ── Messages ── */
        .ai-messages { display:flex; flex-direction:column; gap:4px; padding-bottom:8px; }
        .ai-loading  { text-align:center; color:var(--sd-muted); font-size:13px; padding:32px; }
        .ai-error    { font-size:12px; color:#ef4444; text-align:center; padding:8px 12px; background:rgba(239,68,68,.06); border-radius:8px; margin:8px 0; }

        /* Bubble rows */
        .ai-row {
          display:flex; align-items:flex-start; gap:9px; padding:5px 0;
        }
        .ai-row--user { flex-direction:row-reverse; }

        /* Bubbles */
        .ai-bubble {
          position:relative; max-width:78%;
          padding:11px 14px 34px;
          border-radius:18px;
          font-size:14px; line-height:1.75;
          color:var(--sd-text); font-family:var(--sd-font);
          word-break:break-word;
          transition: background .25s;
        }
        .ai-bubble--ai {
          background:var(--sd-white);
          border:1px solid var(--sd-border);
          border-top-left-radius:4px;
        }
        .ai-bubble--user {
          background:var(--sd-accent);
          color:#fff;
          border:none;
          border-top-right-radius:4px;
        }
        .ai-bubble--typing {
          display:flex; align-items:center; gap:5px;
          padding:13px 16px; min-height:44px;
        }

        /* Hover action buttons inside bubble */
        .ai-bubble-acts {
          position:absolute; bottom:7px; right:9px;
          display:flex; align-items:center; gap:3px;
          transition:opacity .15s; pointer-events:none;
        }
        .ai-bubble:hover .ai-bubble-acts,
        .ai-bubble-acts[style*="opacity: 1"] { pointer-events:auto; }
        .ai-act-btn {
          width:25px; height:25px; border-radius:7px;
          border:1px solid var(--sd-border);
          background:var(--sd-white);
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          color:var(--sd-muted); transition:background .1s;
        }
        .ai-act-btn:hover{ background:var(--sd-border-light); }
        /* User bubble: transparent action buttons */
        .ai-bubble--user .ai-act-btn{
          border-color:rgba(255,255,255,.3);
          background:rgba(255,255,255,.15);
          color:rgba(255,255,255,.8);
        }
        .ai-bubble--user .ai-act-btn:hover{ background:rgba(255,255,255,.25); }

        /* ── Pinned bottom ── */
        .ai-bottom {
          flex-shrink:0;
          padding-top:10px;
          border-top:1px solid var(--sd-border-light);
        }
        .ai-bar-row {
          display:flex; align-items:center; gap:8px; margin-bottom:8px;
        }
        .ai-bar-lbl   { font-size:10px; color:var(--sd-muted); white-space:nowrap; flex-shrink:0; }
        .ai-bar-topup {
          background:none; border:none; cursor:pointer;
          font-size:10px; color:var(--sd-accent); font-weight:700;
          font-family:inherit; padding:0; flex-shrink:0;
        }

        /* Input */
        .ai-input-shell { width:100%; }
        .ai-input-box {
          display:flex; align-items:flex-end; gap:7px;
          background:var(--sd-white);
          border:1px solid var(--sd-border);
          border-radius:16px; padding:7px 9px;
          box-shadow:0 1px 4px rgba(0,0,0,.05);
          transition:border-color .15s, box-shadow .15s;
        }
        .ai-input-box:focus-within{
          border-color:var(--sd-accent);
          box-shadow:0 0 0 3px var(--sd-accent-dim);
        }
        .ai-plus-btn {
          width:30px; height:30px; border-radius:8px; flex-shrink:0;
          border:1px solid var(--sd-border); background:transparent;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; color:var(--sd-muted); transition:background .1s, border-color .1s;
        }
        .ai-plus-btn:hover        { background:var(--sd-border-light); }
        .ai-plus-btn--open        { border-color:var(--sd-accent); background:var(--sd-accent-dim); }

        /* Attach popup menu */
        .ai-attach-menu {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 0;
          z-index: 1000;
          background: var(--sd-white);
          border: 1px solid var(--sd-border);
          border-radius: 14px;
          padding: 6px;
          min-width: 220px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08);
          animation: ai-menu-in 0.15s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes ai-menu-in {
          from { opacity:0; transform:translateY(6px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)   scale(1); }
        }
        .ai-attach-option {
          display: flex; align-items: center; gap: 12px;
          width: 100%; padding: 10px 12px; border-radius: 10px;
          border: none; background: transparent; cursor: pointer;
          font-family: inherit; text-align: left;
          transition: background 0.12s;
        }
        .ai-attach-option:hover { background: var(--sd-accent-dim); }
        .ai-attach-option:hover .ai-attach-opt-icon { background: var(--sd-accent); color: #fff; }

        .ai-attach-opt-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          background: var(--sd-border-light); color: var(--sd-text);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s, color 0.12s;
        }
        .ai-attach-opt-title {
          font-size: 13px; font-weight: 700; color: var(--sd-text); margin-bottom: 2px;
        }
        .ai-attach-opt-sub {
          font-size: 10px; color: var(--sd-muted); font-weight: 500;
        }
        .ai-textarea {
          flex:1; border:none; background:transparent;
          color:var(--sd-text); font-size:14px; outline:none;
          resize:none; line-height:1.6; max-height:130px;
          overflow-y:auto; font-family:var(--sd-font);
          padding:4px 0; align-self:center;
        }
        .ai-textarea::placeholder{ color:var(--sd-muted); }
        .ai-send-btn {
          width:32px; height:32px; border-radius:10px; flex-shrink:0;
          border:none; display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:background .15s, opacity .15s;
        }
        .ai-send-btn:disabled{ cursor:not-allowed; opacity:.6; }
        .ai-topup-inline {
          padding:5px 10px; border-radius:8px; flex-shrink:0;
          border:1px solid rgba(239,68,68,.3); background:rgba(239,68,68,.06);
          color:#dc2626; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit;
        }
        .ai-input-hint {
          font-size:10px; color:var(--sd-muted); text-align:center; margin-top:6px;
        }

        /* Mobile tweaks */
        @media(max-width:480px){
          .ai-empty-greeting  { font-size:18px; }
          .ai-empty-tagline   { font-size:14px; }
          .ai-examples-grid,
          .ai-how-grid        { grid-template-columns:1fr; }
          .ai-bubble          { max-width:88%; font-size:13px; }
        }
      `}</style>
    </div>
  );
}