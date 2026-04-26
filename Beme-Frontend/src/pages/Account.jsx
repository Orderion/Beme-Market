import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useUserUnreadCount } from "../hooks/useNotifications";
import "./Account.css";

/* ── Icons ── */
function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}
function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}
function IconLocation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}
function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function IconBusiness() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  );
}
function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}

/* ── NEW: Request icon ── */
function IconRequest() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  );
}

/* ── Quick action tile ── */
function QuickTile({ icon, label, onClick, badge }) {
  return (
    <button type="button" className="acc-tile" onClick={onClick}>
      <div className="acc-tile-icon">
        {icon}
        {badge != null && badge > 0 && (
          <span className="acc-tile-badge">{badge}</span>
        )}
      </div>
      <span className="acc-tile-label">{label}</span>
    </button>
  );
}

/* ── List Row ── */
function Row({ icon, label, sub, onClick, danger, badge }) {
  return (
    <button type="button" className={`acc-row${danger ? " acc-row--danger" : ""}`} onClick={onClick}>
      <div className="acc-row-left">
        <div className="acc-row-icon-wrap">{icon}</div>
        <div className="acc-row-text">
          <span className="acc-row-label">{label}</span>
          {sub && <span className="acc-row-sub">{sub}</span>}
        </div>
      </div>
      <div className="acc-row-right">
        {badge != null && badge > 0 && (
          <span className="acc-row-badge">{badge}</span>
        )}
        <svg className="acc-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </button>
  );
}

/* ── Logout sheet ── */
function LogoutSheet({ onConfirm, onCancel }) {
  return (
    <div className="acc-sheet-backdrop" onClick={onCancel}>
      <div className="acc-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="acc-sheet__bar" />
        <p className="acc-sheet__title">Log out?</p>
        <p className="acc-sheet__sub">Are you sure you want to log out of your Beme Market account?</p>
        <button type="button" className="acc-sheet__btn acc-sheet__btn--danger" onClick={onConfirm}>Log out</button>
        <button type="button" className="acc-sheet__btn acc-sheet__btn--cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function Account() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [savedCount, setSavedCount] = useState(null);

  /* Real-time unread notification count badge */
  const { unreadCount } = useUserUnreadCount();

  useEffect(() => {
    if (!user) { setSavedCount(0); return; }
    const colRef = collection(db, "users", user.uid, "wishlist");
    const unsub = onSnapshot(colRef, (snap) => setSavedCount(snap.size));
    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const initials = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : (user?.email?.charAt(0).toUpperCase() || "U");

  const displayName = user?.displayName || "Beme Customer";

  return (
    <div className="acc-page">
      <div className="acc-body">

        {/* ── Header hero ── */}
        <div className="acc-header">
          <div className="acc-header-left">
            <h1 className="acc-hero-name">{displayName}</h1>
            <div className="acc-rating-pill">
              <IconStar />
              <span>Beme Member</span>
            </div>
          </div>
          <button
            type="button"
            className="acc-avatar-btn"
            onClick={() => navigate("/account/manage")}
            aria-label="Edit profile"
          >
            <div className="acc-avatar-ring">
              <span className="acc-avatar-letter">{initials}</span>
            </div>
          </button>
        </div>

        {/* ── Quick tiles ── */}
        <div className="acc-tiles-row">
          <QuickTile
            icon={<IconOrders />}
            label="Orders"
            onClick={() => navigate("/orders")}
          />
          <QuickTile
            icon={<IconHeart />}
            label="Saved"
            onClick={() => navigate("/saved")}
            badge={savedCount}
          />
          <QuickTile
            icon={<IconSettings />}
            label="Settings"
            onClick={() => navigate("/account/manage")}
          />
        </div>

        {/* ── Promo card ── */}
        <div className="acc-promo-card" onClick={() => navigate("/account/manage")}>
          <div className="acc-promo-text">
            <p className="acc-promo-title">Complete your profile</p>
            <p className="acc-promo-sub">Add your address & payment method for faster checkout</p>
          </div>
          <div className="acc-promo-icon">
            <IconShield />
          </div>
        </div>

        {/* ── Personal rows ── */}
        <div className="acc-list-group">
          <Row
            icon={<IconOrders />}
            label="My orders"
            sub="Track & manage your orders"
            onClick={() => navigate("/orders")}
          />
          <Row
            icon={<IconHeart />}
            label="Saved items"
            sub="Your wishlist"
            badge={savedCount > 0 ? savedCount : undefined}
            onClick={() => navigate("/saved")}
          />
          {/* ── NEW: My requests row ── */}
          <Row
            icon={<IconRequest />}
            label="My requests"
            sub="Track your product requests"
            onClick={() => navigate("/account/requests")}
          />
        </div>

        {/* ── Settings rows ── */}
        <div className="acc-list-group">
          <Row icon={<IconSettings />}  label="Manage account"     sub="Name, password & preferences"  onClick={() => navigate("/account/manage")} />
          <Row icon={<IconLocation />}  label="Delivery addresses" sub="Saved locations in Ghana"       onClick={() => navigate("/account/addresses")} />
          <Row icon={<IconCard />}      label="Payment methods"    sub="Paystack & saved cards"         onClick={() => navigate("/account/payments")} />
          {/* ── Notifications row — now shows live unread badge ── */}
          <Row
            icon={<IconBell />}
            label="Notifications"
            sub="Order updates & alerts"
            badge={unreadCount > 0 ? unreadCount : undefined}
            onClick={() => navigate("/account/notifications")}
          />
        </div>

        {/* ── Support rows ── */}
        <div className="acc-list-group">
          <Row icon={<IconHelp />} label="Help & support" sub="FAQs and guides"           onClick={() => navigate("/account/help")} />
          <Row icon={<IconMail />} label="Contact us"     sub="supportbememarket@gmail.com" onClick={() => navigate("/account/contact")} />
        </div>

        {/* ── Logout ── */}
        <div className="acc-list-group acc-list-group--last">
          <Row icon={<IconLogout />} label="Log out" sub="Sign out of your account" onClick={() => setShowLogoutSheet(true)} danger />
        </div>

        <p className="acc-footer-note">Beme Market · Ghana 🇬🇭</p>

      </div>

      {showLogoutSheet && (
        <LogoutSheet onConfirm={handleLogout} onCancel={() => setShowLogoutSheet(false)} />
      )}
    </div>
  );
}