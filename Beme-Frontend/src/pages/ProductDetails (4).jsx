import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  doc, getDoc, collection, query, limit, getDocs,
  addDoc, serverTimestamp, orderBy, updateDoc, increment,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import { SHOPS, HOME_FILTER_OPTIONS } from "../constants/catalog";
import { useWishlist } from "../hooks/useWishlist";
import WishlistModal from "../components/WishlistModal";
import "./ProductDetails.css";

/* ─── helpers ─── */
function parseBooleanish(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["true","yes","1","in stock","instock","available","active","abroad","imported","international","overseas"].includes(raw)) return true;
  if (["false","no","0","out of stock","outofstock","unavailable","inactive","local"].includes(raw)) return false;
  return fallback;
}

function normalizeCustomizations(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((group, index) => ({
    id: group?.id || `${group?.name || "option"}-${index}`,
    name: String(group?.name || "").trim(),
    type: group?.type === "select" ? "select" : "buttons",
    required: group?.required !== false,
    values: Array.isArray(group?.values)
      ? group.values.map((value, valueIndex) => {
          if (value && typeof value === "object") {
            const label = String(value.label ?? value.value ?? value.name ?? "").trim();
            if (!label) return null;
            return { id: value.id || `${group?.name || "option"}-${index}-value-${valueIndex}`, label, priceBump: Number(value.priceBump || 0) || 0 };
          }
          const label = String(value || "").trim();
          if (!label) return null;
          return { id: `${group?.name || "option"}-${index}-value-${valueIndex}`, label, priceBump: 0 };
        }).filter(Boolean)
      : [],
  })).filter((group) => group.name && group.values.length > 0);
}

function buildSelectedOptionsLabel(selectedOptions) {
  return Object.entries(selectedOptions).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" • ");
}

function normalizeImages(product) {
  const list = Array.isArray(product?.images) ? product.images.map((i) => String(i || "").trim()).filter(Boolean) : [];
  if (list.length) return list;
  const single = String(product?.image || "").trim();
  return single ? [single] : [];
}

function normalizeShop(value) { return String(value || "").trim().toLowerCase(); }
function formatShopLabel(value) { const k = normalizeShop(value); const m = SHOPS.find((s) => s.key === k); return m?.label || k || ""; }
function normalizeHomeSlot(value) { return String(value || "").trim().toLowerCase(); }
function formatHomeSlotLabel(value) { const k = normalizeHomeSlot(value); const m = HOME_FILTER_OPTIONS.find((i) => i.key === k); return m?.label || k || ""; }

function normalizeShippingSource(product) {
  const candidates = [product?.shippingSource,product?.shippingType,product?.shipFrom,product?.ship_from,product?.fulfillmentType,product?.originType,product?.shipping_origin,product?.shipping_origin_type];
  for (const c of candidates) {
    const v = String(c || "").trim().toLowerCase();
    if (!v) continue;
    if (["abroad","ship from abroad","ships from abroad","international","imported","overseas"].includes(v)) return "abroad";
    if (["uni","unisex","universal"].includes(v)) return "uni";
    if (["local","ghana","domestic"].includes(v)) return "local";
  }
  if (parseBooleanish(product?.shipFromAbroad, false) || parseBooleanish(product?.shipsFromAbroad, false)) return "abroad";
  return "";
}
function getShippingBadgeLabel(source) { if (source === "abroad") return "Ships from abroad"; if (source === "uni") return "Uni"; return ""; }
function getNumericStock(product) { const p = Number(product?.stock); return Number.isFinite(p) ? p : null; }
function getAbroadDeliveryFee(product) { const p = Number(product?.abroadDeliveryFee); return Number.isFinite(p) && p > 0 ? p : 0; }

