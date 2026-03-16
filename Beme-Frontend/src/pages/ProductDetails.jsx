import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import "./ProductDetails.css";

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
      "overseas",
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

function normalizeCustomizations(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((group, index) => ({
      id: group?.id || `${group?.name || "option"}-${index}`,
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
                    `${group?.name || "option"}-${index}-value-${valueIndex}`,
                  label,
                  priceBump: Number(value.priceBump || 0) || 0,
                };
              }

              const label = String(value || "").trim();
              if (!label) return null;

              return {
                id: `${group?.name || "option"}-${index}-value-${valueIndex}`,
                label,
                priceBump: 0,
              };
            })
            .filter(Boolean)
        : [],
    }))
    .filter((group) => group.name && group.values.length > 0);
}

function buildSelectedOptionsLabel(selectedOptions) {
  return Object.entries(selectedOptions)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" • ");
}

function normalizeImages(product) {
  const list = Array.isArray(product?.images)
    ? product.images.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (list.length) return list;

  const single = String(product?.image || "").trim();
  return single ? [single] : [];
}

function normalizeShop(value) {
  return String(value || "").trim().toLowerCase();
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

function getNumericStock(product) {
  const parsed = Number(product?.stock);
  return Number.isFinite(parsed) ? parsed : null;
}

function getAbroadDeliveryFee(product) {
  const parsed = Number(product?.abroadDeliveryFee);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function MonoStatusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      className="pd-badge-icon"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 12.3l2.2 2.2 4.8-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MonoGalleryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      className="pd-badge-icon"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="9" cy="10" r="1.4" fill="currentColor" />
      <path
        d="M7 16l3.5-3.5 2.5 2.5 2.5-3 1.5 1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.5 21v-7.2h2.4l.36-2.8H13.5V9.2c0-.81.23-1.36 1.39-1.36H16.4V5.33c-.26-.04-1.13-.11-2.14-.11-2.12 0-3.57 1.29-3.57 3.67v2.11H8.3v2.8h2.39V21h2.81Z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.9 3H21l-4.59 5.25L21.8 21h-4.22l-3.31-4.32L10.49 21H8.37l4.9-5.6L2.8 3h4.33l2.99 3.91L13.54 3h2.12l-4.58 5.24L18.9 3Zm-1.48 16h1.17L6.53 4.9H5.28L17.42 19Z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.75 3h8.5A4.75 4.75 0 0 1 21 7.75v8.5A4.75 4.75 0 0 1 16.25 21h-8.5A4.75 4.75 0 0 1 3 16.25v-8.5A4.75 4.75 0 0 1 7.75 3Zm0 1.8A2.95 2.95 0 0 0 4.8 7.75v8.5a2.95 2.95 0 0 0 2.95 2.95h8.5a2.95 2.95 0 0 0 2.95-2.95v-8.5a2.95 2.95 0 0 0-2.95-2.95h-8.5Zm8.9 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7.2A4.8 4.8 0 1 1 7.2 12 4.81 4.81 0 0 1 12 7.2Zm0 1.8A3 3 0 1 0 15 12a3 3 0 0 0-3-3Z"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.6 3c.28 2.2 1.52 3.78 3.62 4.18v2.54a6.3 6.3 0 0 1-3.45-1.15v6.08A5.83 5.83 0 1 1 8.94 8.8v2.7a3.18 3.18 0 1 0 2.92 3.17V3h2.74Z"
      />
    </svg>
  );
}

