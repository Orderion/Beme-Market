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
      timeout = setTimeout(() => setRender(false), 500);
    }

    return () => clearTimeout(timeout);
  }, [visible]);

  if (!render) return null;

  return (
    <div className={`loader-overlay ${visible ? "show" : ""}`}>
      <div className="loader-overlay-backdrop" />

      <div className="loader-overlay-center">
        <div className="loader-mark">
          <svg viewBox="0 0 100 100" className="loader-logo">
            {/* LEFT */}
            <path
              className="logo-left"
              d="M15 70 L15 30 L35 50 L50 35 L50 48 L35 62 Z"
            />

            {/* RIGHT */}
            <path
              className="logo-right"
              d="M85 70 L85 30 L65 50 L50 35 L50 48 L65 62 Z"
            />

            {/* INNER */}
            <path
              className="logo-inner"
              d="M30 70 L50 50 L70 70 L60 70 L50 58 L40 70 Z"
            />
          </svg>
        </div>

        <div className="loader-text">
          <p className="loader-label">{label}</p>
          <p className="loader-sub">{subtext}</p>
        </div>
      </div>
    </div>
  );
}