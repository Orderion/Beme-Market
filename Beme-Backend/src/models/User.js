// src/models/User.js
// Firestore-based "User model" helper (NO mongoose)

import { db } from "../firebaseAdmin.js";

/**
 * Collection reference: users/{uid}
 * Recommended doc shape:
 * {
 *   name: string,
 *   email: string,
 *   createdAt: Timestamp/Date,
 *   updatedAt: Timestamp/Date
 * }
 */

const usersCol = db.collection("users");

export async function createUserDoc(uid, data) {
  if (!uid) throw new Error("createUserDoc: uid is required");
  if (!data?.email) throw new Error("createUserDoc: email is required");

  const payload = {
    name: data.name || "",
    email: data.email,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await usersCol.doc(uid).set(payload, { merge: true });
  return payload;
}

export async function getUserById(uid) {
  if (!uid) throw new Error("getUserById: uid is required");

  const snap = await usersCol.doc(uid).get();
  if (!snap.exists) return null;

  return { id: snap.id, ...snap.data() };
}

export async function getUserByEmail(email) {
  if (!email) throw new Error("getUserByEmail: email is required");

  const q = await usersCol.where("email", "==", email).limit(1).get();
  if (q.empty) return null;

  const doc = q.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function updateUser(uid, data) {
  if (!uid) throw new Error("updateUser: uid is required");
  if (!data || typeof data !== "object") throw new Error("updateUser: data object is required");

  const payload = {
    ...data,
    updatedAt: new Date(),
  };

  await usersCol.doc(uid).set(payload, { merge: true });
  const updated = await usersCol.doc(uid).get();

  return { id: updated.id, ...updated.data() };
}

export async function deleteUser(uid) {
  if (!uid) throw new Error("deleteUser: uid is required");

  await usersCol.doc(uid).delete();
  return true;
}