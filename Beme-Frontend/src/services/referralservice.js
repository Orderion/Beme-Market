// src/services/referralService.js
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, limit, serverTimestamp, increment,
} from "firebase/firestore";
import { db } from "../firebase";

/* ── Reward amounts per plan ── */
export const REFERRAL_REWARDS = {
  starter: 1,
  growth:  3,
  pro:     7,
};

export const REFERRAL_MIN_WITHDRAW = 100;

/* ── Generate or get referral code for a seller ── */
export async function getOrCreateReferralCode(uid, shopName = "") {
  const ref  = doc(db, "storeApplications", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data();
  if (data.referralCode) return data.referralCode;

  // Generate code from shop name or uid
  const base = (shopName || uid).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
  const rand  = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code  = `${base}${rand}`;

  await updateDoc(ref, { referralCode: code });
  return code;
}

/* ── Validate a referral code at onboarding ── */
export async function validateReferralCode(code) {
  if (!code?.trim()) throw new Error("No code provided.");
  const snap = await getDocs(query(
    collection(db, "storeApplications"),
    where("referralCode", "==", code.trim().toUpperCase()),
    limit(1),
  ));
  if (snap.empty) throw new Error("Invalid referral code.");
  const d = snap.docs[0];
  return { referrerId: d.id, referrerCode: d.data().referralCode };
}

/* ── Credit referrer after new seller subscribes to paid plan ── */
export async function creditReferral({ referrerCode, newSellerUid, newSellerEmail, planId }) {
  if (!referrerCode || !newSellerUid || !planId) return;

  const rewardAmount = REFERRAL_REWARDS[planId.toLowerCase()] || 0;
  if (!rewardAmount) return; // basic plan = no reward

  // Find referrer
  const snap = await getDocs(query(
    collection(db, "storeApplications"),
    where("referralCode", "==", referrerCode.toUpperCase()),
    limit(1),
  ));
  if (snap.empty) return;

  const referrerId   = snap.docs[0].id;
  const referrerData = snap.docs[0].data();

  // Check not self-referral
  if (referrerId === newSellerUid) return;

  // Check if this newSeller was already credited
  const existing = await getDocs(query(
    collection(db, "referrals"),
    where("referredUid", "==", newSellerUid),
    where("referrerId",  "==", referrerId),
    limit(1),
  ));
  if (!existing.empty) return; // already credited

  // Create referral record
  await addDoc(collection(db, "referrals"), {
    referrerId,
    referrerCode:    referrerCode.toUpperCase(),
    referredUid:     newSellerUid,
    referredEmail:   newSellerEmail || "",
    planId:          planId.toLowerCase(),
    rewardAmount,
    status:          "activated",
    createdAt:       serverTimestamp(),
    creditedAt:      serverTimestamp(),
  });

  // Add to referrer's earnings balance in storeApplications
  await updateDoc(doc(db, "storeApplications", referrerId), {
    referralEarnings: increment(rewardAmount),
    totalReferrals:   increment(1),
  });
}

/* ── Fetch referrals for a seller ── */
export async function getSellerReferrals(uid) {
  const snap = await getDocs(query(
    collection(db, "referrals"),
    where("referrerId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(100),
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ── Get referral earnings balance ── */
export async function getReferralBalance(uid) {
  const snap = await getDoc(doc(db, "storeApplications", uid));
  if (!snap.exists()) return 0;
  return Number(snap.data().referralEarnings || 0);
}

/* ── Submit referral withdrawal request ── */
export async function submitReferralWithdrawal({ sellerId, amount, accountType, accountNumber, accountName, network }) {
  if (amount < REFERRAL_MIN_WITHDRAW) throw new Error(`Minimum withdrawal is GHS ${REFERRAL_MIN_WITHDRAW}.`);

  // Check current balance
  const balance = await getReferralBalance(sellerId);
  if (amount > balance) throw new Error("Amount exceeds your referral balance.");

  // Create withdrawal request (same collection as payouts, with type: "referral")
  await addDoc(collection(db, "withdrawalRequests"), {
    sellerId,
    amount,
    type:        "referral",
    accountType,
    accountNumber,
    accountName,
    network:     network || null,
    status:      "pending",
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });

  // Deduct from balance
  await updateDoc(doc(db, "storeApplications", sellerId), {
    referralEarnings: increment(-amount),
  });
}