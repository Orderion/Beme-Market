import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";

export default function Home({ setCartOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const { darkMode, toggleTheme } = useTheme();
  const { cartItems } = useCart(); // ✅ assumes CartContext exposes cartItems

  const goToShop = () => {
    navigate("/shop");
    setMenuOpen(false);
  };

  return (
    <div className="home">
      {/* HEADER */}
      <header className="header">
        <button className="menu-btn" onClick={() => setMenuOpen(true)}>
          <Menu size={22} />
        </button>

        <h1 className="logo">Beme Market</h1>

        {/* ✅ CART BUTTON (replaces search icon) */}
        <button
          className="icon-btn cart-header-btn"
          onClick={() => setCartOpen?.(true)}
          aria-label="Open cart"
          title="Cart"
        >
          {/* Cart SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>

          {/* Badge */}
          {cartItems?.length > 0 && (
            <span className="cart-badge">{cartItems.length}</span>
          )}
        </button>
      </header>

      {/* SEARCH BAR (keep it) */}
      <div className="search-container">
        {/* simple inline search icon svg so you don’t need lucide Search import */}
        <svg
          className="search-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>

        <input
          type="text"
          placeholder="Search products"
          className="search-input"
        />
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar">
        <button className="filter-btn" onClick={goToShop}>
          Categories ▾
        </button>
        <button className="filter-btn" onClick={goToShop}>
          More ▾
        </button>
        <button className="filter-btn" onClick={goToShop}>
          Offers
        </button>
      </div>

      {/* HERO CARD */}
      <section className="hero">
        <div className="hero-overlay">
          <span className="badge">Lowest price</span>
          <h2>New Arriaval 2026</h2>
          <button className="primary-btn" onClick={goToShop}>
            View product
          </button>
        </div>
      </section>

      {/* XMAS COLLECTION */}
      <section className="section">
        <div className="xmas-card">
          <div className="xmas-overlay">
            <h2>Mintah&apos;s Kente</h2>
            <button className="primary-btn" onClick={goToShop}>
              View collection
            </button>
          </div>
        </div>
      </section>

      {/* CONTINUE SHOPPING */}
      <section className="section">
        <div className="section-header">
          <h3>Continue shopping</h3>
          <span className="see-all" onClick={goToShop}>
            See all
          </span>
        </div>

        <div className="product-scroll">
          <div className="product-card" onClick={goToShop}>
            <img src="https://placehold.co/300x350" alt="" />
            <p className="product-name">Electronics</p>
          </div>

          <div className="product-card" onClick={goToShop}>
            <img src="https://placehold.co/300x350" alt="" />
            <p className="product-name">Ghana Made</p>
          </div>
        </div>
      </section>

      {/* SIDEBAR */}
      <div className={`side-panel ${menuOpen ? "open" : ""}`}>
        <div className="side-header">
          <h3>Menu</h3>
          <button onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* ✅ THEME TOGGLE IN MENU */}
        <button className="sidebar-link theme-toggle" onClick={toggleTheme}>
          <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
            <span>{darkMode ? "Dark mode" : "Light mode"}</span>
          </span>
        </button>

        <div className="side-links">
          <button className="sidebar-link" onClick={goToShop}>
            Men
          </button>
          <button className="sidebar-link" onClick={goToShop}>
            Women
          </button>
          <button className="sidebar-link" onClick={goToShop}>
            Kids
          </button>
          <button className="sidebar-link" onClick={goToShop}>
            Accessories
          </button>
        </div>
      </div>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}
    </div>
  );
}