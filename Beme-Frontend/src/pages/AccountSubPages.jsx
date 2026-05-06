// src/pages/AccountSubPages.jsx
// Neo-brutalist reskin — hard borders, offset shadows, raw uppercase type.
// Logic and routing are unchanged.

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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

/* ─────────────────────────────────────────────────────
   Brutalist decorative stripe — used as visual accent
   above empty-state blocks
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
   SavedItems
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
   Notifications
───────────────────────────────────────────────────── */

export function Notifications() {
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
          We will let you know when your order ships, arrives, or when
          there are new offers for you.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   HelpSupport
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
   ContactUs
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