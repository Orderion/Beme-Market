import { useState, useRef, useCallback } from "react";
import "./ShopCarousel.css";

export default function ShopCarousel({ shops = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch / drag state
  const dragStartX = useRef(null);
  const dragCurrentX = useRef(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);

  const goTo = useCallback(
    (index) => {
      if (isAnimating) return;
      const clamped = Math.max(0, Math.min(shops.length - 1, index));
      if (clamped === activeIndex) return;
      setIsAnimating(true);
      setExpanded(false);
      setActiveIndex(clamped);
      setTimeout(() => setIsAnimating(false), 400);
    },
    [activeIndex, isAnimating, shops.length]
  );

  const handleTap = () => {
    if (hasDragged.current) return;
    if (isAnimating) return;
    setExpanded((prev) => !prev);
  };

  /* ── pointer drag ── */
  const onPointerDown = (e) => {
    dragStartX.current = e.clientX ?? e.touches?.[0]?.clientX;
    dragCurrentX.current = dragStartX.current;
    isDragging.current = true;
    hasDragged.current = false;
  };

  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    dragCurrentX.current = e.clientX ?? e.touches?.[0]?.clientX;
    if (Math.abs(dragCurrentX.current - dragStartX.current) > 6) {
      hasDragged.current = true;
    }
  };

  const onPointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = (dragCurrentX.current ?? 0) - (dragStartX.current ?? 0);
    if (Math.abs(delta) > 40) {
      if (delta < 0) goTo(activeIndex + 1);
      else goTo(activeIndex - 1);
    }
  };

  if (!shops.length) return null;

  const shop = shops[activeIndex];

  return (
    <div className="sc-root">
      {/* ── Card ── */}
      <div
        className={`sc-card ${expanded ? "sc-card--expanded" : ""}`}
        onClick={handleTap}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        role="button"
        tabIndex={0}
        aria-label={`${shop.chip} — tap to expand`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleTap();
          }
          if (e.key === "ArrowRight") goTo(activeIndex + 1);
          if (e.key === "ArrowLeft") goTo(activeIndex - 1);
        }}
      >
        {/* image */}
        <div className="sc-media">
          <img
            key={shop.id}
            src={shop.image}
            alt={shop.chip}
            className="sc-image"
            draggable={false}
          />

          {/* overlay gradient — only when expanded */}
          <div className="sc-overlay" />

          {/* dot indicators inside image */}
          <div className="sc-dots" onClick={(e) => e.stopPropagation()}>
            {shops.map((_, i) => (
              <button
                key={i}
                className={`sc-dot ${i === activeIndex ? "sc-dot--active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(i);
                }}
                aria-label={`Go to shop ${i + 1}`}
              />
            ))}
          </div>

          {/* chip — collapses when expanded */}
          <span className={`sc-chip ${expanded ? "sc-chip--hidden" : ""}`}>
            {shop.chip}
          </span>

          {/* expanded overlay text */}
          <div className={`sc-overlay-content ${expanded ? "sc-overlay-content--visible" : ""}`}>
            <span className="sc-overlay-chip">{shop.chip}</span>
            <h3 className="sc-overlay-title">{shop.title}</h3>
            <p className="sc-overlay-subtitle">{shop.subtitle}</p>
          </div>
        </div>

        {/* body — hidden when expanded */}
        <div className={`sc-body ${expanded ? "sc-body--hidden" : ""}`}>
          <div className="sc-body-text">
            <h3 className="sc-title">{shop.title}</h3>
            <p className="sc-subtitle">{shop.subtitle}</p>
          </div>
          <div className="sc-hint">Tap to explore</div>
        </div>

        {/* CTA — visible when expanded */}
        <div
          className={`sc-cta ${expanded ? "sc-cta--visible" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            shop.onClick?.();
          }}
        >
          <button className="sc-cta-btn">
            Browse {shop.chip}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── swipe hint ── */}
      <p className="sc-swipe-hint">
        {activeIndex < shops.length - 1
          ? "Swipe to see more shops →"
          : "← Swipe back to browse"}
      </p>
    </div>
  );
}
