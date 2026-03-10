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
  if (role === "admin") return "admin";
  if (role === "customer") return "customer";
  return "customer";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("guest");
  const [loading, setLoading] = useState(true);

  const resolveRole = async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return "customer";
    return normalizeRole(snap.data()?.role);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);

      try {
        if (!u) {
          setUser(null);
          setRole("guest");
          return;
        }

        setUser(u);
        const resolvedRole = await resolveRole(u.uid);
        setRole(resolvedRole);
      } catch (error) {
        console.error("Auth role resolution error:", error);
        setUser(u || null);
        setRole(u ? "customer" : "guest");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const resolvedRole = await resolveRole(cred.user.uid);
    setUser(cred.user);
    setRole(resolvedRole);
    return { user: cred.user, role: resolvedRole };
  };

  const signup = async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(
      doc(db, "users", cred.user.uid),
      {
        role: "customer",
        email,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    setUser(cred.user);
    setRole("customer");
    return { user: cred.user, role: "customer" };
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
  };

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      login,
      signup,
      logout,
      reauthenticate,
    }),
    [user, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}