/* ─── Review helpers ─── */
function formatReviewDate(timestamp) {
  if (!timestamp) return "";
  try {
    const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

function getInitials(name) {
  if (!name) return "?";
  const p = String(name).trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return p[0]?.slice(0, 2).toUpperCase() || "?";
}

const AVATAR_COLORS = [
  { bg: "rgba(255,102,0,0.15)", color: "#b34700" },
  { bg: "rgba(80,70,200,0.12)", color: "#3d33a0" },
  { bg: "rgba(34,160,88,0.12)", color: "#0f6e3f" },
  { bg: "rgba(226,75,74,0.12)", color: "#a32020" },
  { bg: "rgba(0,140,200,0.12)", color: "#005e8a" },
];

function getAvatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (name.charCodeAt(i) + ((h << 5) - h)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ─── icons ─── */
function ChevronLeft() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function ChevronRight() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}
function HeartIcon({ filled }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
}
function CartIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function PlusIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function StarIcon({ filled = true }) {
  return <svg viewBox="0 0 24 24" width="12" height="12" fill={filled ? "#FF6600" : "none"} stroke="#FF6600" strokeWidth="1.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>;
}
function FacebookIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.2h2.4l.36-2.8H13.5V9.2c0-.81.23-1.36 1.39-1.36H16.4V5.33c-.26-.04-1.13-.11-2.14-.11-2.12 0-3.57 1.29-3.57 3.67v2.11H8.3v2.8h2.39V21h2.81Z"/></svg>;
}
function XIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M18.9 3H21l-4.59 5.25L21.8 21h-4.22l-3.31-4.32L10.49 21H8.37l4.9-5.6L2.8 3h4.33l2.99 3.91L13.54 3h2.12l-4.58 5.24L18.9 3Zm-1.48 16h1.17L6.53 4.9H5.28L17.42 19Z"/></svg>;
}
function InstagramIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M7.75 3h8.5A4.75 4.75 0 0 1 21 7.75v8.5A4.75 4.75 0 0 1 16.25 21h-8.5A4.75 4.75 0 0 1 3 16.25v-8.5A4.75 4.75 0 0 1 7.75 3Zm0 1.8A2.95 2.95 0 0 0 4.8 7.75v8.5a2.95 2.95 0 0 0 2.95 2.95h8.5a2.95 2.95 0 0 0 2.95-2.95v-8.5a2.95 2.95 0 0 0-2.95-2.95h-8.5Zm8.9 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7.2A4.8 4.8 0 1 1 7.2 12 4.81 4.81 0 0 1 12 7.2Zm0 1.8A3 3 0 1 0 15 12a3 3 0 0 0-3-3Z"/></svg>;
}
function TikTokIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M14.6 3c.28 2.2 1.52 3.78 3.62 4.18v2.54a6.3 6.3 0 0 1-3.45-1.15v6.08A5.83 5.83 0 1 1 8.94 8.8v2.7a3.18 3.18 0 1 0 2.92 3.17V3h2.74Z"/></svg>;
}
function TruckIcon() {
  return <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
}
function ThumbUpIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
    </svg>
  );
}

