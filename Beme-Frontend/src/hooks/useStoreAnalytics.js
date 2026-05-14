import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, getDocs, onSnapshot,
  orderBy, query, where, limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSellerAuth } from "./useSellerAuth";

function toMillis(val) {
  if (!val) return 0;
  if (typeof val?.toMillis === "function") return val.toMillis();
  if (val instanceof Date) return val.getTime();
  if (typeof val?.seconds === "number") return val.seconds * 1000;
  return 0;
}

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function buildWeekSeries(dailyMap) {
  const today = new Date();
  const days  = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key   = getDayKey(d);
    const label = d.toLocaleDateString("en-GH", { weekday: "short" });
    const data  = dailyMap[key] || {};
    days.push({ key, label, revenue: data.revenue || 0, orders: data.orders || 0, visitors: data.visitors || 0 });
  }
  return days;
}

/**
 * useStoreAnalytics — provides 7-day analytics for the seller's store.
 * Reads from sellerAnalytics/{shopId}/daily/{date}
 */
export function useStoreAnalytics() {
  const { user }  = useAuth();
  const { storeId } = useSellerAuth();

  const [analytics, setAnalytics] = useState({ weekSeries: [], totals: { revenue: 0, orders: 0, visitors: 0, products: 0 } });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchAnalytics = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch last 30 days of daily analytics
      const snap = await getDocs(
        query(collection(db, "sellerAnalytics", storeId, "daily"), orderBy("__name__", "desc"), limit(30))
      );
      const dailyMap = {};
      snap.docs.forEach((d) => { dailyMap[d.id] = d.data(); });

      const weekSeries = buildWeekSeries(dailyMap);
      const totals = {
        revenue:  snap.docs.reduce((s, d) => s + (d.data().revenue || 0), 0),
        orders:   snap.docs.reduce((s, d) => s + (d.data().orders || 0), 0),
        visitors: snap.docs.reduce((s, d) => s + (d.data().visitors || 0), 0),
      };

      // Weekly totals (last 7 days)
      const weekRevenue  = weekSeries.reduce((s, d) => s + d.revenue, 0);
      const weekOrders   = weekSeries.reduce((s, d) => s + d.orders, 0);
      const weekVisitors = weekSeries.reduce((s, d) => s + d.visitors, 0);

      setAnalytics({ weekSeries, totals, weekRevenue, weekOrders, weekVisitors });
      setError(null);
    } catch (err) {
      console.error("[useStoreAnalytics] error:", err);
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  return { ...analytics, loading, error, refresh: fetchAnalytics };
}

