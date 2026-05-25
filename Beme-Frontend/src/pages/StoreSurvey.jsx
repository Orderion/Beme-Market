import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveApplicationStep, getApplicationDraft } from "../services/storeService";
import "./StoreSurvey.css";

const REGIONS = [
  "Greater Accra","Ashanti","Western","Eastern","Central","Volta",
  "Northern","Upper East","Upper West","Brong-Ahafo","Savannah",
  "Ahafo","Bono East","North East","Oti","Western North",
];

const STEPS = [
  { id:2, title:"Name your store",     sub:"Choose a name customers will remember." },
  { id:3, title:"Connect your brand",  sub:"Add your WhatsApp and social links." },
  { id:4, title:"Location & delivery", sub:"Tell buyers where you're based and how you deliver." },
];

function Ico({ d, size=18, color="currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg,i) => <path key={i} d={seg}/>)}
    </svg>
  );
}
const IC = {
  phone:  "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  insta:  "M17.5 0h-11A6.5 6.5 0 000 6.5v11A6.5 6.5 0 006.5 24h11A6.5 6.5 0 0024 17.5v-11A6.5 6.5 0 0017.5 0zM12 7a5 5 0 110 10A5 5 0 0112 7zm6.5-2a1 1 0 110 2 1 1 0 010-2z",
  tiktok: "M9 18V5l12-2v13|M6 21a3 3 0 100-6 3 3 0 000 6|M18 16a3 3 0 100-6 3 3 0 000 6",
  link:   "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71|M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  map:    "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z|M12 10a2 2 0 100-4 2 2 0 000 4z",
  arr:    "M5 12h14|M12 5l7 7-7 7",
  check:  "M20 6L9 17l-5-5",
};

function Field({ label, hint, children }) {
  return (
    <div className="ss-field">
      <label className="ss-label">{label}</label>
      {children}
      {hint && <p className="ss-hint">{hint}</p>}
    </div>
  );
}

function Input({ icon, value, onChange, placeholder, type="text", maxLength }) {
  return (
    <div className="ss-input-wrap">
      {icon && <span className="ss-input-icon"><Ico d={icon} size={16} color="#9CA3AF"/></span>}
      <input type={type} value={value||""} onChange={onChange}
        placeholder={placeholder} maxLength={maxLength}
        className={`ss-input ${icon ? "ss-input--icon" : ""}`}/>
    </div>
  );
}

function Textarea({ value, onChange, placeholder, maxLength }) {
  return <textarea rows={4} value={value||""} onChange={onChange}
    placeholder={placeholder} maxLength={maxLength} className="ss-textarea"/>;
}

function Pill({ label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`ss-pill ${selected ? "ss-pill--sel" : ""}`}>
      {selected && <Ico d={IC.check} size={13} color="#fff"/>}
      {label}
    </button>
  );
}

const DELIVERY_OPTS = [
  { v:"yes",    l:"Yes — I deliver"      },
  { v:"pickup", l:"Pickup only"          },
  { v:"both",   l:"Delivery & pickup"    },
];

