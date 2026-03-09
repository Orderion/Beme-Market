import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../firebase";
import ProductGrid from "../components/ProductGrid";
import banner from "../assets/home-banner.png";
import kenteBanner from "../assets/kente-banner.png";
import perfumeBanner from "../assets/perfume-banner.png";
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

    const nameLc = name.toLowerCase();
    const descLc = description.toLowerCase();
    const deptLc = dept.toLowerCase();
    const kindLc = kind.toLowerCase();

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
        cta: "View products",
        action: () => navigate("/shop"),
      },
      {
        id: "kente",
        image: kenteBanner,
        badge: "Ghana Made",
        title: "Mintah's Kente Collection",
        cta: "View collection",
        action: () => navigate("/shop?q=kente"),
      },
      {
        id: "perfume",
        image: perfumeBanner,
        badge: "Perfume Shop",
        title: "Luxury scents for every mood",
        cta: "View perfumes",
        action: () => navigate("/shop?q=perfume"),
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
  const goToPerfumeShop = () => navigate("/shop?q=perfume");
  const goToKenteCollection = () => navigate("/shop?q=kente");

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
        Browse categories, offers, and more from the menu.
      </div>

      <section className="hero">
        <img
          key={currentSlide.id}
          src={currentSlide.image}
          alt={currentSlide.title}
          className="hero-image"
        />

        <div className="hero-overlay">
          <span className="badge">{currentSlide.badge}</span>
          <h2>{currentSlide.title}</h2>
          <button className="primary-btn" onClick={currentSlide.action}>
            {currentSlide.cta}
          </button>
        </div>

        <div className="hero-dots" aria-label="Hero slides">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`hero-dot ${index === heroIndex ? "active" : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="kente-card">
          <img
            src={kenteBanner}
            alt="Mintah's Kente collection"
            className="kente-image"
          />

          <div className="kente-overlay">
            <h2>Mintah&apos;s Kente</h2>
            <button className="primary-btn" onClick={goToKenteCollection}>
              View collection
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="perfume-card">
          <img
            src={perfumeBanner}
            alt="Perfume shop collection"
            className="perfume-image"
          />

          <div className="perfume-overlay">
            <span className="perfume-badge">Perfume Shop</span>
            <h2>Luxury scents for every mood</h2>
            <button className="primary-btn" onClick={goToPerfumeShop}>
              View perfumes
            </button>
          </div>
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