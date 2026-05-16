import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveApplicationStep, getApplicationDraft } from "../services/storeService";

const REGIONS = [
  "Greater Accra","Ashanti","Western","Eastern","Central","Volta",
  "Northern","Upper East","Upper West","Brong-Ahafo","Savannah",
  "Ahafo","Bono East","North East","Oti","Western North",
];

const STEPS = [
  { id:2, title:"Name your store",     sub:"Choose a name that customers will remember." },
  { id:3, title:"Connect your brand",  sub:"Add your WhatsApp and social links." },
  { id:4, title:"Location & delivery", sub:"Tell buyers where you're based and how you deliver." },
];

/* ─── Icons ─── */
function Ico({d,size=18,color="currentColor"}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg,i)=><path key={i} d={seg}/>)}
    </svg>
  );
}
const IC={
  phone:  "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  insta:  "M17.5 0h-11A6.5 6.5 0 000 6.5v11A6.5 6.5 0 006.5 24h11A6.5 6.5 0 0024 17.5v-11A6.5 6.5 0 0017.5 0zM12 7a5 5 0 110 10A5 5 0 0112 7zm6.5-2a1 1 0 110 2 1 1 0 010-2z",
  tiktok: "M9 18V5l12-2v13|M6 21a3 3 0 100-6 3 3 0 000 6|M18 16a3 3 0 100-6 3 3 0 000 6",
  link:   "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71|M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  map:    "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z|M12 10a2 2 0 100-4 2 2 0 000 4z",
  truck:  "M1 3h15v13H1z|M16 8h4l3 3v5h-7V8z|M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z|M18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  check:  "M20 6L9 17l-5-5",
  arr:    "M5 12h14|M12 5l7 7-7 7",
};

/* ─── Input with icon ─── */
function IconInput({icon,value,onChange,placeholder,type="text"}) {
  return (
    <div style={{position:"relative"}}>
      <div style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"var(--muted,#9CA3AF)",pointerEvents:"none"}}>
        <Ico d={icon} size={16}/>
      </div>
      <input type={type} value={value||""} onChange={onChange} placeholder={placeholder}
        style={{width:"100%",height:48,paddingLeft:44,paddingRight:14,
          border:"1.5px solid rgba(0,0,0,0.1)",borderRadius:10,
          background:"var(--bg,#F7F8FA)",color:"var(--text,#111)",
          fontSize:14,fontWeight:500,outline:"none",
          fontFamily:"var(--font-main,sans-serif)",boxSizing:"border-box",
          transition:"border-color 0.15s"}}
        onFocus={e=>e.target.style.borderColor="#046EF2"}
        onBlur={e=>e.target.style.borderColor="rgba(0,0,0,0.1)"}/>
    </div>
  );
}

/* ─── Plain input ─── */
function PlainInput({value,onChange,placeholder,maxLength,multiline}) {
  const base={width:"100%",padding:"12px 14px",border:"1.5px solid rgba(0,0,0,0.1)",
    borderRadius:10,background:"var(--bg,#F7F8FA)",color:"var(--text,#111)",
    fontSize:14,fontWeight:500,outline:"none",fontFamily:"var(--font-main,sans-serif)",
    boxSizing:"border-box",transition:"border-color 0.15s"};
  const ev={onFocus:e=>e.target.style.borderColor="#046EF2",onBlur:e=>e.target.style.borderColor="rgba(0,0,0,0.1)"};
  if(multiline) return <textarea rows={4} value={value||""} onChange={onChange} placeholder={placeholder} maxLength={maxLength} style={{...base,resize:"vertical",lineHeight:1.6}} {...ev}/>;
  return <input type="text" value={value||""} onChange={onChange} placeholder={placeholder} maxLength={maxLength} style={{...base,height:48}} {...ev}/>;
}

/* ─── Pill option ─── */
function Pill({label,selected,onClick}) {
  return (
    <button type="button" onClick={onClick}
      style={{
        display:"inline-flex",alignItems:"center",gap:7,
        padding:"9px 16px",borderRadius:100,cursor:"pointer",
        border:`1.5px solid ${selected?"#046EF2":"rgba(0,0,0,0.1)"}`,
        background:selected?"#046EF2":"var(--card,#fff)",
        color:selected?"#fff":"var(--text,#333)",
        fontSize:13,fontWeight:700,transition:"all 0.15s",
        fontFamily:"var(--font-main,sans-serif)",
      }}>
      {selected && <Ico d={IC.check} size={13} color="#fff"/>}
      {label}
    </button>
  );
}

