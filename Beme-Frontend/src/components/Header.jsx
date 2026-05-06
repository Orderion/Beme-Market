import { useRef, useState, useEffect, useMemo } from "react";
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
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
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

/* ================= SEARCH LOGIC ================= */

const SEARCH_PREVIEW_LIMIT = 80;
const SUGGESTION_LIMIT = 4;

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
    const full = [name, description, shortDescription, brand, dept, kind, shop, homeSlot].filter(Boolean).join(" ").toLowerCase();
    const nl = name.toLowerCase(), bl = brand.toLowerCase(), dl = dept.toLowerCase();
    const kl = kind.toLowerCase(), sl = shop.toLowerCase(), hl = homeSlot.toLowerCase();

    if (nl.startsWith(q))        push(name, "product", name, 100);
    else if (nl.includes(q))     push(name, "product", name, 90);
    if (bl && bl.includes(q))    push(titleize(brand), "brand", brand, 84);
    if (dl.startsWith(q))        push(titleize(dept), "department", titleize(dept), 70);
    else if (dl.includes(q))     push(titleize(dept), "department", titleize(dept), 60);
    if (kl.startsWith(q))        push(titleize(kind), "type", titleize(kind), 65);
    else if (kl.includes(q))     push(titleize(kind), "type", titleize(kind), 55);
    if (hl && hl.includes(q))    push(titleize(homeSlot), "category", homeSlot, 75);
    if (sl.startsWith(q))        push(titleize(shop), "shop", `shop:${shop}`, 68);
    else if (sl.includes(q))     push(titleize(shop), "shop", `shop:${shop}`, 58);

    if (full.includes(q)) {
      full.split(/[\s,.;:/()[\]-]+/).map(w => w.trim()).filter(Boolean).forEach(word => {
        if (word.length >= 3 && word.includes(q)) push(titleize(word), "keyword", word, 40);
      });
    }
  }

  return out.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, SUGGESTION_LIMIT);
}

const TYPE_LABELS = {
  category: "Category", product: "Product", brand: "Brand",
  department: "Dept",   type: "Type",       shop: "Shop", keyword: "Keyword",
};

