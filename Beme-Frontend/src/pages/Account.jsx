import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import "./Account.css";

/* ── Icons ── */
function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}
function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}
function IconLocation() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function IconCard() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}
function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg className="acc-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

/* ── Row ── */
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
        {badge != null && <span className="acc-row-badge">{badge}</span>}
        <ChevronRight />
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
  const [savedCount, setSavedCount] = useState(null); // null = loading

  /* Live wishlist count */
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

        {/* Hero card */}
        <div className="acc-section acc-section--first">
          <div className="acc-hero-card">
            <div className="acc-hero-top">
              <div className="acc-avatar-ring">
                <span className="acc-avatar-letter">{initials}</span>
                <span className="acc-avatar-online" aria-hidden="true" />
              </div>
              <div className="acc-hero-info">
                <h2 className="acc-hero-name">{displayName}</h2>
                <p className="acc-hero-email">{user?.email}</p>
              </div>
              <button type="button" className="acc-edit-btn" onClick={() => navigate("/account/manage")} aria-label="Edit profile">
                <IconEdit />
              </button>
            </div>

            {/* Stats strip */}
            <div className="acc-stats">
              <div className="acc-stat">
                <span className="acc-stat-val">—</span>
                <span className="acc-stat-label">Orders</span>
              </div>
              {/* ✅ Tappable, shows live count */}
              <button
                type="button"
                className="acc-stat acc-stat--btn"
                onClick={() => navigate("/saved")}
              >
                <span className="acc-stat-val">
                  {savedCount === null ? "—" : savedCount}
                </span>
                <span className="acc-stat-label">Saved</span>
              </button>
              <div className="acc-stat">
                <span className="acc-stat-val">—</span>
                <span className="acc-stat-label">Reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal */}
        <section className="acc-section">
          <p className="acc-section__eyebrow">Personal</p>
          <div className="acc-group">
            <Row
              icon={<IconOrders />}
              label="My orders"
              sub="Track & manage your orders"
              onClick={() => navigate("/orders")}
            />
            {/* ✅ FIXED: was /account/saved → now /saved */}
            <Row
              icon={<IconHeart />}
              label="Saved items"
              sub="Your wishlist"
              badge={savedCount > 0 ? savedCount : undefined}
              onClick={() => navigate("/saved")}
            />
          </div>
        </section>

        {/* Settings */}
        <section className="acc-section">
          <p className="acc-section__eyebrow">Settings</p>
          <div className="acc-group">
            <Row icon={<IconSettings />} label="Manage account" sub="Name, password & preferences" onClick={() => navigate("/account/manage")} />
            <Row icon={<IconLocation />} label="Delivery addresses" sub="Saved locations in Ghana" onClick={() => navigate("/account/addresses")} />
            <Row icon={<IconCard />} label="Payment methods" sub="Paystack & saved cards" onClick={() => navigate("/account/payments")} />
            <Row icon={<IconBell />} label="Notifications" sub="Order updates & alerts" onClick={() => navigate("/account/notifications")} />
          </div>
        </section>

        {/* Support */}
        <section className="acc-section">
          <p className="acc-section__eyebrow">Support</p>
          <div className="acc-group">
            <Row icon={<IconHelp />} label="Help & support" sub="FAQs and guides" onClick={() => navigate("/account/help")} />
            <Row icon={<IconMail />} label="Contact us" sub="supportbememarket@gmail.com" onClick={() => navigate("/account/contact")} />
          </div>
        </section>

        {/* Logout */}
        <section className="acc-section acc-section--last">
          <div className="acc-group">
            <Row icon={<IconLogout />} label="Log out" sub="Sign out of your account" onClick={() => setShowLogoutSheet(true)} danger />
          </div>
        </section>

      </div>

      {showLogoutSheet && (
        <LogoutSheet onConfirm={handleLogout} onCancel={() => setShowLogoutSheet(false)} />
      )}
    </div>
  );
}