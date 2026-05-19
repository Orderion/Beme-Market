import { useEffect, useState, useRef } from "react";
import "./LoaderOverlay.css";

/* ─── Stroke-based SVG icons — all currentColor ─── */
const IconShirt = () => (
  <svg viewBox="0 0 32 28" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2C13 4.5 14.5 5.5 16 5.5C17.5 5.5 19 4.5 20 2L30 8.5L26 13.5V26H6V13.5L2 8.5Z"/>
  </svg>
);
const IconBall = () => (
  <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="14" cy="14" r="12"/>
    <path d="M14 5V11M9.5 7.8L14 11M18.5 7.8L14 11"/>
    <path d="M5.5 17L14 11L22.5 17"/>
    <path d="M5.5 17L7.5 22.5M22.5 17L20.5 22.5M7.5 22.5H20.5"/>
  </svg>
);
const IconShoe = () => (
  <svg viewBox="0 0 36 22" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 15.5C2 15.5 4 7.5 10.5 6H19L26 3C31 1.5 34.5 4.5 34.5 9.5L34.5 14C28 19 18 19.5 10 19.5H5.5C3.5 19.5 2 17.5 2 15.5Z"/>
    <path d="M13 6L16 11.5M19 6L19 11.5" strokeWidth="1.4"/>
  </svg>
);
const IconController = () => (
  <svg viewBox="0 0 36 22" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="32" height="15" rx="7.5"/>
    <line x1="7.5" y1="8.5" x2="7.5" y2="13.5"/>
    <line x1="5" y1="11" x2="10" y2="11"/>
    <circle cx="24.5" cy="9.5"  r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="27.5" cy="12.5" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="21.5" cy="12.5" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);
const IconCart = () => (
  <svg viewBox="0 0 52 46" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 3H10L19 33H40L47 13H15"/>
    <circle cx="22" cy="40.5" r="3.5" fill="currentColor" stroke="none"/>
    <circle cx="37" cy="40.5" r="3.5" fill="currentColor" stroke="none"/>
  </svg>
);

/* ─── Animated tick dots (CSS-driven) ─── */
function TickDots() {
  return (
    <span className="ldr-dots" aria-hidden="true">
      <span className="ldr-dot ldr-dot--1"/>
      <span className="ldr-dot ldr-dot--2"/>
      <span className="ldr-dot ldr-dot--3"/>
    </span>
  );
}

/* ─── Main export ─── */
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
    observerRef.current.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    let t;
    if (visible) {
      setRender(true);
    } else {
      t = setTimeout(() => setRender(false), 420);
    }
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
        {/* Cart + falling items scene */}
        <div className="ldr-scene" aria-hidden="true">
          <span className="ldr-item ldr-item--shirt"><IconShirt /></span>
          <span className="ldr-item ldr-item--ball"><IconBall /></span>
          <span className="ldr-item ldr-item--shoe"><IconShoe /></span>
          <span className="ldr-item ldr-item--ctrl"><IconController /></span>
          <span className="ldr-cart"><IconCart /></span>
        </div>

        {/* Brand + dots */}
        <div className="ldr-caption">
          <span className="ldr-caption-text">{subtext}</span>
          <TickDots />
        </div>
      </div>
    </div>
  );
}