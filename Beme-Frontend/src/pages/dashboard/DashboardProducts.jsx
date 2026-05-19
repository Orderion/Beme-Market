import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";
import { getSellerProducts, deleteSellerProduct } from "../../services/storeService";

function Ico({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  plus:   "M12 5v14|M5 12h14",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16z|M21 21l-4.35-4.35",
  edit:   "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7|M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:  "M3 6h18|M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z|M12 12a3 3 0 100-6 3 3 0 000 6",
  eyeoff: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94|M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19|M1 1l22 22",
  box:    "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  check:  "M20 6L9 17l-5-5",
  img:    "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14l4-4 3 3 3-3 4 4z",
  tag:    "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z|M7 7h.01",
};

const STATUS_OPTS = ["All", "Active", "Draft", "Out of Stock"];
const STATUS_COLOR = { active:"#22C55E", draft:"#9CA3AF", "out of stock":"#EF4444" };
const STATUS_BG    = { active:"rgba(34,197,94,0.1)", draft:"rgba(0,0,0,0.06)", "out of stock":"rgba(239,68,68,0.1)" };

function fmtMoney(n) {
  return `GHS ${Number(n||0).toLocaleString("en-GH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

function Confirm({ name, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#fff", borderRadius:18, padding:"28px 24px",
        maxWidth:340, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width:48, height:48, borderRadius:12, background:"rgba(239,68,68,0.08)",
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
          <Ico d={IC.trash} size={22} color="#EF4444"/>
        </div>
        <div style={{ fontSize:17, fontWeight:900, color:"#111", textAlign:"center", marginBottom:8 }}>
          Delete Product?
        </div>
        <div style={{ fontSize:13, color:"#6B7280", textAlign:"center", lineHeight:1.5, marginBottom:22 }}>
          "<strong>{name}</strong>" will be permanently removed. This cannot be undone.
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button type="button" onClick={onCancel}
            style={{ flex:1, height:44, borderRadius:10, border:"1.5px solid rgba(0,0,0,0.1)",
              background:"transparent", color:"#333", fontSize:14, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            style={{ flex:1, height:44, borderRadius:10, border:"none",
              background:"#EF4444", color:"#fff", fontSize:14, fontWeight:800,
              cursor:"pointer", fontFamily:"inherit" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductRow({ product, onEdit, onDelete, onToggleStatus, onView, deleting }) {
  const [toggling, setToggling] = useState(false);

  const img    = (Array.isArray(product.images) ? product.images[0] : null) || product.imageUrl || "";
  const status = product.status === "active" ? "active" : product.inStock === false ? "out of stock" : "draft";
  const sColor = STATUS_COLOR[status] || "#9CA3AF";
  const sBg    = STATUS_BG[status]    || "rgba(0,0,0,0.06)";

  const handleToggle = async () => {
    setToggling(true);
    await onToggleStatus(product);
    setToggling(false);
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden",
      display: "flex", alignItems: "stretch",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {/* Image */}
      <div style={{ width: 90, flexShrink: 0, background: "#fafafa",
        position: "relative", overflow: "hidden", cursor: "pointer" }}
        onClick={() => onView(product)}>
        {img
          ? <img src={img} alt={product.name}
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center",
              justifyContent:"center", minHeight:80 }}>
              <Ico d={IC.img} size={26} color="rgba(0,0,0,0.15)"/>
            </div>
        }
        <div style={{ position:"absolute", top:6, left:6, width:8, height:8,
          borderRadius:"50%", background:sColor,
          boxShadow:`0 0 0 2px rgba(255,255,255,0.8)` }}/>
      </div>

      {/* Info */}
      <div style={{ flex:1, padding:"12px 14px", minWidth:0, display:"flex", flexDirection:"column", gap:4 }}>
        <div style={{ fontSize:14, fontWeight:800, color:"#111",
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", lineHeight:1.2 }}>
          {product.name}
        </div>
        {product.category && (
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <Ico d={IC.tag} size={11} color="#9CA3AF"/>
            <span style={{ fontSize:11, color:"#9CA3AF", fontWeight:500 }}>
              {product.category}
            </span>
          </div>
        )}
        <div style={{ display:"flex", alignItems:"baseline", gap:7, marginTop:2 }}>
          <span style={{ fontSize:15, fontWeight:900, color:"#111", letterSpacing:"-0.02em" }}>
            {fmtMoney(product.price)}
          </span>
          {product.comparePrice > product.price && (
            <span style={{ fontSize:11, color:"#9CA3AF", textDecoration:"line-through", fontWeight:500 }}>
              {fmtMoney(product.comparePrice)}
            </span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, fontWeight:800, padding:"3px 10px", borderRadius:100,
            background:sBg, color:sColor, textTransform:"capitalize" }}>
            {status === "out of stock" ? "Out of Stock" : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          {product.stock !== null && product.stock !== undefined && (
            <span style={{ fontSize:11, color:"#9CA3AF", fontWeight:600 }}>
              {product.stock} in stock
            </span>
          )}
          {product.featured && (
            <span style={{ fontSize:11, fontWeight:800, padding:"3px 9px", borderRadius:100,
              background:"rgba(245,158,11,0.1)", color:"#D97706" }}>
              Featured
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-between",
        padding:"10px 10px 10px 0", gap:5, flexShrink:0 }}>
        <button type="button" onClick={() => onEdit(product)}
          style={{ minWidth:54, padding:"5px 8px", borderRadius:9,
            border:"1.5px solid rgba(0,0,0,0.1)", background:"#fff",
            cursor:"pointer", display:"flex", flexDirection:"column",
            alignItems:"center", gap:2, color:"#046EF2" }}>
          <Ico d={IC.edit} size={14} color="#046EF2"/>
          <span style={{ fontSize:9, fontWeight:800, color:"#046EF2", lineHeight:1 }}>Edit</span>
        </button>

        <button type="button" onClick={handleToggle} disabled={toggling}
          style={{ minWidth:54, padding:"5px 8px", borderRadius:9,
            border:`1.5px solid ${product.status==="active"?"rgba(34,197,94,0.3)":"rgba(0,0,0,0.1)"}`,
            background: product.status==="active" ? "rgba(34,197,94,0.08)" : "#fff",
            cursor:"pointer", display:"flex", flexDirection:"column",
            alignItems:"center", gap:2, opacity: toggling ? 0.5 : 1 }}>
          <Ico d={product.status==="active" ? IC.eye : IC.eyeoff} size={14}
            color={product.status==="active" ? "#22C55E" : "#9CA3AF"}/>
          <span style={{ fontSize:9, fontWeight:800, lineHeight:1,
            color: product.status==="active" ? "#22C55E" : "#9CA3AF" }}>
            {product.status==="active" ? "Active" : "Draft"}
          </span>
        </button>

        <button type="button" onClick={() => onView(product)}
          style={{ minWidth:54, padding:"5px 8px", borderRadius:9,
            border:"1.5px solid rgba(0,0,0,0.1)", background:"#fff",
            cursor:"pointer", display:"flex", flexDirection:"column",
            alignItems:"center", gap:2, color:"#9CA3AF" }}>
          <Ico d={IC.box} size={14} color="#9CA3AF"/>
          <span style={{ fontSize:9, fontWeight:800, color:"#9CA3AF", lineHeight:1 }}>View</span>
        </button>

        <button type="button" onClick={() => onDelete(product)}
          disabled={deleting === product.id}
          style={{ minWidth:54, padding:"5px 8px", borderRadius:9,
            border:"1.5px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.04)",
            cursor:"pointer", display:"flex", flexDirection:"column",
            alignItems:"center", gap:2, opacity: deleting===product.id ? 0.5 : 1 }}>
          <Ico d={IC.trash} size={14} color="#EF4444"/>
          <span style={{ fontSize:9, fontWeight:800, color:"#EF4444", lineHeight:1 }}>Delete</span>
        </button>
      </div>
    </div>
  );
}

export default function DashboardProducts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { storeId, shop, subscriptionPlan, planLimits } = useSellerAuth();

  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [deleting,     setDeleting]     = useState(null);
  const [confirmProd,  setConfirmProd]  = useState(null);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getSellerProducts(user.uid, storeId || user.uid);
      setProducts(data);
    } catch (err) {
      console.error("[DashboardProducts] load:", err);
      setProducts([]);
    } finally { setLoading(false); }
  }, [user?.uid, storeId]);

  useEffect(() => { load(); }, [load]);

  const handleEdit   = (p) => navigate(`/seller-dashboard/products/${p.id}`);
  const handleView   = (p) => navigate(`/product/${p.id}`);
  const handleDelete = (p) => setConfirmProd(p);

  const confirmDelete = async () => {
    if (!confirmProd) return;
    setDeleting(confirmProd.id);
    setConfirmProd(null);
    try {
      await deleteSellerProduct(confirmProd.id, user.uid);
      setProducts(ps => ps.filter(p => p.id !== confirmProd.id));
    } catch (e) { alert(e.message || "Delete failed."); }
    finally { setDeleting(null); }
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === "active" ? "draft" : "active";
    try {
      await updateDoc(doc(db, "Products", product.id), {
        status: newStatus, inStock: newStatus === "active", updatedAt: serverTimestamp(),
      });
      setProducts(ps => ps.map(p => p.id === product.id ? { ...p, status:newStatus, inStock:newStatus==="active" } : p));
    } catch (e) { alert("Failed to update status."); console.error(e); }
  };

  const filtered = products.filter(p => {
    const matchSearch = !search.trim() || p.name?.toLowerCase().includes(search.toLowerCase());
    const st = p.status === "active" ? "Active" : p.inStock === false ? "Out of Stock" : "Draft";
    const matchStatus = statusFilter === "All" || st === statusFilter;
    return matchSearch && matchStatus;
  });

  const active   = products.filter(p => p.status === "active").length;
  const draft    = products.filter(p => p.status === "draft").length;
  const outOfStock = products.filter(p => p.inStock === false || p.stock === 0).length;
  const FALLBACK_LIMITS = { basic:5, free:5, starter:10, growth:25, standard:25, pro:500 };
  const maxProds = planLimits?.maxProducts || FALLBACK_LIMITS[(subscriptionPlan||"basic").toLowerCase()] || 5;
  const usedPct  = Math.min((products.length / maxProds) * 100, 100);
  const atLimit  = products.length >= maxProds;
  const planName = (subscriptionPlan || "basic").charAt(0).toUpperCase() + (subscriptionPlan||"basic").slice(1);

  return (
    <div style={{ fontFamily:"var(--font-main,'Nunito',sans-serif)", background:"#fff" }}>

      {/* Page header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:"#111", letterSpacing:"-0.03em" }}>Products</div>
          <div style={{ fontSize:13, color:"#9CA3AF", fontWeight:500, marginTop:3 }}>
            {products.length} / {maxProds} products · {active} active · {draft} draft
          </div>
        </div>
        <button type="button"
          onClick={() => atLimit ? navigate("/seller-dashboard?tab=subscription") : navigate("/seller-dashboard/products/new")}
          style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 20px",
            borderRadius:12, border:"none",
            background: atLimit ? "#F59E0B" : "#111",
            color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer",
            fontFamily:"inherit", boxShadow:"0 4px 14px rgba(0,0,0,0.15)" }}>
          <Ico d={atLimit ? "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" : IC.plus} size={15} color="#fff"/>
          {atLimit ? "Upgrade Plan" : "+ Add Product"}
        </button>
      </div>

      {/* Plan usage bar */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid rgba(0,0,0,0.08)",
        padding:"14px 18px", marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#6B7280" }}>
            Product Usage — {planName} Plan
          </span>
          <span style={{ fontSize:13, fontWeight:900, color: atLimit ? "#EF4444" : "#111" }}>
            {products.length} / {maxProds}
          </span>
        </div>
        <div style={{ height:5, background:"rgba(0,0,0,0.07)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${usedPct}%`,
            background: atLimit ? "#EF4444" : usedPct > 80 ? "#F59E0B" : "#111",
            borderRadius:3, transition:"width 0.5s ease" }}/>
        </div>
        {atLimit && (
          <div style={{ fontSize:12, color:"#EF4444", fontWeight:700, marginTop:6 }}>
            Product limit reached.{" "}
            <button type="button"
              onClick={() => navigate("/seller-dashboard?tab=subscription")}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#111",
                fontWeight:800, fontSize:12, fontFamily:"inherit", padding:0, textDecoration:"underline" }}>
              Upgrade your plan →
            </button>
          </div>
        )}
      </div>

      {/* Stat tiles */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
        {[
          { label:"Active",       val:active,     color:"#22C55E" },
          { label:"Draft",        val:draft,       color:"#9CA3AF" },
          { label:"Out of Stock", val:outOfStock,  color:"#EF4444" },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:12,
            border:"1px solid rgba(0,0,0,0.08)", padding:"14px 12px", textAlign:"center" }}>
            <div style={{ fontSize:26, fontWeight:900, color:s.color, letterSpacing:"-0.03em", lineHeight:1 }}>
              {s.val}
            </div>
            <div style={{ fontSize:11, color:"#9CA3AF", fontWeight:600, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid rgba(0,0,0,0.08)",
        padding:"12px 14px", marginBottom:14 }}>
        <div style={{ position:"relative", marginBottom:10 }}>
          <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#9CA3AF", pointerEvents:"none" }}>
            <Ico d={IC.search} size={15}/>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search products…"
            style={{ width:"100%", height:40, paddingLeft:38, paddingRight:14,
              border:"1.5px solid rgba(0,0,0,0.08)", borderRadius:10,
              background:"#fafafa", color:"#111",
              fontSize:14, fontWeight:500, outline:"none", fontFamily:"inherit",
              boxSizing:"border-box" }}/>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {STATUS_OPTS.map(opt => (
            <button key={opt} type="button" onClick={() => setStatusFilter(opt)}
              style={{ padding:"6px 14px", borderRadius:100, border:"1.5px solid",
                borderColor: statusFilter===opt ? "#046EF2" : "rgba(0,0,0,0.1)",
                background: statusFilter===opt ? "#046EF2" : "transparent",
                color: statusFilter===opt ? "#fff" : "#333",
                fontSize:12, fontWeight:700, cursor:"pointer",
                fontFamily:"inherit", transition:"all 0.15s" }}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      {loading
        ? [1,2,3].map(i => (
            <div key={i} style={{ background:"#fff", borderRadius:14,
              border:"1px solid rgba(0,0,0,0.08)", height:90,
              marginBottom:8, overflow:"hidden", display:"flex" }}>
              <div style={{ width:90, background:"rgba(0,0,0,0.05)" }}/>
              <div style={{ flex:1, padding:"14px 16px" }}>
                <div style={{ height:13, width:"60%", background:"rgba(0,0,0,0.07)", borderRadius:4, marginBottom:8 }}/>
                <div style={{ height:11, width:"35%", background:"rgba(0,0,0,0.05)", borderRadius:4 }}/>
              </div>
            </div>
          ))
        : filtered.length === 0
          ? (
            <div style={{ background:"#fff", borderRadius:16,
              border:"1px solid rgba(0,0,0,0.08)", padding:"50px 20px", textAlign:"center" }}>
              <div style={{ marginBottom:14 }}><Ico d={IC.box} size={44} color="rgba(0,0,0,0.12)"/></div>
              <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:6 }}>
                {products.length === 0 ? "No products yet" : "No products match your search"}
              </div>
              <div style={{ fontSize:13, color:"#9CA3AF", marginBottom:22, lineHeight:1.5 }}>
                {products.length === 0 ? "Add your first product to start selling on Beme Market." : "Try a different search or filter."}
              </div>
              {products.length === 0 && (
                <button type="button"
                  onClick={() => navigate("/seller-dashboard/products/new")}
                  style={{ padding:"12px 28px", borderRadius:12, border:"none",
                    background:"#111", color:"#fff", fontSize:14, fontWeight:800,
                    cursor:"pointer", fontFamily:"inherit",
                    boxShadow:"0 4px 14px rgba(0,0,0,0.15)" }}>
                  + Add First Product
                </button>
              )}
            </div>
          )
          : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filtered.map(p => (
                <ProductRow key={p.id} product={p}
                  onEdit={handleEdit} onDelete={handleDelete}
                  onToggleStatus={handleToggleStatus} onView={handleView}
                  deleting={deleting}/>
              ))}
            </div>
          )
      }

      {confirmProd && (
        <Confirm
          name={confirmProd.name}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmProd(null)}/>
      )}

      <style>{`@keyframes dpPulse { 0%,100%{opacity:.45} 50%{opacity:.85} }`}</style>
    </div>
  );
}