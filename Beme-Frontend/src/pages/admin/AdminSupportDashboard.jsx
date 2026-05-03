// src/pages/admin/AdminSupportDashboard.jsx
//
// Route: /admin/support  (wrapped in AdminRoute + RequireAdmin in App.jsx)
//
// Views:
//   List view  — filter tabs (All / Open / Resolved) + ticket rows
//   Chat view  — slide-in panel, customer name + ID pill, messages, reply bar, resolve toggle

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import "../../components/support/SupportChat.css";

/* ── time helpers ── */

function formatTime(ts) {
  if (!ts) return "";
  const d   = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const min = Math.floor((now - d) / 60000);
  if (min < 1)  return "Just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h ago`;
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
  return d.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "short",
  });
}

/* ── SVG icons (no emojis) ── */

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

const IcoInbox = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
  </svg>
);

const IcoCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IcoRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </svg>
);

const IcoUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
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

const IcoSmallCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */

export default function AdminSupportDashboard() {
  const navigate                   = useNavigate();
  const { profile }                = useAuth();
  const adminName                  = profile?.displayName || "Support";

  const [tickets,      setTickets]      = useState([]);
  const [filter,       setFilter]       = useState("open");   // "all" | "open" | "resolved"
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [text,         setText]         = useState("");
  const [sending,      setSending]      = useState(false);
  const [resolving,    setResolving]    = useState(false);
  const [error,        setError]        = useState("");
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);

  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  /* ── real-time ticket list ── */
  useEffect(() => {
    const q = query(
      collection(db, "support_tickets"),
      orderBy("lastActivity", "desc")
    );
    return onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, console.error);
  }, []);

  /* ── real-time messages for active ticket ── */
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

  /* ── mark customer messages as read when admin opens ticket ── */
  useEffect(() => {
    if (!activeTicket?.id || !messages.length) return;
    messages
      .filter(m => m.senderRole === "customer" && !m.isRead)
      .forEach(m =>
        updateDoc(
          doc(db, "support_tickets", activeTicket.id, "messages", m.id),
          { isRead: true }
        ).catch(() => {})
      );
    // Reset unreadByAdmin counter
    if (activeTicket.unreadByAdmin > 0) {
      updateDoc(doc(db, "support_tickets", activeTicket.id), {
        unreadByAdmin: 0,
      }).catch(() => {});
    }
  }, [messages, activeTicket]);

  /* ── send reply ── */
  const handleSend = async () => {
    const body = text.trim();
    if (!body || !activeTicket?.id || sending) return;
    setError("");
    setSending(true);
    setText("");
    try {
      await addDoc(
        collection(db, "support_tickets", activeTicket.id, "messages"),
        {
          senderId:   profile?.id || "admin",
          senderRole: "admin",
          senderName: adminName,
          text:       body,
          createdAt:  serverTimestamp(),
          isRead:     false,
        }
      );
      await updateDoc(doc(db, "support_tickets", activeTicket.id), {
        lastActivity: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      setError("Could not send. Try again.");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* ── resolve / reopen ticket ── */
  const handleToggleStatus = async () => {
    if (!activeTicket?.id || resolving) return;
    setResolving(true);
    const newStatus = activeTicket.status === "open" ? "resolved" : "open";
    try {
      await updateDoc(doc(db, "support_tickets", activeTicket.id), {
        status:       newStatus,
        lastActivity: serverTimestamp(),
      });
      setActiveTicket(prev => ({ ...prev, status: newStatus }));
    } catch (e) {
      console.error(e);
      setError("Could not update status.");
    } finally {
      setResolving(false);
    }
  };

  /* ── open ticket from list ── */
  const openTicket = (t) => {
    setActiveTicket(t);
    setMessages([]);
    setError("");
    setText("");
  };

  const closePanel = () => {
    setActiveTicket(null);
    setMessages([]);
    setError("");
  };

  /* ── filter tickets ── */
  const filtered = tickets.filter(t => {
    if (filter === "all")      return true;
    if (filter === "open")     return t.status === "open";
    if (filter === "resolved") return t.status === "resolved";
    return true;
  });

  const openCount = tickets.filter(t => t.status === "open").length;

  /* ── day dividers ── */
  const withDividers = () => {
    const out = [];
    let lastDay = null;
    messages.forEach(m => {
      const lbl = dayLabel(m.createdAt);
      if (lbl !== lastDay) {
        out.push({ _divider: true, label: lbl, id: `d-${m.id}` });
        lastDay = lbl;
      }
      out.push(m);
    });
    return out;
  };

  const items      = withDividers();
  const isResolved = activeTicket?.status === "resolved";
  const ticketNum  = activeTicket?.id?.slice(-6).toUpperCase() ?? "";

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */

  return (
    <div className="asd-page">

      {/* ── page header ── */}
      <div className="asd-page-header">
        <button
          className="asd-page-header__back"
          onClick={() => navigate("/admin")}
          aria-label="Back to admin"
        >
          <IcoBack />
        </button>

        <div className="asd-page-header__text">
          <span className="asd-page-header__title">Support Inbox</span>
          <span className="asd-page-header__sub">
            {openCount > 0
              ? `${openCount} open ticket${openCount !== 1 ? "s" : ""}`
              : "No open tickets"}
          </span>
        </div>

        {openCount > 0 && (
          <div className="asd-page-header__count">{openCount}</div>
        )}
      </div>

      {/* ── filter tabs ── */}
      <div className="asd-filter-tabs">
        {[
          { key: "open",     label: "Open"     },
          { key: "all",      label: "All"      },
          { key: "resolved", label: "Resolved" },
        ].map(tab => (
          <button
            key={tab.key}
            className={`asd-filter-tab${filter === tab.key ? " asd-filter-tab--active" : ""}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ticket list ── */}
      {filtered.length === 0 ? (
        <div className="asd-list-empty">
          <div className="asd-list-empty__icon">
            <IcoInbox />
          </div>
          <p className="asd-list-empty__title">No tickets here</p>
          <p className="asd-list-empty__sub">
            {filter === "open"
              ? "All tickets are resolved — great work."
              : "No support tickets yet."}
          </p>
        </div>
      ) : (
        <div className="asd-ticket-list">
          {filtered.map(t => {
            const initial = (t.customerName || "C").charAt(0).toUpperCase();
            const isActive = activeTicket?.id === t.id;
            const hasUnread = t.unreadByAdmin > 0;

            return (
              <button
                key={t.id}
                className={[
                  "asd-ticket-item",
                  isActive  ? "asd-ticket-item--active"  : "",
                  hasUnread ? "asd-ticket-item--unread" : "",
                ].join(" ")}
                onClick={() => openTicket(t)}
              >
                {/* avatar */}
                <div className="asd-ticket-item__avatar">{initial}</div>

                {/* body */}
                <div className="asd-ticket-item__body">
                  <div className="asd-ticket-item__row">
                    <span className="asd-ticket-item__name">{t.customerName || "Customer"}</span>
                    <span className="asd-ticket-item__time">{formatTime(t.lastActivity)}</span>
                  </div>
                  <span className="asd-ticket-item__subject">{t.subject}</span>
                  <span className="asd-ticket-item__preview">
                    ID: {t.customerId?.slice(0, 12)}…
                  </span>
                </div>

                {/* right badges */}
                <div className="asd-ticket-item__right">
                  {hasUnread && (
                    <span className="asd-ticket-item__unread">{t.unreadByAdmin}</span>
                  )}
                  <span className={`asd-ticket-item__status asd-ticket-item__status--${t.status}`}>
                    {t.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════
          CHAT PANEL — slides over list
      ══════════════════════════════════════ */}

      {activeTicket && (
        <div className="asd-chat-panel">

          {/* chat header */}
          <div className="asd-chat-header">
            <button
              className="asd-chat-header__back"
              onClick={closePanel}
              aria-label="Back to list"
            >
              <IcoBack />
            </button>

            {/* customer initial avatar */}
            <div className="asd-chat-header__avatar">
              {(activeTicket.customerName || "C").charAt(0).toUpperCase()}
            </div>

            <div className="asd-chat-header__info">
              <span className="asd-chat-header__name">
                {activeTicket.customerName || "Customer"}
              </span>
              <div className="asd-chat-header__meta">
                {/* customer Firebase UID pill — key for locating/fixing issues */}
                <span className="asd-chat-header__id" title="Customer Firebase UID">
                  {activeTicket.customerId}
                </span>
                {activeTicket.customerEmail && (
                  <span className="asd-chat-header__email">
                    {activeTicket.customerEmail}
                  </span>
                )}
              </div>
            </div>

            {/* resolve / reopen */}
            <button
              className={[
                "asd-chat-header__resolve",
                isResolved
                  ? "asd-chat-header__resolve--reopen"
                  : "asd-chat-header__resolve--resolve",
              ].join(" ")}
              onClick={handleToggleStatus}
              disabled={resolving}
            >
              {resolving
                ? "..."
                : isResolved
                  ? <><IcoRefresh /> Reopen</>
                  : <><IcoCheck /> Resolve</>
              }
            </button>
          </div>

          {/* subject strip */}
          <div className="asd-subject-strip">
            <span className="asd-subject-strip__label">Subject</span>
            <span className="asd-subject-strip__text">{activeTicket.subject}</span>
          </div>

          {/* ticket number + status row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 16px",
            borderBottom: "1px solid rgba(17,17,17,0.06)",
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "var(--font-main)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted)",
              opacity: 0.6,
            }}>
              Ticket #{ticketNum}
            </span>
            <span className={`asd-ticket-item__status asd-ticket-item__status--${activeTicket.status}`}>
              {activeTicket.status}
            </span>
          </div>

          {/* messages */}
          <div className="sc-messages">

            {loadingMsgs && (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                <span className="sc-spinner sc-spinner--blue" />
              </div>
            )}

            {!loadingMsgs && messages.length === 0 && (
              <div style={{
                alignSelf: "center",
                marginTop: 40,
                textAlign: "center",
                color: "var(--muted)",
                fontFamily: "var(--font-main)",
                fontSize: 13,
                fontWeight: 500,
                opacity: 0.7,
              }}>
                No messages yet — reply below to start the conversation.
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

              const isAdmin    = item.senderRole === "admin";
              const bubbleCls  = isAdmin ? "asd-bubble--mine" : "asd-bubble--theirs";
              const rowCls     = isAdmin ? "sc-bubble-row--customer" : "sc-bubble-row--admin";

              return (
                <div key={item.id} className={`sc-bubble-row ${rowCls}`}>
                  {/* show bot avatar only for customer messages */}
                  {!isAdmin && (
                    <div className="sc-bubble-row__avatar">
                      <IcoUser />
                    </div>
                  )}
                  <div className="sc-bubble-col">
                    {/* sender label above bubble */}
                    <span style={{
                      fontFamily: "var(--font-main)",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--muted)",
                      opacity: 0.55,
                      padding: "0 4px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      alignSelf: isAdmin ? "flex-end" : "flex-start",
                    }}>
                      {isAdmin ? "You" : item.senderName}
                    </span>

                    <div className={`sc-bubble ${bubbleCls}`}>
                      {item.text}
                    </div>

                    <div className={`sc-bubble-meta sc-bubble-meta--${isAdmin ? "customer" : "admin"}`}>
                      <span>{formatClock(item.createdAt)}</span>
                      {isAdmin && item.isRead && (
                        <span className="sc-bubble-meta__check"><IcoSmallCheck /></span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={endRef} />
          </div>

          {/* resolved banner */}
          {isResolved && (
            <div className="sc-resolved-banner">
              <span className="sc-resolved-banner__icon"><IcoCheck /></span>
              <p className="sc-resolved-banner__text">
                Ticket resolved. Click Reopen if the customer needs further help.
              </p>
            </div>
          )}

          {/* error */}
          {error && <div className="sc-error-bar">{error}</div>}

          {/* reply input */}
          <div className="sc-input-bar">
            <textarea
              ref={inputRef}
              className="sc-input-bar__field"
              placeholder={
                isResolved
                  ? "Ticket is resolved — reopen to reply"
                  : `Reply as ${adminName}…`
              }
              value={text}
              rows={1}
              onChange={e => { setText(e.target.value); setError(""); }}
              onKeyDown={handleKey}
              disabled={sending || isResolved}
            />
            <button
              className="sc-input-bar__send"
              onClick={handleSend}
              disabled={!text.trim() || sending || isResolved}
              aria-label="Send reply"
            >
              {sending
                ? <span className="sc-spinner" style={{ width: 16, height: 16 }} />
                : <IcoSend />
              }
            </button>
          </div>

        </div>
      )}

    </div>
  );
}