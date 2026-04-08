import admin from "firebase-admin";
import { env } from "./env.js";

let firebaseApp = null;

export const initFirebase = () => {
  if (!firebaseApp) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    console.log("🔥 Firebase initialized");
  }
};

export default admin;
