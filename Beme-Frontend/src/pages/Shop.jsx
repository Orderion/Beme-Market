import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import {
  DEPARTMENTS,
  KINDS,
  SHOPS,
  HOME_FILTER_OPTIONS,
  DEFAULT_KIND_BY_DEPT,
  normalizeDept,
  normalizeKind,
  normalizeShop,
  normalizeHomeFilter,
} from "../constants/catalog";
import "./Shop.css";

const SHOP_TITLE_MAP = {
  fashion: "Fashion Shop",
  main: "Main Store",
  kente: "Mintah's Kente",
  perfume: "Perfume Shop",
  tech: "Tech Shop",
};

const SHOP_FILTER_OPTIONS = SHOPS.map((shop) => ({ ...shop }));
const HOME_SLOT_OPTIONS = HOME_FILTER_OPTIONS.map((item) => ({ ...item }));

function getLabel(list, key) {
  return list.find((item) => item.key === key)?.label || null;
}

/* ── store icon map ── */
function ShopIcon({ shopKey }) {
  if (shopKey === "fashion") return (
    <svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M9 4l3 2 3-2 3 3-2 3v9H8v-9L6 7l3-3Z"/>
    </svg>
  );
  if (shopKey === "kente") return (
    <svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  );
  if (shopKey === "perfume") return (
    <svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 2h6v4H9zM12 6v3M7 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/>
    </svg>
  );
  if (shopKey === "tech") return (
    <svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="5" y="5" width="14" height="10" rx="1.6"/><path d="M3.5 18h17"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="4" y="5" width="16" height="14" rx="2.4"/><path d="M8 9h8M8 12h8M8 15h5"/>
    </svg>
  );
}

