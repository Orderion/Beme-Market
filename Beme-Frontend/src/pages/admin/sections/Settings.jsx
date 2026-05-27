import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

function Toggle({ on, onChange, label }) {
  return (
    <label className="ap-toggle">
      <input type="checkbox" checked={on} onChange={e=>onChange(e.target.checked)}/>
      <div className="ap-toggle-track"/>
      {label && <span className="ap-toggle-label">{label}</span>}
    </label>
  );
}

export default function SettingsSection() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowNewRegistrations: true,
    allowNewStores: true,
    flashDealsEnabled: true,
    offersEnabled: true,
    chatEnabled: true,
    reviewsEnabled: true,
    platformFeePercent: "5",
    supportEmail: "",
    platformName: "Beme Market",
    currency: "GHS",
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db,"config","platform"));
        if (snap.exists()) setSettings(prev=>({...prev,...snap.data()}));
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      await setDoc(doc(db,"config","platform"),{...settings,updatedAt:serverTimestamp()},{merge:true});
      setMsg("✅ Settings saved.");
    } catch(e) { setMsg("❌ "+(e.message||"Failed.")); }
    finally { setSaving(false); setTimeout(()=>setMsg(""),3000); }
  };

  const set = (key, val) => setSettings(prev=>({...prev,[key]:val}));

  const TOGGLES = [
    { key:"maintenanceMode",       label:"Maintenance Mode",          sub:"Show maintenance page to all visitors", danger:true },
    { key:"allowNewRegistrations", label:"Allow New Registrations",   sub:"Let new users sign up" },
    { key:"allowNewStores",        label:"Allow New Stores",          sub:"Let sellers open new stores" },
    { key:"flashDealsEnabled",     label:"Flash Deals",               sub:"Show flash deals on homepage" },
    { key:"offersEnabled",         label:"Weekly Offers",             sub:"Show offers section on homepage" },
    { key:"chatEnabled",           label:"Messaging",                 sub:"Enable buyer-seller chat" },
    { key:"reviewsEnabled",        label:"Product Reviews",           sub:"Allow customers to leave reviews" },
  ];

  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22,gap:14,flexWrap:"wrap"}}>
        <div>
          <div className="ap-page-title">Settings</div>
          <div className="ap-page-sub">Platform configuration and feature flags</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {msg && <span style={{fontSize:13,color:msg.startsWith("✅")?"var(--ap-success)":"var(--ap-danger)"}}>{msg}</span>}
          <button className="ap-btn ap-btn--primary" onClick={save} disabled={saving||loading}>{saving?"Saving…":"Save Settings"}</button>
        </div>
      </div>

      {/* Feature toggles */}
      <div className="ap-card" style={{marginBottom:16}}>
        <div className="ap-card-head"><span className="ap-card-title">Feature Flags</span></div>
        <div className="ap-card-body" style={{display:"flex",flexDirection:"column",gap:0,padding:"6px 0"}}>
          {TOGGLES.map((t,i)=>(
            <div key={t.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:i<TOGGLES.length-1?"1px solid var(--ap-border2)":"none",gap:16}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:t.danger?"var(--ap-danger)":"var(--ap-text)"}}>{t.label}</div>
                <div style={{fontSize:11,color:"var(--ap-muted)",marginTop:2}}>{t.sub}</div>
              </div>
              <Toggle on={!!settings[t.key]} onChange={v=>set(t.key,v)}/>
            </div>
          ))}
        </div>
      </div>

      {/* Platform info */}
      <div className="ap-card">
        <div className="ap-card-head"><span className="ap-card-title">Platform Info</span></div>
        <div className="ap-card-body" style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="ap-field">
            <label className="ap-field-label">Platform Name</label>
            <input className="ap-input" value={settings.platformName} onChange={e=>set("platformName",e.target.value)}/>
          </div>
          <div className="ap-field">
            <label className="ap-field-label">Support Email</label>
            <input className="ap-input" type="email" value={settings.supportEmail} onChange={e=>set("supportEmail",e.target.value)} placeholder="support@bememarket.store"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div className="ap-field">
              <label className="ap-field-label">Currency</label>
              <select className="ap-select" value={settings.currency} onChange={e=>set("currency",e.target.value)}>
                <option value="GHS">GHS — Ghanaian Cedi</option>
                <option value="USD">USD — US Dollar</option>
                <option value="NGN">NGN — Nigerian Naira</option>
              </select>
            </div>
            <div className="ap-field">
              <label className="ap-field-label">Platform Fee %</label>
              <input className="ap-input" type="number" min="0" max="50" value={settings.platformFeePercent} onChange={e=>set("platformFeePercent",e.target.value)} placeholder="5"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
