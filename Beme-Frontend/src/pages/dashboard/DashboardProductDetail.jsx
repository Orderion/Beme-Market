import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { getProductById, addSellerProduct, updateSellerProduct } from "../../services/storeService";
import { uploadImageToCloudinary, validateImageFile } from "../../lib/cloudinary";
import { MARKETPLACE_CATEGORIES } from "../../constants/catalog";
import { useSubscription } from "../../hooks/useSubscription";
import { incrementUsage } from "../../services/aiUsageService";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {String(d).split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const IC = {
  back:     "M19 12H5|M12 19l-7-7 7-7",
  upload:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M17 8l-5-5-5 5|M12 3v12",
  close:    "M18 6L6 18|M6 6l12 12",
  check:    "M20 6L9 17l-5-5",
  save:     "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z|M17 21v-8H7v8|M7 3v5h8",
  sparkle:  "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  plus:     "M12 5v14|M5 12h14",
  trash:    "M3 6h18|M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6|M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2",
  image:    "M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4 3 3 3-3 4 4z",
  cart:     "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z|M3 6h18|M16 10a4 4 0 0 1-8 0",
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z|M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  alert:    "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01",
  chevronL: "M15 18l-6-6 6-6",
  chevronR: "M9 18l6-6-6-6",
  heart:    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  truck:    "M1 3h15v13H1z|M16 8h4l3 3v5h-7V8z|M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z|M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
};

function resolveSwatchColor(label) {
  const raw = String(label || "").trim();
  if (!raw) return "#ccc";
  if (/^#[0-9a-fA-F]{3,8}$/.test(raw)) return raw;
  const lower = raw.toLowerCase().replace(/[\s\-_]+/g, "");
  const map = {
    white:"#f5f5f5",black:"#111111",grey:"#9e9e9e",gray:"#9e9e9e",silver:"#c0c0c0",
    red:"#e24b4a",pink:"#e91e8c",rose:"#e0457b",coral:"#ff6b6b",orange:"#f4a261",
    gold:"#ffd700",yellow:"#f9c74f",green:"#4caf50",teal:"#008080",blue:"#2196f3",
    navy:"#1a2a5e",purple:"#9c27b0",violet:"#7f00ff",lavender:"#c8b4e8",
    brown:"#795548",beige:"#f5f0e8",nude:"#e3bc9a",rosegold:"#b76e79",
  };
  if (map[lower]) return map[lower];
  let hash = 0;
  for (let i = 0; i < raw.length; i++) { hash = raw.charCodeAt(i) + ((hash << 5) - hash); hash |= 0; }
  return `hsl(${Math.abs(hash)%360}, ${45+(Math.abs(hash>>8)%25)}%, ${42+(Math.abs(hash>>16)%22)}%)`;
}

function swatchContrast(bg) {
  const hex = String(bg || "").replace("#","");
  if (hex.length === 6) {
    const r=parseInt(hex.slice(0,2),16), g=parseInt(hex.slice(2,4),16), b=parseInt(hex.slice(4,6),16);
    if (!isNaN(r+g+b)) return (0.299*r+0.587*g+0.114*b)/255 > 0.60 ? "#111" : "#fff";
  }
  return "#fff";
}

const EMPTY_FORM = {
  name:"", description:"", images:[], price:"", comparePrice:"", stock:"",
  sku:"", category:"", subcategory:"", status:"active",
  inStock:true, featured:false, trackInventory:true, lowStockAlert:"", customizations:[],
  paymentType:"both",       // "paystack_only" | "cod_allowed" | "both"
  deliveryMethod:"self",    // "self" | "beme" | "both"
};

function makeOptVal()   { return { id: crypto.randomUUID(), label: "", priceBump: "" }; }
function makeOptGroup() { return { id: crypto.randomUUID(), name: "", type: "buttons", required: true, values: [makeOptVal(), makeOptVal()] }; }

/* ── Shared input style helper ── */
const inp = (extra = {}) => ({
  width:"100%", padding:"10px 13px",
  border:"1px solid var(--sd-border)", borderRadius:8,
  background:"var(--sd-white)", color:"var(--sd-text)",
  fontSize:14, fontWeight:500, outline:"none",
  fontFamily:"var(--sd-font)", boxSizing:"border-box",
  transition:"border-color 0.15s",
  ...extra,
});

/* ── Image Upload Grid ── */
function ImageGrid({ images, onAdd, onRemove, uploading }) {
  const inputRef = useRef(null);
  const handleFiles = async (files) => {
    const fileArr = Array.from(files).slice(0, 5 - images.length);
    if (!fileArr.length) return;
    for (const file of fileArr) { try { validateImageFile(file); } catch(e) { alert(e.message); return; } }
    onAdd(fileArr);
  };
  const onDrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };
  return (
    <div>
      <div className="dpd-img-grid">
        {images.map((url, i) => (
          <div key={url+i} className="dpd-img-cell">
            <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
            {i===0 && <span className="dpd-img-main-badge">MAIN</span>}
            <button type="button" onClick={() => onRemove(i)} className="dpd-img-remove">
              <Ico d={IC.close} size={10} color="#fff"/>
            </button>
          </div>
        ))}
        {images.length < 5 && (
          <button type="button" onClick={() => inputRef.current?.click()} onDrop={onDrop}
            onDragOver={e=>e.preventDefault()} disabled={uploading} className="dpd-img-add">
            {uploading
              ? <div className="dpd-spinner"/>
              : <><Ico d={IC.upload} size={20} color="var(--sd-muted)"/><span className="dpd-img-add-label">Add photo</span></>
            }
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
        style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)}/>
      <p className="dpd-hint">Up to 5 photos · JPG, PNG, WEBP · Max 5 MB each</p>
    </div>
  );
}

/* ── Toggle ── */
function Toggle({ checked, onChange, label, sub }) {
  return (
    <label className="dpd-toggle">
      <div>
        <div className="dpd-toggle-label">{label}</div>
        {sub && <div className="dpd-toggle-sub">{sub}</div>}
      </div>
      <div onClick={onChange} className="dpd-toggle-track" style={{ background: checked ? "var(--sd-accent)" : "var(--sd-border)" }}>
        <div className="dpd-toggle-thumb" style={{ left: checked ? 20 : 2 }}/>
      </div>
    </label>
  );
}

/* ── Section card ── */
function Section({ title, subtitle, children }) {
  return (
    <div className="dpd-section">
      {title && (
        <div className="dpd-section-head">
          <div className="dpd-section-title">{title}</div>
          {subtitle && <div className="dpd-section-sub">{subtitle}</div>}
        </div>
      )}
      <div className="dpd-section-body">{children}</div>
    </div>
  );
}

/* ── Field wrapper ── */
function Field({ label, required, hint, children }) {
  return (
    <div className="dpd-field">
      {label && (
        <label className="dpd-field-label">
          {label}{required && <span style={{ color:"var(--sd-accent)", marginLeft:3 }}>*</span>}
        </label>
      )}
      {children}
      {hint && <div className="dpd-hint">{hint}</div>}
    </div>
  );
}

/* ── Accordion ── */
function PreviewAccordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom:"1px solid var(--sd-border-light)" }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="dpd-accordion-btn">
        {title}
        <span style={{ fontSize:16, color:"var(--sd-muted)", transform:open?"rotate(45deg)":"none", transition:"transform 0.2s", lineHeight:1 }}>+</span>
      </button>
      {open && <div style={{ paddingBottom:12 }}>{children}</div>}
    </div>
  );
}

