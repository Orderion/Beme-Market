// FULL PRODUCTION VERSION (BEME MARKET SAFE)

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
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

/* ---------------- CONFIG ---------------- */

const COLLECTION = "Products";
const PAGE_SIZE = 24;
const MAX_PAGES = 8;

/* ---------------- HELPERS ---------------- */

function normalizeFilter(f) {
  return {
    dept: f?.dept || null,
    kind: f?.kind || null,
    shop: f?.shop || null,
    slot: f?.slot || null,
    q: (f?.q || "").toLowerCase().trim(),
    priceMin: f?.priceMin ?? null,
    priceMax: f?.priceMax ?? null,
    inStockOnly: !!f?.inStockOnly,
    featuredOnly: !!f?.featuredOnly,
    sort: (f?.sort || "new").toLowerCase(),
  };
}

function normalizeDoc(doc) {
  const d = doc.data() || {};

  return {
    id: doc.id,
    ...d,
    price: Number(d.price || 0),
    shop: (d.shop || "main").toLowerCase(),
    dept: d.dept?.toLowerCase() || null,
    kind: d.kind?.toLowerCase() || null,
    homeSlot: (d.homeSlot || "others").toLowerCase(),
    featured: !!d.featured,
    inStock: d.inStock !== false,
    createdAt: d.createdAt || null,
  };
}

function getTime(p) {
  return p?.createdAt?.seconds
    ? p.createdAt.seconds * 1000
    : 0;
}

function sortList(list, sort) {
  if (sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
  return [...list].sort((a, b) => getTime(b) - getTime(a));
}

/* ---------------- COMPONENT ---------------- */

export default function ProductGrid({
  filter,
  sortBy,
  withCount = false,
  infinite = true,
}) {
  const [products, setProducts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef(null);

  const f = useMemo(() => normalizeFilter(filter), [filter]);
  const sortKey = (sortBy || f.sort || "new").toLowerCase();

  /* ---------------- QUERY ---------------- */

  const baseQuery = useMemo(() => {
    const col = collection(db, COLLECTION);
    const conditions = [];

    if (f.dept) conditions.push(where("dept", "==", f.dept));
    if (f.kind) conditions.push(where("kind", "==", f.kind));

    // ✅ FIX: ALL STORES SUPPORT
    if (f.shop !== null) {
      conditions.push(where("shop", "==", f.shop));
    }

    if (f.inStockOnly) {
      conditions.push(where("inStock", "==", true));
    }

    return query(
      col,
      ...conditions,
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
  }, [f.dept, f.kind, f.shop, f.inStockOnly]);

  /* ---------------- FETCH FIRST ---------------- */

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);

      const snap = await getDocs(baseQuery);
      if (!active) return;

      const data = snap.docs.map(normalizeDoc);

      setProducts(data);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    }

    run();
    return () => (active = false);
  }, [baseQuery]);

  /* ---------------- LOAD MORE ---------------- */

  const loadMore = async () => {
    if (!hasMore || loadingMore || !lastDoc) return;

    setLoadingMore(true);

    const snap = await getDocs(
      query(baseQuery, startAfter(lastDoc))
    );

    const data = snap.docs.map(normalizeDoc);

    setProducts((prev) => [...prev, ...data]);
    setLastDoc(snap.docs[snap.docs.length - 1] || lastDoc);
    setHasMore(snap.docs.length === PAGE_SIZE);

    setLoadingMore(false);
  };

  /* ---------------- SCROLL ---------------- */

  useEffect(() => {
    if (!infinite) return;

    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [lastDoc, hasMore]);

  /* ---------------- FINAL FILTER ---------------- */

  const finalList = useMemo(() => {
    let list = [...products];

    if (f.slot) {
      list = list.filter((p) => p.homeSlot === f.slot);
    }

    if (f.featuredOnly) {
      list = list.filter((p) => p.featured);
    }

    if (f.priceMin != null) {
      list = list.filter((p) => p.price >= f.priceMin);
    }

    if (f.priceMax != null) {
      list = list.filter((p) => p.price <= f.priceMax);
    }

    if (f.q) {
      list = list.filter((p) =>
        (p.name || "").toLowerCase().includes(f.q)
      );
    }

    return sortList(list, sortKey);
  }, [products, f, sortKey]);

  /* ---------------- COUNT ---------------- */

  if (withCount) {
    return <>{finalList.length} items</>;
  }

  /* ---------------- UI ---------------- */

  if (loading) return <div className="product-grid">Loading...</div>;

  if (!finalList.length) {
    return <div className="product-grid-empty">No products found</div>;
  }

  return (
    <>
      <div className="product-grid">
        {finalList.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <div className="product-grid-footer">
        {hasMore && (
          <button onClick={loadMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        )}
        <div ref={sentinelRef} />
      </div>
    </>
  );
}