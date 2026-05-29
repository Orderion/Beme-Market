import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

function Ico({ d, size = 15, color = "currentColor", sw = 1.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

const D = {
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  help:     "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3|M12 17h.01",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  book:     "M4 19.5A2.5 2.5 0 0 1 6.5 17H20|M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  gift:     "M20 12v10H4V12|M2 7h20v5H2z|M12 22V7|M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z|M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
  logout:   "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9",
  arrow:    "M7 17L17 7|M7 7h10v10",
};

/* ── Logout bottom sheet ── */
function LogoutSheet({ onClose }) {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handle = async () => {
    setLoading(true);
    await logout().catch(console.error);
    window.location.href = "/";
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:500,
               display:"flex",alignItems:"flex-end",justifyContent:"center",
               animation:"sd-fade-in 0.15s ease" }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:"var(--sd-white)",borderRadius:"18px 18px 0 0",
                 width:"100%",maxWidth:440,
                 animation:"sd-sheet-up 0.22s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ width:32,height:4,borderRadius:2,background:"var(--sd-border)",
                      margin:"12px auto 0" }} />
        <div style={{ padding:"22px 24px 40px",display:"flex",flexDirection:"column",
                      alignItems:"center",textAlign:"center",fontFamily:"var(--sd-font)" }}>
          <div style={{ width:46,height:46,borderRadius:"50%",
                        background:"rgba(220,38,38,0.07)",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        marginBottom:14,border:"1px solid rgba(220,38,38,0.12)" }}>
            <Ico d={D.logout} size={20} color="#dc2626" />
          </div>
          <div style={{ fontSize:17,fontWeight:700,color:"var(--sd-text)",
                        marginBottom:6,letterSpacing:"-0.02em" }}>Sign out?</div>
          <div style={{ fontSize:13,color:"var(--sd-muted)",lineHeight:1.65,
                        marginBottom:22,maxWidth:260 }}>
            Your store stays live and orders keep coming in.
          </div>
          <div style={{ display:"flex",gap:8,width:"100%" }}>
            <button onClick={onClose} disabled={loading}
              style={{ flex:1,padding:"11px",borderRadius:9,
                       border:"1px solid var(--sd-border)",background:"transparent",
                       color:"var(--sd-text)",fontSize:13,fontWeight:600,
                       cursor:"pointer",fontFamily:"var(--sd-font)" }}>
              Cancel
            </button>
            <button onClick={handle} disabled={loading}
              style={{ flex:1,padding:"11px",borderRadius:9,border:"none",
                       background:"rgba(220,38,38,0.07)",color:"#dc2626",
                       fontSize:13,fontWeight:700,cursor:"pointer",
                       fontFamily:"var(--sd-font)" }}>
              {loading ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN DROPDOWN  — Claude-style minimal menu
════════════════════════════════════════════ */
export default function TopbarDropdown({ user, subscriptionPlan, onTabChange }) {
  const [open,        setOpen]        = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const esc   = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown",   esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const go = (tab) => { onTabChange(tab); setOpen(false); };
  const initial = (user?.displayName || user?.email || "S")[0].toUpperCase();

  const MAIN_ITEMS = [
    { icon: D.settings, label: "Settings",     action: () => go("settings") },
    { icon: D.help,     label: "Get Help",      action: () => go("help") },
    { icon: D.star,     label: "Upgrade Plan",  action: () => go("subscription") },
    { icon: D.book,     label: "Learn More",    action: () => go("learn") },
    { icon: D.gift,     label: "Gift Beme",     action: () => go("gift") },
  ];

  return (
    <div ref={wrapRef} style={{ position:"relative", display:"flex", alignItems:"center" }}>

      {/* Avatar button */}
      <button
        className={`sd-avatar-btn${open ? " sd-avatar-btn--open" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        title={user?.displayName || user?.email}>
        {initial}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 8px)", right:0,
          width:220, background:"var(--sd-white)",
          border:"1px solid var(--sd-border)", borderRadius:12,
          boxShadow:"0 4px 20px rgba(0,0,0,0.10)", zIndex:300, overflow:"hidden",
          animation:"sd-dd-in 0.14s cubic-bezier(0.22,1,0.36,1)",
          fontFamily:"var(--sd-font)",
        }}>

          {/* User info header */}
          <div style={{ padding:"10px 12px 8px", borderBottom:"1px solid var(--sd-border)" }}>
            <div style={{ fontSize:12,fontWeight:600,color:"var(--sd-text)",
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
              {user?.displayName || user?.email || "Seller"}
            </div>
            {user?.displayName && (
              <div style={{ fontSize:11,color:"var(--sd-muted)",marginTop:1,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                {user?.email}
              </div>
            )}
          </div>

          {/* Main items */}
          <div style={{ padding:"4px" }}>
            {MAIN_ITEMS.map(item => (
              <button key={item.label} onClick={item.action}
                style={{
                  display:"flex", alignItems:"center", gap:9,
                  width:"100%", padding:"8px 10px", borderRadius:8,
                  background:"transparent", border:"none", cursor:"pointer",
                  fontFamily:"var(--sd-font)", fontSize:13, fontWeight:500,
                  color:"var(--sd-text)", textAlign:"left", transition:"background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--sd-border-light)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ display:"flex",alignItems:"center",color:"var(--sd-muted)" }}>
                  <Ico d={item.icon} size={15} color="var(--sd-muted)" />
                </span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Divider + Log Out */}
          <div style={{ borderTop:"1px solid var(--sd-border)", padding:"4px" }}>
            <button
              onClick={() => { setOpen(false); setShowLogout(true); }}
              style={{
                display:"flex", alignItems:"center", gap:9,
                width:"100%", padding:"8px 10px", borderRadius:8,
                background:"transparent", border:"none", cursor:"pointer",
                fontFamily:"var(--sd-font)", fontSize:13, fontWeight:500,
                color:"#dc2626", textAlign:"left", transition:"background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Ico d={D.logout} size={15} color="#dc2626" />
              Log Out
            </button>
          </div>
        </div>
      )}

      {showLogout && <LogoutSheet onClose={() => setShowLogout(false)} />}
    </div>
  );
}