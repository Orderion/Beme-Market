import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import "./CartDrawer.css";

/* ─────────────────────────────────────────────
   HELPERS  (unchanged from original)
───────────────────────────────────────────── */
function parseBooleanish(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["true","yes","1","in stock","instock","available","active"].includes(raw)) return true;
  if (["false","no","0","out of stock","outofstock","unavailable","inactive"].includes(raw)) return false;
  return fallback;
}

function getNumericStock(item) {
  const parsed = Number(item?.stock);
  return Number.isFinite(parsed) ? parsed : null;
}

function isOutOfStock(item) {
  if (!item) return true;
  return parseBooleanish(item?.inStock, true) === false;
}

function getUnavailableReason(item) {
  if (isOutOfStock(item)) return "Out of stock";
  const stock = getNumericStock(item);
  const qty   = Number(item?.qty || 0);
  if (stock !== null && qty > stock) return `Only ${stock} left in stock`;
  return "";
}

function getItemAbroadDeliveryFee(item) {
  if (!item?.shipsFromAbroad) return 0;
  const parsed = Number(item?.abroadDeliveryFee);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/* ─────────────────────────────────────────────
   FIRESTORE FETCH
   Pulls from the same "products" collection
   your shop uses. Falls back to a plain limit()
   query if the composite index isn't built yet.
───────────────────────────────────────────── */
const MAX_FETCH = 24;
const MAX_SHOW  = 8;

async function fetchRecommendedProducts(cartItemIds) {
  const normalize = (p) => ({
    id:      p.id,
    name:    String(p.name  || p.title || "Product"),
    price:   Number(p.price || 0),
    image:   String(p.image || (Array.isArray(p.images) && p.images[0]) || ""),
    inStock: parseBooleanish(p.inStock, true),
    stock:   Number.isFinite(Number(p.stock)) ? Number(p.stock) : null,
    shop:    String(p.shop  || "main"),
  });

  const clientFilter = (docs) =>
    docs.filter((p) => {
      if (cartItemIds.has(p.id)) return false;
      if (parseBooleanish(p.inStock, true) === false) return false;
      const s = Number(p.stock);
      if (Number.isFinite(s) && s <= 0) return false;
      return true;
    });

  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ── Try 1: filtered query (requires Firestore index) ──
  try {
    const snap = await getDocs(
      query(collection(db, "products"), where("inStock", "!=", false), limit(MAX_FETCH))
    );
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return shuffle(clientFilter(docs)).slice(0, MAX_SHOW).map(normalize);
  } catch (_) {
    // index not ready — fall through
  }

  // ── Try 2: plain fetch, filter client-side ──
  try {
    const snap = await getDocs(query(collection(db, "products"), limit(MAX_FETCH)));
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return shuffle(clientFilter(docs)).slice(0, MAX_SHOW).map(normalize);
  } catch (err) {
    console.error("CartDrawer: recommendations fetch failed", err);
    return [];
  }
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function CartDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const {
    cartItems,
    removeFromCart,
    updateQty,
    addToCart,
    subtotal,
    itemCount,
    cartPopup,
    hideCartPopup,
    hasUnavailableItems,
  } = useCart();

  /* ── local UI state ── */
  const [cartMessage,      setCartMessage]      = useState("");
  const [promoCode,        setPromoCode]        = useState("");
  const [promoApplied,     setPromoApplied]     = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  /* ── recommendations state ── */
  const [recProducts, setRecProducts] = useState([]);
  const [recLoading,  setRecLoading]  = useState(false);
  const [recError,    setRecError]    = useState(false);
  const [addedRecIds, setAddedRecIds] = useState(new Set());

  // stable key so we only re-fetch when cart ids actually change
  const lastFetchKeyRef = useRef("");

  /* ── auto-clear status toast ── */
  useEffect(() => {
    if (!cartMessage) return;
    const t = window.setTimeout(() => setCartMessage(""), 2200);
    return () => window.clearTimeout(t);
  }, [cartMessage]);

  /* ── body scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  /* ── Escape key ── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (showClearConfirm) setShowClearConfirm(false);
      else onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, showClearConfirm]);

  /* ── reset confirm when drawer closes ── */
  useEffect(() => {
    if (!isOpen) setShowClearConfirm(false);
  }, [isOpen]);

  /* ── cart item id set (memoised) ── */
  const cartItemIds = useMemo(
    () => new Set(cartItems.map((i) => i.id)),
    [cartItems]
  );

  /* ── FETCH RECOMMENDATIONS ──
     Fires when drawer opens (with items) or when
     the cart id-set changes while the drawer is open.
  ── */
  useEffect(() => {
    if (!isOpen || cartItems.length === 0) {
      setRecProducts([]);
      lastFetchKeyRef.current = "";
      return;
    }

    const key = [...cartItemIds].sort().join(",");
    if (key === lastFetchKeyRef.current) return;
    lastFetchKeyRef.current = key;

    let cancelled = false;
    setRecLoading(true);
    setRecError(false);

    fetchRecommendedProducts(cartItemIds).then((products) => {
      if (cancelled) return;
      setRecProducts(products);
      setRecLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setRecError(true);
      setRecLoading(false);
    });

    return () => { cancelled = true; };
  }, [isOpen, cartItemIds, cartItems.length]);

  /* hide a rec card the moment its product lands in the cart */
  const visibleRecs = useMemo(
    () => recProducts.filter((p) => !cartItemIds.has(p.id)),
    [recProducts, cartItemIds]
  );

  /* ── derived counts ── */
  const unavailableCount = useMemo(
    () => cartItems.filter((item) => getUnavailableReason(item)).length,
    [cartItems]
  );

  /* ── popup data ── */
  const popupItem    = cartPopup?.item || null;
  const popupImage   =
    popupItem?.image ||
    (Array.isArray(popupItem?.images) ? popupItem.images[0] : "") ||
    "";
  const popupTitle   = cartPopup?.title   || "Added to cart";
  const popupMessage =
    cartPopup?.message ||
    "Thank you for shopping with us. Your item has been added to cart.";

  /* ── checkout ── */
  const goCheckout = () => {
    if (cartItems.length === 0 || hasUnavailableItems) {
      if (hasUnavailableItems)
        setCartMessage("Some items in your cart are unavailable. Remove them or reduce quantity before checkout.");
      return;
    }
    hideCartPopup?.();
    onClose?.();
    navigate("/checkout");
  };

  const handleContinueShopping = () => { hideCartPopup?.(); onClose?.(); };

  /* ── qty controls ── */
  const handleDecrease = (item, qty) => {
    const r = updateQty(item.lineId || item.id, Math.max(1, qty - 1));
    if (r?.ok === false) setCartMessage(r.message || "Unable to update quantity.");
  };
  const handleIncrease = (item, qty) => {
    const r = updateQty(item.lineId || item.id, qty + 1);
    if (r?.ok === false) setCartMessage(r.message || "Unable to update quantity.");
  };

  /* ── promo ── */
  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    setPromoApplied(true);
    setCartMessage(`Promo code "${promoCode}" applied.`);
  };

  /* ── clear cart (after confirm) ── */
  const handleConfirmedClear = () => {
    cartItems.forEach((item) => removeFromCart(item.lineId || item.id));
    setShowClearConfirm(false);
    setAddedRecIds(new Set());
    lastFetchKeyRef.current = "";
  };

  /* ── add recommended product ── */
  const handleAddRecommended = (product) => {
    if (addedRecIds.has(product.id)) return;
    const result = addToCart({
      id:      product.id,
      name:    product.name,
      price:   product.price,
      image:   product.image || "",
      qty:     1,
      inStock: product.inStock,
      stock:   product.stock,
      shop:    product.shop,
    });
    if (result?.ok === false) {
      setCartMessage(result.message || "Unable to add item.");
      return;
    }
    setAddedRecIds((prev) => new Set(prev).add(product.id));
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className={`cd ${isOpen ? "cd--open" : ""}`} aria-hidden={!isOpen}>
      <div
        className="cd-overlay"
        onClick={() => { if (showClearConfirm) setShowClearConfirm(false); else onClose?.(); }}
      />

      <aside className="cd-panel" role="dialog" aria-modal="true">

        {/* ── HEADER ── */}
        <div className="cd-header">
          <button className="cd-icon-btn" onClick={onClose} aria-label="Close cart" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="cd-header-center">
            <h3 className="cd-title">Shopping Cart</h3>
            <p className="cd-subtitle">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
          </div>

          <button
            className="cd-icon-btn"
            onClick={() => { if (cartItems.length > 0) setShowClearConfirm(true); }}
            aria-label="Clear cart"
            type="button"
            disabled={cartItems.length === 0}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>

        {/* ── CLEAR CART CONFIRM DIALOG ── */}
        {showClearConfirm && (
          <div className="cd-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="cd-confirm-title">
            <div className="cd-confirm-dialog">
              <div className="cd-confirm-icon-wrap">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6" /><path d="M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </div>
              <h4 className="cd-confirm-title" id="cd-confirm-title">Clear your cart?</h4>
              <p className="cd-confirm-message">
                This will remove all {itemCount} item{itemCount !== 1 ? "s" : ""} from your cart.
                This action cannot be undone.
              </p>
              <div className="cd-confirm-actions">
                <button type="button" className="cd-confirm-cancel" onClick={() => setShowClearConfirm(false)}>
                  Keep shopping
                </button>
                <button type="button" className="cd-confirm-clear" onClick={handleConfirmedClear}>
                  Yes, clear cart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── BODY ── */}
        <div className="cd-body">

          {/* Success popup card */}
          {cartPopup?.visible && popupItem ? (
            <div
              className={`cd-success-card ${cartPopup?.firstAdd ? "cd-success-card--first" : ""}`}
              role="status" aria-live="polite"
            >
              <div className="cd-success-top">
                <button type="button" className="cd-success-dismiss" onClick={hideCartPopup} aria-label="Dismiss">×</button>
              </div>
              <div className="cd-success-content">
                <div className="cd-success-media">
                  {popupImage
                    ? <img src={popupImage} alt={popupItem.name || "Added product"} />
                    : <div className="cd-success-media-placeholder">No image</div>}
                </div>
                <div className="cd-success-info">
                  <p className="cd-success-kicker">Thank you</p>
                  <h4 className="cd-success-title">{popupTitle}</h4>
                  <p className="cd-success-message">{popupMessage}</p>
                  <div className="cd-success-product">
                    <strong>{popupItem.name || "Product"}</strong>
                    <span>GHS {Number(popupItem.price || 0).toFixed(2)}</span>
                  </div>
                  <div className="cd-success-actions">
                    <button type="button" className="cd-ghost" onClick={handleContinueShopping}>
                      Continue shopping
                    </button>
                    <button
                      type="button"
                      className="cd-checkout cd-checkout--inline"
                      onClick={goCheckout}
                      disabled={cartItems.length === 0 || hasUnavailableItems}
                    >
                      {hasUnavailableItems ? "Resolve cart issues" : "Checkout"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Alert toast */}
          {cartMessage ? (
            <div className="cd-cart-alert" role="status" aria-live="polite">{cartMessage}</div>
          ) : null}

          {/* Unavailable warning */}
          {hasUnavailableItems ? (
            <div className="cd-cart-alert cd-cart-alert--warning">
              {unavailableCount} cart item{unavailableCount !== 1 ? "s are" : " is"} unavailable.
              Remove them or reduce quantity before checkout.
            </div>
          ) : null}

          {/* ── EMPTY STATE ── */}
          {cartItems.length === 0 ? (
            <div className="cd-empty">
              <div className="cd-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6" />
                </svg>
              </div>
              <p>Your cart is empty.</p>
              <span className="cd-empty-sub">Add something you love and come back here to checkout.</span>
              <button className="cd-ghost" onClick={handleContinueShopping} type="button">Continue shopping</button>
            </div>
          ) : (
            <>
              {/* ── CART ITEMS ── */}
              {cartItems.map((item) => {
                const img               = item.image || "";
                const name              = item.name  || "Untitled";
                const price             = Number(item.price || 0);
                const basePrice         = Number(item.basePrice ?? item.price ?? 0);
                const optionPriceTotal  = Number(item.optionPriceTotal || 0);
                const qty               = Number(item.qty || 1);
                const stock             = getNumericStock(item);
                const unavailableReason = getUnavailableReason(item);
                const itemBlocked       = Boolean(unavailableReason);
                const canIncrease       = !isOutOfStock(item) && (stock === null || qty < stock);
                const abroadDeliveryFee = getItemAbroadDeliveryFee(item);

                return (
                  <div key={item.lineId || item.id} className="cd-item">
                    <div className="cd-item-img">
                      {img ? <img src={img} alt={name} /> : (
                        <div className="cd-img-placeholder">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="cd-item-info">
                      <div className="cd-item-top-row">
                        <p className="cd-item-name">{name}</p>
                        <button type="button" className="cd-remove-icon"
                          onClick={() => removeFromCart(item.lineId || item.id)}
                          aria-label={`Remove ${name}`}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>

                      {item.selectedOptions && Object.keys(item.selectedOptions).length ? (
                        <div className="cd-item-options">
                          {Object.entries(item.selectedOptions).map(([key, value]) =>
                            value ? <span className="cd-option-pill" key={`${key}-${value}`}>{key}: {value}</span> : null
                          )}
                        </div>
                      ) : null}

                      {optionPriceTotal > 0 ? (
                        <div className="cd-item-options">
                          <span className="cd-option-pill">Base: GHS {basePrice.toFixed(2)}</span>
                          <span className="cd-option-pill">Options: +GHS {optionPriceTotal.toFixed(2)}</span>
                        </div>
                      ) : null}

                      {item.shipsFromAbroad ? (
                        <div className="cd-item-options">
                          <span className="cd-option-pill cd-option-pill--abroad">
                            Ships from abroad
                            {abroadDeliveryFee > 0 ? ` • Fee: GHS ${abroadDeliveryFee.toFixed(2)} each` : ""}
                          </span>
                        </div>
                      ) : null}

                      {stock !== null && !isOutOfStock(item) ? (
                        <div className="cd-item-options">
                          <span className="cd-option-pill">Stock: {stock}</span>
                        </div>
                      ) : null}

                      {unavailableReason ? (
                        <div className="cd-item-options">
                          <span className="cd-option-pill cd-option-pill--danger">{unavailableReason}</span>
                        </div>
                      ) : null}

                      <div className="cd-item-bottom-row">
                        <p className="cd-item-price">GHS {price.toFixed(2)}</p>
                        <div className="cd-qty">
                          <button type="button" className="cd-qty-btn cd-qty-btn--minus"
                            onClick={() => handleDecrease(item, qty)}
                            aria-label="Decrease quantity"
                            disabled={itemBlocked || qty <= 1}>−</button>
                          <span className="cd-qty-num">{qty}</span>
                          <button type="button" className="cd-qty-btn cd-qty-btn--plus"
                            onClick={() => handleIncrease(item, qty)}
                            aria-label="Increase quantity"
                            disabled={!canIncrease}
                            title={!canIncrease && stock !== null && !isOutOfStock(item) ? `Only ${stock} available` : undefined}>
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ── RECOMMENDED FOR YOU ── */}
              <div className="cd-rec-section">
                <div className="cd-rec-header">
                  <span className="cd-rec-label">Recommended for you</span>
                  {!recLoading && visibleRecs.length > 0 && (
                    <span className="cd-rec-badge">{visibleRecs.length} picks</span>
                  )}
                </div>

                {/* Loading skeletons */}
                {recLoading && (
                  <div className="cd-rec-scroll">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="cd-rec-card cd-rec-card--skeleton">
                        <div className="cd-rec-skeleton-img" />
                        <div className="cd-rec-body">
                          <div className="cd-rec-skeleton-line cd-rec-skeleton-line--name" />
                          <div className="cd-rec-skeleton-line cd-rec-skeleton-line--price" />
                          <div className="cd-rec-skeleton-line cd-rec-skeleton-line--btn" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error */}
                {recError && !recLoading && (
                  <p className="cd-rec-notice">Couldn't load recommendations right now.</p>
                )}

                {/* Cards */}
                {!recLoading && !recError && visibleRecs.length > 0 && (
                  <div className="cd-rec-scroll">
                    {visibleRecs.map((product) => {
                      const added = addedRecIds.has(product.id);
                      return (
                        <div key={product.id} className="cd-rec-card">
                          <div className="cd-rec-img">
                            {product.image
                              ? <img src={product.image} alt={product.name} />
                              : (
                                <div className="cd-rec-img-placeholder">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
                                    strokeLinejoin="round" opacity="0.35">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                </div>
                              )}
                          </div>
                          <div className="cd-rec-body">
                            <p className="cd-rec-name" title={product.name}>{product.name}</p>
                            <p className="cd-rec-price">GHS {Number(product.price || 0).toFixed(2)}</p>
                            <button
                              type="button"
                              className={`cd-rec-add${added ? " cd-rec-add--done" : ""}`}
                              onClick={() => handleAddRecommended(product)}
                              disabled={added}
                              aria-label={added ? `${product.name} added` : `Add ${product.name} to cart`}
                            >
                              {added ? "✓ Added" : "+ Add to cart"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* No recs */}
                {!recLoading && !recError && visibleRecs.length === 0 && (
                  <p className="cd-rec-notice">No recommendations available right now.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER (non-empty cart) ── */}
        {cartItems.length > 0 && (
          <div className="cd-footer">
            <div className="cd-promo">
              <p className="cd-promo-label">Promo Code</p>
              <div className="cd-promo-row">
                <input
                  type="text"
                  className="cd-promo-input"
                  placeholder="Enter promo code here..."
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value); setPromoApplied(false); }}
                  aria-label="Promo code"
                />
                <button type="button" className="cd-promo-btn" onClick={handleApplyPromo}
                  disabled={!promoCode.trim() || promoApplied}>
                  {promoApplied ? "Applied" : "Apply"}
                </button>
              </div>
            </div>

            <div className="cd-summary">
              <p className="cd-summary-title">Order Summary</p>
              <div className="cd-summary-row">
                <span>Subtotal</span>
                <span>GHS {subtotal.toFixed(2)}</span>
              </div>
              <div className="cd-summary-row">
                <span>Shipping Cost</span>
                <span className="cd-summary-shipping">
                  {hasUnavailableItems ? "—" : "Calculated at checkout"}
                </span>
              </div>
              <div className="cd-summary-divider" />
              <div className="cd-summary-row cd-summary-total">
                <span>Total Payment</span>
                <strong>GHS {subtotal.toFixed(2)}</strong>
              </div>
            </div>

            {hasUnavailableItems && (
              <p className="cd-footer-note">Resolve unavailable items before checkout.</p>
            )}

            <button
              className="cd-checkout"
              onClick={goCheckout}
              disabled={cartItems.length === 0 || hasUnavailableItems}
              type="button"
            >
              {hasUnavailableItems ? "Resolve cart issues" : "Checkout"}
            </button>
          </div>
        )}

        {/* Footer — empty cart */}
        {cartItems.length === 0 && (
          <div className="cd-footer cd-footer--empty">
            <button className="cd-ghost" onClick={handleContinueShopping} type="button">
              Continue shopping
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}