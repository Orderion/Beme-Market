import React from "react";
import ProductGrid from "../components/ProductGrid";
import "./Shop.css";

const Shop = () => {
  return (
    <div className="shop-page">
      <h2>New Arrivals</h2>
      <ProductGrid />
    </div>
  );
};

export default Shop;