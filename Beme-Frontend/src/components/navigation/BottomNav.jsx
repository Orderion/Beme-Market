import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUserUnreadCount } from "../../hooks/useNotifications";

/* ─── SVG icon helper ─────────────────────────────────────────────────────── */
function Icon({ path, size = 22, color = "currentColor", fill = "none" }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill} stroke={color} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
    >
      {path.split(" M").map((seg, i) => (
        <path key={i} d={(i === 0 ? "" : "M") + seg} />
      ))}
    </svg>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const ICONS = {
  home:      "M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z M9 21V12h6v9",
  store:     "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
  // ── NEW: "Get a Store" star/shop icon ─────────────────────────────────────
  getStore:  "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  orders:    "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2",
  account:   "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  login:     "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3",
};

/* ─── Nav tab component ───────────────────────────────────────────────────── */
function Tab({ to, icon, label, badge }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "3px",
        flex:           1,
        paddingBlock:   "8px",
        color:          isActive ? "var(--grtheme, #046EF2)" : "var(--muted, #888)",
        textDecoration: "none",
        position:       "relative",
        transition:     "color 0.15s",
        fontSize:       "10px",
        fontWeight:     600,
        fontFamily:     "var(--font-main, Manrope, system-ui)",
        letterSpacing:  "0.01em",
      })}
    >
      <Icon path={ICONS[icon]} size={21} />
      {label}
      {badge > 0 && (
        <span style={{
          position:   "absolute",
          top:        "6px",
          right:      "calc(50% - 14px)",
          background: "#EF4444",
          color:      "#fff",
          borderRadius: "100px",
          fontSize:   "9px",
          fontWeight: 800,
          padding:    "1px 5px",
          lineHeight: 1.4,
          minWidth:   "16px",
          textAlign:  "center",
        }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </NavLink>
  );
}

/* ─── Centre store button ─────────────────────────────────────────────────── */
function CentreStoreBtn() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/shop")}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "3px",
        flex:           1,
        paddingBlock:   "8px",
        background:     "none",
        border:         "none",
        cursor:         "pointer",
        color:          "var(--muted, #888)",
        fontSize:       "10px",
        fontWeight:     600,
        fontFamily:     "var(--font-main, Manrope, system-ui)",
      }}
    >
      <div style={{
        width:          "38px",
        height:         "38px",
        borderRadius:   "50%",
        background:     "var(--grtheme, #046EF2)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        marginBottom:   "2px",
        boxShadow:      "0 4px 12px rgba(4,110,242,0.35)",
      }}>
        <Icon path={ICONS.store} size={18} color="#fff" />
      </div>
      Shop
    </button>
  );
}

/* ─── BottomNav ───────────────────────────────────────────────────────────── */
export default function BottomNav() {
  const { user, isSeller } = useAuth();
  const { count: unreadCount } = useUserUnreadCount?.() ?? { count: 0 };

  return (
    <nav style={{
      position:       "fixed",
      bottom:         0,
      left:           0,
      right:          0,
      height:         "64px",
      background:     "var(--card, #fff)",
      borderTop:      "1px solid var(--border, rgba(0,0,0,0.08))",
      display:        "flex",
      alignItems:     "stretch",
      zIndex:         90,
      paddingBottom:  "env(safe-area-inset-bottom, 0)",
      boxShadow:      "0 -1px 12px rgba(0,0,0,0.06)",
    }}>

      {/* 1 — Home */}
      <Tab to="/" icon="home" label="Home" />

      {/* ── 2 — CHANGED: "Offers" → "Get a Store" ─────────────────────────────
          Previously this was <Tab to="/offers" icon="offers" label="Offers" />
          Now it points to /get-a-store with a shop bag icon.
          Sellers see "Dashboard" pointing to their seller dashboard instead.
      ── */}
      {isSeller ? (
        <Tab to="/seller-dashboard" icon="store" label="Dashboard" />
      ) : (
        <Tab to="/get-a-store" icon="getStore" label="Get a Store" />
      )}

      {/* 3 — Centre shop button */}
      <CentreStoreBtn />

      {/* 4 — Orders */}
      <Tab to="/orders" icon="orders" label="Orders" />

      {/* 5 — Account / Login */}
      {user ? (
        <Tab to="/profile" icon="account" label="Account" badge={unreadCount} />
      ) : (
        <Tab to="/login" icon="login" label="Login" />
      )}
    </nav>
  );
}

