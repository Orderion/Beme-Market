import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import ProductCard from "./ProductCard";
import "./ProductGrid.css";

const COLLECTION_NAME = "Products"; // ✅ must match Firestore exactly

const ProductGrid = ({ filter = null, sortBy = "new", withCount = false }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const fetchProducts = async () => {
      try {
        const colRef = collection(db, COLLECTION_NAME);
        const snap = await getDocs(colRef);

        // ✅ Debug logs (very important right now)
        console.log("✅ Firestore project:", db.app.options.projectId);
        console.log(`✅ Collection "${COLLECTION_NAME}" docs:`, snap.size);

        const items = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (!alive) return;
        setProducts(items);
      } catch (err) {
        console.error("❌ Failed to fetch products:", err);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      alive = false;
    };
  }, []); // ✅ fetch once

  const filtered = useMemo(() => {
    let list = [...products];

    // FILTER
    if (filter) {
      const f = String(filter).toLowerCase();
      list = list.filter((p) =>
        String(p.category || "").toLowerCase().includes(f)
      );
    }

    // SORT
    if (sortBy === "price") {
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else {
      // newest first
      list.sort((a, b) => {
        const ad =
          a.createdAt?.seconds != null
            ? a.createdAt.seconds * 1000
            : new Date(a.createdAt || 0).getTime();

        const bd =
          b.createdAt?.seconds != null
            ? b.createdAt.seconds * 1000
            : new Date(b.createdAt || 0).getTime();

        return bd - ad;
      });
    }

    return list;
  }, [products, filter, sortBy]);

  // Count-only mode (header)
  if (withCount) {
    if (loading) return <>...</>;
    return <>{filtered.length} items</>;
  }

  if (loading) return <div className="product-grid">Loading...</div>;

  if (!filtered.length) {
    return <div className="product-grid">No products found.</div>;
  }

  return (
    <div className="product-grid">
      {filtered.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;