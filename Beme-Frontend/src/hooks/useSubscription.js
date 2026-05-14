import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

/**
 * useSubscription — subscribes to subscriptions/{uid} in real-time.
 * Returns plan status, renewal info, and billing summary.
 */
export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "subscriptions", user.uid),
      (snap) => {
        setSubscription(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[useSubscription] error:", err);
        setError("Failed to load subscription.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // Derived state
  const isActive  = subscription?.status === "active";
  const isGrace   = subscription?.status === "grace";
  const isExpired = ["suspended", "cancelled"].includes(subscription?.status);
  const plan      = subscription?.planId || "basic";

  const daysUntilRenewal = (() => {
    if (!subscription?.currentPeriodEnd) return null;
    const end = subscription.currentPeriodEnd?.toMillis?.() ?? 0;
    return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
  })();

  const renewalDateStr = (() => {
    if (!subscription?.currentPeriodEnd) return null;
    const d = new Date(subscription.currentPeriodEnd?.toMillis?.() ?? 0);
    return d.toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" });
  })();

  const PLAN_PRICES = { basic: 0, standard: 99, pro: 249 };
  const planPrice   = PLAN_PRICES[plan] || 0;

  return {
    subscription,
    isActive,
    isGrace,
    isExpired,
    plan,
    planPrice,
    daysUntilRenewal,
    renewalDateStr,
    loading,
    error,
  };
}

