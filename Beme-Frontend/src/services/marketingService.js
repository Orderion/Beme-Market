/**
 * marketingService.js
 * ─────────────────────────────────────────────────────────────
 * Central data layer for all 6 Beme Market marketing features.
 * Mirrors the patterns in storeService.js and subscriptionService.js.
 *
 * Collections used:
 *   flashSales/{id}
 *   discountCodes/{id}
 *   boosts/{id}          ← already in Firestore rules as allow read: if true
 *   referrals/{id}
 *   loyaltyConfig/{storeId}   (one doc per store — seller settings)
 *   loyaltyPoints/{storeId_customerId}  (one doc per customer per store)
 *   shops/{storeId}      ← extended with referralCode, loyaltyEnabled, etc.
 */

import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, runTransaction,
  increment, limit,
} from "firebase/firestore";
import { db } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Generate a random uppercase alphanumeric code */
function genCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─────────────────────────────────────────────────────────────
// FLASH SALES
// ─────────────────────────────────────────────────────────────

/**
 * Create a flash sale for a store.
 * @param {string} storeId
 * @param {string} uid  - seller's Firebase uid (sellerId)
 * @param {object} data - { productIds, discountType, discountValue, startAt, endAt, title }
 */
export async function createFlashSale(storeId, uid, data) {
  if (!storeId || !uid) throw new Error("Authentication required.");
  if (!data.productIds?.length) throw new Error("Select at least one product.");
  if (!data.discountValue || Number(data.discountValue) <= 0) throw new Error("Invalid discount value.");
  if (!data.startAt || !data.endAt) throw new Error("Start and end times are required.");
  if (new Date(data.endAt) <= new Date(data.startAt)) throw new Error("End time must be after start time.");

  return await addDoc(collection(db, "flashSales"), {
    storeId,
    sellerId:      uid,
    title:         data.title?.trim() || "Flash Sale",
    productIds:    data.productIds,
    discountType:  data.discountType || "pct",   // "pct" | "fixed"
    discountValue: Number(data.discountValue),
    startAt:       new Date(data.startAt),
    endAt:         new Date(data.endAt),
    status:        "active",
    createdAt:     serverTimestamp(),
  });
}

/**
 * Get all flash sales for a store, ordered by creation date.
 */
export async function getFlashSales(storeId) {
  if (!storeId) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "flashSales"),
        where("storeId", "==", storeId),
        orderBy("createdAt", "desc")
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    // Fallback without orderBy if index not built
    const snap = await getDocs(
      query(collection(db, "flashSales"), where("storeId", "==", storeId))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }
}

/** Manually end a flash sale */
export async function endFlashSale(saleId) {
  await updateDoc(doc(db, "flashSales", saleId), {
    status: "ended",
    endedAt: serverTimestamp(),
  });
}

/** Delete a flash sale */
export async function deleteFlashSale(saleId, storeId) {
  const snap = await getDoc(doc(db, "flashSales", saleId));
  if (!snap.exists() || snap.data().storeId !== storeId) {
    throw new Error("Not authorised to delete this sale.");
  }
  await deleteDoc(doc(db, "flashSales", saleId));
}

// ─────────────────────────────────────────────────────────────
// DISCOUNT CODES
// ─────────────────────────────────────────────────────────────

/**
 * Create a discount code.
 * @param {string} storeId
 * @param {string} uid
 * @param {object} data - { code?, type, value, usageLimit, expiresAt, minOrderAmount }
 */
export async function createDiscountCode(storeId, uid, data) {
  if (!storeId || !uid) throw new Error("Authentication required.");
  if (!data.value || Number(data.value) <= 0) throw new Error("Discount value must be greater than 0.");
  if (data.type === "pct" && Number(data.value) > 100) throw new Error("Percentage discount cannot exceed 100%.");

  const code = (data.code?.trim().toUpperCase() || genCode(7));

  // Check code uniqueness within this store
  const existing = await getDocs(
    query(
      collection(db, "discountCodes"),
      where("storeId", "==", storeId),
      where("code", "==", code)
    )
  );
  if (!existing.empty) throw new Error(`Code "${code}" already exists. Use a different code.`);

  return await addDoc(collection(db, "discountCodes"), {
    storeId,
    sellerId:        uid,
    code,
    type:            data.type || "pct",     // "pct" | "fixed"
    value:           Number(data.value),
    usageLimit:      data.usageLimit ? Number(data.usageLimit) : null,
    usedCount:       0,
    minOrderAmount:  data.minOrderAmount ? Number(data.minOrderAmount) : 0,
    expiresAt:       data.expiresAt ? new Date(data.expiresAt) : null,
    active:          true,
    createdAt:       serverTimestamp(),
  });
}

/** Get all discount codes for a store */
export async function getDiscountCodes(storeId) {
  if (!storeId) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "discountCodes"),
        where("storeId", "==", storeId),
        orderBy("createdAt", "desc")
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(
      query(collection(db, "discountCodes"), where("storeId", "==", storeId))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }
}

/** Toggle a discount code active/inactive */
export async function toggleDiscountCode(codeId, active) {
  await updateDoc(doc(db, "discountCodes", codeId), { active });
}

/** Delete a discount code */
export async function deleteDiscountCode(codeId, storeId) {
  const snap = await getDoc(doc(db, "discountCodes", codeId));
  if (!snap.exists() || snap.data().storeId !== storeId) {
    throw new Error("Not authorised.");
  }
  await deleteDoc(doc(db, "discountCodes", codeId));
}

/**
 * Validate a discount code at checkout (called from checkout component).
 * Returns { valid, discountType, discountValue, codeId } or throws.
 */
