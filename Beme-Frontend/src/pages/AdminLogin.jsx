import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Sign in with Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      // 2. Read the user's role directly from Firestore
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const rawRole = String(snap.data()?.role || "").trim().toLowerCase();

      // 3. Accept any admin variant stored in Firestore
      //    ("admin", "super_admin" — shop_admin is removed from the new system)
      const isAdmin = rawRole === "admin" || rawRole === "super_admin";

      if (!isAdmin) {
        // Sign them out — they shouldn't be in admin session
        await signOut(auth);
        setError("This account is not authorized for admin access.");
        return;
      }

      // 4. Authorized — go to admin hub
      navigate("/admin", { replace: true });

    } catch (err) {
      // Firebase auth error codes
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Incorrect email or password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F3F4F6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "var(--font-main, 'Nunito', system-ui, sans-serif)",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: "40px 36px",
        width: "100%",
        maxWidth: 460,
        boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
      }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 8 }}>
            Beme Market
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111", letterSpacing: "-0.03em", margin: "0 0 10px" }}>
            Admin Login
          </h1>
          <p style={{ fontSize: 15, color: "#6B7280", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
            Sign in with your authorized super admin account.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@bememarket.store"
              required
              autoComplete="email"
              style={{
                width: "100%",
                padding: "13px 16px",
                border: "1.5px solid rgba(0,0,0,0.12)",
                borderRadius: 10,
                fontSize: 15,
                fontFamily: "inherit",
                fontWeight: 500,
                color: "#111",
                background: "#F9FAFB",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "#046EF2"}
              onBlur={e  => e.target.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "13px 16px",
                border: "1.5px solid rgba(0,0,0,0.12)",
                borderRadius: 10,
                fontSize: 15,
                fontFamily: "inherit",
                fontWeight: 500,
                color: "#111",
                background: "#F9FAFB",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "#046EF2"}
              onBlur={e  => e.target.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "12px 16px",
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: "#DC2626",
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "#374151" : "#111",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
              transition: "background 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                Signing in…
              </>
            ) : "Login as Admin"}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          <button onClick={() => navigate("/login")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#9CA3AF", fontFamily: "inherit", padding: 0 }}>
            Customer login
          </button>
          <button onClick={() => navigate("/")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#9CA3AF", fontFamily: "inherit", padding: 0 }}>
            Back to home
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}