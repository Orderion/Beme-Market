import { useRef, useState, useCallback, useEffect } from "react";
import "./ShopCarousel.css";

/* ════════════════════════════════════════════════════════════════════
   ICON — Heart
   ════════════════════════════════════════════════════════════════════ */
function IconHeart({ filled }) {
  return (
    <svg viewBox="0 0 24 24" className="sc-heart-svg">
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={filled ? "#e86c2c" : "none"}
        stroke={filled ? "#e86c2c" : "rgba(255,255,255,0.5)"}
        strokeWidth="2"
      />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   KENTE — multi-directional slim lines
   ════════════════════════════════════════════════════════════════════ */
function KenteSVG() {
  const W = 420, H = 190;
  const hLines = [
    { y: 22,  color: "#CC0000", delay: "0s",    period: 28, amp: 4 },
    { y: 50,  color: "#FFD700", delay: "0.10s", period: 20, amp: 3 },
    { y: 80,  color: "#006B3F", delay: "0.22s", period: 28, amp: 4 },
    { y: 110, color: "#CC0000", delay: "0.06s", period: 20, amp: 3 },
    { y: 140, color: "#FFD700", delay: "0.18s", period: 28, amp: 4 },
    { y: 168, color: "#006B3F", delay: "0.14s", period: 20, amp: 3 },
  ];
  const vLines = [
    { x: 70,  color: "#FFD700", delay: "0.12s", period: 22, amp: 3 },
    { x: 160, color: "#CC0000", delay: "0.26s", period: 26, amp: 4 },
    { x: 260, color: "#006B3F", delay: "0.38s", period: 22, amp: 3 },
    { x: 355, color: "#FFD700", delay: "0.20s", period: 26, amp: 4 },
  ];
  const dLines = [
    { d: "M -10,38 L 310,190",  color: "#CC0000", delay: "0.30s" },
    { d: "M 115,0 L 430,155",   color: "#006B3F", delay: "0.44s" },
    { d: "M 0,132 L 205,0",     color: "#FFD700", delay: "0.36s" },
    { d: "M 220,190 L 420,82",  color: "#CC0000", delay: "0.52s" },
  ];
  const buildH = ({ y, period, amp }) => {
    let d = `M 0 ${y}`; let x = 0; let up = true; const hp = period / 2;
    while (x < W) { const cx = x + hp / 2; const cy = up ? y - amp : y + amp; const ex = Math.min(x + hp, W); d += ` Q ${cx},${cy} ${ex},${y}`; x = ex; up = !up; }
    return d;
  };
  const buildV = ({ x, period, amp }) => {
    let d = `M ${x} 0`; let y = 0; let right = true; const hp = period / 2;
    while (y < H) { const cy = y + hp / 2; const cx = right ? x + amp : x - amp; const ey = Math.min(y + hp, H); d += ` Q ${cx},${cy} ${x},${ey}`; y = ey; right = !right; }
    return d;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="sc-kente-svg" aria-hidden="true">
      {hLines.map((s, i) => (<path key={`h${i}`} d={buildH(s)} stroke={s.color} strokeWidth="1.8" fill="none" strokeOpacity="0.65" strokeLinecap="round" className="sc-kente-path" style={{ animationDelay: s.delay }} />))}
      {vLines.map((s, i) => (<path key={`v${i}`} d={buildV(s)} stroke={s.color} strokeWidth="1.5" fill="none" strokeOpacity="0.55" strokeLinecap="round" className="sc-kente-path" style={{ animationDelay: s.delay }} />))}
      {dLines.map((s, i) => (<path key={`d${i}`} d={s.d} stroke={s.color} strokeWidth="1.4" fill="none" strokeOpacity="0.45" strokeLinecap="round" className="sc-kente-path" style={{ animationDelay: s.delay }} />))}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   FASHION — curtain panels
   ════════════════════════════════════════════════════════════════════ */
function CurtainOverlay({ color }) {
  return (
    <div className="sc-curtain" aria-hidden="true">
      <div className="sc-curtain-left"  style={{ background: color }} />
      <div className="sc-curtain-right" style={{ background: color }} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   BESTSELLERS — ink stamp + counter
   ════════════════════════════════════════════════════════════════════ */
function StampOverlay() {
  return (
    <div className="sc-stamp-wrap" aria-hidden="true">
      <div className="sc-stamp">
        <div className="sc-stamp-ring">
          <div className="sc-stamp-body">
            <span className="sc-stamp-top">DEALS UP TO</span>
            <div className="sc-stamp-counter-clip">
              <div className="sc-stamp-counter">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>
            <span className="sc-stamp-star">★ OFF ★</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SCENTS — translucent clouds from all directions
   ════════════════════════════════════════════════════════════════════ */
function SprayOverlay() {
  return (
    <div className="sc-spray-wrap" aria-hidden="true">
      <div className="sc-puff sc-puff-l1" /><div className="sc-puff sc-puff-l2" /><div className="sc-puff sc-puff-l3" />
      <div className="sc-puff sc-puff-r1" /><div className="sc-puff sc-puff-r2" /><div className="sc-puff sc-puff-r3" />
      <div className="sc-puff sc-puff-t1" /><div className="sc-puff sc-puff-t2" /><div className="sc-puff sc-puff-t3" />
      <div className="sc-puff sc-puff-b1" /><div className="sc-puff sc-puff-b2" />
      <div className="sc-puff sc-puff-c1" /><div className="sc-puff sc-puff-c2" /><div className="sc-puff sc-puff-c3" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   GADGETS — intense RGB glitch + neon bars + flicker + noise
   ════════════════════════════════════════════════════════════════════ */
function GlitchOverlay() {
  return (
    <div className="sc-glitch-wrap" aria-hidden="true">
      <div className="sc-gl sc-gl-c" /><div className="sc-gl sc-gl-m" />
      <div className="sc-gl sc-gl-y" /><div className="sc-gl sc-gl-g" />
      <div className="sc-glbar sc-glbar-1" /><div className="sc-glbar sc-glbar-2" />
      <div className="sc-glbar sc-glbar-3" /><div className="sc-glbar sc-glbar-4" />
      <div className="sc-gl-flicker" />
      <div className="sc-gl-noise" />
      <div className="sc-scanlines" />
    </div>
  );
}

/* ── Default backgrounds per theme ── */
const THEME_BG = {
  fashion:     "#1E3D2A",
  bestsellers: "#7B1E1E",
  kente:       "#17260F",
  scents:      "#1E3D2A",
  gadgets:     "#070E1C",
  none:        "#1a1a2e",
};

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   Props:
     shops      — array of shop objects (from admin / Firestore)
     autoPlay   — boolean (default true). Pass false in admin preview.
     interval   — ms between auto-advances (default 3500)
   ════════════════════════════════════════════════════════════════════ */
export default function ShopCarousel({ shops = [], autoPlay = true, interval = 3500 }) {
  const [saved,       setSaved]       = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [animKeys,    setAnimKeys]    = useState({ 0: 1 });

  const trackRef      = useRef(null);
  const prevActive    = useRef(0);
  const autoPlayTimer = useRef(null);
  const pauseTimer    = useRef(null);
  const isPaused      = useRef(false);

  /* Active shops only, sorted by order */
  const activeShops = [...shops]
    .filter((s) => s.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  /* ── Scroll a specific index into view ── */
  const scrollTo = useCallback((idx) => {
    const el = trackRef.current;
    if (!el) return;
    /* Each card-wrap is exactly the full track width — no gap, no padding */
    el.scrollTo({ left: idx * el.offsetWidth, behavior: "smooth" });
  }, []);

  /* ── Active-index detection on manual scroll ── */
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const mid      = el.getBoundingClientRect().left + el.offsetWidth / 2;
    const children = Array.from(el.querySelectorAll(".sc-card-wrap"));
    let closest = 0, minDist = Infinity;
    children.forEach((child, i) => {
      const r    = child.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - mid);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    if (closest !== prevActive.current) {
      prevActive.current = closest;
      setActiveIndex(closest);
      setAnimKeys((prev) => ({ ...prev, [closest]: (prev[closest] || 0) + 1 }));
    }
  }, []);

  /* ── Auto-play ── */
  const startAutoPlay = useCallback(() => {
    if (!autoPlay || activeShops.length <= 1) return;
    clearInterval(autoPlayTimer.current);
    autoPlayTimer.current = setInterval(() => {
      if (isPaused.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % activeShops.length;
        prevActive.current = next;
        setAnimKeys((k) => ({ ...k, [next]: (k[next] || 0) + 1 }));
        requestAnimationFrame(() => scrollTo(next));
        return next;
      });
    }, interval);
  }, [autoPlay, activeShops.length, interval, scrollTo]);

  useEffect(() => {
    startAutoPlay();
    return () => {
      clearInterval(autoPlayTimer.current);
      clearTimeout(pauseTimer.current);
    };
  }, [startAutoPlay]);

  /* ── Pause on touch / pointer, resume after 6s of inactivity ── */
  const pauseAutoPlay = useCallback(() => {
    isPaused.current = true;
    clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => { isPaused.current = false; }, 6000);
  }, []);

  /* ── Dot / arrow click: pause + jump ── */
  const handleDotClick = useCallback((idx) => {
    pauseAutoPlay();
    setActiveIndex(idx);
    prevActive.current = idx;
    setAnimKeys((k) => ({ ...k, [idx]: (k[idx] || 0) + 1 }));
    scrollTo(idx);
  }, [pauseAutoPlay, scrollTo]);

  const handlePrev = useCallback(() => {
    handleDotClick((activeIndex - 1 + activeShops.length) % activeShops.length);
  }, [activeIndex, activeShops.length, handleDotClick]);

  const handleNext = useCallback(() => {
    handleDotClick((activeIndex + 1) % activeShops.length);
  }, [activeIndex, activeShops.length, handleDotClick]);

  const toggleSave = (e, id) => {
    e.stopPropagation();
    setSaved((p) => ({ ...p, [id]: !p[id] }));
  };

  if (!activeShops.length) return null;

  return (
    <div className="sc-root">

      {/* ── Wrapper: positions track, dots, and arrows together ── */}
      <div className="sc-wrapper">

        {/* Desktop-only prev arrow */}
        {activeShops.length > 1 && (
          <button
            className="sc-arrow sc-arrow--prev"
            onClick={handlePrev}
            aria-label="Previous slide"
          >
            ‹
          </button>
        )}

        {/* ── Scrollable track ── */}
        <div
          ref={trackRef}
          className="sc-track"
          onScroll={onScroll}
          onTouchStart={pauseAutoPlay}
          onMouseDown={pauseAutoPlay}
        >
          {activeShops.map((shop, i) => {
            const theme    = shop.theme || "none";
            const isActive = i === activeIndex;
            const animKey  = animKeys[i] || 0;
            const cardBg   = shop.cardBg || THEME_BG[theme] || "#1E3D2A";
            const btnText  = shop.buttonText || "Shop Now";

            return (
              <div key={shop.id} className="sc-card-wrap">
                <div
                  className={`sc-card sc-theme-${theme}${isActive ? " sc-card--visible" : ""}`}
                  style={{ background: cardBg }}
                  onClick={() => shop.onClick?.()}
                  role="button"
                  tabIndex={0}
                  aria-label={shop.ariaLabel || shop.title}
                  onKeyDown={(e) => e.key === "Enter" && shop.onClick?.()}
                >
                  {/* ── Full-bleed background image ── */}
                  {(shop.imageUrl || shop.image) && (
                    <div className="sc-bg-image-wrap">
                      <img
                        src={shop.imageUrl || shop.image}
                        alt=""
                        className="sc-bg-image"
                        loading="lazy"
                        draggable={false}
                      />
                      {/* Left-to-right gradient keeps text legible over image */}
                      <div className="sc-bg-gradient" />
                    </div>
                  )}

                  {/* Heart */}
                  <button
                    className="sc-heart"
                    onClick={(e) => toggleSave(e, shop.id)}
                    aria-label={saved[shop.id] ? "Unsave" : "Save"}
                  >
                    <IconHeart filled={!!saved[shop.id]} />
                  </button>

                  {/* Text content — left-aligned, always above image */}
                  <div className="sc-inner">
                    <div className="sc-content">
                      {shop.chip && <span className="sc-badge">{shop.chip}</span>}
                      <h3 className="sc-title">{shop.title}</h3>
                      <p className="sc-subtitle">{shop.subtitle || "Premium curated shop"}</p>
                      <button className="sc-btn">{btnText} →</button>
                    </div>
                  </div>

                  {/* ═══ Overlays (all themes untouched) ═══ */}
                  {theme === "fashion" && <CurtainOverlay color={cardBg} />}
                  {theme === "kente" && (
                    <div className="sc-kente-wrap" key={`kente-${animKey}`}>
                      <KenteSVG />
                    </div>
                  )}
                  {theme === "bestsellers" && isActive && <StampOverlay key={`stamp-${animKey}`} />}
                  {theme === "scents"      && isActive && <SprayOverlay key={`spray-${animKey}`} />}
                  {theme === "gadgets"     && isActive && <GlitchOverlay key={`glitch-${animKey}`} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop-only next arrow */}
        {activeShops.length > 1 && (
          <button
            className="sc-arrow sc-arrow--next"
            onClick={handleNext}
            aria-label="Next slide"
          >
            ›
          </button>
        )}

        {/* ── Dots overlaid at the bottom of the wrapper ── */}
        {activeShops.length > 1 && (
          <div className="sc-dots" role="tablist" aria-label="Carousel navigation">
            {activeShops.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === activeIndex}
                className={`sc-dot${i === activeIndex ? " active" : ""}`}
                onClick={() => handleDotClick(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}