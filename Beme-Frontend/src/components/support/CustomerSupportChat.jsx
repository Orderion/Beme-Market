// src/components/support/CustomerSupportChat.jsx
//
// Drop inside HelpSupport in AccountSubPages.jsx.
// Props:
//   customerName  — string (from useAuth profile.displayName)
//   customerId    — string (firebase uid)
//   customerEmail — string (firebase user email)
//
// Views:
//   "home"  — gradient hero + channel cards + past conversations
//   "start" — inline subject form before opening a new ticket
//   "chat"  — full-screen overlay with messages + chips + input

import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import "./SupportChat.css";

const WHATSAPP_NUMBER = "233XXXXXXXXX"; // replace
const SUPPORT_EMAIL   = "support@bememarket.store";

const QUICK_CHIPS = [
  "Track my order",
  "Return or refund",
  "Payment issue",
  "Change my address",
  "Speak to a person",
];

/* ── time helpers ── */

function formatTime(ts) {
  if (!ts) return "";
  const d   = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const min = Math.floor((now - d) / 60000);
  if (min < 1)   return "Just now";
  if (min < 60)  return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `${h}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatClock(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(ts) {
  if (!ts) return "";
  const d         = ts.toDate ? ts.toDate() : new Date(ts);
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

/* ── SVG icons (zero emojis) ── */

const IcoChat = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);

const IcoHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IcoBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const IcoSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const IcoMenu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5"  r="1" fill="currentColor"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
    <circle cx="12" cy="19" r="1" fill="currentColor"/>
  </svg>
);

const IcoBot = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
    <circle cx="9"  cy="16" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

const IcoLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    <circle cx="9"  cy="11" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

const IcoCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IcoWhatsApp = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03a11.784 11.784 0 001.592 5.96L0 24l6.12-1.605a11.77 11.77 0 005.926 1.605h.005c6.635 0 12.032-5.396 12.035-12.03.003-3.214-1.248-6.234-3.518-8.504z"/>
  </svg>
);

const IcoEmail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IcoChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */

export default function CustomerSupportChat({ customerName, customerId, customerEmail }) {
  const [view,         setView]         = useState("home");  // "home" | "start" | "chat"
  const [activeTab,    setActiveTab]    = useState("home");
  const [tickets,      setTickets]      = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [text,         setText]         = useState("");
  const [subject,      setSubject]      = useState("");
  const [sending,      setSending]      = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [error,        setError]        = useState("");
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);

  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  /* ── listen to customer's own tickets ── */
  useEffect(() => {
    if (!customerId) return;
    const q = query(collection(db, "support_tickets"), orderBy("lastActivity", "desc"));
    return onSnapshot(q, (snap) => {
      setTickets(
        snap.docs
          .filter(d => d.data().customerId === customerId)
          .map(d => ({ id: d.id, ...d.data() }))
      );
    }, console.error);
  }, [customerId]);

  /* ── listen to active ticket messages ── */
  useEffect(() => {
    if (!activeTicket?.id) return;
    setLoadingMsgs(true);
    const q = query(
      collection(db, "support_tickets", activeTicket.id, "messages"),
      orderBy("createdAt", "asc")
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingMsgs(false);
    }, (err) => { console.error(err); setLoadingMsgs(false); });
  }, [activeTicket?.id]);

  /* ── mark admin messages read ── */
  useEffect(() => {
    if (!activeTicket?.id) return;
    messages
      .filter(m => m.senderRole === "admin" && !m.isRead)
      .forEach(m =>
        updateDoc(doc(db, "support_tickets", activeTicket.id, "messages", m.id), { isRead: true })
          .catch(() => {})
      );
  }, [messages, activeTicket?.id]);

  /* ── create ticket ── */
  const handleStartChat = async () => {
    if (!subject.trim()) { setError("Please describe your issue briefly."); return; }
    if (!customerId)     { setError("You must be logged in to start a chat."); return; }
    setError("");
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, "support_tickets"), {
        customerId,
        customerName:  customerName  || "Customer",
        customerEmail: customerEmail || "",
        subject:       subject.trim(),
        status:        "open",
        createdAt:     serverTimestamp(),
        lastActivity:  serverTimestamp(),
        unreadByAdmin: 0,
      });

      await addDoc(collection(db, "support_tickets", ref.id, "messages"), {
        senderId:   customerId,
        senderRole: "customer",
        senderName: customerName || "Customer",
        text:       subject.trim(),
        createdAt:  serverTimestamp(),
        isRead:     false,
      });

      await updateDoc(doc(db, "support_tickets", ref.id), { unreadByAdmin: 1 });

      setActiveTicket({
        id: ref.id, customerId, subject: subject.trim(),
        customerName: customerName || "Customer",
        customerEmail: customerEmail || "",
        status: "open", unreadByAdmin: 1,
      });
      setSubject("");
      setView("chat");
    } catch (e) {
      console.error(e);
      setError("Could not start chat. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  /* ── send message ── */
  const handleSend = async (override) => {
    const body = (override ?? text).trim();
    if (!body || !activeTicket?.id || sending) return;
    if (activeTicket.status === "resolved") {
      setError("This ticket is resolved. Start a new chat for more help.");
      return;
    }
    setError("");
    setSending(true);
    setText("");
    try {
      await addDoc(collection(db, "support_tickets", activeTicket.id, "messages"), {
        senderId:   customerId,
        senderRole: "customer",
        senderName: customerName || "Customer",
        text:       body,
        createdAt:  serverTimestamp(),
        isRead:     false,
      });
      await updateDoc(doc(db, "support_tickets", activeTicket.id), {
        lastActivity:  serverTimestamp(),
        unreadByAdmin: (activeTicket.unreadByAdmin || 0) + 1,
      });
    } catch (e) {
      console.error(e);
      setError("Message failed. Try again.");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const openTicket = (t) => {
    setActiveTicket(t);
    setMessages([]);
    setError("");
    setView("chat");
  };

  const goHome = () => {
    setView("home");
    setActiveTicket(null);
    setMessages([]);
    setError("");
  };

  /* ── inject day dividers ── */
  const withDividers = () => {
    const out = [];
    let lastDay = null;
    messages.forEach((m) => {
      const lbl = dayLabel(m.createdAt);
      if (lbl !== lastDay) { out.push({ _divider: true, label: lbl, id: `d-${m.id}` }); lastDay = lbl; }
      out.push(m);
    });
    return out;
  };

  const firstName = customerName?.split(" ")[0] || "there";

  /* ══════════════════════════════════════
     HOME / START VIEW
  ══════════════════════════════════════ */
  if (view !== "chat") {
    return (
      <div className="sc-home">

        {/* hero */}
        <div className="sc-hero">
          <div className="sc-hero__brand">
            <div className="sc-hero__logo"><IcoLogo /></div>
            <span className="sc-hero__brand-name">Beme Support</span>
          </div>
          <p className="sc-hero__title">Hi {firstName}, how can we help?</p>
          <p className="sc-hero__sub">Our team is here for orders, returns, and account issues.</p>
        </div>

        {/* channel cards */}
        <div className="sc-channels">

          <button className="sc-channel-card" onClick={() => setView("start")}>
            <div className="sc-channel-card__icon sc-channel-card__icon--live"><IcoChat /></div>
            <div className="sc-channel-card__text">
              <span className="sc-channel-card__title">Start Live Chat</span>
              <span className="sc-channel-card__sub">Chat with our support team</span>
            </div>
            <span className="sc-channel-card__chevron"><IcoChevron /></span>
          </button>

          <button
            className="sc-channel-card"
            onClick={() =>
              window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C+I+need+help`, "_blank")
            }
          >
            <div className="sc-channel-card__icon sc-channel-card__icon--whatsapp"><IcoWhatsApp /></div>
            <div className="sc-channel-card__text">
              <span className="sc-channel-card__title">Continue on WhatsApp</span>
              <span className="sc-channel-card__sub">Instant replies via WhatsApp</span>
            </div>
            <span className="sc-channel-card__chevron"><IcoChevron /></span>
          </button>

          <button
            className="sc-channel-card"
            onClick={() =>
              window.open(`mailto:${SUPPORT_EMAIL}?subject=Support%20Request`, "_blank")
            }
          >
            <div className="sc-channel-card__icon sc-channel-card__icon--sms"><IcoEmail /></div>
            <div className="sc-channel-card__text">
              <span className="sc-channel-card__title">Email Us</span>
              <span className="sc-channel-card__sub">{SUPPORT_EMAIL}</span>
            </div>
            <span className="sc-channel-card__chevron"><IcoChevron /></span>
          </button>

        </div>

        {/* inline start form */}
        {view === "start" && (
          <div style={{ padding: "4px 16px 24px" }}>
            <p className="sc-section-label">Describe your issue</p>
            <input
              className="sc-start-screen__input"
              type="text"
              placeholder="e.g. My order has not arrived"
              value={subject}
              onChange={e => { setSubject(e.target.value); setError(""); }}
              disabled={creating}
              maxLength={120}
            />
            {error && (
              <div className="sc-error-bar" style={{ marginTop: 10 }}>{error}</div>
            )}
            <button
              className="sc-start-screen__btn"
              style={{ marginTop: 14 }}
              onClick={handleStartChat}
              disabled={creating || !subject.trim()}
            >
              {creating
                ? <><span className="sc-spinner" />Starting...</>
                : "Start Chat"
              }
            </button>
          </div>
        )}

        {/* conversations */}
        {tickets.length > 0 && (
          <>
            <p className="sc-section-label">Your Conversations</p>
            <div className="sc-conv-list">
              {tickets.map(t => (
                <button key={t.id} className="sc-conv-item" onClick={() => openTicket(t)}>
                  <div className="sc-conv-avatar sc-conv-avatar--support">
                    <IcoBot />
                    <span className="sc-conv-avatar__online" />
                  </div>
                  <div className="sc-conv-body">
                    <div className="sc-conv-row">
                      <span className="sc-conv-name">Support Team</span>
                      <span className="sc-conv-time">{formatTime(t.lastActivity)}</span>
                    </div>
                    <span className="sc-conv-preview">{t.subject}</span>
                  </div>
                  {t.unreadByAdmin > 0 && (
                    <span className="sc-conv-unread">{t.unreadByAdmin}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {tickets.length === 0 && view === "home" && (
          <p className="sc-conv-empty">No conversations yet</p>
        )}

        {/* bottom nav */}
        <div className="sc-bottom-nav" style={{ marginTop: "auto" }}>
          <button
            className={`sc-bottom-nav__btn${activeTab === "home" ? " sc-bottom-nav__btn--active" : ""}`}
            onClick={() => { setActiveTab("home"); setView("home"); }}
          >
            <IcoHome />
            <span className="sc-bottom-nav__label">Home</span>
          </button>
          <button
            className={`sc-bottom-nav__btn${activeTab === "chats" ? " sc-bottom-nav__btn--active" : ""}`}
            onClick={() => { setActiveTab("chats"); setView("home"); }}
          >
            <IcoChat />
            <span className="sc-bottom-nav__label">Chats</span>
          </button>
        </div>

      </div>
    );
  }

  /* ══════════════════════════════════════
     CHAT VIEW — full screen overlay
  ══════════════════════════════════════ */

  const items      = withDividers();
  const isResolved = activeTicket?.status === "resolved";
  const ticketNum  = activeTicket?.id?.slice(-6).toUpperCase() ?? "";

  return (
    <div className="sc-overlay">

      {/* header */}
      <div className="sc-header">
        <button className="sc-header__back" onClick={goHome} aria-label="Back">
          <IcoBack />
        </button>
        <div className="sc-header__logo"><IcoLogo /></div>
        <div className="sc-header__info">
          <span className="sc-header__title">Beme Support</span>
          <div className="sc-header__status">
            <span className={`sc-header__dot${isResolved ? " sc-header__dot--offline" : ""}`} />
            {isResolved ? "Resolved" : "Online — typically replies in minutes"}
          </div>
        </div>
        <button className="sc-header__menu" aria-label="Options"><IcoMenu /></button>
      </div>

      {/* ticket strip */}
      {ticketNum && (
        <div className="sc-ticket-strip">
          <span className="sc-ticket-strip__label">Ticket</span>
          <span className="sc-ticket-strip__id">#{ticketNum}</span>
        </div>
      )}

      {/* messages */}
      <div className="sc-messages">

        {/* greeting (empty state) */}
        {!loadingMsgs && messages.length === 0 && (
          <div className="sc-bubble-row sc-bubble-row--admin">
            <div className="sc-bubble-row__avatar"><IcoBot /></div>
            <div className="sc-bubble-col">
              <div className="sc-bubble sc-bubble--admin">
                Hi {firstName} — I can help with order tracking, account settings,
                or connect you with our team.
              </div>
              <div className="sc-bubble sc-bubble--admin"
                style={{ marginTop: 4, background: "rgba(4,110,242,0.06)",
                  border: "1.5px solid rgba(4,110,242,0.12)", color: "var(--text)" }}>
                How can I help you today?
              </div>
            </div>
          </div>
        )}

        {loadingMsgs && (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <span className="sc-spinner sc-spinner--blue" />
          </div>
        )}

        {items.map(item => {
          if (item._divider) {
            return (
              <div className="sc-day-divider" key={item.id}>
                <div className="sc-day-divider__line" />
                <span className="sc-day-divider__label">{item.label}</span>
                <div className="sc-day-divider__line" />
              </div>
            );
          }
          const mine = item.senderRole === "customer";
          return (
            <div key={item.id}
              className={`sc-bubble-row sc-bubble-row--${mine ? "customer" : "admin"}`}>
              {!mine && (
                <div className="sc-bubble-row__avatar"><IcoBot /></div>
              )}
              <div className="sc-bubble-col">
                <div className={`sc-bubble sc-bubble--${mine ? "customer" : "admin"}`}>
                  {item.text}
                </div>
                <div className={`sc-bubble-meta sc-bubble-meta--${mine ? "customer" : "admin"}`}>
                  <span>{formatClock(item.createdAt)}</span>
                  {mine && item.isRead && (
                    <span className="sc-bubble-meta__check"><IcoCheck /></span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={endRef} />
      </div>

      {/* quick chips — only when no messages yet */}
      {!loadingMsgs && messages.length === 0 && !isResolved && (
        <div className="sc-chips">
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip}
              className="sc-chip"
              onClick={() => handleSend(chip)}
              disabled={sending}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* resolved banner */}
      {isResolved && (
        <div className="sc-resolved-banner">
          <span className="sc-resolved-banner__icon"><IcoCheck /></span>
          <p className="sc-resolved-banner__text">
            This ticket has been resolved. Start a new chat if you need more help.
          </p>
        </div>
      )}

      {/* error */}
      {error && <div className="sc-error-bar">{error}</div>}

      {/* input */}
      <div className="sc-input-bar">
        <textarea
          ref={inputRef}
          className="sc-input-bar__field"
          placeholder="Type message here"
          value={text}
          rows={1}
          onChange={e => { setText(e.target.value); setError(""); }}
          onKeyDown={handleKey}
          disabled={sending || isResolved}
        />
        <button
          className="sc-input-bar__send"
          onClick={() => handleSend()}
          disabled={!text.trim() || sending || isResolved}
          aria-label="Send"
        >
          {sending
            ? <span className="sc-spinner" style={{ width: 16, height: 16 }} />
            : <IcoSend />
          }
        </button>
      </div>

    </div>
  );
}