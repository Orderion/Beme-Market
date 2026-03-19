import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { HOME_FILTER_OPTIONS, SHOPS } from "../constants/catalog";
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

function normalizeShop(value) {
  return String(value || "").trim().toLowerCase();
}

function formatShopLabel(value) {
  const key = normalizeShop(value);
  const match = SHOPS.find((shop) => shop.key === key);
  return match?.label || "";
}

function normalizeHomeSlot(value) {
  return String(value || "").trim().toLowerCase();
}

function formatHomeSlotLabel(value) {
  const key = normalizeHomeSlot(value);
  const match = HOME_FILTER_OPTIONS.find((item) => item.key === key);
  return match?.label || "";
}

function getNumericStock(product) {
  const parsed = Number(product?.stock);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStock(product) {
  return parseBooleanish(product?.inStock, true);
}

function normalizeCustomizations(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((group, groupIndex) => ({
      id: group?.id || `${group?.name || "option"}-${groupIndex}`,
      name: String(group?.name || "").trim(),
      type: group?.type === "select" ? "select" : "buttons",
      required: group?.required !== false,
      values: Array.isArray(group?.values)
        ? group.values
            .map((value, valueIndex) => {
              if (value && typeof value === "object") {
                const label = String(
                  value.label ?? value.value ?? value.name ?? ""
                ).trim();

                if (!label) return null;

                return {
                  id:
                    value.id ||
                    `${group?.name || "option"}-${groupIndex}-${valueIndex}`,
                  label,
                  priceBump: Number(value.priceBump || 0) || 0,
                };
              }

              const label = String(value || "").trim();
              if (!label) return null;

              return {
                id: `${group?.name || "option"}-${groupIndex}-${valueIndex}`,
                label,
                priceBump: 0,
              };
            })
            .filter(Boolean)
        : [],
    }))
    .filter((group) => group.name && group.values.length > 0);
}

function getItemAbroadDeliveryFee(product) {
  if (
    !parseBooleanish(product?.shipsFromAbroad, false) &&
    !parseBooleanish(product?.shipFromAbroad, false)
  ) {
    return 0;
  }

  const parsed = Number(product?.abroadDeliveryFee);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getDescriptionSnippet(product) {
  const candidates = [
    product?.shortDescription,
    product?.short_description,
    product?.descriptionSnippet,
    product?.description_snippet,
    product?.tagline,
    product?.summary,
    product?.description,
  ];

  for (const item of candidates) {
    const text = String(item || "").replace(/\s+/g, " ").trim();
    if (text) {
      return text.length > 88 ? `${text.slice(0, 85).trim()}...` : text;
    }
  }

  return "";
}

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [cardPopup, setCardPopup] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const touchStartXRef = useRef(null);
  const touchDeltaXRef = useRef(0);

  const id = product?.id ?? product?.docId ?? product?._id ?? "";
  const name = String(product?.name || "Untitled").trim() || "Untitled";

  const images = useMemo(() => normalizeImages(product), [product]);
  const imageCount = images.length;
  const activeImage = images[activeImageIndex] || images[0] || "";

  useEffect(() => {
    setActiveImageIndex(0);
  }, [id, imageCount]);

  const shippingSource = useMemo(
    () => normalizeShippingSource(product),
    [product]
  );

  const shipsFromAbroad =
    shippingSource === "abroad" ||
    parseBooleanish(product?.shipFromAbroad, false) ||
    parseBooleanish(product?.shipsFromAbroad, false);

  const abroadDeliveryFee = useMemo(
    () => getItemAbroadDeliveryFee(product),
    [product]
  );

  const inStock = useMemo(() => normalizeStock(product), [product]);
  const stock = useMemo(() => getNumericStock(product), [product]);

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

  const customizations = useMemo(
    () => normalizeCustomizations(product?.customizations),
    [product]
  );

  const shopLabel = useMemo(
    () => formatShopLabel(product?.shop),
    [product?.shop]
  );

  const homeSlotLabel = useMemo(
    () => formatHomeSlotLabel(product?.homeSlot),
    [product?.homeSlot]
  );

  const descriptionSnippet = useMemo(
    () => getDescriptionSnippet(product),
    [product]
  );

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
        basePrice: price ?? 0,
        optionPriceTotal: 0,
        oldPrice:
          oldPrice !== null && Number.isFinite(oldPrice) ? oldPrice : null,
        image: activeImage || images[0] || "",
        images,
        qty: 1,
        shop: normalizeShop(product?.shop),
        homeSlot: normalizeHomeSlot(product?.homeSlot || "others"),
        selectedOptions: {},
        selectedOptionsLabel: "",
        selectedOptionDetails: [],
        customizations,
        shippingSource,
        shipsFromAbroad,
        abroadDeliveryFee,
        inStock,
        stock,
        productId: id,
      });

      setCardPopup("");
    } catch (error) {
      console.error("ProductCard addToCart error:", error);
      showCardPopup("Unable to add this item to cart right now.");
    }
  };

  const goToImage = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex(index);
  };

  const goPrevImage = () => {
    if (imageCount <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
  };

  const goNextImage = () => {
    if (imageCount <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % imageCount);
  };

  const handleTouchStart = (e) => {
    if (imageCount <= 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchDeltaXRef.current = 0;
  };

  const handleTouchMove = (e) => {
    if (imageCount <= 1 || touchStartXRef.current === null) return;
    touchDeltaXRef.current = e.touches[0].clientX - touchStartXRef.current;
  };

  const handleTouchEnd = () => {
    if (imageCount <= 1 || touchStartXRef.current === null) return;

    const deltaX = touchDeltaXRef.current;
    const threshold = 36;

    if (deltaX <= -threshold) {
      goNextImage();
    } else if (deltaX >= threshold) {
      goPrevImage();
    }

    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
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
        <div
          className="p-media"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {activeImage ? (
            <>
              <div className="p-media-frame">
                <img
                  className="p-img"
                  src={activeImage}
                  alt={name}
                  loading="lazy"
                />
              </div>

              <div className="p-media-top">
                <button
                  className={`p-cart-btn ${
                    !inStock ? "p-cart-btn--disabled" : ""
                  }`}
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
              </div>

              {!inStock ? (
                <div className="p-stock-badge p-stock-badge--out">
                  Out of stock
                </div>
              ) : null}

              {imageCount > 1 ? (
                <>
                  <button
                    className="p-media-nav p-media-nav--prev"
                    type="button"
                    aria-label="Previous image"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goPrevImage();
                    }}
                  >
                    ‹
                  </button>

                  <button
                    className="p-media-nav p-media-nav--next"
                    type="button"
                    aria-label="Next image"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goNextImage();
                    }}
                  >
                    ›
                  </button>

                  <div
                    className="p-gallery-dots"
                    aria-label={`${imageCount} product images`}
                  >
                    {images.map((img, index) => (
                      <button
                        key={`${img}-${index}`}
                        type="button"
                        className={`p-gallery-dot ${
                          index === activeImageIndex
                            ? "p-gallery-dot--active"
                            : ""
                        }`}
                        aria-label={`Show image ${index + 1}`}
                        onClick={(e) => goToImage(e, index)}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="p-img p-img--empty">No image</div>
          )}

          {cardPopup ? (
            <div className="p-card-popup" role="status" aria-live="polite">
              {cardPopup}
            </div>
          ) : null}
        </div>

        <div className="p-body">
          {shopLabel ? (
            <div className="p-meta-line">
              <span className="p-meta-chip">{shopLabel}</span>
            </div>
          ) : null}

          <h3 className="p-name">{name}</h3>

          {descriptionSnippet ? (
            <p className="p-desc">{descriptionSnippet}</p>
          ) : (
            <div className="p-desc p-desc--empty" aria-hidden="true" />
          )}

          {price !== null ? (
            <div className="p-prices">
              <span className="p-price">{formatMoney(price)}</span>

              {oldPrice !== null && oldPrice > price ? (
                <span className="p-old-wrap">
                  <span className="p-old-label">Old price</span>
                  <span className="p-old">{formatMoney(oldPrice)}</span>
                </span>
              ) : null}
            </div>
          ) : (
            <span className="p-missing">No price</span>
          )}
        </div>
      </div>
    </Wrapper>
  );
}