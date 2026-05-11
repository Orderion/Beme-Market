import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  // NOTE: sendEmailVerification intentionally removed.
  // The Cloud Function `sendVerificationOnSignup` in functions/index.js
  // fires on auth.user().onCreate and sends the email via Brevo SMTP
  // from your custom verified domain — no client-side call needed.
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "super_admin") return "super_admin";
  if (role === "admin")       return "super_admin";
  if (role === "shop_admin")  return "shop_admin";
  if (role === "customer")    return "customer";
  return "customer";
}

function normalizeShop(value) {
  const shop = String(value || "").trim().toLowerCase();
  return shop || null;
}

function normalizeCapabilities(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
}

async function resolveProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    return { role: "customer", shop: null, capabilities: [], profile: null };
  }
  const data         = snap.data() || {};
  const role         = normalizeRole(data.role);
  const shop         = normalizeShop(data.shop);
  const capabilities = normalizeCapabilities(data.capabilities);
  return {
    role,
    shop,
    capabilities,
    profile: { id: snap.id, ...data, role, shop, capabilities },
  };
}

function buildInitialState() {
  return {
    user:         null,
    role:         "guest",
    adminShop:    null,
    capabilities: [],
    profile:      null,
    loading:      true,
  };
}

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(buildInitialState().user);
  const [role,         setRole]         = useState(buildInitialState().role);
  const [adminShop,    setAdminShop]    = useState(buildInitialState().adminShop);
  const [capabilities, setCapabilities] = useState(buildInitialState().capabilities);
  const [profile,      setProfile]      = useState(buildInitialState().profile);
  const [loading,      setLoading]      = useState(buildInitialState().loading);

  const clearAuthState = () => {
    setUser(null);
    setRole("guest");
    setAdminShop(null);
    setCapabilities([]);
    setProfile(null);
  };

  const applyResolvedProfile = (firebaseUser, resolved) => {
    setUser(firebaseUser || null);
    setRole(resolved?.role        || "customer");
    setAdminShop(resolved?.shop   || null);
    setCapabilities(resolved?.capabilities || []);
    setProfile(resolved?.profile  || null);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      try {
        if (!u) { clearAuthState(); return; }
        const resolved = await resolveProfile(u.uid);
        applyResolvedProfile(u, resolved);
      } catch (error) {
        console.error("Auth role resolution error:", error);
        setUser(u || null);
        setRole(u ? "customer" : "guest");
        setAdminShop(null);
        setCapabilities([]);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const cred     = await signInWithEmailAndPassword(auth, email, password);
      const resolved = await resolveProfile(cred.user.uid);
      applyResolvedProfile(cred.user, resolved);
      return {
        user:         cred.user,
        role:         resolved.role,
        shop:         resolved.shop,
        capabilities: resolved.capabilities,
        profile:      resolved.profile,
      };
    } finally {
      setLoading(false);
    }
  };

  // ── SIGNUP ────────────────────────────────────────────────────────────────
  // Creates the Firebase Auth account + Firestore user document.
  // The verification email is sent automatically by the Cloud Function
  // `sendVerificationOnSignup` (functions/index.js) via Brevo SMTP.
  // Caller navigates to /verify-email immediately after this resolves.
  const signup = async (email, password) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Write Firestore user document (wrapped so a rule rejection can't
      // undo a successful Auth account creation)
      try {
        await setDoc(
          doc(db, "users", cred.user.uid),
          {
            role:          "customer",
            shop:          null,
            capabilities:  [],
            email:         String(email || "").trim().toLowerCase(),
            emailVerified: false,
            createdAt:     serverTimestamp(),
            updatedAt:     serverTimestamp(),
          },
          { merge: true }
        );
      } catch (firestoreError) {
        console.error("Could not write user document after signup:", firestoreError);
      }

      const resolved = {
        role:         "customer",
        shop:         null,
        capabilities: [],
        profile: {
          id:           cred.user.uid,
          role:         "customer",
          shop:         null,
          capabilities: [],
          email:        String(email || "").trim().toLowerCase(),
        },
      };

      applyResolvedProfile(cred.user, resolved);

      return {
        user:         cred.user,
        role:         resolved.role,
        shop:         resolved.shop,
        capabilities: resolved.capabilities,
        profile:      resolved.profile,
      };
    } finally {
      setLoading(false);
    }
  };

  // ── RELOAD USER ───────────────────────────────────────────────────────────
  // Fetches a fresh token from Firebase and returns the up-to-date
  // emailVerified flag. Used by VerifyEmail.jsx on the "I've verified" button.
  const reloadUser = async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    return auth.currentUser.emailVerified;
  };

  // ── REFRESH PROFILE ───────────────────────────────────────────────────────
  const refreshProfile = async () => {
    if (!auth.currentUser?.uid) return null;
    setLoading(true);
    try {
      const resolved = await resolveProfile(auth.currentUser.uid);
      applyResolvedProfile(auth.currentUser, resolved);
      return resolved;
    } finally {
      setLoading(false);
    }
  };

  // ── REAUTHENTICATE ────────────────────────────────────────────────────────
  const reauthenticate = async (password) => {
    if (!auth.currentUser?.email) throw new Error("No signed-in admin found.");
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      String(password || "")
    );
    await reauthenticateWithCredential(auth.currentUser, credential);
    return true;
  };

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      clearAuthState();
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(() => {
    const isSuperAdmin = role === "super_admin";
    const isShopAdmin  = false;
    const isAdmin      = isSuperAdmin;

    const hasCapability = (capability) => {
      const key = String(capability || "").trim().toLowerCase();
      if (!key)         return false;
      if (isSuperAdmin) return true;
      return capabilities.includes(key);
    };

    return {
      user,
      role,
      adminShop,
      capabilities,
      profile,
      loading,
      isAdmin,
      isSuperAdmin,
      isShopAdmin,
      emailVerified: user?.emailVerified ?? false,
      hasCapability,
      login,
      signup,
      logout,
      reauthenticate,
      refreshProfile,
      reloadUser,
    };
  }, [user, role, adminShop, capabilities, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}