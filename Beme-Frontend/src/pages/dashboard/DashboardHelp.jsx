// src/pages/dashboard/DashboardHelp.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { getAuth } from "firebase/auth";

const API = import.meta.env.VITE_BACKEND_URL || "https://beme-market-1.onrender.com";

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  send:     "M22 2L11 13|M22 2L15 22l-4-9-9-4 20-7z",
  bot:      "M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z|M6 14a6 6 0 0 1 12 0v2H6v-2z|M12 22v-6",
  agent:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75",
  chevron:  "M6 9l6 6 6-6",
  help:     "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3|M12 17h.01",
  check:    "M20 6L9 17l-5-5",
  clear:    "M18 6L6 18|M6 6l12 12",
};

const FAQ = [
  { q: "How do I add a new product?", a: "Go to Products in your sidebar → click Add Product. Fill in name, price, description, category, upload images, set stock, and save. The listing goes live immediately." },
  { q: "How do I withdraw my earnings?", a: "Go to Withdrawals tab. Minimum GHS 50 for order earnings, GHS 100 for referral earnings. Enter your MoMo number or bank details. Processing takes 1–3 business days." },
  { q: "What are the subscription plans?", a: "Basic (free · 5 products), Starter (GHS 59/mo · 10 products), Growth (GHS 129/mo · 25 products + Beme Delivery), Pro (GHS 399/mo · 500 products + all features)." },
  { q: "How does Beme Delivery work?", a: "Available on Growth and Pro plans. Beme coordinates a courier to pick up from your location and deliver to the customer. Configure in Settings → Delivery." },
  { q: "Why is my store inactive?", a: "Check your subscription in Settings → Subscription. Also check Settings → Verification. If the issue persists, chat with our support below." },
  { q: "How do referrals work?", a: "Share your referral link from Marketing → Referrals. When someone signs up and subscribes to a paid plan using your code, you earn GHS 1 (Starter), GHS 3 (Growth), or GHS 7 (Pro)." },
];

async function getToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated.");
  return user.getIdToken(true);
}


