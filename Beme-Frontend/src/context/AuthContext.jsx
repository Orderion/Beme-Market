import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("guest"); // guest | customer | admin
  const [loading, setLoading] = useState(true);

  const resolveRole = async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return "customer";
    return snap.data()?.role || "customer";
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
        const r = await resolveRole(u.uid);
        setRole(r);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const r = await resolveRole(cred.user.uid);
    setRole(r);
    return { user: cred.user, role: r };
  };

  const signup = async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // create profile doc as customer by default
    await setDoc(
      doc(db, "users", cred.user.uid),
      { role: "customer", email, createdAt: serverTimestamp() },
      { merge: true }
    );

    setRole("customer");
    return { user: cred.user, role: "customer" };
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole("guest");
  };

  const value = useMemo(
    () => ({ user, role, loading, login, signup, logout }),
    [user, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}