// src/components/LoaderOverlay.jsx
import "./LoaderOverlay.css";
import loaderLogo from "../assets/loader-logo.png"; // ✅ put the image here

export default function LoaderOverlay({ show = false, label = "Loading..." }) {
  if (!show) return null;

  return (
    <div className="loader-overlay" role="status" aria-live="polite" aria-label={label}>
      <div className="loader-backdrop" />
      <div className="loader-card">
        <img className="loader-logo" src={loaderLogo} alt="" />
        <div className="loader-text">{label}</div>
      </div>
    </div>
  );
}