function Step2({ data, upd }) {
  return (
    <>
      <Field label="Store Name *" hint="This is how customers will find you. Make it memorable.">
        <Input value={data.shopName} onChange={e=>upd("shopName",e.target.value)}
          placeholder="e.g. Kente Kicks GH" maxLength={60}/>
      </Field>
      <Field label="What makes your store unique? *">
        <Textarea value={data.description} onChange={e=>upd("description",e.target.value)}
          placeholder="Your specialties, quality guarantee, what sets you apart…" maxLength={500}/>
        <p className="ss-count">{(data.description||"").length}/500</p>
      </Field>
      {data.shopName && (
        <div className="ss-url-preview">
          <span>Your URL: </span>
          <strong>bememarket.store/{(data.shopName||"").toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-")}</strong>
        </div>
      )}
    </>
  );
}

function Step3({ data, upd }) {
  return (
    <>
      <Field label="WhatsApp Business Number" hint="Customers can contact you directly for orders.">
        <Input icon={IC.phone} value={data.whatsapp} onChange={e=>upd("whatsapp",e.target.value)}
          placeholder="+233 XX XXX XXXX" type="tel"/>
      </Field>
      <Field label="Instagram">
        <Input icon={IC.insta} value={data.instagram} onChange={e=>upd("instagram",e.target.value)}
          placeholder="@yourstorename"/>
      </Field>
      <Field label="TikTok">
        <Input icon={IC.tiktok} value={data.tiktok} onChange={e=>upd("tiktok",e.target.value)}
          placeholder="@yourstorename"/>
      </Field>
      <Field label="Website">
        <Input icon={IC.link} value={data.website} onChange={e=>upd("website",e.target.value)}
          placeholder="https://yourwebsite.com" type="url"/>
      </Field>
    </>
  );
}

function Step4({ data, upd }) {
  return (
    <>
      <Field label="City *">
        <Input icon={IC.map} value={data.city} onChange={e=>upd("city",e.target.value)}
          placeholder="e.g. Accra, Kumasi, Takoradi"/>
      </Field>
      <Field label="Region *">
        <select value={data.region||""} onChange={e=>upd("region",e.target.value)} className="ss-select">
          <option value="">Select your region</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Do you offer delivery?">
        <div className="ss-pills">
          {DELIVERY_OPTS.map(o => (
            <Pill key={o.v} label={o.l} selected={data.delivery===o.v} onClick={()=>upd("delivery",o.v)}/>
          ))}
        </div>
      </Field>
      <label className="ss-agree">
        <input type="checkbox" checked={data.agreedToTerms||false}
          onChange={e=>upd("agreedToTerms",e.target.checked)} className="ss-checkbox"/>
        <span>
          I agree to the{" "}
          <a href="/seller-terms" target="_blank">Seller Terms</a>,{" "}
          <a href="/seller-policy" target="_blank">Seller Policy</a>, and{" "}
          <a href="/community-guidelines" target="_blank">Community Guidelines</a>.
          I confirm I will not sell counterfeit or illegal products.
        </span>
      </label>
    </>
  );
}

export default function StoreSurvey() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step,   setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [data,   setData]   = useState({
    shopName:"", description:"", whatsapp:"", instagram:"",
    tiktok:"", website:"", city:"", region:"", delivery:"both", agreedToTerms:false,
  });

  useEffect(() => {
    if (!user?.uid) return;
    getApplicationDraft(user.uid).then(draft => {
      if (draft?.step2) setData(d => ({...d,...draft.step2}));
      if (draft?.step3) setData(d => ({...d,...draft.step3}));
      if (draft?.step4) setData(d => ({...d,...draft.step4}));
    }).catch(()=>{});
  }, [user?.uid]);

  const upd = (k,v) => setData(d => ({...d,[k]:v}));
  const cur  = STEPS[step];
  const prog = ((step+2)/5)*100;

  const validate = () => {
    if (step===0 && !data.shopName.trim())    { alert("Store name is required.");           return false; }
    if (step===0 && !data.description.trim()) { alert("Store description is required.");    return false; }
    if (step===2 && !data.city.trim())        { alert("City is required.");                 return false; }
    if (step===2 && !data.region)             { alert("Region is required.");               return false; }
    if (step===2 && !data.agreedToTerms)      { alert("Please agree to the Seller Terms."); return false; }
    return true;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const sn = STEPS[step].id;
      const sd = step===0 ? { shopName:data.shopName, description:data.description }
               : step===1 ? { whatsapp:data.whatsapp, instagram:data.instagram, tiktok:data.tiktok, website:data.website }
               :             { city:data.city, region:data.region, delivery:data.delivery, agreedToTerms:data.agreedToTerms };
      await saveApplicationStep(user.uid, sn, sd);
      if (step < STEPS.length-1) setStep(s => s+1);
      else navigate("/store-plans");
    } catch { alert("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  const COMPS = [
    <Step2 key="s2" data={data} upd={upd}/>,
    <Step3 key="s3" data={data} upd={upd}/>,
    <Step4 key="s4" data={data} upd={upd}/>,
  ];

  return (
    <div className="ss-wrap">

      {/* ── Sticky header ── */}
      <div className="ss-header">
        <button className="ss-back"
          onClick={() => step===0 ? navigate("/store-onboarding") : setStep(s=>s-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>

        <div className="ss-progress">
          <div className="ss-progress-fill" style={{ width:`${prog}%` }}/>
        </div>

        <span className="ss-step-lbl">Step {cur.id} of 4</span>

        {/* ── Continue / Next TOP RIGHT ── */}
        <button className="ss-next-top" onClick={handleNext} disabled={saving}>
          {saving ? "Saving…"
            : step < STEPS.length-1 ? "Continue →"
            : "Choose Plan →"}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="ss-content">
        {/* Gradient step indicator */}
        <div className="ss-step-hero">
          <div className="ss-step-num">{step+1}<span>/{STEPS.length}</span></div>
          <div>
            <h1 className="ss-title">{cur.title}</h1>
            <p className="ss-sub">{cur.sub}</p>
          </div>
        </div>

        {/* Form card */}
        <div className="ss-card">
          {COMPS[step]}
        </div>

        {/* Bottom continue */}
        <button className="ss-next-bottom" onClick={handleNext} disabled={saving}>
          {saving ? "Saving…" : step < STEPS.length-1 ? <>Continue <Ico d={IC.arr} size={15} color="#fff"/></> : <>Choose Your Plan <Ico d={IC.arr} size={15} color="#fff"/></>}
        </button>
      </div>
    </div>
  );
}
