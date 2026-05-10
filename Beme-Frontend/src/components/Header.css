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
    <svg viewBox="0 0 24 24" className="hdr-recent-clock" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}

/* ── Per-category chip icons ── */
function ChipIcon({ value }) {
  const map = {
    iphone: (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="7" y="2" width="10" height="20" rx="2.5"/>
        <circle cx="12" cy="17.5" r="0.8" fill="currentColor" stroke="none"/>
      </svg>
    ),
    clothing: (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M9 3L3 7l3 2v12h12V9l3-2-6-4c0 1.66-1.34 3-3 3S9 4.66 9 3z"/>
      </svg>
    ),
    shoes: (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M2 16s1-1 4-1 5 2 8 2 6-2 8-2v3s-2 2-8 2-8-2-8-2H2v-2z"/>
        <path d="M6 15V9l4-4h4"/>
      </svg>
    ),
    laptop: (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="5" width="18" height="12" rx="1.5"/>
        <path d="M1 19h22"/>
      </svg>
    ),
    game: (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="2" y="7" width="20" height="12" rx="4"/>
        <path d="M8 11v4M6 13h4M15 12h2M15 14h2"/>
      </svg>
    ),
    appliances: (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18"/>
        <circle cx="7" cy="6" r="0.8" fill="currentColor" stroke="none"/>
        <circle cx="11" cy="6" r="0.8" fill="currentColor" stroke="none"/>
      </svg>
    ),
    kids: (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="7" r="4"/>
        <path d="M8 21v-2a4 4 0 0 1 8 0v2"/>
      </svg>
    ),
    accessories: (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="3"/>
        <circle cx="12" cy="12" r="9"/>
      </svg>
    ),
  };
  const icon = map[value];
  if (!icon) return null;
  return <span className="hdr-sug-chip-icon">{icon}</span>;
}

/* ================= CONSTANTS ================= */
const SEARCH_PREVIEW_LIMIT = 80;
const SUGGESTION_LIMIT     = 5;
const MAX_RECENT           = 5;
const RECENT_KEY           = "beme_recent_searches";

const QUICK_CATEGORIES = [
  { label: "Phones",      value: "iphone"      },
  { label: "Fashion",     value: "clothing"    },
  { label: "Shoes",       value: "shoes"       },
  { label: "Laptops",     value: "laptop"      },
  { label: "Gaming",      value: "game"        },
  { label: "Appliances",  value: "appliances"  },
  { label: "Kids",        value: "kids"        },
  { label: "Accessories", value: "accessories" },
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

/* ================= HELPERS ================= */
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
    .replace(/\b\w/g, (m) => m.toUpperCase());
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
    if (cat.aliases.some((a) => a.includes(q)) || q.includes(cat.value))
      push(cat.label, cat.type, cat.value, 200);
  }

  for (const p of products) {
    const { name, description, shortDescription, brand, dept, kind, shop, homeSlot } = p;
    const full = [name, description, shortDescription, brand, dept, kind, shop, homeSlot]
      .filter(Boolean).join(" ").toLowerCase();
    const nl = name.toLowerCase(), bl = brand.toLowerCase(), dl = dept.toLowerCase();
    const kl = kind.toLowerCase(), sl = shop.toLowerCase(), hl = homeSlot.toLowerCase();

    if (nl.startsWith(q))       push(name, "product", name, 100);
    else if (nl.includes(q))    push(name, "product", name, 90);
    if (bl && bl.includes(q))   push(titleize(brand), "brand", brand, 84);
    if (dl.startsWith(q))       push(titleize(dept), "department", titleize(dept), 70);
    else if (dl.includes(q))    push(titleize(dept), "department", titleize(dept), 60);
    if (kl.startsWith(q))       push(titleize(kind), "type", titleize(kind), 65);
    else if (kl.includes(q))    push(titleize(kind), "type", titleize(kind), 55);
    if (hl && hl.includes(q))   push(titleize(homeSlot), "category", homeSlot, 75);
    if (sl.startsWith(q))       push(titleize(shop), "shop", `shop:${shop}`, 68);
    else if (sl.includes(q))    push(titleize(shop), "shop", `shop:${shop}`, 58);

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

/* ── localStorage helpers ── */
function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
  catch { return []; }
}
function saveRecent(list) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch {}
}
function addRecent(list, term) {
  const t = String(term || "").trim();
  if (!t) return list;
  const next = [t, ...list.filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT);
  saveRecent(next);
  return next;
}
function removeRecent(list, term) {
  const next = list.filter(x => x !== term);
  saveRecent(next);
  return next;
}

