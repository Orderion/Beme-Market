import { useState } from "react";
import "./Home.css";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  return (
    <div className="home">
      <Navbar onMenuClick={() => setMenuOpen(true)} />

      <Sidebar
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {/* FILTER BAR */}
      <div className="filter-bar">
        <div className="filter-wrapper">
          <button
            className="filter-btn"
            onClick={() => setShowCategories(!showCategories)}
          >
            Categories ▾
          </button>

          {showCategories && (
            <Sidebar
              type="dropdown"
              onClose={() => setShowCategories(false)}
            />
          )}
        </div>

        <button className="filter-btn">More ▾</button>
        <button className="filter-btn">Offers</button>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <h2>XMAS Collections</h2>
          <button className="primary-btn">View collection</button>
        </div>
      </section>

      {/* CONTINUE SHOPPING */}
      <section className="section">
        <div className="section-header">
          <h3>Continue shopping</h3>
          <span className="see-all">See all</span>
        </div>

        <div className="product-scroll">
          <div className="product-card">
            <span className="badge">Bestseller</span>
            <img src="https://via.placeholder.com/300x350" alt="" />
            <p className="product-name">Home Jersey 2025/26</p>
          </div>

          <div className="product-card">
            <img src="https://via.placeholder.com/300x350" alt="" />
            <p className="product-name">Away Jersey</p>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="section">
        <h3 className="section-title">Featured in post</h3>

        <div className="featured-card">
          <span className="badge gray">Price drop</span>
          <img src="https://via.placeholder.com/500x300" alt="" />
        </div>
      </section>
    </div>
  );
}