/* ─── Suggestion Card ─── */
export function SuggestionCard({ product }) {
  const navigate = useNavigate();
  const images = normalizeImages(product);
  const price = Number(product?.price || 0);
  const oldPrice = Number(product?.oldPrice || 0);
  const name = product?.name ?? "Product";
  const hasDiscount = oldPrice > price;

  return (
    <div className="pd-sug-card" onClick={() => navigate(`/product/${product.id}`)}>
      <div className="pd-sug-img-wrap">
        {hasDiscount && <span className="pd-sug-discount-badge">Sale</span>}
        {images[0] ? (
          <img src={images[0]} alt={name} className="pd-sug-img" />
        ) : (
          <div className="pd-sug-img-empty">No image</div>
        )}
      </div>
      <div className="pd-sug-info">
        <p className="pd-sug-name">{name}</p>
        <div className="pd-sug-stars">
          {[1,2,3,4,5].map((i) => <StarIcon key={i} filled={i <= 4} />)}
        </div>
        <div className="pd-sug-prices">
          <span className="pd-sug-price">GHS {price.toFixed(2)}</span>
          {hasDiscount && <span className="pd-sug-old">GHS {oldPrice.toFixed(2)}</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton ─── */
function ProductDetailsSkeleton() {
  return (
    <div className="pd-page">
      <div className="pd-layout-row">
        <div className="pd-left-col">
          <div className="pd-skeleton-hero" />
        </div>
        <div className="pd-skeleton-body">
          <div className="pd-skeleton pd-sk-title" />
          <div className="pd-skeleton pd-sk-badges" />
          <div className="pd-skeleton pd-sk-price" />
          <div className="pd-skeleton pd-sk-line" />
          <div className="pd-skeleton pd-sk-line short" />
          <div className="pd-skeleton pd-sk-btn" />
        </div>
      </div>
    </div>
  );
}

/* ─── Reviews Section ─── */
function ReviewsSection({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const [formRating, setFormRating] = useState(0);
  const [formHover, setFormHover] = useState(0);
  const [formComment, setFormComment] = useState("");
  const [formName, setFormName] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const [helpfulSet, setHelpfulSet] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const auth = getAuth();
      setCurrentUser(auth.currentUser);
      const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u));
      return unsub;
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!productId) return;
    setReviewsLoading(true);
    const run = async () => {
      try {
        const q = query(
          collection(db, "Products", productId, "reviews"),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        const snap = await getDocs(q);
        setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Reviews fetch:", e);
      } finally {
        setReviewsLoading(false);
      }
    };
    run();
  }, [productId]);

  useEffect(() => {
    setFormRating(0);
    setFormComment("");
    setFormName("");
    setFormError("");
    setFormSuccess(false);
    setShowAll(false);
    setHelpfulSet(new Set());
  }, [productId]);

  const ratingCounts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const n = Math.round(Number(r.rating));
      if (n >= 1 && n <= 5) c[n]++;
    });
    return c;
  }, [reviews]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length;
  }, [reviews]);

  const handleSubmit = async () => {
    if (!formRating) { setFormError("Please select a star rating."); return; }
    const trimmed = formComment.trim();
    if (trimmed.length < 3) { setFormError("Please write at least a few words."); return; }

    const auth = getAuth();
    const user = auth.currentUser;
    const displayName = formName.trim() || user?.displayName || "Anonymous";

    setFormSubmitting(true);
    setFormError("");
    try {
      const payload = {
        name: displayName,
        userId: user?.uid || null,
        rating: formRating,
        comment: trimmed,
        createdAt: serverTimestamp(),
        helpful: 0,
        verified: !!user,
      };
      const ref = await addDoc(collection(db, "Products", productId, "reviews"), payload);
      setReviews((p) => [{ id: ref.id, ...payload, createdAt: new Date() }, ...p]);
      setFormRating(0);
      setFormComment("");
      setFormName("");
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 3500);
    } catch (e) {
      console.error("Review submit:", e);
      setFormError("Could not post your review. Please try again.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    if (helpfulSet.has(reviewId)) return;
    setHelpfulSet((p) => new Set([...p, reviewId]));
    setReviews((p) => p.map((r) => r.id === reviewId ? { ...r, helpful: (r.helpful || 0) + 1 } : r));
    try {
      await updateDoc(doc(db, "Products", productId, "reviews", reviewId), {
        helpful: increment(1),
      });
    } catch (e) {
      setHelpfulSet((p) => { const s = new Set(p); s.delete(reviewId); return s; });
      setReviews((p) => p.map((r) => r.id === reviewId ? { ...r, helpful: Math.max(0, (r.helpful || 0) - 1) } : r));
    }
  };

  const visibleReviews = showAll ? reviews : reviews.slice(0, 3);

  const renderStars = (rating, size = 12) => (
    <div className="pd-rv-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size}
          fill={i <= Math.round(rating) ? "#FF6600" : "none"}
          stroke="#FF6600" strokeWidth="1.5"
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  );

  const starLabels = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

  return (
    <div className="pd-reviews">
      <div className="pd-reviews-hdr">
        <h2 className="pd-reviews-title">Reviews & Comments</h2>
        <span className="pd-reviews-count">
          {reviews.length} review{reviews.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Rating summary */}
      {!reviewsLoading && reviews.length > 0 && (
        <div className="pd-rating-summary">
          <div className="pd-rating-avg-col">
            <span className="pd-rating-big">{avgRating.toFixed(1)}</span>
            {renderStars(avgRating, 14)}
            <span className="pd-rating-sub">
              out of 5
            </span>
          </div>
          <div className="pd-rating-bars">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="pd-rating-bar-row">
                <span className="pd-rating-bar-label">{star}</span>
                <div className="pd-rating-bar-track">
                  <div
                    className="pd-rating-bar-fill"
                    style={{
                      width: reviews.length
                        ? `${(ratingCounts[star] / reviews.length) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
                <span className="pd-rating-bar-cnt">{ratingCounts[star]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write review form */}
      <div className="pd-review-form">
        <p className="pd-review-form-label">
          {currentUser
            ? `Reviewing as ${currentUser.displayName || currentUser.email?.split("@")[0] || "you"}`
            : "Share your experience"}
        </p>

        <div className="pd-star-picker">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              className={`pd-star-pick ${(formHover || formRating) >= i ? "active" : ""}`}
              onMouseEnter={() => setFormHover(i)}
              onMouseLeave={() => setFormHover(0)}
              onClick={() => { setFormRating(i); setFormError(""); }}
              aria-label={`Rate ${i} star${i !== 1 ? "s" : ""}`}
            >
              <svg viewBox="0 0 24 24" width="28" height="28"
                fill={(formHover || formRating) >= i ? "#FF6600" : "none"}
                stroke={(formHover || formRating) >= i ? "#FF6600" : "rgba(255,102,0,0.35)"}
                strokeWidth="1.5"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            </button>
          ))}
          {formRating > 0 && (
            <span className="pd-star-label">{starLabels[formRating]}</span>
          )}
        </div>

        <textarea
          className="pd-review-textarea"
          placeholder="What do you think about this product?"
          value={formComment}
          onChange={(e) => { setFormComment(e.target.value); setFormError(""); }}
          maxLength={1000}
        />

        <div className="pd-review-form-row">
          {!currentUser && (
            <input
              className="pd-review-name-input"
              type="text"
              placeholder="Your name (optional)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              maxLength={80}
            />
          )}
          <button
            type="button"
            className="pd-review-submit"
            onClick={handleSubmit}
            disabled={formSubmitting}
          >
            {formSubmitting ? "Posting…" : "Post review"}
          </button>
        </div>

        {formError && <p className="pd-review-form-error">{formError}</p>}
        {formSuccess && (
          <p className="pd-review-form-success">Your review has been posted. Thank you!</p>
        )}
      </div>

      {/* Review list */}
      {reviewsLoading ? (
        <div className="pd-reviews-loading">
          {[0, 1, 2].map((i) => <div key={i} className="pd-review-skeleton" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="pd-reviews-empty">
          <p>No reviews yet. Be the first to share your experience!</p>
        </div>
      ) : (
        <>
          <div className="pd-review-cards">
            {visibleReviews.map((review) => {
              const initials = getInitials(review.name);
              const avatarColor = getAvatarColor(review.name || "");
              const isHelpfulClicked = helpfulSet.has(review.id);
              return (
                <div key={review.id} className="pd-review-card">
                  <div className="pd-review-card-top">
                    <div
                      className="pd-review-avatar"
                      style={{ background: avatarColor.bg, color: avatarColor.color }}
                    >
                      {initials}
                    </div>
                    <div className="pd-review-meta">
                      <span className="pd-review-name">{review.name || "Anonymous"}</span>
                      <span className="pd-review-date">{formatReviewDate(review.createdAt)}</span>
                    </div>
                    <div className="pd-rv-stars-wrap">
                      {renderStars(review.rating, 12)}
                    </div>
                  </div>
                  <p className="pd-review-text">{review.comment}</p>
                  <div className="pd-review-footer">
                    <button
                      type="button"
                      className={`pd-helpful-btn ${isHelpfulClicked ? "active" : ""}`}
                      onClick={() => handleHelpful(review.id)}
                      disabled={isHelpfulClicked}
                    >
                      <ThumbUpIcon filled={isHelpfulClicked} />
                      {review.helpful > 0 ? `Helpful · ${review.helpful}` : "Helpful"}
                    </button>
                    {review.verified && (
                      <span className="pd-verified-badge">Verified buyer</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {reviews.length > 3 && (
            <button
              type="button"
              className="pd-reviews-load-more"
              onClick={() => setShowAll((p) => !p)}
            >
              {showAll
                ? "Show less ↑"
                : `Load more reviews (${reviews.length - 3} more) ↓`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
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
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const openWishlistModal  = useCallback(() => setShowWishlistModal(true),  []);
  const closeWishlistModal = useCallback(() => setShowWishlistModal(false), []);
  const [descExpanded, setDescExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const feedbackTimerRef = useRef(null);
  const touchStartXRef = useRef(0);
  const dragStartedRef = useRef(false);

  /* fetch product */
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "Products", id));
        if (!snap.exists()) { setProduct(null); setLoading(false); return; }
        setProduct({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error("Product details fetch error:", err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => { if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current); };
  }, [id]);

  /* fetch suggestions */
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const q = query(collection(db, "Products"), limit(10));
        const snap = await getDocs(q);
        const results = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.id !== id);
        setSuggestions(results.slice(0, 8));
      } catch (err) {
        console.error("Suggestions fetch error:", err);
      }
    };
    if (id) fetchSuggestions();
  }, [id]);

  const customizations = useMemo(() => normalizeCustomizations(product?.customizations), [product?.customizations]);
  const images = useMemo(() => normalizeImages(product), [product]);
  const basePrice = useMemo(() => Number(product?.price || 0), [product]);
  const oldPrice = useMemo(() => Number(product?.oldPrice || 0), [product]);
  const shopKey = useMemo(() => normalizeShop(product?.shop), [product?.shop]);
  const shopLabel = useMemo(() => formatShopLabel(product?.shop), [product?.shop]);
  const homeSlot = useMemo(() => normalizeHomeSlot(product?.homeSlot || "others"), [product?.homeSlot]);
  const homeSlotLabel = useMemo(() => formatHomeSlotLabel(product?.homeSlot || "others"), [product?.homeSlot]);
  const brand = useMemo(() => String(product?.brand || "").trim(), [product]);
  const shippingSource = useMemo(() => normalizeShippingSource(product), [product]);
  const shippingBadgeLabel = useMemo(() => getShippingBadgeLabel(shippingSource), [shippingSource]);
  const shipsFromAbroad = useMemo(() => shippingSource === "abroad" || parseBooleanish(product?.shipFromAbroad, false) || parseBooleanish(product?.shipsFromAbroad, false), [shippingSource, product]);
  const stock = useMemo(() => getNumericStock(product), [product]);
  const abroadDeliveryFee = useMemo(() => getAbroadDeliveryFee(product), [product]);
  const isOutOfStock = useMemo(() => parseBooleanish(product?.inStock, true) === false, [product]);

  const wishlistProduct = useMemo(() => {
    if (!product) return null;
    return {
      id:    product.id,
      name:  product.name  ?? "",
      price: Number(product.price || 0),
      image: String(product.image || images[0] || "").trim(),
    };
  }, [product, images]);

  const { isWishlisted, toggleWishlist, loading: wishlistLoading } = useWishlist(
    wishlistProduct,
    openWishlistModal
  );

  useEffect(() => {
    const init = {};
    customizations.forEach((g) => { init[g.name] = ""; });
    setSelectedOptions(init);
    setOptionError("");
    setCartFeedback("");
  }, [customizations, product?.id]);

  useEffect(() => {
    setActiveImageIndex(0); setQty(1); setAddedFeedback(false);
    setCartFeedback(""); setDragOffset(0); setIsDragging(false); setDescExpanded(false);
  }, [product?.id]);

  useEffect(() => {
    if (stock !== null) setQty((p) => Math.max(1, Math.min(p, Math.max(stock, 1))));
  }, [stock]);

  const formatMoney = (n) => `GHS ${Number(n || 0).toFixed(2)}`;

  const selectedOptionDetails = useMemo(() => {
    const details = [];
    customizations.forEach((group) => {
      const lbl = selectedOptions[group.name];
      if (!lbl) return;
      const match = group.values.find((v) => v.label === lbl);
      if (!match) return;
      details.push({ groupName: group.name, label: match.label, priceBump: Number(match.priceBump || 0) || 0 });
    });
    return details;
  }, [customizations, selectedOptions]);

  const optionPriceTotal = useMemo(() => selectedOptionDetails.reduce((s, i) => s + (Number(i.priceBump || 0) || 0), 0), [selectedOptionDetails]);
  const finalUnitPrice = useMemo(() => basePrice + optionPriceTotal, [basePrice, optionPriceTotal]);

  const setOptionValue = (groupName, value) => {
    setSelectedOptions((p) => ({ ...p, [groupName]: value }));
    setOptionError(""); setCartFeedback("");
  };

  const validateSelections = () => {
    for (const g of customizations) {
      if (g.required && !selectedOptions[g.name]) return `Please choose ${g.name}.`;
    }
    return "";
  };

  const buildCartItem = () => {
    if (!product) return null;
    return {
      id: product.id, name: product.name, price: Number(finalUnitPrice || 0),
      basePrice: Number(basePrice || 0), optionPriceTotal: Number(optionPriceTotal || 0),
      oldPrice: product?.oldPrice !== undefined && product?.oldPrice !== null && product?.oldPrice !== "" ? Number(product.oldPrice || 0) : null,
      image: String(product.image || images[0] || "").trim(), images, qty, stock,
      inStock: parseBooleanish(product?.inStock, true), shop: shopKey || "", homeSlot,
      selectedOptions, selectedOptionsLabel: buildSelectedOptionsLabel(selectedOptions),
      selectedOptionDetails, customizations, shippingSource, shipsFromAbroad, abroadDeliveryFee, productId: product.id,
    };
  };

  const triggerAddedFeedback = (msg = "Added to cart successfully.") => {
    setAddedFeedback(true); setCartFeedback(msg);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => { setAddedFeedback(false); setCartFeedback(""); }, 1800);
  };

  const triggerErrorFeedback = (msg) => {
    setAddedFeedback(false); setCartFeedback(msg);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setCartFeedback(""), 2200);
  };

  const handleAdd = () => {
    if (!product) return;
    if (isOutOfStock) { triggerErrorFeedback("Sorry, this item is currently out of stock."); return; }
    const err = validateSelections();
    if (err) { setOptionError(err); return; }
    const item = buildCartItem();
    if (!item) return;
    const result = addToCart(item);
    if (result?.ok === false) { triggerErrorFeedback(result.message || "Unable to add this item."); return; }
    triggerAddedFeedback(result?.message || "Added to cart successfully.");
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (isOutOfStock) { triggerErrorFeedback("Sorry, this item is currently out of stock."); return; }
    const err = validateSelections();
    if (err) { setOptionError(err); return; }
    const item = buildCartItem();
    if (!item) return;
    const result = addToCart(item);
    if (result?.ok === false) { triggerErrorFeedback(result.message || "Unable to add this item."); return; }
    navigate("/checkout");
  };

  const goPrev = () => { if (images.length <= 1) return; setDragOffset(0); setActiveImageIndex((p) => (p === 0 ? images.length - 1 : p - 1)); };
  const goNext = () => { if (images.length <= 1) return; setDragOffset(0); setActiveImageIndex((p) => (p === images.length - 1 ? 0 : p + 1)); };

  const onTouchStart = (e) => { if (images.length <= 1) return; touchStartXRef.current = e.changedTouches[0]?.clientX || 0; dragStartedRef.current = true; setIsDragging(true); };
  const onTouchMove = (e) => { if (!dragStartedRef.current || images.length <= 1) return; setDragOffset((e.changedTouches[0]?.clientX || 0) - touchStartXRef.current); };
  const onTouchEnd = (e) => {
    if (!dragStartedRef.current || images.length <= 1) return;
    const delta = (e.changedTouches[0]?.clientX || 0) - touchStartXRef.current;
    dragStartedRef.current = false; setIsDragging(false);
    if (Math.abs(delta) >= 50) { delta < 0 ? goNext() : goPrev(); return; }
    setDragOffset(0);
  };
  const onTouchCancel = () => { dragStartedRef.current = false; setIsDragging(false); setDragOffset(0); };

  if (loading) return <ProductDetailsSkeleton />;

  if (!product) {
    return (
      <div className="pd-page">
        <div className="pd-empty-state">
          <div className="pd-empty-card">
            <h1>Product not found</h1>
            <p>This product may have been removed or is no longer available.</p>
            <div className="pd-empty-actions">
              <Link to="/shop" className="pd-empty-btn">Back to shop</Link>
              <Link to="/" className="pd-empty-btn pd-empty-btn--ghost">Go home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const name = product?.name ?? "Untitled";
  const desc = product?.description ?? "This is a premium product from Beme Market. Add a description in Firestore to show details here.";
  const qtyLimitReached = stock !== null && qty >= stock;
  const sliderTranslate = `calc(${-activeImageIndex * 100}% + ${dragOffset}px)`;
  const hasDiscount = oldPrice > finalUnitPrice;

  const colorGroup = customizations.find((g) => g.name.toLowerCase().includes("color") || g.name.toLowerCase().includes("colour"));

  const socialLinks = [
    { label: "Facebook", href: "#", icon: <FacebookIcon /> },
    { label: "X", href: "#", icon: <XIcon /> },
    { label: "Instagram", href: "#", icon: <InstagramIcon /> },
    { label: "TikTok", href: "#", icon: <TikTokIcon /> },
  ];

  return (
    <div className="pd-page">

      {/* ── TWO-COLUMN ROW (desktop: image left | info right) ── */}
      <div className="pd-layout-row">

        {/* ── LEFT COLUMN: hero image + thumbnails ── */}
        <div className="pd-left-col">

          {/* ── HERO IMAGE ── */}
          <div
            className={`pd-hero ${isDragging ? "is-dragging" : ""}`}
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
                  {images.map((src, i) => (
                    <div className="pd-slide" key={`${src}-${i}`}>
                      <img className="pd-hero-img" src={src} alt={`${name} ${i + 1}`} draggable="false" />
                    </div>
                  ))}
                </div>

                {shippingBadgeLabel && (
                  <div className={`pd-ship-badge ${shippingSource === "uni" ? "pd-ship-badge--uni" : ""} ${shipsFromAbroad ? "pd-ship-badge--abroad" : ""}`}>
                    {shippingBadgeLabel}
                  </div>
                )}

                {isOutOfStock && <div className="pd-oos-badge">Out of stock</div>}

                {images.length > 1 && (
                  <div className="pd-gallery-counter">{activeImageIndex + 1} / {images.length}</div>
                )}

                {images.length > 1 && (
                  <>
                    <button type="button" className="pd-arrow pd-arrow--left" onClick={goPrev} aria-label="Previous"><ChevronLeft /></button>
                    <button type="button" className="pd-arrow pd-arrow--right" onClick={goNext} aria-label="Next"><ChevronRight /></button>
                  </>
                )}

                <button
                  type="button"
                  className={`pd-wishlist-btn ${isWishlisted ? "active" : ""}`}
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                >
                  <HeartIcon filled={isWishlisted} />
                </button>

                {images.length > 1 && (
                  <div className="pd-dots">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`pd-dot ${i === activeImageIndex ? "active" : ""}`}
                        onClick={() => { setDragOffset(0); setActiveImageIndex(i); }}
                        aria-label={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="pd-hero-empty">No image</div>
            )}
          </div>

          {/* ── THUMBNAILS ── */}
          {images.length > 1 && (
            <div className="pd-thumbs-row">
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  className={`pd-thumb ${i === activeImageIndex ? "active" : ""}`}
                  onClick={() => { setDragOffset(0); setActiveImageIndex(i); }}
                  aria-label={`Select image ${i + 1}`}
                >
                  <img src={src} alt={`${name} ${i + 1}`} />
                </button>
              ))}
            </div>
          )}

        </div>{/* end pd-left-col */}

        {/* ── RIGHT COLUMN: all product info ── */}
        <div className="pd-body">

          <h1 className="pd-title">{name}</h1>

          <div className="pd-badges">
            <span className={`pd-badge ${isOutOfStock ? "pd-badge--out" : "pd-badge--in"}`}>
              {isOutOfStock ? "Out of stock" : "In stock"}
            </span>
            {shippingBadgeLabel && (
              <span className={`pd-badge ${shipsFromAbroad ? "pd-badge--abroad" : "pd-badge--uni"}`}>
                {shippingBadgeLabel}
              </span>
            )}
            {shopLabel && <span className="pd-badge pd-badge--soft">{shopLabel}</span>}
            {homeSlotLabel && <span className="pd-badge pd-badge--soft">{homeSlotLabel}</span>}
          </div>

          <div className="pd-price-row">
            <span className="pd-price">{formatMoney(finalUnitPrice)}</span>
            {hasDiscount && (
              <>
                <span className="pd-old-price">{formatMoney(oldPrice)}</span>
                <span className="pd-save-badge">Save {formatMoney(oldPrice - finalUnitPrice)}</span>
              </>
            )}
            {optionPriceTotal > 0 && (
              <span className="pd-option-bump">+{formatMoney(optionPriceTotal)} options</span>
            )}
          </div>

          {brand && (
            <div className="pd-section">
              <h3 className="pd-section-label">Brand</h3>
              <div className="pd-brand-pill">{brand}</div>
            </div>
          )}

          <div className="pd-section">
            <h3 className="pd-section-label">
              Color
              {colorGroup && selectedOptions[colorGroup.name] && (
                <span className="pd-section-value"> · {selectedOptions[colorGroup.name]}</span>
              )}
            </h3>
            <div className="pd-swatches">
              {colorGroup ? (
                colorGroup.values.map((val) => {
                  const active = selectedOptions[colorGroup.name] === val.label;
                  const colorMap = {
                    white: "#f0eeea", black: "#111", red: "#e24b4a", blue: "#378add",
                    green: "#639922", yellow: "#ef9f27", navy: "#1a2a5e", grey: "#b0aba3",
                    gray: "#b0aba3", pink: "#d4537e", orange: "#FF6600", purple: "#7f77dd",
                    brown: "#8b5e3c", beige: "#f5f0e8", cream: "#faf6ee",
                  };
                  const key = val.label.toLowerCase();
                  const bg = Object.entries(colorMap).find(([k]) => key.includes(k))?.[1] || "#ccc";
                  return (
                    <button
                      key={val.id}
                      type="button"
                      className={`pd-swatch ${active ? "active" : ""}`}
                      onClick={() => setOptionValue(colorGroup.name, val.label)}
                      title={val.label}
                      style={{ "--swatch-bg": bg }}
                    >
                      {active && <CheckIcon />}
                    </button>
                  );
                })
              ) : (
                <button type="button" className="pd-swatch active" style={{ "--swatch-bg": "#f0eeea" }} title="Default"><CheckIcon /></button>
              )}
              <button type="button" className="pd-swatch pd-swatch--add" title="Add color (admin)">
                <PlusIcon />
              </button>
            </div>
          </div>

          {customizations.length > 0 && (
            <div className="pd-section">
              {customizations.filter((g) => g !== colorGroup).map((group) => (
                <div className="pd-option-group" key={group.id}>
                  <h3 className="pd-section-label">
                    {group.name}
                    {group.required && <span className="pd-required-dot" />}
                  </h3>
                  {group.type === "select" ? (
                    <select
                      className="pd-select"
                      value={selectedOptions[group.name] || ""}
                      onChange={(e) => setOptionValue(group.name, e.target.value)}
                    >
                      <option value="">Select {group.name.toLowerCase()}</option>
                      {group.values.map((val) => (
                        <option key={val.id} value={val.label}>
                          {val.label}{val.priceBump > 0 ? ` (+${formatMoney(val.priceBump)})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="pd-option-pills">
                      {group.values.map((val) => {
                        const active = selectedOptions[group.name] === val.label;
                        return (
                          <button
                            key={val.id}
                            type="button"
                            className={`pd-option-pill ${active ? "active" : ""}`}
                            onClick={() => setOptionValue(group.name, val.label)}
                          >
                            {val.label}
                            {val.priceBump > 0 && <span className="pd-bump"> +{formatMoney(val.priceBump)}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {optionError && <p className="pd-error">{optionError}</p>}
            </div>
          )}

          <div className="pd-section">
            <h3 className="pd-section-label">Description</h3>
            <p className={`pd-desc ${descExpanded ? "expanded" : ""}`}>{desc}</p>
            {desc.length > 160 && (
              <button type="button" className="pd-read-more" onClick={() => setDescExpanded((p) => !p)}>
                {descExpanded ? "Read less ↑" : "Read more ↓"}
              </button>
            )}
          </div>

          <div className="pd-section">
            <h3 className="pd-section-label">Share</h3>
            <div className="pd-socials">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="pd-social-btn"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="pd-qty-row">
            <span className="pd-qty-label">
              Qty{stock !== null && !isOutOfStock && <span className="pd-stock-note"> · {stock} left</span>}
            </span>
            <div className="pd-qty-ctrl">
              <button
                type="button"
                className="pd-qty-btn"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={isOutOfStock}
                aria-label="Decrease"
              >−</button>
              <span className="pd-qty-num">{qty}</span>
              <button
                type="button"
                className="pd-qty-btn"
                onClick={() => setQty((q) => stock !== null ? Math.min(stock, q + 1) : q + 1)}
                disabled={isOutOfStock || qtyLimitReached}
                aria-label="Increase"
              >+</button>
            </div>
          </div>

          {stock !== null && !isOutOfStock && qtyLimitReached && (
            <p className="pd-error">Maximum available quantity reached.</p>
          )}

          {shipsFromAbroad && abroadDeliveryFee > 0 && (
            <div className="pd-info-strip pd-info-strip--delivery">
              <TruckIcon /> Abroad delivery fee: {formatMoney(abroadDeliveryFee)}
            </div>
          )}

          {isOutOfStock && <p className="pd-error">Sorry, this product is currently unavailable.</p>}

          {cartFeedback && (
            <div className={addedFeedback ? "pd-success-strip" : "pd-error"}>{cartFeedback}</div>
          )}

          <div className="pd-cta">
            <button type="button" className="pd-btn pd-btn--outline" onClick={handleAdd} disabled={isOutOfStock}>
              <CartIcon />
              {isOutOfStock ? "Unavailable" : "Add to cart"}
            </button>
            <button type="button" className="pd-btn pd-btn--primary" onClick={handleBuyNow} disabled={isOutOfStock}>
              {isOutOfStock ? "Out of stock" : "Buy now"}
            </button>
          </div>

          <div className="pd-delivery-note">
            <TruckIcon />
            <span>Get it in 1–3 days in Ghana · May take a week if shipped from abroad</span>
          </div>

        </div>{/* end pd-body (right column) */}

      </div>{/* end pd-layout-row */}

      {/* ── REVIEWS (full-width below both columns) ── */}
      <ReviewsSection productId={id} />

      {/* ── YOU MAY ALSO LIKE (full-width below reviews) ── */}
      {suggestions.length > 0 && (
        <div className="pd-suggestions">
          <div className="pd-sug-header">
            <h2 className="pd-sug-title">You may also like</h2>
          </div>
          <div className="pd-sug-scroll">
            {suggestions.map((p) => (
              <SuggestionCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* ── WISHLIST MODAL ── */}
      {showWishlistModal && wishlistProduct && (
        <WishlistModal
          product={wishlistProduct}
          onClose={closeWishlistModal}
        />
      )}

    </div>
  );
}
