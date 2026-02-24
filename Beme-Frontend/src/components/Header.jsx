// src/components/Header.jsx

import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import "./Header.css";

export default function Header({ onMenu, onCart }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const isHome = location.pathname === "/";

  return (
    <header className="hdr">
      <button className="hdr-icon" onClick={onMenu} aria-label="Open menu">
        ☰
      </button>

      <button
        className="hdr-brand"
        onClick={() => navigate(isHome ? "/shop" : "/")}
        aria-label="Go home"
      >
        Beme Market
      </button>

      <div className="hdr-right">
        <button className="hdr-icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? "☾" : "☀"}
        </button>

        <button className="hdr-icon" onClick={onCart} aria-label="Open cart">
          👜
        </button>
      </div>
    </header>
  );
}