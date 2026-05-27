import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const DEFAULT_SECTIONS = [
  { id:"carousel",         label:"Shop Carousel",     active:true, order:0 },
  { id:"categories",       label:"Categories",        active:true, order:1 },
  { id:"flashDeals",       label:"Flash Deals",       active:true, order:2 },
  { id:"trending",         label:"Trending Now",      active:true, order:3 },
  { id:"continueShopping", label:"Continue Shopping", active:true, order:4 },
];

function Toggle({ on, onChange }) {
  return (
    <label className="ap-toggle">
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} />
      <div className="ap-toggle-track" />
    </label>
  );
}

function cardBtnStyle(isSelected) {
  return {
    padding: "10px 12px",
    borderRadius: 9,
    border: isSelected ? "1px solid var(--ap-purple)" : "1px solid var(--ap-border2)",
    background: isSelected ? "var(--ap-purple-dim)" : "rgba(255,255,255,0.02)",
    color: isSelected ? "var(--ap-purple-lt)" : "var(--ap-text2)",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "var(--ap-font)",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
  };
}

export default function HomepageSection() {
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [cards,    setCards]    = useState([{ id:"1", imageUrl:"", heading:"", description:"", link:"", active:true, order:0 }]);
  const [tab,      setTab]      = useState("sections");
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState("");
  const [selected, setSelected] = useState(0);
  const [imgUrl,   setImgUrl]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "homepage", "config"));
        if (snap.exists()) {
          const d = snap.data();
          if (d.sections?.length)    setSections(d.sections);
          if (d.simpleCards?.length) setCards(d.simpleCards);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      await setDoc(doc(db, "homepage", "config"), { sections, simpleCards: cards }, { merge: true });
      setMsg("Saved successfully.");
    } catch (e) { setMsg("Failed: " + (e.message || "unknown error")); }
    finally { setSaving(false); setTimeout(() => setMsg(""), 3000); }
  };

  /* Section helpers */
  const moveSection = (i, dir) => {
    const next = [...sections];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    setSections(next.map((s, idx) => ({ ...s, order: idx })));
  };
  const toggleSection = (i) => {
    const next = [...sections];
    next[i] = { ...next[i], active: !next[i].active };
    setSections(next);
  };

  /* Card helpers */
  const updateCard = (i, field, val) => {
    const next = [...cards];
    next[i] = { ...next[i], [field]: val };
    setCards(next);
  };
  const addCard = () => {
    setCards(prev => [...prev, { id: String(Date.now()), imageUrl: "", heading: "", description: "", link: "", active: true, order: prev.length }]);
    setSelected(cards.length);
  };
  const removeCard = (i) => {
    setCards(prev => prev.filter((_, idx) => idx !== i));
    setSelected(Math.max(0, i - 1));
  };
  const moveCard = (i, dir) => {
    const next = [...cards];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    setCards(next.map((c, idx) => ({ ...c, order: idx })));
    setSelected(t);
  };

  const applyImageUrl = (i) => {
    const url = imgUrl.trim();
    if (!url) return;
    updateCard(i, "imageUrl", url);
    setImgUrl("");
  };

  const card = cards[selected];

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22, gap:14, flexWrap:"wrap" }}>
        <div>
          <div className="ap-page-title">Homepage Editor</div>
          <div className="ap-page-sub">Manage sections and carousel cards</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {msg && (
            <span style={{ fontSize:13, color: msg.startsWith("Saved") ? "var(--ap-success)" : "var(--ap-danger)" }}>
              {msg}
            </span>
          )}
          <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => window.open("/", "_blank")}>
            Preview
          </button>
          <button className="ap-btn ap-btn--primary" onClick={save} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ap-filter-tabs" style={{ marginBottom:18 }}>
        {[["sections","Section Order"],["carousel","Carousel Cards"]].map(([k, l]) => (
          <button key={k} className={"ap-filter-tab" + (tab === k ? " ap-filter-tab--active" : "")} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {/* Section order tab */}
      {tab === "sections" && (
        <div className="ap-card ap-card--p">
          <p style={{ fontSize:13, color:"var(--ap-muted)", marginBottom:12 }}>
            Reorder and toggle sections on the live homepage.
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {sections.map((sec, i) => (
              <div
                key={sec.id}
                style={{
                  display:"flex", alignItems:"center", gap:12,
                  padding:"12px 14px", borderRadius:9,
                  border:"1px solid var(--ap-border2)",
                  background: sec.active ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)",
                }}
              >
                <span style={{ color:"var(--ap-muted)", fontSize:16 }}>⠿</span>
                <span style={{ flex:1, fontSize:13, fontWeight:600, color: sec.active ? "var(--ap-text)" : "var(--ap-muted)" }}>
                  {sec.label}
                </span>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => moveSection(i, -1)} disabled={i === 0}>↑</button>
                  <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1}>↓</button>
                  <Toggle on={sec.active} onChange={() => toggleSection(i)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carousel tab */}
      {tab === "carousel" && (
        <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:16, alignItems:"start" }}>
          {/* Card list */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {cards.map((c, i) => (
              <button key={c.id || i} onClick={() => setSelected(i)} style={cardBtnStyle(selected === i)}>
                {c.imageUrl
                  ? <img src={c.imageUrl} alt="" style={{ width:28, height:28, borderRadius:5, objectFit:"cover", flexShrink:0 }} />
                  : <div style={{ width:28, height:28, borderRadius:5, background:"rgba(255,255,255,0.05)", flexShrink:0 }} />
                }
                <span style={{ flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {c.heading || ("Card " + (i + 1))}
                </span>
              </button>
            ))}
            <button className="ap-btn ap-btn--ghost ap-btn--full" style={{ marginTop:4 }} onClick={addCard}>
              + Add Card
            </button>
          </div>

          {/* Card editor */}
          {card && (
            <div className="ap-card ap-card--p" style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Controls row */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => moveCard(selected, -1)} disabled={selected === 0}>← Left</button>
                <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => moveCard(selected, 1)} disabled={selected === cards.length - 1}>Right →</button>
                <Toggle on={card.active} onChange={v => updateCard(selected, "active", v)} />
                <span style={{ fontSize:12, color:"var(--ap-muted)" }}>{card.active ? "Visible" : "Hidden"}</span>
                <button className="ap-btn ap-btn--danger ap-btn--sm" style={{ marginLeft:"auto" }} onClick={() => removeCard(selected)}>
                  Remove
                </button>
              </div>

              {/* Image preview */}
              {card.imageUrl && (
                <img
                  src={card.imageUrl} alt=""
                  style={{ width:"100%", maxHeight:160, objectFit:"cover", borderRadius:8 }}
                />
              )}

              {/* Image URL input */}
              <div className="ap-field">
                <label className="ap-field-label">Banner Image URL</label>
                <div style={{ display:"flex", gap:8 }}>
                  <input
                    className="ap-input"
                    value={imgUrl}
                    onChange={e => setImgUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/..."
                    onKeyDown={e => e.key === "Enter" && applyImageUrl(selected)}
                  />
                  <button className="ap-btn ap-btn--secondary ap-btn--sm" onClick={() => applyImageUrl(selected)}>
                    Apply
                  </button>
                </div>
                <div className="ap-field-hint">Paste a Cloudinary or any image URL and click Apply.</div>
              </div>

              {/* Optional fields */}
              <div className="ap-field">
                <label className="ap-field-label">
                  Heading{" "}
                  <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:"var(--ap-muted)" }}>optional</span>
                </label>
                <input
                  className="ap-input"
                  value={card.heading}
                  onChange={e => updateCard(selected, "heading", e.target.value)}
                  placeholder="e.g. Up to 50% off"
                />
              </div>

              <div className="ap-field">
                <label className="ap-field-label">
                  Short Description{" "}
                  <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:"var(--ap-muted)" }}>optional</span>
                </label>
                <input
                  className="ap-input"
                  value={card.description}
                  onChange={e => updateCard(selected, "description", e.target.value)}
                  placeholder="e.g. Limited time — fashion, tech and more"
                />
              </div>

              <div className="ap-field">
                <label className="ap-field-label">
                  Link URL{" "}
                  <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:"var(--ap-muted)" }}>optional</span>
                </label>
                <input
                  className="ap-input"
                  value={card.link}
                  onChange={e => updateCard(selected, "link", e.target.value)}
                  placeholder="/shop or https://..."
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}