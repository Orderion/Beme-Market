import { useState, useRef, useCallback } from "react";
import "./ShopCarousel.css";

function IconVerified() {
  return (
    <svg className="sc-verified" viewBox="0 0 24 24" aria-hidden="true">
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

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}

export default function ShopCarousel({ shops = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
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
      setActiveIndex(clamped);
      setTimeout(() => setIsAnimating(false), 400);
    },
    [activeIndex, isAnimating, shops.length]
  );

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
        className="sc-card"
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") goTo(activeIndex + 1);
          if (e.key === "ArrowLeft") goTo(activeIndex - 1);
        }}
        tabIndex={0}
        aria-label={`${shop.chip} shop card`}
      >
        {/* ── Image area ── */}
        <div className="sc-media">
          <img
            key={shop.id}
            src={shop.image}
            alt={shop.chip}
            className="sc-image"
            draggable={false}
          />

          {/* subtle bottom gradient for readability */}
          <div className="sc-overlay" />

          {/* chip top-left */}
          <span className="sc-chip">{shop.chip}</span>

          {/* dot indicators */}
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
        </div>

        {/* ── Profile-style info body ── */}
        <div className="sc-body">
          {/* name row */}
          <div className="sc-name-row">
            <h3 className="sc-title">{shop.title}</h3>
            <IconVerified />
          </div>

          {/* subtitle / bio */}
          <p className="sc-subtitle">{shop.subtitle}</p>

          {/* stats + CTA row */}
          <div className="sc-footer">
            <div className="sc-stats">
              <span className="sc-stat">
                <IconUsers />
                <strong>{shop.followers ?? "0"}</strong>
              </span>
              <span className="sc-stat">
                <IconBox />
                <strong>{shop.products ?? "0"}</strong>
              </span>
            </div>

            <button
              className="sc-cta-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (!hasDragged.current) shop.onClick?.();
              }}
              aria-label={`Browse ${shop.chip}`}
            >
              Browse
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </button>
          </div>
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
