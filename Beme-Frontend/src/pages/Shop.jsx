import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import ProductRequestModal from "../components/productRequest/ProductRequestModal";
import shopBanner from "../assets/Shop-banner.JPG";
import {
  HOME_FILTER_OPTIONS,
  normalizeHomeFilter,
} from "../constants/catalog";
import "./Shop.css";

/* ── Same categories as Header.jsx NAV_CATEGORIES ── */
const NAV_CATEGORIES = [
  { key:"iphones",         label:"Phones",          query:"iphone",      color:"#DDEEFF" },
  { key:"laptops",         label:"Laptops",          query:"laptop",      color:"#EAE7FD" },
  { key:"shoes",           label:"Shoes",            query:"shoes",       color:"#FFE8DF" },
  { key:"clothing",        label:"Clothing",         query:"clothing",    color:"#FFE3EE" },
  { key:"kids",            label:"Kids",             query:"kids",        color:"#FFF0D6" },
  { key:"game",            label:"Gaming",           query:"game",        color:"#DDF3E4" },
  { key:"home_appliances", label:"Home Appliances",  query:"appliances",  color:"#D6F4EC" },
  { key:"accessories",     label:"Accessories",      query:"accessories", color:"#FFF3DB" },
];

const CAT_ICONS = {
  iphones:(<svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="7" y="2" width="10" height="20" rx="2.5"/><circle cx="12" cy="17.5" r="0.8" fill="currentColor" stroke="none"/></svg>),
  laptops:(<svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M1 19h22"/></svg>),
  shoes:(<svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 16s1-1 4-1 5 2 8 2 6-2 8-2v3s-2 2-8 2-8-2-8-2H2v-2z"/><path d="M6 15V9l4-4h4"/></svg>),
  clothing:(<svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 3L3 7l3 2v12h12V9l3-2-6-4c0 1.66-1.34 3-3 3S9 4.66 9 3z"/></svg>),
  kids:(<svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="7" r="4"/><path d="M8 21v-2a4 4 0 0 1 8 0v2"/></svg>),
  game:(<svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="12" rx="4"/><path d="M8 11v4M6 13h4M15 12h2M15 14h2"/></svg>),
  home_appliances:(<svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><circle cx="7" cy="6" r="0.8" fill="currentColor" stroke="none"/><circle cx="11" cy="6" r="0.8" fill="currentColor" stroke="none"/></svg>),
  accessories:(<svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/></svg>),
};

/* Sort options — plan-aware */
const SORT_OPTIONS = [
  ["new",        "New Arrivals"],
  ["trending",   "Trending"],
  ["featured",   "Featured"],
  ["price-asc",  "Price: Low to High"],
  ["price-desc", "Price: High to Low"],
];
const SORT_LABELS = Object.fromEntries(SORT_OPTIONS);

function IconPlus()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IconArrow()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>; }
function IconSearch() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }

const Shop = () => {
  const [params, setParams]           = useSearchParams();
  const [requestModalOpen, setRequest]= useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen]       = useState(false);

  /* ── URL params ── */
  const rawSlot    = params.get("slot");
  const slotParam  = rawSlot ? normalizeHomeFilter(rawSlot) : null;
  const qParam     = (params.get("q") || "").trim();
  const sortParam  = (params.get("sort") || "new").toLowerCase();
  const minParam   = params.get("min") ? Number(params.get("min")) : null;
  const maxParam   = params.get("max") ? Number(params.get("max")) : null;
  const stockParam = params.get("stock") === "1";

  const activeCatKey = NAV_CATEGORIES.find(c => c.query === qParam)?.key || null;

  useEffect(() => {
    document.body.style.overflow = (filtersOpen || sortOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filtersOpen, sortOpen]);

  const [draft, setDraft] = useState(() => ({
    sort: sortParam, min: minParam ?? "", max: maxParam ?? "", stock: stockParam,
  }));
  useEffect(() => {
    setDraft({ sort: sortParam, min: minParam ?? "", max: maxParam ?? "", stock: stockParam });
  }, [sortParam, minParam, maxParam, stockParam]);

  const closePanels = () => { setFiltersOpen(false); setSortOpen(false); };

  /* ── Setters ── */
  const setQ        = (val) => { const n=new URLSearchParams(params); if(!val)n.delete("q"); else n.set("q",val); setParams(n); };
  const clearSearch = ()    => { const n=new URLSearchParams(params); n.delete("q"); setParams(n); };
  const resetSortOnly  = () => { const n=new URLSearchParams(params); n.delete("sort"); setParams(n); };
  const resetPriceOnly = () => { const n=new URLSearchParams(params); n.delete("min"); n.delete("max"); setParams(n); };
  const toggleStock    = (v)=> { const n=new URLSearchParams(params); if(v)n.set("stock","1"); else n.delete("stock"); setParams(n); };

  const clearAll = () => {
    const n = new URLSearchParams(params);
    ["slot","sort","min","max","stock","q"].forEach(k => n.delete(k));
    setParams(n); closePanels();
  };

  const openSort = () => {
    setDraft({ sort:sortParam, min:minParam??"", max:maxParam??"", stock:stockParam });
    setSortOpen(true); setFiltersOpen(false);
  };

  const applySort = () => {
    const next = new URLSearchParams(params);
    if (!draft.sort || draft.sort==="new") next.delete("sort"); else next.set("sort",draft.sort);
    const min = draft.min===""?null:Number(draft.min);
    const max = draft.max===""?null:Number(draft.max);
    if(min!=null&&!Number.isNaN(min)&&min>=0)next.set("min",String(min));else next.delete("min");
    if(max!=null&&!Number.isNaN(max)&&max>=0)next.set("max",String(max));else next.delete("max");
    if(draft.stock)next.set("stock","1");else next.delete("stock");
    setParams(next); setSortOpen(false);
  };

  const clearSortPanel = () => {
    setDraft({ sort:"new", min:"", max:"", stock:false });
    const n = new URLSearchParams(params);
    ["sort","min","max","stock"].forEach(k => n.delete(k));
    setParams(n); setSortOpen(false);
  };

  const hasActiveFilters = !!activeCatKey || !!slotParam || !!qParam;
  const hasActiveSort    = sortParam!=="new" || stockParam || minParam!=null || maxParam!=null;

  const activePills = useMemo(() => {
    const pills = [];
    if (activeCatKey) pills.push({ key:`cat:${activeCatKey}`, label:NAV_CATEGORIES.find(c=>c.key===activeCatKey)?.label||qParam, onRemove:()=>clearSearch() });
    else if (qParam)  pills.push({ key:`q:${qParam}`, label:`Search: ${qParam}`, onRemove:()=>clearSearch() });
    if(sortParam!=="new") pills.push({ key:`sort:${sortParam}`, label:SORT_LABELS[sortParam]||sortParam, onRemove:()=>resetSortOnly() });
    if(minParam!=null||maxParam!=null) pills.push({ key:"price-range", label:`GHS ${minParam??0} – ${maxParam??"∞"}`, onRemove:()=>resetPriceOnly() });
    if(stockParam) pills.push({ key:"stock", label:"In stock", onRemove:()=>toggleStock(false) });
    return pills;
  }, [activeCatKey,qParam,sortParam,minParam,maxParam,stockParam]);

  const filter = useMemo(() => ({
    dept:null, kind:null,
    shop:null, slot:slotParam||null,
    q:qParam||"",
    priceMin:minParam!=null&&!Number.isNaN(minParam)?minParam:null,
    priceMax:maxParam!=null&&!Number.isNaN(maxParam)?maxParam:null,
    inStockOnly:stockParam, featuredOnly:false, sort:sortParam,
  }), [slotParam,qParam,minParam,maxParam,stockParam,sortParam]);

  return (
    <div className="shop-page">

      {(filtersOpen||sortOpen) && (
        <button type="button" className="shop-panel-overlay" aria-label="Close panel" onClick={closePanels}/>
      )}

      <div className="shop-layout">

        {/* ════════════════ SIDEBAR ════════════════ */}
        <aside className={`shop-sidebar${filtersOpen?" sidebar-open":""}`} aria-label="Filters">
          <div className="shop-sidebar-inner">

            <div className="shop-sidebar-head">
              <span className="shop-sidebar-title">Filters</span>
              <div className="shop-sidebar-head-actions">
                {(hasActiveFilters||hasActiveSort) && (
                  <button type="button" className="shop-panel-action" onClick={clearAll}>Clear all</button>
                )}
                <button type="button" className="shop-sidebar-close-btn"
                  onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="shop-sidebar-scroll">

              {/* ── Browse categories (synced with mega menu) ── */}
              <div className="shop-sidebar-section">
                <div className="shop-sidebar-label">Browse</div>
                <div className="shop-sidebar-list">
                  <button type="button"
                    className={!activeCatKey&&!qParam?"sidebar-item active":"sidebar-item"}
                    onClick={() => clearSearch()}>
                    <svg viewBox="0 0 24 24" className="shop-chip-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    All products
                  </button>
                  {NAV_CATEGORIES.map(cat => (
                    <button key={cat.key} type="button"
                      className={activeCatKey===cat.key?"sidebar-item active":"sidebar-item"}
                      onClick={() => setQ(cat.query)}>
                      {CAT_ICONS[cat.key]}
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="shop-sidebar-divider"/>

              {/* ── Sort ── */}
              <div className="shop-sidebar-section">
                <div className="shop-sidebar-label">Sort by</div>
                <div className="shop-radio">
                  {SORT_OPTIONS.map(([v,l]) => (
                    <label key={v} className="shop-radio-item">
                      <input type="radio" name="sidebar-sort" checked={draft.sort===v} onChange={() => setDraft(p=>({...p,sort:v}))}/>
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Price range ── */}
              <div className="shop-sidebar-section">
                <div className="shop-sidebar-label">Price range (GHS)</div>
                <div className="shop-range">
                  <input inputMode="numeric" placeholder="Min" value={draft.min} onChange={e => setDraft(p=>({...p,min:e.target.value}))}/>
                  <span className="shop-range-dash">—</span>
                  <input inputMode="numeric" placeholder="Max" value={draft.max} onChange={e => setDraft(p=>({...p,max:e.target.value}))}/>
                </div>
                <label className="shop-toggle">
                  <input type="checkbox" checked={draft.stock} onChange={e => setDraft(p=>({...p,stock:e.target.checked}))}/>
                  In stock only
                </label>
              </div>

              {/* ── Request product ── */}
              <div className="shop-sidebar-section">
                <div className="shop-sidebar-divider" style={{margin:"0 0 14px"}}/>
                <button type="button" className="shop-sidebar-request-btn" onClick={() => setRequest(true)}>
                  <span className="shop-sidebar-request-icon"><IconPlus/></span>
                  <span className="shop-sidebar-request-text">
                    <span className="shop-sidebar-request-label">Can't find it?</span>
                    <span className="shop-sidebar-request-sub">Request a product</span>
                  </span>
                  <IconArrow/>
                </button>
              </div>

            </div>

            <div className="shop-sidebar-footer">
              {hasActiveSort && <button type="button" className="shop-btn ghost" onClick={clearSortPanel}>Reset</button>}
              <button type="button" className="shop-btn solid shop-sidebar-apply-btn" onClick={applySort}>Apply</button>
            </div>

          </div>
        </aside>

        {/* ════════════════ MAIN ════════════════ */}
        <div className="shop-main">

          <div className="shop-banner-wrap">
            <div className="shop-banner">
              <img src={shopBanner} alt="Beme Market banner" className="shop-banner-img"
                onError={e => { e.currentTarget.style.display="none"; }}/>
              <div className="shop-banner-overlay"/>
              <div className="shop-banner-content">
                <span className="shop-banner-badge">Hot deals</span>
                <h2 className="shop-banner-title">Up to 50% off</h2>
                <p className="shop-banner-sub">Limited time — fashion, tech &amp; more</p>
                <button className="shop-banner-btn" onClick={() => clearSearch()}>
                  Shop now
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Category chips (desktop) */}
          <div className="shop-cat-chips">
            <button className={`shop-cat-chip${!activeCatKey&&!qParam?" shop-cat-chip--active":""}`}
              type="button" onClick={() => clearSearch()}>All</button>
            {NAV_CATEGORIES.map(cat => (
              <button key={cat.key}
                className={`shop-cat-chip${activeCatKey===cat.key?" shop-cat-chip--active":""}`}
                type="button" onClick={() => setQ(cat.query)}>
                {CAT_ICONS[cat.key]}{cat.label}
              </button>
            ))}
          </div>

          {/* Mobile filter/sort bar */}
          <div className="shop-controls">
            <button className="shop-control-btn" type="button"
              onClick={() => { setFiltersOpen(o=>!o); setSortOpen(false); }} aria-expanded={filtersOpen}>
              <span className="shop-control-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="shop-svg"><path d="M4 7h10M18 7h2M4 17h6M14 17h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M14 5v4M10 15v4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
              </span>
              <span>Filter {hasActiveFilters && <span className="shop-dot"/>}</span>
            </button>
            <div className="shop-divider"/>
            <button className="shop-control-btn" type="button" onClick={openSort} aria-expanded={sortOpen}>
              <span className="shop-control-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="shop-svg"><path d="M8 6v12M8 18l-3-3M8 18l3-3M16 6v12M16 6l-3 3M16 6l3 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span>Sort {hasActiveSort && <span className="shop-dot"/>}</span>
            </button>
          </div>

          {/* Active pills */}
          {activePills.length > 0 && (
            <div className="shop-active-pills-wrap">
              <div className="shop-active-pills">
                {activePills.map(pill => (
                  <button key={pill.key} type="button" className="shop-active-pill"
                    onClick={pill.onRemove} aria-label={`Remove ${pill.label}`}>
                    <span>{pill.label}</span>
                    <span className="shop-active-pill-x">×</span>
                  </button>
                ))}
              </div>
              <button type="button" className="shop-active-clearall" onClick={clearAll}>Clear all</button>
            </div>
          )}

          {/* Search request banner */}
          {qParam && !activeCatKey && (
            <div className="shop-request-banner">
              <div className="shop-request-banner-left">
                <div className="shop-request-banner-icon"><IconSearch/></div>
                <div className="shop-request-banner-text">
                  <p className="shop-request-banner-title">Can't find <strong>"{qParam}"</strong>?</p>
                  <p className="shop-request-banner-sub">Submit a request and we'll source it for you</p>
                </div>
              </div>
              <button type="button" className="shop-request-banner-btn" onClick={() => setRequest(true)}>
                <IconPlus/> Request it
              </button>
            </div>
          )}

          <div className="shop-meta">
            <span className="shop-count"><ProductGrid filter={filter} sortBy={filter.sort} withCount/></span>
          </div>

          <ProductGrid filter={filter} sortBy={filter.sort}/>

          <div className="shop-request-strip">
            <div className="shop-request-strip-inner">
              <p className="shop-request-strip-text">Looking for something specific?</p>
              <button type="button" className="shop-request-strip-btn" onClick={() => setRequest(true)}>
                Request a product <IconArrow/>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Sort panel (mobile) */}
      <div className={`shop-panel shop-panel--sort${sortOpen?" open":""}`} aria-hidden={!sortOpen}>
        <div className="shop-panel-inner">
          <div className="shop-panel-head">
            <span className="shop-panel-title">Sort &amp; Price</span>
            <div className="shop-panel-head-actions">
              {hasActiveSort && <button type="button" className="shop-panel-action" onClick={clearSortPanel}>Reset</button>}
              <button type="button" className="shop-panel-action" onClick={() => setSortOpen(false)}>Close</button>
            </div>
          </div>
          <div className="shop-panel-scroll">
            <div className="shop-panel-section">
              <div className="shop-panel-label">Sort</div>
              <div className="shop-radio">
                {SORT_OPTIONS.map(([v,l])=>(
                  <label key={v} className="shop-radio-item">
                    <input type="radio" name="panel-sort" checked={draft.sort===v} onChange={() => setDraft(p=>({...p,sort:v}))}/>
                    {l}
                  </label>
                ))}
              </div>
            </div>
            <div className="shop-panel-section">
              <div className="shop-panel-label">Price range (GHS)</div>
              <div className="shop-range">
                <input inputMode="numeric" placeholder="Min" value={draft.min} onChange={e => setDraft(p=>({...p,min:e.target.value}))}/>
                <span className="shop-range-dash">—</span>
                <input inputMode="numeric" placeholder="Max" value={draft.max} onChange={e => setDraft(p=>({...p,max:e.target.value}))}/>
              </div>
              <label className="shop-toggle">
                <input type="checkbox" checked={draft.stock} onChange={e => setDraft(p=>({...p,stock:e.target.checked}))}/>
                In stock only
              </label>
            </div>
          </div>
          <div className="shop-panel-actions">
            <button type="button" className="shop-btn ghost" onClick={() => setSortOpen(false)}>Cancel</button>
            <button type="button" className="shop-btn solid" onClick={applySort}>Apply</button>
          </div>
        </div>
      </div>

      {requestModalOpen && <ProductRequestModal onClose={() => setRequest(false)}/>}

    </div>
  );
};

export default Shop;
