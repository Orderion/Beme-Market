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

// ✅ Must match your Firestore structure: products / orders / users
const COLLECTION_NAME = "products";

function normalizeFilter(filter) {
  // Accepts:
  // - null
  // - string (legacy)
  // - { dept, kind } (new)
  if (!filter) return { dept: null, kind: null };

  if (typeof filter === "string") {
    // Legacy support: treat string as dept (best-effort)
    return { dept: filter.toLowerCase(), kind: null };
  }

  const dept = filter?.dept ? String(filter.dept).toLowerCase() : null;
  const kind = filter?.kind ? String(filter.kind).toLowerCase() : null;

  return { dept, kind };
}

export default function ProductGrid({ filter = null, sortBy = "new", withCount = false }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const { dept, kind } = useMemo(() => normalizeFilter(filter), [filter]);

  useEffect(() => {
    let alive = true;

    async function fetchProducts() {
      setLoading(true);
      setErr("");

      try {
        const colRef = collection(db, COLLECTION_NAME);

        const clauses = [];

        // ✅ Filters (server-side)
        if (dept) clauses.push(where("dept", "==", dept));
        if (kind) clauses.push(where("kind", "==", kind));

        // ✅ Sort (server-side)
        // Note: Firestore may require composite indexes when mixing where+orderBy.
        if (sortBy === "price") {
          clauses.push(orderBy("price", "asc"));
        } else {
          clauses.push(orderBy("createdAt", "desc"));
        }

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

        // Firestore index errors are common once you add where+orderBy:
        // "FAILED_PRECONDITION: The query requires an index..."
        const msg =
          typeof e?.message === "string" && e.message.includes("requires an index")
            ? "This filter needs a Firestore index. Open the console link in the error log to create it."
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
  }, [dept, kind, sortBy]);

  // Count-only mode (header)
  if (withCount) {
    if (loading) return <>...</>;
    if (err) return <>0 items</>;
    return <>{products.length} items</>;
  }

  if (loading) return <div className="product-grid">Loading...</div>;

  if (err) {
    return <div className="product-grid">{err}</div>;
  }

  if (!products.length) {
    return <div className="product-grid">No products found.</div>;
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}