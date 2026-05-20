import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { useWishlist } from "../../hooks/useWishlist";
import "./BottomNav.css";

/* ─── Icons — thin line-art, 1.5 stroke ─────────────────────────── */

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  );
}

function IconShop() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}

function IconPurchases() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
    </svg>
  );
}

function IconAccount() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20a8 8 0 0 1 16 0"/>
    </svg>
  );
}

function IconChevronUp() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 15l-6-6-6 6"/>
    </svg>
  );
}

/* ─── Component ──────────────────────────────────────────────────── */

export default function BottomNav() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const { user } = useAuth();
  const { wishlistCount } = useWishlist(null);



  /* ── Scroll-hide + back-to-top ── */
  const [navVisible,  setNavVisible]  = useState(true);
  const [showBackTop, setShowBackTop] = useState(false);
  const lastScrollY = useRef(0);
  const ticking     = useRef(false);

  useEffect(() => {
    const SCROLL_THRESHOLD  = 8;
    const BACK_TOP_THRESHOLD = 320;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const diff     = currentY - lastScrollY.current;
        if (Math.abs(diff) >= SCROLL_THRESHOLD) {
          setNavVisible(diff < 0 || currentY < 60);
          lastScrollY.current = currentY;
        }
        setShowBackTop(currentY > BACK_TOP_THRESHOLD);
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setNavVisible(true);
  };

  const isActive     = (path) => location.pathname === path;
  const displayCount = user && wishlistCount > 0 ? wishlistCount : 0;

  return (
    <>
      {/* ── Back-to-top button ── */}
      <button
        className={[
          "bn-back-top",
          showBackTop ? "bn-back-top--visible" : "",
          !navVisible ? "bn-back-top--nav-hidden" : "",
        ].join(" ")}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <IconChevronUp />
      </button>

      {/* ── Nav ── */}
      <nav className={`bottom-nav${navVisible ? "" : " bottom-nav--hidden"}`}>
        <div className="bn-inner">

          {/* HOME */}
          <button
            className={`bn-item${isActive("/") ? " active" : ""}`}
            onClick={() => navigate("/")}
            aria-label="Home"
          >
            <span className="bn-top-bar" />
            <span className="bn-icon-wrap"><IconHome /></span>
            <span className="bn-label">Home</span>
          </button>

          {/* SHOP */}
          <button
            className={`bn-item${isActive("/shop") ? " active" : ""}`}
            onClick={() => navigate("/shop")}
            aria-label="Shop"
          >
            <span className="bn-top-bar" />
            <span className="bn-icon-wrap"><IconShop /></span>
            <span className="bn-label">Shop</span>
          </button>

          {/* PURCHASES */}
          <button
            className={`bn-item${isActive("/orders") ? " active" : ""}`}
            onClick={() => navigate("/orders")}
            aria-label="Purchases"
          >
            <span className="bn-top-bar" />
            <span className="bn-icon-wrap"><IconPurchases /></span>
            <span className="bn-label">Purchases</span>
          </button>

          {/* ACCOUNT / LOGIN */}
          <button
            className={`bn-item${isActive(user ? "/account" : "/login") ? " active" : ""}`}
            onClick={() => navigate(user ? "/account" : "/login")}
            aria-label={user ? "Account" : "Login"}
          >
            <span className="bn-top-bar" />
            <span className="bn-icon-wrap">
              <IconAccount />
              {displayCount > 0 && (
                <span className="bn-badge">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
              )}
            </span>
            <span className="bn-label">{user ? "Account" : "Login"}</span>
          </button>

        </div>
      </nav>
    </>
  );
}