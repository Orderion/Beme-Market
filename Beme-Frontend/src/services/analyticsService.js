// src/services/analyticsService.js
import {
  doc, collection, getDocs, setDoc, updateDoc, increment,
  query, orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * recordProductView — increments the daily visitor count for a shop.
 * Call this when a user views a seller's product.
 */
export async function recordProductView(shopId) {
  if (!shopId) return;
  const key     = todayKey();
  const dayRef  = doc(db, "sellerAnalytics", shopId, "daily", key);
  try {
    await updateDoc(dayRef, {
      visitors: increment(1),
      productViews: increment(1),
    });
  } catch {
    await setDoc(dayRef, {
      date: key, visitors: 1, productViews: 1,
      revenue: 0, orders: 0, createdAt: serverTimestamp(),
    }, { merge: true });
  }
}

/**
 * recordSale — called after a successful order that includes seller products.
 */
export async function recordSale(shopId, amount, orderCount = 1) {
  if (!shopId) return;
  const key    = todayKey();
  const dayRef = doc(db, "sellerAnalytics", shopId, "daily", key);
  try {
    await updateDoc(dayRef, {
      revenue: increment(amount),
      orders:  increment(orderCount),
    });
  } catch {
    await setDoc(dayRef, {
      date: key, revenue: amount, orders: orderCount,
      visitors: 0, productViews: 0, createdAt: serverTimestamp(),
    }, { merge: true });
  }
}

/**
 * getAnalyticsSummary — fetches last N days of analytics for a shop.
 */
export async function getAnalyticsSummary(shopId, days = 30) {
  const snap = await getDocs(
    query(
      collection(db, "sellerAnalytics", shopId, "daily"),
      orderBy("__name__", "desc"),
      limit(days)
    )
  );
  return snap.docs.map((d) => ({ date: d.id, ...d.data() }));
}

