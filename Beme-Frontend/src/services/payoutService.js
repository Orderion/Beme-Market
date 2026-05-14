// src/services/payoutService.js
import {
  collection, addDoc, getDocs, query, where,
  orderBy, serverTimestamp, doc, updateDoc, getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export const PAYOUT_METHODS = {
  momo: { label: "Mobile Money", networks: ["MTN", "Telecel", "AirtelTigo"] },
  bank: { label: "Bank Transfer", banks: ["GCB Bank", "Ecobank", "Absa", "Standard Chartered", "Fidelity Bank", "Cal Bank", "Zenith Bank", "UBA Ghana", "Access Bank", "GTBank", "Other"] },
};

export const MIN_WITHDRAWAL = 50;

/**
 * submitWithdrawalRequest — creates a new payout request.
 * Status starts as "pending" — super_admin must approve.
 */
export async function submitWithdrawalRequest({ sellerId, shopId, amount, method, momoNumber, momoNetwork, accountName, bankName, bankAccount }) {
  if (Number(amount) < MIN_WITHDRAWAL) {
    throw new Error(`Minimum withdrawal is GHS ${MIN_WITHDRAWAL}.`);
  }
  return await addDoc(collection(db, "withdrawalRequests"), {
    sellerId, shopId,
    amount:      Number(amount),
    currency:    "GHS",
    method:      method || "momo",
    momoNumber:  momoNumber || null,
    momoNetwork: momoNetwork || null,
    accountName: String(accountName || "").trim(),
    bankName:    bankName || null,
    bankAccount: bankAccount || null,
    status:      "pending",
    adminNote:   null,
    reviewedBy:  null,
    reviewedAt:  null,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });
}

/**
 * getWithdrawalRequests — for sellers, gets their own requests.
 */
export async function getSellerWithdrawals(sellerId) {
  const snap = await getDocs(
    query(
      collection(db, "withdrawalRequests"),
      where("sellerId", "==", sellerId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * getAllWithdrawalRequests — for super_admin, gets all pending requests.
 */
export async function getAllWithdrawalRequests(statusFilter = null) {
  let q = query(collection(db, "withdrawalRequests"), orderBy("createdAt", "desc"));
  if (statusFilter) {
    q = query(collection(db, "withdrawalRequests"), where("status", "==", statusFilter), orderBy("createdAt", "desc"));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * approveWithdrawal — super_admin approves a payout request.
 */
export async function approveWithdrawal(requestId, adminId, note = "") {
  await updateDoc(doc(db, "withdrawalRequests", requestId), {
    status:     "approved",
    adminNote:  note || null,
    reviewedBy: adminId,
    reviewedAt: serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });
}

/**
 * rejectWithdrawal — super_admin rejects a payout request.
 */
export async function rejectWithdrawal(requestId, adminId, reason) {
  await updateDoc(doc(db, "withdrawalRequests", requestId), {
    status:     "rejected",
    adminNote:  String(reason || "").trim(),
    reviewedBy: adminId,
    reviewedAt: serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });
}