function usePrefersDark() {
  const [dark, setDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dark;
}

/* ================= COMPONENT ================= */

export default function Header({ onMenu, onCart }) {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { cartItems } = useCart();
  const actionLockRef = useRef(false);
  const prefersDark   = usePrefersDark();

  const isHome = location.pathname === "/" || location.pathname === "/home";

  /*
   * Animation phases (only active on home page):
   *
   * Phase 0 — "default": Logo centred, no search bar visible in header.
   * Phase 1 — "icon":    After scroll > 80px, logo shrinks + slides left to sit
   *                       beside the menu button (becomes a search icon).
   *                       Search bar stays hidden a moment.
   * Phase 2 — "search":  ~300 ms after phase 1, the search bar expands in.
   *
   * On non-home pages we always show the logo and never show the inline search.
   */
  const [animPhase, setAnimPhase] = useState(0); // 0 | 1 | 2

  const [products,      setProducts]      = useState([]);
  const [loadingSugs,   setLoadingSugs]   = useState(false);
  const [headerSearch,  setHeaderSearch]  = useState("");
  const [headerSugOpen, setHeaderSugOpen] = useState(false);
  const [headerActiveIdx, setHeaderActiveIdx] = useState(-1);

  const inputRef = useRef(null);
  const wrapRef  = useRef(null);
  const phaseTimerRef = useRef(null);

  /* ── Scroll listener — only on home ── */
  useEffect(() => {
    if (!isHome) {
      setAnimPhase(0);
      setHeaderSearch("");
      setHeaderSugOpen(false);
      return;
    }

    const checkScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const collapsed = scrollY > 80;

      // Dispatch for Home.jsx sticky bar
      window.dispatchEvent(new CustomEvent("home-search-collapse", { detail: { collapsed } }));

      if (collapsed && animPhase < 1) {
        // Phase 1: icon appears
        setAnimPhase(1);
        clearTimeout(phaseTimerRef.current);
        // Phase 2: search bar expands after delay
        phaseTimerRef.current = setTimeout(() => setAnimPhase(2), 320);
      } else if (!collapsed && animPhase > 0) {
        clearTimeout(phaseTimerRef.current);
        setAnimPhase(0);
        setHeaderSearch("");
        setHeaderSugOpen(false);
        setHeaderActiveIdx(-1);
      }
    };

    window.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll(); // run on mount
    return () => {
      window.removeEventListener("scroll", checkScroll);
      clearTimeout(phaseTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHome, animPhase]);

  /* Focus input when search bar fully expands */
  useEffect(() => {
    if (animPhase === 2) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [animPhase]);

  /* ── Load products for suggestions ── */
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

  /* ── Click-outside suggestions ── */
  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setHeaderSugOpen(false);
        setHeaderActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  const suggestions = useMemo(() => buildSuggestions(products, headerSearch), [products, headerSearch]);
  const count = cartItems?.reduce((sum, i) => sum + Number(i.qty || 1), 0) || 0;

  const pulseLock = () => {
    actionLockRef.current = true;
    setTimeout(() => { actionLockRef.current = false; }, 220);
  };
  const handleMenuOpen = () => { if (!actionLockRef.current) { pulseLock(); onMenu?.(); } };
  const handleCartOpen = () => { if (!actionLockRef.current) { pulseLock(); onCart?.(); } };

  const goToSearch = (value) => {
    const q = String(value || "").trim();
    setHeaderSugOpen(false);
    setHeaderActiveIdx(-1);
    setHeaderSearch("");
    if (!q) { navigate("/shop"); return; }
    if (q.startsWith("shop:")) {
      navigate(`/shop?shop=${encodeURIComponent(q.replace(/^shop:/, "").trim())}`);
      return;
    }
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    goToSearch(
      headerActiveIdx >= 0 && suggestions[headerActiveIdx]
        ? suggestions[headerActiveIdx].value
        : headerSearch
    );
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setHeaderSearch(v);
    setHeaderActiveIdx(-1);
    setHeaderSugOpen(!!v.trim());
  };

  const handleKeyDown = (e) => {
    if (!headerSugOpen || !suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHeaderActiveIdx(p => p < suggestions.length - 1 ? p + 1 : 0); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHeaderActiveIdx(p => p > 0 ? p - 1 : suggestions.length - 1); }
    if (e.key === "Escape")    { setHeaderSugOpen(false); setHeaderActiveIdx(-1); }
  };

  const logoSrc = prefersDark ? "/favicon_white.png" : "/favicon_black.png";

  /* Phase booleans */
  const showIcon   = isHome && animPhase >= 1; // search icon visible beside menu
  const showSearch = isHome && animPhase >= 2; // search bar expanded

  return (
    <header className={`hdr ${showSearch ? "hdr--search-mode" : ""}`}>

      {/* LEFT CLUSTER: menu + animated search icon */}
      <div className="hdr-left">
        <button className="hdr-icon" onClick={handleMenuOpen} aria-label="Open menu" type="button">
          <IconMenu />
        </button>

        {/* Search icon — appears in place of logo after scroll */}
        {isHome && (
          <button
            className={`hdr-icon hdr-search-icon-btn ${showIcon ? "hdr-search-icon-btn--visible" : ""}`}
            onClick={() => { if (animPhase >= 1) inputRef.current?.focus(); }}
            aria-label="Search"
            type="button"
            tabIndex={showIcon ? 0 : -1}
          >
            <IconSearch />
          </button>
        )}
      </div>

      {/* CENTER LOGO — fades + shrinks out as scroll happens */}
      <div className={`hdr-logo-wrap ${showIcon ? "hdr-logo-wrap--hidden" : ""}`}>
        <img
          src={logoSrc}
          alt="Beme Market"
          className="hdr-logo"
          draggable={false}
        />
      </div>

      {/* INLINE SEARCH BAR — expands after icon phase */}
      {isHome && (
        <div
          ref={wrapRef}
          className={`hdr-inline-search ${showSearch ? "hdr-inline-search--visible" : ""}`}
        >
          <form className="hdr-search-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={headerSearch}
              onChange={handleChange}
              onFocus={() => { if (headerSearch.trim()) setHeaderSugOpen(true); }}
              onKeyDown={handleKeyDown}
              placeholder="Search products or stores"
              className="hdr-search-input"
              autoComplete="off"
              tabIndex={showSearch ? 0 : -1}
            />
            {headerSearch && (
              <button
                type="button"
                className="hdr-search-clear"
                onClick={() => {
                  setHeaderSearch("");
                  setHeaderSugOpen(false);
                  inputRef.current?.focus();
                }}
                tabIndex={showSearch ? 0 : -1}
                aria-label="Clear search"
              >
                <IconClose />
              </button>
            )}
            <button
              type="submit"
              className="hdr-search-submit"
              tabIndex={showSearch ? 0 : -1}
              aria-label="Submit search"
            >
              <IconSearch />
            </button>
          </form>

          {headerSugOpen && showSearch && (
            <div className="hdr-suggestions">
              {loadingSugs ? (
                <div className="hdr-suggestion-empty">Loading…</div>
              ) : suggestions.length ? (
                suggestions.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`hdr-suggestion-item ${idx === headerActiveIdx ? "active" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goToSearch(item.value)}
                  >
                    <span className="hdr-sug-label">{item.label}</span>
                    <span className="hdr-sug-type">{TYPE_LABELS[item.type] || item.type}</span>
                  </button>
                ))
              ) : (
                <div className="hdr-suggestion-empty">No results found.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RIGHT: cart */}
      <div className="hdr-right">
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