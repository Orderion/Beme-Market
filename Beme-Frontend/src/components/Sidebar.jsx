// src/components/Sidebar.jsx
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import "./Sidebar.css";

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();

  const go = (path) => {
    navigate(path);
    onClose?.();
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
          <button className="sidebar-link" onClick={() => go("/shop?cat=men")}>
            Men
          </button>
          <button className="sidebar-link" onClick={() => go("/shop?cat=women")}>
            Women
          </button>
          <button className="sidebar-link" onClick={() => go("/shop?cat=kids")}>
            Kids
          </button>
          <button className="sidebar-link" onClick={() => go("/shop?cat=accessories")}>
            Accessories
          </button>

          <div className="side-divider" />

          <button className="sidebar-link" onClick={() => go("/shop")}>
            Shop
          </button>
          <button className="sidebar-link" onClick={() => go("/login")}>
            Login
          </button>
        </div>
      </div>

      {isOpen && <div className="overlay" onClick={onClose} />}
    </>
  );
}