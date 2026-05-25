import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { createPortal } from "react-dom";
import "./TrendingCard.css";

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
  if (["true","yes","1","in stock","instock","available","active","abroad","imported","international"].includes(raw)) return true;
  if (["false","no","0","out of stock","outofstock","unavailable","inactive","local"].includes(raw)) return false;
  return fallback;
}

function normalizeShop(value) { return String(value || "").trim().toLowerCase(); }
function normalizeHomeSlot(value) { return String(value || "").trim().toLowerCase(); }

function normalizeShippingSource(product) {
  const candidates = [
    product?.shippingSource, product?.shippingType, product?.shipFrom,
    product?.ship_from, product?.fulfillmentType, product?.originType,
    product?.shipping_origin, product?.shipping_origin_type,
  ];
  for (const candidate of candidates) {
    const value = String(candidate || "").trim().toLowerCase();
    if (!value) continue;
    if (["abroad","ship from abroad","ships from abroad","international","imported","overseas"].includes(value)) return "abroad";
    if (["uni","unisex","universal"].includes(value)) return "uni";
    if (["local","ghana","domestic"].includes(value)) return "local";
  }
  if (parseBooleanish(product?.shipFromAbroad, false) || parseBooleanish(product?.shipsFromAbroad, false)) return "abroad";
  return "";
}

