import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "./Shop.css";

const Shop = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const category = location.state?.category || null;

  const [sortBy, setSortBy] = useState("new");
  const [menuOpen, setMenuOpen] = useState(false);

  const { darkMode, toggleTheme } = useTheme();

  const title = useMemo(() => {
    return category ? `${category}` : "Hot sale";
  }, [category]);

  const goHome = () => {
    navigate("/");
    setMenuOpen(false);
  };

  const goToShop = (cat = null) => {
    navigate("/shop", cat ? { state: { category: cat } } : undefined);
    setMenuOpen(false);
  };

  return (
    <div className="shop-page">
      {/* Top bar with centered title */}
      <div className="shop-topbar">
        <button className="shop-top-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>

        <div className="shop-top-title-wrap">
          <h1 className="shop-title">{title}</h1>
        </div>

        {/* right spacer to keep title truly centered */}
        <div className="shop-top-spacer" />
      </div>

      {/* Filter / Sort row */}
      <div className="shop-controls">
        <button className="shop-control-btn" type="button">
          <span className="shop-control-icon" aria-hidden="true">
            {/* Minimal sliders icon */}
            <svg viewBox="0 0 24 24" className="shop-svg" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 7h10M18 7h2M14 7v0
                   M4 17h6M14 17h6
                   M10 7v0M10 17v0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M14 5v4M10 15v4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M14 7h0M10 17h0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>Filter</span>
        </button>

        <div className="shop-divider" />

        <button
          className="shop-control-btn"
          type="button"
          onClick={() => setSortBy((s) => (s === "new" ? "price" : "new"))}
          title="Toggle sort"
        >
          <span className="shop-control-icon" aria-hidden="true">
            {/* Minimal sort icon */}
            <svg viewBox="0 0 24 24" className="shop-svg" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M8 6v12M8 18l-3-3M8 18l3-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 6v12M16 6l-3 3M16 6l3 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Sort</span>
        </button>
      </div>

      {/* item count */}
      <div className="shop-meta">
        <span className="shop-count">
          <ProductGrid filter={category} sortBy={sortBy} withCount />
        </span>
      </div>

      {/* grid */}
      <ProductGrid filter={category} sortBy={sortBy} />

      {/* SIDEBAR MENU (same vibe as Home) */}
      <div className={`side-panel ${menuOpen ? "open" : ""}`}>
        <div className="side-header">
          <h3>Menu</h3>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        {/* Theme toggle */}
        <button className="sidebar-link theme-toggle" onClick={toggleTheme}>
          <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
            <span>{darkMode ? "Dark mode" : "Light mode"}</span>
          </span>
        </button>

        <div className="side-links">
          <button className="sidebar-link" onClick={() => goToShop("Men")}>
            Men
          </button>
          <button className="sidebar-link" onClick={() => goToShop("Women")}>
            Women
          </button>
          <button className="sidebar-link" onClick={() => goToShop("Kids")}>
            Kids
          </button>
          <button className="sidebar-link" onClick={() => goToShop("Accessories")}>
            Accessories
          </button>

          <button className="sidebar-link" onClick={goHome}>
            Home
          </button>
        </div>
      </div>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}
    </div>
  );
};

export default Shop;