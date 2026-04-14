import { useRef, useState, useCallback } from "react";
import "./ShopCarousel.css";

function IconHeart({ filled }) {
  return (
    <svg viewBox="0 0 24 24" className="sc-heart-svg">
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={filled ? "#e86c2c" : "none"}
        stroke={filled ? "#e86c2c" : "rgba(180,180,180,0.9)"}
        strokeWidth="2"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="#f59e0b">
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

    el.scrollTo({
      left: idx * (CARD_W + GAP),
      behavior: "smooth",
    });

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
              {/* TOP */}
              <div className="sc-top">
                <div className="sc-rating">
                  <StarIcon />
                  <span>{shop.rating || "4.8"}</span>
                </div>

                <button
                  className="sc-heart"
                  onClick={(e) => toggleSave(e, shop.id)}
                >
                  <IconHeart filled={!!saved[shop.id]} />
                </button>
              </div>

              {/* INNER CARD */}
              <div className="sc-inner">
                <div className="sc-content">
                  <h3 className="sc-title">{shop.title}</h3>
                  <p className="sc-subtitle">
                    {shop.subtitle || "Premium curated shop"}
                  </p>

                  <div className="sc-preview-row">
                    {(shop.previewImages || []).slice(0, 3).map((img, i) => (
                      <img key={i} src={img} alt="" />
                    ))}
                  </div>

                  <button className="sc-btn">Explore →</button>
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