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

/* ─── Component ──────────────────────────────────────────────────── */

export default function BottomNav() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const { wishlistCount } = useWishlist(null);

  /* scroll-hide */
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking    = useRef(false);

  useEffect(() => {
    const THRESHOLD = 8;
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y    = window.scrollY;
        const diff = y - lastScrollY.current;
        if (Math.abs(diff) >= THRESHOLD) {
          setNavVisible(diff < 0 || y < 60);
          lastScrollY.current = y;
        }
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path) => location.pathname === path;
  const displayCount = user && wishlistCount > 0 ? wishlistCount : 0;

  const tabs = [
    { path: "/",        label: "Home",      Icon: IconHome      },
    { path: "/shop",    label: "Shop",      Icon: IconShop      },
    { path: "/orders",  label: "Purchases", Icon: IconPurchases  },
    {
      path: user ? "/account" : "/login",
      label: user ? "Account" : "Login",
      Icon: IconAccount,
      badge: displayCount > 0 ? displayCount : null,
    },
  ];

  return (
    <nav className={`bottom-nav${navVisible ? "" : " bottom-nav--hidden"}`}>
      <div className="bn-inner">
        {tabs.map(({ path, label, Icon, badge }) => (
          <button
            key={path}
            className={`bn-item${isActive(path) ? " active" : ""}`}
            onClick={() => navigate(path)}
            aria-label={label}
          >
            {/* active top bar */}
            <span className="bn-top-bar" />

            <span className="bn-icon-wrap">
              <Icon />
              {badge && (
                <span className="bn-badge">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </span>

            <span className="bn-label">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}