import { useEffect, useState } from "react";
import "./LoaderOverlay.css";

export default function LoaderOverlay({
  show,
  isVisible,
  label = "Loading",
  subtext = "Beme Market",
}) {
  const visible = typeof isVisible !== "undefined" ? isVisible : show;

  const [render, setRender] = useState(false);

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
      className={`loader-overlay ${visible ? "show" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={visible}
    >
      <div className="loader-overlay-backdrop" />

      <div className="loader-overlay-center">
        {/* 🔥 LOGO LOADER */}
        <div className="loader-mark" aria-hidden="true">
          <svg
            className="loader-logo"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="logo-left"
              d="M20 70 L20 30 L40 50 L60 30 L60 45 L40 65 Z"
            />
            <path
              className="logo-right"
              d="M80 70 L80 30 L60 50 L40 30 L40 45 L60 65 Z"
            />
          </svg>
        </div>

        {/* TEXT */}
        <div className="loader-text">
          <p className="loader-label">{label}</p>
          <p className="loader-sub">{subtext}</p>
        </div>
      </div>
    </div>
  );
}