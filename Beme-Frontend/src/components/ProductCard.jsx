import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./ProductCard.css";

function normalizeImages(product) {
  const list = Array.isArray(product?.images)
    ? product.images.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (list.length) return list;

  const single = String(product?.image || "").trim();
  return single ? [single] : [];
}

function parseBooleanish(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;

  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;

  if (
    [
      "true",
      "yes",
      "1",
      "in stock",
      "instock",
      "available",
      "active",
      "abroad",
      "imported",
      "international",
    ].includes(raw)
  ) {
    return true;
  }

  if (
    [
      "false",
      "no",
      "0",
      "out of stock",
      "outofstock",
      "unavailable",
      "inactive",
      "local",
    ].includes(raw)
  ) {
    return false;
  }

  return fallback;
}

function normalizeShippingSource(product) {
  const candidates = [
    product?.shippingSource,
    product?.shippingType,
    product?.shipFrom,
    product?.ship_from,
    product?.fulfillmentType,
    product?.originType,
    product?.shipping_origin,
    product?.shipping_origin_type,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim().toLowerCase();
    if (!value) continue;

    if (
      [
        "abroad",
        "ship from abroad",
        "ships from abroad",
        "international",
        "imported",
        "overseas",
      ].includes(value)
    ) {
      return "abroad";
    }

    if (["uni", "unisex", "universal"].includes(value)) {
      return "uni";
    }

    if (["local", "ghana", "domestic"].includes(value)) {
      return "local";
    }
  }

  if (
    parseBooleanish(product?.shipFromAbroad, false) ||
    parseBooleanish(product?.shipsFromAbroad, false)
  ) {
    return "abroad";
  }

  return "";
}

function getShippingBadgeLabel(source) {
  if (source === "abroad") return "Ships from abroad";
  if (source === "uni") return "Uni";
  return "";
}

function normalizeShop(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStock(product) {
  if (
    product?.inStock !== undefined ||
    product?.in_stock !== undefined ||
    product?.stockStatus !== undefined ||
    product?.stock_status !== undefined
  ) {
    return (
      parseBooleanish(product?.inStock, false) ||
      parseBooleanish(product?.in_stock, false) ||
      parseBooleanish(product?.stockStatus, false) ||
      parseBooleanish(product?.stock_status, false)
    );
  }

  const stockQty =
    product?.stock ??
    product?.quantity ??
    product?.qty ??
    product?.inventory ??
    product?.inventoryCount;

  if (stockQty !== undefined && stockQty !== null && stockQty !== "") {
    const qty = Number(stockQty);
    if (Number.isFinite(qty)) return qty > 0;
  }

  return true;
}

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [cardPopup, setCardPopup] = useState("");

  const id = product?.id ?? product?.docId ?? product?._id ?? "";
  const name = String(product?.name || "Untitled").trim() || "Untitled";

  const images = useMemo(() => normalizeImages(product), [product]);
  const image = images[0] || "";
  const imageCount = images.length;

  const shippingSource = useMemo(() => normalizeShippingSource(product), [product]);
  const shippingBadgeLabel = getShippingBadgeLabel(shippingSource);

  const shipsFromAbroad =
    shippingSource === "abroad" ||
    parseBooleanish(product?.shipFromAbroad, false) ||
    parseBooleanish(product?.shipsFromAbroad, false);

  const inStock = useMemo(() => normalizeStock(product), [product]);

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

  const showCardPopup = (message) => {
    setCardPopup(message);
    window.clearTimeout(showCardPopup._timeoutId);
    showCardPopup._timeoutId = window.setTimeout(() => {
      setCardPopup("");
    }, 2600);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!inStock) {
      showCardPopup("Sorry, this item is currently out of stock.");
      return;
    }

    try {
      addToCart({
        id,
        name,
        price: price ?? 0,
        oldPrice:
          oldPrice !== null && Number.isFinite(oldPrice) ? oldPrice : null,
        image,
        images,
        qty: 1,
        shop: normalizeShop(product?.shop),
        selectedOptions: {},
        selectedOptionsLabel: "",
        customizations: Array.isArray(product?.customizations)
          ? product.customizations
          : [],
        shippingSource,
        shipsFromAbroad,
        inStock: true,
        stock:
          product?.stock !== undefined && product?.stock !== null
            ? Number(product.stock) || 0
            : undefined,
        productId: id,
      });

      setCardPopup("");
    } catch (error) {
      console.error("ProductCard addToCart error:", error);
      showCardPopup("Unable to add this item to cart right now.");
    }
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
      <div className={`p-card ${!inStock ? "p-card--out" : ""}`}>
        <div className="p-media">
          {image ? (
            <>
              <img className="p-img" src={image} alt={name} loading="lazy" />

              {shippingBadgeLabel ? (
                <div
                  className={`p-ship-badge ${
                    shippingSource === "uni" ? "p-ship-badge--uni" : ""
                  } ${
                    shipsFromAbroad ? "p-ship-badge--abroad" : ""
                  }`}
                  aria-label={shippingBadgeLabel}
                >
                  {shippingBadgeLabel}
                </div>
              ) : null}

              {!inStock ? (
                <div className="p-stock-badge p-stock-badge--out">
                  Out of stock
                </div>
              ) : null}

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
            className={`p-cart-btn ${!inStock ? "p-cart-btn--disabled" : ""}`}
            onClick={handleAddToCart}
            aria-label={inStock ? "Add to cart" : "Product is out of stock"}
            type="button"
            disabled={!inStock}
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
              {inStock ? (
                <path
                  d="M12 11v6M9 14h6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M9 15l6-6M9 9l6 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>

          {cardPopup ? (
            <div className="p-card-popup" role="status" aria-live="polite">
              {cardPopup}
            </div>
          ) : null}
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