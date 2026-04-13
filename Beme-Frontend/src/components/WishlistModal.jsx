// components/WishlistModal.jsx
// Floating card style — matches the "Added to cart" popup exactly.
// No dark overlay. Page stays visible. Rendered via createPortal.
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./WishlistModal.css";

/**
 * @param {Object}   props
 * @param {Object}   props.product   - { name, price, image }
 * @param {Function} props.onClose   - closes the modal
 */
export default function WishlistModal({ product, onClose }) {
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  const handleViewSaved = () => {
    onClose();
    navigate("/saved");
  };

  return createPortal(
    <div className="wm-popup">
      {/* Close button */}
      <div className="wm-popup__close-wrap">
        <button className="wm-popup__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      {/* Product row — identical layout to cart popup header */}
      <div className="wm-popup__header">
        <div className="wm-popup__thumb">
          {product?.image ? (
            <img src={product.image} alt={product?.name} />
          ) : (
            <div className="wm-popup__thumb-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          )}
        </div>
        <div className="wm-popup__info">
          <span className="wm-popup__label">Saved to wishlist</span>
          <p className="wm-popup__name">{product?.name}</p>
          {product?.price !== undefined && (
            <p className="wm-popup__price">
              GHS {Number(product.price).toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="wm-popup__divider" />

      {/* Message */}
      <p className="wm-popup__thanks">
        Find it anytime in your saved items. Ready to keep browsing?
      </p>

      {/* Actions */}
      <div className="wm-popup__actions">
        <button
          className="wm-popup__btn wm-popup__btn--ghost"
          onClick={onClose}
        >
          Continue Shopping
        </button>
        <button
          className="wm-popup__btn wm-popup__btn--primary"
          onClick={handleViewSaved}
        >
          View Saved
        </button>
      </div>
    </div>,
    document.body
  );
}