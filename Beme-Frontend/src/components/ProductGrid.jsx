import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import ProductCard from "./ProductCard";
import "./ProductGrid.css";

const ProductGrid = ({ filter = null, sortBy = "new", withCount = false }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(!withCount);

  useEffect(() => {
    let alive = true;

    const fetchProducts = async () => {
      try {
        // 🔥 Must match Firestore exactly: "Products"
        const querySnapshot = await getDocs(collection(db, "Products"));

        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (!alive) return;
        setProducts(items);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      alive = false;
    };
  }, [withCount]);

  const filtered = useMemo(() => {
    let list = [...products];

    // Optional filter
    if (filter) {
      const f = String(filter).toLowerCase();
      list = list.filter((p) =>
        String(p.category || "").toLowerCase().includes(f)
      );
    }

    // Optional sorting
    if (sortBy === "price") {
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else {
      // Sort by newest
      list.sort((a, b) => {
        const ad = a.createdAt?.seconds
          ? a.createdAt.seconds
          : new Date(a.createdAt || 0).getTime();
        const bd = b.createdAt?.seconds
          ? b.createdAt.seconds
          : new Date(b.createdAt || 0).getTime();
        return bd - ad;
      });
    }

    return list;
  }, [products, filter, sortBy]);

  if (withCount) {
    return <>{filtered.length} items</>;
  }

  if (loading) {
    return <div className="product-grid">Loading...</div>;
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