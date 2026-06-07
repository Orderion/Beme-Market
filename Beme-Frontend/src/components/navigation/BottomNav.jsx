// src/components/navigation/BottomNav.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import "./BottomNav.css";

/* ─── Routes where bottom nav should be hidden ─── */
const HIDDEN_ROUTES = [
  "/checkout",
  "/order-success",
  "/login",
  "/register",
  "/signup",
  "/seller-dashboard",
];

/* ─── Icons ─── */
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  );
}

function IconShop() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}

function IconMessages() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
    </svg>
  );
}

function IconAccount() {
  return (
    <svg viewBox="0 0 24 24" className="bn-svg" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20a8 8 0 0 1 16 0"/>
    </svg>
  );
}

function IconChevronUp() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 15l-6-6-6 6"/>
    </svg>
  );
}

/* ─── Component ─── */
export default function BottomNav() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user }   = useAuth();

  /* Hide on specific routes */
  const shouldHide = HIDDEN_ROUTES.some(route =>
    location.pathname === route || location.pathname.startsWith(route + "/")
  );

  /* Unread messages count */
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user?.uid) { setUnread(0); return; }
    const q = query(
      collection(db, "sellerChats"),
      where("customerId", "==", user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const total = snap.docs.reduce((sum, d) => sum + (d.data().unreadByCustomer || 0), 0);
      setUnread(total);
    }, () => {});
    return unsub;
  }, [user?.uid]);

  /* Scroll-hide + back-to-top */
  const [navVisible,  setNavVisible]  = useState(true);
  const [showBackTop, setShowBackTop] = useState(false);
  const lastScrollY = useRef(0);
  const ticking     = useRef(false);

  useEffect(() => {
    const SCROLL_THRESHOLD   = 8;
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

  /* Don't render at all on hidden routes */
  if (shouldHide) return null;

  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: "smooth" }); setNavVisible(true); };
  const isActive    = (path) => location.pathname === path;
  const unreadCount = Math.min(unread, 99);

  const tabs = [
    { path: "/",        icon: <IconHome/>,     label: "Home"     },
    { path: "/shop",    icon: <IconShop/>,     label: "Shop"     },
    { path: "/messages",icon: <IconMessages/>, label: "Messages", badge: unreadCount > 0 ? unreadCount : 0 },
    { path: "/orders",  icon: <IconOrders/>,   label: "Orders"   },
    { path: user ? "/account" : "/login", icon: <IconAccount/>, label: user ? "Account" : "Login" },
  ];

  return (
    <>
      {/* Back-to-top */}
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

      {/* Nav pill */}
      <nav className={`bottom-nav${navVisible ? "" : " bottom-nav--hidden"}`} aria-label="Main navigation">
        <div className="bn-inner">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                className={`bn-item${active ? " active" : ""}`}
                onClick={() => navigate(tab.path)}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
              >
                <span className="bn-icon-wrap">
                  {tab.icon}
                  {tab.badge > 0 && (
                    <span className="bn-badge">{tab.badge > 99 ? "99+" : tab.badge}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}