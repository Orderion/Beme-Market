import React from "react";
import { useLocation } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import "./Shop.css";

const Shop = () => {
  const location = useLocation();

  // Optional: get category or filter from state or query
  const category = location.state?.category || null;

  return (
    <div className="shop-page">
      <h2>New In Stock {category ? `- ${category}` : ""}</h2>
      <ProductGrid filter={category} />
    </div>
  );
};

export default Shop;
