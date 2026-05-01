import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, collection, onSnapshot, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../firebase";
import { useUserUnreadCount } from "../hooks/useNotifications";
import "./Account.css";

/* ─── Label maps ─────────────────────────────────────────────── */

const PREF_OPTIONS = [
  { id: "kids",        emoji: "👶", label: "Kids & Family"   },
  { id: "women",       emoji: "👗", label: "Women's Fashion" },
  { id: "men",         emoji: "👔", label: "Men's Fashion"   },
  { id: "home",        emoji: "🏠", label: "Home & Living"   },
  { id: "electronics", emoji: "⚡", label: "Electronics"     },
  { id: "savvy",       emoji: "🛍️", label: "Savvy Deals"     },
  { id: "everything",  emoji: "🌍", label: "Shop Everything" },
];

const AGE_OPTIONS = [
  { id: "under18", label: "Under 18" },
  { id: "18-24",   label: "18 – 24"  },
  { id: "25-34",   label: "25 – 34"  },
  { id: "35-44",   label: "35 – 44"  },
  { id: "45plus",  label: "45+"      },
];

const AGE_LABELS = {
  under18: "Under 18",
  "18-24": "18 – 24",
  "25-34": "25 – 34",
  "35-44": "35 – 44",
  "45plus": "45+",
};

function normalizeUsername(v) {
  return String(v || "").trim().toLowerCase().replace(/\s+/g, "_");
}

/* ─── Icons ──────────────────────────────────────────────────── */
function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}
function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}
function IconLocation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}
function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function IconRequest() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="20 6 9 17 4 12"/>
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
function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function Spinner() {
  return <span className="acc-spinner" aria-hidden="true" />;
}

function CheckboxIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/* ─── QuickTile ──────────────────────────────────────────────── */
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

/* ─── Row ────────────────────────────────────────────────────── */
function Row({ icon, label, sub, onClick, danger, badge }) {
  return (
    <button type="button"
      className={`acc-row${danger ? " acc-row--danger" : ""}`}
      onClick={onClick}>
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
        <svg className="acc-row-chevron" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </button>
  );
}

