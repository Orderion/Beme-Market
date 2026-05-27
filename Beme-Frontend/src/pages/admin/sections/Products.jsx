import { useState, useEffect, useMemo, useRef } from "react";
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  addDoc, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";

function fmt(n) { return "GHS " + Number(n || 0).toFixed(2); }
function fmtDate(ts) {
  if (!ts) return "—";
  try { const d = ts?.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" }); }
  catch { return "—"; }
}

const SHOPS = ["fashion","main","kente","perfume","tech","electronics","clothing","home","kids","others"];

function Ico({ d, size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {d.split("|").map((seg, i) => <path key={i} d={seg.trim()} />)}
  </svg>;
}
const I = {
  add:    "M12 5v14|M5 12h14",
  edit:   "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7|M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  del:    "M3 6h18|M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6|M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  search: "M21 21l-4.35-4.35|M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0",
  star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  csv:    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M16 13H8|M16 17H8|M10 9H8",
  flash:  "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  plus:   "M12 5v14|M5 12h14",
  minus:  "M5 12h14",
  img:    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
};

/* ── Variant Builder inside Product Modal ── */
function VariantBuilder({ variants, onChange }) {
  const addGroup = () => onChange([...variants, { name:"Color", values:[{ label:"", priceAdjust:0 }] }]);
  const removeGroup = (gi) => onChange(variants.filter((_,i) => i !== gi));
  const updateGroup = (gi, key, val) => { const next=[...variants]; next[gi]={...next[gi],[key]:val}; onChange(next); };
  const addValue = (gi) => { const next=[...variants]; next[gi]={...next[gi],values:[...next[gi].values,{label:"",priceAdjust:0}]}; onChange(next); };
  const removeValue = (gi, vi) => { const next=[...variants]; next[gi]={...next[gi],values:next[gi].values.filter((_,i)=>i!==vi)}; onChange(next); };
  const updateValue = (gi, vi, key, val) => {
    const next=[...variants];
    next[gi]={...next[gi],values:next[gi].values.map((v,i)=>i===vi?{...v,[key]:val}:v)};
    onChange(next);
  };

  const PRESET_NAMES = ["Color","Size","Material","Style","Storage","RAM","Weight","Pattern"];

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div className="ap-field-label" style={{ marginBottom:0 }}>Product Options / Variants</div>
        <button type="button" className="ap-btn ap-btn--secondary ap-btn--sm" onClick={addGroup}>
          <Ico d={I.plus} size={12}/> Add Option
        </button>
      </div>
      <div className="ap-field-hint" style={{ marginBottom:10 }}>
        e.g. Size (S +0, M +0, XL +5) or Color (Red +0, Gold +10). Price adjust adds to base price.
      </div>

      {variants.length === 0 && (
        <div style={{ padding:"14px", borderRadius:8, border:"1px dashed var(--ap-border2)", textAlign:"center", fontSize:12, color:"var(--ap-muted)" }}>
          No options yet — click "Add Option" to create Color, Size, etc.
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {variants.map((group, gi) => (
          <div key={gi} style={{ border:"1px solid var(--ap-border2)", borderRadius:9, overflow:"hidden" }}>
            {/* Group header */}
            <div style={{ display:"flex", gap:8, alignItems:"center", padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderBottom:"1px solid var(--ap-border2)" }}>
              <select
                className="ap-select"
                style={{ width:"auto", flex:1 }}
                value={group.name}
                onChange={e => updateGroup(gi, "name", e.target.value)}
              >
                {PRESET_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                <option value="custom">Custom…</option>
              </select>
              {group.name === "custom" && (
                <input className="ap-input" style={{ flex:1 }} placeholder="Option name"
                  value={group.customName || ""}
                  onChange={e => updateGroup(gi, "customName", e.target.value)}/>
              )}
              <button type="button" className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => removeGroup(gi)}>
                <Ico d={I.del} size={12}/>
              </button>
            </div>

            {/* Values */}
            <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
              {group.values.map((val, vi) => (
                <div key={vi} style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <input
                    className="ap-input"
                    style={{ flex:2 }}
                    placeholder={group.name === "Color" ? "e.g. Red, Blue, Black" : group.name === "Size" ? "e.g. S, M, L, XL" : "Value"}
                    value={val.label}
                    onChange={e => updateValue(gi, vi, "label", e.target.value)}
                  />
                  <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                    <span style={{ fontSize:11, color:"var(--ap-muted)", whiteSpace:"nowrap" }}>Price +</span>
                    <input
                      className="ap-input"
                      type="number"
                      min="0"
                      style={{ width:80 }}
                      placeholder="0"
                      value={val.priceAdjust}
                      onChange={e => updateValue(gi, vi, "priceAdjust", Number(e.target.value))}
                    />
                  </div>
                  <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => removeValue(gi, vi)}>
                    <Ico d={I.minus} size={12}/>
                  </button>
                </div>
              ))}
              <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" style={{ alignSelf:"flex-start" }} onClick={() => addValue(gi)}>
                <Ico d={I.plus} size={12}/> Add Value
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Product Form Modal ── */
function ProductModal({ product, onClose, onSaved }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("basic");
  const [form, setForm] = useState({
    name:        product?.name        || "",
    price:       product?.price       || "",
    oldPrice:    product?.oldPrice    || "",
    description: product?.description || "",
    shop:        product?.shop        || "main",
    category:    product?.category    || "",
    brand:       product?.brand       || "",
    stock:       product?.stock       || "",
    images:      (product?.images || [product?.image]).filter(Boolean).join(", ") || "",
    featured:    product?.featured    || false,
    inStock:     product?.inStock     !== false,
    homeSlot:    product?.homeSlot    || "others",
  });
  const [variants, setVariants] = useState(product?.variants || []);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { setErr("Name required."); return; }
    if (!form.price)       { setErr("Price required."); return; }
    setSaving(true); setErr("");
    try {
      const imgs = form.images.split(",").map(s => s.trim()).filter(Boolean);
      const data = {
        name: form.name.trim(),
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        description: form.description.trim(),
        shop: form.shop, category: form.category.trim(),
        brand: form.brand.trim(),
        stock: form.stock ? Number(form.stock) : null,
        images: imgs, image: imgs[0] || "",
        featured: form.featured, inStock: form.inStock,
        homeSlot: form.homeSlot,
        variants: variants.map(g => ({
          name: g.customName || g.name,
          values: g.values.filter(v => v.label.trim()),
        })).filter(g => g.name && g.values.length > 0),
        updatedAt: serverTimestamp(),
      };
      if (product?.id) {
        await updateDoc(doc(db, "Products", product.id), data);
        onSaved({ ...product, ...data, id: product.id });
      } else {
        data.createdAt = serverTimestamp(); data.createdBy = user?.uid;
        const ref = await addDoc(collection(db, "Products"), data);
        onSaved({ ...data, id: ref.id });
      }
      onClose();
    } catch (e) { setErr(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const TABS = [["basic","Basic Info"],["media","Images"],["variants","Options & Variants"],["stock","Stock & Display"]];

  return (
    <div className="ap-modal-backdrop" onClick={onClose}>
      <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth:600, maxHeight:"92vh", display:"flex", flexDirection:"column" }}>
        <div className="ap-modal-head">
          <span className="ap-modal-title">{product?.id ? "Edit Product" : "Add Product"}</span>
          <button className="ap-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Inner tabs */}
        <div style={{ display:"flex", gap:2, padding:"0 20px", borderBottom:"1px solid var(--ap-border2)", flexShrink:0 }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding:"10px 14px", border:"none", background:"none",
              color: tab===k ? "var(--ap-purple-lt)" : "var(--ap-muted)",
              fontFamily:"var(--ap-font)", fontSize:12, fontWeight:600, cursor:"pointer",
              borderBottom: tab===k ? "2px solid var(--ap-purple-lt)" : "2px solid transparent",
              transition:"all 0.13s",
            }}>
              {l} {k==="variants" && variants.length > 0 && <span style={{ background:"var(--ap-purple)", color:"#fff", fontSize:10, padding:"1px 5px", borderRadius:4, marginLeft:4 }}>{variants.length}</span>}
            </button>
          ))}
        </div>

        <div className="ap-modal-body" style={{ flex:1, overflowY:"auto" }}>
          {/* Basic info tab */}
          {tab === "basic" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div className="ap-field" style={{ gridColumn:"1/-1" }}>
                  <label className="ap-field-label">Product Name</label>
                  <input className="ap-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. iPhone 16 Pro Max 256GB"/>
                </div>
                <div className="ap-field">
                  <label className="ap-field-label">Base Price (GHS)</label>
                  <input className="ap-input" type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0.00"/>
                </div>
                <div className="ap-field">
                  <label className="ap-field-label">Old / Compare Price</label>
                  <input className="ap-input" type="number" value={form.oldPrice} onChange={e => set("oldPrice", e.target.value)} placeholder="Leave blank if no discount"/>
                </div>
                <div className="ap-field">
                  <label className="ap-field-label">Shop</label>
                  <select className="ap-select" value={form.shop} onChange={e => set("shop", e.target.value)}>
                    {SHOPS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="ap-field">
                  <label className="ap-field-label">Category</label>
                  <input className="ap-input" value={form.category} onChange={e => set("category", e.target.value)} placeholder="e.g. Smartphones"/>
                </div>
                <div className="ap-field" style={{ gridColumn:"1/-1" }}>
                  <label className="ap-field-label">Brand</label>
                  <input className="ap-input" value={form.brand} onChange={e => set("brand", e.target.value)} placeholder="e.g. Apple, Samsung"/>
                </div>
              </div>
              <div className="ap-field">
                <label className="ap-field-label">Description</label>
                <textarea className="ap-textarea" style={{ minHeight:90 }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Product description..."/>
              </div>
            </div>
          )}

          {/* Images tab */}
          {tab === "media" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div className="ap-field">
                <label className="ap-field-label">Image URLs</label>
                <textarea className="ap-textarea" style={{ minHeight:100 }}
                  value={form.images}
                  onChange={e => set("images", e.target.value)}
                  placeholder="Paste comma-separated image URLs&#10;https://res.cloudinary.com/..., https://..."/>
                <div className="ap-field-hint">First URL = main product image. Separate multiple with commas.</div>
              </div>
              {form.images && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:4 }}>
                  {form.images.split(",").map(u=>u.trim()).filter(Boolean).map((url,i) => (
                    <img key={i} src={url} alt="" style={{ width:72, height:72, objectFit:"cover", borderRadius:8, border:"1px solid var(--ap-border2)" }}
                      onError={e => { e.target.style.display="none"; }}/>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Variants tab */}
          {tab === "variants" && (
            <VariantBuilder variants={variants} onChange={setVariants}/>
          )}

          {/* Stock & display tab */}
          {tab === "stock" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div className="ap-field">
                  <label className="ap-field-label">Stock Quantity</label>
                  <input className="ap-input" type="number" value={form.stock} onChange={e => set("stock", e.target.value)} placeholder="e.g. 10"/>
                  <div className="ap-field-hint">Leave blank for unlimited.</div>
                </div>
                <div className="ap-field">
                  <label className="ap-field-label">Homepage Slot</label>
                  <select className="ap-select" value={form.homeSlot} onChange={e => set("homeSlot", e.target.value)}>
                    {["trending","featured","new","bestsellers","others"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:20, flexWrap:"wrap", padding:"14px", background:"rgba(255,255,255,0.02)", borderRadius:9, border:"1px solid var(--ap-border2)" }}>
                <label className="ap-toggle">
                  <input type="checkbox" checked={form.featured} onChange={e => set("featured", e.target.checked)}/>
                  <div className="ap-toggle-track"/>
                  <span className="ap-toggle-label">Featured on homepage</span>
                </label>
                <label className="ap-toggle">
                  <input type="checkbox" checked={form.inStock} onChange={e => set("inStock", e.target.checked)}/>
                  <div className="ap-toggle-track"/>
                  <span className="ap-toggle-label">In Stock</span>
                </label>
              </div>
            </div>
          )}

          {err && <div className="ap-msg ap-msg--err" style={{ marginTop:8 }}>{err}</div>}
        </div>

        <div className="ap-modal-footer">
          <button className="ap-btn ap-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="ap-btn ap-btn--primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : product?.id ? "Save Changes" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Flash Deal Modal ── */
function FlashModal({ product, onClose }) {
  const [deadline, setDeadline] = useState("");
  const [price,    setPrice]    = useState(product?.flashPrice || product?.price || "");
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db,"Products",product.id),{flashDeal:true,flashPrice:Number(price),flashDeadline:deadline?new Date(deadline):null,updatedAt:serverTimestamp()});
      setMsg("Flash deal set."); setTimeout(onClose, 1200);
    } catch(e) { setMsg("Error: "+e.message); }
    finally { setSaving(false); }
  };
  return (
    <div className="ap-modal-backdrop" onClick={onClose}>
      <div className="ap-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:380}}>
        <div className="ap-modal-head"><span className="ap-modal-title">Set Flash Deal</span><button className="ap-modal-close" onClick={onClose}>✕</button></div>
        <div className="ap-modal-body">
          <div style={{fontSize:13,color:"var(--ap-text2)",marginBottom:4}}>{product.name}</div>
          <div className="ap-field"><label className="ap-field-label">Flash Price (GHS)</label><input className="ap-input" type="number" value={price} onChange={e=>setPrice(e.target.value)}/></div>
          <div className="ap-field"><label className="ap-field-label">Deadline</label><input className="ap-input" type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)}/></div>
          {msg && <div className="ap-msg ap-msg--ok">{msg}</div>}
        </div>
        <div className="ap-modal-footer">
          <button className="ap-btn ap-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="ap-btn ap-btn--primary" onClick={save} disabled={saving}>{saving?"Saving...":"Set Deal"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Section ── */
export default function ProductsSection() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [shopFilter,setShopFilter] = useState("all");
  const [modal,    setModal]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState("");
  const [tab,      setTab]      = useState("products");
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"Products"), orderBy("createdAt","desc")));
      setProducts(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch {
      const snap2 = await getDocs(collection(db,"Products")).catch(()=>({docs:[]}));
      setProducts(snap2.docs.map(d => ({ id:d.id, ...d.data() })));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const shops = useMemo(() => ["all",...new Set(products.map(p=>String(p.shop||"").toLowerCase()).filter(Boolean))], [products]);
  const filtered = useMemo(() => {
    let list = shopFilter==="all" ? products : products.filter(p=>String(p.shop||"").toLowerCase()===shopFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(p=>[p.name,p.brand,p.category,p.shop,p.description].join(" ").toLowerCase().includes(q));
    return list;
  }, [products, shopFilter, search]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    setDeleting(id);
    try { await deleteDoc(doc(db,"Products",id)); setProducts(prev=>prev.filter(p=>p.id!==id)); }
    catch(e) { alert("Delete failed: "+e.message); }
    finally { setDeleting(""); }
  };

  const toggleFeatured = async (p) => {
    const next = !p.featured;
    await updateDoc(doc(db,"Products",p.id),{featured:next,updatedAt:serverTimestamp()});
    setProducts(prev=>prev.map(x=>x.id===p.id?{...x,featured:next}:x));
  };

  const handleCSV = async (file) => {
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(",").map(h=>h.trim().toLowerCase());
    let added = 0;
    for (const line of lines.slice(1)) {
      const vals = line.split(",");
      const row = Object.fromEntries(headers.map((h,i)=>[h,(vals[i]||"").trim()]));
      if (!row.name) continue;
      await addDoc(collection(db,"Products"),{name:row.name,price:Number(row.price||0),oldPrice:row.oldprice?Number(row.oldprice):null,shop:row.shop||"main",category:row.category||"",brand:row.brand||"",description:row.description||"",images:row.image?[row.image]:[],image:row.image||"",inStock:row.instock!=="false",featured:row.featured==="true",homeSlot:row.homeslot||"others",variants:[],createdAt:serverTimestamp()});
      added++;
    }
    alert(added+" products imported."); load();
  };

  const inStock=products.filter(p=>p.inStock!==false).length;
  const featured=products.filter(p=>p.featured).length;
  const withVariants=products.filter(p=>p.variants?.length>0).length;

  return (
    <div>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22,gap:14,flexWrap:"wrap"}}>
        <div><div className="ap-page-title">Products</div><div className="ap-page-sub">Add, edit, manage all platform products with variants</div></div>
        <div style={{display:"flex",gap:8}}>
          <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={load}>Refresh</button>
          <button className="ap-btn ap-btn--primary" onClick={()=>{setSelected(null);setModal("add");}}>
            <Ico d={I.add} size={13}/> Add Product
          </button>
        </div>
      </div>

      <div className="ap-stats-grid" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:16}}>
        {[["Total",products.length],["In Stock",inStock],["Featured",featured],["With Options",withVariants]].map(([l,v])=>(
          <div key={l} className="ap-stat" style={{padding:"14px 16px"}}><div className="ap-stat-label">{l}</div><div className="ap-stat-value" style={{fontSize:22}}>{v}</div></div>
        ))}
      </div>

      <div className="ap-filter-tabs" style={{marginBottom:14}}>
        <button className={"ap-filter-tab"+(tab==="products"?" ap-filter-tab--active":"")} onClick={()=>setTab("products")}>Products</button>
        <button className={"ap-filter-tab"+(tab==="csv"?" ap-filter-tab--active":"")} onClick={()=>setTab("csv")}><Ico d={I.csv} size={12}/> CSV Import</button>
      </div>

      {tab==="csv" && (
        <div className="ap-card ap-card--p" style={{maxWidth:500}}>
          <div style={{fontSize:14,fontWeight:700,color:"var(--ap-text)",marginBottom:8}}>Import from CSV</div>
          <div style={{fontSize:13,color:"var(--ap-muted)",marginBottom:14,lineHeight:1.6}}>
            Headers: <code style={{background:"rgba(255,255,255,0.06)",padding:"2px 6px",borderRadius:4,fontSize:12}}>name, price, oldprice, shop, category, brand, description, image, instock, featured, homeslot</code>
          </div>
          <input type="file" accept=".csv" ref={fileRef} style={{display:"none"}} onChange={e=>handleCSV(e.target.files?.[0])}/>
          <button className="ap-btn ap-btn--secondary" onClick={()=>fileRef.current?.click()}><Ico d={I.csv} size={13}/> Choose CSV File</button>
        </div>
      )}

      {tab==="products" && (
        <>
          <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
            <div className="ap-search" style={{maxWidth:320}}>
              <span className="ap-search-icon"><Ico d={I.search} size={13}/></span>
              <input className="ap-input" placeholder="Search name, brand, shop…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="ap-filter-tabs">
              {shops.map(s=>(
                <button key={s} className={"ap-filter-tab"+(shopFilter===s?" ap-filter-tab--active":"")} onClick={()=>setShopFilter(s)}>
                  {s==="all"?"All Shops":s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead><tr><th>Product</th><th>Shop</th><th>Price</th><th>Options</th><th>Featured</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? [1,2,3,4,5].map(i=><tr key={i}>{[1,2,3,4,5,6,7,8].map(j=><td key={j}><div className="ap-skeleton" style={{height:16,borderRadius:4}}/></td>)}</tr>) :
                filtered.length===0 ? <tr><td colSpan={8}><div className="ap-empty"><div className="ap-empty-title">No products found</div></div></td></tr> :
                filtered.map(p=>(
                  <tr key={p.id}>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        {(p.image||p.images?.[0])
                          ? <img src={p.image||p.images?.[0]} alt="" style={{width:36,height:36,borderRadius:7,objectFit:"cover",flexShrink:0}}/>
                          : <div style={{width:36,height:36,borderRadius:7,background:"rgba(255,255,255,0.06)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><Ico d={I.img} size={14}/></div>}
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:"var(--ap-text)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                          {p.brand && <div style={{fontSize:11,color:"var(--ap-muted)"}}>{p.brand}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="ap-badge ap-badge--gray">{p.shop||"—"}</span></td>
                    <td>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--ap-text)"}}>{fmt(p.price)}</div>
                      {p.oldPrice && <div style={{fontSize:11,color:"var(--ap-muted)",textDecoration:"line-through"}}>{fmt(p.oldPrice)}</div>}
                    </td>
                    <td>
                      {p.variants?.length > 0
                        ? <span className="ap-badge ap-badge--purple">{p.variants.length} option{p.variants.length!==1?"s":""}</span>
                        : <span style={{fontSize:11,color:"var(--ap-muted)"}}>—</span>}
                    </td>
                    <td>
                      <button onClick={()=>toggleFeatured(p)} style={{background:"none",border:"none",cursor:"pointer",color:p.featured?"#fbbf24":"var(--ap-muted)",padding:0}}>
                        <Ico d={I.star} size={16}/>
                      </button>
                    </td>
                    <td>
                      {p.flashDeal ? <span className="ap-badge ap-badge--amber">Flash</span>
                        : p.inStock!==false ? <span className="ap-badge ap-badge--green">In Stock</span>
                        : <span className="ap-badge ap-badge--red">Out</span>}
                    </td>
                    <td><span style={{fontSize:11,color:"var(--ap-muted)"}}>{fmtDate(p.createdAt)}</span></td>
                    <td>
                      <div style={{display:"flex",gap:5}}>
                        <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={()=>{setSelected(p);setModal("edit");}} title="Edit"><Ico d={I.edit} size={13}/></button>
                        <button className="ap-btn ap-btn--secondary ap-btn--sm" onClick={()=>{setSelected(p);setModal("flash");}} title="Flash deal"><Ico d={I.flash} size={13}/></button>
                        <button className="ap-btn ap-btn--danger ap-btn--sm" onClick={()=>handleDelete(p.id)} disabled={deleting===p.id} title="Delete"><Ico d={I.del} size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{fontSize:12,color:"var(--ap-muted)",marginTop:8}}>{filtered.length} product{filtered.length!==1?"s":""} shown</div>
        </>
      )}

      {(modal==="add"||modal==="edit") && (
        <ProductModal
          product={modal==="edit"?selected:null}
          onClose={()=>{setModal(null);setSelected(null);}}
          onSaved={saved=>{
            setProducts(prev=>modal==="edit"?prev.map(p=>p.id===saved.id?saved:p):[saved,...prev]);
          }}
        />
      )}
      {modal==="flash"&&selected && (
        <FlashModal product={selected} onClose={()=>{setModal(null);setSelected(null);load();}}/>
      )}
    </div>
  );
}
