import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import "./ProductDetails.css";

function normalizeCustomizations(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((group, index) => ({
      id: group?.id || `${group?.name || "option"}-${index}`,
      name: String(group?.name || "").trim(),
      type: group?.type === "select" ? "select" : "buttons",
      required: group?.required !== false,
      values: Array.isArray(group?.values)
        ? group.values.map((v) => String(v).trim()).filter(Boolean)
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
  return product?.image ? [product.image] : [];
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

  const price = useMemo(() => Number(product?.price || 0), [product]);
  const oldPrice = useMemo(() => Number(product?.oldPrice || 0), [product]);

  useEffect(() => {
    const initialSelections = {};
    customizations.forEach((group) => {
      initialSelections[group.name] = "";
    });
    setSelectedOptions(initialSelections);
    setOptionError("");
  }, [customizations, product?.id]);

  useEffect(() => {
    setActiveImageIndex(0);
    setQty(1);
    setAddedFeedback(false);
    setDragOffset(0);
    setIsDragging(false);
  }, [product?.id]);

  const formatMoney = (n) => `GHS ${Number(n || 0).toFixed(2)}`;

  const setOptionValue = (groupName, value) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupName]: value,
    }));
    setOptionError("");
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
      price: Number(product.price || 0),
      image: product.image || images[0] || "",
      images,
      qty,
      selectedOptions,
      selectedOptionsLabel,
      customizations,
    };
  };

  const triggerAddedFeedback = () => {
    setAddedFeedback(true);

    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }

    feedbackTimerRef.current = window.setTimeout(() => {
      setAddedFeedback(false);
    }, 1800);
  };

  const handleAdd = () => {
    if (!product) return;
    if (product?.inStock === false) return;

    const selectionError = validateSelections();
    if (selectionError) {
      setOptionError(selectionError);
      return;
    }

    const item = buildCartItem();
    if (!item) return;

    addToCart(item);
    triggerAddedFeedback();
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (product?.inStock === false) return;

    const selectionError = validateSelections();
    if (selectionError) {
      setOptionError(selectionError);
      return;
    }

    const item = buildCartItem();
    if (!item) return;

    addToCart(item);
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
  const isOutOfStock = product?.inStock === false;

  const sliderTranslate = `calc(${-activeImageIndex * 100}% + ${dragOffset}px)`;

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
              <span className="pd-badge-icon">👜</span>
              <span>{isOutOfStock ? "Out of stock" : "In stock"}</span>
            </div>

            {images.length > 1 ? (
              <div className="pd-badge">
                <span className="pd-badge-icon">🖼</span>
                <span>{images.length} product images</span>
              </div>
            ) : null}
          </div>

          <div className="pd-price-row">
            <div className="pd-price">{formatMoney(price)}</div>

            {oldPrice > price && (
              <div className="pd-old">
                <span className="pd-old-strike">{formatMoney(oldPrice)}</span>
                <span className="pd-save">
                  Save {formatMoney(oldPrice - price)}
                </span>
              </div>
            )}
          </div>

          <div className="pd-section">
            <h3 className="pd-section-title">Description</h3>
            <p className="pd-desc">{desc}</p>
          </div>

          {customizations.length > 0 && (
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
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="pd-option-buttons">
                        {group.values.map((value) => {
                          const active = selectedOptions[group.name] === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              className={`pd-option-btn ${active ? "active" : ""}`}
                              onClick={() => setOptionValue(group.name, value)}
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {optionError ? (
                <div className="pd-option-error">{optionError}</div>
              ) : null}
            </div>
          )}

          <div className="pd-qty-row">
            <div className="pd-qty-label">Quantity</div>

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
                onClick={() => setQty((q) => q + 1)}
                type="button"
                aria-label="Increase"
                disabled={isOutOfStock}
              >
                +
              </button>
            </div>
          </div>

          {addedFeedback ? (
            <div className="pd-added-feedback">Added to cart successfully.</div>
          ) : null}

          <div className="pd-actions">
            <button
              className="pd-btn pd-btn-outline"
              onClick={handleAdd}
              disabled={isOutOfStock}
            >
              {isOutOfStock ? "Unavailable" : "Add to cart"}
            </button>

            <button
              className="pd-btn pd-btn-black"
              onClick={handleBuyNow}
              disabled={isOutOfStock}
            >
              {isOutOfStock ? "Out of stock" : "Buy now"}
            </button>
          </div>

          <div className="pd-note">
            <span className="pd-note-icon">⏱</span>
            Buy it now, get it in 1–3 days (Ghana).
          </div>
        </div>
      </div>
    </div>
  );
}