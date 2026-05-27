import { useState, useEffect, useMemo, useRef } from "react";
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  addDoc, serverTimestamp, query, orderBy, where,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";

/* ── helpers ── */
function fmt(n) { return "GHS " + Number(n || 0).toFixed(2); }
function fmtDate(ts) {
  if (!ts) return "—";
  try { const d = ts?.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" }); }
  catch { return "—"; }
}

const SHOPS = ["fashion","main","kente","perfume","tech","electronics","clothing","home","kids","others"];

/* ── icon ── */
function Ico({ d, size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg.trim()} />)}
    </svg>
  );
}

const I = {
  add:    "M12 5v14|M5 12h14",
  edit:   "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7|M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  del:    "M3 6h18|M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6|M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  search: "M21 21l-4.35-4.35|M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0",
  star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  close:  "M18 6L6 18|M6 6l12 12",
  img:    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  csv:    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M16 13H8|M16 17H8|M10 9H8",
  flash:  "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
};

/* ── Product Form Modal ── */
function ProductModal({ product, onClose, onSaved }) {
  const { user } = useAuth();
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
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim())  { setErr("Name required."); return; }
    if (!form.price)        { setErr("Price required."); return; }
    setSaving(true); setErr("");
    try {
      const imgs = form.images.split(",").map(s => s.trim()).filter(Boolean);
      const data = {
        name: form.name.trim(), price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        description: form.description.trim(), shop: form.shop,
        category: form.category.trim(), brand: form.brand.trim(),
        stock: form.stock ? Number(form.stock) : null,
        images: imgs, image: imgs[0] || "",
        featured: form.featured, inStock: form.inStock,
        homeSlot: form.homeSlot,
        updatedAt: serverTimestamp(),
      };
      if (product?.id) {
        await updateDoc(doc(db, "Products", product.id), data);
        onSaved({ ...product, ...data, id: product.id });
      } else {
        data.createdAt = serverTimestamp();
        data.createdBy = user?.uid;
        const ref = await addDoc(collection(db, "Products"), data);
        onSaved({ ...data, id: ref.id });
      }
      onClose();
    } catch (e) { setErr(e.message || "Failed."); }
    finally { setSaving(false); }
  };

  const F = ({ label, children, hint }) => (
    <div className="ap-field">
      <label className="ap-field-label">{label}</label>
      {children}
      {hint && <div className="ap-field-hint">{hint}</div>}
    </div>
  );

  return (
    <div className="ap-modal-backdrop" onClick={onClose}>
      <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth:560, maxHeight:"90vh", overflowY:"auto" }}>
        <div className="ap-modal-head">
          <span className="ap-modal-title">{product?.id ? "Edit Product" : "Add Product"}</span>
          <button className="ap-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ap-modal-body">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <F label="Product Name" hint="Full product name"><input className="ap-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. iPhone 16 Pro Max"/></F>
            <F label="Shop">
              <select className="ap-select" value={form.shop} onChange={e => set("shop", e.target.value)}>
                {SHOPS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </F>
            <F label="Price (GHS)"><input className="ap-input" type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0.00"/></F>
            <F label="Old Price (GHS)" hint="Leave blank if no discount"><input className="ap-input" type="number" value={form.oldPrice} onChange={e => set("oldPrice", e.target.value)} placeholder="0.00"/></F>
            <F label="Category"><input className="ap-input" value={form.category} onChange={e => set("category", e.target.value)} placeholder="e.g. Smartphones"/></F>
            <F label="Brand"><input className="ap-input" value={form.brand} onChange={e => set("brand", e.target.value)} placeholder="e.g. Apple"/></F>
            <F label="Stock Quantity"><input className="ap-input" type="number" value={form.stock} onChange={e => set("stock", e.target.value)} placeholder="e.g. 10"/></F>
            <F label="Homepage Slot">
              <select className="ap-select" value={form.homeSlot} onChange={e => set("homeSlot", e.target.value)}>
                {["trending","featured","new","bestsellers","others"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
          </div>
          <F label="Image URLs" hint="Comma-separated. First image is the main product image.">
            <textarea className="ap-textarea" value={form.images} onChange={e => set("images", e.target.value)} placeholder="https://res.cloudinary.com/..., https://..."/>
          </F>
          <F label="Description">
            <textarea className="ap-textarea" style={{ minHeight:80 }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Product description..."/>
          </F>
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            <label className="ap-toggle">
              <input type="checkbox" checked={form.featured} onChange={e => set("featured", e.target.checked)}/>
              <div className="ap-toggle-track"/>
              <span className="ap-toggle-label">Featured</span>
            </label>
            <label className="ap-toggle">
              <input type="checkbox" checked={form.inStock} onChange={e => set("inStock", e.target.checked)}/>
              <div className="ap-toggle-track"/>
              <span className="ap-toggle-label">In Stock</span>
            </label>
          </div>
          {err && <div className="ap-msg ap-msg--err">{err}</div>}
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
      await updateDoc(doc(db, "Products", product.id), {
        flashDeal: true, flashPrice: Number(price),
        flashDeadline: deadline ? new Date(deadline) : null,
        updatedAt: serverTimestamp(),
      });
      setMsg("Flash deal set.");
      setTimeout(onClose, 1200);
    } catch (e) { setMsg("Error: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="ap-modal-backdrop" onClick={onClose}>
      <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth:400 }}>
        <div className="ap-modal-head">
          <span className="ap-modal-title">Set Flash Deal</span>
          <button className="ap-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ap-modal-body">
          <div style={{ fontSize:13, color:"var(--ap-text2)", marginBottom:4 }}>{product.name}</div>
          <div className="ap-field"><label className="ap-field-label">Flash Price (GHS)</label><input className="ap-input" type="number" value={price} onChange={e => setPrice(e.target.value)}/></div>
          <div className="ap-field"><label className="ap-field-label">Deadline</label><input className="ap-input" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}/></div>
          {msg && <div className="ap-msg ap-msg--ok">{msg}</div>}
        </div>
        <div className="ap-modal-footer">
          <button className="ap-btn ap-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="ap-btn ap-btn--primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Set Deal"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Products Section ── */
export default function ProductsSection() {
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [shopFilter,setShopFilter]= useState("all");
  const [modal,     setModal]     = useState(null); // null | "add" | "edit" | "flash"
  const [selected,  setSelected]  = useState(null);
  const [deleting,  setDeleting]  = useState("");
  const [tab,       setTab]       = useState("products"); // "products" | "csv"
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "Products"), orderBy("createdAt", "desc")));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      try {
        const snap2 = await getDocs(collection(db, "Products"));
        setProducts(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e2) { console.error(e2); }
    }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const shops = useMemo(() => ["all", ...new Set(products.map(p => String(p.shop || "").toLowerCase()).filter(Boolean))], [products]);

  const filtered = useMemo(() => {
    let list = shopFilter === "all" ? products : products.filter(p => String(p.shop || "").toLowerCase() === shopFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(p => [p.name, p.brand, p.category, p.shop, p.description].join(" ").toLowerCase().includes(q));
    return list;
  }, [products, shopFilter, search]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    setDeleting(id);
    try { await deleteDoc(doc(db, "Products", id)); setProducts(prev => prev.filter(p => p.id !== id)); }
    catch (e) { alert("Delete failed: " + e.message); }
    finally { setDeleting(""); }
  };

  const toggleFeatured = async (p) => {
    const next = !p.featured;
    await updateDoc(doc(db, "Products", p.id), { featured: next, updatedAt: serverTimestamp() });
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, featured: next } : x));
  };

  /* CSV import */
  const handleCSV = async (file) => {
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    let added = 0;
    for (const line of lines.slice(1)) {
      const vals = line.split(",");
      const row = Object.fromEntries(headers.map((h, i) => [h, (vals[i] || "").trim()]));
      if (!row.name) continue;
      await addDoc(collection(db, "Products"), {
        name: row.name, price: Number(row.price || 0),
        oldPrice: row.oldprice ? Number(row.oldprice) : null,
        shop: row.shop || "main", category: row.category || "",
        brand: row.brand || "", description: row.description || "",
        images: row.image ? [row.image] : [], image: row.image || "",
        inStock: row.instock !== "false", featured: row.featured === "true",
        homeSlot: row.homeslot || "others", createdAt: serverTimestamp(),
      });
      added++;
    }
    alert(added + " products imported.");
    load();
  };

  const inStock    = products.filter(p => p.inStock !== false).length;
  const featured   = products.filter(p => p.featured).length;
  const flashDeals = products.filter(p => p.flashDeal === true).length;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22, gap:14, flexWrap:"wrap" }}>
        <div>
          <div className="ap-page-title">Products</div>
          <div className="ap-page-sub">Add, edit, manage all platform products</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={load}>↺ Refresh</button>
          <button className="ap-btn ap-btn--primary" onClick={() => { setSelected(null); setModal("add"); }}>
            <Ico d={I.add} size={13}/> Add Product
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="ap-stats-grid" style={{ gridTemplateColumns:"repeat(4,1fr)", marginBottom:16 }}>
        {[["Total Products", products.length],["In Stock", inStock],["Featured", featured],["Flash Deals", flashDeals]].map(([l, v]) => (
          <div key={l} className="ap-stat" style={{ padding:"14px 16px" }}>
            <div className="ap-stat-label">{l}</div>
            <div className="ap-stat-value" style={{ fontSize:22 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="ap-filter-tabs" style={{ marginBottom:14 }}>
        <button className={"ap-filter-tab" + (tab === "products" ? " ap-filter-tab--active" : "")} onClick={() => setTab("products")}>Products</button>
        <button className={"ap-filter-tab" + (tab === "csv"      ? " ap-filter-tab--active" : "")} onClick={() => setTab("csv")}>
          <Ico d={I.csv} size={12}/> CSV Import
        </button>
      </div>

      {/* CSV tab */}
      {tab === "csv" && (
        <div className="ap-card ap-card--p" style={{ maxWidth:500 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"var(--ap-text)", marginBottom:8 }}>Import from CSV</div>
          <div style={{ fontSize:13, color:"var(--ap-muted)", marginBottom:14, lineHeight:1.6 }}>
            CSV headers: <code style={{ background:"rgba(255,255,255,0.06)", padding:"2px 6px", borderRadius:4, fontSize:12 }}>name, price, oldprice, shop, category, brand, description, image, instock, featured, homeslot</code>
          </div>
          <input type="file" accept=".csv" ref={fileRef} style={{ display:"none" }} onChange={e => handleCSV(e.target.files?.[0])}/>
          <button className="ap-btn ap-btn--secondary" onClick={() => fileRef.current?.click()}>
            <Ico d={I.csv} size={13}/> Choose CSV File
          </button>
        </div>
      )}

      {/* Products tab */}
      {tab === "products" && (
        <>
          <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
            <div className="ap-search" style={{ maxWidth:320 }}>
              <span className="ap-search-icon"><Ico d={I.search} size={13}/></span>
              <input className="ap-input" placeholder="Search name, brand, shop…" value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <div className="ap-filter-tabs">
              {shops.map(s => (
                <button key={s} className={"ap-filter-tab" + (shopFilter === s ? " ap-filter-tab--active" : "")} onClick={() => setShopFilter(s)}>
                  {s === "all" ? "All Shops" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Product</th><th>Shop</th><th>Price</th><th>Stock</th>
                  <th>Featured</th><th>Status</th><th>Added</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [1,2,3,4,5].map(i => (
                  <tr key={i}>{[1,2,3,4,5,6,7,8].map(j => <td key={j}><div className="ap-skeleton" style={{ height:16, borderRadius:4 }}/></td>)}</tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={8}><div className="ap-empty"><div className="ap-empty-title">No products found</div></div></td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        {p.image || p.images?.[0]
                          ? <img src={p.image || p.images?.[0]} alt="" style={{ width:36, height:36, borderRadius:7, objectFit:"cover", flexShrink:0 }}/>
                          : <div style={{ width:36, height:36, borderRadius:7, background:"rgba(255,255,255,0.06)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}><Ico d={I.img} size={14}/></div>
                        }
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:"var(--ap-text)", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                          {p.brand && <div style={{ fontSize:11, color:"var(--ap-muted)" }}>{p.brand}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="ap-badge ap-badge--gray">{p.shop || "—"}</span></td>
                    <td>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--ap-text)" }}>{fmt(p.price)}</div>
                      {p.oldPrice && <div style={{ fontSize:11, color:"var(--ap-muted)", textDecoration:"line-through" }}>{fmt(p.oldPrice)}</div>}
                    </td>
                    <td><span style={{ fontSize:12, color:"var(--ap-text2)" }}>{p.stock ?? "—"}</span></td>
                    <td>
                      <button onClick={() => toggleFeatured(p)} style={{ background:"none", border:"none", cursor:"pointer", color: p.featured ? "#fbbf24" : "var(--ap-muted)", padding:0 }}>
                        <Ico d={I.star} size={16}/>
                      </button>
                    </td>
                    <td>
                      {p.flashDeal
                        ? <span className="ap-badge ap-badge--amber">Flash Deal</span>
                        : p.inStock !== false
                          ? <span className="ap-badge ap-badge--green">In Stock</span>
                          : <span className="ap-badge ap-badge--red">Out of Stock</span>}
                    </td>
                    <td><span style={{ fontSize:11, color:"var(--ap-muted)" }}>{fmtDate(p.createdAt)}</span></td>
                    <td>
                      <div style={{ display:"flex", gap:5 }}>
                        <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => { setSelected(p); setModal("edit"); }} title="Edit">
                          <Ico d={I.edit} size={13}/>
                        </button>
                        <button className="ap-btn ap-btn--secondary ap-btn--sm" onClick={() => { setSelected(p); setModal("flash"); }} title="Flash deal">
                          <Ico d={I.flash} size={13}/>
                        </button>
                        <button className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => handleDelete(p.id)} disabled={deleting === p.id} title="Delete">
                          <Ico d={I.del} size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize:12, color:"var(--ap-muted)", marginTop:8 }}>{filtered.length} product{filtered.length !== 1 ? "s" : ""} shown</div>
        </>
      )}

      {(modal === "add" || modal === "edit") && (
        <ProductModal
          product={modal === "edit" ? selected : null}
          onClose={() => { setModal(null); setSelected(null); }}
          onSaved={(saved) => {
            setProducts(prev => modal === "edit"
              ? prev.map(p => p.id === saved.id ? saved : p)
              : [saved, ...prev]);
          }}
        />
      )}
      {modal === "flash" && selected && (
        <FlashModal product={selected} onClose={() => { setModal(null); setSelected(null); load(); }}/>
      )}
    </div>
  );
}