/* ── Simple markdown formatter ── */
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
  const { user }   = useAuth();
  const [view,     setView]     = useState("main"); // main | chat | escalated
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [canEsc,   setCanEsc]   = useState(false);
  const [escDone,  setEscDone]  = useState(false);
  const [escLoading, setEscLoading] = useState(false);
  const [activeQ,  setActiveQ]  = useState(null);
  const bottomRef  = useRef(null);

  // Load chat history when opening chat view
  useEffect(() => {
    if (view !== "chat" || messages.length > 0) return;
    (async () => {
      try {
        const token = await getToken();
        const res   = await fetch(`${API}/api/help/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data  = await res.json();
        if (data.messages?.length) {
          setMessages(data.messages.map(m => ({
            role: m.role, content: m.content,
          })));
        } else {
          setMessages([{
            role:    "assistant",
            content: "Hi! I'm Beme Support. Ask me anything about your store, orders, payments, or any feature. I'll do my best to help.",
          }]);
        }
      } catch {
        setMessages([{
          role:    "assistant",
          content: "Hi! I'm Beme Support. Ask me anything about your store, orders, payments, or any feature.",
        }]);
      }
    })();
  }, [view]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setCanEsc(false);

    try {
      const token = await getToken();
      const res   = await fetch(`${API}/api/help/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          message: text,
          history: messages.slice(-8),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        if (data.canEscalate) setCanEsc(true);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Network error. Please check your connection and try again." }]);
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
        body:    JSON.stringify({ summary, history: messages.slice(-8) }),
      });
      const data = await res.json();
      if (data.ticketId) {
        setEscDone(true);
        setCanEsc(false);
        setMessages(prev => [...prev, {
          role:    "assistant",
          content: `Your request has been forwarded to a human agent (Ticket #${data.ticketId.slice(0,8).toUpperCase()}). Our team will respond to ${user?.email} within 24 hours.`,
        }]);
      }
    } catch {
      alert("Failed to escalate. Please try again.");
    } finally {
      setEscLoading(false);
    }
  };

  /* ── MAIN VIEW ── */
  if (view === "main") {
    return (
      <div className="dh-root">
        <div className="dh-hero">
          <div className="dh-hero-icon">
            <Ico d={IC.help} size={22} color="var(--sd-accent)" />
          </div>
          <div>
            <div className="dh-hero-title">Get Help</div>
            <div className="dh-hero-sub">Find answers or chat with our AI support agent</div>
          </div>
        </div>

        {/* Chat CTA */}
        <button className="dh-chat-cta" onClick={() => setView("chat")}>
          <div className="dh-cta-icon">
            <Ico d={IC.bot} size={20} color="var(--sd-accent)" />
          </div>
          <div className="dh-cta-body">
            <div className="dh-cta-title">Chat with Beme AI Support</div>
            <div className="dh-cta-sub">Get instant answers about your store, orders, or payments</div>
          </div>
          <div className="dh-cta-arrow">→</div>
        </button>

        {/* FAQ */}
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
  return (
    <div className="dh-root">
      <div className="dh-chat-header">
        <button className="dh-back" onClick={() => setView("main")}>← Back</button>
        <div className="dh-chat-title">
          <div className="dh-bot-avatar"><Ico d={IC.bot} size={14} color="#fff" /></div>
          Beme AI Support
          <span className="dh-online-dot" />
        </div>
        <button className="dh-clear" onClick={() => setMessages([{
          role: "assistant",
          content: "Hi! I'm Beme Support. How can I help you today?",
        }])}>
          <Ico d={IC.clear} size={14} /> Clear
        </button>
      </div>

      <div className="dh-messages">
        {messages.map((m, i) => (
          <div key={i} className={`dh-msg dh-msg--${m.role}`}>
            {m.role === "assistant" && (
              <div className="dh-msg-avatar">
                <Ico d={IC.bot} size={12} color="#fff" />
              </div>
            )}
            <div className="dh-msg-bubble"
              dangerouslySetInnerHTML={{ __html: formatMsg(m.content) }}
            />
          </div>
        ))}

        {sending && (
          <div className="dh-msg dh-msg--assistant">
            <div className="dh-msg-avatar"><Ico d={IC.bot} size={12} color="#fff" /></div>
            <div className="dh-msg-bubble dh-msg-bubble--typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        {canEsc && !escDone && (
          <div className="dh-escalate-banner">
            <Ico d={IC.agent} size={16} color="var(--sd-accent)" />
            <div className="dh-esc-text">
              <strong>Need a human agent?</strong> Our support team can take over this conversation.
            </div>
            <button className="dh-esc-btn" onClick={escalate} disabled={escLoading}>
              {escLoading ? "Connecting…" : "Connect to Agent"}
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="dh-input-row">
        <input
          className="dh-input"
          placeholder="Ask anything about your store…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={sending}
          maxLength={500}
        />
        <button className="dh-send-btn" onClick={sendMessage} disabled={sending || !input.trim()}>
          <Ico d={IC.send} size={16} color="#fff" />
        </button>
      </div>

      <style>{STYLES}</style>
    </div>
  );
}

const STYLES = `
  .dh-root {
    font-family: var(--sd-font,'DM Sans',system-ui,sans-serif);
    color: var(--sd-text); background: transparent;
    max-width: 720px; display: flex; flex-direction: column;
    height: calc(100vh - 160px); min-height: 500px;
  }

  /* Hero */
  .dh-hero {
    display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
  }
  .dh-hero-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: var(--sd-accent-dim); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .dh-hero-title { font-size: 18px; font-weight: 900; color: var(--sd-text); letter-spacing: -0.02em; }
  .dh-hero-sub   { font-size: 13px; color: var(--sd-muted); }

  /* CTA */
  .dh-chat-cta {
    display: flex; align-items: center; gap: 14px; padding: 16px 18px;
    border-radius: 14px; border: 1.5px solid var(--sd-accent);
    background: var(--sd-accent-dim); cursor: pointer; text-align: left;
    margin-bottom: 22px; width: 100%; font-family: inherit;
    transition: all 0.15s;
  }
  .dh-chat-cta:hover { background: rgba(124,58,237,0.1); }
  .dh-cta-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(124,58,237,0.15);
  }
  .dh-cta-body  { flex: 1; }
  .dh-cta-title { font-size: 14px; font-weight: 800; color: var(--sd-accent); margin-bottom: 3px; }
  .dh-cta-sub   { font-size: 12px; color: var(--sd-muted); }
  .dh-cta-arrow { font-size: 18px; color: var(--sd-accent); font-weight: 900; }

  /* Section label */
  .dh-section-label {
    font-size: 10px; font-weight: 700; color: var(--sd-muted);
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;
  }

  /* FAQ */
  .dh-faq { display: flex; flex-direction: column; gap: 6px; }
  .dh-faq-item {
    border: 1px solid var(--sd-border); border-radius: 12px; overflow: hidden;
    background: var(--sd-white);
  }
  .dh-faq-q {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    width: 100%; padding: 13px 16px; background: none; border: none; cursor: pointer;
    font-family: var(--sd-font); font-size: 13px; font-weight: 700; color: var(--sd-text);
    text-align: left;
  }
  .dh-faq-chevron { flex-shrink: 0; color: var(--sd-muted); display: flex; transition: transform 0.2s; }
  .dh-faq-chevron--open { transform: rotate(180deg); }
  .dh-faq-a {
    padding: 0 16px 14px; font-size: 13px; color: var(--sd-muted); line-height: 1.7;
  }

  /* ── Chat view ── */
  .dh-chat-header {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 0 14px; border-bottom: 1px solid var(--sd-border);
    margin-bottom: 0; flex-shrink: 0;
  }
  .dh-back {
    background: none; border: none; cursor: pointer; font-size: 13px;
    font-weight: 700; color: var(--sd-accent); font-family: inherit; padding: 0;
    flex-shrink: 0;
  }
  .dh-chat-title {
    flex: 1; display: flex; align-items: center; gap: 8px;
    font-size: 14px; font-weight: 800; color: var(--sd-text);
  }
  .dh-bot-avatar {
    width: 28px; height: 28px; border-radius: 8px;
    background: var(--sd-accent); display: flex; align-items: center; justify-content: center;
  }
  .dh-online-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #22C55E;
  }
  .dh-clear {
    display: inline-flex; align-items: center; gap: 5px;
    background: none; border: 1px solid var(--sd-border); cursor: pointer;
    font-size: 11px; font-weight: 700; color: var(--sd-muted);
    padding: 4px 10px; border-radius: 7px; font-family: inherit;
    flex-shrink: 0;
  }

  .dh-messages {
    flex: 1; overflow-y: auto; padding: 16px 0; display: flex;
    flex-direction: column; gap: 12px;
  }
  .dh-messages::-webkit-scrollbar { width: 3px; }
  .dh-messages::-webkit-scrollbar-thumb { background: var(--sd-border); border-radius: 3px; }

  .dh-msg { display: flex; align-items: flex-end; gap: 8px; }
  .dh-msg--user { flex-direction: row-reverse; }

  .dh-msg-avatar {
    width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
    background: var(--sd-accent); display: flex; align-items: center; justify-content: center;
    margin-bottom: 2px;
  }

  .dh-msg-bubble {
    max-width: 72%; padding: 10px 14px; border-radius: 14px;
    font-size: 13px; line-height: 1.6; font-weight: 500;
  }
  .dh-msg--assistant .dh-msg-bubble {
    background: var(--sd-white); border: 1px solid var(--sd-border);
    border-bottom-left-radius: 4px; color: var(--sd-text);
  }
  .dh-msg--user .dh-msg-bubble {
    background: var(--sd-accent); color: #fff;
    border-bottom-right-radius: 4px;
  }

  /* Typing indicator */
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
    0%,60%,100% { transform: translateY(0); opacity: 0.4; }
    30%          { transform: translateY(-5px); opacity: 1; }
  }

  /* Escalate banner */
  .dh-escalate-banner {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 12px;
    background: var(--sd-accent-dim); border: 1px solid rgba(124,58,237,0.2);
    margin: 4px 0;
  }
  .dh-esc-text { flex: 1; font-size: 13px; color: var(--sd-text); line-height: 1.5; }
  .dh-esc-btn {
    padding: 7px 14px; border-radius: 8px; border: none;
    background: var(--sd-accent); color: #fff;
    font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
    white-space: nowrap; transition: opacity 0.15s;
  }
  .dh-esc-btn:disabled { opacity: 0.6; cursor: default; }

  /* Input */
  .dh-input-row {
    display: flex; gap: 8px; padding: 12px 0 4px;
    border-top: 1px solid var(--sd-border); flex-shrink: 0;
  }
  .dh-input {
    flex: 1; height: 44px; padding: 0 14px;
    border: 1.5px solid var(--sd-border); border-radius: 10px;
    background: var(--sd-white); color: var(--sd-text);
    font-size: 13px; font-family: inherit; outline: none;
    transition: border-color 0.15s;
  }
  .dh-input:focus { border-color: var(--sd-accent); }
  .dh-input:disabled { opacity: 0.6; }
  .dh-send-btn {
    width: 44px; height: 44px; border-radius: 10px; border: none;
    background: var(--sd-accent); cursor: pointer; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0;
    transition: opacity 0.15s;
  }
  .dh-send-btn:disabled { opacity: 0.4; cursor: default; }
  .dh-send-btn:not(:disabled):hover { opacity: 0.85; }
`;