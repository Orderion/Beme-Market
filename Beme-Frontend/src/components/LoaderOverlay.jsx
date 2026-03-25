import { useEffect, useState } from "react";
import "./LoaderOverlay.css";

export default function LoaderOverlay({
  show,
  isVisible,
  label = "Loading",
  subtext = "Beme Market",
}) {
  // ✅ SUPPORT BOTH PROPS (NO BREAKING CHANGE)
  const visible = typeof isVisible !== "undefined" ? isVisible : show;

  const [shouldRender, setShouldRender] = useState(false);

  // ✅ PREVENT FLICKER (VERY IMPORTANT UX)
  useEffect(() => {
    let timeout;

    if (visible) {
      setShouldRender(true);
    } else {
      timeout = setTimeout(() => {
        setShouldRender(false);
      }, 200); // smooth exit
    }

    return () => clearTimeout(timeout);
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <div
      className={`loader-overlay ${visible ? "show" : "hide"}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loader-overlay-backdrop" />

      <div className="loader-overlay-center">
        <div className="loader-mark" aria-hidden="true">
          <div className="loader-ring" />
          <div className="loader-bars">
            <span className="loader-bar bar1"></span>
            <span className="loader-bar bar2"></span>
            <span className="loader-bar bar3"></span>
            <span className="loader-bar bar4"></span>
          </div>
        </div>

        <div className="loader-text">
          <p className="loader-label">{label}</p>
          <p className="loader-sub">{subtext}</p>
        </div>
      </div>
    </div>
  );
}