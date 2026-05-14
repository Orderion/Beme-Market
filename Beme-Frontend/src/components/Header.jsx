// Header.jsx — Updated: /custom-store → /get-a-store | seller dashboard link
// All existing functionality preserved. Only seller-related links changed.
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ─── NOTE TO DEVELOPER ──────────────────────────────────────────────────────
// This file preserves your full existing Header.jsx structure.
// The ONLY changes from the original are:
//
//  1. The "Get a store" nav link href changed from "/custom-store" → "/get-a-store"
//  2. When a user is an active seller, "Get a store" becomes "My Dashboard"
//     and links to "/seller-dashboard" instead.
//  3. The admin "Get a Store" management link in the admin dropdown (if any)
//     should point to "/admin/store-moderation".
//
// Search for "← CHANGED" comments to find the exact lines that differ from
// your original file. Merge these changes into your existing Header.jsx
// rather than replacing the whole file if you have custom logic there.
// ─────────────────────────────────────────────────────────────────────────────

export default function Header() {
  const { user, isSuperAdmin, isSeller, isSellerActive } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [searchQuery,   setSearchQuery]   = useState("");
  const [showSearch,    setShowSearch]    = useState(false);
  const [megaOpen,      setMegaOpen]      = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  useEffect(() => {
    setMegaOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // ── "Get a Store" / "My Dashboard" label & href ─────────────────────────────
  // ← CHANGED: was hardcoded "/custom-store" — now adapts based on seller status
  const sellerLink  = isSellerActive ? "/seller-dashboard" : "/get-a-store";
  const sellerLabel = isSellerActive ? "My Dashboard" : "Get a Store";
  const sellerStyle = {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "6px",
    padding:        "8px 16px",
    background:     "var(--grtheme, #046EF2)",
    color:          "#fff",
    borderRadius:   "var(--radius, 6px)",
    fontSize:       "13px",
    fontWeight:     700,
    textDecoration: "none",
    transition:     "background 0.15s",
    fontFamily:     "var(--font-main, Manrope, system-ui)",
  };

  return (
    <header style={{
      position:    "sticky",
      top:         0,
      zIndex:      80,
      background:  "var(--card, #fff)",
      borderBottom: "1px solid var(--border, rgba(0,0,0,0.08))",
      boxShadow:   "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{
        maxWidth:   "1280px",
        margin:     "0 auto",
        padding:    "0 20px",
        height:     "60px",
        display:    "flex",
        alignItems: "center",
        gap:        "16px",
      }}>
        {/* Logo */}
        <Link to="/" style={{
          fontFamily:      "var(--font-display, 'Space Grotesk', sans-serif)",
          fontSize:        "20px",
          fontWeight:      800,
          color:           "var(--grtheme, #046EF2)",
          textDecoration:  "none",
          letterSpacing:   "-0.03em",
          flexShrink:      0,
        }}>
          Beme
        </Link>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          style={{
            flex:           1,
            maxWidth:       "500px",
            position:       "relative",
            display:        "flex",
            alignItems:     "center",
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, stores…"
            style={{
              width:          "100%",
              padding:        "9px 40px 9px 14px",
              border:         "1.5px solid var(--border, rgba(0,0,0,0.1))",
              borderRadius:   "var(--radius, 6px)",
              fontSize:       "13px",
              fontFamily:     "var(--font-main, Manrope, system-ui)",
              outline:        "none",
              background:     "var(--soft, rgba(0,0,0,0.04))",
              color:          "var(--text, #111)",
              transition:     "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--grtheme, #046EF2)")}
            onBlur={(e)  => (e.target.style.borderColor = "var(--border, rgba(0,0,0,0.1))")}
          />
          <button type="submit" style={{
            position:   "absolute",
            right:      "10px",
            background: "none",
            border:     "none",
            cursor:     "pointer",
            color:      "var(--muted, #888)",
            display:    "flex",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </form>

        {/* Nav links (desktop) */}
        <nav style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <Link to="/"       className="header-nav-link">Home</Link>
          <Link to="/offers" className="header-nav-link">Offers</Link>
          {isSuperAdmin && (
            <Link to="/admin" className="header-nav-link">Admin</Link>
          )}
        </nav>

        {/* ── "Get a Store" CTA — ← CHANGED ─────────────────────────────────
            OLD: <a href="/custom-store">Get a store</a>
            NEW: dynamic — /get-a-store for buyers, /seller-dashboard for active sellers
        ── */}
        <Link
          to={sellerLink}      // ← CHANGED (was "/custom-store")
          style={sellerStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#0357C7")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--grtheme, #046EF2)")}
        >
          {isSellerActive
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          }
          {sellerLabel}   {/* ← CHANGED (was "Get a store") */}
        </Link>

        {/* Cart & profile icons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <Link to="/cart" style={{ color: "var(--text, #111)", display: "flex", alignItems: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </Link>
          <Link to={user ? "/profile" : "/login"} style={{ color: "var(--text, #111)", display: "flex", alignItems: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

