import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import {
  getProductById, addSellerProduct, updateSellerProduct,
} from "../../services/storeService";
import { uploadImageToCloudinary, validateImageFile } from "../../lib/cloudinary";
import { MARKETPLACE_CATEGORIES } from "../../constants/catalog";

/* ─── helpers ──────────────────────────────────────────────── */
function Ico({ d, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      {String(d).split(" M").map((seg, i) => (
        <path key={i} d={(i === 0 ? "" : "M") + seg} />
      ))}
    </svg>
  );
}

const ICONS = {
  back:   "M19 12H5 M12 19l-7-7 7-7",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  close:  "M18 6L6 18 M6 6l12 12",
  drag:   "M5 9l-3 3 3 3 M9 5l3-3 3 3 M15 19l-3 3-3-3 M19 9l3 3-3 3 M2 12h20 M12 2v20",
  check:  "M20 6L9 17 4 12",
  alert:  "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12a3 3 0 100-6 3 3 0 000 6",
  save:   "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z M17 21v-8H7v8 M7 3v5h8",
};

const EMPTY_FORM = {
  name:         "",
  description:  "",
  images:       [],   // Cloudinary URLs
  price:        "",
  comparePrice: "",
  stock:        "",
  sku:          "",
  category:     "",
  subcategory:  "",
  status:       "active",
  inStock:        true,
  featured:       false,
  trackInventory: true,   // false = "no inventory tracking" → may block payout
  lowStockAlert:  "",     // notify when stock falls to this number
  customizations: [],   // [{ id, name, type, required, values: [{id, label, priceBump}] }]
};

/* ─── Customization helpers ─────────────────────────────────── */
function makeOptVal()   { return { id: crypto.randomUUID(), label: "", priceBump: "" }; }
function makeOptGroup() { return { id: crypto.randomUUID(), name: "", type: "buttons", required: true, values: [makeOptVal(), makeOptVal()] }; }

