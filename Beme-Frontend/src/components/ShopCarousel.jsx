import { useRef, useState, useEffect, useCallback } from "react";
import "./ShopCarousel.css";

/* ─────────────────────────── HEART ICON ─────────────────────────── */
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

/* ──────────────────── CURTAIN OVERLAY (Fashion) ─────────────────── */
/* CSS class .sc-card--visible drives the translateX transition.      */
function CurtainOverlay({ cardBg }) {
  return (
    <div className="sc-curtain" aria-hidden="true">
      <div className="sc-curtain-left" style={{ background: cardBg }} />
      <div className="sc-curtain-right" style={{ background: cardBg }} />
    </div>
  );
}

/* ──────────────────── KENTE OVERLAY (Mintah's Kente) ────────────── */
/* Paths built once via DOM + RAF; animated via JS strokeDashoffset.  */
function KenteOverlay({ isVisible }) {
  const wrapRef = useRef(null);
  const pathsRef = useRef([]);
  const builtRef = useRef(false);

  /* Build the SVG once on mount */
  useEffect(() => {
    if (!wrapRef.current || builtRef.current) return;
    builtRef.current = true;

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 420 190");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;";

    const stripes = [
      { y: 20,  color: "#CC0000", sw: 15, amp: 11, period: 30, delay: 0.05 },
      { y: 48,  color: "#FFD700", sw: 10, amp: 8,  period: 22, delay: 0.15 },
      { y: 72,  color: "#006B3F", sw: 15, amp: 11, period: 30, delay: 0.25 },
      { y: 100, color: "#FFD700", sw: 10, amp: 8,  period: 22, delay: 0.35 },
      { y: 126, color: "#CC0000", sw: 15, amp: 11, period: 30, delay: 0.45 },
      { y: 154, color: "#006B3F", sw: 10, amp: 8,  period: 22, delay: 0.55 },
    ];

    stripes.forEach((s) => {
      const W = 420;
      let d = `M 0 ${s.y}`;
      let x = 0;
      let goUp = true;
      const hp = s.period / 2;
      while (x < W) {
        const cx = x + hp / 2;
        const cy = goUp ? s.y - s.amp : s.y + s.amp;
        const ex = Math.min(x + hp, W);
        d += ` Q ${cx},${cy} ${ex},${s.y}`;
        x = ex;
        goUp = !goUp;
      }

      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      path.setAttribute("stroke", s.color);
      path.setAttribute("stroke-width", s.sw);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-opacity", "0.6");
      path.setAttribute("stroke-linecap", "round");
      svg.appendChild(path);

      /* Measure length on next paint, then hide */
      requestAnimationFrame(() => {
        const len = path.getTotalLength() + 4;
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        pathsRef.current.push({ el: path, len, delay: s.delay });
      });
    });

    wrapRef.current.appendChild(svg);
  }, []);

  /* Animate paths whenever isVisible changes */
  useEffect(() => {
    const animate = () => {
      if (!pathsRef.current.length) return false;
      if (isVisible) {
        pathsRef.current.forEach((kp) => {
          kp.el.style.transition = `stroke-dashoffset 0.95s ease-out ${kp.delay}s`;
          kp.el.style.strokeDashoffset = 0;
        });
      } else {
        pathsRef.current.forEach((kp) => {
          kp.el.style.transition = "none";
          kp.el.style.strokeDashoffset = kp.len;
        });
      }
      return true;
    };

    /* Retry if paths not built yet (first load race) */
    if (!animate()) {
      const t = setTimeout(animate, 140);
      return () => clearTimeout(t);
    }
  }, [isVisible]);

  return <div className="sc-kente-wrap" ref={wrapRef} aria-hidden="true" />;
}

/* ──────────────────── SPRAY OVERLAY (Luxury Scents) ─────────────── */
/*
 * FIX: Always rendered (no isVisible gate here).
 * Animations are gated by the .sc-card--visible parent selector in CSS,
 * which mirrors the HTML reference's `.cv .pL1 { animation: ... }` pattern.
 * Re-mounted via key prop each time the card enters view → animations reset.
 */
