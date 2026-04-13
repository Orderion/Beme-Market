import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { useWishlist } from "../../hooks/useWishlist";
import "./BottomNav.css";

/* ================= ICONS ================= */

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M4 11l8-7 8 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6 10v10h12V10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function IconShop() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M3 9l1-4h16l1 4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 9h16v10H4z" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M6 4h12v16H6z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 9h6M9 13h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 20a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconOffers() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg">
      <path d="M5 12l5-5 9 9-5 5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconChevronUp() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

/* ================= COMPONENT ================= */

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Get wishlist count — pass null product, we only need the count
  const { wishlistCount } = useWishlist(null);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutConfirmMounted, setLogoutConfirmMounted] = useState(false);
  const logoutWrapRef = useRef(null);

  /* ── Scroll-hide logic ── */
  const [navVisible, setNavVisible] = useState(true);
  const [showBackTop, setShowBackTop] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const SCROLL_THRESHOLD = 8;
    const BACK_TOP_THRESHOLD = 320;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const diff = currentY - lastScrollY.current;
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

  const isActive = (path) => location.pathname === path;

  /* ── Logout confirm mount/unmount ── */
  useEffect(() => {
    let timeoutId;
    if (showLogoutConfirm) {
      setLogoutConfirmMounted(true);
    } else {
      timeoutId = setTimeout(() => setLogoutConfirmMounted(false), 200);
    }
    return () => clearTimeout(timeoutId);
  }, [showLogoutConfirm]);

  /* ── Close on outside click or ESC ── */
  useEffect(() => {
    if (!showLogoutConfirm && !logoutConfirmMounted) return;

    const handleClickOutside = (event) => {
      if (!logoutWrapRef.current) return;
      if (!logoutWrapRef.current.contains(event.target)) {
        setShowLogoutConfirm(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setShowLogoutConfirm(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showLogoutConfirm, logoutConfirmMounted]);

  const displayCount = user && wishlistCount > 0 ? wishlistCount : 0;

  return (
    <>
      {/* ── Back-to-top ── */}
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

        {/* HOME */}
        <button
          className={`bn-item ${isActive("/") ? "active" : ""}`}
          onClick={() => navigate("/")}
        >
          <IconHome />
          <span>Home</span>
        </button>

        {/* OFFERS */}
        <button
          className={`bn-item ${isActive("/offers") ? "active" : ""}`}
          onClick={() => navigate("/offers")}
        >
          <IconOffers />
          <span>Offers</span>
        </button>

        {/* CENTER SHOP */}
        <button
          className="bn-center"
          onClick={() => navigate("/shop")}
          aria-label="Shop"
        >
          <IconShop />
        </button>

        {/* ORDERS */}
        <button
          className={`bn-item ${isActive("/orders") ? "active" : ""}`}
          onClick={() => navigate("/orders")}
        >
          <IconOrders />
          <span>Orders</span>
        </button>

        {/* ACCOUNT / LOGIN */}
        {!user ? (
          <button
            className={`bn-item ${isActive("/login") ? "active" : ""}`}
            onClick={() => navigate("/login")}
          >
            <IconUser />
            <span>Login</span>
          </button>
        ) : (
          <button
            className={`bn-item ${isActive("/account") ? "active" : ""}`}
            onClick={() => navigate("/account")}
            aria-label="Go to account"
          >
            <span className="bn-icon-wrap">
              <IconUser />
              {displayCount > 0 && (
                <span className="bn-saved-badge">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
              )}
            </span>
            <span>Account</span>
          </button>
        )}

      </nav>
    </>
  );
}