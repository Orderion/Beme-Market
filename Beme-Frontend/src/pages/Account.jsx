import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc, getDoc, setDoc, collection, onSnapshot,
  serverTimestamp, query, orderBy, limit, getDocs,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../firebase";
import { useUserUnreadCount } from "../hooks/useNotifications";
import "./Account.css";

/* ─── Constants ─────────────────────────────────────────── */
const PREF_OPTIONS = [
  { id:"kids",        label:"Kids & Family"   },
  { id:"women",       label:"Women's Fashion" },
  { id:"men",         label:"Men's Fashion"   },
  { id:"home",        label:"Home & Living"   },
  { id:"electronics", label:"Electronics"     },
  { id:"savvy",       label:"Savvy Deals"     },
  { id:"everything",  label:"Shop Everything" },
];
const AGE_OPTIONS = [
  { id:"under18", label:"Under 18" },
  { id:"18-24",   label:"18 – 24"  },
  { id:"25-34",   label:"25 – 34"  },
  { id:"35-44",   label:"35 – 44"  },
  { id:"45plus",  label:"45+"      },
];
const AGE_LABELS = {
  under18:"Under 18","18-24":"18 – 24","25-34":"25 – 34","35-44":"35 – 44","45plus":"45+",
};

const PLAN_COLORS = {
  free:     { bg:"rgba(156,163,175,0.12)", text:"#6B7280" },
  basic:    { bg:"rgba(156,163,175,0.12)", text:"#6B7280" },
  starter:  { bg:"rgba(59,130,246,0.12)",  text:"#2563EB" },
  standard: { bg:"rgba(4,110,242,0.12)",   text:"#046EF2" },
  pro:      { bg:"rgba(124,58,237,0.12)",  text:"#7C3AED" },
};

const ORDER_STATUS_COLORS = {
  pending:    { bg:"rgba(245,158,11,0.1)",  text:"#D97706" },
  processing: { bg:"rgba(4,110,242,0.1)",   text:"#046EF2" },
  paid:       { bg:"rgba(34,197,94,0.1)",   text:"#16A34A" },
  delivered:  { bg:"rgba(34,197,94,0.1)",   text:"#16A34A" },
  cancelled:  { bg:"rgba(239,68,68,0.1)",   text:"#DC2626" },
};

function normalizeUsername(v) {
  return String(v||"").trim().toLowerCase().replace(/\s+/g,"_");
}

/* ─── SVG Icon helper ────────────────────────────────────── */
function Ico({ d, size=18, className="" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      width={size} height={size}>
      {String(d).split(" M").map((seg,i)=>(
        <path key={i} d={(i===0?"":"M")+seg}/>
      ))}
    </svg>
  );
}

const ICONS = {
  account:  "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
  orders:   "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
  inbox:    "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  saved:    "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  requests: "M11 3a8 8 0 100 16A8 8 0 0011 3z M21 21l-4.35-4.35 M11 8v6 M8 11h6",
  notif:    "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  address:  "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 10a3 3 0 10-6 0 3 3 0 006 0",
  payment:  "M1 4h22v16H1z M1 10h22",
  help:     "M12 22a10 10 0 100-20 10 10 0 000 20z M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3 M12 17h.01",
  store:    "M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9",
  logout:   "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  external: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6 M15 3h6v6 M10 14L21 3",
  chart:    "M18 20V10 M12 20V4 M6 20v-6",
  check:    "M20 6L9 17 4 12",
  close:    "M18 6L6 18 M6 6l18 18",
  plus:     "M12 5v14 M5 12h14",
  star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  flag:     "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7",
  member:   "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z",
};

function CheckboxIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function Spinner() { return <span className="acc-spinner" aria-hidden="true"/>; }

