import { useEffect, useState } from "react";
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
    stock: Number(d.stock || 0),
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

/* ── Single horizontal deal card ── */
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
    ? Math.round(
        ((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100
      )
    : 0;

  const lowStock = deal.stock > 0 && deal.stock <= 15;

  return (
    <button
      type="button"
      className={`fd-card ${isExpired ? "fd-card--expired" : ""}`}
      onClick={onClick}
      aria-label={`${deal.title}${discount ? ` — -${discount}%` : ""}`}
    >
      {/* Image side */}
      <div className="fd-card-img-wrap">
        {deal.image ? (
          <img src={deal.image} alt={deal.title} className="fd-card-img" />
        ) : (
          <div className="fd-card-img-empty">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        {/* Wishlist */}
        <button
          type="button"
          className="fd-card-heart"
          onClick={(e) => e.stopPropagation()}
          aria-label="Save to wishlist"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {discount > 0 && !isExpired && (
          <span className="fd-card-discount-badge">-{discount}%</span>
        )}

        {isExpired && (
          <div className="fd-card-expired-overlay">
            <span>Expired</span>
          </div>
        )}
      </div>

      {/* Info side */}
      <div className="fd-card-info">
        <div className="fd-card-top-row">
          <p className="fd-card-title">{deal.title}</p>
          {lowStock && !isExpired && (
            <span className="fd-card-stock-badge">
              Low Stock : {deal.stock}
            </span>
          )}
        </div>

        {!isExpired && countdown && (
          <div className="fd-card-timer">
            <span className="fd-card-timer-dot" />
            <span className="fd-card-timer-text">
              {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
            </span>
          </div>
        )}

        <div className="fd-card-bottom">
          <div className="fd-card-prices">
            <span className="fd-card-price">{formatMoney(deal.dealPrice)}</span>
            {deal.originalPrice > deal.dealPrice && (
              <span className="fd-card-old-price">
                {formatMoney(deal.originalPrice)}
              </span>
            )}
          </div>

          <button
            type="button"
            className="fd-card-cart-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClick && onClick();
            }}
            aria-label="Add to cart"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </button>
        </div>
      </div>
    </button>
  );
}

/* ── Main page ── */
export default function FlashDeals() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [tick, setTick] = useState(0);

  /* Global ticker for hero countdown */
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
    return () => {
      alive = false;
    };
  }, []);

  const handleDealClick = (deal) => {
    if (deal.productId) {
      navigate(`/product/${deal.productId}`);
    } else if (deal.shopKey) {
      navigate(`/shop?shop=${encodeURIComponent(deal.shopKey)}`);
    }
  };

  const activeDeals = deals.filter((d) => {
    const ms = getEndsAtMillis(d);
    return !ms || ms > Date.now();
  });

  const expiredDeals = deals.filter((d) => {
    const ms = getEndsAtMillis(d);
    return ms && ms <= Date.now();
  });

  /* Nearest ending active deal for hero countdown */
  const nearestDeal = activeDeals
    .filter((d) => getEndsAtMillis(d) && getEndsAtMillis(d) > Date.now())
    .sort(
      (a, b) =>
        (getEndsAtMillis(a) || Infinity) - (getEndsAtMillis(b) || Infinity)
    )[0];

  const headerCountdown = nearestDeal
    ? computeCountdown(getEndsAtMillis(nearestDeal))
    : null;

  const visibleDeals =
    filter === "active"
      ? activeDeals
      : filter === "expired"
      ? expiredDeals
      : deals;

  const chips = [
    { key: "all", label: "All deals", sub: `${deals.length} total` },
    { key: "active", label: "Active", sub: `${activeDeals.length} live` },
    { key: "expired", label: "Expired", sub: `${expiredDeals.length} ended` },
  ];

  return (
    <div className="fd-page">
      {/* ── Dark hero ── */}
      <div className="fd-hero">
        <button
          type="button"
          className="fd-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <div className="fd-hero-title-row">
          <svg
            className="fd-hero-bolt"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
          </svg>
          <h1 className="fd-hero-title">Flash Deals</h1>
          <span className="fd-hero-live">LIVE</span>
        </div>

        <p className="fd-hero-sub">
          Limited-time prices — grab them before they're gone.
        </p>

        <div className="fd-hero-stats">
          <div className="fd-stat-box">
            <span className="fd-stat-label">Active deals</span>
            <span className="fd-stat-value fd-stat-value--orange">
              {loading ? "—" : `${activeDeals.length} live`}
            </span>
          </div>
          <div className="fd-stat-box">
            <span className="fd-stat-label">Next ends in</span>
            <span className="fd-stat-value">
              {headerCountdown && !headerCountdown.expired
                ? `${pad(headerCountdown.h)}:${pad(headerCountdown.m)}:${pad(
                    headerCountdown.s
                  )}`
                : loading
                ? "—"
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Live strip ── */}
      {!loading && activeDeals.length > 0 && (
        <div className="fd-live-strip">
          <span className="fd-live-dot" />
          <span className="fd-live-text">
            {activeDeals.length} active deal
            {activeDeals.length !== 1 ? "s" : ""} live now
          </span>
        </div>
      )}

      {/* ── Filter chips ── */}
      <div className="fd-chips-row">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className={`fd-chip ${filter === chip.key ? "fd-chip--active" : ""}`}
            onClick={() => setFilter(chip.key)}
          >
            <span className="fd-chip-label">{chip.label}</span>
            <span className="fd-chip-sub">{chip.sub}</span>
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div className="fd-skeleton-list">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="fd-skeleton-card">
              <div className="fd-skeleton-img" />
              <div className="fd-skeleton-body">
                <div className="fd-skeleton-line fd-skeleton-line--wide" />
                <div className="fd-skeleton-line" />
                <div className="fd-skeleton-line fd-skeleton-line--short" />
              </div>
            </div>
          ))}
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
      ) : visibleDeals.length === 0 ? (
        <div className="fd-empty">
          <svg
            className="fd-empty-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
          </svg>
          <h3 className="fd-empty-title">
            {filter === "expired"
              ? "No expired deals"
              : filter === "active"
              ? "No active deals right now"
              : "No flash deals right now"}
          </h3>
          <p className="fd-empty-sub">
            {filter === "expired"
              ? "Expired deals will appear here."
              : "Check back soon — new deals drop regularly."}
          </p>
          {filter !== "active" && (
            <button
              type="button"
              className="fd-empty-btn"
              onClick={() => navigate("/shop")}
            >
              Browse shop
            </button>
          )}
        </div>
      ) : (
        <div className="fd-deals-list">
          {visibleDeals.map((deal) => (
            <FlashDealCard
              key={deal.id}
              deal={deal}
              onClick={() => handleDealClick(deal)}
            />
          ))}
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div className="fd-bottom-bar">
        <button
          type="button"
          className="fd-bottom-ghost"
          onClick={() => navigate(-1)}
        >
          Browse shop
        </button>
        <button
          type="button"
          className="fd-bottom-solid"
          onClick={() => navigate("/shop")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: 6 }}
          >
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          View all deals
        </button>
      </div>
    </div>
  );
}