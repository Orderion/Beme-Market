import { useEffect, useState, useRef } from "react";
import "./LoaderOverlay.css";

export default function LoaderOverlay({
  show,
  isVisible,
  label = "Beme Market",
  subtext = "loading",
}) {
  const visible = typeof isVisible !== "undefined" ? isVisible : show;

  const [render, setRender] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const observerRef = useRef(null);

  // Detect dark mode
  useEffect(() => {
    const check = () =>
      setIsDark(document.body.classList.contains("dark"));

    check();

    observerRef.current = new MutationObserver(check);

    observerRef.current.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observerRef.current?.disconnect();
  }, []);

  // Mount / unmount transition
  useEffect(() => {
    let timeout;

    if (visible) {
      setRender(true);
    } else {
      timeout = setTimeout(() => setRender(false), 850);
    }

    return () => clearTimeout(timeout);
  }, [visible]);

  if (!render) return null;

  return (
    <div
      className={`loader-overlay ${visible ? "show" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={visible}
      aria-label={`${label} ${subtext}`}
    >
      <div className="loader-overlay-backdrop" />

      <div className="loader-overlay-center">
        {/* CART ANIMATION */}
        <div className="cart-loader" aria-hidden="true">
          {/* floating items */}
          <span className="floating-item item-shirt" />
          <span className="floating-item item-ball" />
          <span className="floating-item item-shoe" />
          <span className="floating-item item-game" />

          {/* cart */}
          <div className="cart-body">
            <div className="cart-basket" />
            <div className="cart-handle" />

            <span className="wheel left" />
            <span className="wheel right" />
          </div>
        </div>

        {/* TEXT */}
        <div className="loader-copy">
          <p className="loader-brand">{label}</p>

          <div className="loader-loading-row">
            <span className="loader-loading-text">{subtext}</span>

            <div className="loader-ticking-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}