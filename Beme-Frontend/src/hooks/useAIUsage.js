// src/hooks/useAIUsage.js
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";

function today() { return new Date().toISOString().split("T")[0]; }

// Per-plan daily AI limits
const PLAN_AI_LIMITS = {
  basic:    0,
  free:     0,
  starter:  50,
  growth:   100,
  standard: 100,
  pro:      1000,
};

export function useAIUsage() {
  const { user }            = useAuth();
  const { subscriptionPlan } = useSellerAuth();
  const [data, setData]     = useState({ count:0, extraCredits:0, date:today() });
  const [loading, setLoading] = useState(true);

  // Daily limit based on plan
  const planLimit = PLAN_AI_LIMITS[subscriptionPlan] ?? 0;
  const hasAIAccess = planLimit > 0;

  useEffect(() => {
    if (!user?.uid) { setData({ count:0, extraCredits:0, date:today() }); setLoading(false); return; }
    const unsub = onSnapshot(doc(db, "aiUsage", user.uid), (snap) => {
      if (!snap.exists()) {
        setData({ count:0, extraCredits:0, date:today() });
      } else {
        const d = snap.data(); const t = today();
        if (d.date !== t) setData({ count:0, extraCredits:d.extraCredits||0, date:t });
        else setData({ count:d.count||0, extraCredits:d.extraCredits||0, date:d.date||t });
      }
      setLoading(false);
    }, (err) => { console.error("[useAIUsage]", err); setLoading(false); });
    return () => unsub();
  }, [user?.uid]);

  const extra     = data.extraCredits;
  const limit     = planLimit + extra;          // effective limit = plan base + purchased credits
  const used      = data.count;
  const remaining = Math.max(0, limit - used);
  const pct       = planLimit > 0 ? Math.min(100, Math.round((used / planLimit) * 100)) : 100;

  return {
    messagesUsed:     used,
    messagesRemaining: remaining,
    extraCredits:     extra,
    dailyLimit:       planLimit,
    effectiveLimit:   limit,
    isAtLimit:        !hasAIAccess || remaining === 0,
    isNearLimit:      !!(hasAIAccess && remaining > 0 && remaining <= 5),
    hasAIAccess,
    usagePercent:     pct,
    loading,
  };
}