function getNumericStock(product) {
  const parsed = Number(product?.stock);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStock(product) { return parseBooleanish(product?.inStock, true); }

function normalizeCustomizations(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((group, groupIndex) => ({
      id: group?.id || `${group?.name || "option"}-${groupIndex}`,
      name: String(group?.name || "").trim(),
      type: group?.type === "select" ? "select" : "buttons",
      required: group?.required !== false,
      values: Array.isArray(group?.values)
        ? group.values.map((value, valueIndex) => {
            if (value && typeof value === "object") {
              const label = String(value.label ?? value.value ?? value.name ?? "").trim();
              if (!label) return null;
              return { id: value.id || `${group?.name || "option"}-${groupIndex}-${valueIndex}`, label, priceBump: Number(value.priceBump || 0) || 0 };
            }
            const label = String(value || "").trim();
            if (!label) return null;
            return { id: `${group?.name || "option"}-${groupIndex}-${valueIndex}`, label, priceBump: 0 };
          }).filter(Boolean)
        : [],
    }))
    .filter((group) => group.name && group.values.length > 0);
}

function getItemAbroadDeliveryFee(product) {
  if (!parseBooleanish(product?.shipsFromAbroad, false) && !parseBooleanish(product?.shipFromAbroad, false)) return 0;
  const parsed = Number(product?.abroadDeliveryFee);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}

export default function TrendingCard({ product }) {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [cardPopup, setCardPopup] = useState("");
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [cartPopupItem, setCartPopupItem] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const touchStartXRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const popupTimerRef = useRef(null);

  const id = product?.id ?? product?.docId ?? product?._id ?? "";
  const name = String(product?.name || "Untitled").trim() || "Untitled";

  const images = useMemo(() => normalizeImages(product), [product]);
  const imageCount = images.length;
  const activeImage = images[activeImageIndex] || images[0] || "";

  useEffect(() => { setActiveImageIndex(0); }, [id, imageCount]);

  useEffect(() => {
    if (showCartPopup) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = setTimeout(() => setShowCartPopup(false), 4000);
    }
    return () => clearTimeout(popupTimerRef.current);
  }, [showCartPopup]);

  const shippingSource = useMemo(() => normalizeShippingSource(product), [product]);
  const shipsFromAbroad =
    shippingSource === "abroad" ||
    parseBooleanish(product?.shipFromAbroad, false) ||
    parseBooleanish(product?.shipsFromAbroad, false);
  const abroadDeliveryFee = useMemo(() => getItemAbroadDeliveryFee(product), [product]);
  const inStock = useMemo(() => normalizeStock(product), [product]);
  const stock = useMemo(() => getNumericStock(product), [product]);
  const isRestocked = parseBooleanish(product?.restocked, false);

  const priceRaw = product?.price;
  const oldPriceRaw = product?.oldPrice;
  const price =
    priceRaw !== undefined && priceRaw !== null && priceRaw !== ""
      ? Number(priceRaw) : null;
  const oldPrice =
    oldPriceRaw !== undefined && oldPriceRaw !== null && oldPriceRaw !== ""
      ? Number(oldPriceRaw) : null;

  const customizations = useMemo(() => normalizeCustomizations(product?.customizations), [product]);

  const hasDiscount = price !== null && oldPrice !== null && oldPrice > price;
  const discountPct = hasDiscount ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  const formatMoney = (n) => {
    if (n === null || Number.isNaN(n)) return "";
    return `GHS ${n.toFixed(2)}`;
  };

  const showCardPopupMsg = (message) => {
    setCardPopup(message);
    window.clearTimeout(showCardPopupMsg._timeoutId);
    showCardPopupMsg._timeoutId = window.setTimeout(() => setCardPopup(""), 2600);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) { showCardPopupMsg("This item is currently out of stock."); return; }
    try {
      addToCart({
        id, name,
        price: price ?? 0,
        basePrice: price ?? 0,
        optionPriceTotal: 0,
        oldPrice: oldPrice !== null && Number.isFinite(oldPrice) ? oldPrice : null,
        image: activeImage || images[0] || "",
        images, qty: 1,
        shop: normalizeShop(product?.shop),
        homeSlot: normalizeHomeSlot(product?.homeSlot || "others"),
        selectedOptions: {}, selectedOptionsLabel: "",
        selectedOptionDetails: [], customizations,
        shippingSource, shipsFromAbroad, abroadDeliveryFee,
        inStock, stock, productId: id,
      });
      setCartPopupItem({ name, price, image: activeImage || images[0] || "" });
      setShowCartPopup(true);
      setCardPopup("");
    } catch (error) {
      console.error("TrendingCard addToCart error:", error);
      showCardPopupMsg("Unable to add this item to cart right now.");
    }
  };

  const goPrevImage = (e) => { e.preventDefault(); e.stopPropagation(); if (imageCount <= 1) return; setActiveImageIndex((prev) => (prev - 1 + imageCount) % imageCount); };
  const goNextImage = (e) => { e.preventDefault(); e.stopPropagation(); if (imageCount <= 1) return; setActiveImageIndex((prev) => (prev + 1) % imageCount); };

  const handleTouchStart = (e) => { if (imageCount <= 1) return; touchStartXRef.current = e.touches[0].clientX; touchDeltaXRef.current = 0; };
  const handleTouchMove  = (e) => { if (imageCount <= 1 || touchStartXRef.current === null) return; touchDeltaXRef.current = e.touches[0].clientX - touchStartXRef.current; };
  const handleTouchEnd   = () => {
    if (imageCount <= 1 || touchStartXRef.current === null) return;
    const deltaX = touchDeltaXRef.current;
    if (deltaX <= -36) setActiveImageIndex((prev) => (prev + 1) % imageCount);
    else if (deltaX >= 36) setActiveImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
    touchStartXRef.current = null; touchDeltaXRef.current = 0;
  };

  const Wrapper = id ? Link : "div";
  const wrapperProps = id
    ? { to: `/product/${id}`, className: "tc-link", "aria-label": `View ${name}` }
    : { className: "tc-link tc-link--disabled" };

  return (
    <>
      <Wrapper {...wrapperProps}>
        <div className={`tc-card ${!inStock ? "tc-card--out" : ""}`}>

          {/* Image area */}
          <div
            className="tc-media"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {activeImage ? (
              <>
                <div className="tc-img-wrap">
                  <img className="tc-img" src={activeImage} alt={name} loading="lazy" />
                </div>

                {/* Badges */}
                <div className="tc-badges">
                  {!inStock && <span className="tc-badge tc-badge--out">Sold out</span>}
                  {isRestocked && inStock && <span className="tc-badge tc-badge--restocked">Restocked</span>}
                  {hasDiscount && inStock && <span className="tc-badge tc-badge--sale">Sale</span>}
                </div>

                {/* Discount % — top right */}
                {hasDiscount && inStock && (
                  <span className="tc-discount-pill">−{discountPct}%</span>
                )}

                {/* Cart button — bottom right, hover reveal */}
                <button
                  className={`tc-cart-btn${!inStock ? " tc-cart-btn--disabled" : ""}`}
                  onClick={handleAddToCart}
                  aria-label={inStock ? "Add to cart" : "Out of stock"}
                  type="button"
                  disabled={!inStock}
                >
                  <CartIcon />
                </button>

                {/* Image nav arrows */}
                {imageCount > 1 && (
                  <>
                    <button className="tc-nav tc-nav--prev" type="button" aria-label="Previous image" onClick={goPrevImage}>‹</button>
                    <button className="tc-nav tc-nav--next" type="button" aria-label="Next image" onClick={goNextImage}>›</button>
                    <div className="tc-dots">
                      {images.map((_, index) => (
                        <span key={index} className={`tc-dot${index === activeImageIndex ? " tc-dot--active" : ""}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="tc-img-wrap tc-img-wrap--empty">No image</div>
            )}
          </div>

          {/* Card body */}
          <div className="tc-body">
            {cardPopup && <div className="tc-popup" role="alert">{cardPopup}</div>}
            <p className="tc-name">{name}</p>
          </div>

        </div>
      </Wrapper>

      {/* Cart confirmation popup */}
      {showCartPopup && cartPopupItem &&
        createPortal(
          <div className="tc-cart-popup">
            <div className="tc-cart-popup__close-wrap">
              <button className="tc-cart-popup__close" onClick={() => setShowCartPopup(false)} aria-label="Close">×</button>
            </div>
            <div className="tc-cart-popup__header">
              <div className="tc-cart-popup__thumb">
                {cartPopupItem.image && <img src={cartPopupItem.image} alt={cartPopupItem.name} />}
              </div>
              <div className="tc-cart-popup__info">
                <span className="tc-cart-popup__label">Added to cart</span>
                <p className="tc-cart-popup__name">{cartPopupItem.name}</p>
                {cartPopupItem.price !== null && (
                  <p className="tc-cart-popup__price">{formatMoney(cartPopupItem.price)}</p>
                )}
              </div>
            </div>
            <div className="tc-cart-popup__divider" />
            <p className="tc-cart-popup__thanks">Ready to checkout or keep browsing?</p>
            <div className="tc-cart-popup__actions">
              <button className="tc-cart-popup__btn tc-cart-popup__btn--ghost" onClick={() => setShowCartPopup(false)}>Continue</button>
              <button className="tc-cart-popup__btn tc-cart-popup__btn--primary" onClick={() => { setShowCartPopup(false); navigate("/cart"); }}>Checkout</button>
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
}