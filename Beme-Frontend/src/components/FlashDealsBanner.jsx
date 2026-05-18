import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import "./FlashDealsBanner.css";

const FLASH_COLLECTION = "FlashDeals";
const TICKET_SHAPES = ["notch", "rounded", "perforated", "stub"];

/* Pastel ticket colors — varied, not aggressive */
const TICKET_COLORS = [
  "#DBEAFE", // blue-100
  "#DCFCE7", // green-100
  "#FEF9C3", // yellow-100 (muted)
  "#FCE7F3", // pink-100
  "#EDE9FE", // purple-100
  "#CCFBF1", // teal-100
  "#FEF3C7", // amber-100
  "#FEE2E2", // red-100
  "#E0F2FE", // sky-100
  "#F0FDF4", // emerald-100
];

/**
 * Assign non-consecutive colors AND shapes per deal.
 * Prevents the same color or shape appearing back-to-back.
 */
function assignStyles(deals) {
  const styles = [];
  deals.forEach((deal, i) => {
    let hash = 0;
    for (let j = 0; j < deal.id.length; j++) {
      hash = (hash * 31 + deal.id.charCodeAt(j)) >>> 0;
    }
    // Exclude last 2 colors and last shape from candidates
    const usedColors = new Set([styles[i-1]?.color, styles[i-2]?.color].filter(Boolean));
    const usedShape  = styles[i-1]?.shape;
    const availColors  = TICKET_COLORS.filter(c => !usedColors.has(c));
    const availShapes  = TICKET_SHAPES.filter(s => s !== usedShape);
    styles.push({
      color: availColors[hash % availColors.length],
      shape: availShapes[(hash >> 2) % availShapes.length],
    });
  });
  return styles;
}

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
    endsAt: d.endsAt || null,
    stock: Number(d.stock || 0),
  };
}

function formatMoney(v) { return `GHS ${Number(v||0).toFixed(2)}`; }
function getEndsAtMs(d) { if (!d.endsAt) return null; return d.endsAt?.toMillis ? d.endsAt.toMillis() : Number(d.endsAt); }
function countdown(ms) {
  if (!ms) return null;
  const diff = ms - Date.now();
  if (diff <= 0) return { expired: true, h:0, m:0, s:0 };
  return { expired:false, h:Math.floor(diff/3600000), m:Math.floor((diff%3600000)/60000), s:Math.floor((diff%60000)/1000) };
}
function pad(n) { return String(n).padStart(2,"0"); }

/* ── Ticket card ── */
function TicketCard({ deal, style, onClick }) {
  const [cd, setCd] = useState(() => countdown(getEndsAtMs(deal)));
  useEffect(() => {
    const ms = getEndsAtMs(deal);
    if (!ms) return;
    const t = setInterval(() => setCd(countdown(ms)), 1000);
    return () => clearInterval(t);
  }, [deal]);

  const expired = !cd || cd.expired;
  const discount = deal.discountPercent
    ? deal.discountPercent
    : deal.originalPrice > deal.dealPrice
    ? Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100) : 0;
  const lowStock = deal.stock > 0 && deal.stock <= 15;

  return (
    <button
      type="button"
      className={`fdb-ticket fdb-ticket--${style.shape}${expired ? " fdb-ticket--expired" : ""}`}
      onClick={onClick}
      aria-label={deal.title}
    >
      <div className="fdb-ticket-body" style={{ "--tc": style.color }}>
        {style.shape === "stub" && <div className="fdb-ticket-stub-line"/>}

        {/* Image */}
        <div className="fdb-card-img-wrap">
          {deal.image ? (
            <img src={deal.image} alt={deal.title} className="fdb-card-img"/>
          ) : (
            <div className="fdb-card-img-empty">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
          )}
          {discount > 0 && !expired && <span className="fdb-discount-pill">-{discount}%</span>}
          {expired && <div className="fdb-expired-overlay"><span>Expired</span></div>}
        </div>

        {/* Info */}
        <div className="fdb-card-info">
          <div className="fdb-card-top-row">
            <p className="fdb-card-name">{deal.title}</p>
            {lowStock && !expired && <span className="fdb-stock-badge">{deal.stock} left</span>}
          </div>
          {deal.description ? <p className="fdb-card-desc">{deal.description}</p> : null}
          {!expired && cd ? (
            <div className="fdb-timer">
              <span className="fdb-timer-dot"/>
              <span className="fdb-timer-text">{pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}</span>
            </div>
          ) : null}
          <p className="fdb-price">{formatMoney(deal.dealPrice)}</p>
        </div>
      </div>
    </button>
  );
}

/* ── Main export ── */
export default function FlashDealsBanner() {
  const navigate = useNavigate();
  const [deals,   setDeals]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, FLASH_COLLECTION), orderBy("order","asc")));
        if (!alive) return;
        setDeals(snap.docs.map(normalizeFlashDeal).sort((a,b)=>a.order-b.order));
      } catch {
        try {
          const fb = await getDocs(collection(db, FLASH_COLLECTION));
          if (!alive) return;
          setDeals(fb.docs.map(normalizeFlashDeal).sort((a,b)=>a.order-b.order));
        } catch(e) { console.error(e); }
      } finally { if (alive) setLoading(false); }
    }
    load();
    return () => { alive = false; };
  }, []);

  const styles = useMemo(() => assignStyles(deals), [deals]);

  if (!loading && deals.length === 0) return null;

  const handleClick = (deal) => {
    if (deal.productId)    navigate(`/product/${deal.productId}`);
    else if (deal.shopKey) navigate(`/shop?shop=${encodeURIComponent(deal.shopKey)}`);
    else                   navigate("/flash-deals");
  };

  return (
    <section className="fdb-section">
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

      {loading ? (
        <div className="fdb-scroll">
          {["notch","rounded","perforated"].map(shape => (
            <div key={shape} className={`fdb-skeleton-card fdb-ticket--${shape}`}>
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
            <TicketCard key={deal.id} deal={deal} style={styles[idx]} onClick={() => handleClick(deal)}/>
          ))}
          <button type="button" className="fdb-view-all-card" onClick={() => navigate("/flash-deals")} aria-label="View all flash deals">
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