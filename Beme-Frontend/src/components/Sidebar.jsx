// src/components/Sidebar.jsx
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { DEFAULT_KIND_BY_DEPT } from "../constants/catalog";
import "./Sidebar.css";

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  const goDept = (dept) => {
    // Accessories should default to tech, others to fashion
    const kind = DEFAULT_KIND_BY_DEPT[dept];
    go(`/shop?dept=${dept}${kind ? `&kind=${kind}` : ""}`);
  };

  return (
    <>
      <div className={`side-panel ${isOpen ? "open" : ""}`}>
        <div className="side-header">
          <h3>Menu</h3>
          <button onClick={onClose} aria-label="Close menu" className="side-close">
            ×
          </button>
        </div>

        <div className="side-links">
          <button className="sidebar-link" onClick={() => go("/")}>
            Home
          </button>

          <div className="side-divider" />

          <button className="sidebar-link" onClick={() => goDept("men")}>
            Men
          </button>
          <button className="sidebar-link" onClick={() => goDept("women")}>
            Women
          </button>
          <button className="sidebar-link" onClick={() => goDept("kids")}>
            Kids
          </button>
          <button className="sidebar-link" onClick={() => goDept("accessories")}>
            Accessories
          </button>

          <div className="side-divider" />

          {/* Shop (no filters) */}
          <button className="sidebar-link" onClick={() => go("/shop")}>
            Shop
          </button>

          <button className="sidebar-link" onClick={() => go("/login")}>
            Login
          </button>

          <div className="side-divider" />

          <button className="sidebar-link" onClick={toggleTheme}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </div>

      {isOpen && <div className="overlay" onClick={onClose} />}
    </>
  );
}