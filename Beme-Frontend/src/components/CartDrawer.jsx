import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./CartDrawer.css";

export default function CartDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const {
    cartItems,
    removeFromCart,
    updateQty,
    subtotal,
    itemCount,
    hideCartPopup,
  } = useCart();

  const goCheckout = () => {
    hideCartPopup?.();
    onClose?.();
    navigate("/checkout");
  };

  const handleContinueShopping = () => {
    hideCartPopup?.();
    onClose?.();
  };

  return (
    <div className={`cd ${isOpen ? "cd--open" : ""}`} aria-hidden={!isOpen}>
      <div className="cd-overlay" onClick={onClose} />

      <aside className="cd-panel" role="dialog" aria-modal="true">
        <div className="cd-header">
          <div>
            <h3 className="cd-title">CART</h3>
            <p className="cd-subtitle">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </p>
          </div>

          <button className="cd-close" onClick={onClose} aria-label="Close cart">
            ×
          </button>
        </div>

        <div className="cd-body">
          {cartItems.length === 0 ? (
            <div className="cd-empty">
              <p>Your cart is empty.</p>
              <span className="cd-empty-sub">
                Add something you love and come back here to checkout.
              </span>
              <button
                className="cd-ghost"
                onClick={handleContinueShopping}
                type="button"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            cartItems.map((item) => {
              const img = item.image || "";
              const name = item.name || "Untitled";
              const price = Number(item.price || 0);
              const qty = Number(item.qty || 1);

              return (
                <div key={item.lineId || item.id} className="cd-item">
                  <div className="cd-item-img">
                    {img ? (
                      <img src={img} alt={name} />
                    ) : (
                      <div className="cd-img-placeholder">No image</div>
                    )}
                  </div>

                  <div className="cd-item-info">
                    <p className="cd-item-name">{name}</p>

                    {item.selectedOptions &&
                    Object.keys(item.selectedOptions).length ? (
                      <div className="cd-item-options">
                        {Object.entries(item.selectedOptions).map(([key, value]) =>
                          value ? (
                            <span className="cd-option-pill" key={`${key}-${value}`}>
                              {key}: {value}
                            </span>
                          ) : null
                        )}
                      </div>
                    ) : null}

                    {item.shipsFromAbroad ? (
                      <div className="cd-item-options">
                        <span className="cd-option-pill">Ships from abroad</span>
                      </div>
                    ) : null}

                    <p className="cd-item-price">GHS {price.toFixed(2)}</p>

                    <div className="cd-item-actions">
                      <div className="cd-qty">
                        <button
                          type="button"
                          onClick={() =>
                            updateQty(item.lineId || item.id, Math.max(1, qty - 1))
                          }
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span>{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.lineId || item.id, qty + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cd-remove"
                        onClick={() => removeFromCart(item.lineId || item.id)}
                        aria-label="Remove item"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="cd-footer">
          <div className="cd-note">Shipping fee is calculated at checkout.</div>

          <div className="cd-total">
            <span>Total</span>
            <strong>GHS {subtotal.toFixed(2)}</strong>
          </div>

          <button
            className="cd-checkout"
            onClick={goCheckout}
            disabled={cartItems.length === 0}
            type="button"
          >
            Checkout
          </button>
        </div>
      </aside>
    </div>
  );
}