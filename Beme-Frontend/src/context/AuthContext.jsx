import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
// Role normalisation
//   "super_admin" | "admin" (legacy) → "super_admin"
//   "seller"                         → "seller"       ← NEW
//   everything else                  → "customer"
//   NOTE: "shop_admin" is intentionally REMOVED — superseded by "seller"
// ─────────────────────────────────────────────────────────────────────────────
function normalizeRole(value) {
  const r = String(value || "").trim().toLowerCase();
  if (r === "super_admin" || r === "admin") return "super_admin";
  if (r === "seller") return "seller"; // ← NEW
  return "customer";
}

function normalizeCapabilities(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return Object.keys(raw).filter((k) => raw[k]);
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore profile resolver
// ─────────────────────────────────────────────────────────────────────────────
async function resolveProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    return {
      role: "customer",
      capabilities: [],
      profile: null,
      // seller fields
      sellerStatus: "none",
      storeId: null,
      subscriptionPlan: null,
      subscriptionStatus: null,
    };
  }
  const data = snap.data() || {};
  const role         = normalizeRole(data.role);
  const capabilities = normalizeCapabilities(data.capabilities);

  // ── Seller-specific fields (only meaningful when role === "seller") ────────
  const sellerStatus      = data.sellerStatus      || "none";
  const storeId           = data.storeId           || null;
  const subscriptionPlan  = data.subscriptionPlan  || "basic";
  const subscriptionStatus = data.subscriptionStatus || null;
  const sellerVerified    = data.sellerVerified    || false;

  return {
    role,
    capabilities,
    sellerStatus,
    storeId,
    subscriptionPlan,
    subscriptionStatus,
    sellerVerified,
    profile: {
      id: snap.id,
      ...data,
      // normalised overrides
      role,
      capabilities,
      sellerStatus,
      storeId,
      subscriptionPlan,
      subscriptionStatus,
      sellerVerified,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,           setUser]           = useState(null);
  const [role,           setRole]           = useState("customer");
  const [capabilities,   setCapabilities]   = useState([]);
  const [emailVerified,  setEmailVerified]  = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [profile,        setProfile]        = useState(null);

  // ── Seller state ────────────────────────────────────────────────────────────
  const [sellerStatus,      setSellerStatus]      = useState("none");
  const [storeId,           setStoreId]           = useState(null);
  const [subscriptionPlan,  setSubscriptionPlan]  = useState("basic");
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [sellerVerified,    setSellerVerified]    = useState(false);

  // ── Internal: load profile and set all state ────────────────────────────────
  const _applyProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setRole("customer");
      setCapabilities([]);
      setEmailVerified(false);
      setProfile(null);
      setSellerStatus("none");
      setStoreId(null);
      setSubscriptionPlan("basic");
      setSubscriptionStatus(null);
      setSellerVerified(false);
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

  // ── Firebase auth state listener ────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      await _applyProfile(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, [_applyProfile]);

  // ── Auth actions ────────────────────────────────────────────────────────────
  const signup = useCallback(async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    // Create basic user doc in Firestore
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      role:        "customer",
      capabilities: [],
      // seller defaults
      sellerStatus:     "none",
      storeId:          null,
      subscriptionPlan: null,
      subscriptionStatus: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return cred;
  }, []);

  const login = useCallback(
    (email, password) => signInWithEmailAndPassword(auth, email, password),
    []
  );

  const logout = useCallback(() => signOut(auth), []);

  /** Re-reads Firestore profile (e.g. after a Cloud Function upgrades the user to seller). */
  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    await _applyProfile(auth.currentUser);
  }, [_applyProfile]);

  /** Reloads the Firebase Auth user object (e.g. to pick up emailVerified). */
  const reloadUser = useCallback(async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    setEmailVerified(auth.currentUser.emailVerified);
  }, []);

  // ── Derived booleans ────────────────────────────────────────────────────────
  const isSuperAdmin   = role === "super_admin";
  const isAdmin        = role === "super_admin"; // alias kept for existing components
  const isSeller       = role === "seller";                                  // NEW
  const isSellerActive = isSeller && sellerStatus === "active";              // NEW
  const isSellerGrace  = isSeller && sellerStatus === "grace";               // NEW
  const isBuyer        = role === "customer" || role === "seller";           // sellers can also buy

  const value = {
    // Firebase user
    user,
    loading,
    emailVerified,

    // Role
    role,
    capabilities,
    profile,

    // Role booleans (existing)
    isSuperAdmin,
    isAdmin,

    // ── NEW: Seller role booleans ──────────────────────────────────────────
    isSeller,
    isSellerActive,
    isSellerGrace,
    isBuyer,

    // ── NEW: Seller profile fields ─────────────────────────────────────────
    sellerStatus,
    storeId,
    subscriptionPlan,
    subscriptionStatus,
    sellerVerified,

    // Auth actions
    login,
    signup,
    logout,
    refreshProfile,
    reloadUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

