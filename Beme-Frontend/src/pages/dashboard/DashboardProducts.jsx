import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSellerAuth } from "../../hooks/useSellerAuth";
import { useAuth } from "../../context/AuthContext";
import { getSellerProducts, deleteSellerProduct } from "../../services/storeService";
import TutorialOverlay from "../../components/ai/TutorialOverlay";
import { TUTORIAL_STEPS } from "../../components/ai/tutorialSteps";
import { useTutorial } from "../../hooks/useTutorial";

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
  box:    "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  img:    "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14l4-4 3 3 3-3 4 4z",
};

const STATUS_OPTS = ["All", "Active", "Draft", "Out of Stock"];

function fmtMoney(n) {
  return `GHS ${Number(n || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Confirm({ name, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"var(--sd-white)", borderRadius:18, padding:"28px 24px",
        maxWidth:340, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width:48, height:48, borderRadius:12, background:"rgba(239,68,68,0.08)",
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
          <Ico d={IC.trash} size={22} color="#EF4444"/>
        </div>
        <div style={{ fontSize:17, fontWeight:900, color:"var(--sd-text)", textAlign:"center", marginBottom:8 }}>
          Delete Product?
        </div>
        <div style={{ fontSize:13, color:"var(--sd-muted)", textAlign:"center", lineHeight:1.5, marginBottom:22 }}>
          "<strong>{name}</strong>" will be permanently removed. This cannot be undone.
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button type="button" onClick={onCancel}
            style={{ flex:1, height:44, borderRadius:10, border:"1.5px solid var(--sd-border)",
              background:"transparent", color:"var(--sd-text)", fontSize:14, fontWeight:700,
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

function ProductRow({ product, onEdit, onDelete, deleting }) {
  const img = (Array.isArray(product.images) ? product.images[0] : null) || product.imageUrl || "";
  return (
    <div className="dp-product-row">
      <div className="dp-product-thumb">
        {img
          ? <img src={img} alt={product.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          : <Ico d={IC.img} size={26} color="var(--sd-border)"/>
        }
      </div>
      <div className="dp-product-info">
        <div className="dp-product-name">{product.name}</div>
        <div className="dp-product-cat">{product.category || "No Category"}</div>
        <div className="dp-product-price">{fmtMoney(product.price)}</div>
      </div>
      <div className="dp-product-actions">
        <button type="button" onClick={() => onEdit(product)} className="dp-action-btn" title="Edit">
          <Ico d={IC.edit} size={18} color="var(--sd-muted)"/>
        </button>
        <button type="button" onClick={() => onDelete(product)} className="dp-action-btn" title="Delete"
          disabled={deleting === product.id} style={{ opacity: deleting === product.id ? 0.4 : 1 }}>
          <Ico d={IC.trash} size={18} color="var(--sd-muted)"/>
        </button>
      </div>
    </div>
  );
}

export default function DashboardProducts() {
  const { showTutorial, markSeen } = useTutorial("products");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { storeId, subscriptionPlan, planLimits } = useSellerAuth();

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

  const filtered = products.filter(p => {
    const matchSearch = !search.trim() || p.name?.toLowerCase().includes(search.toLowerCase());
    const st = p.status === "active" ? "Active" : p.inStock === false ? "Out of Stock" : "Draft";
    const matchStatus = statusFilter === "All" || st === statusFilter;
    return matchSearch && matchStatus;
  });

  const FALLBACK_LIMITS = { basic:5, free:5, starter:10, growth:25, standard:25, pro:500 };
  const maxProds   = planLimits?.maxProducts || FALLBACK_LIMITS[(subscriptionPlan||"basic").toLowerCase()] || 5;
  const usedPct    = Math.min((products.length / maxProds) * 100, 100);
  const atLimit    = products.length >= maxProds;
  const planName   = (subscriptionPlan || "basic").charAt(0).toUpperCase() + (subscriptionPlan||"basic").slice(1);

  const goAdd = () => atLimit
    ? navigate("/seller-dashboard?tab=subscription")
    : navigate("/seller-dashboard/products/new");

  return (
    <div className="dp-root">

      {/* ── Page header ── */}
      <div className="dp-header">
        <div>
          <div className="dp-title">Products</div>
          <div className="dp-subtitle">Manage your store listings.</div>
        </div>

        {/* Desktop: pill button — purple border + text + plus icon, hover fills */}
        <button type="button" onClick={goAdd} className="dp-add-desktop">
          <Ico d={IC.plus} size={15} color="var(--sd-accent)"/>
          {atLimit ? "Upgrade Plan" : "Publish New"}
        </button>

        {/* Mobile: square pill, + icon only */}
        <button type="button" onClick={goAdd} className="dp-add-mobile"
          title={atLimit ? "Upgrade Plan" : "Publish New"}>
          <Ico d={IC.plus} size={18} color="var(--sd-accent)"/>
        </button>
      </div>

      {/* ── Plan usage bar ── */}
      <div className="dp-panel">
        <div className="dp-usage-row">
          <span className="dp-usage-label">Product Usage — {planName} Plan</span>
          <span className="dp-usage-count" style={{ color: atLimit ? "#EF4444" : "var(--sd-text)" }}>
            {products.length} / {maxProds}
          </span>
        </div>
        <div className="dp-usage-track">
          <div className="dp-usage-fill" style={{
            width: `${usedPct}%`,
            background: atLimit ? "#EF4444" : usedPct > 80 ? "#F59E0B" : "var(--sd-accent)",
          }}/>
        </div>
        {atLimit && (
          <div className="dp-usage-warn">
            Product limit reached.{" "}
            <button type="button" onClick={() => navigate("/seller-dashboard?tab=subscription")}
              className="dp-upgrade-link">
              Upgrade your plan →
            </button>
          </div>
        )}
      </div>

      {/* ── Search + filter ── */}
      <div className="dp-panel dp-search-panel">
        <div className="dp-search-wrap">
          <div className="dp-search-icon"><Ico d={IC.search} size={15} color="var(--sd-muted)"/></div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products…" className="dp-search-input"/>
        </div>
        <div className="dp-filter-row">
          {STATUS_OPTS.map(opt => (
            <button key={opt} type="button" onClick={() => setStatusFilter(opt)}
              className={`dp-filter-btn${statusFilter === opt ? " dp-filter-btn--on" : ""}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product list ── */}
      {loading
        ? [1,2,3].map(i => (
            <div key={i} className="dp-product-row dp-skel-row">
              <div className="dp-skel dp-product-thumb"/>
              <div style={{ flex:1 }}>
                <div className="dp-skel" style={{ height:13, width:"55%", marginBottom:8, borderRadius:4 }}/>
                <div className="dp-skel" style={{ height:11, width:"35%", borderRadius:4 }}/>
              </div>
            </div>
          ))
        : filtered.length === 0
          ? (
            <div className="dp-empty">
              <Ico d={IC.box} size={44} color="var(--sd-border)"/>
              <div className="dp-empty-title">
                {products.length === 0 ? "No products yet" : "No products match your search"}
              </div>
              <div className="dp-empty-sub">
                {products.length === 0
                  ? "Add your first product to start selling on Beme Market."
                  : "Try a different search or filter."}
              </div>
              {products.length === 0 && (
                <button type="button" onClick={goAdd} className="dp-empty-btn">
                  + Publish First Product
                </button>
              )}
            </div>
          )
          : (
            <div className="dp-list">
              {filtered.map(p => (
                <ProductRow key={p.id} product={p}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  deleting={deleting}/>
              ))}
            </div>
          )
      }

      {confirmProd && (
        <Confirm name={confirmProd.name} onConfirm={confirmDelete} onCancel={() => setConfirmProd(null)}/>
      )}

      {showTutorial && (
        <TutorialOverlay steps={TUTORIAL_STEPS.products} onFinish={markSeen} pageTitle="Products"/>
      )}

      <style>{`
        @keyframes dp-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: calc(600px + 100%) 0; }
        }

        /* ── Root: page bg matches dashboard bg, NOT card bg ── */
        .dp-root {
          font-family: var(--sd-font, 'DM Sans', system-ui, sans-serif);
          background: var(--sd-bg);
          color: var(--sd-text);
          min-height: 100%;
        }

        /* Header */
        .dp-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 16px; gap: 12px;
        }
        .dp-title    { font-size: 22px; font-weight: 900; color: var(--sd-text); letter-spacing: -0.03em; }
        .dp-subtitle { font-size: 13px; color: var(--sd-muted); font-weight: 500; margin-top: 3px; }

        /* ── Desktop pill button — always shows + icon + label ── */
        .dp-add-desktop {
          display: none;
          align-items: center; gap: 7px;
          padding: 9px 20px 9px 14px;
          border-radius: 100px;
          border: 1.5px solid var(--sd-accent);
          background: transparent;
          color: var(--sd-accent);
          font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          transition: background 0.18s, color 0.18s, border-color 0.18s;
          white-space: nowrap; flex-shrink: 0;
          line-height: 1;
        }
        .dp-add-desktop svg {
          stroke: var(--sd-accent);
          transition: stroke 0.18s;
          flex-shrink: 0;
        }
        .dp-add-desktop:hover {
          background: var(--sd-accent);
          color: #fff;
        }
        .dp-add-desktop:hover svg { stroke: #fff; }

        /* ── Mobile square icon button ── */
        .dp-add-mobile {
          display: flex;
          align-items: center; justify-content: center;
          width: 42px; height: 42px;
          border-radius: 14px;
          border: 1.5px solid var(--sd-accent);
          background: var(--sd-white);
          cursor: pointer; flex-shrink: 0;
          transition: background 0.18s;
        }
        .dp-add-mobile:hover { background: var(--sd-accent-dim); }

        @media (min-width: 640px) {
          .dp-add-desktop { display: flex; }
          .dp-add-mobile  { display: none; }
        }

        /* Panel — card surface lifts off bg */
        .dp-panel {
          background: var(--sd-white);
          border-radius: 14px;
          border: 1px solid var(--sd-border);
          padding: 14px 16px;
          margin-bottom: 12px;
          transition: background 0.25s, border-color 0.25s;
        }

        /* Usage */
        .dp-usage-row   { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .dp-usage-label { font-size: 13px; font-weight: 700; color: var(--sd-muted); }
        .dp-usage-count { font-size: 13px; font-weight: 900; }
        .dp-usage-track { height: 5px; background: var(--sd-border); border-radius: 3px; overflow: hidden; }
        .dp-usage-fill  { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
        .dp-usage-warn  { font-size: 12px; color: #EF4444; font-weight: 700; margin-top: 6px; }
        .dp-upgrade-link {
          background: none; border: none; cursor: pointer; color: var(--sd-text);
          font-weight: 800; font-size: 12px; font-family: inherit;
          padding: 0; text-decoration: underline;
        }

        /* Search */
        .dp-search-panel { padding: 12px 14px; }
        .dp-search-wrap  { position: relative; margin-bottom: 10px; }
        .dp-search-icon  { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .dp-search-input {
          width: 100%; height: 40px; padding-left: 38px; padding-right: 14px;
          border: 1.5px solid var(--sd-border); border-radius: 10px;
          background: var(--sd-bg); color: var(--sd-text);
          font-size: 14px; font-weight: 500; outline: none; font-family: inherit;
          box-sizing: border-box; transition: border-color 0.15s;
        }
        .dp-search-input:focus        { border-color: var(--sd-accent); }
        .dp-search-input::placeholder { color: var(--sd-muted); }

        .dp-filter-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .dp-filter-btn {
          padding: 6px 14px; border-radius: 100px;
          border: 1.5px solid var(--sd-border);
          background: transparent; color: var(--sd-text2);
          font-size: 12px; font-weight: 700; cursor: pointer;
          font-family: inherit; transition: all 0.15s;
        }
        .dp-filter-btn--on {
          border-color: var(--sd-accent);
          background: var(--sd-accent);
          color: #fff;
        }

        /* Product list */
        .dp-list { display: flex; flex-direction: column; gap: 10px; }

        /* Product row — card surface */
        .dp-product-row {
          background: var(--sd-white);
          border-radius: 14px;
          border: 1px solid var(--sd-border);
          display: flex; align-items: center;
          padding: 12px 14px; gap: 14px;
          transition: border-color 0.15s, background 0.25s;
        }
        .dp-product-row:hover { border-color: rgba(124,58,237,0.3); }

        .dp-product-thumb {
          width: 64px; height: 64px; border-radius: 10px;
          background: var(--sd-border-light);
          flex-shrink: 0; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
        }
        .dp-product-info  { flex: 1; min-width: 0; }
        .dp-product-name  {
          font-size: 14px; font-weight: 800; color: var(--sd-text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;
        }
        .dp-product-cat   { font-size: 12px; color: var(--sd-muted); font-weight: 500; margin-top: 2px; }
        .dp-product-price { font-size: 13px; font-weight: 700; color: var(--sd-text2); margin-top: 3px; }

        .dp-product-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .dp-action-btn {
          background: none; border: none; cursor: pointer;
          padding: 6px; border-radius: 8px; line-height: 0;
          transition: background 0.12s;
        }
        .dp-action-btn:hover { background: var(--sd-border-light); }

        /* Skeleton */
        .dp-skel-row { margin-bottom: 10px; }
        .dp-skel {
          background: var(--sd-border-light);
          background-image: linear-gradient(90deg, var(--sd-border-light) 25%, var(--sd-border) 50%, var(--sd-border-light) 75%);
          background-size: 600px 100%;
          animation: dp-shimmer 1.4s ease infinite;
        }

        /* Empty */
        .dp-empty {
          background: var(--sd-white);
          border-radius: 16px; border: 1.5px dashed var(--sd-border);
          padding: 50px 20px; text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .dp-empty-title { font-size: 16px; font-weight: 800; color: var(--sd-text); }
        .dp-empty-sub   { font-size: 13px; color: var(--sd-muted); line-height: 1.5; max-width: 260px; }
        .dp-empty-btn {
          margin-top: 8px; padding: 11px 24px; border-radius: 100px;
          border: 1.5px solid var(--sd-accent);
          background: transparent; color: var(--sd-accent);
          font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
          transition: background 0.18s, color 0.18s;
        }
        .dp-empty-btn:hover { background: var(--sd-accent); color: #fff; }

        @media (max-width: 480px) {
          .dp-title         { font-size: 18px; }
          .dp-product-thumb { width: 52px; height: 52px; }
          .dp-product-name  { font-size: 13px; }
          .dp-filter-btn    { font-size: 11px; padding: 5px 10px; }
        }
      `}</style>
    </div>
  );
}