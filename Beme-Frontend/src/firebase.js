import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBLvKbmD3N3nhpdl3g1rRLt0zuZa4Z6sBs",
  authDomain: "beme-market.firebaseapp.com",
  projectId: "beme-market",
  storageBucket: "beme-market.firebasestorage.app",
  messagingSenderId: "1032518392050",
  appId: "1:1032518392050:web:1e142a128f27e67e36986b",
  measurementId: "G-0YMHB6KK0L"
};

// ✅ Prevent silent “blank page” by failing loudly in console
const missing = Object.entries(firebaseConfig).filter(([, v]) => !v);
if (missing.length) {
  console.error(
    "❌ Missing Firebase env vars:",
    missing.map(([k]) => k)
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;