/**
 * FlashDealsBanner.jsx
 * ─────────────────────────────────────────────────────────────
 * Homepage horizontal flash deals strip.
 *
 * DATA SOURCES (merged):
 *   1. FlashDeals/{id}   → admin-managed (you, via HomepageAdmin)
 *   2. flashSales/{id}   → seller-managed (created in FlashSalePanel)
 *      Each flashSale links to productIds[] in Products/{id}
 *
 * RANKING ALGORITHM (higher score = shown first):
 *   • Admin deals always pin to top (score = 10000 + order)
 *   • Seller deals scored by:
 *       planScore   — Pro=40, Growth=30, Starter=20, Basic=0
 *       boostScore  — active boost in boosts collection → +50
 *       urgency     — ends in <2h → +30, <6h → +20, <24h → +10
 *       freshness   — created in last 24h → +15
 *       engagement  — clickCount from productAnalytics → up to +20
 *
 * CLICK BEHAVIOUR:
 *   • Admin deal with productId → /product/:productId
 *   • Seller flashSale → /product/:productId (first product in sale)
 *   • No fallback to /flash-deals (that page is being deleted)
 *
 * TRACKING:
 *   • Each card click increments productAnalytics/{productId}.flashClickCount
 *     via a lightweight fire-and-forget update (never blocks navigation)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, getDocs, query, where, orderBy,
  updateDoc, doc, increment, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import "./FlashDealsBanner.css";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const PLAN_SCORE = { pro: 40, growth: 30, standard: 30, starter: 20, basic: 0, free: 0 };

// Pastel ticket colors — varied, non-consecutive assignment
const TICKET_COLORS = [
  "#DBEAFE", "#DCFCE7", "#FEF9C3", "#FCE7F3",
  "#EDE9FE", "#CCFBF1", "#FEF3C7", "#FEE2E2",
  "#E0F2FE", "#F0FDF4",
];

function assignColor(index, prevColor) {
  const available = TICKET_COLORS.filter((c) => c !== prevColor);
  return available[index % available.length];
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function toMs(ts) {
  if (!ts) return null;
  if (ts?.toMillis) return ts.toMillis();
  if (ts?.seconds) return ts.seconds * 1000;
  return Number(ts) || null;
}

function countdown(endMs) {
  if (!endMs) return null;
  const diff = endMs - Date.now();
  if (diff <= 0) return { expired: true, h: 0, m: 0, s: 0 };
  return {
    expired: false,
    h: Math.floor(diff / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
  };
}

function pad(n) { return String(n).padStart(2, "0"); }
function fmtMoney(v) { return `GHS ${Number(v || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function urgencyScore(endMs) {
  if (!endMs) return 0;
  const diff = endMs - Date.now();
  if (diff <= 0) return -999; // expired — will be filtered
  if (diff < 2 * 3_600_000)  return 30;
  if (diff < 6 * 3_600_000)  return 20;
  if (diff < 24 * 3_600_000) return 10;
  return 0;
}

function freshnessScore(createdMs) {
  if (!createdMs) return 0;
  return (Date.now() - createdMs) < 24 * 3_600_000 ? 15 : 0;
}

// Fire-and-forget click tracking — never blocks navigation
function trackClick(productId) {
  if (!productId) return;
  updateDoc(doc(db, "productAnalytics", productId), {
    flashClickCount: increment(1),
    lastFlashClick:  Timestamp.now(),
  }).catch(() => {}); // silently swallow — collection may not exist yet
}

// ─────────────────────────────────────────────────────────────
// DATA FETCHING
// ─────────────────────────────────────────────────────────────

/**
 * Normalise an admin FlashDeals document into a unified deal shape.
 */
function normaliseAdminDeal(snap, order) {
  const d = snap.data() || {};
  return {
    id:            snap.id,
    source:        "admin",
    score:         10_000 + (d.order ?? order),   // always pins first
    title:         String(d.title || "").trim(),
    description:   String(d.description || d.subtitle || "").trim(),
    image:         String(d.image || d.mediaUrl || "").trim(),
    dealPrice:     Number(d.dealPrice || 0),
    originalPrice: Number(d.originalPrice || 0),
    discountPct:   Number(d.discountPercent || 0),
    productId:     String(d.productId || "").trim(),
    endsAtMs:      toMs(d.endsAt),
    stock:         Number(d.stock || 0),
    shopName:      "",
  };
}

/**
 * Fetch seller flashSales that are active and not expired,
 * then resolve their first productId into a deal shape.
 */
