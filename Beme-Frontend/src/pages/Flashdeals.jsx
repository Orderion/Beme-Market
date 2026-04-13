import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import "./FlashDeals.css";

const FLASH_COLLECTION = "FlashDeals";

function normalizeFlashDeal(docSnap) {
  const d = docSnap.data() || {};
  return {
    id: docSnap.id,
    title: String(d.title || "").trim(),
    image: String(d.image || d.mediaUrl || "").trim(),
    dealPrice: Number(d.dealPrice || 0),
    originalPrice: Number(d.originalPrice || 0),
    discountPercent: Number(d.discountPercent || 0),
    productId: String(d.productId || "").trim(),
    shopKey: String(d.shopKey || "").trim(),
    order: Number(d.order || 0),
    durationHours: Number(d.durationHours || 24),
    endsAt: d.endsAt || null,
    createdAt: d.createdAt || null,
  };
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return `GHS ${amount.toFixed(2)}`;
}

function getEndsAtMillis(deal) {
  if (!deal.endsAt) return null;
  if (deal.endsAt?.toMillis) return deal.endsAt.toMillis();
  return Number(deal.endsAt);
}

function computeCountdown(endsAtMs) {
  if (!endsAtMs) return null;
  const diff = endsAtMs - Date.now();
  if (diff <= 0) return { expired: true, h: 0, m: 0, s: 0, diff: 0 };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { expired: false, h, m, s, diff };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

/* ── Single deal card (dark style like the reference image) ── */
function FlashDealCard({ deal, onClick }) {
  const [countdown, setCountdown] = useState(() =>
    computeCountdown(getEndsAtMillis(deal))
  );

  useEffect(() => {
    const endsAtMs = getEndsAtMillis(deal);
    if (!endsAtMs) return;
    const interval = setInterval(() => {
      setCountdown(computeCountdown(endsAtMs));
    }, 1000);
    return () => clearInterval(interval);
  }, [deal]);

  const isExpired = !countdown || countdown.expired;
  const discount = deal.discountPercent
    ? deal.discountPercent
    : deal.originalPrice > deal.dealPrice
    ? Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100)
    : 0;

  return (
    <button
      type="button"
      className={`fd-card ${isExpired ? "fd-card--expired" : ""}`}
      onClick={onClick}
      aria-label={`${deal.title} — ${discount ? `-${discount}%` : ""}`}
    >
      {/* Image area (white) */}
      <div className="fd-card-img-wrap">
        {deal.image ? (
          <img src={deal.image} alt={deal.title} className="fd-card-img" />
        ) : (
          <div className="fd-card-img-empty">No image</div>
        )}

        {/* Wishlist heart (top right) — decorative */}
        <button
          type="button"
          className="fd-card-heart"
          onClick={(e) => e.stopPropagation()}
          aria-label="Save to wishlist"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>

        {/* Discount badge */}
        {discount > 0 && !isExpired ? (
          <span className="fd-card-discount-badge">-{discount}%</span>
        ) : null}

        {/* Expired overlay */}
        {isExpired ? (
          <div className="fd-card-expired-overlay">
            <span>Expired</span>
          </div>
        ) : null}
      </div>

      {/* Dark info area */}
      <div className="fd-card-info">
        <p className="fd-card-title">{deal.title}</p>

        {/* Timer */}
        {!isExpired && countdown ? (
          <div className="fd-card-timer">
            <span className="fd-card-timer-icon">⏱</span>
            <span className="fd-card-timer-text">
              {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
            </span>
          </div>
        ) : null}

        {/* Price row + cart button */}
        <div className="fd-card-bottom">
          <div className="fd-card-prices">
            <span className="fd-card-price">{formatMoney(deal.dealPrice)}</span>
            {deal.originalPrice > deal.dealPrice ? (
              <span className="fd-card-old-price">{formatMoney(deal.originalPrice)}</span>
            ) : null}
          </div>

          <button
            type="button"
            className="fd-card-cart-btn"
            onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
            aria-label="Add to cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
              <line x1="12" y1="12" x2="12" y2="18"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
    </button>
  );
}

export default function FlashDeals() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  /* Global second ticker for header countdown */
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const snap = await getDocs(
          query(collection(db, FLASH_COLLECTION), orderBy("order", "asc"))
        );
        if (!alive) return;
        setDeals(snap.docs.map(normalizeFlashDeal));
      } catch (err) {
        console.error("Flash deals fetch error:", err);
        if (!alive) return;
        // Fallback without orderBy
        try {
          const fallback = await getDocs(collection(db, FLASH_COLLECTION));
          if (!alive) return;
          setDeals(
            fallback.docs
              .map(normalizeFlashDeal)
              .sort((a, b) => a.order - b.order)
          );
        } catch (fallbackErr) {
          console.error("Flash deals fallback error:", fallbackErr);
          if (!alive) return;
          setError("Failed to load flash deals.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const handleDealClick = (deal) => {
    if (deal.productId) {
      navigate(`/product/${deal.productId}`);
    } else if (deal.shopKey) {
      navigate(`/shop?shop=${encodeURIComponent(deal.shopKey)}`);
    }
  };

  /* Nearest ending deal for header countdown */
  const nearestDeal = deals
    .filter((d) => {
      const ms = getEndsAtMillis(d);
      return ms && ms > Date.now();
    })
    .sort((a, b) => {
      const aMs = getEndsAtMillis(a) || Infinity;
      const bMs = getEndsAtMillis(b) || Infinity;
      return aMs - bMs;
    })[0];

  const headerCountdown = nearestDeal
    ? computeCountdown(getEndsAtMillis(nearestDeal))
    : null;

  const activeDeals = deals.filter((d) => {
    const ms = getEndsAtMillis(d);
    return !ms || ms > Date.now();
  });

  const expiredDeals = deals.filter((d) => {
    const ms = getEndsAtMillis(d);
    return ms && ms <= Date.now();
  });

  return (
    <div className="fd-page">

      {/* ── Header ── */}
      <div className="fd-header">
        <button
          type="button"
          className="fd-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        <div className="fd-header-center">
          <h1 className="fd-header-title">
            <span className="fd-header-bolt">⚡</span> Flash Deals
          </h1>
          {headerCountdown && !headerCountdown.expired ? (
            <p className="fd-header-sub">
              Next deal ends in&nbsp;
              <span className="fd-header-timer">
                {pad(headerCountdown.h)}:{pad(headerCountdown.m)}:{pad(headerCountdown.s)}
              </span>
            </p>
          ) : (
            <p className="fd-header-sub">Limited-time offers — grab them before they're gone</p>
          )}
        </div>

        {/* spacer to balance back button */}
        <div style={{ width: 36 }} />
      </div>

      {/* ── Live badge strip ── */}
      {!loading && activeDeals.length > 0 ? (
        <div className="fd-live-strip">
          <span className="fd-live-dot" />
          <span className="fd-live-text">{activeDeals.length} active deal{activeDeals.length !== 1 ? "s" : ""} live now</span>
        </div>
      ) : null}

      {/* ── Body ── */}
      {loading ? (
        <div className="fd-loading">
          <div className="fd-loading-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="fd-skeleton">
                <div className="fd-skeleton-img" />
                <div className="fd-skeleton-info">
                  <div className="fd-skeleton-line fd-skeleton-line--wide" />
                  <div className="fd-skeleton-line" />
                  <div className="fd-skeleton-line fd-skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="fd-error">
          <p>{error}</p>
          <button
            type="button"
            className="fd-retry-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : deals.length === 0 ? (
        <div className="fd-empty">
          <span className="fd-empty-icon">⚡</span>
          <h3 className="fd-empty-title">No flash deals right now</h3>
          <p className="fd-empty-sub">Check back soon — new deals drop regularly.</p>
          <button
            type="button"
            className="fd-empty-btn"
            onClick={() => navigate("/shop")}
          >
            Browse shop
          </button>
        </div>
      ) : (
        <div className="fd-content">
          {/* Active deals */}
          {activeDeals.length > 0 ? (
            <section className="fd-section">
              <div className="fd-deals-grid">
                {activeDeals.map((deal) => (
                  <FlashDealCard
                    key={deal.id}
                    deal={deal}
                    onClick={() => handleDealClick(deal)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* Expired deals */}
          {expiredDeals.length > 0 ? (
            <section className="fd-section fd-section--expired">
              <div className="fd-section-header">
                <h2 className="fd-section-title">Recently expired</h2>
              </div>
              <div className="fd-deals-grid">
                {expiredDeals.map((deal) => (
                  <FlashDealCard
                    key={deal.id}
                    deal={deal}
                    onClick={() => handleDealClick(deal)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}