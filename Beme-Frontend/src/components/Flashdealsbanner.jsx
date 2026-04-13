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
  };
}

function formatMoney(value) {
  return `GHS ${Number(value || 0).toFixed(2)}`;
}

function getEndsAtMillis(deal) {
  if (!deal.endsAt) return null;
  if (deal.endsAt?.toMillis) return deal.endsAt.toMillis();
  return Number(deal.endsAt);
}

function computeCountdown(endsAtMs) {
  if (!endsAtMs) return null;
  const diff = endsAtMs - Date.now();
  if (diff <= 0) return { expired: true, h: 0, m: 0, s: 0 };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { expired: false, h, m, s };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

/* ── Mini card for the homepage banner strip ── */
function BannerCard({ deal, onClick }) {
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
      className={`fdb-card ${isExpired ? "fdb-card--expired" : ""}`}
      onClick={onClick}
      aria-label={deal.title}
    >
      {/* Image */}
      <div className="fdb-card-img-wrap">
        {deal.image ? (
          <img src={deal.image} alt={deal.title} className="fdb-card-img" />
        ) : (
          <div className="fdb-card-img-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}

        {/* Discount pill */}
        {discount > 0 && !isExpired ? (
          <span className="fdb-discount-pill">-{discount}%</span>
        ) : null}

        {isExpired ? (
          <div className="fdb-expired-overlay"><span>Expired</span></div>
        ) : null}
      </div>

      {/* Dark info bottom */}
      <div className="fdb-card-info">
        <p className="fdb-card-name">{deal.title}</p>

        {!isExpired && countdown ? (
          <div className="fdb-timer">
            <span className="fdb-timer-dot" />
            <span className="fdb-timer-text">
              {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
            </span>
          </div>
        ) : null}

        <span className="fdb-price">{formatMoney(deal.dealPrice)}</span>
      </div>
    </button>
  );
}

export default function FlashDealsBanner() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const snap = await getDocs(
          query(collection(db, FLASH_COLLECTION), orderBy("order", "asc"))
        );
        if (!alive) return;
        const rows = snap.docs.map(normalizeFlashDeal);
        // Show all deals (active + expired) — expired show badge
        setDeals(rows.sort((a, b) => a.order - b.order));
      } catch {
        try {
          const fallback = await getDocs(collection(db, FLASH_COLLECTION));
          if (!alive) return;
          setDeals(
            fallback.docs
              .map(normalizeFlashDeal)
              .sort((a, b) => a.order - b.order)
          );
        } catch (err) {
          console.error("FlashDealsBanner fetch error:", err);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  // Don't render section at all if no deals
  if (!loading && deals.length === 0) return null;

  const handleCardClick = (deal) => {
    if (deal.productId) navigate(`/product/${deal.productId}`);
    else if (deal.shopKey) navigate(`/shop?shop=${encodeURIComponent(deal.shopKey)}`);
    else navigate("/flash-deals");
  };

  return (
    <section className="fdb-section">
      {/* Section header */}
      <div className="fdb-header">
        <div className="fdb-header-left">
          <span className="fdb-bolt">⚡</span>
          <h3 className="fdb-title">Flash Deals</h3>
          <span className="fdb-live-badge">LIVE</span>
        </div>
        <button
          type="button"
          className="fdb-see-all"
          onClick={() => navigate("/flash-deals")}
        >
          See all
        </button>
      </div>

      {/* Horizontal scroll strip */}
      {loading ? (
        <div className="fdb-scroll">
          {[1, 2, 3].map((n) => (
            <div key={n} className="fdb-skeleton-card">
              <div className="fdb-skeleton-img" />
              <div className="fdb-skeleton-body">
                <div className="fdb-skeleton-line" />
                <div className="fdb-skeleton-line fdb-skeleton-line--short" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fdb-scroll">
          {deals.map((deal) => (
            <BannerCard
              key={deal.id}
              deal={deal}
              onClick={() => handleCardClick(deal)}
            />
          ))}

          {/* "View all" tail card */}
          <button
            type="button"
            className="fdb-view-all-card"
            onClick={() => navigate("/flash-deals")}
            aria-label="View all flash deals"
          >
            <span className="fdb-view-all-bolt">⚡</span>
            <span className="fdb-view-all-text">View<br/>all</span>
          </button>
        </div>
      )}
    </section>
  );
}