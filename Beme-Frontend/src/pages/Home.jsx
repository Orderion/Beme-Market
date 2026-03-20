import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../firebase";
import ProductGrid from "../components/ProductGrid";
import { SHOPS } from "../constants/catalog";
import banner from "../assets/home-banner.png";
import fashionBanner from "../assets/fashion-banner.png";
import kenteBanner from "../assets/kente-banner.png";
import perfumeBanner from "../assets/perfume-banner.png";
import techBanner from "../assets/tech-banner.png";
import "./Home.css";

const COLLECTION_NAME = "Products";
const SEARCH_PREVIEW_LIMIT = 40;
const SUGGESTION_LIMIT = 8;

const CATEGORY_CARDS = [
  {
    key: "phones",
    label: "Phones",
    subtitle: "Smartphones and mobile essentials",
    query: "phones",
  },
  {
    key: "laptops",
    label: "Laptops",
    subtitle: "Portable power for work and study",
    query: "laptop",
  },
  {
    key: "shoes",
    label: "Shoes",
    subtitle: "Sneakers, formal pairs, and daily comfort",
    query: "shoes",
  },
  {
    key: "clothing",
    label: "Clothing",
    subtitle: "Fresh fits and wardrobe staples",
    query: "clothing",
  },
  {
    key: "kids",
    label: "Kids",
    subtitle: "Everyday picks for little ones",
    query: "kids",
  },
  {
    key: "others",
    label: "Others",
    subtitle: "Accessories, extras, and more",
    query: "accessories",
  },
];

function normalizeProduct(docSnap) {
  const d = docSnap.data() || {};

  return {
    id: docSnap.id,
    name: String(d.name || "").trim(),
    description: String(d.description || "").trim(),
    dept: String(d.dept || "").trim(),
    kind: String(d.kind || "").trim(),
    shop: String(d.shop || "").trim().toLowerCase(),
  };
}

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
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
    suggestions.push({
      id: key,
      label: cleanLabel,
      type,
      value: cleanValue,
      score,
    });
  };

  for (const product of products) {
    const name = product.name;
    const description = product.description;
    const dept = product.dept;
    const kind = product.kind;
    const shop = product.shop;

    const nameLc = name.toLowerCase();
    const descLc = description.toLowerCase();
    const deptLc = dept.toLowerCase();
    const kindLc = kind.toLowerCase();
    const shopLc = shop.toLowerCase();

    if (nameLc.startsWith(q)) pushSuggestion(name, "product", name, 100);
    else if (nameLc.includes(q)) pushSuggestion(name, "product", name, 90);

    if (deptLc.startsWith(q)) {
      pushSuggestion(titleize(dept), "department", titleize(dept), 70);
    } else if (deptLc.includes(q)) {
      pushSuggestion(titleize(dept), "department", titleize(dept), 60);
    }

    if (kindLc.startsWith(q)) {
      pushSuggestion(titleize(kind), "type", titleize(kind), 65);
    } else if (kindLc.includes(q)) {
      pushSuggestion(titleize(kind), "type", titleize(kind), 55);
    }

    if (shopLc.startsWith(q)) {
      pushSuggestion(formatShopLabel(shop), "shop", `shop:${shop}`, 68);
    } else if (shopLc.includes(q)) {
      pushSuggestion(formatShopLabel(shop), "shop", `shop:${shop}`, 58);
    }

    if (descLc.includes(q)) {
      const words = description
        .split(/[\s,.;:/()[\]-]+/)
        .map((w) => w.trim())
        .filter(Boolean);

      for (const word of words) {
        const wlc = word.toLowerCase();
        if (wlc.length < 3) continue;
        if (!wlc.includes(q)) continue;
        pushSuggestion(titleize(word), "keyword", word, 40);
      }
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, SUGGESTION_LIMIT);
}

