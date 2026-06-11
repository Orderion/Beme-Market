// src/pages/dashboard/DashboardHelp.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { getAuth } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, where, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";

const API = import.meta.env.VITE_BACKEND_URL || "https://beme-market-1.onrender.com";
const COLD_MS = 5 * 60 * 1000;

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  send:    "M22 2L11 13|M22 2L15 22l-4-9-9-4 20-7z",
  bot:     "M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z|M6 14a6 6 0 0 1 12 0v2H6v-2z|M12 22v-6",
  agent:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75",
  refresh: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8|M3 3v5h5",
  chevron: "M6 9l6 6 6-6",
  plus:    "M12 5v14|M5 12h14",
  clock:   "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 6v6l4 2",
};

const FAQ = [
  { q: "How do I add a new product?", a: "Go to Products in your sidebar → click Add Product. Fill in name, price, description, category, upload images, set stock, and save." },
  { q: "How do I withdraw my earnings?", a: "Go to Withdrawals tab. Minimum GHS 50 for order earnings, GHS 100 for referral earnings. Processing takes 1–3 business days." },
  { q: "What are the subscription plans?", a: "Basic (free · 5 products), Starter (GHS 59/mo), Growth (GHS 129/mo · Beme Delivery), Pro (GHS 399/mo · all features)." },
  { q: "How does Beme Delivery work?", a: "Available on Growth and Pro plans. Beme coordinates a courier for pickup and delivery. Configure in Settings → Delivery." },
  { q: "Why is my store inactive?", a: "Check Settings → Subscription and Settings → Verification. If the issue persists, use the chat below." },
  { q: "How do referrals work?", a: "Share your link from Marketing → Referrals. Earn GHS 1/3/7 when referred sellers subscribe to Starter/Growth/Pro." },
];

async function getToken() {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not authenticated.");
  return user.getIdToken(true);
}

function formatMsg(text) {
  if (!text) return "";
  return text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.*?)\*/g,"<em>$1</em>")
    .replace(/^(\d+\.\s)/gm,"<br/>$1")
    .replace(/^[-•]\s/gm,"<br/>• ")
    .replace(/\n/g,"<br/>");
}

