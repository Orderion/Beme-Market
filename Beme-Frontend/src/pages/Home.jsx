import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, getDocs, limit, orderBy, query, where
} from "firebase/firestore";
import { db } from "../firebase";
import ProductGrid from "../components/ProductGrid";
import ShopCarousel from "../components/ShopCarousel";
import FlashDealsBanner from "../components/FlashDealsBanner";
import TrendingCard from "../components/TrendingCard";
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
const COLLECTION_NAME = "Products";
const TRENDING_LIMIT  = 20;

const BANNER_FALLBACKS = {
  fashion: fashionBanner,
  main:    banner,
  kente:   kenteBanner,
  perfume: perfumeBanner,
  tech:    techBanner,
};

const HARDCODED_STORE_CARDS = [
  { id: "fashion", theme: "fashion",     image: fashionBanner, chip: "Fashion Shop",   title: "Modern fashion essentials",    subtitle: "Clean everyday style and curated wardrobe picks.",       shopLink: "/shop?shop=fashion", ariaLabel: "Open Fashion Shop" },
  { id: "main",    theme: "bestsellers", image: banner,        chip: "Main Store",     title: "Everyday bestsellers",         subtitle: "Mixed essentials, popular picks, and store highlights.", shopLink: "/shop?shop=main",    ariaLabel: "Open Main Store" },
  { id: "kente",   theme: "kente",       image: kenteBanner,   chip: "Ghana Made",     title: "Mintah's Kente",               subtitle: "Premium woven styles with heritage appeal.",             shopLink: "/shop?shop=kente",   ariaLabel: "Open Mintah's Kente collection" },
  { id: "perfume", theme: "scents",      image: perfumeBanner, chip: "Perfume Shop",   title: "Luxury scents",                subtitle: "Refined fragrances for daily wear and gifting.",         shopLink: "/shop?shop=perfume", ariaLabel: "Open Perfume Shop" },
  { id: "tech",    theme: "gadgets",     image: techBanner,    chip: "Latest gadgets", title: "Latest gadgets",               subtitle: "Smart devices and modern electronics for daily life.",   shopLink: "/shop?shop=tech",    ariaLabel: "Open Tech Shop" },
];

const HARDCODED_CATEGORY_CARDS = [
  { key: "iphones",         label: "Iphones",         subtitle: "Smartphones and mobile essentials",         query: "iphone"      },
  { key: "laptops",         label: "Laptops",         subtitle: "Portable power for work and study",         query: "laptop"      },
  { key: "shoes",           label: "Shoes",           subtitle: "Sneakers, formal pairs, and daily comfort", query: "shoes"       },
  { key: "clothing",        label: "Clothing",        subtitle: "Fresh fits and wardrobe staples",           query: "clothing"    },
  { key: "kids",            label: "Kids",            subtitle: "Everyday picks for little ones",            query: "kids"        },
  { key: "game",            label: "Game",            subtitle: "Consoles, accessories, and gaming gear",    query: "game"        },
  { key: "home_appliances", label: "Home APLC",       subtitle: "Essentials for modern living",              query: "appliances"  },
  { key: "others",          label: "Others",          subtitle: "Accessories, extras, and more",             query: "accessories" },
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

function CategoryImage({ type, label, src }) {
  const resolvedSrc = src || CATEGORY_IMAGES[type];
  if (!resolvedSrc) return <OthersFallback />;
  return (
    <img src={resolvedSrc} alt={label} className="home-cat-img" draggable={false} />
  );
}

function normalizeTrendingDoc(docSnap) {
  const d = docSnap.data() || {};
  const price = Number(d.price ?? d.Price ?? 0) || 0;
  const rawOldPrice = d.oldPrice ?? d.oldprice ?? null;
  const images = Array.isArray(d.images)
    ? d.images.map((i) => String(i || "").trim()).filter(Boolean)
    : [];
  if (!images.length && d.image) images.push(String(d.image).trim());
  return {
    id: docSnap.id,
    ...d,
    price,
    oldPrice: rawOldPrice !== null && rawOldPrice !== undefined && rawOldPrice !== ""
      ? Number(rawOldPrice) || null
      : null,
    image: images[0] || "",
    images,
    inStock:  typeof d.inStock  === "boolean" ? d.inStock  : true,
    featured: typeof d.featured === "boolean" ? d.featured : false,
    shop:     String(d.shop || "").toLowerCase().trim(),
    homeSlot: String(d.homeSlot || d.home_filter || d.homeFilter || d.slot || "others").toLowerCase().trim(),
    createdAt: d.createdAt ?? null,
  };
}

/* ─────────────────────────────────────────────
   Loading Skeleton
───────────────────────────────────────────── */
function HomeSkeleton() {
  return (
    <div className="home-skeleton-full">
      {/* Carousel stub */}
      <div className="home-sk-carousel" aria-hidden="true">
        <div className="home-sk-carousel-inner" />
        <div className="home-sk-carousel-dots">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`home-sk-dot ${i === 0 ? "home-sk-dot--active" : ""}`} />
          ))}
        </div>
      </div>

      {/* Categories stub — mobile only */}
      <div className="home-sk-section home-sk-section--mobile-only">
        <div className="home-sk-header">
          <div className="home-sk-heading" />
          <div className="home-sk-pill" />
        </div>
        <div className="home-sk-cat-row">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="home-sk-cat">
              <div className="home-sk-cat-circle" />
              <div className="home-sk-cat-label" />
            </div>
          ))}
        </div>
      </div>

      {/* Trending stub */}
      <div className="home-sk-section">
        <div className="home-sk-header">
          <div className="home-sk-heading" />
          <div className="home-sk-pill" />
        </div>
        <div className="home-sk-trending-row">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="home-sk-trending-card">
              <div className="home-sk-trending-img" />
              <div className="home-sk-trending-body">
                <div className="home-sk-line" />
                <div className="home-sk-line home-sk-line--short" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product grid stub */}
      <div className="home-sk-section">
        <div className="home-sk-header">
          <div className="home-sk-heading" />
          <div className="home-sk-pill" />
        </div>
        <div className="home-sk-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="home-sk-product">
              <div className="home-sk-product-img" />
              <div className="home-sk-product-body">
                <div className="home-sk-line" />
                <div className="home-sk-line home-sk-line--short" />
                <div className="home-sk-line home-sk-line--tiny" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Home component