function StoreCard({ image, chip, title, subtitle, onClick, ariaLabel }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className="store-card"
      role="link"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel || title}
    >
      <div className="store-card-media">
        <img src={image} alt={title} className="store-card-image" />
        <span className="store-card-chip">{chip}</span>
      </div>

      <div className="store-card-body">
        <h4 className="store-card-title">{title}</h4>
        <p className="store-card-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

function CategoryIcon({ type }) {
  if (type === "phones") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="category-box-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="7"
          y="2.5"
          width="10"
          height="19"
          rx="2.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M10 5.5h4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <circle cx="12" cy="18.2" r="0.9" fill="currentColor" />
      </svg>
    );
  }

  if (type === "laptops") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="category-box-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="5"
          y="5"
          width="14"
          height="10"
          rx="1.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3.5 18h17"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "shoes") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="category-box-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 15.5c2.2 0 3.3-1.2 4.4-2.4l1.2-1.3c.4 1.8 1.6 3.1 4 3.7l3 .8c1.8.5 2.4 1 2.4 2.2V20H4v-4.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "clothing") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="category-box-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 4l3 2 3-2 3 3-2 3v9H8v-9L6 7l3-3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "kids") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="category-box-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="8"
          r="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M7.5 19v-2.2A3.8 3.8 0 0 1 11.3 13h1.4a3.8 3.8 0 0 1 3.8 3.8V19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="category-box-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 9h8M8 12h8M8 15h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CategoryQuickCard({ item, onClick }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className="category-box"
      role="link"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`Open ${item.label}`}
    >
      <div className="category-box-icon" aria-hidden="true">
        <CategoryIcon type={item.key} />
      </div>

      <div className="category-box-label">{item.label}</div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchWrapRef = useRef(null);
  const closeSuggestionsTimerRef = useRef(null);

  const storeCards = useMemo(
    () => [
      {
        id: "fashion",
        image: fashionBanner,
        chip: "Fashion Shop",
        title: "Modern fashion essentials",
        subtitle: "Clean everyday style and curated wardrobe picks.",
        onClick: () => navigate("/shop?shop=fashion"),
        ariaLabel: "Open Fashion Shop",
      },
      {
        id: "main",
        image: banner,
        chip: "Main Store",
        title: "Everyday bestsellers",
        subtitle: "Mixed essentials, popular picks, and store highlights.",
        onClick: () => navigate("/shop?shop=main"),
        ariaLabel: "Open Main Store",
      },
      {
        id: "kente",
        image: kenteBanner,
        chip: "Ghana Made",
        title: "Mintah's Kente",
        subtitle: "Premium woven styles with heritage appeal.",
        onClick: () => navigate("/shop?shop=kente"),
        ariaLabel: "Open Mintah's Kente collection",
      },
      {
        id: "perfume",
        image: perfumeBanner,
        chip: "Perfume Shop",
        title: "Luxury scents",
        subtitle: "Refined fragrances for daily wear and gifting.",
        onClick: () => navigate("/shop?shop=perfume"),
        ariaLabel: "Open Perfume Shop",
      },
      {
        id: "tech",
        image: techBanner,
        chip: "Tech Shop",
        title: "Latest gadgets",
        subtitle: "Smart devices and modern electronics for daily life.",
        onClick: () => navigate("/shop?shop=tech"),
        ariaLabel: "Open Tech Shop",
      },
    ],
    [navigate]
  );

  useEffect(() => {
    let alive = true;

    async function loadSearchPreviewProducts() {
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

    loadSearchPreviewProducts();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(event.target)) {
        window.clearTimeout(closeSuggestionsTimerRef.current);
        closeSuggestionsTimerRef.current = window.setTimeout(() => {
          setSuggestionsOpen(false);
          setActiveIndex(-1);
        }, 80);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.clearTimeout(closeSuggestionsTimerRef.current);
    };
  }, []);

  const suggestions = useMemo(() => {
    return buildSuggestions(products, search);
  }, [products, search]);

  const goToShop = () => navigate("/shop");

  const goToSearch = (value) => {
    const q = String(value || "").trim();
    setSuggestionsOpen(false);
    setActiveIndex(-1);

    if (!q) {
      navigate("/shop");
      return;
    }

    if (q.startsWith("shop:")) {
      const shopKey = q.replace(/^shop:/, "").trim().toLowerCase();
      navigate(`/shop?shop=${encodeURIComponent(shopKey)}`);
      return;
    }

    navigate(`/shop?q=${encodeURIComponent(q)}`);
  };

  const submitSearch = (e) => {
    e.preventDefault();

    if (activeIndex >= 0 && suggestions[activeIndex]) {
      goToSearch(suggestions[activeIndex].value);
      return;
    }

    goToSearch(search);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    setActiveIndex(-1);
    setSuggestionsOpen(!!value.trim());
  };

  const handleInputFocus = () => {
    if (search.trim()) {
      window.clearTimeout(closeSuggestionsTimerRef.current);
      setSuggestionsOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (!suggestionsOpen || !suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    }

    if (e.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveIndex(-1);
    }
  };

  const goToCategory = (item) => {
    navigate(`/shop?q=${encodeURIComponent(item.query)}`);
  };

  return (
    <div className="home">
      <section className="home-intro">
        <span className="home-brand-mark">Beme Market</span>
        <h1 className="home-headline">Your next find is just a search away</h1>
      </section>

      <div className="search-wrap" ref={searchWrapRef}>
        <form className="search-container" onSubmit={submitSearch}>
          <svg
            className="search-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>

          <input
            type="text"
            placeholder="Search products or stores"
            className="search-input"
            value={search}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            aria-expanded={suggestionsOpen}
            aria-label="Search products"
          />

          <button type="submit" className="search-submit" aria-label="Search">
            <svg
              viewBox="0 0 24 24"
              className="search-filter-icon"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 7h10M18 7h2M4 17h6M14 17h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M14 5v4M10 15v4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </form>

        {suggestionsOpen ? (
          <div className="search-suggestions">
            {loadingSuggestions ? (
              <div className="search-suggestion-empty">Loading suggestions…</div>
            ) : suggestions.length ? (
              suggestions.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    index === activeIndex
                      ? "search-suggestion-item active"
                      : "search-suggestion-item"
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToSearch(item.value)}
                >
                  <div className="search-suggestion-main">{item.label}</div>
                  <div className="search-suggestion-type">{item.type}</div>
                </button>
              ))
            ) : (
              <div className="search-suggestion-empty">
                No matching keywords found.
              </div>
            )}
          </div>
        ) : null}
      </div>

      <section className="section section--categories">
        <div className="category-grid">
          {CATEGORY_CARDS.map((item) => (
            <CategoryQuickCard
              key={item.key}
              item={item}
              onClick={() => goToCategory(item)}
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h3>What’s new on Beme Market</h3>
          <button className="see-all-btn" onClick={goToShop} type="button">
            View all
          </button>
        </div>

        <div className="store-grid">
          {storeCards.map((store) => (
            <StoreCard
              key={store.id}
              image={store.image}
              chip={store.chip}
              title={store.title}
              subtitle={store.subtitle}
              onClick={store.onClick}
              ariaLabel={store.ariaLabel}
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div className="home-trending-head">
            <span className="home-trending-dot" />
            <h3>Trending now</h3>
          </div>

          <button
            className="see-all-btn"
            onClick={() => navigate("/shop?featured=1")}
            type="button"
          >
            See featured
          </button>
        </div>

        <ProductGrid
          sortBy="new"
          filter={{ featuredOnly: true }}
          infinite={false}
        />
      </section>

      <section className="section">
        <div className="section-header">
          <h3>Continue shopping</h3>
          <button className="see-all-btn" onClick={goToShop} type="button">
            See all
          </button>
        </div>

        <ProductGrid
          sortBy="new"
          filter={{ featuredOnly: false }}
          infinite={false}
        />
      </section>
    </div>
  );
}