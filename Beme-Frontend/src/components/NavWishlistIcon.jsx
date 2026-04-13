// components/NavWishlistIcon.jsx
// ─────────────────────────────────────────────────────────────
// Drop this anywhere in your Navbar.
// Shows live count badge. Navigates to /saved on click.
// Requires the same Firebase auth + db imports.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase"; // ← adjust path
import "./NavWishlistIcon.css";

export default function NavWishlistIcon() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) { setCount(0); return; }

    const colRef = collection(db, "users", user.uid, "wishlist");
    const unsub = onSnapshot(colRef, (snap) => setCount(snap.size));
    return () => unsub();
  }, [user]);

  return (
    <button
      className="nwi-btn"
      onClick={() => navigate("/saved")}
      aria-label={`Wishlist — ${count} item${count !== 1 ? "s" : ""}`}
      title="Saved items"
    >
      <svg
        className="nwi-icon"
        viewBox="0 0 24 24"
        fill={count > 0 ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
          2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
          C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
          c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>

      {count > 0 && (
        <span className="nwi-badge" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