export default function DashboardHelp() {
  const { user }       = useAuth();
  const [view,         setView]         = useState("entry");
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [sending,      setSending]      = useState(false);
  const [canEsc,       setCanEsc]       = useState(false);
  const [escDone,      setEscDone]      = useState(false);
  const [escWait,      setEscWait]      = useState(false);
  const [escLoading,   setEscLoading]   = useState(false);
  const [agentActive,  setAgentActive]  = useState(false); // true once agent sends a message
  const [chatResolved, setChatResolved] = useState(false); // true when ticket resolved
  const [hasSession,   setHasSession]   = useState(false);
  const [sessionCold,  setSessionCold]  = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeQ,      setActiveQ]      = useState(null);
  const [refreshing,   setRefreshing]   = useState(false);
  // sessionStart: only show messages AFTER this timestamp for the current session
  const [sessionStart, setSessionStart] = useState(null);
  const bottomRef       = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const coldTimerRef    = useRef(null);

  // Check existing session on mount
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const token = await getToken();
        const res   = await fetch(`${API}/api/help/session`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.hasSession && data.lastUpdated) {
          const age = Date.now() - new Date(data.lastUpdated).getTime();
          setHasSession(true);
          setSessionCold(age > COLD_MS);
        }
      } catch {}
      setCheckingSession(false);
    })();
  }, [user?.uid]);

  // Real-time Firestore listener — filtered by sessionStart for new chats
  useEffect(() => {
    if (view !== "chat" || !user?.uid) return;

    let q;
    if (sessionStart) {
      // New chat: only show messages from this session onward
      q = query(
        collection(db, "helpChats", user.uid, "messages"),
        orderBy("createdAt", "asc"),
        where("createdAt", ">=", Timestamp.fromDate(sessionStart))
      );
    } else {
      // Continue: show all messages
      q = query(
        collection(db, "helpChats", user.uid, "messages"),
        orderBy("createdAt", "asc")
      );
    }

    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);

      // Check if any agent message exists → agent is active
      const hasAgent = msgs.some(m => m.source === "agent");
      if (hasAgent) {
        setAgentActive(true);
        setEscWait(false);
        setCanEsc(false);
      }

      // Check if chat was resolved
      const isResolved = msgs.some(m => m.source === "resolved");
      if (isResolved) setChatResolved(true);

      // Check last AI message for escalate flag
      const lastAI = [...msgs].reverse().find(m => m.role === "assistant" && m.source === "ai");
      if (lastAI?.canEscalate && !hasAgent) setCanEsc(true);

    }, () => {});

    return unsub;
  }, [view, user?.uid, sessionStart]);

  // Cold timer
  useEffect(() => {
    if (view !== "chat") return;
    const tick = () => {
      if (Date.now() - lastActivityRef.current >= COLD_MS) setSessionCold(true);
    };
    coldTimerRef.current = setInterval(tick, 30_000);
    return () => clearInterval(coldTimerRef.current);
  }, [view]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const resetActivity = () => {
    lastActivityRef.current = Date.now();
    setSessionCold(false);
  };

  const openChat = (isNew = false) => {
    if (isNew) {
      // Set session start to now — listener will filter to only new messages
      setSessionStart(new Date());
      setMessages([]);
      setAgentActive(false);
      setEscDone(false);
      setEscWait(false);
      setCanEsc(false);
    } else {
      setSessionStart(null); // show all history
    }
    setView("chat");
    setSessionCold(false);
    resetActivity();
  };

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setRefreshing(false);
    }, 600);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || agentActive) return;
    resetActivity();
    setInput("");
    setSending(true);
    setCanEsc(false);
    try {
      const token = await getToken();
      await fetch(`${API}/api/help/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          message: text,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      setHasSession(true);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now(), role: "assistant", source: "ai",
        content: "Network error. Please check your connection.",
      }]);
    } finally {
      setSending(false);
    }
  };

  const escalate = async () => {
    setEscLoading(true);
    try {
      const token   = await getToken();
      const summary = messages.filter(m => m.role === "user").map(m => m.content).slice(-3).join(" / ");
      const res     = await fetch(`${API}/api/help/escalate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          summary,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.ticketId) {
        setEscDone(true);
        setEscWait(true);
        setCanEsc(false);
      }
    } catch {
      alert("Failed to connect to agent. Please try again.");
    } finally {
      setEscLoading(false);
    }
  };

  /* ── ENTRY VIEW ── */
  if (view === "entry") {
    return (
      <div className="dh-root">
        <div className="dh-hero">
          <div className="dh-hero-icon"><Ico d={IC.bot} size={22} color="var(--sd-accent)" /></div>
          <div>
            <div className="dh-hero-title">Get Help</div>
            <div className="dh-hero-sub">Find answers or chat with our AI support agent</div>
          </div>
        </div>

        {checkingSession ? (
          <div className="dh-chat-cta" style={{ opacity:0.5, cursor:"default", marginBottom:22 }}>
            <div className="dh-cta-icon"><Ico d={IC.bot} size={20} color="var(--sd-accent)" /></div>
            <div className="dh-cta-body"><div className="dh-cta-title">Checking session…</div></div>
          </div>
        ) : !hasSession ? (
          <button className="dh-chat-cta" onClick={() => openChat(true)}>
            <div className="dh-cta-icon"><Ico d={IC.bot} size={20} color="var(--sd-accent)" /></div>
            <div className="dh-cta-body">
              <div className="dh-cta-title">Start a Chat with Beme AI Support</div>
              <div className="dh-cta-sub">Get instant answers about your store, orders, or payments</div>
            </div>
            <div className="dh-cta-arrow">→</div>
          </button>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
            {sessionCold && (
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12,
                color:"var(--sd-muted)", padding:"6px 0" }}>
                <Ico d={IC.clock} size={12} color="var(--sd-muted)" />
                Previous chat session has expired
              </div>
            )}
            <button className="dh-chat-cta" onClick={() => openChat(false)}>
              <div className="dh-cta-icon"><Ico d={IC.bot} size={20} color="var(--sd-accent)" /></div>
              <div className="dh-cta-body">
                <div className="dh-cta-title">Continue Chat</div>
                <div className="dh-cta-sub">Resume your current support conversation</div>
              </div>
              <div className="dh-cta-arrow">→</div>
            </button>
            <button className="dh-chat-cta dh-chat-cta--secondary" onClick={() => openChat(true)}>
              <div className="dh-cta-icon dh-cta-icon--secondary">
                <Ico d={IC.plus} size={20} color="var(--sd-muted)" />
              </div>
              <div className="dh-cta-body">
                <div className="dh-cta-title dh-cta-title--secondary">Start New Chat</div>
                <div className="dh-cta-sub">Begin a fresh conversation</div>
              </div>
            </button>
          </div>
        )}

        <div className="dh-section-label">Frequently Asked Questions</div>
        <div className="dh-faq">
          {FAQ.map((item, i) => (
            <div key={i} className="dh-faq-item">
              <button className="dh-faq-q" onClick={() => setActiveQ(activeQ === i ? null : i)}>
                <span>{item.q}</span>
                <span className={`dh-faq-chevron${activeQ === i ? " dh-faq-chevron--open" : ""}`}>
                  <Ico d={IC.chevron} size={14} />
                </span>
              </button>
              {activeQ === i && <div className="dh-faq-a">{item.a}</div>}
            </div>
          ))}
        </div>
        <style>{STYLES}</style>
      </div>
    );
  }

  /* ── CHAT VIEW ── */
  const inputBlocked = agentActive === false && false; // AI always on until agent connects
  const showAgentBar = agentActive; // agent has sent at least one message

  return (
    <div className="dh-root dh-root--chat">
      <div className="dh-chat-header">
        <button className="dh-back" onClick={() => setView("entry")}>← Back</button>
        <div className="dh-chat-title">
          <div className="dh-bot-avatar" style={{ background: showAgentBar ? "#046EF2" : "var(--sd-accent)" }}>
            <Ico d={showAgentBar ? IC.agent : IC.bot} size={14} color="#fff" />
          </div>
          {showAgentBar ? "Beme Support Agent" : "Beme AI Support"}
          <span className="dh-online-dot" />
        </div>
        <button className="dh-refresh-btn" onClick={refresh} disabled={refreshing} title="Refresh messages">
          <Ico d={IC.refresh} size={14}
            color={refreshing ? "var(--sd-muted)" : "var(--sd-text)"} />
        </button>
      </div>

      {sessionCold && !agentActive && (
        <div className="dh-cold-banner">
          <Ico d={IC.clock} size={13} color="#F59E0B" />
          <span>This chat session has gone cold.</span>
          <button onClick={() => setView("entry")} className="dh-cold-btn">Go Back</button>
        </div>
      )}

      <div className="dh-messages">
        {messages.length === 0 && !sending && (
          <div className="dh-msg dh-msg--assistant">
            <div className="dh-msg-avatar"><Ico d={IC.bot} size={12} color="#fff" /></div>
            <div className="dh-msg-bubble">
              Hi! I'm Beme Support. Ask me anything about your store, orders, payments, or any feature.
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser   = m.role === "user";
          const isAgent  = m.source === "agent";
          const isSystem = m.source === "system";
          return (
            <div key={m.id || i} className={`dh-msg${isUser ? " dh-msg--user" : ""}`}>
              {!isUser && (
                <div className="dh-msg-avatar"
                  style={{ background: isAgent ? "#046EF2" : isSystem ? "#F59E0B" : "var(--sd-accent)" }}>
                  <Ico d={isAgent ? IC.agent : IC.bot} size={12} color="#fff" />
                </div>
              )}
              <div className={`dh-msg-bubble${isAgent ? " dh-msg-bubble--agent" : ""}${isUser ? " dh-msg-bubble--user" : ""}`}>
                {isAgent && <div className="dh-agent-label">Beme Support Agent</div>}
                <span dangerouslySetInnerHTML={{ __html: formatMsg(m.content) }} />
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="dh-msg dh-msg--assistant">
            <div className="dh-msg-avatar"><Ico d={IC.bot} size={12} color="#fff" /></div>
            <div className="dh-msg-bubble dh-msg-bubble--typing"><span /><span /><span /></div>
          </div>
        )}

        {/* Escalate button — only before agent connects */}
        {canEsc && !escDone && !agentActive && (
          <div className="dh-escalate-banner">
            <Ico d={IC.agent} size={16} color="var(--sd-accent)" />
            <div className="dh-esc-text">
              <strong>Need a human agent?</strong> Our support team can take over.
            </div>
            <button className="dh-esc-btn" onClick={escalate} disabled={escLoading}>
              {escLoading ? "Connecting…" : "Connect to Agent"}
            </button>
          </div>
        )}

        {/* Waiting banner — shown after escalation, removed once agent sends a message */}
        {escWait && !agentActive && (
          <div className="dh-wait-banner">
            <div className="dh-wait-dot" />
            Waiting for a support agent to connect…
          </div>
        )}

        {/* Agent active banner */}
        {agentActive && (
          <div className="dh-agent-active-banner">
            <Ico d={IC.agent} size={14} color="#046EF2" />
            A Beme support agent is now handling your chat
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — blocked when agent is active (agent replies via admin panel) */}
      {agentActive && !chatResolved ? (
        <div className="dh-agent-input-notice">
          <Ico d={IC.agent} size={14} color="#046EF2" />
          Respond to the agent above — type your reply here
        </div>
      ) : null}
      {chatResolved ? (
        <div className="dh-resolved-bar">
          <span style={{ fontSize:16 }}>✅</span>
          Chat resolved — <button className="dh-cold-btn" style={{ marginLeft:6 }}
            onClick={() => setView("entry")}>Start New Chat</button>
        </div>
      ) : (
      <div className="dh-input-row">
        <input
          className="dh-input"
          placeholder={agentActive ? "Reply to the agent…" : "Ask anything about your store…"}
          value={input}
          onChange={e => { setInput(e.target.value); resetActivity(); }}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (agentActive ? sendAgentReply() : sendMessage())}
          disabled={sending}
          maxLength={500}
        />
        <button className="dh-send-btn"
          onClick={agentActive ? sendAgentReply : sendMessage}
          disabled={sending || !input.trim()}>
          <Ico d={IC.send} size={16} color="#fff" />
        </button>
      </div>

      <style>{STYLES}</style>
    )}
    </div>
  );

  // When agent is active, seller messages still go through AI chat endpoint
  // (they appear in helpChats and admin can see them)
  async function sendAgentReply() {
    const text = input.trim();
    if (!text || sending) return;
    resetActivity();
    setInput("");
    setSending(true);
    try {
      const token = await getToken();
      // Write seller message directly to helpChats via chat endpoint
      // but skip AI response generation — just log the message
      await fetch(`${API}/api/help/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          message: text,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
          agentMode: true, // signal to backend: don't call Claude
        }),
      });
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now(), role: "assistant", source: "ai",
        content: "Network error. Please try again.",
      }]);
    } finally {
      setSending(false);
    }
  }
}

const STYLES = `
  .dh-root {
    font-family: var(--sd-font,'DM Sans',system-ui,sans-serif);
    color: var(--sd-text); background: transparent; max-width: 720px;
  }
  .dh-root--chat {
    display: flex; flex-direction: column;
    height: calc(100vh - 160px); min-height: 500px;
  }
  .dh-hero {
    display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
  }
  .dh-hero-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: var(--sd-accent-dim); display: flex; align-items: center;
    justify-content: center; flex-shrink: 0;
  }
  .dh-hero-title { font-size: 18px; font-weight: 900; color: var(--sd-text); letter-spacing: -0.02em; }
  .dh-hero-sub   { font-size: 13px; color: var(--sd-muted); }

  .dh-chat-cta {
    display: flex; align-items: center; gap: 14px; padding: 16px 18px;
    border-radius: 14px; border: 1.5px solid var(--sd-accent);
    background: var(--sd-accent-dim); cursor: pointer; text-align: left;
    width: 100%; font-family: inherit; transition: all 0.15s;
  }
  .dh-chat-cta:hover { background: rgba(124,58,237,0.1); }
  .dh-chat-cta--secondary {
    border-color: var(--sd-border); background: var(--sd-white);
  }
  .dh-chat-cta--secondary:hover { background: var(--sd-border-light); }
  .dh-cta-icon {
    width: 44px; height: 44px; border-radius: 12px; background: #fff;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(124,58,237,0.15);
  }
  .dh-cta-icon--secondary { background: var(--sd-border-light); box-shadow: none; }
  .dh-cta-body  { flex: 1; }
  .dh-cta-title { font-size: 14px; font-weight: 800; color: var(--sd-accent); margin-bottom: 3px; }
  .dh-cta-title--secondary { color: var(--sd-text); }
  .dh-cta-sub   { font-size: 12px; color: var(--sd-muted); }
  .dh-cta-arrow { font-size: 18px; color: var(--sd-accent); font-weight: 900; }

  .dh-section-label {
    font-size: 10px; font-weight: 700; color: var(--sd-muted);
    text-transform: uppercase; letter-spacing: 0.08em;
    margin-bottom: 10px; margin-top: 8px;
  }
  .dh-faq { display: flex; flex-direction: column; gap: 6px; }
  .dh-faq-item {
    border: 1px solid var(--sd-border); border-radius: 12px;
    overflow: hidden; background: var(--sd-white);
  }
  .dh-faq-q {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    width: 100%; padding: 13px 16px; background: none; border: none; cursor: pointer;
    font-family: var(--sd-font); font-size: 13px; font-weight: 700;
    color: var(--sd-text); text-align: left;
  }
  .dh-faq-chevron { flex-shrink: 0; color: var(--sd-muted); display: flex; transition: transform 0.2s; }
  .dh-faq-chevron--open { transform: rotate(180deg); }
  .dh-faq-a { padding: 0 16px 14px; font-size: 13px; color: var(--sd-muted); line-height: 1.7; }

  .dh-chat-header {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 0 14px; border-bottom: 1px solid var(--sd-border); flex-shrink: 0;
  }
  .dh-back {
    background: none; border: none; cursor: pointer; font-size: 13px;
    font-weight: 700; color: var(--sd-accent); font-family: inherit; padding: 0; flex-shrink: 0;
  }
  .dh-chat-title {
    flex: 1; display: flex; align-items: center; gap: 8px;
    font-size: 14px; font-weight: 800; color: var(--sd-text);
  }
  .dh-bot-avatar {
    width: 28px; height: 28px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; transition: background 0.3s;
  }
  .dh-online-dot { width: 7px; height: 7px; border-radius: 50%; background: #22C55E; }
  .dh-refresh-btn {
    display: inline-flex; align-items: center; gap: 5px;
    background: none; border: 1px solid var(--sd-border); cursor: pointer;
    font-size: 11px; font-weight: 700; color: var(--sd-muted);
    padding: 5px 10px; border-radius: 7px; font-family: inherit; flex-shrink: 0;
  }
  .dh-refresh-btn:hover:not(:disabled) { border-color: var(--sd-accent); color: var(--sd-accent); }
  .dh-refresh-btn:disabled { opacity: 0.5; cursor: default; }

  .dh-cold-banner {
    display: flex; align-items: center; gap: 8px; padding: 9px 14px;
    background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25);
    border-radius: 10px; font-size: 12px; color: var(--sd-text); font-weight: 600;
    margin: 8px 0; flex-shrink: 0;
  }
  .dh-cold-btn {
    margin-left: auto; padding: 4px 12px; border-radius: 7px;
    background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3);
    color: #B45309; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
  }

  .dh-messages {
    flex: 1; overflow-y: auto; padding: 16px 0;
    display: flex; flex-direction: column; gap: 12px;
  }
  .dh-messages::-webkit-scrollbar { width: 3px; }
  .dh-messages::-webkit-scrollbar-thumb { background: var(--sd-border); border-radius: 3px; }

  .dh-msg { display: flex; align-items: flex-end; gap: 8px; }
  .dh-msg--user { flex-direction: row-reverse; }
  .dh-msg-avatar {
    width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
    background: var(--sd-accent); display: flex; align-items: center;
    justify-content: center; margin-bottom: 2px;
  }
  .dh-msg-bubble {
    max-width: 72%; padding: 10px 14px; border-radius: 14px;
    font-size: 13px; line-height: 1.6; font-weight: 500;
    background: var(--sd-white); border: 1px solid var(--sd-border);
    border-bottom-left-radius: 4px; color: var(--sd-text);
  }
  .dh-msg-bubble--user {
    background: var(--sd-accent) !important; color: #fff !important;
    border: none !important; border-bottom-right-radius: 4px !important;
    border-bottom-left-radius: 14px !important;
  }
  .dh-msg-bubble--agent {
    background: rgba(4,110,242,0.06) !important;
    border-color: rgba(4,110,242,0.2) !important;
  }
  .dh-agent-label {
    font-size: 10px; font-weight: 700; color: #046EF2;
    text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px;
  }
  .dh-msg-bubble--typing {
    display: flex; gap: 5px; align-items: center; padding: 12px 16px;
  }
  .dh-msg-bubble--typing span {
    width: 7px; height: 7px; border-radius: 50%; background: var(--sd-border);
    animation: dh-bounce 1.2s ease infinite;
  }
  .dh-msg-bubble--typing span:nth-child(2) { animation-delay: 0.2s; }
  .dh-msg-bubble--typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dh-bounce {
    0%,60%,100% { transform:translateY(0); opacity:0.4; }
    30%          { transform:translateY(-5px); opacity:1; }
  }

  .dh-escalate-banner {
    display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px;
    background: var(--sd-accent-dim); border: 1px solid rgba(124,58,237,0.2);
  }
  .dh-esc-text { flex: 1; font-size: 13px; color: var(--sd-text); line-height: 1.5; }
  .dh-esc-btn {
    padding: 7px 14px; border-radius: 8px; border: none;
    background: var(--sd-accent); color: #fff;
    font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap;
  }
  .dh-esc-btn:disabled { opacity: 0.6; cursor: default; }

  .dh-wait-banner {
    display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
    background: rgba(4,110,242,0.06); border: 1px solid rgba(4,110,242,0.18);
    font-size: 13px; color: #046EF2; font-weight: 600;
  }
  .dh-wait-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #046EF2; flex-shrink: 0;
    animation: dh-pulse 1.5s ease infinite;
  }
  @keyframes dh-pulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:0.4; transform:scale(0.7); }
  }

  .dh-agent-active-banner {
    display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 10px;
    background: rgba(4,110,242,0.06); border: 1px solid rgba(4,110,242,0.18);
    font-size: 12px; color: #046EF2; font-weight: 700;
  }

  .dh-agent-input-notice {
    display: flex; align-items: center; gap: 7px;
    font-size: 11px; color: #046EF2; font-weight: 600;
    padding: 5px 0 3px; flex-shrink: 0;
  }

  .dh-input-row {
    display: flex; gap: 8px; padding: 10px 0 4px;
    border-top: 1px solid var(--sd-border); flex-shrink: 0;
  }
  .dh-input {
    flex: 1; height: 44px; padding: 0 14px;
    border: 1.5px solid var(--sd-border); border-radius: 10px;
    background: var(--sd-white); color: var(--sd-text);
    font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.15s;
  }
  .dh-input:focus { border-color: var(--sd-accent); }
  .dh-input:disabled { opacity: 0.6; }
  .dh-send-btn {
    width: 44px; height: 44px; border-radius: 10px; border: none;
    background: var(--sd-accent); cursor: pointer; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 0.15s;
  }
  .dh-send-btn:disabled { opacity: 0.4; cursor: default; }
  .dh-send-btn:not(:disabled):hover { opacity: 0.85; }

  .dh-resolved-bar {
    display: flex; align-items: center; gap: 8px; padding: 12px 16px;
    border-top: 1px solid var(--sd-border); border-radius: 0 0 12px 12px;
    background: rgba(21,128,61,0.06); border-color: rgba(21,128,61,0.15);
    font-size: 13px; font-weight: 700; color: #15803d; flex-shrink: 0;
  }
`;