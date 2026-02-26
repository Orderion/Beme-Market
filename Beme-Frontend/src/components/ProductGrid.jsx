// src/components/ProductGrid.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import ProductCard from "./ProductCard";
import "./ProductGrid.css";

// ✅ Must match your Firestore collection name (capital P)
const COLLECTION_NAME = "Products";

// Tune for your UI
const PAGE_SIZE = 24;
const MAX_PAGES = 8; // prevents runaway reads (24*8 = 192 items max session)

function normalizeFilter(filter) {
  if (!filter) {
    return {
      dept: null,
      kind: null,
      priceMin: null,
      priceMax: null,
      inStockOnly: false,
      featuredOnly: false, // ✅ new
      sort: "new",
    };
  }

  if (typeof filter === "string") {
    return {
      dept: filter.toLowerCase(),
      kind: null,
      priceMin: null,
      priceMax: null,
      inStockOnly: false,
      featuredOnly: false,
      sort: "new",
    };
  }

  return {
    dept: filter.dept ? String(filter.dept).toLowerCase() : null,
    kind: filter.kind ? String(filter.kind).toLowerCase() : null,
    priceMin:
      filter.priceMin != null && !Number.isNaN(Number(filter.priceMin))
        ? Number(filter.priceMin)
        : null,
    priceMax:
      filter.priceMax != null && !Number.isNaN(Number(filter.priceMax))
        ? Number(filter.priceMax)
        : null,
    inStockOnly: !!filter.inStockOnly,
    featuredOnly: !!filter.featuredOnly, // ✅ new
    sort: (filter.sort || "new").toLowerCase(),
  };
}

function normalizeDoc(doc) {
  const d = doc.data() || {};

  // tolerate schema drift until you standardize DB
  const price = Number(d.price ?? d.Price ?? 0) || 0;
  const oldPrice = d.oldPrice ?? d.oldprice ?? null;

  const dept = d.dept ?? d.Dept ?? null;
  const kind = d.kind ?? d.Kind ?? null;

  const inStock = Boolean(d.inStock ?? d.stock ?? d.in_stock ?? false);

  // ✅ featured support (safe even if missing)
  const featured = Boolean(d.featured ?? d.Featured ?? false);

  return {
    id: doc.id,
    ...d,
    price,
    oldPrice: oldPrice != null ? Number(oldPrice) || oldPrice : null,
    dept: typeof dept === "string" ? dept.toLowerCase() : dept,
    kind: typeof kind === "string" ? kind.toLowerCase() : kind,
    inStock,
    featured,
    createdAt: d.createdAt ?? null,
  };
}

