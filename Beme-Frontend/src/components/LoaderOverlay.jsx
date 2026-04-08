import { useEffect, useState } from "react";
import "./LoaderOverlay.css";

export default function LoaderOverlay({
  show,
  isVisible,
  label = "Loading",
  subtext = "Beme Market",
}) {
  // ✅ SUPPORT BOTH PROPS
  const visible = typeof isVisible !== "undefined" ? isVisible : show;

  const [render, setRender] = useState(false);

  useEffect(() => {
    let timeout;

    if (visible) {
      setRender(true);
    } else {
      // ✅ WAIT FOR CSS TRANSITION TO FINISH BEFORE UNMOUNT
      timeout = setTimeout(() => {
        setRender(false);
      }, 400); // matches your --motion-slow feel
    }

    return () => clearTimeout(timeout);
  }, [visible]);

  // ✅ DO NOT RENDER UNTIL FIRST TRIGGER
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