───────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const { config, loading: configLoading } = useHomepageConfig();

  const [activeCat, setActiveCat] = useState(null);

  /* ── Trending products state ── */
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [trendingLoading,  setTrendingLoading]  = useState(true);

  /* ── Carousel cards ── */
  const carouselCards = useMemo(() => {
    if (config?.storeCards?.length) {
      return [...config.storeCards]
        .filter((c) => c.active !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((c) => ({
          id:        c.id,
          theme:     c.theme,
          image:     c.imageUrl || BANNER_FALLBACKS[c.id] || null,
          chip:      c.chip,
          title:     c.title,
          subtitle:  c.subtitle,
          onClick:   () => navigate(c.shopLink || "/shop"),
          ariaLabel: `Open ${c.chip}`,
        }));
    }
    return HARDCODED_STORE_CARDS.map((c) => ({ ...c, onClick: () => navigate(c.shopLink) }));
  }, [config, navigate]);

  /* ── Category cards ── */
  const categoryCards = useMemo(() => {
    if (config?.categories?.length) {
      return [...config.categories]
        .filter((c) => c.active !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((c) => ({
          key:           c.key,
          label:         c.label,
          subtitle:      c.subtitle,
          query:         c.query,
          bgColor:       c.bgColor || CATEGORY_BG[c.key] || "#F1EFE8",
          resolvedImage: c.imageUrl || CATEGORY_IMAGES[c.key] || null,
        }));
    }
    return HARDCODED_CATEGORY_CARDS.map((c) => ({
      ...c,
      bgColor:       CATEGORY_BG[c.key] || "#F1EFE8",
      resolvedImage: CATEGORY_IMAGES[c.key] || null,
    }));
  }, [config]);

  /* ── Active sections ── */
  const activeSections = useMemo(() => {
    if (!config?.sections?.length) {
      return ["carousel", "categories", "flashDeals", "trending", "continueShopping"];
    }
    return [...config.sections]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .filter((s) => s.active !== false)
      .map((s) => s.id);
  }, [config]);

  const trendingText = config?.trendingText || { heading: "Trending now",      seeAllText: "See featured" };
  const continueText = config?.continueText || { heading: "Continue shopping", seeAllText: "See all"      };

  /* ── Load trending (featured) products ── */
  useEffect(() => {
    let alive = true;
    async function loadTrending() {
      setTrendingLoading(true);
      try {
        const qRef = query(
          collection(db, COLLECTION_NAME),
          where("featured", "==", true),
          orderBy("createdAt", "desc"),
          limit(TRENDING_LIMIT)
        );
        const snap = await getDocs(qRef);
        if (!alive) return;
        setTrendingProducts(snap.docs.map(normalizeTrendingDoc));
      } catch {
        try {
          const qRef2 = query(
            collection(db, COLLECTION_NAME),
            where("featured", "==", true),
            limit(TRENDING_LIMIT)
          );
          const snap2 = await getDocs(qRef2);
          if (!alive) return;
          setTrendingProducts(snap2.docs.map(normalizeTrendingDoc));
        } catch (e2) {
          console.error("Trending fetch error:", e2);
          if (!alive) return;
          setTrendingProducts([]);
        }
      } finally {
        if (alive) setTrendingLoading(false);
      }
    }
    loadTrending();
    return () => { alive = false; };
  }, []);

  const goToShop    = () => navigate("/shop");
  const goToCategory = (item) => navigate(`/shop?q=${encodeURIComponent(item.query)}`);

  /* ── Loading ── */
  if (configLoading) return <HomeSkeleton />;

  /* ── Section renderers ── */
  const renderSection = (sectionId) => {
    switch (sectionId) {

      case "carousel":
        return (
          <section key="carousel" className="home-section home-section--carousel">
            <ShopCarousel shops={carouselCards} />
          </section>
        );

      /* Categories: visible on mobile only — desktop sees them in the nav mega-menu */
      case "categories":
        return (
          <section key="categories" className="home-section home-section--cats home-section--mobile-cats">
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
                  <div className="home-cat-circle" style={{ backgroundColor: item.bgColor }}>
                    <CategoryImage type={item.key} label={item.label} src={item.resolvedImage} />
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

            {trendingLoading ? (
              <div className="home-trending-row">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="home-sk-trending-card">
                    <div className="home-sk-trending-img" />
                    <div className="home-sk-trending-body">
                      <div className="home-sk-line" />
                      <div className="home-sk-line home-sk-line--short" />
                    </div>
                  </div>
                ))}
              </div>
            ) : trendingProducts.length === 0 ? (
              <div className="home-trending-empty">No trending picks yet.</div>
            ) : (
              <div className="home-trending-row">
                {trendingProducts.map((product) => (
                  <TrendingCard key={product.id} product={product} />
                ))}
              </div>
            )}
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
      {activeSections.map((id) => renderSection(id))}
    </div>
  );
}