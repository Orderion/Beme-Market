import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../firebase";
import ProductGrid from "../components/ProductGrid";
import ShopCarousel from "../components/ShopCarousel";
import FlashDealsBanner from "../components/FlashDealsBanner";
import useHomepageConfig from "../hooks/useHomepageConfig";
import { SHOPS } from "../constants/catalog";
import banner from "../assets/home_banner.PNG";
import fashionBanner from "../assets/fashion-banner.PNG";
import kenteBanner from "../assets/kente-banner.PNG";
import perfumeBanner from "../assets/perfume-banner.PNG";
import techBanner from "../assets/tech-banner.PNG";

/* ── Category images ── */
import phoneImg    from "../assets/Phone.JPG";
import laptopImg   from "../assets/Laptop.JPG";
import shoeImg     from "../assets/Shoe.JPG";
import clothingImg from "../assets/Clothing .JPG";
import kidsImg     from "../assets/Kids.JPG";
import gameImg     from "../assets/Game.JPG";
import homeAppImg  from "../assets/Home appliances .JPG";

import "./Home.css";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const COLLECTION_NAME      = "Products";
const SEARCH_PREVIEW_LIMIT = 80;
const SUGGESTION_LIMIT     = 4;

/* Fallback banners keyed by store card id */
const BANNER_FALLBACKS = {
  fashion: fashionBanner,
  main:    banner,
  kente:   kenteBanner,
  perfume: perfumeBanner,
  tech:    techBanner,
};

const HARDCODED_STORE_CARDS = [
  {
    id:        "fashion",
    theme:     "fashion",
    image:     fashionBanner,
    chip:      "Fashion Shop",
    title:     "Modern fashion essentials",
    subtitle:  "Clean everyday style and curated wardrobe picks.",
    shopLink:  "/shop?shop=fashion",
    ariaLabel: "Open Fashion Shop",
  },
  {
    id:        "main",
    theme:     "bestsellers",
    image:     banner,
    chip:      "Main Store",
    title:     "Everyday bestsellers",
    subtitle:  "Mixed essentials, popular picks, and store highlights.",
    shopLink:  "/shop?shop=main",
    ariaLabel: "Open Main Store",
  },
  {
    id:        "kente",
    theme:     "kente",
    image:     kenteBanner,
    chip:      "Ghana Made",
    title:     "Mintah's Kente",
    subtitle:  "Premium woven styles with heritage appeal.",
    shopLink:  "/shop?shop=kente",
    ariaLabel: "Open Mintah's Kente collection",
  },
  {
    id:        "perfume",
    theme:     "scents",
    image:     perfumeBanner,
    chip:      "Perfume Shop",
    title:     "Luxury scents",
    subtitle:  "Refined fragrances for daily wear and gifting.",
    shopLink:  "/shop?shop=perfume",
    ariaLabel: "Open Perfume Shop",
  },
  {
    id:        "tech",
    theme:     "gadgets",
    image:     techBanner,
    chip:      "Tech Shop",
    title:     "Latest gadgets",
    subtitle:  "Smart devices and modern electronics for daily life.",
    shopLink:  "/shop?shop=tech",
    ariaLabel: "Open Tech Shop",
  },
];

const HARDCODED_CATEGORY_CARDS = [
  { key: "iphones",         label: "Iphones",        subtitle: "Smartphones and mobile essentials",         query: "iphone"      },
  { key: "laptops",         label: "Laptops",         subtitle: "Portable power for work and study",         query: "laptop"      },
  { key: "shoes",           label: "Shoes",           subtitle: "Sneakers, formal pairs, and daily comfort", query: "shoes"       },
  { key: "clothing",        label: "Clothing",        subtitle: "Fresh fits and wardrobe staples",           query: "clothing"    },
  { key: "kids",            label: "Kids",            subtitle: "Everyday picks for little ones",            query: "kids"        },
  { key: "game",            label: "Game",            subtitle: "Consoles, accessories, and gaming gear",    query: "game"        },
  { key: "home_appliances", label: "Home Appliances", subtitle: "Essentials for modern living",              query: "appliances"  },
  { key: "others",          label: "Others",          subtitle: "Accessories, extras, and more",             query: "accessories" },
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

const CATEGORY_IMAGES = {
  iphones:         phoneImg,
  laptops:         laptopImg,
  shoes:           shoeImg,
  clothing:        clothingImg,
  kids:            kidsImg,
  game:            gameImg,
  home_appliances: homeAppImg,
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function OthersFallback() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="9" y="8" width="22" height="26" rx="3.5" fill="#D08020"/>
      <rect x="9" y="8" width="22" height="26" rx="3.5" fill="white" fillOpacity="0.12"/>
      <path d="M14 8V6h12v2" stroke="#A06010" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="13" y="16" width="14" height="2" rx="1" fill="#A06010" fillOpacity="0.8"/>
      <rect x="13" y="21" width="14" height="2" rx="1" fill="#A06010" fillOpacity="0.6"/>
      <rect x="13" y="26" width="9"  height="2" rx="1" fill="#A06010" fillOpacity="0.4"/>
      <circle cx="29" cy="10" r="3" fill="#F0C060"/>
    </svg>
  );
}