async function fetchSellerDeals(boostSet, analyticsMap) {
  const now = Timestamp.now();

  let snap;
  try {
    snap = await getDocs(
      query(
        collection(db, "flashSales"),
        where("status", "==", "active"),
        where("endAt", ">", now),
        orderBy("endAt", "asc")
      )
    );
  } catch {
    // Fallback without compound query if index not built yet
    snap = await getDocs(
      query(collection(db, "flashSales"), where("status", "==", "active"))
    );
  }

  const deals = [];

  for (const saleSnap of snap.docs) {
    const sale = saleSnap.data();
    const endMs = toMs(sale.endAt);
    if (!endMs || endMs <= Date.now()) continue;

    const productIds = Array.isArray(sale.productIds) ? sale.productIds : [];
    if (!productIds.length) continue;

    const productId = productIds[0];

    // Resolve product doc for image/price/name
    let productData = {};
    try {
      const { getDoc } = await import("firebase/firestore");
      const pSnap = await getDoc(doc(db, "Products", productId));
      if (pSnap.exists()) productData = pSnap.data();
      else continue; // skip if product deleted
    } catch { continue; }

    const price     = Number(productData.price || 0);
    const oldPrice  = Number(productData.oldPrice || productData.compareAtPrice || 0);
    const discount  = sale.discountType === "pct"
      ? Number(sale.discountValue || 0)
      : oldPrice > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
    const dealPrice = sale.discountType === "pct"
      ? price * (1 - Number(sale.discountValue || 0) / 100)
      : price - Number(sale.discountValue || 0);

    const planRaw   = String(productData.sellerPlan || "basic").toLowerCase();
    const plan      = PLAN_SCORE[planRaw] ?? 0;
    const boostBump = boostSet.has(productId) ? 50 : 0;
    const clicks    = analyticsMap.get(productId) || 0;
    const engScore  = Math.min(clicks / 5, 20); // cap at 20pts
    const createdMs = toMs(sale.createdAt);

    const score = plan + boostBump + urgencyScore(endMs) + freshnessScore(createdMs) + engScore;

    // Derive image
    const images = Array.isArray(productData.images) ? productData.images : [];
    const image  = images[0] || productData.imageUrl || productData.image || "";

    deals.push({
      id:            saleSnap.id,
      source:        "seller",
      score,
      title:         productData.name || sale.title || "Deal",
      description:   productData.description || "",
      image,
      dealPrice:     Math.max(0, dealPrice),
      originalPrice: price,
      discountPct:   discount,
      productId,
      endsAtMs:      endMs,
      stock:         Number(productData.stock || 0),
      shopName:      String(productData.shopName || "").trim(),
      saleId:        saleSnap.id,
    });
  }

  return deals;
}

/**
 * Fetch active boosts and analytics in parallel for scoring.
 */
async function fetchScoringData() {
  const [boostSnap, analyticsSnap] = await Promise.allSettled([
    getDocs(query(
      collection(db, "boosts"),
      where("status", "==", "active"),
      where("expiresAt", ">", Timestamp.now())
    )),
    getDocs(collection(db, "productAnalytics")),
  ]);

  const boostSet = new Set();
  if (boostSnap.status === "fulfilled") {
    boostSnap.value.docs.forEach((d) => {
      if (d.data().productId) boostSet.add(d.data().productId);
    });
  }

  const analyticsMap = new Map();
  if (analyticsSnap.status === "fulfilled") {
    analyticsSnap.value.docs.forEach((d) => {
      analyticsMap.set(d.id, Number(d.data().flashClickCount || 0));
    });
  }

  return { boostSet, analyticsMap };
}

// ─────────────────────────────────────────────────────────────
// DEAL CARD
// ─────────────────────────────────────────────────────────────

