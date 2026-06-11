// src/services/aiUsageService.js
import {
  doc, getDoc, setDoc, updateDoc, increment, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

const PLAN_AI_LIMITS = {
  basic: 0, free: 0, starter: 50, growth: 100, standard: 100, pro: 1000,
};

export async function getDailyUsage(uid) {
  if (!uid) return { count:0, date:getTodayString(), extraCredits:0, dailyLimit:0 };
  const snap = await getDoc(doc(db, "aiUsage", uid));
  if (!snap.exists()) return { count:0, date:getTodayString(), extraCredits:0, dailyLimit:0 };
  const data = snap.data(); const today = getTodayString();
  if (data.date !== today) return { count:0, date:today, extraCredits:data.extraCredits||0, dailyLimit:0 };
  return { count:data.count||0, date:data.date||today, extraCredits:data.extraCredits||0, dailyLimit:0 };
}

export async function incrementUsage(uid, planId = "basic") {
  if (!uid) return { success:false, reason:"no_user" };

  const planLimit = PLAN_AI_LIMITS[planId] ?? 0;
  if (planLimit === 0) return { success:false, reason:"no_access", message:"Upgrade your plan to use Beme AI." };

  const ref   = doc(db, "aiUsage", uid);
  const snap  = await getDoc(ref);
  const today = getTodayString();

  if (!snap.exists()) {
    await setDoc(ref, { count:1, date:today, extraCredits:0, lastUpdated:serverTimestamp() });
    return { success:true, newCount:1, remaining:planLimit - 1 };
  }

  const data  = snap.data();

  // New day — reset count
  if (data.date !== today) {
    await setDoc(ref, { count:1, date:today, extraCredits:data.extraCredits||0, lastUpdated:serverTimestamp() });
    return { success:true, newCount:1, remaining:planLimit - 1 };
  }

  const currentCount   = data.count || 0;
  const extraCredits   = data.extraCredits || 0;
  const effectiveLimit = planLimit + extraCredits;

  if (currentCount >= effectiveLimit) {
    return { success:false, reason:"limit_reached", newCount:currentCount, remaining:0 };
  }

  // Deduct from extra credits first if over base plan limit
  if (currentCount >= planLimit && extraCredits > 0) {
    await updateDoc(ref, { count:increment(1), extraCredits:increment(-1), lastUpdated:serverTimestamp() });
  } else {
    await updateDoc(ref, { count:increment(1), lastUpdated:serverTimestamp() });
  }

  const newCount = currentCount + 1;
  return { success:true, newCount, remaining:Math.max(0, effectiveLimit - newCount) };
}

export async function canSendMessage(uid, planId = "basic") {
  const planLimit = PLAN_AI_LIMITS[planId] ?? 0;
  if (planLimit === 0) return { canSend:false, remaining:0, reason:"no_access" };
  const usage = await getDailyUsage(uid);
  const today = getTodayString();
  if (usage.date !== today) return { canSend:true, remaining:planLimit };
  const effective = planLimit + (usage.extraCredits || 0);
  const remaining = Math.max(0, effective - usage.count);
  return { canSend:remaining > 0, remaining };
}

/* ── Add extra credits (called AFTER payment verified) ── */
export async function addExtraCredits(uid, pack) {
  if (!uid) return;
  const PACKS = { small:50, medium:200, unlimited_week:9999 };
  const credits = PACKS[pack] || 0;
  if (!credits) return;

  const ref  = doc(db, "aiUsage", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { count:0, date:getTodayString(), extraCredits:credits, lastUpdated:serverTimestamp() });
  } else {
    await updateDoc(ref, { extraCredits:increment(credits), lastUpdated:serverTimestamp() });
  }
  await setDoc(doc(db, "aiTopups", `${uid}_${Date.now()}`), {
    uid, pack, credits, purchasedAt:serverTimestamp(),
  });
}