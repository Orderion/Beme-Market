import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

/**
 * useSellerAuth — Spark plan safe.
 * Cloud Functions never run on free plan so:
 *   - users/{uid}.storeId is never set by CF
 *   - shops/{id} is never created by CF
 *
 * Fallback chain:
 *   1. shops/{storeId} if storeId is in user doc (CF path)
 *   2. shops/{user.uid} — created by DashboardAppearance on first Save
 *   3. storeApplications/{uid} for plan + name data (onboarding path)
 */
export function useSellerAuth() {
  const { user, role } = useAuth();
  const [sellerData, setSellerData] = useState(null);
  const [shop,       setShop]       = useState(null);
  const [appData,    setAppData]    = useState(null);
  const [loading,    setLoading]    = useState(true);

  const isSeller = role === "seller";

  /* 1. users/{uid} */
  useEffect(() => {
    if (!user?.uid) { setSellerData(null); setLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => { setSellerData(snap.exists() ? snap.data() : null); setLoading(false); },
      (err)  => { console.error("[useSellerAuth] user doc:", err); setLoading(false); }
    );
    return () => unsub();
  }, [user?.uid]);

  /* 2a. shops/{storeId} — CF path */
  useEffect(() => {
    const sid = sellerData?.storeId;
    if (!sid) return;
    const unsub = onSnapshot(
      doc(db, "shops", sid),
      (snap) => setShop(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err)  => console.error("[useSellerAuth] shop by storeId:", err)
    );
    return () => unsub();
  }, [sellerData?.storeId]);

  /* 2b. shops/{user.uid} — Spark plan fallback (created by DashboardAppearance.handleSave) */
  useEffect(() => {
    if (!user?.uid || sellerData?.storeId) return;
    const unsub = onSnapshot(
      doc(db, "shops", user.uid),
      (snap) => { if (snap.exists()) setShop({ id: snap.id, ...snap.data() }); },
      (err)  => console.error("[useSellerAuth] shop by uid:", err)
    );
    return () => unsub();
  }, [user?.uid, sellerData?.storeId]);

  /* 3. storeApplications/{uid} — plan + name data from onboarding */
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(
      doc(db, "storeApplications", user.uid),
      (snap) => setAppData(snap.exists() ? snap.data() : null),
      (err)  => console.error("[useSellerAuth] storeApplications:", err)
    );
    return () => unsub();
  }, [user?.uid]);

  /* Derived */
  const sellerStatus = sellerData?.sellerStatus || (appData ? "active" : "none");
  const storeId      = sellerData?.storeId || null;

  const subscriptionPlan = (
    sellerData?.subscriptionPlan ||
    appData?.planId              ||
    shop?.planId                 ||
    "basic"
  ).toLowerCase();

  const subscriptionStatus = sellerData?.subscriptionStatus || null;

  const hasApplication = !!appData;
  const hasShop        = !!shop;

  const isSellerActive  = isSeller || hasApplication || hasShop;
  const isSellerGrace   = isSeller && sellerStatus === "grace";
  const isSellerPending = !hasApplication && !hasShop && !isSeller;

  /* Plan limits — 4-tier, no unlimited */
  const PLAN_LIMITS = {
    basic:    { maxProducts: 10,  hasSocialLinks: false, hasChat: false, hasAI: false, aiDailyLimit: 0,    hasBoosts: false, boostsPerMonth: 0  },
    starter:  { maxProducts: 50,  hasSocialLinks: true,  hasChat: true,  hasAI: true,  aiDailyLimit: 50,   hasBoosts: false, boostsPerMonth: 0  },
    growth:   { maxProducts: 150, hasSocialLinks: true,  hasChat: true,  hasAI: true,  aiDailyLimit: 100,  hasBoosts: true,  boostsPerMonth: 5  },
    standard: { maxProducts: 150, hasSocialLinks: true,  hasChat: true,  hasAI: true,  aiDailyLimit: 100,  hasBoosts: true,  boostsPerMonth: 5  },
    pro:      { maxProducts: 500, hasSocialLinks: true,  hasChat: true,  hasAI: true,  aiDailyLimit: 1000, hasBoosts: true,  boostsPerMonth: 20 },
    free:     { maxProducts: 10,  hasSocialLinks: false, hasChat: false, hasAI: false, aiDailyLimit: 0,    hasBoosts: false, boostsPerMonth: 0  },
  };

  const planLimits = PLAN_LIMITS[subscriptionPlan] || PLAN_LIMITS.basic;

  // Effective storeId — always user.uid as last resort for URL building
  const effectiveStoreId = sellerData?.storeId || shop?.id || (hasApplication ? user?.uid : null);

  return {
    isSeller: isSeller || hasApplication || hasShop,
    isSellerActive,
    isSellerGrace,
    isSellerPending,
    sellerStatus,
    storeId:  effectiveStoreId,
    shop,
    subscriptionPlan,
    subscriptionStatus,
    planLimits,
    sellerData,
    appData,
    loading,
  };
}