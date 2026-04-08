import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Account.css";

/* ── Icons ─────────────────────────────────────────── */

function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function IconLocation() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" className="acc-row-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function Row({ icon, label, onClick, danger }) {
  return (
    <button className={`acc-row ${danger ? "acc-row--danger" : ""}`} onClick={onClick}>
      <div className="acc-row-content">
        {icon}
        <span className="acc-row-label">{label}</span>
      </div>
      <svg className="acc-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function LogoutSheet({ onConfirm, onCancel }) {
  return (
    <div className="acc-sheet-backdrop" onClick={onCancel}>
      <div className="acc-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="acc-sheet__bar" />
        <p className="acc-sheet__title">Log Out?</p>
        <p className="acc-sheet__sub">Are you sure you want to log out of your account?</p>
        <button className="acc-sheet__btn acc-sheet__btn--danger" onClick={onConfirm}>Log Out</button>
        <button className="acc-sheet__btn acc-sheet__btn--cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function Account() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="acc-page">
      <div className="acc-hero">
        <div className="acc-avatar">
          {user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || "U")}
        </div>
        <div>
          <h2 className="acc-hero__name">{user?.displayName || "Be Me Customer"}</h2>
          <p className="acc-hero__email">{user?.email}</p>
        </div>
      </div>

      <div className="acc-body">
        
        <section className="acc-section">
          <p className="acc-section__label">Personal</p>
          <div className="acc-group">
            <Row icon={<IconOrders />} label="My Orders" onClick={() => navigate("/orders")} />
            <Row icon={<IconHeart />} label="Saved Items" onClick={() => navigate("/account/saved")} />
          </div>
        </section>

        <section className="acc-section">
          <p className="acc-section__label">Settings</p>
          <div className="acc-group">
            <Row icon={<IconSettings />} label="Manage Account" onClick={() => navigate("/account/manage")} />
            <Row icon={<IconLocation />} label="Delivery Addresses" onClick={() => navigate("/account/addresses")} />
            <Row icon={<IconCard />} label="Payment Methods" onClick={() => navigate("/account/payments")} />
            <Row icon={<IconBell />} label="Notifications" onClick={() => navigate("/account/notifications")} />
          </div>
        </section>

        <section className="acc-section">
          <p className="acc-section__label">Support</p>
          <div className="acc-group">
            <Row icon={<IconHelp />} label="Help & Support" onClick={() => navigate("/account/help")} />
            <Row icon={<IconMail />} label="Contact Us" onClick={() => navigate("/account/contact")} />
          </div>
        </section>

        <section className="acc-section acc-section--last">
          <div className="acc-group">
            <Row icon={<IconLogout />} label="Log Out" onClick={() => setShowLogoutSheet(true)} danger />
          </div>
        </section>

      </div>

      {showLogoutSheet && <LogoutSheet onConfirm={handleLogout} onCancel={() => setShowLogoutSheet(false)} />}
    </div>
  );
}
