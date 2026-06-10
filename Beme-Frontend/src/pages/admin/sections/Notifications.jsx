// src/pages/admin/sections/Notifications.jsx
// Send notifications to specific sellers, selected sellers, or all sellers
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../../firebase";
import {
  notifyAllSellers,
  notifyMultipleSellers,
  createSellerNotification,
  NOTIF_TYPES,
} from "../../../services/sellerNotificationService";

function Ico({ d, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}
const IC = {
  send:   "M22 2L11 13|M22 2L15 22l-4-9-9-4 20-7z",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  check:  "M20 6L9 17l-5-5",
  bell:   "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9|M13.73 21a2 2 0 0 1-3.46 0",
  close:  "M18 6L6 18|M6 6l12 12",
  users:  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 7a4 4 0 108 0 4 4 0 00-8 0|M23 21v-2a4 4 0 00-3-3.87|M16 3.13a4 4 0 010 7.75",
};

const NOTIF_TYPE_OPTIONS = [
  { value: NOTIF_TYPES.ANNOUNCEMENT, label: "Announcement"  },
  { value: NOTIF_TYPES.SYSTEM,       label: "System"        },
  { value: NOTIF_TYPES.ORDER_STATUS, label: "Order Update"  },
  { value: NOTIF_TYPES.SUBSCRIPTION_EXPIRY, label: "Subscription Warning" },
  { value: NOTIF_TYPES.STORE_VERIFIED,      label: "Store Verified" },
  { value: NOTIF_TYPES.STORE_SUSPENDED,     label: "Store Suspended" },
];

export default function NotificationsSection() {
  const [target,    setTarget]    = useState("all"); // all | selected | single
  const [sellers,   setSellers]   = useState([]);
  const [sellLoading, setSellLoading] = useState(false);
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState([]); // array of { uid, shopName, email }
  const [singleId,  setSingleId]  = useState("");

  const [notifType, setNotifType] = useState(NOTIF_TYPES.ANNOUNCEMENT);
  const [title,     setTitle]     = useState("");
  const [body,      setBody]      = useState("");
  const [linkTab,   setLinkTab]   = useState("");
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState("");

  // Load sellers for picker
  useEffect(() => {
    if (target === "all") return;
    setSellLoading(true);
    getDocs(collection(db, "storeApplications")).then(snap => {
      setSellers(snap.docs.map(d => ({
        uid:      d.id,
        shopName: d.data().shopName || d.data().businessName || "",
        email:    d.data().email || "",
        planId:   d.data().planId || "basic",
      })));
    }).catch(() => {}).finally(() => setSellLoading(false));
  }, [target]);

  const filteredSellers = sellers.filter(s =>
    !search || s.shopName.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.uid.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (s) => {
    setSelected(prev =>
      prev.find(x => x.uid === s.uid)
        ? prev.filter(x => x.uid !== s.uid)
        : [...prev, s]
    );
  };

  const handleSend = async () => {
    setError("");
    if (!title.trim()) { setError("Title is required."); return; }
    if (!body.trim())  { setError("Message body is required."); return; }
    if (target === "selected" && selected.length === 0) { setError("Select at least one seller."); return; }
    if (target === "single"   && !singleId.trim())      { setError("Enter a seller ID or choose from the list."); return; }

    setSending(true);
    try {
      const payload = {
        type:    notifType,
        title:   title.trim(),
        body:    body.trim(),
        linkTab: linkTab || null,
      };

      if (target === "all") {
        await notifyAllSellers(payload);
      } else if (target === "selected") {
        await notifyMultipleSellers(selected.map(s => s.uid), payload);
      } else {
        await createSellerNotification(singleId.trim(), payload);
      }

      setSent(true);
      setTitle(""); setBody(""); setLinkTab(""); setSelected([]);
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      setError(e.message || "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth:800, fontFamily:"var(--font-main,'DM Sans',sans-serif)" }}>
      <div className="ap-page-header">
        <div className="ap-page-title">Send Seller Notifications</div>
        <div className="ap-page-sub">Send announcements or alerts to sellers directly from the admin panel</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        {/* ── Left: Compose ── */}
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid rgba(0,0,0,0.07)", padding:20 }}>
          <div style={{ fontSize:12, fontWeight:800, color:"#9CA3AF", textTransform:"uppercase",
            letterSpacing:"0.07em", marginBottom:16 }}>Compose Notification</div>

          {/* Notification type */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", display:"block", marginBottom:6,
              textTransform:"uppercase", letterSpacing:"0.06em" }}>Type</label>
            <select value={notifType} onChange={e => setNotifType(e.target.value)}
              style={{ width:"100%", height:40, padding:"0 12px", border:"1.5px solid rgba(0,0,0,0.1)",
                borderRadius:8, fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none" }}>
              {NOTIF_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", display:"block", marginBottom:6,
              textTransform:"uppercase", letterSpacing:"0.06em" }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. New feature: Referral System is live!"
              style={{ width:"100%", height:40, padding:"0 12px", border:"1.5px solid rgba(0,0,0,0.1)",
                borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
          </div>

          {/* Body */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", display:"block", marginBottom:6,
              textTransform:"uppercase", letterSpacing:"0.06em" }}>Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Write the notification message here…"
              rows={4}
              style={{ width:"100%", padding:"10px 12px", border:"1.5px solid rgba(0,0,0,0.1)",
                borderRadius:8, fontSize:13, fontFamily:"inherit", resize:"vertical",
                outline:"none", lineHeight:1.6, boxSizing:"border-box" }} />
          </div>

          {/* Link tab (optional) */}
          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", display:"block", marginBottom:6,
              textTransform:"uppercase", letterSpacing:"0.06em" }}>
              Link to Dashboard Tab <span style={{ fontWeight:400, textTransform:"none" }}>(optional)</span>
            </label>
            <select value={linkTab} onChange={e => setLinkTab(e.target.value)}
              style={{ width:"100%", height:40, padding:"0 12px", border:"1.5px solid rgba(0,0,0,0.1)",
                borderRadius:8, fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none" }}>
              <option value="">No link</option>
              <option value="orders">Orders</option>
              <option value="withdrawals">Withdrawals</option>
              <option value="marketing">Marketing</option>
              <option value="referrals">Referrals</option>
              <option value="subscription">Subscription</option>
              <option value="settings">Settings</option>
              <option value="help">Help</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>

          {error && (
            <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(185,28,28,0.06)",
              border:"1px solid rgba(185,28,28,0.2)", color:"#b91c1c", fontSize:13,
              fontWeight:600, marginBottom:14 }}>
              {error}
            </div>
          )}

          {sent && (
            <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(34,197,94,0.08)",
              border:"1px solid rgba(34,197,94,0.2)", color:"#15803d", fontSize:13,
              fontWeight:700, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
              <Ico d={IC.check} size={14} color="#15803d" /> Notification sent!
            </div>
          )}

          <button onClick={handleSend} disabled={sending}
            style={{ width:"100%", padding:"11px 16px", borderRadius:10, border:"none",
              background:"#111", color:"#fff", fontSize:14, fontWeight:800,
              cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center",
              justifyContent:"center", gap:8, opacity: sending ? 0.6 : 1, transition:"opacity 0.15s" }}>
            <Ico d={IC.send} size={14} color="#fff" />
            {sending ? "Sending…" : `Send to ${target === "all" ? "All Sellers" : target === "selected" ? `${selected.length} Sellers` : "Seller"}`}
          </button>
        </div>

        {/* ── Right: Recipients ── */}
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid rgba(0,0,0,0.07)", padding:20 }}>
          <div style={{ fontSize:12, fontWeight:800, color:"#9CA3AF", textTransform:"uppercase",
            letterSpacing:"0.07em", marginBottom:16 }}>Recipients</div>

          {/* Target selector */}
          <div style={{ display:"flex", gap:6, marginBottom:16 }}>
            {[["all","All Sellers"],["selected","Select Sellers"],["single","By ID"]].map(([val,label]) => (
              <button key={val} onClick={() => { setTarget(val); setSelected([]); setSingleId(""); }}
                style={{ flex:1, padding:"7px 10px", borderRadius:8, border:"none", cursor:"pointer",
                  fontSize:12, fontWeight:700, fontFamily:"inherit",
                  background: target === val ? "#111" : "#f5f5f5",
                  color:      target === val ? "#fff" : "#6B7280" }}>
                {label}
              </button>
            ))}
          </div>

          {/* All sellers */}
          {target === "all" && (
            <div style={{ padding:"20px 16px", textAlign:"center", borderRadius:12,
              background:"rgba(4,110,242,0.05)", border:"1px solid rgba(4,110,242,0.15)" }}>
              <Ico d={IC.users} size={32} color="#046EF2" sw={1.2} />
              <div style={{ fontSize:14, fontWeight:800, color:"#111", marginTop:10, marginBottom:4 }}>
                Broadcast to All Sellers
              </div>
              <div style={{ fontSize:13, color:"#6B7280" }}>
                This notification will be sent to every registered seller on Beme Market.
              </div>
            </div>
          )}

          {/* Single ID */}
          {target === "single" && (
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", display:"block", marginBottom:6,
                textTransform:"uppercase", letterSpacing:"0.06em" }}>Seller UID or Shop ID</label>
              <input value={singleId} onChange={e => setSingleId(e.target.value)}
                placeholder="Paste Firebase UID here"
                style={{ width:"100%", height:40, padding:"0 12px", border:"1.5px solid rgba(0,0,0,0.1)",
                  borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box",
                  marginBottom:12 }} />
              <div style={{ fontSize:11, color:"#9CA3AF" }}>Or search and click a seller below:</div>
            </div>
          )}

          {/* Search + picker */}
          {(target === "selected" || target === "single") && (
            <>
              <div style={{ position:"relative", marginBottom:10, marginTop: target === "selected" ? 0 : 8 }}>
                <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", display:"flex" }}>
                  <Ico d={IC.search} size={14} color="#9CA3AF" />
                </span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email, or ID…"
                  style={{ width:"100%", height:38, paddingLeft:34, paddingRight:12,
                    border:"1.5px solid rgba(0,0,0,0.1)", borderRadius:8,
                    fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
              </div>

              {/* Selected chips */}
              {target === "selected" && selected.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                  {selected.map(s => (
                    <span key={s.uid} style={{ display:"inline-flex", alignItems:"center", gap:5,
                      padding:"3px 9px", borderRadius:100, background:"rgba(4,110,242,0.08)",
                      border:"1px solid rgba(4,110,242,0.2)", fontSize:11, fontWeight:700, color:"#046EF2" }}>
                      {s.shopName || s.uid.slice(0,8)}
                      <button onClick={() => toggleSelect(s)} style={{ background:"none", border:"none",
                        cursor:"pointer", padding:0, display:"flex", color:"#046EF2" }}>
                        <Ico d={IC.close} size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Seller list */}
              <div style={{ maxHeight:220, overflowY:"auto", borderRadius:10,
                border:"1px solid rgba(0,0,0,0.07)" }}>
                {sellLoading ? (
                  <div style={{ padding:16, textAlign:"center", color:"#9CA3AF", fontSize:13 }}>Loading sellers…</div>
                ) : filteredSellers.slice(0, 50).map(s => {
                  const isChecked = selected.find(x => x.uid === s.uid);
                  return (
                    <div key={s.uid} onClick={() => target === "single" ? setSingleId(s.uid) : toggleSelect(s)}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", cursor:"pointer",
                        borderBottom:"1px solid rgba(0,0,0,0.05)",
                        background: isChecked || singleId === s.uid ? "rgba(4,110,242,0.05)" : "transparent",
                        transition:"background 0.1s" }}>
                      {target === "selected" && (
                        <div style={{ width:18, height:18, borderRadius:5, border:"2px solid",
                          borderColor: isChecked ? "#046EF2" : "rgba(0,0,0,0.15)",
                          background: isChecked ? "#046EF2" : "transparent",
                          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          {isChecked && <Ico d={IC.check} size={10} color="#fff" sw={2.5} />}
                        </div>
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#111",
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {s.shopName || "Unnamed Store"}
                        </div>
                        <div style={{ fontSize:11, color:"#9CA3AF" }}>{s.email || s.uid.slice(0,16)}</div>
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:100,
                        background:"rgba(0,0,0,0.06)", color:"#6B7280", textTransform:"capitalize" }}>
                        {s.planId}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}