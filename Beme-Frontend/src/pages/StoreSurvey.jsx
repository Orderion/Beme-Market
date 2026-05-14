import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveApplicationStep, getApplicationDraft } from "../services/storeService";
import "./StoreSurvey.css";

const STEPS = [
  { id: 2, title: "Name Your Store",    sub: "Choose a name customers will remember." },
  { id: 3, title: "Connect Your Brand", sub: "Add your WhatsApp and social links."    },
  { id: 4, title: "Location & Delivery", sub: "Tell customers where you're based."   },
];

const REGIONS = [
  "Greater Accra","Ashanti","Western","Eastern","Central","Volta",
  "Northern","Upper East","Upper West","Brong-Ahafo","Savannah",
  "Ahafo","Bono East","North East","Oti","Western North",
];

/* ─── SVG icons for Step 3 ─────────────────────────────────── */
function PhoneIcon() {
  return (
    <svg className="ss-input-icon-svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg className="ss-input-icon-svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}
function MusicIcon() {
  return (
    <svg className="ss-input-icon-svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  );
}

/* ─── Steps ─────────────────────────────────────────────────── */
function Step2({ data, onChange }) {
  return (
    <div className="ss-form">
      <div className="ss-form-group">
        <label className="ss-label">Store Name *</label>
        <input
          className="ss-input"
          value={data.shopName || ""}
          onChange={(e) => onChange("shopName", e.target.value)}
          placeholder="e.g. Kente Kicks GH"
          maxLength={60}
        />
        <div className="ss-hint">This is how customers will find you. Make it memorable.</div>
      </div>

      <div className="ss-form-group">
        <label className="ss-label">What makes your store unique? *</label>
        <textarea
          className="ss-textarea"
          value={data.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Tell potential customers why they should shop with you. Mention your specialties, quality guarantee, or what makes your products special…"
          rows={4}
          maxLength={500}
        />
        <div className="ss-hint">{(data.description || "").length}/500 characters</div>
      </div>

      <div className="ss-form-group">
        <label className="ss-label">Store URL</label>
        <div className="ss-input-prefix-wrap">
          <span className="ss-prefix">beme.market/</span>
          <input
            className="ss-input ss-input-prefix"
            value={(data.shopName || "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}
            readOnly
            placeholder="auto-generated"
          />
        </div>
        <div className="ss-hint">Auto-generated from your store name.</div>
      </div>
    </div>
  );
}

function Step3({ data, onChange }) {
  return (
    <div className="ss-form">
      <div className="ss-form-group">
        <label className="ss-label">WhatsApp Business Number</label>
        <div className="ss-input-icon-wrap">
          <PhoneIcon />
          <input
            className="ss-input ss-input-icon"
            value={data.whatsapp || ""}
            onChange={(e) => onChange("whatsapp", e.target.value)}
            placeholder="+233 XX XXX XXXX"
            type="tel"
          />
        </div>
        <div className="ss-hint">Customers will contact you directly on WhatsApp for orders.</div>
      </div>

      <div className="ss-form-group">
        <label className="ss-label">Instagram Handle</label>
        <div className="ss-input-icon-wrap">
          <CameraIcon />
          <input
            className="ss-input ss-input-icon"
            value={data.instagram || ""}
            onChange={(e) => onChange("instagram", e.target.value)}
            placeholder="@yourstorename"
          />
        </div>
      </div>

      <div className="ss-form-group">
        <label className="ss-label">TikTok Handle</label>
        <div className="ss-input-icon-wrap">
          <MusicIcon />
          <input
            className="ss-input ss-input-icon"
            value={data.tiktok || ""}
            onChange={(e) => onChange("tiktok", e.target.value)}
            placeholder="@yourstorename"
          />
        </div>
      </div>

      <div className="ss-form-group">
        <label className="ss-label">Website / Other Link</label>
        <input
          className="ss-input"
          value={data.website || ""}
          onChange={(e) => onChange("website", e.target.value)}
          placeholder="https://yourwebsite.com"
          type="url"
        />
      </div>
    </div>
  );
}

function Step4({ data, onChange }) {
  return (
    <div className="ss-form">
      <div className="ss-form-group">
        <label className="ss-label">City *</label>
        <input
          className="ss-input"
          value={data.city || ""}
          onChange={(e) => onChange("city", e.target.value)}
          placeholder="e.g. Accra, Kumasi, Takoradi"
        />
      </div>

      <div className="ss-form-group">
        <label className="ss-label">Region *</label>
        <select
          className="ss-select"
          value={data.region || ""}
          onChange={(e) => onChange("region", e.target.value)}
        >
          <option value="">Select your region</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="ss-form-group">
        <label className="ss-label">Do you offer delivery?</label>
        <div className="ss-radio-group">
          {[
            { v: "yes",    l: "Yes — I deliver to customers" },
            { v: "pickup", l: "Pickup only"                  },
            { v: "both",   l: "Both delivery & pickup"       },
          ].map(({ v, l }) => (
            <label key={v} className="ss-radio">
              <input
                type="radio"
                name="delivery"
                value={v}
                checked={data.delivery === v}
                onChange={() => onChange("delivery", v)}
              />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div className="ss-form-group">
        <label className="ss-label">Terms & Community Guidelines *</label>
        <label className="ss-checkbox">
          <input
            type="checkbox"
            checked={data.agreedToTerms || false}
            onChange={(e) => onChange("agreedToTerms", e.target.checked)}
          />
          I have read and agree to the{" "}
          <a href="/seller-terms" target="_blank" style={{ color: "#046EF2" }}>Seller Terms</a>,{" "}
          <a href="/seller-policy" target="_blank" style={{ color: "#046EF2" }}>Seller Policy</a>, and{" "}
          <a href="/community-guidelines" target="_blank" style={{ color: "#046EF2" }}>Community Guidelines</a>.
          I confirm I will not sell counterfeit, illegal, or fraudulent products.
        </label>
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function StoreSurvey() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({
    shopName: "", description: "", whatsapp: "", instagram: "",
    tiktok: "", website: "", city: "", region: "",
    delivery: "both", agreedToTerms: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getApplicationDraft(user.uid).then((draft) => {
      if (draft?.step2) setData((d) => ({ ...d, ...draft.step2 }));
      if (draft?.step3) setData((d) => ({ ...d, ...draft.step3 }));
      if (draft?.step4) setData((d) => ({ ...d, ...draft.step4 }));
    }).catch(console.error);
  }, [user?.uid]);

  const upd = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const step = STEPS[currentStep];
  const progress = ((currentStep + 2) / 5) * 100;

  const validate = () => {
    if (currentStep === 0 && !data.shopName.trim())   { alert("Store name is required.");   return false; }
    if (currentStep === 0 && !data.description.trim()) { alert("Store description is required."); return false; }
    if (currentStep === 2 && !data.city.trim())        { alert("City is required.");          return false; }
    if (currentStep === 2 && !data.region)             { alert("Region is required.");        return false; }
    if (currentStep === 2 && !data.agreedToTerms)      { alert("You must agree to the Seller Terms."); return false; }
    return true;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const stepNum  = STEPS[currentStep].id;
      const stepData = currentStep === 0
        ? { shopName: data.shopName, description: data.description }
        : currentStep === 1
          ? { whatsapp: data.whatsapp, instagram: data.instagram, tiktok: data.tiktok, website: data.website }
          : { city: data.city, region: data.region, delivery: data.delivery, agreedToTerms: data.agreedToTerms };

      await saveApplicationStep(user.uid, stepNum, stepData);

      if (currentStep < STEPS.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        navigate("/store-plans");
      }
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const STEP_COMPONENTS = [
    <Step2 key="s2" data={data} onChange={upd} />,
    <Step3 key="s3" data={data} onChange={upd} />,
    <Step4 key="s4" data={data} onChange={upd} />,
  ];

  return (
    <div className="ss-root">
      {/* Header */}
      <div className="ss-header">
        <button className="ss-back"
          onClick={() => currentStep === 0 ? navigate("/store-onboarding") : setCurrentStep((s) => s - 1)}>
          ← Back
        </button>
        <div className="ss-progress-bar">
          <div className="ss-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="ss-step-label">Step {step.id} of 4</div>
      </div>

      {/* Content */}
      <div className="ss-content">
        <div className="ss-intro">
          <h1 className="ss-title">{step.title}</h1>
          <p className="ss-sub">{step.sub}</p>
        </div>

        {STEP_COMPONENTS[currentStep]}

        <div className="ss-footer">
          <button className="ss-next-btn" onClick={handleNext} disabled={saving}>
            {saving ? "Saving…" : currentStep < STEPS.length - 1 ? "Continue →" : "Choose Your Plan →"}
          </button>
        </div>
      </div>
    </div>
  );
}