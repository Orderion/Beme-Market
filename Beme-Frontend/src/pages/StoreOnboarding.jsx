import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "../hooks/useSellerAuth";
import { saveApplicationStep } from "../services/storeService";
import "./StoreOnboarding.css";

const CAT_PATHS = {
  fashion:     "M9 3L3 7l3 2v12h12V9l3-2-6-4c0 1.66-1.34 3-3 3S9 4.66 9 3z",
  sneakers:    "M2 16s1-1 4-1 5 2 8 2 6-2 8-2v3s-2 2-8 2-8-2-8-2H2v-2z|M6 15V9l4-4h4",
  jewelry:     "M12 2l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6z",
  cosmetics:   "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  hair:        "M12 2a5 5 0 015 5c0 5-5 9-5 9S7 12 7 7a5 5 0 015-5z|M12 11v10",
  food:        "M18 8h1a4 4 0 010 8h-1|M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z|M6 1v3|M10 1v3|M14 1v3",
  electronics: "M12 2l9 4.5V12a9 9 0 01-9 8 9 9 0 01-9-8V6.5L12 2z|M12 8v4|M12 14h.01",
  home:        "M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5Z|M9 21V12h6v9",
  arts:        "M12 19l7-7 3 3-7 7-3-3z|M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z",
  digital:     "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z|M8 11h8|M8 15h5",
  services:    "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  health:      "M22 12h-4l-3 9L9 3l-3 9H2",
  handmade:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  other:       "M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z|M12 11a1 1 0 100 2 1 1 0 000-2z|M12 7h.01",
};

const TYPES = [
  { id:"fashion",     label:"Fashion & Clothing",   desc:"Clothes, outfits, accessories",    color:"#F97316" },
  { id:"sneakers",    label:"Sneakers & Footwear",   desc:"Shoes, boots, sandals",            color:"#EF4444" },
  { id:"jewelry",     label:"Jewelry & Accessories", desc:"Rings, necklaces, bracelets",      color:"#EC4899" },
  { id:"cosmetics",   label:"Perfumes & Cosmetics",  desc:"Makeup, fragrance, skincare",      color:"#A855F7" },
  { id:"hair",        label:"Hair & Beauty",          desc:"Wigs, extensions, salons",         color:"#8B5CF6" },
  { id:"food",        label:"Food & Bakery",          desc:"Meals, snacks, pastries, drinks",  color:"#F59E0B" },
  { id:"electronics", label:"Phones & Electronics",  desc:"Gadgets, accessories, tech",       color:"#046EF2" },
  { id:"home",        label:"Home & Living",          desc:"Furniture, decor, kitchenware",    color:"#14B8A6" },
  { id:"arts",        label:"Creative Arts",          desc:"Paintings, crafts, photography",   color:"#F43F5E" },
  { id:"digital",     label:"Digital Products",       desc:"Templates, ebooks, courses",       color:"#6366F1" },
  { id:"services",    label:"Services",               desc:"Repairs, cleaning, consulting",    color:"#0EA5E9" },
  { id:"health",      label:"Health & Fitness",       desc:"Supplements, equipment, wellness", color:"#22C55E" },
  { id:"handmade",    label:"Handmade Goods",         desc:"Kente, weaving, artisan crafts",   color:"#D97706" },
  { id:"other",       label:"Other",                   desc:"Anything else you sell",           color:"#6B7280" },
];

