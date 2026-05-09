import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import "./Header.css";

/* ================= ICONS ================= */
function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.3-4.3"/>
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" width="14" height="14" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  );
}

/* ================= CONSTANTS ================= */
const SEARCH_PREVIEW_LIMIT = 80;
const SUGGESTION_LIMIT     = 5;
const MAX_RECENT           = 5;
const RECENT_KEY           = "beme_recent_searches";

/* Quick-pick category chips shown when search bar is focused but empty */
const QUICK_CATEGORIES = [
  { label: "Phones",     value: "iphone"     },
  { label: "Fashion",    value: "clothing"   },
  { label: "Shoes",      value: "shoes"      },
  { label: "Laptops",    value: "laptop"     },
  { label: "Gaming",     value: "game"       },
  { label: "Appliances", value: "appliances" },
  { label: "Kids",       value: "kids"       },
  { label: "Perfume",    value: "accessories"},
];

const CATEGORY_KEYWORDS = [
  { label: "Iphones",         type: "category", value: "iphone",      aliases: ["phone","phones","iphone","android","mobile","smartphone","tecno","infinix","samsung","itel","pixel","ipad","tablet"] },
  { label: "Laptops",         type: "category", value: "laptop",      aliases: ["laptop","laptops","macbook","notebook","computer","pc","dell","hp","lenovo","acer","asus"] },
  { label: "Shoes",           type: "category", value: "shoes",       aliases: ["shoe","shoes","sneaker","sneakers","slides","sandals","heels","boots","slippers","airforce","air force"] },
  { label: "Clothing",        type: "category", value: "clothing",    aliases: ["clothing","clothes","fashion","shirt","shirts","dress","dresses","hoodie","hoodies","trousers","jeans","top","tops"] },
  { label: "Kids",            type: "category", value: "kids",        aliases: ["kids","kid","children","child","baby","babies","toddler","infant"] },
  { label: "Game",            type: "category", value: "game",        aliases: ["game","games","gaming","console","ps5","playstation","xbox","controller","controllers","nintendo","gaming pad","joystick"] },
  { label: "Home Appliances", type: "category", value: "appliances",  aliases: ["appliance","appliances","home appliance","fridge","refrigerator","microwave","blender","kettle","tv","television","fan","air conditioner","ac","washing machine","iron"] },
  { label: "Accessories",     type: "category", value: "accessories", aliases: ["accessories","accessory","watch","bag","bags","power bank","speaker","perfume","cosmetics","others"] },
];

const TYPE_LABELS = {
  category:   "Category",
  product:    "Product",
  brand:      "Brand",
  department: "Dept",
  type:       "Type",
  shop:       "Shop",
  keyword:    "Keyword",
};

/* ─── Helpers ─── */
function normalizeProduct(docSnap) {
  const d = docSnap.data() || {};
  return {
    id:               docSnap.id,
    name:             String(d.name             || "").trim(),
    description:      String(d.description      || "").trim(),
    shortDescription: String(d.shortDescription || d.short_description || "").trim(),
    brand:            String(d.brand            || "").trim(),
    dept:             String(d.dept             || "").trim(),
    kind:             String(d.kind             || "").trim(),
    shop:             String(d.shop             || "").trim().toLowerCase(),
    homeSlot:         String(d.homeSlot || d.home_filter || d.homeFilter || d.slot || "").trim().toLowerCase(),
  };
}

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
    .replace(/\b\w/g, m => m.toUpperCase());
}

