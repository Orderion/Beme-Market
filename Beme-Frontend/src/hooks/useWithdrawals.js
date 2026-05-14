import { useState, useEffect, useCallback } from "react";
import {
  collection, onSnapshot, orderBy, query, where,
  addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";

/**
 * useWithdrawals — manages seller withdrawal requests and wallet balance.
 * Reads from withdrawalRequests where sellerId == user.uid
 */
export function useWithdrawals() {
  const { user }    = useAuth();
  const { storeId } = useSellerAuth();

  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const q = query(
      collection(db, "withdrawalRequests"),
      where("sellerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setWithdrawals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("[useWithdrawals] error:", err);
      setError("Failed to load withdrawal history.");
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  // Calculate pending and completed amounts
  const pendingTotal = withdrawals
    .filter((w) => w.status === "pending" || w.status === "processing")
    .reduce((s, w) => s + (w.amount || 0), 0);

  const completedTotal = withdrawals
    .filter((w) => w.status === "completed")
    .reduce((s, w) => s + (w.amount || 0), 0);

  // Request a withdrawal
  const requestWithdrawal = useCallback(async (payload) => {
    if (!user?.uid || !storeId) throw new Error("Not authenticated.");
    const { amount, method, momoNumber, momoNetwork, accountName, bankName, bankAccount } = payload;

    if (!amount || Number(amount) < 50) throw new Error("Minimum withdrawal is GHS 50.");
    if (method === "momo" && !momoNumber) throw new Error("MoMo number is required.");
    if (!accountName?.trim()) throw new Error("Account name is required.");

    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, "withdrawalRequests"), {
        sellerId:      user.uid,
        shopId:        storeId,
        amount:        Number(amount),
        currency:      "GHS",
        method:        method || "momo",
        momoNumber:    momoNumber || null,
        momoNetwork:   momoNetwork || null,
        accountName:   String(accountName).trim(),
        bankName:      bankName || null,
        bankAccount:   bankAccount || null,
        status:        "pending",
        adminNote:     null,
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
      });
    } catch (err) {
      console.error("[useWithdrawals] request error:", err);
      setError("Failed to submit withdrawal request.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [user?.uid, storeId]);

  return {
    withdrawals,
    loading,
    submitting,
    error,
    pendingTotal,
    completedTotal,
    requestWithdrawal,
  };
}

