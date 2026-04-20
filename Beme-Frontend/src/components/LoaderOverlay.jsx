import { useEffect, useState, useRef } from "react";
import "./LoaderOverlay.css";

export default function LoaderOverlay({
  show,
  isVisible,
  label = "Loading",
  subtext = "Beme Market",
}) {
  const visible = typeof isVisible !== "undefined" ? isVisible : show;

  const [render, setRender] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const observerRef = useRef(null);

  // Detect dark mode from body class + observe mutations
  useEffect(() => {
    const check = () => setIsDark(document.body.classList.contains("dark"));
    check();

    observerRef.current = new MutationObserver(check);
    observerRef.current.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observerRef.current?.disconnect();
  }, []);

  // Mount/unmount with transition delay
  useEffect(() => {
    let timeout;
    if (visible) {
      setRender(true);
    } else {
      timeout = setTimeout(() => setRender(false), 920);
    }
    return () => clearTimeout(timeout);
  }, [visible]);

  if (!render) return null;

  const logoSrc = isDark
    ? "/favicon_white.png"
    : "/favicon_black.png";

  return (
    <div
      className={`loader-overlay ${visible ? "show" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={visible}
      aria-label={`${label} — ${subtext}`}
    >
      <div className="loader-overlay-backdrop" />

      <div className="loader-overlay-center">
        {/* Logo — oscillating breathe animation */}
        <div className="loader-logo-wrap" aria-hidden="true">
          <img
            className="loader-logo-img"
            src={logoSrc}
            alt=""
            draggable={false}
          />
        </div>

        {/* Dot loader */}
        <div className="loader-dots" aria-hidden="true">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="dot dot--accent" />
        </div>

        {/* Label */}
        <div className="loader-text">
          <p className="loader-label">{label}</p>
          <p className="loader-sub">{subtext}</p>
        </div>
      </div>
    </div>
  );
}