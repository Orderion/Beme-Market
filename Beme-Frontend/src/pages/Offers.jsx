import { useEffect, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import "./Offers.css";

const OFFERS_COLLECTION = "WeeklyOffers";

function MediaItem({ src, type, alt, className }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
  }, []);

  if (type === "video") {
    return (
      <video
        ref={videoRef}
        src={src}
        className={className}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={src} alt={alt} className={className} />;
}

function OfferSheet({ offer, onClose, onViewInShop }) {
  const sheetRef = useRef(null);
  const startYRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 380);
  };

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) setDragY(dy);
  };

  const handleTouchEnd = () => {
    if (dragY > 80) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const mediaType = offer.mediaType || "image";
  const mediaSrc = offer.mediaUrl || offer.image || "";
  const discount = offer.oldPrice && offer.price
    ? Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100)
    : null;

  return (
    <div
      className={`offer-sheet-overlay${closing ? " offer-sheet-overlay--closing" : ""}`}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={sheetRef}
        className={`offer-sheet${closing ? " offer-sheet--closing" : ""}`}
        style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label={offer.title}
      >
        {/* Drag handle */}
        <div className="offer-sheet-handle" />

        {/* Close button */}
        <button
          className="offer-sheet-close"
          onClick={handleClose}
          aria-label="Close"
          type="button"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Media */}
        <div className="offer-sheet-media">
          {mediaSrc ? (
            <MediaItem
              src={mediaSrc}
              type={mediaType}
              alt={offer.title}
              className="offer-sheet-media-item"
            />
          ) : (
            <div className="offer-sheet-media-empty">No media</div>
          )}
          {discount ? (
            <span className="offer-sheet-discount-badge">−{discount}%</span>
          ) : null}
        </div>

        {/* Content */}
        <div className="offer-sheet-body">
          {offer.shopChip ? (
            <span className="offer-sheet-chip">{offer.shopChip}</span>
          ) : null}

          <h2 className="offer-sheet-title">{offer.title}</h2>

          {offer.description ? (
            <p className="offer-sheet-desc">{offer.description}</p>
          ) : null}

          <div className="offer-sheet-pricing">
            <span className="offer-sheet-price">
              GHS {Number(offer.price || 0).toFixed(2)}
            </span>
            {offer.oldPrice ? (
              <span className="offer-sheet-old-price">
                GHS {Number(offer.oldPrice).toFixed(2)}
              </span>
            ) : null}
          </div>

          <button
            className="offer-sheet-cta"
            type="button"
            onClick={() => onViewInShop(offer)}
          >
            View in Shop
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function OfferCard({ offer, index, onClick }) {
  const mediaType = offer.mediaType || "image";
  const mediaSrc = offer.mediaUrl || offer.image || "";
  const isLarge = index % 5 === 0 || index % 5 === 3;
  const discount = offer.oldPrice && offer.price
    ? Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100)
    : null;

  return (
    <button
      className={`offer-card${isLarge ? " offer-card--large" : ""}`}
      onClick={onClick}
      type="button"
      aria-label={`View ${offer.title}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="offer-card-media">
        {mediaSrc ? (
          <MediaItem
            src={mediaSrc}
            type={mediaType}
            alt={offer.title}
            className="offer-card-img"
          />
        ) : (
          <div className="offer-card-img-empty" />
        )}

        {/* Gradient overlay */}
        <div className="offer-card-overlay" />

        {/* Badges */}
        <div className="offer-card-badges">
          {discount ? (
            <span className="offer-badge offer-badge--discount">−{discount}%</span>
          ) : null}
          {mediaType === "video" ? (
            <span className="offer-badge offer-badge--video">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            </span>
          ) : null}
        </div>

        {/* Bottom info */}
        <div className="offer-card-info">
          {offer.shopChip ? (
            <span className="offer-card-chip">{offer.shopChip}</span>
          ) : null}
          <h3 className="offer-card-title">{offer.title}</h3>
          <div className="offer-card-price-row">
            <span className="offer-card-price">
              GHS {Number(offer.price || 0).toFixed(2)}
            </span>
            {offer.oldPrice ? (
              <span className="offer-card-old-price">
                GHS {Number(offer.oldPrice).toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function Offers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeOffer, setActiveOffer] = useState(null);

  useEffect(() => {
    let alive = true;

    async function loadOffers() {
      setLoading(true);
      setError("");
      try {
        const q = query(
          collection(db, OFFERS_COLLECTION),
          orderBy("order", "asc")
        );
        const snap = await getDocs(q);
        if (!alive) return;
        const rows = snap.docs.map((docSnap) => {
          const d = docSnap.data() || {};
          return {
            id: docSnap.id,
            title: String(d.title || "").trim(),
            description: String(d.description || "").trim(),
            price: Number(d.price || 0),
            oldPrice: d.oldPrice ? Number(d.oldPrice) : null,
            mediaUrl: String(d.mediaUrl || d.image || "").trim(),
            mediaType: String(d.mediaType || "image").trim(),
            shopChip: String(d.shopChip || "").trim(),
            productId: String(d.productId || "").trim(),
            shopKey: String(d.shopKey || "").trim(),
            order: Number(d.order || 0),
          };
        });
        setOffers(rows);
      } catch (err) {
        console.error("Offers fetch error:", err);
        // Fallback without orderBy in case index isn't ready
        try {
          const fallbackSnap = await getDocs(collection(db, OFFERS_COLLECTION));
          if (!alive) return;
          const rows = fallbackSnap.docs.map((docSnap) => {
            const d = docSnap.data() || {};
            return {
              id: docSnap.id,
              title: String(d.title || "").trim(),
              description: String(d.description || "").trim(),
              price: Number(d.price || 0),
              oldPrice: d.oldPrice ? Number(d.oldPrice) : null,
              mediaUrl: String(d.mediaUrl || d.image || "").trim(),
              mediaType: String(d.mediaType || "image").trim(),
              shopChip: String(d.shopChip || "").trim(),
              productId: String(d.productId || "").trim(),
              shopKey: String(d.shopKey || "").trim(),
              order: Number(d.order || 0),
            };
          });
          setOffers(rows.sort((a, b) => a.order - b.order));
        } catch (fallbackErr) {
          console.error("Offers fallback error:", fallbackErr);
          if (alive) setError("Failed to load offers.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadOffers();
    return () => { alive = false; };
  }, []);

  const handleViewInShop = (offer) => {
    setActiveOffer(null);
    if (offer.productId) {
      navigate(`/product/${offer.productId}`);
    } else if (offer.shopKey) {
      navigate(`/shop?shop=${encodeURIComponent(offer.shopKey)}`);
    } else {
      navigate("/shop");
    }
  };

  return (
    <div className="offers-page">
      {/* Header */}
      <section className="offers-intro">
        <div className="offers-intro-eyebrow">
          <span className="offers-live-dot" />
          Updated weekly
        </div>
        <h1 className="offers-headline">
          Tailored picks,<br />
          <em>just for you.</em>
        </h1>
        <p className="offers-subhead">
          Our curated selection of the week — handpicked deals across every shop.
        </p>
      </section>

      {/* Grid */}
      {loading ? (
        <div className="offers-loading">
          <div className="offers-skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`offers-skeleton${i % 5 === 0 || i % 5 === 3 ? " offers-skeleton--large" : ""}`}
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="offers-error">{error}</div>
      ) : offers.length === 0 ? (
        <div className="offers-empty">
          <div className="offers-empty-icon">✦</div>
          <p>No offers this week yet. Check back soon.</p>
        </div>
      ) : (
        <div className="offers-grid">
          {offers.map((offer, index) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              index={index}
              onClick={() => setActiveOffer(offer)}
            />
          ))}
        </div>
      )}

      {/* Bottom Sheet */}
      {activeOffer ? (
        <OfferSheet
          offer={activeOffer}
          onClose={() => setActiveOffer(null)}
          onViewInShop={handleViewInShop}
        />
      ) : null}
    </div>
  );
}
