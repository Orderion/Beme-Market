import React from "react";
import ProductGrid from "../components/ProductGrid";
import "./Shop.css";

const Shop = () => {
  return (
    <div className="shop-page">
      <h2>New In Stock</h2>
      <ProductGrid />
    </div>
  );
};

export default Shop;