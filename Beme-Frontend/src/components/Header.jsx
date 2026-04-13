import { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import "./Header.css";

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconBag() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path d="M6 7h12l-1 12H7L6 7z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M21 21l-4.3-4.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg viewBox="0 0 24 24" className="hdr-svg" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

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

/* ── Detects OS/browser colour scheme preference ── */
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

export default function Header({ onMenu, onCart }) {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { cartItems } = useCart();
  const actionLockRef = useRef(false);
  const prefersDark   = usePrefersDark();

  const isHome = location.pathname === "/" || location.pathname === "/home";

  const [searchCollapsed, setSearchCollapsed] = useState(false);
  const [products, setProducts]               = useState([]);
  const [loadingSugs, setLoadingSugs]         = useState(false);
  const [headerSearch, setHeaderSearch]       = useState("");
  const [headerSugOpen, setHeaderSugOpen]     = useState(false);
  const [headerActiveIdx, setHeaderActiveIdx] = useState(-1);

  const inputRef = useRef(null);
  const wrapRef  = useRef(null);

  /* ── Listen to the custom event fired by Home.jsx's window scroll ── */
  useEffect(() => {
    if (!isHome) {
      setSearchCollapsed(false);
      setHeaderSearch("");
      setHeaderSugOpen(false);
      return;
    }

    const handler = (e) => setSearchCollapsed(e.detail.collapsed);
    window.addEventListener("home-search-collapse", handler);

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    setSearchCollapsed(scrollY > 80);

    return () => window.removeEventListener("home-search-collapse", handler);
  }, [isHome]);

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

  /* ── Auto-focus / clear on toggle ── */
  useEffect(() => {
    if (searchCollapsed && isHome) {
      const t = setTimeout(() => inputRef.current?.focus(), 320);
      return () => clearTimeout(t);
    } else {
      setHeaderSearch("");
      setHeaderSugOpen(false);
      setHeaderActiveIdx(-1);
    }
  }, [searchCollapsed, isHome]);

  /* ── Outside click ── */
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
    goToSearch(headerActiveIdx >= 0 && suggestions[headerActiveIdx]
      ? suggestions[headerActiveIdx].value : headerSearch);
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

  const showInlineSearch = isHome && searchCollapsed;

  /* ── Pick the right logo based on OS colour-scheme preference ── */
  const logoSrc = prefersDark ? "/favicon_white.png" : "/favicon_black.png";

  return (
    <header className={`hdr ${showInlineSearch ? "hdr--search-mode" : ""}`}>

      <button className="hdr-icon" onClick={handleMenuOpen} aria-label="Open menu" type="button">
        <IconMenu />
      </button>

      {/* LOGO — fades up when search takes over */}
      <div className={`hdr-logo-wrap ${showInlineSearch ? "hdr-logo-wrap--hidden" : ""}`}>
        <img
          src={logoSrc}
          alt="Beme Market"
          className="hdr-logo"
          draggable={false}
        />
      </div>

      {/* INLINE SEARCH — only rendered on home */}
      {isHome && (
        <div
          ref={wrapRef}
          className={`hdr-inline-search ${showInlineSearch ? "hdr-inline-search--visible" : ""}`}
        >
          <form className="hdr-search-form" onSubmit={handleSubmit}>
            <span className="hdr-search-icon-left">
              <IconSearch />
            </span>
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
              tabIndex={showInlineSearch ? 0 : -1}
            />
            {headerSearch && (
              <button
                type="button"
                className="hdr-search-clear"
                onClick={() => { setHeaderSearch(""); setHeaderSugOpen(false); inputRef.current?.focus(); }}
                tabIndex={showInlineSearch ? 0 : -1}
              >
                <IconClose />
              </button>
            )}
          </form>

          {headerSugOpen && showInlineSearch && (
            <div className="hdr-suggestions">
              {loadingSugs ? (
                <div className="hdr-suggestion-empty">Loading suggestions…</div>
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
                <div className="hdr-suggestion-empty">No matching results.</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="hdr-right">
        <button className="hdr-icon hdr-bag" onClick={handleCartOpen} aria-label="Open cart" type="button">
          <IconBag />
          {count > 0 && <span className="hdr-badge">{count}</span>}
        </button>
      </div>

    </header>
  );
}