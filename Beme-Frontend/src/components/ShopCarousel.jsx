import { useRef, useState, useCallback, useEffect } from "react";
import "./ShopCarousel.css";

/* ─── Heart Icon ─────────────────────────────────────────────────────────── */
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

/* ─── Theme config ───────────────────────────────────────────────────────── */
const THEME_BG = {
  fashion:     "#1E3D2A",
  bestsellers: "#7B1E1E",
  kente:       "#17260F",
  scents:      "#1E3D2A",
  gadgets:     "#070E1C",
};

/* ─── Kente stripe definitions ───────────────────────────────────────────── */
const KENTE_STRIPES = [
  { y: 20,  col: "#CC0000", sw: 15, amp: 11, per: 30, delay: 0.05 },
  { y: 48,  col: "#FFD700", sw: 10, amp: 8,  per: 22, delay: 0.15 },
  { y: 72,  col: "#006B3F", sw: 15, amp: 11, per: 30, delay: 0.25 },
  { y: 100, col: "#FFD700", sw: 10, amp: 8,  per: 22, delay: 0.35 },
  { y: 126, col: "#CC0000", sw: 15, amp: 11, per: 30, delay: 0.45 },
  { y: 154, col: "#006B3F", sw: 10, amp: 8,  per: 22, delay: 0.55 },
];

/* ─── Spray puff positions ───────────────────────────────────────────────── */
const PUFFS = [
  { id: "pL1", style: { width: 175, height: 145, left: -75, top: 0   } },
  { id: "pL2", style: { width: 130, height: 110, left: -48, top: 28  } },
  { id: "pL3", style: { width: 100, height: 80,  left: -22, top: 52  } },
  { id: "pR1", style: { width: 175, height: 145, right: -75, top: 0  } },
  { id: "pR2", style: { width: 130, height: 110, right: -48, top: 28 } },
  { id: "pR3", style: { width: 100, height: 80,  right: -22, top: 52 } },
];

