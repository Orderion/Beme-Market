// pages/SavedItems.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import "./SavedItems.css";

// ── Skeleton card ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="si-card si-skeleton">
      <div className="si-card-img-wrap" />
      <div className="si-card-body">
        <div className="sk sk-line sk-line-lg" />
        <div className="sk sk-line sk-line-sm" />
        <div className="si-card-actions">
          <div className="sk sk-btn" />
          <div className="sk sk-icon" />
        </div>
      </div>
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────
function SavedCard({ item, onRemove, onAddToCart }) {
  const [removing, setRemoving] = useState(false);
  const [added, setAdded] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(item.productId);
  };

  const handleAddToCart = () => {
    onAddToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className={`si-card${removing ? " si-card--exit" : ""}`}>
      <Link to={`/product/${item.productId}`} className="si-card-img-wrap">
        {item.image ? (
          <img src={item.image} alt={item.name} className="si-card-img" />
        ) : (
          <div className="si-card-img-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </Link>

      <div className="si-card-body">
        <Link to={`/product/${item.productId}`} className="si-card-name">
          {item.name}
        </Link>
        <span className="si-card-price">GHS {Number(item.price).toFixed(2)}</span>

        <div className="si-card-actions">
          <button
            className={`si-btn-cart${added ? " si-btn-cart--added" : ""}`}
            onClick={handleAddToCart}
          >
            {added ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Added
              </>
            ) : (
              "Add to cart"
            )}
          </button>

          <button
            className="si-btn-remove"
            onClick={handleRemove}
            aria-label="Remove from wishlist"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
                c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="si-empty">
      <div className="si-empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
            2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
            C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
            c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>
      <h2 className="si-empty-title">No saved items yet</h2>
      <p className="si-empty-sub">
        Products you heart will appear here for easy access.
      </p>
      <button className="si-empty-cta" onClick={() => navigate("/")}>
        Start shopping
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function SavedItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  // Guard: not logged in
  useEffect(() => {
    if (user === null) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Real-time wishlist listener
  useEffect(() => {
    if (!user) return;

    const colRef = query(
      collection(db, "users", user.uid, "wishlist"),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(data);
        setLoading(false);
      },
      (err) => {
        console.error("SavedItems fetch error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Remove item
  const handleRemove = async (productId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "wishlist", productId));
    } catch (err) {
      console.error("Remove wishlist error:", err);
    }
  };

  // Add to cart — shape matches exactly what CartContext.normalizeCartItem expects
  const handleAddToCart = (item) => {
    const price = Math.max(0, Number(item.price || 0));

    addToCart({
      // identity
      id:                    String(item.productId || item.id || ""),
      productId:             String(item.productId || item.id || ""),
      lineId:                String(item.productId || item.id || ""),

      // display
      name:                  String(item.name || ""),
      image:                 String(item.image || ""),
      images:                item.image ? [String(item.image)] : [],

      // pricing
      price,
      basePrice:             price,
      optionPriceTotal:      0,
      oldPrice:              null,

      // quantity & stock
      qty:                   1,
      stock:                 null,
      inStock:               true,

      // options (none from saved items)
      selectedOptions:       {},
      selectedOptionsLabel:  "",
      selectedOptionDetails: [],
      customizations:        [],

      // shipping
      shippingSource:        String(item.shippingSource || ""),
      shipsFromAbroad:       false,
      shipFromAbroad:        false,
      abroadDeliveryFee:     0,

      // catalog
      shop:                  String(item.shop || "main"),
      homeSlot:              String(item.homeSlot || "others"),
    });
  };

  return (
    <div className="si-page">
      {/* Header */}
      <div className="si-header">
        <button className="si-back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="si-title">Saved Items</h1>
          {!loading && (
            <p className="si-count">
              {items.length} {items.length === 1 ? "item" : "items"}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="si-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="si-grid">
          {items.map((item) => (
            <SavedCard
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
}