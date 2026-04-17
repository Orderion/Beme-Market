import { useRef, useState, useEffect, useCallback } from "react";
import "./ShopCarousel.css";

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

function KenteSVG() {
  const stripes = [
    { y: 20,  color: "#CC0000", sw: 14, amp: 11, period: 30, delay: "0s"    },
    { y: 48,  color: "#FFD700", sw: 9,  amp:  8, period: 22, delay: "0.15s" },
    { y: 74,  color: "#006B3F", sw: 14, amp: 11, period: 30, delay: "0.3s"  },
    { y: 104, color: "#FFD700", sw: 9,  amp:  8, period: 22, delay: "0.45s" },
    { y: 132, color: "#CC0000", sw: 14, amp: 11, period: 30, delay: "0.6s"  },
    { y: 160, color: "#006B3F", sw: 9,  amp:  8, period: 22, delay: "0.75s" },
  ];
  const buildD = (s) => {
    const W = 420; let d = `M 0 ${s.y}`; let x = 0, up = true;
    const hp = s.period / 2;
    while (x < W) {
      const cx = x + hp / 2, cy = up ? s.y - s.amp : s.y + s.amp;
      const ex = Math.min(x + hp, W);
      d += ` Q ${cx},${cy} ${ex},${s.y}`; x = ex; up = !up;
    }
    return d;
  };
  return (
    <svg viewBox="0 0 420 190" preserveAspectRatio="none" className="sc-kente-svg" aria-hidden="true">
      {stripes.map((s, i) => (
        <path key={i} d={buildD(s)} stroke={s.color} strokeWidth={s.sw}
          fill="none" strokeOpacity="0.75" strokeLinecap="round"
          className="sc-kente-path" style={{ animationDelay: s.delay }} />
      ))}
    </svg>
  );
}

function SprayOverlay() {
  return (
    <div className="sc-spray-wrap" aria-hidden="true">
      <div className="sc-puff sc-puff-l1" /><div className="sc-puff sc-puff-l2" />
      <div className="sc-puff sc-puff-l3" /><div className="sc-puff sc-puff-r1" />
      <div className="sc-puff sc-puff-r2" /><div className="sc-puff sc-puff-r3" />
    </div>
  );
}

function GlitchOverlay() {
  return (
    <div className="sc-glitch-wrap" aria-hidden="true">
      <div className="sc-gl sc-gl-c" /><div className="sc-gl sc-gl-m" />
      <div className="sc-gl sc-gl-y" /><div className="sc-scanlines" />
    </div>
  );
}

function CurtainOverlay({ color }) {
  return (
    <div className="sc-curtain" aria-hidden="true">
      <div className="sc-curtain-left"  style={{ background: color }} />
      <div className="sc-curtain-right" style={{ background: color }} />
    </div>
  );
}

export default function ShopCarousel({ shops = [] }) {
  const [saved,       setSaved]       = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [animKeys,    setAnimKeys]    = useState({ 0: 1 });
  const trackRef   = useRef(null);
  const prevActive = useRef(0);

  const toggleSave = (e, id) => {
    e.stopPropagation();
    setSaved((p) => ({ ...p, [id]: !p[id] }));
  };

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const trackMid = el.getBoundingClientRect().left + el.offsetWidth / 2;
    const children = Array.from(el.querySelectorAll(".sc-card-wrap"));
    let closest = 0, minDist = Infinity;
    children.forEach((child, i) => {
      const rect = child.getBoundingClientRect();
      const dist = Math.abs(rect.left + rect.width / 2 - trackMid);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    if (closest !== prevActive.current) {
      prevActive.current = closest;
      setActiveIndex(closest);
      setAnimKeys((prev) => ({ ...prev, [closest]: (prev[closest] || 0) + 1 }));
    }
  }, []);

  const scrollTo = (idx) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector(".sc-card-wrap");
    if (!card) return;
    el.scrollTo({ left: idx * (card.offsetWidth + 16), behavior: "smooth" });
  };

  if (!shops.length) return null;

  return (
    <div className="sc-root">
      <div ref={trackRef} className="sc-track" onScroll={onScroll}>
        {shops.map((shop, i) => {
          const isActive = i === activeIndex;
          const animKey  = animKeys[i] || 0;
          return (
            <div key={shop.id} className="sc-card-wrap">
              <div
                className={`sc-card sc-theme-${shop.theme || "default"}${isActive ? " sc-card--visible" : ""}`}
                onClick={() => shop.onClick?.()}
                role="button" tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && shop.onClick?.()}
              >
                <button className="sc-heart" onClick={(e) => toggleSave(e, shop.id)}
                  aria-label={saved[shop.id] ? "Unsave" : "Save"}>
                  <IconHeart filled={!!saved[shop.id]} />
                </button>

                <div className="sc-inner">
                  <div className="sc-content">
                    {shop.badge && <span className="sc-badge">{shop.badge}</span>}
                    <h3 className="sc-title">{shop.title}</h3>
                    <p className="sc-subtitle">{shop.subtitle || "Premium curated shop"}</p>
                    <button className="sc-btn">{shop.buttonText || "Shop Now"} →</button>
                  </div>
                  <div className="sc-image-wrap">
                    {shop.image && <img src={shop.image} alt={shop.title} loading="lazy" draggable={false} />}
                  </div>
                </div>

                {shop.theme === "fashion" && <CurtainOverlay color="#1E3D2A" />}

                {shop.theme === "kente" && (
                  <div className="sc-kente-wrap">
                    <KenteSVG key={`kente-${animKey}`} />
                  </div>
                )}

                {shop.theme === "scents" && isActive && <SprayOverlay key={`spray-${animKey}`} />}
                {shop.theme === "gadgets" && isActive && <GlitchOverlay key={`glitch-${animKey}`} />}
              </div>
            </div>
          );
        })}
      </div>

      {shops.length > 1 && (
        <div className="sc-dots">
          {shops.map((_, i) => (
            <button key={i} className={`sc-dot${i === activeIndex ? " active" : ""}`}
              onClick={() => scrollTo(i)} aria-label={`Go to slide ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}