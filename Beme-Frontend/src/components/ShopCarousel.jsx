import { useRef, useState, useCallback } from "react";
import "./ShopCarousel.css";

function IconHeart({ filled }) {
  return (
    <svg viewBox="0 0 24 24" className="sc-heart-svg" aria-hidden="true">
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={filled ? "#e86c2c" : "none"}
        stroke={filled ? "#e86c2c" : "rgba(180,180,180,0.9)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconVerified() {
  return (
    <svg className="sc-verified-svg" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#22c55e" />
      <path
        d="M7 12.5l3.5 3.5 6.5-7"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="#f59e0b" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
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
    const GAP = 12;
    const LEAD = 16;
    const idx = Math.round((el.scrollLeft - LEAD) / (CARD_W + GAP));
    setActiveIndex(Math.max(0, Math.min(shops.length - 1, idx)));
  }, [shops.length]);

  const scrollTo = (idx) => {
    if (!trackRef.current) return;
    const el = trackRef.current;
    const card = el.querySelector(".sc-card-wrap");
    if (!card) return;
    const CARD_W = card.offsetWidth;
    const GAP = 12;
    const LEAD = 16;
    el.scrollTo({ left: LEAD + idx * (CARD_W + GAP), behavior: "smooth" });
    setActiveIndex(idx);
  };

  if (!shops.length) return null;

  return (
    <div className="sc-root">
      <div
        ref={trackRef}
        className="sc-track"
        onScroll={onScroll}
      >
        <div className="sc-track-lead" aria-hidden="true" />

        {shops.map((shop) => (
          <div key={shop.id} className="sc-card-wrap">
            <div
              className="sc-card"
              onClick={() => shop.onClick?.()}
              role="button"
              tabIndex={0}
              aria-label={shop.chip}
              onKeyDown={(e) => e.key === "Enter" && shop.onClick?.()}
            >
              <img
                src={shop.image}
                alt={shop.chip}
                className="sc-img"
                draggable={false}
              />
              <div className="sc-gradient" />
              <div className="sc-chip">{shop.chip}</div>

              <div className="sc-badge-rating">
                <StarIcon />
                <span className="sc-rating-val">{shop.rating ?? "4.5"}</span>
                <span className="sc-rating-count">({shop.ratingCount ?? "25+"})</span>
              </div>

              <button
                className="sc-badge-heart"
                onClick={(e) => toggleSave(e, shop.id)}
                aria-label={saved[shop.id] ? "Unsave" : "Save"}
                type="button"
              >
                <IconHeart filled={!!saved[shop.id]} />
              </button>
            </div>

            <div className="sc-name-row">
              <span className="sc-name-text">{shop.title}</span>
              <IconVerified />
            </div>
          </div>
        ))}

        <div className="sc-track-trail" aria-hidden="true" />
      </div>

      {shops.length > 1 && (
        <div className="sc-dots" role="tablist" aria-label="Carousel navigation">
          {shops.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              className={`sc-dot ${i === activeIndex ? "sc-dot--active" : ""}`}
              onClick={() => scrollTo(i)}
              aria-label={`Go to shop ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}