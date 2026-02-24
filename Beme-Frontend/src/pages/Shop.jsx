// src/pages/Shop.jsx
import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import "./Shop.css";

const Shop = () => {
  const location = useLocation();
  const category = location.state?.category || null;

  const [sortBy, setSortBy] = useState("new");

  const title = useMemo(() => {
    return category ? `${category}` : "Hot sale";
  }, [category]);

  return (
    <div className="shop-page">
      {/* Top bar with centered title (no menu btn here anymore) */}
      <div className="shop-topbar">
        <div className="shop-top-spacer" />

        <div className="shop-top-title-wrap">
          <h1 className="shop-title">{title}</h1>
        </div>

        <div className="shop-top-spacer" />
      </div>

      {/* Filter / Sort row */}
      <div className="shop-controls">
        <button className="shop-control-btn" type="button">
          <span className="shop-control-icon" aria-hidden="true">
            {/* Minimal sliders icon */}
            <svg
              viewBox="0 0 24 24"
              className="shop-svg"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 7h10M18 7h2
                   M4 17h6M14 17h6"
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
            <svg
              viewBox="0 0 24 24"
              className="shop-svg"
              xmlns="http://www.w3.org/2000/svg"
            >
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
    </div>
  );
};

export default Shop;