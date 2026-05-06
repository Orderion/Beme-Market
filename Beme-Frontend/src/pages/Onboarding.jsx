import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../firebase";
import "./Onboarding.css";

/* ─── Constants ─────────────────────────────────────────────── */

const AGE_OPTIONS = [
  { id: "under18", label: "Under 18" },
  { id: "18-24",   label: "18 – 24"  },
  { id: "25-34",   label: "25 – 34"  },
  { id: "35-44",   label: "35 – 44"  },
  { id: "45plus",  label: "45+"      },
];

/* Shopping options — SVG icons instead of emojis */
const SHOP_OPTIONS = [
  { id: "kids",        label: "Kids & Family",   Icon: IconKids        },
  { id: "women",       label: "Women's Fashion", Icon: IconWomen       },
  { id: "men",         label: "Men's Fashion",   Icon: IconMen         },
  { id: "home",        label: "Home & Living",   Icon: IconHome        },
  { id: "electronics", label: "Electronics",     Icon: IconElectronics },
  { id: "savvy",       label: "Savvy Deals",     Icon: IconDeals       },
  { id: "everything",  label: "Shop Everything", Icon: IconEverything  },
];

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/* ─── Icons — strokeWidth 1.5 ────────────────────────────────── */

function Spinner() {
  return <span className="ob-spinner" aria-hidden="true" />;
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <polyline points="2,7 5.5,10.5 12,3.5" stroke="white" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconKids() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3"/>
      <path d="M12 8v6"/>
      <path d="M9 11l-3 5h12l-3-5"/>
      <path d="M9 14l-1 4"/>
      <path d="M15 14l1 4"/>
    </svg>
  );
}

function IconWomen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3"/>
      <path d="M6 21l3-8h6l3 8"/>
      <path d="M9 13l-1.5 4"/>
      <path d="M15 13l1.5 4"/>
      <line x1="8" y1="17" x2="16" y2="17"/>
    </svg>
  );
}

function IconMen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3"/>
      <path d="M9 8h6l1 6H8l1-6z"/>
      <line x1="12" y1="14" x2="12" y2="21"/>
      <line x1="9" y1="21" x2="15" y2="21"/>
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  );
}

function IconElectronics() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="1"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

function IconDeals() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.78 0l-8-4A2 2 0 0 1 2 16.76V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="15" x2="15.01" y2="15"/>
    </svg>
  );
}