/* ─── ShopCard ───────────────────────────────────────────────────────────── */
function ShopCard({ shop, saved, onToggleSave, trackRef }) {
  const cardRef      = useRef(null);
  const kenteWrapRef = useRef(null);
  const kPathsRef    = useRef([]);

  const [isVisible, setIsVisible] = useState(false);
  // animKey forces CSS-animation elements to remount → restarts spray & glitch
  const [animKey, setAnimKey] = useState(0);

  /* Build Kente SVG imperatively (must use getTotalLength) */
  useEffect(() => {
    if (shop.theme !== "kente" || !kenteWrapRef.current) return;
    const ns  = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 420 190");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";

    const paths = [];
    KENTE_STRIPES.forEach((s) => {
      const W  = 420;
      let d    = `M 0 ${s.y}`;
      let x    = 0;
      let up   = true;
      const hp = s.per / 2;
      while (x < W) {
        const cx = x + hp / 2;
        const cy = up ? s.y - s.amp : s.y + s.amp;
        const ex = Math.min(x + hp, W);
        d += ` Q ${cx},${cy} ${ex},${s.y}`;
        x  = ex;
        up = !up;
      }
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d",              d);
      path.setAttribute("stroke",         s.col);
      path.setAttribute("stroke-width",   s.sw);
      path.setAttribute("fill",           "none");
      path.setAttribute("stroke-opacity", ".6");
      path.setAttribute("stroke-linecap", "round");
      svg.appendChild(path);
      paths.push({ el: path, delay: s.delay });
    });

    kenteWrapRef.current.appendChild(svg);
    kPathsRef.current = paths;

    requestAnimationFrame(() => {
      kPathsRef.current.forEach((kp) => {
        const len = kp.el.getTotalLength() + 4;
        kp.len    = len;
        kp.el.style.strokeDasharray  = len;
        kp.el.style.strokeDashoffset = len;
      });
    });

    return () => {
      if (kenteWrapRef.current?.contains(svg)) {
        kenteWrapRef.current.removeChild(svg);
      }
      kPathsRef.current = [];
    };
  }, [shop.theme]);

  /* Kente: animate in / reset on visibility change */
  useEffect(() => {
    if (shop.theme !== "kente") return;
    if (isVisible) {
      const tryAnimate = () => {
        if (!kPathsRef.current.length || !kPathsRef.current[0].len) {
          setTimeout(tryAnimate, 80);
          return;
        }
        kPathsRef.current.forEach((kp) => {
          kp.el.style.transition       = `stroke-dashoffset .95s ease-out ${kp.delay}s`;
          kp.el.style.strokeDashoffset = 0;
        });
      };
      tryAnimate();
    } else {
      kPathsRef.current.forEach((kp) => {
        if (!kp.len) return;
        kp.el.style.transition       = "none";
        kp.el.style.strokeDashoffset = kp.len;
      });
    }
  }, [isVisible, shop.theme]);

  /* IntersectionObserver — fires relative to the scroll track */
  useEffect(() => {
    const card  = cardRef.current;
    const track = trackRef.current;
    if (!card || !track) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setIsVisible(true);
            setAnimKey((k) => k + 1); // remounts spray / glitch
          } else {
            setIsVisible(false);
          }
        });
      },
      { threshold: 0.35, root: track }
    );

    obs.observe(card);
    return () => obs.disconnect();
  }, [trackRef]);

  const bg        = THEME_BG[shop.theme] || "#1A3A2A";
  const isGadgets = shop.theme === "gadgets";

  return (
    <div
      ref={cardRef}
      className="sc-card"
      onClick={() => shop.onClick?.()}
      role="button"
      tabIndex={0}
    >
      {/* HEART — always on top (z-index 20) */}
      <button className="sc-heart" onClick={(e) => onToggleSave(e, shop.id)}>
        <IconHeart filled={!!saved} />
      </button>

      {/* INNER */}
      <div className="sc-inner" style={{ background: bg }}>

        {/* ── FASHION: two-panel curtain ── */}
        {shop.theme === "fashion" && (
          <div className="sc-curtain">
            <div
              className={`sc-curtain-l ${isVisible ? "sc-curtain-open" : ""}`}
              style={{ background: bg }}
            />
            <div
              className={`sc-curtain-r ${isVisible ? "sc-curtain-open" : ""}`}
              style={{ background: bg }}
            />
          </div>
        )}

        {/* ── KENTE: curly zigzag stripes ── */}
        {shop.theme === "kente" && (
          <div ref={kenteWrapRef} className="sc-kente-wrap" />
        )}

        {/* ── SCENTS: mist spray puffs (key → remount restarts animations) ── */}
        {shop.theme === "scents" && (
          <div key={animKey} className="sc-spray-wrap">
            {PUFFS.map(({ id, style }) => {
              const px = Object.fromEntries(
                Object.entries(style).map(([k, v]) => [k, `${v}px`])
              );
              return <div key={id} className={`sc-puff sc-puff--${id}`} style={px} />;
            })}
          </div>
        )}

        {/* ── GADGETS: RGB glitch bands + scanlines (key → remount) ── */}
        {shop.theme === "gadgets" && (
          <>
            <div key={animKey} className="sc-glitch-wrap">
              <div className="sc-gl sc-gl--c" />
              <div className="sc-gl sc-gl--m" />
              <div className="sc-gl sc-gl--y" />
            </div>
            <div className={`sc-scanlines ${isVisible ? "sc-scanlines--on" : ""}`} />
          </>
        )}

        {/* ── CONTENT ── */}
        <div className="sc-content">
          {shop.badge && <span className="sc-badge">{shop.badge}</span>}
          <h3 className={`sc-title${isGadgets ? " sc-title--glow" : ""}`}>
            {shop.title}
          </h3>
          <p className="sc-subtitle">{shop.subtitle || "Premium curated shop"}</p>
          <button className="sc-btn">{shop.buttonText || "Shop Now"} →</button>
        </div>

        {/* ── PRODUCT IMAGE ── */}
        <div className="sc-image-wrap">
          <img src={shop.image} alt={shop.title} />
        </div>
      </div>
    </div>
  );
}

/* ─── ShopCarousel (root) ────────────────────────────────────────────────── */
export default function ShopCarousel({ shops = [] }) {
  const [saved,       setSaved]       = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);

  const toggleSave = (e, id) => {
    e.stopPropagation();
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  if (!shops.length) return null;

  return (
    <div className="sc-root">
      <div ref={trackRef} className="sc-track" onScroll={onScroll}>
        {shops.map((shop) => (
          <div key={shop.id} className="sc-card-wrap">
            <ShopCard
              shop={shop}
              saved={saved[shop.id]}
              onToggleSave={toggleSave}
              trackRef={trackRef}
            />
          </div>
        ))}
      </div>

      {shops.length > 1 && (
        <div className="sc-dots">
          {shops.map((_, i) => (
            <button
              key={i}
              className={`sc-dot ${i === activeIndex ? "active" : ""}`}
              onClick={() => scrollTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}