/**
 * useMarketing.js
 * ─────────────────────────────────────────────────────────────
 * Unified hook for all 6 marketing features.
 * Follows the exact same pattern as useWithdrawals.js:
 *  - onSnapshot for real-time lists where useful
 *  - getDocs for static loads
 *  - exposes loading, submitting, error states
 *  - all write operations return promises and throw on failure
 *
 * Usage:
 *   const mkt = useMarketing();
 *   mkt.flashSales, mkt.createFlashSale(data), mkt.discountCodes, etc.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";
import {
  createFlashSale, endFlashSale, deleteFlashSale,
  createDiscountCode, toggleDiscountCode, deleteDiscountCode,
  initBoostPayment, getStoreBoosts,
  ensureReferralCode, getSellerReferrals,
  getLoyaltyConfig, saveLoyaltyConfig, getLoyaltyLeaderboard,
} from "../services/marketingService";

export function useMarketing() {
  const { user }  = useAuth();
  const { storeId, shop } = useSellerAuth();

  // ── Flash Sales ──────────────────────────────────────────
  const [flashSales, setFlashSales]           = useState([]);
  const [flashLoading, setFlashLoading]       = useState(true);

  // ── Discount Codes ───────────────────────────────────────
  const [discountCodes, setDiscountCodes]     = useState([]);
  const [codesLoading, setCodesLoading]       = useState(true);

  // ── Boosts ───────────────────────────────────────────────
  const [boosts, setBoosts]                   = useState([]);
  const [boostsLoading, setBoostsLoading]     = useState(true);

  // ── Referrals ─────────────────────────────────────────────
  const [referrals, setReferrals]             = useState([]);
  const [referralCode, setReferralCode]       = useState(null);
  const [referralsLoading, setReferralsLoading] = useState(true);

  // ── Loyalty ───────────────────────────────────────────────
  const [loyaltyConfig, setLoyaltyConfig]     = useState(null);
  const [loyaltyLeaderboard, setLoyaltyLeaderboard] = useState([]);
  const [loyaltyLoading, setLoyaltyLoading]   = useState(true);

  // ── Shared write state ────────────────────────────────────
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState(null);

  // ─────────────────────────────────────────────────────────
  // REAL-TIME LISTENERS (onSnapshot) — Flash Sales & Codes
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!storeId) { setFlashLoading(false); setCodesLoading(false); return; }

    // Flash sales listener
    let unsubFlash;
    try {
      unsubFlash = onSnapshot(
        query(collection(db, "flashSales"), where("storeId", "==", storeId), orderBy("createdAt", "desc")),
        (snap) => {
          setFlashSales(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setFlashLoading(false);
        },
        () => setFlashLoading(false)
      );
    } catch {
      setFlashLoading(false);
    }

    // Discount codes listener
    let unsubCodes;
    try {
      unsubCodes = onSnapshot(
        query(collection(db, "discountCodes"), where("storeId", "==", storeId), orderBy("createdAt", "desc")),
        (snap) => {
          setDiscountCodes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setCodesLoading(false);
        },
        () => setCodesLoading(false)
      );
    } catch {
      setCodesLoading(false);
    }

    return () => { unsubFlash?.(); unsubCodes?.(); };
  }, [storeId]);

  // ─────────────────────────────────────────────────────────
  // ONE-TIME LOADS — Boosts, Referrals, Loyalty
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!storeId) {
      setBoostsLoading(false);
      setReferralsLoading(false);
      setLoyaltyLoading(false);
      return;
    }

    // Boosts
    getStoreBoosts(storeId)
      .then(setBoosts)
      .catch(() => {})
      .finally(() => setBoostsLoading(false));

    // Referrals + referral code
    Promise.all([
      getSellerReferrals(storeId),
      ensureReferralCode(storeId, shop),
    ])
      .then(([refs, code]) => {
        setReferrals(refs);
        setReferralCode(code);
      })
      .catch(() => {})
      .finally(() => setReferralsLoading(false));

    // Loyalty config + leaderboard
    Promise.all([
      getLoyaltyConfig(storeId),
      getLoyaltyLeaderboard(storeId),
    ])
      .then(([config, board]) => {
        setLoyaltyConfig(config);
        setLoyaltyLeaderboard(board);
      })
      .catch(() => {})
      .finally(() => setLoyaltyLoading(false));
  }, [storeId, shop]);

  // ─────────────────────────────────────────────────────────
  // WRITE ACTIONS — Flash Sales
  // ─────────────────────────────────────────────────────────
  const createSale = useCallback(async (data) => {
    if (!storeId || !user?.uid) throw new Error("Not authenticated.");
    setSubmitting(true); setError(null);
    try {
      await createFlashSale(storeId, user.uid, data);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }, [storeId, user?.uid]);

  const endSale = useCallback(async (saleId) => {
    setSubmitting(true);
    try { await endFlashSale(saleId); }
    catch (e) { setError(e.message); throw e; }
    finally { setSubmitting(false); }
  }, []);

  const removeSale = useCallback(async (saleId) => {
    setSubmitting(true);
    try { await deleteFlashSale(saleId, storeId); }
    catch (e) { setError(e.message); throw e; }
    finally { setSubmitting(false); }
  }, [storeId]);

  const updateSale = useCallback(async (saleId, updates) => {
    if (!storeId) throw new Error("Not authenticated.");
    setSubmitting(true); setError(null);
    try {
      const { updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
      const { db: firestoreDb } = await import("../firebase");
      const payload = { updatedAt: serverTimestamp() };
      if (updates.discountValue !== undefined) payload.discountValue = Number(updates.discountValue);
      if (updates.endAt !== undefined) payload.endAt = updates.endAt instanceof Date ? updates.endAt : new Date(updates.endAt);
      await updateDoc(doc(firestoreDb, "flashSales", saleId), payload);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }, [storeId]);

  // ─────────────────────────────────────────────────────────
  // WRITE ACTIONS — Discount Codes
  // ─────────────────────────────────────────────────────────
  const createCode = useCallback(async (data) => {
    if (!storeId || !user?.uid) throw new Error("Not authenticated.");
    setSubmitting(true); setError(null);
    try {
      await createDiscountCode(storeId, user.uid, data);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }, [storeId, user?.uid]);

  const toggleCode = useCallback(async (codeId, active) => {
    try { await toggleDiscountCode(codeId, active); }
    catch (e) { setError(e.message); throw e; }
  }, []);

  const removeCode = useCallback(async (codeId) => {
    setSubmitting(true);
    try { await deleteDiscountCode(codeId, storeId); }
    catch (e) { setError(e.message); throw e; }
    finally { setSubmitting(false); }
  }, [storeId]);

  // ─────────────────────────────────────────────────────────
  // WRITE ACTIONS — Product Boosts (Paystack payment flow)
  // ─────────────────────────────────────────────────────────
  const startBoostPayment = useCallback(async ({ productId, productName, durationDays }) => {
    if (!storeId || !user?.uid || !user?.email) throw new Error("Not authenticated.");
    setSubmitting(true); setError(null);
    try {
      const result = await initBoostPayment({
        storeId, uid: user.uid, email: user.email,
        productId, productName, durationDays,
      });
      return result; // { authorization_url, reference }
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }, [storeId, user?.uid, user?.email]);

  const refreshBoosts = useCallback(async () => {
    if (!storeId) return;
    const fresh = await getStoreBoosts(storeId);
    setBoosts(fresh);
  }, [storeId]);

  // ─────────────────────────────────────────────────────────
  // WRITE ACTIONS — Loyalty
  // ─────────────────────────────────────────────────────────
  const saveLoyalty = useCallback(async (config) => {
    if (!storeId || !user?.uid) throw new Error("Not authenticated.");
    setSubmitting(true); setError(null);
    try {
      await saveLoyaltyConfig(storeId, user.uid, config);
      // Refresh local state
      const fresh = await getLoyaltyConfig(storeId);
      setLoyaltyConfig(fresh);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }, [storeId, user?.uid]);

  // ─────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────
  const activeSales = flashSales.filter((s) => {
    if (s.status !== "active") return false;
    const end = s.endAt?.toDate ? s.endAt.toDate() : new Date(s.endAt);
    return end > new Date();
  });

  const activeCodes   = discountCodes.filter((c) => c.active);
  const activeBoosts  = boosts.filter((b) => {
    if (!b.expiresAt) return false;
    const exp = b.expiresAt?.toDate ? b.expiresAt.toDate() : new Date(b.expiresAt);
    return exp > new Date() && b.status !== "cancelled";
  });

  const totalReferralEarned = referrals
    .filter((r) => r.status === "activated")
    .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

  const referralLink = referralCode
    ? `${window.location.origin}/join?ref=${referralCode}`
    : null;

  return {
    // Flash Sales
    flashSales, activeSales, flashLoading,
    createSale, endSale, removeSale, updateSale,

    // Discount Codes
    discountCodes, activeCodes, codesLoading,
    createCode, toggleCode, removeCode,

    // Boosts
    boosts, activeBoosts, boostsLoading,
    startBoostPayment, refreshBoosts,

    // Referrals
    referrals, referralCode, referralLink,
    referralsLoading, totalReferralEarned,

    // Loyalty
    loyaltyConfig, loyaltyLeaderboard, loyaltyLoading,
    saveLoyalty,

    // Shared
    submitting, error,
  };
}