function clientSort(list, sortKey) {
  const arr = [...list];

  if (sortKey === "price-asc") {
    return arr.sort((a, b) => (a.price || 0) - (b.price || 0));
  }
  if (sortKey === "price-desc") {
    return arr.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  // newest
  return arr.sort((a, b) => {
    const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bt - at;
  });
}

function buildOrder(sortKey) {
  if (sortKey === "price-asc") return orderBy("price", "asc");
  if (sortKey === "price-desc") return orderBy("price", "desc");
  return orderBy("createdAt", "desc");
}

function makeSkeleton(n = 8) {
  return Array.from({ length: n }).map((_, i) => ({ id: `sk_${i}` }));
}

export default function ProductGrid({
  filter = null,
  sortBy = "new",
  withCount = false,

  // ✅ pagination controls
  infinite = true, // auto-load when reaching bottom
}) {
  const [products, setProducts] = useState([]);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [lastDoc, setLastDoc] = useState(null);

  const [err, setErr] = useState("");
  const [serverCount, setServerCount] = useState(null);

  const sentinelRef = useRef(null);

  const f = useMemo(() => normalizeFilter(filter), [filter]);

  // IMPORTANT:
  // We keep Firestore where() minimal to avoid index explosion.
  // Price range + featured are client-side filters.
  const sortKey = useMemo(() => (sortBy || f.sort || "new").toLowerCase(), [sortBy, f.sort]);

  const signature = useMemo(() => {
    return JSON.stringify({
      dept: f.dept,
      kind: f.kind,
      inStockOnly: f.inStockOnly,
      sortKey,
      // client-side filters included so UI updates immediately
      priceMin: f.priceMin,
      priceMax: f.priceMax,
      featuredOnly: f.featuredOnly,
    });
  }, [f.dept, f.kind, f.inStockOnly, f.priceMin, f.priceMax, f.featuredOnly, sortKey]);

  const baseQueryParts = useMemo(() => {
    const colRef = collection(db, COLLECTION_NAME);

    const wheres = [];
    if (f.dept) wheres.push(where("dept", "==", f.dept));
    if (f.kind) wheres.push(where("kind", "==", f.kind));
    if (f.inStockOnly) wheres.push(where("inStock", "==", true));

    // server order preference (may require index)
    const ord = buildOrder(sortKey);

    return { colRef, wheres, ord };
  }, [f.dept, f.kind, f.inStockOnly, sortKey]);

  // Firestore count aggregation (best effort)
  useEffect(() => {
    let alive = true;

    async function runCount() {
      // only do count when caller wants it (Shop uses it)
      if (!withCount) return;

      try {
        const { colRef, wheres } = baseQueryParts;

        // Count ignores orderBy; it’s fine, and reduces index friction
        const qCount = query(colRef, ...wheres);
        const snap = await getCountFromServer(qCount);

        if (!alive) return;
        setServerCount(snap.data().count);
      } catch {
        if (!alive) return;
        setServerCount(null);
      }
    }

    runCount();
    return () => {
      alive = false;
    };
  }, [withCount, baseQueryParts, signature]);

  // Initial fetch (and refetch on filters/sort change)
  useEffect(() => {
    let alive = true;

    async function fetchFirst() {
      setErr("");
      setLoadingFirst(true);
      setLoadingMore(false);

      setProducts([]);
      setHasMore(true);
      setPagesLoaded(0);
      setLastDoc(null);

      const { colRef, wheres, ord } = baseQueryParts;

      // ideal query (with orderBy)
      try {
        const qIdeal = query(colRef, ...wheres, ord, limit(PAGE_SIZE));
        const snap = await getDocs(qIdeal);

        if (!alive) return;

        const normalized = snap.docs.map(normalizeDoc);
        setProducts(normalized);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
        setPagesLoaded(1);
        setLoadingFirst(false);
        return;
      } catch (e) {
        // index/failed-precondition -> fallback query w/o orderBy
        try {
          const qFallback = query(colRef, ...wheres, limit(PAGE_SIZE));
          const snap2 = await getDocs(qFallback);

          if (!alive) return;

          const normalized2 = snap2.docs.map(normalizeDoc);
          const sorted = clientSort(normalized2, sortKey);

          setProducts(sorted);
          setLastDoc(snap2.docs[snap2.docs.length - 1] || null);
          setHasMore(snap2.docs.length === PAGE_SIZE);
          setPagesLoaded(1);
          setLoadingFirst(false);
        } catch (e2) {
          if (!alive) return;
          console.error("❌ Failed to fetch products:", e2);
          setErr("Failed to load products.");
          setLoadingFirst(false);
          setHasMore(false);
        }
      }
    }

    fetchFirst();

    return () => {
      alive = false;
    };
  }, [baseQueryParts, sortKey, signature]);

  // Load more
  const loadMore = async () => {
    if (loadingFirst || loadingMore || !hasMore) return;
    if (!lastDoc) return;
    if (pagesLoaded >= MAX_PAGES) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    setErr("");

    const { colRef, wheres, ord } = baseQueryParts;

    try {
      const qMore = query(colRef, ...wheres, ord, startAfter(lastDoc), limit(PAGE_SIZE));
      const snap = await getDocs(qMore);

      const normalized = snap.docs.map(normalizeDoc);

      setProducts((prev) => {
        // de-dupe just in case
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const p of normalized) if (!seen.has(p.id)) merged.push(p);
        return merged;
      });

      setLastDoc(snap.docs[snap.docs.length - 1] || lastDoc);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setPagesLoaded((p) => p + 1);
      setLoadingMore(false);
    } catch {
      // fallback without orderBy (still paginates, then sort client-side)
      try {
        const qMore2 = query(colRef, ...wheres, startAfter(lastDoc), limit(PAGE_SIZE));
        const snap2 = await getDocs(qMore2);
        const normalized2 = snap2.docs.map(normalizeDoc);

        setProducts((prev) => clientSort([...prev, ...normalized2], sortKey));
        setLastDoc(snap2.docs[snap2.docs.length - 1] || lastDoc);
        setHasMore(snap2.docs.length === PAGE_SIZE);
        setPagesLoaded((p) => p + 1);
        setLoadingMore(false);
      } catch (e2) {
        console.error("❌ Failed to load more:", e2);
        setErr("Failed to load more products.");
        setLoadingMore(false);
        setHasMore(false);
      }
    }
  };

  // Infinite scroll (IntersectionObserver)
  useEffect(() => {
    if (!infinite) return;
    if (!sentinelRef.current) return;

    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "800px 0px", threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infinite, sentinelRef.current, hasMore, lastDoc, loadingFirst, loadingMore, pagesLoaded, signature]);

  // Client-side filter (price range + featured)
  const finalList = useMemo(() => {
    let list = [...products];

    if (f.featuredOnly) list = list.filter((p) => !!p.featured);

    if (f.priceMin != null) list = list.filter((p) => (Number(p.price) || 0) >= f.priceMin);
    if (f.priceMax != null) list = list.filter((p) => (Number(p.price) || 0) <= f.priceMax);

    // If we used fallback (no server orderBy), products might already be client-sorted.
    // If we used server orderBy, it’s already sorted. Keep stable.
    return list;
  }, [products, f.priceMin, f.priceMax, f.featuredOnly]);

  // COUNT MODE (Shop.jsx uses this inside span)
  if (withCount) {
    if (loadingFirst) return <>…</>;
    if (err) return <>0 items</>;

    // if server count exists, show it; else show loaded filtered count
    // Note: server count ignores client-side price/featured filters (by design).
    // For full accuracy with price/featured you’d need server-side range/flag queries.
    const base = serverCount != null ? serverCount : finalList.length;

    // If client-side filters are active, show refined count
    const clientFilteredActive = f.priceMin != null || f.priceMax != null || f.featuredOnly;
    if (clientFilteredActive) return <>{finalList.length} items</>;

    return <>{base} items</>;
  }

  // STATES
  if (loadingFirst) {
    return (
      <div className="product-grid">
        {makeSkeleton(8).map((x) => (
          <div key={x.id} className="product-skeleton" aria-hidden="true">
            <div className="product-skeleton-media" />
            <div className="product-skeleton-line" />
            <div className="product-skeleton-line short" />
          </div>
        ))}
      </div>
    );
  }

  if (err) {
    return (
      <div className="product-grid-empty">
        <div className="product-grid-empty-title">Something went wrong</div>
        <div className="product-grid-empty-sub">{err}</div>
        <button className="product-grid-empty-btn" type="button" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </div>
    );
  }

  if (!finalList.length) {
    return (
      <div className="product-grid-empty">
        <div className="product-grid-empty-title">No products found</div>
        <div className="product-grid-empty-sub">
          Try clearing filters or adjusting price range.
        </div>
        <button
          className="product-grid-empty-btn"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Back to filters
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="product-grid">
        {finalList.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Pagination / Infinite */}
      <div className="product-grid-footer">
        {loadingMore ? (
          <div className="product-grid-footer-muted">Loading more…</div>
        ) : hasMore ? (
          <button className="product-grid-loadmore" type="button" onClick={loadMore}>
            Load more
          </button>
        ) : (
          <div className="product-grid-footer-muted">End of results</div>
        )}

        {/* sentinel for infinite mode */}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </>
  );
}