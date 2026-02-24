import React from "react";
import { useCart } from "../context/CartContext";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  const name = product?.name ?? "Untitled";
  const image = product?.image ?? "";
  const priceRaw = product?.price;
  const oldPriceRaw = product?.oldPrice;

  const price =
    priceRaw !== undefined && priceRaw !== null && priceRaw !== ""
      ? Number(priceRaw)
      : null;

  const oldPrice =
    oldPriceRaw !== undefined && oldPriceRaw !== null && oldPriceRaw !== ""
      ? Number(oldPriceRaw)
      : null;

  const formatMoney = (n) => {
    if (n === null || Number.isNaN(n)) return "";
    return `GHS ${n.toFixed(2)}`;
  };

  return (
    <div className="p-card">
      <div className="p-media">
        {image ? (
          <img className="p-img" src={image} alt={name} />
        ) : (
          <div className="p-img p-img--empty">No image</div>
        )}

        <button
          className="p-cart-btn"
          onClick={() => addToCart(product)}
          aria-label="Add to cart"
        >
          {/* Minimal Black SVG Shopping Bag */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="cart-svg"
          >
            <path
              d="M6 7h12l-1 12H7L6 7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M9 7V5a3 3 0 0 1 6 0v2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M12 11v6M9 14h6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="p-body">
        <p className="p-name">{name}</p>

        {price !== null ? (
          <div className="p-prices">
            <span className="p-price">{formatMoney(price)}</span>

            {oldPrice !== null && oldPrice > price && (
              <span className="p-old">{formatMoney(oldPrice)}</span>
            )}
          </div>
        ) : (
          <span className="p-missing">No price</span>
        )}
      </div>
    </div>
  );
}