const Shop = () => {
  const [params, setParams] = useSearchParams();

  /* ── all URL param logic (unchanged) ── */
  const deptParam    = normalizeDept(params.get("dept"));
  const kindParam    = normalizeKind(params.get("kind"));
  const shopParam    = normalizeShop(params.get("shop"));
  const rawSlot      = params.get("slot");
  const slotParam    = rawSlot ? normalizeHomeFilter(rawSlot) : null;
  const qParam       = (params.get("q") || "").trim();
  const sortParam    = (params.get("sort") || "new").toLowerCase();
  const minParam     = params.get("min") ? Number(params.get("min")) : null;
  const maxParam     = params.get("max") ? Number(params.get("max")) : null;
  const stockParam   = params.get("stock") === "1";
  const featuredParam = params.get("featured") === "1";

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen,    setSortOpen]    = useState(false);

  useEffect(() => {
    const anyOpen = filtersOpen || sortOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filtersOpen, sortOpen]);

  const [draft, setDraft] = useState(() => ({
    sort: sortParam, min: minParam ?? "", max: maxParam ?? "",
    stock: stockParam, featured: featuredParam,
  }));

  useEffect(() => {
    setDraft({ sort: sortParam, min: minParam ?? "", max: maxParam ?? "", stock: stockParam, featured: featuredParam });
  }, [sortParam, minParam, maxParam, stockParam, featuredParam]);

  const closePanels = () => { setFiltersOpen(false); setSortOpen(false); };

  const title = useMemo(() => {
    if (qParam) return `"${qParam}"`;
    const deptLabel  = deptParam  ? getLabel(DEPARTMENTS, deptParam)        : null;
    const kindLabel  = kindParam  ? getLabel(KINDS, kindParam)               : null;
    const shopLabel  = shopParam  ? SHOP_TITLE_MAP[shopParam] || "Shop"     : null;
    const slotLabel  = slotParam  ? getLabel(HOME_FILTER_OPTIONS, slotParam) : null;
    const parts = [shopLabel, slotLabel, deptLabel, kindLabel].filter(Boolean);
    return parts.length ? parts.join(" · ") : "Hot sale";
  }, [deptParam, kindParam, shopParam, slotParam, qParam]);

  const hasActiveFilters = !!deptParam || !!kindParam || !!shopParam || !!slotParam || !!qParam;
  const hasActiveSort    = sortParam !== "new" || stockParam || featuredParam || minParam != null || maxParam != null;

  /* ── setters (all unchanged) ── */
  const setDept = (dept) => {
    const next = new URLSearchParams(params);
    if (!dept) { next.delete("dept"); next.delete("kind"); setParams(next); return; }
    next.set("dept", dept);
    const currentKind = normalizeKind(next.get("kind"));
    if (!currentKind) { const def = DEFAULT_KIND_BY_DEPT[dept]; if (def) next.set("kind", def); }
    setParams(next);
  };
  const setKind = (kind) => {
    const next = new URLSearchParams(params);
    if (!kind) { next.delete("kind"); } else { next.set("kind", kind); }
    setParams(next);
  };
  const setShop = (shop) => {
    const next = new URLSearchParams(params);
    if (!shop) next.delete("shop"); else next.set("shop", shop);
    setParams(next);
  };
  const setSlot = (slot) => {
    const next = new URLSearchParams(params);
    if (!slot) next.delete("slot"); else next.set("slot", slot);
    setParams(next);
  };
  const clearSearch    = () => { const n = new URLSearchParams(params); n.delete("q"); setParams(n); };
  const resetSortOnly  = () => { const n = new URLSearchParams(params); n.delete("sort"); setParams(n); };
  const resetPriceOnly = () => { const n = new URLSearchParams(params); n.delete("min"); n.delete("max"); setParams(n); };
  const toggleStock    = (v) => { const n = new URLSearchParams(params); if (v) n.set("stock","1"); else n.delete("stock"); setParams(n); };
  const toggleFeatured = (v) => { const n = new URLSearchParams(params); if (v) n.set("featured","1"); else n.delete("featured"); setParams(n); };

  const clearFilterPanel = () => {
    const n = new URLSearchParams(params);
    ["dept","kind","shop","slot","q"].forEach(k => n.delete(k));
    setParams(n);
  };
  const clearAll = () => {
    const n = new URLSearchParams(params);
    ["dept","kind","shop","slot","sort","min","max","stock","featured","q"].forEach(k => n.delete(k));
    setParams(n); closePanels();
  };
  const openSort = () => {
    setDraft({ sort:sortParam, min:minParam??'', max:maxParam??'', stock:stockParam, featured:featuredParam });
    setSortOpen(true); setFiltersOpen(false);
  };
  const applySort = () => {
    const next = new URLSearchParams(params);
    if (!draft.sort || draft.sort === "new") next.delete("sort"); else next.set("sort", draft.sort);
    const min = draft.min === "" ? null : Number(draft.min);
    const max = draft.max === "" ? null : Number(draft.max);
    if (min != null && !Number.isNaN(min) && min >= 0) next.set("min", String(min)); else next.delete("min");
    if (max != null && !Number.isNaN(max) && max >= 0) next.set("max", String(max)); else next.delete("max");
    if (draft.stock)   next.set("stock","1");   else next.delete("stock");
    if (draft.featured) next.set("featured","1"); else next.delete("featured");
    setParams(next); setSortOpen(false);
  };
  const clearSortPanel = () => {
    setDraft({ sort:"new", min:"", max:"", stock:false, featured:false });
    const n = new URLSearchParams(params);
    ["sort","min","max","stock","featured"].forEach(k => n.delete(k));
    setParams(n); setSortOpen(false);
  };

  /* ── active pills (unchanged) ── */
  const activePills = useMemo(() => {
    const pills = [];
    if (shopParam) pills.push({ key:`shop:${shopParam}`, label:SHOP_TITLE_MAP[shopParam]||getLabel(SHOPS,shopParam)||"Shop", onRemove:()=>setShop(null) });
    if (slotParam) pills.push({ key:`slot:${slotParam}`, label:getLabel(HOME_FILTER_OPTIONS,slotParam)||slotParam, onRemove:()=>setSlot(null) });
    if (deptParam) pills.push({ key:`dept:${deptParam}`, label:getLabel(DEPARTMENTS,deptParam)||deptParam, onRemove:()=>setDept(null) });
    if (kindParam) pills.push({ key:`kind:${kindParam}`, label:getLabel(KINDS,kindParam)||kindParam, onRemove:()=>setKind(null) });
    if (qParam)    pills.push({ key:`q:${qParam}`, label:`Search: ${qParam}`, onRemove:()=>clearSearch() });
    if (sortParam !== "new") pills.push({ key:`sort:${sortParam}`, label:sortParam==="price-asc"?"Price: Low to High":sortParam==="price-desc"?"Price: High to Low":"Newest", onRemove:()=>resetSortOnly() });
    if (minParam != null || maxParam != null) pills.push({ key:"price-range", label:`GHS ${minParam??0} - ${maxParam??"∞"}`, onRemove:()=>resetPriceOnly() });
    if (stockParam)   pills.push({ key:"stock",    label:"In stock",  onRemove:()=>toggleStock(false) });
    if (featuredParam) pills.push({ key:"featured", label:"Featured", onRemove:()=>toggleFeatured(false) });
    return pills;
  }, [shopParam,slotParam,deptParam,kindParam,qParam,sortParam,minParam,maxParam,stockParam,featuredParam]);

  /* ── filter object (unchanged) ── */
  const filter = useMemo(() => ({
    dept:deptParam||null, kind:kindParam||null, shop:shopParam||null, slot:slotParam||null,
    q:qParam||"",
    priceMin:minParam!=null&&!Number.isNaN(minParam)?minParam:null,
    priceMax:maxParam!=null&&!Number.isNaN(maxParam)?maxParam:null,
    inStockOnly:stockParam, featuredOnly:featuredParam, sort:sortParam,
  }), [deptParam,kindParam,shopParam,slotParam,qParam,minParam,maxParam,stockParam,featuredParam,sortParam]);

  return (
    <div className="shop-page">

      {/* overlay */}
      {(filtersOpen || sortOpen) && (
        <button type="button" className="shop-panel-overlay" aria-label="Close panel" onClick={closePanels} />
      )}

      {/* ── sticky topbar ── */}
      <div className="shop-topbar">
        <div className="shop-top-spacer" />
        <div className="shop-top-title-wrap">
          <h1 className="shop-title">{title}</h1>
        </div>
        <div className="shop-top-spacer" />
      </div>

      {/* ── BANNER ── */}
      <div className="shop-banner-wrap">
        <div className="shop-banner">
          <img
            src="/favicon-banner.png"
            alt="Beme Market banner"
            className="shop-banner-img"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <div className="shop-banner-overlay" />
          <div className="shop-banner-content">
            <span className="shop-banner-badge">Hot deals</span>
            <h2 className="shop-banner-title">Up to 50% off</h2>
            <p className="shop-banner-sub">Limited time — fashion, tech &amp; more</p>
            <button className="shop-banner-btn" onClick={() => setShop(null)}>
              Shop now
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── STORE chips ── */}
      <div className="shop-chip-section">
        <div className="shop-chip-head">
          <span className="shop-chip-eyebrow">Browse by store</span>
          {shopParam && (
            <button type="button" className="shop-quick-store-clear" onClick={() => setShop(null)}>Show all</button>
          )}
        </div>
        <div className="shop-chip-row">
          <button
            type="button"
            className={!shopParam ? "shop-store-chip active" : "shop-store-chip"}
            onClick={() => setShop(null)}
          >
            All stores
          </button>
          {SHOP_FILTER_OPTIONS.map((shop) => (
            <button
              key={shop.key}
              type="button"
              className={shopParam === shop.key ? "shop-store-chip active" : "shop-store-chip"}
              onClick={() => setShop(shop.key)}
            >
              <ShopIcon shopKey={shop.key} />
              {shop.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CATEGORY chips ── */}
      <div className="shop-chip-section" style={{ paddingTop: 10 }}>
        <div className="shop-chip-head">
          <span className="shop-chip-eyebrow">Browse by category</span>
          {slotParam && (
            <button type="button" className="shop-quick-store-clear" onClick={() => setSlot(null)}>Show all</button>
          )}
        </div>
        <div className="shop-chip-row">
          <button
            type="button"
            className={!slotParam ? "shop-store-chip active" : "shop-store-chip"}
            onClick={() => setSlot(null)}
          >
            All categories
          </button>
          {HOME_SLOT_OPTIONS.map((slot) => (
            <button
              key={slot.key}
              type="button"
              className={slotParam === slot.key ? "shop-store-chip active" : "shop-store-chip"}
              onClick={() => setSlot(slot.key)}
            >
              {slot.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── active pills ── */}
      {activePills.length > 0 && (
        <div className="shop-active-pills-wrap">
          <div className="shop-active-pills">
            {activePills.map((pill) => (
              <button key={pill.key} type="button" className="shop-active-pill" onClick={pill.onRemove} aria-label={`Remove ${pill.label}`}>
                <span>{pill.label}</span>
                <span className="shop-active-pill-x">×</span>
              </button>
            ))}
          </div>
          <button type="button" className="shop-active-clearall" onClick={clearAll}>Clear all</button>
        </div>
      )}

      {/* ── filter / sort controls ── */}
      <div className="shop-controls">
        <button
          className="shop-control-btn" type="button"
          onClick={() => { setFiltersOpen(o => !o); setSortOpen(false); }}
          aria-expanded={filtersOpen}
        >
          <span className="shop-control-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="shop-svg">
              <path d="M4 7h10M18 7h2M4 17h6M14 17h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              <path d="M14 5v4M10 15v4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </span>
          <span>Filter {hasActiveFilters && <span className="shop-dot" />}</span>
        </button>

        <div className="shop-divider" />

        <button className="shop-control-btn" type="button" onClick={openSort} aria-expanded={sortOpen}>
          <span className="shop-control-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="shop-svg">
              <path d="M8 6v12M8 18l-3-3M8 18l3-3M16 6v12M16 6l-3 3M16 6l3 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span>Sort {hasActiveSort && <span className="shop-dot" />}</span>
        </button>
      </div>

      {/* ── product grid ── */}
      <div className="shop-meta">
        <span className="shop-count">
          <ProductGrid filter={filter} sortBy={filter.sort} withCount />
        </span>
      </div>

      <ProductGrid filter={filter} sortBy={filter.sort} />

      {/* ── FILTER panel ── */}
      <div className={`shop-panel shop-panel--filters ${filtersOpen ? "open" : ""}`} aria-hidden={!filtersOpen}>
        <div className="shop-panel-inner">
          <div className="shop-panel-head">
            <span className="shop-panel-title">Filters</span>
            <div className="shop-panel-head-actions">
              {(hasActiveFilters || hasActiveSort) && <button type="button" className="shop-panel-action" onClick={clearAll}>Clear all</button>}
              {hasActiveFilters && <button type="button" className="shop-panel-action" onClick={clearFilterPanel}>Clear</button>}
              <button type="button" className="shop-panel-action" onClick={() => setFiltersOpen(false)}>Close</button>
            </div>
          </div>

          <div className="shop-panel-scroll">
            <div className="shop-panel-section">
              <div className="shop-panel-label">Shop</div>
              <div className="shop-chips">
                <button type="button" className={!shopParam?"chip active":"chip"} onClick={()=>setShop(null)}>All shops</button>
                {SHOP_FILTER_OPTIONS.map(shop => (
                  <button key={shop.key} type="button" className={shopParam===shop.key?"chip active":"chip"} onClick={()=>setShop(shop.key)}>{shop.label}</button>
                ))}
              </div>
            </div>

            <div className="shop-panel-section">
              <div className="shop-panel-label">Category</div>
              <div className="shop-chips">
                <button type="button" className={!slotParam?"chip active":"chip"} onClick={()=>setSlot(null)}>All categories</button>
                {HOME_SLOT_OPTIONS.map(slot => (
                  <button key={slot.key} type="button" className={slotParam===slot.key?"chip active":"chip"} onClick={()=>setSlot(slot.key)}>{slot.label}</button>
                ))}
              </div>
            </div>

            <div className="shop-panel-section">
              <div className="shop-panel-label">Department</div>
              <div className="shop-chips">
                <button type="button" className={!deptParam?"chip active":"chip"} onClick={()=>setDept(null)}>All</button>
                {DEPARTMENTS.map(dept => (
                  <button key={dept.key} type="button" className={deptParam===dept.key?"chip active":"chip"} onClick={()=>setDept(dept.key)}>{dept.label}</button>
                ))}
              </div>
            </div>

            <div className="shop-panel-section">
              <div className="shop-panel-label">Type</div>
              <div className="shop-chips shop-chips-secondary">
                <button type="button" className={!kindParam?"chip active":"chip"} onClick={()=>setKind(null)}>All types</button>
                {KINDS.map(kind => (
                  <button key={kind.key} type="button" className={kindParam===kind.key?"chip active":"chip"} onClick={()=>setKind(kind.key)}>{kind.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SORT panel ── */}
      <div className={`shop-panel shop-panel--sort ${sortOpen ? "open" : ""}`} aria-hidden={!sortOpen}>
        <div className="shop-panel-inner">
          <div className="shop-panel-head">
            <span className="shop-panel-title">Sort &amp; Price</span>
            <div className="shop-panel-head-actions">
              {hasActiveSort && <button type="button" className="shop-panel-action" onClick={clearSortPanel}>Reset</button>}
              <button type="button" className="shop-panel-action" onClick={()=>setSortOpen(false)}>Close</button>
            </div>
          </div>

          <div className="shop-panel-scroll">
            <div className="shop-panel-section">
              <div className="shop-panel-label">Sort</div>
              <div className="shop-radio">
                <label className="shop-radio-item"><input type="radio" name="sort" checked={draft.sort==="new"}    onChange={()=>setDraft(p=>({...p,sort:"new"}))}       /> Dynamic</label>
                <label className="shop-radio-item"><input type="radio" name="sort" checked={draft.sort==="price-asc"}  onChange={()=>setDraft(p=>({...p,sort:"price-asc"}))}  /> Price: Low to High</label>
                <label className="shop-radio-item"><input type="radio" name="sort" checked={draft.sort==="price-desc"} onChange={()=>setDraft(p=>({...p,sort:"price-desc"}))} /> Price: High to Low</label>
              </div>
            </div>

            <div className="shop-panel-section">
              <div className="shop-panel-label">Price range (GHS)</div>
              <div className="shop-range">
                <input inputMode="numeric" placeholder="Min" value={draft.min} onChange={e=>setDraft(p=>({...p,min:e.target.value}))} />
                <span className="shop-range-dash">—</span>
                <input inputMode="numeric" placeholder="Max" value={draft.max} onChange={e=>setDraft(p=>({...p,max:e.target.value}))} />
              </div>
              <label className="shop-toggle"><input type="checkbox" checked={draft.stock}    onChange={e=>setDraft(p=>({...p,stock:e.target.checked}))}    /> In stock only</label>
              <label className="shop-toggle"><input type="checkbox" checked={draft.featured} onChange={e=>setDraft(p=>({...p,featured:e.target.checked}))} /> Featured only</label>
            </div>
          </div>

          <div className="shop-panel-actions">
            <button type="button" className="shop-btn ghost" onClick={()=>setSortOpen(false)}>Cancel</button>
            <button type="button" className="shop-btn solid" onClick={applySort}>Apply</button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Shop;
