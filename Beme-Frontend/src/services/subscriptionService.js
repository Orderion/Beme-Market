import { doc, getDoc, setDoc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db, auth } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

const BASE = String(import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/+$/, "");

// Plan pricing in GHS
export const PLAN_PRICES = {
  basic:    0,
  standard: 99,
  pro:      249,
};

export const PLAN_NAMES = {
  basic:    "Basic",
  standard: "Standard",
  pro:      "Pro",
};

/**
 * initSubscriptionPayment — creates a Paystack one-time charge for plan subscription.
 * Works with Paystack Starter plan (no Subscriptions API needed).
 * The backend creates the transaction with plan metadata.
 */
export async function initSubscriptionPayment({ planId, uid, email, shopId }) {
  if (!planId || !uid || !email) throw new Error("Missing required fields.");
  const price = PLAN_PRICES[planId];
  if (price === 0) {
    // Basic is free — skip payment and call cloud function directly
    return { isFree: true, planId };
  }

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

  // Save pending subscription record
  await setDoc(doc(db, "storeApplications", uid), {
    pendingPlanId: planId,
    pendingReference: data.reference,
    status: "pending_payment",
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return data;
}

/**
 * verifySubscriptionPayment — callable cloud function that verifies payment
 * and activates the seller account. Called from SubscriptionSuccess.jsx.
 */
export async function verifySubscriptionPayment(reference) {
  const functions = getFunctions();
  const verify    = httpsCallable(functions, "createSellerStore");
  const result    = await verify({ reference });
  return result.data;
}

/**
 * activateFreeStore — for Basic plan, calls createSellerStore directly
 * since no payment is needed.
 */
export async function activateFreeStore(applicationData) {
  const functions = getFunctions();
  const activate  = httpsCallable(functions, "createSellerStore");
  const result    = await activate({ planId: "basic", ...applicationData });
  return result.data;
}

/**
 * getSubscription — reads current subscription for a user.
 */
export async function getSubscription(uid) {
  const snap = await getDoc(doc(db, "subscriptions", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * getTransactionHistory — reads transaction history for a seller.
 */
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

/**
 * Redirect to Paystack for subscription payment.
 */
export function redirectToPaystack(authorizationUrl) {
  window.location.assign(authorizationUrl);
}

