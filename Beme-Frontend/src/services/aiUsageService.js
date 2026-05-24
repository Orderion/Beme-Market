import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const DAILY_LIMIT = 15;
function today() { return new Date().toISOString().split("T")[0]; }

export async function getDailyUsage(uid) {
  if (!uid) return { count:0, date:today(), extraCredits:0, dailyLimit:DAILY_LIMIT };
  const snap = await getDoc(doc(db,"aiUsage",uid));
  if (!snap.exists()) return { count:0, date:today(), extraCredits:0, dailyLimit:DAILY_LIMIT };
  const d = snap.data();
  if (d.date !== today()) return { count:0, date:today(), extraCredits:d.extraCredits||0, dailyLimit:DAILY_LIMIT };
  return { count:d.count||0, date:d.date||today(), extraCredits:d.extraCredits||0, dailyLimit:DAILY_LIMIT };
}

export async function incrementUsage(uid) {
  if (!uid) return { success:false, reason:"no_user" };
  const ref  = doc(db,"aiUsage",uid);
  const snap = await getDoc(ref);
  const t    = today();
  if (!snap.exists()) {
    await setDoc(ref,{ count:1, date:t, extraCredits:0, lastUpdated:serverTimestamp() });
    return { success:true, newCount:1, remaining:DAILY_LIMIT-1 };
  }
  const d = snap.data();
  if (d.date !== t) {
    await setDoc(ref,{ count:1, date:t, extraCredits:d.extraCredits||0, lastUpdated:serverTimestamp() });
    return { success:true, newCount:1, remaining:DAILY_LIMIT-1 };
  }
  const count  = d.count||0;
  const extra  = d.extraCredits||0;
  const limit  = DAILY_LIMIT+extra;
  if (count >= limit) return { success:false, reason:"limit_reached", newCount:count, remaining:0 };
  if (count >= DAILY_LIMIT && extra > 0) {
    await updateDoc(ref,{ count:increment(1), extraCredits:increment(-1), lastUpdated:serverTimestamp() });
  } else {
    await updateDoc(ref,{ count:increment(1), lastUpdated:serverTimestamp() });
  }
  return { success:true, newCount:count+1, remaining:Math.max(0,limit-count-1) };
}

export async function canSendMessage(uid) {
  const u = await getDailyUsage(uid);
  const t = today();
  if (u.date !== t) return { canSend:true, remaining:DAILY_LIMIT };
  const rem = Math.max(0, DAILY_LIMIT+(u.extraCredits||0)-u.count);
  return { canSend:rem>0, remaining:rem };
}

export async function addExtraCredits(uid, pack) {
  if (!uid) return;
  const PACKS = { small:50, medium:200, unlimited_week:9999 };
  const credits = PACKS[pack]||0;
  if (!credits) return;
  const ref  = doc(db,"aiUsage",uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref,{ count:0, date:today(), extraCredits:credits, lastUpdated:serverTimestamp() });
  } else {
    await updateDoc(ref,{ extraCredits:increment(credits), lastUpdated:serverTimestamp() });
  }
  await setDoc(doc(db,"aiTopups",`${uid}_${Date.now()}`),{ uid, pack, credits, purchasedAt:serverTimestamp() });
}
