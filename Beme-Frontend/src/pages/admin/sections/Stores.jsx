import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";

function fmt(ts) { if (!ts) return "—"; const d = ts?.toMillis?new Date(ts.toMillis()):new Date(ts); return d.toLocaleDateString("en-GH",{day:"numeric",month:"short",year:"numeric"}); }

export default function StoresSection() {
  const { user } = useAuth();
  const [shops,   setShops]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");
  const [modal,   setModal]   = useState(null);
  const [reason,  setReason]  = useState("");
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "shops"));
      setShops(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = shops;
    if (filter === "active")    list = list.filter(s => s.status === "active");
    if (filter === "suspended") list = list.filter(s => s.status === "suspended");
    if (filter === "pending")   list = list.filter(s => !s.status || s.status === "pending");
    if (filter === "verified")  list = list.filter(s => s.verified === true);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(s => [s.shopName, s.ownerId, s.planId, s.status].join(" ").toLowerCase().includes(q));
    return list;
  }, [shops, filter, search]);

  const counts = { all:shops.length, active:shops.filter(s=>s.status==="active").length, suspended:shops.filter(s=>s.status==="suspended").length, pending:shops.filter(s=>!s.status||s.status==="pending").length, verified:shops.filter(s=>s.verified===true).length };

  const handleAction = async (action) => {
    if (!modal) return;
    if (["suspend","freeze"].includes(action) && !reason.trim()) { setMsg("❌ Reason required for this action."); return; }
    setProcessing(true); setMsg("");
    try {
      const updates = { updatedAt: serverTimestamp() };
      if (action === "suspend")   { updates.status = "suspended"; updates.suspensionReason = reason; updates.suspendedBy = user?.uid; }
      if (action === "activate")  { updates.status = "active"; updates.suspensionReason = null; }
      if (action === "freeze")    { updates.withdrawalsFrozen = true; updates.freezeReason = reason; }
      if (action === "unfreeze")  { updates.withdrawalsFrozen = false; updates.freezeReason = null; }
      if (action === "verify")    { updates.verified = true; updates.verifiedBadge = "verified"; }
      if (action === "unverify")  { updates.verified = false; }
      await updateDoc(doc(db, "shops", modal.id), updates);
      if (action === "suspend" && modal.ownerId) await updateDoc(doc(db,"users",modal.ownerId),{sellerStatus:"suspended"}).catch(()=>{});
      if (action === "activate" && modal.ownerId) await updateDoc(doc(db,"users",modal.ownerId),{sellerStatus:"active"}).catch(()=>{});
      await addDoc(collection(db,"adminLogs"),{adminId:user?.uid,action,target:"shop",targetId:modal.id,reason:reason||null,timestamp:serverTimestamp()}).catch(()=>{});
      setShops(prev => prev.map(s => s.id===modal.id ? {...s,...updates} : s));
      setMsg("✅ Done.");
      setTimeout(() => { setModal(null); setReason(""); setMsg(""); }, 1200);
    } catch(e) { setMsg("❌ " + (e.message || "Failed.")); }
    finally { setProcessing(false); }
  };

  const PLAN_COLORS = { pro:"var(--ap-purple)", standard:"var(--ap-info)", starter:"var(--ap-warning)", free:"var(--ap-muted)", basic:"var(--ap-muted)" };

  return (
    <div>
      <div className="ap-page-header">
        <div className="ap-page-title">Stores</div>
        <div className="ap-page-sub">All seller stores — manage, suspend, verify, freeze</div>
      </div>

      <div className="ap-stats-grid" style={{gridTemplateColumns:"repeat(5,1fr)",marginBottom:14}}>
        {[["Total",counts.all],["Active",counts.active],["Suspended",counts.suspended],["Pending",counts.pending],["Verified",counts.verified]].map(([l,v])=>(
          <div key={l} className="ap-stat" style={{padding:"14px 16px"}}>
            <div className="ap-stat-label">{l}</div>
            <div className="ap-stat-value" style={{fontSize:22}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div className="ap-search" style={{maxWidth:280}}>
          <input className="ap-input" placeholder="Search store name, owner ID…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:12}}/>
        </div>
        <div className="ap-filter-tabs">
          {[["all","All"],["active","Active"],["suspended","Suspended"],["pending","Pending"],["verified","Verified"]].map(([k,l])=>(
            <button key={k} className={`ap-filter-tab${filter===k?" ap-filter-tab--active":""}`} onClick={()=>setFilter(k)}>{l}</button>
          ))}
        </div>
        <button className="ap-btn ap-btn--ghost ap-btn--sm" style={{marginLeft:"auto"}} onClick={load}>↺ Refresh</button>
      </div>

      <div className="ap-table-wrap">
        <table className="ap-table">
          <thead><tr><th>Store</th><th>Owner</th><th>Plan</th><th>Status</th><th>Verified</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? [1,2,3].map(i=><tr key={i}>{[1,2,3,4,5,6,7].map(j=><td key={j}><div className="ap-skeleton" style={{height:16,borderRadius:4}}/></td>)}</tr>) :
            filtered.length===0 ? <tr><td colSpan={7}><div className="ap-empty"><div className="ap-empty-title">No stores found</div></div></td></tr> :
            filtered.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {s.logoUrl ? <img src={s.logoUrl} alt="" style={{width:30,height:30,borderRadius:7,objectFit:"cover"}}/> : <div style={{width:30,height:30,borderRadius:7,background:"var(--ap-purple-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🏪</div>}
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--ap-text)"}}>{s.shopName||"Unnamed Store"}</div>
                      <div style={{fontSize:11,color:"var(--ap-muted)"}}>{s.slug||""}</div>
                    </div>
                  </div>
                </td>
                <td><span style={{fontSize:12,color:"var(--ap-muted)",fontFamily:"monospace"}}>{s.ownerId?.slice(0,10)||"—"}</span></td>
                <td><span className="ap-badge" style={{background:`${PLAN_COLORS[s.planId]||"var(--ap-muted)"}20`,color:PLAN_COLORS[s.planId]||"var(--ap-muted)"}}>{s.planId||"basic"}</span></td>
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span className={`ap-badge ap-badge--${s.status==="active"?"green":s.status==="suspended"?"red":"amber"}`}>{s.status||"pending"}</span>
                    {s.withdrawalsFrozen && <span className="ap-badge ap-badge--red">Frozen</span>}
                  </div>
                </td>
                <td><span className={`ap-badge ap-badge--${s.verified?"green":"gray"}`}>{s.verified?"✓ Verified":"Unverified"}</span></td>
                <td><span style={{fontSize:12,color:"var(--ap-muted)"}}>{fmt(s.createdAt)}</span></td>
                <td><button className="ap-btn ap-btn--secondary ap-btn--sm" onClick={()=>{setModal(s);setReason("");setMsg("");}}>Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="ap-modal-backdrop" onClick={()=>{setModal(null);setReason("");setMsg("");}}>
          <div className="ap-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:480}}>
            <div className="ap-modal-head">
              <span className="ap-modal-title">Manage: {modal.shopName||"Store"}</span>
              <button className="ap-modal-close" onClick={()=>{setModal(null);setReason("");setMsg("");}}>✕</button>
            </div>
            <div className="ap-modal-body">
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:4}}>
                <span className={`ap-badge ap-badge--${modal.status==="active"?"green":"red"}`}>{modal.status||"pending"}</span>
                <span className="ap-badge ap-badge--gray">Plan: {modal.planId||"basic"}</span>
                <span className={`ap-badge ap-badge--${modal.verified?"green":"gray"}`}>{modal.verified?"Verified":"Unverified"}</span>
                {modal.withdrawalsFrozen && <span className="ap-badge ap-badge--red">Payouts Frozen</span>}
              </div>
              <div className="ap-field">
                <label className="ap-field-label">Reason for action</label>
                <input className="ap-input" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required for suspend/freeze"/>
              </div>
              {msg && <div className={`ap-msg ${msg.startsWith("✅")?"ap-msg--ok":"ap-msg--err"}`}>{msg}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {modal.status!=="suspended"
                  ? <button className="ap-btn ap-btn--danger ap-btn--full" onClick={()=>handleAction("suspend")} disabled={processing}>🚫 Suspend</button>
                  : <button className="ap-btn ap-btn--success ap-btn--full" onClick={()=>handleAction("activate")} disabled={processing}>✓ Activate</button>}
                {!modal.withdrawalsFrozen
                  ? <button className="ap-btn ap-btn--danger ap-btn--full" onClick={()=>handleAction("freeze")} disabled={processing}>❄ Freeze Payouts</button>
                  : <button className="ap-btn ap-btn--success ap-btn--full" onClick={()=>handleAction("unfreeze")} disabled={processing}>🔓 Unfreeze</button>}
                {!modal.verified
                  ? <button className="ap-btn ap-btn--secondary ap-btn--full" onClick={()=>handleAction("verify")} disabled={processing}>✅ Verify Store</button>
                  : <button className="ap-btn ap-btn--danger ap-btn--full" onClick={()=>handleAction("unverify")} disabled={processing}>Remove Badge</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
