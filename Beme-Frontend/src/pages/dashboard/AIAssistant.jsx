import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth }         from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { useAIUsage }      from "../../hooks/useAIUsage";
import { useAIChat }       from "../../hooks/useAIChat";
import { useAIContext }    from "../../hooks/useAIContext";
import AIMessage, { TypingIndicator } from "../../components/ai/AIMessage";

function Ico({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const I = {
  sparkle: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  send:    "M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7Z",
  lock:    "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Z M7 11V7a5 5 0 0 1 10 0v4",
  check:   "M20 6L9 17l-5-5",
  chat:    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
};

const PACKS = [
  { id: "small",          msgs: "50 messages",     price: "$1", ghs: "GHS 15" },
  { id: "medium",         msgs: "200 messages",    price: "$3", ghs: "GHS 45" },
  { id: "unlimited_week", msgs: "7-day unlimited", price: "$5", ghs: "GHS 75" },
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
    } catch (e) { console.error(e); }
    finally { setBusy(null); }
  };
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "var(--sd-white)", borderRadius: 18, padding: "28px 28px 24px", width: "100%", maxWidth: 360, border: "1px solid var(--sd-border)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--sd-text)", letterSpacing: "-0.02em" }}>Get more AI messages</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "var(--sd-muted)", cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: "var(--sd-muted)", marginBottom: 20, fontWeight: 600 }}>Your 15 free messages reset at midnight.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PACKS.map(p => (
            <button key={p.id} onClick={() => buy(p.id)} disabled={!!busy || !!bought}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", background: bought === p.id ? "rgba(21,128,61,0.06)" : "var(--sd-bg)", border: `1px solid ${bought === p.id ? "rgba(21,128,61,0.2)" : "var(--sd-border)"}`, borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.15s", fontFamily: "var(--sd-font)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--sd-text)", marginBottom: 2 }}>
                  {bought === p.id ? "Credits added!" : busy === p.id ? "Processing…" : p.msgs}
                </div>
                <div style={{ fontSize: 12, color: "var(--sd-muted)", fontWeight: 600 }}>{p.ghs}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--sd-accent)", background: "var(--sd-accent-dim)", padding: "5px 12px", borderRadius: 8 }}>{p.price}</div>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--sd-muted)", textAlign: "center", marginTop: 16, fontWeight: 600 }}>Payments via Paystack · Credits added instantly</div>
      </div>
    </div>
  );
}

function LockedState({ onUpgrade }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 480, padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--sd-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: "var(--sd-accent)" }}>
        <Ico d={I.lock} size={28} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--sd-text)", marginBottom: 8, letterSpacing: "-0.03em" }}>Beme AI is a Pro feature</div>
      <div style={{ fontSize: 14, color: "var(--sd-muted)", lineHeight: 1.7, maxWidth: 300, marginBottom: 28, fontWeight: 600 }}>
        Upgrade to unlock your personal AI business assistant with 15 free messages per day.
      </div>
      <button onClick={onUpgrade}
        style={{ padding: "12px 28px", background: "var(--sd-accent)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 8, boxShadow: "0 4px 14px rgba(124,58,237,0.3)", fontFamily: "var(--sd-font)" }}>
        Upgrade to Pro
      </button>
      <div style={{ fontSize: 12, color: "var(--sd-muted)", fontWeight: 600 }}>Cancel anytime · 14-day free trial</div>
    </div>
  );
}