function DealCard({ deal, color, onClick }) {
  const [cd, setCd] = useState(() => countdown(deal.endsAtMs));

  useEffect(() => {
    if (!deal.endsAtMs) return;
    const t = setInterval(() => setCd(countdown(deal.endsAtMs)), 1_000);
    return () => clearInterval(t);
  }, [deal.endsAtMs]);

  const expired  = !cd || cd.expired;
  const lowStock = deal.stock > 0 && deal.stock <= 10;
  const discount = deal.discountPct;

  return (
    <button
      type="button"
      className={`fdb-card${expired ? " fdb-card--expired" : ""}`}
      style={{ "--fdb-color": color }}
      onClick={onClick}
      aria-label={deal.title}
    >
      {/* Image */}
      <div className="fdb-card-img-wrap">
        {deal.image
          ? <img src={deal.image} alt={deal.title} className="fdb-card-img" loading="lazy" />
          : (
            <div className="fdb-card-img-empty">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
          )
        }
        {discount > 0 && !expired && (
          <span className="fdb-discount-pill">-{discount}%</span>
        )}
        {expired && (
          <div className="fdb-expired-overlay"><span>Ended</span></div>
        )}
      </div>

      {/* Info */}
      <div className="fdb-card-info">
        <div className="fdb-card-name-row">
          <p className="fdb-card-name">{deal.title}</p>
          {lowStock && !expired && (
            <span className="fdb-stock-badge">{deal.stock} left</span>
          )}
        </div>

        {deal.shopName && (
          <p className="fdb-card-shop">{deal.shopName}</p>
        )}

        {!expired && cd && (
          <div className="fdb-timer">
            <span className="fdb-timer-dot" />
            <span className="fdb-timer-text">
              {cd.h > 0 && `${pad(cd.h)}:`}{pad(cd.m)}:{pad(cd.s)}
            </span>
          </div>
        )}

        <div className="fdb-card-bottom">
          <p className="fdb-price">{fmtMoney(deal.dealPrice)}</p>
          {deal.originalPrice > deal.dealPrice && (
            <p className="fdb-original-price">{fmtMoney(deal.originalPrice)}</p>
          )}
        </div>

        <div className="fdb-card-cta">
          {expired ? "Ended" : "Shop now →"}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="fdb-skeleton-card">
      <div className="fdb-skeleton-img" />
      <div className="fdb-skeleton-body">
        <div className="fdb-skeleton-line" />
        <div className="fdb-skeleton-line fdb-skeleton-line--short" />
        <div className="fdb-skeleton-line fdb-skeleton-line--med" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AUTO-SCROLL HOOK
// ─────────────────────────────────────────────────────────────

function useAutoScroll(ref, paused) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame;
    let speed = 0.6; // px per frame

    const scroll = () => {
      if (!paused.current) {
        el.scrollLeft += speed;
        // When we've scrolled more than half, reset to 0 for seamless loop
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      frame = requestAnimationFrame(scroll);
    };

    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [ref, paused]);
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────

export default function FlashDealsBanner() {
  const navigate = useNavigate();
  const [deals,   setDeals]   = useState([]);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef(null);
  const paused    = useRef(false);   // mutable ref — no re-render on pause

  useAutoScroll(scrollRef, paused);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const { boostSet, analyticsMap } = await fetchScoringData();

        const [adminSnap, sellerDeals] = await Promise.all([
          getDocs(query(collection(db, "FlashDeals"), orderBy("order", "asc"))).catch(() =>
            getDocs(collection(db, "FlashDeals"))
          ),
          fetchSellerDeals(boostSet, analyticsMap),
        ]);

        if (!alive) return;

        const adminDeals = adminSnap.docs.map((s, i) => normaliseAdminDeal(s, i));

        // Merge, filter expired, sort by score descending
        const all = [...adminDeals, ...sellerDeals]
          .filter((d) => !d.endsAtMs || d.endsAtMs > Date.now())
          .sort((a, b) => b.score - a.score);

        setDeals(all);
      } catch (err) {
        console.error("[FlashDealsBanner] load error:", err);
        setDeals([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  // Assign colors — no two adjacent cards same color
  const colorMap = useMemo(() => {
    const map = {};
    let prev = "";
    deals.forEach((d, i) => {
      const c = assignColor(i, prev);
      map[d.id] = c;
      prev = c;
    });
    return map;
  }, [deals]);

  if (!loading && deals.length === 0) return null;

  const handleClick = (deal) => {
    trackClick(deal.productId);
    if (deal.productId) {
      navigate(`/product/${deal.productId}`);
    }
    // No fallback to /flash-deals — if no productId, do nothing
  };

  // Duplicate deals for seamless infinite scroll loop
  const displayDeals = deals.length > 0 ? [...deals, ...deals] : deals;

  return (
    <section className="fdb-section">
      {/* Header */}
      <div className="fdb-header">
        <div className="fdb-header-left">
          <svg className="fdb-bolt-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/>
          </svg>
          <h3 className="fdb-title">Flash Deals</h3>
          <span className="fdb-live-badge">LIVE</span>
        </div>
        <span className="fdb-deal-count">
          {loading ? "" : `${deals.length} deal${deals.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Scroll strip */}
      {loading ? (
        <div className="fdb-scroll fdb-scroll--static">
          {["a","b","c"].map((k) => <SkeletonCard key={k} />)}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="fdb-scroll"
          onMouseEnter={() => { paused.current = true;  }}
          onMouseLeave={() => { paused.current = false; }}
          onTouchStart={()  => { paused.current = true;  }}
          onTouchEnd={()    => { paused.current = false; }}
        >
          {displayDeals.map((deal, i) => (
            <DealCard
              key={`${deal.id}-${i}`}
              deal={deal}
              color={colorMap[deal.id] || TICKET_COLORS[0]}
              onClick={() => handleClick(deal)}
            />
          ))}
        </div>
      )}
    </section>
  );
}