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

/* ===============================================================
   ANIMATION STATES
   ──────────────────────────────────────────────────────────────
   LOGO   → at top of page: logo centred, nothing else
   BAR    → scrolled: logo fades out, full search bar expands in
   ICON   → 5s idle: bar smoothly shrinks into a search icon btn
   REOPEN → user tapped icon: bar smoothly expands again
   =============================================================== */
const S = { LOGO: "logo", BAR: "bar", ICON: "icon", REOPEN: "reopen" };
const IDLE_MS = 5000;

export default function Header({ onMenu, onCart }) {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { cartItems } = useCart();
  const actionLockRef = useRef(false);
  const prefersDark   = usePrefersDark();

  const isHome = location.pathname === "/" || location.pathname === "/home";

  const [anim,       setAnim]       = useState(S.LOGO);
  const [products,   setProducts]   = useState([]);
  const [loadingSugs,setLoadingSugs]= useState(false);
  const [search,     setSearch]     = useState("");
  const [sugOpen,    setSugOpen]    = useState(false);
  const [activeIdx,  setActiveIdx]  = useState(-1);

  const inputRef  = useRef(null);
  const wrapRef   = useRef(null);
  const idleTimer = useRef(null);

  /* ── Restart 5-second idle countdown ── */
  const resetIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setAnim(prev => (prev === S.BAR || prev === S.REOPEN) ? S.ICON : prev);
      setSugOpen(false);
    }, IDLE_MS);
  }, []);

  /* ── Scroll: LOGO → BAR, or back to LOGO ── */
  useEffect(() => {
    if (!isHome) {
      setAnim(S.LOGO);
      setSearch("");
      setSugOpen(false);
      clearTimeout(idleTimer.current);
      return;
    }

    const onScroll = () => {
      const scrolled = (window.scrollY || document.documentElement.scrollTop) > 80;
      window.dispatchEvent(new CustomEvent("home-search-collapse", { detail: { collapsed: scrolled } }));

      if (scrolled) {
        setAnim(prev => {
          if (prev === S.LOGO) {
            // Fresh scroll-in: open bar then start idle timer
            resetIdle();
            return S.BAR;
          }
          return prev; // already bar/icon — don't reset
        });
      } else {
        // Scrolled back to top
        clearTimeout(idleTimer.current);
        setAnim(S.LOGO);
        setSearch("");
        setSugOpen(false);
        setActiveIdx(-1);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(idleTimer.current);
    };
  }, [isHome, resetIdle]);

  /* ── Focus input when bar opens ── */
  useEffect(() => {
    if (anim === S.BAR || anim === S.REOPEN) {
      const t = setTimeout(() => inputRef.current?.focus(), 340);
      return () => clearTimeout(t);
    }
  }, [anim]);

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

  /* ── Click outside → close suggestions ── */
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
  const count = cartItems?.reduce((sum, i) => sum + Number(i.qty || 1), 0) || 0;

  /* ── Button handlers ── */
  const pulseLock = () => {
    actionLockRef.current = true;
    setTimeout(() => { actionLockRef.current = false; }, 220);
  };
  const handleMenuOpen = () => { if (!actionLockRef.current) { pulseLock(); onMenu?.(); } };
  const handleCartOpen = () => { if (!actionLockRef.current) { pulseLock(); onCart?.(); } };

  /* Tapping the search icon → reopen bar */
  const handleIconTap = () => {
    setAnim(S.REOPEN);
    resetIdle();
  };

  const goToSearch = (value) => {
    const q = String(value || "").trim();
    setSugOpen(false);
    setActiveIdx(-1);
    setSearch("");
    if (!q) { navigate("/shop"); return; }
    if (q.startsWith("shop:")) {
      navigate(`/shop?shop=${encodeURIComponent(q.replace(/^shop:/, "").trim())}`);
      return;
    }
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    goToSearch(activeIdx >= 0 && suggestions[activeIdx] ? suggestions[activeIdx].value : search);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setSearch(v);
    setActiveIdx(-1);
    setSugOpen(!!v.trim());
    resetIdle(); // any typing resets the idle timer
  };

  const handleFocus = () => {
    if (search.trim()) setSugOpen(true);
    resetIdle();
  };

  const handleKeyDown = (e) => {
    resetIdle();
    if (!sugOpen || !suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(p => p < suggestions.length - 1 ? p + 1 : 0); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(p => p > 0 ? p - 1 : suggestions.length - 1); }
    if (e.key === "Escape")    { setSugOpen(false); setActiveIdx(-1); }
  };

  /* ── Derived flags ── */
  const isLogo = anim === S.LOGO;
  const isBar  = anim === S.BAR || anim === S.REOPEN;
  const isIcon = anim === S.ICON;

  const logoSrc = prefersDark ? "/favicon_white.png" : "/favicon_black.png";

  return (
    <header className="hdr">

      {/* LEFT: menu */}
      <div className="hdr-left">
        <button className="hdr-icon" onClick={handleMenuOpen} aria-label="Open menu" type="button">
          <IconMenu />
        </button>
      </div>

      {/* CENTRE: the three states live here, layered */}
      <div className="hdr-centre" ref={wrapRef}>

        {/* 1 — Logo */}
        <div className={`hdr-logo-wrap ${!isLogo ? "hdr-logo-wrap--out" : ""}`}
          aria-hidden={!isLogo}>
          <img src={logoSrc} alt="Beme Market" className="hdr-logo" draggable={false} />
        </div>

        {/* 2 — Search bar (BAR + REOPEN states) */}
        {isHome && (
          <div className={`hdr-bar-wrap ${isBar ? "hdr-bar-wrap--open" : ""}`}
            aria-hidden={!isBar}>
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
                  onClick={() => { setSearch(""); setSugOpen(false); inputRef.current?.focus(); resetIdle(); }}
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

            {sugOpen && isBar && (
              <div className="hdr-suggestions">
                {loadingSugs ? (
                  <div className="hdr-suggestion-empty">Loading…</div>
                ) : suggestions.length ? (
                  suggestions.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`hdr-suggestion-item ${idx === activeIdx ? "active" : ""}`}
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

        {/* 3 — Search icon pill (ICON state) */}
        {isHome && (
          <button
            className={`hdr-icon hdr-search-pill ${isIcon ? "hdr-search-pill--visible" : ""}`}
            onClick={handleIconTap}
            aria-label="Open search"
            type="button"
            tabIndex={isIcon ? 0 : -1}
          >
            <IconSearch />
          </button>
        )}

      </div>

      {/* RIGHT: cart */}
      <div className="hdr-right">
        <button className="hdr-icon hdr-bag" onClick={handleCartOpen} aria-label="Open cart" type="button">
          <IconCart />
          {count > 0 && <span className="hdr-badge">{count > 99 ? "99+" : count}</span>}
        </button>
      </div>

    </header>
  );
}