/* Accepts an explicit src (from Cloudinary) or falls back to local key-based image */
function CategoryImage({ type, label, src }) {
  const resolvedSrc = src || CATEGORY_IMAGES[type];
  if (!resolvedSrc) return <OthersFallback />;
  return (
    <img
      src={resolvedSrc}
      alt={label}
      className="home-cat-img"
      draggable={false}
    />
  );
}

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
        if (word.length < 3 || !word.includes(q)) continue;
        pushSuggestion(titleize(word), "keyword", word, 40);
      }
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, SUGGESTION_LIMIT);
}

/* ─────────────────────────────────────────────
   Home component
───────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();

  /* ── Homepage config from Firestore ── */
  const { config, loading: configLoading } = useHomepageConfig();

  /* ── Search state ── */
  const [search,             setSearch]             = useState("");
  const [products,           setProducts]           = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsOpen,    setSuggestionsOpen]    = useState(false);
  const [activeIndex,        setActiveIndex]        = useState(-1);
  const [searchCollapsed,    setSearchCollapsed]    = useState(false);
  const [activeCat,          setActiveCat]          = useState(null);

  const searchWrapRef = useRef(null);
  const inputRef      = useRef(null);

  /* ── Derive carousel cards from config (or hardcoded fallback) ── */
  const carouselCards = useMemo(() => {
    if (config?.storeCards?.length) {
      return [...config.storeCards]
        .filter((c) => c.active !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((c) => ({
          id:        c.id,
          theme:     c.theme,
          /* Use the Cloudinary URL if uploaded, otherwise fall back to bundled asset */
          image:     c.imageUrl || BANNER_FALLBACKS[c.id] || null,
          chip:      c.chip,
          title:     c.title,
          subtitle:  c.subtitle,
          onClick:   () => navigate(c.shopLink || "/shop"),
          ariaLabel: `Open ${c.chip}`,
        }));
    }
    /* Fallback: hardcoded cards with navigate callbacks */
    return HARDCODED_STORE_CARDS.map((c) => ({
      ...c,
      onClick: () => navigate(c.shopLink),
    }));
  }, [config, navigate]);

  /* ── Derive category cards from config (or hardcoded fallback) ── */
  const categoryCards = useMemo(() => {
    if (config?.categories?.length) {
      return [...config.categories]
        .filter((c) => c.active !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((c) => ({
          key:      c.key,
          label:    c.label,
          subtitle: c.subtitle,
          query:    c.query,
          bgColor:  c.bgColor || CATEGORY_BG[c.key] || "#F1EFE8",
          /* Cloudinary URL takes priority; local asset is fallback */
          resolvedImage: c.imageUrl || CATEGORY_IMAGES[c.key] || null,
        }));
    }
    return HARDCODED_CATEGORY_CARDS.map((c) => ({
      ...c,
      bgColor:       CATEGORY_BG[c.key] || "#F1EFE8",
      resolvedImage: CATEGORY_IMAGES[c.key] || null,
    }));
  }, [config]);

  /* ── Sorted active sections from config ── */
  const activeSections = useMemo(() => {
    if (!config?.sections?.length) {
      return ["carousel", "categories", "flashDeals", "trending", "continueShopping"];
    }
    return [...config.sections]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .filter((s) => s.active !== false)
      .map((s) => s.id);
  }, [config]);

  /* ── Text labels from config ── */
  const trendingText = config?.trendingText  || { heading: "Trending now",       seeAllText: "See featured" };
  const continueText = config?.continueText  || { heading: "Continue shopping",  seeAllText: "See all"      };

  /* ── Load products for search suggestions ── */
  /* FIX: removed where("isCustomRequest", "!=", true) — Firestore's != operator
     silently drops documents where the field doesn't exist, which excluded ALL
     regular products (none of which have the isCustomRequest field). Privacy for
     custom-request products is enforced at the product detail page level instead. */
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoadingSuggestions(true);
      try {
        const qRef = query(
          collection(db, COLLECTION_NAME),
          limit(SEARCH_PREVIEW_LIMIT)
        );
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

  /* ── Click-outside to close suggestions ── */
  useEffect(() => {
    const onPointerDown = (event) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(event.target)) {
        setSuggestionsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown",  onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown",  onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  /* ── Scroll-collapse search bar ── */
  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      const collapsed = scrollY > 80;
      setSearchCollapsed(collapsed);
      window.dispatchEvent(new CustomEvent("home-search-collapse", { detail: { collapsed } }));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Search logic ── */
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

  const handleClear = () => {
    setSearch("");
    setSuggestionsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => { if (search.trim()) setSuggestionsOpen(true); };

  const handleKeyDown = (e) => {
    if (!suggestionsOpen || !suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((p) => (p < suggestions.length - 1 ? p + 1 : 0)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIndex((p) => (p > 0 ? p - 1 : suggestions.length - 1)); }
    if (e.key === "Escape")    { setSuggestionsOpen(false); setActiveIndex(-1); }
  };

  const goToCategory = (item) => navigate(`/shop?q=${encodeURIComponent(item.query)}`);

  /* ── Loading skeleton while config is being fetched ── */
  if (configLoading) {
    return (
      <div className="home-skeleton">
        <div className="home-skeleton-carousel" />
        <div className="home-skeleton-cats">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="home-skeleton-cat" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Section renderers ── */
  const renderSection = (sectionId) => {
    switch (sectionId) {

      case "carousel":
        return (
          <section key="carousel" className="home-section home-section--carousel">
            <ShopCarousel shops={carouselCards} />
          </section>
        );

      case "categories":
        return (
          <section key="categories" className="home-section home-section--cats">
            <div className="home-sec-header">
              <h3>Category</h3>
              <button className="home-see-btn" onClick={goToShop}>See All</button>
            </div>
            <div className="home-cat-scroll">
              {categoryCards.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`home-cat-item ${activeCat === item.key ? "home-cat-item--active" : ""}`}
                  onClick={() => { setActiveCat(item.key); goToCategory(item); }}
                  aria-label={`Browse ${item.label}`}
                >
                  <div
                    className="home-cat-circle"
                    style={{ backgroundColor: item.bgColor }}
                  >
                    <CategoryImage
                      type={item.key}
                      label={item.label}
                      src={item.resolvedImage}
                    />
                  </div>
                  <span className="home-cat-label">{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        );

      case "flashDeals":
        return <FlashDealsBanner key="flashDeals" />;

      case "trending":
        return (
          <section key="trending" className="home-section">
            <div className="home-sec-header">
              <div className="home-trending-head">
                <span className="home-trending-dot" />
                <h3>{trendingText.heading}</h3>
              </div>
              <button className="home-see-btn" onClick={() => navigate("/shop?featured=1")}>
                {trendingText.seeAllText}
              </button>
            </div>
            <ProductGrid sortBy="new" filter={{ featuredOnly: true }} infinite={false} />
          </section>
        );

      case "continueShopping":
        return (
          <section key="continueShopping" className="home-section">
            <div className="home-sec-header">
              <h3>{continueText.heading}</h3>
              <button className="home-see-btn" onClick={goToShop}>
                {continueText.seeAllText}
              </button>
            </div>
            <ProductGrid sortBy="new" filter={{ featuredOnly: false }} infinite={false} />
          </section>
        );

      default:
        return null;
    }
  };

  /* ── Render ── */
  return (
    <div className="home">

      {/* Sticky search bar */}
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
              ref={inputRef}
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

            {search.length > 0 && (
              <button
                type="button"
                className="home-search-clear"
                onClick={handleClear}
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}

            <button type="submit" className="home-search-submit" aria-label="Search">
              <svg viewBox="0 0 24 24" className="home-search-filter-svg">
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

      {/* Render sections in config order */}
      {activeSections.map((id) => renderSection(id))}

    </div>
  );
}