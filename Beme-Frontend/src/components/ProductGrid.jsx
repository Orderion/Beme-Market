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

const COLLECTION_NAME = "products";

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

export default function ProductGrid({ filter = null, sortBy = "new", withCount = false }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const f = useMemo(() => normalizeFilter(filter), [filter]);

  useEffect(() => {
    let alive = true;

    async function fetchProducts() {
      setLoading(true);
      setErr("");

      try {
        const colRef = collection(db, COLLECTION_NAME);

        const clauses = [];

        if (f.dept) clauses.push(where("dept", "==", f.dept));
        if (f.kind) clauses.push(where("kind", "==", f.kind));

        // Stock filter
        if (f.inStockOnly) clauses.push(where("inStock", "==", true));

        // Server-side sort if possible
        // Firestore does NOT support "between" on two fields easily, so we do price range client-side.
        const s = (sortBy || f.sort || "new").toLowerCase();
        if (s === "price-asc") clauses.push(orderBy("price", "asc"));
        else if (s === "price-desc") clauses.push(orderBy("price", "desc"));
        else clauses.push(orderBy("createdAt", "desc"));

        clauses.push(limit(80));

        const q = query(colRef, ...clauses);
        const snap = await getDocs(q);

        const items = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (!alive) return;
        setProducts(items);
      } catch (e) {
        console.error("❌ Failed to fetch products:", e);

        const msg =
          typeof e?.message === "string" && e.message.includes("requires an index")
            ? "This filter needs a Firestore index. Open the link in the console error to create it."
            : "Failed to load products.";

        if (!alive) return;
        setErr(msg);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    fetchProducts();

    return () => {
      alive = false;
    };
  }, [f.dept, f.kind, f.inStockOnly, f.sort, sortBy]);

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