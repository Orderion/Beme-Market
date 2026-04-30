import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../firebase";
import "./Onboarding.css";

/* ─── Constants ──────────────────────────────────────────────── */

const AGE_OPTIONS = [
  { id: "under18", label: "Under 18" },
  { id: "18-24",   label: "18 – 24"  },
  { id: "25-34",   label: "25 – 34"  },
  { id: "35-44",   label: "35 – 44"  },
  { id: "45plus",  label: "45+"      },
];

const SHOP_OPTIONS = [
  { id: "kids",        emoji: "👶", label: "Kids & Family"   },
  { id: "women",       emoji: "👗", label: "Women's Fashion" },
  { id: "men",         emoji: "👔", label: "Men's Fashion"   },
  { id: "home",        emoji: "🏠", label: "Home & Living"   },
  { id: "electronics", emoji: "⚡", label: "Electronics"     },
  { id: "savvy",       emoji: "🛍️", label: "Savvy Deals"     },
  { id: "everything",  emoji: "🌍", label: "Shop Everything" },
];

/* Normalise a display name into a safe Firestore document ID */
function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function Spinner() {
  return <span className="ob-spinner" aria-hidden="true" />;
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <polyline points="2,7 5.5,10.5 12,3.5" stroke="white" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ONBOARDING PAGE
═══════════════════════════════════════════════════════════════ */
export default function Onboarding() {
  const navigate    = useNavigate();
  const { user }    = useAuth();

  /* Redirect unauthenticated users */
  useEffect(() => {
    if (user === null) navigate("/login", { replace: true });
  }, [user, navigate]);

  /* ── state ── */
  const [step,   setStep]   = useState(1); // 1 | 2 | 3
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  /* Step 1 — name */
  const [name,        setName]        = useState("");
  const [nameChecking,setNameChecking]= useState(false);
  const [nameErr,     setNameErr]     = useState("");

  /* Step 2 — age */
  const [age, setAge] = useState("");

  /* Step 3 — shopping preference (multi-select) */
  const [prefs, setPrefs] = useState([]);

  /* ── helpers ── */
  const togglePref = (id) =>
    setPrefs((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  /* ── Step 1 → 2: check name uniqueness ── */
  const handleNameNext = async () => {
    setNameErr("");
    const trimmed = name.trim();
    if (trimmed.length < 2)  { setNameErr("Name must be at least 2 characters."); return; }
    if (trimmed.length > 30) { setNameErr("Name must be 30 characters or less.");  return; }
    if (!/^[a-zA-Z0-9 '_-]+$/.test(trimmed)) {
      setNameErr("Only letters, numbers, spaces, apostrophes and hyphens allowed.");
      return;
    }

    setNameChecking(true);
    try {
      const snap = await getDoc(doc(db, "usernames", normalizeUsername(trimmed)));
      if (snap.exists()) {
        setNameErr("That name is already taken. Please choose another.");
        return;
      }
      setStep(2);
    } catch (_) {
      /* Network issue — allow through and double-check on final save */
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

    const trimmedName  = name.trim();
    const normalizedKey = normalizeUsername(trimmedName);

    try {
      /* 1 — Race-condition guard: re-check username */
      const snap = await getDoc(doc(db, "usernames", normalizedKey));
      if (snap.exists() && snap.data()?.uid !== user.uid) {
        setStep(1);
        setNameErr("That name was just taken. Please choose another.");
        setSaving(false);
        return;
      }

      /* 2 — Update Firebase Auth display name */
      await updateProfile(auth.currentUser, { displayName: trimmedName });

      /* 3 — Write user document (merge so existing fields like role are kept) */
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName:        trimmedName,
          age:                age,
          shoppingPreference: prefs,
          onboardingComplete: true,
          role:               "customer",
          createdAt:          serverTimestamp(),
        },
        { merge: true }
      );

      /* 4 — Reserve username */
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

  /* ── Don't render until auth is resolved ── */
  if (!user) return null;

  return (
    <div className="ob-page">

      {/* ── Banner ── */}
      <div className="ob-banner">Welcome to Beme Market 🇬🇭</div>

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

        {/* ══════════════════════════════════
            STEP 1 — Name
        ══════════════════════════════════ */}
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
              <label className="ob-label" htmlFor="ob-name">
                Display Name
              </label>
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

        {/* ══════════════════════════════════
            STEP 2 — Age
        ══════════════════════════════════ */}
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
                ← Back
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

        {/* ══════════════════════════════════
            STEP 3 — Shopping preference
        ══════════════════════════════════ */}
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
              {SHOP_OPTIONS.map((opt) => {
                const on = prefs.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`ob-option-card ${on ? "ob-option-card--on" : ""}`}
                    onClick={() => { togglePref(opt.id); setErr(""); }}
                    aria-pressed={on}
                  >
                    <span className="ob-card-emoji" aria-hidden="true">{opt.emoji}</span>
                    <span className="ob-card-label">{opt.label}</span>
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
                ← Back
              </button>
              <button
                className="ob-cta ob-cta--flex"
                type="button"
                onClick={handleFinish}
                disabled={saving || prefs.length === 0}
              >
                {saving ? <><Spinner /> Saving...</> : "Finish & Shop 🛍️"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}