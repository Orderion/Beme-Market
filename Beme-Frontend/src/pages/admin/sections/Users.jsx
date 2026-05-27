import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

function Ico({ d, size=14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{d.split("|").map((seg,i)=><path key={i} d={seg.trim()}/>)}</svg>; }

function fmt(ts) {
  if (!ts) return "—";
  const d = ts?.toMillis ? new Date(ts.toMillis()) : new Date(ts);
  return d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
}

function getRoleLabel(u) {
  const r = String(u.role || u.sellerStatus || "").toLowerCase();
  if (r === "super_admin" || r === "admin") return "Admin";
  if (r === "shop_admin" || r === "seller" || u.isSeller) return "Seller";
  return "Customer";
}

function getBadgeClass(label) {
  if (label === "Admin")    return "ap-badge ap-badge--purple";
  if (label === "Seller")   return "ap-badge ap-badge--blue";
  return "ap-badge ap-badge--gray";
}

export default function UsersSection() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");
  const [updating, setUpdating] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        if (alive) setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch(e) { console.error(e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (filter === "customers") list = list.filter(u => getRoleLabel(u) === "Customer");
    if (filter === "sellers")   list = list.filter(u => getRoleLabel(u) === "Seller");
    if (filter === "admins")    list = list.filter(u => getRoleLabel(u) === "Admin");
    if (filter === "suspended") list = list.filter(u => u.suspended === true || u.sellerStatus === "suspended");
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(u => [u.email, u.displayName, u.id, u.role, u.sellerStatus].join(" ").toLowerCase().includes(q));
    return list;
  }, [users, filter, search]);

  const counts = useMemo(() => ({
    all: users.length,
    customers: users.filter(u => getRoleLabel(u) === "Customer").length,
    sellers:   users.filter(u => getRoleLabel(u) === "Seller").length,
    admins:    users.filter(u => getRoleLabel(u) === "Admin").length,
    suspended: users.filter(u => u.suspended === true || u.sellerStatus === "suspended").length,
  }), [users]);

  const suspendUser = async (uid, suspend) => {
    setUpdating(uid);
    try {
      await updateDoc(doc(db, "users", uid), {
        suspended: suspend,
        sellerStatus: suspend ? "suspended" : "active",
        updatedAt: serverTimestamp(),
      });
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, suspended: suspend, sellerStatus: suspend ? "suspended" : "active" } : u));
      if (selected?.id === uid) setSelected(u => ({ ...u, suspended: suspend }));
    } catch(e) { console.error(e); }
    finally { setUpdating(""); }
  };

  const FILTERS = [
    { key:"all",       label:`All (${counts.all})` },
    { key:"customers", label:`Customers (${counts.customers})` },
    { key:"sellers",   label:`Sellers (${counts.sellers})` },
    { key:"admins",    label:`Admins (${counts.admins})` },
    { key:"suspended", label:`Suspended (${counts.suspended})` },
  ];

  return (
    <div>
      <div className="ap-page-header">
        <div className="ap-page-title">Users</div>
        <div className="ap-page-sub">All registered users — customers and sellers</div>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div className="ap-search" style={{maxWidth:320}}>
          <span className="ap-search-icon"><Ico d="M21 21l-4.35-4.35 M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0" size={13}/></span>
          <input className="ap-input" placeholder="Search name, email, ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="ap-filter-tabs">
          {FILTERS.map(f=>(
            <button key={f.key} className={`ap-filter-tab${filter===f.key?" ap-filter-tab--active":""}`} onClick={()=>setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="ap-table-wrap">
        <table className="ap-table">
          <thead>
            <tr>
              <th>User</th><th>Role</th><th>Plan</th><th>Status</th><th>Joined</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? [1,2,3,4,5].map(i=>(
              <tr key={i}>
                {[1,2,3,4,5,6].map(j=><td key={j}><div className="ap-skeleton" style={{height:16,borderRadius:4}}/></td>)}
              </tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="ap-empty"><div className="ap-empty-title">No users found</div></div>
              </td></tr>
            ) : filtered.map(u => {
              const role = getRoleLabel(u);
              const isSuspended = u.suspended === true || u.sellerStatus === "suspended";
              const name = u.displayName || u.email?.split("@")[0] || "User";
              const plan = u.subscriptionPlan || u.planId || "—";
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:30,height:30,borderRadius:8,background:"var(--ap-purple-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"var(--ap-purple-lt)",flexShrink:0}}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--ap-text)"}}>{name}</div>
                        <div style={{fontSize:11,color:"var(--ap-muted)"}}>{u.email || u.id?.slice(0,12)}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={getBadgeClass(role)}>{role}</span></td>
                  <td><span style={{fontSize:12,color:"var(--ap-text2)"}}>{plan}</span></td>
                  <td>
                    {isSuspended
                      ? <span className="ap-badge ap-badge--red">Suspended</span>
                      : <span className="ap-badge ap-badge--green">Active</span>}
                  </td>
                  <td><span style={{fontSize:12,color:"var(--ap-muted)"}}>{fmt(u.createdAt)}</span></td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button className="ap-btn ap-btn--ghost ap-btn--sm" onClick={()=>setSelected(u)}>View</button>
                      {isSuspended
                        ? <button className="ap-btn ap-btn--success ap-btn--sm" onClick={()=>suspendUser(u.id,false)} disabled={updating===u.id}>Restore</button>
                        : role !== "Admin" && <button className="ap-btn ap-btn--danger ap-btn--sm" onClick={()=>suspendUser(u.id,true)} disabled={updating===u.id}>Suspend</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{fontSize:12,color:"var(--ap-muted)",marginTop:8}}>{filtered.length} user{filtered.length!==1?"s":""} shown</div>

      {/* User detail modal */}
      {selected && (
        <div className="ap-modal-backdrop" onClick={()=>setSelected(null)}>
          <div className="ap-modal" onClick={e=>e.stopPropagation()}>
            <div className="ap-modal-head">
              <span className="ap-modal-title">User Profile</span>
              <button className="ap-modal-close" onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div className="ap-modal-body">
              <div style={{display:"flex",alignItems:"center",gap:14,padding:"4px 0 10px",borderBottom:"1px solid var(--ap-border2)"}}>
                <div style={{width:48,height:48,borderRadius:12,background:"var(--ap-purple-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"var(--ap-purple-lt)"}}>
                  {(selected.displayName||selected.email||"U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:"var(--ap-text)"}}>{selected.displayName||"—"}</div>
                  <div style={{fontSize:13,color:"var(--ap-muted)"}}>{selected.email}</div>
                </div>
              </div>
              {[
                ["User ID", selected.id],
                ["Role", getRoleLabel(selected)],
                ["Plan", selected.subscriptionPlan || selected.planId || "—"],
                ["Status", selected.suspended ? "Suspended" : "Active"],
                ["Store ID", selected.storeId || "—"],
                ["Joined", fmt(selected.createdAt)],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--ap-border2)",fontSize:13}}>
                  <span style={{color:"var(--ap-muted)"}}>{k}</span>
                  <span style={{color:"var(--ap-text)",fontWeight:500,textAlign:"right",maxWidth:"60%",wordBreak:"break-all"}}>{v}</span>
                </div>
              ))}
            </div>
            <div className="ap-modal-footer">
              <button className="ap-btn ap-btn--ghost" onClick={()=>setSelected(null)}>Close</button>
              {getRoleLabel(selected) !== "Admin" && (
                selected.suspended
                  ? <button className="ap-btn ap-btn--success" onClick={()=>{ suspendUser(selected.id,false); setSelected(null); }}>Restore User</button>
                  : <button className="ap-btn ap-btn--danger" onClick={()=>{ suspendUser(selected.id,true); setSelected(null); }}>Suspend User</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
