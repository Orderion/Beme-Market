import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import "./FlashDealsBanner.css";

const FLASH_COLLECTION = "FlashDeals";

/* ── Diverse accent colors — 10 distinct hues, no yellows ── */
const ACCENT_COLORS = [
  "#046EF2", // blue
  "#22C55E", // green
  "#F97316", // orange
  "#8B5CF6", // purple
  "#EF4444", // red
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#10B981", // emerald
  "#F59E0B", // amber
  "#6366F1", // indigo
];

/**
 * Assign accent colors to deals so no two consecutive deals share the same color.
 * Uses a deterministic hash per deal ID but filters out the previous color.
 */
function assignNonConsecutiveColors(deals) {
  const colors = [];
  deals.forEach((deal, i) => {
    let hash = 0;
    for (let j = 0; j < deal.id.length; j++) {
      hash = (hash * 31 + deal.id.charCodeAt(j)) >>> 0;
    }
    // Exclude the previous color AND the one before that to avoid near-repeats
    const excluded = new Set([colors[i - 1], colors[i - 2]].filter(Boolean));
    const available = ACCENT_COLORS.filter(c => !excluded.has(c));
    // Pick from available using hash
    colors.push(available[hash % available.length]);
  });
  return colors;
}

/* ── Data normalizer ── */
function normalizeFlashDeal(docSnap) {
  const d = docSnap.data() || {};
  return {
    id: docSnap.id,
    title: String(d.title || "").trim(),
    description: String(d.description || d.subtitle || "").trim(),
    image: String(d.image || d.mediaUrl || "").trim(),
    dealPrice: Number(d.dealPrice || 0),
    originalPrice: Number(d.originalPrice || 0),
    discountPercent: Number(d.discountPercent || 0),
    productId: String(d.productId || "").trim(),
    shopKey: String(d.shopKey || "").trim(),
    order: Number(d.order || 0),
    durationHours: Number(d.durationHours || 24),
    endsAt: d.endsAt || null,
    stock: Number(d.stock || 0),
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
  if (diff <= 0) return { expired: true, h:0, m:0, s:0 };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { expired: false, h, m, s };
}

function pad(n) { return String(n).padStart(2, "0"); }

/* ════════════════════════════════════════════
   DEAL CARD — clean modern design
════════════════════════════════════════════ */
function DealCard({ deal, accentColor, onClick }) {
  const [countdown, setCountdown] = useState(() =>
    computeCountdown(getEndsAtMillis(deal))
  );

  useEffect(() => {
    const endsAtMs = getEndsAtMillis(deal);
    if (!endsAtMs) return;
    const interval = setInterval(() => setCountdown(computeCountdown(endsAtMs)), 1000);
    return () => clearInterval(interval);
  }, [deal]);

  const isExpired = !countdown || countdown.expired;

  const discount = deal.discountPercent
    ? deal.discountPercent
    : deal.originalPrice > deal.dealPrice
    ? Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100)
    : 0;

  const lowStock = deal.stock > 0 && deal.stock <= 15;

  return (
    <button
      type="button"
      className={`fdb-card${isExpired ? " fdb-card--expired" : ""}`}
      onClick={onClick}
      aria-label={deal.title}
    >
      {/* Colored accent bar at top */}
      <div className="fdb-card-accent" style={{ background: accentColor }}/>

      <div className="fdb-card-body">
        {/* ── Image ── */}
        <div className="fdb-card-img-wrap">
          {deal.image ? (
            <img src={deal.image} alt={deal.title} className="fdb-card-img"/>
          ) : (
            <div className="fdb-card-img-empty">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
          )}
          {discount > 0 && !isExpired && (
            <span className="fdb-discount-pill">-{discount}%</span>
          )}
          {isExpired && (
            <div className="fdb-expired-overlay"><span>Expired</span></div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="fdb-card-info">
          <div className="fdb-card-top-row">
            <p className="fdb-card-name">{deal.title}</p>
            {lowStock && !isExpired && (
              <span className="fdb-stock-badge">{deal.stock} left</span>
            )}
          </div>

          {!isExpired && countdown ? (
            <div className="fdb-timer">
              <span className="fdb-timer-dot"/>
              <span className="fdb-timer-text">
                {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
              </span>
            </div>
          ) : null}

          <p className="fdb-price">{formatMoney(deal.dealPrice)}</p>
        </div>
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════ */
export default function FlashDealsBanner() {
  const navigate = useNavigate();
  const [deals,   setDeals]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const snap = await getDocs(
          query(collection(db, FLASH_COLLECTION), orderBy("order", "asc"))
        );
        if (!alive) return;
        setDeals(snap.docs.map(normalizeFlashDeal).sort((a,b) => a.order-b.order));
      } catch {
        try {
          const fallback = await getDocs(collection(db, FLASH_COLLECTION));
          if (!alive) return;
          setDeals(fallback.docs.map(normalizeFlashDeal).sort((a,b) => a.order-b.order));
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

  /* Non-consecutive color assignment — recomputed when deals change */
  const accentColors = useMemo(() => assignNonConsecutiveColors(deals), [deals]);

  if (!loading && deals.length === 0) return null;

  const handleCardClick = (deal) => {
    if (deal.productId)      navigate(`/product/${deal.productId}`);
    else if (deal.shopKey)   navigate(`/shop?shop=${encodeURIComponent(deal.shopKey)}`);
    else                     navigate("/flash-deals");
  };

  return (
    <section className="fdb-section">

      {/* ── Header ── */}
      <div className="fdb-header">
        <div className="fdb-header-left">
          <svg className="fdb-bolt-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/>
          </svg>
          <h3 className="fdb-title">Flash Deals</h3>
          <span className="fdb-live-badge">LIVE</span>
        </div>
        <button type="button" className="fdb-see-all" onClick={() => navigate("/flash-deals")}>
          See all →
        </button>
      </div>

      {/* ── Cards ── */}
      {loading ? (
        <div className="fdb-scroll">
          {[0,1,2].map(i => (
            <div key={i} className="fdb-skeleton-card">
              <div className="fdb-skeleton-img"/>
              <div className="fdb-skeleton-body">
                <div className="fdb-skeleton-line"/>
                <div className="fdb-skeleton-line fdb-skeleton-line--short"/>
                <div className="fdb-skeleton-line fdb-skeleton-line--med"/>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fdb-scroll">
          {deals.map((deal, idx) => (
            <DealCard
              key={deal.id}
              deal={deal}
              accentColor={accentColors[idx]}
              onClick={() => handleCardClick(deal)}
            />
          ))}

          {/* View all tail */}
          <button
            type="button"
            className="fdb-view-all-card"
            onClick={() => navigate("/flash-deals")}
            aria-label="View all flash deals"
          >
            <svg className="fdb-view-all-bolt" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/>
            </svg>
            <span className="fdb-view-all-text">View all</span>
          </button>
        </div>
      )}
    </section>
  );
}