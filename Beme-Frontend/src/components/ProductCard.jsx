import React from "react";
import { useCart } from "../context/CartContext";
import "./ProductCard.css";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const name = product?.name || "Untitled";
  const image = product?.image || "";
  const price = product?.price ?? "";
  const oldPrice = product?.oldPrice ?? "";

  const onSale = Boolean(oldPrice) && String(oldPrice).trim() !== "";

  return (
    <div className="p-card">
      <div className="p-media">
        {image ? (
          <img className="p-img" src={image} alt={name} loading="lazy" />
        ) : (
          <div className="p-img-placeholder">No image</div>
        )}

        <button
          type="button"
          className="p-bag"
          onClick={() => addToCart(product)}
          aria-label="Add to cart"
          title="Add to cart"
        >
          👜+
        </button>

        {onSale && <div className="p-sale">On sale</div>}
      </div>

      <div className="p-info">
        <div className="p-name">{name}</div>

        <div className="p-prices">
          <div className="p-price">{price}</div>
          {onSale && <div className="p-old">{oldPrice}</div>}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;