/* ─── Logout sheet ───────────────────────────────────────────── */
function LogoutSheet({ onConfirm, onCancel }) {
  return (
    <div className="acc-sheet-backdrop" onClick={onCancel}>
      <div className="acc-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="acc-sheet__bar" />
        <p className="acc-sheet__title">Log out?</p>
        <p className="acc-sheet__sub">
          Are you sure you want to log out of your Beme Market account?
        </p>
        <button type="button" className="acc-sheet__btn acc-sheet__btn--danger"
          onClick={onConfirm}>Log out</button>
        <button type="button" className="acc-sheet__btn acc-sheet__btn--cancel"
          onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ─── Edit Profile Modal ─────────────────────────────────────── */
function EditProfileModal({ profile, displayName, onClose, onSaved }) {
  const { user } = useAuth();

  const [name,    setName]    = useState(displayName || "");
  const [age,     setAge]     = useState(profile?.age || "");
  const [prefs,   setPrefs]   = useState(
    Array.isArray(profile?.shoppingPreference) ? profile.shoppingPreference : []
  );
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  const togglePref = (id) =>
    setPrefs((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  const handleSave = async () => {
    setErr("");
    const trimmed = name.trim();
    if (trimmed.length < 2)  { setErr("Name must be at least 2 characters."); return; }
    if (trimmed.length > 30) { setErr("Name can be at most 30 characters.");  return; }
    if (!age)                { setErr("Please select your age range.");       return; }
    if (prefs.length === 0)  { setErr("Please select at least one preference."); return; }

    setSaving(true);
    try {
      const normalizedKey     = normalizeUsername(trimmed);
      const oldNormalizedKey  = normalizeUsername(displayName || "");
      const nameChanged       = normalizedKey !== oldNormalizedKey;

      /* If name changed, check new name isn't already taken */
      if (nameChanged) {
        const snap = await getDoc(doc(db, "usernames", normalizedKey));
        if (snap.exists() && snap.data()?.uid !== user.uid) {
          setErr("That name is already taken. Please choose another.");
          setSaving(false);
          return;
        }
      }

      /* Update Firebase Auth display name */
      await updateProfile(auth.currentUser, { displayName: trimmed });

      /* Update Firestore user doc */
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName:        trimmed,
          age,
          shoppingPreference: prefs,
          updatedAt:          serverTimestamp(),
        },
        { merge: true }
      );

      /* Reserve new username, release old one if name changed */
      if (nameChanged) {
        await setDoc(doc(db, "usernames", normalizedKey), {
          uid:         user.uid,
          displayName: trimmed,
          createdAt:   serverTimestamp(),
        });
        /* Note: old username doc is left as a tombstone — super_admin
           can clean up if needed. We don't delete it client-side to avoid
           race conditions where another user grabs it before the write lands. */
      }

      onSaved({ displayName: trimmed, age, shoppingPreference: prefs });
      onClose();
    } catch (e) {
      console.error("Profile update error:", e);
      setErr("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="acc-modal-backdrop" onClick={onClose}>
      <div className="acc-modal" onClick={(e) => e.stopPropagation()}>

        {/* header */}
        <div className="acc-modal__head">
          <h2 className="acc-modal__title">Edit Profile</h2>
          <button type="button" className="acc-modal__close"
            onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>

        {/* name */}
        <div className="acc-modal__section">
          <label className="acc-modal__label" htmlFor="ep-name">
            Display Name
          </label>
          <input
            id="ep-name"
            className="acc-modal__input"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setErr(""); }}
            maxLength={30}
            placeholder="Your name"
            disabled={saving}
          />
          <span className="acc-modal__charcount">{name.trim().length} / 30</span>
        </div>

        {/* age */}
        <div className="acc-modal__section">
          <p className="acc-modal__label">Age Range</p>
          <div className="acc-modal__pills">
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`acc-modal__pill ${age === opt.id ? "acc-modal__pill--on" : ""}`}
                onClick={() => { setAge(opt.id); setErr(""); }}
                disabled={saving}
              >
                {age === opt.id && <CheckboxIcon />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* shopping prefs */}
        <div className="acc-modal__section">
          <p className="acc-modal__label">Shopping Preferences</p>
          <div className="acc-modal__grid">
            {PREF_OPTIONS.map((opt) => {
              const on = prefs.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`acc-modal__pref ${on ? "acc-modal__pref--on" : ""}`}
                  onClick={() => { togglePref(opt.id); setErr(""); }}
                  disabled={saving}
                  aria-pressed={on}
                >
                  <span aria-hidden="true">{opt.emoji}</span>
                  <span>{opt.label}</span>
                  {on && (
                    <span className="acc-modal__pref-tick">
                      <CheckboxIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {err && (
          <div className="acc-modal__err" role="alert">{err}</div>
        )}

        <button
          type="button"
          className="acc-modal__save"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><Spinner /> Saving...</> : "Save changes"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════ */
export default function Account() {
  const navigate        = useNavigate();
  const { user, logout } = useAuth();

  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [savedCount,      setSavedCount]      = useState(null);
  const [profile,         setProfile]         = useState(null);
  const [profileLoading,  setProfileLoading]  = useState(true);

  const { unreadCount } = useUserUnreadCount();

  /* ── wishlist count ── */
  useEffect(() => {
    if (!user) { setSavedCount(0); return; }
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "wishlist"),
      (snap) => setSavedCount(snap.size)
    );
    return () => unsub();
  }, [user]);

  /* ── profile fetch ── */
  useEffect(() => {
    if (!user) { setProfileLoading(false); return; }
    let cancelled = false;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => { if (!cancelled && snap.exists()) setProfile(snap.data()); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  /* ── derived values ── */
  const displayName =
    user?.displayName || profile?.displayName || "Beme Customer";
  const initials    = displayName.charAt(0).toUpperCase();
  const age         = profile?.age || null;
  const shoppingPrefs = Array.isArray(profile?.shoppingPreference)
    ? profile.shoppingPreference : [];

  /* Profile is "complete" when name, age AND at least one pref are all set */
  const profileComplete =
    !!profile?.displayName && !!profile?.age && shoppingPrefs.length > 0;

  /* When edit modal saves successfully, update local state immediately */
  const handleProfileSaved = (updated) => {
    setProfile((prev) => ({ ...prev, ...updated }));
  };

  if (!user) return null;

  return (
    <div className="acc-page">
      <div className="acc-body">

        {/* ── Hero header ── */}
        <div className="acc-header">
          <div className="acc-header-left">
            <h1 className="acc-hero-name">{displayName}</h1>
            <div className="acc-rating-pill">
              <IconStar />
              <span>Beme Member</span>
            </div>
          </div>
          <button type="button" className="acc-avatar-btn"
            onClick={() => setShowEditModal(true)}
            aria-label="Edit profile">
            <div className="acc-avatar-ring">
              <span className="acc-avatar-letter">{initials}</span>
            </div>
          </button>
        </div>

        {/* ── Profile summary card ── */}
        {!profileLoading && (age || shoppingPrefs.length > 0) && (
          <div className="acc-profile-card">
            <div className="acc-profile-card__row">
              <div>
                <p className="acc-profile-card__name">{displayName}</p>
                {age && (
                  <p className="acc-profile-card__age">{AGE_LABELS[age] || age}</p>
                )}
              </div>
              <button type="button" className="acc-profile-card__edit-btn"
                onClick={() => setShowEditModal(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
            </div>

            {shoppingPrefs.length > 0 && (
              <>
                <div className="acc-profile-card__divider" />
                <p className="acc-profile-card__pref-label">Shopping preferences</p>
                <div className="acc-pref-pills">
                  {shoppingPrefs.map((id) => {
                    const entry = PREF_OPTIONS.find((o) => o.id === id);
                    if (!entry) return null;
                    return (
                      <span key={id} className="acc-pref-pill">
                        <span aria-hidden="true">{entry.emoji}</span>
                        {entry.label}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Quick tiles ── */}
        <div className="acc-tiles-row">
          <QuickTile icon={<IconOrders />}  label="Orders"   onClick={() => navigate("/orders")} />
          <QuickTile icon={<IconHeart />}   label="Saved"    onClick={() => navigate("/saved")}   badge={savedCount} />
          <QuickTile icon={<IconSettings />} label="Settings" onClick={() => navigate("/account/manage")} />
        </div>

        {/* ── Profile status card ── */}
        {!profileLoading && (
          profileComplete ? (
            /* COMPLETED STATE */
            <div className="acc-promo-card acc-promo-card--done"
              onClick={() => setShowEditModal(true)}>
              <div className="acc-promo-text">
                <p className="acc-promo-title acc-promo-title--done">
                  Profile completed ✓
                </p>
                <p className="acc-promo-sub">
                  Tap to edit your name, age or preferences
                </p>
              </div>
              <div className="acc-promo-icon acc-promo-icon--done">
                <IconCheck />
              </div>
            </div>
          ) : (
            /* INCOMPLETE STATE */
            <div className="acc-promo-card"
              onClick={() => navigate("/account/manage")}>
              <div className="acc-promo-text">
                <p className="acc-promo-title">Complete your profile</p>
                <p className="acc-promo-sub">
                  Add your address &amp; payment method for faster checkout
                </p>
              </div>
              <div className="acc-promo-icon">
                <IconShield />
              </div>
            </div>
          )
        )}

        {/* ── Personal rows ── */}
        <div className="acc-group acc-section">
          <Row icon={<IconOrders />}  label="My orders"    sub="Track & manage your orders"    onClick={() => navigate("/orders")} />
          <Row icon={<IconHeart />}   label="Saved items"  sub="Your wishlist"
            badge={savedCount > 0 ? savedCount : undefined} onClick={() => navigate("/saved")} />
          <Row icon={<IconRequest />} label="My requests"  sub="Track your product requests"   onClick={() => navigate("/account/requests")} />
        </div>

        {/* ── Settings rows ── */}
        <div className="acc-group acc-section">
          <Row icon={<IconSettings />} label="Manage account"     sub="Name, password & preferences"  onClick={() => navigate("/account/manage")} />
          <Row icon={<IconLocation />} label="Delivery addresses" sub="Saved locations in Ghana"       onClick={() => navigate("/account/addresses")} />
          <Row icon={<IconCard />}     label="Payment methods"    sub="Paystack & saved cards"         onClick={() => navigate("/account/payments")} />
          <Row icon={<IconBell />}     label="Notifications"      sub="Order updates & alerts"
            badge={unreadCount > 0 ? unreadCount : undefined}  onClick={() => navigate("/account/notifications")} />
        </div>

        {/* ── Support rows ── */}
        <div className="acc-group acc-section">
          <Row icon={<IconHelp />} label="Help & support" sub="FAQs and guides"              onClick={() => navigate("/account/help")} />
          <Row icon={<IconMail />} label="Contact us"     sub="supportbememarket@gmail.com"  onClick={() => navigate("/account/contact")} />
        </div>

        {/* ── Logout ── */}
        <div className="acc-group acc-section acc-section--last">
          <Row icon={<IconLogout />} label="Log out" sub="Sign out of your account"
            onClick={() => setShowLogoutSheet(true)} danger />
        </div>

        <p className="acc-footer-note">Beme Market · Ghana 🇬🇭</p>
      </div>

      {/* ── Logout bottom sheet ── */}
      {showLogoutSheet && (
        <LogoutSheet
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutSheet(false)}
        />
      )}

      {/* ── Edit profile modal ── */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          displayName={displayName}
          onClose={() => setShowEditModal(false)}
          onSaved={handleProfileSaved}
        />
      )}
    </div>
  );
}