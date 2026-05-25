import { db } from "../firebase";
import {
  doc, setDoc, updateDoc, increment,
  serverTimestamp, collection, addDoc, deleteDoc,
} from "firebase/firestore";

const todayKey = () => new Date().toISOString().split("T")[0];

/* ── Track store visit ── */
export async function trackStoreVisit(shopId, userId = null) {
  if (!shopId) return;
  try {
    const date = todayKey();
    const ref  = doc(db, "sellerAnalytics", shopId, "daily", date);
    await setDoc(ref, {
      date,
      shopId,
      visits:   increment(1),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    // Silently fail — never break the UI for tracking
  }
}

/* ── Track product view ── */
export async function trackProductView(productId, shopId, userId = null) {
  if (!productId || !shopId) return;
  try {
    const date = todayKey();
    // Increment daily store analytics
    const storeRef = doc(db, "sellerAnalytics", shopId, "daily", date);
    await setDoc(storeRef, {
      date,
      shopId,
      productViews: increment(1),
      updatedAt:    serverTimestamp(),
    }, { merge: true });

    // Increment per-product view counter
    const prodRef = doc(db, "productAnalytics", productId);
    await setDoc(prodRef, {
      productId,
      shopId,
      totalViews: increment(1),
      lastViewed: serverTimestamp(),
    }, { merge: true });
  } catch (e) {}
}

/* ── Track add to cart ── */
export async function trackAddToCart(productId, shopId) {
  if (!productId || !shopId) return;
  try {
    const date    = todayKey();
    const storeRef = doc(db, "sellerAnalytics", shopId, "daily", date);
    await setDoc(storeRef, {
      date,
      shopId,
      addToCartEvents: increment(1),
      updatedAt:       serverTimestamp(),
    }, { merge: true });
  } catch (e) {}
}

/* ── Live presence — who is on the store right now ── */
export async function setStorePresence(shopId, sessionId) {
  if (!shopId || !sessionId) return null;
  try {
    const ref = doc(db, "storePresence", shopId, "visitors", sessionId);
    await setDoc(ref, {
      sessionId,
      shopId,
      enteredAt: serverTimestamp(),
      page:      "store",
    });
    return ref;
  } catch (e) { return null; }
}

export async function clearStorePresence(shopId, sessionId) {
  if (!shopId || !sessionId) return;
  try {
    await deleteDoc(doc(db, "storePresence", shopId, "visitors", sessionId));
  } catch (e) {}
}
