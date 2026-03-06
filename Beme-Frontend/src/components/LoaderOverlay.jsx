import "./LoaderOverlay.css";

export default function LoaderOverlay({
  label = "Loading",
  subtext = "Preparing your experience",
}) {
  return (
    <div className="loader-overlay">
      <div className="loader-overlay-center">

        <div className="loader-bars" aria-hidden="true">
          <span className="loader-bar bar1"></span>
          <span className="loader-bar bar2"></span>
          <span className="loader-bar bar3"></span>
          <span className="loader-bar bar4"></span>
        </div>

        <div className="loader-text">
          <p className="loader-label">{label}</p>
          <p className="loader-sub">{subtext}</p>
        </div>

      </div>
    </div>
  );
}