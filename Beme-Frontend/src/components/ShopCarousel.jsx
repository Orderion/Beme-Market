import { useRef, useState, useEffect, useCallback } from "react";
import "./ShopCarousel.css";

/* ─────────────────────── HEART ICON ─────────────────────────────── */
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

/* ─────────────────── CURTAIN OVERLAY (Fashion) ──────────────────── */
function CurtainOverlay({ color }) {
  return (
    <div className="sc-curtain" aria-hidden="true">
      <div className="sc-curtain-left"  style={{ background: color }} />
      <div className="sc-curtain-right" style={{ background: color }} />
    </div>
  );
}

/* ─────────────────── KENTE OVERLAY (Mintah's Kente) ─────────────── */
function KenteOverlay({ isVisible }) {
  const wrapRef  = useRef(null);
  const pathsRef = useRef([]);
  const builtRef = useRef(false);
  const readyRef = useRef(false);

  /* Build SVG once on mount */
  useEffect(() => {
    if (!wrapRef.current || builtRef.current) return;
    builtRef.current = true;

    const ns  = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 420 190");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible;";

    const stripes = [
      { y: 20,  color: "#CC0000", sw: 14, amp: 11, period: 30, delay: 0.0  },
      { y: 48,  color: "#FFD700", sw: 9,  amp:  8, period: 22, delay: 0.12 },
      { y: 74,  color: "#006B3F", sw: 14, amp: 11, period: 30, delay: 0.24 },
      { y: 104, color: "#FFD700", sw: 9,  amp:  8, period: 22, delay: 0.36 },
      { y: 132, color: "#CC0000", sw: 14, amp: 11, period: 30, delay: 0.48 },
      { y: 160, color: "#006B3F", sw: 9,  amp:  8, period: 22, delay: 0.60 },
    ];

    const entries = [];
    stripes.forEach((s) => {
      const W  = 420;
      let d    = `M 0 ${s.y}`;
      let x    = 0;
      let up   = true;
      const hp = s.period / 2;
      while (x < W) {
        const cx = x + hp / 2;
        const cy = up ? s.y - s.amp : s.y + s.amp;
        const ex = Math.min(x + hp, W);
        d += ` Q ${cx},${cy} ${ex},${s.y}`;
        x  = ex;
        up = !up;
      }
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      path.setAttribute("stroke", s.color);
      path.setAttribute("stroke-width", s.sw);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-opacity", "0.72");
      path.setAttribute("stroke-linecap", "round");
      path.style.strokeDasharray  = "9999";
      path.style.strokeDashoffset = "9999";
      svg.appendChild(path);
      entries.push({ el: path, delay: s.delay, len: 0 });
    });

    wrapRef.current.appendChild(svg);
    pathsRef.current = entries;

    /* Measure path lengths after browser paint */
    const t = setTimeout(() => {
      entries.forEach((kp) => {
        try {
          const len = kp.el.getTotalLength() + 8;
          kp.len = len;
          kp.el.style.strokeDasharray  = len;
          kp.el.style.strokeDashoffset = len;
        } catch (_) {
          kp.len = 9999;
        }
      });
      readyRef.current = true;
    }, 100);

    return () => clearTimeout(t);
  }, []);

  /* Animate whenever isVisible changes */
  useEffect(() => {
    const run = () => {
      const kps = pathsRef.current;
      if (!kps.length || !readyRef.current) return false;
      if (isVisible) {
        kps.forEach((kp) => {
          kp.el.style.transition       = `stroke-dashoffset 1.1s ease-out ${kp.delay}s`;
          kp.el.style.strokeDashoffset = 0;
        });
      } else {
        kps.forEach((kp) => {
          kp.el.style.transition       = "none";
          kp.el.style.strokeDashoffset = kp.len;
        });
      }
      return true;
    };

    if (!run()) {
      const id = setInterval(() => { if (run()) clearInterval(id); }, 60);
      return () => clearInterval(id);
    }
  }, [isVisible]);

  return <div className="sc-kente-wrap" ref={wrapRef} aria-hidden="true" />;
}

/* ─────────────────── SPRAY OVERLAY (Luxury Scents) ─────────────── */
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

/* ─────────────────── GLITCH OVERLAY (Latest Gadgets) ────────────── */
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

/* ─────────────────── THEME → CSS CLASS MAP ──────────────────────── */
const THEME_CLASS = {
  fashion:     "sc-theme-fashion",
  bestsellers: "sc-theme-bestsellers",
  kente:       "sc-theme-kente",
  scents:      "sc-theme-scents",
  gadgets:     "sc-theme-gadgets",
};

const CURTAIN_COLOR = {
  fashion: "#1E3D2A",
};