function IconEverything() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ONBOARDING PAGE
═══════════════════════════════════════════════════════════════ */
export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user === null) navigate("/login", { replace: true });
  }, [user, navigate]);

  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  /* Step 1 — name */
  const [name,         setName]         = useState("");
  const [nameChecking, setNameChecking] = useState(false);
  const [nameErr,      setNameErr]      = useState("");

  /* Step 2 — age */
  const [age, setAge] = useState("");

  /* Step 3 — shopping preference (multi-select) */
  const [prefs, setPrefs] = useState([]);

  const togglePref = (id) =>
    setPrefs((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  /* ── Step 1 → 2 ── */
  const handleNameNext = async () => {
    setNameErr("");
    const trimmed = name.trim();
    if (trimmed.length < 2)  { setNameErr("Name must be at least 2 characters."); return; }
    if (trimmed.length > 30) { setNameErr("Name must be 30 characters or less."); return; }
    if (!/^[a-zA-Z0-9 '_-]+$/.test(trimmed)) {
      setNameErr("Only letters, numbers, spaces, apostrophes and hyphens allowed.");
      return;
    }
    setNameChecking(true);
    try {
      const snap = await getDoc(doc(db, "usernames", normalizeUsername(trimmed)));
      if (snap.exists() && snap.data()?.uid !== user?.uid) {
        setNameErr("That name is already taken. Please choose another.");
        return;
      }
      setStep(2);
    } catch (_) {
      setStep(2);
    } finally {
      setNameChecking(false);
    }
  };

  /* ── Step 2 → 3 ── */
  const handleAgeNext = () => {
    if (!age) { setErr("Please select your age range."); return; }
    setErr("");
    setStep(3);
  };

  /* ── Final save ── */
  const handleFinish = async () => {
    if (prefs.length === 0) { setErr("Please choose at least one shopping type."); return; }
    if (!user) return;
    setErr("");
    setSaving(true);

    const trimmedName   = name.trim();
    const normalizedKey = normalizeUsername(trimmedName);

    try {
      const usernameSnap = await getDoc(doc(db, "usernames", normalizedKey));
      if (usernameSnap.exists() && usernameSnap.data()?.uid !== user.uid) {
        setStep(1);
        setNameErr("That name was just taken. Please choose another.");
        setSaving(false);
        return;
      }

      const userSnap     = await getDoc(doc(db, "users", user.uid));
      const existingRole = userSnap.exists()
        ? (userSnap.data()?.role || "customer")
        : "customer";

      await updateProfile(auth.currentUser, { displayName: trimmedName });

      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName:        trimmedName,
          age:                age,
          shoppingPreference: prefs,
          onboardingComplete: true,
          role:               existingRole,
          createdAt:          serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(doc(db, "usernames", normalizedKey), {
        uid:         user.uid,
        displayName: trimmedName,
        createdAt:   serverTimestamp(),
      });

      navigate("/", { replace: true });
    } catch (e) {
      console.error("Onboarding save error:", e);
      setErr("Something went wrong saving your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="ob-page">

      {/* ── Banner ── */}
      <div className="ob-banner">Welcome to Beme Market</div>

      <div className="ob-wrap">

        {/* ── Progress bar ── */}
        <div className="ob-progress-wrap" aria-label={`Step ${step} of 3`}>
          <div className="ob-progress-track">
            <div
              className="ob-progress-fill"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <span className="ob-progress-label">{step} / 3</span>
        </div>

        {/* ══ STEP 1 — Name ══ */}
        {step === 1 && (
          <div className="ob-card">
            <div className="ob-card-header">
              <span className="ob-step-eyebrow">Step 1 of 3</span>
              <h2 className="ob-question">What should we call you?</h2>
              <p className="ob-hint">
                This name will appear on your account and must be unique.
              </p>
            </div>

            <div className="ob-field">
              <label className="ob-label" htmlFor="ob-name">Display Name</label>
              <input
                id="ob-name"
                className="ob-input"
                type="text"
                placeholder="e.g. Kwame, Abena, ShopQueen"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameErr(""); }}
                maxLength={30}
                disabled={nameChecking}
                autoFocus
              />
              <span className="ob-char-count">{name.trim().length} / 30</span>
            </div>

            {nameErr && (
              <div className="ob-alert ob-alert--error" role="alert">{nameErr}</div>
            )}

            <button
              className="ob-cta"
              type="button"
              onClick={handleNameNext}
              disabled={nameChecking || !name.trim()}
            >
              {nameChecking ? <><Spinner /> Checking...</> : "Continue"}
            </button>
          </div>
        )}

        {/* ══ STEP 2 — Age ══ */}
        {step === 2 && (
          <div className="ob-card">
            <div className="ob-card-header">
              <span className="ob-step-eyebrow">Step 2 of 3</span>
              <h2 className="ob-question">How old are you?</h2>
              <p className="ob-hint">
                We use this to personalise your shopping experience.
              </p>
            </div>

            <div className="ob-options ob-options--age">
              {AGE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`ob-option-pill ${age === opt.id ? "ob-option-pill--on" : ""}`}
                  onClick={() => { setAge(opt.id); setErr(""); }}
                >
                  {age === opt.id && (
                    <span className="ob-pill-check"><CheckIcon /></span>
                  )}
                  {opt.label}
                </button>
              ))}
            </div>

            {err && (
              <div className="ob-alert ob-alert--error" role="alert">{err}</div>
            )}

            <div className="ob-btn-row">
              <button
                className="ob-back"
                type="button"
                onClick={() => { setErr(""); setStep(1); }}
              >
                Back
              </button>
              <button
                className="ob-cta ob-cta--flex"
                type="button"
                onClick={handleAgeNext}
                disabled={!age}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3 — Shopping preference ══ */}
        {step === 3 && (
          <div className="ob-card">
            <div className="ob-card-header">
              <span className="ob-step-eyebrow">Step 3 of 3</span>
              <h2 className="ob-question">What do you love to shop?</h2>
              <p className="ob-hint">
                Pick everything that applies — you can change this later.
              </p>
            </div>

            <div className="ob-options ob-options--grid">
              {SHOP_OPTIONS.map(({ id, label, Icon }) => {
                const on = prefs.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`ob-option-card ${on ? "ob-option-card--on" : ""}`}
                    onClick={() => { togglePref(id); setErr(""); }}
                    aria-pressed={on}
                  >
                    <span className="ob-card-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="ob-card-label">{label}</span>
                    {on && (
                      <span className="ob-card-tick" aria-hidden="true">
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {err && (
              <div className="ob-alert ob-alert--error" role="alert">{err}</div>
            )}

            <div className="ob-btn-row">
              <button
                className="ob-back"
                type="button"
                onClick={() => { setErr(""); setStep(2); }}
                disabled={saving}
              >
                Back
              </button>
              <button
                className="ob-cta ob-cta--flex"
                type="button"
                onClick={handleFinish}
                disabled={saving || prefs.length === 0}
              >
                {saving ? <><Spinner /> Saving...</> : "Finish & Shop"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}