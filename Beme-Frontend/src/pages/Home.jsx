import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../firebase";
import ProductGrid from "../components/ProductGrid";
import ShopCarousel from "../components/ShopCarousel";
import FlashDealsBanner from "../components/FlashDealsBanner";
import { SHOPS } from "../constants/catalog";
import banner from "../assets/home_banner.PNG";
import fashionBanner from "../assets/fashion-banner.PNG";
import kenteBanner from "../assets/kente-banner.png";
import perfumeBanner from "../assets/perfume-banner.png";
import techBanner from "../assets/tech-banner.png";
import "./Home.css";

const COLLECTION_NAME = "Products";
const SEARCH_PREVIEW_LIMIT = 80;
const SUGGESTION_LIMIT = 4;

const CATEGORY_CARDS = [
  { key: "iphones",         label: "Iphones",        subtitle: "Smartphones and mobile essentials",         query: "iphone" },
  { key: "laptops",         label: "Laptops",         subtitle: "Portable power for work and study",         query: "laptop" },
  { key: "shoes",           label: "Shoes",           subtitle: "Sneakers, formal pairs, and daily comfort",  query: "shoes" },
  { key: "clothing",        label: "Clothing",        subtitle: "Fresh fits and wardrobe staples",            query: "clothing" },
  { key: "kids",            label: "Kids",            subtitle: "Everyday picks for little ones",             query: "kids" },
  { key: "game",            label: "Game",            subtitle: "Consoles, accessories, and gaming gear",     query: "game" },
  { key: "home_appliances", label: "Home Appliances", subtitle: "Essentials for modern living",               query: "appliances" },
  { key: "others",          label: "Others",          subtitle: "Accessories, extras, and more",              query: "accessories" },
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

const CATEGORY_BG = {
  iphones:         "#DDEEFF",
  laptops:         "#EAE7FD",
  shoes:           "#FFE8DF",
  clothing:        "#FFE3EE",
  kids:            "#FFF0D6",
  game:            "#DDF3E4",
  home_appliances: "#D6F4EC",
  others:          "#FFF3DB",
};

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

function formatShopLabel(value) {
  const key = String(value || "").trim().toLowerCase();
  const match = SHOPS.find((shop) => shop.key === key);
  if (match?.label) return match.label;
  return titleize(key);
}

function buildSuggestions(products, term) {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set();
  const suggestions = [];

  const pushSuggestion = (label, type, value, score) => {
    const cleanLabel = String(label || "").trim();
    const cleanValue = String(value || "").trim();
    if (!cleanLabel || !cleanValue) return;
    const key = `${type}:${cleanValue.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({ id: key, label: cleanLabel, type, value: cleanValue, score });
  };

  for (const category of CATEGORY_KEYWORDS) {
    const aliasMatch = category.aliases.some((alias) => alias.includes(q));
    const queryMatch = q.includes(category.value);
    if (aliasMatch || queryMatch) pushSuggestion(category.label, category.type, category.value, 200);
  }

  for (const product of products) {
    const { name, description, shortDescription, brand, dept, kind, shop, homeSlot } = product;
    const fullText = [name, description, shortDescription, brand, dept, kind, shop, homeSlot]
      .filter(Boolean).join(" ").toLowerCase();
    const nameLc  = name.toLowerCase();
    const brandLc = brand.toLowerCase();
    const deptLc  = dept.toLowerCase();
    const kindLc  = kind.toLowerCase();
    const shopLc  = shop.toLowerCase();
    const slotLc  = homeSlot.toLowerCase();

    if (nameLc.startsWith(q))           pushSuggestion(name, "product", name, 100);
    else if (nameLc.includes(q))        pushSuggestion(name, "product", name, 90);
    if (brandLc && brandLc.includes(q)) pushSuggestion(titleize(brand), "brand", brand, 84);
    if (deptLc.startsWith(q))           pushSuggestion(titleize(dept), "department", titleize(dept), 70);
    else if (deptLc.includes(q))        pushSuggestion(titleize(dept), "department", titleize(dept), 60);
    if (kindLc.startsWith(q))           pushSuggestion(titleize(kind), "type", titleize(kind), 65);
    else if (kindLc.includes(q))        pushSuggestion(titleize(kind), "type", titleize(kind), 55);
    if (slotLc && slotLc.includes(q))   pushSuggestion(titleize(homeSlot), "category", homeSlot, 75);
    if (shopLc.startsWith(q))           pushSuggestion(formatShopLabel(shop), "shop", `shop:${shop}`, 68);
    else if (shopLc.includes(q))        pushSuggestion(formatShopLabel(shop), "shop", `shop:${shop}`, 58);

    if (fullText.includes(q)) {
      const words = fullText.split(/[\s,.;:/()[\]-]+/).map((w) => w.trim()).filter(Boolean);
      for (const word of words) {
        if (word.length < 3) continue;
        if (!word.includes(q)) continue;
        pushSuggestion(titleize(word), "keyword", word, 40);
      }
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, SUGGESTION_LIMIT);
}

function CategoryIcon({ type }) {
  if (type === "iphones") return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="4" width="16" height="32" rx="3.5" fill="#5BA3E0"/>
      <rect x="14" y="4" width="8" height="3" rx="1.5" fill="#2E6DAB"/>
      <rect x="14" y="10" width="12" height="14" rx="1.5" fill="#A8D0F5"/>
      <rect x="14" y="10" width="12" height="14" rx="1.5" fill="white" fillOpacity="0.25"/>
      <circle cx="20" cy="32" r="1.8" fill="#2E6DAB"/>
      <rect x="16" y="12" width="8" height="1.5" rx="0.75" fill="#5BA3E0" fillOpacity="0.6"/>
      <rect x="16" y="15" width="5" height="1.5" rx="0.75" fill="#5BA3E0" fillOpacity="0.4"/>
    </svg>
  );
  if (type === "laptops") return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="28" height="18" rx="2.5" fill="#7C6FD6"/>
      <rect x="8" y="12" width="24" height="14" rx="1.5" fill="#B8B0F0"/>
      <rect x="8" y="12" width="24" height="14" rx="1.5" fill="white" fillOpacity="0.2"/>
      <path d="M4 30h32" stroke="#7C6FD6" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="15" y="28" width="10" height="2" rx="1" fill="#9B90E0"/>
      <rect x="10" y="15" width="10" height="1.5" rx="0.75" fill="#7C6FD6" fillOpacity="0.5"/>
      <rect x="10" y="18.5" width="7" height="1.5" rx="0.75" fill="#7C6FD6" fillOpacity="0.35"/>
      <rect x="10" y="22" width="12" height="1.5" rx="0.75" fill="#7C6FD6" fillOpacity="0.35"/>
    </svg>
  );
  if (type === "shoes") return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 26c3.5-1 5.5-4.5 7.5-7l2-2.5c.6 3 2.5 5.5 7 7l4.5 1.2c2.5.7 3.5 1.5 3.5 3.3v2.5H7V26z" fill="#E07050"/>
      <path d="M7 26c3.5-1 5.5-4.5 7.5-7l2-2.5c.6 3 2.5 5.5 7 7l4.5 1.2c2.5.7 3.5 1.5 3.5 3.3v2.5H7V26z" fill="white" fillOpacity="0.12"/>
      <path d="M12 28h-2v1.5h2V28z" fill="#C05535"/>
      <path d="M16 27.5c1 .2 2.5.4 4 .5" stroke="#C05535" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M7 26c3.5-1 5.5-4.5 7.5-7l2-2.5" stroke="#C05535" strokeWidth="1.3" strokeLinecap="round"/>
      <ellipse cx="16" cy="16.5" rx="2.5" ry="2" fill="#E07050" fillOpacity="0.6"/>
    </svg>
  );
  if (type === "clothing") return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 7l5 3 5-3 6 5-4 4.5V34H13V16.5L9 12l6-5z" fill="#D4537E"/>
      <path d="M15 7l5 3 5-3 6 5-4 4.5V34H13V16.5L9 12l6-5z" fill="white" fillOpacity="0.15"/>
      <path d="M13 17h14" stroke="#B03060" strokeWidth="1.2"/>
      <path d="M16 22h8M16 26h5" stroke="#B03060" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M17 10.5c1 1.5 2.5 2.5 3 2.5s2-1 3-2.5" stroke="#B03060" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    </svg>
  );
  if (type === "kids") return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="14" r="6.5" fill="#F0A030"/>
      <circle cx="20" cy="14" r="6.5" fill="white" fillOpacity="0.15"/>
      <circle cx="18" cy="13" r="1.5" fill="#C07010"/>
      <circle cx="22" cy="13" r="1.5" fill="#C07010"/>
      <path d="M17.5 16.5c.7.8 1.5 1.2 2.5 1.2s1.8-.4 2.5-1.2" stroke="#C07010" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
      <path d="M14 34v-4a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v4" fill="#F0A030"/>
      <path d="M14 34v-4a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v4" fill="white" fillOpacity="0.15"/>
    </svg>
  );
  if (type === "game") return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="15" width="30" height="14" rx="7" fill="#3DA060"/>
      <rect x="5" y="15" width="30" height="14" rx="7" fill="white" fillOpacity="0.15"/>
      <circle cx="13" cy="22" r="4" fill="#1E7040"/>
      <circle cx="27" cy="22" r="4" fill="#1E7040"/>
      <path d="M11 22h4M13 20v4" stroke="#7FD9A0" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="25" cy="21" r="1.3" fill="#7FD9A0"/>
      <circle cx="29" cy="23" r="1.3" fill="#7FD9A0"/>
      <rect x="19" y="20" width="2" height="4" rx="1" fill="#3DA060" fillOpacity="0.5"/>
    </svg>
  );
  if (type === "home_appliances") return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="6" width="20" height="28" rx="3.5" fill="#1D9E75"/>
      <rect x="10" y="6" width="20" height="28" rx="3.5" fill="white" fillOpacity="0.12"/>
      <rect x="10" y="15" width="20" height="2" fill="#0F6E56"/>
      <circle cx="20" cy="25" r="3.5" fill="#0F6E56"/>
      <circle cx="20" cy="25" r="1.8" fill="#5DCAA5"/>
      <circle cx="15" cy="11" r="1.2" fill="#5DCAA5"/>
      <circle cx="19" cy="11" r="1.2" fill="#5DCAA5"/>
      <circle cx="23" cy="11" r="1.2" fill="#0F6E56"/>
    </svg>
  );
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="8" width="22" height="26" rx="3.5" fill="#D08020"/>
      <rect x="9" y="8" width="22" height="26" rx="3.5" fill="white" fillOpacity="0.12"/>
      <path d="M14 8V6h12v2" stroke="#A06010" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="13" y="16" width="14" height="2" rx="1" fill="#A06010" fillOpacity="0.8"/>
      <rect x="13" y="21" width="14" height="2" rx="1" fill="#A06010" fillOpacity="0.6"/>
      <rect x="13" y="26" width="9" height="2" rx="1" fill="#A06010" fillOpacity="0.4"/>
      <circle cx="29" cy="10" r="3" fill="#F0C060"/>
      <circle cx="29" cy="10" r="1.5" fill="#D08020"/>
    </svg>
  );
}

export default function Home() {
  const navigate = useNavigate();

  const [search, setSearch]                         = useState("");
  const [products, setProducts]                     = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen]       = useState(false);
  const [activeIndex, setActiveIndex]               = useState(-1);
  const [searchCollapsed, setSearchCollapsed]       = useState(false);
  const [activeCat, setActiveCat]                   = useState(null);

  const searchWrapRef = useRef(null);

  const storeCards = useMemo(() => [
    { id: "fashion", image: fashionBanner, chip: "Fashion Shop", title: "Modern fashion essentials",  subtitle: "Clean everyday style and curated wardrobe picks.",      onClick: () => navigate("/shop?shop=fashion"), ariaLabel: "Open Fashion Shop" },
    { id: "main",    image: banner,        chip: "Main Store",   title: "Everyday bestsellers",       subtitle: "Mixed essentials, popular picks, and store highlights.", onClick: () => navigate("/shop?shop=main"),    ariaLabel: "Open Main Store" },
    { id: "kente",   image: kenteBanner,   chip: "Ghana Made",   title: "Mintah's Kente",             subtitle: "Premium woven styles with heritage appeal.",             onClick: () => navigate("/shop?shop=kente"),   ariaLabel: "Open Mintah's Kente collection" },
    { id: "perfume", image: perfumeBanner, chip: "Perfume Shop", title: "Luxury scents",              subtitle: "Refined fragrances for daily wear and gifting.",         onClick: () => navigate("/shop?shop=perfume"), ariaLabel: "Open Perfume Shop" },
    { id: "tech",    image: techBanner,    chip: "Tech Shop",    title: "Latest gadgets",             subtitle: "Smart devices and modern electronics for daily life.",   onClick: () => navigate("/shop?shop=tech"),    ariaLabel: "Open Tech Shop" },
  ], [navigate]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoadingSuggestions(true);
      try {
        const qRef = query(collection(db, COLLECTION_NAME), limit(SEARCH_PREVIEW_LIMIT));
        const snap = await getDocs(qRef);
        if (!alive) return;
        setProducts(snap.docs.map(normalizeProduct));
      } catch (error) {
        console.error("Search preview fetch error:", error);
        if (!alive) return;
        setProducts([]);
      } finally {
        if (alive) setLoadingSuggestions(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(event.target)) {
        setSuggestionsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      const collapsed = scrollY > 80;
      setSearchCollapsed(collapsed);
      window.dispatchEvent(
        new CustomEvent("home-search-collapse", { detail: { collapsed } })
      );
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const suggestions = useMemo(() => buildSuggestions(products, search), [products, search]);
  const goToShop    = () => navigate("/shop");

  const goToSearch = (value) => {
    const q = String(value || "").trim();
    setSuggestionsOpen(false);
    setActiveIndex(-1);
    if (!q) { navigate("/shop"); return; }
    if (q.startsWith("shop:")) {
      navigate(`/shop?shop=${encodeURIComponent(q.replace(/^shop:/, "").trim().toLowerCase())}`);
      return;
    }
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) { goToSearch(suggestions[activeIndex].value); return; }
    goToSearch(search);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    setActiveIndex(-1);
    setSuggestionsOpen(!!value.trim());
  };

  const handleInputFocus = () => { if (search.trim()) setSuggestionsOpen(true); };

  const handleKeyDown = (e) => {
    if (!suggestionsOpen || !suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((p) => (p < suggestions.length - 1 ? p + 1 : 0)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIndex((p) => (p > 0 ? p - 1 : suggestions.length - 1)); }
    if (e.key === "Escape")    { setSuggestionsOpen(false); setActiveIndex(-1); }
  };

  const goToCategory = (item) => navigate(`/shop?q=${encodeURIComponent(item.query)}`);

  return (
    <div className="home">

      {/* ── Sticky search bar ── */}
      <div className={`home-search-sticky ${searchCollapsed ? "home-search-sticky--hidden" : ""}`}>
        <div className="home-search-wrap" ref={searchWrapRef}>
          <form className="home-search-form" onSubmit={submitSearch}>
            <span className="home-search-icon-left">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search products or stores"
              className="home-search-input"
              value={search}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              aria-expanded={suggestionsOpen}
              aria-label="Search products"
            />
            <button type="submit" className="home-search-submit" aria-label="Search">
              <svg viewBox="0 0 24 24" className="home-search-filter-svg" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7h10M18 7h2M4 17h6M14 17h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M14 5v4M10 15v4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </form>

          {suggestionsOpen && (
            <div className="home-suggestions">
              {loadingSuggestions ? (
                <div className="home-suggestion-empty">Loading suggestions…</div>
              ) : suggestions.length ? (
                suggestions.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`home-suggestion-item ${index === activeIndex ? "active" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goToSearch(item.value)}
                  >
                    <div className="home-suggestion-label">{item.label}</div>
                    <div className="home-suggestion-type">{item.type}</div>
                  </button>
                ))
              ) : (
                <div className="home-suggestion-empty">No matching keywords found.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Shop Carousel — top of page ── */}
      <section className="home-section home-section--carousel">
        <ShopCarousel shops={storeCards} />
      </section>

      {/* ── Categories — below carousel ── */}
      <section className="home-section home-section--cats">
        <div className="home-sec-header">
          <h3>Category</h3>
          <button className="home-see-btn" onClick={goToShop}>See All</button>
        </div>
        <div className="home-cat-scroll">
          {CATEGORY_CARDS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`home-cat-item ${activeCat === item.key ? "home-cat-item--active" : ""}`}
              onClick={() => { setActiveCat(item.key); goToCategory(item); }}
              aria-label={`Browse ${item.label}`}
            >
              <div
                className="home-cat-circle"
                style={{ backgroundColor: CATEGORY_BG[item.key] || "#F1EFE8" }}
              >
                <CategoryIcon type={item.key} />
              </div>
              <span className="home-cat-label">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── ⚡ Flash Deals Banner ── */}
      <FlashDealsBanner />

      {/* ── Trending now ── */}
      <section className="home-section">
        <div className="home-sec-header">
          <div className="home-trending-head">
            <span className="home-trending-dot" />
            <h3>Trending now</h3>
          </div>
          <button className="home-see-btn" onClick={() => navigate("/shop?featured=1")}>See featured</button>
        </div>
        <ProductGrid sortBy="new" filter={{ featuredOnly: true }} infinite={false} />
      </section>

      {/* ── Continue shopping ── */}
      <section className="home-section">
        <div className="home-sec-header">
          <h3>Continue shopping</h3>
          <button className="home-see-btn" onClick={goToShop}>See all</button>
        </div>
        <ProductGrid sortBy="new" filter={{ featuredOnly: false }} infinite={false} />
      </section>

    </div>
  );
}