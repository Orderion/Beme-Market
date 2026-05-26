import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  reload,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

function normalizeRole(value) {
  const r = String(value || "").trim().toLowerCase();
  if (r === "super_admin" || r === "admin") return "super_admin";
  if (r === "seller") return "seller";
  return "customer";
}

function normalizeCapabilities(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return Object.keys(raw).filter((k) => raw[k]);
  return [];
}

async function resolveProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    return {
      role: "customer", capabilities: [],
      profile: null, sellerStatus: "none",
      storeId: null, subscriptionPlan: null, subscriptionStatus: null,
    };
  }
  const data = snap.data() || {};
  const role           = normalizeRole(data.role);
  const capabilities   = normalizeCapabilities(data.capabilities);
  const sellerStatus   = data.sellerStatus      || "none";
  const storeId        = data.storeId           || null;
  const subscriptionPlan   = data.subscriptionPlan   || "basic";
  const subscriptionStatus = data.subscriptionStatus || null;
  const sellerVerified = data.sellerVerified    || false;
  return {
    role, capabilities, sellerStatus, storeId,
    subscriptionPlan, subscriptionStatus, sellerVerified,
    profile: { id: snap.id, ...data, role, capabilities,
      sellerStatus, storeId, subscriptionPlan, subscriptionStatus, sellerVerified },
  };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,              setUser]              = useState(null);
  const [role,              setRole]              = useState("customer");
  const [capabilities,      setCapabilities]      = useState([]);
  const [emailVerified,     setEmailVerified]     = useState(false);
  const [loading,           setLoading]           = useState(true);
  const [profile,           setProfile]           = useState(null);
  const [sellerStatus,      setSellerStatus]      = useState("none");
  const [storeId,           setStoreId]           = useState(null);
  const [subscriptionPlan,  setSubscriptionPlan]  = useState("basic");
  const [subscriptionStatus,setSubscriptionStatus]= useState(null);
  const [sellerVerified,    setSellerVerified]    = useState(false);

  const _applyProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null); setRole("customer"); setCapabilities([]);
      setEmailVerified(false); setProfile(null); setSellerStatus("none");
      setStoreId(null); setSubscriptionPlan("basic");
      setSubscriptionStatus(null); setSellerVerified(false);
      return;
    }
    const resolved = await resolveProfile(firebaseUser.uid);
    setUser(firebaseUser);
    setRole(resolved.role);
    setCapabilities(resolved.capabilities);
    setEmailVerified(firebaseUser.emailVerified);
    setProfile(resolved.profile);
    setSellerStatus(resolved.sellerStatus);
    setStoreId(resolved.storeId);
    setSubscriptionPlan(resolved.subscriptionPlan);
    setSubscriptionStatus(resolved.subscriptionStatus);
    setSellerVerified(resolved.sellerVerified || false);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      await _applyProfile(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, [_applyProfile]);

  /* ── signup — NO sendEmailVerification here.
     Our backend /api/auth/send-verification sends the branded email. ── */
  const signup = useCallback(async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Create Firestore user doc
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      role:              "customer",
      capabilities:      [],
      sellerStatus:      "none",
      storeId:           null,
      subscriptionPlan:  null,
      subscriptionStatus:null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return cred;
    // NOTE: Branded verification email is sent by Signup.jsx
    //       calling POST /api/auth/send-verification after this resolves.
  }, []);

  const login  = useCallback((email, password) => signInWithEmailAndPassword(auth, email, password), []);
  const logout = useCallback(() => signOut(auth), []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    await _applyProfile(auth.currentUser);
  }, [_applyProfile]);

  const reloadUser = useCallback(async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    setEmailVerified(auth.currentUser.emailVerified);
  }, []);

  const isSuperAdmin   = role === "super_admin";
  const isAdmin        = role === "super_admin";
  const isSeller       = role === "seller";
  const isSellerActive = isSeller && sellerStatus === "active";
  const isSellerGrace  = isSeller && sellerStatus === "grace";
  const isBuyer        = role === "customer" || role === "seller";

  const value = {
    user, loading, emailVerified,
    role, capabilities, profile,
    isSuperAdmin, isAdmin,
    isSeller, isSellerActive, isSellerGrace, isBuyer,
    sellerStatus, storeId, subscriptionPlan, subscriptionStatus, sellerVerified,
    login, signup, logout, refreshProfile, reloadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
