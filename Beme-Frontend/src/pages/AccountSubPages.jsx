/* ─────────────────────────────────────────────────────
   SavedItems.jsx file
───────────────────────────────────────────────────── */
import { useNavigate } from "react-router-dom";
import SubPageHeader from "../components/SubPageHeader";
import "./SubPages.css";

export function SavedItems() {
  const navigate = useNavigate();
  return (
    <div className="sp-page">
      <SubPageHeader title="Saved Items" />
      <div className="sp-body">
        <div className="sp-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
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
   Notifications.jsx
───────────────────────────────────────────────────── */
export function Notifications() {
  return (
    <div className="sp-page">
      <SubPageHeader title="Notifications" />
      <div className="sp-body">
        <div className="sp-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </div>
        <p className="sp-empty-title">No notifications yet</p>
        <p className="sp-empty-sub">
          We'll let you know when your order ships, arrives, or when there are new offers for you.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   HelpSupport.jsx
   Replace WHATSAPP_NUMBER and SUPPORT_EMAIL below
───────────────────────────────────────────────────── */
const WHATSAPP_NUMBER = "233XXXXXXXXX"; /* e.g. 233244123456 — no + or spaces */
const SUPPORT_EMAIL = "support@bememarket.store";

export function HelpSupport() {
  const openWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20need%20help%20with%20my%20order.`, "_blank");
  };

  const openEmail = () => {
    window.open(`mailto:${SUPPORT_EMAIL}?subject=Be%20Me%20Market%20Support`, "_blank");
  };

  return (
    <div className="sp-page">
      <SubPageHeader title="Help & Support" />
      <div className="sp-body sp-body--flush">
        <p className="sp-section-label">Reach Us</p>
        
        <button className="sp-action-card" onClick={openWhatsApp}>
          <div className="sp-action-card__icon">
             <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
               <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03a11.784 11.784 0 001.592 5.96L0 24l6.12-1.605a11.77 11.77 0 005.926 1.605h.005c6.635 0 12.032-5.396 12.035-12.03.003-3.214-1.248-6.234-3.518-8.504z" />
             </svg>
          </div>
          <div className="sp-action-card__text">
            <p className="sp-action-card__title">WhatsApp Support</p>
            <p className="sp-action-card__sub">Instant chat with our team</p>
          </div>
        </button>

        <button className="sp-action-card" onClick={openEmail}>
          <div className="sp-action-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="sp-action-card__text">
            <p className="sp-action-card__title">Email Us</p>
            <p className="sp-action-card__sub">{SUPPORT_EMAIL}</p>
          </div>
        </button>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ContactUs.jsx
───────────────────────────────────────────────────── */
const PHONE_HREF  = "tel:+233XXXXXXXXX"; /* replace with real number */

export function ContactUs() {
  return (
    <div className="sp-page">
      <SubPageHeader title="Contact Us" />
      <div className="sp-body sp-body--flush">

        <p className="sp-section-label">Call Us Directly</p>

        <a href={PHONE_HREF} className="sp-action-card sp-action-card--link">
          <div className="sp-action-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.8 19.79 19.79 0 01.1 2.18 2 2 0 012.08 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 007.29 7.29l1.17-1.17a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
          </div>
          <div className="sp-action-card__text">
            <p className="sp-action-card__title">Give us a call</p>
            <p className="sp-action-card__sub">Mon-Fri · 9am - 6pm</p>
          </div>
        </a>

      </div>
    </div>
  );
}