/* ─── Pref Icons ─────────────────────────────────────────── */
function PrefIcon({ id }) {
  const p = { viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round",strokeLinejoin:"round",width:"14",height:"14" };
  switch(id) {
    case "kids":        return <svg {...p}><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>;
    case "women":       return <svg {...p}><circle cx="12" cy="5" r="3"/><path d="M12 8v8M9 13h6"/></svg>;
    case "men":         return <svg {...p}><rect x="6" y="2" width="12" height="8" rx="1"/><path d="M6 6h12M9 10v12M15 10v12"/></svg>;
    case "home":        return <svg {...p}><path d="M3 12l9-9 9 9"/><path d="M9 21V12h6v9"/></svg>;
    case "electronics": return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4 4-4-4"/></svg>;
    case "savvy":       return <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 000-7.78z"/></svg>;
    default:            return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg>;
  }
}

/* ─── Edit Profile Modal ─────────────────────────────────── */
function EditProfileModal({ profile, displayName, onClose, onSaved }) {
  const { user } = useAuth();
  const [name,   setName]   = useState(displayName||"");
  const [age,    setAge]    = useState(profile?.age||"");
  const [prefs,  setPrefs]  = useState(Array.isArray(profile?.shoppingPreference)?profile.shoppingPreference:[]);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const togglePref = id => setPrefs(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const handleSave = async () => {
    setErr("");
    const trimmed = name.trim();
    if(trimmed.length < 2)  { setErr("Name must be at least 2 characters."); return; }
    if(trimmed.length > 30) { setErr("Name can be at most 30 characters.");  return; }
    if(!age)                { setErr("Please select your age range."); return; }
    if(prefs.length === 0)  { setErr("Please select at least one preference."); return; }
    setSaving(true);
    try {
      const key = normalizeUsername(trimmed);
      const oldKey = normalizeUsername(displayName||"");
      if(key !== oldKey) {
        const snap = await getDoc(doc(db,"usernames",key));
        if(snap.exists() && snap.data()?.uid !== user.uid) {
          setErr("That name is already taken."); setSaving(false); return;
        }
      }
      await updateProfile(auth.currentUser, { displayName:trimmed });
      await setDoc(doc(db,"users",user.uid), { displayName:trimmed, age, shoppingPreference:prefs, updatedAt:serverTimestamp() }, { merge:true });
      if(key !== oldKey) await setDoc(doc(db,"usernames",key), { uid:user.uid, displayName:trimmed, createdAt:serverTimestamp() });
      onSaved({ displayName:trimmed, age, shoppingPreference:prefs });
      onClose();
    } catch(e) { console.error(e); setErr("Could not save. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="acc-modal-backdrop" onClick={onClose}>
      <div className="acc-modal" onClick={e=>e.stopPropagation()}>
        <div className="acc-modal__head">
          <h2 className="acc-modal__title">Edit Profile</h2>
          <button type="button" className="acc-modal__close" onClick={onClose}>
            <Ico d={ICONS.close} size={16}/>
          </button>
        </div>

        <div className="acc-modal__section">
          <label className="acc-modal__label">Display Name</label>
          <input className="acc-modal__input" type="text"
            value={name} onChange={e=>{setName(e.target.value);setErr("");}}
            maxLength={30} placeholder="Your name" disabled={saving}/>
          <span className="acc-modal__charcount">{name.trim().length} / 30</span>
        </div>

        <div className="acc-modal__section">
          <p className="acc-modal__label">Age Range</p>
          <div className="acc-modal__pills">
            {AGE_OPTIONS.map(opt=>(
              <button key={opt.id} type="button"
                className={`acc-modal__pill ${age===opt.id?"acc-modal__pill--on":""}`}
                onClick={()=>{setAge(opt.id);setErr("");}} disabled={saving}>
                {age===opt.id && <CheckboxIcon/>}{opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="acc-modal__section">
          <p className="acc-modal__label">Shopping Preferences</p>
          <div className="acc-modal__grid">
            {PREF_OPTIONS.map(opt=>{
              const on = prefs.includes(opt.id);
              return (
                <button key={opt.id} type="button"
                  className={`acc-modal__pref ${on?"acc-modal__pref--on":""}`}
                  onClick={()=>{togglePref(opt.id);setErr("");}}
                  disabled={saving} aria-pressed={on}>
                  <PrefIcon id={opt.id}/><span>{opt.label}</span>
                  {on && <span className="acc-modal__pref-tick"><CheckboxIcon/></span>}
                </button>
              );
            })}
          </div>
        </div>

        {err && <div className="acc-modal__err">{err}</div>}

        <button type="button" className="acc-modal__save" onClick={handleSave} disabled={saving}>
          {saving ? <><Spinner/>Saving...</> : "Save changes"}
        </button>
      </div>
    </div>
  );
}

/* ─── Logout Sheet ───────────────────────────────────────── */
function LogoutSheet({ onConfirm, onCancel }) {
  return (
    <div className="acc-sheet-backdrop" onClick={onCancel}>
      <div className="acc-sheet" onClick={e=>e.stopPropagation()}>
        <div className="acc-sheet__bar"/>
        <p className="acc-sheet__title">Log out?</p>
        <p className="acc-sheet__sub">Are you sure you want to log out of your Beme Market account?</p>
        <button type="button" className="acc-sheet__btn acc-sheet__btn--danger" onClick={onConfirm}>Log out</button>
        <button type="button" className="acc-sheet__btn acc-sheet__btn--cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ─── Sidebar Nav Link ───────────────────────────────────── */
function NavLink({ icon, label, onClick, active, badge, badgeRed, danger }) {
  return (
    <button type="button"
      className={`acc-nav-link ${active?"acc-nav-link--active":""} ${danger?"acc-nav-link--danger":""}`}
      onClick={onClick}>
      <span className="acc-nav-icon"><Ico d={icon} size={17}/></span>
      {label}
      {badge > 0 && (
        <span className={`acc-nav-badge ${badgeRed?"acc-nav-badge--red":""}`}>{badge}</span>
      )}
    </button>
  );
}

/* ─── Overview Card wrapper ─────────────────────────────── */
function OverviewCard({ title, actionLabel, onAction, children, span }) {
  return (
    <div className="acc-overview-card" style={span ? { gridColumn:"span 2" } : {}}>
      <div className="acc-card-header">
        <span className="acc-card-header-title">{title}</span>
        {actionLabel && (
          <button className="acc-card-header-link" onClick={onAction}>{actionLabel}</button>
        )}
      </div>
      <div className="acc-card-body">{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════ */
export default function Account() {
  const navigate       = useNavigate();
  const { user, logout, isSeller, isSellerActive, subscriptionPlan } = useAuth();

  const [activeTab,       setActiveTab]       = useState("overview");
  const [showLogout,      setShowLogout]      = useState(false);
  const [showEdit,        setShowEdit]        = useState(false);
  const [profile,         setProfile]         = useState(null);
  const [shop,            setShop]            = useState(null);
  const [recentOrders,    setRecentOrders]    = useState([]);
  const [savedCount,      setSavedCount]      = useState(0);
  const [profileLoading,  setProfileLoading]  = useState(true);

  const { unreadCount } = useUserUnreadCount();

  // Detect store ownership
  const appliedUid = typeof window !== "undefined" ? localStorage.getItem("beme_seller_applied") : null;
  const hasStore   = isSeller || isSellerActive || (appliedUid && user && appliedUid === user.uid);

  /* wishlist count */
  useEffect(() => {
    if (!user) { setSavedCount(0); return; }
    const unsub = onSnapshot(collection(db,"users",user.uid,"wishlist"), snap=>setSavedCount(snap.size));
    return ()=>unsub();
  }, [user]);

  /* profile + shop + recent orders */
  useEffect(() => {
    if (!user) { setProfileLoading(false); return; }
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const profSnap = await getDoc(doc(db,"users",user.uid));
        if (!cancelled && profSnap.exists()) {
          const data = profSnap.data();
          setProfile(data);
          if (data.storeId) {
            const shopSnap = await getDoc(doc(db,"shops",data.storeId));
            if (!cancelled && shopSnap.exists()) setShop({ id:shopSnap.id, ...shopSnap.data() });
          }
        }
        // Fetch last 3 orders
        const ordSnap = await getDocs(
          query(collection(db,"orders"), orderBy("createdAt","desc"), limit(3))
        );
        if (!cancelled) setRecentOrders(ordSnap.docs.map(d=>({ id:d.id, ...d.data() })));
      } catch(e) { console.error(e); }
      finally { if (!cancelled) setProfileLoading(false); }
    };

    fetchAll();
    return ()=>{ cancelled = true; };
  }, [user]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  const displayName   = user?.displayName || profile?.displayName || "Beme Member";
  const initials      = displayName.charAt(0).toUpperCase();
  const age           = profile?.age;
  const shoppingPrefs = Array.isArray(profile?.shoppingPreference) ? profile.shoppingPreference : [];
  const profileComplete = !!profile?.displayName && !!profile?.age && shoppingPrefs.length > 0;

  const plan = (subscriptionPlan || shop?.planId || "free").toLowerCase();
  const planColors = PLAN_COLORS[plan] || PLAN_COLORS.free;

  const MOBILE_TABS = [
    { id:"overview",  label:"Overview",  icon:ICONS.account  },
    { id:"orders",    label:"Orders",    icon:ICONS.orders   },
    { id:"saved",     label:"Saved",     icon:ICONS.saved    },
    { id:"settings",  label:"Settings",  icon:ICONS.settings },
    ...(hasStore ? [{ id:"store", label:"My Store", icon:ICONS.store }] : []),
  ];

  if (!user) return null;

  return (
    <div className="acc-page">

      {/* ── Mobile header (hidden on desktop) ── */}
      <div className="acc-mobile-header">
        <div className="acc-mobile-header-inner">
          <div className="acc-mobile-avatar">{initials}</div>
          <div>
            <div className="acc-mobile-name">{displayName}</div>
            <div className="acc-mobile-badge">
              <Ico d={ICONS.member} size={11}/>&nbsp;
              {hasStore ? "Beme Seller" : "Beme Member"}
            </div>
          </div>
          <button className="acc-mobile-edit" onClick={()=>setShowEdit(true)}>Edit</button>
        </div>
      </div>

      {/* ── Mobile tabs ── */}
      <div className="acc-mobile-tabs">
        {MOBILE_TABS.map(t=>(
          <button key={t.id} className={`acc-mobile-tab ${activeTab===t.id?"acc-mobile-tab--active":""}`}
            onClick={()=>setActiveTab(t.id)}>
            <Ico d={t.icon} size={14}/>{t.label}
          </button>
        ))}
      </div>

      <div className="acc-layout">

        {/* ════════════════════════════════════
            LEFT SIDEBAR (desktop)
        ════════════════════════════════════ */}
        <aside className="acc-sidebar">
          {/* User identity */}
          <button className="acc-sidebar-user" onClick={()=>setShowEdit(true)}>
            <div className="acc-sidebar-avatar">{initials}</div>
            <div className="acc-sidebar-name-wrap">
              <div className="acc-sidebar-name">{displayName}</div>
              <div className="acc-sidebar-badge">
                <Ico d={ICONS.member} size={10}/>&nbsp;
                {hasStore ? "Beme Seller" : "Beme Member"}
              </div>
            </div>
          </button>

          {/* Main nav */}
          <div className="acc-sidebar-section">
            <NavLink icon={ICONS.account}  label="My Account"       onClick={()=>setActiveTab("overview")}  active={activeTab==="overview"}/>
            <NavLink icon={ICONS.orders}   label="My Orders"        onClick={()=>setActiveTab("orders")}  active={activeTab==="orders"}/>
            <NavLink icon={ICONS.inbox}    label="Messages"         onClick={()=>navigate("/messages")}/>
            <NavLink icon={ICONS.saved}    label="Saved Items"      onClick={()=>setActiveTab("saved")}   active={activeTab==="saved"} badge={savedCount}/>
            <NavLink icon={ICONS.requests} label="Product Requests" onClick={()=>navigate("/account/requests")}/>
            <NavLink icon={ICONS.notif}    label="Notifications"    onClick={()=>navigate("/account/notifications")} badge={unreadCount} badgeRed/>
          </div>

          {/* Settings */}
          <div className="acc-sidebar-section">
            <div className="acc-sidebar-label">Account</div>
            <NavLink icon={ICONS.settings} label="Manage Account"    onClick={()=>navigate("/account/manage")}/>
            <NavLink icon={ICONS.address}  label="Delivery Addresses" onClick={()=>navigate("/account/addresses")}/>
            <NavLink icon={ICONS.payment}  label="Payment Methods"   onClick={()=>navigate("/account/payments")}/>
          </div>

          {/* Seller section */}
          {hasStore && (
            <div className="acc-sidebar-section">
              <div className="acc-sidebar-label">Seller</div>
              <NavLink icon={ICONS.store}  label="Seller Dashboard" onClick={()=>navigate("/seller-dashboard")} active={activeTab==="store"}/>
              <NavLink icon={ICONS.chart}  label="Store Analytics"  onClick={()=>navigate("/seller-dashboard?tab=analytics")}/>
            </div>
          )}
          {!hasStore && (
            <div className="acc-sidebar-section">
              <NavLink icon={ICONS.store} label="Open a Store" onClick={()=>navigate("/get-a-store")}/>
            </div>
          )}

          {/* Support + logout */}
          <div className="acc-sidebar-section">
            <NavLink icon={ICONS.help}   label="Help & Support" onClick={()=>navigate("/account/help")}/>
            <NavLink icon={ICONS.logout} label="Log Out"        onClick={()=>setShowLogout(true)} danger/>
          </div>
        </aside>

        {/* ════════════════════════════════════
            MAIN CONTENT
        ════════════════════════════════════ */}
        <main className="acc-main">
          <h2 className="acc-main-title">
            {activeTab === "overview"  && "Account Overview"}
            {activeTab === "orders"    && "My Orders"}
            {activeTab === "saved"     && "Saved Items"}
            {activeTab === "settings"  && "Settings"}
            {activeTab === "store"     && "My Store"}
          </h2>

          {/* ── ORDERS tab ── */}
          {activeTab === "orders" && (
            <div className="acc-tab-section">
              {recentOrders.length === 0 ? (
                <div className="acc-empty-state">
                  <div className="acc-empty-icon">
                    <Ico d={ICONS.orders} size={40}/>
                  </div>
                  <div className="acc-empty-title">No orders yet</div>
                  <div className="acc-empty-sub">When you place an order, it will appear here.</div>
                  <button className="acc-primary-btn" onClick={()=>navigate("/")}>
                    Start Shopping
                  </button>
                </div>
              ) : (
                <>
                  {recentOrders.map(order => {
                    const s = order.status || "pending";
                    const sc = ORDER_STATUS_COLORS[s] || ORDER_STATUS_COLORS.pending;
                    return (
                      <div key={order.id} className="acc-order-row acc-order-row--lg"
                        onClick={()=>navigate(`/orders/${order.id}`)}
                        style={{ cursor:"pointer" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div className="acc-order-id">Order #{order.id?.slice(0,8).toUpperCase()}</div>
                          <div className="acc-order-meta">
                            GHS {Number(order.pricing?.total||0).toFixed(2)} ·{" "}
                            {order.createdAt?.toDate?.()?.toLocaleDateString("en-GH",{day:"numeric",month:"short",year:"numeric"})||""}
                          </div>
                          {order.items?.length > 0 && (
                            <div style={{ fontSize:12, color:"var(--muted,#9CA3AF)", marginTop:2 }}>
                              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                        <span className="acc-order-status-badge" style={{ background:sc.bg, color:sc.text }}>
                          {s.charAt(0).toUpperCase()+s.slice(1)}
                        </span>
                      </div>
                    );
                  })}
                  <button className="acc-view-all-btn" onClick={()=>navigate("/orders")}>
                    View all orders →
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── SAVED tab ── */}
          {activeTab === "saved" && (
            <div className="acc-tab-section">
              <div className="acc-empty-state">
                <div className="acc-empty-icon">
                  <Ico d={ICONS.saved} size={40}/>
                </div>
                <div className="acc-empty-title">
                  {savedCount > 0 ? `${savedCount} saved item${savedCount !== 1 ? "s" : ""}` : "No saved items yet"}
                </div>
                <div className="acc-empty-sub">
                  {savedCount > 0
                    ? "Tap below to view your saved products."
                    : "Tap the heart on any product to save it here for later."}
                </div>
                <button className="acc-primary-btn" onClick={()=>navigate("/saved")}>
                  {savedCount > 0 ? "View Saved Items" : "Browse the Shop"}
                </button>
              </div>
            </div>
          )}

          {/* ── SETTINGS tab ── */}
          {activeTab === "settings" && (
            <div className="acc-tab-section">
              {/* Account */}
              <div className="acc-settings-group">
                <div className="acc-settings-group-title">Account</div>
                {[
                  { icon:ICONS.account,  label:"Manage Account",      sub:"Update name, email, password",  path:"/account/manage"        },
                  { icon:ICONS.address,  label:"Delivery Addresses",   sub:"Add or edit saved addresses",   path:"/account/addresses"     },
                  { icon:ICONS.payment,  label:"Payment Methods",      sub:"Cards and mobile money",        path:"/account/payments"      },
                  { icon:ICONS.notif,    label:"Notifications",        sub:unreadCount > 0 ? `${unreadCount} unread` : "Manage alerts",  path:"/account/notifications", badge:unreadCount },
                ].map(item => (
                  <button key={item.path} className="acc-settings-row" onClick={()=>navigate(item.path)}>
                    <div className="acc-settings-row-ico"><Ico d={item.icon} size={18}/></div>
                    <div className="acc-settings-row-info">
                      <div className="acc-settings-row-label">{item.label}</div>
                      <div className="acc-settings-row-sub">{item.sub}</div>
                    </div>
                    {item.badge > 0 && <span className="acc-badge-red">{item.badge}</span>}
                    <Ico d="M9 18l6-6-6-6" size={16} className="acc-settings-row-arr"/>
                  </button>
                ))}
              </div>

              {/* Shopping */}
              <div className="acc-settings-group">
                <div className="acc-settings-group-title">Shopping</div>
                {[
                  { icon:ICONS.requests, label:"Product Requests",   sub:"Track items you've requested",  path:"/account/requests"  },
                  { icon:ICONS.saved,    label:"Saved Items",        sub:`${savedCount} item${savedCount!==1?"s":""}`,              path:"/saved"             },
                  { icon:ICONS.inbox,    label:"Messages",           sub:"Chat with sellers",             path:"/messages"          },
                ].map(item => (
                  <button key={item.path} className="acc-settings-row" onClick={()=>navigate(item.path)}>
                    <div className="acc-settings-row-ico"><Ico d={item.icon} size={18}/></div>
                    <div className="acc-settings-row-info">
                      <div className="acc-settings-row-label">{item.label}</div>
                      <div className="acc-settings-row-sub">{item.sub}</div>
                    </div>
                    <Ico d="M9 18l6-6-6-6" size={16} className="acc-settings-row-arr"/>
                  </button>
                ))}
              </div>

              {/* Selling */}
              <div className="acc-settings-group">
                <div className="acc-settings-group-title">Selling</div>
                {hasStore ? [
                  { icon:ICONS.store, label:"Seller Dashboard",  sub:"Manage your store",           path:"/seller-dashboard"               },
                  { icon:ICONS.chart, label:"Store Analytics",   sub:"Sales and performance",       path:"/seller-dashboard?tab=analytics" },
                ] : [
                  { icon:ICONS.store, label:"Open a Free Store", sub:"Start selling on Beme Market", path:"/get-a-store" },
                ].map(item => (
                  <button key={item.path} className="acc-settings-row" onClick={()=>navigate(item.path)}>
                    <div className="acc-settings-row-ico"><Ico d={item.icon} size={18}/></div>
                    <div className="acc-settings-row-info">
                      <div className="acc-settings-row-label">{item.label}</div>
                      <div className="acc-settings-row-sub">{item.sub}</div>
                    </div>
                    <Ico d="M9 18l6-6-6-6" size={16} className="acc-settings-row-arr"/>
                  </button>
                ))}
              </div>

              {/* Help */}
              <div className="acc-settings-group">
                <div className="acc-settings-group-title">Support</div>
                {[
                  { icon:ICONS.help,   label:"Help & Support",  sub:"FAQs and guides",      path:"/account/help"    },
                  { icon:ICONS.inbox,  label:"Contact Us",      sub:"Reach our support team", path:"/account/contact" },
                ].map(item => (
                  <button key={item.path} className="acc-settings-row" onClick={()=>navigate(item.path)}>
                    <div className="acc-settings-row-ico"><Ico d={item.icon} size={18}/></div>
                    <div className="acc-settings-row-info">
                      <div className="acc-settings-row-label">{item.label}</div>
                      <div className="acc-settings-row-sub">{item.sub}</div>
                    </div>
                    <Ico d="M9 18l6-6-6-6" size={16} className="acc-settings-row-arr"/>
                  </button>
                ))}
              </div>

              {/* Log out */}
              <button className="acc-settings-row acc-settings-row--danger" onClick={()=>setShowLogout(true)}>
                <div className="acc-settings-row-ico"><Ico d={ICONS.logout} size={18}/></div>
                <div className="acc-settings-row-info">
                  <div className="acc-settings-row-label">Log Out</div>
                  <div className="acc-settings-row-sub">{user.email}</div>
                </div>
              </button>
            </div>
          )}

          {/* ── MY STORE tab ── */}
          {activeTab === "store" && hasStore && (
            <div className="acc-tab-section">
              <div className="acc-overview-grid">
                <OverviewCard title="My Store"
                  actionLabel="Dashboard →" onAction={()=>navigate("/seller-dashboard")}>
                  <div className="acc-store-header">
                    <div>
                      <div className="acc-store-name">{shop?.shopName||"My Store"}</div>
                      <div className="acc-store-status">
                        <div className="acc-store-status-dot" style={{ background: shop?.status==="active"?"#22C55E":"#F59E0B" }}/>
                        {shop?.status==="active"?"Store is live":"Pending activation"}
                      </div>
                    </div>
                    <span className="acc-plan-badge" style={{ background:planColors.bg, color:planColors.text }}>
                      {plan.charAt(0).toUpperCase()+plan.slice(1)}
                    </span>
                  </div>
                  <div className="acc-store-btns">
                    <button className="acc-store-btn acc-store-btn--primary" onClick={()=>navigate("/seller-dashboard")}>
                      <Ico d={ICONS.chart} size={15}/> Dashboard
                    </button>
                    {shop?.slug && (
                      <button className="acc-store-btn acc-store-btn--ghost" onClick={()=>navigate(`/store/${shop.slug}`)}>
                        <Ico d={ICONS.external} size={14}/> View Store
                      </button>
                    )}
                  </div>
                </OverviewCard>
              </div>
            </div>
          )}

          {/* ── OVERVIEW tab ── */}
          {activeTab === "overview" && (
          <div className="acc-overview-grid">

            {/* ── 1. Account Details ── */}
            <OverviewCard title="Account Details"
              actionLabel="Edit" onAction={()=>setShowEdit(true)}>
              <div className="acc-details-name">{displayName}</div>
              <div className="acc-details-email">{user.email}</div>
              <div className="acc-details-pills">
                <span className="acc-details-pill">
                  <Ico d={ICONS.member} size={11}/>
                  {hasStore ? "Beme Seller" : "Beme Member"}
                </span>
                {age && <span className="acc-details-pill">{AGE_LABELS[age]||age}</span>}
              </div>
              {shoppingPrefs.length > 0 && (
                <div className="acc-prefs-wrap" style={{ marginTop:12 }}>
                  {shoppingPrefs.slice(0,4).map(id=>{
                    const e = PREF_OPTIONS.find(o=>o.id===id);
                    return e ? (
                      <span key={id} className="acc-pref-chip">
                        <PrefIcon id={id}/>{e.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </OverviewCard>

            {/* ── 2. My Store OR Get a Store ── */}
            {hasStore ? (
              <OverviewCard title="My Store"
                actionLabel="Dashboard →" onAction={()=>navigate("/seller-dashboard")}>
                <div className="acc-store-header">
                  <div>
                    <div className="acc-store-name">{shop?.shopName||"My Store"}</div>
                    <div className="acc-store-status">
                      <div className="acc-store-status-dot" style={{ background: shop?.status==="active"?"#22C55E":"#F59E0B", boxShadow: `0 0 0 3px ${shop?.status==="active"?"rgba(34,197,94,0.18)":"rgba(245,158,11,0.18)"}` }}/>
                      {shop?.status==="active"?"Store is live":"Pending activation"}
                    </div>
                  </div>
                  <span className="acc-plan-badge" style={{ background:planColors.bg, color:planColors.text }}>
                    {plan.charAt(0).toUpperCase()+plan.slice(1)}
                  </span>
                </div>
                <div className="acc-store-btns">
                  <button className="acc-store-btn acc-store-btn--primary"
                    onClick={()=>navigate("/seller-dashboard")}>
                    <Ico d={ICONS.chart} size={15}/> Dashboard
                  </button>
                  {shop?.slug && (
                    <button className="acc-store-btn acc-store-btn--ghost"
                      onClick={()=>navigate(`/store/${shop.slug}`)}>
                      <Ico d={ICONS.external} size={14}/> View Store
                    </button>
                  )}
                </div>
              </OverviewCard>
            ) : (
              <div className="acc-overview-card">
                <div className="acc-card-body" style={{ padding:0 }}>
                  <button className="acc-get-store-card" onClick={()=>navigate("/get-a-store")}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                      <Ico d={ICONS.store} size={20} className=""/>
                      <div className="acc-get-store-title">Start Selling on Beme Market</div>
                    </div>
                    <div className="acc-get-store-sub">
                      Join thousands of Ghanaian businesses. Open your store and reach customers across the country.
                    </div>
                    <span className="acc-get-store-cta">
                      Open a Free Store →
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* ── 3. Recent Orders ── */}
            <OverviewCard title="My Orders"
              actionLabel="View all →" onAction={()=>navigate("/orders")}>
              {recentOrders.length === 0 ? (
                <div>
                  <div className="acc-orders-empty" style={{ marginBottom:12 }}>No orders yet.</div>
                  <button className="acc-add-link" onClick={()=>navigate("/")}>
                    <Ico d={ICONS.store} size={14}/> Start shopping
                  </button>
                </div>
              ) : (
                recentOrders.map(order=>{
                  const s = order.status||"pending";
                  const sc = ORDER_STATUS_COLORS[s]||ORDER_STATUS_COLORS.pending;
                  return (
                    <div key={order.id} className="acc-order-row">
                      <div>
                        <div className="acc-order-id">#{order.id?.slice(0,8).toUpperCase()}</div>
                        <div className="acc-order-meta">
                          GHS {Number(order.pricing?.total||0).toFixed(2)} ·{" "}
                          {order.createdAt?.toDate?.()?.toLocaleDateString("en-GH",{day:"numeric",month:"short"})||""}
                        </div>
                      </div>
                      <span className="acc-order-status-badge" style={{ background:sc.bg, color:sc.text }}>
                        {s.charAt(0).toUpperCase()+s.slice(1)}
                      </span>
                    </div>
                  );
                })
              )}
            </OverviewCard>

            {/* ── 4. Saved & Notifications ── */}
            <OverviewCard title="Saved & Notifications">
              <div className="acc-count-tiles">
                <button className="acc-count-tile" onClick={()=>navigate("/saved")}>
                  <div className="acc-count-num">{savedCount}</div>
                  <div className="acc-count-lbl">Saved Items</div>
                </button>
                <button className="acc-count-tile" onClick={()=>navigate("/account/notifications")}>
                  <div className="acc-count-num">{unreadCount}</div>
                  <div className="acc-count-lbl">Unread</div>
                </button>
                <button className="acc-count-tile" onClick={()=>navigate("/orders")}>
                  <div className="acc-count-num">{recentOrders.length}</div>
                  <div className="acc-count-lbl">Recent Orders</div>
                </button>
              </div>
            </OverviewCard>

            {/* ── 5. Address Book ── */}
            <OverviewCard title="Address Book"
              actionLabel="Manage →" onAction={()=>navigate("/account/addresses")}>
              {profile?.address ? (
                <div className="acc-address-preview">{profile.address}</div>
              ) : (
                <div className="acc-address-empty">No default delivery address saved.</div>
              )}
              <button className="acc-add-link" onClick={()=>navigate("/account/addresses")}>
                <Ico d={ICONS.plus} size={14}/>
                {profile?.address ? "Manage addresses" : "Add default address"}
              </button>
            </OverviewCard>

            {/* ── 6. Shopping Preferences ── */}
            <OverviewCard title="Shopping Preferences"
              actionLabel="Edit →" onAction={()=>setShowEdit(true)}>
              {!profileComplete && (
                <div className="acc-prefs-empty">
                  Complete your profile to get personalised recommendations.
                </div>
              )}
              {shoppingPrefs.length > 0 ? (
                <div className="acc-prefs-wrap">
                  {shoppingPrefs.map(id=>{
                    const e = PREF_OPTIONS.find(o=>o.id===id);
                    return e ? (
                      <span key={id} className="acc-pref-chip">
                        <PrefIcon id={id}/>{e.label}
                      </span>
                    ) : null;
                  })}
                </div>
              ) : (
                <button className="acc-add-link" onClick={()=>setShowEdit(true)}>
                  <Ico d={ICONS.plus} size={14}/> Set preferences
                </button>
              )}
            </OverviewCard>

          </div>
          )}{/* /overview tab */}

        </main>
      </div>{/* /layout */}

      {showLogout && <LogoutSheet onConfirm={handleLogout} onCancel={()=>setShowLogout(false)}/>}
      {showEdit   && <EditProfileModal profile={profile} displayName={displayName} onClose={()=>setShowEdit(false)} onSaved={u=>setProfile(p=>({...p,...u}))}/>}
    </div>
  );
}