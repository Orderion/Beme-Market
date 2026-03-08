import { useState } from "react";
import { useNavigate } from "react-router-dom";
import banner from "../assets/home-banner.png";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const goToShop = () => navigate("/shop");

  const submitSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <div className="home">
      <form className="search-container" onSubmit={submitSearch}>
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
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>

        <input
          type="text"
          placeholder="Search products"
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button type="submit" className="search-submit">
          Search
        </button>
      </form>

      <div className="home-note">
        Browse categories, offers, and more from the menu.
      </div>

      <section className="hero">
        <img
          src={banner}
          alt="Beme Market new arrivals banner"
          className="hero-image"
        />

        <div className="hero-overlay">
          <span className="badge">Lowest price</span>
          <h2>New Arrival 2026</h2>
          <button className="primary-btn" onClick={goToShop}>
            View products
          </button>
        </div>
      </section>

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

      <section className="section">
        <div className="section-header">
          <h3>Continue shopping</h3>
          <button className="see-all-btn" onClick={goToShop}>
            See all
          </button>
        </div>

        <div className="product-scroll">
          <button className="product-card" onClick={goToShop}>
            <img src="https://placehold.co/300x350" alt="Electronics" />
            <p className="product-name">Electronics</p>
          </button>

          <button className="product-card" onClick={goToShop}>
            <img src="https://placehold.co/300x350" alt="Ghana made" />
            <p className="product-name">Ghana Made</p>
          </button>
        </div>
      </section>
    </div>
  );
}