import { useState, useEffect, useCallback } from "react";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";
import {
  getSellerProducts, addSellerProduct, updateSellerProduct,
  deleteSellerProduct, uploadProductImage,
} from "../../services/storeService";

function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split(" M").map((seg, i) => <path key={i} d={(i === 0 ? "" : "M") + seg} />)}
    </svg>
  );
}

const CATEGORIES = ["Fashion & Clothing", "Sneakers & Footwear", "Jewelry & Accessories", "Perfumes & Cosmetics", "Hair & Beauty", "Food & Bakery", "Phones & Electronics", "Home Products", "Creative Arts", "Digital Products", "Services", "Health & Fitness", "Handmade Goods", "Other"];
const EMPTY_FORM = { name: "", description: "", price: "", comparePrice: "", stock: "", category: "", imageUrl: "", inStock: true, featured: false };

function ProductModal({ product, onSave, onClose, saving }) {
  const [form, setForm] = useState(product ? { ...EMPTY_FORM, ...product, price: product.price || "", stock: product.stock ?? "" } : { ...EMPTY_FORM });
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { storeId } = useSellerAuth();

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(user.uid, file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) { alert("Image upload failed. Try again."); }
    finally { setUploading(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("Product name is required."); return; }
    if (!form.price || Number(form.price) <= 0) { alert("Please enter a valid price."); return; }
    onSave({ ...form, price: Number(form.price), comparePrice: Number(form.comparePrice) || 0, stock: Number(form.stock) || null });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card,#fff)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: "#1A1D3B", letterSpacing: "-0.02em" }}>
            {product ? "Edit Product" : "Add Product"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8FA8", padding: 4 }}>
            <Icon d="M18 6L6 18 M6 6l12 12" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Image */}
          <div className="sd-form-group">
            <label className="sd-label">Product Image</label>
            {form.imageUrl
              ? <div style={{ position: "relative", marginBottom: 8 }}>
                  <img src={form.imageUrl} alt="product" style={{ width: "100%", height: 160, objectFit: "contain", borderRadius: 8, background: "#F8F8F8" }} />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              : <div className="sd-upload-zone" onClick={() => document.getElementById("prod-img").click()}>
                  <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" size={24} color="#8B8FA8" />
                  <div style={{ marginTop: 8, fontSize: 13, color: "#8B8FA8" }}>{uploading ? "Uploading…" : "Click to upload image"}</div>
                </div>
            }
            <input type="file" id="prod-img" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Product Name *</label>
            <input className="sd-input" value={form.name} onChange={upd("name")} placeholder="e.g. Air Force 1 Sneakers" required />
          </div>

          <div className="sd-form-group">
            <label className="sd-label">Description</label>
            <textarea className="sd-textarea sd-input" value={form.description} onChange={upd("description")} placeholder="Describe your product…" rows={3} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="sd-form-group">
              <label className="sd-label">Price (GHS) *</label>
              <input className="sd-input" type="number" min="0" step="0.01" value={form.price} onChange={upd("price")} placeholder="0.00" required />
            </div>
            <div className="sd-form-group">
              <label className="sd-label">Compare at Price</label>
              <input className="sd-input" type="number" min="0" step="0.01" value={form.comparePrice} onChange={upd("comparePrice")} placeholder="0.00" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="sd-form-group">
              <label className="sd-label">Stock Quantity</label>
              <input className="sd-input" type="number" min="0" value={form.stock} onChange={upd("stock")} placeholder="Leave blank for unlimited" />
            </div>
            <div className="sd-form-group">
              <label className="sd-label">Category</label>
              <select className="sd-select sd-input" value={form.category} onChange={upd("category")}>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#1A1D3B", cursor: "pointer" }}>
              <input type="checkbox" checked={form.inStock} onChange={upd("inStock")} />
              In Stock
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#1A1D3B", cursor: "pointer" }}>
              <input type="checkbox" checked={form.featured} onChange={upd("featured")} />
              Featured Product
            </label>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="sd-btn sd-btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="sd-btn sd-btn-primary" disabled={saving} style={{ flex: 2 }}>
              {saving ? "Saving…" : product ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardProducts() {
  const { user }   = useAuth();
  const { storeId, shop, subscriptionPlan, planLimits } = useSellerAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | "add" | product object
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch]     = useState("");

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getSellerProducts(user.uid, storeId);
      setProducts(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user?.uid, storeId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (formData) => {
    if (!user?.uid || !storeId) return;
    setSaving(true);
    try {
      if (modal && modal !== "add") {
        await updateSellerProduct(modal.id, user.uid, formData);
      } else {
        await addSellerProduct(user.uid, storeId, shop?.shopName || "", subscriptionPlan, formData);
      }
      setModal(null);
      await load();
    } catch (err) {
      alert(err.message || "Failed to save product.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (productId) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(productId);
    try {
      await deleteSellerProduct(productId, user.uid);
      setProducts((p) => p.filter((x) => x.id !== productId));
    } catch (err) { alert(err.message); }
    finally { setDeleting(null); }
  };

  const filtered = products.filter((p) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const atLimit  = products.length >= (planLimits?.maxProducts || 25);
  const pct      = Math.min(100, Math.round((products.length / (planLimits?.maxProducts || 25)) * 100));

  return (
    <div>
      {/* Header */}
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Products</div>
          <div className="sd-page-sub">{products.length} / {planLimits?.maxProducts === 99999 ? "∞" : planLimits?.maxProducts} products used</div>
        </div>
        <button
          className="sd-btn sd-btn-primary"
          onClick={() => atLimit ? alert(`You've reached the ${products.length}-product limit on your ${subscriptionPlan} plan. Upgrade to add more.`) : setModal("add")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>

      {/* Plan usage bar */}
      {planLimits?.maxProducts !== 99999 && (
        <div className="sd-panel" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: "#8B8FA8" }}>Product Usage</span>
            <span style={{ fontWeight: 700, color: pct >= 90 ? "#EF4444" : "#1A1D3B" }}>{products.length} / {planLimits?.maxProducts}</span>
          </div>
          <div className="sd-progress-bar">
            <div className={`sd-progress-fill ${pct >= 90 ? "danger" : pct >= 70 ? "warning" : ""}`} style={{ width: `${pct}%` }} />
          </div>
          {atLimit && <div className="sd-info-panel warning" style={{ marginTop: 12, marginBottom: 0 }}><div className="sd-info-text">You've reached your product limit. <strong>Upgrade your plan</strong> to add more products.</div></div>}
        </div>
      )}

      {/* Search */}
      <div className="sd-panel" style={{ padding: "12px 16px", marginBottom: 14 }}>
        <input className="sd-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" style={{ border: "none", padding: 0, fontSize: 14, background: "transparent", outline: "none" }} />
      </div>

      {/* Products table */}
      <div className="sd-panel">
        {loading
          ? <div style={{ padding: 32 }}>
              {[1,2,3].map((i) => <div key={i} className="sd-skeleton" style={{ height: 52, marginBottom: 10, borderRadius: 8 }} />)}
            </div>
          : filtered.length === 0
            ? <div className="sd-empty">
                <div className="sd-empty-icon">📦</div>
                <div className="sd-empty-title">{search ? "No products found" : "No products yet"}</div>
                <div className="sd-empty-text">{search ? "Try a different search term." : "Add your first product to start selling."}</div>
                {!search && <button className="sd-btn sd-btn-primary" onClick={() => setModal("add")}>Add First Product</button>}
              </div>
            : (
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: "#F8F8F8", flexShrink: 0, overflow: "hidden" }}>
                              {p.imageUrl
                                ? <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>
                              }
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                              {p.featured && <span className="sd-badge sd-badge-blue" style={{ fontSize: 10, padding: "1px 6px" }}>Featured</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "#8B8FA8", fontSize: 12 }}>{p.category || "—"}</td>
                        <td style={{ fontWeight: 700 }}>GHS {Number(p.price || 0).toLocaleString()}</td>
                        <td style={{ fontSize: 12 }}>{p.stock != null ? p.stock : "∞"}</td>
                        <td>
                          <span className={`sd-badge ${p.inStock === false ? "sd-badge-red" : "sd-badge-green"}`}>
                            {p.inStock === false ? "Out of Stock" : "In Stock"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="sd-btn sd-btn-ghost sd-btn-sm" onClick={() => setModal(p)}>Edit</button>
                            <button className="sd-btn sd-btn-danger sd-btn-sm" onClick={() => handleDelete(p.id)} disabled={deleting === p.id}>
                              {deleting === p.id ? "…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Modal */}
      {modal !== null && (
        <ProductModal
          product={modal === "add" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

