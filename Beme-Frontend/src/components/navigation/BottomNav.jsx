import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { useWishlist } from "../../hooks/useWishlist";
import "./BottomNav.css";

/* ================= ICONS — strokeWidth 1.5 for thin line-art ================= */

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

function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20a8 8 0 0 1 16 0"/>
    </svg>
  );
}

function IconOffers() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.78 0l-8-4A2 2 0 0 1 2 16.76V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z"/>
      <polyline points="2.32 6.16 12 11 21.68 6.16"/>
      <line x1="12" y1="22.76" x2="12" y2="11"/>
    </svg>
  );
}

function IconChevronUp() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 15l-6-6-6 6"/>
    </svg>
  );
}

/* ================= COMPONENT ================= */

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

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
      {/* ── Back-to-top — square brutalist button ── */}
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
          <span className="bn-active-pip" />
        </button>

        {/* OFFERS */}
        <button
          className={`bn-item ${isActive("/offers") ? "active" : ""}`}
          onClick={() => navigate("/offers")}
        >
          <IconOffers />
          <span>Offers</span>
          <span className="bn-active-pip" />
        </button>

        {/* CENTER SHOP — square with hard shadow */}
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
          <span className="bn-active-pip" />
        </button>

        {/* ACCOUNT / LOGIN */}
        {!user ? (
          <button
            className={`bn-item ${isActive("/login") ? "active" : ""}`}
            onClick={() => navigate("/login")}
          >
            <IconUser />
            <span>Login</span>
            <span className="bn-active-pip" />
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
            <span className="bn-active-pip" />
          </button>
        )}

      </nav>
    </>
  );
}