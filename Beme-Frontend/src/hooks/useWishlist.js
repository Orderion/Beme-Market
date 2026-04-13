// hooks/useWishlist.js
// ─────────────────────────────────────────────────────────────
// FIX: uses useAuth() context instead of auth.currentUser directly.
// auth.currentUser is a static snapshot — often null on first render
// even when the user is logged in. useAuth() is reactive and correct.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext"; // ← reactive, always correct

/**
 * @param {Object|null} product  - product being viewed { id, name, price, image }
 * @param {Function}    onSaved  - callback fired after a SAVE (opens modal, etc.)
 */
export function useWishlist(product, onSaved) {
  const { user } = useAuth(); // ← reactive user from your existing AuthContext
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);

  // ── Real-time: is THIS product wishlisted? ────────────────────
  useEffect(() => {
    if (!user || !product?.id) {
      setIsWishlisted(false);
      return;
    }

    const ref = doc(db, "users", user.uid, "wishlist", product.id);
    const unsub = onSnapshot(ref, (snap) => {
      setIsWishlisted(snap.exists());
    });

    return () => unsub();
  }, [user, product?.id]);

  // ── Real-time: total wishlist item count ──────────────────────
  useEffect(() => {
    if (!user) {
      setWishlistCount(0);
      return;
    }

    const colRef = collection(db, "users", user.uid, "wishlist");
    const unsub = onSnapshot(colRef, (snap) => {
      setWishlistCount(snap.size);
    });

    return () => unsub();
  }, [user]);

  // ── Toggle save / remove ──────────────────────────────────────
  const toggleWishlist = useCallback(async () => {
    if (!user) {
      // Wire this to your auth redirect if needed
      console.warn("useWishlist: no user logged in");
      return;
    }
    if (!product?.id) return;

    const ref = doc(db, "users", user.uid, "wishlist", product.id);
    setLoading(true);

    try {
      if (isWishlisted) {
        await deleteDoc(ref);
        // isWishlisted updates automatically via onSnapshot
      } else {
        await setDoc(ref, {
          productId: product.id,
          name:      product.name  ?? "",
          price:     Number(product.price || 0),
          image:     product.image ?? "",
          timestamp: Date.now(),
        });
        if (typeof onSaved === "function") onSaved();
      }
    } catch (err) {
      console.error("useWishlist toggleWishlist error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, product, isWishlisted, onSaved]);

  return { isWishlisted, toggleWishlist, loading, wishlistCount };
}