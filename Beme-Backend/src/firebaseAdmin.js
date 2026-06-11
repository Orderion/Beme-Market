// src/firebaseAdmin.js
import admin from "firebase-admin";

function initAdmin() {
  if (admin.apps.length) return admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON in backend env");

  // ADDED: try/catch so a malformed env var gives a clear error instead of crashing silently
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (parseError) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. ` +
      `Check your environment variable for missing quotes, line breaks, or escape issues. ` +
      `Parse error: ${parseError.message}`
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin;
}

export const firebaseAdmin = initAdmin();
export const adminDb = firebaseAdmin.firestore();