function SprayOverlay() {
  return (
    <div className="sc-spray-wrap" aria-hidden="true">
      <div className="sc-puff sc-puff-l1" />
      <div className="sc-puff sc-puff-l2" />
      <div className="sc-puff sc-puff-l3" />
      <div className="sc-puff sc-puff-r1" />
      <div className="sc-puff sc-puff-r2" />
      <div className="sc-puff sc-puff-r3" />
    </div>
  );
}

/* ──────────────────── GLITCH OVERLAY (Latest Gadgets) ───────────── */
/*
 * FIX: Same approach as SprayOverlay — always rendered, animations
 * triggered by .sc-card--visible parent, remounted via key on re-entry.
 */
function GlitchOverlay() {
  return (
    <div className="sc-glitch-wrap" aria-hidden="true">
      <div className="sc-gl sc-gl-c" />
      <div className="sc-gl sc-gl-m" />
      <div className="sc-gl sc-gl-y" />
      <div className="sc-scanlines" />
    </div>
  );
}

/* ──────────────────── THEME → CSS CLASS MAP ─────────────────────── */
const THEME_CLASS = {
  fashion:     "sc-theme-fashion",
  bestsellers: "sc-theme-bestsellers",
  kente:       "sc-theme-kente",
  scents:      "sc-theme-scents",
  gadgets:     "sc-theme-gadgets",
};

/* Background colour matching each curtain panel to its card colour   */
const CURTAIN_BG = {
  fashion: "#1E3D2A",
};

