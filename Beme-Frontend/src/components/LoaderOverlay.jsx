import { useEffect, useState, useRef } from "react";
import "./LoaderOverlay.css";

/* ── Inline SVG items ── */
const ShirtSVG = () => (
  <svg viewBox="0 0 40 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 2C15 2 17 6 20 6C23 6 25 2 25 2L38 11L32 17L32 34L8 34L8 17L2 11Z"/>
  </svg>
);
const BallSVG = () => (
  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="16" fill="currentColor"/>
    <path d="M18 6 L18 14 M12 10 L18 14 M24 10 L18 14" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 20 L18 14 L28 20" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M8 20 L10 28 M28 20 L26 28 M10 28 L26 28" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const ShoeSVG = () => (
  <svg viewBox="0 0 44 28" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 20C2 20 4 10 12 8H22L31 4C36 2 41 5 42 10L43 16C43 16 38 24 24 25H8C4 25 2 22 2 20Z"/>
    <path d="M14 8L18 13M22 8L22 13" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const ControllerSVG = () => (
  <svg viewBox="0 0 44 28" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="6" width="38" height="18" rx="9"/>
    <rect x="9" y="12" width="2" height="8" rx="1" fill="rgba(255,255,255,0.4)"/>
    <rect x="6" y="15" width="8" height="2" rx="1" fill="rgba(255,255,255,0.4)"/>
    <circle cx="31" cy="12" r="2.2" fill="rgba(255,255,255,0.4)"/>
    <circle cx="35" cy="16" r="2.2" fill="rgba(255,255,255,0.4)"/>
    <circle cx="27" cy="16" r="2.2" fill="rgba(255,255,255,0.4)"/>
  </svg>
);
const CartSVG = () => (
  <svg viewBox="0 0 72 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* handle */}
    <path d="M4 6H14" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    {/* body */}
    <path d="M14 6L22 42H56L64 16H20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    {/* wheels */}
    <circle cx="30" cy="52" r="6" fill="currentColor"/>
    <circle cx="50" cy="52" r="6" fill="currentColor"/>
  </svg>
);

/* ── Dot ticker component ── */
function TickDots() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % 4), 480);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="ldr-tick-dots" aria-hidden="true">
      {[0, 1, 2].map(i => (
        <span key={i} className={`ldr-tick-dot${active > i ? " ldr-tick-dot--on" : ""}`} />
      ))}
    </span>
  );
}

export default function LoaderOverlay({
  show,
  isVisible,
  label = "Loading",
  subtext = "Beme Market",
}) {
  const visible = typeof isVisible !== "undefined" ? isVisible : show;
  const [render, setRender] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    const check = () => {};
    observerRef.current = new MutationObserver(check);
    observerRef.current.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    let t;
    if (visible) { setRender(true); }
    else { t = setTimeout(() => setRender(false), 520); }
    return () => clearTimeout(t);
  }, [visible]);

  if (!render) return null;

  return (
    <div
      className={`loader-overlay${visible ? " show" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={visible}
      aria-label={`${subtext} loading`}
    >
      <div className="loader-overlay-backdrop" />

      <div className="loader-overlay-center">
        {/* ── Cart scene ── */}
        <div className="ldr-scene" aria-hidden="true">

          {/* Falling items */}
          <div className="ldr-item ldr-item--shirt">
            <ShirtSVG />
          </div>
          <div className="ldr-item ldr-item--ball">
            <BallSVG />
          </div>
          <div className="ldr-item ldr-item--shoe">
            <ShoeSVG />
          </div>
          <div className="ldr-item ldr-item--ctrl">
            <ControllerSVG />
          </div>

          {/* Cart — bottom anchor */}
          <div className="ldr-cart">
            <CartSVG />
          </div>
        </div>

        {/* ── Faint brand text + ticking dots ── */}
        <div className="ldr-brand-row" aria-label={`${subtext} loading`}>
          <span className="ldr-brand-text">{subtext}</span>
          <TickDots />
        </div>
      </div>
    </div>
  );
}