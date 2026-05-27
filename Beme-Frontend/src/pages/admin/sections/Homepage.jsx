/* Simplified Homepage Editor — image + optional heading/desc/link per card, section ordering */
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { uploadImagesToCloudinary } from "../../../lib/cloudinary";

const DEFAULT_SECTIONS = [
  { id:"carousel",         label:"Shop Carousel",      active:true, order:0 },
  { id:"categories",       label:"Categories",         active:true, order:1 },
  { id:"flashDeals",       label:"Flash Deals",        active:true, order:2 },
  { id:"trending",         label:"Trending Now",       active:true, order:3 },
  { id:"continueShopping", label:"Continue Shopping",  active:true, order:4 },
];
const DEFAULT_CARDS = [
  { id:"1", imageUrl:"", heading:"", description:"", link:"", active:true, order:0 },
];

function Toggle({ on, onChange }) {
  return (
    <label className="ap-toggle">
      <input type="checkbox" checked={on} onChange={e=>onChange(e.target.checked)}/>
      <div className="ap-toggle-track"/>
    </label>
  );
}

export default function HomepageSection() {
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [cards,    setCards]    = useState(DEFAULT_CARDS);
  const [tab,      setTab]      = useState("sections");
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState("");
  const [uploading,setUploading]= useState({});
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db,"homepage","config"));
        if (snap.exists()) {
          const d = snap.data();
          if (d.sections?.length) setSections(d.sections);
          if (d.simpleCards?.length) setCards(d.simpleCards);
        }
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      await setDoc(doc(db,"homepage","config"), { sections, simpleCards:cards }, { merge:true });
      setMsg("✅ Saved successfully.");
    } catch(e) { setMsg("❌ " + (e.message||"Failed to save.")); }
    finally { setSaving(false); setTimeout(()=>setMsg(""),3000); }
  };

  const moveSection = (i, dir) => {
    const next = [...sections]; const t = i+dir;
    if (t<0||t>=next.length) return;
    [next[i],next[t]]=[next[t],next[i]];
    setSections(next.map((s,idx)=>({...s,order:idx})));
  };
  const toggleSection = (i) => { const next=[...sections]; next[i]={...next[i],active:!next[i].active}; setSections(next); };

  const updateCard = (i, field, val) => { const next=[...cards]; next[i]={...next[i],[field]:val}; setCards(next); };
  const addCard = () => { setCards(prev=>[...prev,{id:String(Date.now()),imageUrl:"",heading:"",description:"",link:"",active:true,order:prev.length}]); setSelected(cards.length); };
  const removeCard = (i) => { setCards(prev=>prev.filter((_,idx)=>idx!==i)); setSelected(Math.max(0,i-1)); };
  const moveCard = (i, dir) => { const next=[...cards]; const t=i+dir; if(t<0||t>=next.length)return; [next[i],next[t]]=[next[t],next[i]]; setCards(next.map((c,idx)=>({...c,order:idx}))); setSelected(t); };

  const handleImageUpload = async (i, file) => {
    if (!file) return;
    setUploading(prev=>({...prev,[i]:true}));
    try {
      const results = await uploadImagesToCloudinary([file]);
      if (results[0]?.url) updateCard(i,"imageUrl",results[0].url);
    } catch(e) { console.error(e); }
    finally { setUploading(prev=>({...prev,[i]:false})); }
  };

  const card = cards[selected];

  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22,gap:14,flexWrap:"wrap"}}>
        <div>
          <div className="ap-page-title">Homepage Editor</div>
          <div className="ap-page-sub">Manage sections, carousel cards, and layout</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {msg && <span style={{fontSize:13,color:msg.startsWith("✅")?"var(--ap-success)":"var(--ap-danger)"}}>{msg}</span>}
          <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={()=>window.open("/","_blank")}>Preview ↗</button>
          <button className="ap-btn ap-btn--primary" onClick={save} disabled={saving}>{saving?"Saving…":"Save Changes"}</button>
        </div>
      </div>

      <div className="ap-filter-tabs" style={{marginBottom:18}}>
        {[["sections","Section Order"],["carousel","Carousel Cards"]].map(([k,l])=>(
          <button key={k} className={`ap-filter-tab${tab===k?" ap-filter-tab--active":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==="sections" && (
        <div className="ap-card ap-card--p">
          <div style={{marginBottom:12,fontSize:13,color:"var(--ap-muted)"}}>Drag sections to reorder. Toggle to show or hide on the live homepage.</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {sections.map((sec,i)=>(
              <div key={sec.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:9,border:"1px solid var(--ap-border2)",background:`rgba(255,255,255,${sec.active?0.025:0.01})`}}>
                <span style={{color:"var(--ap-muted)",fontSize:16,cursor:"grab"}}>⠿</span>
                <span style={{flex:1,fontSize:13,fontWeight:600,color:sec.active?"var(--ap-text)":"var(--ap-muted)"}}>{sec.label}</span>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={()=>moveSection(i,-1)} disabled={i===0}>↑</button>
                  <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={()=>moveSection(i,1)} disabled={i===sections.length-1}>↓</button>
                  <Toggle on={sec.active} onChange={()=>toggleSection(i)}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="carousel" && (
        <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:16,alignItems:"start"}}>
          {/* Card list */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {cards.map((c,i)=>(
              <button key={c.id||i}
                onClick={()=>setSelected(i)}
                style={{padding:"10px 12px",borderRadius:9,border:`1px solid ${selected===i?"var(--ap-purple)":"var(--ap-border2)"}`,background:selected===i?"var(--ap-purple-dim)":"rgba(255,255,255,0.02)",color:selected===i?"var(--ap-purple-lt)":"var(--ap-text2)",fontSize:13,fontWeight:500,fontFamily:"var(--ap-font)",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:8"}}>
                {c.imageUrl ? <img src={c.imageUrl} alt="" style={{width:28,height:28,borderRadius:5,objectFit:"cover",flexShrink:0}}/> : <div style={{width:28,height:28,borderRadius:5,background:"rgba(255,255,255,0.05)",flexShrink:0}}/>}
                <span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.heading||`Card ${i+1}`}</span>
              </button>
            ))}
            <button className="ap-btn ap-btn--ghost ap-btn--full" style={{marginTop:4}} onClick={addCard}>+ Add Card</button>
          </div>

          {/* Card editor */}
          {card && (
            <div className="ap-card ap-card--p" style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"flex",gap:8,marginBottom:4}}>
                <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={()=>moveCard(selected,-1)} disabled={selected===0}>← Left</button>
                <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={()=>moveCard(selected,1)} disabled={selected===cards.length-1}>Right →</button>
                <Toggle on={card.active} onChange={v=>updateCard(selected,"active",v)}/>
                <span style={{fontSize:12,color:"var(--ap-muted)",alignSelf:"center"}}>{card.active?"Visible":"Hidden"}</span>
                <button className="ap-btn ap-btn--danger ap-btn--sm" style={{marginLeft:"auto"}} onClick={()=>removeCard(selected)}>Remove</button>
              </div>

              {/* Image upload */}
              <div className="ap-field">
                <label className="ap-field-label">Banner Image</label>
                {card.imageUrl && <img src={card.imageUrl} alt="" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:8,marginBottom:8}}/>}
                <input type="file" accept="image/*" onChange={e=>handleImageUpload(selected,e.target.files?.[0])} style={{display:"none"}} id={`img-${selected}`}/>
                <label htmlFor={`img-${selected}`} className="ap-btn ap-btn--ghost ap-btn--sm" style={{cursor:"pointer",display:"inline-flex",justifyContent:"center"}}>
                  {uploading[selected]?"Uploading…":"Choose Image"}
                </label>
                <div style={{marginTop:6}}>
                  <label className="ap-field-label" style={{marginBottom:4,display:"block"}}>Or paste URL</label>
                  <input className="ap-input" value={card.imageUrl} onChange={e=>updateCard(selected,"imageUrl",e.target.value)} placeholder="https://res.cloudinary.com/…"/>
                </div>
              </div>

              {/* Optional fields */}
              <div className="ap-field">
                <label className="ap-field-label">Heading <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--ap-muted)"}}>optional</span></label>
                <input className="ap-input" value={card.heading} onChange={e=>updateCard(selected,"heading",e.target.value)} placeholder="e.g. Up to 50% off"/>
              </div>
              <div className="ap-field">
                <label className="ap-field-label">Short Description <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--ap-muted)"}}>optional</span></label>
                <input className="ap-input" value={card.description} onChange={e=>updateCard(selected,"description",e.target.value)} placeholder="e.g. Limited time — fashion, tech & more"/>
              </div>
              <div className="ap-field">
                <label className="ap-field-label">Link URL <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--ap-muted)"}}>optional</span></label>
                <input className="ap-input" value={card.link} onChange={e=>updateCard(selected,"link",e.target.value)} placeholder="/shop or https://…"/>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
