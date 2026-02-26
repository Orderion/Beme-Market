// src/pages/Home.jsx
import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  const goToShop = () => navigate("/shop");

  return (
    <div className="home">
      {/* ✅ SEARCH BAR */}
      <div className="search-container">
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

      {/* ✅ FILTER BAR */}
      <div className="filter-bar">
        <button className="filter-btn">Categories ▾</button>
        <button className="filter-btn">More ▾</button>
        <button className="filter-btn">Offers</button>
      </div>

      {/* ✅ HERO CARD */}
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
    </div>
  );
}