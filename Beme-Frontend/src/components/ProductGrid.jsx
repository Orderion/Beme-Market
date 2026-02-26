// src/components/ProductGrid.jsx
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import ProductCard from "./ProductCard";
import "./ProductGrid.css";

// ✅ IMPORTANT: Your Firestore screenshot shows collection name "Products" (capital P)
const COLLECTION_NAME = "Products";

function normalizeFilter(filter) {
  if (!filter) {
    return {
      dept: null,
      kind: null,
      priceMin: null,
      priceMax: null,
      inStockOnly: false,
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
    sort: (filter.sort || "new").toLowerCase(),
  };
}

function normalizeDoc(doc) {
  const d = doc.data() || {};

  // tolerate minor schema drift until you standardize your DB
  const price = Number(d.price ?? d.Price ?? 0) || 0;
  const oldPrice =
    d.oldPrice ?? d.oldprice ?? d.OldPrice ?? d.Oldprice ?? null;

  const dept = (d.dept ?? d.Dept ?? null);
  const kind = (d.kind ?? d.Kind ?? null);

  const inStock = Boolean(d.inStock ?? d.stock ?? d.in_stock ?? false);

  return {
    id: doc.id,
    ...d,
    price,
    oldPrice: oldPrice != null ? Number(oldPrice) || oldPrice : null,
    dept: typeof dept === "string" ? dept.toLowerCase() : dept,
    kind: typeof kind === "string" ? kind.toLowerCase() : kind,
    inStock,
  };
}

function clientSort(list, sortKey) {
  const arr = [...list];

  if (sortKey === "price-asc") return arr.sort((a, b) => (a.price || 0) - (b.price || 0));
  if (sortKey === "price-desc") return arr.sort((a, b) => (b.price || 0) - (a.price || 0));

  // default newest
  return arr.sort((a, b) => {
    const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bt - at;
  });
}

export default function ProductGrid({ filter = null, sortBy = "new", withCount = false }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const f = useMemo(() => normalizeFilter(filter), [filter]);

  // stable fetch signature: refetch only when server-relevant filters change
  const signature = useMemo(() => {
    const s = (sortBy || f.sort || "new").toLowerCase();
    return JSON.stringify({
      dept: f.dept,
      kind: f.kind,
      inStockOnly: f.inStockOnly,
      sort: s,
    });
  }, [f.dept, f.kind, f.inStockOnly, f.sort, sortBy]);

  useEffect(() => {
    let alive = true;

    async function fetchProducts() {
      setLoading(true);
      setErr("");

      const colRef = collection(db, COLLECTION_NAME);

      // server filters (safe)
      const wheres = [];
      if (f.dept) wheres.push(where("dept", "==", f.dept));
      if (f.kind) wheres.push(where("kind", "==", f.kind));
      if (f.inStockOnly) wheres.push(where("inStock", "==", true));

      const s = (sortBy || f.sort || "new").toLowerCase();
      const wantsOrder =
        s === "price-asc"
          ? orderBy("price", "asc")
          : s === "price-desc"
          ? orderBy("price", "desc")
          : orderBy("createdAt", "desc");

      // Try ideal query (may need index)
      try {
        const qIdeal = query(colRef, ...wheres, wantsOrder, limit(200));
        const snap = await getDocs(qIdeal);

        if (!alive) return;
        setProducts(snap.docs.map(normalizeDoc));
        setLoading(false);
        return;
      } catch (e) {
        // Missing index or precondition => fallback query without orderBy
        const msg = String(e?.message || e);
        const isIndex =
          msg.toLowerCase().includes("requires an index") ||
          msg.toLowerCase().includes("failed-precondition") ||
          msg.toLowerCase().includes("index");

        try {
          const qFallback = query(colRef, ...wheres, limit(200));
          const snap2 = await getDocs(qFallback);

          if (!alive) return;

          const normalized = snap2.docs.map(normalizeDoc);
          const sorted = clientSort(normalized, s);

          setProducts(sorted);

          // only show error if it's not a common index case
          if (!isIndex) setErr("Failed to load products.");
          setLoading(false);
        } catch (e2) {
          if (!alive) return;
          console.error("❌ Failed to fetch products (fallback):", e2);
          setErr("Failed to load products.");
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      alive = false;
    };
  }, [signature]);

  // Price range filter (client-side, after fetch)
  const finalList = useMemo(() => {
    let list = [...products];

    if (f.priceMin != null) {
      list = list.filter((p) => (Number(p.price) || 0) >= f.priceMin);
    }
    if (f.priceMax != null) {
      list = list.filter((p) => (Number(p.price) || 0) <= f.priceMax);
    }

    return list;
  }, [products, f.priceMin, f.priceMax]);

  if (withCount) {
    if (loading) return <>...</>;
    if (err) return <>0 items</>;
    return <>{finalList.length} items</>;
  }

  if (loading) return <div className="product-grid">Loading...</div>;
  if (err) return <div className="product-grid">{err}</div>;
  if (!finalList.length) return <div className="product-grid">No products found.</div>;

  return (
    <div className="product-grid">
      {finalList.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}