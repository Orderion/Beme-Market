import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./ProductCard.css";

function normalizeImages(product) {
  const list = Array.isArray(product?.images)
    ? product.images.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (list.length) return list;
  return product?.image ? [product.image] : [];
}

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  const id = product?.id ?? product?.docId ?? product?._id ?? "";
  const name = product?.name ?? "Untitled";
  const images = normalizeImages(product);
  const image = images[0] || "";
  const imageCount = images.length;

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

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  const Wrapper = id ? Link : "div";
  const wrapperProps = id
    ? {
        to: `/product/${id}`,
        className: "p-card-link",
        "aria-label": `View ${name}`,
      }
    : { className: "p-card-link p-card-link--disabled" };

  return (
    <Wrapper {...wrapperProps}>
      <div className="p-card">
        <div className="p-media">
          {image ? (
            <>
              <img className="p-img" src={image} alt={name} loading="lazy" />

              {imageCount > 1 ? (
                <div
                  className="p-gallery-badge"
                  aria-label={`${imageCount} product images`}
                >
                  <span className="p-gallery-dot" />
                  <span>+{imageCount - 1}</span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="p-img p-img--empty">No image</div>
          )}

          <button
            className="p-cart-btn"
            onClick={handleAddToCart}
            aria-label="Add to cart"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="cart-svg"
              aria-hidden="true"
              focusable="false"
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
    </Wrapper>
  );
}