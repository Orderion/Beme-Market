// src/hooks/useWithdrawals.js
import { useState, useEffect, useCallback } from "react";
import {
  collection, onSnapshot, orderBy, query, where,
  addDoc, serverTimestamp, getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";
import { MIN_WITHDRAWAL } from "../services/payoutService";

export function useWithdrawals() {
  const { user }    = useAuth();
  const { storeId } = useSellerAuth();

  const [withdrawals,      setWithdrawals]      = useState([]);
  const [paystackRevenue,  setPaystackRevenue]  = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [submitting,       setSubmitting]        = useState(false);
  const [error,            setError]            = useState(null);

  /* ── Real-time withdrawal requests ── */
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const q = query(
      collection(db, "withdrawalRequests"),
      where("sellerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setError(null);
    }, err => {
      console.error("[useWithdrawals]", err);
      setError("Failed to load withdrawal history.");
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  /* ── Fetch ALL-TIME Paystack revenue for this seller ── */
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "orders"),
            where("shopOwnerId", "==", user.uid),
            where("paymentMethod", "==", "paystack")
          )
        );
        const total = snap.docs.reduce((s, d) => {
          return s + Number(d.data()?.pricing?.total || 0);
        }, 0);
        setPaystackRevenue(total);
      } catch (e) {
        console.warn("[useWithdrawals] paystack revenue fetch:", e?.code);
      }
    })();
  }, [user?.uid]);

  /* ── Derived totals ── */
  const pendingTotal = withdrawals
    .filter(w => ["pending", "processing", "approved"].includes(w.status))
    .reduce((s, w) => s + Number(w.amount || 0), 0);

  const completedTotal = withdrawals
    .filter(w => ["completed", "paid"].includes(w.status))
    .reduce((s, w) => s + Number(w.amount || 0), 0);

  const availableBalance = Math.max(0, paystackRevenue - pendingTotal - completedTotal);

  const hasPendingRequest = withdrawals.some(w =>
    ["pending", "processing", "approved"].includes(w.status)
  );

  /* ── Submit withdrawal ── */
  const requestWithdrawal = useCallback(async (payload) => {
    if (!user?.uid || !storeId) throw new Error("Not authenticated.");

    const { amount, method, momoNumber, momoNetwork, accountName, bankName, bankAccount } = payload;
    const amt = Number(amount);

    if (!amt || amt < MIN_WITHDRAWAL)
      throw new Error(`Minimum withdrawal is GHS ${MIN_WITHDRAWAL}.`);
    if (amt > availableBalance)
      throw new Error(`Amount exceeds your available balance of GHS ${availableBalance.toFixed(2)}.`);
    if (hasPendingRequest)
      throw new Error("You already have a pending withdrawal request. Please wait for it to be processed.");
    if (method === "momo" && !momoNumber)
      throw new Error("MoMo number is required.");
    if (method === "bank" && !bankName)
      throw new Error("Bank name is required.");
    if (method === "bank" && !bankAccount)
      throw new Error("Account number is required.");
    if (!accountName?.trim())
      throw new Error("Account name is required.");

    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, "withdrawalRequests"), {
        sellerId:     user.uid,
        shopId:       storeId,
        amount:       amt,
        currency:     "GHS",
        method:       method || "momo",
        momoNumber:   momoNumber  || null,
        momoNetwork:  momoNetwork || null,
        accountName:  String(accountName).trim(),
        bankName:     bankName    || null,
        bankAccount:  bankAccount || null,
        status:       "pending",
        adminNote:    null,
        createdAt:    serverTimestamp(),
        updatedAt:    serverTimestamp(),
      });
    } catch (err) {
      console.error("[useWithdrawals] request error:", err);
      setError("Failed to submit withdrawal request.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [user?.uid, storeId, availableBalance, hasPendingRequest]);

  return {
    withdrawals,
    loading,
    submitting,
    error,
    pendingTotal,
    completedTotal,
    paystackRevenue,
    availableBalance,
    hasPendingRequest,
    requestWithdrawal,
  };
}