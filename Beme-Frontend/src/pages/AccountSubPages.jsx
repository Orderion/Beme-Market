// src/pages/AccountSubPages.jsx
// Neo-brutalist reskin — hard borders, offset shadows, raw uppercase type.
// Logic and routing are unchanged.
// UPDATED: Notifications now shows real Firebase data via useUserNotifications.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserNotifications } from "../hooks/useNotifications";
import CustomerSupportChat from "../components/support/CustomerSupportChat";
import SubPageHeader from "../components/SubPageHeader";
import "./SubPages.css";

/* ─────────────────────────────────────────────────────
   SVG icons
───────────────────────────────────────────────────── */

function IcoHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      width="36" height="36">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  );
}

function IcoBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      width="36" height="36">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}

function IcoPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      width="20" height="20">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.8 19.79 19.79 0 01.1 2.18 2 2 0 012.08 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 007.29 7.29l1.17-1.17a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
}

function IcoCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      width="14" height="14">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function IcoCheckAll() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      width="15" height="15">
      <polyline points="2 12 7 17 16 6"/>
      <polyline points="8 12 13 17 22 6"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────
   Brutalist decorative stripe
───────────────────────────────────────────────────── */
function BrutalStripe() {
  return (
    <div style={{
      width: "100%",
      maxWidth: 320,
      height: 6,
      background: "repeating-linear-gradient(90deg, var(--grtheme, #FF6600) 0px, var(--grtheme, #FF6600) 16px, transparent 16px, transparent 24px)",
      marginBottom: 28,
    }} />
  );
}

/* ─────────────────────────────────────────────────────
   Notification type badge colour map
───────────────────────────────────────────────────── */
const TYPE_COLORS = {
  admin:   { bg: "rgba(230,126,34,0.12)", color: "#e67e22", label: "Admin"   },
  order:   { bg: "rgba(34,197,94,0.12)",  color: "#22c55e", label: "Order"   },
  promo:   { bg: "rgba(99,102,241,0.12)", color: "#818cf8", label: "Promo"   },
  general: { bg: "rgba(100,116,139,0.1)", color: "#94a3b8", label: "General" },
};

function typeMeta(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.general;
}

/* ─────────────────────────────────────────────────────
   SavedItems  — UNCHANGED
───────────────────────────────────────────────────── */

