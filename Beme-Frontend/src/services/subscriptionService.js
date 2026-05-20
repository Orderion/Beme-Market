import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from "firebase/firestore";
import { db, auth } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

const BASE = String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/+$/, "");

// ── New prices: GHS 0 / 59 / 129 / 399
export const PLAN_PRICES = {
  basic:   0,
  starter: 59,
  growth:  129,
  pro:     399,
};

export const PLAN_NAMES = {
  basic:   "Basic",
  starter: "Starter",
  growth:  "Growth",
  pro:     "Pro",
};

export const PLAN_PRODUCT_LIMITS = {
  basic:    5,
  free:     5,
  starter:  10,
  growth:   25,
  standard: 25,
  pro:      500,
};

// hasBemeDelivery: Growth and Pro only
export const PLAN_RESTRICTIONS = {
  basic:    { hasSocialLinks: false, hasChat: false, hasBemeDelivery: false },
  free:     { hasSocialLinks: false, hasChat: false, hasBemeDelivery: false },
  starter:  { hasSocialLinks: true,  hasChat: true,  hasBemeDelivery: false },
  growth:   { hasSocialLinks: true,  hasChat: true,  hasBemeDelivery: true  },
  standard: { hasSocialLinks: true,  hasChat: true,  hasBemeDelivery: true  },
  pro:      { hasSocialLinks: true,  hasChat: true,  hasBemeDelivery: true  },
};

export function getPlanRestrictions(planId) {
  return PLAN_RESTRICTIONS[String(planId || "basic").toLowerCase()] || PLAN_RESTRICTIONS.basic;
}

export async function initSubscriptionPayment({ planId, uid, email, shopId }) {
  if (!planId || !uid || !email) throw new Error("Missing required fields.");
  const price = PLAN_PRICES[planId];
  if (price === 0) return { isFree: true, planId };

  const token = await auth.currentUser.getIdToken(true);
  const res = await fetch(`${BASE}/api/seller/subscription/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ planId, shopId, email }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Subscription init failed (HTTP ${res.status})`);
  if (!data?.authorization_url) throw new Error("Missing Paystack authorization URL.");

  await setDoc(doc(db, "storeApplications", uid), {
    pendingPlanId: planId,
    pendingReference: data.reference,
    status: "pending_payment",
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return data;
}

export async function verifySubscriptionPayment(reference) {
  const functions = getFunctions();
  const verify    = httpsCallable(functions, "createSellerStore");
  const result    = await verify({ reference });
  return result.data;
}

export async function activateFreeStore(applicationData) {
  const functions = getFunctions();
  const activate  = httpsCallable(functions, "createSellerStore");
  const result    = await activate({ planId: "basic", ...applicationData });
  return result.data;
}

export async function getSubscription(uid) {
  const snap = await getDoc(doc(db, "subscriptions", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getTransactionHistory(uid) {
  const { getDocs, query, where, orderBy } = await import("firebase/firestore");
  const snap = await getDocs(
    query(
      collection(db, "transactions"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function redirectToPaystack(authorizationUrl) {
  window.location.assign(authorizationUrl);
}