/* ── Live Preview ── */
function ProductPreview({ form }) {
  const [activeImg, setActiveImg] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [qty, setQty] = useState(1);

  const images = form.images || [];
  const price  = parseFloat(form.price) || 0;
  const comparePrice = parseFloat(form.comparePrice) || 0;
  const hasDiscount  = comparePrice > price && price > 0;

  useEffect(() => { setActiveImg(i => Math.min(i, Math.max(images.length - 1, 0))); }, [images.length]);

  const customizations = (form.customizations || []).filter(g => g.name && g.values?.some(v => v.label));
  const colorGroup     = customizations.find(g => g.name.toLowerCase().includes("color") || g.name.toLowerCase().includes("colour"));

  const optionBump = customizations.reduce((sum, g) => {
    const sel = selectedOptions[g.name];
    const match = g.values?.find(v => v.label === sel);
    return sum + (parseFloat(match?.priceBump) || 0);
  }, 0);
  const finalPrice = price + optionBump;
  const fmtMoney = (n) => `GHS ${Number(n||0).toFixed(2)}`;

  return (
    <div className="dpd-preview">
      <div className="dpd-preview-header">
        <div>
          <div className="dpd-preview-label">Live Preview</div>
          <div className="dpd-preview-sub">Updates as you type</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background: form.status==="active" ? "#22c55e" : "var(--sd-muted)" }}/>
          <span style={{ fontSize:11, fontWeight:600, color: form.status==="active" ? "#16a34a" : "var(--sd-muted)" }}>
            {form.status==="active" ? "Active" : "Draft"}
          </span>
        </div>
      </div>

      <div style={{ overflowY:"auto", maxHeight:"calc(100vh - 280px)" }}>
        {/* Image */}
        <div style={{ position:"relative", aspectRatio:"1", background:"var(--sd-border-light)", overflow:"hidden" }}>
          {images.length > 0 ? (
            <>
              <img src={images[activeImg]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
              {images.length > 1 && (
                <>
                  <button type="button" onClick={() => setActiveImg(i => i===0?images.length-1:i-1)} className="dpd-preview-nav dpd-preview-nav--l">
                    <Ico d={IC.chevronL} size={14}/>
                  </button>
                  <button type="button" onClick={() => setActiveImg(i => i===images.length-1?0:i+1)} className="dpd-preview-nav dpd-preview-nav--r">
                    <Ico d={IC.chevronR} size={14}/>
                  </button>
                  <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4 }}>
                    {images.map((_,i) => (
                      <button key={i} type="button" onClick={() => setActiveImg(i)}
                        style={{ width:i===activeImg?16:6, height:6, borderRadius:3, background:i===activeImg?"#fff":"rgba(255,255,255,0.6)", border:"none", padding:0, cursor:"pointer", transition:"all 0.2s" }}/>
                    ))}
                  </div>
                  <div style={{ position:"absolute", top:10, right:10, padding:"3px 8px", background:"rgba(0,0,0,0.5)", borderRadius:20, fontSize:10, fontWeight:600, color:"#fff" }}>
                    {activeImg+1}/{images.length}
                  </div>
                </>
              )}
              <div style={{ position:"absolute", bottom:10, right:10, width:32, height:32, borderRadius:"50%", background:"var(--sd-white)", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid var(--sd-border)", boxShadow:"0 1px 4px rgba(0,0,0,0.1)" }}>
                <Ico d={IC.heart} size={14} color="var(--sd-muted)"/>
              </div>
            </>
          ) : (
            <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"var(--sd-muted)" }}>
              <Ico d={IC.image} size={40} color="var(--sd-border)"/>
              <span style={{ fontSize:12, fontWeight:500, color:"var(--sd-muted)" }}>Add photos to see preview</span>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div style={{ display:"flex", gap:5, padding:"8px 12px", borderBottom:"1px solid var(--sd-border-light)", overflowX:"auto" }}>
            {images.map((src,i) => (
              <button key={i} type="button" onClick={() => setActiveImg(i)}
                style={{ width:44, height:44, flexShrink:0, borderRadius:7, overflow:"hidden", border:`1.5px solid ${i===activeImg?"var(--sd-accent)":"var(--sd-border)"}`, cursor:"pointer", opacity:i===activeImg?1:0.65, transition:"all 0.15s", padding:0, background:"none" }}>
                <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
              </button>
            ))}
          </div>
        )}

        {/* Info */}
        <div style={{ padding:16 }}>
          <h1 style={{ fontSize:18, fontWeight:700, color:"var(--sd-text)", margin:"0 0 8px", letterSpacing:"-0.02em", lineHeight:1.2 }}>
            {form.name || <span style={{ color:"var(--sd-muted)", fontWeight:400, fontSize:15 }}>Enter product title…</span>}
          </h1>

          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:12 }}>
            <span style={{ padding:"3px 9px", borderRadius:100, fontSize:10, fontWeight:700, background:"rgba(34,197,94,0.1)", color:"#16a34a", border:"1px solid rgba(34,197,94,0.2)" }}>
              {form.inStock !== false ? "In stock" : "Out of stock"}
            </span>
            {form.category && (
              <span style={{ padding:"3px 9px", borderRadius:100, fontSize:10, fontWeight:600, background:"var(--sd-border-light)", color:"var(--sd-muted)", border:"1px solid var(--sd-border)" }}>
                {form.category}
              </span>
            )}
            {form.featured && (
              <span style={{ padding:"3px 9px", borderRadius:100, fontSize:10, fontWeight:700, background:"rgba(245,158,11,0.1)", color:"#d97706", border:"1px solid rgba(245,158,11,0.2)" }}>
                Featured
              </span>
            )}
          </div>

          <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:16, paddingBottom:14, borderBottom:"1px solid var(--sd-border-light)" }}>
            <span style={{ fontSize:22, fontWeight:700, color:"var(--sd-text)", letterSpacing:"-0.03em" }}>
              {price > 0 ? fmtMoney(finalPrice) : <span style={{ color:"var(--sd-muted)", fontSize:16, fontWeight:400 }}>Set price…</span>}
            </span>
            {hasDiscount && (
              <>
                <span style={{ fontSize:13, color:"var(--sd-muted)", textDecoration:"line-through" }}>{fmtMoney(comparePrice)}</span>
                <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:100, background:"rgba(34,197,94,0.1)", color:"#16a34a", border:"1px solid rgba(34,197,94,0.2)" }}>
                  Save {fmtMoney(comparePrice - finalPrice)}
                </span>
              </>
            )}
          </div>

          {colorGroup && colorGroup.values?.some(v => v.label) && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
                {colorGroup.name}
                {selectedOptions[colorGroup.name] && <span style={{ fontWeight:600, textTransform:"none", letterSpacing:0, marginLeft:6 }}>· {selectedOptions[colorGroup.name]}</span>}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                {colorGroup.values.filter(v => v.label).map(v => {
                  const bg = resolveSwatchColor(v.label);
                  const active = selectedOptions[colorGroup.name] === v.label;
                  return (
                    <button key={v.id} type="button" onClick={() => setSelectedOptions(s => ({...s,[colorGroup.name]:v.label}))}
                      style={{ width:28, height:28, borderRadius:"50%", background:bg, border:`2.5px solid ${active?"var(--sd-accent)":"rgba(0,0,0,0.12)"}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:active?"0 0 0 2px white,0 0 0 3.5px var(--sd-accent)":"none", transition:"all 0.15s", padding:0 }}>
                      {active && <Ico d={IC.check} size={11} color={swatchContrast(bg)} sw={2.5}/>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {customizations.filter(g => g !== colorGroup).map(group => {
            const vals = group.values?.filter(v => v.label) || [];
            if (!vals.length) return null;
            return (
              <div key={group.id} style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"var(--sd-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>{group.name}</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {vals.map(v => {
                    const active = selectedOptions[group.name] === v.label;
                    return (
                      <button key={v.id} type="button" onClick={() => setSelectedOptions(s => ({...s,[group.name]:v.label}))}
                        style={{ padding:"7px 14px", borderRadius:7, border:`1.5px solid ${active?"var(--sd-text)":"var(--sd-border)"}`, background:active?"var(--sd-text)":"transparent", color:active?"var(--sd-white)":"var(--sd-text)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"var(--sd-font)", transition:"all 0.15s" }}>
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", border:"1px solid var(--sd-border)", borderRadius:9, marginBottom:12, background:"var(--sd-border-light)" }}>
            <span style={{ fontSize:12, fontWeight:600, color:"var(--sd-text)" }}>
              Qty{form.stock ? <span style={{ fontSize:11, color:"var(--sd-muted)", fontWeight:400 }}> · {form.stock} left</span> : ""}
            </span>
            <div style={{ display:"flex", alignItems:"center", border:"1px solid var(--sd-border)", borderRadius:7, overflow:"hidden", background:"var(--sd-white)" }}>
              <button type="button" onClick={() => setQty(q => Math.max(1,q-1))}
                style={{ width:32, height:32, border:"none", background:"transparent", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--sd-text)" }}>−</button>
              <span style={{ minWidth:28, textAlign:"center", fontSize:13, fontWeight:700, color:"var(--sd-text)", borderLeft:"1px solid var(--sd-border)", borderRight:"1px solid var(--sd-border)", height:32, lineHeight:"32px" }}>{qty}</span>
              <button type="button" onClick={() => setQty(q => q+1)}
                style={{ width:32, height:32, border:"none", background:"transparent", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--sd-text)" }}>+</button>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 12px", background:"rgba(4,110,242,0.06)", border:"1px solid rgba(4,110,242,0.15)", borderRadius:9, marginBottom:12, fontSize:12, fontWeight:600, color:"#2563EB" }}>
            <Ico d={IC.truck} size={14} color="#2563EB"/> Get it in 1–3 days in Ghana
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <button type="button" style={{ height:44, borderRadius:9, border:"1.5px solid var(--sd-border)", background:"transparent", fontSize:13, fontWeight:700, cursor:"default", display:"flex", alignItems:"center", justifyContent:"center", gap:7, color:"var(--sd-text)", fontFamily:"var(--sd-font)" }}>
              <Ico d={IC.cart} size={14}/> Add to cart
            </button>
            <button type="button" style={{ height:44, borderRadius:9, border:"none", background:"#2563EB", fontSize:13, fontWeight:700, cursor:"default", color:"#fff", fontFamily:"var(--sd-font)" }}>
              Buy now
            </button>
          </div>
          <button type="button" style={{ width:"100%", height:44, borderRadius:9, border:"none", background:"var(--sd-text)", fontSize:13, fontWeight:700, color:"var(--sd-white)", cursor:"default", fontFamily:"var(--sd-font)" }}>
            Pay now · {fmtMoney(finalPrice * qty)}
          </button>

          <div style={{ marginTop:12, borderTop:"1px solid var(--sd-border-light)" }}>
            <PreviewAccordion title="Product Details">
              {form.description
                ? <p style={{ fontSize:12, lineHeight:1.75, color:"var(--sd-text)", opacity:0.8, margin:0, whiteSpace:"pre-line", fontWeight:400 }}>{form.description}</p>
                : <p style={{ fontSize:12, color:"var(--sd-muted)", margin:0, fontStyle:"italic" }}>Your description will appear here…</p>
              }
            </PreviewAccordion>
            <PreviewAccordion title="Delivery & Returns">
              <p style={{ fontSize:12, lineHeight:1.7, color:"var(--sd-text)", opacity:0.75, margin:0 }}>
                Standard delivery: 1–3 business days within Ghana. Returns accepted within 7 days of delivery in original condition.
              </p>
            </PreviewAccordion>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN
══════════════════════════════════════ */
export default function DashboardProductDetail() {
  const navigate      = useNavigate();
  const { productId } = useParams();
  const isNew         = !productId;
  const { user }      = useAuth();
  const { storeId, shop, subscriptionPlan, planLimits } = useSellerAuth();
  const { subscriptionPlan: subPlan } = useSubscription();
  const isProSeller = subPlan === "pro" || subscriptionPlan === "pro";

  const [form,        setForm]        = useState({ ...EMPTY_FORM });
  const [allProducts, setAllProducts] = useState([]);
  const [loading,     setLoading]     = useState(!isNew);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [aiWriting,   setAiWriting]   = useState(false);
  const [aiGenerated, setAiGenerated] = useState(null);

  const nameRef     = useRef(null);
  const priceRef    = useRef(null);
  const categoryRef = useRef(null);
  const imagesRef   = useRef(null);

  const scrollToField = (ref) => ref?.current?.scrollIntoView({ behavior:"smooth", block:"center" });
  const clearFieldError = (k) => setFieldErrors(e => { const n={...e}; delete n[k]; return n; });

  useEffect(() => {
    if (isNew) return;
    const run = async () => {
      setLoading(true);
      try {
        const p = await getProductById(productId);
        if (p && p.sellerId === user?.uid) {
          const images = Array.isArray(p.images) && p.images.length ? p.images : p.imageUrl ? [p.imageUrl] : [];
          setForm({
            name:p.name||"", description:p.description||"", images,
            price:p.price!=null?String(p.price):"",
            comparePrice:p.comparePrice!=null?String(p.comparePrice):"",
            stock:p.stock!=null?String(p.stock):"",
            trackInventory:p.trackInventory!==false,
            lowStockAlert:p.lowStockAlert!=null?String(p.lowStockAlert):"",
            customizations:Array.isArray(p.customizations)?p.customizations.map((g,gi)=>({
              id:g.id||`g-${gi}`,name:String(g.name||""),type:g.type==="select"?"select":"buttons",
              required:g.required!==false,
              values:Array.isArray(g.values)?g.values.map((v,vi)=>({
                id:v.id||`v-${gi}-${vi}`,label:String(v.label||""),
                priceBump:v.priceBump!=null?String(v.priceBump):""
              })):[makeOptVal(),makeOptVal()],
            })):[],
            sku:p.sku||"",category:p.category||"",subcategory:p.subcategory||"",
            status:p.status||"active",inStock:p.inStock!==false,featured:!!p.featured,
            paymentType:p.paymentType||"both",
            deliveryMethod:p.deliveryMethod||"self",
          });
        }
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    run();
  }, [productId, isNew, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !isNew) return;
    getDocs(query(collection(db,"Products"), where("sellerId","==",user.uid)))
      .then(snap => setAllProducts(snap.docs.map(d=>({id:d.id}))))
      .catch(()=>{});
  }, [user?.uid, isNew]);

  const FALLBACK_LIMITS = { basic:5,free:5,starter:10,growth:25,standard:25,pro:500 };
  const maxProds = planLimits?.maxProducts || FALLBACK_LIMITS[(subscriptionPlan||"basic").toLowerCase()] || 5;
  const atLimit  = isNew && allProducts.length >= maxProds;

  const upd = k => e => { setForm(f=>({...f,[k]:e.target.type==="checkbox"?e.target.checked:e.target.value})); setError(""); clearFieldError(k); };

  const handleAIWrite = async () => {
    if (!form.name.trim()) { alert("Enter a product title first."); return; }
    setAiWriting(true); setAiGenerated(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          messages:[{ role:"user", content:`Write a product description for Beme Market (Ghana e-commerce). Product: ${form.name}. Category: ${form.category||"General"}. Price: ${form.price?"GHS "+form.price:"competitive"}. Write 3-4 natural sentences only, no markdown, no questions. Also write an SEO title (max 60 chars). Reply ONLY in this format:\nDESCRIPTION: [text]\nSEO_TITLE: [title]` }],
          context:{ currentPage:"products", shopName:shop?.shopName||"Store" }
        })
      });
      const data = await res.json();
      const text = data.content||"";
      const descMatch  = text.match(/DESCRIPTION:\s*([\s\S]*?)(?=SEO_TITLE:|$)/i);
      const titleMatch = text.match(/SEO_TITLE:\s*([\s\S]*?)$/i);
      setAiGenerated({ description:(descMatch?.[1]||"").trim(), title:(titleMatch?.[1]||"").trim()||form.name });
      if (user?.uid) incrementUsage(user.uid).catch(()=>{});
    } catch { alert("AI is temporarily unavailable."); }
    finally { setAiWriting(false); }
  };

  const applyAI = (field) => {
    if (!aiGenerated) return;
    if (field==="both")             setForm(f=>({...f,description:aiGenerated.description,name:aiGenerated.title}));
    else if (field==="description") setForm(f=>({...f,description:aiGenerated.description}));
    else if (field==="title")       setForm(f=>({...f,name:aiGenerated.title}));
    setAiGenerated(null);
  };

  const handleAddImages = async (files) => {
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) { const r = await uploadImageToCloudinary(file); urls.push(r.url); }
      setForm(f=>({...f,images:[...f.images,...urls].slice(0,5)}));
    } catch(e) { setError(e.message||"Upload failed."); }
    finally { setUploading(false); }
  };

  const validate = () => {
    if (!form.name.trim())           { setError("Product title is required."); setFieldErrors(e=>({...e,name:true})); scrollToField(nameRef); return false; }
    if (!form.price||Number(form.price)<=0) { setError("Enter a valid price."); setFieldErrors(e=>({...e,price:true})); scrollToField(priceRef); return false; }
    if (!form.category)              { setError("Select a category."); setFieldErrors(e=>({...e,category:true})); scrollToField(categoryRef); return false; }
    if (form.images.length===0)      { setError("Add at least one product image."); setFieldErrors(e=>({...e,images:true})); scrollToField(imagesRef); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!user?.uid) { setError("You must be logged in."); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        name:form.name.trim(), description:form.description.trim(), images:form.images,
        imageUrl:form.images[0]||"", price:Number(form.price),
        comparePrice:form.comparePrice?Number(form.comparePrice):0,
        stock:form.stock!==""?Number(form.stock):null,
        customizations:form.customizations.map(g=>({
          id:g.id,name:String(g.name).trim(),type:g.type==="select"?"select":"buttons",required:!!g.required,
          values:(g.values||[]).map(v=>({id:v.id,label:String(v.label).trim(),priceBump:v.priceBump!==""&&!isNaN(Number(v.priceBump))?Number(v.priceBump):0})).filter(v=>v.label),
        })).filter(g=>g.name&&g.values.length>0),
        sku:form.sku.trim(), category:form.category, subcategory:form.subcategory,
        status:form.status, inStock:form.inStock, trackInventory:form.trackInventory,
        lowStockAlert:form.trackInventory&&form.lowStockAlert!==""?Number(form.lowStockAlert):null,
        featured:form.featured,
        paymentType:form.paymentType||"both",
        deliveryMethod:form.deliveryMethod||"self",
      };
      const eff = { storeId:storeId||user.uid, shopName:shop?.shopName||"", plan:subscriptionPlan||"basic" };
      if (isNew) await addSellerProduct(user.uid, eff.storeId, eff.shopName, eff.plan, payload);
      else       await updateSellerProduct(productId, user.uid, payload);
      setSaved(true);
      setTimeout(() => navigate("/seller-dashboard?tab=products"), 900);
    } catch(e) { setError(e.message||"Failed to save."); }
    finally { setSaving(false); }
  };

  const selectedCatObj = MARKETPLACE_CATEGORIES.find(c => c.label === form.category);

  if (loading) return (
    <div className="dpd-loading">
      <div className="dpd-spinner"/>
      Loading product…
    </div>
  );

  /* ── Save button label ── */
  const saveLabel = saved ? "Saved!" : saving ? "Saving…" : isNew ? "Publish Product" : "Save Changes";

  return (
    <div className="dpd-root">

      {/* ── Sticky topbar ── */}
      <div className="dpd-topbar">
        <button type="button" onClick={() => navigate("/seller-dashboard?tab=products")} className="dpd-back-btn">
          <Ico d={IC.back} size={16}/> Products
        </button>

        <div className="dpd-topbar-mid">
          <button type="button"
            onClick={() => setForm(f=>({...f,status:f.status==="active"?"draft":"active"}))}
            className="dpd-status-btn"
            style={{ color: form.status==="active" ? "#16a34a" : "var(--sd-muted)" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background: form.status==="active" ? "#22c55e" : "var(--sd-border)" }}/>
            {form.status==="active" ? "Active" : "Draft"}
          </button>
        </div>

        <div className="dpd-topbar-right">
          <button type="button" onClick={() => navigate("/seller-dashboard?tab=products")} className="dpd-discard-btn">
            Discard
          </button>
          {/* Publish/Save button — pill style, purple border+text, hover fills */}
          <button type="button" onClick={handleSave} disabled={saving || atLimit}
            className={`dpd-save-btn${saved ? " dpd-save-btn--saved" : ""}`}>
            {saved
              ? <><Ico d={IC.check} size={13} color="#fff"/>Saved!</>
              : saving ? "Saving…"
              : <><Ico d={IC.save} size={13} color="inherit"/>{saveLabel}</>
            }
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="dpd-content">

        <div className="dpd-page-head">
          <h1 className="dpd-page-title">{isNew ? "Add Product" : "Edit Product"}</h1>
          <p className="dpd-page-sub">
            {isNew ? "Fill in the details below. The preview updates live." : "Your changes are reflected instantly in the preview."}
          </p>
        </div>

        {atLimit && (
          <div className="dpd-alert dpd-alert--warn">
            <Ico d={IC.alert} size={16} color="#d97706"/>
            Product limit reached on {subscriptionPlan} plan.{" "}
            <button type="button" onClick={() => navigate("/seller-dashboard?tab=subscription")} className="dpd-alert-link">
              Upgrade →
            </button>
          </div>
        )}

        {error && (
          <div className="dpd-alert dpd-alert--err">
            <Ico d={IC.alert} size={16} color="var(--sd-danger)"/>{error}
          </div>
        )}

        <div className="dpd-grid">

          {/* ── LEFT: Form ── */}
          <div>
            {/* Title & Description */}
            <Section title="Product Details">
              <Field label="Product Title" required>
                <div ref={nameRef}>
                  <input value={form.name} onChange={upd("name")} maxLength={120}
                    placeholder="e.g. Ankara Mini Dress — Red Print"
                    style={{ ...inp(), borderColor: fieldErrors.name ? "var(--sd-danger)" : "var(--sd-border)", boxShadow: fieldErrors.name ? "0 0 0 3px rgba(220,38,38,0.08)" : "none" }}
                    onFocus={e=>{ if(!fieldErrors.name) e.target.style.borderColor="var(--sd-accent)"; }}
                    onBlur={e=>{  if(!fieldErrors.name) e.target.style.borderColor="var(--sd-border)"; }}/>
                  {fieldErrors.name && <div className="dpd-field-err">Product title is required</div>}
                </div>
              </Field>

              <Field label="Description" hint={isProSeller ? "Pro tip: use AI to write a better description." : undefined}>
                <div className="dpd-desc-head">
                  <span className="dpd-field-label">Description</span>
                  {isProSeller && (
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <button type="button" onClick={handleAIWrite} disabled={aiWriting} className="dpd-ai-btn">
                        {aiWriting
                          ? <><div className="dpd-spinner-sm"/> Writing…</>
                          : <><Ico d={IC.sparkle} size={12} color="var(--sd-accent)"/> Write with AI</>
                        }
                      </button>
                    </div>
                  )}
                </div>
                <textarea value={form.description} onChange={upd("description")} rows={5}
                  placeholder="Describe your product — what it is, who it's for, what makes it great…"
                  style={{ ...inp({ fontSize:13, resize:"vertical", lineHeight:"1.65", minHeight:100 }) }}
                  onFocus={e=>e.target.style.borderColor="var(--sd-accent)"}
                  onBlur={e=>e.target.style.borderColor="var(--sd-border)"}/>
              </Field>

              {aiGenerated && (
                <div className="dpd-ai-result">
                  <div className="dpd-ai-result-label">AI Generated — Review and apply</div>
                  <div style={{ marginBottom:10 }}>
                    <div className="dpd-ai-result-sub">SEO Title</div>
                    <div className="dpd-ai-result-box">{aiGenerated.title}</div>
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <div className="dpd-ai-result-sub">Description</div>
                    <div className="dpd-ai-result-box" style={{ lineHeight:1.65, color:"var(--sd-text2)" }}>{aiGenerated.description}</div>
                  </div>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                    {[["both","Apply Both",true],["description","Description only",false],["title","Title only",false]].map(([f,l,primary])=>(
                      <button key={f} type="button" onClick={()=>applyAI(f)} className={primary?"dpd-ai-apply-primary":"dpd-ai-apply"}>{l}</button>
                    ))}
                    <button type="button" onClick={()=>{setAiGenerated(null);handleAIWrite();}} className="dpd-ai-apply">Regenerate</button>
                    <button type="button" onClick={()=>setAiGenerated(null)} className="dpd-ai-dismiss">Dismiss</button>
                  </div>
                </div>
              )}
            </Section>

            {/* Photos */}
            <Section title="Product Photos" subtitle="Add up to 5 photos. The first image is your main listing photo.">
              <div ref={imagesRef}>
                {fieldErrors.images && (
                  <div className="dpd-alert dpd-alert--err" style={{ marginBottom:12 }}>
                    <Ico d={IC.alert} size={13} color="var(--sd-danger)"/> Add at least one product photo to continue
                  </div>
                )}
                <ImageGrid images={form.images}
                  onAdd={(files) => { handleAddImages(files); clearFieldError("images"); }}
                  onRemove={i=>setForm(f=>({...f,images:f.images.filter((_,j)=>j!==i)}))}
                  uploading={uploading}/>
              </div>
            </Section>

            {/* Pricing */}
            <Section title="Pricing">
              <div className="dpd-2col">
                <Field label="Price (GHS)" required>
                  <div ref={priceRef}>
                    <div className="dpd-price-wrap" style={{ borderColor: fieldErrors.price ? "var(--sd-danger)" : "var(--sd-border)", boxShadow: fieldErrors.price ? "0 0 0 3px rgba(220,38,38,0.08)" : "none" }}
                      onFocusCapture={e=>{ if(!fieldErrors.price) e.currentTarget.style.borderColor="var(--sd-accent)"; }}
                      onBlurCapture={e=>{  if(!fieldErrors.price) e.currentTarget.style.borderColor=fieldErrors.price?"var(--sd-danger)":"var(--sd-border)"; }}>
                      <span className="dpd-price-prefix">GHS</span>
                      <input type="number" min="0" step="0.01" value={form.price} onChange={upd("price")} placeholder="0.00" className="dpd-price-input"/>
                    </div>
                    {fieldErrors.price && <div className="dpd-field-err">Enter a valid price</div>}
                  </div>
                </Field>
                <Field label="Compare-at Price (GHS)" hint="Shows as crossed-out original price">
                  <div className="dpd-price-wrap"
                    onFocusCapture={e=>e.currentTarget.style.borderColor="var(--sd-accent)"}
                    onBlurCapture={e=>e.currentTarget.style.borderColor="var(--sd-border)"}>
                    <span className="dpd-price-prefix">GHS</span>
                    <input type="number" min="0" step="0.01" value={form.comparePrice} onChange={upd("comparePrice")} placeholder="0.00" className="dpd-price-input"/>
                  </div>
                </Field>
              </div>
              {form.comparePrice && Number(form.comparePrice)>Number(form.price) && Number(form.price)>0 && (
                <div className="dpd-discount-note">
                  Discount: GHS {(Number(form.comparePrice)-Number(form.price)).toFixed(2)} ({Math.round(((Number(form.comparePrice)-Number(form.price))/Number(form.comparePrice))*100)}% off) — buyers see this as a sale
                </div>
              )}
            </Section>

            {/* Category */}
            <Section title="Category" subtitle="Choose the most relevant category for better search visibility.">
              <div className="dpd-2col">
                <Field label="Main Category" required>
                  <div ref={categoryRef}>
                    <select value={form.category}
                      onChange={e=>{ setForm(f=>({...f,category:e.target.value,subcategory:""})); clearFieldError("category"); }}
                      style={{ ...inp({ appearance:"none", cursor:"pointer", color: form.category?"var(--sd-text)":"var(--sd-muted)", borderColor: fieldErrors.category?"var(--sd-danger)":"var(--sd-border)", boxShadow: fieldErrors.category?"0 0 0 3px rgba(220,38,38,0.08)":"none" }) }}
                      onFocus={e=>{ if(!fieldErrors.category) e.target.style.borderColor="var(--sd-accent)"; }}
                      onBlur={e=>{  if(!fieldErrors.category) e.target.style.borderColor="var(--sd-border)"; }}>
                      <option value="">Select a category</option>
                      {MARKETPLACE_CATEGORIES.map(c=><option key={c.key} value={c.label}>{c.label}</option>)}
                    </select>
                    {fieldErrors.category && <div className="dpd-field-err">Please select a category</div>}
                  </div>
                </Field>
                {selectedCatObj?.subcategories?.length > 0 && (
                  <Field label="Subcategory">
                    <select value={form.subcategory} onChange={upd("subcategory")}
                      style={{ ...inp({ appearance:"none", cursor:"pointer" }) }}
                      onFocus={e=>e.target.style.borderColor="var(--sd-accent)"}
                      onBlur={e=>e.target.style.borderColor="var(--sd-border)"}>
                      <option value="">Select subcategory</option>
                      {selectedCatObj.subcategories.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                )}
              </div>
            </Section>

            {/* Inventory */}
            <Section title="Inventory">
              <div style={{ marginBottom:16 }}>
                <Toggle checked={form.trackInventory} onChange={()=>setForm(f=>({...f,trackInventory:!f.trackInventory}))} label="Track inventory" sub="Recommended — lets buyers see stock levels"/>
              </div>
              {!form.trackInventory && (
                <div className="dpd-alert dpd-alert--err" style={{ marginBottom:14 }}>
                  Sellers with no inventory tracking may have payouts held during review periods.
                </div>
              )}
              {form.trackInventory && (
                <div className="dpd-2col" style={{ marginBottom:14 }}>
                  <Field label="Stock Quantity" required>
                    <input type="number" min="0" value={form.stock} onChange={upd("stock")} placeholder="e.g. 12"
                      style={inp()} onFocus={e=>e.target.style.borderColor="var(--sd-accent)"} onBlur={e=>e.target.style.borderColor="var(--sd-border)"}/>
                  </Field>
                  <Field label="Low Stock Alert" hint="Notifies you when stock falls below this">
                    <input type="number" min="0" value={form.lowStockAlert} onChange={upd("lowStockAlert")} placeholder="e.g. 3"
                      style={inp()} onFocus={e=>e.target.style.borderColor="var(--sd-accent)"} onBlur={e=>e.target.style.borderColor="var(--sd-border)"}/>
                  </Field>
                </div>
              )}
              <div className="dpd-2col">
                <Field label="SKU (optional)">
                  <input type="text" value={form.sku} onChange={upd("sku")} placeholder="e.g. BM-DR-001"
                    style={inp()} onFocus={e=>e.target.style.borderColor="var(--sd-accent)"} onBlur={e=>e.target.style.borderColor="var(--sd-border)"}/>
                </Field>
                <div style={{ paddingTop:24 }}>
                  <Toggle checked={form.inStock} onChange={()=>setForm(f=>({...f,inStock:!f.inStock}))} label="In Stock" sub="Visible and buyable in marketplace"/>
                </div>
              </div>
            </Section>

            {/* Status */}
            <Section title="Status & Visibility">
              <div className="dpd-2col" style={{ marginBottom:14 }}>
                {["active","draft"].map(s=>(
                  <label key={s} onClick={()=>setForm(f=>({...f,status:s}))} className="dpd-status-radio"
                    style={{ borderColor: form.status===s?"var(--sd-accent)":"var(--sd-border)", background: form.status===s?"var(--sd-accent-dim)":"transparent" }}>
                    <div className="dpd-radio-dot" style={{ borderColor: form.status===s?"var(--sd-accent)":"var(--sd-border)" }}>
                      {form.status===s && <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--sd-accent)" }}/>}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color: form.status===s?"var(--sd-accent)":"var(--sd-text)" }}>{s==="active"?"Active":"Draft"}</div>
                      <div style={{ fontSize:11, color:"var(--sd-muted)" }}>{s==="active"?"Visible to buyers":"Hidden from marketplace"}</div>
                    </div>
                  </label>
                ))}
              </div>
              <Toggle checked={form.featured} onChange={()=>setForm(f=>({...f,featured:!f.featured}))} label="Featured Product" sub="Gets highlighted on your store page and trending sections"/>
            </Section>

            {/* Options */}
            
            {/* ── Payment & Delivery Settings ── */}
            <Section title="Payment & Delivery" subtitle="Control how buyers pay and how orders are delivered.">

              <Field label="Accepted Payment Methods">
                <div className="dpd-2col" style={{ marginBottom:0 }}>
                  {[
                    { v:"both",          label:"Paystack + Pay on Delivery", sub:"Buyers choose at checkout" },
                    { v:"paystack_only", label:"Paystack Only",              sub:"Card, bank, MoMo via Paystack" },
                    { v:"cod_allowed",   label:"Pay on Delivery Only",       sub:"Cash or MoMo on arrival" },
                  ].map(o => (
                    <label key={o.v} onClick={()=>setForm(f=>({...f,paymentType:o.v}))}
                      className="dpd-status-radio"
                      style={{ borderColor:form.paymentType===o.v?"var(--sd-accent)":"var(--sd-border)", background:form.paymentType===o.v?"var(--sd-accent-dim)":"transparent" }}>
                      <div className="dpd-radio-dot" style={{ borderColor:form.paymentType===o.v?"var(--sd-accent)":"var(--sd-border)" }}>
                        {form.paymentType===o.v&&<div style={{ width:8,height:8,borderRadius:"50%",background:"var(--sd-accent)" }}/>}
                      </div>
                      <div>
                        <div style={{ fontSize:13,fontWeight:700,color:form.paymentType===o.v?"var(--sd-accent)":"var(--sd-text)" }}>{o.label}</div>
                        <div style={{ fontSize:11,color:"var(--sd-muted)" }}>{o.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Delivery Method" hint="Controls which delivery options buyers see at checkout for this product.">
                <div className="dpd-2col" style={{ marginBottom:0 }}>
                  {[
                    { v:"self", label:"Self Delivery",     sub:"You arrange and ship it" },
                    { v:"beme", label:"Beme Delivery",      sub:"Courier partners (Growth+ plan)" },
                    { v:"both", label:"Both Options",       sub:"Buyer chooses at checkout" },
                  ].map(o => (
                    <label key={o.v} onClick={()=>setForm(f=>({...f,deliveryMethod:o.v}))}
                      className="dpd-status-radio"
                      style={{ borderColor:form.deliveryMethod===o.v?"var(--sd-accent)":"var(--sd-border)", background:form.deliveryMethod===o.v?"var(--sd-accent-dim)":"transparent" }}>
                      <div className="dpd-radio-dot" style={{ borderColor:form.deliveryMethod===o.v?"var(--sd-accent)":"var(--sd-border)" }}>
                        {form.deliveryMethod===o.v&&<div style={{ width:8,height:8,borderRadius:"50%",background:"var(--sd-accent)" }}/>}
                      </div>
                      <div>
                        <div style={{ fontSize:13,fontWeight:700,color:form.deliveryMethod===o.v?"var(--sd-accent)":"var(--sd-text)" }}>{o.label}</div>
                        <div style={{ fontSize:11,color:"var(--sd-muted)" }}>{o.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>

            </Section>

            <Section title="Product Options" subtitle="Add size, color, storage, or any variant buyers can choose.">
              {form.customizations.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:14 }}>
                  {form.customizations.map((group, gi) => (
                    <div key={group.id} className="dpd-opt-group">
                      <div className="dpd-opt-group-head">
                        <div style={{ flex:1 }}>
                          <label className="dpd-field-label">Option Name</label>
                          <input value={group.name}
                            onChange={e=>setForm(f=>({...f,customizations:f.customizations.map((g,i)=>i===gi?{...g,name:e.target.value}:g)}))}
                            placeholder="e.g. Size, Color, Storage"
                            style={inp()} onFocus={e=>e.target.style.borderColor="var(--sd-accent)"} onBlur={e=>e.target.style.borderColor="var(--sd-border)"}/>
                        </div>
                        <div style={{ width:120, flexShrink:0 }}>
                          <label className="dpd-field-label">Display</label>
                          <select value={group.type}
                            onChange={e=>setForm(f=>({...f,customizations:f.customizations.map((g,i)=>i===gi?{...g,type:e.target.value}:g)}))}
                            style={{ ...inp({ appearance:"none", fontSize:12, cursor:"pointer" }) }}>
                            <option value="buttons">Buttons</option>
                            <option value="select">Dropdown</option>
                          </select>
                        </div>
                        <button type="button" onClick={()=>setForm(f=>({...f,customizations:f.customizations.filter((_,i)=>i!==gi)}))}
                          style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(220,38,38,0.2)", background:"rgba(220,38,38,0.06)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", marginTop:22, flexShrink:0 }}>
                          <Ico d={IC.trash} size={13} color="var(--sd-danger)"/>
                        </button>
                      </div>
                      <label className="dpd-field-label">Values</label>
                      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                        {group.values.map((val, vi) => (
                          <div key={val.id} style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <input value={val.label} placeholder="e.g. Small"
                              onChange={e=>setForm(f=>({...f,customizations:f.customizations.map((g,gi2)=>gi2!==gi?g:{...g,values:g.values.map((v,vi2)=>vi2===vi?{...v,label:e.target.value}:v)})}))}
                              style={{ ...inp(), flex:2 }} onFocus={e=>e.target.style.borderColor="var(--sd-accent)"} onBlur={e=>e.target.style.borderColor="var(--sd-border)"}/>
                            <div style={{ position:"relative", flex:1 }}>
                              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:11, fontWeight:700, color:"var(--sd-muted)", pointerEvents:"none" }}>±GHS</span>
                              <input type="number" value={val.priceBump} placeholder="0"
                                onChange={e=>setForm(f=>({...f,customizations:f.customizations.map((g,gi2)=>gi2!==gi?g:{...g,values:g.values.map((v,vi2)=>vi2===vi?{...v,priceBump:e.target.value}:v)})}))}
                                style={{ ...inp({ paddingLeft:44, width:"100%" }) }} onFocus={e=>e.target.style.borderColor="var(--sd-accent)"} onBlur={e=>e.target.style.borderColor="var(--sd-border)"}/>
                            </div>
                            <button type="button" disabled={group.values.length<=1}
                              onClick={()=>setForm(f=>({...f,customizations:f.customizations.map((g,gi2)=>gi2!==gi?g:{...g,values:g.values.filter((_,vi2)=>vi2!==vi)})}))}
                              style={{ width:28, height:28, borderRadius:7, border:"1px solid var(--sd-border)", background:"transparent", cursor:group.values.length<=1?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:group.values.length<=1?0.3:1, flexShrink:0 }}>
                              <Ico d={IC.close} size={11} color="var(--sd-muted)"/>
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button"
                        onClick={()=>setForm(f=>({...f,customizations:f.customizations.map((g,gi2)=>gi2!==gi?g:{...g,values:[...g.values,makeOptVal()]})}))}
                        className="dpd-add-val-btn">
                        <Ico d={IC.plus} size={12} color="var(--sd-accent)"/> Add value
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button"
                onClick={()=>setForm(f=>({...f,customizations:[...f.customizations,makeOptGroup()]}))}
                className="dpd-add-group-btn">
                <Ico d={IC.plus} size={14} color="var(--sd-accent)"/> Add option group
              </button>
            </Section>
          </div>

          {/* ── RIGHT: Preview ── */}
          <div className="dpd-preview-col">
            <ProductPreview form={form}/>
            {shop && (
              <div className="dpd-store-info-card">
                <div className="dpd-field-label" style={{ marginBottom:6 }}>Store</div>
                <div style={{ fontWeight:700, color:"var(--sd-text)", marginBottom:2 }}>{shop.shopName}</div>
                <div style={{ color:"var(--sd-muted)", fontSize:12 }}>
                  {subscriptionPlan?.charAt(0).toUpperCase()+subscriptionPlan?.slice(1)} Plan ·{" "}
                  {allProducts.length}/{maxProds} products used
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile save bar ── */}
      <div className="dpd-mobile-bar">
        <button type="button" onClick={()=>navigate("/seller-dashboard?tab=products")} className="dpd-mobile-discard">
          Discard
        </button>
        <button type="button" onClick={handleSave} disabled={saving||atLimit} className="dpd-mobile-save">
          {saved ? "Saved!" : saving ? "Saving…" : isNew ? "Publish Product" : "Save Changes"}
        </button>
      </div>

      <style>{`
        @keyframes dpd-spin { to { transform: rotate(360deg); } }
        @keyframes dpd-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: calc(600px + 100%) 0; }
        }

        /* Root */
        .dpd-root {
          min-height: 100vh;
          background: var(--sd-white);
          font-family: var(--sd-font, 'DM Sans', system-ui, sans-serif);
          color: var(--sd-text);
        }

        /* Loading */
        .dpd-loading {
          min-height: 100vh; background: var(--sd-white);
          display: flex; align-items: center; justify-content: center;
          gap: 10px; color: var(--sd-muted); font-size: 14px;
          font-family: var(--sd-font);
        }

        /* Spinners */
        .dpd-spinner {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2.5px solid var(--sd-border);
          border-top-color: var(--sd-accent);
          animation: dpd-spin 0.7s linear infinite;
        }
        .dpd-spinner-sm {
          width: 10px; height: 10px; border-radius: 50%;
          border: 2px solid var(--sd-accent); border-top-color: transparent;
          animation: dpd-spin 0.8s linear infinite;
          display: inline-block;
        }

        /* ── Topbar ── */
        .dpd-topbar {
          background: var(--sd-white);
          border-bottom: 1px solid var(--sd-border);
          padding: 0 16px; height: 54px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 100; gap: 10px;
        }
        .dpd-back-btn {
          display: flex; align-items: center; gap: 7px;
          background: none; border: none; cursor: pointer;
          color: var(--sd-text); font-size: 13px; font-weight: 600;
          padding: 0; font-family: inherit; flex-shrink: 0;
        }
        .dpd-topbar-mid { flex: 1; display: flex; align-items: center; gap: 10px; }
        .dpd-status-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 8px;
          border: 1px solid var(--sd-border); background: transparent;
          cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 600;
          transition: all 0.15s;
        }
        .dpd-topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .dpd-discard-btn {
          padding: 7px 14px; border-radius: 100px;
          border: 1px solid var(--sd-border); background: transparent;
          font-size: 12px; font-weight: 600; cursor: pointer;
          color: var(--sd-text); font-family: inherit;
          transition: background 0.15s;
        }
        .dpd-discard-btn:hover { background: var(--sd-border-light); }

        /* Publish / Save button — pill, purple border + text, hover fills */
        .dpd-save-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 18px; border-radius: 100px;
          border: 1.5px solid var(--sd-accent);
          background: transparent; color: var(--sd-accent);
          font-size: 12px; font-weight: 700; cursor: pointer;
          font-family: inherit; transition: background 0.18s, color 0.18s;
          white-space: nowrap;
        }
        .dpd-save-btn:hover:not(:disabled) {
          background: var(--sd-accent); color: #fff;
        }
        .dpd-save-btn--saved {
          background: #22c55e; border-color: #22c55e; color: #fff;
        }
        .dpd-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Content */
        .dpd-content { max-width: 1160px; margin: 0 auto; padding: 24px 16px 120px; }

        .dpd-page-head   { margin-bottom: 20px; }
        .dpd-page-title  { font-size: 22px; font-weight: 800; color: var(--sd-text); margin: 0 0 4px; letter-spacing: -0.03em; }
        .dpd-page-sub    { font-size: 13px; color: var(--sd-muted); margin: 0; }

        /* Alerts */
        .dpd-alert {
          padding: 12px 16px; border-radius: 10px;
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; font-weight: 600; margin-bottom: 16px; border: 1px solid;
        }
        .dpd-alert--warn { background: rgba(245,158,11,0.07); border-color: rgba(245,158,11,0.25); color: #92400e; }
        .dpd-alert--err  { background: var(--sd-danger-bg, rgba(220,38,38,0.06)); border-color: rgba(220,38,38,0.2); color: var(--sd-danger, #dc2626); }
        .dpd-alert-link  { background: none; border: none; cursor: pointer; color: var(--sd-accent); font-weight: 700; font-size: 13px; font-family: inherit; padding: 0; }

        /* Two-column grid */
        .dpd-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px; align-items: start;
        }

        /* Section */
        .dpd-section {
          background: var(--sd-white);
          border: 1px solid var(--sd-border);
          border-radius: 14px; overflow: hidden; margin-bottom: 14px;
          transition: background 0.25s, border-color 0.25s;
        }
        .dpd-section-head  { padding: 16px 20px 0; }
        .dpd-section-title { font-size: 13px; font-weight: 700; color: var(--sd-text); letter-spacing: -0.01em; }
        .dpd-section-sub   { font-size: 11px; color: var(--sd-muted); margin-top: 2px; }
        .dpd-section-body  { padding: 14px 20px 18px; }

        /* Fields */
        .dpd-field       { margin-bottom: 14px; }
        .dpd-field-label {
          display: block; font-size: 11px; font-weight: 700;
          color: var(--sd-muted); text-transform: uppercase;
          letter-spacing: 0.07em; margin-bottom: 7px;
        }
        .dpd-field-err { font-size: 11px; color: var(--sd-danger, #dc2626); font-weight: 600; margin-top: 4px; }
        .dpd-hint      { font-size: 11px; color: var(--sd-muted); margin-top: 5px; }

        /* 2-col grid inside sections */
        .dpd-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* Price input */
        .dpd-price-wrap {
          display: flex; align-items: center;
          border: 1px solid var(--sd-border); border-radius: 8px;
          overflow: hidden; background: var(--sd-white);
          transition: border-color 0.15s;
        }
        .dpd-price-prefix {
          padding: 0 10px; font-size: 12px; font-weight: 700; color: var(--sd-muted);
          border-right: 1px solid var(--sd-border); line-height: 42px; user-select: none; flex-shrink: 0;
        }
        .dpd-price-input {
          flex: 1; padding: 10px 12px; border: none; background: transparent;
          color: var(--sd-text); font-size: 14px; font-weight: 600;
          outline: none; font-family: inherit;
        }

        .dpd-discount-note {
          padding: 9px 12px; border-radius: 8px;
          background: rgba(21,128,61,0.07); border: 1px solid rgba(21,128,61,0.2);
          font-size: 12px; color: #15803d; font-weight: 600; margin-top: -4px;
        }

        /* Description head */
        .dpd-desc-head {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
        }

        /* AI button */
        .dpd-ai-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 11px; border-radius: 8px;
          border: 1px solid var(--sd-accent-border, rgba(124,58,237,0.2));
          background: var(--sd-accent-dim); color: var(--sd-accent);
          font-size: 11px; font-weight: 700; cursor: pointer;
          font-family: inherit; transition: all 0.15s;
        }
        .dpd-ai-result {
          padding: 14px 16px; background: rgba(21,128,61,0.04);
          border-radius: 10px; border: 1px solid rgba(21,128,61,0.2); margin-top: 4px;
        }
        .dpd-ai-result-label { font-size: 10px; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
        .dpd-ai-result-sub   { font-size: 10px; font-weight: 700; color: var(--sd-muted); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.06em; }
        .dpd-ai-result-box   { font-size: 13px; font-weight: 700; color: var(--sd-text); background: var(--sd-white); padding: 8px 12px; border-radius: 7px; border: 1px solid var(--sd-border); }
        .dpd-ai-apply-primary { padding: 7px 14px; border-radius: 8px; border: 1px solid var(--sd-accent); background: var(--sd-accent); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .dpd-ai-apply  { padding: 7px 14px; border-radius: 8px; border: 1px solid var(--sd-border); background: var(--sd-white); color: var(--sd-text); font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .dpd-ai-dismiss{ padding: 7px 12px; border-radius: 8px; border: none; background: none; color: var(--sd-muted); font-size: 12px; cursor: pointer; }

        /* Image grid */
        .dpd-img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
        .dpd-img-cell {
          position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden;
          border: 1px solid var(--sd-border); background: var(--sd-border-light);
        }
        .dpd-img-main-badge {
          position: absolute; top: 5px; left: 5px;
          background: var(--sd-accent); color: #fff;
          font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 100px;
        }
        .dpd-img-remove {
          position: absolute; top: 5px; right: 5px;
          width: 22px; height: 22px; border-radius: 50%;
          background: rgba(0,0,0,0.55); border: none; color: #fff;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .dpd-img-add {
          aspect-ratio: 1; border-radius: 10px;
          border: 1.5px dashed var(--sd-border); background: var(--sd-white);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; cursor: pointer; color: var(--sd-muted); font-family: inherit;
          transition: border-color 0.15s, background 0.15s;
        }
        .dpd-img-add:hover { border-color: var(--sd-accent); background: var(--sd-accent-dim); }
        .dpd-img-add-label { font-size: 11px; font-weight: 600; color: var(--sd-muted); }

        /* Toggle */
        .dpd-toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; }
        .dpd-toggle-label { font-size: 13px; font-weight: 600; color: var(--sd-text); }
        .dpd-toggle-sub   { font-size: 11px; color: var(--sd-muted); margin-top: 2px; }
        .dpd-toggle-track { width: 42px; height: 24px; border-radius: 12px; flex-shrink: 0; position: relative; transition: background 0.2s; cursor: pointer; }
        .dpd-toggle-thumb { position: absolute; top: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.18); }

        /* Status radio */
        .dpd-status-radio {
          display: flex; align-items: center; gap: 10px; padding: 12px 14px;
          border-radius: 9px; border: 1.5px solid; cursor: pointer; transition: all 0.15s;
        }
        .dpd-radio-dot {
          width: 18px; height: 18px; border-radius: 50%; border: 2px solid;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        /* Product options */
        .dpd-opt-group { border: 1px solid var(--sd-border); border-radius: 10px; padding: 14px; }
        .dpd-opt-group-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
        .dpd-add-val-btn {
          margin-top: 10px; display: flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 700; color: var(--sd-accent);
          background: none; border: none; cursor: pointer; padding: 4px 0; font-family: inherit;
        }
        .dpd-add-group-btn {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 10px 16px; border-radius: 9px;
          border: 1.5px dashed var(--sd-border); background: transparent;
          cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600;
          color: var(--sd-text); justify-content: center; transition: border-color 0.15s, background 0.15s;
        }
        .dpd-add-group-btn:hover { border-color: var(--sd-accent); background: var(--sd-accent-dim); }

        /* Accordion */
        .dpd-accordion-btn {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 11px 0; background: none; border: none; cursor: pointer;
          font-family: inherit; font-size: 12px; font-weight: 600;
          color: var(--sd-text); text-align: left;
        }

        /* Preview */
        .dpd-preview {
          background: var(--sd-white); border: 1px solid var(--sd-border);
          border-radius: 16px; overflow: hidden; font-family: inherit;
        }
        .dpd-preview-header {
          padding: 12px 16px; border-bottom: 1px solid var(--sd-border);
          display: flex; align-items: center; justify-content: space-between;
          background: var(--sd-border-light);
        }
        .dpd-preview-label { font-size: 10px; font-weight: 700; color: var(--sd-muted); text-transform: uppercase; letter-spacing: 0.1em; }
        .dpd-preview-sub   { font-size: 11px; color: var(--sd-muted); margin-top: 1px; }
        .dpd-preview-nav {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 28px; height: 28px; border-radius: 50%;
          background: rgba(255,255,255,0.9); border: 1px solid var(--sd-border);
          cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--sd-text);
        }
        .dpd-preview-nav--l { left: 8px; }
        .dpd-preview-nav--r { right: 8px; }

        /* Preview sticky col */
        .dpd-preview-col { position: sticky; top: 70px; }
        .dpd-store-info-card {
          margin-top: 12px; padding: 12px 14px;
          background: var(--sd-white); border: 1px solid var(--sd-border); border-radius: 12px; font-size: 12px;
        }

        /* Discount note */
        .dpd-discount-note {
          padding: 9px 12px; border-radius: 8px;
          background: rgba(21,128,61,0.07); border: 1px solid rgba(21,128,61,0.2);
          font-size: 12px; color: #15803d; font-weight: 600;
        }

        /* Mobile save bar */
        .dpd-mobile-bar {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: var(--sd-white); border-top: 1px solid var(--sd-border);
          padding: 12px 16px; display: none; gap: 10px; z-index: 50;
        }
        .dpd-mobile-discard {
          flex: 1; padding: 12px; border-radius: 10px;
          border: 1px solid var(--sd-border); background: transparent;
          font-size: 14px; font-weight: 700; cursor: pointer;
          color: var(--sd-text); font-family: inherit;
        }
        .dpd-mobile-save {
          flex: 2; padding: 12px; border-radius: 10px; border: none;
          background: var(--sd-accent); color: #fff;
          font-size: 14px; font-weight: 800; cursor: pointer; font-family: inherit;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .dpd-grid { grid-template-columns: 1fr; }
          .dpd-preview-col { position: static; }
          .dpd-mobile-bar { display: flex; }
          .dpd-topbar-right .dpd-save-btn { display: none; }
          .dpd-topbar-right .dpd-discard-btn { display: none; }
          .dpd-content { padding-bottom: 100px; }
        }
        @media (max-width: 480px) {
          .dpd-2col { grid-template-columns: 1fr; }
          .dpd-topbar { padding: 0 12px; }
          .dpd-content { padding: 16px 12px 100px; }
          .dpd-page-title { font-size: 18px; }
          .dpd-img-grid { grid-template-columns: repeat(3, 1fr); }
          .dpd-section-body { padding: 12px 14px 16px; }
        }
      `}</style>
    </div>
  );
}