export function SavedItems() {
  const navigate = useNavigate();
  return (
    <div className="sp-page">
      <SubPageHeader title="Saved Items" />
      <div className="sp-body">
        <BrutalStripe />
        <div className="sp-empty-icon">
          <IcoHeart />
        </div>
        <p className="sp-empty-title">No saved items yet</p>
        <p className="sp-empty-sub">
          Tap the heart on any product to save it here for later.
        </p>
        <button className="sp-primary-btn" onClick={() => navigate("/shop")}>
          Browse the Shop
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Notifications  — REAL DATA
───────────────────────────────────────────────────── */

export function Notifications() {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    formatTime,
  } = useUserNotifications();

  const [expandedId,   setExpandedId]   = useState(null);
  const [markingAll,   setMarkingAll]   = useState(false);

  /* toggle open a notification and mark it read */
  const handleOpen = async (notif) => {
    const isExpanding = expandedId !== notif.id;
    setExpandedId(isExpanding ? notif.id : null);
    if (isExpanding && !notif.read) {
      await markRead(notif.id, user?.uid);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await markAllRead();
    setMarkingAll(false);
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="sp-page">
        <SubPageHeader title="Notifications" />
        <div className="notif-body">
          {[1, 2, 3].map((n) => (
            <div key={n} className="notif-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="sp-page">
        <SubPageHeader title="Notifications" />
        <div className="sp-body">
          <div className="sp-empty-icon sp-empty-icon--warn">
            <IcoBell />
          </div>
          <p className="sp-empty-title">Couldn't load</p>
          <p className="sp-empty-sub">{error}</p>
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (notifications.length === 0) {
    return (
      <div className="sp-page">
        <SubPageHeader title="Notifications" />
        <div className="sp-body">
          <BrutalStripe />
          <div className="sp-empty-icon">
            <IcoBell />
          </div>
          <p className="sp-empty-title">No notifications yet</p>
          <p className="sp-empty-sub">
            We'll let you know when your order ships, arrives, or when
            there are new offers for you.
          </p>
        </div>
      </div>
    );
  }

  /* ── Real list ── */
  return (
    <div className="sp-page">
      <SubPageHeader title="Notifications" />

      <div className="notif-body">

        {/* ── Header row: count + mark all read ── */}
        <div className="notif-header-row">
          <div className="notif-header-left">
            <span className="notif-header-title">Inbox</span>
            {unreadCount > 0 && (
              <span className="notif-unread-badge">{unreadCount} new</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              className="notif-mark-all-btn"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <span className="notif-spinner" />
              ) : (
                <IcoCheckAll />
              )}
              Mark all read
            </button>
          )}
        </div>

        {/* ── Notification list ── */}
        <div className="notif-list">
          {notifications.map((notif) => {
            const isExpanded = expandedId === notif.id;
            const meta       = typeMeta(notif.type);

            return (
              <button
                key={notif.id}
                className={[
                  "notif-item",
                  !notif.read    ? "notif-item--unread"   : "",
                  isExpanded     ? "notif-item--expanded"  : "",
                ].join(" ")}
                onClick={() => handleOpen(notif)}
              >
                {/* Unread dot */}
                {!notif.read && <span className="notif-dot" />}

                {/* Top row */}
                <div className="notif-item__top">
                  <div className="notif-item__meta">
                    <span
                      className="notif-type-badge"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="notif-item__time">
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>

                  {/* Read tick */}
                  {notif.read && (
                    <span className="notif-read-tick">
                      <IcoCheck />
                    </span>
                  )}
                </div>

                {/* Title */}
                <p className="notif-item__title">{notif.title}</p>

                {/* Body — collapsed: single line. expanded: full */}
                <p className={`notif-item__body ${isExpanded ? "notif-item__body--full" : ""}`}>
                  {notif.body}
                </p>

                {/* Image — only when expanded */}
                {isExpanded && notif.imageUrl && (
                  <div className="notif-item__img-wrap">
                    <img
                      src={notif.imageUrl}
                      alt={notif.title}
                      className="notif-item__img"
                    />
                  </div>
                )}

                {/* Expand chevron */}
                <div className="notif-item__footer">
                  <svg
                    className={`notif-chevron ${isExpanded ? "notif-chevron--up" : ""}`}
                    viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    width="13" height="13">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                  <span className="notif-item__hint">
                    {isExpanded ? "Show less" : "Show more"}
                  </span>
                </div>

              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   HelpSupport  — UNCHANGED
───────────────────────────────────────────────────── */

export function HelpSupport() {
  const { user, profile } = useAuth();

  const customerName  = user?.displayName || profile?.displayName || "Customer";
  const customerId    = user?.uid          || "";
  const customerEmail = user?.email        || "";

  return (
    <div className="sp-page">
      <SubPageHeader title="Help & Support" />
      <div className="sp-body sp-body--flush" style={{ padding: 0, flex: 1 }}>
        <CustomerSupportChat
          customerName={customerName}
          customerId={customerId}
          customerEmail={customerEmail}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ContactUs  — UNCHANGED
───────────────────────────────────────────────────── */

const PHONE_HREF = "tel:+233XXXXXXXXX";

export function ContactUs() {
  return (
    <div className="sp-page">
      <SubPageHeader title="Contact Us" />
      <div className="sp-body sp-body--flush">

        <p className="sp-section-label">Call Us Directly</p>

        <a href={PHONE_HREF} className="sp-action-card sp-action-card--link">
          <div className="sp-action-card__icon">
            <IcoPhone />
          </div>
          <div className="sp-action-card__text">
            <p className="sp-action-card__title">Give us a call</p>
            <p className="sp-action-card__sub">Mon – Fri · 9 am – 6 pm</p>
          </div>
        </a>

      </div>
    </div>
  );
}