// src/firebaseAdmin.js
import admin from "firebase-admin";

function initAdmin() {
  if (admin.apps.length) return admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON in backend env");

  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin;
}

export const firebaseAdmin = initAdmin();
export const adminDb = firebaseAdmin.firestore();