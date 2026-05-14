import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

/**
 * useSellerAuth — subscribes to the seller's user document in real-time.
 * Provides isSeller, sellerStatus, storeId, plan info.
 * The seller role and sellerStatus are ONLY set by Cloud Functions
 * after successful Paystack payment verification.
 */
export function useSellerAuth() {
  const { user, role } = useAuth();
  const [sellerData, setSellerData] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSeller = role === "seller";

  // Subscribe to user doc for real-time seller status
  useEffect(() => {
    if (!user?.uid) {
      setSellerData(null);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setSellerData(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      (err) => {
        console.error("[useSellerAuth] user doc error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to shop doc if seller has a storeId
  useEffect(() => {
    const storeId = sellerData?.storeId;
    if (!storeId) { setShop(null); return; }
    const unsub = onSnapshot(
      doc(db, "shops", storeId),
      (snap) => setShop(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err) => console.error("[useSellerAuth] shop doc error:", err)
    );
    return () => unsub();
  }, [sellerData?.storeId]);

  const sellerStatus     = sellerData?.sellerStatus     || "none";
  const storeId          = sellerData?.storeId          || null;
  const subscriptionPlan = sellerData?.subscriptionPlan || "basic";
  const subscriptionStatus = sellerData?.subscriptionStatus || null;

  const isSellerActive  = isSeller && sellerStatus === "active";
  const isSellerGrace   = isSeller && sellerStatus === "grace";
  const isSellerPending = isSeller && sellerStatus === "pending";

  // Plan limits lookup
  const PLAN_LIMITS = {
    basic:    { maxProducts: 25,   hasChat: false, hasAI: false, hasBoosts: false, boostsPerMonth: 0  },
    standard: { maxProducts: 500,  hasChat: true,  hasAI: false, hasBoosts: true,  boostsPerMonth: 5  },
    pro:      { maxProducts: 99999, hasChat: true,  hasAI: true,  hasBoosts: true,  boostsPerMonth: 20 },
  };

  const planLimits = PLAN_LIMITS[subscriptionPlan] || PLAN_LIMITS.basic;

  return {
    isSeller,
    isSellerActive,
    isSellerGrace,
    isSellerPending,
    sellerStatus,
    storeId,
    shop,
    subscriptionPlan,
    subscriptionStatus,
    planLimits,
    sellerData,
    loading,
  };
}

