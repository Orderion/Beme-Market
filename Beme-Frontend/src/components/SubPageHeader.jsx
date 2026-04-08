import { useNavigate } from "react-router-dom";
import "./SubPageHeader.css";

export default function SubPageHeader({ title }) {
  const navigate = useNavigate();

  return (
    <header className="sph">
      <button className="sph-back" onClick={() => navigate(-1)} aria-label="Go back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <h1 className="sph-title">{title}</h1>
      <span className="sph-spacer" />
    </header>
  );
}