function CatSvg({ id, size=20, color="#9CA3AF" }) {
  const d = CAT_PATHS[id] || CAT_PATHS.other;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

export default function StoreOnboarding() {
  const navigate           = useNavigate();
  const [searchParams]     = useSearchParams();
  const { user }           = useAuth();
  const { shop, isSeller } = useSellerAuth();
  const [selected,  setSelected]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [refCode,   setRefCode]   = useState("");
  const [refValid,  setRefValid]  = useState(null); // null | true | false

  // Pre-fill referral code from URL param (?ref=CODE) or sessionStorage
  useEffect(() => {
    const fromUrl     = searchParams.get("ref");
    const fromSession = typeof window !== "undefined" ? sessionStorage.getItem("beme_referral_code") : null;
    const code        = fromUrl || fromSession || "";
    if (code) setRefCode(code.toUpperCase());
  }, [searchParams]);

  const appliedUid = typeof window !== "undefined" ? localStorage.getItem("beme_seller_applied") : null;
  const hasStore   = !!(shop?.id || isSeller || (appliedUid && user && appliedUid === user?.uid));
  if (user && hasStore) { navigate("/get-a-store", { replace: true }); return null; }

  const handleContinue = async () => {
    if (!selected) return;
    if (!user) { navigate("/login?redirect=/store-onboarding"); return; }
    setSaving(true);
    try {
      // Save business type + referral code (if provided)
      const stepData = { businessType: selected };
      if (refCode.trim()) {
        stepData.referralCode = refCode.trim().toUpperCase();
        // Persist in sessionStorage so StoreSurvey + final onboarding step can access it
        sessionStorage.setItem("beme_referral_code", refCode.trim().toUpperCase());
      }
      await saveApplicationStep(user.uid, 1, stepData);
      navigate("/store-survey");
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectedType = TYPES.find(t => t.id === selected);

  return (
    <div className="so-wrap">

      {/* ── Sticky header ── */}
      <div className="so-header">
        <button className="so-back" onClick={() => navigate("/get-a-store")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="so-progress">
          <div className="so-progress-fill" style={{ width:"25%" }}/>
        </div>
        <span className="so-step-lbl">Step 1 of 4</span>
        <button className="so-continue-top" onClick={handleContinue} disabled={!selected || saving}>
          {saving ? "Saving…" : "Continue →"}
        </button>
      </div>

      {/* ── Hero ── */}
      <div className="so-hero">
        <div className="so-orb so-orb-1"/>
        <div className="so-orb so-orb-2"/>
        <div className="so-hero-content">
          <h1 className="so-hero-title">What do you sell?</h1>
          <p className="so-hero-sub">Choose the category that best describes your business.</p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="so-body">

        {/* ── Referral code field ── */}
        <div className="so-ref-block">
          <label className="so-ref-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            Referral code <span className="so-ref-optional">(optional)</span>
          </label>
          <div className="so-ref-row">
            <input
              className="so-ref-input"
              type="text"
              placeholder="e.g. BEMEXYZ123"
              value={refCode}
              onChange={e => { setRefCode(e.target.value.toUpperCase()); setRefValid(null); }}
              maxLength={20}
            />
            {refCode && (
              <button type="button" className="so-ref-clear" onClick={() => { setRefCode(""); setRefValid(null); sessionStorage.removeItem("beme_referral_code"); }}>
                ×
              </button>
            )}
          </div>
          <p className="so-ref-hint">
            Got a referral link from another seller? Enter their code here and both of you earn rewards.
          </p>
        </div>

        {/* ── Category list ── */}
        <div className="so-list">
          {TYPES.map(bt => {
            const sel = selected === bt.id;
            return (
              <button key={bt.id} type="button"
                className={`so-item ${sel ? "so-item--sel" : ""}`}
                onClick={() => setSelected(bt.id)}>
                <div className="so-item-icon" style={{ background: sel ? `${bt.color}18` : "rgba(0,0,0,0.04)" }}>
                  <CatSvg id={bt.id} size={20} color={sel ? bt.color : "#9CA3AF"}/>
                </div>
                <div className="so-item-text">
                  <div className="so-item-label" style={{ color: sel ? bt.color : "#111" }}>{bt.label}</div>
                  <div className="so-item-desc">{bt.desc}</div>
                </div>
                {sel && (
                  <div className="so-item-check">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="so-hint">
            Selected: <strong style={{ color:"#046EF2" }}>{selectedType?.label}</strong>
            {" · "}
            <button className="so-hint-btn" onClick={handleContinue} disabled={saving}>
              {saving ? "Saving…" : "Continue →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}