import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";
import { getSellerProducts, deleteSellerProduct } from "../../services/storeService";

function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split(" M").map((seg, i) => <path key={i} d={(i === 0 ? "" : "M") + seg}/>)}
    </svg>
  );
}

const ICONS = {
  plus:    "M12 5v14 M5 12h14",
  search:  "M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.35-4.35",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:   "M3 6h18 M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12a3 3 0 100-6 3 3 0 000 6",
  box:     "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  filter:  "M22 3H2l8 9.46V19l4 2v-8.54L22 3",
  upgrade: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

const STATUS_FILTER_OPTIONS = ["All", "Active", "Draft", "Out of Stock"];

export default function DashboardProducts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { storeId, shop, subscriptionPlan, planLimits } = useSellerAuth();

  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState(null);
  const [search,    setSearch]    = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // storeId may be null on Spark plan — getSellerProducts queries by sellerId, not shopId
      const data = await getSellerProducts(user.uid, storeId || user.uid);
      setProducts(data);
    } catch (err) {
      console.error("[DashboardProducts] load error:", err);
      setProducts([]);
    } finally { setLoading(false); }
  }, [user?.uid, storeId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (productId, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(productId);
    try {
      await deleteSellerProduct(productId, user.uid);
      setProducts((p) => p.filter((x) => x.id !== productId));
    } catch (err) { alert(err.message); }
    finally { setDeleting(null); }
  };

  const handleAdd = () => {
    const max = planLimits?.maxProducts || 25;
    if (max !== 99999 && products.length >= max) {
      alert(`You've reached the ${products.length}-product limit on your ${subscriptionPlan} plan. Go to Subscription to upgrade.`);
      return;
    }
    navigate("/seller-dashboard/products/new");
  };

  /* Filter */
  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All"
      ? true
      : statusFilter === "Active"     ? (p.status !== "draft" && p.inStock !== false)
      : statusFilter === "Draft"      ? (p.status === "draft")
      : statusFilter === "Out of Stock" ? (p.inStock === false)
      : true;
    return matchSearch && matchStatus;
  });

  const max  = planLimits?.maxProducts || 25;
  const pct  = max === 99999 ? 0 : Math.min(100, Math.round((products.length / max) * 100));
  const atLimit = max !== 99999 && products.length >= max;

  /* Stats */
  const activeCount = products.filter((p) => p.status !== "draft" && p.inStock !== false).length;
  const draftCount  = products.filter((p) => p.status === "draft").length;
  const oosCount    = products.filter((p) => p.inStock === false).length;

  return (
    <div>
      {/* ── Header ── */}
      <div className="sd-page-head">
        <div>
          <div className="sd-page-title">Products</div>
          <div className="sd-page-sub">
            {products.length} / {max === 99999 ? "∞" : max} products ·{" "}
            {activeCount} active · {draftCount} draft
          </div>
        </div>
        <button className="sd-btn sd-btn-primary" onClick={handleAdd}>
          <Icon d={ICONS.plus} size={14}/> Add Product
        </button>
      </div>

      {/* ── Plan usage bar ── */}
      {max !== 99999 && (
        <div className="sd-panel" style={{ marginBottom:14, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7, fontSize:12 }}>
            <span style={{ color:"#8B8FA8", fontWeight:600 }}>Product Usage — {subscriptionPlan?.charAt(0).toUpperCase()+subscriptionPlan?.slice(1)} Plan</span>
            <span style={{ fontWeight:800, color: pct >= 90 ? "#EF4444" : "#1A1D3B" }}>
              {products.length} / {max}
            </span>
          </div>
          <div className="sd-progress-bar">
            <div className={`sd-progress-fill ${pct >= 90 ? "danger" : pct >= 70 ? "warning" : ""}`} style={{ width:`${pct}%` }}/>
          </div>
          {atLimit && (
            <div style={{ marginTop:10, padding:"10px 14px", borderRadius:8, background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", fontSize:12, fontWeight:600, color:"#DC2626", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>Product limit reached.</span>
              <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={() => navigate("/seller-dashboard?tab=subscription")}>
                <Icon d={ICONS.upgrade} size={12}/> Upgrade
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Stats tiles ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
        {[
          { label:"Active",       val: activeCount, color:"#16A34A" },
          { label:"Draft",        val: draftCount,  color:"#9CA3AF" },
          { label:"Out of Stock", val: oosCount,    color:"#EF4444" },
        ].map((s) => (
          <div key={s.label} className="sd-panel" style={{ padding:"12px 14px", cursor:"pointer" }}
            onClick={() => setStatusFilter(s.label)}>
            <div style={{ fontSize:22, fontWeight:900, color:s.color, letterSpacing:"-0.03em" }}>{s.val}</div>
            <div style={{ fontSize:11, fontWeight:700, color:"#8B8FA8", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Search + filter ── */}
      <div className="sd-panel" style={{ padding:"10px 14px", marginBottom:10, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:160 }}>
          <Icon d={ICONS.search} size={15} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            style={{ border:"none", background:"transparent", outline:"none", fontSize:14, fontWeight:500, color:"var(--text,#111)", width:"100%" }}/>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button key={opt} type="button"
              onClick={() => setStatusFilter(opt)}
              style={{ padding:"6px 12px", borderRadius:100, border:`1.5px solid ${statusFilter===opt?"#046EF2":"rgba(0,0,0,0.1)"}`, background: statusFilter===opt?"#046EF2":"transparent", color: statusFilter===opt?"#fff":"var(--text,#111)", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product list ── */}
      <div className="sd-panel">
        {loading ? (
          <div style={{ padding:32 }}>
            {[1,2,3].map((i) => (
              <div key={i} className="sd-skeleton" style={{ height:64, marginBottom:10, borderRadius:10 }}/>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="sd-empty">
            <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
            <div className="sd-empty-title">{search || statusFilter !== "All" ? "No products found" : "No products yet"}</div>
            <div className="sd-empty-text">
              {search
                ? "Try a different search term."
                : statusFilter !== "All"
                  ? `No ${statusFilter.toLowerCase()} products.`
                  : "Add your first product to start selling on Beme Market."}
            </div>
            {!search && statusFilter === "All" && (
              <button className="sd-btn sd-btn-primary" onClick={handleAdd}>
                <Icon d={ICONS.plus} size={14}/> Add First Product
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="sd-table-wrap" style={{ display:"block" }}>
              <table className="sd-table" style={{ minWidth:600 }}>
                <thead>
                  <tr>
                    <th style={{ width:48 }}/>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const imgUrl = (Array.isArray(p.images) ? p.images[0] : null) || p.imageUrl || "";
                    const isDraft = p.status === "draft";
                    const isOos   = p.inStock === false;
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ width:44, height:44, borderRadius:8, overflow:"hidden", background:"#F4F6F8", flexShrink:0 }}>
                            {imgUrl
                              ? <img src={imgUrl} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                              : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📦</div>
                            }
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight:700, fontSize:13, color:"var(--text,#111)", marginBottom:2 }}>{p.name}</div>
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                            {p.featured && <span className="sd-badge sd-badge-blue" style={{ fontSize:9, padding:"1px 6px" }}>Featured</span>}
                            {p.subcategory && <span style={{ fontSize:10, color:"#9CA3AF" }}>{p.subcategory}</span>}
                          </div>
                        </td>
                        <td style={{ color:"#8B8FA8", fontSize:12 }}>{p.category || "—"}</td>
                        <td>
                          <div style={{ fontWeight:800, fontSize:13 }}>GHS {Number(p.price||0).toLocaleString()}</div>
                          {p.comparePrice > p.price && (
                            <div style={{ fontSize:10, color:"#9CA3AF", textDecoration:"line-through" }}>
                              GHS {Number(p.comparePrice).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize:12, color: p.stock === 0 ? "#EF4444" : "var(--text,#111)" }}>
                          {p.stock != null ? p.stock : "∞"}
                        </td>
                        <td>
                          <span className={`sd-badge ${isDraft ? "sd-badge-gray" : isOos ? "sd-badge-red" : "sd-badge-green"}`}>
                            {isDraft ? "Draft" : isOos ? "Out of Stock" : "Active"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:"flex", gap:6 }}>
                            <button className="sd-btn sd-btn-ghost sd-btn-sm"
                              onClick={() => navigate(`/seller-dashboard/products/${p.id}`)}>
                              <Icon d={ICONS.edit} size={13}/> Edit
                            </button>
                            <button className="sd-btn sd-btn-danger sd-btn-sm"
                              onClick={() => handleDelete(p.id, p.name)}
                              disabled={deleting === p.id}>
                              {deleting === p.id
                                ? "…"
                                : <Icon d={ICONS.trash} size={13}/>
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop:8, padding:"0 4px", fontSize:12, color:"#9CA3AF" }}>
        Showing {filtered.length} of {products.length} products
      </div>

      <style>{`
        .sd-badge-gray { background: rgba(156,163,175,0.15); color: #6B7280; }
      `}</style>
    </div>
  );
}