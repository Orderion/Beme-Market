import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import { Menu, Search, X } from "lucide-react";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate(); // ✅ React Router navigation

  const goToShop = () => {
    navigate("/shop");
  };

  return (
    <div className="home">

      {/* HEADER */}
      <header className="header">
        <button className="menu-btn" onClick={() => setMenuOpen(true)}>
          <Menu size={22} />
        </button>

        <h1 className="logo">Beme Market</h1>

        <button className="icon-btn" onClick={goToShop}>
          <Search size={20} />
        </button>
      </header>

      {/* SEARCH BAR */}
      <div className="search-container">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search products"
          className="search-input"
        />
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar">
        <button className="filter-btn" onClick={goToShop}>Categories ▾</button>
        <button className="filter-btn" onClick={goToShop}>More ▾</button>
        <button className="filter-btn" onClick={goToShop}>Offers</button>
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
            <h2>Mintah's Kente</h2>
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
          <span className="see-all" onClick={goToShop}>See all</span>
        </div>

        <div className="product-scroll">
          <div className="product-card" onClick={goToShop}>
            <img src="https://via.placeholder.com/300x350" alt="" />
            <p className="product-name">Electronics</p>
          </div>

          <div className="product-card" onClick={goToShop}>
            <img src="https://via.placeholder.com/300x350" alt="" />
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

        <div className="side-links">
          <button className="sidebar-link" onClick={goToShop}>Men</button>
          <button className="sidebar-link" onClick={goToShop}>Women</button>
          <button className="sidebar-link" onClick={goToShop}>Kids</button>
          <button className="sidebar-link" onClick={goToShop}>Accessories</button>
        </div>
      </div>

      {menuOpen && (
        <div className="overlay" onClick={() => setMenuOpen(false)} />
      )}
    </div>
  );
}