function buildSuggestions(products, term) {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set();
  const out  = [];

  const push = (label, type, value, score) => {
    const l = String(label || "").trim();
    const v = String(value || "").trim();
    if (!l || !v) return;
    const key = `${type}:${v.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ id: key, label: l, type, value: v, score });
  };

  for (const cat of CATEGORY_KEYWORDS) {
    if (cat.aliases.some(a => a.includes(q)) || q.includes(cat.value))
      push(cat.label, cat.type, cat.value, 200);
  }

  for (const p of products) {
    const { name, description, shortDescription, brand, dept, kind, shop, homeSlot } = p;
    const full = [name, description, shortDescription, brand, dept, kind, shop, homeSlot]
      .filter(Boolean).join(" ").toLowerCase();
    const nl = name.toLowerCase(), bl = brand.toLowerCase(), dl = dept.toLowerCase();
    const kl = kind.toLowerCase(), sl = shop.toLowerCase(), hl = homeSlot.toLowerCase();

    if (nl.startsWith(q))        push(name,              "product",    name,              100);
    else if (nl.includes(q))     push(name,              "product",    name,               90);
    if (bl && bl.includes(q))    push(titleize(brand),   "brand",      brand,              84);
    if (dl.startsWith(q))        push(titleize(dept),    "department", titleize(dept),      70);
    else if (dl.includes(q))     push(titleize(dept),    "department", titleize(dept),      60);
    if (kl.startsWith(q))        push(titleize(kind),    "type",       titleize(kind),      65);
    else if (kl.includes(q))     push(titleize(kind),    "type",       titleize(kind),      55);
    if (hl && hl.includes(q))    push(titleize(homeSlot),"category",   homeSlot,            75);
    if (sl.startsWith(q))        push(titleize(shop),    "shop",       `shop:${shop}`,      68);
    else if (sl.includes(q))     push(titleize(shop),    "shop",       `shop:${shop}`,      58);

    if (full.includes(q)) {
      full.split(/[\s,.;:/()[\]-]+/).map(w => w.trim()).filter(Boolean).forEach(word => {
        if (word.length >= 3 && word.includes(q)) push(titleize(word), "keyword", word, 40);
      });
    }
  }

  return out
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, SUGGESTION_LIMIT);
}

function usePrefersDark() {
  const [dark, setDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = e => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dark;
}

/* ═══════════════════════════════════════════════
   ANIMATION STATES
   LOGO   → at top: logo centred, search hidden
   BAR    → scrolled: logo fades, search bar opens
   ICON   → 5 s idle: bar shrinks to icon on right
   REOPEN → tap icon: bar expands again
═══════════════════════════════════════════════ */
const S = { LOGO: "logo", BAR: "bar", ICON: "icon", REOPEN: "reopen" };
const IDLE_MS = 5000;

export default function Header({ onMenu, onCart }) {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { cartItems } = useCart();
  const actionLockRef = useRef(false);
  const prefersDark   = usePrefersDark();

  const isHome = location.pathname === "/" || location.pathname === "/home";

  const [anim,        setAnim]        = useState(S.LOGO);
  const [products,    setProducts]    = useState([]);
  const [loadingSugs, setLoadingSugs] = useState(false);
  const [search,      setSearch]      = useState("");
  const [sugOpen,     setSugOpen]     = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const [isFocused,   setIsFocused]   = useState(false);

  /* ── Recent searches (persisted in localStorage) ── */
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
    catch { return []; }
  });

  const saveSearch = useCallback((term) => {
    const t = String(term || "").trim();
    if (!t || t.startsWith("shop:")) return;
    setRecentSearches(prev => {
      const next = [t, ...prev.filter(s => s.toLowerCase() !== t.toLowerCase())]
        .slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeRecent = useCallback((term, e) => {
    e?.stopPropagation();
    setRecentSearches(prev => {
      const next = prev.filter(s => s !== term);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const inputRef  = useRef(null);
  const wrapRef   = useRef(null);
  const idleTimer = useRef(null);

  /* ── Idle timer — collapses bar to icon after IDLE_MS of inactivity ── */
  const resetIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (!isFocused && !search.trim()) {
      idleTimer.current = setTimeout(() => {
        setAnim(prev => (prev === S.BAR || prev === S.REOPEN) ? S.ICON : prev);
        setSugOpen(false);
      }, IDLE_MS);
    }
  }, [isFocused, search]);

  /* ── Scroll handler: LOGO → BAR ── */
  useEffect(() => {
    if (!isHome) {
      setAnim(S.LOGO);
      setSearch("");
      setSugOpen(false);
      setIsFocused(false);
      clearTimeout(idleTimer.current);
      return;
    }

    const onScroll = () => {
      const scrolled = (window.scrollY || document.documentElement.scrollTop) > 80;
      window.dispatchEvent(
        new CustomEvent("home-search-collapse", { detail: { collapsed: scrolled } })
      );
      if (scrolled) {
        setAnim(prev => prev === S.LOGO ? S.BAR : prev);
      } else {
        clearTimeout(idleTimer.current);
        setAnim(S.LOGO);
        setSearch("");
        setSugOpen(false);
        setActiveIdx(-1);
        setIsFocused(false);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(idleTimer.current);
    };
  }, [isHome]);

  /* ── Stop/start idle timer based on focus/search activity ── */
  useEffect(() => {
    if (isFocused || search.trim()) {
      clearTimeout(idleTimer.current);
    } else if (anim === S.BAR || anim === S.REOPEN) {
      resetIdle();
    }
  }, [isFocused, search, anim, resetIdle]);

  /* ── Auto-focus input when bar opens ── */
  useEffect(() => {
    if (anim === S.BAR || anim === S.REOPEN) {
      const t = setTimeout(() => inputRef.current?.focus(), 340);
      return () => clearTimeout(t);
    }
  }, [anim]);

  /* ── Fetch products for suggestion engine ── */
  useEffect(() => {
    if (!isHome) return;
    let alive = true;
    (async () => {
      setLoadingSugs(true);
      try {
        const snap = await getDocs(
          query(collection(db, "Products"), limit(SEARCH_PREVIEW_LIMIT))
        );
        if (alive) setProducts(snap.docs.map(normalizeProduct));
      } catch (e) {
        console.error("Header suggestion fetch:", e);
      } finally {
        if (alive) setLoadingSugs(false);
      }
    })();
    return () => { alive = false; };
  }, [isHome]);

  /* ── Click outside → close dropdown ── */
  useEffect(() => {
    const onDown = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setSugOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  /* ── Derived ── */
  const suggestions = useMemo(
    () => buildSuggestions(products, search),
    [products, search]
  );
  const count  = cartItems?.reduce((sum, i) => sum + Number(i.qty || 1), 0) || 0;
  const isLogo = anim === S.LOGO;
  const isBar  = anim === S.BAR || anim === S.REOPEN;
  const isIcon = anim === S.ICON;

  /*
   * Dropdown visibility:
   *   showEmpty       → focused, no text → show chips + recent searches
   *   showSuggestions → typing          → show suggestion items
   */
  const showEmpty       = isFocused && !search.trim();
  const showSuggestions = !!search.trim() && sugOpen;
  const dropdownOpen    = isBar && (showEmpty || showSuggestions);

  const logoSrc = prefersDark ? "/favicon_white.png" : "/favicon_black.png";

  /* ── Action handlers ── */
  const pulseLock    = () => {
    actionLockRef.current = true;
    setTimeout(() => { actionLockRef.current = false; }, 220);
  };
  const handleMenuOpen = () => { if (!actionLockRef.current) { pulseLock(); onMenu?.(); } };
  const handleCartOpen = () => { if (!actionLockRef.current) { pulseLock(); onCart?.(); } };
  const handleIconTap  = () => { setAnim(S.REOPEN); setIsFocused(false); };

  const goToSearch = (value) => {
    const q = String(value || "").trim();
    setSugOpen(false);
    setActiveIdx(-1);
    setSearch("");
    setIsFocused(false);
    if (!q) { navigate("/shop"); return; }
    saveSearch(q);                          // save every real query
    if (q.startsWith("shop:")) {
      navigate(`/shop?shop=${encodeURIComponent(q.replace(/^shop:/, "").trim())}`);
      return;
    }
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  };

  const handleSubmit = e => {
    e.preventDefault();
    goToSearch(
      activeIdx >= 0 && suggestions[activeIdx]
        ? suggestions[activeIdx].value
        : search
    );
  };

  const handleChange = e => {
    const v = e.target.value;
    setSearch(v);
    setActiveIdx(-1);
    setSugOpen(!!v.trim());
  };

  const handleFocus = () => {
    setIsFocused(true);
    setSugOpen(true);       // open dropdown to show chips/recent even if empty
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleKeyDown = e => {
    if (!sugOpen || !suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(p => p < suggestions.length - 1 ? p + 1 : 0); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(p => p > 0 ? p - 1 : suggestions.length - 1); }
    if (e.key === "Escape")    { setSugOpen(false); setActiveIdx(-1); }
  };

  /* ────────────────────────────────────────────
     RENDER
     Header uses display:flex (see Header.css).
     Search pill is ONLY rendered in ICON state
     so right side = single cart button in LOGO
     state, matching the left (menu) width →
     logo in hdr-centre appears truly centred.
  ──────────────────────────────────────────── */
  return (
    <header className="hdr">

      {/* ══ LEFT: Menu ══ */}
      <button
        className="hdr-icon"
        onClick={handleMenuOpen}
        aria-label="Open menu"
        type="button"
      >
        <IconMenu />
      </button>

      {/* ══ CENTRE: Logo + Search bar ══ */}
      <div className="hdr-centre" ref={wrapRef}>

        {/* Logo — centred inside hdr-centre */}
        <div
          className={`hdr-logo-wrap ${!isLogo ? "hdr-logo-wrap--out" : ""}`}
          aria-hidden={!isLogo}
        >
          <img
            src={logoSrc}
            alt="Beme Market"
            className="hdr-logo"
            draggable={false}
          />
        </div>

        {/* Search bar — home page only */}
        {isHome && (
          <div
            className={`hdr-bar-wrap ${isBar ? "hdr-bar-wrap--open" : ""}`}
            aria-hidden={!isBar}
          >
            {/* ── Search form ── */}
            <form className="hdr-search-form" onSubmit={handleSubmit}>
              <span className="hdr-search-icon-left" aria-hidden="true">
                <IconSearch />
              </span>

              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="Search products or stores"
                className="hdr-search-input"
                autoComplete="off"
                tabIndex={isBar ? 0 : -1}
              />

              {search && (
                <button
                  type="button"
                  className="hdr-search-clear"
                  onClick={() => {
                    setSearch("");
                    setSugOpen(false);
                    inputRef.current?.focus();
                  }}
                  tabIndex={isBar ? 0 : -1}
                  aria-label="Clear search"
                >
                  <IconClose />
                </button>
              )}

              <button
                type="submit"
                className="hdr-search-submit"
                tabIndex={isBar ? 0 : -1}
                aria-label="Search"
              >
                <IconSearch />
              </button>
            </form>

            {/* ════════════════════════════════════════
                DROPDOWN
                ─ Empty/focused  → chips + recent
                ─ Typing         → suggestions + more
            ════════════════════════════════════════ */}
            {dropdownOpen && (
              <div className="hdr-suggestions" role="listbox">

                {/* ── IDLE STATE: category chips + recent searches ── */}
                {showEmpty && (
                  <>
                    {/* Quick category chips */}
                    <div className="hdr-sug-section-label">I'M LOOKING FOR</div>
                    <div className="hdr-sug-chips">
                      {QUICK_CATEGORIES.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          className="hdr-sug-chip"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => goToSearch(cat.value)}
                          role="option"
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Recent searches — only if there are any */}
                    {recentSearches.length > 0 && (
                      <>
                        <div className="hdr-sug-section-label">RECENT SEARCHES</div>
                        {recentSearches.map(term => (
                          <div key={term} className="hdr-recent-item">
                            <button
                              type="button"
                              className="hdr-recent-left"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => goToSearch(term)}
                              aria-label={`Search again for ${term}`}
                            >
                              <span className="hdr-recent-clock">
                                <IconClock />
                              </span>
                              <span className="hdr-recent-text">{term}</span>
                            </button>
                            <button
                              type="button"
                              className="hdr-recent-remove"
                              onMouseDown={e => e.preventDefault()}
                              onClick={e => removeRecent(term, e)}
                              aria-label={`Remove ${term} from recent searches`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}

                {/* ── TYPING STATE: suggestions + show more ── */}
                {showSuggestions && (
                  <>
                    {loadingSugs ? (
                      <div className="hdr-suggestion-empty">Loading…</div>
                    ) : suggestions.length > 0 ? (
                      <>
                        {suggestions.map((item, idx) => (
                          <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={idx === activeIdx}
                            className={`hdr-suggestion-item ${idx === activeIdx ? "active" : ""}`}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => goToSearch(item.value)}
                          >
                            {/* Coloured badge on the LEFT */}
                            <span className={`hdr-sug-type hdr-sug-type--${item.type}`}>
                              {TYPE_LABELS[item.type] || item.type}
                            </span>
                            <span className="hdr-sug-label">{item.label}</span>
                          </button>
                        ))}

                        {/* Show more footer */}
                        <button
                          type="button"
                          className="hdr-sug-more"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => goToSearch(search)}
                        >
                          <span>See all results for &quot;{search}&quot;</span>
                          <span className="hdr-sug-more-arrow">→</span>
                        </button>
                      </>
                    ) : (
                      <div className="hdr-suggestion-empty">
                        No results found for &quot;{search}&quot;
                      </div>
                    )}
                  </>
                )}

              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ RIGHT: Search icon pill (ICON state only) + Cart ══
          KEY: search pill is only rendered in ICON state.
          In LOGO state → right = cart only (40px) = same as
          left (menu 40px) → hdr-centre is symmetric → logo centred. */}
      <div className="hdr-right">
        {isHome && isIcon && (
          <button
            className="hdr-icon hdr-search-pill hdr-search-pill--visible"
            onClick={handleIconTap}
            aria-label="Open search"
            type="button"
          >
            <IconSearch />
          </button>
        )}

        <button
          className="hdr-icon hdr-bag"
          onClick={handleCartOpen}
          aria-label="Open cart"
          type="button"
        >
          <IconCart />
          {count > 0 && (
            <span className="hdr-badge">{count > 99 ? "99+" : count}</span>
          )}
        </button>
      </div>

    </header>
  );
}