/* ═══════════════════════════ MAIN COMPONENT ════════════════════════ */
export default function ShopCarousel({ shops = [] }) {
  const [saved,       setSaved]       = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleSet,  setVisibleSet]  = useState(() => new Set());
  const [animKeys,    setAnimKeys]    = useState({});

  const trackRef = useRef(null);
  const cardRefs = useRef([]);

  const toggleSave = (e, id) => {
    e.stopPropagation();
    setSaved((p) => ({ ...p, [id]: !p[id] }));
  };

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector(".sc-card-wrap");
    if (!card) return;
    const idx = Math.round(el.scrollLeft / (card.offsetWidth + 16));
    setActiveIndex(Math.max(0, Math.min(shops.length - 1, idx)));
  }, [shops.length]);

  const scrollTo = (idx) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector(".sc-card-wrap");
    if (!card) return;
    el.scrollTo({ left: idx * (card.offsetWidth + 16), behavior: "smooth" });
    setActiveIndex(idx);
  };

  /* ── IntersectionObserver with root: null (viewport) ────────────── */
  /* FIX: root: null is reliable on all mobile browsers.               */
  /* root: scrollContainer fails when the container itself is off-screen */
  useEffect(() => {
    if (!shops.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = parseInt(entry.target.dataset.cardIndex, 10);
          if (isNaN(idx)) return;

          if (entry.isIntersecting) {
            setVisibleSet((prev) => {
              const next = new Set(prev);
              next.add(idx);
              return next;
            });
            setAnimKeys((prev) => ({
              ...prev,
              [idx]: (prev[idx] || 0) + 1,
            }));
          } else {
            setVisibleSet((prev) => {
              const next = new Set(prev);
              next.delete(idx);
              return next;
            });
          }
        });
      },
      {
        root:      null,  /* viewport — works on all devices */
        threshold: 0.15,  /* fire when 15% of the card is visible */
      }
    );

    const refs = cardRefs.current;
    refs.forEach((el) => el && observer.observe(el));
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
              data-card-index={String(i)}
            >
              <div
                className={[
                  "sc-card",
                  themeClass,
                  isVisible ? "sc-card--visible" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => shop.onClick?.()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && shop.onClick?.()}
              >
                <button
                  className="sc-heart"
                  onClick={(e) => toggleSave(e, shop.id)}
                  aria-label={saved[shop.id] ? "Unsave" : "Save"}
                >
                  <IconHeart filled={!!saved[shop.id]} />
                </button>

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
                    {shop.image && (
                      <img
                        src={shop.image}
                        alt={shop.title}
                        loading="lazy"
                        draggable={false}
                      />
                    )}
                  </div>
                </div>

                {/* 1. Fashion — curtain always mounted, CSS opens it */}
                {shop.theme === "fashion" && (
                  <CurtainOverlay color={CURTAIN_COLOR.fashion} />
                )}

                {/* 2. Kente — JS strokeDashoffset, always mounted */}
                {shop.theme === "kente" && (
                  <KenteOverlay isVisible={isVisible} />
                )}

                {/* 3. Scents — remount on enter restarts @keyframes */}
                {shop.theme === "scents" && isVisible && (
                  <SprayOverlay key={`spray-${animKey}`} />
                )}

                {/* 4. Gadgets — remount on enter restarts @keyframes */}
                {shop.theme === "gadgets" && isVisible && (
                  <GlitchOverlay key={`glitch-${animKey}`} />
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
              className={`sc-dot${i === activeIndex ? " active" : ""}`}
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
  ───────────────────────── USAGE EXAMPLE ──────────────────────────
  Add a `theme` field to each shop in your data array:

  const shops = [
    {
      id: "fashion",
      theme: "fashion",
      title: "Modern fashion essentials",
      subtitle: "Clean everyday style and curated wardrobe picks.",
      image: fashionImg,
      buttonText: "Shop Now",
      onClick: () => navigate("/fashion"),
    },
    {
      id: "bestsellers",
      theme: "bestsellers",
      title: "Everyday bestsellers",
      subtitle: "Mixed essentials, popular picks, and store highlights.",
      image: bestsellersImg,
    },
    {
      id: "kente",
      theme: "kente",
      title: "Mintah's Kente",
      subtitle: "Premium woven styles with heritage appeal.",
      image: kenteImg,
    },
    {
      id: "scents",
      theme: "scents",
      title: "Luxury scents",
      subtitle: "Refined fragrances for daily wear and gifting.",
      image: scentsImg,
    },
    {
      id: "gadgets",
      theme: "gadgets",
      title: "Latest gadgets",
      subtitle: "Smart devices and modern electronics for daily life.",
      image: gadgetsImg,
    },
  ];

  <ShopCarousel shops={shops} />
  ─────────────────────────────────────────────────────────────────── */