export async function validateDiscountCode(storeId, code) {
  const snap = await getDocs(
    query(
      collection(db, "discountCodes"),
      where("storeId", "==", storeId),
      where("code", "==", code.trim().toUpperCase()),
      where("active", "==", true)
    )
  );
  if (snap.empty) throw new Error("Invalid or inactive discount code.");
  const doc = snap.docs[0];
  const data = doc.data();

  if (data.expiresAt && new Date() > data.expiresAt.toDate()) throw new Error("This code has expired.");
  if (data.usageLimit && data.usedCount >= data.usageLimit) throw new Error("This code has reached its usage limit.");

  return { valid: true, discountType: data.type, discountValue: data.value, codeId: doc.id, minOrderAmount: data.minOrderAmount || 0 };
}

/**
 * Increment usage count after a successful order (call from order completion).
 */
export async function incrementDiscountCodeUsage(codeId) {
  await updateDoc(doc(db, "discountCodes", codeId), {
    usedCount: increment(1),
  });
}

// ─────────────────────────────────────────────────────────────
// PRODUCT BOOSTS
// ─────────────────────────────────────────────────────────────

/** Boost pricing per day in GHS */
export const BOOST_PRICING = {
  1:  10,
  3:  25,
  7:  50,
  14: 90,
  30: 150,
};

/**
 * Initialize a product boost payment via Paystack.
 * Same pattern as subscriptionService.initSubscriptionPayment.
 * Returns { authorization_url, reference }
 */
export async function initBoostPayment({ storeId, uid, email, productId, productName, durationDays }) {
  if (!storeId || !uid || !email) throw new Error("Authentication required.");
  if (!productId) throw new Error("Select a product to boost.");
  if (!BOOST_PRICING[durationDays]) throw new Error("Invalid boost duration.");

  const amountGHS = BOOST_PRICING[durationDays];

  const res = await fetch(`${API_URL}/api/payments/initialize`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      amount: amountGHS * 100,   // Paystack uses pesewas
      metadata: {
        type:         "boost",
        storeId,
        sellerId:     uid,
        productId,
        productName:  productName || "",
        durationDays: Number(durationDays),
        amountGHS,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Payment initialization failed.");
  return data?.data || data;
}

/**
 * Get all boosts for a store.
 * boosts collection is already in Firestore rules with allow read: if true
 */
export async function getStoreBoosts(storeId) {
  if (!storeId) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "boosts"),
        where("storeId", "==", storeId),
        orderBy("boostedAt", "desc"),
        limit(50)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(
      query(collection(db, "boosts"), where("storeId", "==", storeId))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.boostedAt?.toMillis?.() || 0) - (a.boostedAt?.toMillis?.() || 0));
  }
}

// ─────────────────────────────────────────────────────────────
// REFERRAL SYSTEM
// ─────────────────────────────────────────────────────────────

/**
 * Generate and save a referral code for a store.
 * Stores it on shops/{storeId}.referralCode
 */
export async function ensureReferralCode(storeId, shopData) {
  if (shopData?.referralCode) return shopData.referralCode;
  const code = genCode(6);
  await updateDoc(doc(db, "shops", storeId), { referralCode: code });
  return code;
}

/** Get all referrals where this seller is the referrer */
export async function getSellerReferrals(storeId) {
  if (!storeId) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "referrals"),
        where("referrerId", "==", storeId),
        orderBy("createdAt", "desc")
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(
      query(collection(db, "referrals"), where("referrerId", "==", storeId))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }
}

// ─────────────────────────────────────────────────────────────
// LOYALTY REWARDS
// ─────────────────────────────────────────────────────────────

/** Get loyalty config for a store (one doc: loyaltyConfig/{storeId}) */
export async function getLoyaltyConfig(storeId) {
  if (!storeId) return null;
  const snap = await getDoc(doc(db, "loyaltyConfig", storeId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Save (create or update) loyalty config.
 * @param {string} storeId
 * @param {object} config - { enabled, earnRate, redeemRate, minRedeemPoints }
 *   earnRate: points earned per GHS 1 spent (e.g. 1)
 *   redeemRate: GHS value of 1 point (e.g. 0.01 means 100pts = GHS 1)
 */
export async function saveLoyaltyConfig(storeId, uid, config) {
  if (!storeId || !uid) throw new Error("Authentication required.");
  const ref = doc(db, "loyaltyConfig", storeId);
  const snap = await getDoc(ref);

  const payload = {
    storeId,
    sellerId:          uid,
    enabled:           config.enabled ?? true,
    earnRate:          Number(config.earnRate) || 1,
    redeemRate:        Number(config.redeemRate) || 0.01,
    minRedeemPoints:   Number(config.minRedeemPoints) || 100,
    updatedAt:         serverTimestamp(),
  };

  if (snap.exists()) {
    await updateDoc(ref, payload);
  } else {
    const { setDoc } = await import("firebase/firestore");
    await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
  }

  // Also sync enabled flag to shops/{storeId} for marketplace reads
  await updateDoc(doc(db, "shops", storeId), {
    loyaltyEnabled:  payload.enabled,
    loyaltyEarnRate: payload.earnRate,
  });
}

/** Get top loyalty customers for a store (for the leaderboard display) */
export async function getLoyaltyLeaderboard(storeId, maxResults = 10) {
  if (!storeId) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "loyaltyPoints"),
        where("storeId", "==", storeId),
        orderBy("pointsBalance", "desc"),
        limit(maxResults)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(
      query(collection(db, "loyaltyPoints"), where("storeId", "==", storeId), limit(maxResults))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}