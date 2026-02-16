import { createContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const adminEmail = "ioorder677@gmail.com";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsub();
  }, []);

  const isAdmin = user?.email === adminEmail;

  return (
    <AuthContext.Provider value={{ user, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
