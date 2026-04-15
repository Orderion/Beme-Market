import { useRef, useState, useCallback } from "react";
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

export default function ShopCarousel({ shops = [] }) {
  const [saved, setSaved] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);

  const toggleSave = (e, id) => {
    e.stopPropagation();
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onScroll = useCallback(() => {
    if (!trackRef.current) return;
    const el = trackRef.current;
    const card = el.querySelector(".sc-card-wrap");
    if (!card) return;
    const CARD_W = card.offsetWidth;
    const GAP = 16;
    const idx = Math.round(el.scrollLeft / (CARD_W + GAP));
    setActiveIndex(Math.max(0, Math.min(shops.length - 1, idx)));
  }, [shops.length]);

  const scrollTo = (idx) => {
    if (!trackRef.current) return;
    const el = trackRef.current;
    const card = el.querySelector(".sc-card-wrap");
    if (!card) return;
    const CARD_W = card.offsetWidth;
    const GAP = 16;
    el.scrollTo({ left: idx * (CARD_W + GAP), behavior: "smooth" });
    setActiveIndex(idx);
  };

  if (!shops.length) return null;

  return (
    <div className="sc-root">
      <div ref={trackRef} className="sc-track" onScroll={onScroll}>
        {shops.map((shop) => (
          <div key={shop.id} className="sc-card-wrap">
            <div
              className="sc-card"
              onClick={() => shop.onClick?.()}
              role="button"
              tabIndex={0}
            >
              {/* HEART */}
              <button
                className="sc-heart"
                onClick={(e) => toggleSave(e, shop.id)}
              >
                <IconHeart filled={!!saved[shop.id]} />
              </button>

              {/* INNER CARD */}
              <div className="sc-inner">
                <div className="sc-content">
                  {/* BADGE */}
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
            </div>
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