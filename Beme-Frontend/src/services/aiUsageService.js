import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const DAILY_LIMIT = 20;

function getTodayString() {
  return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
}

/**
 * Get today's usage doc for a seller.
 * Returns { count, date, extraCredits, dailyLimit }
 */
export async function getDailyUsage(uid) {
  if (!uid) return { count: 0, date: getTodayString(), extraCredits: 0, dailyLimit: DAILY_LIMIT };

  const ref  = doc(db, "aiUsage", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { count: 0, date: getTodayString(), extraCredits: 0, dailyLimit: DAILY_LIMIT };
  }

  const data  = snap.data();
  const today = getTodayString();

  // Reset if it's a new day
  if (data.date !== today) {
    return { count: 0, date: today, extraCredits: data.extraCredits || 0, dailyLimit: DAILY_LIMIT };
  }

  return {
    count:        data.count        || 0,
    date:         data.date         || today,
    extraCredits: data.extraCredits || 0,
    dailyLimit:   DAILY_LIMIT,
  };
}

/**
 * Increment the daily message count for a seller.
 * Resets count if it's a new day.
 * Returns { success, newCount, remaining }
 */
export async function incrementUsage(uid) {
  if (!uid) return { success: false, reason: "no_user" };

  const ref   = doc(db, "aiUsage", uid);
  const snap  = await getDoc(ref);
  const today = getTodayString();

  if (!snap.exists()) {
    // First message ever
    await setDoc(ref, {
      count:        1,
      date:         today,
      extraCredits: 0,
      lastUpdated:  serverTimestamp(),
    });
    return { success: true, newCount: 1, remaining: DAILY_LIMIT - 1 };
  }

  const data = snap.data();

  // New day — reset
  if (data.date !== today) {
    await setDoc(ref, {
      count:        1,
      date:         today,
      extraCredits: data.extraCredits || 0,
      lastUpdated:  serverTimestamp(),
    });
    return { success: true, newCount: 1, remaining: DAILY_LIMIT - 1 };
  }

  const currentCount   = data.count        || 0;
  const extraCredits   = data.extraCredits  || 0;
  const effectiveLimit = DAILY_LIMIT + extraCredits;

  if (currentCount >= effectiveLimit) {
    return {
      success:   false,
      reason:    "limit_reached",
      newCount:  currentCount,
      remaining: 0,
    };
  }

  // Deduct from extraCredits first if over base limit
  if (currentCount >= DAILY_LIMIT && extraCredits > 0) {
    await updateDoc(ref, {
      count:        increment(1),
      extraCredits: increment(-1),
      lastUpdated:  serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      count:       increment(1),
      lastUpdated: serverTimestamp(),
    });
  }

  const newCount = currentCount + 1;
  return {
    success:   true,
    newCount,
    remaining: Math.max(0, effectiveLimit - newCount),
  };
}

/**
 * Check if a seller can send a message without incrementing.
 */
export async function canSendMessage(uid) {
  const usage = await getDailyUsage(uid);
  const today = getTodayString();

  // If it's a new day, they can always send
  if (usage.date !== today) return { canSend: true, remaining: DAILY_LIMIT };

  const effective = DAILY_LIMIT + (usage.extraCredits || 0);
  const remaining = Math.max(0, effective - usage.count);
  return { canSend: remaining > 0, remaining };
}

/**
 * Add extra credits to a seller's account (called after payment).
 * pack: "small" = 50, "medium" = 200, "unlimited_week" = 9999
 */
export async function addExtraCredits(uid, pack) {
  if (!uid) return;

  const PACKS = { small: 50, medium: 200, unlimited_week: 9999 };
  const credits = PACKS[pack] || 0;
  if (!credits) return;

  const ref  = doc(db, "aiUsage", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      count:        0,
      date:         getTodayString(),
      extraCredits: credits,
      lastUpdated:  serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      extraCredits: increment(credits),
      lastUpdated:  serverTimestamp(),
    });
  }

  // Log the topup
  await setDoc(doc(db, "aiTopups", `${uid}_${Date.now()}`), {
    uid,
    pack,
    credits,
    purchasedAt: serverTimestamp(),
  });
}