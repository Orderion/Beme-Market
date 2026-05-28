import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
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
  close:    "M18 6L6 18|M6 6l12 12",
  chevron:  "M6 9l6 6 6-6",
};

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
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.48)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"sd-fade-in 0.18s ease" }} onClick={onClose}>
      <div style={{ background:"var(--sd-white)",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:480,animation:"sd-sheet-up 0.24s cubic-bezier(0.22,1,0.36,1)",overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:36,height:4,borderRadius:2,background:"var(--sd-border)",margin:"12px auto 0" }}/>
        <div style={{ padding:"20px 24px 36px",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center" }}>
          <div style={{ width:52,height:52,borderRadius:"50%",background:"var(--sd-danger-bg)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14,border:"1px solid rgba(185,28,28,0.12)" }}>
            <Ico d={D.logout} size={22} color="var(--sd-danger)" />
          </div>
          <div style={{ fontSize:18,fontWeight:800,color:"var(--sd-text)",marginBottom:6,letterSpacing:"-0.02em" }}>Sign out of Beme?</div>
          <div style={{ fontSize:13,color:"var(--sd-muted)",lineHeight:1.65,marginBottom:24,maxWidth:280 }}>
            Your store stays live and orders keep coming in.
          </div>
          <div style={{ display:"flex",gap:10,width:"100%" }}>
            <button onClick={onClose} disabled={loading}
              style={{ flex:1,padding:"12px",borderRadius:10,border:"1px solid var(--sd-border)",background:"transparent",color:"var(--sd-text)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"var(--sd-font)" }}>
              Cancel
            </button>
            <button onClick={handle} disabled={loading}
              style={{ flex:1,padding:"12px",borderRadius:10,border:"none",background:"var(--sd-danger-bg)",color:"var(--sd-danger)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"var(--sd-font)" }}>
              {loading ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopbarDropdown({ user, subscriptionPlan, onTabChange }) {
  const [open, setOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const click = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const key   = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);

  const go = (tab) => { onTabChange(tab); setOpen(false); };
  const planLabel = subscriptionPlan ? subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1) : "Basic";
  const initial   = (user?.displayName || user?.email || "S")[0].toUpperCase();

  const ITEMS = [
    { id:"settings", icon:D.settings, label:"Settings",     action:() => go("settings") },
    { id:"help",     icon:D.help,     label:"Get Help",     action:() => go("help") },
    { id:"upgrade",  icon:D.star,     label:"Upgrade Plan", badge:planLabel, action:() => go("subscription") },
    { id:"learn",    icon:D.book,     label:"Learn More",   action:() => go("learn") },
    { id:"gift",     icon:D.gift,     label:"Gift Beme",    action:() => go("gift") },
    { id:"logout",   icon:D.logout,   label:"Log Out",      action:() => { setOpen(false); setShowLogout(true); }, danger:true },
  ];

  return (
    <div style={{ position:"relative",display:"flex",alignItems:"center" }} ref={wrapRef}>
      <button
        className={`sd-avatar-btn${open ? " sd-avatar-btn--open" : ""}`}
        title={user?.displayName || user?.email}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}>
        {initial}
      </button>

      {open && (
        <div style={{ position:"absolute",top:"calc(100% + 10px)",right:0,width:224,background:"var(--sd-white)",border:"1px solid var(--sd-border)",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.13)",zIndex:300,overflow:"hidden",animation:"sd-dd-in 0.15s cubic-bezier(0.22,1,0.36,1)" }}>
          <div style={{ padding:"12px 14px 10px",borderBottom:"1px solid var(--sd-border-light)" }}>
            <div style={{ fontSize:12,color:"var(--sd-muted)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user?.email || "—"}</div>
          </div>
          {ITEMS.map(item => (
            <button key={item.id} onClick={item.action}
              style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 14px",background:"transparent",border:"none",cursor:"pointer",fontFamily:"var(--sd-font)",fontSize:13.5,fontWeight:500,color:item.danger?"var(--sd-danger)":"var(--sd-text)",textAlign:"left",transition:"background 0.12s" }}
              onMouseEnter={e => e.currentTarget.style.background = item.danger ? "var(--sd-danger-bg)" : "var(--sd-accent-dim)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ display:"flex",alignItems:"center",justifyContent:"center",width:20,flexShrink:0 }}>
                <Ico d={item.icon} size={15} />
              </span>
              <span style={{ flex:1 }}>{item.label}</span>
              {item.badge && (
                <span style={{ fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:100,background:"var(--sd-accent-dim)",color:"var(--sd-accent)",border:"1px solid var(--sd-accent-border)" }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {showLogout && <LogoutSheet onClose={() => setShowLogout(false)} />}
    </div>
  );
}