function ProductDetailsSkeleton() {
  return (
    <div className="pd-page">
      <div className="pd-container">
        <div className="pd-media-col">
          <div className="pd-skeleton pd-skeleton-media" />
          <div className="pd-skeleton-thumb-row">
            <div className="pd-skeleton pd-skeleton-thumb" />
            <div className="pd-skeleton pd-skeleton-thumb" />
            <div className="pd-skeleton pd-skeleton-thumb" />
          </div>
        </div>

        <div className="pd-info">
          <div className="pd-skeleton pd-skeleton-title" />
          <div className="pd-skeleton pd-skeleton-badge" />
          <div className="pd-skeleton pd-skeleton-price" />
          <div className="pd-skeleton pd-skeleton-line" />
          <div className="pd-skeleton pd-skeleton-line" />
          <div className="pd-skeleton pd-skeleton-line short" />
          <div className="pd-skeleton pd-skeleton-btn" />
          <div className="pd-skeleton pd-skeleton-btn" />
        </div>
      </div>
    </div>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [optionError, setOptionError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [cartFeedback, setCartFeedback] = useState("");

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const feedbackTimerRef = useRef(null);
  const touchStartXRef = useRef(0);
  const dragStartedRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      try {
        const snap = await getDoc(doc(db, "Products", id));

        if (!snap.exists()) {
          setProduct(null);
          setLoading(false);
          return;
        }

        const nextProduct = { id: snap.id, ...snap.data() };
        setProduct(nextProduct);
      } catch (error) {
        console.error("Product details fetch error:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    run();

    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, [id]);

  const customizations = useMemo(
    () => normalizeCustomizations(product?.customizations),
    [product?.customizations]
  );

  const images = useMemo(() => normalizeImages(product), [product]);

  const basePrice = useMemo(() => Number(product?.price || 0), [product]);
  const oldPrice = useMemo(() => Number(product?.oldPrice || 0), [product]);

  const shopKey = useMemo(() => normalizeShop(product?.shop), [product?.shop]);
  const brand = useMemo(() => String(product?.brand || "").trim(), [product]);

  const shippingSource = useMemo(
    () => normalizeShippingSource(product),
    [product]
  );

  const shippingBadgeLabel = useMemo(
    () => getShippingBadgeLabel(shippingSource),
    [shippingSource]
  );

  const shipsFromAbroad = useMemo(
    () =>
      shippingSource === "abroad" ||
      parseBooleanish(product?.shipFromAbroad, false) ||
      parseBooleanish(product?.shipsFromAbroad, false),
    [shippingSource, product]
  );

  const stock = useMemo(() => getNumericStock(product), [product]);
  const abroadDeliveryFee = useMemo(
    () => getAbroadDeliveryFee(product),
    [product]
  );

  const isOutOfStock = useMemo(() => {
    return parseBooleanish(product?.inStock, true) === false;
  }, [product]);

  useEffect(() => {
    const initialSelections = {};
    customizations.forEach((group) => {
      initialSelections[group.name] = "";
    });
    setSelectedOptions(initialSelections);
    setOptionError("");
    setCartFeedback("");
  }, [customizations, product?.id]);

  useEffect(() => {
    setActiveImageIndex(0);
    setQty(1);
    setAddedFeedback(false);
    setCartFeedback("");
    setDragOffset(0);
    setIsDragging(false);
  }, [product?.id]);

  useEffect(() => {
    if (stock !== null) {
      setQty((prev) => Math.max(1, Math.min(prev, Math.max(stock, 1))));
    }
  }, [stock]);

  const formatMoney = (n) => `GHS ${Number(n || 0).toFixed(2)}`;

  const selectedOptionDetails = useMemo(() => {
    const details = [];

    customizations.forEach((group) => {
      const selectedLabel = selectedOptions[group.name];
      if (!selectedLabel) return;

      const matchedValue = group.values.find(
        (value) => value.label === selectedLabel
      );
      if (!matchedValue) return;

      details.push({
        groupName: group.name,
        label: matchedValue.label,
        priceBump: Number(matchedValue.priceBump || 0) || 0,
      });
    });

    return details;
  }, [customizations, selectedOptions]);

  const optionPriceTotal = useMemo(() => {
    return selectedOptionDetails.reduce(
      (sum, item) => sum + (Number(item.priceBump || 0) || 0),
      0
    );
  }, [selectedOptionDetails]);

  const finalUnitPrice = useMemo(() => {
    return basePrice + optionPriceTotal;
  }, [basePrice, optionPriceTotal]);

  const setOptionValue = (groupName, value) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupName]: value,
    }));
    setOptionError("");
    setCartFeedback("");
  };

  const validateSelections = () => {
    for (const group of customizations) {
      if (group.required && !selectedOptions[group.name]) {
        return `Please choose ${group.name}.`;
      }
    }
    return "";
  };

  const buildCartItem = () => {
    if (!product) return null;

    const selectedOptionsLabel = buildSelectedOptionsLabel(selectedOptions);

    return {
      id: product.id,
      name: product.name,
      price: Number(finalUnitPrice || 0),
      basePrice: Number(basePrice || 0),
      optionPriceTotal: Number(optionPriceTotal || 0),
      oldPrice:
        product?.oldPrice !== undefined &&
        product?.oldPrice !== null &&
        product?.oldPrice !== ""
          ? Number(product.oldPrice || 0)
          : null,
      image: String(product.image || images[0] || "").trim(),
      images,
      qty,
      stock,
      inStock: parseBooleanish(product?.inStock, true),
      shop: shopKey || "",
      selectedOptions,
      selectedOptionsLabel,
      selectedOptionDetails,
      customizations,
      shippingSource,
      shipsFromAbroad,
      abroadDeliveryFee,
      productId: product.id,
    };
  };

  const triggerAddedFeedback = (message = "Added to cart successfully.") => {
    setAddedFeedback(true);
    setCartFeedback(message);

    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }

    feedbackTimerRef.current = window.setTimeout(() => {
      setAddedFeedback(false);
      setCartFeedback("");
    }, 1800);
  };

  const triggerErrorFeedback = (message) => {
    setAddedFeedback(false);
    setCartFeedback(message);

    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }

    feedbackTimerRef.current = window.setTimeout(() => {
      setCartFeedback("");
    }, 2200);
  };

  const handleAdd = () => {
    if (!product) return;

    if (isOutOfStock) {
      triggerErrorFeedback("Sorry, this item is currently out of stock.");
      return;
    }

    const selectionError = validateSelections();
    if (selectionError) {
      setOptionError(selectionError);
      return;
    }

    const item = buildCartItem();
    if (!item) return;

    const result = addToCart(item);

    if (result?.ok === false) {
      triggerErrorFeedback(result.message || "Unable to add this item.");
      return;
    }

    triggerAddedFeedback(result?.message || "Added to cart successfully.");
  };

  const handleBuyNow = () => {
    if (!product) return;

    if (isOutOfStock) {
      triggerErrorFeedback("Sorry, this item is currently out of stock.");
      return;
    }

    const selectionError = validateSelections();
    if (selectionError) {
      setOptionError(selectionError);
      return;
    }

    const item = buildCartItem();
    if (!item) return;

    const result = addToCart(item);

    if (result?.ok === false) {
      triggerErrorFeedback(result.message || "Unable to add this item.");
      return;
    }

    navigate("/checkout");
  };

  const goPrevImage = () => {
    if (images.length <= 1) return;
    setDragOffset(0);
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goNextImage = () => {
    if (images.length <= 1) return;
    setDragOffset(0);
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const onTouchStart = (e) => {
    if (images.length <= 1) return;
    touchStartXRef.current = e.changedTouches[0]?.clientX || 0;
    dragStartedRef.current = true;
    setIsDragging(true);
  };

  const onTouchMove = (e) => {
    if (!dragStartedRef.current || images.length <= 1) return;
    const currentX = e.changedTouches[0]?.clientX || 0;
    const delta = currentX - touchStartXRef.current;
    setDragOffset(delta);
  };

  const onTouchEnd = (e) => {
    if (!dragStartedRef.current || images.length <= 1) return;

    const endX = e.changedTouches[0]?.clientX || 0;
    const delta = endX - touchStartXRef.current;

    dragStartedRef.current = false;
    setIsDragging(false);

    const threshold = 50;

    if (Math.abs(delta) >= threshold) {
      if (delta < 0) goNextImage();
      else goPrevImage();
      return;
    }

    setDragOffset(0);
  };

  const onTouchCancel = () => {
    dragStartedRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  };

  if (loading) return <ProductDetailsSkeleton />;

  if (!product) {
    return (
      <div className="pd-page">
        <div className="pd-empty-state">
          <div className="pd-empty-card">
            <h1>Product not found</h1>
            <p>
              The product you are looking for may have been removed or is no
              longer available.
            </p>
            <div className="pd-empty-actions">
              <Link to="/shop" className="pd-empty-btn">
                Back to shop
              </Link>
              <Link to="/" className="pd-empty-btn pd-empty-btn--ghost">
                Go home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const name = product?.name ?? "Untitled";
  const desc =
    product?.description ??
    "This is a premium product from Beme Market. Add a description in Firestore to show details here.";
  const qtyLimitReached = stock !== null && qty >= stock;
  const sliderTranslate = `calc(${-activeImageIndex * 100}% + ${dragOffset}px)`;

  const socialLinks = [
    {
      label: "Facebook",
      href: "#",
      icon: <FacebookIcon />,
    },
    {
      label: "X",
      href: "#",
      icon: <XIcon />,
    },
    {
      label: "Instagram",
      href: "#",
      icon: <InstagramIcon />,
    },
    {
      label: "TikTok",
      href: "#",
      icon: <TikTokIcon />,
    },
  ];

  return (
    <div className="pd-page">
      <div className="pd-container">
        <div className="pd-media-col">
          <div
            className={`pd-media ${isDragging ? "is-dragging" : ""}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchCancel}
          >
            {images.length ? (
              <>
                <div
                  className={`pd-slider ${isDragging ? "is-dragging" : ""}`}
                  style={{ transform: `translate3d(${sliderTranslate}, 0, 0)` }}
                >
                  {images.map((src, index) => (
                    <div className="pd-slide" key={`${src}-${index}`}>
                      <img
                        className="pd-img"
                        src={src}
                        alt={`${name} ${index + 1}`}
                        draggable="false"
                      />
                    </div>
                  ))}
                </div>

                {shippingBadgeLabel ? (
                  <div
                    className={`pd-ship-badge ${
                      shippingSource === "uni" ? "pd-ship-badge--uni" : ""
                    } ${shipsFromAbroad ? "pd-ship-badge--abroad" : ""}`}
                    aria-label={shippingBadgeLabel}
                  >
                    {shippingBadgeLabel}
                  </div>
                ) : null}

                {isOutOfStock ? (
                  <div className="pd-stock-badge pd-stock-badge--out">
                    Out of stock
                  </div>
                ) : null}

                {images.length > 1 ? (
                  <>
                    <div className="pd-gallery-topbar">
                      <span className="pd-gallery-chip">Gallery</span>
                      <span className="pd-gallery-count">
                        {activeImageIndex + 1} / {images.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="pd-carousel-btn pd-carousel-btn--left"
                      onClick={goPrevImage}
                      aria-label="Previous image"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      className="pd-carousel-btn pd-carousel-btn--right"
                      onClick={goNextImage}
                      aria-label="Next image"
                    >
                      ›
                    </button>

                    <div className="pd-carousel-dots">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`pd-dot ${
                            index === activeImageIndex ? "active" : ""
                          }`}
                          onClick={() => {
                            setDragOffset(0);
                            setActiveImageIndex(index);
                          }}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <div className="pd-img pd-img--empty">No image</div>
            )}
          </div>

          {images.length > 1 ? (
            <div className="pd-thumbs">
              {images.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  className={`pd-thumb ${
                    index === activeImageIndex ? "active" : ""
                  }`}
                  onClick={() => {
                    setDragOffset(0);
                    setActiveImageIndex(index);
                  }}
                  aria-label={`Select image ${index + 1}`}
                >
                  <img
                    src={src}
                    alt={`${name} ${index + 1}`}
                    className="pd-thumb-img"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pd-info">
          <h1 className="pd-title">{name}</h1>

          <div className="pd-meta">
            <div className="pd-badge">
              <MonoStatusIcon />
              <span>{isOutOfStock ? "Out of stock" : "In stock"}</span>
            </div>

            {shippingBadgeLabel ? (
              <div
                className={`pd-badge ${
                  shippingSource === "uni" ? "pd-badge--uni" : "pd-badge--ship"
                } ${shipsFromAbroad ? "pd-badge--ship-abroad" : ""}`}
              >
                <span>{shippingBadgeLabel}</span>
              </div>
            ) : null}

            {images.length > 1 ? (
              <div className="pd-badge">
                <MonoGalleryIcon />
                <span>{images.length} product images</span>
              </div>
            ) : null}
          </div>

          <div className="pd-price-row">
            <div className="pd-price">{formatMoney(finalUnitPrice)}</div>

            {optionPriceTotal > 0 ? (
              <div className="pd-old">
                <span className="pd-save">
                  Includes options: +{formatMoney(optionPriceTotal)}
                </span>
              </div>
            ) : null}

            {oldPrice > finalUnitPrice ? (
              <div className="pd-old">
                <span className="pd-old-strike">{formatMoney(oldPrice)}</span>
                <span className="pd-save">
                  Save {formatMoney(oldPrice - finalUnitPrice)}
                </span>
              </div>
            ) : null}
          </div>

          {brand ? (
            <div className="pd-section">
              <h3 className="pd-section-title">Brand</h3>
              <div className="pd-brand-card">
                <strong className="pd-brand-name">{brand}</strong>
              </div>
            </div>
          ) : null}

          <div className="pd-section">
            <h3 className="pd-section-title">Description</h3>
            <p className="pd-desc">{desc}</p>
          </div>

          <div className="pd-section">
            <h3 className="pd-section-title">Socials</h3>
            <div className="pd-socials">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="pd-social-link"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>

          {customizations.length > 0 ? (
            <div className="pd-section">
              <h3 className="pd-section-title">Options</h3>

              <div className="pd-options">
                {customizations.map((group) => (
                  <div className="pd-option-group" key={group.id}>
                    <div className="pd-option-head">
                      <span className="pd-option-name">{group.name}</span>
                      {group.required ? (
                        <span className="pd-option-required">Required</span>
                      ) : null}
                    </div>

                    {group.type === "select" ? (
                      <select
                        className="pd-option-select"
                        value={selectedOptions[group.name] || ""}
                        onChange={(e) =>
                          setOptionValue(group.name, e.target.value)
                        }
                      >
                        <option value="">
                          Select {group.name.toLowerCase()}
                        </option>
                        {group.values.map((value) => (
                          <option key={value.id} value={value.label}>
                            {value.label}
                            {value.priceBump > 0
                              ? ` (+${formatMoney(value.priceBump)})`
                              : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="pd-option-buttons">
                        {group.values.map((value) => {
                          const active =
                            selectedOptions[group.name] === value.label;
                          return (
                            <button
                              key={value.id}
                              type="button"
                              className={`pd-option-btn ${active ? "active" : ""}`}
                              onClick={() =>
                                setOptionValue(group.name, value.label)
                              }
                            >
                              {value.label}
                              {value.priceBump > 0 ? (
                                <span style={{ marginLeft: 6 }}>
                                  +{formatMoney(value.priceBump)}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedOptionDetails.length > 0 ? (
                <div className="pd-option-error">
                  {selectedOptionDetails.map((item) => (
                    <div key={`${item.groupName}-${item.label}`}>
                      {item.groupName}: {item.label}
                      {item.priceBump > 0
                        ? ` (+${formatMoney(item.priceBump)})`
                        : ""}
                    </div>
                  ))}
                </div>
              ) : null}

              {optionError ? (
                <div className="pd-option-error">{optionError}</div>
              ) : null}
            </div>
          ) : null}

          <div className="pd-qty-row">
            <div className="pd-qty-label">
              Quantity
              {stock !== null && !isOutOfStock ? (
                <span className="pd-qty-stock-note"> • {stock} available</span>
              ) : null}
            </div>

            <div className="pd-qty">
              <button
                className="pd-qty-btn"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                type="button"
                aria-label="Decrease"
                disabled={isOutOfStock}
              >
                −
              </button>
              <div className="pd-qty-num">{qty}</div>
              <button
                className="pd-qty-btn"
                onClick={() =>
                  setQty((q) => {
                    if (stock !== null) {
                      return Math.min(stock, q + 1);
                    }
                    return q + 1;
                  })
                }
                type="button"
                aria-label="Increase"
                disabled={isOutOfStock || qtyLimitReached}
              >
                +
              </button>
            </div>
          </div>

          {stock !== null && !isOutOfStock && qtyLimitReached ? (
            <div className="pd-option-error">
              You have reached the maximum available quantity for this product.
            </div>
          ) : null}

          {shipsFromAbroad && abroadDeliveryFee > 0 ? (
            <div className="pd-option-error">
              Abroad delivery fee: {formatMoney(abroadDeliveryFee)}
            </div>
          ) : null}

          {isOutOfStock ? (
            <div className="pd-option-error">
              Sorry, this product is currently unavailable.
            </div>
          ) : null}

          {cartFeedback ? (
            <div className={addedFeedback ? "pd-added-feedback" : "pd-option-error"}>
              {cartFeedback}
            </div>
          ) : null}

          <div className="pd-actions">
            <button
              className="pd-btn pd-btn-outline"
              onClick={handleAdd}
              disabled={isOutOfStock}
              type="button"
            >
              {isOutOfStock ? "Unavailable" : "Add to cart"}
            </button>

            <button
              className="pd-btn pd-btn-black"
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              type="button"
            >
              {isOutOfStock ? "Out of stock" : "Buy now"}
            </button>
          </div>

          <div className="pd-note">
            <span className="pd-note-icon">⏱</span>
            Buy it now, get it in 1–5 days (Ghana).
          </div>
        </div>
      </div>
    </div>
  );
}