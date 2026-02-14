// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBLvKbmD3N3nhpdl3g1rRLt0zuZa4Z6sBs",
  authDomain: "beme-market.firebaseapp.com",
  projectId: "beme-market",
  storageBucket: "beme-market.firebasestorage.app",
  messagingSenderId: "1032518392050",
  appId: "1:1032518392050:web:1e142a128f27e67e36986b",
  measurementId: "G-0YMHB6KK0L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);