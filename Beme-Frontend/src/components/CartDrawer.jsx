import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./CartDrawer.css";

function parseBooleanish(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;

  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;

  if (["true", "yes", "1", "in stock", "instock", "available", "active"].includes(raw)) {
    return true;
  }
  if (["false", "no", "0", "out of stock", "outofstock", "unavailable", "inactive"].includes(raw)) {
    return false;
  }
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
  const qty = Number(item?.qty || 0);

  if (stock !== null && qty > stock) {
    return `Only ${stock} left in stock`;
  }
  return "";
}

function getItemAbroadDeliveryFee(item) {
  if (!item?.shipsFromAbroad) return 0;
  const parsed = Number(item?.abroadDeliveryFee);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default function CartDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const {
    cartItems,
    removeFromCart,
    updateQty,
    subtotal,
    itemCount,
    cartPopup,
    hideCartPopup,
    hasUnavailableItems,
  } = useCart();

  const [cartMessage, setCartMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!cartMessage) return;
    const timer = window.setTimeout(() => setCartMessage(""), 2200);
    return () => window.clearTimeout(timer);
  }, [cartMessage]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 1050); // matches --drawer-motion
  };

  const unavailableCount = useMemo(() => {
    return cartItems.filter((item) => getUnavailableReason(item)).length;
  }, [cartItems]);

  const popupItem = cartPopup?.item || null;
  const popupImage = popupItem?.image || (Array.isArray(popupItem?.images) ? popupItem.images[0] : "") || "";
  const popupTitle = cartPopup?.title || "Added to cart";
  const popupMessage = cartPopup?.message || "Thank you for shopping with us. Your item has been added to cart.";

  const goCheckout = () => {
    if (cartItems.length === 0 || hasUnavailableItems) {
      if (hasUnavailableItems) setCartMessage("Some items in your cart are unavailable. Remove them or reduce quantity before checkout.");
      return;
    }
    hideCartPopup?.();
    handleClose();
    navigate("/checkout");
  };

  const handleContinueShopping = () => {
    hideCartPopup?.();
    handleClose();
  };

  const handleDecrease = (item, qty) => {
    const result = updateQty(item.lineId || item.id, Math.max(1, qty - 1));
    if (result?.ok === false) setCartMessage(result.message || "Unable to update quantity.");
  };

  const handleIncrease = (item, qty) => {
    const result = updateQty(item.lineId || item.id, qty + 1);
    if (result?.ok === false) setCartMessage(result.message || "Unable to update quantity.");
  };

  return (
    <div className={`cd ${isOpen ? "open" : ""} ${isClosing ? "closing" : ""}`} aria-hidden={!isOpen}>
      <div className="cd-overlay" onClick={handleClose} />

      <aside className="cd-panel" role="dialog" aria-modal="true">
        <div className="cd-header">
          <div>
            <h3 className="cd-title">CART</h3>
            <p className="cd-subtitle">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </p>
          </div>

          <button className="cd-close" onClick={handleClose} aria-label="Close cart" type="button">
            ×
          </button>
        </div>

        <div className="cd-body">
          {cartPopup?.visible && popupItem ? (
            <div className={`cd-success-card ${cartPopup?.firstAdd ? "cd-success-card--first" : ""}`} role="status" aria-live="polite">
              <div className="cd-success-top">
                <button type="button" className="cd-success-dismiss" onClick={hideCartPopup} aria-label="Dismiss">
                  ×
                </button>
              </div>

              <div className="cd-success-content">
                <div className="cd-success-media">
                  {popupImage ? <img src={popupImage} alt={popupItem.name || "Added product"} /> : <div className="cd-success-media-placeholder">No image</div>}
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
                    <button type="button" className="cd-ghost" onClick={handleContinueShopping}>Continue shopping</button>
                    <button type="button" className="cd-checkout cd-checkout--inline" onClick={goCheckout} disabled={cartItems.length === 0 || hasUnavailableItems}>
                      {hasUnavailableItems ? "Resolve cart issues" : "Checkout"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {cartMessage && <div className="cd-cart-alert" role="status" aria-live="polite">{cartMessage}</div>}

          {hasUnavailableItems && (
            <div className="cd-cart-alert cd-cart-alert--warning">
              {unavailableCount} cart item{unavailableCount !== 1 ? "s are" : " is"} unavailable. Remove them or reduce quantity before checkout.
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="cd-empty">
              <p>Your cart is empty.</p>
              <span className="cd-empty-sub">Add something you love and come back here to checkout.</span>
              <button className="cd-ghost" onClick={handleContinueShopping} type="button">Continue shopping</button>
            </div>
          ) : (
            cartItems.map((item) => {
              const img = item.image || "";
              const name = item.name || "Untitled";
              const price = Number(item.price || 0);
              const basePrice = Number(item.basePrice ?? item.price ?? 0);
              const optionPriceTotal = Number(item.optionPriceTotal || 0);
              const qty = Number(item.qty || 1);
              const stock = getNumericStock(item);
              const unavailableReason = getUnavailableReason(item);
              const itemBlocked = Boolean(unavailableReason);
              const canIncrease = !isOutOfStock(item) && (stock === null || qty < stock);
              const abroadDeliveryFee = getItemAbroadDeliveryFee(item);

              return (
                <div key={item.lineId || item.id} className="cd-item">
                  <div className="cd-item-img">
                    {img ? <img src={img} alt={name} /> : <div className="cd-img-placeholder">No image</div>}
                  </div>

                  <div className="cd-item-info">
                    <p className="cd-item-name">{name}</p>

                    {item.selectedOptions && Object.keys(item.selectedOptions).length ? (
                      <div className="cd-item-options">
                        {Object.entries(item.selectedOptions).map(([key, value]) =>
                          value ? <span className="cd-option-pill" key={`${key}-${value}`}>{key}: {value}</span> : null
                        )}
                      </div>
                    ) : null}

                    {optionPriceTotal > 0 && (
                      <div className="cd-item-options">
                        <span className="cd-option-pill">Base: GHS {basePrice.toFixed(2)}</span>
                        <span className="cd-option-pill">Options: +GHS {optionPriceTotal.toFixed(2)}</span>
                      </div>
                    )}

                    {item.shipsFromAbroad && (
                      <div className="cd-item-options">
                        <span className="cd-option-pill cd-option-pill--abroad">
                          Ships from abroad{abroadDeliveryFee > 0 ? ` • Fee: GHS ${abroadDeliveryFee.toFixed(2)} each` : ""}
                        </span>
                      </div>
                    )}

                    {stock !== null && !isOutOfStock(item) && (
                      <div className="cd-item-options"><span className="cd-option-pill">Stock: {stock}</span></div>
                    )}

                    {unavailableReason && (
                      <div className="cd-item-options">
                        <span className="cd-option-pill cd-option-pill--danger">{unavailableReason}</span>
                      </div>
                    )}

                    <p className="cd-item-price">GHS {price.toFixed(2)}</p>

                    <div className="cd-item-actions">
                      <div className="cd-qty">
                        <button type="button" onClick={() => handleDecrease(item, qty)} disabled={itemBlocked || qty <= 1}>−</button>
                        <span>{qty}</span>
                        <button type="button" onClick={() => handleIncrease(item, qty)} disabled={!canIncrease}>+</button>
                      </div>

                      <button type="button" className="cd-remove" onClick={() => removeFromCart(item.lineId || item.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="cd-footer">
          <div className="cd-note">
            {hasUnavailableItems ? "Resolve unavailable items before checkout." : "Shipping fee is calculated at checkout."}
          </div>

          <div className="cd-total">
            <span>Total</span>
            <strong>GHS {subtotal.toFixed(2)}</strong>
          </div>

          <button className="cd-checkout" onClick={goCheckout} disabled={cartItems.length === 0 || hasUnavailableItems} type="button">
            {hasUnavailableItems ? "Resolve cart issues" : "Checkout"}
          </button>
        </div>
      </aside>
    </div>
  );
}