/* ─── Image Upload Zone ─────────────────────────────────────── */
function ImageGrid({ images, onAdd, onRemove, uploading }) {
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    const fileArr = Array.from(files).slice(0, 5 - images.length);
    if (!fileArr.length) return;
    for (const file of fileArr) {
      try {
        validateImageFile(file);
      } catch (e) {
        alert(e.message);
        return;
      }
    }
    onAdd(fileArr);
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:10, marginBottom:10 }}>
        {images.map((url, i) => (
          <div key={url + i} style={{ position:"relative", aspectRatio:"1", borderRadius:10, overflow:"hidden", border:"1.5px solid rgba(0,0,0,0.1)", background:"#f8f8f8" }}>
            <img src={url} alt={`Product ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
            {i === 0 && (
              <span style={{ position:"absolute", top:6, left:6, background:"#046EF2", color:"#fff", fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:100, letterSpacing:"0.04em", textTransform:"uppercase" }}>
                Main
              </span>
            )}
            <button type="button" onClick={() => onRemove(i)}
              style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:24, height:24, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ico d={ICONS.close} size={12}/>
            </button>
          </div>
        ))}

        {images.length < 5 && (
          <button type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            disabled={uploading}
            style={{ aspectRatio:"1", borderRadius:10, border:"2px dashed rgba(4,110,242,0.3)", background:"rgba(4,110,242,0.03)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, cursor:uploading?"wait":"pointer", color:"#046EF2" }}>
            {uploading
              ? <span style={{ fontSize:12, color:"#9CA3AF" }}>Uploading…</span>
              : <>
                  <Ico d={ICONS.upload} size={22}/>
                  <span style={{ fontSize:11, fontWeight:700, color:"#6B7280" }}>Add Photo</span>
                </>
            }
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        multiple style={{ display:"none" }}
        onChange={(e) => handleFiles(e.target.files)}/>

      <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>
        Up to 5 images · JPG, PNG, WEBP · Max 5 MB each. First image is the main product image.
      </p>
    </div>
  );
}

/* ─── Toggle ────────────────────────────────────────────────── */
function Toggle({ checked, onChange, label, sub }) {
  return (
    <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, cursor:"pointer" }}>
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:"var(--text,#111)" }}>{label}</div>
        {sub && <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{sub}</div>}
      </div>
      <div
        onClick={onChange}
        style={{
          width:44, height:24, borderRadius:12, flexShrink:0,
          background: checked ? "#046EF2" : "#D1D5DB",
          position:"relative", transition:"background 0.2s",
        }}>
        <div style={{
          position:"absolute", top:2, left: checked ? 22 : 2,
          width:20, height:20, borderRadius:"50%", background:"#fff",
          transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.18)",
        }}/>
      </div>
    </label>
  );
}

/* ─── Plan Limit Banner ─────────────────────────────────────── */
function PlanLimitBanner({ current, max, plan, onUpgrade }) {
  if (max === 99999) return null;
  const pct = Math.min(100, Math.round((current / max) * 100));
  const atLimit = current >= max;
  return (
    <div style={{ background: atLimit ? "rgba(239,68,68,0.07)" : "rgba(4,110,242,0.06)", border:`1px solid ${atLimit?"rgba(239,68,68,0.2)":"rgba(4,110,242,0.15)"}`, borderRadius:10, padding:"12px 16px", marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13, fontWeight:700, color: atLimit ? "#DC2626" : "#046EF2" }}>
        <span>Product Limit — {plan?.charAt(0).toUpperCase()+plan?.slice(1)} Plan</span>
        <span>{current} / {max}</span>
      </div>
      <div style={{ height:5, background:"rgba(0,0,0,0.07)", borderRadius:10, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background: pct >= 90 ? "#EF4444" : "#046EF2", borderRadius:10, transition:"width 0.5s" }}/>
      </div>
      {atLimit && (
        <div style={{ marginTop:8, fontSize:12, color:"#DC2626" }}>
          You've reached your product limit.{" "}
          <button type="button" onClick={onUpgrade} style={{ background:"none", border:"none", color:"#DC2626", fontWeight:800, cursor:"pointer", textDecoration:"underline", padding:0 }}>
            Upgrade your plan →
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function DashboardProductDetail() {
  const navigate  = useNavigate();
  const { productId } = useParams(); // undefined = new product
  const isNew     = !productId;

  const { user }                                     = useAuth();
  const { storeId, shop, subscriptionPlan, planLimits } = useSellerAuth();

  const [form,         setForm]         = useState({ ...EMPTY_FORM });
  const [allProducts,  setAllProducts]  = useState([]);
  const [loading,      setLoading]      = useState(!isNew);
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState("");

  /* Fetch existing product for edit */
  useEffect(() => {
    if (isNew) return;
    const run = async () => {
      setLoading(true);
      try {
        const p = await getProductById(productId);
        if (p && p.sellerId === user?.uid) {
          const images = Array.isArray(p.images) && p.images.length
            ? p.images
            : p.imageUrl ? [p.imageUrl] : [];
          setForm({
            name:         p.name        || "",
            description:  p.description || "",
            images,
            price:        p.price       != null ? String(p.price) : "",
            comparePrice: p.comparePrice!= null ? String(p.comparePrice) : "",
            stock:        p.stock       != null ? String(p.stock) : "",
            trackInventory: p.trackInventory !== false,
            lowStockAlert:  p.lowStockAlert != null ? String(p.lowStockAlert) : "",
            customizations: Array.isArray(p.customizations)
              ? p.customizations.map((g, gi) => ({
                  id: g.id || `g-${gi}`,
                  name: String(g.name || ""),
                  type: g.type === "select" ? "select" : "buttons",
                  required: g.required !== false,
                  values: Array.isArray(g.values)
                    ? g.values.map((v, vi) => ({
                        id: v.id || `v-${gi}-${vi}`,
                        label: String(v.label || ""),
                        priceBump: v.priceBump != null ? String(v.priceBump) : "",
                      }))
                    : [makeOptVal(), makeOptVal()],
                }))
              : [],
            sku:          p.sku         || "",
            category:     p.category    || "",
            subcategory:  p.subcategory || "",
            status:       p.status      || "active",
            inStock:      p.inStock !== false,
            featured:     !!p.featured,
          });
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    run();
  }, [productId, isNew, user?.uid]);

  /* Count existing products for plan limit check */
  useEffect(() => {
    if (!user?.uid || !isNew) return;
    getDocs(query(collection(db, "Products"), where("sellerId", "==", user.uid)))
      .then((snap) => setAllProducts(snap.docs.map((d) => ({ id: d.id }))))
      .catch(() => {});
  }, [user?.uid, isNew]);

  /* Selected category object */
  const selectedCatObj = MARKETPLACE_CATEGORIES.find((c) => c.label === form.category);

  const upd = (k) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
    setError("");
  };

  /* Image handling */
  const handleAddImages = async (files) => {
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const result = await uploadImageToCloudinary(file);
        urls.push(result.url);
      }
      setForm((f) => ({ ...f, images: [...f.images, ...urls].slice(0, 5) }));
    } catch (e) { setError(e.message || "Image upload failed."); }
    finally { setUploading(false); }
  };

  const handleRemoveImage = (idx) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  /* Validation */
  const validate = () => {
    if (!form.name.trim())               { setError("Product title is required.");       return false; }
    if (!form.price || Number(form.price) <= 0) { setError("Please enter a valid price."); return false; }
    if (!form.category)                  { setError("Please select a category.");         return false; }
    if (form.images.length === 0)        { setError("Please add at least one product image."); return false; }
    return true;
  };

  /* Save */
  const handleSave = async () => {
    if (!validate()) return;
    if (!user?.uid) { setError("You must be logged in to save a product."); return; }

    // storeId may be null when Cloud Functions haven't run yet (Spark plan).
    // Fall back to user.uid as the shop identifier.
    const effectiveStoreId  = storeId  || user.uid;
    const effectiveShopName = shop?.shopName || "";
    const effectivePlan     = subscriptionPlan || "basic";

    setSaving(true);
    setError("");
    try {
      const payload = {
        name:         form.name.trim(),
        description:  form.description.trim(),
        images:       form.images,
        imageUrl:     form.images[0] || "",
        price:        Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : 0,
        stock:        form.stock !== "" ? Number(form.stock) : null,
        customizations: form.customizations
          .map(g => ({
            id: g.id,
            name: String(g.name).trim(),
            type: g.type === "select" ? "select" : "buttons",
            required: !!g.required,
            values: (g.values || [])
              .map(v => ({
                id: v.id,
                label: String(v.label).trim(),
                priceBump: v.priceBump !== "" && !isNaN(Number(v.priceBump)) ? Number(v.priceBump) : 0,
              }))
              .filter(v => v.label),
          }))
          .filter(g => g.name && g.values.length > 0),
        sku:          form.sku.trim(),
        category:     form.category,
        subcategory:  form.subcategory,
        status:       form.status,
        inStock:        form.inStock,
        trackInventory: form.trackInventory,
        lowStockAlert:  form.trackInventory && form.lowStockAlert !== "" ? Number(form.lowStockAlert) : null,
        featured:     form.featured,
      };

      if (isNew) {
        await addSellerProduct(user.uid, effectiveStoreId, effectiveShopName, effectivePlan, payload);
      } else {
        await updateSellerProduct(productId, user.uid, payload);
      }

      setSaved(true);
      setTimeout(() => {
        navigate("/seller-dashboard?tab=products");
      }, 800);
    } catch (e) {
      setError(e.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const atLimit = isNew && allProducts.length >= (planLimits?.maxProducts || 25);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg,#F4F6F8)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:14, color:"#9CA3AF" }}>Loading product…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg,#F4F6F8)", fontFamily:"var(--font-main,'Nunito',system-ui,sans-serif)" }}>

      {/* ── Top bar ── */}
      <div style={{ background:"var(--card,#fff)", borderBottom:"1px solid rgba(0,0,0,0.08)", padding:"0 20px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <button type="button" onClick={() => navigate("/seller-dashboard?tab=products")}
          style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", color:"var(--text,#111)", fontSize:14, fontWeight:700, padding:"8px 0" }}>
          <Ico d={ICONS.back} size={17}/>
          Products
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:600, color: form.status==="active" ? "#16A34A" : "#6B7280" }}>
            {form.status === "active" ? "Active" : "Draft"}
          </span>
          <button type="button" onClick={() => navigate("/seller-dashboard?tab=products")}
            style={{ padding:"8px 16px", borderRadius:8, border:"1.5px solid rgba(0,0,0,0.12)", background:"transparent", fontSize:13, fontWeight:700, cursor:"pointer", color:"var(--text,#111)" }}>
            Discard
          </button>
          <button type="button" onClick={handleSave} disabled={saving || atLimit}
            style={{ padding:"8px 20px", borderRadius:8, border:"none", background: saved ? "#16A34A" : "#046EF2", color:"#fff", fontSize:13, fontWeight:800, cursor: saving||atLimit ? "not-allowed" : "pointer", opacity: saving||atLimit ? 0.6 : 1, display:"flex", alignItems:"center", gap:6 }}>
            {saved ? <><Ico d={ICONS.check} size={14}/>Saved!</> : saving ? "Saving…" : <><Ico d={ICONS.save} size={14}/>{isNew?"Add Product":"Save Changes"}</>}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 16px 80px" }}>

        {/* Page title */}
        <h1 style={{ fontSize:22, fontWeight:900, color:"var(--text,#111)", letterSpacing:"-0.03em", margin:"0 0 20px" }}>
          {isNew ? "Add Product" : "Edit Product"}
        </h1>

        {/* Error */}
        {error && (
          <div style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10, fontSize:13, fontWeight:600, color:"#DC2626" }}>
            <Ico d={ICONS.alert} size={16}/>
            {error}
          </div>
        )}

        {/* Plan limit banner (new products only) */}
        {isNew && (
          <PlanLimitBanner
            current={allProducts.length}
            max={planLimits?.maxProducts || 25}
            plan={subscriptionPlan}
            onUpgrade={() => navigate("/seller-dashboard?tab=subscription")}
          />
        )}

        {/* Two-column layout */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16, alignItems:"start" }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Title & Description */}
            <div style={{ background:"var(--card,#fff)", borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", padding:"20px 20px 16px" }}>
              <div className="sd-form-group">
                <label className="sd-label">Product Title *</label>
                <input className="sd-input" type="text"
                  value={form.name} onChange={upd("name")}
                  placeholder="e.g. Ankara Mini Dress — Red Print"
                  maxLength={120}/>
              </div>
              <div className="sd-form-group" style={{ marginBottom:0 }}>
                <label className="sd-label">Description</label>
                <textarea className="sd-input sd-textarea"
                  value={form.description} onChange={upd("description")}
                  placeholder="Describe your product — materials, sizing, what makes it special…"
                  rows={5} style={{ resize:"vertical" }}/>
              </div>
            </div>

            {/* Media */}
            <div style={{ background:"var(--card,#fff)", borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", padding:"20px 20px 16px" }}>
              <div style={{ fontWeight:800, fontSize:15, color:"var(--text,#111)", marginBottom:14 }}>Product Images</div>
              <ImageGrid
                images={form.images}
                onAdd={handleAddImages}
                onRemove={handleRemoveImage}
                uploading={uploading}
              />
            </div>

            {/* Pricing */}
            <div style={{ background:"var(--card,#fff)", borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", padding:"20px 20px 16px" }}>
              <div style={{ fontWeight:800, fontSize:15, color:"var(--text,#111)", marginBottom:14 }}>Pricing</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div className="sd-form-group" style={{ marginBottom:0 }}>
                  <label className="sd-label">Price (GHS) *</label>
                  <input className="sd-input" type="number" min="0" step="0.01"
                    value={form.price} onChange={upd("price")} placeholder="0.00"/>
                </div>
                <div className="sd-form-group" style={{ marginBottom:0 }}>
                  <label className="sd-label">Compare-at Price (GHS)</label>
                  <input className="sd-input" type="number" min="0" step="0.01"
                    value={form.comparePrice} onChange={upd("comparePrice")} placeholder="0.00"/>
                  <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4 }}>Shows as crossed-out original price</div>
                </div>
              </div>
              {form.comparePrice && Number(form.comparePrice) > Number(form.price) && (
                <div style={{ marginTop:10, fontSize:12, color:"#16A34A", fontWeight:600 }}>
                  Discount: GHS {(Number(form.comparePrice) - Number(form.price)).toFixed(2)} ({Math.round(((Number(form.comparePrice)-Number(form.price))/Number(form.comparePrice))*100)}% off)
                </div>
              )}
            </div>

            {/* Inventory */}
            <div style={{ background:"var(--card,#fff)", borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", padding:"20px 20px 16px" }}>
              <div style={{ fontWeight:800, fontSize:15, color:"var(--text,#111)", marginBottom:14 }}>Inventory</div>

              {/* Track inventory toggle */}
              <Toggle
                checked={form.trackInventory}
                onChange={() => setForm(f => ({ ...f, trackInventory: !f.trackInventory }))}
                label="Track inventory"
                sub="Turn off only if you have unlimited or untracked stock"
              />

              {/* Payout warning when not tracking */}
              {!form.trackInventory && (
                <div style={{ margin:"12px 0", padding:"12px 14px", borderRadius:10,
                  background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:"#EF4444", marginBottom:3 }}>
                    ⚠ Payouts may be held
                  </div>
                  <div style={{ fontSize:12, color:"#6B7280", lineHeight:1.5 }}>
                    Sellers with no inventory tracking may have payouts held until stock is confirmed with Beme Market support.
                  </div>
                </div>
              )}

              {/* Stock quantity — only shown when tracking */}
              {form.trackInventory && (
                <div style={{ marginTop:14, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div className="sd-form-group" style={{ marginBottom:0 }}>
                    <label className="sd-label">Stock Quantity *</label>
                    <input className="sd-input" type="number" min="0"
                      value={form.stock} onChange={upd("stock")} placeholder="e.g. 12"/>
                    <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4 }}>
                      How many units do you have available?
                    </div>
                  </div>
                  <div className="sd-form-group" style={{ marginBottom:0 }}>
                    <label className="sd-label">Low Stock Alert</label>
                    <input className="sd-input" type="number" min="0"
                      value={form.lowStockAlert}
                      onChange={upd("lowStockAlert")} placeholder="e.g. 3"/>
                    <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4 }}>
                      Alert when stock falls to this level
                    </div>
                  </div>
                </div>
              )}

              {/* SKU + In Stock row */}
              <div style={{ marginTop:14, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div className="sd-form-group" style={{ marginBottom:0 }}>
                  <label className="sd-label">SKU (optional)</label>
                  <input className="sd-input" type="text"
                    value={form.sku} onChange={upd("sku")} placeholder="e.g. BM-DR-001"/>
                </div>
                <div style={{ paddingTop:20 }}>
                  <Toggle
                    checked={form.inStock}
                    onChange={() => setForm(f => ({ ...f, inStock: !f.inStock }))}
                    label="In Stock"
                    sub="Visible & buyable in marketplace"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN (sidebar) ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Status */}
            <div style={{ background:"var(--card,#fff)", borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", padding:"16px" }}>
              <div style={{ fontWeight:800, fontSize:14, color:"var(--text,#111)", marginBottom:12 }}>Status</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {["active", "draft"].map((s) => (
                  <label key={s} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"10px 12px", borderRadius:8, border:`1.5px solid ${form.status===s?"#046EF2":"rgba(0,0,0,0.08)"}`, background: form.status===s ? "rgba(4,110,242,0.05)" : "transparent" }}>
                    <input type="radio" name="status" value={s} checked={form.status===s}
                      onChange={() => setForm((f) => ({ ...f, status: s }))} style={{ accentColor:"#046EF2" }}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color: form.status===s ? "#046EF2" : "var(--text,#111)" }}>
                        {s === "active" ? "Active" : "Draft"}
                      </div>
                      <div style={{ fontSize:11, color:"#9CA3AF" }}>
                        {s === "active" ? "Visible to buyers in the marketplace" : "Hidden — not visible to buyers"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Category */}
            <div style={{ background:"var(--card,#fff)", borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", padding:"16px" }}>
              <div style={{ fontWeight:800, fontSize:14, color:"var(--text,#111)", marginBottom:12 }}>
                Category *
              </div>
              <div className="sd-form-group" style={{ marginBottom: selectedCatObj?.subcategories?.length ? 12 : 0 }}>
                <label className="sd-label">Main Category</label>
                <select className="sd-input sd-select"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subcategory: "" }))}>
                  <option value="">Select a category</option>
                  {MARKETPLACE_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.label}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>
              {selectedCatObj?.subcategories?.length > 0 && (
                <div className="sd-form-group" style={{ marginBottom:0 }}>
                  <label className="sd-label">Subcategory (optional)</label>
                  <select className="sd-input sd-select"
                    value={form.subcategory}
                    onChange={upd("subcategory")}>
                    <option value="">Select subcategory</option>
                    {selectedCatObj.subcategories.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              {form.category && (
                <div style={{ marginTop:10, fontSize:11, color:"#046EF2", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                  <Ico d={ICONS.check} size={12}/>
                  {form.category}{form.subcategory ? ` › ${form.subcategory}` : ""}
                </div>
              )}
            </div>

            {/* ── Product Options / Customizations ── */}
            <div style={{ background:"var(--card,#fff)", borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", padding:"20px 20px 16px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:"var(--text,#111)" }}>Product Options</div>
                  <div style={{ fontSize:12, color:"var(--muted,#9CA3AF)", marginTop:2 }}>
                    Add size, color, storage, or any variant customers choose at checkout
                  </div>
                </div>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, customizations: [...f.customizations, makeOptGroup()] }))}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:9,
                    border:"1.5px solid #046EF2", background:"rgba(4,110,242,0.06)",
                    color:"#046EF2", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
                    flexShrink:0 }}>
                  + Add Option
                </button>
              </div>

              {form.customizations.length === 0 ? (
                <div style={{ textAlign:"center", padding:"22px 0", borderTop:"1px solid rgba(0,0,0,0.06)", marginTop:14 }}>
                  <div style={{ fontSize:13, color:"var(--muted,#9CA3AF)", fontWeight:600, marginBottom:4 }}>No options yet</div>
                  <div style={{ fontSize:12, color:"var(--muted,#9CA3AF)" }}>
                    e.g. Size: S, M, L · Color: Red, Blue · Storage: 128GB (+GHS 200)
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:14, marginTop:16 }}>
                  {form.customizations.map((group, gi) => (
                    <div key={group.id} style={{ border:"1px solid rgba(0,0,0,0.08)", borderRadius:10, padding:"14px 14px 10px" }}>
                      {/* Group header */}
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                        <div style={{ flex:1 }}>
                          <label className="sd-label" style={{ marginBottom:5 }}>Option Name</label>
                          <input className="sd-input"
                            value={group.name}
                            onChange={e => setForm(f => ({
                              ...f,
                              customizations: f.customizations.map((g,i) => i===gi ? { ...g, name:e.target.value } : g)
                            }))}
                            placeholder="e.g. Size, Color, Storage"
                          />
                        </div>
                        <div style={{ width:110, flexShrink:0 }}>
                          <label className="sd-label" style={{ marginBottom:5 }}>Type</label>
                          <select className="sd-input sd-select"
                            value={group.type}
                            onChange={e => setForm(f => ({
                              ...f,
                              customizations: f.customizations.map((g,i) => i===gi ? { ...g, type:e.target.value } : g)
                            }))}>
                            <option value="buttons">Buttons</option>
                            <option value="select">Dropdown</option>
                          </select>
                        </div>
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, customizations: f.customizations.filter((_,i) => i!==gi) }))}
                          style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(239,68,68,0.25)",
                            background:"rgba(239,68,68,0.06)", cursor:"pointer", display:"flex",
                            alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:16 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                          </svg>
                        </button>
                      </div>

                      {/* Option values */}
                      <label className="sd-label" style={{ marginBottom:8 }}>Values</label>
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {group.values.map((val, vi) => (
                          <div key={val.id} style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <input className="sd-input" style={{ flex:2 }}
                              value={val.label}
                              onChange={e => setForm(f => ({
                                ...f,
                                customizations: f.customizations.map((g,gi2) => gi2!==gi ? g : {
                                  ...g,
                                  values: g.values.map((v,vi2) => vi2===vi ? { ...v, label:e.target.value } : v)
                                })
                              }))}
                              placeholder={gi===0 && vi===0 ? "e.g. Small" : gi===0 && vi===1 ? "e.g. Medium" : "Value"}
                            />
                            <div style={{ position:"relative", flex:1 }}>
                              <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
                                fontSize:12, fontWeight:700, color:"#9CA3AF", pointerEvents:"none" }}>
                                ±GHS
                              </span>
                              <input className="sd-input" style={{ paddingLeft:46 }}
                                value={val.priceBump}
                                type="number"
                                onChange={e => setForm(f => ({
                                  ...f,
                                  customizations: f.customizations.map((g,gi2) => gi2!==gi ? g : {
                                    ...g,
                                    values: g.values.map((v,vi2) => vi2===vi ? { ...v, priceBump:e.target.value } : v)
                                  })
                                }))}
                                placeholder="0"
                              />
                            </div>
                            <button type="button"
                              disabled={group.values.length <= 1}
                              onClick={() => setForm(f => ({
                                ...f,
                                customizations: f.customizations.map((g,gi2) => gi2!==gi ? g : {
                                  ...g,
                                  values: g.values.filter((_,vi2) => vi2!==vi)
                                })
                              }))}
                              style={{ width:28, height:28, borderRadius:7, border:"1px solid rgba(0,0,0,0.1)",
                                background:"transparent", cursor: group.values.length<=1 ? "not-allowed" : "pointer",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                opacity: group.values.length<=1 ? 0.3 : 1, flexShrink:0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M18 6L6 18M6 6l12 12"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add value */}
                      <button type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          customizations: f.customizations.map((g,gi2) => gi2!==gi ? g : {
                            ...g, values: [...g.values, makeOptVal()]
                          })
                        }))}
                        style={{ marginTop:10, display:"flex", alignItems:"center", gap:5,
                          fontSize:12, fontWeight:700, color:"#046EF2", background:"none",
                          border:"none", cursor:"pointer", padding:"4px 0", fontFamily:"inherit" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Add value
                      </button>

                      {/* Required toggle */}
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, paddingTop:10, borderTop:"1px solid rgba(0,0,0,0.05)" }}>
                        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                          <input type="checkbox" checked={group.required}
                            onChange={e => setForm(f => ({
                              ...f,
                              customizations: f.customizations.map((g,gi2) => gi2!==gi ? g : { ...g, required:e.target.checked })
                            }))}
                            style={{ accentColor:"#046EF2", width:14, height:14 }}/>
                          <span style={{ fontSize:12, fontWeight:700, color:"var(--muted,#6B7280)" }}>
                            Required — customer must choose before checkout
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility */}
            <div style={{ background:"var(--card,#fff)", borderRadius:14, border:"1px solid rgba(0,0,0,0.08)", padding:"16px" }}>
              <div style={{ fontWeight:800, fontSize:14, color:"var(--text,#111)", marginBottom:14 }}>Visibility</div>
              <Toggle
                checked={form.featured}
                onChange={() => setForm((f) => ({ ...f, featured: !f.featured }))}
                label="Featured Product"
                sub="Highlighted on your store and marketplace"
              />
            </div>

            {/* Store info */}
            {shop && (
              <div style={{ background:"rgba(4,110,242,0.04)", borderRadius:14, border:"1px solid rgba(4,110,242,0.15)", padding:"14px 16px" }}>
                <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.07em", color:"#046EF2", marginBottom:8 }}>Store</div>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--text,#111)" }}>{shop.shopName}</div>
                <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>
                  {subscriptionPlan?.charAt(0).toUpperCase() + subscriptionPlan?.slice(1)} Plan ·{" "}
                  {planLimits?.maxProducts === 99999 ? "Unlimited" : `${planLimits?.maxProducts} max`} products
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Bottom save bar (mobile) */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--card,#fff)", borderTop:"1px solid rgba(0,0,0,0.08)", padding:"12px 16px", display:"flex", gap:10, zIndex:50 }}
          className="dpd-mobile-bar">
          <button type="button" onClick={() => navigate("/seller-dashboard?tab=products")}
            style={{ flex:1, padding:"12px", borderRadius:10, border:"1.5px solid rgba(0,0,0,0.12)", background:"transparent", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            Discard
          </button>
          <button type="button" onClick={handleSave} disabled={saving || atLimit}
            style={{ flex:2, padding:"12px", borderRadius:10, border:"none", background: saved ? "#16A34A" : "#046EF2", color:"#fff", fontSize:14, fontWeight:800, cursor: saving||atLimit ? "not-allowed" : "pointer", opacity: saving||atLimit ? 0.6 : 1 }}>
            {saved ? "Saved!" : saving ? "Saving…" : isNew ? "Add Product" : "Save Changes"}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dpd-mobile-bar { display: flex !important; }
        }
        @media (min-width: 769px) {
          .dpd-mobile-bar { display: none !important; }
        }
        /* Responsive two-column */
        @media (max-width: 860px) {
          [style*="grid-template-columns: 1fr 320px"] {
            grid-template-columns: 1fr !important;
          }
        }
        .sd-form-group { margin-bottom: 14px; }
        .sd-label { display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 7px; }
        .sd-input { width: 100%; padding: 11px 14px; border-radius: 8px; border: 1.5px solid rgba(0,0,0,0.1); background: var(--bg,#F9FAFB); color: var(--text,#111); font-size: 14px; font-weight: 600; font-family: inherit; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
        .sd-input:focus { border-color: #046EF2; box-shadow: 0 0 0 3px rgba(4,110,242,0.1); }
        .sd-textarea { resize: vertical; min-height: 100px; line-height: 1.6; }
        .sd-select { appearance: none; cursor: pointer; }
      `}</style>
    </div>
  );
}