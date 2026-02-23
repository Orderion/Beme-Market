import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import "./Shop.css";

const Shop = () => {
  const location = useLocation();
  const category = location.state?.category || null;

  // simple UI state (you can wire these later)
  const [sortBy, setSortBy] = useState("new");

  const title = useMemo(() => {
    // match the reference style (big title)
    return category ? `${category}` : "Hot sale";
  }, [category]);

  return (
    <div className="shop-page">
      <div className="shop-header">
        <h1 className="shop-title">{title}</h1>

        <div className="shop-controls">
          <button className="shop-control-btn" type="button">
            <span className="shop-control-icon">⎚</span>
            <span>Filter</span>
          </button>

          <div className="shop-divider" />

          <button
            className="shop-control-btn"
            type="button"
            onClick={() => setSortBy((s) => (s === "new" ? "price" : "new"))}
            title="Toggle sort (demo)"
          >
            <span className="shop-control-icon">⇅</span>
            <span>Sort</span>
          </button>
        </div>

        {/* Item count (we’ll pass count back from ProductGrid) */}
        <div className="shop-meta">
          <span className="shop-count">
            <ProductGrid filter={category} sortBy={sortBy} withCount />
          </span>
        </div>
      </div>

      {/* The real grid renders inside ProductGrid when withCount=false,
          so we render it again below for layout. */}
      <ProductGrid filter={category} sortBy={sortBy} />
    </div>
  );
};

export default Shop;