/* ═══════════════════════════ MAIN COMPONENT ════════════════════════ */
export default function ShopCarousel({ shops = [] }) {
  const [saved, setSaved]             = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleSet, setVisibleSet]   = useState(new Set());
  /*
   * animKey increments each time a card ENTERS view.
   * Passing it as `key` to SprayOverlay / GlitchOverlay forces a fresh
   * mount so CSS animations restart cleanly on every re-entry.
   */
  const [animKeys, setAnimKeys]       = useState({});

  const trackRef = useRef(null);
  const cardRefs = useRef([]);

  /* ── Heart toggle ───────────────────────────────────────────────── */
  const toggleSave = (e, id) => {
    e.stopPropagation();
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* ── Active dot on manual scroll ───────────────────────────────── */
  const onScroll = useCallback(() => {
    if (!trackRef.current) return;
    const el   = trackRef.current;
    const card = el.querySelector(".sc-card-wrap");
    if (!card) return;
    const CARD_W = card.offsetWidth;
    const GAP    = 16;
    const idx    = Math.round(el.scrollLeft / (CARD_W + GAP));
    setActiveIndex(Math.max(0, Math.min(shops.length - 1, idx)));
  }, [shops.length]);

  /* ── Dot → scroll ──────────────────────────────────────────────── */
  const scrollTo = (idx) => {
    if (!trackRef.current) return;
    const el   = trackRef.current;
    const card = el.querySelector(".sc-card-wrap");
    if (!card) return;
    const CARD_W = card.offsetWidth;
    const GAP    = 16;
    el.scrollTo({ left: idx * (CARD_W + GAP), behavior: "smooth" });
    setActiveIndex(idx);
  };

  /* ── IntersectionObserver — triggers animations on enter/leave ─── */
  useEffect(() => {
    if (!trackRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = parseInt(entry.target.dataset.cardIndex, 10);

          if (entry.isIntersecting) {
            /*
             * FIX: Do NOT call setAnimKeys inside the setVisibleSet
             * updater. Nesting setState calls is a React anti-pattern
             * that breaks batching and causes double renders / animation
             * restarts. Call them as two separate, top-level updates so
             * React can batch them properly.
             */
            setVisibleSet((prev) => {
              const next = new Set(prev);
              next.add(idx);
              return next;
            });
            /* Increment so animation overlays remount cleanly on re-entry */
            setAnimKeys((ak) => ({ ...ak, [idx]: (ak[idx] || 0) + 1 }));
          } else {
            setVisibleSet((prev) => {
              const next = new Set(prev);
              next.delete(idx);
              return next;
            });
          }
        });
      },
      { threshold: 0.38, root: trackRef.current }
    );

    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [shops]);

  if (!shops.length) return null;

  return (
    <div className="sc-root">
      <div ref={trackRef} className="sc-track" onScroll={onScroll}>
        {shops.map((shop, i) => {
          const isVisible  = visibleSet.has(i);
          const animKey    = animKeys[i] || 0;
          const themeClass = THEME_CLASS[shop.theme] || "";

          return (
            <div
              key={shop.id}
              className="sc-card-wrap"
              ref={(el) => { cardRefs.current[i] = el; }}
              data-card-index={i}
            >
              <div
                className={`sc-card ${themeClass} ${isVisible ? "sc-card--visible" : ""}`}
                onClick={() => shop.onClick?.()}
                role="button"
                tabIndex={0}
              >
                {/* ── Heart ── */}
                <button
                  className="sc-heart"
                  onClick={(e) => toggleSave(e, shop.id)}
                  aria-label={saved[shop.id] ? "Unsave" : "Save"}
                >
                  <IconHeart filled={!!saved[shop.id]} />
                </button>

                {/* ── Card body ── */}
                <div className="sc-inner">
                  <div className="sc-content">
                    {shop.badge && (
                      <span className="sc-badge">{shop.badge}</span>
                    )}
                    <h3 className="sc-title">{shop.title}</h3>
                    <p className="sc-subtitle">
                      {shop.subtitle || "Premium curated shop"}
                    </p>
                    <button className="sc-btn">
                      {shop.buttonText || "Shop Now"} →
                    </button>
                  </div>
                  <div className="sc-image-wrap">
                    <img src={shop.image} alt={shop.title} />
                  </div>
                </div>

                {/* ── Theme overlays ── */}
                {shop.theme === "fashion" && (
                  <CurtainOverlay cardBg={CURTAIN_BG.fashion} />
                )}
                {shop.theme === "kente" && (
                  <KenteOverlay isVisible={isVisible} />
                )}

                {/*
                  * FIX: SprayOverlay and GlitchOverlay are now ALWAYS
                  * rendered when the theme matches (no `isVisible &&`).
                  * Their CSS animations are gated by the
                  * .sc-card--visible parent selector in ShopCarousel.css,
                  * exactly mirroring how the HTML reference uses .cv.
                  *
                  * `key={animKey}` still forces a clean remount (fresh
                  * CSS animation state) every time the card re-enters
                  * the viewport.
                  */}
                {shop.theme === "scents" && (
                  <SprayOverlay key={animKey} />
                )}
                {shop.theme === "gadgets" && (
                  <GlitchOverlay key={animKey} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {shops.length > 1 && (
        <div className="sc-dots">
          {shops.map((_, i) => (
            <button
              key={i}
              className={`sc-dot ${i === activeIndex ? "active" : ""}`}
              onClick={() => scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/*
  ─────────────────────────── USAGE EXAMPLE ────────────────────────────
  Pass a `theme` field on each shop object:

  const shops = [
    {
      id: "fashion",
      theme: "fashion",           // ← curtain reveal, dark green
      title: "Modern fashion essentials",
      subtitle: "Clean everyday style and curated wardrobe picks.",
      image: "/images/fashion.png",
      buttonText: "Shop Now",
      onClick: () => navigate("/fashion"),
    },
    {
      id: "bestsellers",
      theme: "bestsellers",       // ← red card, no animation
      title: "Everyday bestsellers",
      subtitle: "Mixed essentials, popular picks, and store highlights.",
      image: "/images/bestsellers.png",
    },
    {
      id: "kente",
      theme: "kente",             // ← kente zigzag stripes draw in
      title: "Mintah's Kente",
      subtitle: "Premium woven styles with heritage appeal.",
      image: "/images/kente.png",
    },
    {
      id: "scents",
      theme: "scents",            // ← cloudy white spray from sides
      title: "Luxury scents",
      subtitle: "Refined fragrances for daily wear and gifting.",
      image: "/images/scents.png",
    },
    {
      id: "gadgets",
      theme: "gadgets",           // ← RGB glitch + scan lines
      title: "Latest gadgets",
      subtitle: "Smart devices and modern electronics for daily life.",
      image: "/images/gadgets.png",
    },
  ];

  <ShopCarousel shops={shops} />
  ────────────────────────────────────────────────────────────────────── */