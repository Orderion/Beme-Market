import "./InfoPages.css";

export default function About() {
  return (
    <div className="info-page">
      <h1>About Beme Market</h1>
      <p className="muted">
        Beme Market is a curated store built for quality, simplicity, and speed.
      </p>

      <div className="info-card">
        <h3>What we sell</h3>
        <p>
          Tech, fashion, and accessories — selected with a clean, premium taste.
        </p>
      </div>

      <div className="info-card">
        <h3>Why we exist</h3>
        <p>
          To make shopping easy, minimal, and reliable — with great customer experience.
        </p>
      </div>
    </div>
  );
}