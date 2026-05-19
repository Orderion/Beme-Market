import { useEffect, useRef, useState } from "react";
import "./LoaderOverlay.css";

export default function LoaderOverlay({
  show,
  isVisible,
  label = "Beme Market",
}) {
  const visible =
    typeof isVisible !== "undefined"
      ? isVisible
      : show;

  const [render, setRender] = useState(false);
  const observerRef = useRef(null);

  // Theme detection
  useEffect(() => {
    const updateTheme = () => {
      document.documentElement.setAttribute(
        "data-loader-theme",
        document.body.classList.contains("dark")
          ? "dark"
          : "light"
      );
    };

    updateTheme();

    observerRef.current = new MutationObserver(updateTheme);

    observerRef.current.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observerRef.current?.disconnect();
  }, []);

  // Mount/unmount
  useEffect(() => {
    let timeout;

    if (visible) {
      setRender(true);
    } else {
      timeout = setTimeout(() => {
        setRender(false);
      }, 500);
    }

    return () => clearTimeout(timeout);
  }, [visible]);

  if (!render) return null;

  return (
    <div
      className={`loader-overlay ${
        visible ? "show" : ""
      }`}
      role="status"
      aria-live="polite"
      aria-busy={visible}
    >
      <div className="loader-overlay-backdrop" />

      <div className="loader-center">
        {/* FLOATING ITEMS */}
        <div
          className="loader-animation"
          aria-hidden="true"
        >
          <span className="item item-shirt" />
          <span className="item item-ball" />
          <span className="item item-shoe" />
          <span className="item item-gamepad" />

          {/* CART */}
          <div className="cart">
            <div className="cart-handle" />

            <div className="cart-basket">
              <span className="wheel wheel-left" />
              <span className="wheel wheel-right" />
            </div>
          </div>
        </div>

        {/* TEXT */}
        <div className="loader-copy">
          <p className="loader-title">{label}</p>

          <div className="loader-loading">
            <span className="loader-loading-text">
              loading
            </span>

            <div className="loader-dots">
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