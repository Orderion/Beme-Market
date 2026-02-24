import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./CartDrawer.css";

export default function CartDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQty } = useCart();

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.qty),
    0
  );

  const goCheckout = () => {
    onClose?.();
    navigate("/checkout");
  };

  return (
    <div className={`cd ${isOpen ? "cd--open" : ""}`} aria-hidden={!isOpen}>
      <div className="cd-overlay" onClick={onClose} />

      <aside className="cd-panel" role="dialog" aria-modal="true">
        <div className="cd-header">
          <h3 className="cd-title">CART</h3>
          <button className="cd-close" onClick={onClose} aria-label="Close cart">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="cd-body">
          {cartItems.length === 0 ? (
            <div className="cd-empty">
              <p>Your cart is empty.</p>
              <button className="cd-ghost" onClick={onClose}>
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
                <div key={item.id} className="cd-item">
                  <div className="cd-item-img">
                    {img ? (
                      <img src={img} alt={name} />
                    ) : (
                      <div className="cd-img-placeholder">No image</div>
                    )}
                  </div>

                  <div className="cd-item-info">
                    <p className="cd-item-name">{name}</p>
                    <p className="cd-item-price">GHS {price.toFixed(2)}</p>

                    <div className="cd-item-actions">
                      <div className="cd-qty">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, Math.max(1, qty - 1))}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span>{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, qty + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cd-remove"
                        onClick={() => removeFromCart(item.id)}
                        aria-label="Remove item"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="cd-footer">
          <div className="cd-total">
            <span>Total</span>
            <strong>GHS {total.toFixed(2)}</strong>
          </div>

          <button
            className="cd-checkout"
            onClick={goCheckout}
            disabled={cartItems.length === 0}
          >
            Checkout
          </button>
        </div>
      </aside>
    </div>
  );
}