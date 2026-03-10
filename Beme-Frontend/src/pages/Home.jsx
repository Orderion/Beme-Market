import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../firebase";
import ProductGrid from "../components/ProductGrid";
import banner from "../assets/home-banner.png";
import fashionBanner from "../assets/fashion-banner.png";
import kenteBanner from "../assets/kente-banner.png";
import perfumeBanner from "../assets/perfume-banner.png";
import techBanner from "../assets/tech-banner.png";
import "./Home.css";

const COLLECTION_NAME = "Products";
const SEARCH_PREVIEW_LIMIT = 40;
const SUGGESTION_LIMIT = 8;
const HERO_SLIDE_INTERVAL = 5000;

function normalizeProduct(doc) {
  const d = doc.data() || {};

  return {
    id: doc.id,
    name: String(d.name || "").trim(),
    description: String(d.description || "").trim(),
    dept: String(d.dept || "").trim(),
    kind: String(d.kind || "").trim(),
    shop: String(d.shop || "").trim(),
  };
}

function titleize(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildSuggestions(products, term) {
  const q = term.trim().toLowerCase();
  if (!q) return [];

  const seen = new Set();
  const suggestions = [];

  const pushSuggestion = (label, type, value, score) => {
    const cleanLabel = String(label || "").trim();
    const cleanValue = String(value || "").trim().toLowerCase();

    if (!cleanLabel || !cleanValue) return;

    const key = `${type}:${cleanValue}`;
    if (seen.has(key)) return;

    seen.add(key);
    suggestions.push({
      id: key,
      label: cleanLabel,
      type,
      value: cleanLabel,
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
      pushSuggestion(titleize(shop), "shop", titleize(shop), 68);
    } else if (shopLc.includes(q)) {
      pushSuggestion(titleize(shop), "shop", titleize(shop), 58);
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

function BannerLinkCard({
  image,
  chip,
  title,
  subtitle,
  align = "left",
  tone = "",
  onClick,
  ariaLabel,
}) {
  const className = [
    "shop-banner",
    align === "center" ? "shop-banner--center" : "shop-banner--left",
    tone ? `shop-banner--${tone}` : "",
  ]
    .join(" ")
    .trim();

  const overlayClassName =
    align === "center"
      ? "shop-banner-overlay shop-banner-overlay--center"
      : "shop-banner-overlay shop-banner-overlay--left";

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={className}
      role="link"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel || title}
    >
      <img src={image} alt={title} className="shop-banner-image" />

      <div className={overlayClassName}>
        <span className="shop-banner-chip">{chip}</span>
        <h2>{title}</h2>
        {subtitle ? <p className="shop-banner-copy">{subtitle}</p> : null}
      </div>
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
  const [heroIndex, setHeroIndex] = useState(0);

  const searchWrapRef = useRef(null);

  const heroSlides = useMemo(
    () => [
      {
        id: "new-arrivals",
        image: banner,
        badge: "New Season",
        title: "New Arrival 2026",
        subtitle: "Fresh pieces, modern essentials, and standout finds.",
        action: () => navigate("/shop"),
      },
      {
        id: "fashion",
        image: fashionBanner,
        badge: "Fashion Shop",
        title: "Modern fashion for every day",
        subtitle: "Elevated style, clean looks, and curated wardrobe essentials.",
        action: () => navigate("/shop?shop=fashion"),
      },
      {
        id: "kente",
        image: kenteBanner,
        badge: "Ghana Made",
        title: "Mintah's Kente Collection",
        subtitle: "Traditional beauty with premium presentation.",
        action: () => navigate("/shop?shop=kente"),
      },
      {
        id: "perfume",
        image: perfumeBanner,
        badge: "Perfume Shop",
        title: "Luxury scents for every mood",
        subtitle: "Refined fragrances for daily wear and special moments.",
        action: () => navigate("/shop?shop=perfume"),
      },
      {
        id: "tech",
        image: techBanner,
        badge: "Tech Shop",
        title: "Latest gadgets for modern living",
        subtitle: "Smart devices, clean design, everyday performance.",
        action: () => navigate("/shop?shop=tech"),
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
    if (heroSlides.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, HERO_SLIDE_INTERVAL);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const suggestions = useMemo(() => {
    return buildSuggestions(products, search);
  }, [products, search]);

  const currentSlide = heroSlides[heroIndex];

  const goToShop = () => navigate("/shop");
  const goToFashionShop = () => navigate("/shop?shop=fashion");
  const goToMainStore = () => navigate("/shop?shop=main");
  const goToPerfumeShop = () => navigate("/shop?shop=perfume");
  const goToKenteCollection = () => navigate("/shop?shop=kente");
  const goToTechShop = () => navigate("/shop?shop=tech");

  const goToSearch = (value) => {
    const q = String(value || "").trim();
    setSuggestionsOpen(false);
    setActiveIndex(-1);
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
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
    if (search.trim()) setSuggestionsOpen(true);
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

  const goToSlide = (index) => {
    setHeroIndex(index);
  };

  const activateHeroSlide = () => {
    currentSlide.action?.();
  };

  return (
    <div className="home">
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
            placeholder="Search products"
            className="search-input"
            value={search}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            aria-expanded={suggestionsOpen}
            aria-label="Search products"
          />

          <button type="submit" className="search-submit">
            Search
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

      <div className="home-note">
        Browse categories, featured shops, and trending products from one place.
      </div>

      <section
        className="hero hero--interactive"
        role="link"
        tabIndex={0}
        onClick={activateHeroSlide}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activateHeroSlide();
          }
        }}
        aria-label={currentSlide.title}
      >
        <img
          key={currentSlide.id}
          src={currentSlide.image}
          alt={currentSlide.title}
          className="hero-image"
        />

        <div className="hero-overlay">
          <span className="badge">{currentSlide.badge}</span>
          <h2>{currentSlide.title}</h2>
          <p className="hero-copy">{currentSlide.subtitle}</p>
          <span className="hero-link-pill">Explore now</span>
        </div>

        <div className="hero-dots" aria-label="Hero slides">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`hero-dot ${index === heroIndex ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h3>Shop by store</h3>
        </div>

        <div className="shop-banner-grid">
          <BannerLinkCard
            image={fashionBanner}
            chip="Fashion Shop"
            title="Modern fashion essentials"
            subtitle="Clean everyday style, curated for confident dressing."
            align="left"
            tone="fashion"
            onClick={goToFashionShop}
            ariaLabel="Open Fashion Shop"
          />

          <BannerLinkCard
            image={banner}
            chip="Main Store"
            title="Everyday bestsellers"
            subtitle="Browse mixed essentials, standout finds, and store highlights."
            align="left"
            tone="main"
            onClick={goToMainStore}
            ariaLabel="Open Main Store"
          />

          <BannerLinkCard
            image={kenteBanner}
            chip="Ghana Made"
            title="Mintah's Kente"
            subtitle="Signature woven styles with premium presentation."
            align="center"
            tone="kente"
            onClick={goToKenteCollection}
            ariaLabel="Open Mintah's Kente collection"
          />

          <BannerLinkCard
            image={perfumeBanner}
            chip="Perfume Shop"
            title="Luxury scents for every mood"
            subtitle="Discover refined fragrances for daily wear and gifting."
            align="left"
            tone="perfume"
            onClick={goToPerfumeShop}
            ariaLabel="Open Perfume Shop"
          />

          <BannerLinkCard
            image={techBanner}
            chip="Tech Shop"
            title="Latest gadgets. Endless innovation."
            subtitle="Smart devices and modern electronics for everyday life."
            align="left"
            tone="tech"
            onClick={goToTechShop}
            ariaLabel="Open Tech Shop"
          />
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
          <button className="see-all-btn" onClick={goToShop}>
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