/* ─── Steps ─── */
function Step2({data,upd}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div>
        <label style={{fontSize:13,fontWeight:700,color:"var(--text,#111)",display:"block",marginBottom:8}}>Store Name *</label>
        <PlainInput value={data.shopName} onChange={e=>upd("shopName",e.target.value)} placeholder="e.g. Kente Kicks GH" maxLength={60}/>
        <p style={{fontSize:12,color:"var(--muted,#9CA3AF)",marginTop:6}}>This is how customers will find you. Make it memorable.</p>
      </div>
      <div>
        <label style={{fontSize:13,fontWeight:700,color:"var(--text,#111)",display:"block",marginBottom:8}}>What makes your store unique? *</label>
        <PlainInput value={data.description} onChange={e=>upd("description",e.target.value)}
          placeholder="Your specialties, quality guarantee, what makes your products special…"
          maxLength={500} multiline/>
        <p style={{fontSize:12,color:"var(--muted,#9CA3AF)",marginTop:6}}>{(data.description||"").length}/500</p>
      </div>
      {data.shopName && (
        <div style={{padding:"10px 14px",borderRadius:10,background:"rgba(4,110,242,0.05)",border:"1px solid rgba(4,110,242,0.15)"}}>
          <p style={{fontSize:12,fontWeight:600,color:"#046EF2",margin:0}}>
            Your store URL: <strong>bememarket.store/{(data.shopName||"").toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-")}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

function Step3({data,upd}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div>
        <label style={{fontSize:13,fontWeight:700,color:"var(--text,#111)",display:"block",marginBottom:8}}>WhatsApp Business Number</label>
        <IconInput icon={IC.phone} value={data.whatsapp} onChange={e=>upd("whatsapp",e.target.value)} placeholder="+233 XX XXX XXXX" type="tel"/>
        <p style={{fontSize:12,color:"var(--muted,#9CA3AF)",marginTop:6}}>Customers can contact you directly for orders.</p>
      </div>
      <div>
        <label style={{fontSize:13,fontWeight:700,color:"var(--text,#111)",display:"block",marginBottom:8}}>Instagram</label>
        <IconInput icon={IC.insta} value={data.instagram} onChange={e=>upd("instagram",e.target.value)} placeholder="@yourstorename"/>
      </div>
      <div>
        <label style={{fontSize:13,fontWeight:700,color:"var(--text,#111)",display:"block",marginBottom:8}}>TikTok</label>
        <IconInput icon={IC.tiktok} value={data.tiktok} onChange={e=>upd("tiktok",e.target.value)} placeholder="@yourstorename"/>
      </div>
      <div>
        <label style={{fontSize:13,fontWeight:700,color:"var(--text,#111)",display:"block",marginBottom:8}}>Website</label>
        <IconInput icon={IC.link} value={data.website} onChange={e=>upd("website",e.target.value)} placeholder="https://yourwebsite.com" type="url"/>
      </div>
    </div>
  );
}

const DELIVERY_OPTS=[
  {v:"yes",    l:"Yes — I deliver"},
  {v:"pickup", l:"Pickup only"},
  {v:"both",   l:"Delivery & pickup"},
];

function Step4({data,upd}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div>
        <label style={{fontSize:13,fontWeight:700,color:"var(--text,#111)",display:"block",marginBottom:8}}>City *</label>
        <IconInput icon={IC.map} value={data.city} onChange={e=>upd("city",e.target.value)} placeholder="e.g. Accra, Kumasi, Takoradi"/>
      </div>
      <div>
        <label style={{fontSize:13,fontWeight:700,color:"var(--text,#111)",display:"block",marginBottom:8}}>Region *</label>
        <select value={data.region||""} onChange={e=>upd("region",e.target.value)}
          style={{width:"100%",height:48,padding:"0 14px",border:"1.5px solid rgba(0,0,0,0.1)",
            borderRadius:10,background:"var(--bg,#F7F8FA)",color:data.region?"var(--text,#111)":"var(--muted,#9CA3AF)",
            fontSize:14,fontWeight:500,outline:"none",appearance:"none",cursor:"pointer",
            fontFamily:"var(--font-main,sans-serif)",boxSizing:"border-box"}}>
          <option value="">Select your region</option>
          {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label style={{fontSize:13,fontWeight:700,color:"var(--text,#111)",display:"block",marginBottom:10}}>Do you offer delivery?</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {DELIVERY_OPTS.map(o=>(
            <Pill key={o.v} label={o.l} selected={data.delivery===o.v} onClick={()=>upd("delivery",o.v)}/>
          ))}
        </div>
      </div>
      <div style={{borderTop:"1px solid rgba(0,0,0,0.07)",paddingTop:16}}>
        <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
          <div style={{position:"relative",flexShrink:0,marginTop:1}}>
            <input type="checkbox" checked={data.agreedToTerms||false} onChange={e=>upd("agreedToTerms",e.target.checked)}
              style={{width:18,height:18,accentColor:"#046EF2",cursor:"pointer"}}/>
          </div>
          <span style={{fontSize:13,color:"var(--muted,#6B7280)",lineHeight:1.6}}>
            I agree to the{" "}
            <a href="/seller-terms" target="_blank" style={{color:"#046EF2",fontWeight:700}}>Seller Terms</a>,{" "}
            <a href="/seller-policy" target="_blank" style={{color:"#046EF2",fontWeight:700}}>Seller Policy</a>, and{" "}
            <a href="/community-guidelines" target="_blank" style={{color:"#046EF2",fontWeight:700}}>Community Guidelines</a>.
            I confirm I will not sell counterfeit or illegal products.
          </span>
        </label>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function StoreSurvey() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step,   setStep]   = useState(0);
  const [data,   setData]   = useState({
    shopName:"",description:"",whatsapp:"",instagram:"",
    tiktok:"",website:"",city:"",region:"",delivery:"both",agreedToTerms:false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    if(!user?.uid) return;
    getApplicationDraft(user.uid).then(draft=>{
      if(draft?.step2) setData(d=>({...d,...draft.step2}));
      if(draft?.step3) setData(d=>({...d,...draft.step3}));
      if(draft?.step4) setData(d=>({...d,...draft.step4}));
    }).catch(()=>{});
  },[user?.uid]);

  const upd=(k,v)=>setData(d=>({...d,[k]:v}));
  const cur=STEPS[step];
  const progress=((step+2)/5)*100;

  const validate=()=>{
    if(step===0&&!data.shopName.trim())    {alert("Store name is required.");return false;}
    if(step===0&&!data.description.trim()) {alert("Store description is required.");return false;}
    if(step===2&&!data.city.trim())        {alert("City is required.");return false;}
    if(step===2&&!data.region)             {alert("Region is required.");return false;}
    if(step===2&&!data.agreedToTerms)      {alert("Please agree to the Seller Terms.");return false;}
    return true;
  };

  const handleNext=async()=>{
    if(!validate()) return;
    setSaving(true);
    try {
      const sn=STEPS[step].id;
      const sd=step===0?{shopName:data.shopName,description:data.description}
        :step===1?{whatsapp:data.whatsapp,instagram:data.instagram,tiktok:data.tiktok,website:data.website}
        :{city:data.city,region:data.region,delivery:data.delivery,agreedToTerms:data.agreedToTerms};
      await saveApplicationStep(user.uid,sn,sd);
      if(step<STEPS.length-1){setStep(s=>s+1);}else{navigate("/store-plans");}
    } catch{alert("Failed to save. Please try again.");}
    finally{setSaving(false);}
  };

  const COMPS=[
    <Step2 key="s2" data={data} upd={upd}/>,
    <Step3 key="s3" data={data} upd={upd}/>,
    <Step4 key="s4" data={data} upd={upd}/>,
  ];

  return (
    <div style={{minHeight:"100vh",background:"var(--bg,#F7F8FA)",fontFamily:"var(--font-main,'Nunito',sans-serif)"}}>

      {/* Top progress bar */}
      <div style={{background:"var(--card,#fff)",borderBottom:"1px solid rgba(0,0,0,0.07)",padding:"14px 20px",
        display:"flex",alignItems:"center",gap:16,position:"sticky",top:0,zIndex:50}}>
        <button type="button"
          onClick={()=>step===0?navigate("/store-onboarding"):setStep(s=>s-1)}
          style={{background:"none",border:"none",cursor:"pointer",color:"var(--text,#333)",
            fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:5,padding:0,
            fontFamily:"inherit",flexShrink:0}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div style={{flex:1,height:4,background:"rgba(0,0,0,0.08)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress}%`,background:"#046EF2",borderRadius:2,transition:"width 0.4s ease"}}/>
        </div>
        <span style={{fontSize:12,fontWeight:700,color:"var(--muted,#9CA3AF)",flexShrink:0}}>
          Step {cur.id} of 4
        </span>
      </div>

      {/* Content */}
      <div style={{maxWidth:540,margin:"0 auto",padding:"32px 20px 100px"}}>

        {/* Step heading */}
        <div style={{marginBottom:28}}>
          <h1 style={{fontSize:26,fontWeight:900,color:"var(--text,#111)",letterSpacing:"-0.03em",margin:"0 0 6px"}}>
            {cur.title}
          </h1>
          <p style={{fontSize:14,color:"var(--muted,#9CA3AF)",margin:0,lineHeight:1.5}}>{cur.sub}</p>
        </div>

        {/* Card */}
        <div style={{background:"var(--card,#fff)",borderRadius:20,border:"1px solid rgba(0,0,0,0.07)",
          padding:"24px 24px 28px",boxShadow:"0 4px 24px rgba(0,0,0,0.06)"}}>
          {COMPS[step]}
        </div>

      </div>

      {/* Fixed bottom bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--card,#fff)",
        borderTop:"1px solid rgba(0,0,0,0.07)",padding:"14px 20px",
        display:"flex",gap:10,maxWidth:"100%",boxSizing:"border-box"}}>
        <button type="button" onClick={handleNext} disabled={saving}
          style={{flex:1,height:52,borderRadius:12,border:"none",
            background:"#046EF2",color:"#fff",
            fontSize:15,fontWeight:800,cursor:saving?"wait":"pointer",
            opacity:saving?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            fontFamily:"inherit",transition:"opacity 0.15s",
            boxShadow:"0 4px 14px rgba(4,110,242,0.35)"}}>
          {saving?"Saving…":step<STEPS.length-1?<>Continue <Ico d={IC.arr} size={15} color="#fff"/></>:<>Choose Your Plan <Ico d={IC.arr} size={15} color="#fff"/></>}
        </button>
      </div>
    </div>
  );
}