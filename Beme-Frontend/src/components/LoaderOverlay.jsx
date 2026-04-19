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
          <svg viewBox="0 0 120 100" className="loader-logo">
            <path className="logo-left" d="M10 70 V20 L40 50 L60 30 V45 L40 65 Z"/>
            <path className="logo-right" d="M110 70 V20 L80 50 L60 30 V45 L80 65 Z"/>
            <path className="logo-inner-orange" d="M45 55 L60 40 L75 55 L75 65 L60 52 L45 65 Z"/>
            <path className="logo-inner-base" d="M30 70 L60 50 L90 70 L80 70 L60 58 L40 70 Z"/>
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