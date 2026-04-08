import { useState, useRef, useCallback, useEffect } from "react";
import "./ShopCarousel.css";

const AUTO_INTERVAL = 6800; // ms between slides

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
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}

export default function ShopCarousel({ shops = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [slideDir, setSlideDir] = useState(null); // 'left' | 'right' | null
  const [animKey, setAnimKey] = useState(0);       // forces re-mount for re-animation
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const dragStartX = useRef(null);
  const dragCurrentX = useRef(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);
  const progressStart = useRef(null);

  // ── Navigate with direction awareness ──
  const goTo = useCallback(
    (index, dir = "left") => {
      const clamped = Math.max(0, Math.min(shops.length - 1, index));
      if (clamped === activeIndex) return;
      setSlideDir(dir);
      setAnimKey((k) => k + 1);
      setExpanded(false);
      setActiveIndex(clamped);
      setProgress(0);
      progressStart.current = performance.now();
    },
    [activeIndex, shops.length]
  );

  const goNext = useCallback(() => {
    const next = (activeIndex + 1) % shops.length;
    goTo(next, "left");
  }, [activeIndex, shops.length, goTo]);

  const goPrev = useCallback(() => {
    const prev = (activeIndex - 1 + shops.length) % shops.length;
    goTo(prev, "right");
  }, [activeIndex, shops.length, goTo]);

  // ── Auto-slide ticker ──
  useEffect(() => {
    if (shops.length < 2) return;

    const tick = () => {
      if (!isPaused) {
        goNext();
      }
    };

    intervalRef.current = setInterval(tick, AUTO_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [isPaused, goNext, shops.length]);

  // ── Progress bar animation ──
  useEffect(() => {
    if (shops.length < 2 || isPaused) {
      setProgress(isPaused ? progress : 0);
      return;
    }

    progressStart.current = performance.now();

    const animate = (now) => {
      const elapsed = now - (progressStart.current ?? now);
      const pct = Math.min((elapsed / AUTO_INTERVAL) * 100, 100);
      setProgress(pct);
      progressRef.current = requestAnimationFrame(animate);
    };

    progressRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(progressRef.current);
  }, [activeIndex, isPaused, shops.length]);

  // ── Interaction handlers ──
  const handleTap = () => {
    if (hasDragged.current) return;
    setExpanded((prev) => !prev);
  };

  const onPointerDown = (e) => {
    dragStartX.current = e.clientX ?? e.touches?.[0]?.clientX;
    dragCurrentX.current = dragStartX.current;
    isDragging.current = true;
    hasDragged.current = false;
    setIsPaused(true);
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
      if (delta < 0) goNext();
      else goPrev();
    }
    // Resume auto-play after a brief pause
    setTimeout(() => setIsPaused(false), 1200);
  };

  if (!shops.length) return null;
  const shop = shops[activeIndex];

  return (
    <div
      className="sc-root"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Progress bar ── */}
      {shops.length > 1 && (
        <div className="sc-progress-track">
          <div
            className={`sc-progress-bar ${isPaused ? "sc-progress-bar--paused" : ""}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div
        className={`sc-card ${expanded ? "sc-card--expanded" : ""}`}
        onClick={handleTap}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={(e) => { onPointerUp(); }}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        role="button"
        tabIndex={0}
        aria-label={`${shop.chip} — tap to expand`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleTap(); }
          if (e.key === "ArrowRight") { goNext(); setIsPaused(false); }
          if (e.key === "ArrowLeft") { goPrev(); setIsPaused(false); }
        }}
      >
        {/* ── Image with inner radius ── */}
        <div className="sc-media-wrap">
          <div className="sc-media">
            {/* Sliding image layer — re-keyed on each transition */}
            <img
              key={`${shop.id}-${animKey}`}
              src={shop.image}
              alt={shop.chip}
              className={`sc-image sc-image--slide-${slideDir ?? "left"}`}
              draggable={false}
            />

            {/* gradient that appears on expand */}
            <div className="sc-gradient" />

            {/* dots inside image */}
            <div className="sc-dots" onClick={(e) => e.stopPropagation()}>
              {shops.map((_, i) => (
                <button
                  key={i}
                  className={`sc-dot ${i === activeIndex ? "sc-dot--active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(i, i > activeIndex ? "left" : "right");
                    setIsPaused(false);
                  }}
                  aria-label={`Go to shop ${i + 1}`}
                />
              ))}
            </div>

            {/* overlay info — slides up on expand */}
            <div className={`sc-overlay-info ${expanded ? "sc-overlay-info--visible" : ""}`}>
              <div className="sc-name-row sc-name-row--light">
                <h3 className="sc-title sc-title--light">{shop.title}</h3>
                <IconVerified />
              </div>
              <p className="sc-subtitle sc-subtitle--light">{shop.subtitle}</p>
              <div className="sc-footer sc-footer--light">
                <div className="sc-stats">
                  <span className="sc-stat sc-stat--light">
                    <IconUsers />
                    <strong>{shop.followers ?? "23k"}</strong>
                  </span>
                  <span className="sc-stat sc-stat--light">
                    <IconBox />
                    <strong>{shop.products ?? "6k"}</strong>
                  </span>
                </div>
                <button
                  className="sc-follow-btn sc-follow-btn--dark"
                  onClick={(e) => { e.stopPropagation(); if (!hasDragged.current) shop.onClick?.(); }}
                  aria-label={`Browse ${shop.chip}`}
                >
                  Follow +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Static info below image (collapsed state) ── */}
        <div className={`sc-body ${expanded ? "sc-body--hidden" : ""}`}>
          <div className="sc-name-row">
            <h3 className="sc-title">{shop.title}</h3>
            <IconVerified />
          </div>
          <p className="sc-subtitle">{shop.subtitle}</p>
          <div className="sc-footer">
            <div className="sc-stats">
              <span className="sc-stat">
                <IconUsers />
                <strong>{shop.followers ?? "5.5k"}</strong>
              </span>
              <span className="sc-stat">
                <IconBox />
                <strong>{shop.products ?? "600"}</strong>
              </span>
            </div>
            <button
              className="sc-follow-btn"
              onClick={(e) => { e.stopPropagation(); if (!hasDragged.current) shop.onClick?.(); }}
              aria-label={`Browse ${shop.chip}`}
            >
              Follow +
            </button>
          </div>
        </div>
      </div>

      {/* ── Pause indicator + swipe hint ── */}
      <p className="sc-swipe-hint">
        {isPaused ? "⏸ Paused" : activeIndex < shops.length - 1 ? "Swipe to see more shops →" : "← Swipe back to browse"}
      </p>
    </div>
  );
}