function usePrefersDark() {
  const [dark, setDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = (e) => setDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return dark;
}

/* ── Animation states ── */
const S = { LOGO: "logo", BAR: "bar", ICON: "icon", REOPEN: "reopen" };
const IDLE_MS = 5000;

/* ===============================================================
   COMPONENT
   =============================================================== */
export default function Header({ onMenu, onCart }) {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { cartItems } = useCart();
  const actionLockRef = useRef(false);
  const prefersDark   = usePrefersDark();

  const isHome = location.pathname === "/" || location.pathname === "/home";

  const [anim,           setAnim]           = useState(S.LOGO);
  const [products,       setProducts]       = useState([]);
  const [loadingSugs,    setLoadingSugs]    = useState(false);
  const [search,         setSearch]         = useState("");
  const [sugOpen,        setSugOpen]        = useState(false);
  const [activeIdx,      setActiveIdx]      = useState(-1);
  const [isFocused,      setIsFocused]      = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => loadRecent());

  /* Derived booleans */
  const isLogo       = anim === S.LOGO;
  const isBar        = anim === S.BAR || anim === S.REOPEN;
  const isIcon       = anim === S.ICON;
  const isTyping     = search.trim().length > 0;
  const showDropdown = sugOpen && isBar;

  const inputRef  = useRef(null);
  const wrapRef   = useRef(null);
  const idleTimer = useRef(null);

  /* ── Idle timer ── */
  const resetIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (!isFocused && !search.trim()) {
      idleTimer.current = setTimeout(() => {
        setAnim(prev => (prev === S.BAR || prev === S.REOPEN) ? S.ICON : prev);
        setSugOpen(false);
      }, IDLE_MS);
    }
  }, [isFocused, search]);

  /* ── Scroll: LOGO → BAR ── */
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
      window.dispatchEvent(new CustomEvent("home-search-collapse", { detail: { collapsed: scrolled } }));

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

  /* ── Manage idle timer ── */
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

  /* ── Fetch products for suggestions ── */
  useEffect(() => {
    if (!isHome) return;
    let alive = true;
    (async () => {
      setLoadingSugs(true);
      try {
        const snap = await getDocs(query(collection(db, "Products"), limit(SEARCH_PREVIEW_LIMIT)));
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
    const onDown = (e) => {
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

  const suggestions = useMemo(() => buildSuggestions(products, search), [products, search]);
  const cartCount   = cartItems?.reduce((sum, i) => sum + Number(i.qty || 1), 0) || 0;

  /* ── Navigate to search result ── */
  const goToSearch = useCallback((value) => {
    const q = String(value || "").trim();
    setSugOpen(false);
    setActiveIdx(-1);

    if (q && !q.startsWith("shop:")) {
      setRecentSearches(prev => addRecent(prev, q));
    }

    setSearch("");
    setIsFocused(false);

    if (!q)                    { navigate("/shop"); return; }
    if (q.startsWith("shop:")) {
      navigate(`/shop?shop=${encodeURIComponent(q.replace(/^shop:/, "").trim())}`);
      return;
    }
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  }, [navigate]);

  const handleRemoveRecent = useCallback((e, term) => {
    e.stopPropagation();
    setRecentSearches(prev => removeRecent(prev, term));
  }, []);

  /* ── Form / input handlers ── */
  const handleSubmit = (e) => {
    e.preventDefault();
    const picked = activeIdx >= 0 && suggestions[activeIdx]
      ? suggestions[activeIdx].value : search;
    goToSearch(picked);
  };

  const handleChange  = (e) => { setSearch(e.target.value); setActiveIdx(-1); setSugOpen(true); };
  const handleFocus   = ()  => { setIsFocused(true);  setSugOpen(true); };
  const handleBlur    = ()  => { setIsFocused(false); };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    if (isTyping && suggestions.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(p => p < suggestions.length - 1 ? p + 1 : 0); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(p => p > 0 ? p - 1 : suggestions.length - 1); }
    }
    if (e.key === "Escape") { setSugOpen(false); setActiveIdx(-1); }
  };

  /* ── Button lock ── */
  const pulseLock      = () => { actionLockRef.current = true; setTimeout(() => { actionLockRef.current = false; }, 220); };
  const handleMenuOpen = () => { if (!actionLockRef.current) { pulseLock(); onMenu?.(); } };
  const handleCartOpen = () => { if (!actionLockRef.current) { pulseLock(); onCart?.(); } };
  /* Re-open search bar from idle icon */
  const handleIconTap  = () => { setAnim(S.REOPEN); setIsFocused(false); };

  /*
    LOGO PATH FIX:
    - "Favicon-white.PNG" is the actual coloured/dark logo → shown on light backgrounds
    - "Favicon-black.PNG" is the white/light logo           → shown on dark backgrounds
  */
  const logoSrc = prefersDark ? "/Favicon-black.PNG" : "/Favicon-white.PNG";

  /* ══════════════════════════════════════════
     DROPDOWN
  ══════════════════════════════════════════ */
  const renderDropdown = () => {
    if (!showDropdown) return null;

    /* ── Typing: show suggestions ── */
    if (isTyping) {
      return (
        <div className="hdr-suggestions">
          {loadingSugs ? (
            <div className="hdr-suggestion-empty">Loading…</div>
          ) : suggestions.length ? (
            <>
              {suggestions.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className={`hdr-suggestion-item ${idx === activeIdx ? "active" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToSearch(item.value)}
                >
                  <span className={`hdr-sug-type hdr-sug-type--${item.type}`}>
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                  <span className="hdr-sug-label">{item.label}</span>
                </button>
              ))}
              <button
                type="button"
                className="hdr-sug-more"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goToSearch(search)}
              >
                <span>Search for &ldquo;{search}&rdquo;</span>
                <span className="hdr-sug-more-arrow"><IconArrowRight /></span>
              </button>
            </>
          ) : (
            <>
              <div className="hdr-suggestion-empty">No results for &ldquo;{search}&rdquo;</div>
              <button
                type="button"
                className="hdr-sug-more"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goToSearch(search)}
              >
                <span>Search anyway</span>
                <span className="hdr-sug-more-arrow"><IconArrowRight /></span>
              </button>
            </>
          )}
        </div>
      );
    }

    /* ── Idle / focused: category chips + recent searches ── */
    return (
      <div className="hdr-suggestions">
        <div className="hdr-sug-section-label">I&apos;M LOOKING FOR</div>
        <div className="hdr-sug-chips">
          {QUICK_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              className="hdr-sug-chip"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => goToSearch(cat.value)}
            >
              <ChipIcon value={cat.value} />
              {cat.label}
            </button>
          ))}
        </div>

        {recentSearches.length > 0 && (
          <>
            <div className="hdr-sug-section-label">RECENT SEARCHES</div>
            {recentSearches.map((term) => (
              <div
                key={term}
                className="hdr-recent-item"
                role="button"
                tabIndex={0}
                onClick={() => goToSearch(term)}
                onKeyDown={(e) => e.key === "Enter" && goToSearch(term)}
              >
                <div className="hdr-recent-left">
                  <IconClock />
                  <span className="hdr-recent-text">{term}</span>
                </div>
                <button
                  type="button"
                  className="hdr-recent-remove"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleRemoveRecent(e, term)}
                  aria-label={`Remove ${term}`}
                >
                  ×
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <header className={`hdr ${isIcon ? "hdr--has-pill" : ""}`}>

      {/* Col 1 — Menu */}
      <button className="hdr-icon" onClick={handleMenuOpen} aria-label="Open menu" type="button">
        <IconMenu />
      </button>

      {/* Logo — absolutely centred across full header width */}
      <div
        className={`hdr-logo-wrap ${!isLogo ? "hdr-logo-wrap--out" : ""}`}
        aria-hidden={!isLogo}
      >
        <img src={logoSrc} alt="Beme Market" className="hdr-logo" draggable={false} />
      </div>

      {/* Col 2 — Search bar */}
      <div className="hdr-centre" ref={wrapRef}>
        {isHome && (
          <div
            className={`hdr-bar-wrap ${isBar ? "hdr-bar-wrap--open" : ""}`}
            aria-hidden={!isBar}
          >
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
                aria-label="Search products"
                aria-expanded={showDropdown}
              />

              {search && (
                <button
                  type="button"
                  className="hdr-search-clear"
                  onClick={() => { setSearch(""); setSugOpen(true); inputRef.current?.focus(); }}
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

            {renderDropdown()}
          </div>
        )}
      </div>

      {/* Col 3 — Right buttons */}
      <div className="hdr-right">
        {isHome && isIcon && (
          <button
            className="hdr-icon hdr-search-pill"
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
          {cartCount > 0 && (
            <span className="hdr-badge">{cartCount > 99 ? "99+" : cartCount}</span>
          )}
        </button>
      </div>

    </header>
  );
}