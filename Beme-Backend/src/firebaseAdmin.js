// src/firebaseAdmin.js
import admin from "firebase-admin";

function initFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (svcJson) {
    const serviceAccount = JSON.parse(svcJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin;
  }

  // Fallback: if running in an environment with GOOGLE_APPLICATION_CREDENTIALS
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  return admin;
}

const firebaseAdmin = initFirebaseAdmin();
export const dbAdmin = firebaseAdmin.firestore();
export default firebaseAdmin;