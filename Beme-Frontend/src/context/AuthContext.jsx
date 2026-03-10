import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();

  if (role === "super_admin") return "super_admin";
  if (role === "shop_admin") return "shop_admin";
  if (role === "admin") return "super_admin"; // backward compatibility
  if (role === "customer") return "customer";

  return "customer";
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
    return {
      role: "customer",
      shop: null,
      capabilities: [],
      profile: null,
    };
  }

  const data = snap.data() || {};
  const role = normalizeRole(data.role);
  const shop = data.shop ? String(data.shop).trim().toLowerCase() : null;
  const capabilities = normalizeCapabilities(data.capabilities);

  return {
    role,
    shop,
    capabilities,
    profile: {
      id: snap.id,
      ...data,
      role,
      shop,
      capabilities,
    },
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("guest");
  const [adminShop, setAdminShop] = useState(null);
  const [capabilities, setCapabilities] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);

      try {
        if (!u) {
          setUser(null);
          setRole("guest");
          setAdminShop(null);
          setCapabilities([]);
          setProfile(null);
          return;
        }

        setUser(u);

        const resolved = await resolveProfile(u.uid);

        setRole(resolved.role);
        setAdminShop(resolved.shop);
        setCapabilities(resolved.capabilities);
        setProfile(resolved.profile);
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

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const resolved = await resolveProfile(cred.user.uid);

    setUser(cred.user);
    setRole(resolved.role);
    setAdminShop(resolved.shop);
    setCapabilities(resolved.capabilities);
    setProfile(resolved.profile);

    return {
      user: cred.user,
      role: resolved.role,
      shop: resolved.shop,
      capabilities: resolved.capabilities,
      profile: resolved.profile,
    };
  };

  const signup = async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(
      doc(db, "users", cred.user.uid),
      {
        role: "customer",
        shop: null,
        capabilities: [],
        email,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    setUser(cred.user);
    setRole("customer");
    setAdminShop(null);
    setCapabilities([]);
    setProfile({
      id: cred.user.uid,
      role: "customer",
      shop: null,
      capabilities: [],
      email,
    });

    return {
      user: cred.user,
      role: "customer",
      shop: null,
      capabilities: [],
    };
  };

  const refreshProfile = async () => {
    if (!auth.currentUser?.uid) return null;

    const resolved = await resolveProfile(auth.currentUser.uid);

    setRole(resolved.role);
    setAdminShop(resolved.shop);
    setCapabilities(resolved.capabilities);
    setProfile(resolved.profile);

    return resolved;
  };

  const reauthenticate = async (password) => {
    if (!auth.currentUser?.email) {
      throw new Error("No signed-in admin found.");
    }

    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      String(password || "")
    );

    await reauthenticateWithCredential(auth.currentUser, credential);
    return true;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole("guest");
    setAdminShop(null);
    setCapabilities([]);
    setProfile(null);
  };

  const value = useMemo(() => {
    const isSuperAdmin = role === "super_admin";
    const isShopAdmin = role === "shop_admin";
    const isAdmin = isSuperAdmin || isShopAdmin;

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
      login,
      signup,
      logout,
      reauthenticate,
      refreshProfile,
    };
  }, [user, role, adminShop, capabilities, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}