export default function AIAssistant() {
  const [, setParams]    = useSearchParams();
  const { profile, user } = useAuth();
  const { plan }          = useSubscription();
  const { messagesUsed, dailyLimit, messagesRemaining, isAtLimit, isNearLimit, usagePercent } = useAIUsage();
  const { aiContext, suggestions, pageLabel } = useAIContext();
  const { messages, input, setInput, isTyping, error, histLoading, bottomRef, sendMessage } = useAIChat({
    aiContext,
    onLimitReached: () => setShowTopup(true),
  });

  const [showTopup, setShowTopup] = useState(false);
  const isPro    = true; // gate as needed
  const shopName = profile?.shopName || profile?.storeName || "Your Store";
  const bar      = usagePercent >= 100 ? "#ef4444" : usagePercent >= 80 ? "#f59e0b" : "var(--sd-accent)";

  if (!isPro) return <LockedState onUpgrade={() => setParams({ tab: "subscription" })} />;

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", fontFamily: "var(--sd-font)" }}>

      {/* Header */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, var(--sd-accent), #9333ea)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
            <Ico d={I.sparkle} size={15} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--sd-text)", letterSpacing: "-0.03em" }}>Beme AI</div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "var(--sd-accent-dim)", color: "var(--sd-accent)", border: "1px solid var(--sd-accent-border)" }}>PRO</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--sd-muted)", fontWeight: 600, paddingLeft: 44 }}>
          Your AI business assistant — helping <strong style={{ color: "var(--sd-text)" }}>{shopName}</strong> grow
        </div>
      </div>

      {/* Chat container */}
      <div style={{ background: "var(--sd-white)", border: "1px solid var(--sd-border)", borderRadius: 16, boxShadow: "var(--sd-shadow)", overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Chat header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--sd-border-light)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, var(--sd-accent), #9333ea)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <Ico d={I.chat} size={14} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--sd-text)" }}>Beme AI</div>
            <div style={{ fontSize: 11, color: "var(--sd-muted)", fontWeight: 600 }}>Helping {shopName} grow</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "rgba(21,128,61,0.08)", color: "#16a34a", border: "1px solid rgba(21,128,61,0.2)" }}>Online</span>
          </div>
        </div>

        {/* Usage bar */}
        <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--sd-border-light)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: "var(--sd-muted)", fontWeight: 600 }}>
              {isAtLimit ? "Daily limit reached" : `${messagesUsed} / ${dailyLimit} messages today`}
            </span>
            <button onClick={() => setShowTopup(true)} style={{ fontSize: 12, color: "var(--sd-accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}>
              Get more →
            </button>
          </div>
          <div style={{ height: 4, background: "var(--sd-bg)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${usagePercent}%`, background: bar, borderRadius: 4, transition: "width 0.4s ease" }} />
          </div>
          {isNearLimit && !isAtLimit && (
            <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4, fontWeight: 600 }}>
              {messagesRemaining} message{messagesRemaining !== 1 ? "s" : ""} left today
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 2 }}>
          {histLoading ? (
            <div style={{ textAlign: "center", color: "var(--sd-muted)", fontSize: 13, padding: 32, fontWeight: 600 }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ padding: "8px 0" }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, var(--sd-accent), #9333ea)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "#fff" }}>
                  <Ico d={I.sparkle} size={22} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--sd-text)", marginBottom: 6, letterSpacing: "-0.02em" }}>Hi! I'm your Beme AI</div>
                <div style={{ fontSize: 13, color: "var(--sd-muted)", lineHeight: 1.7, maxWidth: 280, margin: "0 auto", fontWeight: 600 }}>
                  Ask me anything about products, orders, analytics, or marketing for <strong style={{ color: "var(--sd-text)" }}>{shopName}</strong>.
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--sd-muted)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, fontWeight: 700 }}>Try asking</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {suggestions.slice(0, 4).map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)}
                    style={{ background: "var(--sd-bg)", border: "1px solid var(--sd-border)", borderRadius: 9, color: "var(--sd-text2)", fontSize: 13, padding: "10px 14px", cursor: "pointer", textAlign: "left", fontWeight: 600, fontFamily: "var(--sd-font)", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--sd-accent-dim)"; e.currentTarget.style.borderColor = "var(--sd-accent-border)"; e.currentTarget.style.color = "var(--sd-accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--sd-bg)"; e.currentTarget.style.borderColor = "var(--sd-border)"; e.currentTarget.style.color = "var(--sd-text2)"; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(m => <AIMessage key={m.id} message={m} isLight />)
          )}
          {isTyping && <TypingIndicator isLight />}
          {error && (
            <div style={{ fontSize: 12, color: "#ef4444", textAlign: "center", padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8, fontWeight: 600 }}>{error}</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 16px 14px", borderTop: "1px solid var(--sd-border-light)", flexShrink: 0, background: "var(--sd-white)" }}>
          {isAtLimit ? (
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--sd-muted)", padding: "8px 0", fontWeight: 600 }}>
              Daily limit reached.{" "}
              <button onClick={() => setShowTopup(true)} style={{ color: "var(--sd-accent)", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Top up →</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder={`Ask me anything about ${pageLabel}…`} rows={1} disabled={isTyping}
                style={{ flex: 1, background: "var(--sd-bg)", border: "1px solid var(--sd-border)", borderRadius: 10, color: "var(--sd-text)", fontSize: 13, padding: "10px 13px", resize: "none", outline: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto", fontFamily: "var(--sd-font)", fontWeight: 600, transition: "border-color 0.15s, box-shadow 0.15s" }}
                onFocus={e => { e.target.style.borderColor = "var(--sd-accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.10)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--sd-border)"; e.target.style.boxShadow = "none"; }}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} />
              <button onClick={() => sendMessage()} disabled={!input.trim() || isTyping}
                style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, border: "none", background: input.trim() && !isTyping ? "var(--sd-accent)" : "var(--sd-bg)", cursor: input.trim() && !isTyping ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", color: input.trim() && !isTyping ? "#fff" : "var(--sd-muted)", transition: "all 0.15s" }}>
                <Ico d={I.send} size={15} color={input.trim() && !isTyping ? "#fff" : "var(--sd-muted)"} />
              </button>
            </div>
          )}
          <div style={{ fontSize: 10, color: "var(--sd-muted)", textAlign: "center", marginTop: 6, fontWeight: 600 }}>Enter to send · Shift+Enter for new line</div>
        </div>
      </div>

      {showTopup && <TopupModal onClose={() => setShowTopup(false)} />}
    </div>
  );
}